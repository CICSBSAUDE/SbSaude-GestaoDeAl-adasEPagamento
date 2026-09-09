import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemConfig } from '../types';
import {
  FileCheck2,
  Shield,
  BookOpen,
  Settings,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SGQRepositoryViewProps {
  isAdmin?: boolean;
}

export const SGQRepositoryView: React.FC<SGQRepositoryViewProps> = ({ isAdmin = false }) => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [sgqData, setSgqData] = useState<any>(null);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [cfgRes, sgqRes] = await Promise.all([api.getSettings(), api.getSGQRepository()]);
        setConfig(cfgRes.config);
        setSgqData(sgqRes);
      } catch (e) {
        console.error('Failed to load SGQ data', e);
      }
    };
    load();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSavingConfig(true);
    try {
      const res = await api.updateSettings(config);
      setConfig(res.config);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save config', e);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Repositório SGQ, Governança & Parâmetros Corporativos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Documentos normativos controlados em conformidade com ISO 9001:2015 (Seção 7.5 Informação Documentada).
            </p>
          </div>
        </div>
      </div>

      {/* Normative Documents Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Política de Alçada */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Política de Alçada e Governança
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800/50">
              VIGENTE (Rev. 00)
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p><strong className="text-slate-800 dark:text-slate-100">Título:</strong> Política de Alçada e Delegação de Autoridade</p>
            <p><strong className="text-slate-800 dark:text-slate-100">Vigência Oficial:</strong> 07/07/2026 a 07/07/2028 (Revisão bienal)</p>
            <p><strong className="text-slate-800 dark:text-slate-100">Elaboração:</strong> Raquel Marimon (Finanças) / Janine Sena (Credenciamento)</p>
            <p><strong className="text-slate-800 dark:text-slate-100">Revisão:</strong> Christiane Macedo (Operações) / Haroldo Peon (Jurídico/Compliance)</p>
            <p><strong className="text-slate-800 dark:text-slate-100">Aprovação:</strong> Janaína Mascarenhas (Diretoria Executiva)</p>
            <p><strong className="text-slate-800 dark:text-slate-100">Enquadramento Regulatório:</strong> ISO 9001:2015 (7.5, 8.1, 9.1) • RN ANS nº 518/2022</p>
            <p><strong className="text-slate-800 dark:text-slate-100">Tempo de Retenção:</strong> 2 anos (Armazenamento digital imutável)</p>
          </div>
        </div>

        {/* Formulário de Registro */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <FileCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Formulário de Registro e Aprovação
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800/50">
              PADRÃO OPERACIONAL
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p><strong className="text-slate-800 dark:text-slate-100">Título:</strong> Formulário de Registro de Alçada e Aprovação para Pagamento</p>
            <p><strong className="text-slate-800 dark:text-slate-100">Estrutura:</strong> 7 Seções padronizadas de dados, enquadramento e triplo controle</p>
            <p><strong className="text-slate-800 dark:text-slate-100">Segregação Obrigatória:</strong> Solicitante ≠ Aprovador 1 ≠ Aprovador 2 ≠ Aprovador 3 ≠ Tesouraria</p>
            <p><strong className="text-slate-800 dark:text-slate-100">Prazo Mínimo Financeiro:</strong> 5 dias úteis de antecedência do vencimento</p>
            <p><strong className="text-slate-800 dark:text-slate-100">Garantia de Integridade:</strong> Hash SHA-256 em anexos e carimbo temporal digital</p>
          </div>
        </div>

      </div>

      {/* Global Configuration Parameters */}
      {config && (
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Parâmetros Globais do Sistema de Governança
            </h3>
          </div>

          {!isAdmin && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Modo de visualização. Apenas administradores do sistema podem modificar os parâmetros globais da política de alçada.</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Parâmetros atualizados e registrados na trilha de auditoria com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Dias de Alerta SLA Vencimento (Dias Úteis)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={config.diasUteisAlertaVencimento}
                onChange={(e) =>
                  setConfig({ ...config, diasUteisAlertaVencimento: Number(e.target.value) })
                }
                className={`w-full px-3 py-2 rounded-lg border text-slate-800 dark:text-slate-100 ${isAdmin ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Janela de Detecção de Fracionamento (Dias)
              </label>
              <input
                type="number"
                disabled={!isAdmin}
                value={config.janelaDiasDeteccaoFracionamento}
                onChange={(e) =>
                  setConfig({ ...config, janelaDiasDeteccaoFracionamento: Number(e.target.value) })
                }
                className={`w-full px-3 py-2 rounded-lg border text-slate-800 dark:text-slate-100 ${isAdmin ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'}`}
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Versão Matriz Padrão
              </label>
              <input
                type="text"
                disabled
                value={config.versaoMatrizVigenteCodigo}
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-mono"
              />
            </div>

            {isAdmin && (
              <div className="sm:col-span-3 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm shadow-blue-200"
                >
                  {savingConfig ? 'Salvando...' : 'Salvar Alterações de Parâmetros'}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

    </div>
  );
};
