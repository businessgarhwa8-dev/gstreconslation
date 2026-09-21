export type UserRole = 'ADMIN' | 'STAFF';

export type MatchingStatus =
  | 'MATCHED'
  | 'PARTIALLY MATCHED'
  | 'NOT MATCHED'
  | 'MISSING IN PURCHASE'
  | 'MISSING IN ITC'
  | 'MISSING IN GSTR DATA'
  | 'TAX DIFFERENCE'
  | 'VALUE DIFFERENCE'
  | 'DATE DIFFERENCE'
  | 'DUPLICATE'
  | 'PENDING VERIFICATION';

export interface PurchaseRecord {
  id: string;
  sr: number;
  status: MatchingStatus | string;
  party: string;
  gstin: string;
  period: string; // e.g. 'Apr-25' or '04-2025'
  invoiceNo: string;
  pos: string; // Place of supply (e.g. '20-Jharkhand')
  invoiceDate: string;
  invoiceValue: number;
  taxableValue: number;
  rate: number; // e.g. 5, 12, 18
  tax: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  cfs: string; // Customer Filing Status (Y/N)
  rc: string; // Reverse Charge (Y/N)
  remark: string;

  // GSTR-2A / 2B matched counterpart data if present (matches Image 1)
  gstrStatus?: string;
  gstrGstin?: string;
  gstrInvoiceNo?: string;
  gstrInvoiceDate?: string;
  gstrTaxableValue?: number;
  gstrIgst?: number;
  gstrCgst?: number;
  gstrSgst?: number;
  gstrCess?: number;
  gstrPeriod?: string;
  gstrPos?: string;
  gstrInvoiceValue?: number;
  gstrRate?: number;
  gstrTax?: number;
  gstr3bStatus?: 'Filed' | 'Not Filed' | string;
  gstrR1Date?: string;
  gstrRc?: string;
  gstrRemark?: string;

  // Difference fields (Image 1 third block)
  diffInvoiceValue?: number;
  diffTaxableValue?: number;
  diffTax?: number;
  diffRemark?: string;
}

export interface MonthlySalesRecord {
  id: string;
  month: string; // 'Apr-25', 'May-25', etc.
  monthIndex: number; // 0 for April, 11 for March
  taxableSales: number;
  exemptSales: number;
  totalSales: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
  taxRate?: number;
  remark?: string;
}

export interface MonthlyItcRecord {
  id: string;
  month: string; // 'Apr-25', etc.
  monthIndex: number;
  exemptPurchase: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
  openingItc?: number;
  closingItc?: number;
  remarks?: string;
  invoiceRef?: string;
}

export interface ItcHeadBalance {
  head: 'IGST' | 'CGST' | 'SGST' | 'CESS';
  opening: number;
  closing: number;
}

export interface ClientProfile {
  id: string;
  fileNo: string; // Dossier / File number e.g. '123', 'FILE-01'
  companyName: string;
  tradeName?: string;
  gstin: string; // 15 chars e.g. '20AUEPG3207H1ZD'
  financialYear: string; // e.g. '2025-2026'
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDataStore {
  client: ClientProfile;
  settings: CompanySettings;
  purchases: PurchaseRecord[];
  sales: MonthlySalesRecord[];
  itc: MonthlyItcRecord[];
  itcBalances: ItcHeadBalance[];
  consolidated3b: Consolidated3BMonthRow[];
}

export interface CompanySettings {
  companyName: string;
  gstin: string;
  financialYear: string; // e.g. '2025-2026'
  fileNo: string; // e.g. '123'
  selectedMonth: string; // e.g. 'All' or 'March'
  invoiceMatchingTolerance: number; // e.g. 5.0
  taxDifferenceTolerance: number; // e.g. 1.0
  decimalPrecision: number; // 2
  reportDate: string;
  pdfFileName: string;
  importMode: 'APPEND' | 'REPLACE';
}

export interface RateWiseSummaryItem {
  rate: number;
  rateLabel: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
}

export interface GstinAnalysisItem {
  gstin: string;
  partyName: string;
  invoiceCount: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
  itcAvailable: number;
  matchedAmount: number;
  difference: number;
  status: MatchingStatus;
}

export interface MonthlyDashboardRow {
  month: string;
  sales: number;
  purchase: number;
  itc: number;
  gst: number;
  difference: number;
  matchPercentage: number;
}

export type ExcelType =
  | 'PURCHASE'
  | 'SALES'
  | 'ITC'
  | 'COMBINED_PURCHASE_SALES'
  | 'GSTR3B_CONSOLIDATED'
  | 'GSTR2A_RECONCILIATION';

export interface Consolidated3BMonthRow {
  month: string; // 'April', 'May', ...
  monthShort: string; // 'Apr-25', 'May-25', ...
  monthIndex: number; // 0 to 11

  // Table 1: Outward Supply
  outwardNrc: number;
  outwardRc: number;
  nonTaxable: number;
  totalOutward: number;

  // Table 1: Liability on Outward
  outwardIgst: number;
  outwardCgst: number;
  outwardSgst: number;
  outwardCess: number;

  // Table 1: Paid by credit (Offset)
  igstByIgst: number;
  igstByCgst: number;
  igstBySgst: number;
  cgstByIgst: number;
  cgstByCgst: number;
  sgstByIgst: number;
  sgstBySgst: number;
  cessByCess: number;

  // Table 1: Paid by cash
  cashIgst: number;
  cashCgst: number;
  cashSgst: number;
  cashCess: number;

  // Table 2: Inward Supply Value
  inwardRc: number;
  inwardNrc: number;
  nonGst: number;
  totalInward: number;

  // Table 2: Liability on Reverse Charge (RCM)
  rcmIgst: number;
  rcmCgst: number;
  rcmSgst: number;
  rcmCess: number;

  // Table 2: RCM Paid by cash
  rcmCashIgst: number;
  rcmCashCgst: number;
  rcmCashSgst: number;
  rcmCashCess: number;

  // Table 2: Interest
  interestIgst: number;
  interestCgst: number;
  interestSgst: number;
  interestCess: number;

  // Table 2: Late fees
  lateFeesCgst: number;
  lateFeesSgst: number;

  // Table 2: Dates
  dueDate: string;
  filingDate: string;

  // Table 3: ITC Eligible (NRC)
  itcEligibleNrcIgst: number;
  itcEligibleNrcCgst: number;
  itcEligibleNrcSgst: number;
  itcEligibleNrcCess: number;

  // Table 3: ITC Eligible (RC)
  itcEligibleRcIgst: number;
  itcEligibleRcCgst: number;
  itcEligibleRcSgst: number;
  itcEligibleRcCess: number;

  // Table 3: ITC Reversed
  itcReversedIgst: number;
  itcReversedCgst: number;
  itcReversedSgst: number;
  itcReversedCess: number;

  // Table 3: ITC Ineligible
  itcIneligibleIgst: number;
  itcIneligibleCgst: number;
  itcIneligibleSgst: number;
  itcIneligibleCess: number;

  // Table 3: ITC Reclaimed
  itcReclaimedIgst: number;
  itcReclaimedCgst: number;
  itcReclaimedSgst: number;
  itcReclaimedCess: number;
}

export interface MasterGstr2aMonthlyRow {
  month: string;
  monthIndex: number;
  taxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalIncTax: number;
}

export interface ValidationIssue {
  id: string;
  type: 'ERROR' | 'WARNING' | 'INFO';
  category: 'GSTIN' | 'INVOICE' | 'TAX' | 'DUPLICATE' | 'ITC';
  message: string;
  module?: string;
  invoiceNo?: string;
  gstin?: string;
  recordId?: string;
}
