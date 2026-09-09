import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Solicitacao } from '../types';
import {
  ClipboardCheck,
  Landmark,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  HelpCircle,
  FileCheck,
  Building,
  ShieldAlert,
  Search,
  Check,
  XCircle,
  Calendar,
  Layers,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';

interface FinancialTreasuryViewProps {
  requests: Solicitacao[];
  onOpenRequest: (request: Solicitacao) => void;
  onRefresh: () => void;
  initialSubTab?: 'CONFERENCE' | 'TREASURY';
}

export const FinancialTreasuryView: React.FC<FinancialTreasuryViewProps> = ({
  requests,
  onOpenRequest,
  onRefresh,
  initialSubTab = 'CONFERENCE',
}) => {
  const { currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'CONFERENCE' | 'TREASURY'>(initialSubTab);

  // Sync if initialSubTab changes from external navigation (e.g. notifications)
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Queues & Counters
  const conferenceQueue = requests.filter(
    (r) =>
      r.status === 'AGUARDANDO_FINANCEIRO' ||
      r.status === 'EM_CONFERENCIA_FINANCEIRA' ||
      r.status === 'LIBERADA_PAGAMENTO'
  );

  const pendingConferenceCount = requests.filter(
    (r) => r.status === 'AGUARDANDO_FINANCEIRO' || r.status === 'EM_CONFERENCIA_FINANCEIRA'
  ).length;

  const treasuryQueue = requests.filter(
    (r) => r.status === 'LIBERADA_PAGAMENTO' || r.status === 'PAGAMENTO_EFETUADO'
  );

  const pendingTreasuryCount = requests.filter(
    (r) => r.status === 'LIBERADA_PAGAMENTO'
  ).length;

  const paidCount = requests.filter(
    (r) => r.status === 'PAGAMENTO_EFETUADO'
  ).length;

  const totalPaidAmount = requests
    .filter((r) => r.status === 'PAGAMENTO_EFETUADO')
    .reduce((acc, curr) => acc + (curr.conferenciaFinanceira?.valorLiquido || curr.valorTotal || 0), 0);

  // ==========================================
  // STATE: CONFERÊNCIA FINANCEIRA (TAB 1)
  // ==========================================
  const [selectedConfReq, setSelectedConfReq] = useState<Solicitacao | null>(null);
  const [confSearch, setConfSearch] = useState<string>('');
  const [confFilterStatus, setConfFilterStatus] = useState<'ALL' | 'PENDING' | 'RELEASED'>('ALL');

  // Checklist State
  const [nfFaturaConferida, setNfFaturaConferida] = useState<boolean>(true);
  const [contratoConferido, setContratoConferido] = useState<boolean>(true);
  const [cotacoesConferidas, setCotacoesConferidas] = useState<boolean>(true);
  const [boletoConferido, setBoletoConferido] = useState<boolean>(true);
  const [certidoesConferidas, setCertidoesConferidas] = useState<boolean>(true);

  // Withholdings State
  const [retencaoISS, setRetencaoISS] = useState<boolean>(false);
  const [retencaoINSS, setRetencaoINSS] = useState<boolean>(false);
  const [retencaoIRRF, setRetencaoIRRF] = useState<boolean>(false);
  const [retencaoPIS_COFINS_CSLL, setRetencaoPIS_COFINS_CSLL] = useState<boolean>(false);
  const [retencaoNaoAplicavel, setRetencaoNaoAplicavel] = useState<boolean>(true);
  const [valorRetencoes, setValorRetencoes] = useState<string>('0');

  // Decision & Notes
  const [pendenciasObservacoes, setPendenciasObservacoes] = useState<string>('');
  const [confSubmitting, setConfSubmitting] = useState<boolean>(false);
  const [confMessage, setConfMessage] = useState<string | null>(null);

  const handleSelectConfReq = (r: Solicitacao) => {
    setSelectedConfReq(r);
    const conf = r.conferenciaFinanceira;
    if (conf) {
      setNfFaturaConferida(conf.nfFaturaConferida);
      setContratoConferido(conf.contratoConferido);
      setCotacoesConferidas(conf.cotacoesConferidas);
      setBoletoConferido(conf.boletoConferido);
      setCertidoesConferidas(conf.certidoesConferidas);
      setRetencaoISS(conf.retencaoISS);
      setRetencaoINSS(conf.retencaoINSS);
      setRetencaoIRRF(conf.retencaoIRRF);
      setRetencaoPIS_COFINS_CSLL(conf.retencaoPIS_COFINS_CSLL);
      setRetencaoNaoAplicavel(conf.retencaoNaoAplicavel);
      setValorRetencoes(String(conf.valorRetencoes || 0));
      setPendenciasObservacoes(conf.pendenciasObservacoes || '');
    } else {
      setNfFaturaConferida(true);
      setContratoConferido(true);
      setCotacoesConferidas(true);
      setBoletoConferido(true);
      setCertidoesConferidas(true);
      setRetencaoNaoAplicavel(true);
      setValorRetencoes('0');
      setPendenciasObservacoes('');
    }
  };

  const handleProcessConference = async (decisao: 'LIBERADO_PAGAMENTO' | 'DEVOLVIDO_AREA') => {
    if (!selectedConfReq) return;

    if (decisao === 'DEVOLVIDO_AREA' && (!pendenciasObservacoes || pendenciasObservacoes.trim().length < 5)) {
      alert('Por favor, detalhe as pendências para devolução à área solicitante.');
      return;
    }

    setConfSubmitting(true);
    try {
      await api.submitFinanceConference(selectedConfReq.id, {
        nfFaturaConferida,
        contratoConferido,
        cotacoesConferidas,
        boletoConferido,
        certidoesConferidas,
        retencaoISS,
        retencaoINSS,
        retencaoIRRF,
        retencaoPIS_COFINS_CSLL,
        retencaoNaoAplicavel,
        valorRetencoes: Number(valorRetencoes || 0),
        decisao,
        pendenciasObservacoes,
      });

      setConfMessage(
        decisao === 'LIBERADO_PAGAMENTO'
          ? 'Solicitação conferida com sucesso e liberada para pagamento pela Tesouraria!'
          : 'Solicitação devolvida à área com pendências registradas.'
      );
      setSelectedConfReq(null);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Erro ao processar conferência');
    } finally {
      setConfSubmitting(false);
    }
  };

  // ==========================================
  // STATE: TESOURARIA & PAGAMENTOS (TAB 2)
  // ==========================================
  const [selectedTreasuryReq, setSelectedTreasuryReq] = useState<Solicitacao | null>(null);
  const [treasurySearch, setTreasurySearch] = useState<string>('');
  const [treasuryFilterStatus, setTreasuryFilterStatus] = useState<'ALL' | 'RELEASED' | 'PAID'>('ALL');

  const [dataPagamento, setDataPagamento] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [bancoUtilizado, setBancoUtilizado] = useState<string>('001 - Banco do Brasil S.A.');
  const [agenciaUtilizada, setAgenciaUtilizada] = useState<string>('1234-5');
  const [contaUtilizada, setContaUtilizada] = useState<string>('98765-4 (Conta Movimento)');
  const [formaEfetivaPagamento, setFormaEfetivaPagamento] = useState<string>('PIX');
  const [numeroComprovante, setNumeroComprovante] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [treasurySubmitting, setTreasurySubmitting] = useState<boolean>(false);
  const [treasuryErrorMessage, setTreasuryErrorMessage] = useState<string | null>(null);
  const [treasurySuccessMessage, setTreasurySuccessMessage] = useState<string | null>(null);

  const handleSelectTreasuryReq = (r: Solicitacao) => {
    setSelectedTreasuryReq(r);
    setTreasuryErrorMessage(null);
    setFormaEfetivaPagamento(r.formaPagamento || 'BOLETO');
    setNumeroComprovante(
      r.registroPagamento?.numeroComprovante ||
        `AUT-${Math.floor(10000000 + Math.random() * 90000000)}`
    );
  };

  const handleExecutePayment = async () => {
    if (!selectedTreasuryReq) return;
    setTreasuryErrorMessage(null);

    // Segregation check
    if (selectedTreasuryReq.solicitanteId === currentUser?.id) {
      setTreasuryErrorMessage(
        'Violação de Segregação de Funções: O usuário solicitante não pode liquidar a própria solicitação na Tesouraria.'
      );
      return;
    }

    const alreadyApprovedByMe = selectedTreasuryReq.cadeiaAprovacao?.some(
      (e) => e.aprovadorRealId === currentUser?.id
    );
    if (alreadyApprovedByMe) {
      setTreasuryErrorMessage(
        'Violação de Segregação de Funções: O usuário que aprovou esta solicitação em qualquer alçada não pode executar o pagamento.'
      );
      return;
    }

    if (!numeroComprovante || !dataPagamento) {
      setTreasuryErrorMessage('Informe a data do pagamento e o comprovante bancário.');
      return;
    }

    setTreasurySubmitting(true);
    try {
      await api.submitTreasuryPayment(selectedTreasuryReq.id, {
        dataPagamento,
        bancoUtilizado,
        agenciaUtilizada,
        contaUtilizada,
        formaEfetivaPagamento,
        numeroComprovante,
        observacoes,
      });

      setTreasurySuccessMessage(
        `Pagamento da solicitação ${selectedTreasuryReq.numero} liquidado com sucesso pela Tesouraria!`
      );
      setSelectedTreasuryReq(null);
      onRefresh();
    } catch (err: any) {
      setTreasuryErrorMessage(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setTreasurySubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  // Filtered lists
  const filteredConferenceList = conferenceQueue.filter((r) => {
    const matchesSearch =
      confSearch === '' ||
      r.numero.toLowerCase().includes(confSearch.toLowerCase()) ||
      r.fornecedorFavorecido.toLowerCase().includes(confSearch.toLowerCase()) ||
      (r.centroCusto || '').toLowerCase().includes(confSearch.toLowerCase()) ||
      r.objetoDespesa.toLowerCase().includes(confSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (confFilterStatus === 'PENDING') {
      return r.status === 'AGUARDANDO_FINANCEIRO' || r.status === 'EM_CONFERENCIA_FINANCEIRA';
    }
    if (confFilterStatus === 'RELEASED') {
      return r.status === 'LIBERADA_PAGAMENTO';
    }
    return true;
  });

  const filteredTreasuryList = treasuryQueue.filter((r) => {
    const matchesSearch =
      treasurySearch === '' ||
      r.numero.toLowerCase().includes(treasurySearch.toLowerCase()) ||
      r.fornecedorFavorecido.toLowerCase().includes(treasurySearch.toLowerCase()) ||
      (r.centroCusto || '').toLowerCase().includes(treasurySearch.toLowerCase()) ||
      r.objetoDespesa.toLowerCase().includes(treasurySearch.toLowerCase());

    if (!matchesSearch) return false;

    if (treasuryFilterStatus === 'RELEASED') {
      return r.status === 'LIBERADA_PAGAMENTO';
    }
    if (treasuryFilterStatus === 'PAID') {
      return r.status === 'PAGAMENTO_EFETUADO';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. UNIFIED MODULE HEADER & KPI COUNTERS */}
      {/* ======================================================== */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/10">
              <Landmark className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Financeiro & Tesouraria
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  FOR-FIN-01 Item 7
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
                Conferência fiscal, retenções tributárias e liquidação bancária de pagamentos com estrita segregação de funções e quatro olhos.
              </p>
            </div>
          </div>

          {/* Sub-Tab Navigation Segment */}
          <div className="flex items-center p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start md:self-auto">
            <button
              onClick={() => setActiveSubTab('CONFERENCE')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'CONFERENCE'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <ClipboardCheck className={`w-4 h-4 ${activeSubTab === 'CONFERENCE' ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>Conferência Financeira</span>
              {pendingConferenceCount > 0 && (
                <span className="bg-amber-500 text-[10px] text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                  {pendingConferenceCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('TREASURY')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'TREASURY'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Landmark className={`w-4 h-4 ${activeSubTab === 'TREASURY' ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>Tesouraria & Pagamentos</span>
              {pendingTreasuryCount > 0 && (
                <span className="bg-emerald-500 text-[10px] text-white font-bold px-1.5 py-0.2 rounded-full">
                  {pendingTreasuryCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Operational Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div
            onClick={() => { setActiveSubTab('CONFERENCE'); setConfFilterStatus('PENDING'); }}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              activeSubTab === 'CONFERENCE' && confFilterStatus === 'PENDING'
                ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 ring-1 ring-amber-300/50 dark:ring-amber-700/50'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:bg-amber-50/30 dark:hover:bg-amber-950/20'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Pendente Conferência</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-lg font-black text-amber-600 dark:text-amber-400">{pendingConferenceCount}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">solicitações</span>
            </div>
          </div>

          <div
            onClick={() => { setActiveSubTab('TREASURY'); setTreasuryFilterStatus('RELEASED'); }}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              activeSubTab === 'TREASURY' && treasuryFilterStatus === 'RELEASED'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-300/50 dark:ring-emerald-700/50'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Prontas p/ Pagamento</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{pendingTreasuryCount}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">liberadas</span>
            </div>
          </div>

          <div
            onClick={() => { setActiveSubTab('TREASURY'); setTreasuryFilterStatus('PAID'); }}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              activeSubTab === 'TREASURY' && treasuryFilterStatus === 'PAID'
                ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 ring-1 ring-blue-300/50 dark:ring-blue-700/50'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Pagamentos Efetuados</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{paidCount}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">liquidados</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Volume Liquidado</span>
            <div className="flex items-baseline space-x-1 mt-1">
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                {formatCurrency(totalPaidAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SUB-TAB 1: CONFERÊNCIA FINANCEIRA */}
      {/* ======================================================== */}
      {activeSubTab === 'CONFERENCE' && (
        <div className="space-y-6">
          {confMessage && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-200 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{confMessage}</span>
              </div>
              <button onClick={() => setConfMessage(null)} className="underline text-xs font-bold text-blue-900 dark:text-blue-300 cursor-pointer">
                Fechar
              </button>
            </div>
          )}

          {/* Grid: Pending Queue List & Active Conference Workstation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Requests in Finance Queue (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Fila de Conferência ({filteredConferenceList.length})
                </h3>
                <div className="flex items-center space-x-1 text-[11px]">
                  <button
                    onClick={() => setConfFilterStatus('ALL')}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                      confFilterStatus === 'ALL'
                        ? 'bg-slate-800 dark:bg-slate-700 text-white font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setConfFilterStatus('PENDING')}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                      confFilterStatus === 'PENDING'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Pendentes
                  </button>
                  <button
                    onClick={() => setConfFilterStatus('RELEASED')}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                      confFilterStatus === 'RELEASED'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Liberadas
                  </button>
                </div>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Filtrar por número, favorecido ou CC..."
                  value={confSearch}
                  onChange={(e) => setConfSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {filteredConferenceList.length === 0 ? (
                  <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                    Nenhuma solicitação encontrada na fila de conferência com os filtros atuais.
                  </div>
                ) : (
                  filteredConferenceList.map((r) => {
                    const isSelected = selectedConfReq?.id === r.id;
                    const isLiberada = r.status === 'LIBERADA_PAGAMENTO';
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSelectConfReq(r)}
                        className={`p-4 rounded-xl border text-xs cursor-pointer transition shadow-sm ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20'
                            : isLiberada
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{r.numero}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLiberada
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {isLiberada ? 'LIBERADA' : 'AGUARDANDO CONFERÊNCIA'}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">{r.fornecedorFavorecido}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{r.objetoDespesa}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(r.valorTotal)}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Venc: {new Date(r.dataVencimento).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Conference Checklist Station (7 cols) */}
            <div className="lg:col-span-7">
              {selectedConfReq ? (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>Conferência de Documentos & Retenções — {selectedConfReq.numero}</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Favorecido: <strong className="text-slate-800 dark:text-slate-200">{selectedConfReq.fornecedorFavorecido}</strong> ({selectedConfReq.cpfCnpj || '—'})
                      </p>
                    </div>
                    <button
                      onClick={() => onOpenRequest(selectedConfReq)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold underline cursor-pointer"
                    >
                      Ver FOR-FIN-01 Completo
                    </button>
                  </div>

                  {/* 5-point Checklist */}
                  <div className="space-y-3 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>1. Checklist de Documentação Obrigatória (Item 7.1)</span>
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={nfFaturaConferida}
                          onChange={(e) => setNfFaturaConferida(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Nota Fiscal / Fatura / Recibo</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={contratoConferido}
                          onChange={(e) => setContratoConferido(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Contrato / Aditivo Vinculado</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={cotacoesConferidas}
                          onChange={(e) => setCotacoesConferidas(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">3 Cotações de Mercado (se aplicável)</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={boletoConferido}
                          onChange={(e) => setBoletoConferido(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Boleto / Chave PIX Conferida</span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer select-none sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={certidoesConferidas}
                          onChange={(e) => setCertidoesConferidas(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Certidões Negativas Fiscais / Regularidade</span>
                      </label>
                    </div>
                  </div>

                  {/* Withholding section */}
                  <div className="space-y-3 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                      <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>2. Retenções Tributárias na Fonte (Item 7.1)</span>
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={retencaoISS}
                            onChange={(e) => {
                              setRetencaoISS(e.target.checked);
                              if (e.target.checked) setRetencaoNaoAplicavel(false);
                            }}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span className="text-slate-700 dark:text-slate-300">ISS</span>
                        </label>

                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={retencaoINSS}
                            onChange={(e) => {
                              setRetencaoINSS(e.target.checked);
                              if (e.target.checked) setRetencaoNaoAplicavel(false);
                            }}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span className="text-slate-700 dark:text-slate-300">INSS</span>
                        </label>

                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={retencaoIRRF}
                            onChange={(e) => {
                              setRetencaoIRRF(e.target.checked);
                              if (e.target.checked) setRetencaoNaoAplicavel(false);
                            }}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span className="text-slate-700 dark:text-slate-300">IRRF</span>
                        </label>

                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={retencaoPIS_COFINS_CSLL}
                            onChange={(e) => {
                              setRetencaoPIS_COFINS_CSLL(e.target.checked);
                              if (e.target.checked) setRetencaoNaoAplicavel(false);
                            }}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span className="text-slate-700 dark:text-slate-300">PIS/COFINS/CSLL</span>
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={retencaoNaoAplicavel}
                            onChange={(e) => {
                              setRetencaoNaoAplicavel(e.target.checked);
                              if (e.target.checked) {
                                setRetencaoISS(false);
                                setRetencaoINSS(false);
                                setRetencaoIRRF(false);
                                setRetencaoPIS_COFINS_CSLL(false);
                                setValorRetencoes('0');
                              }
                            }}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Não se aplicam retenções (Simples / Isenção)</span>
                        </label>

                        <div className="flex items-center space-x-2">
                          <span className="text-slate-600 dark:text-slate-400 font-semibold">Valor Retenções (R$):</span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={retencaoNaoAplicavel}
                            value={valorRetencoes}
                            onChange={(e) => setValorRetencoes(e.target.value)}
                            className="w-28 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono text-right focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Calculation Preview */}
                      <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Valor Bruto: <strong>{formatCurrency(selectedConfReq.valorTotal)}</strong></span>
                        <span className="text-amber-700 dark:text-amber-400">Retenções: <strong>-{formatCurrency(Number(valorRetencoes || 0))}</strong></span>
                        <span className="text-blue-900 dark:text-blue-300 font-bold">Líquido a Pagar: {formatCurrency(selectedConfReq.valorTotal - Number(valorRetencoes || 0))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Observations */}
                  <div className="space-y-1.5 text-xs">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Observações / Justificativa de Pendências:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Detalhes ou pendências para a área solicitante..."
                      value={pendenciasObservacoes}
                      onChange={(e) => setPendenciasObservacoes(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Decision Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={confSubmitting}
                      onClick={() => handleProcessConference('DEVOLVIDO_AREA')}
                      className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Devolver com Pendências</span>
                    </button>

                    <button
                      type="button"
                      disabled={confSubmitting}
                      onClick={() => handleProcessConference('LIBERADO_PAGAMENTO')}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-200 dark:shadow-none cursor-pointer flex items-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Conferir e Liberar para Tesouraria</span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center min-h-[360px] shadow-sm">
                  <ClipboardCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">Nenhuma solicitação selecionada</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    Selecione uma solicitação da fila à esquerda para realizar o checklist fiscal, cálculo de retenções e liberação para a Tesouraria.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SUB-TAB 2: TESOURARIA & PAGAMENTOS */}
      {/* ======================================================== */}
      {activeSubTab === 'TREASURY' && (
        <div className="space-y-6">
          {treasurySuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{treasurySuccessMessage}</span>
              </div>
              <button onClick={() => setTreasurySuccessMessage(null)} className="underline text-xs font-bold text-emerald-900 dark:text-emerald-300 cursor-pointer">
                Fechar
              </button>
            </div>
          )}

          {/* Grid: Treasury Queue & Settlement Station */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Treasury Queue (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Fila da Tesouraria ({filteredTreasuryList.length})
                </h3>
                <div className="flex items-center space-x-1 text-[11px]">
                  <button
                    onClick={() => setTreasuryFilterStatus('ALL')}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                      treasuryFilterStatus === 'ALL'
                        ? 'bg-slate-800 dark:bg-slate-700 text-white font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setTreasuryFilterStatus('RELEASED')}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                      treasuryFilterStatus === 'RELEASED'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    A Pagar
                  </button>
                  <button
                    onClick={() => setTreasuryFilterStatus('PAID')}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                      treasuryFilterStatus === 'PAID'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Pagas
                  </button>
                </div>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Filtrar por número, favorecido ou comprovante..."
                  value={treasurySearch}
                  onChange={(e) => setTreasurySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {filteredTreasuryList.length === 0 ? (
                  <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                    Nenhuma solicitação encontrada na fila da Tesouraria com os filtros atuais.
                  </div>
                ) : (
                  filteredTreasuryList.map((r) => {
                    const isSelected = selectedTreasuryReq?.id === r.id;
                    const isPago = r.status === 'PAGAMENTO_EFETUADO';
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleSelectTreasuryReq(r)}
                        className={`p-4 rounded-xl border text-xs cursor-pointer transition shadow-sm ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20'
                            : isPago
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{r.numero}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPago
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          }`}>
                            {isPago ? 'LIQUIDADO / PAGO' : 'LIBERADA P/ PAGAMENTO'}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">{r.fornecedorFavorecido}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{r.objetoDespesa}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            Líquido: {formatCurrency(r.conferenciaFinanceira?.valorLiquido || r.valorTotal)}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Venc: {new Date(r.dataVencimento).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Execution Form (7 cols) */}
            <div className="lg:col-span-7">
              {selectedTreasuryReq ? (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Registro de Liquidação Bancária — {selectedTreasuryReq.numero}</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Favorecido: <strong className="text-slate-800 dark:text-slate-200">{selectedTreasuryReq.fornecedorFavorecido}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => onOpenRequest(selectedTreasuryReq)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold underline cursor-pointer"
                    >
                      Ver FOR-FIN-01
                    </button>
                  </div>

                  {treasuryErrorMessage && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2 shadow-sm">
                      <ShieldAlert className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
                      <span>{treasuryErrorMessage}</span>
                    </div>
                  )}

                  {/* Settlement summary */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Valor Bruto:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                        {formatCurrency(selectedTreasuryReq.valorTotal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Retenções Tributárias:</span>
                      <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">
                        {formatCurrency(selectedTreasuryReq.conferenciaFinanceira?.valorRetencoes || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Valor Líquido Desembolsado:</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-sm">
                        {formatCurrency(selectedTreasuryReq.conferenciaFinanceira?.valorLiquido || selectedTreasuryReq.valorTotal)}
                      </span>
                    </div>
                  </div>

                  {selectedTreasuryReq.status === 'PAGAMENTO_EFETUADO' ? (
                    <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-2.5">
                      <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span>Pagamento Liquidado e Comprovante Arquivado</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/50 text-xs">
                        <p>Autenticação / Comprovante: <strong className="font-mono text-slate-900 dark:text-slate-100">{selectedTreasuryReq.registroPagamento?.numeroComprovante}</strong></p>
                        <p>Data do Pagamento: <strong className="text-slate-900 dark:text-slate-100">{selectedTreasuryReq.registroPagamento?.dataPagamento}</strong></p>
                        <p>Forma Efetiva: <strong className="text-slate-900 dark:text-slate-100">{selectedTreasuryReq.registroPagamento?.formaEfetivaPagamento}</strong></p>
                        <p>Responsável Tesouraria: <strong className="text-slate-900 dark:text-slate-100">{selectedTreasuryReq.registroPagamento?.responsavelTesourariaNome}</strong></p>
                        <p className="sm:col-span-2">Banco/Conta: <strong className="text-slate-900 dark:text-slate-100">{selectedTreasuryReq.registroPagamento?.bancoUtilizado} - Conta: {selectedTreasuryReq.registroPagamento?.contaUtilizada}</strong></p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Data do Pagamento Efetivo *
                          </label>
                          <input
                            type="date"
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Forma Efetiva de Pagamento
                          </label>
                          <select
                            value={formaEfetivaPagamento}
                            onChange={(e) => setFormaEfetivaPagamento(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                          >
                            <option value="BOLETO">Boleto Bancário</option>
                            <option value="PIX">PIX</option>
                            <option value="TED">TED</option>
                            <option value="DEPOSITO_CONTA">Depósito em Conta</option>
                            <option value="GUIA_TRIBUTARIA">Guia Tributária</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Banco e Conta de Origem (SB Saúde)
                          </label>
                          <input
                            type="text"
                            value={bancoUtilizado}
                            onChange={(e) => setBancoUtilizado(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Autenticação Bancária / Número do Comprovante *
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: AUT-98421893 ou TXID PIX"
                            value={numeroComprovante}
                            onChange={(e) => setNumeroComprovante(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Observações da Liquidação
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Observações complementares da tesouraria..."
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          disabled={treasurySubmitting}
                          onClick={handleExecutePayment}
                          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 dark:shadow-none transition flex items-center space-x-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmar Liquidação e Concluir Pagamento</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center min-h-[360px] shadow-sm">
                  <Landmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">Nenhuma solicitação selecionada</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    Selecione uma solicitação liberada ao lado para efetuar a liquidação financeira, registro de autenticação bancária e baixa contábil.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
