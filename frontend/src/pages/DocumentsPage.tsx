import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, UploadCloud, Trash2, Search, AlertCircle, CheckCircle2,
  Clock, Sparkles, Bot, RefreshCw, Layers, ShieldCheck, HelpCircle,
  File, ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/UI/Toast';
import { PaywallModal } from '../components/UI/PaywallModal';
import useAuthStore from '../store/authStore';
import { DocumentItem, RAGAnswerResult, RAGSourceCitation } from '../types';

export default function DocumentsPage() {
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState<RAGAnswerResult | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const isPro = user?.plan === 'PRO' || user?.email?.toLowerCase() === 'demo@example.com';

  // Fetch document list
  const {
    data: documents = [],
    isLoading: isLoadingDocs,
    refetch: refetchDocs
  } = useQuery<DocumentItem[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await api.getDocuments();
      return res.documents || [];
    },
    enabled: !!user,
    refetchInterval: 5000 // Poll status updates every 5 seconds if documents are PROCESSING
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      return api.uploadDocument(formData);
    },
    onSuccess: (res) => {
      showToast(`Document "${res.document?.originalFilename || 'PDF'}" uploaded and processing!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err: any) => {
      if (err?.message === 'PRO_REQUIRED' || err?.message?.includes('Finova Pro')) {
        setShowPaywall(true);
      } else {
        showToast(err.message || 'Failed to upload document', 'error');
      }
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => {
      showToast('Document deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setRagResult(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete document', 'error');
    }
  });

  // RAG direct query mutation
  const ragMutation = useMutation({
    mutationFn: (query: string) => api.queryDocuments(query),
    onSuccess: (res: RAGAnswerResult) => {
      setRagResult(res);
    },
    onError: (err: any) => {
      if (err?.message === 'PRO_REQUIRED' || err?.message?.includes('Finova Pro')) {
        setShowPaywall(true);
      } else {
        showToast(err.message || 'Failed to search document context', 'error');
      }
    }
  });

  const handleFileUpload = (file: File) => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Only PDF files are supported for document RAG processing.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds the 10MB limit.', 'error');
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRunRAGQuery = (queryText: string) => {
    if (!queryText.trim() || ragMutation.isPending) return;
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    ragMutation.mutate(queryText.trim());
  };

  const filteredDocs = documents.filter(doc =>
    doc.originalFilename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const indexedCount = documents.filter(d => d.status === 'INDEXED').length;
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 fade-in-up text-left">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-500" />
            Financial Document RAG
            <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-indigo-500 text-white font-bold tracking-wider uppercase shadow-sm">
              PRO
            </span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Upload PDF loan agreements, tax forms, insurance policies, or investment reports for AI RAG questions with source citations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Multi-Tenant Encrypted</span>
          </div>

          <button
            onClick={() => refetchDocs()}
            className="p-2 rounded-xl border border-border hover:bg-card text-muted hover:text-text transition-all cursor-pointer"
            title="Refresh document status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="premium-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted">Uploaded Documents</p>
            <h3 className="text-xl font-extrabold text-text mt-1">{documents.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="premium-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted">Indexed Documents</p>
            <h3 className="text-xl font-extrabold text-emerald-500 mt-1">{indexedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="premium-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted">Indexed Knowledge Chunks</p>
            <h3 className="text-xl font-extrabold text-indigo-500 mt-1">{totalChunks}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Upload & Search Left, Interactive RAG Query Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Upload Dropzone & Document List */}
        <div className="lg:col-span-7 space-y-6">

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              dragOver
                ? 'border-emerald-500 bg-emerald-500/[0.04]'
                : 'border-border bg-card hover:border-emerald-500/50'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-text">Upload Financial PDF Document</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Drag and drop your PDF file here, or click to browse. Supported format: PDF (Max 10MB).
            </p>

            <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all cursor-pointer shadow-md">
              <File className="w-4 h-4" />
              <span>Select PDF File</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>

            {uploadMutation.isPending && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-500 font-semibold animate-pulse">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Extracting text & generating 384-dim embeddings...</span>
              </div>
            )}
          </div>

          {/* Document Management Header & Search */}
          <div className="premium-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Your Document Vault
              </h3>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter documents..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-xl outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Document List */}
            {isLoadingDocs ? (
              <div className="py-8 text-center text-xs text-muted animate-pulse">
                Loading document vault...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted border border-dashed border-border rounded-xl p-6">
                <FileText className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                <p className="font-medium">No documents found in vault.</p>
                <p className="text-[11px] text-muted mt-0.5">Upload loan agreements, tax forms, or insurance policies above.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between gap-4 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors rounded-xl px-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        PDF
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-semibold text-text truncate" title={doc.originalFilename}>
                          {doc.originalFilename}
                        </p>
                        <p className="text-[10px] text-muted flex items-center gap-2 mt-0.5">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          {doc.chunkCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{doc.chunkCount} chunks</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Status Tag */}
                      {doc.status === 'INDEXED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          INDEXED
                        </span>
                      )}

                      {doc.status === 'PROCESSING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20 animate-pulse">
                          <Clock className="w-3 h-3 animate-spin" />
                          PROCESSING
                        </span>
                      )}

                      {doc.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-500/20" title={doc.errorMessage || 'Processing error'}>
                          <AlertCircle className="w-3 h-3" />
                          FAILED
                        </span>
                      )}

                      {/* Delete Action */}
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${doc.originalFilename}"? This will remove all vector embeddings.`)) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Direct RAG Query & Citation Viewer */}
        <div className="lg:col-span-5 space-y-6">
          <div className="premium-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Ask Document Assistant
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                pgvector RAG
              </span>
            </div>

            <p className="text-xs text-muted">
              Ask any question across your uploaded PDF agreements or tax forms. Finova grounds its answers strictly in your vector embeddings with zero hallucinations.
            </p>

            {/* Quick Sample Prompts */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Sample Document Queries</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "What is my loan prepayment fee?",
                  "What are my insurance policy clauses?",
                  "What is the interest rate mentioned?",
                  "What tax deductions are listed?"
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setRagQuery(q);
                      handleRunRAGQuery(q);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-border bg-background hover:border-emerald-500 hover:text-emerald-500 transition-all text-muted font-medium cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunRAGQuery(ragQuery);
              }}
              className="space-y-3"
            >
              <div className="relative">
                <textarea
                  rows={3}
                  value={ragQuery}
                  onChange={e => setRagQuery(e.target.value)}
                  placeholder="Enter your question (e.g. 'What is the prepayment charge after 24 months?')..."
                  className="w-full p-3 text-xs bg-background border border-border rounded-xl outline-none focus:border-emerald-500 text-text placeholder-gray-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!ragQuery.trim() || ragMutation.isPending}
                className="w-full py-2.5 px-4 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {ragMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Searching vector store & generating answer...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>Query Document RAG</span>
                  </>
                )}
              </button>
            </form>

            {/* RAG Answer Display */}
            {ragResult && (
              <div className="mt-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.02] space-y-3 text-left animate-fade-in">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Bot className="w-4 h-4" />
                    Grounded RAG Answer
                  </span>
                  <span className="text-[10px] text-muted font-medium">
                    {ragResult.chunksFound} chunks matched
                  </span>
                </div>

                <p className="text-xs text-text leading-relaxed font-normal whitespace-pre-wrap">
                  {ragResult.answer}
                </p>

                {/* Sources Citation List */}
                {ragResult.sources && ragResult.sources.length > 0 && (
                  <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Source Citations ({ragResult.sources.length})
                    </span>
                    <div className="space-y-1">
                      {ragResult.sources.map((src, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-card border border-border">
                          <span className="font-semibold text-text truncate max-w-[200px]">
                            📄 {src.originalFilename}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                            {src.pageNumber ? `Page ${src.pageNumber}` : 'Page 1'} • {Math.round(src.similarity * 100)}% match
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName="Financial Document RAG & Vector Vault"
      />
    </div>
  );
}
