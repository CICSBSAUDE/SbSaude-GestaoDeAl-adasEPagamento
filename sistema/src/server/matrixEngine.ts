import { db } from './db';
import {
  RiskLevel,
  MatrizAlcada,
  RegraAlcada,
  EtapaAprovacao,
  Solicitacao,
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

export interface EnquadramentoResult {
  faixaValorCalculada: 'ATE_5K' | 'DE_5K_A_20K' | 'DE_20K_A_50K' | 'DE_50K_A_100K' | 'ACIMA_100K';
  faixaValorLabel: string;
  nivelRisco: RiskLevel;
  alcadaAplicavelMaxima: 0 | 1 | 2 | 3 | 4;
  alcadaAplicavelLabel: string;
  matrizAlcadaId: string;
  matrizAlcadaCodigo: string;
  matrizAlcadaVersao: string;
  regraAlcadaId: string;
  tetoMensalProcesso: number;
  tetoMensalAcumuladoAtual: number;
  tetoMensalEstourado: boolean;
  tetoSemanalProcesso?: number;
  tetoSemanalAcumuladoAtual?: number;
  tetoSemanalEstourado?: boolean;
  isentoAprovacaoHierarquica?: boolean;
  cadeiaAprovacao: EtapaAprovacao[];
  analiseFracionamento?: {
    possivelFracionamentoIdentificado: boolean;
    solicitacoesRelacionadasIds: string[];
    solicitacoesRelacionadasNumeros: string[];
    valorTotalAgrupado: number;
    criteriosCoincidentes: string[];
    observacao: string;
  };
}

export class MatrixEngine {
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
    const tetoEstourado = regra.tetoMensal > 0 && acumuladoMes + valorTotal > regra.tetoMensal;

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
    const tetoSemanalEstourado = limiteSemanal > 0 && (acumuladoSemana + valorTotal) > limiteSemanal;
    
    // 3. Determine required approval chain level
    let nivelMaximo: 0 | 1 | 2 | 3 | 4 = 1;
    let isentoAprovacaoHierarquica = false;

    // If limits exist and we are strictly within the weekly limits, we can bypass hierarchical approval
    if (limiteSemanal > 0 && !tetoSemanalEstourado) {
      isentoAprovacaoHierarquica = true;
      nivelMaximo = 0; // We bypass approval chain building
    } else {
      // If value exceeds single event/weekly limit
      if (limiteSemanal > 0 && valorTotal > limiteSemanal) {
        nivelMaximo = regra.nivelMaximoRequerido;
      } else {
        // Base level
        nivelMaximo = 1;
        // High risk automatically requires at least 2 levels if configured
        if (nivelRisco === 'ALTO' && regra.nivelMaximoRequerido > 1) {
          nivelMaximo = Math.min(2, regra.nivelMaximoRequerido) as 1 | 2 | 3 | 4;
        }
      }

      // Values above 50k / 100k enforce higher tiers
      if (valorTotal > 100000) {
        nivelMaximo = Math.max(nivelMaximo, 3) as 1 | 2 | 3 | 4;
      } else if (valorTotal > 50000) {
        nivelMaximo = Math.max(nivelMaximo, 2) as 1 | 2 | 3 | 4;
      }
    }

    // 5. Build Approval Chain (Segregation of Duties & Four-Eyes Principle)
    const cadeiaAprovacao: EtapaAprovacao[] = [];
    const usedUserIds = new Set<string>();
    usedUserIds.add(solicitanteId); // Requester CANNOT be an approver

    const tierLabels: Record<number, string> = {
      1: '1ª Alçada - Coordenação/Supervisão',
      2: '2ª Alçada - Gerência da Área',
      3: '3ª Alçada - Diretoria de Operações/Financeira',
      4: '4ª Alçada - Diretoria Executiva/Conselho',
    };

    for (let lvl = 1; lvl <= nivelMaximo; lvl++) {
      let cargosPermitidos: string[] = [];
      if (lvl === 1) cargosPermitidos = regra.cargosHabilitados1 || [];
      else if (lvl === 2) cargosPermitidos = regra.cargosHabilitados2 || ['Gerência da Área', 'Diretoria de Operações'];
      else if (lvl === 3) cargosPermitidos = regra.cargosHabilitados3 || ['Diretoria Financeira', 'Diretor Financeiro'];
      else if (lvl === 4) cargosPermitidos = regra.cargosHabilitados4 || ['Diretoria Executiva / Conselho'];

      // Find an eligible active user matching role/cargo who hasn't been used yet
      const eligibleUser = db.users.find((u) => {
        if (u.status !== 'ATIVO') return false;
        if (usedUserIds.has(u.id)) return false; // Segregation of duties & 4-eyes
        const matchCargo = cargosPermitidos.some(
          (c) => u.cargo.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(u.cargo.toLowerCase())
        );
        const matchRole =
          (lvl === 1 && (u.roles.includes('APROVADOR_1') || u.roles.includes('APROVADOR_2') || u.roles.includes('ADMINISTRADOR'))) ||
          (lvl === 2 && (u.roles.includes('APROVADOR_2') || u.roles.includes('APROVADOR_3') || u.roles.includes('ADMINISTRADOR'))) ||
          (lvl === 3 && (u.roles.includes('APROVADOR_3') || u.roles.includes('ADMINISTRADOR'))) ||
          (lvl === 4 && (u.roles.includes('APROVADOR_4') || u.roles.includes('ADMINISTRADOR')));

        return matchCargo || matchRole;
      });

      if (eligibleUser) {
        usedUserIds.add(eligibleUser.id);
      }

      cadeiaAprovacao.push({
        id: `apr-${Date.now()}-${lvl}`,
        solicitacaoId: '',
        nivel: lvl as 1 | 2 | 3 | 4,
        nivelLabel: tierLabels[lvl] || `${lvl}ª Alçada`,
        cargoExigido: cargosPermitidos[0] || `Aprovador ${lvl}ª Alçada`,
        aprovadorDesignadoId: eligibleUser?.id,
        aprovadorDesignadoNome: eligibleUser?.name,
        status: 'PENDENTE',
        declaracaoConflitoInteresse: false,
        dataEntrada: new Date().toISOString(),
      });
    }

    const alcadaLabels: Record<number, string> = {
      1: '1ª (Coord./Superv.)',
      2: '2ª (Gerência)',
      3: '3ª (Diretoria)',
      4: '4ª (Diretoria Executiva/Conselho)',
    };

    // 6. Split analysis
    const analiseFracionamento = this.analisarFracionamento(cpfCnpj, centroCusto, processoId, valorTotal, solicitanteId, excludeRequestId);

    return {
      faixaValorCalculada: faixa,
      faixaValorLabel: faixaLabel,
      nivelRisco,
      alcadaAplicavelMaxima: nivelMaximo,
      alcadaAplicavelLabel: alcadaLabels[nivelMaximo] || (nivelMaximo === 0 ? 'Isento (Direto ao Financeiro)' : `Alçada ${nivelMaximo}`),
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
      isentoAprovacaoHierarquica,
      cadeiaAprovacao,
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
