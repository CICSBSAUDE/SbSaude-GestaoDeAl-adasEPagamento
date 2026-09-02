import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Solicitacao, EtapaAprovacao } from '../types';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  FileText,
  Lock,
  Building,
  User,
  Clock,
  Download,
  Calendar,
  Layers,
  Sparkles,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

interface RequestDetailModalProps {
  request: Solicitacao;
  onClose: () => void;
  onRefresh: () => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  onClose,
  onRefresh,
}) => {
  const { currentUser } = useAuth();

  // Approval Action States
  const [decisao, setDecisao] = useState<'APROVADO' | 'REPROVADO' | 'DEVOLVIDO'>('APROVADO');
  const [justificativa, setJustificativa] = useState<string>('');
  const [declaracaoConflitoInteresse, setDeclaracaoConflitoInteresse] = useState<boolean>(false);
  const [submittingApproval, setSubmittingApproval] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  // Check if current user is eligible to act on current pending stage
  const pendingEtapaIndex = request.cadeiaAprovacao?.findIndex((e) => e.status === 'PENDENTE');
  const activePendingEtapa =
    pendingEtapaIndex !== -1 && request.cadeiaAprovacao
      ? request.cadeiaAprovacao[pendingEtapaIndex]
      : null;

  const isAssignedApprover =
    activePendingEtapa &&
    currentUser &&
    (activePendingEtapa.aprovadorDesignadoId === currentUser.id ||
      (activePendingEtapa.nivel === 1 && currentUser.roles.includes('APROVADOR_1')) ||
      (activePendingEtapa.nivel === 2 && currentUser.roles.includes('APROVADOR_2')) ||
      (activePendingEtapa.nivel === 3 && currentUser.roles.includes('APROVADOR_3')) ||
      (activePendingEtapa.nivel === 4 && currentUser.roles.includes('APROVADOR_4')) ||
      currentUser.roles.includes('ADMINISTRADOR'));

  // Segregation of duties check
  const isRequester = currentUser && request.solicitanteId === currentUser.id;
  const alreadyApprovedInAnotherTier =
    currentUser &&
    request.cadeiaAprovacao?.some(
      (e) => e.status === 'APROVADO' && e.aprovadorRealId === currentUser.id
    );

  const canApprove =
    isAssignedApprover &&
    !isRequester &&
    !alreadyApprovedInAnotherTier &&
    request.status.startsWith('AGUARDANDO_');

  const handleProcessApproval = async () => {
    setApprovalError(null);
    setApprovalSuccess(null);

    if (decisao === 'APROVADO' && !declaracaoConflitoInteresse) {
      setApprovalError('É obrigatório assinalar a declaração de ausência de conflito de interesses.');
      return;
    }

    if ((decisao === 'REPROVADO' || decisao === 'DEVOLVIDO') && (!justificativa || justificativa.trim().length < 5)) {
      setApprovalError('É obrigatório registrar uma justificativa clara para reprovação ou devolução.');
      return;
    }

    setSubmittingApproval(true);
    try {
      const res = await api.submitApproval(request.id, {
        decisao,
        justificativa,
        declaracaoConflitoInteresse,
      });
      setApprovalSuccess(res.message || 'Decisão registrada com sucesso!');
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1200);
    } catch (err: any) {
      setApprovalError(err.message || 'Erro ao processar aprovação.');
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Top Control Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              {request.numero}
            </span>
            <span className="text-xs text-slate-700 font-semibold truncate max-w-xs sm:max-w-md">
              {request.processoNome}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition flex items-center space-x-1.5"
              title="Imprimir Formulário FOR-FIN-01 Oficial"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 text-xs bg-slate-50/50">
          
          {/* Official Document Header */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-slate-100 gap-4 text-center sm:text-left">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-sm shadow-blue-200">
                  SB
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900 tracking-tight uppercase">
                    SB Saúde — Operadora de Planos de Saúde
                  </h1>
                  <p className="text-[11px] text-blue-600 font-bold">
                    FOR-FIN-01 — Formulário de Registro de Alçada e Aprovação para Pagamento
                  </p>
                </div>
              </div>

              <div className="text-right font-mono text-[10px] space-y-0.5">
                <p className="text-slate-400">Documento Normativo Controlado</p>
                <p className="text-blue-600 font-bold">Referência: {request.matrizAlcadaCodigo || 'POL-DIR-01'} ({request.matrizAlcadaVersao})</p>
                <p className="text-slate-400">ISO 9001:2015 Seção 7.5</p>
              </div>
            </div>

            {/* Grid Item 1: Identificação da Solicitação */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 uppercase font-bold block text-[9px]">Número Registro:</span>
                <span className="font-mono font-bold text-blue-600">{request.numero}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-bold block text-[9px]">Data Solicitação:</span>
                <span className="text-slate-800 font-semibold">{request.dataSolicitacao}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-bold block text-[9px]">Área Solicitante:</span>
                <span className="text-slate-800 font-semibold">{request.areaSolicitante}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-bold block text-[9px]">Centro de Custo:</span>
                <span className="font-mono text-slate-700 font-semibold">{request.centroCusto || 'CC-Geral'}</span>
              </div>
            </div>
          </div>

          {/* Section 1 & 2: Solicitante & Processo */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-600" />
              <span>1. Identificação do Solicitante & Processo da Matriz</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Solicitante:</span>
                <span className="font-bold text-slate-800">{request.solicitanteNome}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Cargo Funcional:</span>
                <span className="text-blue-600 font-medium">{request.solicitanteCargo}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Processo Vinculado:</span>
                <span className="font-semibold text-slate-800">{request.processoNome}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Favorecido e Dados Financeiros */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span>2. Favorecido e Especificação Financeira</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Favorecido / Razão Social:</span>
                <span className="font-bold text-slate-800">{request.fornecedorFavorecido}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">CPF / CNPJ:</span>
                <span className="font-mono text-slate-800">{request.cpfCnpj || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Valor Total:</span>
                <span className="font-mono font-bold text-blue-600 text-sm">
                  {formatCurrency(request.valorTotal)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Objeto da Despesa:</span>
              <p className="text-slate-800 mt-0.5">{request.objetoDespesa}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] border-t border-slate-100">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Forma Pagamento:</span>
                <span className="text-slate-800 font-semibold">{request.formaPagamento}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Data Vencimento:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {new Date(request.dataVencimento).toLocaleDateString('pt-BR')} ({request.diasUteisAteVencimento} dias úteis)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Rubrica Orçamentária:</span>
                <span className="text-slate-800 font-semibold">{request.rubricaOrcamentaria}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Enquadramento de Alçadas & Risco */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>3. Enquadramento e Análise de Risco (POL-DIR-01)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Faixa Calculada:</span>
                <span className="font-bold text-slate-800">{request.faixaValorLabel}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Nível de Risco:</span>
                <span className={`font-bold ${
                  request.nivelRisco === 'ALTO' ? 'text-red-600' : request.nivelRisco === 'MEDIO' ? 'text-amber-600' : 'text-blue-600'
                }`}>
                  {request.nivelRisco}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Alçada Máxima:</span>
                <span className="font-bold text-blue-600">{request.alcadaAplicavelLabel}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[9px] uppercase font-bold">Teto Mensal:</span>
                <span className="font-mono text-slate-700">
                  {request.tetoMensalProcesso > 0 ? formatCurrency(request.tetoMensalProcesso) : 'Sem limite'}
                </span>
              </div>
            </div>

            {request.analiseFracionamento?.possivelFracionamentoIdentificado && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800">Alerta de Fracionamento Registrado na Submissão</p>
                  <p className="text-[11px] text-red-700">{request.analiseFracionamento.observacao}</p>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Declarações & Justificativa Técnica */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>4. Justificativa Técnica e Declarações Expressas de Governança</span>
            </h3>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Justificativa Técnica do Solicitante:</span>
              <p className="text-slate-800 mt-1 italic">"{request.justificativaTecnica}"</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Segregação de funções declarada</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Regra dos 4 olhos declarada</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Proibição de fracionamento declarada</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Ausência de conflito de interesses declarada</span>
              </div>
            </div>
          </div>

          {/* Section 6: CADEIA DE ASSINATURAS E DECISÕES DE ALÇADA */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>5. Cadeia de Assinaturas e Decisões de Alçada (POL-DIR-01)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {request.cadeiaAprovacao?.map((etapa) => {
                const isApproved = etapa.status === 'APROVADO';
                const isRejected = etapa.status === 'REPROVADO';
                const isPending = etapa.status === 'PENDENTE';

                return (
                  <div
                    key={etapa.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                      isApproved
                        ? 'bg-blue-50/40 border-blue-200'
                        : isRejected
                        ? 'bg-red-50/40 border-red-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                      <span className="font-bold text-slate-800">{etapa.nivelLabel}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isApproved
                            ? 'bg-blue-100 text-blue-700'
                            : isRejected
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {etapa.status}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Aprovador:</span>
                      <p className="font-semibold text-slate-800">
                        {etapa.aprovadorRealNome || etapa.aprovadorDesignadoNome || 'Aguardando designação'}
                      </p>
                      <p className="text-[10px] text-blue-600 font-medium">
                        {etapa.aprovadorRealCargo || etapa.cargoExigido}
                      </p>
                    </div>

                    {etapa.dataDecisao && (
                      <div className="text-[10px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-200">
                        <p>Data/Hora: <span className="text-slate-800 font-mono">{new Date(etapa.dataDecisao).toLocaleString('pt-BR')}</span></p>
                        <p>Parecer: <span className="text-slate-800 italic">"{etapa.justificativa}"</span></p>
                        {etapa.declaracaoConflitoInteresse && (
                          <p className="text-blue-600 font-bold">✓ Declarada ausência de conflito</p>
                        )}
                        {etapa.ipAssinatura && (
                          <p className="font-mono text-slate-400">IP: {etapa.ipAssinatura}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 7: CONFERÊNCIA FINANCEIRA & TESOURARIA LIQUIDAÇÃO */}
          {(request.conferenciaFinanceira || request.registroPagamento) && (
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
                <Building className="w-4 h-4 text-blue-600" />
                <span>6. Setor Financeiro & Registro de Pagamento Tesouraria</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {request.conferenciaFinanceira && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <p className="font-bold text-blue-600">Conferência Setor Financeiro</p>
                    <p>Status: <strong className="text-slate-800">{request.conferenciaFinanceira.status}</strong></p>
                    <p>Responsável: <strong className="text-slate-800">{request.conferenciaFinanceira.responsavelNome || 'Financeiro'}</strong></p>
                    <p>Retenções: <span className="font-mono text-amber-600">{formatCurrency(request.conferenciaFinanceira.valorRetencoes)}</span></p>
                    <p>Valor Líquido: <span className="font-mono font-bold text-blue-600">{formatCurrency(request.conferenciaFinanceira.valorLiquido)}</span></p>
                  </div>
                )}

                {request.registroPagamento && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <p className="font-bold text-blue-600">Liquidação Módulo Tesouraria</p>
                    <p>Comprovante: <strong className="font-mono text-slate-800">{request.registroPagamento.numeroComprovante}</strong></p>
                    <p>Data do Pagamento: <strong className="text-slate-800">{request.registroPagamento.dataPagamento}</strong></p>
                    <p>Responsável: <strong className="text-slate-800">{request.registroPagamento.responsavelTesourariaNome}</strong></p>
                    <p>Origem: <span className="text-slate-600">{request.registroPagamento.bancoUtilizado}</span></p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 8: Documentos Comprobatórios */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>7. Anexos Comprobatórios (Hash SHA-256)</span>
            </h3>

            {request.documentos?.length === 0 ? (
              <p className="text-slate-500 text-xs">Nenhum documento anexado.</p>
            ) : (
              <div className="space-y-2">
                {request.documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{doc.nomeArquivo}</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-mono border border-blue-100">
                        {doc.tipo}
                      </span>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Hash SHA-256: {doc.hashSha256}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIVE APPROVAL WORKSTATION (IF CURRENT USER IS THE ELIGIBLE APPROVER) */}
          {canApprove && (
            <div className="p-5 rounded-xl bg-blue-50/60 border-2 border-blue-300 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Estação de Decisão — {activePendingEtapa?.nivelLabel}
                  </h3>
                </div>
                <span className="text-xs text-blue-600 font-bold">
                  Avaliador: {currentUser?.name} ({currentUser?.cargo})
                </span>
              </div>

              {approvalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{approvalError}</span>
                </div>
              )}

              {approvalSuccess && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>{approvalSuccess}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decisao"
                      value="APROVADO"
                      checked={decisao === 'APROVADO'}
                      onChange={() => setDecisao('APROVADO')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold text-blue-700">Aprovar Solicitação</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decisao"
                      value="REPROVADO"
                      checked={decisao === 'REPROVADO'}
                      onChange={() => setDecisao('REPROVADO')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="font-bold text-red-700">Reprovar</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decisao"
                      value="DEVOLVIDO"
                      checked={decisao === 'DEVOLVIDO'}
                      onChange={() => setDecisao('DEVOLVIDO')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-bold text-amber-700">Devolver para Correção</span>
                  </label>
                </div>

                {/* Mandatory Conflict Check for Approval */}
                {decisao === 'APROVADO' && (
                  <label className="flex items-start space-x-2.5 p-3 rounded-lg bg-white border border-blue-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declaracaoConflitoInteresse}
                      onChange={(e) => setDeclaracaoConflitoInteresse(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">
                      <strong className="text-blue-700">Declaração de Ausência de Conflito de Interesses:</strong> Declaro sob responsabilidade que não possuo interesse pessoal, societário ou familiar com o favorecido ou objeto desta despesa.
                    </span>
                  </label>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parecer / Justificativa da Decisão {decisao !== 'APROVADO' && '*'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={
                      decisao === 'APROVADO'
                        ? 'Parecer de aprovação (opcional)...'
                        : 'Descreva a motivação da reprovação ou os ajustes necessários...'
                    }
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={submittingApproval}
                    onClick={handleProcessApproval}
                    className={`px-5 py-2 rounded-lg font-bold text-xs shadow-sm transition flex items-center space-x-2 ${
                      decisao === 'APROVADO'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                        : decisao === 'REPROVADO'
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Decisão de {activePendingEtapa?.nivelLabel}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Segregation Block Alert if user is requester */}
          {isRequester && request.status.startsWith('AGUARDANDO_') && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
              <span>
                <strong>Segregação de Funções:</strong> Você é o solicitante deste processo. A aprovação deve ser realizada pelas autoridades competentes designadas nas alçadas superiores.
              </span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition"
          >
            Fechar Visualização
          </button>
        </div>

      </div>
    </div>
  );
};
