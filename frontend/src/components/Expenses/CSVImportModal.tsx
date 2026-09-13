import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  X,
  Database,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../UI/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { trackEvent } from '../../services/analytics';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CSVImportModal({ isOpen, onClose }: CSVImportModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Preview Response State
  const [previewData, setPreviewData] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [rowFilter, setRowFilter] = useState<'all' | 'valid' | 'duplicate' | 'invalid'>('all');

  // Summary State
  const [importSummary, setImportSummary] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setCsvText('');
    setPreviewData(null);
    setColumnMapping({});
    setSkipDuplicates(true);
    setRowFilter('all');
    setImportSummary(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Sample CSV Download Generator
  const handleDownloadSample = () => {
    const sampleCSV = `Date,Merchant / Title,Amount,Type,Category,Wallet,Payment Method,Tags,Notes
2026-09-01,Starbucks Coffee,15.50,EXPENSE,Food,Main Account,Card,coffee;work,Morning espresso
2026-09-02,Client Payment,4500.00,INCOME,Income,Main Account,Bank Transfer,freelance,Invoice #1042
2026-09-03,Whole Foods Market,120.75,EXPENSE,Food,Cash Pouch,Cash,groceries,Organic produce
2026-09-04,Apple Store Laptop,2499.00,EXPENSE,Electronics,Main Account,Credit Card,tech,Macbook upgrade`;

    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monerva_sample_import.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // File Upload Handlers
  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvText(content || '');
      fetchPreview(content || '', selectedFile.name);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const fetchPreview = async (text: string, fileName?: string, customMap?: Record<string, string>) => {
    setIsLoadingPreview(true);
    try {
      const res = await api.previewCSVImport({
        csvText: text,
        columnMapping: customMap || columnMapping
      });

      setPreviewData(res);
      setColumnMapping(res.columnMapping || {});
      setStep(2);
    } catch (err: any) {
      showToast(err.message || 'Failed to parse CSV file', 'error');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleMappingChange = (fieldKey: string, selectedHeader: string) => {
    const newMap = { ...columnMapping, [fieldKey]: selectedHeader };
    setColumnMapping(newMap);
    fetchPreview(csvText, file?.name, newMap);
  };

  // Commit Import
  const handleCommit = async () => {
    if (!previewData || !previewData.rows) return;
    setIsCommitting(true);

    try {
      const res = await api.commitCSVImport({
        rows: previewData.rows,
        skipDuplicates
      });

      setImportSummary(res.summary);
      setStep(4);

      trackEvent('csv_import_completed', {
        total_rows: res.summary.total,
        imported_rows: res.summary.imported,
        skipped_duplicates: res.summary.duplicates,
      });

      // Invalidate relevant React Query caches
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['trend'] });
      queryClient.invalidateQueries({ queryKey: ['categories-pie'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });

      showToast(`Successfully imported ${res.summary.imported} transactions!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to commit CSV import', 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  // Filtered rows for preview table
  const displayRows = (previewData?.rows || []).filter((r: any) => {
    if (rowFilter === 'valid') return r.status === 'valid';
    if (rowFilter === 'duplicate') return r.status === 'duplicate';
    if (rowFilter === 'invalid') return r.status === 'invalid';
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-modal-title"
    >
      <div className="bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 id="csv-modal-title" className="text-lg font-bold">
                Import Transactions from CSV
              </h3>
              <p className="text-xs text-gray-400">
                Upload your bank statement or transaction export safely.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.04] dark:border-white/[0.04] text-xs font-semibold">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-emerald-500 font-bold' : 'text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">1</span>
            Upload File
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-emerald-500 font-bold' : 'text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">2</span>
            Column Mapping & Preview
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-emerald-500 font-bold' : 'text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">3</span>
            Confirmation
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className={`flex items-center gap-2 ${step === 4 ? 'text-emerald-500 font-bold' : 'text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">4</span>
            Results
          </div>
        </div>

        {/* Modal Body / Step Switcher */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-black/15 dark:border-white/15 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-black/[0.01] dark:bg-white/[0.01]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
                />
                <FileText className="w-12 h-12 text-emerald-500 mb-3" />
                <h4 className="text-base font-bold">Drag & drop your CSV file here</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  Supports standard CSV exports from bank statements, Excel, Google Sheets, or budgeting software.
                </p>
                <button
                  type="button"
                  className="btn-premium btn-premium-primary py-2 px-5 text-xs font-semibold mt-4 cursor-pointer"
                >
                  Browse CSV File
                </button>
              </div>

              {/* Sample Template & Help */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h5 className="text-xs font-bold">Need a sample CSV file?</h5>
                    <p className="text-[11px] text-gray-400">Download our formatted template to populate your records.</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadSample}
                  className="btn-premium py-1.5 px-3.5 text-xs gap-1.5 cursor-pointer border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Download Sample CSV
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING & PREVIEW */}
          {step === 2 && previewData && (
            <div className="space-y-5">
              {/* Column Mapping Controls */}
              <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" /> Map CSV Columns to Monerva Fields
                  </h4>
                  <span className="text-[11px] text-gray-400">
                    Detected {previewData.detectedHeaders.length} CSV Columns
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Date *</label>
                    <select
                      value={columnMapping.date || ''}
                      onChange={(e) => handleMappingChange('date', e.target.value)}
                      className="input-premium py-1 px-2.5 text-xs w-full cursor-pointer"
                    >
                      <option value="">-- Select Column --</option>
                      {previewData.detectedHeaders.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Title / Merchant *</label>
                    <select
                      value={columnMapping.title || ''}
                      onChange={(e) => handleMappingChange('title', e.target.value)}
                      className="input-premium py-1 px-2.5 text-xs w-full cursor-pointer"
                    >
                      <option value="">-- Select Column --</option>
                      {previewData.detectedHeaders.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Amount *</label>
                    <select
                      value={columnMapping.amount || ''}
                      onChange={(e) => handleMappingChange('amount', e.target.value)}
                      className="input-premium py-1 px-2.5 text-xs w-full cursor-pointer"
                    >
                      <option value="">-- Select Column --</option>
                      {previewData.detectedHeaders.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Type (Expense/Income)</label>
                    <select
                      value={columnMapping.type || ''}
                      onChange={(e) => handleMappingChange('type', e.target.value)}
                      className="input-premium py-1 px-2.5 text-xs w-full cursor-pointer"
                    >
                      <option value="">-- Auto-detect / Default --</option>
                      {previewData.detectedHeaders.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Category</label>
                    <select
                      value={columnMapping.category || ''}
                      onChange={(e) => handleMappingChange('category', e.target.value)}
                      className="input-premium py-1 px-2.5 text-xs w-full cursor-pointer"
                    >
                      <option value="">-- Auto-detect / Default --</option>
                      {previewData.detectedHeaders.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Wallet / Account</label>
                    <select
                      value={columnMapping.wallet || ''}
                      onChange={(e) => handleMappingChange('wallet', e.target.value)}
                      className="input-premium py-1 px-2.5 text-xs w-full cursor-pointer"
                    >
                      <option value="">-- Auto-detect / Default --</option>
                      {previewData.detectedHeaders.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Payment Method</label>
                    <select
                      value={columnMapping.paymentMethod || ''}
                      onChange={(e) => handleMappingChange('paymentMethod', e.target.value)}
                      className="input-premium py-1 px-2.5 text-xs w-full cursor-pointer"
                    >
                      <option value="">-- Select Column --</option>
                      {previewData.detectedHeaders.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Tags / Notes</label>
                    <select
                      value={columnMapping.notes || ''}
                      onChange={(e) => handleMappingChange('notes', e.target.value)}
                      className="input-premium py-1 px-2.5 text-xs w-full cursor-pointer"
                    >
                      <option value="">-- Select Column --</option>
                      {previewData.detectedHeaders.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Controls & Duplicate Handling */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRowFilter('all')}
                    className={`py-1 px-3 rounded-full text-xs font-semibold cursor-pointer border ${
                      rowFilter === 'all'
                        ? 'bg-black/10 dark:bg-white/10 border-black/20 dark:border-white/20'
                        : 'border-transparent text-gray-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    All ({previewData.totalRows})
                  </button>
                  <button
                    onClick={() => setRowFilter('valid')}
                    className={`py-1 px-3 rounded-full text-xs font-semibold cursor-pointer border ${
                      rowFilter === 'valid'
                        ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                        : 'border-transparent text-emerald-500/70 hover:text-emerald-500'
                    }`}
                  >
                    Valid ({previewData.validRowsCount})
                  </button>
                  <button
                    onClick={() => setRowFilter('duplicate')}
                    className={`py-1 px-3 rounded-full text-xs font-semibold cursor-pointer border ${
                      rowFilter === 'duplicate'
                        ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                        : 'border-transparent text-amber-500/70 hover:text-amber-500'
                    }`}
                  >
                    Duplicates ({previewData.duplicateRowsCount})
                  </button>
                  <button
                    onClick={() => setRowFilter('invalid')}
                    className={`py-1 px-3 rounded-full text-xs font-semibold cursor-pointer border ${
                      rowFilter === 'invalid'
                        ? 'bg-red-500/20 text-red-500 border-red-500/30'
                        : 'border-transparent text-red-500/70 hover:text-red-500'
                    }`}
                  >
                    Invalid ({previewData.invalidRowsCount})
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Skip duplicate transactions (Recommended)</span>
                </label>
              </div>

              {/* Preview Rows Table */}
              <div className="border border-black/[0.08] dark:border-white/[0.08] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold border-b border-black/[0.05] dark:border-white/[0.05]">
                    <tr>
                      <th className="p-2.5 w-12 text-center">#</th>
                      <th className="p-2.5 w-24">Status</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Merchant / Title</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Wallet</th>
                      <th className="p-2.5">Details / Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                    {displayRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-gray-400">
                          No transactions found matching filter.
                        </td>
                      </tr>
                    ) : (
                      displayRows.map((row: any) => (
                        <tr key={row.rowIndex} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="p-2.5 text-center text-gray-400 font-mono">{row.rowIndex}</td>
                          <td className="p-2.5">
                            {row.status === 'valid' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            )}
                            {row.status === 'duplicate' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3" /> Duplicate
                              </span>
                            )}
                            {row.status === 'invalid' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 font-bold flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3" /> Invalid
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-medium">{row.data.date || '-'}</td>
                          <td className="p-2.5 font-semibold">{row.data.title || '-'}</td>
                          <td className="p-2.5 text-right font-bold font-sans">
                            {row.data.amount !== null ? `$${row.data.amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-2.5 text-gray-400">{row.data.categoryName}</td>
                          <td className="p-2.5 text-gray-400">{row.data.walletName}</td>
                          <td className="p-2.5 text-[11px]">
                            {row.errors.length > 0 && (
                              <span className="text-red-500 font-medium">{row.errors.join(', ')}</span>
                            )}
                            {row.duplicateDetails && (
                              <span className="text-amber-500 font-medium">{row.duplicateDetails}</span>
                            )}
                            {row.warnings.length > 0 && row.errors.length === 0 && !row.duplicateDetails && (
                              <span className="text-gray-400 italic">{row.warnings.join(', ')}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRMATION */}
          {step === 3 && previewData && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold">Confirm Database Write</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                  Please review the summary below before executing the transaction batch import into your workspace.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto">
                <div className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-xs text-gray-400 block">Total Rows</span>
                  <span className="text-2xl font-bold mt-1 block">{previewData.totalRows}</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                  <span className="text-xs font-medium block">To Import</span>
                  <span className="text-2xl font-bold mt-1 block">
                    {skipDuplicates ? previewData.validRowsCount : previewData.validRowsCount + previewData.duplicateRowsCount}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <span className="text-xs font-medium block">Skipped Duplicates</span>
                  <span className="text-2xl font-bold mt-1 block">
                    {skipDuplicates ? previewData.duplicateRowsCount : 0}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
                  <span className="text-xs font-medium block">Invalid Rows</span>
                  <span className="text-2xl font-bold mt-1 block">{previewData.invalidRowsCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: RESULTS */}
          {step === 4 && importSummary && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-emerald-500">CSV Import Completed!</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Your transactions have been committed and wallet balances updated.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto">
                <div className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                  <span className="text-xs text-gray-400 block">Total Processed</span>
                  <span className="text-2xl font-bold mt-1 block">{importSummary.total}</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                  <span className="text-xs font-medium block">Imported</span>
                  <span className="text-2xl font-bold mt-1 block">{importSummary.imported}</span>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                  <span className="text-xs font-medium block">Duplicates Skipped</span>
                  <span className="text-2xl font-bold mt-1 block">{importSummary.duplicates}</span>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
                  <span className="text-xs font-medium block">Invalid Skipped</span>
                  <span className="text-2xl font-bold mt-1 block">{importSummary.invalid}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation */}
        <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep((prev) => (prev - 1) as any)}
              disabled={isCommitting}
              className="btn-premium py-2 px-4 text-xs font-semibold cursor-pointer border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={previewData?.validRowsCount === 0 && previewData?.duplicateRowsCount === 0}
                className="btn-premium btn-premium-primary py-2 px-5 text-xs font-semibold cursor-pointer flex items-center gap-2"
              >
                Continue to Confirmation <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleCommit}
                disabled={isCommitting}
                className="btn-premium btn-premium-primary py-2.5 px-6 text-xs font-semibold cursor-pointer flex items-center gap-2"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Importing Transactions...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Confirm & Import
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button
                onClick={handleClose}
                className="btn-premium btn-premium-primary py-2 px-6 text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CSVImportModal;
