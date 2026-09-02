export type UserRole =
  | 'SOLICITANTE'
  | 'APROVADOR_1'
  | 'APROVADOR_2'
  | 'APROVADOR_3'
  | 'APROVADOR_4'
  | 'FINANCEIRO'
  | 'TESOURARIA'
  | 'ADMINISTRADOR';

export type RiskLevel = 'BAIXO' | 'MEDIO' | 'ALTO';

export type PaymentNature = 'RECORRENTE' | 'EVENTUAL';

export type PaymentMethod = 'BOLETO' | 'TED_PIX' | 'DEBITO' | 'CARTAO';

export type RequestStatus =
  | 'RASCUNHO'
  | 'ENVIADA'
  | 'EM_ANALISE_ALCADA'
  | 'AGUARDANDO_1_ALCADA'
  | 'AGUARDANDO_2_ALCADA'
  | 'AGUARDANDO_3_ALCADA'
  | 'AGUARDANDO_4_ALCADA'
  | 'APROVADA'
  | 'REPROVADA'
  | 'DEVOLVIDA_CORRECAO'
  | 'AGUARDANDO_FINANCEIRO'
  | 'EM_CONFERENCIA_FINANCEIRA'
  | 'DEVOLVIDA_FINANCEIRO'
  | 'LIBERADA_PAGAMENTO'
  | 'PAGAMENTO_EFETUADO'
  | 'CANCELADA';

export type ApprovalDecision = 'APROVADO' | 'REPROVADO' | 'DEVOLVIDO' | 'PENDENTE';

export type DocumentType =
  | 'NF_FATURA'
  | 'CONTRATO'
  | 'PROPOSTA'
  | 'COTACOES'
  | 'BOLETO'
  | 'CERTIDOES'
  | 'COMPROVANTE_PAGAMENTO'
  | 'COMPLEMENTAR'
  | 'PARECER_TECNICO';

export interface User {
  id: string;
  name: string;
  email: string;
  cargo: string;
  area: string;
  centroCusto: string;
  phone?: string;
  roles: UserRole[];
  status: 'ATIVO' | 'INATIVO' | 'PENDENTE_VERIFICACAO';
  authType: 'EMAIL_PASSWORD' | 'GOOGLE' | 'SAML_SSO';
  isEmailVerified: boolean;
  avatarUrl?: string;
  /** Firebase Authentication UID — populated on Google login or when explicitly linked */
  firebaseUid?: string;
  createdAt: string;
  lastLoginAt?: string;
}


export interface ProcessItem {
  id: string;
  code: string;
  name: string;
  description: string;
  natureza: 'OPERACIONAL' | 'ASSISTENCIAL' | 'ADMINISTRATIVO' | 'JURIDICO' | 'MARKETING' | 'RH' | 'TI' | 'FINANCEIRO';
  riscoPadrao: RiskLevel;
  requerJustificativaTecnica: boolean;
  permiteParcelamento: boolean;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatrizAlcada {
  id: string;
  codigo: string; // Ex: POL-DIR-01
  versao: string; // Ex: Rev. 00, Rev. 01
  titulo: string;
  status: 'VIGENTE' | 'HISTORICO' | 'RASCUNHO' | 'EM_REVISAO';
  vigenciaInicio: string; // 2026-07-07
  vigenciaFim: string; // 2028-07-07
  elaboracao: string;
  revisao: string;
  aprovacao: string;
  regras: RegraAlcada[];
  publicadoPor?: string;
  publicadoEm?: string;
  historicoAlteracoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegraAlcada {
  id: string;
  matrizId: string;
  processoId: string;
  processoNome: string;
  risco: RiskLevel;
  alçadaPorEvento: number; // 0 = Sem limite
  tetoMensal: number; // 0 = Sem limite
  cargosHabilitados1: string[]; // Cargo 1ª alçada
  cargosHabilitados2?: string[]; // Cargo 2ª alçada
  cargosHabilitados3?: string[]; // Cargo 3ª alçada
  cargosHabilitados4?: string[]; // Cargo 4ª alçada
  nivelMaximoRequerido: 1 | 2 | 3 | 4;
  requerJustificativaSeAcimaLimite: boolean;
  observacoes?: string;
  ativo: boolean;
}

export interface SolicitacaoDocumento {
  id: string;
  solicitacaoId: string;
  tipo: DocumentType;
  nomeArquivo: string;
  tamanhoBytes: number;
  mimeType: string;
  url: string;
  hashSha256: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  uploadedAt: string;
  observacao?: string;
}

export interface EtapaAprovacao {
  id: string;
  solicitacaoId: string;
  nivel: 1 | 2 | 3 | 4;
  nivelLabel: string; // '1ª Alçada - Coordenação/Supervisão', '2ª Alçada - Gerência', etc.
  cargoExigido: string;
  areaExigida?: string;
  aprovadorDesignadoId?: string;
  aprovadorDesignadoNome?: string;
  aprovadorRealId?: string;
  aprovadorRealNome?: string;
  aprovadorRealCargo?: string;
  status: 'PENDENTE' | 'APROVADO' | 'REPROVADO' | 'DEVOLVIDO' | 'IGNORADO';
  decisao?: ApprovalDecision;
  justificativa?: string;
  declaracaoConflitoInteresse: boolean; // "Declaro não possuir conflito de interesses..."
  dataEntrada: string;
  dataDecisao?: string;
  ipAssinatura?: string;
  dispositivoAssinatura?: string;
}

export interface ConferenciaFinanceira {
  id: string;
  solicitacaoId: string;
  dataRecebimento: string;
  responsavelId?: string;
  responsavelNome?: string;
  nfFaturaConferida: boolean;
  contratoConferido: boolean;
  cotacoesConferidas: boolean;
  boletoConferido: boolean;
  certidoesConferidas: boolean;
  retencaoISS: boolean;
  retencaoINSS: boolean;
  retencaoIRRF: boolean;
  retencaoPIS_COFINS_CSLL: boolean;
  retencaoNaoAplicavel: boolean;
  valorBruto: number;
  valorRetencoes: number;
  valorLiquido: number;
  status: 'PENDENTE' | 'LIBERADO_PAGAMENTO' | 'DEVOLVIDO_AREA';
  pendenciasObservacoes?: string;
  dataConferencia?: string;
}

export interface RegistroPagamento {
  id: string;
  solicitacaoId: string;
  dataPagamento: string;
  responsavelTesourariaId: string;
  responsavelTesourariaNome: string;
  responsavelTesourariaCargo: string;
  bancoUtilizado?: string;
  agenciaUtilizada?: string;
  contaUtilizada?: string;
  formaEfetivaPagamento: PaymentMethod;
  numeroComprovante: string;
  documentoComprovanteUrl?: string;
  observacoes?: string;
  registradoEm: string;
}

export interface Solicitacao {
  id: string;
  numero: string; // FIN-ALC-XXXX/2026
  sequencial: number;
  ano: number;
  
  // 1. Identificação da Solicitação (FOR-FIN-01)
  dataSolicitacao: string;
  areaSolicitante: string;
  centroCusto: string;
  solicitanteId: string;
  solicitanteNome: string;
  solicitanteCargo: string;
  solicitanteEmail: string;
  processoId: string;
  processoNome: string;
  processoContratoNumero?: string;
  fornecedorFavorecido: string;
  cpfCnpj: string;
  objetoDespesa: string;

  // 2. Dados Financeiros e Condições de Pagamento (FOR-FIN-01)
  valorTotal: number;
  natureza: PaymentNature;
  formaPagamento: PaymentMethod;
  parcelamento: boolean;
  quantidadeParcelas?: number;
  valorParcela?: number;
  dataVencimento: string; // YYYY-MM-DD
  diasUteisAteVencimento: number;
  alertaVencimentoProximo: boolean; // < 5 dias úteis
  rubricaOrcamentaria: string;
  previstoNoOrcamento: boolean;
  justificativaNaoPrevisto?: string;
  saldoDisponivel: boolean;
  dadosBancarios: {
    banco: string;
    agencia: string;
    contaCorrente: string;
    chavePix?: string;
    titular?: string;
  };

  // 3. Enquadramento na Matriz de Alçada (POL-DIR-01)
  faixaValorCalculada: 'ATE_5K' | 'DE_5K_A_20K' | 'DE_20K_A_50K' | 'DE_50K_A_100K' | 'ACIMA_100K';
  faixaValorLabel: string;
  nivelRisco: RiskLevel;
  criteriosRisco: {
    assistencial: boolean;
    regulatorioAns: boolean;
    financeiro: boolean;
    reputacional: boolean;
  };
  alcadaAplicavelMaxima: 0 | 1 | 2 | 3 | 4;
  alcadaAplicavelLabel: string;
  matrizAlcadaId: string;
  matrizAlcadaCodigo: string;
  matrizAlcadaVersao: string;
  regraAlcadaId: string;
  tetoMensalProcesso: number;
  tetoMensalAcumuladoAtual: number;
  tetoMensalEstourado: boolean;

  // 4. Verificação dos Princípios Inegociáveis (Declarações obrigatórias)
  declaracaoSegregacaoFuncoes: boolean;
  declaracaoRegraQuatroOlhos: boolean;
  declaracaoProibicaoFracionamento: boolean;
  declaracaoAusenciaConflito: boolean;
  declaracaoAprovacaoPreviaCompromisso: boolean;

  // 5. Justificativa Técnica da Despesa (Exigida p/ Risco Alto ou exceções)
  justificativaTecnica?: {
    necessidadeContexto: string;
    areaDemandante: string;
    fundamentacaoTecnicaNormas: string;
    dadosObjetivos: string;
    alternativasAvaliadas: string;
    motivoEscolhaFornecedor: string;
    impactoAssistencial?: string;
    impactoRegulatorio?: string;
    impactoFinanceiro?: string;
    riscosNaoExecucao: string;
  };

  // 6. Alerta de Fracionamento
  analiseFracionamento?: {
    possivelFracionamentoIdentificado: boolean;
    solicitacoesRelacionadasIds: string[];
    solicitacoesRelacionadasNumeros: string[];
    valorTotalAgrupado: number;
    criteriosCoincidentes: string[]; // 'Mesmo CNPJ', 'Mesmo Centro de Custo', 'Janela de 30 dias'
    observacao: string;
  };

  // Status & Relacionamentos
  status: RequestStatus;
  etapaAtualNivel?: 0 | 1 | 2 | 3 | 4 | 'FINANCEIRO' | 'TESOURARIA' | 'CONCLUIDO';
  cadeiaAprovacao: EtapaAprovacao[];
  documentos: SolicitacaoDocumento[];
  conferenciaFinanceira?: ConferenciaFinanceira;
  registroPagamento?: RegistroPagamento;

  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  solicitacaoId?: string;
  solicitacaoNumero?: string;
  entidade: 'SOLICITACAO' | 'APROVACAO' | 'CONFERENCIA_FINANCEIRA' | 'PAGAMENTO' | 'MATRIZ_ALCADA' | 'USUARIO' | 'PROCESSO' | 'DOCUMENTO' | 'CONFIGURACAO' | 'AUTENTICACAO';
  entidadeId: string;
  acao: string;
  descricao: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  usuarioCargo: string;
  usuarioArea: string;
  valoresAnteriores?: Record<string, any>;
  valoresPosteriores?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface SystemNotification {
  id: string;
  userId: string; // ou 'ALL'
  title: string;
  message: string;
  tipo: 'INFO' | 'AVISO' | 'URGENTE' | 'SUCESSO' | 'ERRO';
  solicitacaoId?: string;
  solicitacaoNumero?: string;
  lida: boolean;
  createdAt: string;
}

export interface SystemConfig {
  id: string;
  diasUteisAlertaVencimento: number; // Padrão: 5
  janelaDiasDeteccaoFracionamento: number; // Padrão: 30
  bloquearEstouroTetoMensal: boolean; // Padrão: false (emite alerta forte)
  exigirOtpLogin: boolean; // Padrão: false para facilitar demo, configurável
  restringirDominioGoogleOAuth: boolean; // Padrão: true
  dominioPermitido: string; // Ex: @sbsaude.com.br
  slaAprovacaoHoras: number; // Padrão: 48
  sgqRepositorioCodigo: string; // POL-DIR-01 / FOR-FIN-01
  tempoRetencaoAnos: number; // 2 anos conforme ISO 9001
}
