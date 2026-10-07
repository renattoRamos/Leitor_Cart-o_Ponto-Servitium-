import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Printer,
  Clock,
  ChevronDown,
  X,
  TrendingUp,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { PdfDropzone } from './components/PdfDropzone';
import { EditableCell } from './components/EditableCell';
import {
  ensureDateConsistencyAndColumnAlignment,
  formatTimeWithoutZero,
  formatDateWithWeekday,
  toMinutes,
  minutesToTime,
  validateAndFormatTime
} from './utils/parser';

function saveDatasetToStorage(dataset: any, fileName?: string | null) {
  try {
    if (dataset) {
      localStorage.setItem('pontomais_active_dataset', JSON.stringify(dataset));
      if (fileName) {
        localStorage.setItem('pontomais_loaded_filename', fileName);
      }
    } else {
      localStorage.removeItem('pontomais_active_dataset');
      localStorage.removeItem('pontomais_loaded_filename');
    }
  } catch (err) {
    console.warn('Falha ao persistir dataset no localStorage:', err);
  }
}

function updateRowField(row: any, fieldKey: string, newValue: string): any {
  const updatedRow = { ...row };
  const val = newValue === '' ? null : newValue;

  switch (fieldKey) {
    case 'data':
      updatedRow.data = newValue;
      break;
    case 'entrada_1':
      updatedRow.pontos = { ...(updatedRow.pontos || {}), entrada_1: val };
      break;
    case 'saida_1':
      updatedRow.pontos = { ...(updatedRow.pontos || {}), saida_1: val };
      break;
    case 'entrada_2':
      updatedRow.pontos = { ...(updatedRow.pontos || {}), entrada_2: val };
      break;
    case 'saida_2':
      updatedRow.pontos = { ...(updatedRow.pontos || {}), saida_2: val };
      break;
    case 'credito':
      updatedRow.totais_jornada = { ...(updatedRow.totais_jornada || {}), credito: newValue };
      break;
    case 'debito':
      updatedRow.totais_jornada = { ...(updatedRow.totais_jornada || {}), debito: newValue };
      break;
    case 'h_intervalo':
      updatedRow.totais_jornada = {
        ...(updatedRow.totais_jornada || {}),
        h_intervalo: newValue,
        intervalo: newValue
      };
      break;
    case 'horas_normais':
      updatedRow.totais_jornada = { ...(updatedRow.totais_jornada || {}), horas_normais: newValue };
      break;
    case 'he_50':
      updatedRow.total_horas_extras = {
        ...(updatedRow.total_horas_extras || {}),
        he_1_50: newValue
      };
      updatedRow.horas_extras = {
        ...(updatedRow.horas_extras || {}),
        he_50: newValue
      };
      break;
    case 'he_100':
      updatedRow.total_horas_extras = {
        ...(updatedRow.total_horas_extras || {}),
        he_2_100: newValue
      };
      updatedRow.horas_extras = {
        ...(updatedRow.horas_extras || {}),
        he_100: newValue
      };
      break;
    case 'adic_noturno':
      updatedRow.total_horas_extras = {
        ...(updatedRow.total_horas_extras || {}),
        adicional_noturno: newValue
      };
      updatedRow.horas_extras = {
        ...(updatedRow.horas_extras || {}),
        adicional_noturno: newValue
      };
      break;
    case 'saldo':
      updatedRow.saldo = newValue;
      break;
    case 'motivo':
      updatedRow.motivo_observacao = val;
      break;
  }
  return updatedRow;
}

function applySavedEditsToDataset(dataset: any): any {
  if (!dataset?.colaboradores) return dataset;
  try {
    const rawEdits = localStorage.getItem('pontomais_user_edits');
    if (!rawEdits) return dataset;
    const editsMap = JSON.parse(rawEdits);

    for (const c of dataset.colaboradores) {
      const colabKey = String(c.id ?? c.colaborador);
      const colabEdits = editsMap[colabKey];
      if (colabEdits && c.registros) {
        Object.entries(colabEdits).forEach(([rowIdxStr, fields]: [string, any]) => {
          const rowIdx = parseInt(rowIdxStr, 10);
          if (c.registros[rowIdx]) {
            Object.entries(fields).forEach(([fKey, fVal]: [string, any]) => {
              c.registros[rowIdx] = updateRowField(c.registros[rowIdx], fKey, fVal);
            });
          }
        });

        let sumHe50 = 0;
        let sumHe100 = 0;
        let sumNoturno = 0;
        let totalBatidas = 0;
        let diasTrabalhados = 0;

        for (const r of c.registros) {
          let batidas = 0;
          if (r.pontos?.entrada_1) { totalBatidas++; batidas++; }
          if (r.pontos?.saida_1) { totalBatidas++; batidas++; }
          if (r.pontos?.entrada_2) { totalBatidas++; batidas++; }
          if (r.pontos?.saida_2) { totalBatidas++; batidas++; }

          const m50 = toMinutes(r.total_horas_extras?.he_1_50 || r.horas_extras?.he_50);
          if (m50 > 0) sumHe50 += m50;

          const m100 = toMinutes(r.total_horas_extras?.he_2_100 || r.horas_extras?.he_100);
          if (m100 > 0) sumHe100 += m100;

          const mNot = toMinutes(r.total_horas_extras?.adicional_noturno || r.horas_extras?.adicional_noturno);
          if (mNot > 0) sumNoturno += mNot;

          const mNorm = toMinutes(r.totais_jornada?.horas_normais);
          if (batidas > 0 || m50 > 0 || m100 > 0 || mNorm > 0) {
            diasTrabalhados++;
          }
        }

        c.totais = {
          ...c.totais,
          he_1_50: minutesToTime(sumHe50),
          he_50: minutesToTime(sumHe50),
          he_2_100: minutesToTime(sumHe100),
          he_100: minutesToTime(sumHe100),
          adicional_noturno: minutesToTime(sumNoturno)
        };
        c.resumo_dias = {
          ...c.resumo_dias,
          dias_trabalhados: diasTrabalhados
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao aplicar edições salvas:', err);
  }
  return dataset;
}

export default function App() {
  // Restore active dataset and filename from localStorage if present
  const [activeDataset, setActiveDataset] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('pontomais_active_dataset');
      if (saved) {
        const parsed = JSON.parse(saved);
        return applySavedEditsToDataset(parsed);
      }
    } catch (e) {
      console.warn('Erro ao restaurar dataset salvo:', e);
    }
    return null;
  });

  const [loadedFileName, setLoadedFileName] = useState<string | null>(() => {
    try {
      return localStorage.getItem('pontomais_loaded_filename') || null;
    } catch {
      return null;
    }
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedColabIndex, setSelectedColabIndex] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [colabSearchQuery, setColabSearchQuery] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Cell currently being edited
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; fieldKey: string } | null>(null);

  // Mapa de campos alterados manualmente pelo usuário para exibição do indicador visual
  const [userEdits, setUserEdits] = useState<Record<string, Record<number, Record<string, boolean>>>>(() => {
    try {
      const raw = localStorage.getItem('pontomais_user_edits');
      if (raw) {
        const parsed = JSON.parse(raw);
        const map: Record<string, Record<number, Record<string, boolean>>> = {};
        Object.entries(parsed).forEach(([cKey, rows]: [string, any]) => {
          map[cKey] = {};
          Object.entries(rows).forEach(([rIdx, fields]: [string, any]) => {
            map[cKey][Number(rIdx)] = {};
            Object.keys(fields).forEach((fKey) => {
              map[cKey][Number(rIdx)][fKey] = true;
            });
          });
        });
        return map;
      }
    } catch (e) {
      console.warn('Erro ao restaurar userEdits do localStorage:', e);
    }
    return {};
  });

  // Revoke object URL on unmount or URL replacement
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

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

  // Column metrics for the active collaborator — recalculated dynamically from the displayed rows!
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

    let sumHe50 = 0;
    let sumHe100 = 0;
    let sumNoturno = 0;
    let totalBatidas = 0;
    let diasTrabalhados = 0;

    const registros = selectedColab.registros || [];

    for (const r of registros) {
      let batidas = 0;
      if (r.pontos?.entrada_1) { totalBatidas++; batidas++; }
      if (r.pontos?.saida_1) { totalBatidas++; batidas++; }
      if (r.pontos?.entrada_2) { totalBatidas++; batidas++; }
      if (r.pontos?.saida_2) { totalBatidas++; batidas++; }

      const m50 = toMinutes(r.total_horas_extras?.he_1_50 || r.horas_extras?.he_50);
      if (m50 > 0) sumHe50 += m50;

      const m100 = toMinutes(r.total_horas_extras?.he_2_100 || r.horas_extras?.he_100);
      if (m100 > 0) sumHe100 += m100;

      const mNot = toMinutes(r.total_horas_extras?.adicional_noturno || r.horas_extras?.adicional_noturno);
      if (mNot > 0) sumNoturno += mNot;

      const mNorm = toMinutes(r.totais_jornada?.horas_normais);
      if (batidas > 0 || m50 > 0 || m100 > 0 || mNorm > 0) {
        diasTrabalhados++;
      }
    }

    const he50 = sumHe50 > 0 ? minutesToTime(sumHe50) : (selectedColab.totais?.he_1_50 || selectedColab.totais?.he_50 || '00:00');
    const he100 = sumHe100 > 0 ? minutesToTime(sumHe100) : (selectedColab.totais?.he_2_100 || selectedColab.totais?.he_100 || '00:00');
    const noturno = sumNoturno > 0 ? minutesToTime(sumNoturno) : (selectedColab.totais?.adicional_noturno || '00:00');
    const finalDias = diasTrabalhados > 0 ? diasTrabalhados : (selectedColab.resumo_dias?.dias_trabalhados ?? 0);

    return {
      he50,
      he100,
      noturno,
      diasTrabalhados: finalDias,
      totalBatidas
    };
  }, [selectedColab]);

  // Handle cell edit trigger
  const handleStartEdit = (rowIdx: number, fieldKey: string) => {
    if (fieldKey === 'data') return;
    setEditingCell({ rowIdx, fieldKey });
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  // Commit edit and recalculate totals automatically
  const handleCommitEdit = (newRawVal: string) => {
    if (!editingCell || !selectedColab) return;
    const { rowIdx, fieldKey } = editingCell;
    if (fieldKey === 'data') return;
    const isTime = fieldKey !== 'motivo';
    const formattedVal = isTime ? validateAndFormatTime(newRawVal) : newRawVal.trim();

    const currentRegistros = selectedColab.registros || [];
    const newRegistros = currentRegistros.map((r: any, idx: number) => {
      if (idx !== rowIdx) return r;
      return updateRowField(r, fieldKey, formattedVal);
    });

    let sumHe50 = 0;
    let sumHe100 = 0;
    let sumNoturno = 0;
    let totalBatidas = 0;
    let diasTrabalhados = 0;

    for (const r of newRegistros) {
      let batidas = 0;
      if (r.pontos?.entrada_1) { totalBatidas++; batidas++; }
      if (r.pontos?.saida_1) { totalBatidas++; batidas++; }
      if (r.pontos?.entrada_2) { totalBatidas++; batidas++; }
      if (r.pontos?.saida_2) { totalBatidas++; batidas++; }

      const m50 = toMinutes(r.total_horas_extras?.he_1_50 || r.horas_extras?.he_50);
      if (m50 > 0) sumHe50 += m50;

      const m100 = toMinutes(r.total_horas_extras?.he_2_100 || r.horas_extras?.he_100);
      if (m100 > 0) sumHe100 += m100;

      const mNot = toMinutes(r.total_horas_extras?.adicional_noturno || r.horas_extras?.adicional_noturno);
      if (mNot > 0) sumNoturno += mNot;

      const mNorm = toMinutes(r.totais_jornada?.horas_normais);
      if (batidas > 0 || m50 > 0 || m100 > 0 || mNorm > 0) {
        diasTrabalhados++;
      }
    }

    const updatedColab = {
      ...selectedColab,
      registros: newRegistros,
      totais: {
        ...selectedColab.totais,
        he_1_50: minutesToTime(sumHe50),
        he_50: minutesToTime(sumHe50),
        he_2_100: minutesToTime(sumHe100),
        he_100: minutesToTime(sumHe100),
        adicional_noturno: minutesToTime(sumNoturno)
      },
      resumo_dias: {
        ...selectedColab.resumo_dias,
        dias_trabalhados: diasTrabalhados
      }
    };

    setActiveDataset((prev: any) => {
      if (!prev) return prev;
      const updatedColabs = [...prev.colaboradores];
      updatedColabs[selectedColabIndex] = updatedColab;
      const newDataset = {
        ...prev,
        colaboradores: updatedColabs
      };
      saveDatasetToStorage(newDataset, loadedFileName);
      return newDataset;
    });

    // Persist specific edit log in localStorage
    const colabKey = String(selectedColab.id ?? selectedColab.colaborador);
    try {
      const rawEdits = localStorage.getItem('pontomais_user_edits');
      const editsMap = rawEdits ? JSON.parse(rawEdits) : {};
      if (!editsMap[colabKey]) editsMap[colabKey] = {};
      if (!editsMap[colabKey][rowIdx]) editsMap[colabKey][rowIdx] = {};
      editsMap[colabKey][rowIdx][fieldKey] = formattedVal;
      localStorage.setItem('pontomais_user_edits', JSON.stringify(editsMap));
    } catch (e) {
      console.warn('Erro ao salvar edição no localStorage:', e);
    }

    // Atualiza estado de campos modificados para refletir os triângulos imediatamente
    setUserEdits((prev) => {
      const next = { ...prev };
      if (!next[colabKey]) next[colabKey] = {};
      if (!next[colabKey][rowIdx]) next[colabKey][rowIdx] = {};
      next[colabKey][rowIdx][fieldKey] = true;
      return next;
    });

    setEditingCell(null);
  };

  const handleDataLoaded = (newDataset: any, fileName: string, file?: File) => {
    const consistentDataset = ensureDateConsistencyAndColumnAlignment(newDataset);
    const datasetWithEdits = applySavedEditsToDataset(consistentDataset);

    setActiveDataset(datasetWithEdits);
    setLoadedFileName(fileName);
    setSelectedColabIndex(0);
    setColabSearchQuery('');
    setEditingCell(null);

    // Recarrega mapa de edições salvas
    try {
      const rawEdits = localStorage.getItem('pontomais_user_edits');
      if (rawEdits) {
        const parsed = JSON.parse(rawEdits);
        const map: Record<string, Record<number, Record<string, boolean>>> = {};
        Object.entries(parsed).forEach(([cKey, rows]: [string, any]) => {
          map[cKey] = {};
          Object.entries(rows).forEach(([rIdx, fields]: [string, any]) => {
            map[cKey][Number(rIdx)] = {};
            Object.keys(fields).forEach((fKey) => {
              map[cKey][Number(rIdx)][fKey] = true;
            });
          });
        });
        setUserEdits(map);
      }
    } catch {
      // ignore
    }

    saveDatasetToStorage(datasetWithEdits, fileName);

    if (file) {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      let url: string;
      if (file.type === 'application/pdf') {
        url = URL.createObjectURL(file);
      } else {
        const pdfBlob = new Blob([file], { type: 'application/pdf' });
        url = URL.createObjectURL(pdfBlob);
      }
      setPdfBlobUrl(url);
    }
  };

  const handleClearData = () => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
    }
    setActiveDataset(null);
    setLoadedFileName(null);
    setPdfBlobUrl(null);
    setSelectedColabIndex(0);
    setColabSearchQuery('');
    setEditingCell(null);
    setUserEdits({});

    try {
      localStorage.removeItem('pontomais_active_dataset');
      localStorage.removeItem('pontomais_loaded_filename');
      localStorage.removeItem('pontomais_user_edits');
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    if (!activeDataset) return;
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Application Toolbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
          {/* Header Title */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight truncate">
              {activeDataset?.metadata?.departamento ? `${activeDataset.metadata.departamento} · Espelho de Ponto` : 'Espelho de Ponto · Importação PDF'}
            </span>
            {loadedFileName ? (
              pdfBlobUrl ? (
                <a
                  href={pdfBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-300 transition-colors shadow-2xs max-w-full truncate"
                  title="Clique para abrir o arquivo PDF original em uma nova aba"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                  <span className="truncate">{loadedFileName}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 max-w-full truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                  <span className="truncate">{loadedFileName}</span>
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                <span>Aguardando Upload</span>
              </span>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 justify-end shrink-0">
            <button
              type="button"
              disabled={!activeDataset}
              onClick={handlePrint}
              className="px-2.5 sm:px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
              title="Imprimir Folha de Ponto"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-5 w-full flex-1 space-y-3 sm:space-y-4 overflow-x-hidden">
        {/* Dynamic Drag-and-Drop PDF Upload Area */}
        <PdfDropzone
          onDataLoaded={handleDataLoaded}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          currentLoadedFileName={loadedFileName}
          pdfUrl={pdfBlobUrl}
          onClearData={handleClearData}
          hasData={!!activeDataset}
        />

        {/* View and table when data is loaded */}
        {activeDataset && (
          selectedColab ? (
            <div className="space-y-4">
            {/* Collaborator Selector Banner */}
            <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shadow-2xs print:hidden">
              <div className="flex items-center gap-2 relative w-full sm:w-auto">
                <span className="text-xs font-medium text-slate-600 shrink-0">Colaborador:</span>
                
                {/* Personalized Combobox */}
                <div className="relative flex-1 sm:flex-initial min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-white border border-slate-300 rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-slate-400 focus:outline-hidden flex items-center justify-between gap-2 min-w-0 sm:min-w-[280px] md:min-w-[320px] shadow-2xs transition-colors"
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

              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  type="button"
                  disabled={selectedColabIndex === 0}
                  onClick={() => setSelectedColabIndex((prev) => Math.max(0, prev - 1))}
                  className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <span className="font-mono text-slate-500 text-xs">
                  {selectedColabIndex + 1} de {colaboradores.length}
                </span>
                <button
                  type="button"
                  disabled={selectedColabIndex === colaboradores.length - 1}
                  onClick={() => setSelectedColabIndex((prev) => Math.min(colaboradores.length - 1, prev + 1))}
                  className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1 text-xs"
                >
                  Próximo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mapped Document Sheet with Columns Excluded */}
            <div className="bg-white border border-slate-300 rounded-lg p-2.5 sm:p-5 md:p-6 shadow-xs max-w-5xl mx-auto print:border-none print:shadow-none print:p-0">
              {/* Header section */}
              <div className="border-b border-slate-200 pb-2 mb-2.5 sm:mb-3 flex items-center justify-between flex-wrap gap-1">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-600 text-[11px] sm:text-xs">Colaborador:</span>{' '}
                  <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-wide truncate block sm:inline">
                    {selectedColab.colaborador}
                  </span>
                </div>
                <div className="font-bold text-base sm:text-lg md:text-xl text-slate-900 tracking-tight shrink-0">
                  Jornada
                </div>
              </div>

              {/* Statistical Column Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 mb-2.5 sm:mb-3.5">
                <div className="bg-slate-50 border border-slate-200 rounded-md p-2 sm:p-2.5">
                  <div className="text-[10.5px] sm:text-[11px] font-medium text-slate-500 flex items-center justify-between">
                    <span className="truncate">Soma H.E. 1 (50%)</span>
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0 ml-1" />
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
                    {colabMetrics.he50}h
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-400 mt-0.5 truncate">
                    Noturno: {selectedColab.totais?.he_1_50_noturno || '00:00'}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-2 sm:p-2.5">
                  <div className="text-[10.5px] sm:text-[11px] font-medium text-slate-500 flex items-center justify-between">
                    <span className="truncate">Soma H.E. 2 (100%)</span>
                    <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 shrink-0 ml-1" />
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-blue-700 tabular-nums mt-0.5">
                    {colabMetrics.he100}h
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-400 mt-0.5 truncate">
                    Noturno: {selectedColab.totais?.he_2_100_noturno || '00:00'}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-2 sm:p-2.5">
                  <div className="text-[10.5px] sm:text-[11px] font-medium text-slate-500 flex items-center justify-between">
                    <span className="truncate">Soma Adic. Noturno</span>
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 shrink-0 ml-1" />
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-indigo-700 tabular-nums mt-0.5">
                    {colabMetrics.noturno}h
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-400 mt-0.5 truncate">
                    Total noturno apurado
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-2 sm:p-2.5">
                  <div className="text-[10.5px] sm:text-[11px] font-medium text-slate-500 flex items-center justify-between">
                    <span className="truncate">Total de Batidas</span>
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 shrink-0 ml-1" />
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-slate-800 tabular-nums mt-0.5">
                    {colabMetrics.totalBatidas}
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-400 mt-0.5 truncate">
                    Em {colabMetrics.diasTrabalhados} dias trabalhados
                  </div>
                </div>
              </div>

              {/* Informative Spreadsheet Tip */}
              <div className="flex flex-wrap items-center justify-between text-[10.5px] sm:text-[11px] text-slate-500 pb-1 gap-1.5 print:hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <span>Duplo clique em qualquer célula para alterar ou adicionar valores.</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[10.5px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <span className="w-0 h-0 border-solid border-t-[5px] border-t-amber-500 border-l-[5px] border-l-transparent shrink-0"></span>
                    <span>Modificado manualmente</span>
                  </span>
                </div>
                <span className="text-[10px] sm:text-[10.5px] text-slate-400 hidden sm:inline">
                  Enter ou clique fora para salvar automaticamente · Esc para cancelar
                </span>
              </div>

              {/* Document Table without Totais da jornada, Saldo and Motivo */}
              <div className="overflow-x-auto border border-slate-300 rounded-xs shadow-2xs">
                <table className="w-full border-collapse text-[10.5px] font-sans min-w-[560px]">
                  <thead>
                    {/* Top Group Header Row */}
                    <tr className="bg-slate-100 text-slate-700 text-center font-semibold border-b border-slate-300">
                      <th rowSpan={2} className="border-r border-slate-300 py-1.5 px-2.5 text-center w-28 sm:w-36">
                        Data
                      </th>
                      <th colSpan={4} className="border-r border-slate-300 py-1 px-1 bg-slate-100/90">
                        Pontos
                      </th>
                      <th colSpan={3} className="py-1 px-1 bg-slate-100/90">
                        Total de H. Extras
                      </th>
                    </tr>

                    {/* Sub-Header Columns Row */}
                    <tr className="bg-slate-100 text-slate-700 text-[10px] font-semibold border-b border-slate-400">
                      <th className="border-r border-slate-300 py-1 px-1 text-center w-14 sm:w-16">1ª Entrada</th>
                      <th className="border-r border-slate-300 py-1 px-1 text-center w-14 sm:w-16">1ª Saída</th>
                      <th className="border-r border-slate-300 py-1 px-1 text-center w-14 sm:w-16">2ª Entrada</th>
                      <th className="border-r border-slate-300 py-1 px-1 text-center w-14 sm:w-16">2ª Saída</th>
                      <th className="border-r border-slate-300 py-1 px-1.5 text-center w-16 sm:w-20">H.E. 1 (50%)</th>
                      <th className="border-r border-slate-300 py-1 px-1.5 text-center w-16 sm:w-20">H.E. 2 (100%)</th>
                      <th className="py-1 px-1.5 text-center w-20 sm:w-24">Adicional noturno</th>
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

                        const colabKey = String(selectedColab.id ?? selectedColab.colaborador);
                        const rowEdits = userEdits[colabKey]?.[rIdx] || {};

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
                            <EditableCell
                              value={row.data}
                              rawDisplayValue={formatDateWithWeekday(row.data, row.dia_semana)}
                              fieldKey="data"
                              rowIdx={rIdx}
                              editingCell={editingCell}
                              onStartEdit={handleStartEdit}
                              onCommit={handleCommitEdit}
                              onCancel={handleCancelEdit}
                              align="left"
                              isTime={false}
                              readOnly={true}
                              className={`py-1 px-2.5 border-r border-slate-300 font-sans whitespace-nowrap ${
                                isHighlightedRed ? 'text-rose-900 font-semibold' : 'text-slate-800'
                              }`}
                            />

                            {/* Pontos */}
                            <EditableCell
                              value={row.pontos?.entrada_1}
                              rawDisplayValue={row.pontos?.entrada_1 || ''}
                              fieldKey="entrada_1"
                              rowIdx={rIdx}
                              editingCell={editingCell}
                              onStartEdit={handleStartEdit}
                              onCommit={handleCommitEdit}
                              onCancel={handleCancelEdit}
                              isModified={Boolean(rowEdits['entrada_1'])}
                              className="py-1 px-1 border-r border-slate-300 text-center text-slate-700"
                            />
                            <EditableCell
                              value={row.pontos?.saida_1}
                              rawDisplayValue={row.pontos?.saida_1 || ''}
                              fieldKey="saida_1"
                              rowIdx={rIdx}
                              editingCell={editingCell}
                              onStartEdit={handleStartEdit}
                              onCommit={handleCommitEdit}
                              onCancel={handleCancelEdit}
                              isModified={Boolean(rowEdits['saida_1'])}
                              className="py-1 px-1 border-r border-slate-300 text-center text-slate-700"
                            />
                            <EditableCell
                              value={row.pontos?.entrada_2}
                              rawDisplayValue={row.pontos?.entrada_2 || ''}
                              fieldKey="entrada_2"
                              rowIdx={rIdx}
                              editingCell={editingCell}
                              onStartEdit={handleStartEdit}
                              onCommit={handleCommitEdit}
                              onCancel={handleCancelEdit}
                              isModified={Boolean(rowEdits['entrada_2'])}
                              className="py-1 px-1 border-r border-slate-300 text-center text-slate-700"
                            />
                            <EditableCell
                              value={row.pontos?.saida_2}
                              rawDisplayValue={row.pontos?.saida_2 || ''}
                              fieldKey="saida_2"
                              rowIdx={rIdx}
                              editingCell={editingCell}
                              onStartEdit={handleStartEdit}
                              onCommit={handleCommitEdit}
                              onCancel={handleCancelEdit}
                              isModified={Boolean(rowEdits['saida_2'])}
                              className="py-1 px-1 border-r border-slate-300 text-center text-slate-700"
                            />

                            {/* Total de Horas Extras */}
                            <EditableCell
                              value={row.total_horas_extras?.he_1_50 || row.horas_extras?.he_50}
                              rawDisplayValue={formatTimeWithoutZero(row.total_horas_extras?.he_1_50 || row.horas_extras?.he_50)}
                              fieldKey="he_50"
                              rowIdx={rIdx}
                              editingCell={editingCell}
                              onStartEdit={handleStartEdit}
                              onCommit={handleCommitEdit}
                              onCancel={handleCancelEdit}
                              isModified={Boolean(rowEdits['he_50'])}
                              className="py-1 px-1.5 sm:px-2 border-r border-slate-300 text-center text-slate-800 font-medium"
                            />
                            <EditableCell
                              value={row.total_horas_extras?.he_2_100 || row.horas_extras?.he_100}
                              rawDisplayValue={he100Val}
                              fieldKey="he_100"
                              rowIdx={rIdx}
                              editingCell={editingCell}
                              onStartEdit={handleStartEdit}
                              onCommit={handleCommitEdit}
                              onCancel={handleCancelEdit}
                              isModified={Boolean(rowEdits['he_100'])}
                              className={`py-1 px-1.5 sm:px-2 border-r border-slate-300 text-center font-medium ${
                                hasHe100 ? 'text-rose-700 font-bold bg-rose-100/40' : 'text-slate-800'
                              }`}
                            />
                            <EditableCell
                              value={row.total_horas_extras?.adicional_noturno || row.horas_extras?.adicional_noturno}
                              rawDisplayValue={formatTimeWithoutZero(row.total_horas_extras?.adicional_noturno || row.horas_extras?.adicional_noturno)}
                              fieldKey="adic_noturno"
                              rowIdx={rIdx}
                              editingCell={editingCell}
                              onStartEdit={handleStartEdit}
                              onCommit={handleCommitEdit}
                              onCancel={handleCancelEdit}
                              isModified={Boolean(rowEdits['adic_noturno'])}
                              className="py-1 px-1.5 sm:px-2 text-center text-slate-700"
                            />
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
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 text-center text-slate-500 text-xs sm:text-sm shadow-xs">
            Nenhum registro de colaborador disponível para exibição no momento. Arraste um arquivo PDF acima para carregar os dados.
          </div>
        ))}
  </main>
    </div>
  );
}
