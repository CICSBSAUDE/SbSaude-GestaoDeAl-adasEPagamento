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
  KeyRound,
  Check,
  X,
  FileCheck2,
  Landmark,
  ClipboardCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import { User, UserRole, CostCenter } from '../types';
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
  const { currentUser, refreshUserData } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('TODOS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TODOS');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('TODOS');

  // Cost Centers management state
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'USERS' | 'COST_CENTERS'>('USERS');
  const [ccSearchTerm, setCcSearchTerm] = useState<string>('');
  const [showCCModal, setShowCCModal] = useState<boolean>(false);
  const [editingCC, setEditingCC] = useState<CostCenter | null>(null);
  const [ccFormData, setCcFormData] = useState<{
    codigo: string;
    nome: string;
    descricao: string;
    responsavel: string;
    ativo: boolean;
  }>({
    codigo: '',
    nome: '',
    descricao: '',
    responsavel: '',
    ativo: true,
  });

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [ccToDelete, setCcToDelete] = useState<CostCenter | null>(null);
  const [tempPasswordModal, setTempPasswordModal] = useState<{ user: User; tempPassword: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    googleEmail?: string;
    cargo: string;
    area: string;
    centroCusto: string;
    centrosCusto: string[];
    status: 'ATIVO' | 'INATIVO';
    roles: UserRole[];
    password?: string;
  }>({
    name: '',
    email: '',
    googleEmail: '',
    cargo: '',
    area: '',
    centroCusto: '',
    centrosCusto: [],
    status: 'ATIVO',
    roles: ['SOLICITANTE'],
    password: '',
  });

  const [showFormPassword, setShowFormPassword] = useState<boolean>(false);
  const [isSyncingWithMatrix, setIsSyncingWithMatrix] = useState<boolean>(false);

  // Generate random secure password helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = '';
    for (let i = 0; i < 8; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: generated }));
    setShowFormPassword(true);
  };

  // Toggle or add cost center for user
  const handleToggleCostCenter = (ccVal: string) => {
    setFormData((prev) => {
      const exists = prev.centrosCusto.includes(ccVal);
      let updated: string[];
      if (exists) {
        updated = prev.centrosCusto.filter((c) => c !== ccVal);
      } else {
        updated = [...prev.centrosCusto, ccVal];
      }
      return {
        ...prev,
        centrosCusto: updated,
        centroCusto: updated.length > 0 ? (updated.includes(prev.centroCusto) ? prev.centroCusto : updated[0]) : '',
      };
    });
  };

  const handleSetPrimaryCostCenter = (ccVal: string) => {
    setFormData((prev) => {
      const currentList = prev.centrosCusto.includes(ccVal) ? prev.centrosCusto : [...prev.centrosCusto, ccVal];
      return {
        ...prev,
        centroCusto: ccVal,
        centrosCusto: currentList,
      };
    });
  };

  const handleSyncWithMatrix = async () => {
    setIsSyncingWithMatrix(true);
    try {
      const res = await api.syncCostCentersFromMatrix();
      showAlert('success', res.message || `${res.addedCount} novos centros de custo extraídos dos cargos da matriz com sucesso!`);
      await fetchCostCenters();
      await fetchUsers();
    } catch (err: any) {
      console.error('Erro ao sincronizar centros de custo:', err);
      showAlert('error', err.message || 'Erro ao sincronizar centros de custo com a Matriz.');
    } finally {
      setIsSyncingWithMatrix(false);
    }
  };

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

  const fetchCostCenters = async () => {
    try {
      const res = await api.getCostCenters();
      setCostCenters(res.costCenters || []);
    } catch (err: any) {
      console.error('Erro ao carregar centros de custo:', err);
    }
  };

  const handleOpenCreateCC = () => {
    setEditingCC(null);
    setCcFormData({ codigo: '', nome: '', descricao: '', responsavel: '', ativo: true });
    setShowCCModal(true);
  };

  const handleOpenEditCC = (cc: CostCenter) => {
    setEditingCC(cc);
    setCcFormData({
      codigo: cc.codigo,
      nome: cc.nome,
      descricao: cc.descricao || '',
      responsavel: cc.responsavel || '',
      ativo: cc.ativo,
    });
    setShowCCModal(true);
  };

  const handleSaveCC = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCC) {
        await api.updateCostCenter(editingCC.id, ccFormData);
        showAlert('success', 'Centro de Custo atualizado com sucesso!');
      } else {
        await api.createCostCenter(ccFormData);
        showAlert('success', 'Centro de Custo cadastrado com sucesso!');
      }
      setShowCCModal(false);
      await fetchCostCenters();
    } catch (err: any) {
      showAlert('error', err.message || 'Erro ao salvar centro de custo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteCC = async () => {
    if (!ccToDelete) return;
    setIsSubmitting(true);
    try {
      await api.deleteCostCenter(ccToDelete.id);
      showAlert('success', `Centro de Custo ${ccToDelete.codigo} - ${ccToDelete.nome} excluído com sucesso.`);
      setCcToDelete(null);
      await fetchCostCenters();
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.message || 'Erro ao excluir centro de custo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCostCenters = costCenters.filter((cc) => {
    const term = ccSearchTerm.toLowerCase();
    return cc.codigo.toLowerCase().includes(term) || cc.nome.toLowerCase().includes(term) || (cc.descricao && cc.descricao.toLowerCase().includes(term));
  });

  const handleGeneratePasswordForUser = async (user: User) => {
    try {
      setIsSubmitting(true);
      const res = await api.generateTempPassword(user.id);
      setTempPasswordModal({ user, tempPassword: res.tempPassword });
      await fetchUsers();
    } catch (e: any) {
      showAlert('error', e.message || 'Erro ao gerar senha');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCostCenters();
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
    const userCCs = [
      u.centroCusto,
      ...(Array.isArray(u.centrosCusto) ? u.centrosCusto : []),
    ].filter(Boolean).join(' ');

    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userCCs.toLowerCase().includes(searchTerm.toLowerCase());

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
    const defaultCC = costCenters.length > 0 ? `${costCenters[0].codigo} - ${costCenters[0].nome}` : 'CC-1010 - Recursos Humanos';
    setFormData({
      name: '',
      email: '',
      googleEmail: '',
      cargo: '',
      area: '',
      centroCusto: defaultCC,
      centrosCusto: [defaultCC],
      status: 'ATIVO',
      roles: ['SOLICITANTE'],
      password: '',
    });
    setShowFormPassword(false);
    setShowCreateModal(true);
  };

  // Open Edit User Modal
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    const existingCCs = Array.isArray(user.centrosCusto) && user.centrosCusto.length > 0
      ? [...user.centrosCusto]
      : (user.centroCusto ? [user.centroCusto] : []);

    setFormData({
      name: user.name,
      email: user.email,
      googleEmail: user.googleEmail || '',
      cargo: user.cargo,
      area: user.area,
      centroCusto: user.centroCusto || (existingCCs[0] || ''),
      centrosCusto: existingCCs,
      status: user.status as 'ATIVO' | 'INATIVO',
      roles: [...user.roles],
      password: '',
    });
    setShowFormPassword(false);
  };

  // Open Permissions-only Modal
  const handleOpenPermissions = (user: User) => {
    setPermissionsUser(user);
    const existingCCs = Array.isArray(user.centrosCusto) && user.centrosCusto.length > 0
      ? [...user.centrosCusto]
      : (user.centroCusto ? [user.centroCusto] : []);

    setFormData({
      name: user.name,
      email: user.email,
      googleEmail: user.googleEmail || '',
      cargo: user.cargo,
      area: user.area,
      centroCusto: user.centroCusto || (existingCCs[0] || ''),
      centrosCusto: existingCCs,
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
    if (!formData.password || formData.password.trim().length < 6) {
      showAlert('error', 'A senha de acesso é obrigatória e deve possuir no mínimo 6 caracteres.');
      return;
    }
    if (formData.roles.length === 0) {
      showAlert('error', 'Atribua ao menos uma permissão ao usuário.');
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryCC = formData.centroCusto || (formData.centrosCusto.length > 0 ? formData.centrosCusto[0] : 'CC-1010 - Recursos Humanos');
      const finalCCs = formData.centrosCusto.length > 0 ? formData.centrosCusto : [primaryCC];
      await api.createUser({
        ...formData,
        centroCusto: primaryCC,
        centrosCusto: finalCCs,
      });
      showAlert('success', `Usuário ${formData.name} cadastrado com sucesso com senha de acesso!`);
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
    if (formData.password && formData.password.trim().length > 0 && formData.password.trim().length < 6) {
      showAlert('error', 'A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }
    if (formData.roles.length === 0) {
      showAlert('error', 'O usuário precisa ter ao menos uma permissão ativa.');
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryCC = formData.centroCusto || (formData.centrosCusto.length > 0 ? formData.centrosCusto[0] : 'CC-1010 - Recursos Humanos');
      const finalCCs = formData.centrosCusto.length > 0 ? formData.centrosCusto : [primaryCC];
      await api.updateUser(editingUser.id, {
        ...formData,
        centroCusto: primaryCC,
        centrosCusto: finalCCs,
      });
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

      {/* Sub-navigation tabs: Users vs Cost Centers */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('USERS')}
          className={`px-6 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'USERS'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários & Colaboradores ({filteredUsers.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('COST_CENTERS')}
          className={`px-6 py-3 text-xs font-bold border-b-2 transition flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'COST_CENTERS'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Centros de Custo ({costCenters.length})</span>
        </button>
      </div>

      {/* TAB 1: USERS & COLLABORATORS */}
      <div className={activeSubTab === 'USERS' ? 'space-y-6 block' : 'hidden'}>
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
                              {user.passwordResetRequested && (
                                <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-bold" title="O usuário solicitou redefinição de senha">
                                  Reset de Senha Solicitado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{user.email}</span>
                            </div>
                            {user.googleEmail && user.googleEmail !== user.email && (
                              <div className="flex items-center space-x-1.5 text-[10px] text-blue-600 font-medium mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                                <span>Google SSO: {user.googleEmail}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cargo & Area & Centros de Custo */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{user.cargo}</p>
                        <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{user.area}</span>
                        </div>
                        {/* Cost Center Badges */}
                        <div className="flex flex-wrap gap-1 mt-1.5 max-w-xs">
                          {Array.isArray(user.centrosCusto) && user.centrosCusto.length > 0 ? (
                            user.centrosCusto.map((ccItem, idx) => {
                              const isPrimary = ccItem === user.centroCusto || idx === 0;
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center space-x-1 font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                                    isPrimary
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                  title={isPrimary ? 'Centro de Custo Principal' : 'Centro de Custo Adicional'}
                                >
                                  <span>{ccItem}</span>
                                  {isPrimary && <span className="text-[8px] text-blue-500 font-sans">★</span>}
                                </span>
                              );
                            })
                          ) : user.centroCusto ? (
                            <span className="inline-block font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                              {user.centroCusto}
                            </span>
                          ) : null}
                        </div>
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
                          {/* Generate Temp Password */}
                          <button
                            onClick={() => handleGeneratePasswordForUser(user)}
                            title="Gerar Senha Temporária"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer relative"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            {user.passwordResetRequested && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            )}
                          </button>

                          {/* Edit Full Profile */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            title="Editar dados e permissões"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => setUserToDelete(user)}
                            title="Remover usuário"
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
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
      </div>

      {/* TAB 2: COST CENTERS MANAGEMENT */}
      <div className={activeSubTab === 'COST_CENTERS' ? 'space-y-6 block' : 'hidden'}>
        <div className="space-y-6">
          {/* Header Actions & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, nome ou descrição do centro de custo..."
                value={ccSearchTerm}
                onChange={(e) => setCcSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSyncWithMatrix}
                disabled={isSyncingWithMatrix}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 shadow-2xs transition cursor-pointer disabled:opacity-50"
                title="Extrair todos os cargos habilitados da Matriz de Alçadas e gerar/sincronizar centros de custo automaticamente"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isSyncingWithMatrix ? 'Sincronizando...' : 'Sincronizar com Matriz'}</span>
              </button>

              <button
                onClick={handleOpenCreateCC}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>+ Novo Centro de Custo</span>
              </button>
            </div>
          </div>

          {/* Cost Centers Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Centros de Custo Cadastrados</h3>
                <p className="text-xs text-slate-500">
                  Lista oficial de centros de custo vinculados às requisições e colaboradores da instituição.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-mono text-xs font-bold">
                Total: {filteredCostCenters.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Nome & Descrição</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCostCenters.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Nenhum centro de custo encontrado com os critérios de busca.
                      </td>
                    </tr>
                  ) : (
                    filteredCostCenters.map((cc) => (
                      <tr key={cc.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {cc.codigo}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{cc.nome}</p>
                          {cc.descricao && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{cc.descricao}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {cc.responsavel || <span className="text-slate-400 italic">Não definido</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              cc.ativo
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cc.ativo ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            <span>{cc.ativo ? 'Ativo' : 'Inativo'}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEditCC(cc)}
                              title="Editar Centro de Custo"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setCcToDelete(cc)}
                              title="Excluir Centro de Custo"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
                    <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                      <span>E-mail Google / SSO (Opcional)</span>
                      <span className="text-[10px] font-normal text-blue-600">Para login via Google</span>
                    </label>
                    <input
                      type="email"
                      placeholder="mariana@gmail.com ou mariana.silva@sbsaude.com.br"
                      value={formData.googleEmail || ''}
                      onChange={(e) => setFormData({ ...formData, googleEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white placeholder-slate-400"
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

                  <div className="sm:col-span-2 space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <label className="block text-slate-800 font-semibold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Centros de Custo Vinculados <span className="text-red-500">*</span></span>
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {formData.centrosCusto.length} selecionado(s) • Clique na estrela ★ para definir o Principal
                      </span>
                    </div>

                    {/* Selected Cost Centers Chips */}
                    {formData.centrosCusto.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-md border border-slate-200 min-h-[38px] items-center">
                        {formData.centrosCusto.map((ccItem) => {
                          const isPrimary = ccItem === formData.centroCusto || (formData.centrosCusto[0] === ccItem && !formData.centroCusto);
                          return (
                            <span
                              key={ccItem}
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                                isPrimary
                                  ? 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-300 font-bold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryCostCenter(ccItem)}
                                title={isPrimary ? 'Centro de Custo Principal' : 'Clique para definir como Principal'}
                                className={`text-[12px] cursor-pointer hover:scale-110 transition ${
                                  isPrimary ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                                }`}
                              >
                                ★
                              </button>
                              <span>{ccItem}</span>
                              {isPrimary && (
                                <span className="text-[9px] bg-blue-200 text-blue-800 px-1 py-0.2 rounded font-bold uppercase">
                                  Principal
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleCostCenter(ccItem)}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition cursor-pointer"
                                title="Remover este centro de custo do usuário"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800">
                        Nenhum centro de custo selecionado. Selecione ao menos um no menu abaixo.
                      </div>
                    )}

                    {/* Add Cost Center Dropdown */}
                    <div className="flex items-center gap-2 pt-1">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleToggleCostCenter(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 text-xs font-medium cursor-pointer"
                      >
                        <option value="">+ Adicionar ou alternar Centro de Custo...</option>
                        {costCenters.filter(c => c.ativo).map((cc) => {
                          const val = `${cc.codigo} - ${cc.nome}`;
                          const isSelected = formData.centrosCusto.includes(val);
                          return (
                            <option key={cc.id} value={val}>
                              {isSelected ? '✓ ' : '+ '} {cc.codigo} — {cc.nome} ({cc.responsavel || 'Sem Resp.'})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Senha de Acesso Inicial */}
                  <div className="sm:col-span-2 bg-red-50/40 p-3 rounded-lg border border-red-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-800 font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-red-600" />
                        <span>Senha de Acesso ao Sistema <span className="text-red-500">*</span></span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[11px] text-red-600 hover:text-red-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Gerar Senha Segura</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 6 caracteres (Ex: SbSaude@2026)"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        title={showFormPassword ? 'Ocultar' : 'Exibir'}
                      >
                        {showFormPassword ? <X className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Obrigatória para o primeiro login do usuário no sistema corporativo (mínimo de 6 caracteres).
                    </p>
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
                    <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                      <span>E-mail Google / SSO (Opcional)</span>
                      <span className="text-[10px] font-normal text-blue-600">Para login via Google</span>
                    </label>
                    <input
                      type="email"
                      placeholder="mariana@gmail.com ou mariana.silva@sbsaude.com.br"
                      value={formData.googleEmail || ''}
                      onChange={(e) => setFormData({ ...formData, googleEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white placeholder-slate-400"
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

                  <div className="sm:col-span-2 space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <label className="block text-slate-800 font-semibold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Centros de Custo Vinculados <span className="text-red-500">*</span></span>
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {formData.centrosCusto.length} selecionado(s) • Clique na estrela ★ para definir o Principal
                      </span>
                    </div>

                    {/* Selected Cost Centers Chips */}
                    {formData.centrosCusto.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-md border border-slate-200 min-h-[38px] items-center">
                        {formData.centrosCusto.map((ccItem) => {
                          const isPrimary = ccItem === formData.centroCusto || (formData.centrosCusto[0] === ccItem && !formData.centroCusto);
                          return (
                            <span
                              key={ccItem}
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
                                isPrimary
                                  ? 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-300 font-bold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryCostCenter(ccItem)}
                                title={isPrimary ? 'Centro de Custo Principal' : 'Clique para definir como Principal'}
                                className={`text-[12px] cursor-pointer hover:scale-110 transition ${
                                  isPrimary ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                                }`}
                              >
                                ★
                              </button>
                              <span>{ccItem}</span>
                              {isPrimary && (
                                <span className="text-[9px] bg-blue-200 text-blue-800 px-1 py-0.2 rounded font-bold uppercase">
                                  Principal
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleCostCenter(ccItem)}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition cursor-pointer"
                                title="Remover este centro de custo do usuário"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800">
                        Nenhum centro de custo selecionado. Selecione ao menos um no menu abaixo.
                      </div>
                    )}

                    {/* Add Cost Center Dropdown */}
                    <div className="flex items-center gap-2 pt-1">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleToggleCostCenter(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 text-xs font-medium cursor-pointer"
                      >
                        <option value="">+ Adicionar ou alternar Centro de Custo...</option>
                        {costCenters.filter(c => c.ativo).map((cc) => {
                          const val = `${cc.codigo} - ${cc.nome}`;
                          const isSelected = formData.centrosCusto.includes(val);
                          return (
                            <option key={cc.id} value={val}>
                              {isSelected ? '✓ ' : '+ '} {cc.codigo} — {cc.nome} ({cc.responsavel || 'Sem Resp.'})
                            </option>
                          );
                        })}
                      </select>
                    </div>
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

                  {/* Redefinição de Senha (Opcional) */}
                  <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-800 font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Redefinir Senha de Acesso (Opcional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Gerar Nova Senha</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        placeholder="Deixe em branco para manter a senha atual do usuário"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        title={showFormPassword ? 'Ocultar' : 'Exibir'}
                      >
                        {showFormPassword ? <X className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Preencha apenas se desejar redefinir as credenciais deste colaborador (mínimo de 6 caracteres).
                    </p>
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: EXIBIÇÃO DE SENHA TEMPORÁRIA                            */}
      {/* ------------------------------------------------------------- */}
      {tempPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center space-x-3 text-blue-600">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Senha Temporária Gerada
                </h3>
                <p className="text-[11px] text-slate-500">
                  Entregue esta senha ao usuário.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-800">Usuário: {tempPasswordModal.user.name}</p>
              <p className="text-slate-600">E-mail: {tempPasswordModal.user.email}</p>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
              <p className="text-slate-500 mb-2 font-semibold">Nova Senha Temporária:</p>
              <p className="text-2xl font-mono font-black text-slate-900 tracking-widest">{tempPasswordModal.tempPassword}</p>
            </div>

            <p className="text-slate-600 leading-relaxed">
              O usuário deverá utilizar esta senha para acessar o sistema. No primeiro login, será exigida a criação obrigatória de uma nova senha pessoal.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(tempPasswordModal.tempPassword);
                  showAlert('success', 'Senha copiada para a área de transferência.');
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition"
              >
                Copiar Senha
              </button>
              <button
                type="button"
                onClick={() => setTempPasswordModal(null)}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-1.5"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CADASTRO / EDIÇÃO DE CENTRO DE CUSTO                   */}
      {/* ------------------------------------------------------------- */}
      {showCCModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingCC ? 'Editar Centro de Custo' : 'Cadastrar Novo Centro de Custo'}
              </h3>
              <button
                onClick={() => setShowCCModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCC} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Código do Centro de Custo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CC-8080"
                  value={ccFormData.codigo}
                  onChange={(e) => setCcFormData({ ...ccFormData, codigo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nome / Departamento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Inovação & Inteligência Artificial"
                  value={ccFormData.nome}
                  onChange={(e) => setCcFormData({ ...ccFormData, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Breve descrição da finalidade orçamentária..."
                  value={ccFormData.descricao}
                  onChange={(e) => setCcFormData({ ...ccFormData, descricao: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Responsável / Gestor</label>
                <input
                  type="text"
                  placeholder="Ex: Ramon Reis"
                  value={ccFormData.responsavel}
                  onChange={(e) => setCcFormData({ ...ccFormData, responsavel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="ccAtivo"
                  checked={ccFormData.ativo}
                  onChange={(e) => setCcFormData({ ...ccFormData, ativo: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="ccAtivo" className="font-medium text-slate-700 cursor-pointer">
                  Centro de Custo Ativo e Disponível para Requisições
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCCModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
                >
                  {isSubmitting ? 'Salvando...' : editingCC ? 'Salvar Alterações' : 'Cadastrar Centro de Custo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE CENTRO DE CUSTO            */}
      {/* ------------------------------------------------------------- */}
      {ccToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Excluir Centro de Custo
                </h3>
                <p className="text-[11px] text-slate-500">
                  Esta ação remove o centro de custo do catálogo corporativo.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-800 font-mono">{ccToDelete.codigo} &bull; {ccToDelete.nome}</p>
              {ccToDelete.descricao && <p className="text-slate-600">{ccToDelete.descricao}</p>}
              {ccToDelete.responsavel && <p className="text-slate-500">Responsável: {ccToDelete.responsavel}</p>}
            </div>

            <p className="text-slate-600 leading-relaxed">
              Tem certeza de que deseja excluir este Centro de Custo? Ele não estará mais disponível para novas requisições e cadastros.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCcToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCC}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm shadow-red-200 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
