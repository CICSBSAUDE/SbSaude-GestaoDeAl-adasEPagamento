import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MatrizAlcada, RegraAlcada, RiskLevel, User } from '../types';
import { ProcessCatalogModal } from './ProcessCatalogModal';
import {
  TableProperties,
  Layers,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  History,
  Sparkles,
  Shield,
  Download,
  Info,
  X,
  Check,
  ArrowRight,
  Sliders,
  Filter,
  Save,
  Users,
  UserCheck,
  UserPlus,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  Database,
  Zap,
  ShieldCheck,
  Copy,
  Terminal,
  FileCode,
  ExternalLink,
} from 'lucide-react';

export const MatrixManagementView: React.FC = () => {
  const { currentUser } = useAuth();

  const [matrices, setMatrices] = useState<MatrizAlcada[]>(() => {
    try {
      const cached = localStorage.getItem('sb_cached_matrices');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [selectedMatrixId, setSelectedMatrixId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRisk, setSelectedRisk] = useState<string>('TODOS');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('TODOS');
  const [selectedNaturezaFilter, setSelectedNaturezaFilter] = useState<string>('TODAS');

  // Supabase Persistence & Row-level states
  const [rowSavingStatus, setRowSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [isSavingFullMatrix, setIsSavingFullMatrix] = useState<boolean>(false);
  const [showBatchMenu, setShowBatchMenu] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('pt-BR'));

  // Process Catalog Modal
  const [showProcessModal, setShowProcessModal] = useState<boolean>(false);

  // Supabase Architecture & Schema Modal
  const [showSupabaseModal, setShowSupabaseModal] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loadingDbStatus, setLoadingDbStatus] = useState<boolean>(false);
  const [migrating, setMigrating] = useState<boolean>(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message?: string; error?: string; hint?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Success message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal for new version
  const [showNewVersionModal, setShowNewVersionModal] = useState<boolean>(false);
  const [novaVersao, setNovaVersao] = useState<string>('Rev. 01');
  const [novoTitulo, setNovoTitulo] = useState<string>('Política de Alçada — Revisão 2026/2028');
  const [historicoAlteracoes, setHistoricoAlteracoes] = useState<string>(
    'Atualização dos tetos mensais e alçadas de suprimentos e TI.'
  );

  // Modal for editing a single rule (Alçadas Responsáveis & Cargos Habilitados)
  const [editingRule, setEditingRule] = useState<RegraAlcada | null>(null);
  const [editAlcadas, setEditAlcadas] = useState<(1 | 2 | 3 | 4)[]>([1, 2, 3, 4]);
  const [editCargosSolicitante, setEditCargosSolicitante] = useState<string[]>([]);
  const [editCargos1, setEditCargos1] = useState<string[]>([]);
  const [editCargos2, setEditCargos2] = useState<string[]>([]);
  const [editCargos3, setEditCargos3] = useState<string[]>([]);
  const [editCargos4, setEditCargos4] = useState<string[]>([]);
  const [editAlcadaPorEvento, setEditAlcadaPorEvento] = useState<number>(0);
  const [editTetoMensal, setEditTetoMensal] = useState<number>(0);
  const [editRisco, setEditRisco] = useState<RiskLevel>('MEDIO');
  const [editObservacoes, setEditObservacoes] = useState<string>('');
  const [editRequerJustificativa, setEditRequerJustificativa] = useState<boolean>(true);

  // Input states for adding new custom cargos
  const [inputCargoSolicitante, setInputCargoSolicitante] = useState<string>('');
  const [inputCargo1, setInputCargo1] = useState<string>('');
  const [inputCargo2, setInputCargo2] = useState<string>('');
  const [inputCargo3, setInputCargo3] = useState<string>('');
  const [inputCargo4, setInputCargo4] = useState<string>('');

  const [savingRule, setSavingRule] = useState<boolean>(false);

  const fetchMatricesAndUsers = async () => {
    setLoading(true);
    try {
      const [matRes, userRes] = await Promise.all([
        api.getMatrixVersions(),
        api.getUsers().catch(() => ({ users: [] })),
      ]);
      if (matRes.matrices && matRes.matrices.length > 0) {
        setMatrices(matRes.matrices);
        try {
          localStorage.setItem('sb_cached_matrices', JSON.stringify(matRes.matrices));
        } catch (_) {}
      }
      setUsers(userRes.users || []);
      const active = (matRes.matrices || []).find((m) => m.status === 'VIGENTE') || (matRes.matrices || [])[0];
      if (active) setSelectedMatrixId(active.id);
    } catch (err) {
      console.error('Failed to load matrices', err);
      try {
        const cached = localStorage.getItem('sb_cached_matrices');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setMatrices(parsed);
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatricesAndUsers();
  }, []);

  const selectedMatrix = matrices.find((m) => m.id === selectedMatrixId) || matrices[0];

  // Derive unique standard suggestions from users and existing rules
  const uniqueCargosFromUsers: string[] = Array.from(
    new Set(
      users
        .map((u) => u.cargo?.trim())
        .filter((c): c is string => Boolean(c && c.length > 2))
    )
  );

  const standardSuggestions: Record<1 | 2 | 3 | 4, string[]> = {
    1: [
      'Supervisor de Credenciamento',
      'Supervisora de Credenciamento',
      'Coordenação Assistencial',
      'Coordenação de Gente e Gestão',
      'Coordenação de Marketing',
      'Coordenação de TI',
      'Coordenação de Operações',
      'Supervisor Contábil / Financeiro',
      'Coordenação Jurídica',
    ],
    2: [
      'Gerência de Núcleo Assistencial',
      'Gerente de Credenciamento e Núcleo Assistencial',
      'Gerente de Gente e Gestão',
      'Gerente de Marketing e Comercial',
      'Gerente Financeiro / Controladoria',
      'Gerente de TI / Sistemas',
      'Gerência de Operações e Suprimentos',
      'Gerente Jurídico e Compliance',
    ],
    3: [
      'Diretoria de Operações',
      'Diretora de Operações',
      'Diretoria Financeira',
      'Diretor Financeiro',
      'Diretoria de Governança e SGQ',
    ],
    4: [
      'Diretoria Executiva / Conselho',
      'Diretoria Executiva',
      'Diretora Executiva',
      'Diretor Executivo',
      'Conselho de Administração',
      'Presidência',
    ],
  };

  const standardSolicitanteSuggestions = [
    'Todos os Colaboradores',
    'Assistente / Analista Administrativo',
    'Coordenação / Supervisão',
    'Gerência de Área',
    'Diretoria da Área',
    'Comprador / Suprimentos',
    'Recursos Humanos / DP',
    'Tecnologia da Informação',
    'Marketing e Comunicação',
    'Jurídico e Compliance',
  ];

  const getEffectiveAlcadas = (regra: RegraAlcada): (1 | 2 | 3 | 4)[] => {
    if (regra.alcadasObrigatorias && Array.isArray(regra.alcadasObrigatorias)) {
      return [...regra.alcadasObrigatorias].sort((a, b) => a - b);
    }
    const detected: (1 | 2 | 3 | 4)[] = [];
    if ((regra.cargosHabilitados1 || []).length > 0) detected.push(1);
    if ((regra.cargosHabilitados2 || []).length > 0) detected.push(2);
    if ((regra.cargosHabilitados3 || []).length > 0) detected.push(3);
    if ((regra.cargosHabilitados4 || []).length > 0) detected.push(4);
    if (detected.length === 0) {
      const max = (regra.nivelMaximoRequerido || 1) as 1 | 2 | 3 | 4;
      for (let i = 1; i <= max; i++) detected.push(i as 1 | 2 | 3 | 4);
    }
    return detected.sort((a, b) => a - b);
  };

  const filteredRules = (selectedMatrix?.regras || []).filter((r) => {
    if (selectedRisk !== 'TODOS' && r.risco !== selectedRisk) return false;
    
    if (selectedTierFilter !== 'TODOS') {
      const alcadas = getEffectiveAlcadas(r);
      const tierNum = Number(selectedTierFilter) as 1 | 2 | 3 | 4;
      if (!alcadas.includes(tierNum)) return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = r.processoNome.toLowerCase().includes(q);
      const matchId = r.processoId.toLowerCase().includes(q);
      const matchCargos1 = (r.cargosHabilitados1 || []).join(' ').toLowerCase().includes(q);
      const matchCargos2 = (r.cargosHabilitados2 || []).join(' ').toLowerCase().includes(q);
      const matchCargos3 = (r.cargosHabilitados3 || []).join(' ').toLowerCase().includes(q);
      const matchCargos4 = (r.cargosHabilitados4 || []).join(' ').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchCargos1 && !matchCargos2 && !matchCargos3 && !matchCargos4) return false;
    }
    return true;
  });

  const handleOpenEditRule = (regra: RegraAlcada) => {
    const currentAlcadas = getEffectiveAlcadas(regra);
    setEditingRule(regra);
    setEditAlcadas(currentAlcadas.length > 0 ? currentAlcadas : [1, 2, 3, 4]);
    
    // Parse solicitantes: from cargosHabilitadosSolicitante or fallback to splitting cargoHabilitadoDocumento
    let solicitantes: string[] = [];
    if (regra.cargosHabilitadosSolicitante && regra.cargosHabilitadosSolicitante.length > 0) {
      solicitantes = [...regra.cargosHabilitadosSolicitante];
    } else if (regra.cargoHabilitadoDocumento) {
      solicitantes = regra.cargoHabilitadoDocumento
        .split(/[,;/+]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    setEditCargosSolicitante(solicitantes);

    setEditCargos1([...(regra.cargosHabilitados1 || [])]);
    setEditCargos2([...(regra.cargosHabilitados2 || [])]);
    setEditCargos3([...(regra.cargosHabilitados3 || [])]);
    setEditCargos4([...(regra.cargosHabilitados4 || [])]);
    setEditAlcadaPorEvento(regra.alçadaPorEvento || 0);
    setEditTetoMensal(regra.tetoMensal || 0);
    setEditRisco(regra.risco || 'MEDIO');
    setEditObservacoes(regra.observacoes || '');
    setEditRequerJustificativa(regra.requerJustificativaSeAcimaLimite !== false);

    setInputCargoSolicitante('');
    setInputCargo1('');
    setInputCargo2('');
    setInputCargo3('');
    setInputCargo4('');
  };

  const handleToggleAlcada = (tier: 1 | 2 | 3 | 4) => {
    setEditAlcadas((prev) => {
      let next: (1 | 2 | 3 | 4)[];
      if (prev.includes(tier)) {
        next = prev.filter((t) => t !== tier);
      } else {
        next = [...prev, tier].sort((a, b) => a - b);
      }
      return next;
    });
  };

  const handleAddCargo = (tier: 0 | 1 | 2 | 3 | 4, cargo: string) => {
    const trimmed = cargo.trim();
    if (!trimmed) return;

    if (tier === 0) {
      if (!editCargosSolicitante.includes(trimmed)) {
        setEditCargosSolicitante([...editCargosSolicitante, trimmed]);
      }
      setInputCargoSolicitante('');
    } else if (tier === 1) {
      if (!editCargos1.includes(trimmed)) setEditCargos1([...editCargos1, trimmed]);
      setInputCargo1('');
    } else if (tier === 2) {
      if (!editCargos2.includes(trimmed)) setEditCargos2([...editCargos2, trimmed]);
      setInputCargo2('');
    } else if (tier === 3) {
      if (!editCargos3.includes(trimmed)) setEditCargos3([...editCargos3, trimmed]);
      setInputCargo3('');
    } else if (tier === 4) {
      if (!editCargos4.includes(trimmed)) setEditCargos4([...editCargos4, trimmed]);
      setInputCargo4('');
    }
  };

  const handleRemoveCargo = (tier: 0 | 1 | 2 | 3 | 4, cargoToRemove: string) => {
    if (tier === 0) setEditCargosSolicitante(editCargosSolicitante.filter((c) => c !== cargoToRemove));
    else if (tier === 1) setEditCargos1(editCargos1.filter((c) => c !== cargoToRemove));
    else if (tier === 2) setEditCargos2(editCargos2.filter((c) => c !== cargoToRemove));
    else if (tier === 3) setEditCargos3(editCargos3.filter((c) => c !== cargoToRemove));
    else if (tier === 4) setEditCargos4(editCargos4.filter((c) => c !== cargoToRemove));
  };

  // Quick direct toggle of alçadas (N1, N2, N3, N4) with immediate Supabase persistence
  const handleQuickToggleAlcada = async (regra: RegraAlcada, tier: 1 | 2 | 3 | 4) => {
    if (!selectedMatrix) return;
    const currentAlcadas = getEffectiveAlcadas(regra);
    let newAlcadas: (1 | 2 | 3 | 4)[];
    if (currentAlcadas.includes(tier)) {
      newAlcadas = currentAlcadas.filter((t) => t !== tier);
    } else {
      newAlcadas = [...currentAlcadas, tier].sort((a, b) => a - b);
    }
    const maxNivel = newAlcadas.length > 0 ? Math.max(...newAlcadas) : 1;

    const payload = {
      alcadasObrigatorias: newAlcadas,
      nivelMaximoRequerido: maxNivel,
      cargosHabilitados1: newAlcadas.includes(1) ? (regra.cargosHabilitados1 || ['Coordenação / Supervisão']) : [],
      cargosHabilitados2: newAlcadas.includes(2) ? (regra.cargosHabilitados2 || ['Gerência de Área']) : [],
      cargosHabilitados3: newAlcadas.includes(3) ? (regra.cargosHabilitados3 || ['Diretoria de Operações', 'Diretoria Financeira']) : [],
      cargosHabilitados4: newAlcadas.includes(4) ? (regra.cargosHabilitados4 || ['Diretoria Executiva / Conselho']) : [],
    };

    // Optimistic update in state
    setMatrices((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== selectedMatrix.id) return m;
        const updatedRegras = (m.regras || []).map((r) => {
          if (r.id === regra.id) {
            return { ...r, ...payload };
          }
          return r;
        });
        return { ...m, regras: updatedRegras };
      });
      try {
        localStorage.setItem('sb_cached_matrices', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setRowSavingStatus((prev) => ({ ...prev, [regra.id]: 'saving' }));

    try {
      const res = await api.updateMatrixRule(selectedMatrix.id, regra.id, payload);
      if (res && res.matrix) {
        setMatrices((prev) => {
          const updated = prev.map((m) => (m.id === res.matrix.id ? res.matrix : m));
          try {
            localStorage.setItem('sb_cached_matrices', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
      }
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
      setRowSavingStatus((prev) => ({ ...prev, [regra.id]: 'saved' }));
      setTimeout(() => {
        setRowSavingStatus((prev) => {
          const next = { ...prev };
          delete next[regra.id];
          return next;
        });
      }, 3500);
    } catch (err: any) {
      console.error('Erro ao salvar alçada no Supabase:', err);
      setRowSavingStatus((prev) => ({ ...prev, [regra.id]: 'error' }));
      await fetchMatricesAndUsers();
      alert(`Falha ao salvar no banco Supabase: ${err.message}`);
    }
  };

  // Batch Preset configuration for all rules with direct Supabase save
  const handleBatchAlcadaPreset = async (preset: 'remove-n4' | 'default-n1-n2-n3' | 'default-n2-n3' | 'exempt') => {
    if (!selectedMatrix) return;
    let confirmMsg = '';
    if (preset === 'remove-n4') {
      confirmMsg = 'Deseja remover a 4ª Alçada (N4 - Diretoria Executiva) de todos os processos da matriz e salvar no Supabase?';
    } else if (preset === 'default-n1-n2-n3') {
      confirmMsg = 'Deseja definir a cadeia sequencial padrão N1 ➔ N2 ➔ N3 para todos os processos e salvar no Supabase?';
    } else if (preset === 'default-n2-n3') {
      confirmMsg = 'Deseja definir a cadeia sequencial N2 ➔ N3 para todos os processos e salvar no Supabase?';
    } else if (preset === 'exempt') {
      confirmMsg = 'Deseja isentar todos os processos de aprovação hierárquica (direto para conferência Financeira) e salvar no Supabase?';
    }

    if (!confirm(confirmMsg)) return;

    setShowBatchMenu(false);
    setLoading(true);

    try {
      const updates = (selectedMatrix.regras || []).map((r) => {
        let newAlcadas: (1 | 2 | 3 | 4)[] = [];
        const current = getEffectiveAlcadas(r);
        if (preset === 'remove-n4') {
          newAlcadas = current.filter((t) => t !== 4);
          if (newAlcadas.length === 0) newAlcadas = [1, 2, 3];
        } else if (preset === 'default-n1-n2-n3') {
          newAlcadas = [1, 2, 3];
        } else if (preset === 'default-n2-n3') {
          newAlcadas = [2, 3];
        } else if (preset === 'exempt') {
          newAlcadas = [];
        }

        const maxNivel = newAlcadas.length > 0 ? Math.max(...newAlcadas) : 1;

        return {
          ruleId: r.id,
          data: {
            alcadasObrigatorias: newAlcadas,
            nivelMaximoRequerido: maxNivel,
            cargosHabilitados1: newAlcadas.includes(1) ? (r.cargosHabilitados1 || ['Coordenação / Supervisão']) : [],
            cargosHabilitados2: newAlcadas.includes(2) ? (r.cargosHabilitados2 || ['Gerência de Área']) : [],
            cargosHabilitados3: newAlcadas.includes(3) ? (r.cargosHabilitados3 || ['Diretoria de Operações', 'Diretoria Financeira']) : [],
            cargosHabilitados4: newAlcadas.includes(4) ? (r.cargosHabilitados4 || ['Diretoria Executiva / Conselho']) : [],
          },
        };
      });

      const res = await api.updateMatrixBulkRules(selectedMatrix.id, updates);
      if (res && res.matrix) {
        setMatrices((prev) => {
          const updated = prev.map((m) => (m.id === res.matrix.id ? res.matrix : m));
          try {
            localStorage.setItem('sb_cached_matrices', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
      }
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
      setToastMessage(
        `Alçadas de todos os ${updates.length} processos da matriz POL-DIR-01 salvas com sucesso no Supabase!`
      );
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      console.error('Erro na atualização em lote:', err);
      alert(`Falha ao salvar no Supabase: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Explicit full matrix save to Supabase
  const handleSaveFullMatrixToSql = async () => {
    if (!selectedMatrix) return;
    setIsSavingFullMatrix(true);
    try {
      const res = await api.updateMatrix(selectedMatrix.id, selectedMatrix);
      if (res && res.matrix) {
        setMatrices((prev) => {
          const updated = prev.map((m) => (m.id === res.matrix.id ? res.matrix : m));
          try {
            localStorage.setItem('sb_cached_matrices', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
      }
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
      setToastMessage(
        `Matriz ${selectedMatrix.codigo} (${selectedMatrix.versao}) com todas as ${selectedMatrix.regras.length} regras sincronizada e mantida com sucesso no Supabase!`
      );
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      console.error('Erro ao salvar matriz no Supabase:', err);
      alert(`Falha ao salvar matriz no Supabase: ${err.message}`);
    } finally {
      setIsSavingFullMatrix(false);
    }
  };

  // Reload fresh data from Supabase bypassing any local cache
  const handleReloadFromSql = async () => {
    try {
      localStorage.removeItem('sb_cached_matrices');
    } catch (_) {}
    await fetchMatricesAndUsers();
    setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
    setToastMessage('Matriz de Alçadas recarregada diretamente do banco de dados!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenSupabaseModal = async () => {
    setShowSupabaseModal(true);
    setLoadingDbStatus(true);
    setMigrationResult(null);
    try {
      const status = await api.getDatabaseStatus();
      setDbStatus(status);
    } catch (err) {
      console.error('Falha ao obter status do Supabase', err);
    } finally {
      setLoadingDbStatus(false);
    }
  };

  const handleCopySql = async () => {
    try {
      const sql = await api.getDatabaseSchemaSql();
      await navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch (err) {
      console.error('Falha ao copiar SQL', err);
    }
  };

  const handleDownloadSql = async () => {
    try {
      const sql = await api.getDatabaseSchemaSql();
      const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'supabase_schema.sql';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Falha ao baixar SQL', err);
    }
  };

  const handleExecuteMigration = async () => {
    if (!window.confirm('Deseja executar as instruções DDL completas (tabelas, chaves compostas, índices e RLS) no Supabase?')) {
      return;
    }
    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await api.migrateSupabase();
      setMigrationResult(res);
      const updatedStatus = await api.getDatabaseStatus();
      setDbStatus(updatedStatus);
    } catch (err: any) {
      setMigrationResult({ success: false, error: err?.message || 'Falha ao executar migração' });
    } finally {
      setMigrating(false);
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule || !selectedMatrix) return;
    setSavingRule(true);

    try {
      const sortedAlcadas = [...editAlcadas].sort((a, b) => a - b);
      const maxNivel = sortedAlcadas.length > 0 ? Math.max(...sortedAlcadas) : 1;

      const payload = {
        alcadasObrigatorias: sortedAlcadas,
        cargosHabilitadosSolicitante: editCargosSolicitante,
        cargoHabilitadoDocumento: editCargosSolicitante.join(', ') || 'Todos os Colaboradores',
        cargosHabilitados1: sortedAlcadas.includes(1) ? editCargos1 : [],
        cargosHabilitados2: sortedAlcadas.includes(2) ? editCargos2 : [],
        cargosHabilitados3: sortedAlcadas.includes(3) ? editCargos3 : [],
        cargosHabilitados4: sortedAlcadas.includes(4) ? editCargos4 : [],
        alçadaPorEvento: Number(editAlcadaPorEvento),
        tetoMensal: Number(editTetoMensal),
        risco: editRisco,
        nivelMaximoRequerido: maxNivel,
        observacoes: editObservacoes,
        requerJustificativaSeAcimaLimite: editRequerJustificativa,
      };

      const res = await api.updateMatrixRule(selectedMatrix.id, editingRule.id, payload);

      // Update local state and reload matrices
      if (res && res.matrix) {
        setMatrices((prev) => {
          const updated = prev.map((m) => (m.id === res.matrix.id ? res.matrix : m));
          try {
            localStorage.setItem('sb_cached_matrices', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
      } else {
        setMatrices((prev) => {
          const updated = prev.map((m) => {
            if (m.id !== selectedMatrix.id) return m;
            const updatedRegras = (m.regras || []).map((r) => {
              if (r.id === editingRule.id) {
                return { ...r, ...payload };
              }
              return r;
            });
            return { ...m, regras: updatedRegras };
          });
          try {
            localStorage.setItem('sb_cached_matrices', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
      }

      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
      setToastMessage(
        `Regra do processo "${editingRule.processoNome}" salva e mantida no Supabase! Alçadas: ${sortedAlcadas.map((n) => `N${n}`).join(' ➔ ') || 'Isento'}. Solicitantes: ${editCargosSolicitante.length > 0 ? editCargosSolicitante.join(', ') : 'Todos os Colaboradores'}.`
      );
      setTimeout(() => setToastMessage(null), 6000);

      setEditingRule(null);
    } catch (err: any) {
      console.error('Failed to update matrix rule', err);
      alert(err.message || 'Erro ao salvar alterações da regra na matriz.');
    } finally {
      setSavingRule(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!novaVersao) return;
    try {
      await api.createMatrixVersion({
        baseMatrixId: selectedMatrix?.id,
        novaVersao,
        titulo: novoTitulo,
        historicoAlteracoes,
      });
      setShowNewVersionModal(false);
      await fetchMatricesAndUsers();
    } catch (e) {
      console.error('Failed to create matrix version', e);
    }
  };

  const handlePublish = async (matrixId: string) => {
    if (!confirm('Deseja publicar esta versão como a nova Matriz VIGENTE oficial da SB Saúde?')) return;
    try {
      await api.publishMatrix(matrixId);
      await fetchMatricesAndUsers();
    } catch (e) {
      console.error('Failed to publish matrix', e);
    }
  };

  const formatCurrency = (val: number) => {
    if (!val || val === 0) return 'Conforme alçada máxima';
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Versioning Bar */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
                <TableProperties className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Matriz de Alçadas e Delegação de Autoridade
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure as alçadas responsáveis (N1 a N4) e defina os cargos habilitados para a cadeia sequencial de cada processo.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Supabase Status Badge */}
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Supabase Sincronizado</span>
              <span className="text-[10px] text-emerald-600/70 font-mono">({lastSyncTime})</span>
            </div>

            {/* Process Catalog Button */}
            <button
              onClick={() => setShowProcessModal(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold border border-indigo-200 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Gerenciar catálogo de processos e objetos padronizados"
            >
              <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Catálogo de Processos</span>
            </button>

            {/* Supabase Architecture & Schema Button */}
            <button
              onClick={handleOpenSupabaseModal}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold border border-blue-200 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Visualizar arquitetura do Supabase, chaves compostas, índices de busca e políticas RLS"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Esquema Supabase (RLS)</span>
            </button>

            {/* Reload from DB Button */}
            <button
              onClick={handleReloadFromSql}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center space-x-1.5"
              title="Recarregar dados diretamente do banco de dados Supabase"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Recarregar do BD</span>
            </button>

            {/* Save Entire Matrix to DB Button */}
            {currentUser?.roles.includes('ADMINISTRADOR') && (
              <button
                onClick={handleSaveFullMatrixToSql}
                disabled={isSavingFullMatrix || loading}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-200 transition flex items-center space-x-1.5 disabled:opacity-50"
                title="Garantir persistência completa de todas as alçadas no Supabase"
              >
                {isSavingFullMatrix ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando no BD...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar no Supabase</span>
                  </>
                )}
              </button>
            )}

            {/* Version Selector */}
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-600">Versão:</span>
              <select
                value={selectedMatrixId}
                onChange={(e) => setSelectedMatrixId(e.target.value)}
                className="bg-transparent text-xs text-blue-600 font-bold focus:outline-none cursor-pointer"
              >
                {matrices.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white text-slate-800">
                    {m.codigo} — {m.versao} ({m.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Create Version Button */}
            {currentUser?.roles.includes('ADMINISTRADOR') && (
              <button
                onClick={() => setShowNewVersionModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Nova Revisão</span>
              </button>
            )}

            {/* Publish Button if draft */}
            {selectedMatrix?.status === 'RASCUNHO' && currentUser?.roles.includes('ADMINISTRADOR') && (
              <button
                onClick={() => handlePublish(selectedMatrix.id)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Publicar como VIGENTE</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Matrix Metadata Pill */}
        {selectedMatrix && (
          <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Status:</span>
              <span
                className={`font-bold ${
                  selectedMatrix.status === 'VIGENTE' ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {selectedMatrix.status}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Período de Vigência:</span>
              <span className="text-slate-800">
                {selectedMatrix.vigenciaInicio} a {selectedMatrix.vigenciaFim}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Aprovação Formal:</span>
              <span className="text-slate-800">{selectedMatrix.aprovacao}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Total de Processos:</span>
              <span className="font-mono font-bold text-blue-600">
                {selectedMatrix.regras?.length || 0} processos cadastrados
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por processo, código ou cargo habilitado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Risk Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">Risco:</span>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            >
              <option value="TODOS">Todos os Riscos</option>
              <option value="BAIXO">Baixo</option>
              <option value="MEDIO">Médio</option>
              <option value="ALTO">Alto</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">Alçada:</span>
            <select
              value={selectedTierFilter}
              onChange={(e) => setSelectedTierFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            >
              <option value="TODOS">Todas as Alçadas</option>
              <option value="1">Requer 1ª Alçada (N1)</option>
              <option value="2">Requer 2ª Alçada (N2)</option>
              <option value="3">Requer 3ª Alçada (N3)</option>
              <option value="4">Requer 4ª Alçada (N4)</option>
            </select>
          </div>

          <span className="text-xs text-slate-500 font-medium pl-1">
            {filteredRules.length} de {selectedMatrix?.regras?.length || 0} processos
          </span>
        </div>
      </div>

      {/* Matrix Rules Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 rounded-l-lg">Nº / PROCESSO</th>
                <th className="py-3.5 px-4">RISCO</th>
                <th className="py-3.5 px-4">ALÇADA POR EVENTO</th>
                <th className="py-3.5 px-4">TETO MENSAL</th>
                <th className="py-3.5 px-4">CARGOS HABILITADOS (SOLICITANTE)</th>
                <th className="py-3.5 px-4 relative rounded-r-lg">
                  <div className="flex items-center justify-between">
                    <span>ALÇADAS / CADEIA DE APROVAÇÃO</span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowBatchMenu(!showBatchMenu)}
                        className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center space-x-1 transition shadow-2xs cursor-pointer"
                        title="Configurações em lote com salvamento no Supabase"
                      >
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>Em Lote</span>
                      </button>

                      {showBatchMenu && (
                        <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-40 normal-case text-slate-700 font-normal">
                          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-800 border-b border-slate-100 flex items-center justify-between">
                            <span>Ações em Lote (Supabase)</span>
                            <button
                              type="button"
                              onClick={() => setShowBatchMenu(false)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="py-1 text-xs">
                            <button
                              type="button"
                              onClick={() => handleBatchAlcadaPreset('remove-n4')}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-800 transition flex items-start space-x-2"
                            >
                              <span className="text-amber-500 font-bold mt-0.5">•</span>
                              <div>
                                <p className="font-semibold text-[11px]">Remover 4ª Alçada (N4) de todos</p>
                                <p className="text-[10px] text-slate-500">Limita aprovações até Diretoria de Área (N3)</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBatchAlcadaPreset('default-n1-n2-n3')}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-800 transition flex items-start space-x-2"
                            >
                              <span className="text-blue-500 font-bold mt-0.5">•</span>
                              <div>
                                <p className="font-semibold text-[11px]">Definir padrão N1 ➔ N2 ➔ N3 em todos</p>
                                <p className="text-[10px] text-slate-500">Coordenação ➔ Gerência ➔ Diretoria</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBatchAlcadaPreset('default-n2-n3')}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-800 transition flex items-start space-x-2"
                            >
                              <span className="text-indigo-500 font-bold mt-0.5">•</span>
                              <div>
                                <p className="font-semibold text-[11px]">Definir padrão N2 ➔ N3 em todos</p>
                                <p className="text-[10px] text-slate-500">Apenas Gerência ➔ Diretoria</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBatchAlcadaPreset('exempt')}
                              className="w-full text-left px-3 py-2 hover:bg-amber-50 text-amber-800 transition flex items-start space-x-2 border-t border-slate-100"
                            >
                              <span className="text-amber-600 font-bold mt-0.5">•</span>
                              <div>
                                <p className="font-semibold text-[11px]">Isentar todos de alçada hierárquica</p>
                                <p className="text-[10px] text-amber-700/80">Envio direto para conferência Financeira</p>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRules.map((regra, idx) => {
                const alcadas = getEffectiveAlcadas(regra);
                const solicitantesList =
                  regra.cargosHabilitadosSolicitante && regra.cargosHabilitadosSolicitante.length > 0
                    ? regra.cargosHabilitadosSolicitante
                    : regra.cargoHabilitadoDocumento
                    ? [regra.cargoHabilitadoDocumento]
                    : ['Todos os Colaboradores'];

                return (
                  <tr
                    key={regra.id || idx}
                    className="hover:bg-blue-50/30 transition group"
                  >
                    {/* Process / Number */}
                    <td className="py-4 px-4 align-top">
                      <span className="font-mono text-blue-600 font-bold text-xs">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <p className="font-bold text-slate-900 mt-0.5 text-xs leading-snug">
                        {regra.processoNome}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono inline-block mt-0.5">
                        {regra.processoId}
                      </span>
                    </td>

                    {/* Risk Badge */}
                    <td className="py-4 px-4 align-top">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          regra.risco === 'ALTO'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : regra.risco === 'MEDIO'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {regra.risco}
                      </span>
                    </td>

                    {/* Alçada por evento */}
                    <td className="py-4 px-4 align-top font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(regra.alçadaPorEvento)}
                    </td>

                    {/* Teto mensal */}
                    <td className="py-4 px-4 align-top font-mono text-slate-700 whitespace-nowrap">
                      {formatCurrency(regra.tetoMensal)}
                    </td>

                    {/* Cargos Habilitados (Quem pode fazer a solicitação) */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1 max-w-xs">
                        <div className="flex items-center space-x-1.5 text-indigo-900 font-semibold text-[11px]">
                          <UserPlus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Quem pode solicitar:</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {solicitantesList.map((solic, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-block px-2 py-0.5 rounded-md bg-indigo-50/80 text-indigo-800 border border-indigo-200/80 text-[11px] font-medium leading-tight"
                            >
                              {solic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Alçadas Responsáveis e Cadeia de Aprovação - Interativa e Salva no Supabase */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-2 max-w-sm">
                        {/* Cadeia Sequencial e Status de Salvamento */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center space-x-1">
                            {alcadas.length === 0 ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px] font-semibold">
                                Isento de Alçada
                              </span>
                            ) : (
                              <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-bold space-x-1 shadow-2xs">
                                {alcadas.map((tier, tIdx) => (
                                  <React.Fragment key={tier}>
                                    <span>N{tier}</span>
                                    {tIdx < alcadas.length - 1 && (
                                      <span className="text-blue-400 font-normal">➔</span>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Live Supabase Status Tag */}
                          {rowSavingStatus[regra.id] && (
                            <span
                              className={`text-[10px] font-medium flex items-center space-x-1 shrink-0 ${
                                rowSavingStatus[regra.id] === 'saving'
                                  ? 'text-amber-600 animate-pulse'
                                  : rowSavingStatus[regra.id] === 'saved'
                                  ? 'text-emerald-700 font-bold'
                                  : 'text-red-600 font-bold'
                              }`}
                            >
                              {rowSavingStatus[regra.id] === 'saving' && (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                  <span>Salvando no Supabase...</span>
                                </>
                              )}
                              {rowSavingStatus[regra.id] === 'saved' && (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  <span>Salvo no Supabase</span>
                                </>
                              )}
                              {rowSavingStatus[regra.id] === 'error' && (
                                <>
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                  <span>Erro ao salvar</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Botões Rápidos Interativos [N1] [N2] [N3] [N4] */}
                        <div className="flex items-center space-x-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-0.5">
                            Alçadas:
                          </span>
                          {([1, 2, 3, 4] as const).map((tier) => {
                            const isToggled = alcadas.includes(tier);
                            return (
                              <button
                                key={tier}
                                type="button"
                                onClick={() => handleQuickToggleAlcada(regra, tier)}
                                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all flex items-center space-x-1 shadow-2xs cursor-pointer ${
                                  isToggled
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm border border-blue-600'
                                    : 'bg-white text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200'
                                }`}
                                title={`Clique para ${
                                  isToggled ? 'remover' : 'ativar'
                                } a ${tier}ª Alçada (N${tier}) deste processo e salvar no Supabase`}
                              >
                                {isToggled && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                <span>N{tier}</span>
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => handleOpenEditRule(regra)}
                            className="p-1 rounded text-slate-400 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition ml-1 cursor-pointer"
                            title="Configurar Cargos Habilitados e Detalhes da Alçada"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Cargos Habilitados por Nível Ativo */}
                        <div className="space-y-0.5 pt-0.5">
                          {alcadas.map((tier) => {
                            const cargos =
                              tier === 1
                                ? regra.cargosHabilitados1
                                : tier === 2
                                ? regra.cargosHabilitados2
                                : tier === 3
                                ? regra.cargosHabilitados3
                                : regra.cargosHabilitados4;

                            const cargosText =
                              (cargos || []).join(', ') ||
                              (tier === 1
                                ? 'Coordenação / Supervisão'
                                : tier === 2
                                ? 'Gerência de Área'
                                : tier === 3
                                ? 'Diretoria de Operações / Financeira'
                                : 'Diretoria Executiva / Conselho');

                            return (
                              <div key={tier} className="leading-snug text-[10.5px] flex items-baseline">
                                <span className="font-bold text-slate-700 mr-1 font-mono shrink-0">
                                  N{tier}:
                                </span>
                                <span className="text-slate-600 truncate max-w-[260px]" title={cargosText}>
                                  {cargosText}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Configurar Regra (Alçadas Responsáveis & Cargos Habilitados) */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-xs font-bold">
                    {editingRule.processoId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      editingRule.risco === 'ALTO'
                        ? 'bg-red-50 text-red-700'
                        : editingRule.risco === 'MEDIO'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    Risco {editingRule.risco}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {editingRule.processoNome}
                </h3>
                <p className="text-xs text-slate-500">
                  Defina os níveis de alçada exigidos e os cargos habilitados para aprovação deste processo.
                </p>
              </div>
              <button
                onClick={() => setEditingRule(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SEÇÃO 1: SELEÇÃO DAS ALÇADAS RESPONSÁVEIS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>1. Selecionar Alçadas Responsáveis (POL-DIR-01)</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {editAlcadas.length} nível(is) selecionado(s)
                </span>
              </div>

              {/* Tiers Grid Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  {
                    tier: 1 as const,
                    title: '1ª Alçada (N1)',
                    sub: 'Coordenação / Supervisão',
                  },
                  {
                    tier: 2 as const,
                    title: '2ª Alçada (N2)',
                    sub: 'Gerência de Área',
                  },
                  {
                    tier: 3 as const,
                    title: '3ª Alçada (N3)',
                    sub: 'Diretoria de Operações',
                  },
                  {
                    tier: 4 as const,
                    title: '4ª Alçada (N4)',
                    sub: 'Diretoria Executiva',
                  },
                ].map(({ tier, title, sub }) => {
                  const isSelected = editAlcadas.includes(tier);
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleToggleAlcada(tier)}
                      className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-sm'
                          : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs font-mono">{title}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 leading-tight">{sub}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sequential Flow Live Preview */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center space-x-2 text-xs">
                <span className="text-slate-500 font-semibold text-[11px] shrink-0">
                  Cadeia Sequencial Resultante:
                </span>
                {editAlcadas.length === 0 ? (
                  <span className="text-amber-700 font-semibold text-xs">
                    Isento de Aprovação Hierárquica (direto para Conferência Financeira)
                  </span>
                ) : (
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    {editAlcadas.map((tier, idx) => (
                      <React.Fragment key={tier}>
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-[11px] shadow-2xs">
                          {idx + 1}ª Etapa: N{tier}
                        </span>
                        {idx < editAlcadas.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO 2: CARGOS HABILITADOS (SOLICITANTE) E CADEIA DE APROVAÇÃO (SUPERIOR A ALÇADA) */}
            <div className="space-y-5 pt-2">
              {/* 2.A: QUEM PODE FAZER A SOLICITAÇÃO */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center space-x-1.5">
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>Cargos Habilitados = Quem pode fazer a solicitação</span>
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                    {editCargosSolicitante.length === 0
                      ? 'Todos os Colaboradores'
                      : `${editCargosSolicitante.length} cargo(s) selecionado(s)`}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Defina os cargos autorizados a abrir solicitações para este processo/natureza. Se nenhum for especificado, qualquer colaborador com acesso poderá solicitar.
                </p>

                {/* Active Solicitantes Tags */}
                <div className="flex flex-wrap gap-1.5 min-h-7 items-center">
                  {editCargosSolicitante.length === 0 ? (
                    <span className="text-[11px] text-indigo-700/80 font-medium bg-white px-2.5 py-1 rounded-md border border-indigo-200 shadow-2xs">
                      Todos os Colaboradores (Sem restrição de cargo de origem)
                    </span>
                  ) : (
                    editCargosSolicitante.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white text-indigo-900 border border-indigo-300 text-xs font-semibold shadow-2xs"
                      >
                        <span>{c}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCargo(0, c)}
                          className="text-indigo-400 hover:text-red-600 ml-1 transition"
                          title="Remover cargo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Input to add Solicitante cargo */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    placeholder="Adicionar cargo solicitante (ex: Comprador, Coordenador)..."
                    value={inputCargoSolicitante}
                    onChange={(e) => setInputCargoSolicitante(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCargo(0, inputCargoSolicitante);
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCargo(0, inputCargoSolicitante)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Quick suggestions for Solicitante */}
                <div className="flex items-center space-x-1.5 flex-wrap pt-1 text-[10px]">
                  <span className="text-slate-500 font-semibold">Sugestões rápidas:</span>
                  {standardSolicitanteSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleAddCargo(0, s)}
                      disabled={editCargosSolicitante.includes(s)}
                      className={`px-2 py-0.5 rounded border transition ${
                        editCargosSolicitante.includes(s)
                          ? 'bg-indigo-100/50 text-indigo-400 border-indigo-200 cursor-not-allowed'
                          : 'bg-white text-slate-600 hover:text-indigo-700 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      + {s}
                    </button>
                  ))}
                  {uniqueCargosFromUsers
                    .filter((c) => !standardSolicitanteSuggestions.includes(c))
                    .slice(0, 4)
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleAddCargo(0, c)}
                        disabled={editCargosSolicitante.includes(c)}
                        className={`px-2 py-0.5 rounded border transition ${
                          editCargosSolicitante.includes(c)
                            ? 'bg-indigo-100/50 text-indigo-400 border-indigo-200 cursor-not-allowed'
                            : 'bg-white text-slate-600 hover:text-indigo-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        + {c}
                      </button>
                    ))}
                </div>
              </div>

              {/* 2.B: QUEM PRECISARÁ FAZER A APROVAÇÃO (CADEIA / VALOR SUPERIOR A ALÇADA) */}
              <div className="space-y-4 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Cadeia de Aprovação = Quem precisará aprovar a solicitação</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Configurado por nível hierárquico (N1 ao N4)
                  </span>
                </div>

              {/* N1 Cargos */}
              {editAlcadas.includes(1) && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-800 font-mono">
                      1ª Alçada (N1) — Cargos Habilitados:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {editCargos1.length} cargo(s) associado(s)
                    </span>
                  </div>

                  {/* Active Cargos Tags */}
                  <div className="flex flex-wrap gap-1.5 min-h-7 items-center">
                    {editCargos1.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">
                        Nenhum cargo específico (utilizará o padrão da área/natureza)
                      </span>
                    ) : (
                      editCargos1.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-300 text-xs font-medium shadow-2xs"
                        >
                          <span>{c}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCargo(1, c)}
                            className="text-slate-400 hover:text-red-600 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Input to add cargo */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      placeholder="Adicionar cargo (digite e pressione Enter)..."
                      value={inputCargo1}
                      onChange={(e) => setInputCargo1(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCargo(1, inputCargo1);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCargo(1, inputCargo1)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                    >
                      Adicionar
                    </button>
                  </div>

                  {/* Quick Suggestions Chips */}
                  <div className="flex items-center space-x-1.5 flex-wrap pt-1 text-[10px]">
                    <span className="text-slate-400 font-semibold">Sugestões:</span>
                    {standardSuggestions[1].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddCargo(1, s)}
                        disabled={editCargos1.includes(s)}
                        className={`px-2 py-0.5 rounded border transition ${
                          editCargos1.includes(s)
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-600 hover:text-blue-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* N2 Cargos */}
              {editAlcadas.includes(2) && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-800 font-mono">
                      2ª Alçada (N2) — Cargos Habilitados:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {editCargos2.length} cargo(s) associado(s)
                    </span>
                  </div>

                  {/* Active Cargos Tags */}
                  <div className="flex flex-wrap gap-1.5 min-h-7 items-center">
                    {editCargos2.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">
                        Nenhum cargo específico (utilizará o padrão de Gerência da área)
                      </span>
                    ) : (
                      editCargos2.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-300 text-xs font-medium shadow-2xs"
                        >
                          <span>{c}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCargo(2, c)}
                            className="text-slate-400 hover:text-red-600 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Input to add cargo */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      placeholder="Adicionar cargo (digite e pressione Enter)..."
                      value={inputCargo2}
                      onChange={(e) => setInputCargo2(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCargo(2, inputCargo2);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCargo(2, inputCargo2)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                    >
                      Adicionar
                    </button>
                  </div>

                  {/* Quick Suggestions Chips */}
                  <div className="flex items-center space-x-1.5 flex-wrap pt-1 text-[10px]">
                    <span className="text-slate-400 font-semibold">Sugestões:</span>
                    {standardSuggestions[2].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddCargo(2, s)}
                        disabled={editCargos2.includes(s)}
                        className={`px-2 py-0.5 rounded border transition ${
                          editCargos2.includes(s)
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-600 hover:text-blue-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* N3 Cargos */}
              {editAlcadas.includes(3) && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-800 font-mono">
                      3ª Alçada (N3) — Cargos Habilitados:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {editCargos3.length} cargo(s) associado(s)
                    </span>
                  </div>

                  {/* Active Cargos Tags */}
                  <div className="flex flex-wrap gap-1.5 min-h-7 items-center">
                    {editCargos3.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">
                        Nenhum cargo específico (utilizará Diretoria de Operações / Financeira)
                      </span>
                    ) : (
                      editCargos3.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-300 text-xs font-medium shadow-2xs"
                        >
                          <span>{c}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCargo(3, c)}
                            className="text-slate-400 hover:text-red-600 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Input to add cargo */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      placeholder="Adicionar cargo (digite e pressione Enter)..."
                      value={inputCargo3}
                      onChange={(e) => setInputCargo3(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCargo(3, inputCargo3);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCargo(3, inputCargo3)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                    >
                      Adicionar
                    </button>
                  </div>

                  {/* Quick Suggestions Chips */}
                  <div className="flex items-center space-x-1.5 flex-wrap pt-1 text-[10px]">
                    <span className="text-slate-400 font-semibold">Sugestões:</span>
                    {standardSuggestions[3].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddCargo(3, s)}
                        disabled={editCargos3.includes(s)}
                        className={`px-2 py-0.5 rounded border transition ${
                          editCargos3.includes(s)
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-600 hover:text-blue-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* N4 Cargos */}
              {editAlcadas.includes(4) && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-800 font-mono">
                      4ª Alçada (N4) — Cargos Habilitados:
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {editCargos4.length} cargo(s) associado(s)
                    </span>
                  </div>

                  {/* Active Cargos Tags */}
                  <div className="flex flex-wrap gap-1.5 min-h-7 items-center">
                    {editCargos4.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">
                        Nenhum cargo específico (utilizará Diretoria Executiva / Conselho)
                      </span>
                    ) : (
                      editCargos4.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-300 text-xs font-medium shadow-2xs"
                        >
                          <span>{c}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCargo(4, c)}
                            className="text-slate-400 hover:text-red-600 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Input to add cargo */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      placeholder="Adicionar cargo (digite e pressione Enter)..."
                      value={inputCargo4}
                      onChange={(e) => setInputCargo4(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCargo(4, inputCargo4);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCargo(4, inputCargo4)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                    >
                      Adicionar
                    </button>
                  </div>

                  {/* Quick Suggestions Chips */}
                  <div className="flex items-center space-x-1.5 flex-wrap pt-1 text-[10px]">
                    <span className="text-slate-400 font-semibold">Sugestões:</span>
                    {standardSuggestions[4].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddCargo(4, s)}
                        disabled={editCargos4.includes(s)}
                        className={`px-2 py-0.5 rounded border transition ${
                          editCargos4.includes(s)
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-600 hover:text-blue-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* SEÇÃO 3: LIMITES FINANCEIROS & RISCO */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>3. Limites Financeiros e Nível de Risco</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Alçada por Evento (R$)
                  </label>
                  <input
                    type="number"
                    value={editAlcadaPorEvento}
                    onChange={(e) => setEditAlcadaPorEvento(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">0 = Conforme alçada máxima</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Teto Mensal (R$)
                  </label>
                  <input
                    type="number"
                    value={editTetoMensal}
                    onChange={(e) => setEditTetoMensal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">0 = Conforme alçada máxima</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nível de Risco *
                  </label>
                  <select
                    value={editRisco}
                    onChange={(e) => setEditRisco(e.target.value as RiskLevel)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="BAIXO">BAIXO</option>
                    <option value="MEDIO">MÉDIO</option>
                    <option value="ALTO">ALTO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Observações de Governança / Requisitos ISO 9001
                </label>
                <textarea
                  rows={2}
                  value={editObservacoes}
                  onChange={(e) => setEditObservacoes(e.target.value)}
                  placeholder="Ex: Exige parecer jurídico prévio para rescisões ou compras de alto impacto..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveRule}
                disabled={savingRule}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-200 transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {savingRule ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando no Supabase...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar e Manter no Supabase</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Versão da Matriz */}
      {showNewVersionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Criar Nova Revisão da Matriz POL-DIR-01</span>
            </h3>
            <p className="text-xs text-slate-500">
              Isso criará uma versão em Rascunho clonando todas as regras vigentes. As solicitações antigas continuarão vinculadas à versão em que foram submetidas para auditoria.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Código da Versão *</label>
                <input
                  type="text"
                  value={novaVersao}
                  onChange={(e) => setNovaVersao(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Título Descritivo *</label>
                <input
                  type="text"
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Histórico de Alterações / Motivação
                </label>
                <textarea
                  rows={3}
                  value={historicoAlteracoes}
                  onChange={(e) => setHistoricoAlteracoes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowNewVersionModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateVersion}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200"
              >
                Criar Rascunho de Versão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Catalog Modal */}
      {showProcessModal && (
        <ProcessCatalogModal onClose={() => setShowProcessModal(false)} />
      )}

      {/* Modal: Arquitetura e Esquema Supabase (Chaves Compostas, Índices, RLS) */}
      {showSupabaseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-200">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                    <span>Arquitetura de Dados Supabase (PostgreSQL)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      POL-DIR-01 / ISO 9001
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Esquema relacional estrito com chaves primárias compostas, índices GIN trgm e políticas de acesso RLS.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSupabaseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <div>
                  <div className="font-bold text-slate-800">
                    {loadingDbStatus ? (
                      'Verificando conexão com o Supabase...'
                    ) : dbStatus?.connected ? (
                      'Conexão com PostgreSQL Supabase Ativa'
                    ) : dbStatus?.configured ? (
                      'Configurado via DATABASE_URL (Aguardando Conexão)'
                    ) : (
                      'Supabase Backend Exclusivo (Configure DATABASE_URL no .env)'
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {dbStatus?.message || 'Pronto para execução e sincronização bidirecional.'}
                  </div>
                </div>
              </div>

              {dbStatus?.tablesCount !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-700">
                    {dbStatus.tablesCount} Tabelas no Schema
                  </span>
                  {dbStatus.hasRelationalTables && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 font-bold text-emerald-800">
                      Relacional Ativo
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Migration Feedback Result */}
            {migrationResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 ${
                  migrationResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {migrationResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{migrationResult.message || migrationResult.error}</p>
                  {migrationResult.hint && <p className="text-[11px] opacity-90">{migrationResult.hint}</p>}
                </div>
              </div>
            )}

            {/* Grid with 4 Main Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 1. Chaves Compostas & Tabelas */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center space-x-2 text-slate-800 font-bold pb-2 border-b border-slate-100">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>14 Tabelas & Chaves Primárias Compostas</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 text-[11px]">
                  <li className="flex items-start justify-between bg-blue-50/50 p-1.5 rounded border border-blue-100">
                    <span className="font-mono font-bold text-blue-900">regras_alcada</span>
                    <span className="font-semibold text-blue-700">PK: (matriz_id, processo_id)</span>
                  </li>
                  <li className="flex items-start justify-between bg-blue-50/50 p-1.5 rounded border border-blue-100">
                    <span className="font-mono font-bold text-blue-900">etapas_aprovacao</span>
                    <span className="font-semibold text-blue-700">PK: (solicitacao_id, nivel)</span>
                  </li>
                  <li className="flex items-start justify-between bg-blue-50/50 p-1.5 rounded border border-blue-100">
                    <span className="font-mono font-bold text-blue-900">app_data</span>
                    <span className="font-semibold text-blue-700">PK: (collection, id)</span>
                  </li>
                  <li className="text-slate-500 pt-1">
                    <strong>Tabelas Mestras:</strong> <span className="font-mono">usuarios, centros_custo, processos, matrizes_alcada, solicitacoes, conferencias_financeiras, registros_pagamento, solicitacao_documentos, auditoria_logs, notificacoes_sistema, configuracoes_sistema</span>.
                  </li>
                </ul>
              </div>

              {/* 2. Índices de Busca e Performance */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center space-x-2 text-slate-800 font-bold pb-2 border-b border-slate-100">
                  <Search className="w-4 h-4 text-emerald-600" />
                  <span>Índices de Busca e Alta Performance</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 text-[11px]">
                  <li>
                    <strong className="text-slate-800">Trigram Text Search (pg_trgm):</strong> Índices GIN em <span className="font-mono text-emerald-700">fornecedor_favorecido, objeto_despesa, usuarios.name, processos.name</span> para busca instantânea.
                  </li>
                  <li>
                    <strong className="text-slate-800">Índices Compostos B-Tree:</strong> <span className="font-mono text-slate-700">(status, data_vencimento), (centro_custo, status), (solicitante_id, created_at DESC)</span>.
                  </li>
                  <li>
                    <strong className="text-slate-800">Índices GIN JSONB:</strong> Consulta ultra-rápida em campos semi-estruturados como dados bancários, risco e justificativas técnicas.
                  </li>
                </ul>
              </div>

              {/* 3. Políticas de Acesso RLS */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center space-x-2 text-slate-800 font-bold pb-2 border-b border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Políticas de Acesso (Row Level Security - RLS)</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 text-[11px]">
                  <li>
                    <strong className="text-slate-800">Service Role:</strong> Acesso irrestrito de backend para transações de orquestração segura.
                  </li>
                  <li>
                    <strong className="text-slate-800">Solicitantes:</strong> Leitura e edição estrita apenas das próprias solicitações em rascunho/abertas.
                  </li>
                  <li>
                    <strong className="text-slate-800">Aprovadores (N1 a N4):</strong> Visibilidade e ação autorizada nas etapas sob sua responsabilidade designada.
                  </li>
                  <li>
                    <strong className="text-slate-800">Trilha de Auditoria:</strong> Tabela <span className="font-mono text-purple-700">auditoria_logs</span> imutável (append-only) para conformidade ISO 9001:2015.
                  </li>
                </ul>
              </div>

              {/* 4. Views Analíticas & Governança */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center space-x-2 text-slate-800 font-bold pb-2 border-b border-slate-100">
                  <TableProperties className="w-4 h-4 text-amber-600" />
                  <span>Views Analíticas & Triggers Automáticos</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 text-[11px]">
                  <li>
                    <strong className="text-slate-800">vw_painel_indicadores_alcada:</strong> Consolidação de métricas gerenciais, valores e alertas em tempo real.
                  </li>
                  <li>
                    <strong className="text-slate-800">vw_solicitacoes_urgentes_sla:</strong> Filtro automático de vencimentos críticos (≤ 5 dias úteis).
                  </li>
                  <li>
                    <strong className="text-slate-800">Trigger de Data (updated_at):</strong> Disparador automático <span className="font-mono text-amber-700">fn_atualizar_timestamp_updated_at()</span> em todas as tabelas editáveis.
                  </li>
                </ul>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={handleCopySql}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition flex items-center space-x-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>{copiedSql ? 'Copiado para Área de Transferência!' : 'Copiar Script DDL'}</span>
                </button>

                <button
                  onClick={handleDownloadSql}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition flex items-center space-x-1.5"
                >
                  <FileCode className="w-3.5 h-3.5 text-slate-600" />
                  <span>Baixar .sql</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                {currentUser?.roles.includes('ADMINISTRADOR') && (
                  <button
                    onClick={handleExecuteMigration}
                    disabled={migrating}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm shadow-emerald-200 transition flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {migrating ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Executando Migração...</span>
                      </>
                    ) : (
                      <>
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Executar Migração no Supabase</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setShowSupabaseModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
