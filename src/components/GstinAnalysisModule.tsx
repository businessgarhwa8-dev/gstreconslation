import React, { useState, useMemo } from 'react';
import { useGst } from '../context/GstContext';
import { calculateGstinAnalysis } from '../utils/reconciliation';
import { GstinAnalysisItem } from '../types/gst';
import { formatIndianCurrency } from '../utils/formatters';
import { Search, Download, Building2 } from 'lucide-react';
import { exportRecordsToExcel } from '../utils/excelParser';

export const GstinAnalysisModule: React.FC = () => {
  const { purchases, settings } = useGst();
  const [searchTerm, setSearchTerm] = useState('');

  const gstinSummaries = useMemo<GstinAnalysisItem[]>(() => {
    return calculateGstinAnalysis(purchases);
  }, [purchases]);

  const filtered = useMemo<GstinAnalysisItem[]>(() => {
    if (!searchTerm) return gstinSummaries;
    const q = searchTerm.toLowerCase();
    return gstinSummaries.filter(
      (s: GstinAnalysisItem) =>
        s.gstin.toLowerCase().includes(q) ||
        (s.partyName || '').toLowerCase().includes(q)
    );
  }, [gstinSummaries, searchTerm]);

  // Aggregate totals
  const totalInvoices = filtered.reduce((acc: number, s: GstinAnalysisItem) => acc + s.invoiceCount, 0);
  const totalTaxable = filtered.reduce((acc: number, s: GstinAnalysisItem) => acc + s.taxableValue, 0);
  const totalTax = filtered.reduce((acc: number, s: GstinAnalysisItem) => acc + s.totalTax, 0);
  const totalDiff = filtered.reduce((acc: number, s: GstinAnalysisItem) => acc + (s.difference || 0), 0);

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              SUPPLIER GSTIN-WISE CONSOLIDATED ANALYSIS
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {gstinSummaries.length} REGISTERED SUPPLIERS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated supplier-level view for 2B/Purchase verification, tax compliance, and vendor matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search GSTIN or Supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:bg-white outline-none text-xs"
            />
          </div>

          <button
            onClick={() => exportRecordsToExcel('RECONCILIATION', purchases, `GSTIN_Summary_FY_${settings.financialYear}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider font-sans whitespace-nowrap">
                <th className="py-3 px-4">SUPPLIER GSTIN</th>
                <th className="py-3 px-4">PARTY / TRADE NAME</th>
                <th className="py-3 px-4 text-center">INVOICES</th>
                <th className="py-3 px-4 text-right">TAXABLE VALUE (₹)</th>
                <th className="py-3 px-4 text-right">TOTAL TAX (₹)</th>
                <th className="py-3 px-4 text-right">DIFF AMOUNT (₹)</th>
                <th className="py-3 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                filtered.map((item: GstinAnalysisItem) => (
                  <tr key={item.gstin} className="hover:bg-blue-50/40 transition whitespace-nowrap">
                    <td className="py-2.5 px-4 text-blue-700 font-bold">{item.gstin}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-900 max-w-xs truncate" title={item.partyName}>
                      {item.partyName}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-800">{item.invoiceCount}</td>
                    <td className="py-2.5 px-4 text-right text-slate-800 font-mono">
                      {formatIndianCurrency(item.taxableValue, 2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-900 font-semibold font-mono">
                      {formatIndianCurrency(item.totalTax, 2)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-bold font-mono ${
                        (item.difference || 0) > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}
                    >
                      {formatIndianCurrency(item.difference || 0, 2)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-sans">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'MATCHED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Row */}
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-amber-300 text-slate-950 font-bold border-t-2 border-amber-400 text-xs whitespace-nowrap">
                  <td colSpan={2} className="py-3 px-4 font-sans uppercase">
                    TOTAL ({filtered.length} SUPPLIERS)
                  </td>
                  <td className="py-3 px-4 text-center">{totalInvoices}</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(totalTaxable, 2)}</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(totalTax, 2)}</td>
                  <td className="py-3 px-4 text-right font-black">{formatIndianCurrency(totalDiff, 2)}</td>
                  <td className="py-3 px-4 text-center font-sans">ALL ACTIVE</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
