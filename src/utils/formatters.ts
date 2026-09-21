export const FY_MONTHS = [
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
] as const;

export const FY_MONTH_FULL = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
] as const;

export function formatIndianCurrency(
  num: number | undefined | null,
  precision: number = 2,
  includeSymbol: boolean = false
): string {
  if (num === undefined || num === null || isNaN(num)) {
    return includeSymbol ? '₹ 0.00' : '0.00';
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const fixedStr = absNum.toFixed(precision);
  const [integerPart, decimalPart] = fixedStr.split('.');

  // Format integer with Indian numbering system (last 3, then groups of 2)
  let result = '';
  if (integerPart.length <= 3) {
    result = integerPart;
  } else {
    const last3 = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${withCommas},${last3}`;
  }

  if (precision > 0) {
    result = `${result}.${decimalPart}`;
  }

  const sign = isNegative ? '-' : '';
  const symbol = includeSymbol ? '₹ ' : '';
  return `${sign}${symbol}${result}`;
}

export function formatNumberRaw(num: number | undefined | null, precision: number = 2): string {
  if (num === undefined || num === null || isNaN(num)) return '0.00';
  return num.toFixed(precision);
}

export function parseNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, '').replace(/[₹$]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function validateGstin(gstin: string): { isValid: boolean; message?: string } {
  if (!gstin) {
    return { isValid: false, message: 'GSTIN is empty' };
  }
  const cleanGstin = gstin.trim().toUpperCase();
  // Standard Indian GSTIN: 2 digits (state) + 10 chars PAN + 1 entity code + 1 'Z' + 1 checksum char
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (cleanGstin.length !== 15) {
    return { isValid: false, message: `GSTIN must be 15 characters (current: ${cleanGstin.length})` };
  }
  if (!gstinRegex.test(cleanGstin)) {
    return { isValid: false, message: 'Invalid GSTIN structure (Format: 22AAAAA0000A1Z5)' };
  }
  return { isValid: true };
}

export function getMonthKey(monthName: string, fy: string = '2025-26'): string {
  // Convert 'April' or 'Apr' or 'Apr-25' into standard 'Apr-25'
  const match = monthName.match(/([a-zA-Z]+)[- ,]?([0-9]{2,4})?/);
  if (!match) return monthName;
  const rawMonth = match[1].substring(0, 3);
  const titleMonth = rawMonth.charAt(0).toUpperCase() + rawMonth.substring(1).toLowerCase();
  
  // If year provided in string, use it
  if (match[2]) {
    const yr = match[2].length === 4 ? match[2].substring(2) : match[2];
    return `${titleMonth}-${yr}`;
  }

  // Derive from FY (e.g. 2025-2026 or 2025-26)
  const fyParts = fy.split('-');
  const startYr = fyParts[0].length === 4 ? fyParts[0].substring(2) : fyParts[0];
  const endYr = fyParts[1] ? (fyParts[1].length === 4 ? fyParts[1].substring(2) : fyParts[1]) : String(parseInt(startYr, 10) + 1);

  // Jan, Feb, Mar belong to endYr
  if (['Jan', 'Feb', 'Mar'].includes(titleMonth)) {
    return `${titleMonth}-${endYr}`;
  }
  return `${titleMonth}-${startYr}`;
}

export function normalize12MonthsSales(
  records: any[],
  fy: string = '2025-2026'
): any[] {
  return FY_MONTHS.map((m, idx) => {
    const monthKey = getMonthKey(m, fy);
    const mLower = m.toLowerCase();

    const match = records.find((r) => {
      if (r.monthIndex !== undefined && r.monthIndex === idx) return true;
      const str = String(r.month || '').toLowerCase();
      return str.includes(mLower);
    });

    if (match) {
      return {
        ...match,
        id: match.id || `s-${idx + 1}`,
        month: monthKey,
        monthIndex: idx,
      };
    }

    return {
      id: `s-${idx + 1}`,
      month: monthKey,
      monthIndex: idx,
      taxableSales: 0,
      exemptSales: 0,
      totalSales: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalTax: 0,
    };
  });
}

export function normalize12MonthsItc(
  records: any[],
  fy: string = '2025-2026'
): any[] {
  return FY_MONTHS.map((m, idx) => {
    const monthKey = getMonthKey(m, fy);
    const mLower = m.toLowerCase();

    const match = records.find((r) => {
      if (r.monthIndex !== undefined && r.monthIndex === idx) return true;
      const str = String(r.month || '').toLowerCase();
      return str.includes(mLower);
    });

    if (match) {
      return {
        ...match,
        id: match.id || `itc-${idx + 1}`,
        month: monthKey,
        monthIndex: idx,
      };
    }

    return {
      id: `itc-${idx + 1}`,
      month: monthKey,
      monthIndex: idx,
      exemptPurchase: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0,
      totalTax: 0,
    };
  });
}

export function normalize12Months3B(
  records: any[],
  fy: string = '2025-2026'
): any[] {
  return FY_MONTH_FULL.map((fullMonth, idx) => {
    const mShort = FY_MONTHS[idx];
    const mLower = mShort.toLowerCase();
    const fullLower = fullMonth.toLowerCase();

    const match = records.find((r) => {
      if (r.monthIndex !== undefined && r.monthIndex === idx) return true;
      const str = String(r.month || '').toLowerCase();
      return str.includes(fullLower) || str.includes(mLower);
    });

    const monthShortKey = getMonthKey(mShort, fy);

    if (match) {
      return {
        ...match,
        month: fullMonth,
        monthShort: monthShortKey,
        monthIndex: idx,
      };
    }

    return {
      month: fullMonth,
      monthShort: monthShortKey,
      monthIndex: idx,
      outwardNrc: 0,
      outwardRc: 0,
      nonTaxable: 0,
      totalOutward: 0,
      outwardIgst: 0,
      outwardCgst: 0,
      outwardSgst: 0,
      outwardCess: 0,
      igstByIgst: 0,
      igstByCgst: 0,
      igstBySgst: 0,
      cgstByIgst: 0,
      cgstByCgst: 0,
      sgstByIgst: 0,
      sgstBySgst: 0,
      cessByCess: 0,
      cashIgst: 0,
      cashCgst: 0,
      cashSgst: 0,
      cashCess: 0,
      inwardRc: 0,
      inwardNrc: 0,
      nonGst: 0,
      totalInward: 0,
      rcmIgst: 0,
      rcmCgst: 0,
      rcmSgst: 0,
      rcmCess: 0,
      rcmCashIgst: 0,
      rcmCashCgst: 0,
      rcmCashSgst: 0,
      rcmCashCess: 0,
      interestIgst: 0,
      interestCgst: 0,
      interestSgst: 0,
      interestCess: 0,
      lateFeesCgst: 0,
      lateFeesSgst: 0,
      dueDate: `20-${mShort}-${fy.split('-')[0]}`,
      filingDate: `20-${mShort}-${fy.split('-')[0]}`,
      itcEligibleNrcIgst: 0,
      itcEligibleNrcCgst: 0,
      itcEligibleNrcSgst: 0,
      itcEligibleNrcCess: 0,
      itcEligibleRcIgst: 0,
      itcEligibleRcCgst: 0,
      itcEligibleRcSgst: 0,
      itcEligibleRcCess: 0,
      itcReversedIgst: 0,
      itcReversedCgst: 0,
      itcReversedSgst: 0,
      itcReversedCess: 0,
      itcIneligibleIgst: 0,
      itcIneligibleCgst: 0,
      itcIneligibleSgst: 0,
      itcIneligibleCess: 0,
      itcReclaimedIgst: 0,
      itcReclaimedCgst: 0,
      itcReclaimedSgst: 0,
      itcReclaimedCess: 0,
    };
  });
}

export function deriveSalesFrom3B(
  records3B: any[],
  fy: string = '2025-2026'
): any[] {
  return FY_MONTHS.map((mShort, idx) => {
    const monthKey = getMonthKey(mShort, fy);
    const row3b = (records3B && records3B[idx]) || {};
    
    // In GSTR-3B Table 3.1:
    // outwardNrc = 3.1(a) Outward taxable supplies (other than zero rated, nil rated and exempted)
    // outwardRc = 3.1(d) Inward supplies liable to reverse charge (or 3.1(b) zero-rated)
    // nonTaxable = 3.1(c) Other outward supplies (Nil rated, exempted)
    const taxableSales = Number(row3b.outwardNrc || 0) + Number(row3b.outwardRc || 0);
    const exemptSales = Number(row3b.nonTaxable || 0);
    const totalSales = Number(row3b.totalOutward || 0) > 0
      ? Number(row3b.totalOutward)
      : taxableSales + exemptSales;

    const igst = Number(row3b.outwardIgst || 0);
    const cgst = Number(row3b.outwardCgst || 0);
    const sgst = Number(row3b.outwardSgst || 0);
    const cess = Number(row3b.outwardCess || 0);
    const totalTax = igst + cgst + sgst + cess;

    let taxRate = 18;
    if (taxableSales > 0 && totalTax > 0) {
      taxRate = Math.round((totalTax / taxableSales) * 100);
    }

    return {
      id: `s-${idx + 1}`,
      month: monthKey,
      monthIndex: idx,
      taxableSales,
      exemptSales,
      totalSales,
      igst,
      cgst,
      sgst,
      cess,
      totalTax,
      taxRate,
      source: 'GSTR-3B',
    };
  });
}

