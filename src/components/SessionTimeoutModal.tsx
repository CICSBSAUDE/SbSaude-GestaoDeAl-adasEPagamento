import React from 'react';
import { ShieldAlert, Clock, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogout,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-500 shadow-inner">
            <Clock className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">
              <ShieldAlert className="w-3 h-3" />
              Segurança & Governança (ISO 9001)
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Sessão Expirando por Ociosidade
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Identificamos um período de inatividade no sistema. Por motivos de proteção aos dados corporativos e controle de alçadas, sua sessão será encerrada automaticamente.
            </p>
          </div>
        </div>

        {/* Countdown Timer Display */}
        <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200/70 dark:border-amber-900/40 flex flex-col items-center justify-center text-center space-y-1">
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-500 uppercase tracking-wider">
            Tempo restante para desconexão:
          </span>
          <div className="text-3xl font-black text-amber-700 dark:text-amber-400 tracking-tight font-mono">
            {formattedTime}
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-500/70">
            Clique no botão abaixo para renovar sua sessão imediatamente.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair Agora</span>
          </button>

          <button
            type="button"
            onClick={onStayLoggedIn}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-red-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Continuar Conectado</span>
          </button>
        </div>

      </div>
    </div>
  );
};
