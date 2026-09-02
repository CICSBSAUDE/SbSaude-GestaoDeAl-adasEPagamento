import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Processo, PaymentMethod, RiskLevel } from '../types';
import {
  FilePlus2,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Upload,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Info,
  Calendar,
  DollarSign,
  Building,
} from 'lucide-react';

interface NewRequestFormProps {
  onSuccess: (newRequest: any) => void;
  onCancel: () => void;
}

export const NewRequestForm: React.FC<NewRequestFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { currentUser } = useAuth();

  const [processes, setProcesses] = useState<Processo[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [processoId, setProcessoId] = useState<string>('');
  const [processoContratoNumero, setProcessoContratoNumero] = useState<string>('');
  const [fornecedorFavorecido, setFornecedorFavorecido] = useState<string>('');
  const [cpfCnpj, setCpfCnpj] = useState<string>('');
  const [objetoDespesa, setObjetoDespesa] = useState<string>('');
  const [valorTotal, setValorTotal] = useState<string>('12500');
  const [natureza, setNatureza] = useState<'CONTINUA' | 'EVENTUAL'>('EVENTUAL');
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>('BOLETO');
  const [parcelamento, setParcelamento] = useState<boolean>(false);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number>(1);
  const [dataVencimento, setDataVencimento] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [rubricaOrcamentaria, setRubricaOrcamentaria] = useState<string>('3.1.00 - Despesas Operacionais');
  const [previstoNoOrcamento, setPrevistoNoOrcamento] = useState<boolean>(true);
  const [saldoDisponivel, setSaldoDisponivel] = useState<boolean>(true);
  const [justificativaNaoPrevisto, setJustificativaNaoPrevisto] = useState<string>('');
  const [justificativaTecnica, setJustificativaTecnica] = useState<string>('');

  // Bank details
  const [banco, setBanco] = useState<string>('');
  const [agencia, setAgencia] = useState<string>('');
  const [contaCorrente, setContaCorrente] = useState<string>('');

  // Risk Checklist
  const [criterioAssistencial, setCriterioAssistencial] = useState<boolean>(false);
  const [criterioAns, setCriterioAns] = useState<boolean>(false);
  const [criterioFinanceiro, setCriterioFinanceiro] = useState<boolean>(false);
  const [criterioReputacional, setCriterioReputacional] = useState<boolean>(false);

  // Mandatory 5 Governance Declarations
  const [decSegregacao, setDecSegregacao] = useState<boolean>(false);
  const [decQuatroOlhos, setDecQuatroOlhos] = useState<boolean>(false);
  const [decFracionamento, setDecFracionamento] = useState<boolean>(false);
  const [decConflito, setDecConflito] = useState<boolean>(false);
  const [decPrevia, setDecPrevia] = useState<boolean>(false);

  // Uploaded docs
  const [documentos, setDocumentos] = useState<any[]>([]);

  // Live Enquadramento Result
  const [enquadramento, setEnquadramento] = useState<any>(null);
  const [calculatingEnquadramento, setCalculatingEnquadramento] = useState<boolean>(false);

  useEffect(() => {
    const fetchProc = async () => {
      try {
        const res = await api.getProcesses();
        setProcesses(res.processes || []);
        if (res.processes && res.processes.length > 0) {
          setProcessoId(res.processes[0].id);
        }
      } catch (err) {
        console.error('Failed to load processes', err);
      } finally {
        setLoadingProcesses(false);
      }
    };
    fetchProc();
  }, []);

  // Recalculate Enquadramento in real time
  useEffect(() => {
    if (!processoId || !valorTotal || isNaN(Number(valorTotal)) || Number(valorTotal) <= 0) {
      setEnquadramento(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCalculatingEnquadramento(true);
      try {
        const res = await api.calculateEnquadramento({
          processoId,
          valorTotal: Number(valorTotal),
          criteriosRisco: {
            assistencial: criterioAssistencial,
            regulatorioAns: criterioAns,
            financeiro: criterioFinanceiro,
            reputacional: criterioReputacional,
          },
          cpfCnpj,
          centroCusto: currentUser?.centroCusto,
        });
        setEnquadramento(res);
      } catch (e) {
        console.error('Error calculating enquadramento', e);
      } finally {
        setCalculatingEnquadramento(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    processoId,
    valorTotal,
    criterioAssistencial,
    criterioAns,
    criterioFinanceiro,
    criterioReputacional,
    cpfCnpj,
    currentUser,
  ]);

  const selectedProcess = processes.find((p) => p.id === processoId);

  const handleAddSampleDocument = (tipo: string) => {
    const docNames: Record<string, string> = {
      NOTA_FISCAL: 'NF-e_Servicos_9842.pdf',
      COTACAO_PRECOS: 'Mapa_Comparativo_3_Cotacoes.pdf',
      CONTRATO: 'Minuta_Contratual_SB_Saude.pdf',
      BOLETO_BANCARIO: 'Boleto_Bancario_Cobranca.pdf',
      CERTIDAO_REGULARIDADE: 'CND_Federal_Regularidade.pdf',
      PARECER_TECNICO: 'Justificativa_Tecnica_Assinada.pdf',
    };

    const simulatedHash = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const newDoc = {
      id: `doc-${Date.now()}`,
      tipo,
      nomeArquivo: docNames[tipo] || `Anexo_${tipo}.pdf`,
      tamanhoBytes: 340000,
      mimeType: 'application/pdf',
      url: '#',
      hashSha256: simulatedHash,
      uploadedBy: {
        id: currentUser?.id || 'usr-1',
        name: currentUser?.name || 'Solicitante',
        email: currentUser?.email || 'email@sbsaude.com.br',
      },
      uploadedAt: new Date().toISOString(),
      observacao: 'Documento comprobatório verificado e validado.',
    };

    setDocumentos((prev) => [...prev, newDoc]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!fornecedorFavorecido.trim() || !objetoDespesa.trim()) {
      setErrorMessage('Informe o Fornecedor / Favorecido e o Objeto da Despesa.');
      return;
    }

    if (!valorTotal || Number(valorTotal) <= 0) {
      setErrorMessage('Informe um valor total válido e positivo.');
      return;
    }

    if (!dataVencimento) {
      setErrorMessage('Informe a data de vencimento do pagamento.');
      return;
    }

    // Check mandatory 5 declarations
    if (!decSegregacao || !decQuatroOlhos || !decFracionamento || !decConflito || !decPrevia) {
      setErrorMessage(
        'Conformidade Obrigatória: É necessário assinalar todas as 5 Declarações de Governança e Alçadas antes do envio.'
      );
      return;
    }

    if (!justificativaTecnica || justificativaTecnica.trim().length < 10) {
      setErrorMessage('Registre uma justificativa técnica e operacional fundamentada (mínimo 10 caracteres).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        areaSolicitante: currentUser?.area,
        centroCusto: currentUser?.centroCusto,
        processoId,
        processoContratoNumero,
        fornecedorFavorecido,
        cpfCnpj,
        objetoDespesa,
        valorTotal: Number(valorTotal),
        natureza,
        formaPagamento,
        parcelamento,
        quantidadeParcelas: parcelamento ? Number(quantidadeParcelas) : undefined,
        valorParcela: parcelamento ? Number(valorTotal) / Number(quantidadeParcelas) : undefined,
        dataVencimento,
        rubricaOrcamentaria,
        previstoNoOrcamento,
        justificativaNaoPrevisto: !previstoNoOrcamento ? justificativaNaoPrevisto : undefined,
        saldoDisponivel,
        dadosBancarios: {
          banco,
          agencia,
          contaCorrente,
        },
        criteriosRisco: {
          assistencial: criterioAssistencial,
          regulatorioAns: criterioAns,
          financeiro: criterioFinanceiro,
          reputacional: criterioReputacional,
        },
        declaracaoSegregacaoFuncoes: decSegregacao,
        declaracaoRegraQuatroOlhos: decQuatroOlhos,
        declaracaoProibicaoFracionamento: decFracionamento,
        declaracaoAusenciaConflito: decConflito,
        declaracaoAprovacaoPreviaCompromisso: decPrevia,
        justificativaTecnica,
        documentos,
      };

      const res = await api.createRequest(payload);
      onSuccess(res.request);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao criar solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Form Title & Standard Header */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                FOR-FIN-01 — Formulário de Registro de Alçada e Aprovação para Pagamento
              </h2>
              <p className="text-xs text-slate-500">
                Instruído conforme a POL-DIR-01 (Política de Alçada e Delegação de Autoridade)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold">
              Rev. 0 • ISO 9001:2015
            </span>
          </div>
        </div>

        {/* User Identity Snapshot */}
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Solicitante:</span>
            <span className="font-bold text-slate-800">{currentUser?.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Cargo & Área:</span>
            <span className="text-blue-600 font-medium">{currentUser?.cargo} ({currentUser?.area})</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Centro de Custo:</span>
            <span className="font-mono text-slate-700">{currentUser?.centroCusto || 'CC-Geral'}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Process Selection & Value */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Enquadramento no Processo da POL-DIR-01
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Processo / Objeto Padronizado da Matriz *
              </label>
              <select
                value={processoId}
                onChange={(e) => setProcessoId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                {loadingProcesses ? (
                  <option>Carregando processos da matriz...</option>
                ) : (
                  processes.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))
                )}
              </select>
              {selectedProcess && (
                <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-800">{selectedProcess.description}</p>
                  <div className="flex items-center space-x-3 mt-1 text-[10px] text-slate-500">
                    <span>Natureza: <strong className="text-slate-700">{selectedProcess.natureza}</strong></span>
                    <span>Risco Base: <strong className="text-slate-700">{selectedProcess.riscoPadrao}</strong></span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número do Contrato / Processo Vinculado (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: CT-PREST-2026/042 ou PA-2026/110"
                value={processoContratoNumero}
                onChange={(e) => setProcessoContratoNumero(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Vincule ao número do contrato ou processo prévio caso aplicável.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Expense & Financial Data */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Dados do Favorecido e Especificação Financeira
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fornecedor / Favorecido *
              </label>
              <input
                type="text"
                placeholder="Razão Social ou Nome do Favorecido"
                value={fornecedorFavorecido}
                onChange={(e) => setFornecedorFavorecido(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CPF / CNPJ do Favorecido
              </label>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Objeto da Despesa / Discriminação Detalhada *
            </label>
            <textarea
              rows={2}
              placeholder="Descreva claramente o objeto, itens adquiridos ou serviço contratado..."
              value={objetoDespesa}
              onChange={(e) => setObjetoDespesa(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                <option value="BOLETO">Boleto Bancário</option>
                <option value="PIX">PIX</option>
                <option value="TED">Transferência TED / DOC</option>
                <option value="DEPOSITO_CONTA">Depósito em Conta Corrente</option>
                <option value="CARTAO_CORPORATIVO">Cartão Corporativo</option>
                <option value="GUIA_TRIBUTARIA">Guia Tributária / DARF / GPS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Mínimo de 5 dias úteis de antecedência do vencimento para conferência financeira.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Natureza da Despesa
              </label>
              <select
                value={natureza}
                onChange={(e) => setNatureza(e.target.value as 'CONTINUA' | 'EVENTUAL')}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                <option value="EVENTUAL">Eventual / Não Recorrente</option>
                <option value="CONTINUA">Contínua / Mensal Recorrente</option>
              </select>
            </div>
          </div>

          {/* Bank Info Fields */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Banco Favorecido</label>
              <input
                type="text"
                placeholder="Ex: 001 - Banco do Brasil / 341 - Itaú"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Agência</label>
              <input
                type="text"
                placeholder="Ex: 1234-5"
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Conta Corrente / Chave PIX</label>
              <input
                type="text"
                placeholder="Ex: 98765-4 ou CNPJ"
                value={contaCorrente}
                onChange={(e) => setContaCorrente(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Section 3: REAL-TIME ENQUADRAMENTO PREVIEW CARD */}
        {enquadramento && (
          <div className="p-5 rounded-xl bg-blue-50/50 border border-blue-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Motor de Alçadas — Enquadramento Automático em Tempo Real
                </h3>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-200">
                {enquadramento.matrizAlcadaCodigo} {enquadramento.matrizAlcadaVersao}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Faixa de Valor:</span>
                <span className="font-bold text-slate-800 text-sm">{enquadramento.faixaValorLabel}</span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Nível de Risco:</span>
                <span className={`font-bold text-sm ${
                  enquadramento.nivelRisco === 'ALTO'
                    ? 'text-red-600'
                    : enquadramento.nivelRisco === 'MEDIO'
                    ? 'text-amber-600'
                    : 'text-blue-600'
                }`}>
                  {enquadramento.nivelRisco}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Alçada Requerida:</span>
                <span className="font-bold text-blue-600 text-sm">{enquadramento.alcadaAplicavelLabel}</span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Limite Mensal:</span>
                <span className="font-mono text-slate-700">
                  {enquadramento.tetoMensalProcesso > 0
                    ? `R$ ${enquadramento.tetoMensalProcesso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'Sem limite mensal'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Limite Semanal/Evento:</span>
                <span className="font-mono text-slate-700">
                  {enquadramento.tetoSemanalProcesso > 0
                    ? `R$ ${enquadramento.tetoSemanalProcesso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'Sem limite semanal'}
                </span>
              </div>
            </div>

            {/* Isento Aprovação Hierárquica Alert */}
            {enquadramento.isentoAprovacaoHierarquica && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900">
                    Isento de Aprovação Hierárquica (Direto ao Financeiro)
                  </p>
                  <p className="text-[11px] mt-0.5 text-emerald-800">
                    O valor total está dentro do limite semanal/por evento permitido para este processo. A solicitação será encaminhada diretamente para a fila do Financeiro.
                  </p>
                </div>
              </div>
            )}

            {/* Split Warning Alert if any */}
            {enquadramento.analiseFracionamento?.possivelFracionamentoIdentificado && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800">
                    Alerta de Fracionamento de Despesa Detectado!
                  </p>
                  <p className="text-[11px] mt-0.5 text-red-700">
                    {enquadramento.analiseFracionamento.observacao}
                  </p>
                </div>
              </div>
            )}

            {/* Monthly Ceiling Exceeded Warning */}
            {enquadramento.tetoMensalEstourado && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">
                    Teto Mensal do Processo Excedido no Mês Atual
                  </p>
                  <p className="text-[11px] mt-0.5 text-amber-800">
                    O valor acumulado neste mês atinge R$ {(enquadramento.tetoMensalAcumuladoAtual + Number(valorTotal)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, superando o teto de R$ {enquadramento.tetoMensalProcesso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Será exigida justificativa técnica para a Diretoria.
                  </p>
                </div>
              </div>
            )}

            {/* Approvers Workflow Chain Preview */}
            {!enquadramento.isentoAprovacaoHierarquica && (
              <div className="pt-2">
                <p className="text-xs font-bold text-slate-700 mb-2">
                  Cadeia Sequencial de Aprovação Obrigatória (Segregação & Quatro Olhos):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {enquadramento.cadeiaAprovacao.map((etapa: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold">
                        <span>{idx + 1}ª Etapa</span>
                        <span className="text-blue-600 font-mono">{etapa.nivel}ª Alçada</span>
                    </div>
                    <p className="font-bold text-slate-800 mt-1 truncate">
                      {etapa.aprovadorDesignadoNome || 'Cargo Habilitado'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{etapa.cargoExigido}</p>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        )}

        {/* Section 4: Qualitative Risk Checklist */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Checklist de Risco Assistencial e Regulatório
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 cursor-pointer transition">
              <input
                type="checkbox"
                checked={criterioAssistencial}
                onChange={(e) => setCriterioAssistencial(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">Impacto Assistencial Direto</span>
                <span className="text-[11px] text-slate-500">
                  Envolve fornecimento de OPME, procedimentos cirúrgicos ou liminares judiciais.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 cursor-pointer transition">
              <input
                type="checkbox"
                checked={criterioAns}
                onChange={(e) => setCriterioAns(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">Exigência Regulatória ANS / Fiscal</span>
                <span className="text-[11px] text-slate-500">
                  Relacionado a exigências da RN ANS nº 518/2022 ou ativos garantidores.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 cursor-pointer transition">
              <input
                type="checkbox"
                checked={criterioFinanceiro}
                onChange={(e) => setCriterioFinanceiro(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">Impacto Financeiro Relevante</span>
                <span className="text-[11px] text-slate-500">
                  Despesa extraordinária ou acima da média histórica do centro de custo.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 cursor-pointer transition">
              <input
                type="checkbox"
                checked={criterioReputacional}
                onChange={(e) => setCriterioReputacional(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">Risco de Imagem / Reputacional</span>
                <span className="text-[11px] text-slate-500">
                  Potencial repercussão externa, reclamações no Procon ou órgãos de defesa.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 5: Technical Justification */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              4. Justificativa Técnica e Operacional *
            </h3>
          </div>

          <div>
            <textarea
              rows={3}
              placeholder="Explique detalhadamente a necessidade da despesa, a motivação da contratação e a conformidade com as metas da SB Saúde..."
              value={justificativaTecnica}
              onChange={(e) => setJustificativaTecnica(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Section 6: Document Attachments with SHA-256 */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                5. Anexos Comprobatórios (ISO 9001:2015 7.5)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Integridade Criptográfica SHA-256
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAddSampleDocument('NOTA_FISCAL')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
            >
              + Anexar Nota Fiscal / Fatura
            </button>
            <button
              type="button"
              onClick={() => handleAddSampleDocument('COTACAO_PRECOS')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
            >
              + Anexar 3 Cotações de Preços
            </button>
            <button
              type="button"
              onClick={() => handleAddSampleDocument('CONTRATO')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
            >
              + Anexar Contrato Assinado
            </button>
            <button
              type="button"
              onClick={() => handleAddSampleDocument('BOLETO_BANCARIO')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
            >
              + Anexar Boleto Bancário
            </button>
          </div>

          {documentos.length > 0 && (
            <div className="mt-3 space-y-2">
              {documentos.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{doc.nomeArquivo}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono border border-blue-100">
                      {doc.tipo}
                    </span>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-lg">
                      Hash SHA-256: {doc.hashSha256}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocumentos((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-700 text-xs underline font-semibold"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 7: MANDATORY 5 GOVERNANCE DECLARATIONS */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
            <Lock className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                6. Declarações Obrigatórias de Governança e Alçadas (POL-DIR-01)
              </h3>
              <p className="text-[11px] text-slate-500">
                Assinale as 5 declarações para registrar sua concordância e gerar a assinatura digital no SGQ.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={decSegregacao}
                onChange={(e) => setDecSegregacao(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                <strong className="text-slate-900">1. Segregação Estrita de Funções:</strong> Declaro que não participarei como aprovador da presente solicitação, respeitando a separação entre solicitação, autorização e desembolso.
              </span>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={decQuatroOlhos}
                onChange={(e) => setDecQuatroOlhos(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                <strong className="text-slate-900">2. Regra dos Quatro Olhos:</strong> Tenho ciência de que solicitações de 2ª, 3ª e 4ª alçadas requerem a aprovação cumulativa e independente de diferentes autoridades.
              </span>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={decFracionamento}
                onChange={(e) => setDecFracionamento(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                <strong className="text-slate-900">3. Proibição Expressa de Fracionamento:</strong> Declaro sob responsabilidade funcional que esta despesa não decorre de fracionamento artificial de compra ou contrato visando contornar os limites da POL-DIR-01.
              </span>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={decConflito}
                onChange={(e) => setDecConflito(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                <strong className="text-slate-900">4. Ausência de Conflito de Interesses:</strong> Declaro não possuir qualquer vínculo societário, familiar ou de parentesco direto com o fornecedor favorecido indicado.
              </span>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={decPrevia}
                onChange={(e) => setDecPrevia(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                <strong className="text-slate-900">5. Aprovação Prévia ao Compromisso:</strong> Confirmo que nenhum compromisso financeiro formal ou informal foi assumido antes da autorização competente das alçadas designadas.
              </span>
            </label>
          </div>
        </div>

        {/* Submit & Cancel Footer Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-2 disabled:opacity-50"
          >
            {submitting ? (
              <span>Gravando e Enquadrando...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submeter Solicitação FOR-FIN-01</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
