import React, { useState } from 'react';
import { GstProvider } from './context/GstContext';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClientManagerModule } from './components/ClientManagerModule';
import { PurchaseModule } from './components/PurchaseModule';
import { SalesModule } from './components/SalesModule';
import { ItcModule } from './components/ItcModule';
import { MatchingModule } from './components/MatchingModule';
import { MonthlyAnalysisModule } from './components/MonthlyAnalysisModule';
import { GstinAnalysisModule } from './components/GstinAnalysisModule';
import { TaxRateAnalysisModule } from './components/TaxRateAnalysisModule';
import { PdfReportModule } from './components/PdfReportModule';
import { ExcelImportModule } from './components/ExcelImportModule';
import { SettingsModule } from './components/SettingsModule';
import { ValidationModal } from './components/ValidationModal';
import { SupabaseStatusBanner } from './components/SupabaseStatusBanner';
import { Menu } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Live Supabase Cloud Database Indicator Banner */}
      <SupabaseStatusBanner />

      {/* Top Navigation */}
      <Navbar
        onOpenValidation={() => setIsValidationOpen(true)}
        onOpenPdfModal={() => setActiveTab('pdf-generator')}
        onOpenClientsModal={() => setActiveTab('clients')}
      />

      {/* Mobile sub-bar for opening drawer */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 transition"
        >
          <Menu className="w-4 h-4 text-blue-600" />
          <span>Menu / Navigation</span>
        </button>
        <span className="text-xs font-bold text-blue-700 capitalize">
          {activeTab.replace('-', ' ')}
        </span>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <Dashboard
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenPdfModal={() => setActiveTab('pdf-generator')}
                onOpenImportModal={() => setActiveTab('excel-import')}
                onOpenClientsModal={() => setActiveTab('clients')}
              />
            )}

            {activeTab === 'clients' && (
              <ClientManagerModule
                onClientSelected={() => setActiveTab('dashboard')}
                onOpenImportModal={() => setActiveTab('excel-import')}
              />
            )}

            {activeTab === 'purchase' && (
              <PurchaseModule
                onOpenImportModal={() => setActiveTab('excel-import')}
              />
            )}

            {activeTab === 'sales' && (
              <SalesModule
                onOpenImportModal={() => setActiveTab('excel-import')}
              />
            )}

            {activeTab === 'itc' && (
              <ItcModule
                onOpenImportModal={() => setActiveTab('excel-import')}
              />
            )}

            {activeTab === 'reconciliation' && <MatchingModule />}

            {activeTab === 'monthly-analysis' && <MonthlyAnalysisModule />}

            {activeTab === 'gstin-analysis' && <GstinAnalysisModule />}

            {activeTab === 'tax-rate-analysis' && <TaxRateAnalysisModule />}

            {activeTab === 'pdf-generator' && <PdfReportModule />}

            {activeTab === 'excel-import' && <ExcelImportModule />}

            {activeTab === 'settings' && <SettingsModule />}
          </div>
        </main>
      </div>

      {/* Validation Audit Modal */}
      <ValidationModal
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <GstProvider>
      <AppContent />
    </GstProvider>
  );
}
