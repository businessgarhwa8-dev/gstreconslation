import React, { useState, useMemo } from 'react';
import { useGst } from '../context/GstContext';
import { PurchaseRecord, MatchingStatus } from '../types/gst';
import { formatIndianCurrency, FY_MONTH_FULL } from '../utils/formatters';
import { exportRecordsToExcel } from '../utils/excelParser';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit2,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  X,
} from 'lucide-react';

interface PurchaseModuleProps {
  onOpenImportModal: () => void;
}

export const PurchaseModule: React.FC<PurchaseModuleProps> = ({ onOpenImportModal }) => {
  const {
    purchases,
    addPurchaseRecord,
    updatePurchaseRecord,
    deletePurchaseRecord,
    role,
    settings,
  } = useGst();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedGstin, setSelectedGstin] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedRate, setSelectedRate] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<PurchaseRecord>>({
    status: 'MATCHED',
    party: '',
    gstin: '',
    period: 'Apr-25',
    invoiceNo: '',
    pos: '20-Jharkhand',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceValue: 0,
    taxableValue: 0,
    rate: 18,
    tax: 0,
    igst: 0,
    cgst: 0,
    sgst: 0,
    cess: 0,
    cfs: 'Y',
    rc: 'N',
    remark: '',
  });

  // Calculate taxes automatically in form
  const handleTaxableOrRateChange = (taxable: number, rate: number, isInterstate: boolean) => {
    const totalTax = (taxable * rate) / 100;
    const invVal = taxable + totalTax;

    if (isInterstate) {
      setFormData((prev) => ({
        ...prev,
        taxableValue: taxable,
        rate,
        tax: totalTax,
        igst: totalTax,
        cgst: 0,
        sgst: 0,
        invoiceValue: invVal,
      }));
    } else {
      const halfTax = totalTax / 2;
      setFormData((prev) => ({
        ...prev,
        taxableValue: taxable,
        rate,
        tax: totalTax,
        igst: 0,
        cgst: halfTax,
        sgst: halfTax,
        invoiceValue: invVal,
      }));
    }
  };

  // Distinct GSTIN list for dropdown
  const distinctGstins = useMemo(() => {
    const set = new Set<string>();
    purchases.forEach((p) => {
      if (p.gstin) set.add(p.gstin);
    });
    return Array.from(set);
  }, [purchases]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchParty = (p.party || '').toLowerCase().includes(q);
        const matchGstin = (p.gstin || '').toLowerCase().includes(q);
        const matchInv = (p.invoiceNo || '').toLowerCase().includes(q);
        if (!matchParty && !matchGstin && !matchInv) return false;
      }

      // Month filter
      if (selectedMonth !== 'All') {
        const pPeriod = (p.period || '').toLowerCase();
        const mShort = selectedMonth.substring(0, 3).toLowerCase();
        if (!pPeriod.includes(mShort)) return false;
      }

      // GSTIN filter
      if (selectedGstin !== 'All') {
        if (p.gstin !== selectedGstin) return false;
      }

      // Status filter
      if (selectedStatus !== 'All') {
        if (p.status !== selectedStatus) return false;
      }

      // Rate filter
      if (selectedRate !== 'All') {
        if (Math.round(p.rate || 0) !== parseInt(selectedRate, 10)) return false;
      }

      return true;
    });
  }, [purchases, searchTerm, selectedMonth, selectedGstin, selectedStatus, selectedRate]);

  // Pagination slice
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage) || 1;
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPurchases.slice(start, start + itemsPerPage);
  }, [filteredPurchases, currentPage]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      status: 'MATCHED',
      party: '',
      gstin: '',
      period: 'Apr-25',
      invoiceNo: '',
      pos: '20-Jharkhand',
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceValue: 0,
      taxableValue: 0,
      rate: 18,
      tax: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0,
      cfs: 'Y',
      rc: 'N',
      remark: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: PurchaseRecord) => {
    setEditingId(rec.id);
    setFormData(rec);
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gstin || !formData.invoiceNo) {
      alert('GSTIN and Invoice No are required.');
      return;
    }

    if (editingId) {
      updatePurchaseRecord(editingId, formData);
    } else {
      addPurchaseRecord(formData as any);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, invNo: string) => {
    if (role !== 'ADMIN') {
      alert('Staff users cannot delete master purchase records. Please contact Admin.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete invoice #${invNo}? Accidental deletion prevention is active.`)) {
      deletePurchaseRecord(id);
    }
  };

  // Totals for filtered list
  const totalFilteredTaxable = filteredPurchases.reduce((acc, p) => acc + (p.taxableValue || 0), 0);
  const totalFilteredTax = filteredPurchases.reduce((acc, p) => acc + (p.tax || 0), 0);
  const totalFilteredValue = filteredPurchases.reduce((acc, p) => acc + (p.invoiceValue || 0), 0);

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Module Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              PURCHASE EXCEL – FIXED MASTER FORMAT
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              19 PERMANENT COLUMNS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain and append inward supply invoices. All existing records and column formats are strictly preserved.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload / Append Excel</span>
          </button>
          <button
            onClick={() => exportRecordsToExcel('PURCHASE', filteredPurchases, `Purchase_Records_FY_${settings.financialYear}.xlsx`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Fixed Excel</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Purchase Record</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Party, GSTIN, Invoice No..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 text-slate-900 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:bg-white outline-none text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer text-xs"
          >
            <option value="All">All Months</option>
            {FY_MONTH_FULL.map((m) => (
              <option key={`pm-month-${m}`} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* GSTIN Filter */}
          <select
            value={selectedGstin}
            onChange={(e) => {
              setSelectedGstin(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer max-w-[160px] truncate text-xs"
          >
            <option value="All">All GSTINs ({distinctGstins.length})</option>
            {distinctGstins.map((g, idx) => (
              <option key={`pm-gstin-${g}-${idx}`} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer text-xs"
          >
            <option value="All">All Statuses</option>
            <option value="MATCHED">MATCHED</option>
            <option value="PARTIALLY MATCHED">PARTIALLY MATCHED</option>
            <option value="NOT MATCHED">NOT MATCHED</option>
            <option value="TAX DIFFERENCE">TAX DIFFERENCE</option>
            <option value="VALUE DIFFERENCE">VALUE DIFFERENCE</option>
            <option value="MISSING IN GSTR DATA">MISSING IN GSTR</option>
            <option value="DUPLICATE">DUPLICATE</option>
          </select>

          {/* Tax Rate Filter */}
          <select
            value={selectedRate}
            onChange={(e) => {
              setSelectedRate(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer text-xs"
          >
            <option value="All">All Rates</option>
            <option value="0">0%</option>
            <option value="3">3%</option>
            <option value="5">5%</option>
            <option value="12">12%</option>
            <option value="18">18%</option>
            <option value="28">28%</option>
          </select>

          {(searchTerm || selectedMonth !== 'All' || selectedGstin !== 'All' || selectedStatus !== 'All' || selectedRate !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedMonth('All');
                setSelectedGstin('All');
                setSelectedStatus('All');
                setSelectedRate('All');
                setCurrentPage(1);
              }}
              className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table in Fixed Format */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap">
                <th className="py-2.5 px-3 text-center">Sr</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Party Name</th>
                <th className="py-2.5 px-3 font-mono">GSTIN</th>
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3 font-mono">Invoice No</th>
                <th className="py-2.5 px-3">POS</th>
                <th className="py-2.5 px-3">Invoice Date</th>
                <th className="py-2.5 px-3 text-right">Taxable Value</th>
                <th className="py-2.5 px-3 text-center">Rate</th>
                <th className="py-2.5 px-3 text-right">IGST</th>
                <th className="py-2.5 px-3 text-right">CGST</th>
                <th className="py-2.5 px-3 text-right">SGST</th>
                <th className="py-2.5 px-3 text-right">Total Tax</th>
                <th className="py-2.5 px-3 text-right">Invoice Value</th>
                <th className="py-2.5 px-3 text-center">CFS</th>
                <th className="py-2.5 px-3 text-center">RC</th>
                <th className="py-2.5 px-3">Remark</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-8 text-center text-slate-400 font-sans">
                    No purchase records found matching your filters.
                  </td>
                </tr>
              ) : (
                currentRecords.map((p) => {
                  const isMatched = p.status === 'MATCHED';
                  const isDiff = p.status === 'TAX DIFFERENCE' || p.status === 'VALUE DIFFERENCE';
                  const isMissing = p.status.includes('MISSING');

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-blue-50/40 transition whitespace-nowrap ${
                        isMatched ? 'hover:bg-emerald-50/40' : isDiff ? 'bg-amber-50/40' : isMissing ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-500">{p.sr}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${
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
                      <td className="py-2 px-3 font-sans font-medium text-slate-900 max-w-[180px] truncate" title={p.party}>
                        {p.party}
                      </td>
                      <td className="py-2 px-3 text-blue-700 font-semibold">{p.gstin}</td>
                      <td className="py-2 px-3 text-slate-700 font-sans">{p.period}</td>
                      <td className="py-2 px-3 text-slate-900 font-semibold">{p.invoiceNo}</td>
                      <td className="py-2 px-3 text-slate-500 font-sans">{p.pos}</td>
                      <td className="py-2 px-3 text-slate-600">{p.invoiceDate}</td>
                      <td className="py-2 px-3 text-right text-slate-800">
                        {formatIndianCurrency(p.taxableValue, 2)}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-700">{p.rate}%</td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {formatIndianCurrency(p.igst, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-800">
                        {formatIndianCurrency(p.cgst, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-800">
                        {formatIndianCurrency(p.sgst, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-900 font-semibold">
                        {formatIndianCurrency(p.tax, 2)}
                      </td>
                      <td className="py-2 px-3 text-right text-blue-700 font-bold">
                        {formatIndianCurrency(p.invoiceValue, 2)}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500">{p.cfs}</td>
                      <td className="py-2 px-3 text-center text-slate-500">{p.rc}</td>
                      <td className="py-2 px-3 text-slate-500 font-sans max-w-[150px] truncate" title={p.remark}>
                        {p.remark || '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-sans">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.invoiceNo)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                            title="Delete Record (Admin Only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Row */}
            {filteredPurchases.length > 0 && (
              <tfoot>
                <tr className="bg-amber-300 text-slate-950 font-bold border-t-2 border-amber-400 font-mono text-xs whitespace-nowrap">
                  <td colSpan={8} className="py-2.5 px-3 font-sans uppercase">
                    FILTERED TOTAL ({filteredPurchases.length} INVOICES)
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatIndianCurrency(totalFilteredTaxable, 2)}
                  </td>
                  <td></td>
                  <td colSpan={3}></td>
                  <td className="py-2.5 px-3 text-right">
                    {formatIndianCurrency(totalFilteredTax, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black">
                    {formatIndianCurrency(totalFilteredValue, 2)}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination controls */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredPurchases.length)} of{' '}
            {filteredPurchases.length} records
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded border border-slate-300 text-slate-700 transition"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-mono text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 rounded border border-slate-300 text-slate-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Purchase Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingId ? 'Edit Purchase Record' : 'Add New Purchase Record'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Party / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.party || ''}
                    onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:bg-white outline-none"
                    placeholder="e.g. HINDUSTAN UNILEVER LIMITED"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Supplier GSTIN (15 Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={formData.gstin || ''}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 font-mono text-blue-800 px-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:bg-white outline-none uppercase font-semibold"
                    placeholder="20AAACH1288H1ZT"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.invoiceNo || ''}
                    onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    className="w-full bg-slate-50 font-mono text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:bg-white outline-none font-semibold"
                    placeholder="INV-2025-01"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.invoiceDate || ''}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Return Period</label>
                  <select
                    value={formData.period || 'Apr-25'}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 outline-none"
                  >
                    {FY_MONTH_FULL.map((m) => (
                      <option key={`modal-period-${m}`} value={`${m.substring(0, 3)}-25`}>
                        {m} ({m.substring(0, 3)}-25)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Place of Supply (POS)</label>
                  <input
                    type="text"
                    value={formData.pos || '20-Jharkhand'}
                    onChange={(e) => setFormData({ ...formData, pos: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 outline-none"
                    placeholder="20-Jharkhand"
                  />
                </div>
              </div>

              {/* Tax Calculations */}
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-3">
                <div className="font-semibold text-blue-950">Values &amp; Tax Computation</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Taxable Value (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.taxableValue || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleTaxableOrRateChange(val, formData.rate || 18, (formData.igst || 0) > 0);
                      }}
                      className="w-full bg-white font-mono text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Tax Rate (%)</label>
                    <select
                      value={formData.rate || 18}
                      onChange={(e) => {
                        const r = parseFloat(e.target.value) || 0;
                        handleTaxableOrRateChange(formData.taxableValue || 0, r, (formData.igst || 0) > 0);
                      }}
                      className="w-full bg-white font-mono text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-blue-600"
                    >
                      <option value="0">0%</option>
                      <option value="3">3%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Supply Type</label>
                    <select
                      value={(formData.igst || 0) > 0 ? 'INTER' : 'INTRA'}
                      onChange={(e) => {
                        handleTaxableOrRateChange(
                          formData.taxableValue || 0,
                          formData.rate || 18,
                          e.target.value === 'INTER'
                        );
                      }}
                      className="w-full bg-white text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 outline-none focus:border-blue-600"
                    >
                      <option value="INTRA">Intrastate (CGST + SGST)</option>
                      <option value="INTER">Interstate (IGST)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono">
                  <div>
                    <label className="block text-slate-600 mb-1 font-sans">IGST (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.igst || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          igst: val,
                          tax: val + (formData.cgst || 0) + (formData.sgst || 0) + (formData.cess || 0),
                          invoiceValue: (formData.taxableValue || 0) + val + (formData.cgst || 0) + (formData.sgst || 0),
                        });
                      }}
                      className="w-full bg-white text-slate-900 px-2 py-1 rounded border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-sans">CGST (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cgst || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          cgst: val,
                          tax: (formData.igst || 0) + val + (formData.sgst || 0) + (formData.cess || 0),
                          invoiceValue: (formData.taxableValue || 0) + (formData.igst || 0) + val + (formData.sgst || 0),
                        });
                      }}
                      className="w-full bg-white text-slate-900 px-2 py-1 rounded border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-sans">SGST (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sgst || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          sgst: val,
                          tax: (formData.igst || 0) + (formData.cgst || 0) + val + (formData.cess || 0),
                          invoiceValue: (formData.taxableValue || 0) + (formData.igst || 0) + (formData.cgst || 0) + val,
                        });
                      }}
                      className="w-full bg-white text-slate-900 px-2 py-1 rounded border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-blue-900 font-semibold mb-1 font-sans">Total Inv Value (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.invoiceValue || 0}
                      onChange={(e) => setFormData({ ...formData, invoiceValue: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white text-blue-700 font-bold px-2 py-1 rounded border border-blue-300"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Matching Status</label>
                  <select
                    value={formData.status || 'MATCHED'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as MatchingStatus })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 outline-none"
                  >
                    <option value="MATCHED">MATCHED</option>
                    <option value="PARTIALLY MATCHED">PARTIALLY MATCHED</option>
                    <option value="NOT MATCHED">NOT MATCHED</option>
                    <option value="TAX DIFFERENCE">TAX DIFFERENCE</option>
                    <option value="VALUE DIFFERENCE">VALUE DIFFERENCE</option>
                    <option value="MISSING IN GSTR DATA">MISSING IN GSTR DATA</option>
                    <option value="PENDING VERIFICATION">PENDING VERIFICATION</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">CFS (Filing Status)</label>
                  <select
                    value={formData.cfs || 'Y'}
                    onChange={(e) => setFormData({ ...formData, cfs: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 outline-none"
                  >
                    <option value="Y">Y - Filed</option>
                    <option value="N">N - Not Filed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reverse Charge (RC)</label>
                  <select
                    value={formData.rc || 'N'}
                    onChange={(e) => setFormData({ ...formData, rc: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 outline-none"
                  >
                    <option value="N">N - No</option>
                    <option value="Y">Y - Yes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Remark / Notes</label>
                <input
                  type="text"
                  value={formData.remark || ''}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 outline-none"
                  placeholder="e.g. Regular monthly purchase invoice"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs"
                >
                  {editingId ? 'Save Changes' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
