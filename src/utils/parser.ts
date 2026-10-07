export interface RegistroDia {
  data: string;
  dia_semana: string;
  pontos: {
    entrada_1: string | null;
    saida_1: string | null;
    entrada_2: string | null;
    saida_2: string | null;
  };
  totais_jornada: {
    credito: string;
    debito: string;
    h_intervalo?: string;
    intervalo?: string;
    horas_normais: string;
  };
  total_horas_extras?: {
    he_1_50: string;
    he_1_50_noturno?: string;
    he_2_100: string;
    he_2_100_noturno?: string;
    adicional_noturno: string;
  };
  horas_extras?: {
    he_50: string;
    he_100: string;
    adicional_noturno: string;
  };
  saldo: string;
  motivo_observacao: string | null;
  ajustado?: boolean[];
}

export function toMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return -1;
  const parts = timeStr.replace(/^-/, '').split(':');
  if (parts.length < 2) return -1;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

export function getDiaSemana(dataStr: string): string {
  const parts = dataStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const dt = new Date(year, month, day);
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return dias[dt.getDay()] || 'Seg';
  }
  return 'Seg';
}

/**
 * Retorna string vazia se o valor for zero ('00:00', '+00:00', '-00:00', etc.) ou nulo/indefinido.
 * Caso contrário, retorna o próprio valor formatado sem '00:00' desnecessários.
 */
export function formatTimeWithoutZero(val: string | null | undefined): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  // Se for "00:00", "+00:00", "-00:00", "0:00", "00:00:00", "0", etc., não exibir
  if (/^[+-]?0{1,2}:00(?::00)?$/.test(trimmed) || trimmed === '0' || trimmed === '+0' || trimmed === '-0') {
    return '';
  }
  return trimmed;
}

/**
 * Formata a data no padrão solicitado: "dd/mm/aaaa - dddd"
 * Exemplo: "01/08/2026 - Sábado"
 */
export function formatDateWithWeekday(dataStr: string, diaSemanaFallback?: string): string {
  if (!dataStr) return '';
  const match = dataStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return dataStr;

  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];

  const d = parseInt(day, 10);
  const m = parseInt(month, 10) - 1;
  const y = parseInt(year, 10);
  const dt = new Date(y, m, d);

  const diasExtenso = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];

  let dddd = !isNaN(dt.getTime()) ? diasExtenso[dt.getDay()] : '';
  if (!dddd && diaSemanaFallback) {
    const mapFallback: Record<string, string> = {
      dom: 'Domingo',
      seg: 'Segunda-feira',
      ter: 'Terça-feira',
      qua: 'Quarta-feira',
      qui: 'Quinta-feira',
      sex: 'Sexta-feira',
      sab: 'Sábado',
      sáb: 'Sábado'
    };
    dddd = mapFallback[diaSemanaFallback.toLowerCase()] || diaSemanaFallback;
  }

  return dddd ? `${day}/${month}/${year} - ${dddd}` : `${day}/${month}/${year}`;
}

/**
 * Resilient punch classification preventing column shifting when there are
 * absences, missing lunch punches, or single punches.
 */
export function classifyPunches(
  batidas: string[],
  normais?: string
): {
  entrada_1: string | null;
  saida_1: string | null;
  entrada_2: string | null;
  saida_2: string | null;
} {
  const clean = (batidas || []).filter(
    (b) => typeof b === 'string' && b.trim() !== '' && b !== '00:00'
  );

  if (clean.length === 0) {
    return { entrada_1: null, saida_1: null, entrada_2: null, saida_2: null };
  }

  // 4 or more punches: regular complete shift
  if (clean.length >= 4) {
    return {
      entrada_1: clean[0],
      saida_1: clean[1],
      entrada_2: clean[2],
      saida_2: clean[3]
    };
  }

  // 3 punches: 1 missing punch
  if (clean.length === 3) {
    const [b0, b1, b2] = clean;
    const m1 = toMinutes(b1);
    const m2 = toMinutes(b2);

    // If final punch is afternoon/evening (>= 15:30), it's definitely saida_2
    if (m2 >= 15 * 60 + 30) {
      if (m1 <= 12 * 60 + 15) {
        // b1 is lunch departure (saida_1); entrada_2 was missed
        return { entrada_1: b0, saida_1: b1, entrada_2: null, saida_2: b2 };
      } else {
        // b1 is lunch return (entrada_2); saida_1 was missed
        return { entrada_1: b0, saida_1: null, entrada_2: b1, saida_2: b2 };
      }
    } else {
      // Worked morning + lunch only (no afternoon exit)
      return { entrada_1: b0, saida_1: b1, entrada_2: b2, saida_2: null };
    }
  }

  // 2 punches
  if (clean.length === 2) {
    const [b0, b1] = clean;
    const m1 = toMinutes(b1);

    // If second punch is afternoon/evening and normal hours is full day (e.g. 8h),
    // this represents a straight shift without lunch punch (entrada_1 and saida_2)
    if (m1 >= 15 * 60 + 30 && normais !== '04:00') {
      return { entrada_1: b0, saida_1: null, entrada_2: null, saida_2: b1 };
    }
    // Otherwise morning half-day or 4h Saturday shift: entrada_1 and saida_1
    return { entrada_1: b0, saida_1: b1, entrada_2: null, saida_2: null };
  }

  // 1 punch
  if (clean.length === 1) {
    const m0 = toMinutes(clean[0]);
    if (m0 >= 14 * 60) {
      return { entrada_1: null, saida_1: null, entrada_2: null, saida_2: clean[0] };
    }
    return { entrada_1: clean[0], saida_1: null, entrada_2: null, saida_2: null };
  }

  return { entrada_1: null, saida_1: null, entrada_2: null, saida_2: null };
}

/**
 * Calendar consistency verification ensuring all days (e.g. 01..31) are in
 * strictly chronological order, preventing day 25/08 or subsequent days from
 * shifting.
 */
export function alignAndValidateRecords(
  registros: RegistroDia[],
  periodoStr?: string
): RegistroDia[] {
  if (!registros || registros.length === 0) return [];

  // Detect month and year from records or period string
  let month = 8;
  let year = 2026;
  const firstWithDate = registros.find((r) => r.data && /\d{2}\/\d{2}\/\d{4}/.test(r.data));
  if (firstWithDate) {
    const parts = firstWithDate.data.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (parts) {
      month = parseInt(parts[2], 10);
      year = parseInt(parts[3], 10);
    }
  } else if (periodoStr) {
    const parts = periodoStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (parts) {
      month = parseInt(parts[2], 10);
      year = parseInt(parts[3], 10);
    }
  }

  const totalDays = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, '0');
  const yearStr = String(year);

  // Map existing records by day of month (1..totalDays)
  const dayMap = new Map<number, RegistroDia>();
  for (const r of registros) {
    if (r && r.data) {
      const m = r.data.match(/(\d{1,2})\/\d{2}\/\d{4}/);
      if (m) {
        const d = parseInt(m[1], 10);
        if (d >= 1 && d <= totalDays) {
          if (!dayMap.has(d) || (r.pontos?.entrada_1 && !dayMap.get(d)?.pontos?.entrada_1)) {
            dayMap.set(d, r);
          }
        }
      }
    }
  }

  const aligned: RegistroDia[] = [];
  let runningSaldo = '00:00';

  for (let d = 1; d <= totalDays; d++) {
    const expectedDate = `${String(d).padStart(2, '0')}/${monthStr}/${yearStr}`;
    const expectedDiaSemana = getDiaSemana(expectedDate);

    if (dayMap.has(d)) {
      const rec = { ...dayMap.get(d)! };
      rec.data = expectedDate;
      rec.dia_semana = expectedDiaSemana;

      // Resilient punch verification
      const rawPunches = [
        rec.pontos?.entrada_1,
        rec.pontos?.saida_1,
        rec.pontos?.entrada_2,
        rec.pontos?.saida_2
      ].filter((p): p is string => typeof p === 'string' && p.trim() !== '' && p !== '00:00');

      rec.pontos = classifyPunches(rawPunches, rec.totais_jornada?.horas_normais);

      if (rec.saldo && rec.saldo !== '00:00') {
        runningSaldo = rec.saldo;
      }
      aligned.push(rec);
    } else {
      // Missing day placeholder maintaining absolute calendar integrity
      const isWeekend = expectedDiaSemana === 'Sáb' || expectedDiaSemana === 'Dom';
      aligned.push({
        data: expectedDate,
        dia_semana: expectedDiaSemana,
        pontos: { entrada_1: null, saida_1: null, entrada_2: null, saida_2: null },
        totais_jornada: {
          credito: '00:00',
          debito: '00:00',
          h_intervalo: '00:00',
          intervalo: '00:00',
          horas_normais: '00:00'
        },
        total_horas_extras: {
          he_1_50: '00:00',
          he_2_100: '00:00',
          adicional_noturno: '00:00'
        },
        horas_extras: {
          he_50: '00:00',
          he_100: '00:00',
          adicional_noturno: '00:00'
        },
        saldo: runningSaldo,
        motivo_observacao: isWeekend ? 'Folga' : null
      });
    }
  }

  return aligned;
}

export interface ColaboradorPonto {
  id: number;
  colaborador: string;
  departamento?: string;
  periodo?: string;
  totais: {
    credito: string;
    debito: string;
    intervalo?: string;
    h_intervalo?: string;
    horas_normais: string;
    he_50?: string;
    he_1_50?: string;
    he_50_noturno?: string;
    he_1_50_noturno?: string;
    he_100?: string;
    he_2_100?: string;
    he_100_noturno?: string;
    he_2_100_noturno?: string;
    adicional_noturno: string;
    saldo: string;
  };
  resumo_dias: {
    total_dias: number;
    dias_trabalhados: number;
    dias_folga: number;
    ferias?: number;
    licencas?: number;
    atestados?: number;
    inss?: number;
    debitos_totais?: number;
  };
  totais_jornada?: {
    credito: string;
    debito: string;
    h_intervalo?: string;
    horas_normais: string;
  };
  total_horas_extras?: {
    he_1_50: string;
    he_1_50_noturno?: string;
    he_2_100: string;
    he_2_100_noturno?: string;
    adicional_noturno: string;
  };
  saldo_final?: string;
  registros?: RegistroDia[];
}

export function parsePontomaisPage(rawText: string, id: number = 1): ColaboradorPonto {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  let colaborador = `Colaborador ${id}`;
  let departamento = "COMPESA GPM (22.4.417)";
  let periodo = "01/08/2026 até 31/08/2026";

  const registros: RegistroDia[] = [];
  let totais = {
    credito: "00:00",
    debito: "00:00",
    intervalo: "00:00",
    h_intervalo: "00:00",
    horas_normais: "00:00",
    he_50: "00:00",
    he_1_50: "00:00",
    he_1_50_noturno: "00:00",
    he_100: "00:00",
    he_2_100: "00:00",
    he_2_100_noturno: "00:00",
    adicional_noturno: "00:00",
    saldo: "00:00"
  };

  const timeRegex = /(?:-?\b\d{1,4}:\d{2}\b)/g;

  let folgas = 0;
  let trabalhados = 0;
  let ferias = 0;
  let inss = 0;

  for (const line of lines) {
    if (line.includes("Colaborador:")) {
      const match = line.match(/Colaborador:\s*([^–—|\n]+)/);
      if (match && match[1]) {
        colaborador = match[1].trim();
      }
      continue;
    }
    if (line.includes("Filtro por:")) {
      departamento = line.replace(/.*Filtro por:\s*/, '').trim();
      continue;
    }
    if (line.includes("De ") && line.includes("até")) {
      const match = line.match(/De\s*(\d{2}\/\d{2}\/\d{4})\s*até\s*(\d{2}\/\d{2}\/\d{4})/);
      if (match) {
        periodo = `${match[1]} até ${match[2]}`;
      }
      continue;
    }

    // Match day rows: "Sáb, 01/08/2026 ..." or "Seg, 03/08/2026 ..." or flexible date
    const dateMatch = line.match(/(?:([A-Za-zÀ-ÿ]{3})[,\s]*)?(\d{2}\/\d{2}\/\d{4})\b\s*(.*)$/i);
    if (dateMatch && !line.includes("De ") && !line.includes("Filtro por") && !line.includes(" às ") && !line.includes(" em ")) {
      const data = dateMatch[2];
      const dia_semana = dateMatch[1] || getDiaSemana(data);
      const rest = dateMatch[3];
      const times = rest.match(timeRegex) || [];

      let motivo: string | null = null;
      if (times.length > 0) {
        const lastTime = times[times.length - 1];
        const lastIdx = rest.lastIndexOf(lastTime);
        if (lastIdx !== -1) {
          const after = rest.slice(lastIdx + lastTime.length).replace(/^[|\-–—\s]+/, '').trim();
          if (after) motivo = after;
        }
      }

      if (motivo) {
        const motLower = motivo.toLowerCase();
        if (motLower.includes("folga")) folgas++;
        if (motLower.includes("férias") || motLower.includes("ferias")) ferias++;
        if (motLower.includes("inss") || motLower.includes("atestado")) inss++;
      } else if (dia_semana === "Dom") {
        folgas++;
      }

      let p1_e: string | null = null;
      let p1_s: string | null = null;
      let p2_e: string | null = null;
      let p2_s: string | null = null;
      let cred = "00:00", deb = "00:00", interv = "00:00", normais = "00:00", he1 = "00:00", he2 = "00:00", noturno = "00:00", saldo = "00:00";

      if (times.length >= 8) {
        // The last 8 times are ALWAYS the 8 metrics columns:
        // Crédito, Débito, H. intervalo, Horas normais, H.E. 1, H.E. 2, Adicional noturno, Saldo
        const metrics = times.slice(-8);
        [cred, deb, interv, normais, he1, he2, noturno, saldo] = metrics;

        // The times before the last 8 are the batidas (pontos de entrada e saída)
        const batidas = times.slice(0, times.length - 8);
        const classified = classifyPunches(batidas, normais);
        p1_e = classified.entrada_1;
        p1_s = classified.saida_1;
        p2_e = classified.entrada_2;
        p2_s = classified.saida_2;

        if (batidas.length > 0) {
          trabalhados++;
        }
      } else if (times.length > 0) {
        saldo = times[times.length - 1];
      }

      registros.push({
        data,
        dia_semana,
        pontos: {
          entrada_1: p1_e,
          saida_1: p1_s,
          entrada_2: p2_e,
          saida_2: p2_s
        },
        totais_jornada: {
          credito: cred,
          debito: deb,
          h_intervalo: interv,
          intervalo: interv,
          horas_normais: normais
        },
        total_horas_extras: {
          he_1_50: he1,
          he_2_100: he2,
          adicional_noturno: noturno
        },
        horas_extras: {
          he_50: he1,
          he_100: he2,
          adicional_noturno: noturno
        },
        saldo,
        motivo_observacao: motivo
      });
      continue;
    }

    if (line.includes("TOTAIS")) {
      const times = line.match(timeRegex) || [];
      if (times.length >= 5) {
        totais.credito = times[0] || "00:00";
        totais.debito = times[1] || "00:00";
        totais.intervalo = times[2] || "00:00";
        totais.h_intervalo = times[2] || "00:00";
        totais.horas_normais = times[3] || "00:00";
        totais.he_50 = times[4] || "00:00";
        totais.he_1_50 = times[4] || "00:00";
        totais.he_100 = times[5] || "00:00";
        totais.he_2_100 = times[5] || "00:00";
        totais.adicional_noturno = times[6] || "00:00";
        totais.saldo = registros.length > 0 ? registros[registros.length - 1].saldo : "00:00";
      }
    }
  }

  // Apply calendar consistency and alignment to all day records
  const alignedRegistros = alignAndValidateRecords(registros, periodo);
  const saldoFinal = alignedRegistros.length > 0 ? alignedRegistros[alignedRegistros.length - 1].saldo : totais.saldo;
  totais.saldo = saldoFinal;

  let totalTrabalhados = 0;
  let totalFolgas = 0;
  let totalFerias = 0;
  let totalInss = 0;

  for (const r of alignedRegistros) {
    if (r.pontos?.entrada_1 || r.pontos?.saida_1 || r.pontos?.entrada_2 || r.pontos?.saida_2) {
      totalTrabalhados++;
    }
    const mot = (r.motivo_observacao || '').toLowerCase();
    if (mot.includes('folga') || r.dia_semana === 'Dom') totalFolgas++;
    if (mot.includes('férias') || mot.includes('ferias')) totalFerias++;
    if (mot.includes('inss') || mot.includes('atestado')) totalInss++;
  }

  return {
    id,
    colaborador,
    departamento,
    periodo,
    totais,
    resumo_dias: {
      total_dias: alignedRegistros.length || 31,
      dias_trabalhados: totalTrabalhados,
      dias_folga: totalFolgas,
      ferias: totalFerias,
      inss: totalInss
    },
    totais_jornada: {
      credito: totais.credito,
      debito: totais.debito,
      h_intervalo: totais.intervalo,
      horas_normais: totais.horas_normais
    },
    total_horas_extras: {
      he_1_50: totais.he_50,
      he_1_50_noturno: "00:00",
      he_2_100: totais.he_100,
      he_2_100_noturno: "00:00",
      adicional_noturno: totais.adicional_noturno
    },
    saldo_final: saldoFinal,
    registros: alignedRegistros
  };
}

export function parsePontomaisPages(pages: string[]): any {
  const colaboradores: ColaboradorPonto[] = [];
  
  let pageId = 1;
  for (const pageText of pages) {
    if (pageText.includes("Colaborador:") || pageText.includes("Jornada") || pageText.includes("TOTAIS")) {
      const colab = parsePontomaisPage(pageText, pageId++);
      colaboradores.push(colab);
    }
  }

  if (colaboradores.length === 0 && pages.length > 0) {
    // If not split by pages, try splitting by "Colaborador:"
    const fullText = pages.join('\n');
    const sections = fullText.split(/(?=Colaborador:)/i);
    for (const sec of sections) {
      if (sec.trim()) {
        const colab = parsePontomaisPage(sec, pageId++);
        colaboradores.push(colab);
      }
    }
  }

  // Calculate global statistics
  const ativos = colaboradores.filter(c => c.resumo_dias.dias_trabalhados > 0).length;
  const afastados = colaboradores.length - ativos;

  let totalMinutosHE50 = 0;
  let totalMinutosHE100 = 0;

  for (const c of colaboradores) {
    const he50 = c.total_horas_extras?.he_1_50 || c.totais?.he_50 || '00:00';
    const [h50, m50] = he50.split(':').map(Number);
    if (!isNaN(h50) && !isNaN(m50)) totalMinutosHE50 += h50 * 60 + m50;

    const he100 = c.total_horas_extras?.he_2_100 || c.totais?.he_100 || '00:00';
    const [h100, m100] = he100.split(':').map(Number);
    if (!isNaN(h100) && !isNaN(m100)) totalMinutosHE100 += h100 * 60 + m100;
  }

  const formatH = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const result = {
    metadata: {
      sistema_origem: "pontomais",
      tipo_documento: "Relatório de Folha de Ponto / Jornada de Trabalho",
      empresa_orgao: "COMPESA",
      departamento: colaboradores[0]?.departamento || "COMPESA GPM (22.4.417)",
      periodo: {
        data_inicio: "01/08/2026",
        data_fim: "31/08/2026",
        mes_referencia: "08/2026"
      },
      emissao: {
        responsavel: "AMANDA FIALHO TORRES",
        data: "02/09/2026",
        hora: "16:19"
      },
      codigo_autenticacao: "10.199576114",
      total_colaboradores: colaboradores.length
    },
    estatisticas_gerais: {
      colaboradores_ativos: ativos,
      colaboradores_em_afastamento_ou_inss: afastados,
      total_horas_extras_50_geral: formatH(totalMinutosHE50),
      total_horas_extras_100_geral: formatH(totalMinutosHE100)
    },
    colaboradores
  };

  return ensureDateConsistencyAndColumnAlignment(result);
}

export function ensureDateConsistencyAndColumnAlignment(dataset: any): any {
  if (!dataset) return dataset;
  if (!Array.isArray(dataset.colaboradores)) return dataset;

  const periodoStr = dataset.metadata?.periodo?.data_inicio 
    ? `${dataset.metadata.periodo.data_inicio} até ${dataset.metadata.periodo.data_fim}`
    : undefined;

  dataset.colaboradores = dataset.colaboradores.map((colab: ColaboradorPonto) => {
    if (!colab.registros || colab.registros.length === 0) return colab;

    const aligned = alignAndValidateRecords(colab.registros, colab.periodo || periodoStr);
    colab.registros = aligned;

    let trab = 0;
    let folgas = 0;
    let ferias = 0;
    let inss = 0;

    for (const r of aligned) {
      if (r.pontos?.entrada_1 || r.pontos?.saida_1 || r.pontos?.entrada_2 || r.pontos?.saida_2) {
        trab++;
      }
      const mot = (r.motivo_observacao || '').toLowerCase();
      if (mot.includes('folga') || r.dia_semana === 'Dom') folgas++;
      if (mot.includes('férias') || mot.includes('ferias')) ferias++;
      if (mot.includes('inss') || mot.includes('atestado')) inss++;
    }

    colab.resumo_dias = {
      ...colab.resumo_dias,
      total_dias: aligned.length,
      dias_trabalhados: trab,
      dias_folga: folgas,
      ferias,
      inss
    };

    if (aligned.length > 0) {
      colab.saldo_final = aligned[aligned.length - 1].saldo;
      if (colab.totais) {
        colab.totais.saldo = colab.saldo_final;
      }
    }

    return colab;
  });

  return dataset;
}

