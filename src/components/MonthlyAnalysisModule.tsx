import React, { useState } from 'react';
import { useGst } from '../context/GstContext';
import { calculateMonthWiseDashboard } from '../utils/reconciliation';
import { formatIndianCurrency } from '../utils/formatters';
import {
  Download,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  Scale,
  Table,
} from 'lucide-react';
import { exportRecordsToExcel } from '../utils/excelParser';

export const MonthlyAnalysisModule: React.FC = () => {
  const { sales, itc, purchases, settings, consolidated3b } = useGst();
  const { monthlyRows, totals } = calculateMonthWiseDashboard(sales, itc, purchases);
  const [viewMode, setViewMode] = useState<'SUMMARY' | 'CONSOLIDATED_3B'>('SUMMARY');

  return (
    <div className="space-y-5 font-sans text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900">
              MONTH-WISE GST RECONCILIATION &amp; GSTR-3B MATRIX
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              FY {settings.financialYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compare outward liabilities, inward input tax credits, and inspect the consolidated 3B tax offset payment ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-300 text-xs">
            <button
              onClick={() => setViewMode('SUMMARY')}
              className={`px-3 py-1 rounded font-semibold transition ${
                viewMode === 'SUMMARY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Summary View
            </button>
            <button
              onClick={() => setViewMode('CONSOLIDATED_3B')}
              className={`px-3 py-1 rounded font-semibold transition ${
                viewMode === 'CONSOLIDATED_3B'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Consolidated 3B Ledger
            </button>
          </div>

          <button
            onClick={() => {
              if (viewMode === 'CONSOLIDATED_3B') {
                exportRecordsToExcel('GSTR3B_CONSOLIDATED', consolidated3b, `Consolidated_3B_FY_${settings.financialYear}.xlsx`);
              } else {
                exportRecordsToExcel('SALES', sales, `Monthly_Analysis_FY_${settings.financialYear}.xlsx`);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {viewMode === 'SUMMARY' ? (
        <>
          {/* Visual Metric summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Cumulative Sales</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">
                {formatIndianCurrency(totals.sales, 2, true)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Turnover reported in GSTR-1/3B</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Cumulative Purchases</span>
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">
                {formatIndianCurrency(totals.purchase, 2, true)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Total inward supply recorded</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>ITC Claimed</span>
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">
                {formatIndianCurrency(totals.itc, 2, true)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Input credit in Table 4(A)</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Average Match Ratio</span>
                <Scale className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg font-bold font-mono text-amber-700">
                {totals.matchPercentage.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Tolerance threshold ±₹{settings.invoiceMatchingTolerance}</div>
            </div>
          </div>

          {/* Complete Monthly Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider font-sans whitespace-nowrap">
                    <th className="py-3 px-4">MONTH</th>
                    <th className="py-3 px-4 text-right">TOTAL SALES (₹)</th>
                    <th className="py-3 px-4 text-right">PURCHASES (₹)</th>
                    <th className="py-3 px-4 text-right">ITC CLAIMED (₹)</th>
                    <th className="py-3 px-4 text-right">OUTPUT GST (₹)</th>
                    <th className="py-3 px-4 text-right">TAX DIFFERENCE (₹)</th>
                    <th className="py-3 px-4 text-center font-sans">MATCH STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {monthlyRows.map((row, idx) => (
                    <tr key={`month-${row.month}-${idx}`} className="hover:bg-blue-50/40 transition whitespace-nowrap">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{row.month}</td>
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
                      <td
                        className={`py-2.5 px-4 text-right font-bold ${
                          row.difference > 0 ? 'text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        {formatIndianCurrency(row.difference, 2)}
                      </td>
                      <td className="py-2.5 px-4 text-center font-sans">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.matchPercentage >= 95
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.matchPercentage >= 80
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {row.matchPercentage >= 95 ? 'Fully Reconciled' : 'Review Variance'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* TOTAL Row in master gold accent */}
                <tfoot>
                  <tr className="bg-amber-300 text-slate-950 font-bold border-t-2 border-amber-400 text-xs whitespace-nowrap">
                    <td className="py-3 px-4 font-sans uppercase">TOTAL (FY {settings.financialYear})</td>
                    <td className="py-3 px-4 text-right">{formatIndianCurrency(totals.sales, 2)}</td>
                    <td className="py-3 px-4 text-right">{formatIndianCurrency(totals.purchase, 2)}</td>
                    <td className="py-3 px-4 text-right">{formatIndianCurrency(totals.itc, 2)}</td>
                    <td className="py-3 px-4 text-right">{formatIndianCurrency(totals.gst, 2)}</td>
                    <td className="py-3 px-4 text-right font-black">{formatIndianCurrency(totals.difference, 2)}</td>
                    <td className="py-3 px-4 text-center font-sans font-black">{totals.matchPercentage.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Consolidated GSTR-3B Offset Matrix */
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Table className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                GSTR-3B 12-Month Consolidated Tax Offset Matrix
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Details of Outward Supplies (NRC &amp; RC), Offset of tax by ITC credit, Inward Supplies (RC &amp; NRC), Interest, and Late fees.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-sans text-[11px] font-bold">
                    <th className="py-2.5 px-3 border-r border-slate-200">Month</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 text-blue-900">Outward (NRC)</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 text-blue-900">Non-Taxable</th>
                    <th className="py-2.5 px-3 text-right bg-blue-100 text-blue-950 font-bold border-r border-slate-200">Total Outward</th>
                    <th className="py-2.5 px-3 text-right text-purple-900">CGST Liab</th>
                    <th className="py-2.5 px-3 text-right text-purple-900 border-r border-slate-200">SGST Liab</th>
                    <th className="py-2.5 px-3 text-right text-emerald-800">CGST by IGST</th>
                    <th className="py-2.5 px-3 text-right text-emerald-800">CGST by CGST</th>
                    <th className="py-2.5 px-3 text-right text-emerald-800">SGST by SGST</th>
                    <th className="py-2.5 px-3 text-right text-amber-900 border-r border-slate-200">Inward (NRC)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700">Eligible CGST ITC</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700 border-r border-slate-200">Eligible SGST ITC</th>
                    <th className="py-2.5 px-3 text-center">Filing Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {consolidated3b.map((r, i) => (
                    <tr key={`3b-row-${r.monthIndex ?? i}-${r.month}`} className="hover:bg-blue-50/40 transition whitespace-nowrap">
                      <td className="py-2 px-3 font-sans font-bold text-slate-900 border-r border-slate-200">
                        {r.month}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-800 bg-blue-50/20">
                        {formatIndianCurrency(r.outwardNrc, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 bg-blue-50/20">
                        {formatIndianCurrency(r.nonTaxable, 2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-blue-800 bg-blue-50 border-r border-slate-200">
                        {formatIndianCurrency(r.totalOutward, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-purple-800">
                        {formatIndianCurrency(r.outwardCgst, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-purple-800 border-r border-slate-200">
                        {formatIndianCurrency(r.outwardSgst, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700">
                        {formatIndianCurrency(r.cgstByIgst, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700">
                        {formatIndianCurrency(r.cgstByCgst, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700">
                        {formatIndianCurrency(r.sgstBySgst, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-amber-800 border-r border-slate-200">
                        {formatIndianCurrency(r.inwardNrc, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-semibold">
                        {formatIndianCurrency(r.itcEligibleNrcCgst, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-semibold border-r border-slate-200">
                        {formatIndianCurrency(r.itcEligibleNrcSgst, 2)}
                      </td>
                      <td className="py-2 px-3 text-center font-sans text-[11px] text-slate-600">
                        {r.filingDate || 'Filed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
