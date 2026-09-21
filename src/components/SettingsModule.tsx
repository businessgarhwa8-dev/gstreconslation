import React, { useState, useEffect } from 'react';
import { useGst } from '../context/GstContext';
import {
  Settings,
  Building2,
  Sliders,
  Database,
  RefreshCw,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { DEFAULT_SETTINGS } from '../data/initialMasterData';

export const SettingsModule: React.FC = () => {
  const {
    settings,
    updateSettings,
    role,
    resetToMasterData,
    purchases,
    sales,
    itc,
  } = useGst();

  const [localSettings, setLocalSettings] = useState(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(localSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleBackupJson = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      settings,
      purchases,
      sales,
      itc,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GST_Portal_Full_Backup_${settings.companyName.replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl font-sans text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span>ADMIN CONFIGURATION & MASTER SETTINGS</span>
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              ROLE: {role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure company legal entity parameters, tolerances, report titling, and manage secure backups.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identification Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Company & Taxpayer Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Company / Firm Legal Name *
              </label>
              <input
                type="text"
                required
                value={localSettings.companyName}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, companyName: e.target.value })
                }
                className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-600 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Taxpayer GSTIN (15 Alpha-Numeric) *
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={localSettings.gstin}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    gstin: e.target.value.toUpperCase(),
                  })
                }
                className="w-full bg-slate-50 font-mono text-blue-800 uppercase px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-600 focus:bg-white outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Active Financial Year *
              </label>
              <select
                value={localSettings.financialYear}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, financialYear: e.target.value })
                }
                className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 outline-none"
              >
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Master File Reference / Dossier No
              </label>
              <input
                type="text"
                value={localSettings.fileNo}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, fileNo: e.target.value })
                }
                className="w-full bg-slate-50 font-mono text-slate-900 px-3 py-2 rounded-lg border border-slate-300 outline-none"
                placeholder="123"
              />
            </div>
          </div>
        </div>

        {/* Reconciliation Tolerance Rules */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Reconciliation &amp; Tolerance Rules</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Invoice Matching Tolerance (±₹)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={localSettings.invoiceMatchingTolerance}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    invoiceMatchingTolerance: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-50 font-mono text-slate-900 px-3 py-2 rounded-lg border border-slate-300 outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Permitted variance for rounding before tagging as Difference.
              </span>
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Tax Difference Threshold (₹)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={localSettings.taxDifferenceTolerance}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    taxDifferenceTolerance: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-50 font-mono text-slate-900 px-3 py-2 rounded-lg border border-slate-300 outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Flag tax variance exceeding this threshold.
              </span>
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Decimal Precision
              </label>
              <select
                value={localSettings.decimalPrecision}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    decimalPrecision: parseInt(e.target.value, 10),
                  })
                }
                className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-lg border border-slate-300 outline-none"
              >
                <option value="0">0 (Integer)</option>
                <option value="2">2 Decimals (Standard ₹0.00)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* Danger & Maintenance Area */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <Database className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Data Management &amp; Backup</h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-slate-800">Create Full Offline JSON Backup</div>
            <div className="text-[11px] text-slate-500">
              Download your full database containing all invoices, returns, and configuration.
            </div>
          </div>
          <button
            onClick={handleBackupJson}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition"
          >
            Download JSON Backup
          </button>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-rose-700">Reset to Reference Master Data</div>
            <div className="text-[11px] text-slate-500">
              Restores the default reference data (GOSWAMI MANIHARI STORE, 20AUEPG3207H1ZD, FY 2025-26).
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Are you sure? This will restore the reference master state.')) {
                resetToMasterData();
                setLocalSettings(DEFAULT_SETTINGS);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Master State</span>
          </button>
        </div>
      </div>
    </div>
  );
};
