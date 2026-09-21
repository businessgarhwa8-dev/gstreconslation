import React, { useState, useRef } from 'react';
import { useGst } from '../context/GstContext';
import {
  ExcelType,
  PurchaseRecord,
  MonthlySalesRecord,
  MonthlyItcRecord,
  Consolidated3BMonthRow,
} from '../types/gst';
import {
  parseExcelFile,
  generateBlankExcelTemplate,
  transformParsedPurchase,
  transformParsedSales,
  transformParsedItc,
  transformParsedGstr2aReconciliation,
  transformParsedConsolidated3B,
  parseCombinedWorkbook,
  generateCombinedPurchaseSalesTemplate,
} from '../utils/excelParser';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Layers,
  Settings2,
  Table,
  HelpCircle,
  ArrowRight,
  Sparkles,
  FolderKanban,
  FileText,
  TrendingUp,
} from 'lucide-react';

interface MappingField {
  key: string;
  label: string;
  required: boolean;
  targetCol: string;
}

export const ExcelImportModule: React.FC = () => {
  const {
    purchases,
    sales,
    appendPurchaseRecords,
    replacePurchaseRecords,
    appendSalesRecords,
    replaceSalesRecords,
    appendItcRecords,
    replaceItcRecords,
    appendConsolidated3bData,
    replaceConsolidated3bData,
    applyExtractedCompanySettings,
    importCombinedPurchaseAndSales,
    role,
    clients,
    activeClientId,
    activeClient,
    switchClient,
  } = useGst();

  const [activeType, setActiveType] = useState<ExcelType>('COMBINED_PURCHASE_SALES');
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [isProcessing, setIsProcessing] = useState(false);

  // Unified state for Combined Ingestion (Option B)
  const [stagedPurchases, setStagedPurchases] = useState<PurchaseRecord[] | null>(null);
  const [stagedSales, setStagedSales] = useState<MonthlySalesRecord[] | null>(null);
  const [stagedPurchasesFileName, setStagedPurchasesFileName] = useState<string | null>(null);
  const [stagedSalesFileName, setStagedSalesFileName] = useState<string | null>(null);

  // Staged data for mapping/review if needed for single formats
  const [stagedFile, setStagedFile] = useState<{
    fileName: string;
    rawRows: any[];
    headers: string[];
    suggestedType: ExcelType;
  } | null>(null);

  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showMappingModal, setShowMappingModal] = useState(false);

  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    count: number;
    warnings: string[];
    sampleData?: any[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const combinedPurchaseInputRef = useRef<HTMLInputElement>(null);
  const combinedSalesInputRef = useRef<HTMLInputElement>(null);
  const combinedBothInputRef = useRef<HTMLInputElement>(null);

  // Helper to query dynamic counts from localStorage
  const getClientRecordCounts = (clientId: string) => {
    try {
      const purchaseKey = `gst_dataset_purchases_v2_${clientId}`;
      const salesKey = `gst_dataset_sales_v2_${clientId}`;
      
      const pData = localStorage.getItem(purchaseKey);
      const sData = localStorage.getItem(salesKey);
      
      let purchasesCount = 0;
      let salesCount = 0;
      
      if (pData) {
        purchasesCount = JSON.parse(pData).length;
      } else {
        if (clientId === 'client_master_goswami') purchasesCount = 21;
        else if (clientId === 'client_bharat_hardware') purchasesCount = 4;
        else if (clientId === 'client_sharma_electricals') purchasesCount = 3;
        else if (clientId === 'client_royal_automobiles') purchasesCount = 3;
        else if (clientId === 'client_gupta_textiles') purchasesCount = 3;
      }
      
      if (sData) {
        salesCount = JSON.parse(sData).length;
      } else {
        if (clientId === 'client_master_goswami') salesCount = 12;
        else if (clientId === 'client_bharat_hardware') salesCount = 12;
        else if (clientId === 'client_sharma_electricals') salesCount = 12;
        else if (clientId === 'client_royal_automobiles') salesCount = 12;
        else if (clientId === 'client_gupta_textiles') salesCount = 12;
      }
      
      return { purchasesCount, salesCount };
    } catch {
      return { purchasesCount: 0, salesCount: 0 };
    }
  };

  // Define target fields for flexible mapping
  const getTargetFields = (type: ExcelType): MappingField[] => {
    switch (type) {
      case 'PURCHASE':
        return [
          { key: 'party', label: 'Supplier / Party Name', required: true, targetCol: 'Party' },
          { key: 'gstin', label: 'Supplier GSTIN', required: true, targetCol: 'GSTIN' },
          { key: 'invoiceNo', label: 'Invoice / Bill No', required: true, targetCol: 'Invoice No' },
          { key: 'invoiceDate', label: 'Invoice Date', required: false, targetCol: 'Invoice Date' },
          { key: 'taxableValue', label: 'Taxable Value', required: true, targetCol: 'Taxable Value' },
          { key: 'rate', label: 'GST Rate (%)', required: false, targetCol: 'Rate' },
          { key: 'tax', label: 'Total Tax', required: false, targetCol: 'Tax' },
          { key: 'igst', label: 'IGST Amount', required: false, targetCol: 'IGST' },
          { key: 'cgst', label: 'CGST Amount', required: false, targetCol: 'CGST' },
          { key: 'sgst', label: 'SGST Amount', required: false, targetCol: 'SGST' },
          { key: 'invoiceValue', label: 'Gross Invoice Value', required: false, targetCol: 'Invoice Value' },
          { key: 'pos', label: 'Place of Supply (POS)', required: false, targetCol: 'POS' },
          { key: 'status', label: 'Status / Rec Status', required: false, targetCol: 'Status' },
        ];
      case 'SALES':
        return [
          { key: 'month', label: 'Month / Period', required: true, targetCol: 'Month' },
          { key: 'taxableSales', label: 'Taxable Sales', required: true, targetCol: 'Taxable Sales' },
          { key: 'exemptSales', label: 'Exempt Sales', required: false, targetCol: 'Exempt Sales' },
          { key: 'igst', label: 'IGST Liability', required: false, targetCol: 'IGST' },
          { key: 'cgst', label: 'CGST Liability', required: false, targetCol: 'CGST' },
          { key: 'sgst', label: 'SGST Liability', required: false, targetCol: 'SGST' },
          { key: 'totalTax', label: 'Total Tax Liability', required: false, targetCol: 'Total Tax' },
        ];
      case 'ITC':
        return [
          { key: 'month', label: 'Month / Period', required: true, targetCol: 'Month' },
          { key: 'exemptPurchase', label: 'Exempt Purchase', required: false, targetCol: 'Exempt Purchase' },
          { key: 'igst', label: 'IGST Credit', required: false, targetCol: 'IGST' },
          { key: 'cgst', label: 'CGST Credit', required: false, targetCol: 'CGST' },
          { key: 'sgst', label: 'SGST Credit', required: false, targetCol: 'SGST' },
          { key: 'totalTax', label: 'Total Tax Credit', required: false, targetCol: 'Total Tax' },
          { key: 'openingItc', label: 'Opening ITC', required: false, targetCol: 'Opening ITC' },
          { key: 'closingItc', label: 'Closing ITC', required: false, targetCol: 'Closing ITC' },
        ];
      case 'GSTR2A_RECONCILIATION':
        return [
          { key: 'party', label: 'Supplier / Party Name', required: true, targetCol: 'Party' },
          { key: 'gstin', label: 'Books Supplier GSTIN', required: true, targetCol: 'GSTIN' },
          { key: 'invoiceNo', label: 'Books Invoice No', required: true, targetCol: 'Invoice No' },
          { key: 'taxableValue', label: 'Books Taxable Value', required: true, targetCol: 'Taxable Value' },
          { key: 'tax', label: 'Books Tax', required: false, targetCol: 'Tax' },
          { key: 'gstrGstin', label: 'GSTR-2A Supplier GSTIN', required: false, targetCol: 'GSTR GSTIN' },
          { key: 'gstrInvoiceNo', label: 'GSTR-2A Invoice No', required: false, targetCol: 'GSTR Invoice No' },
          { key: 'gstrTaxableValue', label: 'GSTR-2A Taxable Value', required: false, targetCol: 'GSTR Taxable Value' },
          { key: 'gstrTax', label: 'GSTR-2A Tax', required: false, targetCol: 'GSTR Tax' },
          { key: 'gstr3bStatus', label: 'Supplier 3B Status (Filed/Not)', required: false, targetCol: 'GSTR 3B Status' },
          { key: 'diffTax', label: 'Difference Tax', required: false, targetCol: 'Diff Tax' },
        ];
      case 'GSTR3B_CONSOLIDATED':
        return [
          { key: 'month', label: 'Month', required: true, targetCol: 'Month' },
          { key: 'outwardNrc', label: 'Outward (NRC) Taxable', required: true, targetCol: 'Outward NRC' },
          { key: 'nonTaxable', label: 'Non-Taxable / Exempt Outward', required: false, targetCol: 'Non-Taxable' },
          { key: 'outwardCgst', label: 'Outward CGST Liability', required: false, targetCol: 'Outward CGST' },
          { key: 'outwardSgst', label: 'Outward SGST Liability', required: false, targetCol: 'Outward SGST' },
          { key: 'cgstByCgst', label: 'CGST Paid by CGST Credit', required: false, targetCol: 'CGST by CGST' },
          { key: 'sgstBySgst', label: 'SGST Paid by SGST Credit', required: false, targetCol: 'SGST by SGST' },
          { key: 'inwardNrc', label: 'Inward (NRC) / Purchase', required: false, targetCol: 'Inward NRC' },
          { key: 'itcEligibleNrcCgst', label: 'Eligible CGST ITC', required: false, targetCol: 'ITC Eligible NRC CGST' },
          { key: 'itcEligibleNrcSgst', label: 'Eligible SGST ITC', required: false, targetCol: 'ITC Eligible NRC SGST' },
          { key: 'filingDate', label: 'Filing Date', required: false, targetCol: 'Filing Date' },
        ];
      default:
        return [];
    }
  };

  // Smart fuzzy matching of uploaded column headers to target fields
  const initializeMapping = (uploadedHeaders: string[], type: ExcelType) => {
    const fields = getTargetFields(type);
    const initialMapping: Record<string, string> = {};

    fields.forEach((f) => {
      const targetNorm = f.targetCol.toLowerCase().replace(/[^a-z0-9]/g, '');
      const keyNorm = f.key.toLowerCase();

      // Find closest match among uploaded headers
      const matched = uploadedHeaders.find((h) => {
        const hNorm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          hNorm === targetNorm ||
          hNorm === keyNorm ||
          hNorm.includes(targetNorm) ||
          targetNorm.includes(hNorm)
        );
      });

      if (matched) {
        initialMapping[f.key] = matched;
      }
    });

    setColumnMapping(initialMapping);
  };

  // Handle standard single file change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportResult(null);

    try {
      const { data, headers, validation, detectedLayout, extractedMetadata } = await parseExcelFile(file, activeType);

      if (extractedMetadata) {
        applyExtractedCompanySettings(extractedMetadata);
      }

      const is2AFormat =
        detectedLayout === 'GSTR2A_3SECTION' ||
        headers.some((h) => h.toLowerCase().includes('gstr') || h.toLowerCase().includes('2a'));
      const is3BFormat = headers.some(
        (h) => h.toLowerCase().includes('outward') || h.toLowerCase().includes('offset') || h.toLowerCase().includes('rcm')
      );

      let detectedType = activeType;
      if (is2AFormat && activeType !== 'GSTR2A_RECONCILIATION') {
        detectedType = 'GSTR2A_RECONCILIATION';
      } else if (is3BFormat && activeType !== 'GSTR3B_CONSOLIDATED') {
        detectedType = 'GSTR3B_CONSOLIDATED';
      }

      if (detectedLayout === 'GSTR2A_3SECTION') {
        executeIngestion(data, 'GSTR2A_RECONCILIATION', importMode);
        return;
      }

      if (!validation.isValid && validation.missingColumns.length > 3) {
        setStagedFile({
          fileName: file.name,
          rawRows: data,
          headers,
          suggestedType: detectedType,
        });
        initializeMapping(headers, detectedType);
        setShowMappingModal(true);
        setIsProcessing(false);
        return;
      }

      executeIngestion(data, detectedType, importMode);
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err?.message || 'Error processing Excel file.',
        count: 0,
        warnings: [],
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const executeIngestion = (
    data: any[],
    type: ExcelType,
    mode: 'APPEND' | 'REPLACE',
    customMapping?: Record<string, string>
  ) => {
    let rowCount = 0;
    let transformedRecords: any[] = [];

    let workingRows = data;
    if (customMapping && Object.keys(customMapping).length > 0) {
      const targetFields = getTargetFields(type);
      workingRows = data.map((raw) => {
        const remapped: any = { ...raw };
        targetFields.forEach((f) => {
          const sourceCol = customMapping[f.key];
          if (sourceCol && raw[sourceCol] !== undefined) {
            remapped[f.targetCol] = raw[sourceCol];
          }
        });
        return remapped;
      });
    }

    if (type === 'PURCHASE') {
      transformedRecords = transformParsedPurchase(
        workingRows,
        mode === 'APPEND' ? purchases.length : 0
      );
      rowCount = transformedRecords.length;

      if (mode === 'APPEND') {
        appendPurchaseRecords(transformedRecords as PurchaseRecord[]);
      } else {
        if (role !== 'ADMIN') {
          alert('Replacing entire purchase database requires Admin role.');
          return;
        }
        replacePurchaseRecords(transformedRecords as PurchaseRecord[]);
      }
    } else if (type === 'SALES') {
      transformedRecords = transformParsedSales(workingRows);
      rowCount = transformedRecords.length;

      if (mode === 'APPEND') {
        appendSalesRecords(transformedRecords as MonthlySalesRecord[]);
      } else {
        replaceSalesRecords(transformedRecords as MonthlySalesRecord[]);
      }
    } else if (type === 'ITC') {
      transformedRecords = transformParsedItc(workingRows);
      rowCount = transformedRecords.length;

      if (mode === 'APPEND') {
        appendItcRecords(transformedRecords as MonthlyItcRecord[]);
      } else {
        replaceItcRecords(transformedRecords as MonthlyItcRecord[]);
      }
    } else if (type === 'GSTR2A_RECONCILIATION') {
      transformedRecords = transformParsedGstr2aReconciliation(
        workingRows,
        mode === 'APPEND' ? purchases.length : 0
      );
      rowCount = transformedRecords.length;

      if (mode === 'APPEND') {
        appendPurchaseRecords(transformedRecords as PurchaseRecord[]);
      } else {
        if (role !== 'ADMIN') {
          alert('Replacing entire database requires Admin role.');
          return;
        }
        replacePurchaseRecords(transformedRecords as PurchaseRecord[]);
      }
    } else if (type === 'GSTR3B_CONSOLIDATED') {
      transformedRecords = transformParsedConsolidated3B(workingRows);
      rowCount = transformedRecords.length;

      if (mode === 'APPEND') {
        appendConsolidated3bData(transformedRecords as Consolidated3BMonthRow[]);
      } else {
        replaceConsolidated3bData(transformedRecords as Consolidated3BMonthRow[]);
      }
    }

    setImportResult({
      success: true,
      message: `Successfully processed and ${mode.toLowerCase()}ed ${rowCount} records into ${type} register!`,
      count: rowCount,
      warnings: [],
      sampleData: transformedRecords.slice(0, 5),
    });

    setShowMappingModal(false);
    setStagedFile(null);
  };

  // Handles Multi-Sheet workbook or individual staging files for Combined Import
  const handleCombinedFileChange = async (e: React.ChangeEvent<HTMLInputElement>, subType: 'PURCHASE' | 'SALES' | 'BOTH') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setImportResult(null);

    try {
      if (subType === 'BOTH') {
        const res = await parseCombinedWorkbook(file);
        if (res.metadata) {
          applyExtractedCompanySettings(res.metadata);
        }
        
        let msg = "Workbook successfully parsed! ";
        let success = false;
        
        if (res.purchases && res.purchases.length > 0) {
          setStagedPurchases(res.purchases);
          setStagedPurchasesFileName(file.name + " (PURCHASE Sheet)");
          msg += `Found ${res.purchases.length} purchase invoices. `;
          success = true;
        }
        if (res.sales && res.sales.length > 0) {
          setStagedSales(res.sales);
          setStagedSalesFileName(file.name + " (SALES Sheet)");
          msg += `Found ${res.sales.length} monthly sales records. `;
          success = true;
        }

        if (success) {
          setImportResult({
            success: true,
            message: msg + "Ready to validate and save to client dossier.",
            count: (res.purchases?.length || 0) + (res.sales?.length || 0),
            warnings: [],
          });
        } else {
          setImportResult({
            success: false,
            message: "No recognized 'PURCHASE' or 'SALES' sheets found in the uploaded workbook. Please download the Combined template to see correct sheet name conventions.",
            count: 0,
            warnings: res.allSheetNames ? [`Detected sheets in file: ${res.allSheetNames.join(', ')}`] : [],
          });
        }
      } else if (subType === 'PURCHASE') {
        const { data, extractedMetadata } = await parseExcelFile(file, 'PURCHASE');
        if (extractedMetadata) {
          applyExtractedCompanySettings(extractedMetadata);
        }
        const parsed = transformParsedPurchase(data);
        setStagedPurchases(parsed);
        setStagedPurchasesFileName(file.name);
        setImportResult({
          success: true,
          message: `Staged ${parsed.length} purchase invoices. Now upload your sales records or click Ingest below!`,
          count: parsed.length,
          warnings: [],
        });
      } else if (subType === 'SALES') {
        const { data, extractedMetadata } = await parseExcelFile(file, 'SALES');
        if (extractedMetadata) {
          applyExtractedCompanySettings(extractedMetadata);
        }
        const parsed = transformParsedSales(data);
        setStagedSales(parsed);
        setStagedSalesFileName(file.name);
        setImportResult({
          success: true,
          message: `Staged ${parsed.length} monthly sales records. Ready to validate and ingest!`,
          count: parsed.length,
          warnings: [],
        });
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err?.message || 'Error parsing combined files.',
        count: 0,
        warnings: [],
      });
    } finally {
      setIsProcessing(false);
      if (combinedPurchaseInputRef.current) combinedPurchaseInputRef.current.value = '';
      if (combinedSalesInputRef.current) combinedSalesInputRef.current.value = '';
      if (combinedBothInputRef.current) combinedBothInputRef.current.value = '';
    }
  };

  const executeCombinedIngestion = () => {
    if (!stagedPurchases && !stagedSales) {
      alert("Please stage at least some Purchase invoices or Sales months first!");
      return;
    }
    
    // Call the newly implemented context function directly for isolated client data entry!
    importCombinedPurchaseAndSales(stagedPurchases, stagedSales, activeClientId, importMode);
    
    const pCount = stagedPurchases?.length || 0;
    const sCount = stagedSales?.length || 0;
    
    setImportResult({
      success: true,
      message: `Successfully validated and saved unified datasets! Registered ${pCount} purchases and ${sCount} sales months directly inside [File #${activeClient.fileNo}] ${activeClient.companyName}.`,
      count: pCount + sCount,
      warnings: [],
    });

    // Clear staging after successful ingestion so user starts fresh
    setStagedPurchases(null);
    setStagedSales(null);
    setStagedPurchasesFileName(null);
    setStagedSalesFileName(null);
  };

  const handleApplyCustomMapping = () => {
    if (!stagedFile) return;
    executeIngestion(stagedFile.rawRows, stagedFile.suggestedType, importMode, columnMapping);
  };

  const handleDownloadMasterTemplate = (type: ExcelType) => {
    if (type === 'COMBINED_PURCHASE_SALES') {
      generateCombinedPurchaseSalesTemplate(activeClient.companyName, activeClient.financialYear);
    } else {
      generateBlankExcelTemplate(type);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <span>EXCEL IMPORT & ADVANCED RECONCILIATION</span>
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              UNIFIED MULTI-CLIENT DATA ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Import your permanent Excel formats, upload combined dual-sheet workbooks, or execute custom GSTR-2A and Consolidated 3B spreadsheets under completely isolated client dossiers.
          </p>
        </div>

        {/* Master Template Download Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadMasterTemplate(activeType)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Download {activeType === 'COMBINED_PURCHASE_SALES' ? 'Combined' : activeType} Template</span>
          </button>
        </div>
      </div>

      {/* Dynamic 5-Client Dossier Selector Dashboard */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              CLIENT DOSSIERS DIRECT ACCESS (Choose Target Client to Test Isolation)
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            Isolated Datasets
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {clients.map((c) => {
            const isActive = c.id === activeClientId;
            const { purchasesCount, salesCount } = getClientRecordCounts(c.id);
            return (
              <div
                key={`client-card-${c.id}`}
                onClick={() => switchClient(c.id)}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between h-[105px] relative ${
                  isActive
                    ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {isActive && (
                  <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white flex items-center gap-0.5">
                    <CheckCircle2 className="w-2 h-2" /> ACTIVE
                  </span>
                )}
                <div>
                  <div className="text-[10px] font-mono font-bold text-slate-400">
                    FILE #{c.fileNo}
                  </div>
                  <div className="text-[11px] font-bold text-slate-900 truncate mt-0.5" title={c.companyName}>
                    {c.companyName}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">
                    GSTIN: {c.gstin}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2 text-[10px]">
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    Purchases: <strong className="text-blue-700">{purchasesCount}</strong>
                  </span>
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-slate-400" />
                    Sales: <strong className="text-emerald-700">{salesCount}m</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selector for 6 Excel Formats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
        {/* Card 0: Combined Ingestion */}
        <div
          onClick={() => {
            setActiveType('COMBINED_PURCHASE_SALES');
            setImportResult(null);
          }}
          className={`p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            activeType === 'COMBINED_PURCHASE_SALES'
              ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs text-blue-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Combined Import
            </span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">
              ⚡ Unified
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Ingest Purchase & Sales "ek saath" from 1 workbook or stage sequentially.
          </p>
        </div>

        {/* Card 1: Purchase */}
        <div
          onClick={() => {
            setActiveType('PURCHASE');
            setImportResult(null);
          }}
          className={`p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            activeType === 'PURCHASE'
              ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs text-slate-900">1. Purchase Excel</span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-100 text-slate-700">
              19 Cols
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Inward invoices, parties, GSTIN, invoice date, taxable, tax heads, POS, CFS.
          </p>
        </div>

        {/* Card 2: Sales */}
        <div
          onClick={() => {
            setActiveType('SALES');
            setImportResult(null);
          }}
          className={`p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            activeType === 'SALES'
              ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs text-slate-900">2. Sales Excel</span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-100 text-slate-700">
              10 Cols
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Monthly outward supplies, exempt sales, IGST, CGST, SGST, CESS, total sales.
          </p>
        </div>

        {/* Card 3: ITC */}
        <div
          onClick={() => {
            setActiveType('ITC');
            setImportResult(null);
          }}
          className={`p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            activeType === 'ITC'
              ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs text-slate-900">3. ITC Excel</span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-100 text-slate-700">
              11 Cols
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Monthly ITC availed, tax breakdown, Opening & Closing ITC balance for all heads.
          </p>
        </div>

        {/* Card 4: GSTR-2A vs Books Reconciliation */}
        <div
          onClick={() => {
            setActiveType('GSTR2A_RECONCILIATION');
            setImportResult(null);
          }}
          className={`p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            activeType === 'GSTR2A_RECONCILIATION'
              ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs text-slate-900">4. GSTR-2A Recon</span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              32 Cols
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Image 1: Books record + GSTR-2A portal data + Automatic Difference matching.
          </p>
        </div>

        {/* Card 5: GSTR-3B Consolidated Offset */}
        <div
          onClick={() => {
            setActiveType('GSTR3B_CONSOLIDATED');
            setImportResult(null);
          }}
          className={`p-3 rounded-xl border cursor-pointer transition shadow-xs ${
            activeType === 'GSTR3B_CONSOLIDATED'
              ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs text-slate-900">5. 3B Offset</span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
              33 Cols
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Image 2 Layout: Outward & RCM, Cash vs Credit Offset & ITC eligibility.
          </p>
        </div>
      </div>

      {/* Mode Control for Ingestion */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Choose Ingestion Mode for {activeType === 'COMBINED_PURCHASE_SALES' ? 'Combined Ingest' : activeType}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Select whether uploaded rows should be continuously appended to your register or replace it entirely.
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-300 text-xs shrink-0">
            <button
              onClick={() => setImportMode('APPEND')}
              className={`px-3 py-1.5 rounded font-semibold transition ${
                importMode === 'APPEND'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + APPEND / ADD (Continuous)
            </button>
            <button
              onClick={() => {
                if (role !== 'ADMIN') {
                  alert('Only Admin can overwrite full registers.');
                  return;
                }
                setImportMode('REPLACE');
              }}
              className={`px-3 py-1.5 rounded font-semibold transition ${
                importMode === 'REPLACE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚠ REPLACE ALL (Clean Slate)
            </button>
          </div>
        </div>

        {/* Dynamic Display for COMBINED PURCHASE SALES Ingestion Tab */}
        {activeType === 'COMBINED_PURCHASE_SALES' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Drop Unified Dual Sheet Excel */}
              <div className="border border-slate-200 rounded-xl p-5 bg-blue-50/20 flex flex-col justify-between h-[210px]">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Option A: 2-Sheet Unified Excel</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Drag and drop a single master Excel containing BOTH 'PURCHASE' and 'SALES' sheets. It will auto-detect and parse both simultaneously!
                  </p>
                </div>

                <div
                  onClick={() => combinedBothInputRef.current?.click()}
                  className="border border-dashed border-blue-300 hover:border-blue-600 bg-white p-4 rounded-xl text-center cursor-pointer transition group flex flex-col items-center justify-center h-28"
                >
                  <input
                    type="file"
                    ref={combinedBothInputRef}
                    onChange={(e) => handleCombinedFileChange(e, 'BOTH')}
                    accept=".xlsx, .xls"
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 text-blue-600 mb-1 group-hover:scale-105 transition" />
                  <span className="text-xs font-bold text-slate-800">Upload 2-Sheet Workbook</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Accepts Master xlsx template</span>
                </div>
              </div>

              {/* Option B: Sequential Step-by-Step staging */}
              <div className="border border-slate-200 rounded-xl p-5 bg-emerald-50/20 flex flex-col justify-between h-[210px]">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Option B: Sequential Staging (Hindi Flow)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pahle purchase add kare, tab sales add kare. Ingest and Validate par click karne par dono ek saath client me save ho jayenge.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 h-28">
                  {/* Purchase Stage */}
                  <div
                    onClick={() => combinedPurchaseInputRef.current?.click()}
                    className={`border border-dashed p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition group ${
                      stagedPurchases
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'border-slate-300 hover:border-emerald-500 bg-white'
                    }`}
                  >
                    <input
                      type="file"
                      ref={combinedPurchaseInputRef}
                      onChange={(e) => handleCombinedFileChange(e, 'PURCHASE')}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <Upload className={`w-5 h-5 mb-1 group-hover:scale-105 transition ${stagedPurchases ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-bold">1. Purchase File</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 truncate max-w-full">
                      {stagedPurchases ? `✅ (${stagedPurchases.length} Rows)` : 'Upload Purchase'}
                    </span>
                  </div>

                  {/* Sales Stage */}
                  <div
                    onClick={() => combinedSalesInputRef.current?.click()}
                    className={`border border-dashed p-3 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition group ${
                      stagedSales
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'border-slate-300 hover:border-emerald-500 bg-white'
                    }`}
                  >
                    <input
                      type="file"
                      ref={combinedSalesInputRef}
                      onChange={(e) => handleCombinedFileChange(e, 'SALES')}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <Upload className={`w-5 h-5 mb-1 group-hover:scale-105 transition ${stagedSales ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-bold">2. Sales File</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 truncate max-w-full">
                      {stagedSales ? `✅ (${stagedSales.length} m)` : 'Upload Sales'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion staging indicator and main trigger */}
            {(stagedPurchases || stagedSales) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-950">
                    STAGED DATA VERIFICATION SUMMARY (Ready to Save to Client Dossier)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Purchase Stage summary */}
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2">
                      <span className="flex items-center gap-1.5 text-blue-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Purchase Data
                      </span>
                      <span className="font-mono bg-blue-50 text-blue-800 text-[10px] px-2 py-0.5 rounded">
                        {stagedPurchases ? `${stagedPurchases.length} invoices` : '0 invoices'}
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-600 text-[11px]">
                      <div>File Name: <span className="font-mono text-slate-900 truncate max-w-xs inline-block align-bottom">{stagedPurchasesFileName || '—'}</span></div>
                      <div>Total Taxable: <strong className="text-slate-900">₹{(stagedPurchases?.reduce((acc, r) => acc + (r.taxableValue || 0), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                      <div>Total GST Tax: <strong className="text-emerald-700">₹{(stagedPurchases?.reduce((acc, r) => acc + (r.tax || 0), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                    </div>
                  </div>

                  {/* Sales Stage summary */}
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2">
                      <span className="flex items-center gap-1.5 text-emerald-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Sales Data
                      </span>
                      <span className="font-mono bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded">
                        {stagedSales ? `${stagedSales.length} months` : '0 months'}
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-600 text-[11px]">
                      <div>File Name: <span className="font-mono text-slate-900 truncate max-w-xs inline-block align-bottom">{stagedSalesFileName || '—'}</span></div>
                      <div>Total Turnover: <strong className="text-slate-900">₹{(stagedSales?.reduce((acc, r) => acc + (r.taxableSales || 0), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                      <div>Total GST Liability: <strong className="text-rose-700">₹{(stagedSales?.reduce((acc, r) => acc + (r.totalTax || 0), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-100/50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-900 font-medium">
                  Saving this data will apply it directly to <strong className="text-slate-950">File #{activeClient.fileNo}: {activeClient.companyName}</strong>. 
                  Any existing matching reports and GSTR-3B offsets will recalculate instantly!
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setStagedPurchases(null);
                      setStagedSales(null);
                      setStagedPurchasesFileName(null);
                      setStagedSalesFileName(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold transition text-xs"
                  >
                    Reset Staged Files
                  </button>
                  <button
                    onClick={executeCombinedIngestion}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow-md hover:scale-[1.02] transform"
                  >
                    <span>Validate &amp; Ingest both to File #{activeClient.fileNo} 🚀</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Upload Dropzone for standard individual files */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 p-8 rounded-2xl text-center cursor-pointer transition group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform border border-blue-200">
              <Upload className="w-6 h-6" />
            </div>

            <div className="font-bold text-sm text-slate-900">
              Click to upload or drag &amp; drop {activeType} Excel (.xlsx, .xls, .csv)
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Accepts your permanent formats or your own custom GSTR-2A / 3B Excel files.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Smart Header Auto-Detection</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                <Settings2 className="w-3.5 h-3.5" />
                <span>Flexible Column Mapping Included</span>
              </span>
            </div>
          </div>
        )}

        {/* Loading state spinner */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-xl text-xs text-blue-700 border border-blue-200">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span className="font-medium">Validating headers and reading records from Excel file...</span>
          </div>
        )}

        {/* Success or Error Report */}
        {importResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-3 ${
              importResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-2 font-bold">
              {importResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{importResult.message}</span>
            </div>

            {importResult.warnings.length > 0 && (
              <div className="text-[11px] text-amber-800 pl-6 space-y-1">
                <div className="font-semibold">Format notes:</div>
                {importResult.warnings.map((w, i) => (
                  <div key={i}>• {w}</div>
                ))}
              </div>
            )}

            {/* Quick Preview of Parsed Sample Rows */}
            {importResult.sampleData && importResult.sampleData.length > 0 && (
              <div className="mt-3 bg-white p-3 rounded-lg border border-slate-200 text-slate-800">
                <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-blue-600" />
                  <span>Preview of First Imported Rows:</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50">
                        <th className="p-1.5">Period</th>
                        <th className="p-1.5">Party / Description</th>
                        <th className="p-1.5">Invoice / Ref</th>
                        <th className="p-1.5 text-right">Taxable</th>
                        <th className="p-1.5 text-right">Tax</th>
                        <th className="p-1.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {importResult.sampleData.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-1.5 text-slate-600">{row.period || row.month || '—'}</td>
                          <td className="p-1.5 text-slate-900 font-sans font-medium truncate max-w-[180px]">{row.party || row.month || '—'}</td>
                          <td className="p-1.5 text-blue-700 font-semibold">{row.invoiceNo || row.invoiceRef || '—'}</td>
                          <td className="p-1.5 text-right text-slate-800">{row.taxableValue?.toLocaleString('en-IN') || row.taxableSales?.toLocaleString('en-IN') || row.outwardNrc?.toLocaleString('en-IN') || '—'}</td>
                          <td className="p-1.5 text-right text-emerald-700 font-semibold">{row.tax?.toLocaleString('en-IN') || row.totalTax?.toLocaleString('en-IN') || row.outwardCgst?.toLocaleString('en-IN') || '—'}</td>
                          <td className="p-1.5 text-center font-sans">
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[9px] text-slate-700 font-medium">
                              {row.status || 'Imported'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Custom Column Mapping Modal */}
      {showMappingModal && stagedFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Map Excel Columns to Application Schema
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    File: <span className="font-mono text-slate-800 font-semibold">{stagedFile.fileName}</span> ({stagedFile.rawRows.length} rows detected)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMappingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  We detected columns in your file that differ from the standard master template. Match each application field to your Excel file column below.
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 text-[11px] font-bold text-slate-600 px-3 py-1">
                  <span className="col-span-5">Application Target Field</span>
                  <span className="col-span-1 text-center">➔</span>
                  <span className="col-span-6">Your Excel Column Header</span>
                </div>

                {getTargetFields(stagedFile.suggestedType).map((field) => (
                  <div
                    key={field.key}
                    className="grid grid-cols-12 items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs"
                  >
                    <div className="col-span-5 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">{field.label}</span>
                      {field.required && (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>

                    <div className="col-span-1 text-center text-slate-400">➔</div>

                    <div className="col-span-6">
                      <select
                        value={columnMapping[field.key] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setColumnMapping((prev) => ({ ...prev, [field.key]: val }));
                        }}
                        className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      >
                        <option value="">-- Do Not Import / Not in File --</option>
                        {stagedFile.headers.map((h, idx) => (
                          <option key={idx} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Mode: <span className="font-semibold text-blue-700">{importMode}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCustomMapping}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition shadow-xs"
                >
                  <span>Apply Mapping & Import</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
