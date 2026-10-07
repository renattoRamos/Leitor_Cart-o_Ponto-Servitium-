import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Loader2, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import { extractTextFromPDF } from '../utils/pdfExtractor';
import { parsePontomaisPages, ensureDateConsistencyAndColumnAlignment } from '../utils/parser';

interface PdfDropzoneProps {
  onDataLoaded: (dataset: any, fileName: string, file?: File) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  currentLoadedFileName?: string | null;
  pdfUrl?: string | null;
  onClearData: () => void;
  hasData: boolean;
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onDataLoaded,
  isProcessing,
  setIsProcessing,
  currentLoadedFileName,
  pdfUrl,
  onClearData,
  hasData
}) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);

  const processFile = async (file: File) => {
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setStatusMessage(`Lendo arquivo "${file.name}"...`);

    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setStatusMessage('Extraindo páginas do PDF e interpretando texto...');
        const pages = await extractTextFromPDF(file);
        
        setStatusMessage(`Convertendo ${pages.length} página(s) para dados estruturados...`);
        const parsedDataset = parsePontomaisPages(pages);
        const alignedDataset = ensureDateConsistencyAndColumnAlignment(parsedDataset);

        if (!alignedDataset.colaboradores || alignedDataset.colaboradores.length === 0) {
          throw new Error('Nenhum registro de ponto ou colaborador identificado no PDF.');
        }

        setStatusMessage(`Sucesso! ${alignedDataset.colaboradores.length} colaborador(es) carregado(s).`);
        onDataLoaded(alignedDataset, file.name, file);
      } else if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        const alignedJson = ensureDateConsistencyAndColumnAlignment(json);
        setStatusMessage('Arquivo JSON carregado e verificado com sucesso.');
        onDataLoaded(alignedJson, file.name, file);
      } else {
        // Plain text / OCR txt
        const text = await file.text();
        const pages = [text];
        const parsedDataset = parsePontomaisPages(pages);
        const alignedDataset = ensureDateConsistencyAndColumnAlignment(parsedDataset);
        setStatusMessage('Texto processado e verificado com sucesso.');
        onDataLoaded(alignedDataset, file.name, file);
      }
    } catch (err: any) {
      console.error('Erro no processamento do arquivo:', err);
      setErrorMessage(
        err.message || 'Falha ao processar o arquivo. Verifique se é um PDF válido de folha de ponto.'
      );
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    // reset input value so re-uploading the same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full print:hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.json,.txt"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Modern Drag and Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative group rounded-xl border-2 border-dashed transition-all cursor-pointer text-center select-none ${
          !hasData ? 'p-6 sm:p-10' : 'p-3 sm:p-4 md:p-5'
        } ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/70 shadow-md scale-[1.005]'
            : isProcessing
            ? 'border-blue-400 bg-blue-50/50 cursor-wait'
            : hasData
            ? 'border-emerald-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/20 shadow-2xs'
            : 'border-slate-300 bg-white hover:border-emerald-500 hover:bg-slate-50/80 shadow-xs'
        }`}
      >
        <div className="flex flex-col items-center justify-center max-w-lg mx-auto pointer-events-none">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 animate-spin" />
              <div className="text-xs sm:text-sm font-semibold text-slate-800">
                Processando arquivo PDF...
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-mono">
                {statusMessage || 'Identificando dados e organizando espelho de ponto...'}
              </div>
            </div>
          ) : hasData ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-2.5 sm:gap-3 pointer-events-auto">
              <div className="flex items-center gap-2.5 sm:gap-3 text-left min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Arquivo: <span className="text-emerald-800 font-mono">{currentLoadedFileName || 'Dados Importados'}</span>
                    </span>
                  </div>
                  <p className="text-[10.5px] sm:text-[11px] text-slate-500 truncate">
                    Arraste outro PDF para substituir ou clique para navegar
                  </p>
                </div>
              </div>

              {/* Actions inside the active dropzone */}
              <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 flex-wrap">
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 hover:text-emerald-900 transition-colors shadow-2xs"
                    title="Visualizar arquivo PDF original em uma nova aba do navegador"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Visualizar PDF Original</span>
                    <span className="sm:hidden">Ver PDF</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearData();
                  }}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors shadow-2xs"
                  title="Limpar dados carregados"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Dados</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 sm:gap-2.5">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all ${
                  isDragOver
                    ? 'bg-emerald-200 text-emerald-800 scale-110'
                    : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-105'
                }`}
              >
                <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>

              <div className="text-sm sm:text-base font-bold text-slate-800">
                <span className="text-emerald-700">Faça o upload do espelho de ponto</span>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-600 max-w-md">
                Arraste e solte o arquivo <strong>PDF</strong> aqui ou{' '}
                <span className="text-emerald-700 font-semibold underline underline-offset-2">
                  clique para selecionar do seu computador
                </span>.
              </p>

              <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">.pdf</span>
                <span>Processamento automático instantâneo</span>
              </div>
            </div>
          )}
        </div>

        {/* Status notification toast inside dropzone */}
        {errorMessage && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

