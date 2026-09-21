import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  CompanySettings,
  PurchaseRecord,
  MonthlySalesRecord,
  MonthlyItcRecord,
  ItcHeadBalance,
  UserRole,
  ValidationIssue,
  Consolidated3BMonthRow,
  ClientProfile,
} from '../types/gst';
import {
  DEFAULT_SETTINGS,
  INITIAL_PURCHASE_RECORDS,
  INITIAL_SALES_RECORDS,
  INITIAL_ITC_RECORDS,
  INITIAL_ITC_BALANCES,
  INITIAL_CONSOLIDATED_3B_DATA,
} from '../data/initialMasterData';
import {
  CLIENT_2_PURCHASES,
  CLIENT_2_SALES,
  CLIENT_3_PURCHASES,
  CLIENT_3_SALES,
  CLIENT_4_PURCHASES,
  CLIENT_4_SALES,
  CLIENT_5_PURCHASES,
  CLIENT_5_SALES,
} from '../data/sampleClientData';
import { runReconciliation, validateAllData } from '../utils/reconciliation';
import {
  normalize12MonthsSales,
  normalize12MonthsItc,
  normalize12Months3B,
  deriveSalesFrom3B,
} from '../utils/formatters';
import {
  fetchClientsFromSupabase,
  upsertClientsToSupabase,
  deleteClientFromSupabase,
  fetchPurchasesFromSupabase,
  savePurchasesToSupabase,
  fetchSalesFromSupabase,
  saveSalesToSupabase,
  fetchItcFromSupabase,
  saveItcToSupabase,
  fetchConsolidated3bFromSupabase,
  saveConsolidated3bToSupabase,
  fetchSettingsFromSupabase,
  saveSettingsToSupabase,
  seedAllDemoDataToSupabase,
  DEFAULT_5_CLIENT_PROFILES,
  INITIAL_CLIENT_PROFILE,
} from '../lib/supabaseService';

interface GstContextType {
  supabaseState: {
    isConnected: boolean;
    isSyncing: boolean;
    lastSyncedAt: string | null;
    error: string | null;
  };
  syncWithSupabase: () => Promise<void>;
  initSupabaseSchema: () => Promise<void>;
  role: UserRole;
  setRole: (r: UserRole) => void;
  settings: CompanySettings;
  updateSettings: (s: Partial<CompanySettings>) => void;
  clients: ClientProfile[];
  activeClientId: string;
  activeClient: ClientProfile;
  addClient: (
    client: Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'>,
    options?: { copyMasterData?: boolean; switchToNew?: boolean }
  ) => string;
  updateClient: (id: string, updates: Partial<ClientProfile>) => void;
  deleteClient: (id: string) => boolean;
  switchClient: (id: string) => void;
  purchases: PurchaseRecord[];
  sales: MonthlySalesRecord[];
  itc: MonthlyItcRecord[];
  itcBalances: ItcHeadBalance[];
  consolidated3b: Consolidated3BMonthRow[];
  updateConsolidated3bRow: (monthIndex: number, updates: Partial<Consolidated3BMonthRow>) => void;
  appendConsolidated3bData: (records: Consolidated3BMonthRow[]) => void;
  replaceConsolidated3bData: (records: Consolidated3BMonthRow[]) => void;
  syncSalesFrom3B: () => void;
  updateItcBalances: (b: ItcHeadBalance[]) => void;
  validationIssues: ValidationIssue[];
  reconciliationSummary: {
    matchedCount: number;
    unmatchedCount: number;
    diffCount: number;
    totalDifferenceAmount: number;
  };
  addPurchaseRecord: (rec: Omit<PurchaseRecord, 'id' | 'sr'>) => void;
  appendPurchaseRecords: (records: PurchaseRecord[]) => void;
  replacePurchaseRecords: (records: PurchaseRecord[]) => void;
  updatePurchaseRecord: (id: string, updates: Partial<PurchaseRecord>) => void;
  deletePurchaseRecord: (id: string) => void;
  updateSalesRecord: (id: string, updates: Partial<MonthlySalesRecord>) => void;
  appendSalesRecords: (records: MonthlySalesRecord[]) => void;
  replaceSalesRecords: (records: MonthlySalesRecord[]) => void;
  importCombinedPurchaseAndSales: (
    newPurchases: PurchaseRecord[] | null,
    newSales: MonthlySalesRecord[] | null,
    targetClientId?: string,
    mode?: 'APPEND' | 'REPLACE'
  ) => void;
  updateItcRecord: (id: string, updates: Partial<MonthlyItcRecord>) => void;
  updateMonthlyItcRow: (monthIndex: number, updates: Partial<MonthlyItcRecord>) => void;
  updateSingleItcBalance: (head: 'IGST' | 'CGST' | 'SGST' | 'CESS', opening: number, closing: number) => void;
  appendItcRecords: (records: MonthlyItcRecord[]) => void;
  replaceItcRecords: (records: MonthlyItcRecord[]) => void;
  resetToMasterData: () => void;
  selectedMonthFilter: string;
  setSelectedMonthFilter: (m: string) => void;
  applyExtractedCompanySettings: (info: { companyName?: string; gstin?: string; financialYear?: string }) => void;
}

const GstContext = createContext<GstContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CLIENTS: 'gst_app_clients_v2',
  ACTIVE_CLIENT_ID: 'gst_app_active_client_id_v2',
  SETTINGS: 'gst_app_settings_v1',
  PURCHASES: 'gst_app_purchases_v1',
  SALES: 'gst_app_sales_v1',
  ITC: 'gst_app_itc_v1',
  ITC_BALANCES: 'gst_app_itc_balances_v1',
  CONSOLIDATED_3B: 'gst_app_consolidated_3b_v1',
  ROLE: 'gst_app_user_role_v1',
};

export const INITIAL_CLIENT: ClientProfile = {
  id: 'client_master_goswami',
  fileNo: '123',
  companyName: 'GOSWAMI MANIHARI STORE',
  tradeName: 'GOSWAMI MANIHARI STORE',
  gstin: '20AUEPG3207H1ZD',
  financialYear: '2025-2026',
  contactPerson: 'Proprietor',
  phoneNumber: '+91 98765 43210',
  email: 'info@goswamimanihari.in',
  notes: 'Client 1: Master Reference Client File (100% Fixed Replica)',
  createdAt: '2025-04-01T00:00:00.000Z',
  updatedAt: '2025-04-01T00:00:00.000Z',
};

export const DEFAULT_5_CLIENTS: ClientProfile[] = [
  INITIAL_CLIENT,
  {
    id: 'client_file_124',
    fileNo: '124',
    companyName: 'BHARAT HARDWARE & PAINTS',
    tradeName: 'BHARAT HARDWARE',
    gstin: '20AABCB4567M1Z3',
    financialYear: '2025-2026',
    contactPerson: 'Manager',
    phoneNumber: '+91 98765 43211',
    email: 'accounts@bharathardware.in',
    notes: 'Client 2: Hardware & Industrial Paints Dossier',
    createdAt: '2025-04-02T00:00:00.000Z',
    updatedAt: '2025-04-02T00:00:00.000Z',
  },
  {
    id: 'client_file_125',
    fileNo: '125',
    companyName: 'SHARMA ELECTRICALS & SANITARY',
    tradeName: 'SHARMA ELECTRICALS',
    gstin: '20AABCS7890N1Z8',
    financialYear: '2025-2026',
    contactPerson: 'Managing Partner',
    phoneNumber: '+91 98765 43212',
    email: 'tax@sharmaelectricals.com',
    notes: 'Client 3: Electrical & Sanitary Goods Dossier',
    createdAt: '2025-04-03T00:00:00.000Z',
    updatedAt: '2025-04-03T00:00:00.000Z',
  },
  {
    id: 'client_file_126',
    fileNo: '126',
    companyName: 'ROYAL AUTOMOBILES & SPARES',
    tradeName: 'ROYAL AUTOMOBILES',
    gstin: '20AACCR1234P1Z2',
    financialYear: '2025-2026',
    contactPerson: 'Director',
    phoneNumber: '+91 98765 43213',
    email: 'info@royalautomobiles.in',
    notes: 'Client 4: Auto Components & Spare Parts Dossier',
    createdAt: '2025-04-04T00:00:00.000Z',
    updatedAt: '2025-04-04T00:00:00.000Z',
  },
  {
    id: 'client_file_127',
    fileNo: '127',
    companyName: 'GUPTA TEXTILES & TRADERS',
    tradeName: 'GUPTA TEXTILES',
    gstin: '20AABCG5678Q1Z6',
    financialYear: '2025-2026',
    contactPerson: 'Chief Accountant',
    phoneNumber: '+91 98765 43214',
    email: 'contact@guptatextiles.org',
    notes: 'Client 5: Fabric & Garments Wholesaler Dossier',
    createdAt: '2025-04-05T00:00:00.000Z',
    updatedAt: '2025-04-05T00:00:00.000Z',
  },
];

const getClientStorageKey = (clientId: string, key: string) => {
  if (clientId === 'client_master_goswami') {
    return key;
  }
  return `${key}_${clientId}`;
};

// Helper to load complete datasets for a specific client
const loadClientDatasets = (clientId: string, clientList: ClientProfile[]) => {
  const currentClient = clientList.find((c) => c.id === clientId) || clientList[0] || INITIAL_CLIENT;

  // Settings
  const settingsKey = getClientStorageKey(clientId, STORAGE_KEYS.SETTINGS);
  const savedSettings = localStorage.getItem(settingsKey);
  let loadedSettings: CompanySettings = {
    ...DEFAULT_SETTINGS,
    fileNo: currentClient.fileNo,
    companyName: currentClient.companyName,
    gstin: currentClient.gstin,
    financialYear: currentClient.financialYear,
  };
  if (savedSettings) {
    try {
      loadedSettings = { ...loadedSettings, ...JSON.parse(savedSettings) };
    } catch (e) {
      console.error(e);
    }
  }

  // Purchases
  const purchasesKey = getClientStorageKey(clientId, STORAGE_KEYS.PURCHASES);
  const savedPurchases = localStorage.getItem(purchasesKey);
  let loadedPurchases: PurchaseRecord[] = [];
  if (savedPurchases) {
    try {
      loadedPurchases = JSON.parse(savedPurchases);
    } catch (e) {
      console.error(e);
    }
  } else if (clientId === 'client_master_goswami') {
    loadedPurchases = INITIAL_PURCHASE_RECORDS;
  } else if (clientId === 'client_file_124') {
    loadedPurchases = CLIENT_2_PURCHASES;
  } else if (clientId === 'client_file_125') {
    loadedPurchases = CLIENT_3_PURCHASES;
  } else if (clientId === 'client_file_126') {
    loadedPurchases = CLIENT_4_PURCHASES;
  } else if (clientId === 'client_file_127') {
    loadedPurchases = CLIENT_5_PURCHASES;
  }

  // Sales
  const salesKey = getClientStorageKey(clientId, STORAGE_KEYS.SALES);
  const savedSales = localStorage.getItem(salesKey);
  let loadedSales: MonthlySalesRecord[] = [];
  if (savedSales) {
    try {
      const parsed = JSON.parse(savedSales);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loadedSales = normalize12MonthsSales(parsed, currentClient.financialYear);
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (!loadedSales || loadedSales.length === 0) {
    if (clientId === 'client_master_goswami') {
      loadedSales = deriveSalesFrom3B(INITIAL_CONSOLIDATED_3B_DATA, currentClient.financialYear);
    } else if (clientId === 'client_file_124') {
      loadedSales = normalize12MonthsSales(CLIENT_2_SALES, currentClient.financialYear);
    } else if (clientId === 'client_file_125') {
      loadedSales = normalize12MonthsSales(CLIENT_3_SALES, currentClient.financialYear);
    } else if (clientId === 'client_file_126') {
      loadedSales = normalize12MonthsSales(CLIENT_4_SALES, currentClient.financialYear);
    } else if (clientId === 'client_file_127') {
      loadedSales = normalize12MonthsSales(CLIENT_5_SALES, currentClient.financialYear);
    } else {
      loadedSales = normalize12MonthsSales([], currentClient.financialYear);
    }
  }

  // ITC
  const itcKey = getClientStorageKey(clientId, STORAGE_KEYS.ITC);
  const savedItc = localStorage.getItem(itcKey);
  let loadedItc: MonthlyItcRecord[] = [];
  if (savedItc) {
    try {
      const parsed = JSON.parse(savedItc);
      if (Array.isArray(parsed)) {
        loadedItc = normalize12MonthsItc(parsed, currentClient.financialYear);
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (!loadedItc || loadedItc.length === 0) {
    if (clientId === 'client_master_goswami') {
      loadedItc = normalize12MonthsItc(INITIAL_ITC_RECORDS, currentClient.financialYear);
    } else {
      loadedItc = normalize12MonthsItc([], currentClient.financialYear);
    }
  }

  // ITC Balances
  const itcBalKey = getClientStorageKey(clientId, STORAGE_KEYS.ITC_BALANCES);
  const savedItcBal = localStorage.getItem(itcBalKey);
  let loadedItcBalances: ItcHeadBalance[] = [
    { head: 'IGST', opening: 0, closing: 0 },
    { head: 'CGST', opening: 0, closing: 0 },
    { head: 'SGST', opening: 0, closing: 0 },
    { head: 'CESS', opening: 0, closing: 0 },
  ];
  if (savedItcBal) {
    try {
      loadedItcBalances = JSON.parse(savedItcBal);
    } catch (e) {
      console.error(e);
    }
  } else if (clientId === 'client_master_goswami') {
    loadedItcBalances = INITIAL_ITC_BALANCES;
  }

  // Consolidated 3B
  const con3bKey = getClientStorageKey(clientId, STORAGE_KEYS.CONSOLIDATED_3B);
  const saved3b = localStorage.getItem(con3bKey);
  let loaded3b: Consolidated3BMonthRow[] = [];
  if (saved3b) {
    try {
      const parsed = JSON.parse(saved3b);
      if (Array.isArray(parsed)) {
        loaded3b = normalize12Months3B(parsed, currentClient.financialYear);
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (!loaded3b || loaded3b.length === 0) {
    if (clientId === 'client_master_goswami') {
      loaded3b = normalize12Months3B(INITIAL_CONSOLIDATED_3B_DATA, currentClient.financialYear);
    } else {
      loaded3b = normalize12Months3B([], currentClient.financialYear);
    }
  }

  return {
    settings: loadedSettings,
    purchases: loadedPurchases,
    sales: loadedSales,
    itc: loadedItc,
    itcBalances: loadedItcBalances,
    consolidated3b: loaded3b,
  };
};

const saveClientDatasets = (
  clientId: string,
  data: {
    settings: CompanySettings;
    purchases: PurchaseRecord[];
    sales: MonthlySalesRecord[];
    itc: MonthlyItcRecord[];
    itcBalances: ItcHeadBalance[];
    consolidated3b: Consolidated3BMonthRow[];
  }
) => {
  localStorage.setItem(getClientStorageKey(clientId, STORAGE_KEYS.SETTINGS), JSON.stringify(data.settings));
  localStorage.setItem(getClientStorageKey(clientId, STORAGE_KEYS.PURCHASES), JSON.stringify(data.purchases));
  localStorage.setItem(getClientStorageKey(clientId, STORAGE_KEYS.SALES), JSON.stringify(data.sales));
  localStorage.setItem(getClientStorageKey(clientId, STORAGE_KEYS.ITC), JSON.stringify(data.itc));
  localStorage.setItem(getClientStorageKey(clientId, STORAGE_KEYS.ITC_BALANCES), JSON.stringify(data.itcBalances));
  localStorage.setItem(getClientStorageKey(clientId, STORAGE_KEYS.CONSOLIDATED_3B), JSON.stringify(data.consolidated3b));
};

export const GstProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
    return (saved as UserRole) || 'ADMIN';
  });

  // Client Master State
  const [clients, setClients] = useState<ClientProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with DEFAULT_5_CLIENTS so all 5 test clients are always available
          const existingIds = new Set(parsed.map((c: any) => c.id));
          const merged = [...parsed];
          for (const defClient of DEFAULT_5_CLIENTS) {
            if (!existingIds.has(defClient.id)) {
              merged.push(defClient);
            }
          }
          return merged;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_5_CLIENTS;
  });

  const [activeClientId, setActiveClientId] = useState<string>(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLIENT_ID);
    if (savedId) {
      return savedId;
    }
    return 'client_master_goswami';
  });

  // Track active client id in ref and prevent race-condition overwrites during switching
  const activeClientIdRef = useRef<string>(activeClientId);
  const isSwitchingRef = useRef<boolean>(false);

  useEffect(() => {
    activeClientIdRef.current = activeClientId;
  }, [activeClientId]);

  // Active client object accessor
  const activeClient: ClientProfile =
    clients.find((c) => c.id === activeClientId) || clients[0] || INITIAL_CLIENT;

  // Active client datasets initialized
  const [settings, setSettingsState] = useState<CompanySettings>(() => {
    const loaded = loadClientDatasets(activeClientId, clients);
    return loaded.settings;
  });

  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    const loaded = loadClientDatasets(activeClientId, clients);
    return loaded.purchases;
  });

  const [sales, setSales] = useState<MonthlySalesRecord[]>(() => {
    const loaded = loadClientDatasets(activeClientId, clients);
    return loaded.sales;
  });

  const [itc, setItc] = useState<MonthlyItcRecord[]>(() => {
    const loaded = loadClientDatasets(activeClientId, clients);
    return loaded.itc;
  });

  const [itcBalances, setItcBalances] = useState<ItcHeadBalance[]>(() => {
    const loaded = loadClientDatasets(activeClientId, clients);
    return loaded.itcBalances;
  });

  const [consolidated3b, setConsolidated3b] = useState<Consolidated3BMonthRow[]>(() => {
    const loaded = loadClientDatasets(activeClientId, clients);
    return loaded.consolidated3b;
  });

  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('All');

  // Synchronize client list changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CLIENT_ID, activeClientId);
  }, [activeClientId]);

  // Synchronize active client data to localStorage with strict switching isolation
  useEffect(() => {
    if (isSwitchingRef.current || activeClientIdRef.current !== activeClientId) return;
    localStorage.setItem(getClientStorageKey(activeClientId, STORAGE_KEYS.SETTINGS), JSON.stringify(settings));
    if (activeClientId === 'client_master_goswami') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
  }, [settings, activeClientId]);

  useEffect(() => {
    if (isSwitchingRef.current || activeClientIdRef.current !== activeClientId) return;
    localStorage.setItem(getClientStorageKey(activeClientId, STORAGE_KEYS.PURCHASES), JSON.stringify(purchases));
    if (activeClientId === 'client_master_goswami') {
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
    }
  }, [purchases, activeClientId]);

  useEffect(() => {
    if (isSwitchingRef.current || activeClientIdRef.current !== activeClientId) return;
    localStorage.setItem(getClientStorageKey(activeClientId, STORAGE_KEYS.SALES), JSON.stringify(sales));
    if (activeClientId === 'client_master_goswami') {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    }
  }, [sales, activeClientId]);

  useEffect(() => {
    if (isSwitchingRef.current || activeClientIdRef.current !== activeClientId) return;
    localStorage.setItem(getClientStorageKey(activeClientId, STORAGE_KEYS.ITC), JSON.stringify(itc));
    if (activeClientId === 'client_master_goswami') {
      localStorage.setItem(STORAGE_KEYS.ITC, JSON.stringify(itc));
    }
  }, [itc, activeClientId]);

  useEffect(() => {
    if (isSwitchingRef.current || activeClientIdRef.current !== activeClientId) return;
    localStorage.setItem(getClientStorageKey(activeClientId, STORAGE_KEYS.ITC_BALANCES), JSON.stringify(itcBalances));
    if (activeClientId === 'client_master_goswami') {
      localStorage.setItem(STORAGE_KEYS.ITC_BALANCES, JSON.stringify(itcBalances));
    }
  }, [itcBalances, activeClientId]);

  useEffect(() => {
    if (isSwitchingRef.current || activeClientIdRef.current !== activeClientId) return;
    localStorage.setItem(getClientStorageKey(activeClientId, STORAGE_KEYS.CONSOLIDATED_3B), JSON.stringify(consolidated3b));
    if (activeClientId === 'client_master_goswami') {
      localStorage.setItem(STORAGE_KEYS.CONSOLIDATED_3B, JSON.stringify(consolidated3b));
    }
  }, [consolidated3b, activeClientId]);

  // Supabase Sync Engine State
  const [supabaseState, setSupabaseState] = useState<{
    isConnected: boolean;
    isSyncing: boolean;
    lastSyncedAt: string | null;
    error: string | null;
  }>({
    isConnected: true,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  });

  const initSupabaseSchema = async () => {
    try {
      await fetch('/api/db/init', { method: 'POST' });
    } catch (e) {
      console.warn('Supabase DB init endpoint call notice:', e);
    }
  };

  const syncWithSupabase = async (targetClientId?: string, targetFY?: string) => {
    setSupabaseState((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      // 1. Seed demo data to Supabase PostgreSQL first
      await seedAllDemoDataToSupabase();

      // 2. Fetch all clients from Supabase
      const remoteClients = await fetchClientsFromSupabase();
      if (remoteClients && remoteClients.length > 0) {
        setClients(remoteClients);
      }

      // 3. Sync active client data
      const currentId = targetClientId || activeClientIdRef.current;
      const currentFY = targetFY || settings.financialYear || '2025-2026';

      const remoteSettings = await fetchSettingsFromSupabase(currentId);
      if (remoteSettings) {
        setSettingsState(remoteSettings);
      }

      const activeFY = remoteSettings?.financialYear || currentFY;

      // Pull active client's purchases, sales, itc, 3b for activeFY
      const [pRemote, sRemote, iRemote, bRemote] = await Promise.all([
        fetchPurchasesFromSupabase(currentId, activeFY),
        fetchSalesFromSupabase(currentId, activeFY),
        fetchItcFromSupabase(currentId, activeFY),
        fetchConsolidated3bFromSupabase(currentId, activeFY),
      ]);

      if (pRemote !== null) {
        setPurchases(pRemote);
        localStorage.setItem(getClientStorageKey(currentId, STORAGE_KEYS.PURCHASES), JSON.stringify(pRemote));
      }
      if (sRemote !== null && sRemote.length > 0) {
        setSales(sRemote);
        localStorage.setItem(getClientStorageKey(currentId, STORAGE_KEYS.SALES), JSON.stringify(sRemote));
      }
      if (iRemote !== null && iRemote.length > 0) {
        setItc(iRemote);
        localStorage.setItem(getClientStorageKey(currentId, STORAGE_KEYS.ITC), JSON.stringify(iRemote));
      }
      if (bRemote !== null && bRemote.length > 0) {
        setConsolidated3b(bRemote);
        localStorage.setItem(getClientStorageKey(currentId, STORAGE_KEYS.CONSOLIDATED_3B), JSON.stringify(bRemote));
      }

      setSupabaseState({
        isConnected: true,
        isSyncing: false,
        lastSyncedAt: new Date().toLocaleTimeString(),
        error: null,
      });
    } catch (err: any) {
      console.warn('syncWithSupabase error:', err);
      setSupabaseState((prev) => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Supabase sync issue',
      }));
    }
  };

  // Initial mount auto-init & sync
  useEffect(() => {
    initSupabaseSchema().then(() => {
      syncWithSupabase();
    });
  }, []);

  // Sync background changes to Supabase (Passing financialYear!)
  useEffect(() => {
    if (isSwitchingRef.current) return;
    const timer = setTimeout(() => {
      savePurchasesToSupabase(activeClientId, settings.financialYear, purchases);
    }, 1000);
    return () => clearTimeout(timer);
  }, [purchases, activeClientId, settings.financialYear]);

  useEffect(() => {
    if (isSwitchingRef.current) return;
    const timer = setTimeout(() => {
      saveSalesToSupabase(activeClientId, settings.financialYear, sales);
    }, 1000);
    return () => clearTimeout(timer);
  }, [sales, activeClientId, settings.financialYear]);

  useEffect(() => {
    if (isSwitchingRef.current) return;
    const timer = setTimeout(() => {
      saveItcToSupabase(activeClientId, settings.financialYear, itc);
    }, 1000);
    return () => clearTimeout(timer);
  }, [itc, activeClientId, settings.financialYear]);

  useEffect(() => {
    if (isSwitchingRef.current) return;
    const timer = setTimeout(() => {
      saveConsolidated3bToSupabase(activeClientId, settings.financialYear, consolidated3b);
    }, 1000);
    return () => clearTimeout(timer);
  }, [consolidated3b, activeClientId, settings.financialYear]);

  useEffect(() => {
    if (isSwitchingRef.current) return;
    const timer = setTimeout(() => {
      saveSettingsToSupabase(activeClientId, settings);
    }, 1000);
    return () => clearTimeout(timer);
  }, [settings, activeClientId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
  }, [role]);

  const setRole = (r: UserRole) => {
    setRoleState(r);
  };

  // Switch Active Client with complete isolation & FY data fetching from Supabase
  const switchClient = async (targetClientId: string) => {
    if (targetClientId === activeClientIdRef.current) return;
    const targetClient = clients.find((c) => c.id === targetClientId);
    if (!targetClient) return;

    isSwitchingRef.current = true;

    // 1. Flush save current active client data to Supabase
    const currentActiveId = activeClientIdRef.current;
    const currentFY = settings.financialYear || '2025-2026';
    await Promise.all([
      savePurchasesToSupabase(currentActiveId, currentFY, purchases),
      saveSalesToSupabase(currentActiveId, currentFY, sales),
      saveItcToSupabase(currentActiveId, currentFY, itc),
      saveConsolidated3bToSupabase(currentActiveId, currentFY, consolidated3b),
      saveSettingsToSupabase(currentActiveId, settings),
    ]);

    // 2. Load target client from local fallback first
    const loaded = loadClientDatasets(targetClientId, clients);

    activeClientIdRef.current = targetClientId;
    setActiveClientId(targetClientId);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CLIENT_ID, targetClientId);

    setSettingsState(loaded.settings);
    setPurchases(loaded.purchases);
    setSales(loaded.sales);
    setItc(loaded.itc);
    setItcBalances(loaded.itcBalances);
    setConsolidated3b(loaded.consolidated3b);

    // 3. Fetch live remote settings and data for target client from Supabase
    const targetSettings = await fetchSettingsFromSupabase(targetClientId);
    const targetFY = targetSettings?.financialYear || targetClient.financialYear || '2025-2026';

    if (targetSettings) {
      setSettingsState(targetSettings);
    }

    const [pRemote, sRemote, iRemote, bRemote] = await Promise.all([
      fetchPurchasesFromSupabase(targetClientId, targetFY),
      fetchSalesFromSupabase(targetClientId, targetFY),
      fetchItcFromSupabase(targetClientId, targetFY),
      fetchConsolidated3bFromSupabase(targetClientId, targetFY),
    ]);

    if (pRemote) setPurchases(pRemote);
    setSales(sRemote && sRemote.length > 0 ? sRemote : normalize12MonthsSales([], targetFY));
    setItc(iRemote && iRemote.length > 0 ? iRemote : normalize12MonthsItc([], targetFY));
    setConsolidated3b(bRemote && bRemote.length > 0 ? bRemote : normalize12Months3B([], targetFY));

    setTimeout(() => {
      isSwitchingRef.current = false;
    }, 100);
  };

  // Add New Client
  const addClient = (
    clientInput: Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'>,
    options?: { copyMasterData?: boolean; switchToNew?: boolean }
  ): string => {
    const newId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newClient: ClientProfile = {
      ...clientInput,
      id: newId,
      fileNo: clientInput.fileNo.trim(),
      companyName: clientInput.companyName.trim(),
      gstin: (clientInput.gstin || '').trim().toUpperCase(),
      financialYear: clientInput.financialYear || settings.financialYear || '2025-2026',
      createdAt: now,
      updatedAt: now,
    };

    // Save initial dataset for this new client
    const clientSettings: CompanySettings = {
      ...DEFAULT_SETTINGS,
      fileNo: newClient.fileNo,
      companyName: newClient.companyName,
      gstin: newClient.gstin,
      financialYear: newClient.financialYear,
      pdfFileName: `GST_Report_File_${newClient.fileNo}_${newClient.companyName.replace(/\s+/g, '_')}_FY_${newClient.financialYear}.pdf`,
    };

    const initialData = {
      settings: clientSettings,
      purchases: options?.copyMasterData ? INITIAL_PURCHASE_RECORDS : [],
      sales: options?.copyMasterData
        ? deriveSalesFrom3B(INITIAL_CONSOLIDATED_3B_DATA, newClient.financialYear)
        : normalize12MonthsSales([], newClient.financialYear),
      itc: options?.copyMasterData
        ? normalize12MonthsItc(INITIAL_ITC_RECORDS, newClient.financialYear)
        : normalize12MonthsItc([], newClient.financialYear),
      itcBalances: options?.copyMasterData
        ? INITIAL_ITC_BALANCES
        : [
            { head: 'IGST' as const, opening: 0, closing: 0 },
            { head: 'CGST' as const, opening: 0, closing: 0 },
            { head: 'SGST' as const, opening: 0, closing: 0 },
            { head: 'CESS' as const, opening: 0, closing: 0 },
          ],
      consolidated3b: options?.copyMasterData
        ? normalize12Months3B(INITIAL_CONSOLIDATED_3B_DATA, newClient.financialYear)
        : normalize12Months3B([], newClient.financialYear),
    };

    saveClientDatasets(newId, initialData);

    const updatedClients = [...clients, newClient];
    setClients(updatedClients);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updatedClients));

    // Sync new client to Supabase immediately
    upsertClientsToSupabase(updatedClients);
    saveSettingsToSupabase(newId, initialData.settings);
    savePurchasesToSupabase(newId, newClient.financialYear, initialData.purchases);
    saveSalesToSupabase(newId, newClient.financialYear, initialData.sales);
    saveItcToSupabase(newId, newClient.financialYear, initialData.itc);
    saveConsolidated3bToSupabase(newId, newClient.financialYear, initialData.consolidated3b);

    if (options?.switchToNew !== false) {
      isSwitchingRef.current = true;
      saveClientDatasets(activeClientIdRef.current, {
        settings,
        purchases,
        sales,
        itc,
        itcBalances,
        consolidated3b,
      });

      activeClientIdRef.current = newId;
      setActiveClientId(newId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLIENT_ID, newId);
      setSettingsState(initialData.settings);
      setPurchases(initialData.purchases);
      setSales(initialData.sales);
      setItc(initialData.itc);
      setItcBalances(initialData.itcBalances);
      setConsolidated3b(initialData.consolidated3b);

      setTimeout(() => {
        isSwitchingRef.current = false;
      }, 60);
    }

    return newId;
  };

  // Update Client Details
  const updateClient = (id: string, updates: Partial<ClientProfile>) => {
    const updatedClients = clients.map((c) => {
      if (c.id === id) {
        const merged: ClientProfile = {
          ...c,
          ...updates,
          fileNo: updates.fileNo !== undefined ? updates.fileNo.trim() : c.fileNo,
          companyName: updates.companyName !== undefined ? updates.companyName.trim() : c.companyName,
          gstin: updates.gstin !== undefined ? updates.gstin.trim().toUpperCase() : c.gstin,
          financialYear: updates.financialYear || c.financialYear,
          updatedAt: new Date().toISOString(),
        };
        return merged;
      }
      return c;
    });

    setClients(updatedClients);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updatedClients));
    upsertClientsToSupabase(updatedClients);

    // If updating currently active client, sync into settings as well
    if (id === activeClientId) {
      const activeObj = updatedClients.find((c) => c.id === id);
      if (activeObj) {
        setSettingsState((prev) => ({
          ...prev,
          fileNo: activeObj.fileNo,
          companyName: activeObj.companyName,
          gstin: activeObj.gstin,
          financialYear: activeObj.financialYear,
        }));
      }
    }
  };

  // Delete Client
  const deleteClient = (id: string): boolean => {
    if (clients.length <= 1) {
      alert('Cannot delete the only remaining client. At least one client dossier is required.');
      return false;
    }

    const remaining = clients.filter((c) => c.id !== id);
    setClients(remaining);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(remaining));
    deleteClientFromSupabase(id);

    // Remove client storage keys
    const keysToRemove = [
      getClientStorageKey(id, STORAGE_KEYS.SETTINGS),
      getClientStorageKey(id, STORAGE_KEYS.PURCHASES),
      getClientStorageKey(id, STORAGE_KEYS.SALES),
      getClientStorageKey(id, STORAGE_KEYS.ITC),
      getClientStorageKey(id, STORAGE_KEYS.ITC_BALANCES),
      getClientStorageKey(id, STORAGE_KEYS.CONSOLIDATED_3B),
    ];
    keysToRemove.forEach((k) => {
      if (id !== 'client_master_goswami') {
        localStorage.removeItem(k);
      }
    });

    // If deleted client was active, switch to first remaining client
    if (id === activeClientId) {
      const nextClient = remaining[0];
      setActiveClientId(nextClient.id);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLIENT_ID, nextClient.id);
      const loaded = loadClientDatasets(nextClient.id, remaining);
      setSettingsState(loaded.settings);
      setPurchases(loaded.purchases);
      setSales(loaded.sales);
      setItc(loaded.itc);
      setItcBalances(loaded.itcBalances);
      setConsolidated3b(loaded.consolidated3b);
    }

    return true;
  };

  // Update Settings with bidirectional sync to activeClient & FY change handling
  const updateSettings = async (s: Partial<CompanySettings>) => {
    const oldFy = settings.financialYear;
    const newFy = s.financialYear;

    if (newFy && newFy !== oldFy) {
      isSwitchingRef.current = true;

      // Save current dataset under old FY
      await Promise.all([
        savePurchasesToSupabase(activeClientId, oldFy, purchases),
        saveSalesToSupabase(activeClientId, oldFy, sales),
        saveItcToSupabase(activeClientId, oldFy, itc),
        saveConsolidated3bToSupabase(activeClientId, oldFy, consolidated3b),
      ]);

      // Fetch target dataset for new FY from Supabase
      const [pRemote, sRemote, iRemote, bRemote] = await Promise.all([
        fetchPurchasesFromSupabase(activeClientId, newFy),
        fetchSalesFromSupabase(activeClientId, newFy),
        fetchItcFromSupabase(activeClientId, newFy),
        fetchConsolidated3bFromSupabase(activeClientId, newFy),
      ]);

      setPurchases(pRemote || []);
      setSales(sRemote && sRemote.length > 0 ? sRemote : normalize12MonthsSales([], newFy));
      setItc(iRemote && iRemote.length > 0 ? iRemote : normalize12MonthsItc([], newFy));
      setConsolidated3b(bRemote && bRemote.length > 0 ? bRemote : normalize12Months3B([], newFy));

      setTimeout(() => {
        isSwitchingRef.current = false;
      }, 100);
    }

    setSettingsState((prev) => {
      const updated = { ...prev, ...s };
      if (s.companyName !== undefined || s.gstin !== undefined || s.fileNo !== undefined || s.financialYear !== undefined) {
        setClients((prevClients) =>
          prevClients.map((c) => {
            if (c.id === activeClientId) {
              return {
                ...c,
                companyName: s.companyName !== undefined ? s.companyName.trim() : c.companyName,
                gstin: s.gstin !== undefined ? s.gstin.trim().toUpperCase() : c.gstin,
                fileNo: s.fileNo !== undefined ? s.fileNo.trim() : c.fileNo,
                financialYear: s.financialYear !== undefined ? s.financialYear : c.financialYear,
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          })
        );
      }
      return updated;
    });

    saveSettingsToSupabase(activeClientId, { ...settings, ...s });
  };

  const addPurchaseRecord = (rec: Omit<PurchaseRecord, 'id' | 'sr'>) => {
    setPurchases((prev) => {
      const newRec: PurchaseRecord = {
        ...rec,
        id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sr: prev.length + 1,
      };
      const updated = [...prev, newRec];
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.PURCHASES), JSON.stringify(updated));
      savePurchasesToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
  };

  const appendPurchaseRecords = (newRecords: PurchaseRecord[]) => {
    setPurchases((prev) => {
      const offset = prev.length;
      const renumbered = newRecords.map((r, i) => ({
        ...r,
        sr: offset + i + 1,
      }));
      const updated = [...prev, ...renumbered];
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.PURCHASES), JSON.stringify(updated));
      savePurchasesToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
  };

  const replacePurchaseRecords = (newRecords: PurchaseRecord[]) => {
    const renumbered = newRecords.map((r, i) => ({
      ...r,
      sr: i + 1,
    }));
    setPurchases(renumbered);
    localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.PURCHASES), JSON.stringify(renumbered));
    savePurchasesToSupabase(activeClientIdRef.current, settings.financialYear, renumbered);
  };

  const updatePurchaseRecord = (id: string, updates: Partial<PurchaseRecord>) => {
    setPurchases((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.PURCHASES), JSON.stringify(updated));
      savePurchasesToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
  };

  const deletePurchaseRecord = (id: string) => {
    setPurchases((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      const renumbered = filtered.map((p, idx) => ({ ...p, sr: idx + 1 }));
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.PURCHASES), JSON.stringify(renumbered));
      savePurchasesToSupabase(activeClientIdRef.current, settings.financialYear, renumbered);
      return renumbered;
    });
  };

  const updateSalesRecord = (id: string, updates: Partial<MonthlySalesRecord>) => {
    setSales((prev) => {
      const updated = prev.map((s) => {
        if (s.id === id) {
          const merged = { ...s, ...updates };
          merged.totalSales = merged.taxableSales + merged.exemptSales;
          merged.totalTax = (merged.igst || 0) + (merged.cgst || 0) + (merged.sgst || 0) + (merged.cess || 0);
          return merged;
        }
        return s;
      });
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.SALES), JSON.stringify(updated));
      saveSalesToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
  };

  const appendSalesRecords = (records: MonthlySalesRecord[]) => {
    setSales((prev) => {
      const merged = [...prev];
      records.forEach((newRecord) => {
        const newPrefix = (newRecord.month || '').trim().slice(0, 3).toLowerCase();
        const idx = merged.findIndex((s) => {
          if (s.monthIndex !== undefined && newRecord.monthIndex !== undefined && s.monthIndex === newRecord.monthIndex) {
            return true;
          }
          const sPrefix = (s.month || '').trim().slice(0, 3).toLowerCase();
          return sPrefix === newPrefix;
        });
        if (idx !== -1) {
          merged[idx] = { ...merged[idx], ...newRecord, id: merged[idx].id, month: merged[idx].month };
        }
      });
      const updated = normalize12MonthsSales(merged, settings.financialYear);
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.SALES), JSON.stringify(updated));
      saveSalesToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
  };

  const replaceSalesRecords = (records: MonthlySalesRecord[]) => {
    const updated = normalize12MonthsSales(records, settings.financialYear);
    setSales(updated);
    localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.SALES), JSON.stringify(updated));
    saveSalesToSupabase(activeClientIdRef.current, settings.financialYear, updated);
  };

  const importCombinedPurchaseAndSales = (
    newPurchases: PurchaseRecord[] | null,
    newSales: MonthlySalesRecord[] | null,
    targetClientId?: string,
    mode: 'APPEND' | 'REPLACE' = 'APPEND'
  ) => {
    const effectiveClientId = targetClientId || activeClientIdRef.current;
    const isTargetActive = effectiveClientId === activeClientIdRef.current;

    // Load current or target client data
    const clientData = isTargetActive
      ? { settings, purchases, sales, itc, itcBalances, consolidated3b }
      : loadClientDatasets(effectiveClientId, clients);

    let finalPurchases = [...clientData.purchases];
    let finalSales = [...clientData.sales];

    if (newPurchases && newPurchases.length > 0) {
      if (mode === 'APPEND') {
        const offset = finalPurchases.length;
        const renumbered = newPurchases.map((r, i) => ({
          ...r,
          sr: offset + i + 1,
        }));
        finalPurchases = [...finalPurchases, ...renumbered];
      } else {
        finalPurchases = newPurchases.map((r, i) => ({
          ...r,
          sr: i + 1,
        }));
      }
    }

    if (newSales && newSales.length > 0) {
      if (mode === 'APPEND') {
        const merged = [...finalSales];
        newSales.forEach((newRecord) => {
          const newPrefix = (newRecord.month || '').trim().slice(0, 3).toLowerCase();
          const idx = merged.findIndex((s) => {
            if (s.monthIndex !== undefined && newRecord.monthIndex !== undefined && s.monthIndex === newRecord.monthIndex) {
              return true;
            }
            const sPrefix = (s.month || '').trim().slice(0, 3).toLowerCase();
            return sPrefix === newPrefix;
          });
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...newRecord, id: merged[idx].id, month: merged[idx].month };
          }
        });
        finalSales = normalize12MonthsSales(merged, clientData.settings.financialYear);
      } else {
        finalSales = normalize12MonthsSales(newSales, clientData.settings.financialYear);
      }
    }

    // Persist directly for effective client
    saveClientDatasets(effectiveClientId, {
      ...clientData,
      purchases: finalPurchases,
      sales: finalSales,
    });

    savePurchasesToSupabase(effectiveClientId, clientData.settings.financialYear, finalPurchases);
    saveSalesToSupabase(effectiveClientId, clientData.settings.financialYear, finalSales);

    if (isTargetActive) {
      if (newPurchases && newPurchases.length > 0) {
        setPurchases(finalPurchases);
      }
      if (newSales && newSales.length > 0) {
        setSales(finalSales);
      }
    } else {
      switchClient(effectiveClientId);
    }
  };

  const updateItcRecord = (id: string, updates: Partial<MonthlyItcRecord>) => {
    setItc((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const merged = { ...item, ...updates };
          merged.totalTax = (merged.igst || 0) + (merged.cgst || 0) + (merged.sgst || 0) + (merged.cess || 0);
          return merged;
        }
        return item;
      });
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.ITC), JSON.stringify(updated));
      saveItcToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
  };

  const updateMonthlyItcRow = (monthIndex: number, updates: Partial<MonthlyItcRecord>) => {
    setItc((prev) => {
      const updated = prev.map((item, idx) => {
        if (idx === monthIndex) {
          const merged = { ...item, ...updates };
          merged.totalTax = (merged.igst || 0) + (merged.cgst || 0) + (merged.sgst || 0) + (merged.cess || 0);
          return merged;
        }
        return item;
      });
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.ITC), JSON.stringify(updated));
      saveItcToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
  };

  const updateSingleItcBalance = (head: 'IGST' | 'CGST' | 'SGST' | 'CESS', opening: number, closing: number) => {
    setItcBalances((prev) => {
      const updated = prev.map((b) => (b.head === head ? { ...b, opening, closing } : b));
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.ITC_BALANCES), JSON.stringify(updated));
      return updated;
    });
  };

  const appendItcRecords = (records: MonthlyItcRecord[]) => {
    setItc((prev) => {
      const merged = [...prev];
      records.forEach((newRecord) => {
        const newPrefix = (newRecord.month || '').trim().slice(0, 3).toLowerCase();
        const idx = merged.findIndex((i) => {
          if (i.monthIndex !== undefined && newRecord.monthIndex !== undefined && i.monthIndex === newRecord.monthIndex) {
            return true;
          }
          const iPrefix = (i.month || '').trim().slice(0, 3).toLowerCase();
          return iPrefix === newPrefix;
        });
        if (idx !== -1) {
          merged[idx] = { ...merged[idx], ...newRecord, id: merged[idx].id, month: merged[idx].month };
        }
      });
      const updated = normalize12MonthsItc(merged, settings.financialYear);
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.ITC), JSON.stringify(updated));
      saveItcToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
  };

  const replaceItcRecords = (records: MonthlyItcRecord[]) => {
    const updated = normalize12MonthsItc(records, settings.financialYear);
    setItc(updated);
    localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.ITC), JSON.stringify(updated));
    saveItcToSupabase(activeClientIdRef.current, settings.financialYear, updated);
  };

  const updateItcBalances = (b: ItcHeadBalance[]) => {
    setItcBalances(b);
    localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.ITC_BALANCES), JSON.stringify(b));
  };

  const updateConsolidated3bRow = (monthIndex: number, updates: Partial<Consolidated3BMonthRow>) => {
    setConsolidated3b((prev) => {
      const updated = prev.map((row) => (row.monthIndex === monthIndex ? { ...row, ...updates } : row));
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.CONSOLIDATED_3B), JSON.stringify(updated));
      saveConsolidated3bToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
  };

  const appendConsolidated3bData = (records: Consolidated3BMonthRow[]) => {
    setConsolidated3b((prev) => {
      const merged = [...prev];
      records.forEach((newRow) => {
        const newPrefix = (newRow.month || '').trim().slice(0, 3).toLowerCase();
        const idx = merged.findIndex((r) => {
          if (r.monthIndex !== undefined && newRow.monthIndex !== undefined && r.monthIndex === newRow.monthIndex) {
            return true;
          }
          const rPrefix = (r.month || '').trim().slice(0, 3).toLowerCase();
          return rPrefix === newPrefix;
        });
        if (idx !== -1) {
          merged[idx] = { ...merged[idx], ...newRow };
        }
      });
      const updated = normalize12Months3B(merged, settings.financialYear);
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.CONSOLIDATED_3B), JSON.stringify(updated));
      saveConsolidated3bToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
  };

  const syncSalesFrom3B = () => {
    const derived = deriveSalesFrom3B(consolidated3b, settings.financialYear);
    setSales(derived);
    localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.SALES), JSON.stringify(derived));
    saveSalesToSupabase(activeClientIdRef.current, settings.financialYear, derived);
  };

  const replaceConsolidated3bData = (records: Consolidated3BMonthRow[]) => {
    const normalized = normalize12Months3B(records, settings.financialYear);
    const derivedSales = deriveSalesFrom3B(normalized, settings.financialYear);
    setConsolidated3b(normalized);
    setSales(derivedSales);
    setItc((prev) => {
      const updated = prev.map((i) => {
        const found = normalized.find((r) => r.monthIndex === i.monthIndex);
        if (found) {
          return {
            ...i,
            exemptPurchase: found.inwardNrc,
            igst: found.itcEligibleNrcIgst,
            cgst: found.itcEligibleNrcCgst,
            sgst: found.itcEligibleNrcSgst,
            cess: found.itcEligibleNrcCess,
            totalTax:
              found.itcEligibleNrcIgst +
              found.itcEligibleNrcCgst +
              found.itcEligibleNrcSgst +
              found.itcEligibleNrcCess,
          };
        }
        return i;
      });
      localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.ITC), JSON.stringify(updated));
      saveItcToSupabase(activeClientIdRef.current, settings.financialYear, updated);
      return updated;
    });
    localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.CONSOLIDATED_3B), JSON.stringify(normalized));
    localStorage.setItem(getClientStorageKey(activeClientIdRef.current, STORAGE_KEYS.SALES), JSON.stringify(derivedSales));
    saveConsolidated3bToSupabase(activeClientIdRef.current, settings.financialYear, normalized);
    saveSalesToSupabase(activeClientIdRef.current, settings.financialYear, derivedSales);
  };

  const applyExtractedCompanySettings = (info: { companyName?: string; gstin?: string; financialYear?: string }) => {
    const updates: Partial<CompanySettings> = {};
    if (info.companyName && info.companyName.trim()) {
      updates.companyName = info.companyName.trim();
    }
    if (info.gstin && info.gstin.trim()) {
      updates.gstin = info.gstin.trim().toUpperCase();
    }
    if (info.financialYear && info.financialYear.trim()) {
      updates.financialYear = info.financialYear.trim();
    }
    if (Object.keys(updates).length > 0) {
      updateSettings(updates);
    }
  };

  const resetToMasterData = () => {
    setSettingsState(DEFAULT_SETTINGS);
    setPurchases(INITIAL_PURCHASE_RECORDS);
    setSales(normalize12MonthsSales(INITIAL_SALES_RECORDS, DEFAULT_SETTINGS.financialYear));
    setItc(normalize12MonthsItc(INITIAL_ITC_RECORDS, DEFAULT_SETTINGS.financialYear));
    setItcBalances(INITIAL_ITC_BALANCES);
    setConsolidated3b(normalize12Months3B(INITIAL_CONSOLIDATED_3B_DATA, DEFAULT_SETTINGS.financialYear));
  };

  // Run reconciliation computations
  const reconciliation = runReconciliation(purchases, settings);
  const validationIssues = validateAllData(purchases, sales, itc, settings);

  return (
    <GstContext.Provider
      value={{
        supabaseState,
        syncWithSupabase,
        initSupabaseSchema,
        role,
        setRole,
        settings,
        updateSettings,
        clients,
        activeClientId,
        activeClient,
        addClient,
        updateClient,
        deleteClient,
        switchClient,
        purchases: reconciliation.reconciledPurchases,
        sales,
        itc,
        itcBalances,
        consolidated3b,
        updateConsolidated3bRow,
        appendConsolidated3bData,
        replaceConsolidated3bData,
        syncSalesFrom3B,
        updateItcBalances,
        validationIssues,
        reconciliationSummary: {
          matchedCount: reconciliation.matchedCount,
          unmatchedCount: reconciliation.unmatchedCount,
          diffCount: reconciliation.diffCount,
          totalDifferenceAmount: reconciliation.totalDifferenceAmount,
        },
        addPurchaseRecord,
        appendPurchaseRecords,
        replacePurchaseRecords,
        updatePurchaseRecord,
        deletePurchaseRecord,
        updateSalesRecord,
        appendSalesRecords,
        replaceSalesRecords,
        importCombinedPurchaseAndSales,
        updateItcRecord,
        updateMonthlyItcRow,
        updateSingleItcBalance,
        appendItcRecords,
        replaceItcRecords,
        resetToMasterData,
        selectedMonthFilter,
        setSelectedMonthFilter,
        applyExtractedCompanySettings,
      }}
    >
      {children}
    </GstContext.Provider>
  );
};

export const useGst = () => {
  const context = useContext(GstContext);
  if (!context) {
    throw new Error('useGst must be used within a GstProvider');
  }
  return context;
};
