import React from 'react';
import { useGst } from '../context/GstContext';
import {
  calculateMonthWiseDashboard,
  calculateRateWiseAnalysis,
} from '../utils/reconciliation';
import { formatIndianCurrency } from '../utils/formatters';
import {
  TrendingUp,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  AlertOctagon,
  Scale,
  DollarSign,
  FileSpreadsheet,
  FileText,
  ArrowUpRight,
  ShieldAlert,
  FolderKanban,
  Plus,
} from 'lucide-react';
import { TabType } from './Sidebar';

interface DashboardProps {
  onNavigate: (tab: TabType) => void;
  onOpenPdfModal: () => void;
  onOpenImportModal: () => void;
  onOpenClientsModal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenPdfModal,
  onOpenImportModal,
  onOpenClientsModal,
}) => {
  const {
    settings,
    sales,
    itc,
    purchases,
    reconciliationSummary,
    validationIssues,
    clients,
    activeClientId,
    activeClient,
    switchClient,
  } = useGst();

  const { monthlyRows, totals } = calculateMonthWiseDashboard(sales, itc, purchases);
  const rateWise = calculateRateWiseAnalysis(purchases);

  // Total sales taxable + exempt
  const totalSalesAll = sales.reduce(
    (acc, s) => acc + (s.totalSales || (s.taxableSales || 0) + (s.exemptSales || 0)),
    0
  );
  // Total purchase taxable
  const totalPurchaseAll = purchases.reduce((acc, p) => acc + (p.taxableValue || 0), 0);
  // Total ITC claimed
  const totalItcAll = itc.reduce((acc, i) => acc + (i.totalTax || 0), 0);
  // Total GST output
  const totalGstSales = sales.reduce(
    (acc, s) =>
      acc + (s.totalTax || (s.igst || 0) + (s.cgst || 0) + (s.sgst || 0) + (s.cess || 0)),
    0
  );

  const matchedCount = purchases.filter((p) => p.status === 'MATCHED').length;
  const unmatchedCount = purchases.filter((p) => p.status !== 'MATCHED').length;

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner / Company Highlights */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {settings.companyName}
            </h1>
            <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-semibold font-mono">
              FY {settings.financialYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
            <span>
              GSTIN: <strong className="text-blue-900 font-semibold">{settings.gstin}</strong>
            </span>
            <span>
              File Ref: <strong className="text-slate-700 font-semibold">#{settings.fileNo}</strong>
            </span>
            <span>
              Matching Tolerance: <strong className="text-slate-700 font-semibold">±₹{settings.invoiceMatchingTolerance}</strong>
            </span>
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenClientsModal || (() => onNavigate('clients'))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold border border-blue-200 shadow-xs transition"
          >
            <FolderKanban className="w-4 h-4 text-blue-600" />
            <span>Client Dossiers ({clients.length})</span>
          </button>
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import / Append Excel</span>
          </button>
          <button
            onClick={onOpenPdfModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Master PDF</span>
          </button>
        </div>
      </div>

      {/* Multi-Client Quick Switcher Bar */}
      <div className="bg-white border border-blue-200/80 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/30">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-blue-900 flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-blue-600" />
            <span>Active Client File:</span>
          </span>
          <span className="bg-blue-700 text-white font-mono font-bold px-2 py-0.5 rounded text-[11px]">
            #{activeClient.fileNo}
          </span>
          <span className="font-semibold text-slate-800">
            {activeClient.companyName}
          </span>
          <span className="text-slate-400 hidden md:inline">|</span>
          <span className="text-slate-500 font-mono hidden md:inline">
            GSTIN: {activeClient.gstin}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Switch File:</span>
          <select
            value={activeClientId}
            onChange={(e) => {
              if (e.target.value === '__add_new__') {
                if (onOpenClientsModal) onOpenClientsModal();
                else onNavigate('clients');
              } else {
                switchClient(e.target.value);
              }
            }}
            className="bg-white text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-slate-300 outline-none cursor-pointer hover:border-blue-500 transition"
          >
            {clients.map((c) => (
              <option key={`dash-client-${c.id}`} value={c.id}>
                File #{c.fileNo} - {c.companyName}
              </option>
            ))}
            <option value="__add_new__">+ Add New Client Dossier...</option>
          </select>
          <button
            onClick={onOpenClientsModal || (() => onNavigate('clients'))}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            title="Add a new client with File Number"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New File</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (White-Blue theme) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Card 1: Total Sales */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Total Sales</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {formatIndianCurrency(totalSalesAll, 0, true)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Taxable + Exempt</div>
        </div>

        {/* Card 2: Total Purchase */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Total Purchase</span>
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {formatIndianCurrency(totalPurchaseAll, 0, true)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{purchases.length} invoices</div>
        </div>

        {/* Card 3: Total ITC */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Total ITC</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono">
            {formatIndianCurrency(totalItcAll, 0, true)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Claimed in 3B</div>
        </div>

        {/* Card 4: Matched */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Matched</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-emerald-600 font-mono">
            {matchedCount} Invoices
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {purchases.length > 0 ? ((matchedCount / purchases.length) * 100).toFixed(1) : 100}% Matched
          </div>
        </div>

        {/* Card 5: Unmatched */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Unmatched</span>
            <AlertOctagon className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base font-bold text-amber-600 font-mono">
            {unmatchedCount} Invoices
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Diff or Missing</div>
        </div>

        {/* Card 6: Difference */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Difference</span>
            <Scale className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-base font-bold text-rose-600 font-mono">
            {formatIndianCurrency(reconciliationSummary.totalDifferenceAmount, 0, true)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Tax / Value diff</div>
        </div>

        {/* Card 7: Total GST */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-medium">Total GST</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base font-bold text-blue-600 font-mono">
            {formatIndianCurrency(totalGstSales, 0, true)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Output liability</div>
        </div>
      </div>

      {/* Validation alert banner if issues found */}
      {validationIssues.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-900">
                Data Integrity Checks: {validationIssues.length} alerts detected
              </div>
              <div className="text-[11px] text-amber-700">
                Found duplicate invoices, missing fields, or tax calculation discrepancies across records.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('reconciliation')}
            className="text-xs font-semibold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shrink-0 transition shadow-xs"
          >
            Review Issues
          </button>
        </div>
      )}

      {/* Month-Wise Dashboard Master Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 bg-blue-50/40 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <span>Month-Wise Reconciliation Matrix</span>
              <span className="text-[11px] font-normal text-slate-500">(April to March FY {settings.financialYear})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live calculated figures directly from uploaded Purchase, Sales, and ITC master data.
            </p>
          </div>
          <button
            onClick={() => onNavigate('monthly-analysis')}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
          >
            <span>Detailed Analysis</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px]">
                <th className="py-2.5 px-4">Month</th>
                <th className="py-2.5 px-4 text-right">Sales (₹)</th>
                <th className="py-2.5 px-4 text-right">Purchase (₹)</th>
                <th className="py-2.5 px-4 text-right">ITC Claimed (₹)</th>
                <th className="py-2.5 px-4 text-right">GST Output (₹)</th>
                <th className="py-2.5 px-4 text-right">Difference (₹)</th>
                <th className="py-2.5 px-4 text-right">Match %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {monthlyRows.map((row, idx) => (
                <tr
                  key={`dash-${row.month}-${idx}`}
                  className="hover:bg-blue-50/40 transition"
                >
                  <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                    {row.month}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-800">
                    {formatIndianCurrency(row.sales, 2)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-800">
                    {formatIndianCurrency(row.purchase, 2)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-800">
                    {formatIndianCurrency(row.itc, 2)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-800">
                    {formatIndianCurrency(row.gst, 2)}
                  </td>
                  <td className={`py-2.5 px-4 text-right ${row.difference > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                    {formatIndianCurrency(row.difference, 2)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.matchPercentage >= 95
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : row.matchPercentage >= 80
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {row.matchPercentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}

              {/* TOTAL ROW - Highlighted in accounting yellow/gold */}
              <tr className="bg-amber-300 text-slate-950 font-bold border-t-2 border-amber-400">
                <td className="py-3 px-4 font-sans uppercase">TOTAL (FY)</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totals.sales, 2)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totals.purchase, 2)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totals.itc, 2)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totals.gst, 2)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totals.difference, 2)}</td>
                <td className="py-3 px-4 text-right">{totals.matchPercentage.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Rate Wise Overview Card & ITC Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Tax Rate-Wise Purchase Summary</h3>
            <span className="text-xs text-slate-500 font-medium">Rate Slabs (0%, 3%, 5%, 12%, 18%, 28%)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-[11px]">
                  <th className="py-2 px-2 text-left font-sans">Rate</th>
                  <th className="py-2 px-2 text-right">Taxable Value</th>
                  <th className="py-2 px-2 text-right">IGST</th>
                  <th className="py-2 px-2 text-right">CGST</th>
                  <th className="py-2 px-2 text-right">SGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rateWise.map((r) => (
                  <tr key={r.rate} className="hover:bg-blue-50/30">
                    <td className="py-2 px-2 font-sans font-bold text-slate-800">{r.rateLabel}</td>
                    <td className="py-2 px-2 text-right text-slate-800">{formatIndianCurrency(r.taxableValue, 2)}</td>
                    <td className="py-2 px-2 text-right text-slate-600">{formatIndianCurrency(r.igst, 2)}</td>
                    <td className="py-2 px-2 text-right text-slate-600">{formatIndianCurrency(r.cgst, 2)}</td>
                    <td className="py-2 px-2 text-right text-slate-600">{formatIndianCurrency(r.sgst, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ITC Head Balances Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Input Tax Credit (Mar {settings.financialYear.split('-')[1] || '2026'})</h3>
              <span className="text-xs text-blue-600 font-semibold">Head-Wise Ledger</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-[11px]">
                    <th className="py-2 px-2 text-left font-sans">HEAD</th>
                    <th className="py-2 px-2 text-right">OPENING (₹)</th>
                    <th className="py-2 px-2 text-right">CLOSING (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-2 font-sans font-semibold text-slate-800">IGST</td>
                    <td className="py-2 px-2 text-right text-slate-600">0</td>
                    <td className="py-2 px-2 text-right text-slate-600">0</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-sans font-semibold text-slate-800">CGST</td>
                    <td className="py-2 px-2 text-right text-slate-800">41,457</td>
                    <td className="py-2 px-2 text-right text-emerald-700 font-bold">59,394</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-sans font-semibold text-slate-800">SGST</td>
                    <td className="py-2 px-2 text-right text-slate-800">39,467</td>
                    <td className="py-2 px-2 text-right text-emerald-700 font-bold">55,596</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-sans font-semibold text-slate-800">CESS</td>
                    <td className="py-2 px-2 text-right text-slate-600">0</td>
                    <td className="py-2 px-2 text-right text-slate-600">0</td>
                  </tr>
                  <tr className="bg-amber-300 text-slate-950 font-bold">
                    <td className="py-2.5 px-2 font-sans">TOTAL</td>
                    <td className="py-2.5 px-2 text-right">80,924</td>
                    <td className="py-2.5 px-2 text-right">1,14,990</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Gross Inward + Tax Value:</span>
            <span className="font-mono text-slate-900 font-bold">
              {formatIndianCurrency(totalPurchaseAll + totalItcAll, 2, true)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
