import React, { useState } from 'react';
import { useGst } from '../context/GstContext';
import { MonthlyItcRecord, ItcHeadBalance } from '../types/gst';
import { formatIndianCurrency } from '../utils/formatters';
import { exportRecordsToExcel } from '../utils/excelParser';
import { CreditCard, Download, Upload, Edit3, Check, X } from 'lucide-react';

interface ItcModuleProps {
  onOpenImportModal: () => void;
}

export const ItcModule: React.FC<ItcModuleProps> = ({ onOpenImportModal }) => {
  const {
    itc,
    updateItcRecord,
    itcBalances,
    updateItcBalances,
    settings,
  } = useGst();

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<MonthlyItcRecord>>({});

  // Balances editor state
  const [isEditingBalances, setIsEditingBalances] = useState(false);
  const [balanceValues, setBalanceValues] = useState<ItcHeadBalance[]>(itcBalances);

  const handleStartEdit = (record: MonthlyItcRecord) => {
    setEditingRowId(record.id);
    setEditValues({
      exemptPurchase: record.exemptPurchase,
      igst: record.igst,
      cgst: record.cgst,
      sgst: record.sgst,
      cess: record.cess,
      openingItc: record.openingItc,
      closingItc: record.closingItc,
      remarks: record.remarks || '',
      invoiceRef: record.invoiceRef || '',
    });
  };

  const handleSaveEdit = (id: string) => {
    updateItcRecord(id, editValues);
    setEditingRowId(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditValues({});
  };

  const handleSaveBalances = () => {
    updateItcBalances(balanceValues);
    setIsEditingBalances(false);
  };

  // Totals for 12 months (matches the master reference PDF format TOTAL CL)
  const totalExempt = itc.reduce((acc, i) => acc + (i.exemptPurchase || 0), 0);
  const totalIgst = itc.reduce((acc, i) => acc + (i.igst || 0), 0);
  const totalCgst = itc.reduce((acc, i) => acc + (i.cgst || 0), 0);
  const totalSgst = itc.reduce((acc, i) => acc + (i.sgst || 0), 0);
  const totalCess = itc.reduce((acc, i) => acc + (i.cess || 0), 0);
  const totalTax = totalIgst + totalCgst + totalSgst + totalCess;

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Module Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              ITC EXCEL – FIXED MASTER FORMAT
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              11 MASTER COLUMNS • 12 MONTH CLAIM MATRIX
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Permanent Input Tax Credit claim records received from registered persons with head-wise ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload / Append ITC</span>
          </button>
          <button
            onClick={() => exportRecordsToExcel('ITC', itc, `ITC_Excel_FY_${settings.financialYear}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Fixed ITC Excel</span>
          </button>
        </div>
      </div>

      {/* Main 12-Month Master ITC Claim Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
            Goods and Services Tax - GST ITC CLAIM F/Y - {settings.financialYear}
          </span>
          <span className="text-[11px] text-blue-700 font-semibold font-mono">
            Total Claimed: {formatIndianCurrency(totalTax, 2, true)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider font-sans whitespace-nowrap">
                <th className="py-3 px-4">MONTH</th>
                <th className="py-3 px-4 text-right">EXEMPT PURCHASE (₹)</th>
                <th className="py-3 px-4 text-right">IGST (₹)</th>
                <th className="py-3 px-4 text-right">CGST (₹)</th>
                <th className="py-3 px-4 text-right">SGST (₹)</th>
                <th className="py-3 px-4 text-right">CESS (₹)</th>
                <th className="py-3 px-4 text-right font-bold text-amber-800">TOTAL TAX (₹)</th>
                <th className="py-3 px-4 text-right">OPENING ITC (₹)</th>
                <th className="py-3 px-4 text-right">CLOSING ITC (₹)</th>
                <th className="py-3 px-4 font-sans">REMARKS</th>
                <th className="py-3 px-4 text-center font-sans">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {itc.map((record) => {
                const isEditing = editingRowId === record.id;
                const calcTotalTax = (record.igst || 0) + (record.cgst || 0) + (record.sgst || 0) + (record.cess || 0);

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

                    {/* Exempt Purchase */}
                    <td className="py-2.5 px-4 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.exemptPurchase ?? ''}
                          onChange={(e) =>
                            setEditValues({ ...editValues, exemptPurchase: parseFloat(e.target.value) || 0 })
                          }
                          className="w-28 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none"
                        />
                      ) : (
                        <span className="text-slate-800">{formatIndianCurrency(record.exemptPurchase, 2)}</span>
                      )}
                    </td>

                    {/* IGST */}
                    <td className="py-2.5 px-4 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.igst ?? ''}
                          onChange={(e) =>
                            setEditValues({ ...editValues, igst: parseFloat(e.target.value) || 0 })
                          }
                          className="w-24 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none"
                        />
                      ) : (
                        <span className="text-slate-600">{formatIndianCurrency(record.igst, 0)}</span>
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
                            setEditValues({ ...editValues, cgst: parseFloat(e.target.value) || 0 })
                          }
                          className="w-24 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none"
                        />
                      ) : (
                        <span className="text-slate-800">{formatIndianCurrency(record.cgst, 0)}</span>
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
                            setEditValues({ ...editValues, sgst: parseFloat(e.target.value) || 0 })
                          }
                          className="w-24 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none"
                        />
                      ) : (
                        <span className="text-slate-800">{formatIndianCurrency(record.sgst, 0)}</span>
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
                            setEditValues({ ...editValues, cess: parseFloat(e.target.value) || 0 })
                          }
                          className="w-20 bg-white text-right px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none"
                        />
                      ) : (
                        formatIndianCurrency(record.cess, 0)
                      )}
                    </td>

                    {/* Total Tax */}
                    <td className="py-2.5 px-4 text-right font-bold text-amber-700">
                      {formatIndianCurrency(calcTotalTax, 0)}
                    </td>

                    {/* Opening ITC */}
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {formatIndianCurrency(record.openingItc, 0)}
                    </td>

                    {/* Closing ITC */}
                    <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                      {formatIndianCurrency(record.closingItc, 0)}
                    </td>

                    {/* Remarks */}
                    <td className="py-2.5 px-4 text-slate-500 font-sans max-w-[150px] truncate">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.remarks ?? ''}
                          onChange={(e) => setEditValues({ ...editValues, remarks: e.target.value })}
                          className="w-full bg-white px-2 py-1 rounded border border-blue-500 text-slate-900 outline-none"
                        />
                      ) : (
                        record.remarks || '-'
                      )}
                    </td>

                    {/* Action */}
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

            {/* Total Row (Matches TOTAL CL in reference master report) */}
            <tfoot>
              <tr className="bg-amber-300 text-slate-950 font-bold border-t-2 border-amber-400 text-xs whitespace-nowrap">
                <td className="py-3 px-4 font-sans uppercase">TOTAL CL</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totalExempt, 0)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totalIgst, 0)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totalCgst, 0)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totalSgst, 0)}</td>
                <td className="py-3 px-4 text-right">{formatIndianCurrency(totalCess, 0)}</td>
                <td className="py-3 px-4 text-right font-black">{formatIndianCurrency(totalTax, 0)}</td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Input Tax Credit Ledger (Head-Wise Opening & Closing as per Reference PDF) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-xl shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              INPUT TAX CREDIT (MAR {settings.financialYear.split('-')[1] || '2026'})
            </h3>
            <p className="text-xs text-slate-500">Head-wise Opening &amp; Closing Balances</p>
          </div>
          <button
            onClick={() => {
              if (isEditingBalances) {
                handleSaveBalances();
              } else {
                setBalanceValues([...itcBalances]);
                setIsEditingBalances(true);
              }
            }}
            className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg border border-blue-200 transition"
          >
            {isEditingBalances ? 'Save Balances' : 'Edit Balances'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px]">
                <th className="py-2.5 px-4 text-left font-sans">HEAD</th>
                <th className="py-2.5 px-4 text-right">OPENING (₹)</th>
                <th className="py-2.5 px-4 text-right">CLOSING (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itcBalances.map((bal, idx) => (
                <tr key={bal.head} className="hover:bg-blue-50/30">
                  <td className="py-2.5 px-4 font-sans font-bold text-slate-800">{bal.head}</td>
                  <td className="py-2.5 px-4 text-right text-slate-700">
                    {isEditingBalances ? (
                      <input
                        type="number"
                        value={balanceValues[idx]?.opening ?? 0}
                        onChange={(e) => {
                          const updated = [...balanceValues];
                          updated[idx].opening = parseFloat(e.target.value) || 0;
                          setBalanceValues(updated);
                        }}
                        className="w-24 bg-white text-right px-2 py-0.5 rounded border border-blue-500 text-slate-900"
                      />
                    ) : (
                      formatIndianCurrency(bal.opening, 0)
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                    {isEditingBalances ? (
                      <input
                        type="number"
                        value={balanceValues[idx]?.closing ?? 0}
                        onChange={(e) => {
                          const updated = [...balanceValues];
                          updated[idx].closing = parseFloat(e.target.value) || 0;
                          setBalanceValues(updated);
                        }}
                        className="w-24 bg-white text-right px-2 py-0.5 rounded border border-blue-500 text-slate-900"
                      />
                    ) : (
                      formatIndianCurrency(bal.closing, 0)
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-amber-300 text-slate-950 font-bold border-t-2 border-amber-400">
                <td className="py-2.5 px-4 font-sans">TOTAL</td>
                <td className="py-2.5 px-4 text-right">
                  {formatIndianCurrency(
                    itcBalances.reduce((acc, b) => acc + (b.opening || 0), 0),
                    0
                  )}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {formatIndianCurrency(
                    itcBalances.reduce((acc, b) => acc + (b.closing || 0), 0),
                    0
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
