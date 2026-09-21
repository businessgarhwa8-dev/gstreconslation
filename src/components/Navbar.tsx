import React from 'react';
import { useGst } from '../context/GstContext';
import { ShieldCheck, UserCheck, AlertTriangle, FileText, Building2, Calendar, RefreshCw } from 'lucide-react';
import { FY_MONTH_FULL } from '../utils/formatters';

interface NavbarProps {
  onOpenValidation: () => void;
  onOpenPdfModal: () => void;
  onOpenClientsModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenValidation,
  onOpenPdfModal,
  onOpenClientsModal,
}) => {
  const {
    role,
    setRole,
    settings,
    updateSettings,
    validationIssues,
    selectedMonthFilter,
    setSelectedMonthFilter,
    resetToMasterData,
    clients,
    activeClientId,
    activeClient,
    switchClient,
  } = useGst();

  const errorCount = validationIssues.filter((i) => i.type === 'ERROR').length;
  const warningCount = validationIssues.filter((i) => i.type === 'WARNING').length;

  return (
    <header className="bg-blue-900 text-white border-b border-blue-950 sticky top-0 z-30 px-4 py-2.5 shadow-sm">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Company & GSTIN Info with Multi-Client Switcher */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={onOpenClientsModal}
            className="flex items-center gap-2.5 text-left bg-blue-950/70 hover:bg-blue-950 px-3 py-1.5 rounded-lg border border-blue-700/80 transition group"
            title="Click to manage all client dossiers"
          >
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs border border-blue-400/30 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="max-w-[180px] sm:max-w-[260px] truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white truncate group-hover:text-blue-200">
                  {activeClient.companyName || 'COMPANY NAME'}
                </span>
                <span className="bg-amber-400 text-blue-950 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                  #{activeClient.fileNo || '123'}
                </span>
              </div>
              <div className="text-[11px] text-blue-300 font-mono flex items-center gap-1 truncate">
                <span>GSTIN:</span>
                <span className="text-amber-200">{activeClient.gstin || 'NOT SET'}</span>
              </div>
            </div>
          </button>

          {/* Quick Client Switcher Dropdown */}
          <div className="hidden sm:flex items-center">
            <select
              value={activeClientId}
              onChange={(e) => {
                if (e.target.value === '__add_new__') {
                  if (onOpenClientsModal) onOpenClientsModal();
                } else {
                  switchClient(e.target.value);
                }
              }}
              className="bg-blue-950 text-white text-xs font-semibold rounded-lg px-2.5 py-2 outline-none border border-blue-700 cursor-pointer max-w-[160px] hover:border-blue-500 transition"
              title="Select Client File Number"
            >
              {clients.map((c) => (
                <option key={`nav-client-${c.id}`} value={c.id}>
                  #{c.fileNo} - {c.companyName.slice(0, 16)}
                </option>
              ))}
              <option value="__add_new__">+ Add New Client...</option>
            </select>
          </div>
        </div>

        {/* Financial Year & Month Controls */}
        <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto justify-start lg:justify-center">
          <div className="flex items-center bg-blue-950/80 rounded-lg p-1 border border-blue-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-300 ml-1.5 mr-1" />
            <span className="text-blue-300 mr-1.5 font-medium">FY:</span>
            <select
              value={settings.financialYear}
              onChange={(e) => updateSettings({ financialYear: e.target.value })}
              className="bg-blue-900 text-white text-xs font-semibold rounded px-2 py-1 outline-none border border-blue-700 cursor-pointer"
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>

          <div className="flex items-center bg-blue-950/80 rounded-lg p-1 border border-blue-800 text-xs">
            <span className="text-blue-300 ml-1.5 mr-1 font-medium">Month:</span>
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="bg-blue-900 text-white text-xs font-semibold rounded px-2 py-1 outline-none border border-blue-700 cursor-pointer"
            >
              <option value="All">All Months (FY)</option>
              {FY_MONTH_FULL.map((m) => (
                <option key={`nav-month-${m}`} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions & Role Switcher */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {/* Validation Button */}
          <button
            onClick={onOpenValidation}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
              errorCount > 0
                ? 'bg-rose-900/90 border-rose-600 text-rose-100 hover:bg-rose-800'
                : warningCount > 0
                ? 'bg-amber-900/90 border-amber-600 text-amber-100 hover:bg-amber-800'
                : 'bg-blue-800/90 border-blue-700 text-blue-100 hover:bg-blue-700'
            }`}
            title="Inspect Data Validation"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Validation</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-bold">
                {errorCount + warningCount}
              </span>
            )}
          </button>

          {/* Master PDF Report */}
          <button
            onClick={onOpenPdfModal}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-semibold shadow-xs transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Master PDF Report</span>
          </button>

          {/* Role Toggle */}
          <div className="flex items-center bg-blue-950/80 border border-blue-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setRole('ADMIN')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                role === 'ADMIN'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => setRole('STAFF')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                role === 'STAFF'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Staff</span>
            </button>
          </div>

          {/* Master Data Reset (Admin only) */}
          {role === 'ADMIN' && (
            <button
              onClick={() => {
                if (window.confirm('Reset all data back to the Reference PDF master figures?')) {
                  resetToMasterData();
                }
              }}
              title="Reset to Master Reference Data"
              className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
