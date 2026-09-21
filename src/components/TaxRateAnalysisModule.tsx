import React from 'react';
import { useGst } from '../context/GstContext';
import { calculateRateWiseAnalysis } from '../utils/reconciliation';
import { formatIndianCurrency } from '../utils/formatters';
import { Percent } from 'lucide-react';

export const TaxRateAnalysisModule: React.FC = () => {
  const { purchases } = useGst();
  const rateWiseData = calculateRateWiseAnalysis(purchases);

  const totalTaxable = rateWiseData.reduce((acc, r) => acc + r.taxableValue, 0);
  const totalIgst = rateWiseData.reduce((acc, r) => acc + r.igst, 0);
  const totalCgst = rateWiseData.reduce((acc, r) => acc + r.cgst, 0);
  const totalSgst = rateWiseData.reduce((acc, r) => acc + r.sgst, 0);
  const totalTax = rateWiseData.reduce((acc, r) => acc + r.totalTax, 0);

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-blue-600" />
              TAX RATE-WISE PURCHASE SLAB ANALYSIS
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              FIXED RATE SLABS: 0%, 3%, 5%, 12%, 18%, 28%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Categorized breakdown of inward purchases by statutory GST rate slabs with tax bifurcation.
          </p>
        </div>
      </div>

      {/* Grid of Rate Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {rateWiseData.map((r) => {
          const share = totalTaxable > 0 ? ((r.taxableValue / totalTaxable) * 100).toFixed(1) : '0.0';

          return (
            <div
              key={r.rate}
              className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-blue-300 transition shadow-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-slate-900 font-sans">{r.rateLabel}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                  {share}% Share
                </span>
              </div>
              <div className="text-xs text-slate-700 font-mono font-medium">
                {formatIndianCurrency(r.taxableValue, 0, true)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                Tax: {formatIndianCurrency(r.totalTax, 0, true)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider font-sans whitespace-nowrap">
                <th className="py-3 px-4">TAX SLAB</th>
                <th className="py-3 px-4 text-right">TAXABLE VALUE (₹)</th>
                <th className="py-3 px-4 text-right">IGST (₹)</th>
                <th className="py-3 px-4 text-right">CGST (₹)</th>
                <th className="py-3 px-4 text-right">SGST (₹)</th>
                <th className="py-3 px-4 text-right">TOTAL TAX (₹)</th>
                <th className="py-3 px-4 text-right">% OF TOTAL TAXABLE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rateWiseData.map((row) => {
                const pct = totalTaxable > 0 ? ((row.taxableValue / totalTaxable) * 100).toFixed(2) : '0.00';

                return (
                  <tr key={row.rate} className="hover:bg-blue-50/40 transition whitespace-nowrap">
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900">{row.rateLabel}</td>
                    <td className="py-2.5 px-4 text-right text-slate-800">
                      {formatIndianCurrency(row.taxableValue, 2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600">
                      {formatIndianCurrency(row.igst, 2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-800">
                      {formatIndianCurrency(row.cgst, 2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-800">
                      {formatIndianCurrency(row.sgst, 2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-blue-700">
                      {formatIndianCurrency(row.totalTax, 2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-blue-600 font-bold">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total Row */}
            <tfoot>
              <tr className="bg-amber-300 text-slate-950 font-bold border-t-2 border-amber-400 text-xs whitespace-nowrap">
                <td className="py-3 px-4 font-sans uppercase">TOTAL (ALL SLABS)</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totalTaxable, 2)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totalIgst, 2)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totalCgst, 2)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totalSgst, 2)}</td>
                <td className="py-3 px-4 text-right font-black">{formatIndianCurrency(totalTax, 2)}</td>
                <td className="py-3 px-4 text-right">100.00%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
