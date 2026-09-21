import React, { useState, useMemo } from 'react';
import { useGst } from '../context/GstContext';
import { PurchaseRecord, MatchingStatus } from '../types/gst';
import { formatIndianCurrency } from '../utils/formatters';
import { exportRecordsToExcel } from '../utils/excelParser';
import {
  GitCompare,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Download,
  Settings2,
} from 'lucide-react';

export const MatchingModule: React.FC = () => {
  const {
    purchases,
    settings,
    updateSettings,
    reconciliationSummary,
    selectedMonthFilter,
    setSelectedMonthFilter,
  } = useGst();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [toleranceVal, setToleranceVal] = useState(settings.invoiceMatchingTolerance);

  const FY_MONTH_FULL = [
    'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December', 'January', 'February', 'March'
  ];

  const handleUpdateTolerance = () => {
    updateSettings({ invoiceMatchingTolerance: toleranceVal });
  };

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchGstin = (p.gstin || '').toLowerCase().includes(q) || (p.gstrGstin || '').toLowerCase().includes(q);
        const matchInv = (p.invoiceNo || '').toLowerCase().includes(q) || (p.gstrInvoiceNo || '').toLowerCase().includes(q);
        const matchParty = (p.party || '').toLowerCase().includes(q);
        if (!matchGstin && !matchInv && !matchParty) return false;
      }

      if (selectedStatus !== 'All') {
        if (p.status !== selectedStatus) return false;
      }

      if (selectedMonthFilter !== 'All') {
        const pPeriod = (p.period || p.gstrPeriod || '').toLowerCase();
        const filterPrefix = selectedMonthFilter.slice(0, 3).toLowerCase();
        if (!pPeriod.includes(filterPrefix)) return false;
      }

      return true;
    });
  }, [purchases, searchTerm, selectedStatus, selectedMonthFilter]);

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Header & Tolerance Config */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-blue-600" />
              PURCHASE vs GSTR-2A/2B COMMON GSTIN RECONCILIATION
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              SIDE-BY-SIDE MATCHING
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile Purchase invoices with portal 2A/2B data using Common GSTIN and invoice metadata.
          </p>
        </div>

        {/* Tolerance Controls */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
          <Settings2 className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600 font-medium">Tolerance: ±₹</span>
          <input
            type="number"
            step="0.5"
            value={toleranceVal}
            onChange={(e) => setToleranceVal(parseFloat(e.target.value) || 0)}
            className="w-14 bg-white text-slate-900 px-1.5 py-0.5 rounded border border-slate-300 text-center font-mono outline-none"
          />
          <button
            onClick={handleUpdateTolerance}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Summary Status Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setSelectedStatus('MATCHED')}
          className={`p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatus === 'MATCHED'
              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-600">Fully Matched</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {reconciliationSummary.matchedCount}
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus('TAX DIFFERENCE')}
          className={`p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatus === 'TAX DIFFERENCE'
              ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-600">Tax Difference</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">
            {purchases.filter((p) => p.status === 'TAX DIFFERENCE').length}
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus('MISSING IN GSTR DATA')}
          className={`p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatus === 'MISSING IN GSTR DATA'
              ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-600">Missing in GSTR</span>
            <HelpCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700">
            {purchases.filter((p) => p.status.includes('MISSING')).length}
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus('All')}
          className={`p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            selectedStatus === 'All'
              ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-600">All Invoices</span>
            <GitCompare className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700">{purchases.length}</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Supplier, GSTIN, Invoice #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 text-slate-900 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:bg-white outline-none text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* 12 Months Selector */}
          <select
            value={selectedMonthFilter}
            onChange={(e) => setSelectedMonthFilter(e.target.value)}
            className="bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer text-xs"
          >
            <option value="All">All 12 Months (FY)</option>
            {FY_MONTH_FULL.map((m) => (
              <option key={`match-month-${m}`} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer text-xs"
          >
            <option value="All">All Statuses</option>
            <option value="MATCHED">MATCHED</option>
            <option value="PARTIALLY MATCHED">PARTIALLY MATCHED</option>
            <option value="NOT MATCHED">NOT MATCHED</option>
            <option value="TAX DIFFERENCE">TAX DIFFERENCE</option>
            <option value="VALUE DIFFERENCE">VALUE DIFFERENCE</option>
            <option value="MISSING IN GSTR DATA">MISSING IN GSTR DATA</option>
            <option value="DUPLICATE">DUPLICATE</option>
            <option value="PENDING VERIFICATION">PENDING VERIFICATION</option>
          </select>

          <button
            onClick={() => exportRecordsToExcel('RECONCILIATION', filtered, 'GST_Reconciliation_Matrix.xlsx')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Side-by-side Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              {/* Grouping header */}
              <tr className="border-b border-slate-200 text-[11px] font-sans font-bold">
                <th colSpan={3} className="py-2.5 px-3 border-r border-slate-200 text-center bg-slate-100 text-slate-700">
                  PARTY / STATUS
                </th>
                <th colSpan={6} className="py-2.5 px-3 border-r border-slate-200 text-center bg-blue-50 text-blue-900">
                  PURCHASE REGISTER (BOOKS)
                </th>
                <th colSpan={6} className="py-2.5 px-3 border-r border-slate-200 text-center bg-indigo-50 text-indigo-900">
                  GSTR-2A / 2B (GOVT PORTAL)
                </th>
                <th colSpan={2} className="py-2.5 px-3 text-center bg-amber-50 text-amber-900">
                  DIFFERENCE &amp; STATUS
                </th>
              </tr>

              {/* Sub headers */}
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[10px] uppercase font-semibold whitespace-nowrap font-sans">
                <th className="py-2 px-2.5 text-center font-mono">Sr</th>
                <th className="py-2 px-2.5">Supplier Name</th>
                <th className="py-2 px-2.5 border-r border-slate-200">Matching Status</th>

                {/* Purchase Cols */}
                <th className="py-2 px-2.5 text-blue-700 font-mono">Pur GSTIN</th>
                <th className="py-2 px-2.5 text-slate-900 font-mono">Pur Inv #</th>
                <th className="py-2 px-2.5 font-mono">Pur Date</th>
                <th className="py-2 px-2.5 text-right font-mono">Taxable</th>
                <th className="py-2 px-2.5 text-right font-mono">IGST</th>
                <th className="py-2 px-2.5 text-right border-r border-slate-200 font-mono">CGST/SGST</th>

                {/* GSTR Cols */}
                <th className="py-2 px-2.5 text-blue-700 font-mono">GSTR GSTIN</th>
                <th className="py-2 px-2.5 text-slate-900 font-mono">GSTR Inv #</th>
                <th className="py-2 px-2.5 font-mono">GSTR Date</th>
                <th className="py-2 px-2.5 text-right font-mono">GSTR Taxable</th>
                <th className="py-2 px-2.5 text-right font-mono">GSTR IGST</th>
                <th className="py-2 px-2.5 text-right border-r border-slate-200 font-mono">GSTR CGST/SGST</th>

                {/* Difference */}
                <th className="py-2 px-2.5 text-right font-mono">Diff (₹)</th>
                <th className="py-2 px-2.5 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-8 text-center text-slate-400 font-sans">
                    No matching reconciliation records found.
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const purcTax = (p.igst || 0) + (p.cgst || 0) + (p.sgst || 0);
                  const gstrTax =
                    p.gstrTaxableValue !== undefined
                      ? (p.gstrIgst || 0) + (p.gstrCgst || 0) + (p.gstrSgst || 0)
                      : undefined;

                  const diff = gstrTax !== undefined ? Math.abs(purcTax - gstrTax) : 0;
                  const isMatched = p.status === 'MATCHED';
                  const isDiff = p.status === 'TAX DIFFERENCE' || p.status === 'VALUE DIFFERENCE';
                  const isMissing = p.status.includes('MISSING');

                  return (
                    <tr
                      key={`rec-row-${p.id || 'p'}-${idx}`}
                      className={`hover:bg-blue-50/30 transition whitespace-nowrap ${
                        isMatched
                          ? ''
                          : isDiff
                          ? 'bg-amber-50/40'
                          : isMissing
                          ? 'bg-rose-50/40'
                          : ''
                      }`}
                    >
                      <td className="py-2 px-2.5 text-center text-slate-500">{p.sr}</td>
                      <td className="py-2 px-2.5 font-sans font-medium text-slate-900 max-w-[140px] truncate" title={p.party}>
                        {p.party}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-full font-sans ${
                            isMatched
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isDiff
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isMissing
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* Purchase Side */}
                      <td className="py-2 px-2.5 text-blue-700 font-semibold">{p.gstin}</td>
                      <td className="py-2 px-2.5 text-slate-900 font-semibold">{p.invoiceNo}</td>
                      <td className="py-2 px-2.5 text-slate-500">{p.invoiceDate}</td>
                      <td className="py-2 px-2.5 text-right text-slate-800">
                        {formatIndianCurrency(p.taxableValue, 2)}
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-600">
                        {formatIndianCurrency(p.igst, 2)}
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-800 border-r border-slate-200">
                        {formatIndianCurrency((p.cgst || 0) + (p.sgst || 0), 2)}
                      </td>

                      {/* GSTR Side */}
                      <td className="py-2 px-2.5 text-blue-700 font-semibold">
                        {p.gstrGstin || (isMissing ? 'NOT IN 2A' : p.gstin)}
                      </td>
                      <td className="py-2 px-2.5 text-slate-900 font-semibold">
                        {p.gstrInvoiceNo || (isMissing ? 'NOT IN 2A' : p.invoiceNo)}
                      </td>
                      <td className="py-2 px-2.5 text-slate-500">
                        {p.gstrInvoiceDate || (isMissing ? '-' : p.invoiceDate)}
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-800">
                        {p.gstrTaxableValue !== undefined
                          ? formatIndianCurrency(p.gstrTaxableValue, 2)
                          : isMissing
                          ? '0.00'
                          : formatIndianCurrency(p.taxableValue, 2)}
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-600">
                        {p.gstrIgst !== undefined
                          ? formatIndianCurrency(p.gstrIgst, 2)
                          : isMissing
                          ? '0.00'
                          : formatIndianCurrency(p.igst, 2)}
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-800 border-r border-slate-200">
                        {p.gstrCgst !== undefined
                          ? formatIndianCurrency((p.gstrCgst || 0) + (p.gstrSgst || 0), 2)
                          : isMissing
                          ? '0.00'
                          : formatIndianCurrency((p.cgst || 0) + (p.sgst || 0), 2)}
                      </td>

                      {/* Diff & Status */}
                      <td
                        className={`py-2 px-2.5 text-right font-bold ${
                          diff > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {formatIndianCurrency(diff, 2)}
                      </td>
                      <td className="py-2 px-2.5 text-center font-sans">
                        {isMatched ? (
                          <span className="text-emerald-700 text-xs font-bold">✓ OK</span>
                        ) : (
                          <span className="text-amber-700 text-xs font-bold">⚠ Review</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
