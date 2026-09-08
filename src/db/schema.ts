import {
  pgTable,
  text,
  jsonb,
  timestamp,
  integer,
  boolean,
  numeric,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ==============================================================================
// 1. Armazenamento Universal de Coleções no Supabase (PostgreSQL)
// Chave Primária Composta: (collection, id)
// ==============================================================================
export const appData = pgTable(
  'app_data',
  {
    collection: text('collection').notNull(),
    id: text('id').notNull(),
    data: jsonb('data').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.collection, table.id] }),
    index('idx_app_data_collection').on(table.collection),
    index('idx_app_data_updated_at').on(table.updatedAt),
  ]
);

// ==============================================================================
// 2. Usuários Corporativos e Controle de Acesso RBAC
// ==============================================================================
export const usersTable = pgTable(
  'usuarios',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    googleEmail: text('google_email'),
    cargo: text('cargo').notNull(),
    area: text('area').notNull(),
    centroCusto: text('centro_custo').notNull(),
    centrosCusto: text('centros_custo').array(),
    phone: text('phone'),
    roles: text('roles').array().notNull(),
    status: text('status').notNull().default('ATIVO'),
    authType: text('auth_type').notNull().default('EMAIL_PASSWORD'),
    isEmailVerified: boolean('is_email_verified').notNull().default(true),
    avatarUrl: text('avatar_url'),
    password: text('password'),
    passwordResetRequested: boolean('password_reset_requested').default(false),
    tempPassword: text('temp_password'),
    mustChangePassword: boolean('must_change_password').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_usuarios_email').on(table.email),
    index('idx_usuarios_google_email').on(table.googleEmail),
    index('idx_usuarios_centro_custo').on(table.centroCusto),
    index('idx_usuarios_status').on(table.status),
    index('idx_usuarios_cargo').on(table.cargo),
  ]
);

// ==============================================================================
// 3. Centros de Custo (Plano de Contas Operacional)
// ==============================================================================
export const costCentersTable = pgTable(
  'centros_custo',
  {
    id: text('id').primaryKey(),
    codigo: text('codigo').notNull().unique(),
    nome: text('nome').notNull(),
    descricao: text('descricao'),
    responsavel: text('responsavel'),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_centros_custo_codigo').on(table.codigo),
    index('idx_centros_custo_ativo').on(table.ativo),
  ]
);

// ==============================================================================
// 4. Catálogo de Processos Institucionais
// ==============================================================================
export const processesTable = pgTable(
  'processos',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    natureza: text('natureza').notNull(),
    riscoPadrao: text('risco_padrao').notNull().default('MEDIO'),
    cargoHabilitadoDocumento: text('cargo_habilitado_documento'),
    cargosHabilitadosSolicitante: text('cargos_habilitados_solicitante').array(),
    requerJustificativaTecnica: boolean('requer_justificativa_tecnica').notNull().default(false),
    permiteParcelamento: boolean('permite_parcelamento').notNull().default(false),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_processos_code').on(table.code),
    index('idx_processos_natureza').on(table.natureza),
    index('idx_processos_risco_padrao').on(table.riscoPadrao),
    index('idx_processos_ativo').on(table.ativo),
  ]
);

// ==============================================================================
// 5. Matrizes de Alçadas de Aprovação
// ==============================================================================
export const approvalMatricesTable = pgTable(
  'matrizes_alcada',
  {
    id: text('id').primaryKey(),
    codigo: text('codigo').notNull(),
    versao: text('versao').notNull(),
    titulo: text('titulo').notNull(),
    status: text('status').notNull().default('VIGENTE'),
    vigenciaInicio: text('vigencia_inicio').notNull(),
    vigenciaFim: text('vigencia_fim').notNull(),
    elaboracao: text('elaboracao'),
    revisao: text('revisao'),
    aprovacao: text('aprovacao'),
    publicadoPor: text('publicado_por'),
    publicadoEm: timestamp('publicado_em', { withTimezone: true }),
    historicoAlteracoes: text('historico_alteracoes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_matriz_codigo_versao').on(table.codigo, table.versao),
    index('idx_matrizes_status').on(table.status),
  ]
);

// ==============================================================================
// 6. Regras da Matriz de Alçadas (Detalhamento por Processo)
// Chave Primária Composta: (matriz_id, processo_id)
// ==============================================================================
export const matrixRulesTable = pgTable(
  'regras_alcada',
  {
    matrizId: text('matriz_id').notNull().references(() => approvalMatricesTable.id, { onDelete: 'cascade' }),
    processoId: text('processo_id').notNull().references(() => processesTable.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    processoNome: text('processo_nome').notNull(),
    risco: text('risco').notNull(),
    alçadaPorEvento: numeric('alcada_por_evento', { precision: 15, scale: 2 }).notNull().default('0'),
    tetoMensal: numeric('teto_mensal', { precision: 15, scale: 2 }).notNull().default('0'),
    cargoHabilitadoDocumento: text('cargo_habilitado_documento'),
    cargosHabilitadosSolicitante: text('cargos_habilitados_solicitante').array(),
    alcadasObrigatorias: integer('alcadas_obrigatorias').array(),
    cargosHabilitados1: text('cargos_habilitados_1').array(),
    cargosHabilitados2: text('cargos_habilitados_2').array(),
    cargosHabilitados3: text('cargos_habilitados_3').array(),
    cargosHabilitados4: text('cargos_habilitados_4').array(),
    nivelMaximoRequerido: integer('nivel_maximo_requerido'),
    requerJustificativaSeAcimaLimite: boolean('requer_justificativa_se_acima_limite').default(false),
    observacoes: text('observacoes'),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.matrizId, table.processoId] }),
    index('idx_regras_matriz_id').on(table.matrizId),
    index('idx_regras_processo_id').on(table.processoId),
    index('idx_regras_risco').on(table.risco),
  ]
);

// ==============================================================================
// 7. Solicitações de Pagamento e Adiantamento (FOR-FIN-01)
// ==============================================================================
export const requestsTable = pgTable(
  'solicitacoes',
  {
    id: text('id').primaryKey(),
    numero: text('numero').notNull().unique(),
    sequencial: integer('sequencial').notNull(),
    ano: integer('ano').notNull(),

    // Identificação
    dataSolicitacao: text('data_solicitacao').notNull(),
    areaSolicitante: text('area_solicitante').notNull(),
    centroCusto: text('centro_custo').notNull(),
    solicitanteId: text('solicitante_id').notNull().references(() => usersTable.id),
    solicitanteNome: text('solicitante_nome').notNull(),
    solicitanteCargo: text('solicitante_cargo').notNull(),
    solicitanteEmail: text('solicitante_email').notNull(),
    processoId: text('processo_id').notNull().references(() => processesTable.id),
    processoNome: text('processo_nome').notNull(),
    processoContratoNumero: text('processo_contrato_numero'),
    fornecedorFavorecido: text('fornecedor_favorecido').notNull(),
    cpfCnpj: text('cpf_cnpj').notNull(),
    objetoDespesa: text('objeto_despesa').notNull(),

    // Financeiro
    valorTotal: numeric('valor_total', { precision: 15, scale: 2 }).notNull(),
    natureza: text('natureza').notNull(),
    formaPagamento: text('forma_pagamento').notNull(),
    parcelamento: boolean('parcelamento').notNull().default(false),
    quantidadeParcelas: integer('quantidade_parcelas'),
    valorParcela: numeric('valor_parcela', { precision: 15, scale: 2 }),
    dataVencimento: text('data_vencimento').notNull(),
    diasUteisAteVencimento: integer('dias_uteis_ate_vencimento').notNull(),
    alertaVencimentoProximo: boolean('alerta_vencimento_proximo').notNull().default(false),
    rubricaOrcamentaria: text('rubrica_orcamentaria').notNull(),
    previstoNoOrcamento: boolean('previsto_no_orcamento').notNull().default(true),
    justificativaNaoPrevisto: text('justificativa_nao_previsto'),
    saldoDisponivel: boolean('saldo_disponivel').notNull().default(true),
    dadosBancarios: jsonb('dados_bancarios').notNull(),

    // Enquadramento de Alçadas
    faixaValorCalculada: text('faixa_valor_calculada').notNull(),
    faixaValorLabel: text('faixa_valor_label').notNull(),
    nivelRisco: text('nivel_risco').notNull(),
    criteriosRisco: jsonb('criterios_risco').notNull(),
    alcadaAplicavelMaxima: integer('alcada_aplicavel_maxima').notNull(),
    alcadaAplicavelLabel: text('alcada_aplicavel_label').notNull(),
    matrizAlcadaId: text('matriz_alcada_id').notNull(),
    matrizAlcadaCodigo: text('matriz_alcada_codigo').notNull(),
    matrizAlcadaVersao: text('matriz_alcada_versao').notNull(),
    regraAlcadaId: text('regra_alcada_id').notNull(),
    tetoMensalProcesso: numeric('teto_mensal_processo', { precision: 15, scale: 2 }).default('0'),
    tetoMensalAcumuladoAtual: numeric('teto_mensal_acumulado_atual', { precision: 15, scale: 2 }).default('0'),
    tetoMensalEstourado: boolean('teto_mensal_estourado').default(false),
    tetoSemanalProcesso: numeric('teto_semanal_processo', { precision: 15, scale: 2 }).default('0'),
    tetoSemanalAcumuladoAtual: numeric('teto_semanal_acumulado_atual', { precision: 15, scale: 2 }).default('0'),
    tetoSemanalEstourado: boolean('teto_semanal_estourado').default(false),
    requerLiberacaoDiretoriaExecutiva: boolean('requer_liberacao_diretoria_executiva').default(false),
    motivoLiberacaoDiretoriaExecutiva: text('motivo_liberacao_diretoria_executiva'),

    // Princípios Inegociáveis
    declaracaoSegregacaoFuncoes: boolean('declaracao_segregacao_funcoes').default(true),
    declaracaoRegraQuatroOlhos: boolean('declaracao_regra_quatro_olhos').default(true),
    declaracaoProibicaoFracionamento: boolean('declaracao_proibicao_fracionamento').default(true),
    declaracaoAusenciaConflito: boolean('declaracao_ausencia_conflito').default(true),
    declaracaoAprovacaoPreviaCompromisso: boolean('declaracao_aprovacao_previa_compromisso').default(true),

    // Metadados Ricos
    justificativaTecnica: jsonb('justificativa_tecnica'),
    analiseFracionamento: jsonb('analise_fracionamento'),

    // Status e Fluxo
    status: text('status').notNull().default('ENVIADA'),
    etapaAtualNivel: text('etapa_atual_nivel'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_solicitacoes_numero').on(table.numero),
    index('idx_solicitacoes_status').on(table.status),
    index('idx_solicitacoes_solicitante_id').on(table.solicitanteId),
    index('idx_solicitacoes_centro_custo').on(table.centroCusto),
    index('idx_solicitacoes_processo_id').on(table.processoId),
    index('idx_solicitacoes_cpf_cnpj').on(table.cpfCnpj),
    index('idx_solicitacoes_data_vencimento').on(table.dataVencimento),
    index('idx_solicitacoes_created_at').on(table.createdAt),
    index('idx_solicitacoes_status_vencimento').on(table.status, table.dataVencimento),
    index('idx_solicitacoes_centro_status').on(table.centroCusto, table.status),
  ]
);

// ==============================================================================
// 8. Etapas da Cadeia de Aprovação Sequencial
// Chave Primária Composta: (solicitacao_id, nivel)
// ==============================================================================
export const approvalStepsTable = pgTable(
  'etapas_aprovacao',
  {
    solicitacaoId: text('solicitacao_id').notNull().references(() => requestsTable.id, { onDelete: 'cascade' }),
    nivel: integer('nivel').notNull(),
    id: text('id').notNull(),
    nivelLabel: text('nivel_label').notNull(),
    cargoExigido: text('cargo_exigido').notNull(),
    cargosHabilitados: text('cargos_habilitados').array(),
    areaExigida: text('area_exigida'),
    natureza: text('natureza'),
    aprovadorDesignadoId: text('aprovador_designado_id').references(() => usersTable.id),
    aprovadorDesignadoNome: text('aprovador_designado_nome'),
    aprovadorDesignadoCargo: text('aprovador_designado_cargo'),
    aprovadorDesignadoArea: text('aprovador_designado_area'),
    aprovadorDesignadoCentroCusto: text('aprovador_designado_centro_custo'),
    semAprovadorCadastrado: boolean('sem_aprovador_cadastrado').default(false),
    motivoSemAprovador: text('motivo_sem_aprovador'),
    aprovadorRealId: text('aprovador_real_id').references(() => usersTable.id),
    aprovadorRealNome: text('aprovador_real_nome'),
    aprovadorRealCargo: text('aprovador_real_cargo'),
    status: text('status').notNull().default('PENDENTE'),
    decisao: text('decisao'),
    justificativa: text('justificativa'),
    declaracaoConflitoInteresse: boolean('declaracao_conflito_interesse').default(false),
    dataEntrada: text('data_entrada').notNull(),
    dataDecisao: text('data_decisao'),
    ipAssinatura: text('ip_assinatura'),
    dispositivoAssinatura: text('dispositivo_assinatura'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.solicitacaoId, table.nivel] }),
    index('idx_etapas_solicitacao_id').on(table.solicitacaoId),
    index('idx_etapas_aprovador_designado').on(table.aprovadorDesignadoId),
    index('idx_etapas_status').on(table.status),
    index('idx_etapas_designado_status').on(table.aprovadorDesignadoId, table.status),
  ]
);

// ==============================================================================
// 9. Conferência Financeira / Fiscal (Controladoria e Contas a Pagar)
// ==============================================================================
export const financialChecksTable = pgTable(
  'conferencias_financeiras',
  {
    solicitacaoId: text('solicitacao_id').primaryKey().references(() => requestsTable.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    dataRecebimento: text('data_recebimento').notNull(),
    responsavelId: text('responsavel_id').references(() => usersTable.id),
    responsavelNome: text('responsavel_nome'),
    nfFaturaConferida: boolean('nf_fatura_conferida').default(false),
    contratoConferido: boolean('contrato_conferido').default(false),
    cotacoesConferidas: boolean('cotacoes_conferidas').default(false),
    boletoConferido: boolean('boleto_conferido').default(false),
    certidoesConferidas: boolean('certidoes_conferidas').default(false),
    retencaoISS: boolean('retencao_iss').default(false),
    retencaoINSS: boolean('retencao_inss').default(false),
    retencaoIRRF: boolean('retencao_irrf').default(false),
    retencaoPIS_COFINS_CSLL: boolean('retencao_pis_cofins_csll').default(false),
    retencaoNaoAplicavel: boolean('retencao_nao_aplicavel').default(true),
    valorBruto: numeric('valor_bruto', { precision: 15, scale: 2 }).default('0'),
    valorRetencoes: numeric('valor_retencoes', { precision: 15, scale: 2 }).default('0'),
    valorLiquido: numeric('valor_liquido', { precision: 15, scale: 2 }).default('0'),
    status: text('status').notNull().default('PENDENTE'),
    pendenciasObservacoes: text('pendencias_observacoes'),
    dataConferencia: text('data_conferencia'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_conferencias_status').on(table.status),
    index('idx_conferencias_responsavel').on(table.responsavelId),
  ]
);

// ==============================================================================
// 10. Registros de Baixa e Liquidação em Tesouraria
// ==============================================================================
export const paymentRecordsTable = pgTable(
  'registros_pagamento',
  {
    solicitacaoId: text('solicitacao_id').primaryKey().references(() => requestsTable.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    dataPagamento: text('data_pagamento').notNull(),
    responsavelTesourariaId: text('responsavel_tesouraria_id').notNull().references(() => usersTable.id),
    responsavelTesourariaNome: text('responsavel_tesouraria_nome').notNull(),
    responsavelTesourariaCargo: text('responsavel_tesouraria_cargo').notNull(),
    bancoUtilizado: text('banco_utilizado'),
    agenciaUtilizada: text('agencia_utilizada'),
    contaUtilizada: text('conta_utilizada'),
    formaEfetivaPagamento: text('forma_efetiva_pagamento').notNull(),
    numeroComprovante: text('numero_comprovante').notNull(),
    documentoComprovanteUrl: text('documento_comprovante_url'),
    observacoes: text('observacoes'),
    registradoEm: timestamp('registrado_em', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_pagamentos_data').on(table.dataPagamento),
    index('idx_pagamentos_comprovante').on(table.numeroComprovante),
    index('idx_pagamentos_responsavel').on(table.responsavelTesourariaId),
  ]
);

// ==============================================================================
// 11. Documentos e Evidências Vinculadas (Auditoria ISO 9001)
// ==============================================================================
export const requestDocumentsTable = pgTable(
  'solicitacao_documentos',
  {
    id: text('id').primaryKey(),
    solicitacaoId: text('solicitacao_id').notNull().references(() => requestsTable.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    nomeArquivo: text('nome_arquivo').notNull(),
    tamanhoBytes: integer('tamanho_bytes').notNull().default(0),
    mimeType: text('mime_type').notNull(),
    url: text('url').notNull(),
    hashSha256: text('hash_sha256').notNull(),
    uploadedById: text('uploaded_by_id').notNull().references(() => usersTable.id),
    uploadedByName: text('uploaded_by_name').notNull(),
    uploadedByEmail: text('uploaded_by_email').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
    observacao: text('observacao'),
  },
  (table) => [
    index('idx_docs_solicitacao_id').on(table.solicitacaoId),
    index('idx_docs_tipo').on(table.tipo),
    index('idx_docs_hash').on(table.hashSha256),
  ]
);

// ==============================================================================
// 12. Trilha de Auditoria Imutável (Audit Trail ISO 9001 / ANS)
// ==============================================================================
export const auditLogsTable = pgTable(
  'auditoria_logs',
  {
    id: text('id').primaryKey(),
    solicitacaoId: text('solicitacao_id'),
    solicitacaoNumero: text('solicitacao_numero'),
    entidade: text('entidade').notNull(),
    entidadeId: text('entidade_id').notNull(),
    acao: text('acao').notNull(),
    descricao: text('descricao').notNull(),
    usuarioId: text('usuario_id').notNull().references(() => usersTable.id),
    usuarioNome: text('usuario_nome').notNull(),
    usuarioEmail: text('usuario_email').notNull(),
    usuarioCargo: text('usuario_cargo').notNull(),
    usuarioArea: text('usuario_area').notNull(),
    valoresAnteriores: jsonb('valores_anteriores'),
    valoresPosteriores: jsonb('valores_posteriores'),
    ipAddress: text('ip_address').notNull(),
    userAgent: text('user_agent').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_solicitacao_id').on(table.solicitacaoId),
    index('idx_audit_entidade').on(table.entidade, table.entidadeId),
    index('idx_audit_usuario_id').on(table.usuarioId),
    index('idx_audit_timestamp').on(table.timestamp),
    index('idx_audit_acao').on(table.acao),
  ]
);

// ==============================================================================
// 13. Notificações do Sistema e Alertas de SLA
// ==============================================================================
export const systemNotificationsTable = pgTable(
  'notificacoes_sistema',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    tipo: text('tipo').notNull().default('INFO'),
    solicitacaoId: text('solicitacao_id'),
    solicitacaoNumero: text('solicitacao_numero'),
    targetTab: text('target_tab'),
    targetAction: text('target_action'),
    lida: boolean('lida').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifs_user_id').on(table.userId),
    index('idx_notifs_user_lida').on(table.userId, table.lida),
    index('idx_notifs_created_at').on(table.createdAt),
  ]
);

// ==============================================================================
// 14. Parâmetros e Configurações Globais de Governança
// ==============================================================================
export const systemConfigTable = pgTable(
  'configuracoes_sistema',
  {
    id: text('id').primaryKey(),
    diasUteisAlertaVencimento: integer('dias_uteis_alerta_vencimento').notNull().default(5),
    janelaDiasDeteccaoFracionamento: integer('janela_dias_deteccao_fracionamento').notNull().default(30),
    bloquearEstouroTetoMensal: boolean('bloquear_estouro_teto_mensal').notNull().default(false),
    exigirOtpLogin: boolean('exigir_otp_login').notNull().default(false),
    restringirDominioGoogleOAuth: boolean('restringir_dominio_google_oauth').notNull().default(true),
    dominioPermitido: text('dominio_permitido').notNull().default('@sbsaude.com.br'),
    slaAprovacaoHoras: integer('sla_aprovacao_horas').notNull().default(48),
    sgqRepositorioCodigo: text('sgq_repositorio_codigo').notNull().default('POL-DIR-01 / FOR-FIN-01'),
    tempoRetencaoAnos: integer('tempo_retencao_anos').notNull().default(2),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);
