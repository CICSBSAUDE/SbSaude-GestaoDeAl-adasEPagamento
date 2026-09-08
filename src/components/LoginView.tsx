import React, { useState } from 'react';
import {
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Building2,
  Activity,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LogoSBSaude } from './LogoSBSaude';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle, isLoading, sessionExpiredReason, requiresPasswordChange, completePasswordChange, logout } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isResetMode, setIsResetMode] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Por favor, informe seu e-mail ou usuário institucional.');
      return;
    }
    if (!password) {
      setErrorMsg('Por favor, digite sua senha de acesso.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao autenticar. Verifique as credenciais informadas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Por favor, informe seu e-mail corporativo para solicitar a redefinição.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await api.requestPasswordReset(email.trim());
      setSuccessMsg(res.message || 'Solicitação enviada.');
      setIsResetMode(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao solicitar redefinição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await api.changePassword(newPassword);
      await completePasswordChange();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao atualizar a senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-8 lg:p-12 font-sans relative overflow-x-hidden">
      
      {/* Subtle background decorative shapes */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl pointer-events-none -ml-40 -mb-40"></div>

      {/* Main Grid Container matching layout */}
      <main className="w-full max-w-6xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center z-10 py-6">
        
        {/* LEFT COLUMN: Brand Presentation & System Info */}
        <div className="lg:col-span-7 space-y-7">
          
          {/* Logo SB Saúde */}
          <div className="pt-2">
            <LogoSBSaude size="lg" />
          </div>

          {/* Tag / Pill Header */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200/80 text-red-600 text-[11px] font-bold tracking-wider uppercase">
              <Building2 className="w-3.5 h-3.5 text-red-600" />
              <span>PLATAFORMA DE GESTÃO DE ALÇADAS & PAGAMENTOS</span>
            </div>
          </div>

          {/* Main Title & Subtitle */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-tight">
              <span className="text-red-600">SB</span> Gestão de Alçadas
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Plataforma integrada para solicitação, governança e aprovação hierárquica de despesas, desenvolvida para centralizar informações, automatizar enquadramentos de alçada e apoiar a gestão financeira e assistencial.
            </p>
          </div>

          {/* Two White Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* Card 1: Gestão Integrada */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Governança & Alçadas
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enquadramento automático por faixa de valor, nível de risco e segregação de funções (N1 a N4).
              </p>
            </div>

            {/* Card 2: Controle e Acompanhamento */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Conferência & Liquidação
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Fluxo integrado entre Solicitante, Alçadas de Decisão, Conferência Financeira e Tesouraria.
              </p>
            </div>

          </div>

          {/* Bottom Compliance Verification Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3.5 text-xs text-slate-700">
            <div className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="leading-snug">
              Plataforma em estrita conformidade com a <strong>ISO 9001:2015</strong> e a <strong>Matriz de Alçadas</strong>.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: User Authentication Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/60 border border-slate-200/90 w-full max-w-md space-y-6">
            
            {requiresPasswordChange ? (
              <>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mt-4 tracking-tight">
                    Troca de Senha Obrigatória
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Para sua segurança, defina uma nova senha pessoal de acesso.
                  </p>
                </div>
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{errorMsg}</span>
                  </div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nova Senha</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirmar Nova Senha</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Digite a senha novamente"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center cursor-pointer mt-3"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Nova Senha'}
                  </button>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="w-full py-3 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-xs font-bold mt-2 cursor-pointer"
                  >
                    Cancelar e Voltar
                  </button>
                </form>
              </>
            ) : isResetMode ? (
              <>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mt-4 tracking-tight">
                    Recuperar Senha
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Informe seu e-mail para solicitar a redefinição de acesso.
                  </p>
                </div>
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{successMsg}</span>
                  </div>
                )}
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      E-MAIL INSTITUCIONAL
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="exemplo@sbsaude.com.br"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center cursor-pointer mt-3"
                  >
                    {isSubmitting ? 'Enviando...' : 'Solicitar Redefinição'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsResetMode(false); setErrorMsg(null); setSuccessMsg(null); }}
                    className="w-full py-3 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-xs font-bold mt-2 cursor-pointer"
                  >
                    Voltar ao Login
                  </button>
                </form>
              </>
            ) : (
              <>
            {/* Top Red Lock Icon */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-4 tracking-tight">
                Autenticação Corporativa
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Acesso restrito a colaboradores autorizados
              </p>
            </div>

            {/* Inactivity Notification */}
            {sessionExpiredReason === 'inactivity' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">Sessão Expirada por Inatividade</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Por motivos de segurança e governança, sua sessão foi encerrada. Por favor, autentique-se novamente.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message if any */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}
            
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Email / User */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  E-MAIL INSTITUCIONAL OU USUÁRIO
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="exemplo@sbsaude.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    SENHA DE ACESSO
                  </label>
                  <button
                    type="button"
                    onClick={() => { setIsResetMode(true); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Entrar no Sistema</span>
                )}
              </button>

              {/* Google Login Option */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-[10px]">
                  <span className="px-2 bg-white text-slate-400 uppercase font-semibold">ou</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await loginWithGoogle();
                  } catch (e: any) {
                    setErrorMsg(e.message || 'Erro ao autenticar com Google.');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-100 disabled:opacity-70 cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
                <span>Acessar com Google Workspace</span>
              </button>

              <p className="text-[10px] text-slate-400 text-center leading-tight">
                * Acesso permitido exclusivamente para e-mails corporativos previamente cadastrados e ativos no sistema.
              </p>

            </form>
            </>
            )}
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="w-full text-center text-xs text-slate-400 py-4 mt-auto z-10">
        © 2026 SB Saúde Operadora de Saúde. Todos os direitos reservados. Versão 1.0.0 (Produção)
      </footer>

    </div>
  );
};
