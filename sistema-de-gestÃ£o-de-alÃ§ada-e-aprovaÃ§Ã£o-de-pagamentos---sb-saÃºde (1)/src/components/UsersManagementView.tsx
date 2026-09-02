import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  UserCheck,
  Building2,
  Mail,
  Phone,
  KeyRound,
  LogIn,
  Check,
  X,
  FileCheck2,
  Landmark,
  ClipboardCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface RoleDefinition {
  role: UserRole;
  label: string;
  shortLabel: string;
  category: 'SOLICITACAO' | 'ALCADA' | 'OPERACAO' | 'SISTEMA';
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: React.ReactNode;
}

const ALL_ROLES: RoleDefinition[] = [
  {
    role: 'SOLICITANTE',
    label: 'Solicitante (FOR-FIN-01)',
    shortLabel: 'Solicitante',
    category: 'SOLICITACAO',
    description: 'Pode abrir novas solicitações de pagamento, anexar documentos e acompanhar status.',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    icon: <FileCheck2 className="w-4 h-4 text-blue-600" />,
  },
  {
    role: 'APROVADOR_1',
    label: '1ª Alçada — Coordenação / Supervisão',
    shortLabel: '1ª Alçada',
    category: 'ALCADA',
    description: 'Aprovação de 1º nível para despesas operacionais dentro dos limites da POL-DIR-01.',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    icon: <Shield className="w-4 h-4 text-indigo-600" />,
  },
  {
    role: 'APROVADOR_2',
    label: '2ª Alçada — Gerência de Área',
    shortLabel: '2ª Alçada',
    category: 'ALCADA',
    description: 'Aprovação de 2º nível para processos de médio porte e validação gerencial.',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    icon: <ShieldCheck className="w-4 h-4 text-purple-600" />,
  },
  {
    role: 'APROVADOR_3',
    label: '3ª Alçada — Diretoria de Área / Financeira',
    shortLabel: '3ª Alçada',
    category: 'ALCADA',
    description: 'Aprovação executiva de 3º nível para valores elevados e despesas estratégicas.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    icon: <KeyRound className="w-4 h-4 text-amber-600" />,
  },
  {
    role: 'APROVADOR_4',
    label: '4ª Alçada — Diretoria Executiva / Conselho',
    shortLabel: '4ª Alçada',
    category: 'ALCADA',
    description: 'Instância máxima de deliberação para grandes contratos e despesas de alto risco.',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    icon: <Sparkles className="w-4 h-4 text-rose-600" />,
  },
  {
    role: 'FINANCEIRO',
    label: 'Financeiro (Conferência Fiscal & Retenções)',
    shortLabel: 'Financeiro',
    category: 'OPERACAO',
    description: 'Conferência obrigatória dos 5 itens fiscais, retenções de tributos (ISS/INSS/IRRF) e liberação.',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    badgeBorder: 'border-teal-200',
    icon: <ClipboardCheck className="w-4 h-4 text-teal-600" />,
  },
  {
    role: 'TESOURARIA',
    label: 'Tesouraria (Liquidação & Pagamentos)',
    shortLabel: 'Tesouraria',
    category: 'OPERACAO',
    description: 'Execução de pagamentos bancários, registro de autenticações e comprovantes oficiais.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    icon: <Landmark className="w-4 h-4 text-emerald-600" />,
  },
  {
    role: 'ADMINISTRADOR',
    label: 'Administrador de Governança & SGQ',
    shortLabel: 'Administrador',
    category: 'SISTEMA',
    description: 'Gestão completa de usuários, controle de versões da matriz POL-DIR-01 e auditoria ISO 9001.',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    icon: <Lock className="w-4 h-4 text-slate-700" />,
  },
];

interface RolePreset {
  name: string;
  description: string;
  roles: UserRole[];
}

const ROLE_PRESETS: RolePreset[] = [
  {
    name: 'Solicitante Padrão',
    description: 'Abertura e consulta de solicitações',
    roles: ['SOLICITANTE'],
  },
  {
    name: 'Coordenação (1ª Alçada)',
    description: 'Solicita e aprova 1º nível',
    roles: ['SOLICITANTE', 'APROVADOR_1'],
  },
  {
    name: 'Gerência (2ª Alçada)',
    description: 'Solicita e aprova 2º nível',
    roles: ['SOLICITANTE', 'APROVADOR_2'],
  },
  {
    name: 'Diretoria (3ª & 4ª Alçadas)',
    description: 'Deliberação de alta autoridade',
    roles: ['SOLICITANTE', 'APROVADOR_3', 'APROVADOR_4'],
  },
  {
    name: 'Analista Financeiro',
    description: 'Conferência de NFs e retenções',
    roles: ['SOLICITANTE', 'FINANCEIRO'],
  },
  {
    name: 'Tesouraria',
    description: 'Liquidação e quitação de boletos/TED',
    roles: ['SOLICITANTE', 'TESOURARIA'],
  },
  {
    name: 'Administrador Geral',
    description: 'Controle total de governança',
    roles: ['SOLICITANTE', 'APROVADOR_1', 'APROVADOR_2', 'APROVADOR_3', 'APROVADOR_4', 'FINANCEIRO', 'TESOURARIA', 'ADMINISTRADOR'],
  },
];

export const UsersManagementView: React.FC = () => {
  const { currentUser, switchUser, refreshUserData } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('TODOS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TODOS');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('TODOS');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    cargo: string;
    area: string;
    centroCusto: string;
    phone: string;
    status: 'ATIVO' | 'INATIVO';
    roles: UserRole[];
  }>({
    name: '',
    email: '',
    cargo: '',
    area: '',
    centroCusto: '',
    phone: '',
    status: 'ATIVO',
    roles: ['SOLICITANTE'],
  });

  // Action status message
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setActionAlert({ type, message });
    setTimeout(() => {
      setActionAlert(null);
    }, 4500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.users || []);
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
      showAlert('error', err.message || 'Falha ao carregar lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Unique areas for filtering
  const areasList = Array.from(new Set(users.map((u) => u.area).filter(Boolean))).sort();

  // Metrics calculations
  const totalUsers = users.length;
  const activeUsersCount = users.filter((u) => u.status === 'ATIVO').length;
  const adminCount = users.filter((u) => u.roles.includes('ADMINISTRADOR')).length;
  const approversCount = users.filter((u) =>
    u.roles.some((r) => ['APROVADOR_1', 'APROVADOR_2', 'APROVADOR_3', 'APROVADOR_4'].includes(r))
  ).length;
  const financeTreasuryCount = users.filter((u) =>
    u.roles.some((r) => ['FINANCEIRO', 'TESOURARIA'].includes(r))
  ).length;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.centroCusto.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      selectedRoleFilter === 'TODOS' || u.roles.includes(selectedRoleFilter as UserRole);

    const matchesStatus =
      selectedStatusFilter === 'TODOS' || u.status === selectedStatusFilter;

    const matchesArea =
      selectedAreaFilter === 'TODOS' || u.area === selectedAreaFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesArea;
  });

  // Open Create User Modal
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      cargo: '',
      area: '',
      centroCusto: '',
      phone: '',
      status: 'ATIVO',
      roles: ['SOLICITANTE'],
    });
    setShowCreateModal(true);
  };

  // Open Edit User Modal
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      cargo: user.cargo,
      area: user.area,
      centroCusto: user.centroCusto || '',
      phone: user.phone || '',
      status: user.status as 'ATIVO' | 'INATIVO',
      roles: [...user.roles],
    });
  };

  // Open Permissions-only Modal
  const handleOpenPermissions = (user: User) => {
    setPermissionsUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      cargo: user.cargo,
      area: user.area,
      centroCusto: user.centroCusto || '',
      phone: user.phone || '',
      status: user.status as 'ATIVO' | 'INATIVO',
      roles: [...user.roles],
    });
  };

  // Toggle role in formData
  const handleToggleRole = (role: UserRole) => {
    setFormData((prev) => {
      const exists = prev.roles.includes(role);
      let updatedRoles: UserRole[];
      if (exists) {
        // Prevent having zero roles
        if (prev.roles.length === 1) {
          showAlert('error', 'O usuário precisa ter ao menos uma permissão atribuída.');
          return prev;
        }
        updatedRoles = prev.roles.filter((r) => r !== role);
      } else {
        updatedRoles = [...prev.roles, role];
      }
      return { ...prev, roles: updatedRoles };
    });
  };

  // Apply Role Preset
  const handleApplyPreset = (presetRoles: UserRole[]) => {
    setFormData((prev) => ({
      ...prev,
      roles: [...presetRoles],
    }));
  };

  // Save new user
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.cargo.trim() || !formData.area.trim()) {
      showAlert('error', 'Por favor, preencha os campos obrigatórios: Nome, E-mail, Cargo e Área.');
      return;
    }
    if (formData.roles.length === 0) {
      showAlert('error', 'Atribua ao menos uma permissão ao usuário.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createUser(formData);
      showAlert('success', `Usuário ${formData.name} cadastrado com sucesso!`);
      setShowCreateModal(false);
      await fetchUsers();
      await refreshUserData();
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.message || 'Erro ao cadastrar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save edited user
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!formData.name.trim() || !formData.email.trim() || !formData.cargo.trim() || !formData.area.trim()) {
      showAlert('error', 'Por favor, preencha os campos obrigatórios: Nome, E-mail, Cargo e Área.');
      return;
    }
    if (formData.roles.length === 0) {
      showAlert('error', 'O usuário precisa ter ao menos uma permissão ativa.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateUser(editingUser.id, formData);
      showAlert('success', `Cadastro do usuário ${formData.name} atualizado com sucesso!`);
      setEditingUser(null);
      await fetchUsers();
      await refreshUserData();
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.message || 'Erro ao atualizar dados do usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save permissions only
  const handleSavePermissions = async () => {
    if (!permissionsUser) return;
    if (formData.roles.length === 0) {
      showAlert('error', 'O usuário precisa ter ao menos uma permissão ativa.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateUser(permissionsUser.id, { roles: formData.roles });
      showAlert(
        'success',
        `Permissões de ${permissionsUser.name} atualizadas: ${formData.roles.join(', ')}.`
      );
      setPermissionsUser(null);
      await fetchUsers();
      await refreshUserData();
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.message || 'Erro ao atualizar permissões.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle user status (Ativo / Inativo) directly
  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    try {
      await api.updateUser(user.id, { status: newStatus });
      showAlert(
        'success',
        `Status de ${user.name} alterado para ${newStatus === 'ATIVO' ? 'ATIVO' : 'INATIVO'}.`
      );
      await fetchUsers();
      await refreshUserData();
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.message || 'Erro ao alterar status do usuário.');
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      await api.deleteUser(userToDelete.id);
      showAlert('success', `Usuário ${userToDelete.name} removido com sucesso.`);
      setUserToDelete(null);
      await fetchUsers();
      await refreshUserData();
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.message || 'Erro ao excluir usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Action Notification Alert */}
      {actionAlert && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all animate-fadeIn ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2.5 text-xs font-semibold">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionAlert.message}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Metrics Overview */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-800">
                  Gestão de Usuários, Cargos e Atribuição de Permissões
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono border border-blue-200 font-bold">
                  POL-DIR-01 &bull; RBAC
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastro corporativo, controle de acessos, alçadas de autoridade e segregação de funções.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-2 shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Novo Usuário</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total de Usuários</span>
            <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">{totalUsers}</span>
            <span className="text-[10px] text-slate-500">{activeUsersCount} ativos no sistema</span>
          </div>

          <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100">
            <span className="text-[10px] font-bold text-indigo-700 uppercase block">Aprovadores (Alçada)</span>
            <span className="text-base font-bold font-mono text-indigo-900 mt-0.5 block">{approversCount}</span>
            <span className="text-[10px] text-indigo-600">Habilitados N1 a N4</span>
          </div>

          <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-100">
            <span className="text-[10px] font-bold text-teal-700 uppercase block">Finanças / Tesouraria</span>
            <span className="text-base font-bold font-mono text-teal-900 mt-0.5 block">{financeTreasuryCount}</span>
            <span className="text-[10px] text-teal-600">Conferência e Quitação</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-700 uppercase block">Administradores</span>
            <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">{adminCount}</span>
            <span className="text-[10px] text-slate-500">Governança & SGQ</span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Segregação Funções</span>
            <span className="text-base font-bold text-emerald-700 mt-0.5 block flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Conforme</span>
            </span>
            <span className="text-[10px] text-emerald-600">ISO 9001:2015 7.5</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, cargo, área ou centro de custo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition font-medium cursor-pointer"
          >
            <option value="TODOS">Todas as Permissões / Papéis</option>
            <option value="SOLICITANTE">Solicitante</option>
            <option value="APROVADOR_1">1ª Alçada (Coordenação)</option>
            <option value="APROVADOR_2">2ª Alçada (Gerência)</option>
            <option value="APROVADOR_3">3ª Alçada (Diretoria)</option>
            <option value="APROVADOR_4">4ª Alçada (Presidência/Conselho)</option>
            <option value="FINANCEIRO">Financeiro (Conferência)</option>
            <option value="TESOURARIA">Tesouraria (Liquidação)</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </select>

          {/* Area Filter */}
          <select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition font-medium cursor-pointer max-w-[160px] truncate"
          >
            <option value="TODOS">Todos os Departamentos</option>
            {areasList.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition font-medium cursor-pointer"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVO">Apenas Ativos</option>
            <option value="INATIVO">Apenas Inativos</option>
          </select>

          <span className="text-xs text-slate-500 font-medium pl-1">
            {filteredUsers.length} usuário(s)
          </span>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Carregando catálogo de usuários e permissões...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">Nenhum usuário encontrado com os filtros selecionados.</p>
            <p className="text-slate-400">Tente ajustar a busca ou limpar os filtros de papéis e departamento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Usuário / Identificação</th>
                  <th className="py-3 px-4">Cargo & Departamento</th>
                  <th className="py-3 px-4">Permissões & Alçadas Atribuídas</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const isCurrent = currentUser?.id === user.id;
                  const initials = user.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition">
                      {/* User Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              user.roles.includes('ADMINISTRADOR')
                                ? 'bg-slate-800 text-white'
                                : user.roles.some((r) => r.startsWith('APROVADOR'))
                                ? 'bg-indigo-600 text-white'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-800">{user.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                                <Phone className="w-2.5 h-2.5 shrink-0" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cargo & Area */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{user.cargo}</p>
                        <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{user.area}</span>
                        </div>
                        {user.centroCusto && (
                          <span className="inline-block mt-1 font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                            {user.centroCusto}
                          </span>
                        )}
                      </td>

                      {/* Permissions / Roles */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md items-center">
                          {user.roles.map((role) => {
                            const def = ALL_ROLES.find((r) => r.role === role);
                            return (
                              <span
                                key={role}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center space-x-1 ${
                                  def?.badgeBg || 'bg-slate-100'
                                } ${def?.badgeText || 'text-slate-700'} ${
                                  def?.badgeBorder || 'border-slate-200'
                                }`}
                                title={def?.description}
                              >
                                <span>{def?.shortLabel || role}</span>
                              </span>
                            );
                          })}

                          {/* Quick Manage Permissions Button */}
                          <button
                            onClick={() => handleOpenPermissions(user)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-blue-600 text-[10px] font-semibold border border-slate-200 transition"
                            title="Atribuir ou desatribuir permissões deste usuário"
                          >
                            <KeyRound className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          title={`Clique para ${user.status === 'ATIVO' ? 'desativar' : 'ativar'} usuário`}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            user.status === 'ATIVO'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'ATIVO' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          ></span>
                          <span>{user.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Switch User Session (Demo helper) */}
                          <button
                            onClick={() => switchUser(user.id)}
                            title="Simular login como este usuário"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-semibold border border-slate-200 transition flex items-center space-x-1"
                          >
                            <LogIn className="w-3 h-3" />
                            <span className="hidden sm:inline">Acessar</span>
                          </button>

                          {/* Edit Full Profile */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            title="Editar dados e permissões"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => setUserToDelete(user)}
                            title="Remover usuário"
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg border transition ${
                              isCurrent
                                ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                : 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-200 hover:border-red-200'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: CADASTRO DE NOVO USUÁRIO (CRIAÇÃO COM ATRIBUIÇÃO)     */}
      {/* ------------------------------------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 shadow-xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Cadastrar Novo Usuário no Sistema
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Preencha os dados cadastrais e atribua os papéis e alçadas correspondentes (POL-DIR-01).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5 text-xs">
              {/* Section: Dados Pessoais e Organizacionais */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Dados Cadastrais & Estrutura Organizacional</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Mariana Silva"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      E-mail Corporativo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="mariana.silva@sbsaude.com.br"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Cargo / Função <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Coordenadora de Finanças"
                      value={formData.cargo}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Área / Departamento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Finanças e Controladoria"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Centro de Custo (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: CC-3030 - Finanças"
                      value={formData.centroCusto}
                      onChange={(e) => setFormData({ ...formData, centroCusto: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Telefone / Ramal
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Atribuição de Permissões e Alçadas */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span>2. Atribuição de Permissões & Alçadas (POL-DIR-01)</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Selecione individualmente ou clique em um preset para preenchimento rápido.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 self-start sm:self-auto">
                    {formData.roles.length} permissão(ões) selecionada(s)
                  </span>
                </div>

                {/* Quick Presets Bar */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Modelos Rápidos de Permissão (1 Clique):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleApplyPreset(preset.roles)}
                        className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-semibold border border-slate-200 hover:border-blue-200 transition shadow-2xs"
                        title={preset.description}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Role Toggles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ALL_ROLES.map((roleDef) => {
                    const isSelected = formData.roles.includes(roleDef.role);
                    return (
                      <div
                        key={roleDef.role}
                        onClick={() => handleToggleRole(roleDef.role)}
                        className={`p-3 rounded-lg border transition cursor-pointer flex items-start space-x-3 select-none ${
                          isSelected
                            ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-300'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by container onClick
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            {roleDef.icon}
                            <span className="font-bold text-slate-800 text-xs">
                              {roleDef.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            {roleDef.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Cadastrando...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Cadastrar Usuário</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: EDIÇÃO COMPLETA DE USUÁRIO                           */}
      {/* ------------------------------------------------------------- */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 shadow-xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Editar Cadastro & Permissões: {editingUser.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atualize os dados funcionais e configure a delegação de autoridade do usuário.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5 text-xs">
              {/* Section: Dados Pessoais */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Dados Cadastrais & Lotação</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Nome Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      E-mail Corporativo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Cargo / Função <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cargo}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Área / Departamento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Centro de Custo
                    </label>
                    <input
                      type="text"
                      value={formData.centroCusto}
                      onChange={(e) => setFormData({ ...formData, centroCusto: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Status do Usuário
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as 'ATIVO' | 'INATIVO' })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                    >
                      <option value="ATIVO">ATIVO (Acesso liberado)</option>
                      <option value="INATIVO">INATIVO (Acesso bloqueado)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Atribuição / Desatribuição de Permissões */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span>2. Atribuir & Desatribuir Permissões (POL-DIR-01)</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Marque para atribuir ou desmarque para revogar o papel do usuário.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 self-start sm:self-auto">
                    {formData.roles.length} permissão(ões) ativa(s)
                  </span>
                </div>

                {/* Quick Presets Bar */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Aplicar Modelo Rápido:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleApplyPreset(preset.roles)}
                        className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-semibold border border-slate-200 hover:border-blue-200 transition shadow-2xs"
                        title={preset.description}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Role Toggles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ALL_ROLES.map((roleDef) => {
                    const isSelected = formData.roles.includes(roleDef.role);
                    return (
                      <div
                        key={roleDef.role}
                        onClick={() => handleToggleRole(roleDef.role)}
                        className={`p-3 rounded-lg border transition cursor-pointer flex items-start space-x-3 select-none ${
                          isSelected
                            ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-300'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            {roleDef.icon}
                            <span className="font-bold text-slate-800 text-xs">
                              {roleDef.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            {roleDef.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: GESTÃO RÁPIDA DE PERMISSÕES & ALÇADAS                */}
      {/* ------------------------------------------------------------- */}
      {permissionsUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Atribuir / Desatribuir Permissões: {permissionsUser.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {permissionsUser.cargo} &bull; {permissionsUser.area}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPermissionsUser(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                Modelos Rápidos de Permissão:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset.roles)}
                    className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-semibold border border-slate-200 hover:border-blue-200 transition shadow-2xs"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Role List */}
            <div className="space-y-2 text-xs">
              {ALL_ROLES.map((roleDef) => {
                const isSelected = formData.roles.includes(roleDef.role);
                return (
                  <div
                    key={roleDef.role}
                    onClick={() => handleToggleRole(roleDef.role)}
                    className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between space-x-3 select-none ${
                      isSelected
                        ? 'bg-blue-50/60 border-blue-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          {roleDef.icon}
                          <span className="font-bold text-slate-800 text-xs">{roleDef.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{roleDef.description}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        isSelected
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isSelected ? 'Atribuído' : 'Inativo'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setPermissionsUser(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Confirmar Permissões'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: CONFIRMAÇÃO DE REMOÇÃO DE USUÁRIO                     */}
      {/* ------------------------------------------------------------- */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Remover Usuário do Sistema
                </h3>
                <p className="text-[11px] text-slate-500">
                  Esta ação revoga todos os acessos e registra log de auditoria.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-800">{userToDelete.name}</p>
              <p className="text-slate-600">{userToDelete.email}</p>
              <p className="text-slate-500">{userToDelete.cargo} &bull; {userToDelete.area}</p>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Tem certeza de que deseja remover este usuário? As solicitações anteriores associadas continuarão arquivadas na trilha de auditoria para integridade ISO 9001:2015.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm shadow-red-200 transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Removendo...' : 'Sim, Remover'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
