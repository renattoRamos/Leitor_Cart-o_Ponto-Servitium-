import React, { useState, useMemo } from 'react';
import {
  Table,
  Download,
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Printer,
  Eye,
  EyeOff,
  Users,
  Clock,
  Trash2,
  FileText,
  ChevronDown,
  X,
  TrendingUp,
  Calendar
} from 'lucide-react';
import datasetOriginal from './data/pontomais.json';
import { PdfDropzone } from './components/PdfDropzone';
import {
  ensureDateConsistencyAndColumnAlignment,
  formatTimeWithoutZero,
  formatDateWithWeekday
} from './utils/parser';

type ViewMode = 'original_sheet' | 'general_table';
type StatusFilter = 'all' | 'he50' | 'he100';

export default function App() {
  // Start with no data loaded, waiting for user upload
  const [activeDataset, setActiveDataset] = useState<any>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('original_sheet');
  const [selectedColabIndex, setSelectedColabIndex] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showHiddenColumns, setShowHiddenColumns] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [colabSearchQuery, setColabSearchQuery] = useState<string>('');

  const colaboradores = activeDataset?.colaboradores || [];
  const selectedColab = colaboradores[selectedColabIndex] || colaboradores[0] || null;

  // Search filtered list for the personalized collaborator select
  const searchedColabsForDropdown = useMemo(() => {
    if (!colabSearchQuery.trim()) {
      return colaboradores.map((c: any, idx: number) => ({ ...c, originalIndex: idx }));
    }
    const q = colabSearchQuery.toLowerCase();
    return colaboradores
      .map((c: any, idx: number) => ({ ...c, originalIndex: idx }))
      .filter((c: any) => c.colaborador.toLowerCase().includes(q) || c.id.toString().includes(q));
  }, [colaboradores, colabSearchQuery]);

  // Column metrics for the active collaborator
  const colabMetrics = useMemo(() => {
    if (!selectedColab) {
      return {
        he50: '00:00',
        he100: '00:00',
        noturno: '00:00',
        diasTrabalhados: 0,
        totalBatidas: 0
      };
    }

    const he50 = selectedColab.totais?.he_1_50 || selectedColab.totais?.he_50 || '00:00';
    const he100 = selectedColab.totais?.he_2_100 || selectedColab.totais?.he_100 || '00:00';
    const noturno = selectedColab.totais?.adicional_noturno || '00:00';
    const diasTrabalhados = selectedColab.resumo_dias?.dias_trabalhados ?? 0;

    let totalBatidas = 0;
    if (selectedColab.registros) {
      for (const r of selectedColab.registros) {
        if (r.pontos?.entrada_1) totalBatidas++;
        if (r.pontos?.saida_1) totalBatidas++;
        if (r.pontos?.entrada_2) totalBatidas++;
        if (r.pontos?.saida_2) totalBatidas++;
      }
    }

    return {
      he50,
      he100,
      noturno,
      diasTrabalhados,
      totalBatidas
    };
  }, [selectedColab]);

  // Filter for the general table
  const filteredColaboradores = useMemo(() => {
    return colaboradores.filter((c: any) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!c.colaborador.toLowerCase().includes(term) && !c.id.toString().includes(term)) {
          return false;
        }
      }
      if (statusFilter === 'he50') {
        const val = c.total_horas_extras?.he_1_50 || c.totais?.he_50 || '00:00';
        if (val === '00:00') return false;
      }
      if (statusFilter === 'he100') {
        const val = c.total_horas_extras?.he_2_100 || c.totais?.he_100 || '00:00';
        if (val === '00:00') return false;
      }
      return true;
    });
  }, [colaboradores, searchTerm, statusFilter]);

  // Clean JSON string representing strictly the requested visible/mapped structure
  const currentJsonString = useMemo(() => {
    if (!activeDataset) {
      return '{}';
    }

    if (!selectedColab) {
      return JSON.stringify(activeDataset, null, 2);
    }

    if (viewMode === 'original_sheet') {
      const diasMapped = selectedColab.registros?.map((r: any) => {
        if (!showHiddenColumns) {
          return {
            data: formatDateWithWeekday(r.data, r.dia_semana),
            pontos: {
              entrada_1: r.pontos?.entrada_1 || null,
              saida_1: r.pontos?.saida_1 || null,
              entrada_2: r.pontos?.entrada_2 || null,
              saida_2: r.pontos?.saida_2 || null
            },
            total_horas_extras: {
              he_1_50: r.total_horas_extras?.he_1_50 || r.horas_extras?.he_50 || '00:00',
              he_2_100: r.total_horas_extras?.he_2_100 || r.horas_extras?.he_100 || '00:00',
              adicional_noturno: r.total_horas_extras?.adicional_noturno || r.horas_extras?.adicional_noturno || '00:00'
            }
          };
        }
        return r;
      });

      const colabData: any = {
        colaborador: selectedColab.colaborador,
        periodo: selectedColab.periodo || activeDataset?.metadata?.periodo?.mes_referencia || 'De 01/08/2026 até 31/08/2026',
        departamento: selectedColab.departamento || activeDataset?.metadata?.departamento || 'COMPESA GPM (22.4.417)',
        dias: diasMapped,
        totais: {
          total_horas_extras: {
            he_1_50: selectedColab.totais?.he_1_50 || selectedColab.totais?.he_50 || '00:00',
            he_1_50_noturno: selectedColab.totais?.he_1_50_noturno || '00:00',
            he_2_100: selectedColab.totais?.he_2_100 || selectedColab.totais?.he_100 || '00:00',
            he_2_100_noturno: selectedColab.totais?.he_2_100_noturno || '00:00',
            adicional_noturno: selectedColab.totais?.adicional_noturno || '00:00'
          }
        }
      };

      if (showHiddenColumns) {
        colabData.totais_jornada = selectedColab.totais_jornada || selectedColab.totais;
        colabData.saldo_final = selectedColab.totais?.saldo;
      }

      return JSON.stringify(
        {
          documento: activeDataset?.metadata || {
            sistema: 'pontomais',
            titulo: 'Jornada',
            departamento: selectedColab.departamento || 'COMPESA GPM (22.4.417)'
          },
          dados_colaborador: colabData
        },
        null,
        2
      );
    }

    if (!showHiddenColumns) {
      return JSON.stringify(
        {
          documento: activeDataset?.metadata,
          colaboradores: colaboradores.map((c: any) => ({
            id: c.id,
            colaborador: c.colaborador,
            dias_trabalhados: c.resumo_dias?.dias_trabalhados,
            total_horas_extras: {
              he_1_50: c.totais?.he_1_50 || c.totais?.he_50,
              he_2_100: c.totais?.he_2_100 || c.totais?.he_100,
              adicional_noturno: c.totais?.adicional_noturno
            }
          }))
        },
        null,
        2
      );
    }

    return JSON.stringify(activeDataset, null, 2);
  }, [viewMode, selectedColab, showHiddenColumns, colaboradores, activeDataset]);

  const handleDataLoaded = (newDataset: any, fileName: string) => {
    const consistentDataset = ensureDateConsistencyAndColumnAlignment(newDataset);
    setActiveDataset(consistentDataset);
    setLoadedFileName(fileName);
    setSelectedColabIndex(0);
    setColabSearchQuery('');
  };

  const handleClearData = () => {
    setActiveDataset(null);
    setLoadedFileName(null);
    setSelectedColabIndex(0);
    setColabSearchQuery('');
    setSearchTerm('');
  };

  const handleLoadSample = () => {
    const consistentDataset = ensureDateConsistencyAndColumnAlignment(datasetOriginal);
    setActiveDataset(consistentDataset);
    setLoadedFileName('espelho_ponto_demonstracao.pdf');
    setSelectedColabIndex(0);
    setColabSearchQuery('');
    setSearchTerm('');
  };

  const handleCopyJson = () => {
    if (!activeDataset) return;
    navigator.clipboard.writeText(currentJsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadJson = () => {
    if (!activeDataset) return;
    const blob = new Blob([currentJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = loadedFileName ? loadedFileName.replace(/\.[^/.]+$/, '') : 'pontomais_compesa';
    a.download =
      viewMode === 'original_sheet' && selectedColab
        ? `${baseName}_${selectedColab.colaborador.toLowerCase().replace(/\s+/g, '_')}.json`
        : `${baseName}_horas_extras.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!activeDataset) return;
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Application Toolbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Header Title */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
            <span className="text-sm font-bold text-slate-800 tracking-tight">
              {activeDataset?.metadata?.departamento ? `${activeDataset.metadata.departamento} · Espelho de Ponto` : 'Espelho de Ponto · Importação PDF'}
            </span>
            {loadedFileName ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>{loadedFileName}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                <span>Aguardando Upload</span>
              </span>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('original_sheet')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === 'original_sheet'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tabela Formatada</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('general_table')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  viewMode === 'general_table'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Lista Geral ({colaboradores.length})</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              {/* Button de Limpeza dos dados já carregados */}
              {activeDataset && (
                <button
                  type="button"
                  onClick={handleClearData}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 hover:text-rose-800 transition-colors shadow-2xs"
                  title="Limpar dados carregados e retornar ao estado de upload"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Limpar Dados</span>
                </button>
              )}

              <button
                type="button"
                disabled={!activeDataset}
                onClick={() => setShowHiddenColumns(!showHiddenColumns)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed ${
                  showHiddenColumns
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={showHiddenColumns ? 'Ocultar colunas de Totais da jornada, Saldo e Motivo' : 'Exibir colunas de Totais da jornada, Saldo e Motivo'}
              >
                {showHiddenColumns ? <Eye className="w-3.5 h-3.5 text-amber-700" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                <span>{showHiddenColumns ? 'Totais & Saldo: [Exibindo]' : 'Totais & Saldo: [Ocultos]'}</span>
              </button>

              <button
                type="button"
                disabled={!activeDataset}
                onClick={handlePrint}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Imprimir Tabela"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={!activeDataset}
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                disabled={!activeDataset}
                onClick={handleDownloadJson}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .JSON</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-5 w-full flex-1 space-y-4">
        {/* Dynamic Drag-and-Drop PDF Upload Area */}
        <PdfDropzone
          onDataLoaded={handleDataLoaded}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          currentLoadedFileName={loadedFileName}
          onClearData={handleClearData}
          hasData={!!activeDataset}
          onLoadSample={handleLoadSample}
        />

        {/* State when no file/data is loaded */}
        {!activeDataset ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs my-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3.5 border border-emerald-100 shadow-2xs">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">
              Aguardando upload do espelho de ponto
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
              O sistema inicia sem dados pré-carregados. Arraste e solte o arquivo <strong>PDF</strong> na área acima ou clique para selecionar do seu computador. Os dados serão interpretados e a tabela preenchida automaticamente.
            </p>

            <div className="inline-flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-medium text-slate-700">Aguardando arquivo PDF</span>
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: ESPELHO ORIGINAL COM AS COLUNAS OCULTADAS */}
            {viewMode === 'original_sheet' && selectedColab && (
          <div className="space-y-4">
            {/* Collaborator Selector Banner */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs print:hidden">
              <div className="flex items-center gap-2 relative">
                <span className="text-xs font-medium text-slate-600 shrink-0">Colaborador:</span>
                
                {/* Personalized Combobox */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-slate-400 focus:outline-hidden flex items-center justify-between gap-3 min-w-[240px] sm:min-w-[310px] shadow-2xs transition-colors"
                  >
                    <span className="truncate">{selectedColab.colaborador}</span>
                    <div className="flex items-center gap-1 text-slate-400 shrink-0">
                      <Search className="w-3.5 h-3.5" />
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Searchable Dropdown Popup */}
                  {isDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setColabSearchQuery('');
                        }}
                      />
                      <div className="absolute left-0 top-full mt-1 w-full sm:min-w-[340px] bg-white border border-slate-300 rounded-md shadow-lg z-50 overflow-hidden text-xs">
                        <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Digitar nome para pesquisar..."
                            value={colabSearchQuery}
                            onChange={(e) => setColabSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-900 focus:outline-hidden"
                          />
                          {colabSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setColabSearchQuery('')}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                          {searchedColabsForDropdown.length === 0 ? (
                            <div className="py-3 px-3 text-center text-slate-500 text-xs">
                              Nenhum colaborador encontrado
                            </div>
                          ) : (
                            searchedColabsForDropdown.map((c: any) => {
                              const isSelected = selectedColabIndex === c.originalIndex;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedColabIndex(c.originalIndex);
                                    setIsDropdownOpen(false);
                                    setColabSearchQuery('');
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-50 text-emerald-950 font-semibold'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="truncate">{c.colaborador}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  disabled={selectedColabIndex === 0}
                  onClick={() => setSelectedColabIndex((prev) => Math.max(0, prev - 1))}
                  className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <span className="font-mono text-slate-500">
                  {selectedColabIndex + 1} de {colaboradores.length}
                </span>
                <button
                  type="button"
                  disabled={selectedColabIndex === colaboradores.length - 1}
                  onClick={() => setSelectedColabIndex((prev) => Math.min(colaboradores.length - 1, prev + 1))}
                  className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  Próximo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mapped Document Sheet with Hidden Columns Removed */}
            <div className="bg-white border border-slate-300 rounded-lg p-4 sm:p-6 shadow-xs max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
              {/* Header section with selected divs removed */}
              <div className="border-b border-slate-200 pb-2.5 mb-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 text-xs">Colaborador:</span>{' '}
                  <span className="font-bold text-slate-900 text-sm tracking-wide">
                    {selectedColab.colaborador}
                  </span>
                </div>
                <div className="font-bold text-xl text-slate-900 tracking-tight">
                  Jornada
                </div>
              </div>

              {/* Statistical Column Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
                <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                    <span>Soma H.E. 1 (50%)</span>
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
                    {colabMetrics.he50}h
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Noturno: {selectedColab.totais?.he_1_50_noturno || '00:00'}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                    <span>Soma H.E. 2 (100%)</span>
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-lg font-bold font-mono text-blue-700 tabular-nums mt-0.5">
                    {colabMetrics.he100}h
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Noturno: {selectedColab.totais?.he_2_100_noturno || '00:00'}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                    <span>Soma Adic. Noturno</span>
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-lg font-bold font-mono text-indigo-700 tabular-nums mt-0.5">
                    {colabMetrics.noturno}h
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Total noturno apurado
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                    <span>Total de Batidas</span>
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="text-lg font-bold font-mono text-slate-800 tabular-nums mt-0.5">
                    {colabMetrics.totalBatidas}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Em {colabMetrics.diasTrabalhados} dias trabalhados
                  </div>
                </div>
              </div>

              {/* Document Table with Selected Columns Visible */}
              <div className="overflow-x-auto border border-slate-400">
                <table className="w-full border-collapse text-[10.5px] font-sans">
                  <thead>
                    {/* Top Group Header Row */}
                    <tr className="bg-slate-100 text-slate-700 text-center font-semibold border-b border-slate-300">
                      <th rowSpan={2} className="border-r border-slate-300 py-1.5 px-3 text-center min-w-[175px] w-48">
                        Data
                      </th>
                      <th colSpan={4} className="border-r border-slate-300 py-1 px-1 bg-slate-100/90">
                        Pontos
                      </th>

                      {/* Optional Totais da jornada (Hidden by default) */}
                      {showHiddenColumns && (
                        <th colSpan={4} className="border-r border-slate-300 py-1 px-1 bg-amber-50/70 text-amber-900">
                          Totais da jornada
                        </th>
                      )}

                      <th colSpan={3} className={`py-1 px-1 bg-slate-100/90 ${showHiddenColumns ? 'border-r border-slate-300' : ''}`}>
                        Total de H. Extras
                      </th>

                      {/* Optional Saldo & Motivo (Hidden by default) */}
                      {showHiddenColumns && (
                        <>
                          <th rowSpan={2} className="border-r border-slate-300 py-1.5 px-2 text-right w-16 bg-amber-50/70 text-amber-900">
                            Saldo
                          </th>
                          <th rowSpan={2} className="py-1.5 px-2 text-left min-w-[130px] bg-amber-50/70 text-amber-900">
                            Motivo/Observação
                          </th>
                        </>
                      )}
                    </tr>

                    {/* Sub-Header Columns Row */}
                    <tr className="bg-slate-100 text-slate-700 text-[10px] font-semibold border-b border-slate-400">
                      <th className="border-r border-slate-300 py-1 px-1 text-center w-14">1ª Entrada</th>
                      <th className="border-r border-slate-300 py-1 px-1 text-center w-14">1ª Saída</th>
                      <th className="border-r border-slate-300 py-1 px-1 text-center w-14">2ª Entrada</th>
                      <th className="border-r border-slate-300 py-1 px-1 text-center w-14">2ª Saída</th>

                      {showHiddenColumns && (
                        <>
                          <th className="border-r border-slate-300 py-1 px-1 text-center w-12 bg-amber-50/50">Crédito</th>
                          <th className="border-r border-slate-300 py-1 px-1 text-center w-12 bg-amber-50/50">Débito</th>
                          <th className="border-r border-slate-300 py-1 px-1 text-center w-14 bg-amber-50/50">H. intervalo</th>
                          <th className="border-r border-slate-300 py-1 px-1 text-center w-14 bg-amber-50/50">Horas normais</th>
                        </>
                      )}

                      <th className="border-r border-slate-300 py-1 px-2 text-center w-20">H.E. 1 (50%)</th>
                      <th className="border-r border-slate-300 py-1 px-2 text-center w-20">H.E. 2 (100%)</th>
                      <th className="py-1 px-2 text-center w-24">Adicional noturno</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 font-mono text-[10.5px]">
                    {selectedColab.registros && selectedColab.registros.length > 0 ? (
                      selectedColab.registros.map((row: any, rIdx: number) => {
                        const isDomingo =
                          row.dia_semana === 'Dom' ||
                          row.dia_semana === 'Domingo' ||
                          (typeof row.data === 'string' && row.data.toLowerCase().includes('domingo'));

                        const he100Val = formatTimeWithoutZero(
                          row.total_horas_extras?.he_2_100 || row.horas_extras?.he_100
                        );
                        const hasHe100 = Boolean(he100Val && he100Val !== '00:00' && he100Val !== '0');

                        const isHighlightedRed = isDomingo || hasHe100;
                        const isWeekend = row.dia_semana === 'Sáb' || row.dia_semana === 'Dom';

                        return (
                          <tr
                            key={rIdx}
                            className={`transition-colors ${
                              isHighlightedRed
                                ? 'bg-rose-50/90 hover:bg-rose-100/90 text-rose-950'
                                : isWeekend
                                ? 'bg-slate-50/60 hover:bg-slate-100/70'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Data */}
                            <td className={`py-1 px-3 border-r border-slate-300 font-sans whitespace-nowrap ${
                              isHighlightedRed ? 'text-rose-900 font-semibold' : 'text-slate-800'
                            }`}>
                              {formatDateWithWeekday(row.data, row.dia_semana)}
                            </td>

                            {/* Pontos */}
                            <td className="py-1 px-1 border-r border-slate-300 text-center text-slate-700">
                              {row.pontos?.entrada_1 || ''}
                            </td>
                            <td className="py-1 px-1 border-r border-slate-300 text-center text-slate-700">
                              {row.pontos?.saida_1 || ''}
                            </td>
                            <td className="py-1 px-1 border-r border-slate-300 text-center text-slate-700">
                              {row.pontos?.entrada_2 || ''}
                            </td>
                            <td className="py-1 px-1 border-r border-slate-300 text-center text-slate-700">
                              {row.pontos?.saida_2 || ''}
                            </td>

                            {/* Optional Totais da jornada */}
                            {showHiddenColumns && (
                              <>
                                <td className={`py-1 px-1 border-r border-slate-300 text-center text-slate-700 ${isHighlightedRed ? '' : 'bg-amber-50/20'}`}>
                                  {formatTimeWithoutZero(row.totais_jornada?.credito)}
                                </td>
                                <td className={`py-1 px-1 border-r border-slate-300 text-center text-slate-700 ${isHighlightedRed ? '' : 'bg-amber-50/20'}`}>
                                  {formatTimeWithoutZero(row.totais_jornada?.debito)}
                                </td>
                                <td className={`py-1 px-1 border-r border-slate-300 text-center text-slate-700 ${isHighlightedRed ? '' : 'bg-amber-50/20'}`}>
                                  {formatTimeWithoutZero(row.totais_jornada?.h_intervalo || row.totais_jornada?.intervalo)}
                                </td>
                                <td className={`py-1 px-1 border-r border-slate-300 text-center text-slate-700 ${isHighlightedRed ? '' : 'bg-amber-50/20'}`}>
                                  {formatTimeWithoutZero(row.totais_jornada?.horas_normais)}
                                </td>
                              </>
                            )}

                            {/* Total de Horas Extras */}
                            <td className="py-1 px-2 border-r border-slate-300 text-center text-slate-800 font-medium">
                              {formatTimeWithoutZero(row.total_horas_extras?.he_1_50 || row.horas_extras?.he_50)}
                            </td>
                            <td className={`py-1 px-2 border-r border-slate-300 text-center font-medium ${
                              hasHe100 ? 'text-rose-700 font-bold bg-rose-100/40' : 'text-slate-800'
                            }`}>
                              {he100Val}
                            </td>
                            <td className={`py-1 px-2 text-center text-slate-700 ${showHiddenColumns ? 'border-r border-slate-300' : ''}`}>
                              {formatTimeWithoutZero(row.total_horas_extras?.adicional_noturno || row.horas_extras?.adicional_noturno)}
                            </td>

                            {/* Optional Saldo & Motivo */}
                            {showHiddenColumns && (
                              <>
                                <td className={`py-1 px-2 border-r border-slate-300 text-right font-semibold text-slate-800 ${isHighlightedRed ? '' : 'bg-amber-50/20'}`}>
                                  {formatTimeWithoutZero(row.saldo)}
                                </td>
                                <td className={`py-1 px-2 font-sans text-slate-700 whitespace-nowrap text-[10px] ${isHighlightedRed ? '' : 'bg-amber-50/20'}`}>
                                  {formatTimeWithoutZero(row.motivo_observacao)}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    ) : null}
                  </tbody>
                </table>
              </div>

              {/* End of Document Table */}
            </div>
          </div>
        )}

        {viewMode === 'original_sheet' && !selectedColab && (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-sm shadow-xs">
            Nenhum registro de colaborador disponível para exibição no momento. Arraste um arquivo PDF acima para carregar os dados.
          </div>
        )}

        {/* VIEW 2: LISTA GERAL COM AS COLUNAS ESPECÍFICAS */}
        {viewMode === 'general_table' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar colaborador por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded text-xs whitespace-nowrap ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white font-medium'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({colaboradores.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('he50')}
                  className={`px-2.5 py-1 rounded text-xs whitespace-nowrap ${
                    statusFilter === 'he50'
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Com H.E. 50%
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('he100')}
                  className={`px-2.5 py-1 rounded text-xs whitespace-nowrap ${
                    statusFilter === 'he100'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Com H.E. 100%
                </button>
              </div>
            </div>

            {/* Consolidated Table */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 w-12">#</th>
                    <th className="py-2.5 px-3">Colaborador</th>
                    <th className="py-2.5 px-3 text-center">Dias Trab.</th>
                    <th className="py-2.5 px-3 text-right font-mono text-emerald-800">H.E. 1 (50%)</th>
                    <th className="py-2.5 px-3 text-right font-mono text-blue-800">H.E. 2 (100%)</th>
                    <th className="py-2.5 px-3 text-right font-mono">Adic. Noturno</th>
                    <th className="py-2.5 px-3 text-center">Visualizar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredColaboradores.map((c: any) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        const originalIdx = colaboradores.findIndex((item: any) => item.id === c.id);
                        if (originalIdx !== -1) setSelectedColabIndex(originalIdx);
                        setViewMode('original_sheet');
                      }}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-400">{c.id.toString().padStart(2, '0')}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{c.colaborador}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{c.resumo_dias?.dias_trabalhados}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold">{formatTimeWithoutZero(c.totais?.he_50 || c.totais?.he_1_50)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-700 font-semibold">{formatTimeWithoutZero(c.totais?.he_2_100 || c.totais?.he_100)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">{formatTimeWithoutZero(c.totais?.adicional_noturno)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          className="px-2.5 py-1 text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors font-medium"
                        >
                          Ver Espelho
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    )}
  </main>
    </div>
  );
}
