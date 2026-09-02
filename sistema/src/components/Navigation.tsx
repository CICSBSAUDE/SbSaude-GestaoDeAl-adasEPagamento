import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  FileSpreadsheet,
  PlusCircle,
  TableProperties,
  ClipboardCheck,
  Landmark,
  ShieldAlert,
  FileCheck2,
  CheckCircle2,
  Users,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab =
  | 'DASHBOARD'
  | 'MY_QUEUE'
  | 'MINHA_FILA'
  | 'ALL_REQUESTS'
  | 'SOLICITACOES'
  | 'NEW_REQUEST'
  | 'NOVA_SOLICITACAO'
  | 'MATRIX'
  | 'MATRIZ'
  | 'FINANCIAL'
  | 'FINANCEIRO'
  | 'TREASURY'
  | 'TESOURARIA'
  | 'AUDIT'
  | 'AUDITORIA'
  | 'SGQ'
  | 'USERS'
  | 'USUARIOS';

interface NavigationProps {
  activeTab: string;
  onTabChange?: (tab: any) => void;
  onSelectTab?: (tab: any) => void;
  myQueueCount?: number;
  financeCount?: number;
  pendingFinanceCount?: number;
  treasuryCount?: number;
  pendingTreasuryCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onSelectTab,
  myQueueCount = 0,
  financeCount = 0,
  pendingFinanceCount = 0,
  treasuryCount = 0,
  pendingTreasuryCount = 0,
}) => {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.roles?.includes('ADMINISTRADOR');

  const handleSelect = (tabId: string) => {
    if (onTabChange) onTabChange(tabId);
    else if (onSelectTab) onSelectTab(tabId);
  };

  const fCount = financeCount || pendingFinanceCount || 0;
  const tCount = treasuryCount || pendingTreasuryCount || 0;

  const isCurrent = (tab1: string, tab2: string) => {
    return activeTab === tab1 || activeTab === tab2;
  };

  return (
    <nav className="w-64 bg-slate-900 text-slate-300 flex flex-col p-4 gap-1 shrink-0 select-none overflow-y-auto">
      {/* Section 1: Main Navigation */}
      <div className="text-[10px] uppercase text-slate-500 font-bold px-3 mb-2 tracking-widest">
        Navegação Principal
      </div>

      <button
        onClick={() => handleSelect('DASHBOARD')}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
          isCurrent('DASHBOARD', 'DASHBOARD')
            ? 'bg-slate-800 text-white font-semibold shadow-sm'
            : 'hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        <LayoutDashboard className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1">Dashboard</span>
      </button>

      <button
        onClick={() => handleSelect('MY_QUEUE')}
        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
          isCurrent('MY_QUEUE', 'MINHA_FILA')
            ? 'bg-slate-800 text-white font-semibold shadow-sm'
            : 'hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Inbox className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Minha Fila</span>
        </div>
        {myQueueCount > 0 && (
          <span className="bg-blue-600 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold">
            {myQueueCount}
          </span>
        )}
      </button>

      <button
        onClick={() => handleSelect('ALL_REQUESTS')}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
          isCurrent('ALL_REQUESTS', 'SOLICITACOES')
            ? 'bg-slate-800 text-white font-semibold shadow-sm'
            : 'hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1">Solicitações (FOR-FIN-01)</span>
      </button>

      <button
        onClick={() => handleSelect('NEW_REQUEST')}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
          isCurrent('NEW_REQUEST', 'NOVA_SOLICITACAO')
            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
            : 'text-blue-400 hover:bg-slate-800/70 hover:text-blue-300'
        }`}
      >
        <PlusCircle className="w-4 h-4 shrink-0" />
        <span className="flex-1">+ Nova Solicitação</span>
      </button>

      <button
        onClick={() => handleSelect('FINANCIAL')}
        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
          isCurrent('FINANCIAL', 'FINANCEIRO')
            ? 'bg-slate-800 text-white font-semibold shadow-sm'
            : 'hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Financeiro</span>
        </div>
        {fCount > 0 && (
          <span className="bg-amber-500 text-[10px] text-slate-950 px-1.5 py-0.5 rounded-full font-bold">
            {fCount}
          </span>
        )}
      </button>

      <button
        onClick={() => handleSelect('TREASURY')}
        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
          isCurrent('TREASURY', 'TESOURARIA')
            ? 'bg-slate-800 text-white font-semibold shadow-sm'
            : 'hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Landmark className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Tesouraria</span>
        </div>
        {tCount > 0 && (
          <span className="bg-emerald-500 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold">
            {tCount}
          </span>
        )}
      </button>

      {/* Section 2: Governance & Compliance */}
      <div className="mt-5 text-[10px] uppercase text-slate-500 font-bold px-3 mb-2 tracking-widest">
        Governança & Controle
      </div>

      <button
        onClick={() => handleSelect('MATRIX')}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
          isCurrent('MATRIX', 'MATRIZ')
            ? 'bg-slate-800 text-white font-semibold shadow-sm'
            : 'hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        <TableProperties className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1">Matriz de Alçada</span>
      </button>

      <button
        onClick={() => handleSelect('AUDIT')}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
          isCurrent('AUDIT', 'AUDITORIA')
            ? 'bg-slate-800 text-white font-semibold shadow-sm'
            : 'hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1">Auditoria Imutável</span>
      </button>

      <button
        onClick={() => handleSelect('SGQ')}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
          isCurrent('SGQ', 'SGQ')
            ? 'bg-slate-800 text-white font-semibold shadow-sm'
            : 'hover:bg-slate-800/70 hover:text-white'
        }`}
      >
        <FileCheck2 className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1">Relatórios & SGQ</span>
      </button>

      {/* Section: Administration & Governance (Only visible for ADMINISTRADOR) */}
      {isAdmin && (
        <>
          <div className="text-[10px] uppercase text-slate-500 font-bold px-3 mt-4 mb-2 tracking-widest flex items-center justify-between">
            <span>Governança & SGQ</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
              Admin
            </span>
          </div>

          <button
            onClick={() => handleSelect('USERS')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
              isCurrent('USERS', 'USUARIOS')
                ? 'bg-slate-800 text-white font-semibold shadow-sm ring-1 ring-blue-500/50'
                : 'hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="flex-1">Usuários & Permissões</span>
          </button>
        </>
      )}

      {/* Compliance Indicator Widget at the bottom */}
      <div className="mt-auto p-3 bg-slate-800/60 rounded-xl border border-slate-750/70 mt-6 space-y-3">
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-300 font-semibold mb-1">
            <span>POL-DIR-01 Compliance</span>
            <span className="text-emerald-400 font-bold">100%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full w-full bg-emerald-500 rounded-full"></div>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] mt-2 text-slate-400">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Auditoria ISO 9001:2015 íntegra</span>
          </div>
        </div>

        {/* Logoff / Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/50 text-[11px] font-semibold transition cursor-pointer"
          title="Encerrar sessão e voltar à tela de login"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Encerrar Sessão (Logoff)</span>
        </button>
      </div>
    </nav>
  );
};

