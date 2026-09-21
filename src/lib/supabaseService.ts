import { supabase } from './supabase';
import {
  ClientProfile,
  CompanySettings,
  PurchaseRecord,
  MonthlySalesRecord,
  MonthlyItcRecord,
  ItcHeadBalance,
  Consolidated3BMonthRow,
} from '../types/gst';
import {
  DEFAULT_SETTINGS,
  INITIAL_PURCHASE_RECORDS,
  INITIAL_ITC_RECORDS,
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
import {
  normalize12MonthsSales,
  normalize12MonthsItc,
  normalize12Months3B,
  deriveSalesFrom3B,
} from '../utils/formatters';

export interface SupabaseSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  tableStatus: {
    clients: boolean;
    purchases: boolean;
    sales: boolean;
    itc: boolean;
    itcBalances: boolean;
    consolidated3b: boolean;
    settings: boolean;
  };
}

export const INITIAL_CLIENT_PROFILE: ClientProfile = {
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

export const DEFAULT_5_CLIENT_PROFILES: ClientProfile[] = [
  INITIAL_CLIENT_PROFILE,
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

// -------------------------------------------------------------
// CLIENTS CRUD
// -------------------------------------------------------------
export async function fetchClientsFromSupabase(): Promise<ClientProfile[] | null> {
  try {
    const { data, error } = await supabase.from('clients').select('*').order('file_no', { ascending: true });
    if (error || !data) {
      console.warn('Supabase fetch clients notice:', error?.message);
      return null;
    }
    return data.map((row: any) => ({
      id: row.id,
      fileNo: row.file_no || '',
      companyName: row.company_name || '',
      tradeName: row.trade_name || '',
      gstin: row.gstin || '',
      financialYear: row.financial_year || '2025-2026',
      contactPerson: row.contact_person || '',
      phoneNumber: row.phone_number || '',
      email: row.email || '',
      notes: row.notes || '',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Supabase fetchClients exception:', err);
    return null;
  }
}

export async function upsertClientsToSupabase(clients: ClientProfile[]): Promise<boolean> {
  try {
    const payload = clients.map((c) => ({
      id: c.id,
      file_no: c.fileNo,
      company_name: c.companyName,
      trade_name: c.tradeName || '',
      gstin: c.gstin,
      financial_year: c.financialYear || '2025-2026',
      contact_person: c.contactPerson || '',
      phone_number: c.phoneNumber || '',
      email: c.email || '',
      notes: c.notes || '',
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('clients').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase upsertClients notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase upsertClients exception:', err);
    return false;
  }
}

export async function deleteClientFromSupabase(clientId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) {
      console.warn('Supabase deleteClient notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase deleteClient exception:', err);
    return false;
  }
}

// -------------------------------------------------------------
// PURCHASES CRUD (With Financial Year support)
// -------------------------------------------------------------
export async function fetchPurchasesFromSupabase(clientId: string, financialYear?: string): Promise<PurchaseRecord[] | null> {
  try {
    let query = supabase.from('purchases').select('*').eq('client_id', clientId);
    if (financialYear) {
      query = query.eq('financial_year', financialYear);
    }
    const { data, error } = await query.order('sr', { ascending: true });
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      sr: row.sr || 0,
      status: row.status || 'MATCHED',
      party: row.party || '',
      gstin: row.gstin || '',
      period: row.period || '',
      invoiceNo: row.invoice_no || '',
      pos: row.pos || '',
      invoiceDate: row.invoice_date || '',
      invoiceValue: Number(row.invoice_value) || 0,
      taxableValue: Number(row.taxable_value) || 0,
      rate: Number(row.rate) || 0,
      tax: Number(row.tax) || 0,
      igst: Number(row.igst) || 0,
      cgst: Number(row.cgst) || 0,
      sgst: Number(row.sgst) || 0,
      cess: Number(row.cess) || 0,
      cfs: row.cfs || 'Y',
      rc: row.rc || 'N',
      remark: row.remark || '',
      gstrStatus: row.gstr_status,
      gstrGstin: row.gstr_gstin,
      gstrInvoiceNo: row.gstr_invoice_no,
      gstrInvoiceDate: row.gstr_invoice_date,
      gstrTaxableValue: row.gstr_taxable_value ? Number(row.gstr_taxable_value) : undefined,
      gstrIgst: row.gstr_igst ? Number(row.gstr_igst) : undefined,
      gstrCgst: row.gstr_cgst ? Number(row.gstr_cgst) : undefined,
      gstrSgst: row.gstr_sgst ? Number(row.gstr_sgst) : undefined,
      gstrCess: row.gstr_cess ? Number(row.gstr_cess) : undefined,
      gstrPeriod: row.gstr_period,
      gstrPos: row.gstr_pos,
      gstrInvoiceValue: row.gstr_invoice_value ? Number(row.gstr_invoice_value) : undefined,
      gstrRate: row.gstr_rate ? Number(row.gstr_rate) : undefined,
      gstrTax: row.gstr_tax ? Number(row.gstr_tax) : undefined,
      gstr3bStatus: row.gstr_3b_status,
      gstrR1Date: row.gstr_r1_date,
      gstrRc: row.gstr_rc,
      gstrRemark: row.gstr_remark,
      diffInvoiceValue: row.diff_invoice_value ? Number(row.diff_invoice_value) : undefined,
      diffTaxableValue: row.diff_taxable_value ? Number(row.diff_taxable_value) : undefined,
      diffTax: row.diff_tax ? Number(row.diff_tax) : undefined,
      diffRemark: row.diff_remark,
    }));
  } catch (err) {
    return null;
  }
}

export async function savePurchasesToSupabase(
  clientId: string,
  financialYear: string,
  purchases: PurchaseRecord[]
): Promise<boolean> {
  try {
    if (financialYear) {
      await supabase.from('purchases').delete().eq('client_id', clientId).eq('financial_year', financialYear);
    } else {
      await supabase.from('purchases').delete().eq('client_id', clientId);
    }

    if (purchases.length === 0) return true;

    const payload = purchases.map((p) => ({
      id: p.id,
      client_id: clientId,
      financial_year: financialYear || '2025-2026',
      sr: p.sr,
      status: p.status,
      party: p.party,
      gstin: p.gstin,
      period: p.period,
      invoice_no: p.invoiceNo,
      pos: p.pos,
      invoice_date: p.invoiceDate,
      invoice_value: p.invoiceValue,
      taxable_value: p.taxableValue,
      rate: p.rate,
      tax: p.tax,
      igst: p.igst,
      cgst: p.cgst,
      sgst: p.sgst,
      cess: p.cess,
      cfs: p.cfs,
      rc: p.rc,
      remark: p.remark,
      gstr_status: p.gstrStatus,
      gstr_gstin: p.gstrGstin,
      gstr_invoice_no: p.gstrInvoiceNo,
      gstr_invoice_date: p.gstrInvoiceDate,
      gstr_taxable_value: p.gstrTaxableValue,
      gstr_igst: p.gstrIgst,
      gstr_cgst: p.gstrCgst,
      gstr_sgst: p.gstrSgst,
      gstr_cess: p.gstrCess,
      gstr_period: p.gstrPeriod,
      gstr_pos: p.gstrPos,
      gstr_invoice_value: p.gstrInvoiceValue,
      gstr_rate: p.gstrRate,
      gstr_tax: p.gstrTax,
      gstr_3b_status: p.gstr3bStatus,
      gstr_r1_date: p.gstrR1Date,
      gstr_rc: p.gstrRc,
      gstr_remark: p.gstrRemark,
      diff_invoice_value: p.diffInvoiceValue,
      diff_taxable_value: p.diffTaxableValue,
      diff_tax: p.diffTax,
      diff_remark: p.diffRemark,
    }));

    const { error } = await supabase.from('purchases').insert(payload);
    if (error) {
      console.warn('Supabase savePurchases notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

// -------------------------------------------------------------
// SALES CRUD (With Financial Year support)
// -------------------------------------------------------------
export async function fetchSalesFromSupabase(clientId: string, financialYear?: string): Promise<MonthlySalesRecord[] | null> {
  try {
    let query = supabase.from('sales').select('*').eq('client_id', clientId);
    if (financialYear) {
      query = query.eq('financial_year', financialYear);
    }
    const { data, error } = await query.order('month_index', { ascending: true });
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      month: row.month,
      monthIndex: row.month_index,
      taxableSales: Number(row.taxable_sales) || 0,
      exemptSales: Number(row.exempt_sales) || 0,
      totalSales: Number(row.total_sales) || 0,
      igst: Number(row.igst) || 0,
      cgst: Number(row.cgst) || 0,
      sgst: Number(row.sgst) || 0,
      cess: Number(row.cess) || 0,
      totalTax: Number(row.total_tax) || 0,
      taxRate: row.tax_rate ? Number(row.tax_rate) : undefined,
      remark: row.remark || '',
    }));
  } catch (err) {
    return null;
  }
}

export async function saveSalesToSupabase(
  clientId: string,
  financialYear: string,
  sales: MonthlySalesRecord[]
): Promise<boolean> {
  try {
    if (financialYear) {
      await supabase.from('sales').delete().eq('client_id', clientId).eq('financial_year', financialYear);
    } else {
      await supabase.from('sales').delete().eq('client_id', clientId);
    }

    if (sales.length === 0) return true;

    const payload = sales.map((s) => ({
      id: `${clientId}_${financialYear || '2025-2026'}_s_${s.monthIndex}`,
      client_id: clientId,
      financial_year: financialYear || '2025-2026',
      month: s.month,
      month_index: s.monthIndex,
      taxable_sales: s.taxableSales,
      exempt_sales: s.exemptSales,
      total_sales: s.totalSales,
      igst: s.igst,
      cgst: s.cgst,
      sgst: s.sgst,
      cess: s.cess,
      total_tax: s.totalTax,
      tax_rate: s.taxRate,
      remark: s.remark,
    }));

    const { error } = await supabase.from('sales').insert(payload);
    return !error;
  } catch (err) {
    return false;
  }
}

// -------------------------------------------------------------
// ITC CRUD (With Financial Year support)
// -------------------------------------------------------------
export async function fetchItcFromSupabase(clientId: string, financialYear?: string): Promise<MonthlyItcRecord[] | null> {
  try {
    let query = supabase.from('itc').select('*').eq('client_id', clientId);
    if (financialYear) {
      query = query.eq('financial_year', financialYear);
    }
    const { data, error } = await query.order('month_index', { ascending: true });
    if (error || !data) return null;

    return data.map((row: any) => ({
      id: row.id,
      month: row.month,
      monthIndex: row.month_index,
      exemptPurchase: Number(row.exempt_purchase) || 0,
      igst: Number(row.igst) || 0,
      cgst: Number(row.cgst) || 0,
      sgst: Number(row.sgst) || 0,
      cess: Number(row.cess) || 0,
      totalTax: Number(row.total_tax) || 0,
      openingItc: Number(row.opening_itc) || 0,
      closingItc: Number(row.closing_itc) || 0,
      remarks: row.remarks || '',
      invoiceRef: row.invoice_ref || '',
    }));
  } catch (err) {
    return null;
  }
}

export async function saveItcToSupabase(
  clientId: string,
  financialYear: string,
  itc: MonthlyItcRecord[]
): Promise<boolean> {
  try {
    if (financialYear) {
      await supabase.from('itc').delete().eq('client_id', clientId).eq('financial_year', financialYear);
    } else {
      await supabase.from('itc').delete().eq('client_id', clientId);
    }

    if (itc.length === 0) return true;

    const payload = itc.map((i) => ({
      id: `${clientId}_${financialYear || '2025-2026'}_itc_${i.monthIndex}`,
      client_id: clientId,
      financial_year: financialYear || '2025-2026',
      month: i.month,
      month_index: i.monthIndex,
      exempt_purchase: i.exemptPurchase,
      igst: i.igst,
      cgst: i.cgst,
      sgst: i.sgst,
      cess: i.cess,
      total_tax: i.totalTax,
      opening_itc: i.openingItc,
      closing_itc: i.closingItc,
      remarks: i.remarks,
      invoice_ref: i.invoiceRef,
    }));

    const { error } = await supabase.from('itc').insert(payload);
    return !error;
  } catch (err) {
    return false;
  }
}

// -------------------------------------------------------------
// CONSOLIDATED 3B CRUD (With Financial Year support)
// -------------------------------------------------------------
export async function fetchConsolidated3bFromSupabase(
  clientId: string,
  financialYear?: string
): Promise<Consolidated3BMonthRow[] | null> {
  try {
    let query = supabase.from('consolidated_3b').select('*').eq('client_id', clientId);
    if (financialYear) {
      query = query.eq('financial_year', financialYear);
    }
    const { data, error } = await query.order('month_index', { ascending: true });
    if (error || !data) return null;

    const partialRows = data.map((row: any) => ({
      month: row.month,
      monthShort: row.month_short,
      monthIndex: row.month_index,
      outwardNrc: Number(row.outward_nrc) || 0,
      outwardRc: Number(row.outward_rc) || 0,
      nonTaxable: Number(row.non_taxable) || 0,
      totalOutward: Number(row.total_outward) || 0,
      outwardIgst: Number(row.outward_igst) || 0,
      outwardCgst: Number(row.outward_cgst) || 0,
      outwardSgst: Number(row.outward_sgst) || 0,
      outwardCess: Number(row.outward_cess) || 0,
      cgstByCgst: Number(row.cgst_by_cgst) || 0,
      sgstBySgst: Number(row.sgst_by_sgst) || 0,
      igstByIgst: Number(row.igst_by_igst) || 0,
      cessByCess: Number(row.cess_by_cess) || 0,
      cashCgst: Number(row.tax_paid_cash_cgst) || 0,
      cashSgst: Number(row.tax_paid_cash_sgst) || 0,
      cashIgst: Number(row.tax_paid_cash_igst) || 0,
      cashCess: Number(row.tax_paid_cash_cess) || 0,
      inwardNrc: Number(row.inward_nrc) || 0,
      itcEligibleNrcCgst: Number(row.itc_eligible_nrc_cgst) || 0,
      itcEligibleNrcSgst: Number(row.itc_eligible_nrc_sgst) || 0,
      itcEligibleNrcIgst: Number(row.itc_eligible_nrc_igst) || 0,
      itcEligibleNrcCess: Number(row.itc_eligible_nrc_cess) || 0,
      itcIneligibleCgst: Number(row.itc_ineligible_cgst) || 0,
      itcIneligibleSgst: Number(row.itc_ineligible_sgst) || 0,
      filingDate: row.filing_date || '',
    }));

    return normalize12Months3B(partialRows, financialYear);
  } catch (err) {
    return null;
  }
}

export async function saveConsolidated3bToSupabase(
  clientId: string,
  financialYear: string,
  rows: Consolidated3BMonthRow[]
): Promise<boolean> {
  try {
    if (financialYear) {
      await supabase.from('consolidated_3b').delete().eq('client_id', clientId).eq('financial_year', financialYear);
    } else {
      await supabase.from('consolidated_3b').delete().eq('client_id', clientId);
    }

    if (rows.length === 0) return true;

    const payload = rows.map((r, i) => ({
      id: `${clientId}_${financialYear || '2025-2026'}_3b_${i}`,
      client_id: clientId,
      financial_year: financialYear || '2025-2026',
      month: r.month,
      month_short: r.monthShort,
      month_index: r.monthIndex,
      outward_nrc: r.outwardNrc,
      outward_rc: r.outwardRc,
      non_taxable: r.nonTaxable,
      total_outward: r.totalOutward,
      outward_igst: r.outwardIgst,
      outward_cgst: r.outwardCgst,
      outward_sgst: r.outwardSgst,
      outward_cess: r.outwardCess,
      cgst_by_cgst: r.cgstByCgst,
      sgst_by_sgst: r.sgstBySgst,
      igst_by_igst: r.igstByIgst,
      cess_by_cess: r.cessByCess,
      tax_paid_cash_cgst: r.cashCgst || 0,
      tax_paid_cash_sgst: r.cashSgst || 0,
      tax_paid_cash_igst: r.cashIgst || 0,
      tax_paid_cash_cess: r.cashCess || 0,
      inward_nrc: r.inwardNrc,
      itc_eligible_nrc_cgst: r.itcEligibleNrcCgst,
      itc_eligible_nrc_sgst: r.itcEligibleNrcSgst,
      itc_eligible_nrc_igst: r.itcEligibleNrcIgst,
      itc_eligible_nrc_cess: r.itcEligibleNrcCess,
      itc_ineligible_cgst: r.itcIneligibleCgst,
      itc_ineligible_sgst: r.itcIneligibleSgst,
      filing_date: r.filingDate,
    }));

    const { error } = await supabase.from('consolidated_3b').insert(payload);
    return !error;
  } catch (err) {
    return false;
  }
}

// -------------------------------------------------------------
// SETTINGS CRUD
// -------------------------------------------------------------
export async function fetchSettingsFromSupabase(clientId: string): Promise<CompanySettings | null> {
  try {
    const { data, error } = await supabase.from('company_settings').select('*').eq('client_id', clientId).maybeSingle();
    if (error || !data) return null;

    return {
      companyName: data.company_name || '',
      gstin: data.gstin || '',
      financialYear: data.financial_year || '2025-2026',
      fileNo: data.file_no || '',
      selectedMonth: data.selected_month || 'All',
      invoiceMatchingTolerance: Number(data.invoice_matching_tolerance) || 5.0,
      taxDifferenceTolerance: Number(data.tax_difference_tolerance) || 1.0,
      decimalPrecision: Number(data.decimal_precision) || 2,
      reportDate: data.report_date || '',
      pdfFileName: data.pdf_file_name || '',
      importMode: (data.import_mode as any) || 'APPEND',
    };
  } catch (err) {
    return null;
  }
}

export async function saveSettingsToSupabase(clientId: string, settings: CompanySettings): Promise<boolean> {
  try {
    const payload = {
      client_id: clientId,
      company_name: settings.companyName,
      gstin: settings.gstin,
      financial_year: settings.financialYear || '2025-2026',
      file_no: settings.fileNo,
      selected_month: settings.selectedMonth,
      invoice_matching_tolerance: settings.invoiceMatchingTolerance,
      tax_difference_tolerance: settings.taxDifferenceTolerance,
      decimal_precision: settings.decimalPrecision,
      report_date: settings.reportDate,
      pdf_file_name: settings.pdfFileName,
      import_mode: settings.importMode,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('company_settings').upsert(payload, { onConflict: 'client_id' });
    return !error;
  } catch (err) {
    return false;
  }
}

// -------------------------------------------------------------
// SEED ALL DEMO DATA TO SUPABASE (Ensures 100% cloud database coverage)
// -------------------------------------------------------------
export async function seedAllDemoDataToSupabase(): Promise<boolean> {
  try {
    // 1. Upsert all 5 client profiles
    await upsertClientsToSupabase(DEFAULT_5_CLIENT_PROFILES);

    // 2. Client 1: Goswami
    const c1Purchases = await fetchPurchasesFromSupabase('client_master_goswami', '2025-2026');
    if (!c1Purchases || c1Purchases.length === 0) {
      await saveSettingsToSupabase('client_master_goswami', {
        ...DEFAULT_SETTINGS,
        companyName: INITIAL_CLIENT_PROFILE.companyName,
        fileNo: INITIAL_CLIENT_PROFILE.fileNo,
        gstin: INITIAL_CLIENT_PROFILE.gstin,
        financialYear: '2025-2026',
      });
      await savePurchasesToSupabase('client_master_goswami', '2025-2026', INITIAL_PURCHASE_RECORDS);
      await saveSalesToSupabase('client_master_goswami', '2025-2026', deriveSalesFrom3B(INITIAL_CONSOLIDATED_3B_DATA, '2025-2026'));
      await saveItcToSupabase('client_master_goswami', '2025-2026', normalize12MonthsItc(INITIAL_ITC_RECORDS, '2025-2026'));
      await saveConsolidated3bToSupabase('client_master_goswami', '2025-2026', normalize12Months3B(INITIAL_CONSOLIDATED_3B_DATA, '2025-2026'));
    }

    // 3. Client 2: Bharat Hardware
    const c2Purchases = await fetchPurchasesFromSupabase('client_file_124', '2025-2026');
    if (!c2Purchases || c2Purchases.length === 0) {
      await saveSettingsToSupabase('client_file_124', {
        ...DEFAULT_SETTINGS,
        companyName: 'BHARAT HARDWARE & PAINTS',
        fileNo: '124',
        gstin: '20AABCB4567M1Z3',
        financialYear: '2025-2026',
      });
      await savePurchasesToSupabase('client_file_124', '2025-2026', CLIENT_2_PURCHASES);
      await saveSalesToSupabase('client_file_124', '2025-2026', normalize12MonthsSales(CLIENT_2_SALES, '2025-2026'));
      await saveItcToSupabase('client_file_124', '2025-2026', normalize12MonthsItc([], '2025-2026'));
      await saveConsolidated3bToSupabase('client_file_124', '2025-2026', normalize12Months3B([], '2025-2026'));
    }

    // 4. Client 3: Sharma Electricals
    const c3Purchases = await fetchPurchasesFromSupabase('client_file_125', '2025-2026');
    if (!c3Purchases || c3Purchases.length === 0) {
      await saveSettingsToSupabase('client_file_125', {
        ...DEFAULT_SETTINGS,
        companyName: 'SHARMA ELECTRICALS & SANITARY',
        fileNo: '125',
        gstin: '20AABCS7890N1Z8',
        financialYear: '2025-2026',
      });
      await savePurchasesToSupabase('client_file_125', '2025-2026', CLIENT_3_PURCHASES);
      await saveSalesToSupabase('client_file_125', '2025-2026', normalize12MonthsSales(CLIENT_3_SALES, '2025-2026'));
      await saveItcToSupabase('client_file_125', '2025-2026', normalize12MonthsItc([], '2025-2026'));
      await saveConsolidated3bToSupabase('client_file_125', '2025-2026', normalize12Months3B([], '2025-2026'));
    }

    // 5. Client 4: Royal Automobiles
    const c4Purchases = await fetchPurchasesFromSupabase('client_file_126', '2025-2026');
    if (!c4Purchases || c4Purchases.length === 0) {
      await saveSettingsToSupabase('client_file_126', {
        ...DEFAULT_SETTINGS,
        companyName: 'ROYAL AUTOMOBILES & SPARES',
        fileNo: '126',
        gstin: '20AACCR1234P1Z2',
        financialYear: '2025-2026',
      });
      await savePurchasesToSupabase('client_file_126', '2025-2026', CLIENT_4_PURCHASES);
      await saveSalesToSupabase('client_file_126', '2025-2026', normalize12MonthsSales(CLIENT_4_SALES, '2025-2026'));
      await saveItcToSupabase('client_file_126', '2025-2026', normalize12MonthsItc([], '2025-2026'));
      await saveConsolidated3bToSupabase('client_file_126', '2025-2026', normalize12Months3B([], '2025-2026'));
    }

    // 6. Client 5: Gupta Textiles
    const c5Purchases = await fetchPurchasesFromSupabase('client_file_127', '2025-2026');
    if (!c5Purchases || c5Purchases.length === 0) {
      await saveSettingsToSupabase('client_file_127', {
        ...DEFAULT_SETTINGS,
        companyName: 'GUPTA TEXTILES & TRADERS',
        fileNo: '127',
        gstin: '20AABCG5678Q1Z6',
        financialYear: '2025-2026',
      });
      await savePurchasesToSupabase('client_file_127', '2025-2026', CLIENT_5_PURCHASES);
      await saveSalesToSupabase('client_file_127', '2025-2026', normalize12MonthsSales(CLIENT_5_SALES, '2025-2026'));
      await saveItcToSupabase('client_file_127', '2025-2026', normalize12MonthsItc([], '2025-2026'));
      await saveConsolidated3bToSupabase('client_file_127', '2025-2026', normalize12Months3B([], '2025-2026'));
    }

    return true;
  } catch (err) {
    console.warn('seedAllDemoDataToSupabase error:', err);
    return false;
  }
}

// Test connectivity
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.from('clients').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return { ok: false, message: 'Tables missing in Supabase. Running DDL setup...' };
      }
      return { ok: false, message: `Supabase Error: ${error.message}` };
    }
    return { ok: true, message: 'Connected to Supabase PostgreSQL!' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Connection failed' };
  }
}
