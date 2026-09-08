import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Solicitacao } from '../types';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  HelpCircle,
} from 'lucide-react';

interface FinancialConferenceViewProps {
  requests: Solicitacao[];
  onOpenRequest: (request: Solicitacao) => void;
  onRefresh: () => void;
}

export const FinancialConferenceView: React.FC<FinancialConferenceViewProps> = ({
  requests,
  onOpenRequest,
  onRefresh,
}) => {
  const { currentUser } = useAuth();

  // Requests in finance queue
  const financeQueue = requests.filter(
    (r) =>
      r.status === 'AGUARDANDO_FINANCEIRO' ||
      r.status === 'EM_CONFERENCIA_FINANCEIRA' ||
      r.status === 'LIBERADA_PAGAMENTO'
  );

  const [selectedReq, setSelectedReq] = useState<Solicitacao | null>(null);

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
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSelectReq = (r: Solicitacao) => {
    setSelectedReq(r);
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
    if (!selectedReq) return;

    if (decisao === 'DEVOLVIDO_AREA' && (!pendenciasObservacoes || pendenciasObservacoes.trim().length < 5)) {
      alert('Por favor, detalhe as pendências para devolução à área solicitante.');
      return;
    }

    setSubmitting(true);
    try {
      await api.submitFinanceConference(selectedReq.id, {
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

      setMessage(
        decisao === 'LIBERADO_PAGAMENTO'
          ? 'Solicitação conferida com sucesso e liberada para pagamento pela Tesouraria!'
          : 'Solicitação devolvida à área com pendências registradas.'
      );
      setSelectedReq(null);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Erro ao processar conferência');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Setor Financeiro — Conferência e Retenções Tributárias
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Checklist obrigatório de documentos fiscais, cálculo de retenções (ISS/INSS/IRRF/PIS-COFINS) e liberação para a Tesouraria.
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <span className="font-bold text-blue-600 text-sm block">
              {financeQueue.filter((r) => r.status === 'AGUARDANDO_FINANCEIRO').length}
            </span>
            <span>Aguardando Conferência</span>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="underline text-xs font-bold">
            Fechar
          </button>
        </div>
      )}

      {/* Grid: Pending Queue List & Active Conference Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Requests in Finance Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            Fila do Financeiro ({financeQueue.length})
          </h3>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {financeQueue.length === 0 ? (
              <div className="p-8 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-500 shadow-sm">
                Nenhuma solicitação na fila do Financeiro.
              </div>
            ) : (
              financeQueue.map((r) => {
                const isSelected = selectedReq?.id === r.id;
                const isLiberada = r.status === 'LIBERADA_PAGAMENTO';
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectReq(r)}
                    className={`p-4 rounded-xl border text-xs cursor-pointer transition shadow-sm ${
                      isSelected
                        ? 'bg-blue-50/60 border-blue-500'
                        : isLiberada
                        ? 'bg-white border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-600">{r.numero}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isLiberada ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {isLiberada ? 'LIBERADA' : 'AGUARDANDO CONFERÊNCIA'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 mt-1 truncate">{r.fornecedorFavorecido}</p>
                    <p className="text-[11px] text-slate-500 truncate">{r.objetoDespesa}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(r.valorTotal)}
                      </span>
                      <span className="text-slate-500">
                        Vencimento: {new Date(r.dataVencimento).toLocaleDateString('pt-BR')}
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
          {selectedReq ? (
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <span>Conferência de Documentos — {selectedReq.numero}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Favorecido: <strong className="text-slate-800">{selectedReq.fornecedorFavorecido}</strong>
                  </p>
                </div>
                <button
                  onClick={() => onOpenRequest(selectedReq)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold underline"
                >
                  Ver Solicitação Completa
                </button>
              </div>

              {/* 5-point Checklist */}
              <div className="space-y-2.5 text-xs">
                <p className="font-bold text-slate-700">1. Checklist de Documentação Obrigatória:</p>
                
                <label className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={nfFaturaConferida}
                    onChange={(e) => setNfFaturaConferida(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-800">Nota Fiscal / Fatura original conferida com dados da SB Saúde</span>
                </label>

                <label className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={contratoConferido}
                    onChange={(e) => setContratoConferido(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-800">Contrato / Aditivo vigente verificado e adimplente</span>
                </label>

                <label className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={cotacoesConferidas}
                    onChange={(e) => setCotacoesConferidas(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-800">Mapa comparativo com no mínimo 3 cotações de preços</span>
                </label>

                <label className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={boletoConferido}
                    onChange={(e) => setBoletoConferido(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-800">Boleto bancário legível com código de barras e valor conferido</span>
                </label>

                <label className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={certidoesConferidas}
                    onChange={(e) => setCertidoesConferidas(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-800">Certidões de regularidade fiscal (CND Federal, FGTS e CNDT)</span>
                </label>
              </div>

              {/* Tax Withholdings Section */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <p className="font-bold text-slate-800">2. Retenções Tributárias na Fonte:</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="flex items-center space-x-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={retencaoISS}
                      onChange={(e) => {
                        setRetencaoISS(e.target.checked);
                        if (e.target.checked) setRetencaoNaoAplicavel(false);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>ISS (2% a 5%)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={retencaoINSS}
                      onChange={(e) => {
                        setRetencaoINSS(e.target.checked);
                        if (e.target.checked) setRetencaoNaoAplicavel(false);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>INSS (11%)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={retencaoIRRF}
                      onChange={(e) => {
                        setRetencaoIRRF(e.target.checked);
                        if (e.target.checked) setRetencaoNaoAplicavel(false);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>IRRF (1,5%)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={retencaoPIS_COFINS_CSLL}
                      onChange={(e) => {
                        setRetencaoPIS_COFINS_CSLL(e.target.checked);
                        if (e.target.checked) setRetencaoNaoAplicavel(false);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>CSRF (4,65%)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Valor Bruto da Despesa:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(selectedReq.valorTotal)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Total Retenções (R$):</span>
                    <input
                      type="number"
                      step="0.01"
                      value={valorRetencoes}
                      onChange={(e) => setValorRetencoes(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Valor Líquido a Pagar:</span>
                    <span className="font-mono font-bold text-blue-600 text-sm">
                      {formatCurrency(selectedReq.valorTotal - Number(valorRetencoes || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes / Pendencies */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações da Conferência / Descrição de Pendências:
                </label>
                <textarea
                  rows={2}
                  placeholder="Registre observações técnicas ou pendências constatadas..."
                  value={pendenciasObservacoes}
                  onChange={(e) => setPendenciasObservacoes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              {/* Decision Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleProcessConference('DEVOLVIDO_AREA')}
                  className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition"
                >
                  Devolver à Área com Pendência
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleProcessConference('LIBERADO_PAGAMENTO')}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Liberar para Pagamento (Tesouraria)</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="p-12 rounded-xl bg-white border border-slate-200 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-full shadow-sm">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">Nenhuma solicitação selecionada</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Selecione uma solicitação na lista ao lado para realizar a conferência documental e tributária.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
