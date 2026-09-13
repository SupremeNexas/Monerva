import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  Camera,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  HelpCircle,
  Users,
  ArrowLeft,
  UserCheck
} from 'lucide-react';
import Modal from '../UI/Modal';
import { useToast } from '../UI/Toast';
import { PaywallModal } from '../UI/PaywallModal';
import { api } from '../../api/client';
import useAuthStore from '../../store/authStore';
import {
  ScanBillResponse,
  ScannedBillItem,
  Category,
  Wallet,
  Group,
  GroupDetails
} from '../../types';
import { trackEvent } from '../../services/analytics';

interface BillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ScanState = 'IDLE' | 'IMAGE_SELECTED' | 'SCANNING' | 'REVIEW' | 'SPLIT_CONFIG' | 'ERROR';
type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export default function BillScannerModal({ isOpen, onClose }: BillScannerModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
    enabled: isOpen
  });
  const { data: wallets = [] } = useQuery<Wallet[]>({
    queryKey: ['wallets'],
    queryFn: () => api.request('/expenses/wallets'),
    enabled: isOpen
  });
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
    enabled: isOpen
  });

  // Core scan state
  const [scanState, setScanState] = useState<ScanState>('IDLE');
  const [showPaywall, setShowPaywall] = useState(false);
  const isPro = user?.plan === 'PRO' || user?.email?.toLowerCase() === 'demo@example.com';
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [scanResponse, setScanResponse] = useState<ScanBillResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  // Review form state
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [subtotal, setSubtotal] = useState('');
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ScannedBillItem[]>([]);

  // Split state
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [paidByUserId, setPaidByUserId] = useState('');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [sharesMap, setSharesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  useEffect(() => {
    if (wallets.length > 0 && !walletId) setWalletId(wallets[0].id);
  }, [wallets, walletId]);

  const handleClose = () => {
    if (isSubmitting) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null); setPreviewUrl(null); setScanResponse(null);
    setErrorMessage(null); setScanState('IDLE'); setIsSubmitting(false);
    setDuplicateConfirmed(false); resetSplitState();
    onClose();
  };

  const resetSplitState = () => {
    setSelectedGroupId(''); setGroupDetails(null); setSelectedParticipantIds([]);
    setPaidByUserId(''); setSplitMethod('equal');
    setExactAmounts({}); setPercentages({}); setSharesMap({});
  };

  const handleMerchantChange = (v: string) => { setMerchant(v); setDuplicateConfirmed(false); };
  const handleAmountChange = (v: string) => { setTotalAmount(v); setDuplicateConfirmed(false); };
  const handleDateChange = (v: string) => { setDate(v); setDuplicateConfirmed(false); };

  const validateAndSelectFile = (file: File): boolean => {
    if (!isPro) {
      setShowPaywall(true);
      return false;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase()) && !ALLOWED_EXTENSIONS.includes(ext)) {
      showToast('Unsupported file type. Please upload a JPG, PNG, or WEBP image.', 'error'); return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast('File size exceeds the 5MB limit. Please select a smaller image.', 'error'); return false;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file));
    setScanState('IMAGE_SELECTED'); setErrorMessage(null);
    return true;
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) validateAndSelectFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) validateAndSelectFile(e.target.files[0]);
  };
  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null); setPreviewUrl(null); setScanResponse(null);
    setErrorMessage(null); setScanState('IDLE'); setDuplicateConfirmed(false); resetSplitState();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleScanBill = async () => {
    if (!selectedFile) return;
    if (!isPro) {
      setShowPaywall(true);
      trackEvent('receipt_scan_failed', { error_type: 'paywall_required' });
      return;
    }
    setScanState('SCANNING'); setErrorMessage(null); setDuplicateConfirmed(false);
    const startTime = Date.now();
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'unknown';
    trackEvent('receipt_scan_started', { file_format: ext });

    try {
      const formData = new FormData();
      formData.append('receipt', selectedFile);
      const response: ScanBillResponse = await api.scanBill(formData);
      if (response.success && response.draft) {
        setScanResponse(response);
        const d = response.draft;
        setMerchant(d.merchant || ''); setDescription(d.description || '');
        setTotalAmount(d.total || ''); setDate(d.date || '');
        setCurrency(d.currency || 'USD'); setSubtotal(d.subtotal || '');
        setTax(d.tax || ''); setTip(d.tip || '');
        setPaymentMethod(d.paymentMethod || 'UPI'); setLocation(d.location || '');
        setNotes(''); setItems(d.items || []);
        if (d.categoryId) setCategoryId(d.categoryId);
        else if (d.category && categories.length > 0) {
          const m = categories.find(c => c.name.toLowerCase() === d.category?.toLowerCase());
          setCategoryId(m ? m.id : '');
        } else setCategoryId('');
        setScanState('REVIEW');
        showToast('Receipt scanned successfully! Review extracted data.', 'success');

        const duration = Date.now() - startTime;
        trackEvent('receipt_scan_completed', {
          duration_ms: duration,
          item_count: d.items?.length || 0,
          has_duplicate_warning: Boolean(response.duplicateWarning?.possibleDuplicate),
        });
      } else {
        setErrorMessage(response.error || 'Failed to analyze receipt image');
        setScanState('ERROR'); showToast(response.error || 'Failed to analyze receipt', 'error');
        trackEvent('receipt_scan_failed', { error_type: 'server_error' });
      }
    } catch (err: any) {
      if (err?.message === 'PRO_REQUIRED' || err?.message?.includes('Monerva Pro')) {
        setShowPaywall(true);
        setScanState('IDLE');
        trackEvent('receipt_scan_failed', { error_type: 'paywall_required' });
        return;
      }
      const msg = err.message === 'UNAVAILABLE' ? 'Receipt scanning is temporarily unavailable.' : (err.message || 'Failed to connect');
      setErrorMessage(msg); setScanState('ERROR'); showToast(msg, 'error');
      trackEvent('receipt_scan_failed', { error_type: 'server_error' });
    }
  };

  // Line item handlers
  const handleItemChange = (idx: number, field: keyof ScannedBillItem, val: any) => {
    const updated = [...items]; const item = { ...updated[idx] };
    if (field === 'name') item.name = val;
    else if (field === 'quantity') item.quantity = val === '' ? null : parseInt(val);
    else if (field === 'unitPrice') item.unitPrice = val === '' ? null : parseFloat(val);
    else if (field === 'total') item.total = val === '' ? null : parseFloat(val);
    if ((field === 'quantity' || field === 'unitPrice') && item.quantity && item.unitPrice) item.total = item.quantity * item.unitPrice;
    updated[idx] = item; setItems(updated);
  };
  const handleAddItem = () => setItems([...items, { name: '', quantity: 1, unitPrice: null, total: null }]);
  const handleRemoveItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  // Personal expense creation
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant.trim()) { showToast('Merchant or Expense Title is required.', 'error'); return; }
    const numAmt = parseFloat(totalAmount);
    if (isNaN(numAmt) || numAmt <= 0) { showToast('Please enter a valid amount greater than 0.', 'error'); return; }
    if (!categoryId) { showToast('Please select a Category.', 'error'); return; }
    if (!date) { showToast('Please select a Date.', 'error'); return; }
    if (scanResponse?.duplicateWarning?.possibleDuplicate && !duplicateConfirmed) {
      setDuplicateConfirmed(true); showToast('Duplicate warning acknowledged. Click "Create Expense" again to confirm.', 'info'); return;
    }
    setIsSubmitting(true);
    try {
      const notesParts: string[] = [];
      if (description.trim()) notesParts.push(`Description: ${description.trim()}`);
      if (location.trim()) notesParts.push(`Location: ${location.trim()}`);
      if (notes.trim()) notesParts.push(notes.trim());
      if (items.length > 0) {
        const is = items.filter(i => i.name).map(i => `${i.name}${i.quantity ? ` (x${i.quantity})` : ''}${i.total ? `: ${currency} ${i.total.toFixed(2)}` : ''}`).join(', ');
        if (is) notesParts.push(`Scanned Items: ${is}`);
      }
      await api.createExpense({ title: merchant.trim(), amount: numAmt, category_id: categoryId, date: new Date(date).toISOString(), notes: notesParts.join(' | '), payment_method: paymentMethod || 'Card', wallet_id: walletId || undefined, type: 'EXPENSE', tags: ['scanned-receipt'] });
      trackEvent('expense_created', {
        source: 'receipt_scan',
        has_category: Boolean(categoryId),
        has_wallet: Boolean(walletId),
        payment_method: paymentMethod || 'Card',
      });
      showToast('Expense created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['expenses'] }); queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['trend'] }); queryClient.invalidateQueries({ queryKey: ['categories-pie'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      handleClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create expense.', 'error'); setIsSubmitting(false);
    }
  };

  // Split with Friends flow
  const handleEnterSplitMode = () => {
    resetSplitState();
    if (user) setPaidByUserId(user.id);
    setScanState('SPLIT_CONFIG');
  };

  const handleBackToReview = () => {
    resetSplitState();
    setScanState('REVIEW');
  };

  const handleSelectGroup = async (groupId: string) => {
    setSelectedGroupId(groupId); setLoadingGroup(true);
    try {
      const details: GroupDetails = await api.getGroupDetails(groupId);
      setGroupDetails(details);
      const memberIds = details.members.map(m => m.id);
      setSelectedParticipantIds(memberIds);
      if (user && memberIds.includes(user.id)) setPaidByUserId(user.id);
      else if (memberIds.length > 0) setPaidByUserId(memberIds[0]);
      // Init split maps
      const eq: Record<string, string> = {}; const pc: Record<string, string> = {}; const sh: Record<string, string> = {};
      memberIds.forEach(id => { eq[id] = ''; pc[id] = ''; sh[id] = '1'; });
      setExactAmounts(eq); setPercentages(pc); setSharesMap(sh);
    } catch (err: any) {
      showToast(err.message || 'Failed to load group details', 'error');
    } finally { setLoadingGroup(false); }
  };

  const toggleParticipant = (memberId: string) => {
    setSelectedParticipantIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  // Computed split amounts
  const computedSplits = useMemo(() => {
    const amt = parseFloat(totalAmount) || 0;
    const parts = selectedParticipantIds;
    if (parts.length === 0 || amt <= 0) return {};
    const result: Record<string, number> = {};
    if (splitMethod === 'equal') {
      const baseShare = Math.floor((amt / parts.length) * 100) / 100;
      let remainder = Math.round((amt - baseShare * parts.length) * 100) / 100;
      parts.forEach((id, idx) => {
        result[id] = idx === 0 ? Math.round((baseShare + remainder) * 100) / 100 : baseShare;
      });
    } else if (splitMethod === 'exact') {
      parts.forEach(id => { result[id] = parseFloat(exactAmounts[id] || '0') || 0; });
    } else if (splitMethod === 'percentage') {
      parts.forEach(id => { const pct = parseFloat(percentages[id] || '0') || 0; result[id] = Math.round((amt * pct / 100) * 100) / 100; });
    } else if (splitMethod === 'shares') {
      const totalShares = parts.reduce((s, id) => s + (parseInt(sharesMap[id] || '0') || 0), 0);
      if (totalShares > 0) {
        let sumShares = 0;
        parts.forEach((id, idx) => {
          const sh = parseInt(sharesMap[id] || '0') || 0;
          const shareAmt = Math.round((amt * sh / totalShares) * 100) / 100;
          result[id] = shareAmt;
          sumShares += shareAmt;
        });
        // Adjust 1-cent rounding difference on first participant if needed
        const rem = Math.round((amt - sumShares) * 100) / 100;
        if (rem !== 0 && parts.length > 0) {
          result[parts[0]] = Math.round((result[parts[0]] + rem) * 100) / 100;
        }
      }
    }
    return result;
  }, [totalAmount, selectedParticipantIds, splitMethod, exactAmounts, percentages, sharesMap]);

  const splitValidationError = useMemo((): string | null => {
    const amt = parseFloat(totalAmount) || 0;
    if (amt <= 0) return 'Amount must be greater than 0.';
    if (selectedParticipantIds.length === 0) return 'Select at least one participant.';
    if (!paidByUserId) return 'Select who paid the bill.';
    if (splitMethod === 'exact') {
      const sum = Object.values(computedSplits).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - amt) > 0.02) return `Exact amounts must equal the bill total (₹${amt.toFixed(2)}). Currently: ₹${sum.toFixed(2)}.`;
    }
    if (splitMethod === 'percentage') {
      const sum = selectedParticipantIds.reduce((s, id) => s + (parseFloat(percentages[id] || '0') || 0), 0);
      if (Math.abs(sum - 100) > 0.1) return `Percentages must total 100%. Currently: ${sum.toFixed(1)}%.`;
    }
    if (splitMethod === 'shares') {
      const sum = selectedParticipantIds.reduce((s, id) => s + (parseInt(sharesMap[id] || '0') || 0), 0);
      if (sum === 0) return 'Total shares must be greater than 0.';
    }
    return null;
  }, [totalAmount, selectedParticipantIds, paidByUserId, splitMethod, computedSplits, percentages, sharesMap]);

  const handleCreateSplitExpense = async () => {
    if (splitValidationError) { showToast(splitValidationError, 'error'); return; }
    if (!selectedGroupId || !groupDetails) { showToast('Please select a group.', 'error'); return; }
    if (scanResponse?.duplicateWarning?.possibleDuplicate && !duplicateConfirmed) {
      setDuplicateConfirmed(true); showToast('Duplicate warning acknowledged. Click again to confirm.', 'info'); return;
    }
    setIsSubmitting(true);
    try {
      const splits = selectedParticipantIds.map(id => ({
        user_id: id,
        amount_owed: computedSplits[id] || 0
      }));
      await api.addGroupExpense(selectedGroupId, {
        title: merchant.trim() || 'Scanned Bill',
        amount: parseFloat(totalAmount),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        paid_by_user_id: paidByUserId,
        splits
      });
      trackEvent('shared_expense_created', {
        participant_count: selectedParticipantIds.length,
        split_method: splitMethod,
      });
      showToast('Split expense created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-details', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-balances'] });
      handleClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create split expense.', 'error');
      setIsSubmitting(false);
    }
  };

  const isUncertain = (f: string) => scanResponse?.uncertainFields?.includes(f) || false;
  const formatFileSize = (b: number) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(2)} MB`;

  const getMemberName = (id: string) => groupDetails?.members.find(m => m.id === id)?.name || 'Member';

  const modalTitle = scanState === 'REVIEW' ? 'Review & Edit Scanned Receipt' : scanState === 'SPLIT_CONFIG' ? 'Split Bill with Friends' : 'AI Bill & Receipt Scanner';
  const modalDesc = scanState === 'REVIEW' ? 'Verify and adjust the extracted receipt fields before adding the expense.' : scanState === 'SPLIT_CONFIG' ? 'Choose a group, select participants, and configure how to split this bill.' : 'Upload or capture a photo of your receipt or bill to extract expense details.';
  const modalWidth = scanState === 'REVIEW' ? '820px' : scanState === 'SPLIT_CONFIG' ? '720px' : '680px';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} description={modalDesc} maxWidth={modalWidth}>
      <div className="space-y-5">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" className="hidden" />
        <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" />

        {/* IDLE */}
        {scanState === 'IDLE' && (
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            className={`premium-card border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer ${isDragOver ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' : 'border-black/10 dark:border-white/10 hover:border-emerald-500/50'}`}
            onClick={() => fileInputRef.current?.click()}>
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner"><Sparkles className="w-7 h-7" /></div>
              <div><h4 className="font-semibold text-base">Drag & drop your receipt image here</h4><p className="text-xs text-gray-400 mt-1">Supports JPG, JPEG, PNG, WEBP (Max 5 MB)</p></div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} className="btn-premium btn-premium-primary py-2 px-4 text-xs gap-2 cursor-pointer"><Upload className="w-4 h-4" /> Browse Files</button>
                <button type="button" onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }} className="btn-premium py-2 px-4 text-xs gap-2 cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-black/10 dark:border-white/10"><Camera className="w-4 h-4 text-emerald-500" /> Take Photo</button>
              </div>
            </div>
          </div>
        )}

        {/* IMAGE_SELECTED / SCANNING */}
        {(scanState === 'IMAGE_SELECTED' || scanState === 'SCANNING') && selectedFile && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-32 h-32 sm:w-28 sm:h-28 rounded-lg overflow-hidden shrink-0 bg-black/10 dark:bg-white/10 flex items-center justify-center border border-black/10 dark:border-white/10">
                {previewUrl ? <img src={previewUrl} alt="Selected receipt preview" className="w-full h-full object-cover" /> : <FileText className="w-8 h-8 text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                <h4 className="font-semibold text-sm truncate">{selectedFile.name}</h4>
                <p className="text-xs text-gray-400">Size: {formatFileSize(selectedFile.size)}</p>
                <p className="text-xs text-emerald-500 font-medium flex items-center justify-center sm:justify-start gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Ready for AI extraction</p>
              </div>
              {scanState !== 'SCANNING' && (
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs flex items-center gap-1" title="Reselect file"><RefreshCw className="w-4 h-4" /></button>
                  <button type="button" onClick={handleRemoveImage} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer text-xs flex items-center gap-1" title="Remove image"><X className="w-4 h-4" /></button>
                </div>
              )}
            </div>
            {scanState === 'SCANNING' && (<div className="premium-card p-6 border-emerald-500/30 bg-emerald-500/5 text-center space-y-3"><div className="flex items-center justify-center gap-3"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" /><span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">Analyzing your receipt…</span></div><p className="text-xs text-gray-400">Extracting merchant, totals, tax, date, category, and line items.</p></div>)}
            {scanState === 'IMAGE_SELECTED' && (<div className="flex justify-end gap-3 pt-2"><button type="button" onClick={handleClose} className="btn-premium text-xs py-2 px-4 cursor-pointer">Cancel</button><button type="button" onClick={handleScanBill} className="btn-premium btn-premium-primary text-xs py-2 px-5 gap-2 cursor-pointer"><Sparkles className="w-4 h-4" /> Scan Receipt</button></div>)}
          </div>
        )}

        {/* ERROR */}
        {scanState === 'ERROR' && (
          <div className="space-y-4">
            <div className="premium-card p-6 border-red-500/30 bg-red-500/5 text-center space-y-3"><div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto"><AlertTriangle className="w-6 h-6" /></div><h4 className="font-semibold text-base text-red-500">Scan Failed</h4><p className="text-xs text-gray-400 mt-1">{errorMessage || 'Could not extract receipt data.'}</p></div>
            <div className="flex justify-end gap-3"><button type="button" onClick={handleRemoveImage} className="btn-premium text-xs py-2 px-4 cursor-pointer">Select Another Image</button><button type="button" onClick={handleScanBill} className="btn-premium btn-premium-primary text-xs py-2 px-4 gap-2 cursor-pointer"><RefreshCw className="w-4 h-4" /> Retry</button></div>
          </div>
        )}

        {/* REVIEW */}
        {scanState === 'REVIEW' && (
          <form onSubmit={handleCreateExpense} className="space-y-5 fade-in-up">
            {/* Warnings */}
            {scanResponse?.duplicateWarning?.possibleDuplicate && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2">
                <div className="font-semibold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> Possible Duplicate Expense</div>
                <p className="text-[11px] opacity-90">An expense with similar details already exists: <strong className="block mt-1">"{scanResponse.duplicateWarning.matches[0]?.title}" — ₹{scanResponse.duplicateWarning.matches[0]?.amount} on {scanResponse.duplicateWarning.matches[0]?.date}</strong></p>
                {!duplicateConfirmed && <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold italic">Click "Create Anyway" to confirm.</p>}
              </div>
            )}
            {((scanResponse?.warnings?.length ?? 0) > 0 || (scanResponse?.uncertainFields?.length ?? 0) > 0) && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs space-y-1.5">
                <div className="font-semibold flex items-center gap-2"><HelpCircle className="w-4 h-4 shrink-0" /> Detection Notes</div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-95 pl-1">
                  {scanResponse?.uncertainFields?.map((f, i) => <li key={`u-${i}`}>Field <strong className="capitalize">{f}</strong> needs review.</li>)}
                  {scanResponse?.warnings?.map((w, i) => <li key={`w-${i}`}>{w.message}</li>)}
                </ul>
              </div>
            )}

            {/* Form layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {previewUrl && (
                <div className={`lg:col-span-4 ${showImagePreview ? 'block' : 'hidden lg:block'}`}>
                  <div className="sticky top-0 space-y-2">
                    <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-emerald-500" /> Original Receipt</span><button type="button" onClick={() => setShowImagePreview(!showImagePreview)} className="lg:hidden text-xs text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Hide</button></div>
                    <div className="rounded-xl overflow-hidden bg-black/10 dark:bg-white/10 border border-black/10 dark:border-white/10 max-h-[360px] flex items-center justify-center p-2"><img src={previewUrl} alt="Scanned original receipt" className="max-h-[340px] w-auto object-contain rounded-lg shadow-sm" /></div>
                  </div>
                </div>
              )}
              <div className={`space-y-4 ${previewUrl ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
                {previewUrl && !showImagePreview && <button type="button" onClick={() => setShowImagePreview(true)} className="lg:hidden w-full py-1.5 px-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5"><Eye className="w-3.5 h-3.5 text-emerald-500" /> View Receipt Image</button>}
                {/* Merchant & Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1 font-sans">Merchant / Title <span className="text-red-500">*</span>{isUncertain('merchant') && <span className="text-[10px] text-amber-500 font-semibold lowercase flex items-center gap-0.5 ml-auto"><AlertTriangle className="w-3 h-3" /> Needs review</span>}</label>
                    <input type="text" value={merchant} onChange={e => handleMerchantChange(e.target.value)} placeholder="e.g. Starbucks" required className="w-full p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-sans font-semibold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1 font-sans">Total Amount ({currency}) <span className="text-red-500">*</span>{isUncertain('total') && <span className="text-[10px] text-amber-500 font-semibold lowercase flex items-center gap-0.5 ml-auto"><AlertTriangle className="w-3 h-3" /> Needs review</span>}</label>
                    <div className="relative flex items-center"><span className="absolute left-3 text-sm font-bold text-emerald-500">₹</span><input type="number" step="0.01" min="0.01" value={totalAmount} onChange={e => handleAmountChange(e.target.value)} placeholder="0.00" required className="w-full p-2.5 pl-8 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border text-base outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-sans font-bold text-emerald-600 dark:text-emerald-400" /></div>
                  </div>
                </div>
                {/* Category & Wallet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1"><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1 font-sans">Category <span className="text-red-500">*</span>{isUncertain('category') && <span className="text-[10px] text-amber-500 font-semibold lowercase flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Needs review</span>}</label>{!categoryId && scanResponse?.draft?.category && <span className="text-[10px] text-emerald-500 font-medium truncate max-w-[140px]" title={`AI suggested: ${scanResponse.draft.category}`}>AI: "{scanResponse.draft.category}"</span>}</div>
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="w-full p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-sans cursor-pointer"><option value="" disabled>Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 font-sans">Wallet <span className="text-red-500">*</span></label>
                    <select value={walletId} onChange={e => setWalletId(e.target.value)} required className="w-full p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-sans cursor-pointer"><option value="" disabled>Select wallet</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.name} (₹{Number(w.balance).toLocaleString()})</option>)}</select>
                  </div>
                </div>
                {/* Date & Payment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1 font-sans">Date <span className="text-red-500">*</span>{isUncertain('date') && <span className="text-[10px] text-amber-500 font-semibold lowercase flex items-center gap-0.5 ml-auto"><AlertTriangle className="w-3 h-3" /> Needs review</span>}</label><input type="date" value={date} onChange={e => handleDateChange(e.target.value)} required className="w-full p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-sans cursor-pointer" /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 font-sans">Payment Method</label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-sans cursor-pointer"><option value="UPI">UPI</option><option value="Card">Card</option><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option></select></div>
                </div>
                {/* Sub-breakdown */}
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-black/[0.01] dark:bg-white/[0.01] border border-black/5 dark:border-white/5">
                  <div><label className="text-[9px] font-bold uppercase text-gray-400">Subtotal</label><input type="number" step="0.01" value={subtotal} onChange={e => setSubtotal(e.target.value)} placeholder="0.00" className="w-full p-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500" /></div>
                  <div><label className="text-[9px] font-bold uppercase text-gray-400">Tax</label><input type="number" step="0.01" value={tax} onChange={e => setTax(e.target.value)} placeholder="0.00" className="w-full p-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500" /></div>
                  <div><label className="text-[9px] font-bold uppercase text-gray-400">Tip</label><input type="number" step="0.01" value={tip} onChange={e => setTip(e.target.value)} placeholder="0.00" className="w-full p-1.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500" /></div>
                </div>
                {/* Line Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-emerald-500" /> Items ({items.length})</span><button type="button" onClick={handleAddItem} className="text-xs text-emerald-500 font-semibold hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Add</button></div>
                  {items.length > 0 ? (<div className="space-y-2 max-h-48 overflow-y-auto pr-1">{items.map((item, idx) => (<div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-xs"><input type="text" value={item.name} onChange={e => handleItemChange(idx, 'name', e.target.value)} placeholder="Item" className="flex-1 p-1.5 rounded-md bg-transparent border border-border outline-none focus:border-emerald-500" /><input type="number" value={item.quantity ?? ''} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} placeholder="Qty" className="w-14 p-1.5 rounded-md bg-transparent border border-border outline-none focus:border-emerald-500 text-center" /><input type="number" step="0.01" value={item.total ?? ''} onChange={e => handleItemChange(idx, 'total', e.target.value)} placeholder="Price" className="w-20 p-1.5 rounded-md bg-transparent border border-border outline-none focus:border-emerald-500 text-right" /><button type="button" onClick={() => handleRemoveItem(idx)} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button></div>))}</div>) : <p className="text-xs text-gray-400 italic">No line items detected.</p>}
                </div>
                {/* Description & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 font-sans">Description</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Dinner with team" className="w-full p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500 font-sans" /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 font-sans">Location</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Connaught Place" className="w-full p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500 font-sans" /></div>
                </div>
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 font-sans">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Extra notes..." rows={2} className="w-full p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500 font-sans resize-none" /></div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-black/10 dark:border-white/10">
              <button type="button" onClick={handleRemoveImage} disabled={isSubmitting} className="btn-premium text-xs py-2 px-4 cursor-pointer disabled:opacity-50">Scan Another</button>
              <div className="flex gap-3">
                {groups.length > 0 && (
                  <button type="button" onClick={handleEnterSplitMode} disabled={isSubmitting} className="btn-premium text-xs py-2 px-4 gap-2 cursor-pointer disabled:opacity-50 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"><Users className="w-4 h-4" /> Split with Friends</button>
                )}
                <button type="button" onClick={handleClose} disabled={isSubmitting} className="btn-premium text-xs py-2 px-4 cursor-pointer disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`btn-premium text-xs py-2.5 px-6 gap-2 cursor-pointer disabled:opacity-50 ${scanResponse?.duplicateWarning?.possibleDuplicate && !duplicateConfirmed ? 'bg-amber-500 text-white hover:bg-amber-600' : 'btn-premium-primary'}`}>
                  {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</> : scanResponse?.duplicateWarning?.possibleDuplicate && !duplicateConfirmed ? <><AlertTriangle className="w-4 h-4" /> Create Anyway</> : <><CheckCircle2 className="w-4 h-4" /> Create Expense</>}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* SPLIT_CONFIG */}
        {scanState === 'SPLIT_CONFIG' && (
          <div className="space-y-5 fade-in-up">
            {/* Back button */}
            <button type="button" onClick={handleBackToReview} className="text-xs font-semibold text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"><ArrowLeft className="w-4 h-4" /> Back to Review</button>

            {/* Bill Summary */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
              <span className="font-semibold">{merchant || 'Scanned Bill'}</span>
              <span className="font-bold text-base">₹{parseFloat(totalAmount || '0').toFixed(2)}</span>
            </div>

            {/* Duplicate Warning if visible */}
            {scanResponse?.duplicateWarning?.possibleDuplicate && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> <span>Possible duplicate: "{scanResponse.duplicateWarning.matches[0]?.title}" — ₹{scanResponse.duplicateWarning.matches[0]?.amount}</span>
              </div>
            )}

            {/* Group Selection */}
            {!selectedGroupId && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-emerald-500" /> Select a Group</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {groups.map(g => (
                    <button key={g.id} type="button" onClick={() => handleSelectGroup(g.id)} className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-left cursor-pointer transition-colors">
                      <span className="font-semibold text-sm block truncate">{g.name}</span>
                      <span className="text-[11px] text-gray-400">{g.member_count} members</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Group Selected: Participants, Payer, Split Config */}
            {selectedGroupId && groupDetails && !loadingGroup && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Group: {groupDetails.group.name}</span><button type="button" onClick={() => { setSelectedGroupId(''); setGroupDetails(null); }} className="text-xs text-gray-400 hover:text-red-500 cursor-pointer">Change Group</button></div>

                {/* Participants */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Participants</label>
                  <div className="flex flex-wrap gap-2">
                    {groupDetails.members.map(m => {
                      const sel = selectedParticipantIds.includes(m.id);
                      return (<button key={m.id} type="button" onClick={() => toggleParticipant(m.id)} className={`py-1.5 px-3 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${sel ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-black/[0.02] dark:bg-white/[0.02] border-border text-gray-500 hover:border-emerald-500/50'}`}>{m.name}{m.id === user?.id ? ' (You)' : ''}</button>);
                    })}
                  </div>
                </div>

                {/* Paid By */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 font-sans">Who Paid?</label>
                  <select value={paidByUserId} onChange={e => setPaidByUserId(e.target.value)} className="w-full p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-sans cursor-pointer">
                    {groupDetails.members.map(m => <option key={m.id} value={m.id}>{m.name}{m.id === user?.id ? ' (You)' : ''}</option>)}
                  </select>
                </div>

                {/* Split Method */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 font-sans">Split Method</label>
                  <div className="flex gap-2 flex-wrap">
                    {(['equal', 'exact', 'percentage', 'shares'] as SplitMethod[]).map(m => (
                      <button key={m} type="button" onClick={() => setSplitMethod(m)} className={`py-1.5 px-3 rounded-lg text-xs font-semibold border cursor-pointer transition-colors capitalize ${splitMethod === m ? 'bg-emerald-500 text-white border-emerald-500' : 'border-border text-gray-500 hover:border-emerald-500/50'}`}>{m}</button>
                    ))}
                  </div>
                </div>

                {/* Split Details */}
                <div className="space-y-2 p-3 rounded-xl bg-black/[0.01] dark:bg-white/[0.01] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase text-gray-400">Split Preview</span>
                  {selectedParticipantIds.map(id => (
                    <div key={id} className="flex items-center justify-between gap-2 py-1.5 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0">
                      <span className="text-xs font-semibold truncate flex-1">{getMemberName(id)}{id === user?.id ? ' (You)' : ''}</span>
                      {splitMethod === 'equal' && <span className="text-xs font-bold text-emerald-600">₹{(computedSplits[id] || 0).toFixed(2)}</span>}
                      {splitMethod === 'exact' && <input type="number" step="0.01" value={exactAmounts[id] || ''} onChange={e => setExactAmounts({ ...exactAmounts, [id]: e.target.value })} placeholder="0.00" className="w-24 p-1.5 rounded-md bg-transparent border border-border outline-none focus:border-emerald-500 text-xs text-right" />}
                      {splitMethod === 'percentage' && <div className="flex items-center gap-1"><input type="number" step="0.1" value={percentages[id] || ''} onChange={e => setPercentages({ ...percentages, [id]: e.target.value })} placeholder="0" className="w-16 p-1.5 rounded-md bg-transparent border border-border outline-none focus:border-emerald-500 text-xs text-right" /><span className="text-[10px] text-gray-400">%</span><span className="text-xs font-bold text-emerald-600 ml-1">₹{(computedSplits[id] || 0).toFixed(2)}</span></div>}
                      {splitMethod === 'shares' && <div className="flex items-center gap-1"><input type="number" step="1" min="0" value={sharesMap[id] || ''} onChange={e => setSharesMap({ ...sharesMap, [id]: e.target.value })} placeholder="1" className="w-14 p-1.5 rounded-md bg-transparent border border-border outline-none focus:border-emerald-500 text-xs text-center" /><span className="text-[10px] text-gray-400">sh</span><span className="text-xs font-bold text-emerald-600 ml-1">₹{(computedSplits[id] || 0).toFixed(2)}</span></div>}
                    </div>
                  ))}
                  {splitValidationError && <p className="text-[11px] text-red-500 font-semibold mt-1">{splitValidationError}</p>}
                </div>

                {/* Confirm Split */}
                <div className="flex justify-between items-center pt-4 border-t border-black/10 dark:border-white/10">
                  <button type="button" onClick={handleBackToReview} disabled={isSubmitting} className="btn-premium text-xs py-2 px-4 cursor-pointer disabled:opacity-50">Cancel Split</button>
                  <button type="button" onClick={handleCreateSplitExpense} disabled={isSubmitting || !!splitValidationError} className={`btn-premium text-xs py-2.5 px-6 gap-2 cursor-pointer disabled:opacity-50 ${scanResponse?.duplicateWarning?.possibleDuplicate && !duplicateConfirmed ? 'bg-amber-500 text-white hover:bg-amber-600' : 'btn-premium-primary'}`}>
                    {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Splitting...</> : scanResponse?.duplicateWarning?.possibleDuplicate && !duplicateConfirmed ? <><AlertTriangle className="w-4 h-4" /> Split Anyway</> : <><Users className="w-4 h-4" /> Confirm Split</>}
                  </button>
                </div>
              </div>
            )}

            {loadingGroup && <div className="text-center py-4 text-xs text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-500 mb-2" /> Loading group…</div>}
          </div>
        )}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName="AI Bill & Receipt Scanner"
      />
    </Modal>
  );
}
