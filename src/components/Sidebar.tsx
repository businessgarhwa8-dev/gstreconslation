import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  GitCompare,
  CalendarDays,
  Users,
  Percent,
  FileSpreadsheet,
  FileText,
  Settings,
  Shield,
  User,
  FolderKanban,
} from 'lucide-react';
import { useGst } from '../context/GstContext';

export type TabType =
  | 'dashboard'
  | 'clients'
  | 'purchase'
  | 'sales'
  | 'itc'
  | 'reconciliation'
  | 'monthly-analysis'
  | 'gstin-analysis'
  | 'tax-rate-analysis'
  | 'pdf-generator'
  | 'excel-import'
  | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { role, purchases, clients, activeClient } = useGst();

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'clients' as TabType,
      label: 'Client Files (Multi-Client)',
      icon: FolderKanban,
      badge: clients.length,
    },
    {
      id: 'purchase' as TabType,
      label: 'Purchase (Fixed Format)',
      icon: ShoppingCart,
      badge: purchases.length,
    },
    { id: 'sales' as TabType, label: 'Sales (Fixed Format)', icon: TrendingUp },
    { id: 'itc' as TabType, label: 'ITC (Fixed Format)', icon: CreditCard },
    { id: 'reconciliation' as TabType, label: 'GST Reconciliation', icon: GitCompare },
    { id: 'monthly-analysis' as TabType, label: 'Monthly Analysis', icon: CalendarDays },
    { id: 'gstin-analysis' as TabType, label: 'GSTIN Analysis', icon: Users },
    { id: 'tax-rate-analysis' as TabType, label: 'Tax Rate Analysis', icon: Percent },
    { id: 'pdf-generator' as TabType, label: 'Master PDF Report', icon: FileText, highlight: true },
    { id: 'excel-import' as TabType, label: 'Excel Import / Append', icon: FileSpreadsheet },
    { id: 'settings' as TabType, label: 'Admin Settings', icon: Settings, adminOnly: true },
  ];

  const handleSelect = (id: TabType) => {
    setActiveTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 h-full lg:h-[calc(100vh-61px)] w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-200 shadow-xs ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* App Title inside sidebar for mobile */}
        <div className="p-4 border-b border-slate-200 lg:hidden flex items-center justify-between bg-blue-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
              GST
            </div>
            <span className="font-bold text-white text-sm">GST Portal</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="text-blue-200 hover:text-white p-1 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* User Role Banner */}
        <div className="px-4 py-3 border-b border-blue-100 bg-blue-50/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {role === 'ADMIN' ? (
                <Shield className="w-4 h-4 text-amber-600" />
              ) : (
                <User className="w-4 h-4 text-blue-600" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                {role === 'ADMIN' ? 'Admin Panel' : 'Staff Panel'}
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                role === 'ADMIN'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}
            >
              {role}
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? item.highlight
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600'
                    : item.highlight
                    ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-800 font-semibold'
                    : 'text-slate-600 hover:bg-blue-50/60 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? item.highlight
                          ? 'text-white'
                          : 'text-blue-600'
                        : item.highlight
                        ? 'text-blue-600'
                        : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Client Dossier card */}
        <div className="p-3 border-t border-slate-200 bg-blue-50/60 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
              Active Client
            </span>
            <span className="bg-blue-700 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded">
              FILE #{activeClient.fileNo}
            </span>
          </div>
          <div className="font-semibold text-slate-900 truncate" title={activeClient.companyName}>
            {activeClient.companyName}
          </div>
          <div className="text-[11px] font-mono text-slate-500 truncate">
            {activeClient.gstin}
          </div>
          <button
            onClick={() => handleSelect('clients')}
            className="w-full mt-2 py-1 text-[11px] bg-white hover:bg-blue-100 text-blue-700 font-semibold rounded border border-blue-200 text-center transition"
          >
            Switch / Add Client
          </button>
        </div>

        {/* Fixed Excel Formats Status Info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 space-y-1.5">
          <div className="font-semibold text-slate-700 flex items-center justify-between">
            <span>Master Excel Formats</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
              LOCKED
            </span>
          </div>
          <div className="text-[10px] text-slate-500 space-y-0.5 leading-tight">
            <div>• Purchase Excel (19 Master Cols)</div>
            <div>• Sales Excel (10 Master Cols)</div>
            <div>• ITC Excel (11 Master Cols)</div>
          </div>
        </div>
      </aside>
    </>
  );
};
