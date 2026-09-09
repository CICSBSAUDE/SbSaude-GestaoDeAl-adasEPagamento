import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Solicitacao } from '../types';
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Building,
  DollarSign,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface TreasuryViewProps {
  requests: Solicitacao[];
  onOpenRequest: (request: Solicitacao) => void;
  onRefresh: () => void;
}

export const TreasuryView: React.FC<TreasuryViewProps> = ({
  requests,
  onOpenRequest,
  onRefresh,
}) => {
  const { currentUser } = useAuth();

  const treasuryQueue = requests.filter(
    (r) => r.status === 'LIBERADA_PAGAMENTO' || r.status === 'PAGAMENTO_EFETUADO'
  );

  const [selectedReq, setSelectedReq] = useState<Solicitacao | null>(null);
  const [dataPagamento, setDataPagamento] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [bancoUtilizado, setBancoUtilizado] = useState<string>('001 - Banco do Brasil S.A.');
  const [agenciaUtilizada, setAgenciaUtilizada] = useState<string>('1234-5');
  const [contaUtilizada, setContaUtilizada] = useState<string>('98765-4 (Conta Movimento)');
  const [formaEfetivaPagamento, setFormaEfetivaPagamento] = useState<string>('PIX');
  const [numeroComprovante, setNumeroComprovante] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSelect = (r: Solicitacao) => {
    setSelectedReq(r);
    setErrorMessage(null);
    setFormaEfetivaPagamento(r.formaPagamento || 'BOLETO');
    setNumeroComprovante(
      r.registroPagamento?.numeroComprovante ||
        `AUT-${Math.floor(10000000 + Math.random() * 90000000)}`
    );
  };

  const handleExecutePayment = async () => {
    if (!selectedReq) return;
    setErrorMessage(null);

    // Segregation check
    if (selectedReq.solicitanteId === currentUser?.id) {
      setErrorMessage(
        'Violação de Segregação de Funções: O usuário solicitante não pode liquidar a própria solicitação na Tesouraria.'
      );
      return;
    }

    const alreadyApprovedByMe = selectedReq.cadeiaAprovacao?.some(
      (e) => e.aprovadorRealId === currentUser?.id
    );
    if (alreadyApprovedByMe) {
      setErrorMessage(
        'Violação de Segregação de Funções: O usuário que aprovou esta solicitação em qualquer alçada não pode executar o pagamento.'
      );
      return;
    }

    if (!numeroComprovante || !dataPagamento) {
      setErrorMessage('Informe a data do pagamento e o comprovante bancário.');
      return;
    }

    setSubmitting(true);
    try {
      await api.submitTreasuryPayment(selectedReq.id, {
        dataPagamento,
        bancoUtilizado,
        agenciaUtilizada,
        contaUtilizada,
        formaEfetivaPagamento,
        numeroComprovante,
        observacoes,
      });

      setSuccessMessage(
        `Pagamento da solicitação ${selectedReq.numero} liquidado com sucesso pela Tesouraria!`
      );
      setSelectedReq(null);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao registrar pagamento.');
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
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                Módulo de Tesouraria — Liquidação e Registro de Pagamento
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Execução financeira e baixa de pagamentos devidamente autorizados e conferidos (FOR-FIN-01 Item 7.2).
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm block">
              {treasuryQueue.filter((r) => r.status === 'LIBERADA_PAGAMENTO').length}
            </span>
            <span>Prontas para Liquidação</span>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="underline text-xs font-bold">
            Fechar
          </button>
        </div>
      )}

      {/* Grid: Queue & Settlement Station */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Treasury Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider px-1">
            Fila da Tesouraria ({treasuryQueue.length})
          </h3>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {treasuryQueue.length === 0 ? (
              <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                Nenhuma solicitação liberada para a Tesouraria.
              </div>
            ) : (
              treasuryQueue.map((r) => {
                const isSelected = selectedReq?.id === r.id;
                const isPago = r.status === 'PAGAMENTO_EFETUADO';
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelect(r)}
                    className={`p-4 rounded-xl border text-xs cursor-pointer transition shadow-sm ${
                      isSelected
                        ? 'bg-blue-50/60 dark:bg-blue-950/60 border-blue-500 dark:border-blue-600'
                        : isPago
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{r.numero}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPago
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                      }`}>
                        {isPago ? 'LIQUIDADO / PAGO' : 'LIBERADA P/ PAGAMENTO'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">{r.fornecedorFavorecido}</p>
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
          {selectedReq ? (
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                    <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Registro de Liquidação Bancária — {selectedReq.numero}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Favorecido: <strong className="text-slate-800 dark:text-slate-200">{selectedReq.fornecedorFavorecido}</strong>
                  </p>
                </div>
                <button
                  onClick={() => onOpenRequest(selectedReq)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold underline cursor-pointer"
                >
                  Ver FOR-FIN-01
                </button>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Settlement summary */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Valor Bruto:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100 font-bold">
                    {formatCurrency(selectedReq.valorTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Retenções Tributárias:</span>
                  <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">
                    {formatCurrency(selectedReq.conferenciaFinanceira?.valorRetencoes || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Valor Líquido Desembolsado:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-sm">
                    {formatCurrency(selectedReq.conferenciaFinanceira?.valorLiquido || selectedReq.valorTotal)}
                  </span>
                </div>
              </div>

              {selectedReq.status === 'PAGAMENTO_EFETUADO' ? (
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
                  <p className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Pagamento Liquidado e Comprovante Registrado</span>
                  </p>
                  <p>Comprovante / Autenticação: <strong className="font-mono text-slate-900 dark:text-slate-100">{selectedReq.registroPagamento?.numeroComprovante}</strong></p>
                  <p>Data do Pagamento: <strong className="text-slate-900 dark:text-slate-100">{selectedReq.registroPagamento?.dataPagamento}</strong></p>
                  <p>Responsável Tesouraria: <strong className="text-slate-900 dark:text-slate-100">{selectedReq.registroPagamento?.responsavelTesourariaNome}</strong></p>
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Forma Efetiva de Pagamento
                      </label>
                      <select
                        value={formaEfetivaPagamento}
                        onChange={(e) => setFormaEfetivaPagamento(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800"
                      >
                        <option value="BOLETO" className="bg-white dark:bg-slate-900">Boleto Bancário</option>
                        <option value="PIX" className="bg-white dark:bg-slate-900">PIX</option>
                        <option value="TED" className="bg-white dark:bg-slate-900">TED</option>
                        <option value="DEPOSITO_CONTA" className="bg-white dark:bg-slate-900">Depósito em Conta</option>
                        <option value="GUIA_TRIBUTARIA" className="bg-white dark:bg-slate-900">Guia Tributária</option>
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800"
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800"
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
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleExecutePayment}
                      className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Liquidação e Concluir Pagamento</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center h-full shadow-sm">
              <Landmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Nenhuma solicitação selecionada</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Selecione uma solicitação liberada ao lado para efetuar a liquidação financeira e arquivamento digital.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
