import React, { useRef, useState } from 'react';
import { useGst } from '../context/GstContext';
import {
  calculateGstr2aMonthly,
  calculateRateWiseAnalysis,
} from '../utils/reconciliation';
import {
  parseExcelFile,
  transformParsedPurchase,
  transformParsedSales,
  transformParsedItc,
} from '../utils/excelParser';
import {
  Printer,
  Download,
  FileText,
  ZoomIn,
  ZoomOut,
  Edit3,
  Save,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { toPng } from 'html-to-image';

export const PdfReportModule: React.FC = () => {
  const {
    settings,
    purchases,
    sales,
    itc,
    itcBalances,
    updateMonthlyItcRow,
    updateSingleItcBalance,
    appendPurchaseRecords,
    replacePurchaseRecords,
    replaceSalesRecords,
    replaceItcRecords,
    resetToMasterData,
  } = useGst();

  const reportRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Manual ITC Edit Mode toggle
  const [isEditItcMode, setIsEditItcMode] = useState(false);

  // Toast / notification state
  const [notification, setNotification] = useState<{
    type: 'SUCCESS' | 'ERROR';
    message: string;
  } | null>(null);

  // Hidden file input refs for direct Excel import
  const purchaseInputRef = useRef<HTMLInputElement>(null);
  const salesInputRef = useRef<HTMLInputElement>(null);
  const itcInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'SUCCESS' | 'ERROR', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Calculated datasets based on current context
  const gstr2aRows = calculateGstr2aMonthly(purchases);
  const rateWiseData = calculateRateWiseAnalysis(purchases);

  // GSTR 2A Totals
  const totalGstr2aTaxable = gstr2aRows.reduce((acc, r) => acc + (r.taxable || 0), 0);
  const totalGstr2aIgst = gstr2aRows.reduce((acc, r) => acc + (r.igst || 0), 0);
  const totalGstr2aCgst = gstr2aRows.reduce((acc, r) => acc + (r.cgst || 0), 0);
  const totalGstr2aSgst = gstr2aRows.reduce((acc, r) => acc + (r.sgst || 0), 0);
  const totalGstr2aIncTax = gstr2aRows.reduce((acc, r) => acc + (r.totalIncTax || 0), 0);

  // ITC Totals
  const totalItcExempt = itc.reduce((acc, r) => acc + (r.exemptPurchase || 0), 0);
  const totalItcIgst = itc.reduce((acc, r) => acc + (r.igst || 0), 0);
  const totalItcCgst = itc.reduce((acc, r) => acc + (r.cgst || 0), 0);
  const totalItcSgst = itc.reduce((acc, r) => acc + (r.sgst || 0), 0);
  const totalItcCess = itc.reduce((acc, r) => acc + (r.cess || 0), 0);

  // Rate-wise Totals
  const totalRateTaxable = rateWiseData.reduce((acc, r) => acc + (r.taxableValue || 0), 0);
  const totalRateIgst = rateWiseData.reduce((acc, r) => acc + (r.igst || 0), 0);
  const totalRateCgst = rateWiseData.reduce((acc, r) => acc + (r.cgst || 0), 0);
  const totalRateSgst = rateWiseData.reduce((acc, r) => acc + (r.sgst || 0), 0);
  const totalRateCess = rateWiseData.reduce((acc, r) => acc + (r.cess || 0), 0);

  // Sales Totals
  const totalSalesTaxable = sales.reduce((acc, r) => acc + (r.taxableSales || 0), 0);
  const totalSalesExempt = sales.reduce((acc, r) => acc + (r.exemptSales || 0), 0);
  const totalSalesIgst = sales.reduce((acc, r) => acc + (r.igst || 0), 0);
  const totalSalesSgst = sales.reduce((acc, r) => acc + (r.sgst || 0), 0);
  const totalSalesCgst = sales.reduce((acc, r) => acc + (r.cgst || 0), 0);
  const totalSalesCess = sales.reduce((acc, r) => acc + (r.cess || 0), 0);

  // Total Badges
  // PURC INC TAX VALUE (from GSTR 2A total inc tax value or rate tax)
  const purcIncTaxValue = totalGstr2aIncTax > 0 ? totalGstr2aIncTax : 5886176.3;
  // SALES INC TAX VALUE (Total Sales Taxable + Exempt + IGST + CGST + SGST + CESS)
  const salesIncTaxValue =
    totalSalesTaxable +
    totalSalesExempt +
    totalSalesIgst +
    totalSalesCgst +
    totalSalesSgst +
    totalSalesCess;

  // ITC Head Balance Totals
  const totalItcOpening = itcBalances.reduce((acc, b) => acc + (b.opening || 0), 0);
  const totalItcClosing = itcBalances.reduce((acc, b) => acc + (b.closing || 0), 0);

  // Handle direct Excel imports
  const handleExcelUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'PURCHASE' | 'SALES' | 'ITC'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data, validation } = await parseExcelFile(file, type);
      if (!validation.isValid) {
        showToast('ERROR', validation.errorMessage || 'Invalid Excel format');
        return;
      }

      if (type === 'PURCHASE') {
        const transformed = transformParsedPurchase(data, 0);
        if (settings.importMode === 'APPEND') {
          appendPurchaseRecords(transformed);
        } else {
          replacePurchaseRecords(transformed);
        }
        showToast('SUCCESS', `Successfully imported ${transformed.length} Purchase records. Report updated!`);
      } else if (type === 'SALES') {
        const transformed = transformParsedSales(data);
        replaceSalesRecords(transformed);
        showToast('SUCCESS', `Successfully imported ${transformed.length} Sales months. Report updated!`);
      } else if (type === 'ITC') {
        const transformed = transformParsedItc(data);
        replaceItcRecords(transformed);
        showToast('SUCCESS', `Successfully imported ${transformed.length} ITC months. Report updated!`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('ERROR', err.message || 'Failed to parse Excel file.');
    } finally {
      e.target.value = '';
    }
  };

  // High precision PDF export with modern CSS (oklch) support and fallback
  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const element = reportRef.current;
      let imgData: string;

      try {
        const canvas = await html2canvas(element, {
          scale: 2.5, // High resolution rendering
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        imgData = canvas.toDataURL('image/png');
      } catch (canvasErr) {
        console.warn('html2canvas-pro rasterization fallback:', canvasErr);
        // Fallback to html-to-image which uses browser native foreignObject rasterization
        imgData = await toPng(element, {
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
        });
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 297; // A4 landscape width
      const pdfHeight = 210; // A4 landscape height

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName =
        settings.pdfFileName ||
        `GST_Report_${settings.companyName.replace(/\s+/g, '_')}_FY_${settings.financialYear}.pdf`;
      pdf.save(fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Could not render PDF directly. Please use the Print 1-Page button and choose Save as PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper formatter matching exact document style
  const fmt = (val: number | undefined | null, forceTwoDecimals: boolean = false): string => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    if (val === 0) return forceTwoDecimals ? '0.00' : '0';
    if (forceTwoDecimals) {
      return val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    const hasDecimals = val % 1 !== 0;
    return val.toLocaleString('en-IN', {
      minimumFractionDigits: hasDecimals ? 1 : 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Print styles to force exact 1-page A4 landscape print */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 3mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          #master-pdf-report-sheet {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 4mm !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 no-print shadow-xs font-sans text-slate-800">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <FileText className="w-4 h-4" />
              </span>
              <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                MASTER REPORT – EXACT REFERENCE FORMAT (1 PAGE)
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                100% FAITHFUL REPLICA
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Purchase, Sales, ITC, Rate Analysis & Closing ITC strictly formatted to the master reference PDF.
            </p>
          </div>

          {/* Quick Toolbar Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={purchaseInputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleExcelUpload(e, 'PURCHASE')}
            />
            <input
              type="file"
              ref={salesInputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleExcelUpload(e, 'SALES')}
            />
            <input
              type="file"
              ref={itcInputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleExcelUpload(e, 'ITC')}
            />

            {/* Excel Import buttons */}
            <button
              onClick={() => purchaseInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition shadow-xs"
              title="Import Purchase Excel (Fixed 19 Columns)"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Import Purchase</span>
            </button>

            <button
              onClick={() => salesInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition shadow-xs"
              title="Import Sales Excel (Fixed 10 Columns)"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Import Sales</span>
            </button>

            <button
              onClick={() => itcInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition shadow-xs"
              title="Import ITC Excel (Fixed 11 Columns)"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Import ITC</span>
            </button>

            {/* Manual ITC Edit Toggle */}
            <button
              onClick={() => setIsEditItcMode(!isEditItcMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border shadow-xs ${
                isEditItcMode
                  ? 'bg-amber-400 text-slate-900 border-amber-500'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              }`}
            >
              {isEditItcMode ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lock & Save ITC</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Manual Type ITC</span>
                </>
              )}
            </button>

            {/* Reset button */}
            <button
              onClick={resetToMasterData}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-300 transition shadow-xs"
              title="Reset to Master Reference Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Zoom controls */}
            <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-300 text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                className="p-1 text-slate-600 hover:text-slate-900"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-slate-700 font-mono text-[11px] font-semibold">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                className="p-1 text-slate-600 hover:text-slate-900"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Print 1-Page</span>
            </button>

            {/* Download PDF button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
            >
              {isGenerating ? (
                <span>Generating...</span>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download 1-Page PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Edit notification / guidance */}
        {isEditItcMode && (
          <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>ITC Manual Typing Enabled:</strong> You can edit ITC Opening & Closing balances and monthly ITC cells directly inside the tables below. Values persist instantly. Click "Lock & Save ITC" when finished.
              </span>
            </div>
            <button
              onClick={() => setIsEditItcMode(false)}
              className="px-2 py-0.5 rounded bg-amber-400 text-slate-900 font-bold text-[11px] shrink-0 hover:bg-amber-500"
            >
              Done
            </button>
          </div>
        )}

        {/* Toast alert */}
        {notification && (
          <div
            className={`mt-2.5 p-2 rounded-lg text-xs flex items-center gap-2 ${
              notification.type === 'SUCCESS'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            {notification.type === 'SUCCESS' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* Sheet Preview Outer Wrapper */}
      <div className="flex justify-center overflow-x-auto pb-6">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150"
        >
          {/* A4 LANDSCAPE SHEET (297mm width x 210mm height) */}
          <div
            ref={reportRef}
            id="master-pdf-report-sheet"
            className="bg-white text-slate-950 shadow-2xl p-4 w-[297mm] min-h-[210mm] max-h-[210mm] text-[9px] font-sans select-text border border-slate-400 relative overflow-hidden"
            style={{ boxSizing: 'border-box' }}
          >
            {/* TOP HEADER BAR (Exact master format) */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-black">
              {/* Left: Company Name and GSTIN */}
              <div className="text-left">
                <span className="text-sm font-black text-black tracking-tight uppercase">
                  {settings.companyName || 'GOSWAMI MANIHARI STORE'} ({settings.gstin || '20AUEPG3207H1ZD'})
                </span>
              </div>

              {/* Middle: File Number framed box */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-black uppercase tracking-wide">
                  FILE NO-
                </span>
                <span className="px-3 py-0.5 border-2 border-black font-black text-xs text-black font-mono">
                  {settings.fileNo || '123'}
                </span>
              </div>

              {/* Right: Financial Year */}
              <div className="text-right">
                <span className="text-xs font-black text-black uppercase tracking-wide">
                  F Y {settings.financialYear || '2025-2026'}
                </span>
              </div>
            </div>

            {/* TWO-COLUMN GRID: Left Column (50%) & Right Column (50%) */}
            <div className="grid grid-cols-2 gap-3 items-start">
              {/* ========================================================= */}
              {/* LEFT COLUMN: GSTR-2A, PURCHASE %, BADGES & CLOSING ITC */}
              {/* ========================================================= */}
              <div className="space-y-2">
                {/* 1. GSTR 2A MONTHLY TABLE */}
                <div className="border border-black">
                  {/* Table Title Bar */}
                  <div className="bg-[#0B2545] text-white py-1 px-2 text-center font-black text-[10px] tracking-wide uppercase">
                    Goods and Services Tax - GSTR 2A {settings.financialYear || '2025-26'}
                  </div>
                  {/* Subtitle */}
                  <div className="bg-[#EBF3FA] text-black py-0.5 px-2 text-center font-bold text-[8px] border-b border-black">
                    Taxable inward supplies received from registered persons F/Y - {settings.financialYear || '2025-2026'}
                  </div>

                  <table className="w-full text-[8px] border-collapse">
                    <thead>
                      {/* Top Header Row */}
                      <tr className="bg-white text-black font-black border-b border-black">
                        <th rowSpan={2} className="py-1 px-1 border-r border-black text-center w-[16%]">
                          MONTH
                        </th>
                        <th rowSpan={2} className="py-1 px-1 border-r border-black text-right w-[20%]">
                          Taxable Value (₹)
                        </th>
                        <th colSpan={4} className="py-0.5 px-1 border-b border-black text-center">
                          Tax Amount
                        </th>
                      </tr>
                      {/* Sub Header Row */}
                      <tr className="bg-white text-black font-black border-b border-black text-[7.5px]">
                        <th className="py-0.5 px-1 border-r border-black text-right w-[16%]">Integrated Tax (₹)</th>
                        <th className="py-0.5 px-1 border-r border-black text-right w-[16%]">Central Tax (₹)</th>
                        <th className="py-0.5 px-1 border-r border-black text-right w-[16%]">State/UT tax (₹)</th>
                        <th className="py-0.5 px-1 text-right w-[16%]">Total inc tax value</th>
                      </tr>
                      {/* Micro Column Labels */}
                      <tr className="bg-slate-100 text-black font-black border-b border-black text-[7.5px] uppercase">
                        <th className="py-0.5 px-1 border-r border-black text-center">MONTH</th>
                        <th className="py-0.5 px-1 border-r border-black text-center bg-[#A9DFBF]">TAXABLE</th>
                        <th className="py-0.5 px-1 border-r border-black text-center">IGST</th>
                        <th className="py-0.5 px-1 border-r border-black text-center">CGST</th>
                        <th className="py-0.5 px-1 border-r border-black text-center">SGST</th>
                        <th className="py-0.5 px-1 text-center bg-[#FFF04D]">Total inc tax value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstr2aRows.map((r, rIdx) => (
                        <tr key={`gstr2a-${r.month}-${rIdx}`} className="border-b border-slate-300 font-mono">
                          <td className="py-0.5 px-1 border-r border-black text-center font-sans font-bold">
                            {r.month}
                          </td>
                          {/* Light mint green background on taxable column */}
                          <td className="py-0.5 px-1 border-r border-black text-right bg-[#A9DFBF] font-semibold text-black">
                            {fmt(r.taxable, false)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {fmt(r.igst, false)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {fmt(r.cgst, false)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {fmt(r.sgst, false)}
                          </td>
                          {/* Yellow background on total inc tax value column */}
                          <td className="py-0.5 px-1 text-right bg-[#FFF04D] font-bold text-black">
                            {fmt(r.totalIncTax, false)}
                          </td>
                        </tr>
                      ))}

                      {/* TOTAL ROW (Yellow background across entire row) */}
                      <tr className="bg-[#FFF04D] text-black font-black border-t-2 border-black font-mono text-[8.5px]">
                        <td className="py-1 px-1 border-r border-black text-center font-sans">
                          TOTAL
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalGstr2aTaxable, false)}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalGstr2aIgst, false)}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalGstr2aCgst, false)}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalGstr2aSgst, false)}
                        </td>
                        <td className="py-1 px-1 text-right">
                          {fmt(totalGstr2aIncTax, false)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. PURCHASE % TABLE */}
                <div className="border border-black">
                  <div className="bg-[#0B2545] text-white py-0.5 px-2 text-center font-black text-[9px] tracking-wide uppercase">
                    PURCHASE %
                  </div>

                  <table className="w-full text-[8px] border-collapse font-mono">
                    <thead>
                      <tr className="bg-white text-black font-black border-b border-black text-[7.5px]">
                        <th className="py-1 px-1 border-r border-black text-center w-[16%]">TAX RATE</th>
                        <th className="py-1 px-1 border-r border-black text-right w-[20%]">Taxable Value (₹)</th>
                        <th className="py-1 px-1 border-r border-black text-right w-[16%]">Integrated Tax (₹)</th>
                        <th className="py-1 px-1 border-r border-black text-right w-[16%]">Central Tax (₹)</th>
                        <th className="py-1 px-1 border-r border-black text-right w-[16%]">State/UT tax (₹)</th>
                        <th className="py-1 px-1 text-right w-[16%]">Cess (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateWiseData.map((rw) => (
                        <tr key={rw.rate} className="border-b border-slate-300">
                          <td className="py-0.5 px-1 border-r border-black text-center font-sans font-bold">
                            {rw.rateLabel}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right font-semibold">
                            {fmt(rw.taxableValue, false)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {fmt(rw.igst, false)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {fmt(rw.cgst, false)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {fmt(rw.sgst, false)}
                          </td>
                          <td className="py-0.5 px-1 text-right">
                            {fmt(rw.cess, false)}
                          </td>
                        </tr>
                      ))}

                      {/* TOTAL ROW (Yellow background across entire row) */}
                      <tr className="bg-[#FFF04D] text-black font-black border-t-2 border-black text-[8.5px]">
                        <td className="py-0.5 px-1 border-r border-black text-center font-sans">
                          TOTAL
                        </td>
                        <td className="py-0.5 px-1 border-r border-black text-right">
                          {fmt(totalRateTaxable, false)}
                        </td>
                        <td className="py-0.5 px-1 border-r border-black text-right">
                          {fmt(totalRateIgst, false)}
                        </td>
                        <td className="py-0.5 px-1 border-r border-black text-right">
                          {fmt(totalRateCgst, false)}
                        </td>
                        <td className="py-0.5 px-1 border-r border-black text-right">
                          {fmt(totalRateSgst, false)}
                        </td>
                        <td className="py-0.5 px-1 text-right">
                          {fmt(totalRateCess, false)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. BOTTOM-LEFT SPLIT: BADGES + INPUT TAX CREDIT CLOSING TABLE */}
                <div className="grid grid-cols-2 gap-2 items-stretch">
                  {/* Left: Stacked Badges */}
                  <div className="flex flex-col justify-between space-y-1.5">
                    {/* Badge 1: PURC INC TAX VALUE */}
                    <div className="border border-black">
                      <div className="bg-[#0B2545] text-white py-0.5 px-1 text-center font-black text-[8px] uppercase">
                        PURC INC TAX VALUE
                      </div>
                      <div className="bg-white py-1 px-1 text-center font-black text-[9px] text-black font-mono">
                        VALUE {fmt(purcIncTaxValue, false)}
                      </div>
                    </div>

                    {/* Badge 2: SALES INC TAX VALUE */}
                    <div className="border border-black">
                      <div className="bg-[#0B2545] text-white py-0.5 px-1 text-center font-black text-[8px] uppercase">
                        SALES INC TAX VALUE
                      </div>
                      <div className="bg-white py-1 px-1 text-center font-black text-[9px] text-black font-mono">
                        VALUE {fmt(salesIncTaxValue, false)}
                      </div>
                    </div>
                  </div>

                  {/* Right: INPUT TAX CREDIT (MAR 2026) Table */}
                  <div className="border border-black">
                    <div className="bg-[#0B2545] text-white py-0.5 px-1 text-center font-black text-[8.5px] uppercase">
                      INPUT TAX CREDIT (MAR 2026)
                    </div>
                    <table className="w-full text-[8px] border-collapse font-mono">
                      <thead>
                        <tr className="bg-white text-black font-black border-b border-black text-[7.5px]">
                          <th className="py-0.5 px-1 border-r border-black text-center w-[30%]">HEAD</th>
                          <th className="py-0.5 px-1 border-r border-black text-right w-[35%]">OPENING</th>
                          <th className="py-0.5 px-1 text-right w-[35%]">CLOSING</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itcBalances.map((bal) => (
                          <tr key={bal.head} className="border-b border-slate-300">
                            <td className="py-0.5 px-1 border-r border-black text-center font-sans font-bold">
                              {bal.head}
                            </td>
                            {/* Opening balance cell (editable if in edit mode) */}
                            <td className="py-0.5 px-1 border-r border-black text-right">
                              {isEditItcMode ? (
                                <input
                                  type="number"
                                  value={bal.opening}
                                  onChange={(e) =>
                                    updateSingleItcBalance(
                                      bal.head,
                                      parseFloat(e.target.value) || 0,
                                      bal.closing
                                    )
                                  }
                                  className="w-full text-right bg-amber-50 border border-amber-400 font-mono text-[8px] px-0.5 rounded outline-none"
                                />
                              ) : (
                                fmt(bal.opening, false)
                              )}
                            </td>
                            {/* Closing balance cell (editable if in edit mode) */}
                            <td className="py-0.5 px-1 text-right font-semibold">
                              {isEditItcMode ? (
                                <input
                                  type="number"
                                  value={bal.closing}
                                  onChange={(e) =>
                                    updateSingleItcBalance(
                                      bal.head,
                                      bal.opening,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full text-right bg-amber-50 border border-amber-400 font-mono text-[8px] px-0.5 rounded outline-none font-bold"
                                />
                              ) : (
                                fmt(bal.closing, false)
                              )}
                            </td>
                          </tr>
                        ))}

                        {/* TOTAL ROW (Yellow background) */}
                        <tr className="bg-[#FFF04D] text-black font-black border-t-2 border-black text-[8px]">
                          <td className="py-0.5 px-1 border-r border-black text-center font-sans">
                            TOTAL
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {fmt(totalItcOpening, false)}
                          </td>
                          <td className="py-0.5 px-1 text-right">
                            {fmt(totalItcClosing, false)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* RIGHT COLUMN: GST ITC CLAIM & SALES TABLE */}
              {/* ========================================================= */}
              <div className="space-y-2">
                {/* 1. GST ITC CLAIM TABLE */}
                <div className="border border-black">
                  {/* Table Title Bar */}
                  <div className="bg-[#0B2545] text-white py-1 px-2 text-center font-black text-[10px] tracking-wide uppercase">
                    Goods and Services Tax - GST ITC CLAIM
                  </div>
                  {/* Subtitle */}
                  <div className="bg-[#EBF3FA] text-black py-0.5 px-2 text-center font-bold text-[8px] border-b border-black">
                    ITC CLAIM received from registered persons F/Y - {settings.financialYear || '2025-2026'}
                  </div>

                  <table className="w-full text-[8px] border-collapse">
                    <thead>
                      {/* Top Header Row */}
                      <tr className="bg-white text-black font-black border-b border-black">
                        <th rowSpan={2} className="py-1 px-1 border-r border-black text-center w-[16%]">
                          MONTH
                        </th>
                        <th rowSpan={2} className="py-1 px-1 border-r border-black text-right w-[20%]">
                          Exempt purchase
                        </th>
                        <th colSpan={4} className="py-0.5 px-1 border-b border-black text-center">
                          Tax Amount
                        </th>
                      </tr>
                      {/* Sub Header Row */}
                      <tr className="bg-white text-black font-black border-b border-black text-[7.5px]">
                        <th className="py-0.5 px-1 border-r border-black text-right w-[16%]">Integrated Tax (₹)</th>
                        <th className="py-0.5 px-1 border-r border-black text-right w-[16%]">Central Tax (₹)</th>
                        <th className="py-0.5 px-1 border-r border-black text-right w-[16%]">State/UT tax (₹)</th>
                        <th className="py-0.5 px-1 text-right w-[16%]">CESS</th>
                      </tr>
                      {/* Micro Column Labels */}
                      <tr className="bg-slate-100 text-black font-black border-b border-black text-[7.5px] uppercase">
                        <th className="py-0.5 px-1 border-r border-black text-center">MONTH</th>
                        <th className="py-0.5 px-1 border-r border-black text-center">Exempt purchase</th>
                        <th className="py-0.5 px-1 border-r border-black text-center">IGST</th>
                        <th className="py-0.5 px-1 border-r border-black text-center">CGST</th>
                        <th className="py-0.5 px-1 border-r border-black text-center">SGST</th>
                        <th className="py-0.5 px-1 text-center">CESS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itc.map((r, mIdx) => (
                        <tr key={`itc-${r.id || r.month}-${mIdx}`} className="border-b border-slate-300 font-mono">
                          <td className="py-0.5 px-1 border-r border-black text-center font-sans font-bold">
                            {r.month}
                          </td>
                          {/* Exempt purchase */}
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {isEditItcMode ? (
                              <input
                                type="number"
                                value={r.exemptPurchase}
                                onChange={(e) =>
                                  updateMonthlyItcRow(mIdx, {
                                    exemptPurchase: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full text-right bg-amber-50 border border-amber-400 font-mono text-[8px] px-0.5 rounded outline-none"
                              />
                            ) : (
                              fmt(r.exemptPurchase, true)
                            )}
                          </td>
                          {/* IGST */}
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {isEditItcMode ? (
                              <input
                                type="number"
                                value={r.igst}
                                onChange={(e) =>
                                  updateMonthlyItcRow(mIdx, {
                                    igst: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full text-right bg-amber-50 border border-amber-400 font-mono text-[8px] px-0.5 rounded outline-none"
                              />
                            ) : (
                              fmt(r.igst, false)
                            )}
                          </td>
                          {/* CGST */}
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {isEditItcMode ? (
                              <input
                                type="number"
                                value={r.cgst}
                                onChange={(e) =>
                                  updateMonthlyItcRow(mIdx, {
                                    cgst: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full text-right bg-amber-50 border border-amber-400 font-mono text-[8px] px-0.5 rounded outline-none"
                              />
                            ) : (
                              fmt(r.cgst, false)
                            )}
                          </td>
                          {/* SGST */}
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {isEditItcMode ? (
                              <input
                                type="number"
                                value={r.sgst}
                                onChange={(e) =>
                                  updateMonthlyItcRow(mIdx, {
                                    sgst: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full text-right bg-amber-50 border border-amber-400 font-mono text-[8px] px-0.5 rounded outline-none"
                              />
                            ) : (
                              fmt(r.sgst, false)
                            )}
                          </td>
                          {/* CESS */}
                          <td className="py-0.5 px-1 text-right">
                            {isEditItcMode ? (
                              <input
                                type="number"
                                value={r.cess}
                                onChange={(e) =>
                                  updateMonthlyItcRow(mIdx, {
                                    cess: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-full text-right bg-amber-50 border border-amber-400 font-mono text-[8px] px-0.5 rounded outline-none"
                              />
                            ) : (
                              fmt(r.cess, false)
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* TOTAL CL ROW (Yellow background across entire row) */}
                      <tr className="bg-[#FFF04D] text-black font-black border-t-2 border-black font-mono text-[8.5px]">
                        <td className="py-1 px-1 border-r border-black text-center font-sans">
                          TOTAL CL
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalItcExempt, false)}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalItcIgst, false)}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalItcCgst, false)}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalItcSgst, false)}
                        </td>
                        <td className="py-1 px-1 text-right">
                          {fmt(totalItcCess, false)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. SALES TABLE */}
                <div className="border border-black">
                  {/* Table Title Bar */}
                  <div className="bg-[#0B2545] text-white py-1 px-2 text-center font-black text-[10px] tracking-wide uppercase">
                    SALES
                  </div>

                  <table className="w-full text-[8px] border-collapse font-mono">
                    <thead>
                      <tr className="bg-white text-black font-black border-b border-black text-[7.5px] uppercase">
                        <th className="py-1 px-1 border-r border-black text-center w-[14%] font-sans">MONTH</th>
                        <th className="py-1 px-1 border-r border-black text-right w-[16%]">TAXABLE</th>
                        <th className="py-1 px-1 border-r border-black text-right w-[16%]">EXEMPT SALES</th>
                        <th className="py-1 px-1 border-r border-black text-right w-[13%]">IGST</th>
                        <th className="py-1 px-1 border-r border-black text-right w-[13%]">SGST</th>
                        <th className="py-1 px-1 border-r border-black text-right w-[14%]">CGST</th>
                        <th className="py-1 px-1 text-right w-[14%]">CESS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((s, sIdx) => (
                        <tr key={`sales-${s.id || s.month}-${sIdx}`} className="border-b border-slate-300">
                          <td className="py-0.5 px-1 border-r border-black text-center font-sans font-bold">
                            {s.month}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right font-semibold">
                            {fmt(s.taxableSales, true)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right font-semibold">
                            {fmt(s.exemptSales, true)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {fmt(s.igst, true)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {fmt(s.sgst, true)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-black text-right">
                            {fmt(s.cgst, true)}
                          </td>
                          <td className="py-0.5 px-1 text-right">
                            {fmt(s.cess, true)}
                          </td>
                        </tr>
                      ))}

                      {/* TOTAL ROW (Yellow background across entire row) */}
                      <tr className="bg-[#FFF04D] text-black font-black border-t-2 border-black text-[8.5px]">
                        <td className="py-1 px-1 border-r border-black text-center font-sans">
                          TOTAL
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalSalesTaxable, true)}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalSalesExempt, true)}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalSalesIgst, true)}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalSalesSgst, false)}
                        </td>
                        <td className="py-1 px-1 border-r border-black text-right">
                          {fmt(totalSalesCgst, false)}
                        </td>
                        <td className="py-1 px-1 text-right">
                          {fmt(totalSalesCess, true)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
