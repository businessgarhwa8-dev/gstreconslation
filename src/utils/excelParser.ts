import * as XLSX from 'xlsx';
import {
  PurchaseRecord,
  MonthlySalesRecord,
  MonthlyItcRecord,
  Consolidated3BMonthRow,
  ExcelType,
} from '../types/gst';
import { parseNumber } from './formatters';

export const MASTER_PURCHASE_COLUMNS = [
  'Sr',
  'Status',
  'Party',
  'GSTIN',
  'Period',
  'Invoice No',
  'POS',
  'Invoice Date',
  'Invoice Value',
  'Taxable Value',
  'Rate',
  'Tax',
  'IGST',
  'CGST',
  'SGST',
  'CESS',
  'CFS',
  'RC',
  'Remark',
];

export const MASTER_SALES_COLUMNS = [
  'Month',
  'Taxable Sales',
  'Exempt Sales',
  'Total Sales',
  'IGST',
  'CGST',
  'SGST',
  'CESS',
  'Total Tax',
  'Tax Rate',
];

export const MASTER_ITC_COLUMNS = [
  'Month',
  'Exempt Purchase',
  'IGST',
  'CGST',
  'SGST',
  'CESS',
  'Total Tax',
  'Opening ITC',
  'Closing ITC',
  'Remarks',
  'Invoice / Reference Number',
];

// Columns for GSTR-2A vs Books Reconciliation format (Image 1)
export const MASTER_GSTR2A_RECONCILIATION_COLUMNS = [
  'Sr',
  'Status',
  'Party',
  'GSTIN',
  'Period',
  'Invoice No',
  'POS',
  'Invoice Date',
  'Invoice Value',
  'Taxable Value',
  'Rate',
  'Tax',
  'CFS',
  'RC',
  'Remark',
  'GSTR GSTIN',
  'GSTR Period',
  'GSTR Invoice No',
  'GSTR POS',
  'GSTR Invoice Date',
  'GSTR Invoice Value',
  'GSTR Taxable Value',
  'GSTR Rate',
  'GSTR Tax',
  'GSTR 3B Status',
  'GSTR R1 Date',
  'GSTR RC',
  'GSTR Remark',
  'Diff Invoice Value',
  'Diff Taxable Value',
  'Diff Tax',
  'Diff Remark',
];

// Columns for Consolidated 3B Offset format (Image 2)
export const MASTER_CONSOLIDATED_3B_COLUMNS = [
  'Month',
  'Outward NRC',
  'Outward RC',
  'Non-Taxable',
  'Total Outward',
  'Outward IGST',
  'Outward CGST',
  'Outward SGST',
  'Outward CESS',
  'CGST by IGST',
  'CGST by CGST',
  'SGST by IGST',
  'SGST by SGST',
  'Cash IGST',
  'Cash CGST',
  'Cash SGST',
  'Cash CESS',
  'Inward RC',
  'Inward NRC',
  'Non GST',
  'Total Inward',
  'RCM IGST',
  'RCM Paid Cash',
  'Interest',
  'Late Fees CGST',
  'Late Fees SGST',
  'Due Date',
  'Filing Date',
  'ITC Eligible NRC IGST',
  'ITC Eligible NRC CGST',
  'ITC Eligible NRC SGST',
  'ITC Eligible NRC CESS',
  'ITC Eligible RC IGST',
];

export interface ExcelValidationResult {
  isValid: boolean;
  expectedColumns: string[];
  uploadedColumns: string[];
  missingColumns: string[];
  extraColumns: string[];
  errorMessage?: string;
}

function normalizeHeader(h: any): string {
  if (h === undefined || h === null) return '';
  return String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function validateExcelTemplate(
  fileHeaders: string[],
  type: ExcelType
): ExcelValidationResult {
  const masterCols =
    type === 'PURCHASE'
      ? MASTER_PURCHASE_COLUMNS
      : type === 'SALES'
      ? MASTER_SALES_COLUMNS
      : type === 'ITC'
      ? MASTER_ITC_COLUMNS
      : type === 'GSTR2A_RECONCILIATION'
      ? MASTER_GSTR2A_RECONCILIATION_COLUMNS
      : MASTER_CONSOLIDATED_3B_COLUMNS;

  const normalizedMaster = masterCols.map((c) => ({
    original: c,
    norm: normalizeHeader(c),
  }));

  const normalizedUploaded = fileHeaders.map((c) => ({
    original: c,
    norm: normalizeHeader(c),
  }));

  const missingColumns: string[] = [];
  normalizedMaster.forEach((m) => {
    const found = normalizedUploaded.some((u) => u.norm === m.norm);
    if (!found) {
      missingColumns.push(m.original);
    }
  });

  const extraColumns: string[] = [];
  normalizedUploaded.forEach((u) => {
    if (u.norm && !normalizedMaster.some((m) => m.norm === u.norm)) {
      if (type === 'PURCHASE' && u.norm.startsWith('gstr')) return;
      extraColumns.push(u.original);
    }
  });

  // For flexible import: determine if core mandatory fields exist
  let coreValid = false;
  if (type === 'PURCHASE') {
    const hasGstin = normalizedUploaded.some((u) => u.norm.includes('gstin') || u.norm.includes('gst'));
    const hasTaxable = normalizedUploaded.some((u) => u.norm.includes('taxable') || u.norm.includes('value'));
    coreValid = hasGstin && hasTaxable;
  } else if (type === 'SALES') {
    const hasMonth = normalizedUploaded.some((u) => u.norm.includes('month') || u.norm.includes('period'));
    const hasSales = normalizedUploaded.some((u) => u.norm.includes('sales') || u.norm.includes('taxable'));
    coreValid = hasMonth || hasSales;
  } else if (type === 'ITC') {
    const hasMonth = normalizedUploaded.some((u) => u.norm.includes('month') || u.norm.includes('period'));
    const hasTax = normalizedUploaded.some((u) => u.norm.includes('tax') || u.norm.includes('igst') || u.norm.includes('itc'));
    coreValid = hasMonth || hasTax;
  } else if (type === 'GSTR2A_RECONCILIATION') {
    const hasGstr = normalizedUploaded.some((u) => u.norm.includes('gstr') || u.norm.includes('2a') || u.norm.includes('diff'));
    const hasInv = normalizedUploaded.some((u) => u.norm.includes('invoice') || u.norm.includes('bill'));
    coreValid = hasGstr || hasInv;
  } else if (type === 'GSTR3B_CONSOLIDATED') {
    const hasOutward = normalizedUploaded.some((u) => u.norm.includes('outward') || u.norm.includes('liability') || u.norm.includes('paid'));
    coreValid = hasOutward;
  }

  const isValid = missingColumns.length === 0 || coreValid;
  let errorMessage: string | undefined = undefined;

  if (!isValid) {
    errorMessage = `Excel file headers do not match. Missing key columns: ${missingColumns.slice(0, 5).join(', ')}...`;
  }

  return {
    isValid,
    expectedColumns: masterCols,
    uploadedColumns: fileHeaders,
    missingColumns,
    extraColumns,
    errorMessage,
  };
}

export function formatExcelDate(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'number') {
    // Excel date serial
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      const d = String(jsDate.getDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = monthNames[jsDate.getMonth()];
      const y = String(jsDate.getFullYear()).slice(-2);
      return `${d}-${m}-${y}`;
    }
  }
  return String(val).trim();
}

export function parseGstr2a3SectionRows(rawRows: any[][], headerRowIdx: number): any[] {
  const headerRow = rawRows[headerRowIdx] || [];
  let firstPeriodIdx = -1, secondPeriodIdx = -1, thirdPeriodIdx = -1;
  let firstInvIdx = -1, secondInvIdx = -1, thirdInvIdx = -1;
  let firstTaxableIdx = -1, secondTaxableIdx = -1, thirdTaxableIdx = -1;
  let firstTaxIdx = -1, secondTaxIdx = -1, thirdTaxIdx = -1;
  let firstInvValIdx = -1, secondInvValIdx = -1, thirdInvValIdx = -1;
  let firstPosIdx = -1, secondPosIdx = -1, thirdPosIdx = -1;
  let firstDateIdx = -1, secondDateIdx = -1, thirdDateIdx = -1;
  let firstRateIdx = -1, secondRateIdx = -1;
  let srIdx = -1, statusIdx = -1, partyIdx = -1, gstinIdx = -1, cfsIdx = -1, rcIdx = -1, remarkIdx = -1;
  let gstr3bStatusIdx = -1, gstrR1DateIdx = -1, gstrRcIdx = -1, gstrRemarkIdx = -1;
  let diffRemarkIdx = -1;

  headerRow.forEach((cell, colIdx) => {
    const norm = String(cell || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm === 'sr' || norm === 'sno') srIdx = colIdx;
    else if (norm === 'status') statusIdx = colIdx;
    else if (norm === 'party' || norm === 'partyname' || norm === 'supplier') partyIdx = colIdx;
    else if (norm === 'gstin' || norm === 'suppliergstin') gstinIdx = colIdx;
    else if (norm.includes('period') || norm === 'month') {
      if (firstPeriodIdx === -1) firstPeriodIdx = colIdx;
      else if (secondPeriodIdx === -1) secondPeriodIdx = colIdx;
      else if (thirdPeriodIdx === -1) thirdPeriodIdx = colIdx;
    } else if (norm.includes('invoiceno') || norm.includes('invno') || norm === 'billno') {
      if (firstInvIdx === -1) firstInvIdx = colIdx;
      else if (secondInvIdx === -1) secondInvIdx = colIdx;
      else if (thirdInvIdx === -1) thirdInvIdx = colIdx;
    } else if (norm === 'pos' || norm.includes('placeofsupply')) {
      if (firstPosIdx === -1) firstPosIdx = colIdx;
      else if (secondPosIdx === -1) secondPosIdx = colIdx;
      else if (thirdPosIdx === -1) thirdPosIdx = colIdx;
    } else if (norm.includes('date')) {
      if (norm.includes('r1')) gstrR1DateIdx = colIdx;
      else if (firstDateIdx === -1) firstDateIdx = colIdx;
      else if (secondDateIdx === -1) secondDateIdx = colIdx;
      else if (thirdDateIdx === -1) thirdDateIdx = colIdx;
    } else if (norm.includes('taxable')) {
      if (firstTaxableIdx === -1) firstTaxableIdx = colIdx;
      else if (secondTaxableIdx === -1) secondTaxableIdx = colIdx;
      else if (thirdTaxableIdx === -1) thirdTaxableIdx = colIdx;
    } else if (norm.includes('invoiceval') || norm.includes('invval') || norm.includes('grossval')) {
      if (firstInvValIdx === -1) firstInvValIdx = colIdx;
      else if (secondInvValIdx === -1) secondInvValIdx = colIdx;
      else if (thirdInvValIdx === -1) thirdInvValIdx = colIdx;
    } else if (norm === 'tax' || norm === 'taxamount' || norm === 'totaltax') {
      if (firstTaxIdx === -1) firstTaxIdx = colIdx;
      else if (secondTaxIdx === -1) secondTaxIdx = colIdx;
      else if (thirdTaxIdx === -1) thirdTaxIdx = colIdx;
    } else if (norm === 'rate' || norm.includes('taxrate')) {
      if (firstRateIdx === -1) firstRateIdx = colIdx;
      else if (secondRateIdx === -1) secondRateIdx = colIdx;
    } else if (norm.includes('3bstatus')) gstr3bStatusIdx = colIdx;
    else if (norm === 'cfs') cfsIdx = colIdx;
    else if (norm === 'rc' || norm.includes('reversecharge')) {
      if (rcIdx === -1) rcIdx = colIdx;
      else gstrRcIdx = colIdx;
    } else if (norm.includes('remark') || norm.includes('criteria')) {
      if (remarkIdx === -1) remarkIdx = colIdx;
      else if (gstrRemarkIdx === -1) gstrRemarkIdx = colIdx;
      else diffRemarkIdx = colIdx;
    }
  });

  // Safe fallback indices matching Image 1 standard layout
  if (firstPeriodIdx === -1) firstPeriodIdx = 4;
  if (secondPeriodIdx === -1) secondPeriodIdx = 15;
  if (thirdPeriodIdx === -1) thirdPeriodIdx = 27;

  if (firstInvIdx === -1) firstInvIdx = 5;
  if (secondInvIdx === -1) secondInvIdx = 16;
  if (thirdInvIdx === -1) thirdInvIdx = 28;

  if (firstPosIdx === -1) firstPosIdx = 6;
  if (secondPosIdx === -1) secondPosIdx = 17;
  if (thirdPosIdx === -1) thirdPosIdx = 29;

  if (firstDateIdx === -1) firstDateIdx = 7;
  if (secondDateIdx === -1) secondDateIdx = 18;
  if (thirdDateIdx === -1) thirdDateIdx = 30;

  if (firstInvValIdx === -1) firstInvValIdx = 8;
  if (secondInvValIdx === -1) secondInvValIdx = 19;
  if (thirdInvValIdx === -1) thirdInvValIdx = 31;

  if (firstTaxableIdx === -1) firstTaxableIdx = 9;
  if (secondTaxableIdx === -1) secondTaxableIdx = 20;
  if (thirdTaxableIdx === -1) thirdTaxableIdx = 32;

  if (firstRateIdx === -1) firstRateIdx = 10;
  if (secondRateIdx === -1) secondRateIdx = 21;

  if (firstTaxIdx === -1) firstTaxIdx = 11;
  if (secondTaxIdx === -1) secondTaxIdx = 22;
  if (thirdTaxIdx === -1) thirdTaxIdx = 33;

  if (cfsIdx === -1) cfsIdx = 12;
  if (rcIdx === -1) rcIdx = 13;
  if (remarkIdx === -1) remarkIdx = 14;

  if (gstr3bStatusIdx === -1) gstr3bStatusIdx = 23;
  if (gstrR1DateIdx === -1) gstrR1DateIdx = 24;
  if (gstrRcIdx === -1) gstrRcIdx = 25;
  if (gstrRemarkIdx === -1) gstrRemarkIdx = 26;
  if (diffRemarkIdx === -1) diffRemarkIdx = 34;

  const dataRows: any[] = [];
  for (let rIdx = headerRowIdx + 1; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx];
    if (!row || row.length === 0) continue;
    const firstCell = String(row[0] || row[1] || '').trim();
    if (firstCell.toLowerCase().startsWith('total')) continue;

    const hasData = row.some((c: any) => c !== undefined && c !== null && String(c).trim() !== '');
    if (!hasData) continue;

    dataRows.push({
      'Sr': row[srIdx !== -1 ? srIdx : 0] || dataRows.length + 1,
      'Status': row[statusIdx !== -1 ? statusIdx : 1] || 'Not in Rec',
      'Party': row[partyIdx !== -1 ? partyIdx : 2] || '',
      'GSTIN': String(row[gstinIdx !== -1 ? gstinIdx : 3] || '').trim().toUpperCase(),
      'Period': row[firstPeriodIdx] || '',
      'Invoice No': row[firstInvIdx] || '',
      'POS': row[firstPosIdx] || 'Jharkhand',
      'Invoice Date': formatExcelDate(row[firstDateIdx]),
      'Invoice Value': row[firstInvValIdx] ?? 0,
      'Taxable Value': row[firstTaxableIdx] ?? 0,
      'Rate': row[firstRateIdx] ?? 0,
      'Tax': row[firstTaxIdx] ?? 0,
      'CFS': row[cfsIdx] || 'No',
      'RC': row[rcIdx] || 'No',
      'Remark': row[remarkIdx] || '',
      'GSTR GSTIN': String(row[gstinIdx !== -1 ? gstinIdx : 3] || '').trim().toUpperCase(),
      'GSTR Period': row[secondPeriodIdx] || '',
      'GSTR Invoice No': row[secondInvIdx] || '',
      'GSTR POS': row[secondPosIdx] || 'Jhark',
      'GSTR Invoice Date': formatExcelDate(row[secondDateIdx]),
      'GSTR Invoice Value': row[secondInvValIdx] ?? 0,
      'GSTR Taxable Value': row[secondTaxableIdx] ?? 0,
      'GSTR Rate': row[secondRateIdx] ?? 0,
      'GSTR Tax': row[secondTaxIdx] ?? 0,
      'GSTR 3B Status': row[gstr3bStatusIdx] || '',
      'GSTR R1 Date': formatExcelDate(row[gstrR1DateIdx]),
      'GSTR RC': row[gstrRcIdx] || 'No',
      'GSTR Remark': row[gstrRemarkIdx] || '',
      'Diff Invoice Value': row[thirdInvValIdx] ?? 0,
      'Diff Taxable Value': row[thirdTaxableIdx] ?? 0,
      'Diff Tax': row[thirdTaxIdx] ?? 0,
      'Diff Remark': row[diffRemarkIdx] || '',
    });
  }

  return dataRows;
}

export async function parseExcelFile(
  file: File,
  type: ExcelType
): Promise<{
  data: any[];
  headers: string[];
  validation: ExcelValidationResult;
  detectedLayout?: 'STANDARD' | 'GSTR2A_3SECTION' | 'GSTR3B_CONSOLIDATED';
  extractedMetadata?: {
    companyName?: string;
    gstin?: string;
    financialYear?: string;
  };
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel workbook has no sheets');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawRows.length === 0) {
    throw new Error('Uploaded Excel file is empty');
  }

  // 1. Scan first 10 rows for taxpayer metadata (e.g. GYANI GOSAI (20AUEPG3207H1ZD) (F.Y.:2025-2026))
  let extractedMetadata: { companyName?: string; gstin?: string; financialYear?: string } | undefined = undefined;
  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const rowStr = (rawRows[i] || []).map((c) => String(c || '').trim()).join(' ');
    const gstinMatch = rowStr.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
    const fyMatch = rowStr.match(/(?:F\.?Y\.?:?\s*)([0-9]{4}-[0-9]{4})/i) || rowStr.match(/([0-9]{4}-[0-9]{4})/);
    const compMatch = rowStr.match(/^([A-Z0-9\s.,&'-]+?)(?:\s*\()/i);

    if (gstinMatch || fyMatch || compMatch) {
      extractedMetadata = {
        companyName: compMatch ? compMatch[1].trim() : 'GYANI GOSAI',
        gstin: gstinMatch ? gstinMatch[1].toUpperCase() : '20AUEPG3207H1ZD',
        financialYear: fyMatch ? fyMatch[1] : '2025-2026',
      };
      break;
    }
  }

  // 2. Detect 3-section GSTR-2A format (Books vs 2A vs Diff as in Image 1)
  let is3Section = false;
  let headerRowIndex = 0;

  for (let i = 0; i < Math.min(8, rawRows.length); i++) {
    const row = rawRows[i] || [];
    const rowText = row.map((c) => String(c || '').trim().toLowerCase()).join(' ');
    if (
      rowText.includes('as per records') ||
      rowText.includes('gstr-2a reconciliation') ||
      rowText.includes('as per gstr')
    ) {
      is3Section = true;
    }
    const hasStatus = row.some((c) => String(c || '').trim().toLowerCase() === 'status');
    const hasInvoice = row.some((c) => String(c || '').trim().toLowerCase().includes('invoice'));
    if (hasStatus && hasInvoice) {
      headerRowIndex = i;
      is3Section = true;
      break;
    }
  }

  if (is3Section) {
    const dataRows = parseGstr2a3SectionRows(rawRows, headerRowIndex);
    const headers = (rawRows[headerRowIndex] || []).map((c) => String(c || '').trim());
    return {
      data: dataRows,
      headers: headers.length > 0 ? headers : MASTER_GSTR2A_RECONCILIATION_COLUMNS,
      validation: {
        isValid: true,
        expectedColumns: MASTER_GSTR2A_RECONCILIATION_COLUMNS,
        uploadedColumns: headers,
        missingColumns: [],
        extraColumns: [],
      },
      detectedLayout: 'GSTR2A_3SECTION',
      extractedMetadata,
    };
  }

  // 3. Standard single-table header detection
  for (let i = 0; i < Math.min(6, rawRows.length); i++) {
    const row = rawRows[i];
    if (row && row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '').length >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaders = (rawRows[headerRowIndex] || []).map((c) => String(c || '').trim());
  const validation = validateExcelTemplate(rawHeaders, type);

  const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
    range: headerRowIndex,
    defval: '',
  });

  return {
    data: jsonRows,
    headers: rawHeaders,
    validation,
    detectedLayout: 'STANDARD',
    extractedMetadata,
  };
}

export function transformParsedPurchase(rows: any[], existingCount: number = 0): PurchaseRecord[] {
  return rows.map((r, index) => {
    const getVal = (possibleKeys: string[]) => {
      for (const k of possibleKeys) {
        if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
        const lowerNorm = normalizeHeader(k);
        for (const rowKey of Object.keys(r)) {
          if (normalizeHeader(rowKey) === lowerNorm && r[rowKey] !== undefined) return r[rowKey];
        }
      }
      return '';
    };

    const gstin = String(getVal(['GSTIN', 'GST No', 'Supplier GSTIN'])).trim().toUpperCase();
    const invoiceNo = String(getVal(['Invoice No', 'Invoice Number', 'Bill No', 'Inv No'])).trim();
    const invoiceDate = String(getVal(['Invoice Date', 'Date', 'Inv Date'])).trim();
    const taxableValue = parseNumber(getVal(['Taxable Value', 'Taxable Amount', 'Taxable']));
    const rate = parseNumber(getVal(['Rate', 'Tax Rate', 'GST Rate', 'Rate %']));
    const igst = parseNumber(getVal(['IGST', 'Integrated Tax', 'IGST Amount']));
    const cgst = parseNumber(getVal(['CGST', 'Central Tax', 'CGST Amount']));
    const sgst = parseNumber(getVal(['SGST', 'State/UT tax', 'SGST Amount', 'UTGST']));
    const cess = parseNumber(getVal(['CESS', 'Cess']));
    const tax = parseNumber(getVal(['Tax', 'Total Tax'])) || (igst + cgst + sgst + cess);
    const invoiceValue = parseNumber(getVal(['Invoice Value', 'Total Value', 'Gross Value'])) || (taxableValue + tax);
    const party = String(getVal(['Party', 'Party Name', 'Supplier Name', 'Trade Name'])).trim();
    const period = String(getVal(['Period', 'Month', 'Return Period'])).trim();
    const pos = String(getVal(['POS', 'Place of Supply'])).trim() || '20-Jharkhand';
    const cfs = String(getVal(['CFS', 'Filing Status'])).trim() || 'Y';
    const rc = String(getVal(['RC', 'Reverse Charge'])).trim() || 'N';
    const remark = String(getVal(['Remark', 'Remarks', 'Notes'])).trim();
    const status = String(getVal(['Status', 'Match Status'])).trim() || 'PENDING VERIFICATION';

    // Optional GSTR counterpart fields if present in Excel
    const gstrGstin = String(getVal(['GSTR GSTIN', '2A GSTIN'])).trim();
    const gstrInvoiceNo = String(getVal(['GSTR Invoice No', '2A Invoice No'])).trim();
    const gstrTaxableValue = parseNumber(getVal(['GSTR Taxable Value', '2A Taxable']));
    const gstrIgst = parseNumber(getVal(['GSTR IGST', '2A IGST']));
    const gstrCgst = parseNumber(getVal(['GSTR CGST', '2A CGST']));
    const gstrSgst = parseNumber(getVal(['GSTR SGST', '2A SGST']));

    return {
      id: `p-imp-${Date.now()}-${index}`,
      sr: existingCount + index + 1,
      status: status || 'PENDING VERIFICATION',
      party: party || 'UNKNOWN SUPPLIER',
      gstin,
      period: period || 'Apr-25',
      invoiceNo: invoiceNo || `INV-${index + 1}`,
      pos,
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      invoiceValue,
      taxableValue,
      rate,
      tax,
      igst,
      cgst,
      sgst,
      cess,
      cfs,
      rc,
      remark,
      gstrGstin: gstrGstin || undefined,
      gstrInvoiceNo: gstrInvoiceNo || undefined,
      gstrTaxableValue: gstrTaxableValue || undefined,
      gstrIgst: gstrIgst || undefined,
      gstrCgst: gstrCgst || undefined,
      gstrSgst: gstrSgst || undefined,
    };
  });
}

export function transformParsedSales(rows: any[]): MonthlySalesRecord[] {
  return rows.map((r, index) => {
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
        const norm = normalizeHeader(k);
        for (const rowKey of Object.keys(r)) {
          if (normalizeHeader(rowKey) === norm && r[rowKey] !== undefined) return r[rowKey];
        }
      }
      return 0;
    };

    const monthStr = String(r['Month'] || r['MONTH'] || `Month-${index + 1}`).trim();
    const taxableSales = parseNumber(getVal(['Taxable Sales', 'TAXABLE', 'Taxable Value', 'Taxable']));
    const exemptSales = parseNumber(getVal(['Exempt Sales', 'EXEMPT SALES', 'Exempt']));
    const igst = parseNumber(getVal(['IGST', 'Integrated Tax']));
    const cgst = parseNumber(getVal(['CGST', 'Central Tax']));
    const sgst = parseNumber(getVal(['SGST', 'State/UT tax', 'SGST/UTGST']));
    const cess = parseNumber(getVal(['CESS', 'Cess']));
    const totalTax = parseNumber(getVal(['Total Tax', 'Tax'])) || (igst + cgst + sgst + cess);
    const totalSales = parseNumber(getVal(['Total Sales', 'Total'])) || (taxableSales + exemptSales);
    const taxRate = parseNumber(getVal(['Tax Rate', 'Rate']));

    return {
      id: `s-imp-${Date.now()}-${index}`,
      month: monthStr,
      monthIndex: index,
      taxableSales,
      exemptSales,
      totalSales,
      igst,
      cgst,
      sgst,
      cess,
      totalTax,
      taxRate: taxRate || undefined,
    };
  });
}

export function transformParsedItc(rows: any[]): MonthlyItcRecord[] {
  return rows.map((r, index) => {
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
        const norm = normalizeHeader(k);
        for (const rowKey of Object.keys(r)) {
          if (normalizeHeader(rowKey) === norm && r[rowKey] !== undefined) return r[rowKey];
        }
      }
      return 0;
    };

    const monthStr = String(r['Month'] || r['MONTH'] || `Month-${index + 1}`).trim();
    const exemptPurchase = parseNumber(getVal(['Exempt Purchase', 'Exempt', 'Exempt purchase']));
    const igst = parseNumber(getVal(['IGST', 'Integrated Tax']));
    const cgst = parseNumber(getVal(['CGST', 'Central Tax']));
    const sgst = parseNumber(getVal(['SGST', 'State/UT tax']));
    const cess = parseNumber(getVal(['CESS', 'Cess']));
    const totalTax = parseNumber(getVal(['Total Tax', 'Tax'])) || (igst + cgst + sgst + cess);
    const openingItc = parseNumber(getVal(['Opening ITC', 'Opening']));
    const closingItc = parseNumber(getVal(['Closing ITC', 'Closing']));
    const remarks = String(r['Remarks'] || r['Remark'] || '').trim();
    const invoiceRef = String(r['Invoice / Reference Number'] || r['Invoice Ref'] || '').trim();

    return {
      id: `itc-imp-${Date.now()}-${index}`,
      month: monthStr,
      monthIndex: index,
      exemptPurchase,
      igst,
      cgst,
      sgst,
      cess,
      totalTax,
      openingItc: openingItc || undefined,
      closingItc: closingItc || undefined,
      remarks,
      invoiceRef,
    };
  });
}

// Transform GSTR-2A vs Books Reconciliation format (Image 1)
export function transformParsedGstr2aReconciliation(
  rows: any[],
  existingCount: number = 0
): PurchaseRecord[] {
  return rows.map((r, index) => {
    const getVal = (possibleKeys: string[]) => {
      for (const k of possibleKeys) {
        if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
        const lowerNorm = normalizeHeader(k);
        for (const rowKey of Object.keys(r)) {
          if (normalizeHeader(rowKey) === lowerNorm && r[rowKey] !== undefined) return r[rowKey];
        }
      }
      return '';
    };

    // Books block
    const status = String(getVal(['Status', 'Books Status', 'Match Status'])).trim() || 'Not in Rec';
    const party = String(getVal(['Party', 'Party Name', 'Supplier Name', 'Trade Name'])).trim();
    const gstin = String(getVal(['GSTIN', 'GST No', 'Supplier GSTIN'])).trim().toUpperCase();
    const period = String(getVal(['Period', 'Month', 'Return Period', 'Books Period'])).trim();
    const invoiceNo = String(getVal(['Invoice No', 'Invoice Number', 'Bill No', 'Books Inv No'])).trim();
    const pos = String(getVal(['POS', 'Place of Supply', 'Books POS'])).trim() || 'Jharkhand';
    const invoiceDate = String(getVal(['Invoice Date', 'Date', 'Books Date'])).trim();
    const invoiceValue = parseNumber(getVal(['Invoice Value', 'Books Value', 'Gross Value']));
    const taxableValue = parseNumber(getVal(['Taxable Value', 'Books Taxable']));
    const rate = parseNumber(getVal(['Rate', 'Tax Rate', 'Books Rate']));
    const tax = parseNumber(getVal(['Tax', 'Books Tax', 'Total Tax']));
    const igst = parseNumber(getVal(['IGST', 'Books IGST']));
    const cgst = parseNumber(getVal(['CGST', 'Books CGST']));
    const sgst = parseNumber(getVal(['SGST', 'Books SGST']));
    const cess = parseNumber(getVal(['CESS', 'Books CESS']));
    const cfs = String(getVal(['CFS', 'Filing Status'])).trim() || 'No';
    const rc = String(getVal(['RC', 'Reverse Charge'])).trim() || 'No';
    const remark = String(getVal(['Remark', 'Books Remark', 'Remarks'])).trim();

    // GSTR-2A block
    const gstrGstin = String(getVal(['GSTR GSTIN', '2A GSTIN', 'Supplier GSTIN (2A)'])).trim().toUpperCase();
    const gstrPeriod = String(getVal(['GSTR Period', '2A Period'])).trim();
    const gstrInvoiceNo = String(getVal(['GSTR Invoice No', '2A Invoice No', 'Invoice Number (2A)'])).trim();
    const gstrPos = String(getVal(['GSTR POS', '2A POS'])).trim() || 'Jhark';
    const gstrInvoiceDate = String(getVal(['GSTR Invoice Date', '2A Date', 'Invoice Date (2A)'])).trim();
    const gstrInvoiceValue = parseNumber(getVal(['GSTR Invoice Value', '2A Invoice Value', 'Invoice Value (2A)']));
    const gstrTaxableValue = parseNumber(getVal(['GSTR Taxable Value', '2A Taxable', 'Taxable Value (2A)']));
    const gstrRate = parseNumber(getVal(['GSTR Rate', '2A Rate', 'Rate (2A)']));
    const gstrTax = parseNumber(getVal(['GSTR Tax', '2A Tax', 'Tax (2A)']));
    const gstrIgst = parseNumber(getVal(['GSTR IGST', '2A IGST']));
    const gstrCgst = parseNumber(getVal(['GSTR CGST', '2A CGST']));
    const gstrSgst = parseNumber(getVal(['GSTR SGST', '2A SGST']));
    const gstrCess = parseNumber(getVal(['GSTR CESS', '2A CESS']));
    const gstr3bStatus = String(getVal(['GSTR 3B Status', '3B Status', 'Supplier 3B Status', 'GSTR3B Status'])).trim();
    const gstrR1Date = String(getVal(['GSTR R1 Date', 'R1 Filing Date', 'GSTR-1 Date', 'GSTR R1 Filing Date'])).trim();
    const gstrRc = String(getVal(['GSTR RC', '2A RC', 'Reverse Charge (2A)'])).trim() || 'No';
    const gstrRemark = String(getVal(['GSTR Remark', '2A Remark'])).trim();

    // Difference block
    const diffInvoiceValue = parseNumber(getVal(['Diff Invoice Value', 'Diff Value', 'Difference Invoice Value'])) || (gstrInvoiceValue - invoiceValue);
    const diffTaxableValue = parseNumber(getVal(['Diff Taxable Value', 'Diff Taxable', 'Difference Taxable Value'])) || (gstrTaxableValue - taxableValue);
    const diffTax = parseNumber(getVal(['Diff Tax', 'Difference Tax'])) || (gstrTax - tax);
    const diffRemark = String(getVal(['Diff Remark', 'Difference Remark', 'Criteria', 'Matching Criteria'])).trim();

    return {
      id: `p-rec-${Date.now()}-${index}`,
      sr: existingCount + index + 1,
      status: status || (gstrInvoiceNo && !invoiceNo ? 'Not in Rec' : 'MATCHED'),
      party: party || 'SUPPLIER',
      gstin: gstin || gstrGstin,
      period: period || gstrPeriod || 'Oct,2025',
      invoiceNo: invoiceNo || gstrInvoiceNo || `INV-${index + 1}`,
      pos: pos || gstrPos || 'Jharkhand',
      invoiceDate: invoiceDate || gstrInvoiceDate || new Date().toISOString().split('T')[0],
      invoiceValue,
      taxableValue,
      rate,
      tax,
      igst: igst || (pos.toLowerCase().includes('jharkhand') ? 0 : tax),
      cgst: cgst || (pos.toLowerCase().includes('jharkhand') ? tax / 2 : 0),
      sgst: sgst || (pos.toLowerCase().includes('jharkhand') ? tax / 2 : 0),
      cess,
      cfs,
      rc,
      remark,
      gstrStatus: status,
      gstrGstin: gstrGstin || gstin,
      gstrPeriod: gstrPeriod || period,
      gstrInvoiceNo: gstrInvoiceNo || invoiceNo,
      gstrPos: gstrPos || pos,
      gstrInvoiceDate: gstrInvoiceDate || invoiceDate,
      gstrInvoiceValue,
      gstrTaxableValue,
      gstrRate,
      gstrTax,
      gstrIgst: gstrIgst || (gstrPos.toLowerCase().includes('jhark') ? 0 : gstrTax),
      gstrCgst: gstrCgst || (gstrPos.toLowerCase().includes('jhark') ? gstrTax / 2 : 0),
      gstrSgst: gstrSgst || (gstrPos.toLowerCase().includes('jhark') ? gstrTax / 2 : 0),
      gstrCess,
      gstr3bStatus: gstr3bStatus || 'Filed',
      gstrR1Date,
      gstrRc,
      gstrRemark,
      diffInvoiceValue,
      diffTaxableValue,
      diffTax,
      diffRemark,
    };
  });
}

// Transform Consolidated 3B Offset format (Image 2)
export function transformParsedConsolidated3B(rows: any[]): Consolidated3BMonthRow[] {
  const MONTHS_ORDER = [
    'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December', 'January', 'February', 'March'
  ];

  return rows.map((r, index) => {
    const getVal = (possibleKeys: string[]) => {
      for (const k of possibleKeys) {
        if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
        const lowerNorm = normalizeHeader(k);
        for (const rowKey of Object.keys(r)) {
          if (normalizeHeader(rowKey) === lowerNorm && r[rowKey] !== undefined) return r[rowKey];
        }
      }
      return 0;
    };

    const monthStr = String(r['Month'] || r['MONTH'] || MONTHS_ORDER[index] || `Month-${index + 1}`).trim();
    // Resolve standard month name and index
    let monthIndex = index;
    const matchedIdx = MONTHS_ORDER.findIndex(
      (m) => m.toLowerCase().startsWith(monthStr.toLowerCase().slice(0, 3))
    );
    if (matchedIdx !== -1) monthIndex = matchedIdx;

    const shortYear = monthIndex <= 8 ? '25' : '26';
    const monthShort = `${monthStr.slice(0, 3)}-${shortYear}`;

    const outwardNrc = parseNumber(getVal(['Outward NRC', 'Outward (NRC)', 'Taxable Outward']));
    const outwardRc = parseNumber(getVal(['Outward RC', 'Outward (RC)']));
    const nonTaxable = parseNumber(getVal(['Non-Taxable', 'Non Taxable', 'Exempt Sales']));
    const totalOutward = parseNumber(getVal(['Total Outward', 'Total'])) || (outwardNrc + outwardRc + nonTaxable);

    const outwardIgst = parseNumber(getVal(['Outward IGST', 'Liability IGST', 'IGST Liability']));
    const outwardCgst = parseNumber(getVal(['Outward CGST', 'Liability CGST', 'CGST Liability']));
    const outwardSgst = parseNumber(getVal(['Outward SGST', 'Liability SGST', 'SGST Liability']));
    const outwardCess = parseNumber(getVal(['Outward CESS', 'Liability CESS']));

    const igstByIgst = parseNumber(getVal(['IGST by IGST', 'IGST Paid by IGST']));
    const igstByCgst = parseNumber(getVal(['IGST by CGST']));
    const igstBySgst = parseNumber(getVal(['IGST by SGST']));
    const cgstByIgst = parseNumber(getVal(['CGST by IGST', 'CGST Paid by IGST']));
    const cgstByCgst = parseNumber(getVal(['CGST by CGST', 'CGST Paid by CGST']));
    const sgstByIgst = parseNumber(getVal(['SGST by IGST', 'SGST Paid by IGST']));
    const sgstBySgst = parseNumber(getVal(['SGST by SGST', 'SGST Paid by SGST']));
    const cessByCess = parseNumber(getVal(['CESS by CESS', 'Cess by Cess']));

    const cashIgst = parseNumber(getVal(['Cash IGST', 'Paid Cash IGST']));
    const cashCgst = parseNumber(getVal(['Cash CGST', 'Paid Cash CGST']));
    const cashSgst = parseNumber(getVal(['Cash SGST', 'Paid Cash SGST']));
    const cashCess = parseNumber(getVal(['Cash CESS', 'Paid Cash CESS']));

    const inwardRc = parseNumber(getVal(['Inward RC', 'Inward (RC)']));
    const inwardNrc = parseNumber(getVal(['Inward NRC', 'Inward (NRC)', 'Exempt Purchase']));
    const nonGst = parseNumber(getVal(['Non GST', 'Non-GST']));
    const totalInward = parseNumber(getVal(['Total Inward'])) || (inwardRc + inwardNrc + nonGst);

    const rcmIgst = parseNumber(getVal(['RCM IGST', 'Liability on RC IGST']));
    const rcmCgst = parseNumber(getVal(['RCM CGST', 'Liability on RC CGST']));
    const rcmSgst = parseNumber(getVal(['RCM SGST', 'Liability on RC SGST']));
    const rcmCess = parseNumber(getVal(['RCM CESS', 'Liability on RC CESS']));

    const rcmCashIgst = parseNumber(getVal(['RCM Paid Cash IGST', 'RCM Cash IGST', 'RCM Paid Cash'])) || rcmIgst;
    const rcmCashCgst = parseNumber(getVal(['RCM Paid Cash CGST', 'RCM Cash CGST']));
    const rcmCashSgst = parseNumber(getVal(['RCM Paid Cash SGST', 'RCM Cash SGST']));
    const rcmCashCess = parseNumber(getVal(['RCM Paid Cash CESS', 'RCM Cash CESS']));

    const interestIgst = parseNumber(getVal(['Interest IGST', 'Interest']));
    const interestCgst = parseNumber(getVal(['Interest CGST']));
    const interestSgst = parseNumber(getVal(['Interest SGST']));
    const interestCess = parseNumber(getVal(['Interest CESS']));

    const lateFeesCgst = parseNumber(getVal(['Late Fees CGST', 'Late Fees (CGST)', 'Late Fees']));
    const lateFeesSgst = parseNumber(getVal(['Late Fees SGST', 'Late Fees (SGST)'])) || lateFeesCgst;

    const dueDate = String(r['Due Date'] || `20-${monthShort.split('-')[0]}-2025`).trim();
    const filingDate = String(r['Filing Date'] || `20-${monthShort.split('-')[0]}-2025`).trim();

    const itcEligibleNrcIgst = parseNumber(getVal(['ITC Eligible NRC IGST', 'Eligible IGST', 'ITC IGST']));
    const itcEligibleNrcCgst = parseNumber(getVal(['ITC Eligible NRC CGST', 'Eligible CGST', 'ITC CGST']));
    const itcEligibleNrcSgst = parseNumber(getVal(['ITC Eligible NRC SGST', 'Eligible SGST', 'ITC SGST']));
    const itcEligibleNrcCess = parseNumber(getVal(['ITC Eligible NRC CESS', 'Eligible CESS', 'ITC CESS']));

    const itcEligibleRcIgst = parseNumber(getVal(['ITC Eligible RC IGST', 'Eligible RC IGST']));
    const itcEligibleRcCgst = parseNumber(getVal(['ITC Eligible RC CGST']));
    const itcEligibleRcSgst = parseNumber(getVal(['ITC Eligible RC SGST']));
    const itcEligibleRcCess = parseNumber(getVal(['ITC Eligible RC CESS']));

    const itcReversedIgst = parseNumber(getVal(['ITC Reversed IGST', 'Reversed IGST']));
    const itcReversedCgst = parseNumber(getVal(['ITC Reversed CGST', 'Reversed CGST']));
    const itcReversedSgst = parseNumber(getVal(['ITC Reversed SGST', 'Reversed SGST']));
    const itcReversedCess = parseNumber(getVal(['ITC Reversed CESS', 'Reversed CESS']));

    const itcIneligibleIgst = parseNumber(getVal(['ITC Ineligible IGST']));
    const itcIneligibleCgst = parseNumber(getVal(['ITC Ineligible CGST']));
    const itcIneligibleSgst = parseNumber(getVal(['ITC Ineligible SGST']));
    const itcIneligibleCess = parseNumber(getVal(['ITC Ineligible CESS']));

    const itcReclaimedIgst = parseNumber(getVal(['ITC Reclaimed IGST']));
    const itcReclaimedCgst = parseNumber(getVal(['ITC Reclaimed CGST']));
    const itcReclaimedSgst = parseNumber(getVal(['ITC Reclaimed SGST']));
    const itcReclaimedCess = parseNumber(getVal(['ITC Reclaimed CESS']));

    return {
      month: monthStr,
      monthShort,
      monthIndex,
      outwardNrc,
      outwardRc,
      nonTaxable,
      totalOutward,
      outwardIgst,
      outwardCgst,
      outwardSgst,
      outwardCess,
      igstByIgst,
      igstByCgst,
      igstBySgst,
      cgstByIgst,
      cgstByCgst,
      sgstByIgst,
      sgstBySgst,
      cessByCess,
      cashIgst,
      cashCgst,
      cashSgst,
      cashCess,
      inwardRc,
      inwardNrc,
      nonGst,
      totalInward,
      rcmIgst,
      rcmCgst,
      rcmSgst,
      rcmCess,
      rcmCashIgst,
      rcmCashCgst,
      rcmCashSgst,
      rcmCashCess,
      interestIgst,
      interestCgst,
      interestSgst,
      interestCess,
      lateFeesCgst,
      lateFeesSgst,
      dueDate,
      filingDate,
      itcEligibleNrcIgst,
      itcEligibleNrcCgst,
      itcEligibleNrcSgst,
      itcEligibleNrcCess,
      itcEligibleRcIgst,
      itcEligibleRcCgst,
      itcEligibleRcSgst,
      itcEligibleRcCess,
      itcReversedIgst,
      itcReversedCgst,
      itcReversedSgst,
      itcReversedCess,
      itcIneligibleIgst,
      itcIneligibleCgst,
      itcIneligibleSgst,
      itcIneligibleCess,
      itcReclaimedIgst,
      itcReclaimedCgst,
      itcReclaimedSgst,
      itcReclaimedCess,
    };
  });
}

export function generateMasterTemplate(type: ExcelType): void {
  const wb = XLSX.utils.book_new();

  if (type === 'PURCHASE') {
    const data = [
      MASTER_PURCHASE_COLUMNS,
      [
        1,
        'MATCHED',
        'SAMPLE TRADING CO',
        '20AAACB1234D1Z5',
        'Apr-25',
        'INV-2025-001',
        '20-Jharkhand',
        '2025-04-10',
        118000.0,
        100000.0,
        18,
        18000.0,
        0.0,
        9000.0,
        9000.0,
        0.0,
        'Y',
        'N',
        'Purchase invoice regular',
      ],
      [
        2,
        'MATCHED',
        'NATIONAL SUPPLIERS LTD',
        '27AABCN5678F1ZQ',
        'Apr-25',
        'INV-2025-002',
        '20-Jharkhand',
        '2025-04-18',
        52500.0,
        50000.0,
        5,
        2500.0,
        2500.0,
        0.0,
        0.0,
        0.0,
        'Y',
        'N',
        'Interstate supply',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'PURCHASE');
    XLSX.writeFile(wb, 'MASTER_PURCHASE_TEMPLATE_FIXED.xlsx');
  } else if (type === 'SALES') {
    const data = [
      MASTER_SALES_COLUMNS,
      ['Apr-25', 361756.0, 302152.0, 663908.0, 0.0, 23444.0, 23444.0, 0.0, 46888.0, 18],
      ['May-25', 653604.0, 62354.0, 715958.0, 0.0, 38787.0, 38787.0, 0.0, 77574.0, 18],
      ['Jun-25', 483050.0, 0.0, 483050.0, 0.0, 30510.0, 30510.0, 0.0, 61020.0, 18],
      ['Jul-25', 619394.0, 0.0, 619394.0, 0.0, 11117.0, 11117.0, 0.0, 22234.0, 18],
      ['Aug-25', 333582.0, 0.0, 333582.0, 0.0, 13150.0, 13150.0, 0.0, 26300.0, 18],
      ['Sep-25', 316423.0, 201245.0, 517668.0, 0.0, 10755.0, 10755.0, 0.0, 21510.0, 18],
      ['Oct-25', 518031.0, 288914.0, 806945.0, 0.0, 23066.0, 23066.0, 0.0, 46132.0, 18],
      ['Nov-25', 677708.0, 365854.0, 1043562.0, 0.0, 27684.0, 27684.0, 0.0, 55368.0, 18],
      ['Dec-25', 529609.0, 302154.0, 831763.0, 0.0, 13567.0, 13567.0, 0.0, 27134.0, 18],
      ['Jan-26', 327182.0, 425610.0, 752792.0, 0.0, 21952.0, 21952.0, 0.0, 43904.0, 18],
      ['Feb-26', 777999.0, 956854.0, 1734853.0, 0.0, 33239.0, 33239.0, 0.0, 66478.0, 18],
      ['Mar-26', 205701.0, 801248.0, 1006949.0, 0.0, 7106.0, 7106.0, 0.0, 14212.0, 18],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'SALES');
    XLSX.writeFile(wb, 'MASTER_SALES_TEMPLATE_FIXED.xlsx');
  } else if (type === 'ITC') {
    const data = [
      MASTER_ITC_COLUMNS,
      ['Apr-25', 274585.0, 606.0, 20310.0, 20310.0, 0.0, 41226.0, 80924.0, 85000.0, 'Regular ITC', 'REF-04'],
      ['May-25', 62354.0, 15636.0, 30225.0, 30225.0, 0.0, 76086.0, 85000.0, 92000.0, 'Regular ITC', 'REF-05'],
      ['Jun-25', 49434.0, 0.0, 7869.0, 7869.0, 0.0, 15738.0, 92000.0, 95000.0, 'Regular ITC', 'REF-06'],
      ['Jul-25', 420574.0, 43606.0, 8569.0, 8569.0, 0.0, 60744.0, 95000.0, 98000.0, 'Regular ITC', 'REF-07'],
      ['Aug-25', 35652.0, 0.0, 24275.0, 24275.0, 0.0, 48550.0, 98000.0, 102000.0, 'Regular ITC', 'REF-08'],
      ['Sep-25', 198584.0, 3994.0, 9398.0, 9398.0, 0.0, 22790.0, 102000.0, 105000.0, 'Regular ITC', 'REF-09'],
      ['Oct-25', 0.0, 8033.0, 26698.0, 26698.0, 0.0, 61429.0, 105000.0, 108000.0, 'Regular ITC', 'REF-10'],
      ['Nov-25', 355484.0, 29320.0, 13533.0, 13533.0, 0.0, 56386.0, 108000.0, 110000.0, 'Regular ITC', 'REF-11'],
      ['Dec-25', 295857.0, 8404.0, 1242.0, 1242.0, 0.0, 10888.0, 110000.0, 112000.0, 'Regular ITC', 'REF-12'],
      ['Jan-26', 0.0, 28790.0, 7037.0, 7037.0, 0.0, 42864.0, 112000.0, 113000.0, 'Regular ITC', 'REF-01'],
      ['Feb-26', 910121.0, 20891.0, 8271.0, 8271.0, 0.0, 37433.0, 113000.0, 114000.0, 'Regular ITC', 'REF-02'],
      ['Mar-26', 799588.0, 1884.0, 33350.0, 33350.0, 0.0, 68584.0, 114000.0, 114990.0, 'Regular ITC', 'REF-03'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'ITC');
    XLSX.writeFile(wb, 'MASTER_ITC_TEMPLATE_FIXED.xlsx');
  } else if (type === 'GSTR2A_RECONCILIATION') {
    const data = [
      ['GYANI GOSAI (20AUEPG3207H1ZD) (F.Y.:2025-2026)'],
      ['GSTR-2A Reconciliation Details  Month : Apr - Mar'],
      [],
      [
        'As per Records', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        'As per GSTR-2A', '', '', '', '', '', '', '', '', '', '', '',
        'Difference', '', '', '', '', '', '', ''
      ],
      [
        'Sr', 'Status', 'Party', 'GSTIN', 'Period', 'Invoice No', 'POS', 'Invoice Date', 'Invoice Value', 'Taxable Value', 'Rate', 'TAX', 'CFS', 'RC', 'Remark',
        'Period', 'Invoice No', 'POS', 'Invoice Date', 'Invoice Value', 'Taxable Value', 'Rate', 'TAX', '3B Status', 'R1 Date', 'RC', 'Remark',
        'Period', 'Invoice No', 'POS', 'Invoice Date', 'Invoice Value', 'Taxable Value', 'TAX', 'Remark/Matching Criteria'
      ],
      [
        1, 'Not in Rec', '', '07AAJPK8997M1ZF', 'Oct,2025', '2691', 'Jharkhand', '15-Oct-25', 0, 0, 0, 0, 'No', 'No', 'Missing in Books',
        'Oct,2025', '2691', 'Jhark', '15-Oct-25', 5777.0, 4896.0, 18.0, 881.28, 'Not Filed', '13-Nov-25', 'No', '',
        'Oct,2025', '2691', 'Jhark', '15-Oct-25', 5777.0, 4896.0, 881.28, 'Available in 2A, Not in Books (Supplier 3B Not Filed)'
      ],
      [
        2, 'Not in Rec', '', '07ADGFS6991D1ZQ', 'Oct,2025', '2129', 'Jharkhand', '25-Oct-25', 0, 0, 0, 0, 'No', 'No', 'Missing in Books',
        'Oct,2025', '2129', 'Jhark', '25-Oct-25', 21122.0, 17899.66, 18.0, 3221.94, 'Not Filed', '11-Nov-25', 'No', '',
        'Oct,2025', '2129', 'Jhark', '25-Oct-25', 21122.0, 17899.66, 3221.94, 'Available in 2A, Not in Books (Supplier 3B Not Filed)'
      ],
      [
        3, 'Not in Rec', '', '07ARHPK8092B1ZZ', 'Nov,2025', 'SPI/1320/2025', 'Jharkhand', '23-Nov-25', 0, 0, 0, 0, 'No', 'No', 'Missing in Books',
        'Nov,2025', 'SPI/1320/2025', 'Jhark', '23-Nov-25', 24400.0, 23237.89, 5.0, 1161.89, 'Filed', '11-Dec-25', 'No', '',
        'Nov,2025', 'SPI/1320/2025', 'Jhark', '23-Nov-25', 24400.0, 23237.89, 1161.89, 'Available in 2A, Not in Books (Supplier 3B Filed)'
      ],
      [
        4, 'MATCHED', 'M/S TECHNO DISTRIBUTORS', '07ARHPK8092B1ZZ', 'May,2025', 'INV-5501', 'Jharkhand', '18-May-25', 35400.0, 30000.0, 18.0, 5400.0, 'Yes', 'No', 'Verified in Books',
        'May,2025', 'INV-5501', 'Jhark', '18-May-25', 35400.0, 30000.0, 18.0, 5400.0, 'Filed', '11-Jun-25', 'No', '',
        'May,2025', 'INV-5501', 'Jhark', '18-May-25', 0, 0, 0, 'Matched perfectly'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'GSTR2A_RECON');
    XLSX.writeFile(wb, 'GSTR2A_RECONCILIATION_TEMPLATE.xlsx');
  } else if (type === 'GSTR3B_CONSOLIDATED') {
    const data = [
      MASTER_CONSOLIDATED_3B_COLUMNS,
      ['April', 361756.0, 0, 302152.0, 663908.0, 0, 23444.0, 23444.0, 0, 606.0, 22838.0, 0, 23444.0, 0, 0, 0, 0, 0, 274585.0, 0, 274585.0, 0, 0, 0, 0, 0, '20-May-2025', '19-May-2025', 606.0, 20310.0, 20310.0, 0, 0],
      ['May', 653604.0, 0, 62354.0, 715958.0, 0, 38787.0, 38787.0, 0, 7818.0, 30969.0, 7818.0, 30969.0, 0, 0, 0, 0, 0, 62354.0, 0, 62354.0, 0, 0, 0, 0, 0, '20-Jun-2025', '20-Jun-2025', 15636.0, 30225.0, 30225.0, 0, 0],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'GSTR3B_OFFSET');
    XLSX.writeFile(wb, 'GSTR3B_CONSOLIDATED_OFFSET_TEMPLATE.xlsx');
  }
}

export const generateBlankExcelTemplate = generateMasterTemplate;

export function exportRecordsToExcel(
  type: ExcelType | 'RECONCILIATION',
  data: any[],
  fileName?: string
): void {
  const wb = XLSX.utils.book_new();

  if (type === 'PURCHASE') {
    const formatted = data.map((p: PurchaseRecord) => ({
      'Sr': p.sr,
      'Status': p.status,
      'Party': p.party,
      'GSTIN': p.gstin,
      'Period': p.period,
      'Invoice No': p.invoiceNo,
      'POS': p.pos,
      'Invoice Date': p.invoiceDate,
      'Invoice Value': p.invoiceValue,
      'Taxable Value': p.taxableValue,
      'Rate': p.rate,
      'Tax': p.tax,
      'IGST': p.igst,
      'CGST': p.cgst,
      'SGST': p.sgst,
      'CESS': p.cess,
      'CFS': p.cfs,
      'RC': p.rc,
      'Remark': p.remark,
    }));
    const ws = XLSX.utils.json_to_sheet(formatted);
    XLSX.utils.book_append_sheet(wb, ws, 'PURCHASE_DATA');
    XLSX.writeFile(wb, fileName || 'GST_Purchase_Export.xlsx');
  } else if (type === 'SALES') {
    const formatted = data.map((s: MonthlySalesRecord) => ({
      'Month': s.month,
      'Taxable Sales': s.taxableSales,
      'Exempt Sales': s.exemptSales,
      'Total Sales': s.totalSales,
      'IGST': s.igst,
      'CGST': s.cgst,
      'SGST': s.sgst,
      'CESS': s.cess,
      'Total Tax': s.totalTax,
      'Tax Rate': s.taxRate || '',
    }));
    const ws = XLSX.utils.json_to_sheet(formatted);
    XLSX.utils.book_append_sheet(wb, ws, 'SALES_DATA');
    XLSX.writeFile(wb, fileName || 'GST_Sales_Export.xlsx');
  } else if (type === 'ITC') {
    const formatted = data.map((itc: MonthlyItcRecord) => ({
      'Month': itc.month,
      'Exempt Purchase': itc.exemptPurchase,
      'IGST': itc.igst,
      'CGST': itc.cgst,
      'SGST': itc.sgst,
      'CESS': itc.cess,
      'Total Tax': itc.totalTax,
      'Opening ITC': itc.openingItc || '',
      'Closing ITC': itc.closingItc || '',
      'Remarks': itc.remarks || '',
      'Invoice / Reference Number': itc.invoiceRef || '',
    }));
    const ws = XLSX.utils.json_to_sheet(formatted);
    XLSX.utils.book_append_sheet(wb, ws, 'ITC_DATA');
    XLSX.writeFile(wb, fileName || 'GST_ITC_Export.xlsx');
  } else if (type === 'GSTR2A_RECONCILIATION') {
    const formatted = data.map((p: PurchaseRecord) => ({
      'Sr': p.sr,
      'Status': p.status,
      'Party': p.party,
      'GSTIN': p.gstin,
      'Period': p.period,
      'Invoice No': p.invoiceNo,
      'POS': p.pos,
      'Invoice Date': p.invoiceDate,
      'Invoice Value': p.invoiceValue,
      'Taxable Value': p.taxableValue,
      'Rate': p.rate,
      'Tax': p.tax,
      'CFS': p.cfs,
      'RC': p.rc,
      'Remark': p.remark,
      'GSTR GSTIN': p.gstrGstin || '',
      'GSTR Period': p.gstrPeriod || '',
      'GSTR Invoice No': p.gstrInvoiceNo || '',
      'GSTR POS': p.gstrPos || '',
      'GSTR Invoice Date': p.gstrInvoiceDate || '',
      'GSTR Invoice Value': p.gstrInvoiceValue ?? '',
      'GSTR Taxable Value': p.gstrTaxableValue ?? '',
      'GSTR Rate': p.gstrRate ?? '',
      'GSTR Tax': p.gstrTax ?? '',
      'GSTR 3B Status': p.gstr3bStatus || '',
      'GSTR R1 Date': p.gstrR1Date || '',
      'GSTR RC': p.gstrRc || '',
      'GSTR Remark': p.gstrRemark || '',
      'Diff Invoice Value': p.diffInvoiceValue ?? '',
      'Diff Taxable Value': p.diffTaxableValue ?? '',
      'Diff Tax': p.diffTax ?? '',
      'Diff Remark': p.diffRemark || '',
    }));
    const ws = XLSX.utils.json_to_sheet(formatted);
    XLSX.utils.book_append_sheet(wb, ws, 'GSTR2A_RECON_DATA');
    XLSX.writeFile(wb, fileName || 'GSTR2A_Reconciliation_Export.xlsx');
  } else if (type === 'GSTR3B_CONSOLIDATED') {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'GSTR3B_CONSOLIDATED');
    XLSX.writeFile(wb, fileName || 'GSTR3B_Consolidated_Export.xlsx');
  } else if (type === 'RECONCILIATION') {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'GST_RECONCILIATION');
    XLSX.writeFile(wb, fileName || 'GST_Reconciliation_Export.xlsx');
  }
}

export interface CombinedParseResult {
  purchases?: PurchaseRecord[];
  sales?: MonthlySalesRecord[];
  itc?: MonthlyItcRecord[];
  detectedSheets: {
    purchaseSheet?: string;
    salesSheet?: string;
    itcSheet?: string;
  };
  allSheetNames: string[];
  metadata?: {
    companyName?: string;
    gstin?: string;
    financialYear?: string;
  };
}

export async function parseCombinedWorkbook(file: File): Promise<CombinedParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames || [];

  let extractedMetadata: { companyName?: string; gstin?: string; financialYear?: string } | undefined = undefined;
  let purchaseSheetName: string | undefined = undefined;
  let salesSheetName: string | undefined = undefined;
  let itcSheetName: string | undefined = undefined;

  let parsedPurchases: PurchaseRecord[] | undefined = undefined;
  let parsedSales: MonthlySalesRecord[] | undefined = undefined;
  let parsedItc: MonthlyItcRecord[] | undefined = undefined;

  // 1. First pass: classify sheets by name or inspection
  for (const sName of sheetNames) {
    const normName = sName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ws = workbook.Sheets[sName];
    if (!ws) continue;
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!rawRows || rawRows.length === 0) continue;

    // Scan for metadata in first few rows
    if (!extractedMetadata) {
      for (let i = 0; i < Math.min(10, rawRows.length); i++) {
        const rowStr = (rawRows[i] || []).map((c) => String(c || '').trim()).join(' ');
        const gstinMatch = rowStr.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
        const fyMatch = rowStr.match(/(?:F\.?Y\.?:?\s*)([0-9]{4}-[0-9]{4})/i) || rowStr.match(/([0-9]{4}-[0-9]{4})/);
        const compMatch = rowStr.match(/^([A-Z0-9\s.,&'-]+?)(?:\s*\()/i);
        if (gstinMatch || fyMatch || compMatch) {
          extractedMetadata = {
            companyName: compMatch ? compMatch[1].trim() : undefined,
            gstin: gstinMatch ? gstinMatch[1].toUpperCase() : undefined,
            financialYear: fyMatch ? fyMatch[1] : undefined,
          };
          break;
        }
      }
    }

    // Find header row in this sheet
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(15, rawRows.length); i++) {
      const row = rawRows[i];
      if (row && row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '').length >= 2) {
        headerRowIndex = i;
        break;
      }
    }
    const headerRow = (rawRows[headerRowIndex] || []).map((c) => String(c || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

    const isPurchaseByName = normName.includes('purch') || normName.includes('inward') || normName.includes('gstr2a') || normName.includes('gstr2b') || normName.includes('buy');
    const isSalesByName = normName.includes('sale') || normName.includes('outward') || normName.includes('gstr1') || normName.includes('gstr3b') || normName.includes('revenue');
    const isItcByName = normName.includes('itc') || normName.includes('input');

    const hasGstin = headerRow.some((h) => h.includes('gstin') || h.includes('gst'));
    const hasTaxable = headerRow.some((h) => h.includes('taxable') || h.includes('value'));
    const hasParty = headerRow.some((h) => h.includes('party') || h.includes('supplier'));
    const hasMonth = headerRow.some((h) => h.includes('month') || h.includes('period'));
    const hasSalesTax = headerRow.some((h) => h.includes('taxablesales') || h.includes('totalsales'));

    // Check classification
    if (!purchaseSheetName && (isPurchaseByName || (hasGstin && (hasTaxable || hasParty)))) {
      purchaseSheetName = sName;
      const jsonRows: any[] = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: '' });
      parsedPurchases = transformParsedPurchase(jsonRows);
    } else if (!salesSheetName && (isSalesByName || hasSalesTax || (hasMonth && hasTaxable && !hasGstin))) {
      salesSheetName = sName;
      const jsonRows: any[] = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: '' });
      parsedSales = transformParsedSales(jsonRows);
    } else if (!itcSheetName && (isItcByName || (hasMonth && headerRow.some((h) => h.includes('itc'))))) {
      itcSheetName = sName;
      const jsonRows: any[] = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: '' });
      parsedItc = transformParsedItc(jsonRows);
    }
  }

  // Fallback: If only 1 sheet exists, parse based on content
  if (!purchaseSheetName && !salesSheetName && sheetNames.length > 0) {
    const firstWs = workbook.Sheets[sheetNames[0]];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(firstWs, { header: 1 });
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(15, rawRows.length); i++) {
      const row = rawRows[i];
      if (row && row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '').length >= 2) {
        headerRowIndex = i;
        break;
      }
    }
    const headerRow = (rawRows[headerRowIndex] || []).map((c) => String(c || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const jsonRows: any[] = XLSX.utils.sheet_to_json(firstWs, { range: headerRowIndex, defval: '' });

    if (headerRow.some((h) => h.includes('gstin'))) {
      purchaseSheetName = sheetNames[0];
      parsedPurchases = transformParsedPurchase(jsonRows);
    } else {
      salesSheetName = sheetNames[0];
      parsedSales = transformParsedSales(jsonRows);
    }
  }

  return {
    purchases: parsedPurchases,
    sales: parsedSales,
    itc: parsedItc,
    detectedSheets: {
      purchaseSheet: purchaseSheetName,
      salesSheet: salesSheetName,
      itcSheet: itcSheetName,
    },
    allSheetNames: sheetNames,
    metadata: extractedMetadata,
  };
}

export function generateCombinedPurchaseSalesTemplate(companyName?: string, financialYear?: string): void {
  const wb = XLSX.utils.book_new();

  // 1. Purchase Sheet
  const purchaseData = [
    MASTER_PURCHASE_COLUMNS,
    [
      1,
      'MATCHED',
      'SAMPLE SUPPLIER PVT LTD',
      '20AAACS1234D1Z5',
      'Apr-25',
      'INV/2025/001',
      '20-Jharkhand',
      '15-Apr-25',
      11800.0,
      10000.0,
      18,
      1800.0,
      0.0,
      900.0,
      900.0,
      0.0,
      'Y',
      'N',
      'Sample Inward Supply',
    ],
    [
      2,
      'MATCHED',
      'BHARAT PAINTS & CHEMICALS',
      '27AAACB9876K1Z2',
      'May-25',
      'BPC/8841',
      '20-Jharkhand',
      '10-May-25',
      59000.0,
      50000.0,
      18,
      9000.0,
      9000.0,
      0.0,
      0.0,
      0.0,
      'Y',
      'N',
      'Inter-State Paint Materials',
    ],
  ];
  const wsPurchase = XLSX.utils.aoa_to_sheet(purchaseData);
  XLSX.utils.book_append_sheet(wb, wsPurchase, 'PURCHASE');

  // 2. Sales Sheet
  const salesData = [
    MASTER_SALES_COLUMNS,
    ['Apr-25', 350000, 25000, 375000, 15000, 18000, 18000, 0, 51000, 18],
    ['May-25', 420000, 30000, 450000, 18000, 21000, 21000, 0, 60000, 18],
    ['Jun-25', 480000, 40000, 520000, 22000, 24000, 24000, 0, 70000, 18],
    ['Jul-25', 390000, 35000, 425000, 16000, 19500, 19500, 0, 55000, 18],
    ['Aug-25', 450000, 30000, 480000, 20000, 22500, 22500, 0, 65000, 18],
    ['Sep-25', 510000, 45000, 555000, 24000, 25500, 25500, 0, 75000, 18],
    ['Oct-25', 600000, 50000, 650000, 30000, 30000, 30000, 0, 90000, 18],
    ['Nov-25', 490000, 40000, 530000, 22000, 24500, 24500, 0, 71000, 18],
    ['Dec-25', 380000, 35000, 415000, 17000, 19000, 19000, 0, 55000, 18],
    ['Jan-26', 410000, 35000, 445000, 18000, 20500, 20500, 0, 59000, 18],
    ['Feb-26', 460000, 40000, 500000, 21000, 23000, 23000, 0, 67000, 18],
    ['Mar-26', 580000, 55000, 635000, 28000, 29000, 29000, 0, 86000, 18],
  ];
  const wsSales = XLSX.utils.aoa_to_sheet(salesData);
  XLSX.utils.book_append_sheet(wb, wsSales, 'SALES');

  const safeName = (companyName || 'GST').replace(/[^a-zA-Z0-9]/g, '_');
  const safeFy = (financialYear || '2025-26').replace(/[^a-zA-Z0-9-]/g, '_');
  XLSX.writeFile(wb, `${safeName}_Master_Purchase_and_Sales_Template_FY_${safeFy}.xlsx`);
}

