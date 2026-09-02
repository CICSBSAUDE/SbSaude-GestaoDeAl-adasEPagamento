import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  Eye,
  EyeOff,
  Building2,
  FileCheck2,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle, users, isLoading } = useAuth();

  const [email, setEmail] = useState<string>('vanessa.duarte@sbsaude.com.br');
  const [password, setPassword] = useState<string>('••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const adminUser = users.find((u) => u.roles.includes('ADMINISTRADOR'));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Por favor, informe seu e-mail corporativo.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await login(email.trim());
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao autenticar. Verifique o e-mail informado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelectUser = (user: User) => {
    setEmail(user.email);
    setPassword('••••••••');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100 font-sans">
      
      {/* Top Brand Header */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20 border border-blue-400/30">
            SB
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold tracking-tight text-white">SB Saúde</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-semibold border border-blue-400/30">
                FOR-FIN-01
              </span>
            </div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider">
              Sistema de Governança de Alçadas & Pagamentos
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-[11px] text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Ambiente Seguro • POL-DIR-01</span>
        </div>
      </div>

      {/* Main Login Card & Quick Profiles Grid */}
      <div className="w-full max-w-6xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-6">
        
        {/* Left Col: Credentials Form */}
        <div className="lg:col-span-5 bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
          <div className="space-y-1 mb-6">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200 mb-2">
              <Lock className="w-3 h-3" />
              <span>Acesso Corporativo Restrito</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Entrar no Sistema</h2>
            <p className="text-xs text-slate-500">
              Informe suas credenciais corporativas da SB Saúde para prosseguir.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="usuario@sbsaude.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Senha de Acesso
                </label>
                <span className="text-[10px] text-blue-600 hover:underline cursor-pointer">
                  Esqueci minha senha
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>Lembrar meu usuário</span>
              </label>
              <span className="text-[11px] text-slate-400">SSO Habilitado</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Entrar no Portal SB Saúde</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-2 bg-white text-slate-500 uppercase">ou</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await loginWithGoogle();
                } catch(e) {
                  setErrorMsg(e.message);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs font-bold hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                <path fill="none" d="M1 1h22v22H1z" />
              </svg>
              <span>Entrar com Google</span>
            </button>

          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Versão POL-DIR-01 v2.4</span>
            <span className="flex items-center space-x-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Auditoria ISO 9001:2015</span>
            </span>
          </div>
        </div>

        {/* Right Col: Quick Access Role Profiles */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/80 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">
                    Perfis Corporativos & Acesso Rápido de Testes
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Clique em um perfil para preencher automaticamente as credenciais e testar as alçadas.
                </p>
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-300 bg-blue-900/50 px-2.5 py-1 rounded-md border border-blue-700/50 self-start sm:self-auto">
                Seleção em 1 Clique
              </span>
            </div>

            {/* Featured Administrator Highlight Card */}
            {adminUser && (
              <div
                onClick={() => handleQuickSelectUser(adminUser)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  email === adminUser.email
                    ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-400/40'
                    : 'bg-slate-900/70 border-slate-700 hover:border-slate-500 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm border border-amber-400/30 shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">{adminUser.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-bold border border-amber-400/30 font-mono">
                        ADMINISTRADOR GERAL
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate">{adminUser.cargo}</p>
                    <p className="text-[10px] text-blue-300 font-mono mt-0.5">{adminUser.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickSelectUser(adminUser);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition shrink-0 ml-2"
                >
                  Selecionar Admin
                </button>
              </div>
            )}

            {/* Grid of Other Roles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {users
                .filter((u) => !u.roles.includes('ADMINISTRADOR'))
                .map((u) => {
                  const isSelected = email === u.email;
                  const roleBadge = u.roles.some((r) => r.startsWith('APROVADOR'))
                    ? '1ª a 4ª Alçada'
                    : u.roles.includes('FINANCEIRO')
                    ? 'Financeiro'
                    : u.roles.includes('TESOURARIA')
                    ? 'Tesouraria'
                    : 'Solicitante';

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleQuickSelectUser(u)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between text-left ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-400 ring-1 ring-blue-400'
                          : 'bg-slate-900/50 border-slate-700/70 hover:border-slate-500 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-white truncate">{u.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-mono shrink-0">
                            {roleBadge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{u.cargo}</p>
                        <p className="text-[9px] text-slate-500 font-mono truncate">{u.email}</p>
                      </div>

                      <span className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 shrink-0">
                        {isSelected ? '✓ Pronto' : 'Usar'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Compliance & Policy Footnote */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 flex items-start space-x-3">
            <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="text-slate-200">Segregação de Funções (POL-DIR-01):</strong> O menu de{' '}
              <span className="text-blue-300 font-semibold">Usuários & Permissões</span> é estritamente restrito a Administradores de Governança. Solicitantes, aprovadores e operadores visualizam exclusivamente as etapas de sua alçada.
            </p>
          </div>

        </div>

      </div>

      {/* Bottom Copyright & SGQ Footer */}
      <div className="w-full max-w-6xl mx-auto py-2 text-center text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between border-t border-slate-800 pt-3">
        <span>© 2026 SB Saúde — Todos os direitos reservados.</span>
        <span>Manual da Qualidade SGQ • ISO 9001:2015 Requisito 7.5</span>
      </div>

    </div>
  );
};
