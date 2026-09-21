import React, { useState, useEffect } from 'react';
import { useGst } from '../context/GstContext';
import { MonthlySalesRecord } from '../types/gst';
import { formatIndianCurrency } from '../utils/formatters';
import { exportRecordsToExcel } from '../utils/excelParser';
import {
  TrendingUp,
  Download,
  Upload,
  Edit3,
  Check,
  X,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface SalesModuleProps {
  onOpenImportModal: () => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({ onOpenImportModal }) => {
  const {
    sales,
    updateSalesRecord,
    settings,
    consolidated3b,
    syncSalesFrom3B,
  } = useGst();

  const [activeView, setActiveView] = useState<'3B_OUTWARD' | 'SALES_REGISTER'>('3B_OUTWARD');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<MonthlySalesRecord>>({});
  const [syncedToast, setSyncedToast] = useState(false);

  // Auto-sync sales from 3B if sales table has all zeros
  useEffect(() => {
    const hasPositiveSales = sales.some(
      (s) => (s.taxableSales || 0) > 0 || (s.totalSales || 0) > 0
    );
    if (!hasPositiveSales && consolidated3b && consolidated3b.length > 0) {
      syncSalesFrom3B();
    }
  }, [sales, consolidated3b, syncSalesFrom3B]);

  const handleManualSync = () => {
    syncSalesFrom3B();
    setSyncedToast(true);
    setTimeout(() => setSyncedToast(false), 3000);
  };

  const handleStartEdit = (record: MonthlySalesRecord) => {
    setEditingRowId(record.id);
    setEditValues({
      taxableSales: record.taxableSales,
      exemptSales: record.exemptSales,
      igst: record.igst,
      cgst: record.cgst,
      sgst: record.sgst,
      cess: record.cess,
      taxRate: record.taxRate || 18,
    });
  };

  const handleSaveEdit = (id: string) => {
    updateSalesRecord(id, editValues);
    setEditingRowId(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditValues({});
  };

  // Compute 12-Month totals for 3B Outward
  const total3bNrc = consolidated3b.reduce((acc, r) => acc + (r.outwardNrc || 0), 0);
  const total3bRc = consolidated3b.reduce((acc, r) => acc + (r.outwardRc || 0), 0);
  const total3bNonTaxable = consolidated3b.reduce((acc, r) => acc + (r.nonTaxable || 0), 0);
  const total3bOutward = consolidated3b.reduce(
    (acc, r) => acc + (r.totalOutward || (r.outwardNrc || 0) + (r.nonTaxable || 0)),
    0
  );
  const total3bIgst = consolidated3b.reduce((acc, r) => acc + (r.outwardIgst || 0), 0);
  const total3bCgst = consolidated3b.reduce((acc, r) => acc + (r.outwardCgst || 0), 0);
  const total3bSgst = consolidated3b.reduce((acc, r) => acc + (r.outwardSgst || 0), 0);
  const total3bCess = consolidated3b.reduce((acc, r) => acc + (r.outwardCess || 0), 0);
  const total3bTax = total3bIgst + total3bCgst + total3bSgst + total3bCess;

  // Compute 12-Month totals for Sales Register
  const totalTaxable = sales.reduce((acc, s) => acc + (s.taxableSales || 0), 0);
  const totalExempt = sales.reduce((acc, s) => acc + (s.exemptSales || 0), 0);
  const totalSales = sales.reduce(
    (acc, s) => acc + (s.totalSales || (s.taxableSales || 0) + (s.exemptSales || 0)),
    0
  );
  const totalIgst = sales.reduce((acc, s) => acc + (s.igst || 0), 0);
  const totalCgst = sales.reduce((acc, s) => acc + (s.cgst || 0), 0);
  const totalSgst = sales.reduce((acc, s) => acc + (s.sgst || 0), 0);
  const totalCess = sales.reduce((acc, s) => acc + (s.cess || 0), 0);
  const totalTax = sales.reduce(
    (acc, s) => acc + (s.totalTax || (s.igst || 0) + (s.cgst || 0) + (s.sgst || 0) + (s.cess || 0)),
    0
  );

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              SALES &amp; OUTWARD SUPPLIES
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-600" />
              GSTR-3B TABLE 3.1 LINKED • 12 MONTH MATRIX
            </span>
            {syncedToast && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-3 h-3" /> Synced from 3B!
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Displaying 12-month sales data synchronized from GSTR-3B Outward Supplies with taxable, exempt, and output tax calculations for FY {settings.financialYear}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Sync Button */}
          <button
            onClick={handleManualSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition"
            title="Populate and refresh all 12 months with GSTR-3B Outward Supplies"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Sync from GSTR-3B</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload / Append</span>
          </button>

          {/* Export Button */}
          <button
            onClick={() =>
              exportRecordsToExcel(
                'SALES',
                sales,
                `Sales_Register_FY_${settings.financialYear}.xlsx`
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Sales Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Outward Taxable (NRC)
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {formatIndianCurrency(total3bNrc > 0 ? total3bNrc : totalTaxable, 2)}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">3B Table 3.1(a) Outward Taxable</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Exempt / Non-Taxable Sales
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">
            {formatIndianCurrency(total3bNonTaxable > 0 ? total3bNonTaxable : totalExempt, 2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">3B Table 3.1(c) Nil/Exempted</div>
        </div>

        <div className="bg-white border border-blue-200 bg-blue-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider">
            Total Outward Turnover
          </div>
          <div className="text-lg font-bold text-blue-700 mt-1">
            {formatIndianCurrency(total3bOutward > 0 ? total3bOutward : totalSales, 2)}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">Total Outward Supplies FY</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Output Tax Liability
          </div>
          <div className="text-lg font-bold text-amber-700 mt-1">
            {formatIndianCurrency(total3bTax > 0 ? total3bTax : totalTax, 2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">IGST + CGST + SGST + Cess</div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveView('3B_OUTWARD')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeView === '3B_OUTWARD'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>GSTR-3B Outward Supplies Matrix (Table 3.1)</span>
        </button>

        <button
          onClick={() => setActiveView('SALES_REGISTER')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeView === 'SALES_REGISTER'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Sales Master Register (10 Columns)</span>
        </button>
      </div>

      {/* VIEW 1: GSTR-3B Outward Supplies (Official Table 3.1) */}
      {activeView === '3B_OUTWARD' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              GSTR-3B Outward Supplies 12-Month Matrix (Apr – Mar)
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Source: Consolidated GSTR-3B Return Table 3.1
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider font-sans whitespace-nowrap">
                  <th className="py-3 px-4">MONTH</th>
                  <th className="py-3 px-4 text-right">OUTWARD NRC (₹)</th>
                  <th className="py-3 px-4 text-right">NON-TAXABLE / EXEMPT (₹)</th>
                  <th className="py-3 px-4 text-right font-bold text-blue-900">TOTAL OUTWARD (₹)</th>
                  <th className="py-3 px-4 text-right">IGST (₹)</th>
                  <th className="py-3 px-4 text-right">CGST (₹)</th>
                  <th className="py-3 px-4 text-right">SGST (₹)</th>
                  <th className="py-3 px-4 text-right">CESS (₹)</th>
                  <th className="py-3 px-4 text-right font-bold text-amber-800">TOTAL TAX (₹)</th>
                  <th className="py-3 px-4 text-center font-sans">DUE DATE</th>
                  <th className="py-3 px-4 text-center font-sans">FILING DATE</th>
                  <th className="py-3 px-4 text-center font-sans">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {consolidated3b.map((row, idx) => {
                  const rowTurnover = row.totalOutward > 0 ? row.totalOutward : (row.outwardNrc + row.nonTaxable);
                  const rowTax = row.outwardIgst + row.outwardCgst + row.outwardSgst + row.outwardCess;

                  return (
                    <tr
                      key={`3b-sales-${row.monthIndex}-${idx}`}
                      className="hover:bg-blue-50/40 transition whitespace-nowrap"
                    >
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                        {row.month}
                        <span className="text-[10px] text-slate-400 block font-mono font-normal">
                          {row.monthShort}
                        </span>
                      </td>

                      {/* Outward NRC (Taxable) */}
                      <td className="py-2.5 px-4 text-right font-medium text-slate-800">
                        {formatIndianCurrency(row.outwardNrc, 2)}
                      </td>

                      {/* Non-Taxable / Exempt */}
                      <td className="py-2.5 px-4 text-right text-slate-600">
                        {formatIndianCurrency(row.nonTaxable, 2)}
                      </td>

                      {/* Total Outward */}
                      <td className="py-2.5 px-4 text-right font-bold text-blue-700">
                        {formatIndianCurrency(rowTurnover, 2)}
                      </td>

                      {/* IGST */}
                      <td className="py-2.5 px-4 text-right text-slate-600">
                        {formatIndianCurrency(row.outwardIgst, 2)}
                      </td>

                      {/* CGST */}
                      <td className="py-2.5 px-4 text-right text-slate-800">
                        {formatIndianCurrency(row.outwardCgst, 2)}
                      </td>

                      {/* SGST */}
                      <td className="py-2.5 px-4 text-right text-slate-800">
                        {formatIndianCurrency(row.outwardSgst, 2)}
                      </td>

                      {/* Cess */}
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {formatIndianCurrency(row.outwardCess, 2)}
                      </td>

                      {/* Total Tax */}
                      <td className="py-2.5 px-4 text-right font-bold text-amber-700">
                        {formatIndianCurrency(rowTax, 2)}
                      </td>

                      {/* Due Date */}
                      <td className="py-2.5 px-4 text-center font-sans text-slate-500 text-[11px]">
                        {row.dueDate || '-'}
                      </td>

                      {/* Filing Date */}
                      <td className="py-2.5 px-4 text-center font-sans text-slate-600 text-[11px] font-medium">
                        {row.filingDate || '-'}
                      </td>

                      {/* 3B Status */}
                      <td className="py-2.5 px-4 text-center font-sans">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Filed
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Financial Year Total Row */}
              <tfoot>
                <tr className="bg-amber-300 text-slate-950 font-bold border-t-2 border-amber-400 text-xs whitespace-nowrap">
                  <td className="py-3 px-4 font-sans uppercase">TOTAL (FY)</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(total3bNrc, 2)}</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(total3bNonTaxable, 2)}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-950">
                    {formatIndianCurrency(total3bOutward, 2)}
                  </td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(total3bIgst, 2)}</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(total3bCgst, 2)}</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(total3bSgst, 2)}</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(total3bCess, 2)}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-950">
                    {formatIndianCurrency(total3bTax, 2)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Sales Master Register (10 Columns) with inline editing */}
      {activeView === 'SALES_REGISTER' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              Fixed 10-Column Sales Register (Editable)
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Click the Edit icon to adjust monthly sales values
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider font-sans whitespace-nowrap">
                  <th className="py-3 px-4">MONTH</th>
                  <th className="py-3 px-4 text-right">TAXABLE SALES (₹)</th>
                  <th className="py-3 px-4 text-right">EXEMPT SALES (₹)</th>
                  <th className="py-3 px-4 text-right font-bold text-blue-900">TOTAL SALES (₹)</th>
                  <th className="py-3 px-4 text-right">IGST (₹)</th>
                  <th className="py-3 px-4 text-right">CGST (₹)</th>
                  <th className="py-3 px-4 text-right">SGST (₹)</th>
                  <th className="py-3 px-4 text-right">CESS (₹)</th>
                  <th className="py-3 px-4 text-right font-bold text-amber-800">TOTAL TAX (₹)</th>
                  <th className="py-3 px-4 text-center font-sans">TAX RATE</th>
                  <th className="py-3 px-4 text-center font-sans">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sales.map((record) => {
                  const isEditing = editingRowId === record.id;
                  const calcTotalSales = (record.taxableSales || 0) + (record.exemptSales || 0);
                  const calcTotalTax =
                    (record.igst || 0) + (record.cgst || 0) + (record.sgst || 0) + (record.cess || 0);

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-blue-50/40 transition whitespace-nowrap ${
                        isEditing ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                        {record.month}
                      </td>

                      {/* Taxable Sales */}
                      <td className="py-2.5 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.taxableSales ?? ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                taxableSales: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-28 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none font-mono"
                          />
                        ) : (
                          <span className="text-slate-800 font-medium">
                            {formatIndianCurrency(record.taxableSales, 2)}
                          </span>
                        )}
                      </td>

                      {/* Exempt Sales */}
                      <td className="py-2.5 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.exemptSales ?? ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                exemptSales: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-28 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none font-mono"
                          />
                        ) : (
                          <span className="text-slate-600">
                            {formatIndianCurrency(record.exemptSales, 2)}
                          </span>
                        )}
                      </td>

                      {/* Total Sales (Taxable + Exempt) */}
                      <td className="py-2.5 px-4 text-right font-bold text-blue-700">
                        {formatIndianCurrency(calcTotalSales, 2)}
                      </td>

                      {/* IGST */}
                      <td className="py-2.5 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.igst ?? ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                igst: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none font-mono"
                          />
                        ) : (
                          <span className="text-slate-600">
                            {formatIndianCurrency(record.igst, 2)}
                          </span>
                        )}
                      </td>

                      {/* CGST */}
                      <td className="py-2.5 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.cgst ?? ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                cgst: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none font-mono"
                          />
                        ) : (
                          <span className="text-slate-800">
                            {formatIndianCurrency(record.cgst, 2)}
                          </span>
                        )}
                      </td>

                      {/* SGST */}
                      <td className="py-2.5 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.sgst ?? ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                sgst: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none font-mono"
                          />
                        ) : (
                          <span className="text-slate-800">
                            {formatIndianCurrency(record.sgst, 2)}
                          </span>
                        )}
                      </td>

                      {/* CESS */}
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.cess ?? 0}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                cess: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none font-mono"
                          />
                        ) : (
                          formatIndianCurrency(record.cess, 2)
                        )}
                      </td>

                      {/* Total Tax */}
                      <td className="py-2.5 px-4 text-right font-bold text-amber-700">
                        {formatIndianCurrency(calcTotalTax, 2)}
                      </td>

                      {/* Tax Rate */}
                      <td className="py-2.5 px-4 text-center text-slate-500 font-sans">
                        {record.taxRate ? `${record.taxRate}%` : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-center font-sans">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(record.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(record)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit Row"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Financial Year Total Row (Permanent Fixed Row) */}
              <tfoot>
                <tr className="bg-amber-300 text-slate-950 font-bold border-t-2 border-amber-400 text-xs whitespace-nowrap">
                  <td className="py-3 px-4 font-sans uppercase">TOTAL (FY)</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(totalTaxable, 2)}</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(totalExempt, 2)}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-950">
                    {formatIndianCurrency(totalSales, 2)}
                  </td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(totalIgst, 2)}</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(totalCgst, 2)}</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(totalSgst, 2)}</td>
                  <td className="py-3 px-4 text-right">{formatIndianCurrency(totalCess, 2)}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-950">
                    {formatIndianCurrency(totalTax, 2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
