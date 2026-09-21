import React, { useState } from 'react';
import { useGst } from '../context/GstContext';
import { ClientProfile } from '../types/gst';
import {
  FolderKanban,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Building2,
  Hash,
  Calendar,
  ArrowRightLeft,
  FileSpreadsheet,
  AlertCircle,
  X,
  FileText,
  User,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';

interface ClientManagerModuleProps {
  onClientSelected?: (clientId: string) => void;
  onOpenImportModal?: () => void;
}

export const ClientManagerModule: React.FC<ClientManagerModuleProps> = ({
  onClientSelected,
  onOpenImportModal,
}) => {
  const {
    clients,
    activeClientId,
    activeClient,
    switchClient,
    addClient,
    updateClient,
    deleteClient,
    purchases,
    sales,
    itc,
  } = useGst();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);

  // New client form state
  const [formFileNo, setFormFileNo] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formTradeName, setFormTradeName] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formFinancialYear, setFormFinancialYear] = useState('2025-2026');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCloneMaster, setFormCloneMaster] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const handleOpenAddModal = () => {
    // Propose an incremental file number
    const highestFileNo = clients.reduce((max, c) => {
      const num = parseInt(c.fileNo, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 123);
    setFormFileNo(String(highestFileNo + 1));
    setFormCompanyName('');
    setFormTradeName('');
    setFormGstin('');
    setFormFinancialYear(activeClient.financialYear || '2025-2026');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
    setFormCloneMaster(false);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSaveNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanFileNo = formFileNo.trim();
    const cleanCompanyName = formCompanyName.trim();
    const cleanGstin = formGstin.trim().toUpperCase();

    if (!cleanFileNo) {
      setFormError('File Number is required.');
      return;
    }
    if (!cleanCompanyName) {
      setFormError('Company / Firm Name is required.');
      return;
    }

    // Check duplicate file number
    const fileExists = clients.some(
      (c) => c.fileNo.toLowerCase() === cleanFileNo.toLowerCase()
    );
    if (fileExists) {
      setFormError(`File Number "${cleanFileNo}" already exists! Please use a unique File No.`);
      return;
    }

    const newId = addClient(
      {
        fileNo: cleanFileNo,
        companyName: cleanCompanyName,
        tradeName: formTradeName.trim() || undefined,
        gstin: cleanGstin || '20AAAAA0000A1Z5',
        financialYear: formFinancialYear,
        contactPerson: formContactPerson.trim() || undefined,
        phoneNumber: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        notes: formNotes.trim() || undefined,
      },
      {
        copyMasterData: formCloneMaster,
        switchToNew: true,
      }
    );

    setIsAddModalOpen(false);
    showNotification(`Client "${cleanCompanyName}" (File #${cleanFileNo}) created and selected!`);
    if (onClientSelected) {
      onClientSelected(newId);
    }
  };

  const handleOpenEditModal = (client: ClientProfile) => {
    setEditingClient(client);
    setFormFileNo(client.fileNo);
    setFormCompanyName(client.companyName);
    setFormTradeName(client.tradeName || '');
    setFormGstin(client.gstin);
    setFormFinancialYear(client.financialYear);
    setFormContactPerson(client.contactPerson || '');
    setFormPhone(client.phoneNumber || '');
    setFormEmail(client.email || '');
    setFormNotes(client.notes || '');
    setFormError('');
  };

  const handleSaveEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setFormError('');

    const cleanFileNo = formFileNo.trim();
    const cleanCompanyName = formCompanyName.trim();
    const cleanGstin = formGstin.trim().toUpperCase();

    if (!cleanFileNo) {
      setFormError('File Number is required.');
      return;
    }
    if (!cleanCompanyName) {
      setFormError('Company / Firm Name is required.');
      return;
    }

    // Check duplicate file number for other clients
    const fileExists = clients.some(
      (c) => c.id !== editingClient.id && c.fileNo.toLowerCase() === cleanFileNo.toLowerCase()
    );
    if (fileExists) {
      setFormError(`File Number "${cleanFileNo}" is already assigned to another client.`);
      return;
    }

    updateClient(editingClient.id, {
      fileNo: cleanFileNo,
      companyName: cleanCompanyName,
      tradeName: formTradeName.trim() || undefined,
      gstin: cleanGstin,
      financialYear: formFinancialYear,
      contactPerson: formContactPerson.trim() || undefined,
      phoneNumber: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      notes: formNotes.trim() || undefined,
    });

    setEditingClient(null);
    showNotification(`Client "${cleanCompanyName}" (File #${cleanFileNo}) updated successfully!`);
  };

  const handleDeleteClient = (client: ClientProfile) => {
    if (clients.length <= 1) {
      alert('Cannot delete the only remaining client. At least one client dossier is required.');
      return;
    }

    const confirmMsg = `Are you sure you want to delete client:\n\nFile No: ${client.fileNo}\nCompany: ${client.companyName}\nGSTIN: ${client.gstin}\n\nThis will permanently delete this client file and all its associated Purchase, Sales, and ITC records from this browser.`;
    if (window.confirm(confirmMsg)) {
      deleteClient(client.id);
      showNotification(`Client "${client.companyName}" (File #${client.fileNo}) deleted.`);
    }
  };

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.fileNo.toLowerCase().includes(q) ||
      c.companyName.toLowerCase().includes(q) ||
      c.gstin.toLowerCase().includes(q) ||
      (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-700 text-white text-xs px-4 py-3 rounded-lg shadow-lg border border-emerald-600 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 border border-blue-200">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>CLIENT DOSSIER & FILE NO MANAGER</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono font-semibold">
                  {clients.length} Registered {clients.length === 1 ? 'Client' : 'Clients'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage multiple clients with dedicated File Numbers, unique GSTINs, and completely partitioned Purchase, Sales, and ITC datasets.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client (File No)</span>
        </button>
      </div>

      {/* Currently Active Client Highlight */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-xl p-5 text-white shadow-sm border border-blue-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>CURRENTLY ACTIVE WORKING CLIENT DOSSIER</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {activeClient.companyName}
              </h2>
              <span className="bg-amber-400 text-blue-950 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md shadow-xs">
                FILE NO: #{activeClient.fileNo}
              </span>
              <span className="bg-blue-950/80 text-blue-200 text-xs font-mono px-2 py-0.5 rounded border border-blue-700">
                GSTIN: {activeClient.gstin}
              </span>
              <span className="bg-blue-950/80 text-blue-200 text-xs font-mono px-2 py-0.5 rounded border border-blue-700">
                FY: {activeClient.financialYear}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-blue-950/60 p-3 rounded-lg border border-blue-800/80 text-xs">
            <div className="text-center px-3 border-r border-blue-800/80">
              <div className="text-[11px] text-blue-300">Purchases</div>
              <div className="text-sm font-bold text-white font-mono">{purchases.length} bills</div>
            </div>
            <div className="text-center px-3 border-r border-blue-800/80">
              <div className="text-[11px] text-blue-300">Sales Rows</div>
              <div className="text-sm font-bold text-white font-mono">{sales.length} mo</div>
            </div>
            <div className="text-center px-3">
              <div className="text-[11px] text-blue-300">ITC Records</div>
              <div className="text-sm font-bold text-white font-mono">{itc.length} mo</div>
            </div>
            {onOpenImportModal && (
              <button
                onClick={onOpenImportModal}
                className="ml-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
              >
                Import Data
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by File No, Firm Name, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 text-slate-900 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredClients.length} of {clients.length} dossiers
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const isActive = client.id === activeClientId;
          return (
            <div
              key={client.id}
              className={`bg-white rounded-xl border p-5 transition flex flex-col justify-between shadow-xs ${
                isActive
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div>
                {/* Header with File No and Active status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-md shadow-xs">
                      FILE #{client.fileNo}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      FY {client.financialYear}
                    </span>
                  </div>

                  {isActive ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      ACTIVE
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        switchClient(client.id);
                        showNotification(`Switched to File #${client.fileNo} (${client.companyName})`);
                        if (onClientSelected) onClientSelected(client.id);
                      }}
                      className="text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200 font-semibold transition flex items-center gap-1"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Select</span>
                    </button>
                  )}
                </div>

                {/* Company Name */}
                <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1 line-clamp-1" title={client.companyName}>
                  {client.companyName}
                </h3>

                {client.tradeName && (
                  <p className="text-xs text-slate-500 italic mb-2 line-clamp-1">
                    Trade: {client.tradeName}
                  </p>
                )}

                {/* GSTIN */}
                <div className="text-xs font-mono text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">GSTIN:</span>
                    <span className="font-semibold text-blue-900">{client.gstin}</span>
                  </div>
                  {client.contactPerson && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Contact:</span>
                      <span className="text-slate-700">{client.contactPerson}</span>
                    </div>
                  )}
                  {client.phoneNumber && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Phone:</span>
                      <span className="text-slate-700">{client.phoneNumber}</span>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 italic bg-amber-50/50 p-1.5 rounded border border-amber-200/50">
                    {client.notes}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(client)}
                    className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-md transition"
                    title="Edit Client Info"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {clients.length > 1 && (
                    <button
                      onClick={() => handleDeleteClient(client)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                      title="Delete Client File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {!isActive && (
                  <button
                    onClick={() => {
                      switchClient(client.id);
                      showNotification(`Switched to File #${client.fileNo} (${client.companyName})`);
                      if (onClientSelected) onClientSelected(client.id);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded shadow-xs transition"
                  >
                    Open Dossier
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-blue-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-sm">ADD NEW CLIENT DOSSIER</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-blue-200 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewClient} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    File No / Dossier No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 124 or FL-002"
                    value={formFileNo}
                    onChange={(e) => setFormFileNo(e.target.value)}
                    className="w-full bg-slate-50 font-mono font-bold text-blue-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Permanent File Reference code
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Financial Year *
                  </label>
                  <select
                    value={formFinancialYear}
                    onChange={(e) => setFormFinancialYear(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none cursor-pointer"
                  >
                    <option value="2024-2025">2024-2025</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Company / Firm Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SHARMA TRADERS & ENTERPRISES"
                  value={formCompanyName}
                  onChange={(e) => setFormCompanyName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 font-semibold px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Client GSTIN (15-digits)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 20AUEPG3207H1ZD"
                    value={formGstin}
                    onChange={(e) => setFormGstin(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 font-mono text-slate-900 uppercase px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trade / Branch Name
                  </label>
                  <input
                    type="text"
                    placeholder="Optional Trade Name"
                    value={formTradeName}
                    onChange={(e) => setFormTradeName(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="accounts@clientdomain.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              {/* Data Initialization choice */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                <span className="block font-bold text-blue-900 mb-1">
                  Initial Data Strategy:
                </span>
                <label className="flex items-start gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={formCloneMaster}
                    onChange={(e) => setFormCloneMaster(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-blue-900">
                    <strong>Clone sample data from master reference</strong> (Goswami Manihari Store dataset). If unchecked, this client starts with fresh blank tables ready for importing your new Excel files.
                  </span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-xs transition"
                >
                  Save &amp; Switch to Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-blue-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-sm">EDIT CLIENT DOSSIER</h3>
              </div>
              <button
                onClick={() => setEditingClient(null)}
                className="text-blue-200 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditClient} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    File No / Dossier No *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFileNo}
                    onChange={(e) => setFormFileNo(e.target.value)}
                    className="w-full bg-slate-50 font-mono font-bold text-blue-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Financial Year *
                  </label>
                  <select
                    value={formFinancialYear}
                    onChange={(e) => setFormFinancialYear(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none cursor-pointer"
                  >
                    <option value="2024-2025">2024-2025</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Company / Firm Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={formCompanyName}
                  onChange={(e) => setFormCompanyName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 font-semibold px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Client GSTIN
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formGstin}
                    onChange={(e) => setFormGstin(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 font-mono text-slate-900 uppercase px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trade / Branch Name
                  </label>
                  <input
                    type="text"
                    value={formTradeName}
                    onChange={(e) => setFormTradeName(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional internal remarks about this client..."
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-xs transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
