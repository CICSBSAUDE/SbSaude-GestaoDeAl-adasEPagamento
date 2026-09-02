import { db } from './db';
import {
  UserRole,
  RiskLevel,
  MatrizAlcada,
  RegraAlcada,
  EtapaAprovacao,
  Solicitacao,
  AlertaAprovador,
  EnquadramentoResult,
} from '../types';

export interface EnquadramentoParams {
  processoId: string;
  valorTotal: number;
  criteriosRisco?: {
    assistencial: boolean;
    regulatorioAns: boolean;
    financeiro: boolean;
    reputacional: boolean;
  };
  solicitanteId: string;
  cpfCnpj?: string;
  centroCusto?: string;
  matrizId?: string; // Optional: specify version, defaults to active
}

export class MatrixEngine {
  /**
   * Helper to verify if a user belongs to the "Diretoria Executiva" or "Diretoria Executiva / Conselho" Cost Center / Cargo
   */
  static isUserDiretoriaExecutiva(user: {
    name?: string;
    email?: string;
    cargo?: string;
    area?: string;
    centroCusto?: string;
    centrosCusto?: string[];
    roles?: string[];
  }): boolean {
    if (!user) return false;
    const uCCs = [
      user.centroCusto || '',
      ...(user.centrosCusto || [])
    ].map((c) => c.toUpperCase().trim());

    const targetKeywords = [
      'DIRETORIA EXECUTIVA',
      'CONSELHO EXECUTIVO',
      'CONSELHO',
      'CC-9000',
      'CC-9090',
      'CC-9000-DEC',
      'CC-9000-DEX',
      'CC-9000-CSH'
    ];

    // 1. Check user cost centers
    if (uCCs.some((cc) => targetKeywords.some((kw) => cc.includes(kw)))) {
      return true;
    }

    // 2. Check cargo or area
    const uCargo = (user.cargo || '').toUpperCase().trim();
    const uArea = (user.area || '').toUpperCase().trim();
    if (targetKeywords.some((kw) => uCargo.includes(kw) || uArea.includes(kw))) {
      return true;
    }

    return false;
  }

  /**
   * Helper to verify if a user has exact/direct or linked cost center assignment matching the requested cost center
   */
  static userMatchesCentroCustoStrict(
    user: { name?: string; email?: string; area?: string; centroCusto?: string; centrosCusto?: string[]; cargo?: string; roles?: string[] },
    centroCusto?: string
  ): boolean {
    if (!centroCusto || !centroCusto.trim()) return true;

    const reqCC = centroCusto.toUpperCase().trim();
    const uCCs: string[] = Array.from(
      new Set([
        user.centroCusto || '',
        ...(user.centrosCusto || []),
      ].filter(Boolean).map((c) => c.toUpperCase().trim()))
    );
    const uName = (user.name || '').toUpperCase().trim();
    const uEmail = (user.email || '').toUpperCase().trim();

    // 1. Check direct string equality or code matching in user's assigned centros de custo
    const reqCodeMatch = reqCC.match(/CC-?\d+/i) || reqCC.match(/\b\d{4}\b/) || reqCC.match(/^CC-?[A-Z0-9_-]+/i);
    const reqCode = reqCodeMatch ? reqCodeMatch[0].toUpperCase() : reqCC.split(' ')[0].toUpperCase();

    for (const uCC of uCCs) {
      if (uCC === reqCC || reqCC.includes(uCC) || uCC.includes(reqCC)) {
        return true;
      }
      const uCodeMatch = uCC.match(/CC-?\d+/i) || uCC.match(/\b\d{4}\b/) || uCC.match(/^CC-?[A-Z0-9_-]+/i);
      const uCode = uCodeMatch ? uCodeMatch[0].toUpperCase() : '';
      if (reqCode && uCode && (reqCode === uCode || reqCode.includes(uCode) || uCode.includes(reqCode))) {
        return true;
      }
      if (reqCode && uCC.includes(reqCode)) return true;
    }

    // 2. Check dynamic Cost Center registry in db.costCenters
    const registeredCC = db.costCenters.find((c) => {
      const cCode = c.codigo.toUpperCase().trim();
      const cName = c.nome.toUpperCase().trim();
      return (
        (reqCode && (cCode === reqCode || cCode.includes(reqCode))) ||
        reqCC.includes(cCode) ||
        reqCC.includes(cName) ||
        cName.includes(reqCC)
      );
    });

    if (registeredCC) {
      // If user is designated as the responsible person in this dynamic Cost Center
      if (registeredCC.responsavel) {
        const resp = registeredCC.responsavel.toUpperCase().trim();
        if (uName && (uName.includes(resp) || resp.includes(uName))) return true;
        if (uEmail && resp.includes(uEmail.split('@')[0])) return true;
      }

      // Check if user's CCs match registered CC code or name
      const cCode = registeredCC.codigo.toUpperCase();
      const cName = registeredCC.nome.toUpperCase();
      for (const uCC of uCCs) {
        if (uCC && (uCC.includes(cCode) || uCC.includes(cName) || cName.includes(uCC))) return true;
      }
    }

    return false;
  }

  /**
   * Helper to verify if a user belongs to or is responsible for a given Natureza or Cost Center
   */
  static userMatchesNaturezaOrCentroCusto(
    user: { name?: string; email?: string; area?: string; centroCusto?: string; centrosCusto?: string[]; cargo?: string; roles?: string[] },
    natureza: string,
    centroCusto?: string
  ): boolean {
    const nat = (natureza || '').toUpperCase().trim();
    const uArea = (user.area || '').toUpperCase().trim();
    const uCCs: string[] = Array.from(
      new Set([
        user.centroCusto || '',
        ...(user.centrosCusto || []),
      ].filter(Boolean).map((c) => c.toUpperCase().trim()))
    );
    const uName = (user.name || '').toUpperCase().trim();
    const uEmail = (user.email || '').toUpperCase().trim();
    const reqCC = (centroCusto || '').toUpperCase().trim();

    // 1. Direct and Dynamic Cost Center matching
    if (reqCC) {
      // 1.1 Match by code (e.g. 'CC-1010', '1010', etc.)
      const reqCodeMatch = reqCC.match(/CC-?\d+/i) || reqCC.match(/\b\d{4}\b/) || reqCC.match(/^CC-?[A-Z0-9_-]+/i);
      const reqCode = reqCodeMatch ? reqCodeMatch[0].toUpperCase() : reqCC.split(' ')[0].toUpperCase();

      for (const uCC of uCCs) {
        const uCodeMatch = uCC.match(/CC-?\d+/i) || uCC.match(/\b\d{4}\b/) || uCC.match(/^CC-?[A-Z0-9_-]+/i);
        const uCode = uCodeMatch ? uCodeMatch[0].toUpperCase() : '';

        if (reqCode && uCode && (reqCode === uCode || reqCode.includes(uCode) || uCode.includes(reqCode))) {
          return true;
        }
        if (reqCode && uCC.includes(reqCode)) return true;
        if (uCC && (uCC === reqCC || reqCC.includes(uCC) || uCC.includes(reqCC))) return true;
      }

      // 1.2 Check dynamic cost centers registered in db.costCenters
      const registeredCC = db.costCenters.find((c) => {
        const cCode = c.codigo.toUpperCase().trim();
        const cName = c.nome.toUpperCase().trim();
        return (
          (reqCode && (cCode === reqCode || cCode.includes(reqCode))) ||
          reqCC.includes(cCode) ||
          reqCC.includes(cName) ||
          cName.includes(reqCC)
        );
      });

      if (registeredCC) {
        // If user is designated as the responsible person in this dynamic Cost Center
        if (registeredCC.responsavel) {
          const resp = registeredCC.responsavel.toUpperCase().trim();
          if (uName && (uName.includes(resp) || resp.includes(uName))) return true;
          if (uEmail && resp.includes(uEmail.split('@')[0])) return true;
        }

        // If user area or any user centro de custo matches this dynamic Cost Center
        const cCode = registeredCC.codigo.toUpperCase();
        const cName = registeredCC.nome.toUpperCase();
        for (const uCC of uCCs) {
          if (uCC && (uCC.includes(cCode) || uCC.includes(cName) || cName.includes(uCC))) return true;
        }
        if (uArea && (uArea.includes(cName) || cName.includes(uArea))) return true;
      }
    }

    // Check if any user cost center has nature-based keyword
    const matchAnyCC = (pattern: string | RegExp) => {
      return uCCs.some((uCC) => (typeof pattern === 'string' ? uCC.includes(pattern) : pattern.test(uCC)));
    };

    // 2. Natureza-based domain matching (Dynamic + Semantic)
    if (nat === 'JURIDICO') {
      return (
        uArea.includes('JURÍD') ||
        uArea.includes('JURID') ||
        uArea.includes('COMPLIANCE') ||
        uArea.includes('REGULATÓRIO') ||
        uArea.includes('REGULATORIO') ||
        matchAnyCC('7070') ||
        matchAnyCC('JURÍD') ||
        matchAnyCC('JURID')
      );
    }
    if (nat === 'RH') {
      return (
        uArea.includes('RH') ||
        uArea.includes('GENTE') ||
        uArea.includes('RECURSOS HUMANOS') ||
        uArea.includes('PESSOAL') ||
        matchAnyCC('1010') ||
        matchAnyCC('RECURSOS') ||
        matchAnyCC('GENTE')
      );
    }
    if (nat === 'MARKETING') {
      return (
        uArea.includes('MARKETING') ||
        uArea.includes('MKT') ||
        uArea.includes('COMUNICAÇÃO') ||
        uArea.includes('COMUNICACAO') ||
        matchAnyCC('4040') ||
        matchAnyCC('MARKETING')
      );
    }
    if (nat === 'ASSISTENCIAL') {
      return (
        uArea.includes('ASSISTENCIAL') ||
        uArea.includes('CREDENCIAMENTO') ||
        uArea.includes('REDE') ||
        uArea.includes('MÉDIC') ||
        uArea.includes('MEDIC') ||
        uArea.includes('NÚCLEO') ||
        uArea.includes('NUCLEO') ||
        matchAnyCC('2020') ||
        matchAnyCC('ASSIST') ||
        matchAnyCC('CREDENCIADA')
      );
    }
    if (nat === 'FINANCEIRO') {
      return (
        uArea.includes('FINAN') ||
        uArea.includes('CONTROLADORIA') ||
        uArea.includes('CONTAS') ||
        uArea.includes('TESOURARIA') ||
        matchAnyCC('3030') ||
        matchAnyCC('FINAN')
      );
    }
    if (nat === 'TI') {
      return (
        uArea.includes('TI') ||
        uArea.includes('TECNOLOGIA') ||
        uArea.includes('SISTEMA') ||
        uArea.includes('INFORMÁTICA') ||
        uArea.includes('INFORMATICA') ||
        matchAnyCC('6060') ||
        matchAnyCC('TECNOLOGIA')
      );
    }
    if (nat === 'OPERACIONAL' || nat === 'ADMINISTRATIVO') {
      return (
        uArea.includes('OPERAÇ') ||
        uArea.includes('OPERAC') ||
        uArea.includes('ADMINISTRA') ||
        uArea.includes('SUPRIMENTOS') ||
        uArea.includes('COMPRAS') ||
        uArea.includes('LOGÍSTICA') ||
        uArea.includes('LOGISTICA') ||
        matchAnyCC('5050') ||
        matchAnyCC('8080') ||
        matchAnyCC('OPERAÇ') ||
        matchAnyCC('OPERAC')
      );
    }

    return false;
  }

  /**
   * Evaluates if a user is authorized to request a given process based on POL-DIR-01 "CARGOS HABILITADOS"
   */
  static isUserAuthorizedToRequest(
    user: { id?: string; name?: string; email?: string; area?: string; cargo?: string; centroCusto?: string; centrosCusto?: string[]; roles?: string[] },
    processoId: string,
    matrizId?: string
  ): {
    autorizado: boolean;
    cargoHabilitadoExigido: string;
    cargosHabilitadosLista: string[];
    motivo?: string;
    isSuperAdmin?: boolean;
  } {
    // 1. Administrators have full oversight and contingency authority
    const isSuperAdmin = Boolean(user.roles?.includes('ADMINISTRADOR'));

    // 2. Locate active or selected matrix rule and process definition
    let matriz: MatrizAlcada | undefined;
    if (matrizId) {
      matriz = db.matrices.find((m) => m.id === matrizId);
    }
    if (!matriz) {
      matriz = db.matrices.find((m) => m.status === 'VIGENTE') || db.matrices[0];
    }

    const regra = matriz?.regras.find((r) => r.processoId === processoId);
    const proc = db.processes.find((p) => p.id === processoId);

    const cargoHabilitadoExigido =
      regra?.cargoHabilitadoDocumento ||
      proc?.cargoHabilitadoDocumento ||
      regra?.cargosHabilitados1?.[0] ||
      regra?.cargosHabilitados2?.[0] ||
      'Conforme POL-DIR-01';

    const cargosHabilitadosLista: string[] = Array.from(
      new Set([
        cargoHabilitadoExigido,
        ...(regra?.cargosHabilitadosSolicitante || []),
        ...(proc?.cargosHabilitadosSolicitante || []),
        ...(regra?.cargosHabilitados1 || []),
      ].filter((item): item is string => Boolean(item && item.length > 0)))
    );

    if (isSuperAdmin) {
      return {
        autorizado: true,
        cargoHabilitadoExigido,
        cargosHabilitadosLista,
        isSuperAdmin: true,
        motivo: 'Acesso total de governança concedido pelo perfil de Administrador.',
      };
    }

    const normalize = (str: string) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .trim();

    const uCargoNorm = normalize(user.cargo || '');
    const uAreaNorm = normalize(user.area || '');
    const uCCsNorm = [user.centroCusto || '', ...(user.centrosCusto || [])].map(normalize).filter(Boolean);

    // Check if user matches any of the required cargos or departments
    const matches = cargosHabilitadosLista.some((targetCargo) => {
      const targetNorm = normalize(targetCargo);
      if (!targetNorm) return false;

      // 1. Direct contains or reverse contains in cargo
      if (uCargoNorm && (uCargoNorm.includes(targetNorm) || targetNorm.includes(uCargoNorm))) return true;

      // 2. Contains in area
      if (uAreaNorm && (uAreaNorm.includes(targetNorm) || targetNorm.includes(uAreaNorm))) return true;

      // 3. Contains in any user cost center
      if (uCCsNorm.some((cc) => cc.includes(targetNorm) || targetNorm.includes(cc))) return true;

      // 4. Domain & keyword matching
      const keywords = targetNorm.split(/\s+/).filter((w) => w.length > 3 && !['para', 'com', 'das', 'dos', 'uma', 'como'].includes(w));
      const hasSignificantOverlap = keywords.length > 0 && keywords.some((kw) => uCargoNorm.includes(kw) || uAreaNorm.includes(kw) || uCCsNorm.some(cc => cc.includes(kw)));
      if (hasSignificantOverlap) return true;

      return false;
    });

    if (matches) {
      return {
        autorizado: true,
        cargoHabilitadoExigido,
        cargosHabilitadosLista,
      };
    }

    return {
      autorizado: false,
      cargoHabilitadoExigido,
      cargosHabilitadosLista,
      motivo: `Conforme a POL-DIR-01 (coluna Cargos Habilitados), somente os cargos ou centros de custos habilitados [${cargoHabilitadoExigido}] possuem legitimidade para solicitar este processo. Seu cargo atual é "${user.cargo || 'Não definido'}" (${user.area || 'Área não definida'}).`,
    };
  }

  /**
   * Calculates value tier classification based on FOR-FIN-01 standard brackets
   */
  static calcularFaixaValor(valor: number): {
    faixa: 'ATE_5K' | 'DE_5K_A_20K' | 'DE_20K_A_50K' | 'DE_50K_A_100K' | 'ACIMA_100K';
    label: string;
  } {
    if (valor <= 5000) {
      return { faixa: 'ATE_5K', label: 'até R$ 5 mil' };
    } else if (valor <= 20000) {
      return { faixa: 'DE_5K_A_20K', label: 'R$ 5–20 mil' };
    } else if (valor <= 50000) {
      return { faixa: 'DE_20K_A_50K', label: 'R$ 20–50 mil' };
    } else if (valor <= 100000) {
      return { faixa: 'DE_50K_A_100K', label: 'R$ 50–100 mil' };
    } else {
      return { faixa: 'ACIMA_100K', label: 'acima de R$ 100 mil' };
    }
  }

  /**
   * Evaluates qualitative risk criteria and elevates risk level when required by POL-DIR-01 Item 6 & 7
   */
  static calcularNivelRisco(
    processoId: string,
    riscoPadraoProcesso: RiskLevel,
    criterios?: {
      assistencial: boolean;
      regulatorioAns: boolean;
      financeiro: boolean;
      reputacional: boolean;
    }
  ): RiskLevel {
    // If specific criteria is checked that indicates high sensitivity:
    if (criterios) {
      if (criterios.regulatorioAns || criterios.reputacional) {
        return 'ALTO';
      }
      if (criterios.assistencial && (processoId === 'proc-03' || processoId === 'proc-04' || processoId === 'proc-08')) {
        return 'ALTO';
      }
    }
    return riscoPadraoProcesso;
  }

  /**
   * Analyzes potential split purchasing (Proibição de Fracionamento)
   */
  static analisarFracionamento(
    fornecedorCpfCnpj: string | undefined,
    centroCusto: string | undefined,
    processoId: string,
    valorAtual: number,
    solicitanteId: string,
    excludeRequestId?: string
  ): {
    possivelFracionamentoIdentificado: boolean;
    solicitacoesRelacionadasIds: string[];
    solicitacoesRelacionadasNumeros: string[];
    valorTotalAgrupado: number;
    criteriosCoincidentes: string[];
    observacao: string;
  } | undefined {
    if (!fornecedorCpfCnpj && !centroCusto) return undefined;

    const janelaDias = db.config.janelaDiasDeteccaoFracionamento || 30;
    const now = new Date().getTime();
    const janelaMs = janelaDias * 24 * 60 * 60 * 1000;

    const related = db.requests.filter((r) => {
      if (excludeRequestId && r.id === excludeRequestId) return false;
      if (r.status === 'CANCELADA' || r.status === 'REPROVADA') return false;

      const reqTime = new Date(r.dataSolicitacao || r.createdAt).getTime();
      const diffMs = Math.abs(now - reqTime);
      if (diffMs > janelaMs) return false;

      const matchCnpj = fornecedorCpfCnpj && r.cpfCnpj && r.cpfCnpj.trim() === fornecedorCpfCnpj.trim();
      const matchProc = r.processoId === processoId;
      const matchCC = centroCusto && r.centroCusto && r.centroCusto.trim() === centroCusto.trim();

      return matchCnpj || (matchCC && matchProc);
    });

    if (related.length > 0) {
      const relatedIds = related.map((r) => r.id);
      const relatedNums = related.map((r) => r.numero);
      const somaValores = related.reduce((acc, r) => acc + r.valorTotal, 0) + valorAtual;

      const criterios: string[] = [];
      if (fornecedorCpfCnpj) criterios.push(`Mesmo CNPJ/Fornecedor (${fornecedorCpfCnpj})`);
      if (centroCusto) criterios.push(`Mesmo Centro de Custo (${centroCusto})`);
      criterios.push(`Janela temporal configurada de ${janelaDias} dias`);
      criterios.push(`${related.length} solicitação(ões) anterior(es) localizada(s)`);

      return {
        possivelFracionamentoIdentificado: true,
        solicitacoesRelacionadasIds: relatedIds,
        solicitacoesRelacionadasNumeros: relatedNums,
        valorTotalAgrupado: somaValores,
        criteriosCoincidentes: criterios,
        observacao: `Alerta de Fracionamento: Identificadas compras recorrentes para o mesmo favorecido/processo nos últimos ${janelaDias} dias. A soma acumulada atinge R$ ${somaValores.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      };
    }

    return undefined;
  }

  /**
   * Main automatic rule enquadramento engine
   */
  static calcularEnquadramento(params: EnquadramentoParams, excludeRequestId?: string): EnquadramentoResult {
    const { processoId, valorTotal, criteriosRisco, solicitanteId, cpfCnpj, centroCusto, matrizId } = params;

    // 1. Locate matrix (specified or currently active VIGENTE)
    let matriz: MatrizAlcada | undefined;
    if (matrizId) {
      matriz = db.matrices.find((m) => m.id === matrizId);
    }
    if (!matriz) {
      matriz = db.matrices.find((m) => m.status === 'VIGENTE') || db.matrices[0];
    }

    if (!matriz) {
      throw new Error('Nenhuma Matriz de Alçada vigente configurada no sistema.');
    }

    // 2. Locate rule in matrix
    let regra: RegraAlcada | undefined = matriz.regras.find((r) => r.processoId === processoId && r.ativo);
    if (!regra) {
      // Fallback rule if specific process is not in custom matrix
      regra = {
        id: `rule-fallback-${processoId}`,
        matrizId: matriz.id,
        processoId,
        processoNome: 'Processo Geral',
        risco: 'MEDIO',
        alçadaPorEvento: 5000,
        tetoMensal: 20000,
        cargosHabilitados1: ['Supervisor de Credenciamento', 'Coordenadora de Finanças'],
        cargosHabilitados2: ['Gerente de Credenciamento e Núcleo Assistencial', 'Diretora de Operações'],
        cargosHabilitados3: ['Diretoria Financeira', 'Diretor Financeiro'],
        nivelMaximoRequerido: 3,
        requerJustificativaSeAcimaLimite: true,
        ativo: true,
      };
    }

    const { faixa, label: faixaLabel } = this.calcularFaixaValor(valorTotal);
    const nivelRisco = this.calcularNivelRisco(processoId, regra.risco, criteriosRisco);

    // 4. Calculate monthly ceiling usage
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRequests = db.requests.filter((r) => {
      if (excludeRequestId && r.id === excludeRequestId) return false;
      if (r.status === 'CANCELADA' || r.status === 'REPROVADA') return false;
      const d = new Date(r.dataSolicitacao || r.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && r.processoId === processoId;
    });

    const acumuladoMes = monthlyRequests.reduce((acc, r) => acc + r.valorTotal, 0);
    const tetoEstourado = regra.tetoMensal > 0 && (acumuladoMes + valorTotal > regra.tetoMensal || valorTotal > regra.tetoMensal);

    // 4.1 Calculate weekly ceiling / event limit usage
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    
    const weeklyRequests = db.requests.filter((r) => {
      if (excludeRequestId && r.id === excludeRequestId) return false;
      if (r.status === 'CANCELADA' || r.status === 'REPROVADA') return false;
      if (r.processoId !== processoId) return false;
      const d = new Date(r.dataSolicitacao || r.createdAt).getTime();
      return Math.abs(now - d) <= weekMs;
    });

    const acumuladoSemana = weeklyRequests.reduce((acc, r) => acc + r.valorTotal, 0);
    const limiteSemanal = regra.alçadaPorEvento || 0; // Same as por evento
    const tetoSemanalEstourado = limiteSemanal > 0 && ((acumuladoSemana + valorTotal) > limiteSemanal || valorTotal > limiteSemanal);

    // Mandatory Corporate Governance Rule:
    // Any request exceeding the monthly limit MUST be cleared by Diretoria Executiva / Conselho
    const requerLiberacaoDiretoriaExecutiva = tetoEstourado;
    const motivoLiberacaoDiretoriaExecutiva = tetoEstourado
      ? `Solicitação acima do Teto Mensal (R$ ${regra.tetoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Conforme regra corporativa POL-DIR-01, despesas que ultrapassam o teto mensal só podem ser liberadas por usuário com Centro de Custo 'Diretoria Executiva' ou 'Diretoria Executiva / Conselho'.`
      : undefined;
    
    // 3. Determine required approval chain levels according to POL-DIR-01
    let isentoAprovacaoHierarquica = false;
    let requiredLevels: (1 | 2 | 3 | 4)[] = [];

    // Rule: If process has a weekly/event limit defined (> 0) and the requested amount + weekly accumulated
    // is strictly within limit and monthly ceiling is not exceeded, the request is EXEMPT from hierarchical approval
    // and goes directly to the Finance sector.
    if (limiteSemanal > 0 && valorTotal <= limiteSemanal && !tetoSemanalEstourado && !tetoEstourado) {
      isentoAprovacaoHierarquica = true;
      requiredLevels = [];
    } else {
      isentoAprovacaoHierarquica = false;

      if (regra.alcadasObrigatorias && regra.alcadasObrigatorias.length > 0) {
        requiredLevels = [...regra.alcadasObrigatorias];
      } else {
        // Fallback deduction based on configured cargos
        if (regra.cargosHabilitados1?.length) requiredLevels.push(1);
        if (regra.cargosHabilitados2?.length) requiredLevels.push(2);
        if (regra.cargosHabilitados3?.length) requiredLevels.push(3);
        if (regra.cargosHabilitados4?.length) requiredLevels.push(4);
        if (requiredLevels.length === 0) {
          const max = (regra.nivelMaximoRequerido || 1) as 1 | 2 | 3 | 4;
          for (let i = 1; i <= max; i++) requiredLevels.push(i as 1 | 2 | 3 | 4);
        }
      }

      // Values above 50k / 100k enforce higher tiers (N3 / N4) if not already present
      if (valorTotal > 100000 && !requiredLevels.includes(4)) {
        requiredLevels.push(4);
      } else if (valorTotal > 50000 && !requiredLevels.includes(3) && !requiredLevels.includes(4)) {
        requiredLevels.push(3);
      }

      // Mandatory Corporate Governance: If monthly limit is exceeded, 4ª Alçada (Diretoria Executiva / Conselho) is mandatory
      if (tetoEstourado && !requiredLevels.includes(4)) {
        requiredLevels.push(4);
      }

      requiredLevels.sort((a, b) => a - b);
    }

    const nivelMaximo = (requiredLevels.length > 0 ? Math.max(...requiredLevels) : 0) as 0 | 1 | 2 | 3 | 4;

    // 5. Build Approval Chain (Segregation of Duties & Four-Eyes Principle)
    const cadeiaAprovacao: EtapaAprovacao[] = [];
    const alertasAprovadores: AlertaAprovador[] = [];
    const usedUserIds = new Set<string>();
    usedUserIds.add(solicitanteId); // Requester CANNOT be an approver

    const tierLabels: Record<number, string> = {
      1: '1ª Alçada — Coordenação / Supervisão',
      2: '2ª Alçada — Gerência de Área',
      3: '3ª Alçada — Diretoria de Área / Financeira',
      4: '4ª Alçada — Diretoria Executiva / Conselho',
    };

    const processItem = db.processes.find((p) => p.id === processoId);
    const processNatureza = processItem?.natureza || '';

    for (const lvl of requiredLevels) {
      let cargosPermitidos: string[] = [];
      if (lvl === 1) cargosPermitidos = regra.cargosHabilitados1 || ['Coordenação / Supervisão'];
      else if (lvl === 2) cargosPermitidos = regra.cargosHabilitados2 || ['Gerência da Área'];
      else if (lvl === 3) cargosPermitidos = regra.cargosHabilitados3 || ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'];
      else if (lvl === 4) cargosPermitidos = regra.cargosHabilitados4 || ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'];

      let eligibleUser = undefined;

      const matchesCargoList = (user: { cargo?: string; area?: string; centroCusto?: string; centrosCusto?: string[] }) => {
        const uCargoNorm = (user.cargo || '').toLowerCase().trim();
        const uAreaNorm = (user.area || '').toLowerCase().trim();
        const uCCs = [user.centroCusto || '', ...(user.centrosCusto || [])].map((c) => c.toLowerCase().trim());

        if (cargosPermitidos.length === 0) return true;

        return cargosPermitidos.some((cp) => {
          const cpNorm = cp.toLowerCase().trim();
          if (!cpNorm) return false;
          if (uCargoNorm && (uCargoNorm.includes(cpNorm) || cpNorm.includes(uCargoNorm))) return true;
          if (uAreaNorm && (uAreaNorm.includes(cpNorm) || cpNorm.includes(uAreaNorm))) return true;
          return uCCs.some((cc) => cc.includes(cpNorm) || cpNorm.includes(cc));
        });
      };

      const roleName = `APROVADOR_${lvl}` as UserRole;

      // Special Governance Priority for Level 4 (4ª Alçada - Diretoria Executiva / Conselho)
      // or whenever monthly limit is exceeded:
      if (lvl === 4 || tetoEstourado) {
        // 0. Priority 0: Active user with APROVADOR_4 whose CC or Cargo is Diretoria Executiva / Conselho
        eligibleUser = db.users.find((u) => {
          if (u.status !== 'ATIVO' || usedUserIds.has(u.id)) return false;
          if (!u.roles.includes('APROVADOR_4')) return false;
          return MatrixEngine.isUserDiretoriaExecutiva(u);
        });

        // 0.1 Priority 0.1: Any active user with role APROVADOR_4
        if (!eligibleUser && lvl === 4) {
          eligibleUser = db.users.find((u) => {
            if (u.status !== 'ATIVO' || usedUserIds.has(u.id)) return false;
            return u.roles.includes('APROVADOR_4');
          });
        }
      }

      // 1. Priority 1: Active user with role APROVADOR_{lvl} who matches Matrix Cargos Habilitados AND matches the requested Cost Center
      if (!eligibleUser) {
        eligibleUser = db.users.find((u) => {
          if (u.status !== 'ATIVO' || usedUserIds.has(u.id)) return false;
          if (!u.roles.includes(roleName)) return false;
          return matchesCargoList(u) && MatrixEngine.userMatchesCentroCustoStrict(u, centroCusto);
        });
      }

      // 2. Priority 2: Active user with role APROVADOR_{lvl} who matches Matrix Cargos Habilitados
      // (Supremacy of the Matrix of Approvals: if the rule designates Diretoria Financeira / Diretor Financeiro,
      // it directly selects Ane Kellen / Diretor Financeiro)
      if (!eligibleUser) {
        eligibleUser = db.users.find((u) => {
          if (u.status !== 'ATIVO' || usedUserIds.has(u.id)) return false;
          if (!u.roles.includes(roleName)) return false;
          return matchesCargoList(u);
        });
      }

      // 3. Priority 3: Active user with role APROVADOR_{lvl} strictly matching Cost Center
      if (!eligibleUser) {
        eligibleUser = db.users.find((u) => {
          if (u.status !== 'ATIVO' || usedUserIds.has(u.id)) return false;
          if (!u.roles.includes(roleName)) return false;
          return MatrixEngine.userMatchesCentroCustoStrict(u, centroCusto);
        });
      }

      // 4. Priority 4: Active user with role APROVADOR_{lvl} matching Natureza or Area
      if (!eligibleUser) {
        eligibleUser = db.users.find((u) => {
          if (u.status !== 'ATIVO' || usedUserIds.has(u.id)) return false;
          if (!u.roles.includes(roleName)) return false;
          return MatrixEngine.userMatchesNaturezaOrCentroCusto(u, processNatureza, centroCusto);
        });
      }

      // 5. Priority 5: Fallback to any active user with role APROVADOR_{lvl}
      if (!eligibleUser) {
        eligibleUser = db.users.find((u) => {
          if (u.status !== 'ATIVO' || usedUserIds.has(u.id)) return false;
          return u.roles.includes(roleName);
        });
      }

      // 6. Priority 6: Fallback to Administrator who has APROVADOR_{lvl}
      if (!eligibleUser) {
        eligibleUser = db.users.find((u) => {
          if (u.status !== 'ATIVO' || usedUserIds.has(u.id)) return false;
          return u.roles.includes('ADMINISTRADOR') && u.roles.includes(roleName);
        });
      }

      if (!eligibleUser) {
        alertasAprovadores.push({
          nivel: lvl,
          nivelLabel: tierLabels[lvl],
          natureza: processNatureza || 'Geral',
          centroCusto: centroCusto || 'Não informado',
          mensagem: `Não há colaborador cadastrado com perfil de ${lvl}ª Alçada e cargo habilitado (${cargosPermitidos.join(' / ')}) para a natureza ${processNatureza || 'Geral'} (Centro de Custo: ${centroCusto || 'Não informado'}).`,
        });
      }

      if (eligibleUser) {
        usedUserIds.add(eligibleUser.id);
      }

      cadeiaAprovacao.push({
        id: `apr-${Date.now()}-${lvl}`,
        solicitacaoId: '',
        nivel: lvl as 1 | 2 | 3 | 4,
        nivelLabel: tierLabels[lvl] || `${lvl}ª Alçada (N${lvl})`,
        cargoExigido: cargosPermitidos.join(' ou ') || `Aprovador ${lvl}ª Alçada (N${lvl})`,
        cargosHabilitados: cargosPermitidos,
        areaExigida: lvl <= 2 ? processNatureza : undefined,
        natureza: processNatureza,
        aprovadorDesignadoId: eligibleUser?.id,
        aprovadorDesignadoNome: eligibleUser?.name,
        aprovadorDesignadoCargo: eligibleUser?.cargo,
        aprovadorDesignadoArea: eligibleUser?.area,
        aprovadorDesignadoCentroCusto: eligibleUser?.centroCusto,
        semAprovadorCadastrado: !eligibleUser,
        motivoSemAprovador: !eligibleUser
          ? `Aguardando cadastro de colaborador com perfil de ${lvl}ª Alçada e cargo habilitado (${cargosPermitidos.join(' / ')}) para a natureza ${processNatureza}.`
          : undefined,
        status: 'PENDENTE',
        declaracaoConflitoInteresse: false,
        dataEntrada: new Date().toISOString(),
      });
    }

    const alcadaFlowLabel =
      isentoAprovacaoHierarquica || requiredLevels.length === 0
        ? 'Isento (Direto ao Financeiro)'
        : requiredLevels.map((n) => `N${n}`).join(' ➔ ');

    // 6. Split analysis
    const analiseFracionamento = this.analisarFracionamento(cpfCnpj, centroCusto, processoId, valorTotal, solicitanteId, excludeRequestId);

    // 7. Requester Originator Validation (POL-DIR-01 "CARGOS HABILITADOS")
    const solicitante = db.users.find((u) => u.id === solicitanteId);
    let autorizacaoSolicitante;
    if (solicitante) {
      autorizacaoSolicitante = MatrixEngine.isUserAuthorizedToRequest(solicitante, processoId, matriz.id);
    }

    return {
      faixaValorCalculada: faixa,
      faixaValorLabel: faixaLabel,
      nivelRisco,
      alcadaAplicavelMaxima: nivelMaximo,
      alcadaAplicavelLabel: alcadaFlowLabel,
      matrizAlcadaId: matriz.id,
      matrizAlcadaCodigo: matriz.codigo,
      matrizAlcadaVersao: matriz.versao,
      regraAlcadaId: regra.id,
      tetoMensalProcesso: regra.tetoMensal,
      tetoMensalAcumuladoAtual: acumuladoMes,
      tetoMensalEstourado: tetoEstourado,
      tetoSemanalProcesso: limiteSemanal,
      tetoSemanalAcumuladoAtual: acumuladoSemana,
      tetoSemanalEstourado: tetoSemanalEstourado,
      requerLiberacaoDiretoriaExecutiva,
      motivoLiberacaoDiretoriaExecutiva,
      isentoAprovacaoHierarquica,
      autorizacaoSolicitante,
      cadeiaAprovacao,
      alertasAprovadores,
      analiseFracionamento,
    };
  }

  /**
   * Computes working days between today and target due date (excluding weekends)
   */
  static calcularDiasUteisAteVencimento(dataVencimentoStr: string): number {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const venc = new Date(dataVencimentoStr);
    venc.setHours(0, 0, 0, 0);

    if (venc.getTime() < hoje.getTime()) {
      return 0;
    }

    let count = 0;
    const cur = new Date(hoje);
    while (cur.getTime() < venc.getTime()) {
      cur.setDate(cur.getDate() + 1);
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
    }
    return count;
  }
}
