-- ==============================================================================
-- SISTEMA DE GESTÃO DE ALÇADAS E APROVAÇÃO DE PAGAMENTOS (SB SAÚDE)
-- Arquitetura Completa de Banco de Dados Relacional para Supabase (PostgreSQL)
-- Normas de Governança: POL-DIR-01 | FOR-FIN-01 | ISO 9001:2015
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. EXTENSÕES DO POSTGRESQL
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ------------------------------------------------------------------------------
-- 1. TABELA DE PERSISTÊNCIA UNIVERSAL SUPABASE (APP_DATA)
-- Chave Primária Composta: (collection, id)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_data (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT pk_app_data PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_app_data_collection ON public.app_data (collection);
CREATE INDEX IF NOT EXISTS idx_app_data_updated_at ON public.app_data (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_data_gin_data ON public.app_data USING gin (data);

COMMENT ON TABLE public.app_data IS 'Armazenamento universal de coleções e entidades do sistema SB Saúde no Supabase';

-- ------------------------------------------------------------------------------
-- 2. TABELA DE CENTROS DE CUSTO (PLANO OPERACIONAL)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.centros_custo (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  responsavel TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_centros_custo_codigo ON public.centros_custo (codigo);
CREATE INDEX IF NOT EXISTS idx_centros_custo_ativo ON public.centros_custo (ativo);

-- ------------------------------------------------------------------------------
-- 3. TABELA DE USUÁRIOS CORPORATIVOS E CONTROLE RBAC
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  google_email TEXT,
  cargo TEXT NOT NULL,
  area TEXT NOT NULL,
  centro_custo TEXT NOT NULL,
  centros_custo TEXT[] DEFAULT ARRAY[]::TEXT[],
  phone TEXT,
  roles TEXT[] NOT NULL DEFAULT ARRAY['SOLICITANTE']::TEXT[],
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'PENDENTE_VERIFICACAO')),
  auth_type TEXT NOT NULL DEFAULT 'EMAIL_PASSWORD' CHECK (auth_type IN ('EMAIL_PASSWORD', 'GOOGLE', 'SAML_SSO')),
  is_email_verified BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  password TEXT,
  password_reset_requested BOOLEAN DEFAULT false,
  temp_password TEXT,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_google_email ON public.usuarios (google_email);
CREATE INDEX IF NOT EXISTS idx_usuarios_centro_custo ON public.usuarios (centro_custo);
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON public.usuarios (status);
CREATE INDEX IF NOT EXISTS idx_usuarios_cargo ON public.usuarios (cargo);
CREATE INDEX IF NOT EXISTS idx_usuarios_roles ON public.usuarios USING gin (roles);
CREATE INDEX IF NOT EXISTS idx_usuarios_nome_trgm ON public.usuarios USING gin (name gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 4. TABELA DE CATÁLOGO DE PROCESSOS (POL-DIR-01)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  natureza TEXT NOT NULL CHECK (natureza IN ('OPERACIONAL', 'ASSISTENCIAL', 'ADMINISTRATIVO', 'JURIDICO', 'MARKETING', 'RH', 'TI', 'FINANCEIRO')),
  risco_padrao TEXT NOT NULL DEFAULT 'MEDIO' CHECK (risco_padrao IN ('BAIXO', 'MEDIO', 'ALTO')),
  cargo_habilitado_documento TEXT,
  cargos_habilitados_solicitante TEXT[] DEFAULT ARRAY[]::TEXT[],
  requer_justificativa_tecnica BOOLEAN NOT NULL DEFAULT false,
  permite_parcelamento BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processos_code ON public.processos (code);
CREATE INDEX IF NOT EXISTS idx_processos_natureza ON public.processos (natureza);
CREATE INDEX IF NOT EXISTS idx_processos_risco_padrao ON public.processos (risco_padrao);
CREATE INDEX IF NOT EXISTS idx_processos_ativo ON public.processos (ativo);
CREATE INDEX IF NOT EXISTS idx_processos_name_trgm ON public.processos USING gin (name gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 5. TABELA DE MATRIZES DE ALÇADAS (POL-DIR-01)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matrizes_alcada (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  codigo TEXT NOT NULL,
  versao TEXT NOT NULL,
  titulo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('VIGENTE', 'HISTORICO', 'RASCUNHO', 'EM_REVISAO')),
  vigencia_inicio TEXT NOT NULL,
  vigencia_fim TEXT NOT NULL,
  elaboracao TEXT,
  revisao TEXT,
  aprovacao TEXT,
  publicado_por TEXT,
  publicado_em TIMESTAMP WITH TIME ZONE,
  historico_alteracoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_matriz_codigo_versao UNIQUE (codigo, versao)
);

CREATE INDEX IF NOT EXISTS idx_matrizes_status ON public.matrizes_alcada (status);
CREATE INDEX IF NOT EXISTS idx_matrizes_codigo ON public.matrizes_alcada (codigo);

-- ------------------------------------------------------------------------------
-- 6. TABELA DE REGRAS DE ALÇADA POR PROCESSO
-- Chave Primária Composta: (matriz_id, processo_id)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regras_alcada (
  matriz_id TEXT NOT NULL REFERENCES public.matrizes_alcada(id) ON DELETE CASCADE,
  processo_id TEXT NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  processo_nome TEXT NOT NULL,
  risco TEXT NOT NULL CHECK (risco IN ('BAIXO', 'MEDIO', 'ALTO')),
  alcada_por_evento NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  teto_mensal NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  cargo_habilitado_documento TEXT,
  cargos_habilitados_solicitante TEXT[] DEFAULT ARRAY[]::TEXT[],
  alcadas_obrigatorias INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  cargos_habilitados_1 TEXT[] DEFAULT ARRAY[]::TEXT[],
  cargos_habilitados_2 TEXT[] DEFAULT ARRAY[]::TEXT[],
  cargos_habilitados_3 TEXT[] DEFAULT ARRAY[]::TEXT[],
  cargos_habilitados_4 TEXT[] DEFAULT ARRAY[]::TEXT[],
  nivel_maximo_requerido INTEGER CHECK (nivel_maximo_requerido BETWEEN 1 AND 4),
  requer_justificativa_se_acima_limite BOOLEAN DEFAULT false,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT pk_regras_alcada PRIMARY KEY (matriz_id, processo_id)
);

CREATE INDEX IF NOT EXISTS idx_regras_matriz_id ON public.regras_alcada (matriz_id);
CREATE INDEX IF NOT EXISTS idx_regras_processo_id ON public.regras_alcada (processo_id);
CREATE INDEX IF NOT EXISTS idx_regras_risco ON public.regras_alcada (risco);

-- ------------------------------------------------------------------------------
-- 7. TABELA DE SOLICITAÇÕES DE PAGAMENTO (FOR-FIN-01)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitacoes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  numero TEXT NOT NULL UNIQUE,
  sequencial INTEGER NOT NULL,
  ano INTEGER NOT NULL,

  -- Identificação da Solicitação
  data_solicitacao TEXT NOT NULL,
  area_solicitante TEXT NOT NULL,
  centro_custo TEXT NOT NULL,
  solicitante_id TEXT NOT NULL REFERENCES public.usuarios(id),
  solicitante_nome TEXT NOT NULL,
  solicitante_cargo TEXT NOT NULL,
  solicitante_email TEXT NOT NULL,
  processo_id TEXT NOT NULL REFERENCES public.processos(id),
  processo_nome TEXT NOT NULL,
  processo_contrato_numero TEXT,
  fornecedor_favorecido TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  objeto_despesa TEXT NOT NULL,

  -- Dados Financeiros
  valor_total NUMERIC(15,2) NOT NULL,
  natureza TEXT NOT NULL CHECK (natureza IN ('RECORRENTE', 'EVENTUAL')),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('BOLETO', 'TED_PIX', 'DEBITO', 'CARTAO')),
  parcelamento BOOLEAN NOT NULL DEFAULT false,
  quantidade_parcelas INTEGER,
  valor_parcela NUMERIC(15,2),
  data_vencimento TEXT NOT NULL,
  dias_uteis_ate_vencimento INTEGER NOT NULL,
  alerta_vencimento_proximo BOOLEAN NOT NULL DEFAULT false,
  rubrica_orcamentaria TEXT NOT NULL,
  previsto_no_orcamento BOOLEAN NOT NULL DEFAULT true,
  justificativa_nao_previsto TEXT,
  saldo_disponivel BOOLEAN NOT NULL DEFAULT true,
  dados_bancarios JSONB NOT NULL,

  -- Enquadramento na Matriz de Alçada (POL-DIR-01)
  faixa_valor_calculada TEXT NOT NULL,
  faixa_valor_label TEXT NOT NULL,
  nivel_risco TEXT NOT NULL CHECK (nivel_risco IN ('BAIXO', 'MEDIO', 'ALTO')),
  criterios_risco JSONB NOT NULL,
  alcada_aplicavel_maxima INTEGER NOT NULL,
  alcada_aplicavel_label TEXT NOT NULL,
  matriz_alcada_id TEXT NOT NULL,
  matriz_alcada_codigo TEXT NOT NULL,
  matriz_alcada_versao TEXT NOT NULL,
  regra_alcada_id TEXT NOT NULL,
  teto_mensal_processo NUMERIC(15,2) DEFAULT 0.00,
  teto_mensal_acumulado_atual NUMERIC(15,2) DEFAULT 0.00,
  teto_mensal_estourado BOOLEAN DEFAULT false,
  teto_semanal_processo NUMERIC(15,2) DEFAULT 0.00,
  teto_semanal_acumulado_atual NUMERIC(15,2) DEFAULT 0.00,
  teto_semanal_estourado BOOLEAN DEFAULT false,
  requer_liberacao_diretoria_executiva BOOLEAN DEFAULT false,
  motivo_liberacao_diretoria_executiva TEXT,

  -- Princípios Inegociáveis
  declaracao_segregacao_funcoes BOOLEAN DEFAULT true,
  declaracao_regra_quatro_olhos BOOLEAN DEFAULT true,
  declaracao_proibicao_fracionamento BOOLEAN DEFAULT true,
  declaracao_ausencia_conflito BOOLEAN DEFAULT true,
  declaracao_aprovacao_previa_compromisso BOOLEAN DEFAULT true,

  -- Justificativa Técnica & Análise de Fracionamento
  justificativa_tecnica JSONB,
  analise_fracionamento JSONB,

  -- Status e Workflow
  status TEXT NOT NULL DEFAULT 'ENVIADA',
  etapa_atual_nivel TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices Estratégicos de Busca e Performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_numero ON public.solicitacoes (numero);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON public.solicitacoes (status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_solicitante_id ON public.solicitacoes (solicitante_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_centro_custo ON public.solicitacoes (centro_custo);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_processo_id ON public.solicitacoes (processo_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_cpf_cnpj ON public.solicitacoes (cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data_vencimento ON public.solicitacoes (data_vencimento);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_created_at ON public.solicitacoes (created_at DESC);

-- Índices Compostos para Consultas Frequentes da Fila e Dashboard
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status_vencimento ON public.solicitacoes (status, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_centro_status ON public.solicitacoes (centro_custo, status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_solicitante_data ON public.solicitacoes (solicitante_id, created_at DESC);

-- Índices GIN em JSONB e Busca Textual
CREATE INDEX IF NOT EXISTS idx_solicitacoes_dados_bancarios ON public.solicitacoes USING gin (dados_bancarios);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_criterios_risco ON public.solicitacoes USING gin (criterios_risco);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_justificativa ON public.solicitacoes USING gin (justificativa_tecnica);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_fracionamento ON public.solicitacoes USING gin (analise_fracionamento);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_fornecedor_trgm ON public.solicitacoes USING gin (fornecedor_favorecido gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_objeto_trgm ON public.solicitacoes USING gin (objeto_despesa gin_trgm_ops);

-- ------------------------------------------------------------------------------
-- 8. TABELA DE ETAPAS DA CADEIA DE APROVAÇÃO
-- Chave Primária Composta: (solicitacao_id, nivel)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.etapas_aprovacao (
  solicitacao_id TEXT NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 4),
  id TEXT NOT NULL,
  nivel_label TEXT NOT NULL,
  cargo_exigido TEXT NOT NULL,
  cargos_habilitados TEXT[] DEFAULT ARRAY[]::TEXT[],
  area_exigida TEXT,
  natureza TEXT,
  aprovador_designado_id TEXT REFERENCES public.usuarios(id),
  aprovador_designado_nome TEXT,
  aprovador_designado_cargo TEXT,
  aprovador_designado_area TEXT,
  aprovador_designado_centro_custo TEXT,
  sem_aprovador_cadastrado BOOLEAN DEFAULT false,
  motivo_sem_aprovador TEXT,
  aprovador_real_id TEXT REFERENCES public.usuarios(id),
  aprovador_real_nome TEXT,
  aprovador_real_cargo TEXT,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'REPROVADO', 'DEVOLVIDO', 'IGNORADO')),
  decisao TEXT CHECK (decisao IN ('APROVADO', 'REPROVADO', 'DEVOLVIDO', 'PENDENTE', NULL)),
  justificativa TEXT,
  declaracao_conflito_interesse BOOLEAN DEFAULT false,
  data_entrada TEXT NOT NULL,
  data_decisao TEXT,
  ip_assinatura TEXT,
  dispositivo_assinatura TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT pk_etapas_aprovacao PRIMARY KEY (solicitacao_id, nivel)
);

CREATE INDEX IF NOT EXISTS idx_etapas_solicitacao_id ON public.etapas_aprovacao (solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_etapas_aprovador_designado ON public.etapas_aprovacao (aprovador_designado_id);
CREATE INDEX IF NOT EXISTS idx_etapas_status ON public.etapas_aprovacao (status);
CREATE INDEX IF NOT EXISTS idx_etapas_designado_status ON public.etapas_aprovacao (aprovador_designado_id, status);

-- ------------------------------------------------------------------------------
-- 9. TABELA DE CONFERÊNCIA FINANCEIRA / FISCAL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conferencias_financeiras (
  solicitacao_id TEXT PRIMARY KEY REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  data_recebimento TEXT NOT NULL,
  responsavel_id TEXT REFERENCES public.usuarios(id),
  responsavel_nome TEXT,
  nf_fatura_conferida BOOLEAN DEFAULT false,
  contrato_conferido BOOLEAN DEFAULT false,
  cotacoes_conferidas BOOLEAN DEFAULT false,
  boleto_conferido BOOLEAN DEFAULT false,
  certidoes_conferidas BOOLEAN DEFAULT false,
  retencao_iss BOOLEAN DEFAULT false,
  retencao_inss BOOLEAN DEFAULT false,
  retencao_irrf BOOLEAN DEFAULT false,
  retencao_pis_cofins_csll BOOLEAN DEFAULT false,
  retencao_nao_aplicavel BOOLEAN DEFAULT true,
  valor_bruto NUMERIC(15,2) DEFAULT 0.00,
  valor_retencoes NUMERIC(15,2) DEFAULT 0.00,
  valor_liquido NUMERIC(15,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'LIBERADO_PAGAMENTO', 'DEVOLVIDO_AREA')),
  pendencias_observacoes TEXT,
  data_conferencia TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conferencias_status ON public.conferencias_financeiras (status);
CREATE INDEX IF NOT EXISTS idx_conferencias_responsavel ON public.conferencias_financeiras (responsavel_id);

-- ------------------------------------------------------------------------------
-- 10. TABELA DE REGISTROS DE PAGAMENTO (TESOURARIA)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registros_pagamento (
  solicitacao_id TEXT PRIMARY KEY REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  data_pagamento TEXT NOT NULL,
  responsavel_tesouraria_id TEXT NOT NULL REFERENCES public.usuarios(id),
  responsavel_tesouraria_nome TEXT NOT NULL,
  responsavel_tesouraria_cargo TEXT NOT NULL,
  banco_utilizado TEXT,
  agencia_utilizada TEXT,
  conta_utilizada TEXT,
  forma_efetiva_pagamento TEXT NOT NULL CHECK (forma_efetiva_pagamento IN ('BOLETO', 'TED_PIX', 'DEBITO', 'CARTAO')),
  numero_comprovante TEXT NOT NULL,
  documento_comprovante_url TEXT,
  observacoes TEXT,
  registrado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON public.registros_pagamento (data_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_comprovante ON public.registros_pagamento (numero_comprovante);
CREATE INDEX IF NOT EXISTS idx_pagamentos_responsavel ON public.registros_pagamento (responsavel_tesouraria_id);

-- ------------------------------------------------------------------------------
-- 11. TABELA DE DOCUMENTOS E ANEXOS (ISO 9001)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitacao_documentos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  solicitacao_id TEXT NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('NF_FATURA', 'CONTRATO', 'PROPOSTA', 'COTACOES', 'BOLETO', 'CERTIDOES', 'COMPROVANTE_PAGAMENTO', 'COMPLEMENTAR', 'PARECER_TECNICO')),
  nome_arquivo TEXT NOT NULL,
  tamanho_bytes INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL,
  url TEXT NOT NULL,
  hash_sha256 TEXT NOT NULL,
  uploaded_by_id TEXT NOT NULL REFERENCES public.usuarios(id),
  uploaded_by_name TEXT NOT NULL,
  uploaded_by_email TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  observacao TEXT
);

CREATE INDEX IF NOT EXISTS idx_docs_solicitacao_id ON public.solicitacao_documentos (solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_docs_tipo ON public.solicitacao_documentos (tipo);
CREATE INDEX IF NOT EXISTS idx_docs_hash ON public.solicitacao_documentos (hash_sha256);

-- ------------------------------------------------------------------------------
-- 12. TABELA DE AUDITORIA IMUTÁVEL (AUDIT TRAIL ISO 9001)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  solicitacao_id TEXT,
  solicitacao_numero TEXT,
  entidade TEXT NOT NULL,
  entidade_id TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios(id),
  usuario_nome TEXT NOT NULL,
  usuario_email TEXT NOT NULL,
  usuario_cargo TEXT NOT NULL,
  usuario_area TEXT NOT NULL,
  valores_anteriores JSONB,
  valores_posteriores JSONB,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_solicitacao_id ON public.auditoria_logs (solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_audit_entidade ON public.auditoria_logs (entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_usuario_id ON public.auditoria_logs (usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.auditoria_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_acao ON public.auditoria_logs (acao);

-- ------------------------------------------------------------------------------
-- 13. TABELA DE NOTIFICAÇÕES E ALERTAS DE SLA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notificacoes_sistema (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'INFO' CHECK (tipo IN ('INFO', 'AVISO', 'URGENTE', 'SUCESSO', 'ERRO')),
  solicitacao_id TEXT,
  solicitacao_numero TEXT,
  target_tab TEXT,
  target_action TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifs_user_id ON public.notificacoes_sistema (user_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user_lida ON public.notificacoes_sistema (user_id, lida);
CREATE INDEX IF NOT EXISTS idx_notifs_created_at ON public.notificacoes_sistema (created_at DESC);

-- ------------------------------------------------------------------------------
-- 14. TABELA DE PARÂMETROS E CONFIGURAÇÕES DO SISTEMA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id TEXT PRIMARY KEY,
  dias_uteis_alerta_vencimento INTEGER NOT NULL DEFAULT 5,
  janela_dias_deteccao_fracionamento INTEGER NOT NULL DEFAULT 30,
  bloquear_estouro_teto_mensal BOOLEAN NOT NULL DEFAULT false,
  exigir_otp_login BOOLEAN NOT NULL DEFAULT false,
  restringir_dominio_google_oauth BOOLEAN NOT NULL DEFAULT true,
  dominio_permitido TEXT NOT NULL DEFAULT '@sbsaude.com.br',
  sla_aprovacao_horas INTEGER NOT NULL DEFAULT 48,
  sgq_repositorio_codigo TEXT NOT NULL DEFAULT 'POL-DIR-01 / FOR-FIN-01',
  tempo_retencao_anos INTEGER NOT NULL DEFAULT 2,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 15. FUNÇÕES E TRIGGERS DE ATUALIZAÇÃO AUTOMÁTICA DE DATA (UPDATED_AT)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_atualizar_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_processos_updated_at ON public.processos;
CREATE TRIGGER trg_processos_updated_at
  BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_matrizes_updated_at ON public.matrizes_alcada;
CREATE TRIGGER trg_matrizes_updated_at
  BEFORE UPDATE ON public.matrizes_alcada
  FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_regras_updated_at ON public.regras_alcada;
CREATE TRIGGER trg_regras_updated_at
  BEFORE UPDATE ON public.regras_alcada
  FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_solicitacoes_updated_at ON public.solicitacoes;
CREATE TRIGGER trg_solicitacoes_updated_at
  BEFORE UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- 16. SEGURANÇA E POLÍTICAS DE ACESSO (ROW LEVEL SECURITY - RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrizes_alcada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_alcada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_aprovacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferencias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacao_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- 16.1. Política Master para Backend / Service Role
CREATE POLICY "service_role_all_app_data" ON public.app_data FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_centros_custo" ON public.centros_custo FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_usuarios" ON public.usuarios FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_processos" ON public.processos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_matrizes" ON public.matrizes_alcada FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_regras" ON public.regras_alcada FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_solicitacoes" ON public.solicitacoes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_etapas" ON public.etapas_aprovacao FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_conferencias" ON public.conferencias_financeiras FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_pagamentos" ON public.registros_pagamento FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_documentos" ON public.solicitacao_documentos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_auditoria" ON public.auditoria_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_notificacoes" ON public.notificacoes_sistema FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_config" ON public.configuracoes_sistema FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 16.2. Políticas para Usuários Autenticados (Acesso Granular)
CREATE POLICY "auth_read_catalogo" ON public.processos FOR SELECT TO authenticated USING (ativo = true);
CREATE POLICY "auth_read_centros" ON public.centros_custo FOR SELECT TO authenticated USING (ativo = true);
CREATE POLICY "auth_read_matrizes" ON public.matrizes_alcada FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_regras" ON public.regras_alcada FOR SELECT TO authenticated USING (ativo = true);
CREATE POLICY "auth_read_config" ON public.configuracoes_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_usuarios" ON public.usuarios FOR SELECT TO authenticated USING (status = 'ATIVO');

-- Solicitações: solicitante visualiza suas solicitações ou se for aprovador/financeiro/admin
CREATE POLICY "auth_solicitacoes_select" ON public.solicitacoes FOR SELECT TO authenticated
USING (
  solicitante_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.etapas_aprovacao e
    WHERE e.solicitacao_id = public.solicitacoes.id
      AND (e.aprovador_designado_id = auth.uid()::text OR e.aprovador_real_id = auth.uid()::text)
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()::text
      AND (u.roles && ARRAY['ADMINISTRADOR', 'FINANCEIRO', 'TESOURARIA', 'APROVADOR_1', 'APROVADOR_2', 'APROVADOR_3', 'APROVADOR_4']::TEXT[])
  )
);

CREATE POLICY "auth_solicitacoes_insert" ON public.solicitacoes FOR INSERT TO authenticated
WITH CHECK (solicitante_id = auth.uid()::text);

CREATE POLICY "auth_solicitacoes_update" ON public.solicitacoes FOR UPDATE TO authenticated
USING (
  solicitante_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()::text
      AND (u.roles && ARRAY['ADMINISTRADOR', 'FINANCEIRO', 'TESOURARIA', 'APROVADOR_1', 'APROVADOR_2', 'APROVADOR_3', 'APROVADOR_4']::TEXT[])
  )
);

-- Etapas de Aprovação
CREATE POLICY "auth_etapas_select" ON public.etapas_aprovacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_etapas_update" ON public.etapas_aprovacao FOR UPDATE TO authenticated
USING (
  aprovador_designado_id = auth.uid()::text
  OR aprovador_real_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = auth.uid()::text AND 'ADMINISTRADOR' = ANY(u.roles)
  )
);

-- Notificações: usuário só lê as suas ou destinadas a ALL
CREATE POLICY "auth_notificacoes_select" ON public.notificacoes_sistema FOR SELECT TO authenticated
USING (user_id = auth.uid()::text OR user_id = 'ALL');

CREATE POLICY "auth_notificacoes_update" ON public.notificacoes_sistema FOR UPDATE TO authenticated
USING (user_id = auth.uid()::text OR user_id = 'ALL');

-- ------------------------------------------------------------------------------
-- 17. VIEWS ANALÍTICAS DE GOVERNANÇA E CONTROLE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_painel_indicadores_alcada AS
SELECT
  COUNT(*) AS total_solicitacoes,
  COALESCE(SUM(valor_total), 0) AS valor_total_geral,
  COUNT(*) FILTER (WHERE status LIKE 'AGUARDANDO_%_ALCADA' OR status = 'EM_ANALISE_ALCADA') AS aguardando_aprovacao,
  COUNT(*) FILTER (WHERE status IN ('AGUARDANDO_FINANCEIRO', 'EM_CONFERENCIA_FINANCEIRA')) AS aguardando_financeiro,
  COUNT(*) FILTER (WHERE status = 'LIBERADA_PAGAMENTO') AS liberadas_pagamento,
  COUNT(*) FILTER (WHERE status = 'PAGAMENTO_EFETUADO') AS pagas,
  COUNT(*) FILTER (WHERE alerta_vencimento_proximo = true AND status NOT IN ('PAGAMENTO_EFETUADO', 'CANCELADA')) AS alertas_sla_vencimento,
  COUNT(*) FILTER (WHERE (analise_fracionamento->>'possivelFracionamentoIdentificado')::boolean = true) AS alertas_fracionamento
FROM public.solicitacoes;

CREATE OR REPLACE VIEW public.vw_solicitacoes_urgentes_sla AS
SELECT
  id,
  numero,
  solicitante_nome,
  centro_custo,
  fornecedor_favorecido,
  valor_total,
  data_vencimento,
  dias_uteis_ate_vencimento,
  status,
  etapa_atual_nivel
FROM public.solicitacoes
WHERE status NOT IN ('PAGAMENTO_EFETUADO', 'CANCELADA', 'REPROVADA')
  AND dias_uteis_ate_vencimento <= 5
ORDER BY dias_uteis_ate_vencimento ASC;

-- ------------------------------------------------------------------------------
-- FIM DO SCRIPT DE MIGRAÇÃO
-- SB Saúde - Diretoria Executiva & Governança Corporativa
-- ------------------------------------------------------------------------------
