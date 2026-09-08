import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Processo, PaymentMethod, RiskLevel, CostCenter } from '../types';
import {
  FilePlus2,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Upload,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Info,
  Calendar,
  DollarSign,
  Building,
  UserX,
  UserCheck,
  Users,
  ArrowRight,
  Tag,
  Briefcase,
} from 'lucide-react';

interface NewRequestFormProps {
  onSuccess: (newRequest: any) => void;
  onCancel: () => void;
}

export const NewRequestForm: React.FC<NewRequestFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { currentUser } = useAuth();

  const [processes, setProcesses] = useState<Processo[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [processoId, setProcessoId] = useState<string>('');
  const [centroCusto, setCentroCusto] = useState<string>(() => currentUser?.centroCusto || 'CC-3030 - Finanças');

  useEffect(() => {
    if (currentUser?.centroCusto) {
      setCentroCusto(currentUser.centroCusto);
    }
  }, [currentUser]);
  const [processoContratoNumero, setProcessoContratoNumero] = useState<string>('');
  const [fornecedorFavorecido, setFornecedorFavorecido] = useState<string>('');
  const [cpfCnpj, setCpfCnpj] = useState<string>('');
  const [objetoDespesa, setObjetoDespesa] = useState<string>('');
  const [valorTotal, setValorTotal] = useState<string>('');
  const [natureza, setNatureza] = useState<'CONTINUA' | 'EVENTUAL'>('EVENTUAL');
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>('BOLETO');
  const [parcelamento, setParcelamento] = useState<boolean>(false);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState<number>(1);
  const [dataVencimento, setDataVencimento] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [rubricaOrcamentaria, setRubricaOrcamentaria] = useState<string>('3.1.00 - Despesas Operacionais');
  const [previstoNoOrcamento, setPrevistoNoOrcamento] = useState<boolean>(true);
  const [saldoDisponivel, setSaldoDisponivel] = useState<boolean>(true);
  const [justificativaNaoPrevisto, setJustificativaNaoPrevisto] = useState<string>('');
  const [justificativaTecnica, setJustificativaTecnica] = useState<string>('');

  // Bank details
  const [banco, setBanco] = useState<string>('');
  const [agencia, setAgencia] = useState<string>('');
  const [contaCorrente, setContaCorrente] = useState<string>('');

  // Risk Checklist
  const [criterioAssistencial, setCriterioAssistencial] = useState<boolean>(false);
  const [criterioAns, setCriterioAns] = useState<boolean>(false);
  const [criterioFinanceiro, setCriterioFinanceiro] = useState<boolean>(false);
  const [criterioReputacional, setCriterioReputacional] = useState<boolean>(false);

  // Mandatory 5 Governance Declarations
  const [decSegregacao, setDecSegregacao] = useState<boolean>(false);
  const [decQuatroOlhos, setDecQuatroOlhos] = useState<boolean>(false);
  const [decFracionamento, setDecFracionamento] = useState<boolean>(false);
  const [decConflito, setDecConflito] = useState<boolean>(false);
  const [decPrevia, setDecPrevia] = useState<boolean>(false);

  // Uploaded docs
  const [documentos, setDocumentos] = useState<any[]>([]);

  // Live Enquadramento Result
  const [enquadramento, setEnquadramento] = useState<any>(null);
  const [calculatingEnquadramento, setCalculatingEnquadramento] = useState<boolean>(false);

  const selectedProcess = processes.find((p) => p.id === processoId);

  const getCentroCustoForProcess = (proc?: Processo, ccList: CostCenter[] = costCenters) => {
    if (!proc) {
      const defaultActive = ccList.find((c) => c.ativo);
      return defaultActive ? `${defaultActive.codigo} - ${defaultActive.nome}` : 'CC-3030 - Finanças';
    }

    const nat = (proc.natureza || '').toUpperCase();
    const pCode = (proc.code || '').toUpperCase();
    const pName = (proc.name || '').toUpperCase();

    // 1. Try to find match in dynamically loaded Cost Centers
    const matched = ccList.find((c) => {
      if (!c.ativo) return false;
      const cCode = c.codigo.toUpperCase();
      const cName = c.nome.toUpperCase();
      const cDesc = (c.descricao || '').toUpperCase();

      if (nat === 'RH' && (cCode.includes('1010') || cName.includes('RECURSOS') || cName.includes('RH') || cName.includes('GENTE') || cDesc.includes('PESSOAL'))) return true;
      if (nat === 'ASSISTENCIAL' && (cCode.includes('2020') || cName.includes('CREDENCIADA') || cName.includes('ASSIST') || cName.includes('MÉDIC') || cName.includes('MEDIC') || cDesc.includes('ASSIST') || cDesc.includes('CREDENCIADA'))) return true;
      if (nat === 'FINANCEIRO' && (cCode.includes('3030') || cName.includes('FINAN') || cName.includes('CONTABIL') || cName.includes('TESOURARIA') || cDesc.includes('FINAN'))) return true;
      if (nat === 'MARKETING' && (cCode.includes('4040') || cName.includes('MARKETING') || cName.includes('MKT') || cName.includes('COMUNICA') || cDesc.includes('MARKETING'))) return true;
      if ((nat === 'OPERACIONAL' || nat === 'ADMINISTRATIVO') && (cCode.includes('5050') || cCode.includes('8080') || cName.includes('OPERAÇ') || cName.includes('OPERAC') || cName.includes('ADMIN') || cName.includes('LOGÍST') || cDesc.includes('OPERAÇ'))) return true;
      if (nat === 'TI' && (cCode.includes('6060') || cName.includes('TECNOLOGIA') || cName.includes('TI') || cName.includes('SISTEMA') || cName.includes('INFORMÁTICA') || cDesc.includes('SISTEMAS'))) return true;
      if (nat === 'JURIDICO' && (cCode.includes('7070') || cName.includes('JURÍD') || cName.includes('JURID') || cName.includes('COMPLIANCE') || cDesc.includes('JURÍD'))) return true;

      // Match with process name or nature directly
      if (cName.includes(nat) || cDesc.includes(nat) || pName.includes(cName) || cName.includes(pCode)) return true;
      return false;
    });

    if (matched) {
      return `${matched.codigo} - ${matched.nome}`;
    }

    // 2. Fallback to active cost center or standard
    const activeOne = ccList.find((c) => c.ativo);
    return activeOne ? `${activeOne.codigo} - ${activeOne.nome}` : 'CC-3030 - Finanças';
  };

  // Helper to determine if the active user is authorized according to POL-DIR-01 "CARGOS HABILITADOS"
  const isProcessAuthorized = (proc?: Processo | null, user?: typeof currentUser) => {
    if (!proc || !user) return true;
    if (user.roles?.includes('ADMINISTRADOR')) return true;

    const normalize = (str: string) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .trim();

    const uCargo = normalize(user.cargo || '');
    const uArea = normalize(user.area || '');
    const uCCs = [user.centroCusto || '', ...(user.centrosCusto || [])].map(normalize).filter(Boolean);

    const docTarget = normalize(proc.cargoHabilitadoDocumento || '');
    const targets = (proc.cargosHabilitadosSolicitante || []).map(normalize).filter(Boolean);
    if (docTarget) targets.push(docTarget);

    if (targets.length === 0) return true;

    return targets.some((target) => {
      if (!target) return false;
      if (uCargo && (uCargo.includes(target) || target.includes(uCargo))) return true;
      if (uArea && (uArea.includes(target) || target.includes(uArea))) return true;
      if (uCCs.some((cc) => cc.includes(target) || target.includes(cc))) return true;

      const kws = target.split(/\s+/).filter((w) => w.length > 3 && !['para', 'com', 'das', 'dos', 'uma', 'como'].includes(w));
      return kws.length > 0 && kws.some((kw) => uCargo.includes(kw) || uArea.includes(kw) || uCCs.some((cc) => cc.includes(kw)));
    });
  };

  const getAreaForProcess = (proc?: Processo) => {
    if (!proc) return 'Finanças e Controladoria';
    switch (proc.natureza) {
      case 'MARKETING': return 'Comunicação e Marketing';
      case 'ASSISTENCIAL': return 'Núcleo Assistencial';
      case 'FINANCEIRO': return 'Finanças e Controladoria';
      case 'RH': return 'Gente e Gestão';
      case 'JURIDICO': return 'Jurídico';
      case 'TI': return 'Tecnologia da Informação';
      case 'OPERACIONAL': return 'Operações';
      default: return 'Finanças e Controladoria';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [procRes, ccRes] = await Promise.all([
          api.getProcesses(),
          api.getCostCenters(),
        ]);
        const procs = procRes.processes || [];
        const ccs = ccRes.costCenters || [];
        setProcesses(procs);
        setCostCenters(ccs);
        if (procs.length > 0) {
          // Select first authorized process for this user
          const firstAuthorized = procs.find((p) => isProcessAuthorized(p, currentUser)) || procs[0];
          setProcessoId(firstAuthorized.id);
          if (!centroCusto) {
            setCentroCusto(currentUser?.centroCusto || 'CC-3030 - Finanças');
          }
        }
      } catch (err) {
        console.error('Failed to load processes/cost centers', err);
      } finally {
        setLoadingProcesses(false);
      }
    };
    fetchData();
  }, [currentUser]);

  // Update process selection without overriding user's centroCusto
  const handleProcessChange = (newProcId: string) => {
    setProcessoId(newProcId);
  };

  // Recalculate Enquadramento in real time
  useEffect(() => {
    if (!processoId || !valorTotal || isNaN(Number(valorTotal)) || Number(valorTotal) <= 0) {
      setEnquadramento(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCalculatingEnquadramento(true);
      try {
        const res = await api.calculateEnquadramento({
          processoId,
          valorTotal: Number(valorTotal),
          criteriosRisco: {
            assistencial: criterioAssistencial,
            regulatorioAns: criterioAns,
            financeiro: criterioFinanceiro,
            reputacional: criterioReputacional,
          },
          cpfCnpj,
          centroCusto: centroCusto || getCentroCustoForProcess(selectedProcess, costCenters),
        });
        setEnquadramento(res);
      } catch (e) {
        console.error('Error calculating enquadramento', e);
      } finally {
        setCalculatingEnquadramento(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    processoId,
    valorTotal,
    criterioAssistencial,
    criterioAns,
    criterioFinanceiro,
    criterioReputacional,
    cpfCnpj,
    centroCusto,
    selectedProcess,
    costCenters,
  ]);

  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadType, setPendingUploadType] = useState<string | null>(null);

  const triggerFileUpload = (tipo: string) => {
    setPendingUploadType(tipo);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const generateSHA256 = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      console.warn("Failed to generate real SHA-256, falling back to simulated hash.", e);
      return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadType) return;

    // Reset input
    e.target.value = '';

    // Validate size (25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('O arquivo excede o limite máximo de 25MB.');
      return;
    }

    // Validate type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Apenas arquivos PDF são permitidos.');
      return;
    }

    const hashSha256 = await generateSHA256(file);
    
    // In a real application, you would upload to a bucket (e.g. Firebase Storage)
    // For this mockup, we'll create a local object URL or a simulated URL
    const url = URL.createObjectURL(file);

    const newDoc = {
      id: `doc-${Date.now()}`,
      tipo: pendingUploadType,
      nomeArquivo: file.name,
      tamanhoBytes: file.size,
      mimeType: file.type || 'application/pdf',
      url,
      hashSha256,
      uploadedBy: {
        id: currentUser?.id,
        name: currentUser?.name,
        email: currentUser?.email,
      },
      uploadedAt: new Date().toISOString(),
    };

    setDocumentos((prev) => [...prev, newDoc]);
    setPendingUploadType(null);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!fornecedorFavorecido.trim() || !objetoDespesa.trim()) {
      setErrorMessage('Informe o Fornecedor / Favorecido e o Objeto da Despesa.');
      return;
    }

    if (!valorTotal || Number(valorTotal) <= 0) {
      setErrorMessage('Informe um valor total válido e positivo.');
      return;
    }

    if (!dataVencimento) {
      setErrorMessage('Informe a data de vencimento do pagamento.');
      return;
    }

    // Check mandatory 5 declarations
    if (!decSegregacao || !decQuatroOlhos || !decFracionamento || !decConflito || !decPrevia) {
      setErrorMessage(
        'Conformidade Obrigatória: É necessário assinalar todas as 5 Declarações de Governança e Alçadas antes do envio.'
      );
      return;
    }

    if (!justificativaTecnica || justificativaTecnica.trim().length < 10) {
      setErrorMessage('Registre uma justificativa técnica e operacional fundamentada (mínimo 10 caracteres).');
      return;
    }

    // Originator Authorization Check (POL-DIR-01 "CARGOS HABILITADOS")
    const isAuthorized = isProcessAuthorized(selectedProcess, currentUser);
    if (!isAuthorized && !currentUser?.roles?.includes('ADMINISTRADOR')) {
      setErrorMessage(
        `Acesso não autorizado: Conforme a POL-DIR-01 (coluna Cargos Habilitados), o processo "${selectedProcess?.name}" só pode ser solicitado pelo cargo/setor "${selectedProcess?.cargoHabilitadoDocumento}". Seu cargo atual é "${currentUser?.cargo || 'Não definido'}".`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        areaSolicitante: getAreaForProcess(selectedProcess),
        centroCusto: centroCusto || getCentroCustoForProcess(selectedProcess, costCenters),
        processoId,
        processoContratoNumero,
        fornecedorFavorecido,
        cpfCnpj,
        objetoDespesa,
        valorTotal: Number(valorTotal),
        natureza,
        formaPagamento,
        parcelamento,
        quantidadeParcelas: parcelamento ? Number(quantidadeParcelas) : undefined,
        valorParcela: parcelamento ? Number(valorTotal) / Number(quantidadeParcelas) : undefined,
        dataVencimento,
        rubricaOrcamentaria,
        previstoNoOrcamento,
        justificativaNaoPrevisto: !previstoNoOrcamento ? justificativaNaoPrevisto : undefined,
        saldoDisponivel,
        dadosBancarios: {
          banco,
          agencia,
          contaCorrente,
        },
        criteriosRisco: {
          assistencial: criterioAssistencial,
          regulatorioAns: criterioAns,
          financeiro: criterioFinanceiro,
          reputacional: criterioReputacional,
        },
        declaracaoSegregacaoFuncoes: decSegregacao,
        declaracaoRegraQuatroOlhos: decQuatroOlhos,
        declaracaoProibicaoFracionamento: decFracionamento,
        declaracaoAusenciaConflito: decConflito,
        declaracaoAprovacaoPreviaCompromisso: decPrevia,
        justificativaTecnica,
        documentos,
      };

      const res = await api.createRequest(payload);
      onSuccess(res.request);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao criar solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Form Title & Standard Header */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Formulário de Registro de Alçada e Aprovação para Pagamento
              </h2>
              <p className="text-xs text-slate-500">
                Instruído conforme a Política de Alçada e Delegação de Autoridade
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold">
              Rev. 0 • ISO 9001:2015
            </span>
          </div>
        </div>

        {/* User Identity Snapshot */}
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Solicitante:</span>
            <span className="font-bold text-slate-800">{currentUser?.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Cargo & Área:</span>
            <span className="text-blue-600 font-medium">{currentUser?.cargo} ({currentUser?.area})</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Centro de Custo:</span>
            <input
              type="text"
              disabled
              value={centroCusto || currentUser?.centroCusto || 'CC-3030 - Finanças'}
              className="w-full font-mono bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Process Selection & Value */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Enquadramento no Processo
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Processo / Objeto Padronizado da Matriz *
              </label>

              <select
                value={processoId}
                onChange={(e) => handleProcessChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                {loadingProcesses ? (
                  <option>Carregando processos da matriz...</option>
                ) : (
                  processes.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))
                )}
              </select>

              {selectedProcess && (
                <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <p className="font-semibold text-slate-800">{selectedProcess.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60 text-[10px]">
                    <span className="text-slate-500">
                      Natureza: <strong className="text-blue-700 font-bold">{selectedProcess.natureza}</strong>
                    </span>
                    <span className="text-slate-500">
                      Risco Base: <strong className="text-slate-700 font-bold">{selectedProcess.riscoPadrao}</strong>
                    </span>
                    <span className="text-slate-500">
                      Cargo Habilitado (POL-DIR-01):{' '}
                      <strong className="text-indigo-700 font-bold">
                        {selectedProcess.cargoHabilitadoDocumento || 'Diretoria Responsável'}
                      </strong>
                    </span>
                  </div>

                  {/* Authorization Status Indicator */}
                  {isProcessAuthorized(selectedProcess, currentUser) ? (
                    <div className="flex items-center space-x-2 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>
                        <strong>Perfil Habilitado:</strong> Seu cargo/setor (<strong>{currentUser?.cargo || 'Colaborador'}</strong>) possui legitimidade formal para submeter este processo.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-[10px] text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>
                        <strong>Atenção (Alçada Restrita):</strong> Conforme a POL-DIR-01, este processo é restrito ao cargo <strong>[{selectedProcess.cargoHabilitadoDocumento}]</strong>.
                        {currentUser?.roles?.includes('ADMINISTRADOR')
                          ? ' Envio permitido apenas pelo perfil de Administrador em regime de contingência.'
                          : ' O formulário bloqueará a submissão para cargos não habilitados.'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número do Contrato / Processo Vinculado (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: CT-PREST-2026/042 ou PA-2026/110"
                value={processoContratoNumero}
                onChange={(e) => setProcessoContratoNumero(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Vincule ao número do contrato ou processo prévio caso aplicável.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Expense & Financial Data */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Dados do Favorecido e Especificação Financeira
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fornecedor / Favorecido *
              </label>
              <input
                type="text"
                placeholder="Razão Social ou Nome do Favorecido"
                value={fornecedorFavorecido}
                onChange={(e) => setFornecedorFavorecido(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CPF / CNPJ do Favorecido
              </label>
              <input
                type="text"
                placeholder="00.000.000/0000-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Objeto da Despesa / Discriminação Detalhada *
            </label>
            <textarea
              rows={2}
              placeholder="Descreva claramente o objeto, itens adquiridos ou serviço contratado..."
              value={objetoDespesa}
              onChange={(e) => setObjetoDespesa(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>

          <div className={`grid grid-cols-1 gap-4 pt-2 ${natureza === 'CONTINUA' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                <option value="BOLETO">Boleto Bancário</option>
                <option value="PIX">PIX</option>
                <option value="TED">Transferência TED / DOC</option>
                <option value="DEPOSITO_CONTA">Depósito em Conta Corrente</option>
                <option value="CARTAO_CORPORATIVO">Cartão Corporativo</option>
                <option value="GUIA_TRIBUTARIA">Guia Tributária / DARF / GPS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Mínimo de 5 dias úteis de antecedência do vencimento para conferência financeira.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Natureza da Despesa
              </label>
              <select
                value={natureza}
                onChange={(e) => {
                  setNatureza(e.target.value as 'CONTINUA' | 'EVENTUAL');
                  if (e.target.value === 'CONTINUA') {
                    setParcelamento(true);
                  } else {
                    setParcelamento(false);
                    setQuantidadeParcelas(1);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                <option value="EVENTUAL">Eventual / Não Recorrente</option>
                <option value="CONTINUA">Contínua / Mensal Recorrente</option>
              </select>
            </div>

            {natureza === 'CONTINUA' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Parcelas
                </label>
                <input
                  type="number"
                  min="2"
                  max="120"
                  value={quantidadeParcelas}
                  onChange={(e) => setQuantidadeParcelas(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>
            )}
          </div>

          {/* Bank Info Fields */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Banco Favorecido</label>
              <input
                type="text"
                placeholder="Ex: 001 - Banco do Brasil / 341 - Itaú"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Agência</label>
              <input
                type="text"
                placeholder="Ex: 1234-5"
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Conta Corrente / Chave PIX</label>
              <input
                type="text"
                placeholder="Ex: 98765-4 ou CNPJ"
                value={contaCorrente}
                onChange={(e) => setContaCorrente(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Section 3: REAL-TIME ENQUADRAMENTO PREVIEW CARD */}
        {enquadramento && (
          <div className="p-5 rounded-xl bg-blue-50/50 border border-blue-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Motor de Alçadas — Enquadramento Automático em Tempo Real
                </h3>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-200">
                {enquadramento.matrizAlcadaCodigo} {enquadramento.matrizAlcadaVersao}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Nível de Risco:</span>
                <span className={`font-bold text-sm ${
                  enquadramento.nivelRisco === 'ALTO'
                    ? 'text-red-600'
                    : enquadramento.nivelRisco === 'MEDIO'
                    ? 'text-amber-600'
                    : 'text-blue-600'
                }`}>
                  {enquadramento.nivelRisco}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Alçada Requerida:</span>
                <span className="font-bold text-blue-600 text-sm">{enquadramento.alcadaAplicavelLabel}</span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Limite Mensal:</span>
                <span className="font-mono text-slate-700">
                  {enquadramento.tetoMensalProcesso > 0
                    ? `R$ ${enquadramento.tetoMensalProcesso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'Sem limite mensal'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Limite Semanal/Evento:</span>
                <span className="font-mono text-slate-700">
                  {enquadramento.tetoSemanalProcesso > 0
                    ? `R$ ${enquadramento.tetoSemanalProcesso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'Sem limite semanal'}
                </span>
              </div>
            </div>

            {/* Isento Aprovação Hierárquica Alert */}
            {enquadramento.isentoAprovacaoHierarquica && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900">
                    Isento de Aprovação Hierárquica (Direto ao Financeiro)
                  </p>
                  <p className="text-[11px] mt-0.5 text-emerald-800">
                    O valor total está dentro do limite semanal/por evento permitido para este processo. A solicitação será encaminhada diretamente para a fila do Financeiro.
                  </p>
                </div>
              </div>
            )}

            {/* Originator Authorization Alert from Backend Enquadramento */}
            {enquadramento.autorizacaoSolicitante && !enquadramento.autorizacaoSolicitante.autorizado && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">
                    Restrição de Cargo Solicitante (POL-DIR-01)
                  </p>
                  <p className="text-[11px] mt-0.5 text-amber-800">
                    {enquadramento.autorizacaoSolicitante.motivo}
                  </p>
                </div>
              </div>
            )}

            {/* Split Warning Alert if any */}
            {enquadramento.analiseFracionamento?.possivelFracionamentoIdentificado && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800">
                    Alerta de Fracionamento de Despesa Detectado!
                  </p>
                  <p className="text-[11px] mt-0.5 text-red-700">
                    {enquadramento.analiseFracionamento.observacao}
                  </p>
                </div>
              </div>
            )}

            {/* Monthly Ceiling Exceeded Warning */}
            {enquadramento.tetoMensalEstourado && (
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs flex items-start space-x-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-950 text-xs uppercase tracking-wide">
                    ⚠️ Teto Mensal Excedido — Liberação Exclusiva da Diretoria Executiva (POL-DIR-01)
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    O valor acumulado neste mês atinge <strong className="font-mono">R$ {(enquadramento.tetoMensalAcumuladoAtual + Number(valorTotal)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, superando o teto mensal de <strong className="font-mono">R$ {enquadramento.tetoMensalProcesso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.
                  </p>
                  <p className="text-[11px] font-semibold text-amber-950 bg-amber-100/80 p-2 rounded-lg border border-amber-200">
                    🏛️ <strong>Regra de Governança:</strong> Esta solicitação incluirá obrigatoriamente a <strong>4ª Alçada (Diretoria Executiva / Conselho)</strong> e só poderá ser liberada por usuário com o Centro de Custo <strong>'Diretoria Executiva'</strong> ou <strong>'Diretoria Executiva / Conselho'</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Approvers Missing Alert Banner */}
            {enquadramento.alertasAprovadores && enquadramento.alertasAprovadores.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2.5">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-950 text-xs uppercase tracking-wide">
                      ⚠️ Alerta de Alçada: Usuário Aprovador Não Cadastrado para a Natureza/Alçada
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {enquadramento.alertasAprovadores.map((alerta: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-amber-100/80 border border-amber-200 text-amber-950">
                          <p className="font-bold text-[11px] text-amber-900">{alerta.nivelLabel}:</p>
                          <p className="text-[11px] mt-0.5">{alerta.mensagem}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-800 mt-2">
                      💡 <strong>Aviso aos Gestores:</strong> A solicitação poderá ser registrada, mas os aprovadores para esta natureza e centro de custo precisam ser cadastrados no menu <strong>Gestão de Usuários</strong> para que a aprovação possa ser concluída.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Approvers Workflow Chain Preview */}
            {!enquadramento.isentoAprovacaoHierarquica && (
              <div className="pt-3 border-t border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                      <Lock className="w-4 h-4 text-blue-600" />
                      <span>Cadeia Sequencial de Aprovação Obrigatória (Segregação & Quatro Olhos)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Aprovação sequencial parametrizada pelos <strong>Cargos Habilitados</strong> na Matriz para a natureza <span className="font-semibold text-blue-600">{selectedProcess?.natureza || 'Geral'}</span>.
                    </p>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-700 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{enquadramento.cadeiaAprovacao.length} {enquadramento.cadeiaAprovacao.length === 1 ? 'Etapa Obrigatória' : 'Etapas Sequenciais'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {enquadramento.cadeiaAprovacao.map((etapa: any, idx: number) => {
                    const isN1 = etapa.nivel === 1;
                    const isN2 = etapa.nivel === 2;
                    const isN3 = etapa.nivel === 3;
                    const isN4 = etapa.nivel === 4;

                    const levelBadgeColor = isN1
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : isN2
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                      : isN3
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200';

                    const cargosList = etapa.cargosHabilitados && etapa.cargosHabilitados.length > 0
                      ? etapa.cargosHabilitados
                      : [etapa.cargoExigido];

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition relative flex flex-col justify-between ${
                          etapa.semAprovadorCadastrado
                            ? 'bg-amber-50/60 border-amber-300 shadow-sm'
                            : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
                        }`}
                      >
                        {/* Header: Step and Level Badge */}
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center space-x-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-600">
                                {idx + 1}ª Etapa
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${levelBadgeColor}`}>
                              {etapa.nivel}ª Alçada (N{etapa.nivel})
                            </span>
                          </div>

                          {/* Cargo Habilitado / Cadeia da Matriz */}
                          <div className="mt-2.5">
                            <div className="flex items-center space-x-1 text-[10px] uppercase font-bold text-slate-500 mb-1">
                              <Briefcase className="w-3 h-3 text-slate-400" />
                              <span>Cargos Habilitados na Matriz:</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {cargosList.map((cargo: string, cIdx: number) => (
                                <span
                                  key={cIdx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 leading-tight"
                                >
                                  {cargo}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Designated Approver / Colaborador Vinculado */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                            Aprovador Designado:
                          </span>

                          {etapa.semAprovadorCadastrado ? (
                            <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900 space-y-1">
                              <div className="flex items-center space-x-1 text-[11px] font-bold text-amber-800">
                                <UserX className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                                <span>Sem colaborador cadastrado</span>
                              </div>
                              <p className="text-[9px] text-amber-800 leading-tight">
                                Requer colaborador com perfil de <strong>{etapa.nivel}ª Alçada</strong> e cargo habilitado para <strong>{selectedProcess?.natureza || etapa.natureza || 'a Área'}</strong>.
                              </p>
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-[11px] truncate flex items-center space-x-1">
                                  <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="truncate">{etapa.aprovadorDesignadoNome}</span>
                                </span>
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                  Vinculado
                                </span>
                              </div>
                              <p className="text-[10px] text-blue-700 font-medium truncate">
                                {etapa.aprovadorDesignadoCargo || etapa.cargoExigido}
                              </p>
                              {(etapa.aprovadorDesignadoCentroCusto || etapa.aprovadorDesignadoArea) && (
                                <p className="text-[9px] text-slate-400 truncate">
                                  {etapa.aprovadorDesignadoCentroCusto || etapa.aprovadorDesignadoArea}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600 flex items-start space-x-2">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Princípio da Segregação de Funções & Regra dos Quatro Olhos:</strong> O solicitante não pode aprovar a própria despesa. Cada etapa é atribuída exclusivamente a colaboradores habilitados com alçadas e cargos independentes conforme a norma <strong>POL-DIR-01</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Qualitative Risk Checklist */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Checklist de Risco Assistencial e Regulatório
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 cursor-pointer transition">
              <input
                type="checkbox"
                checked={criterioAssistencial}
                onChange={(e) => setCriterioAssistencial(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">Impacto Assistencial Direto</span>
                <span className="text-[11px] text-slate-500">
                  Envolve fornecimento de OPME, procedimentos cirúrgicos ou liminares judiciais.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 cursor-pointer transition">
              <input
                type="checkbox"
                checked={criterioAns}
                onChange={(e) => setCriterioAns(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">Exigência Regulatória ANS / Fiscal</span>
                <span className="text-[11px] text-slate-500">
                  Relacionado a exigências da RN ANS nº 518/2022 ou ativos garantidores.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 cursor-pointer transition">
              <input
                type="checkbox"
                checked={criterioFinanceiro}
                onChange={(e) => setCriterioFinanceiro(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">Impacto Financeiro Relevante</span>
                <span className="text-[11px] text-slate-500">
                  Despesa extraordinária ou acima da média histórica do centro de custo.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 cursor-pointer transition">
              <input
                type="checkbox"
                checked={criterioReputacional}
                onChange={(e) => setCriterioReputacional(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">Risco de Imagem / Reputacional</span>
                <span className="text-[11px] text-slate-500">
                  Potencial repercussão externa, reclamações no Procon ou órgãos de defesa.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 5: Technical Justification */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              4. Justificativa Técnica e Operacional *
            </h3>
          </div>

          <div>
            <textarea
              rows={3}
              placeholder="Explique detalhadamente a necessidade da despesa, a motivação da contratação e a conformidade com as metas da SB Saúde..."
              value={justificativaTecnica}
              onChange={(e) => setJustificativaTecnica(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Section 6: Document Attachments with SHA-256 */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                5. Anexos Comprobatórios (ISO 9001:2015 7.5)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Integridade Criptográfica SHA-256
            </span>
          </div>

          
          <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelected} 
            />

            <button
              type="button"
              onClick={() => triggerFileUpload('NOTA_FISCAL')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
            >
              + Anexar Nota Fiscal / Fatura
            </button>
            <button
              type="button"
              onClick={() => triggerFileUpload('COTACAO_PRECOS')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
            >
              + Anexar 3 Cotações de Preços
            </button>
            <button
              type="button"
              onClick={() => triggerFileUpload('CONTRATO')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
            >
              + Anexar Contrato Assinado
            </button>
            <button
              type="button"
              onClick={() => triggerFileUpload('BOLETO_BANCARIO')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
            >
              + Anexar Boleto Bancário
            </button>
          </div>

          {documentos.length > 0 && (
            <div className="mt-3 space-y-2">
              {documentos.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{doc.nomeArquivo}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono border border-blue-100">
                      {doc.tipo}
                    </span>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-lg">
                      Hash SHA-256: {doc.hashSha256}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocumentos((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-700 text-xs underline font-semibold"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 7: MANDATORY 5 GOVERNANCE DECLARATIONS */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
            <Lock className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                6. Declarações Obrigatórias de Governança e Alçadas (POL-DIR-01)
              </h3>
              <p className="text-[11px] text-slate-500">
                Assinale as 5 declarações para registrar sua concordância e gerar a assinatura digital no SGQ.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={decSegregacao}
                onChange={(e) => setDecSegregacao(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                <strong className="text-slate-900">1. Segregação Estrita de Funções:</strong> Declaro que não participarei como aprovador da presente solicitação, respeitando a separação entre solicitação, autorização e desembolso.
              </span>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={decQuatroOlhos}
                onChange={(e) => setDecQuatroOlhos(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                <strong className="text-slate-900">2. Regra dos Quatro Olhos:</strong> Tenho ciência de que solicitações de 2ª, 3ª e 4ª alçadas requerem a aprovação cumulativa e independente de diferentes autoridades.
              </span>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={decFracionamento}
                onChange={(e) => setDecFracionamento(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                <strong className="text-slate-900">3. Proibição Expressa de Fracionamento:</strong> Declaro sob responsabilidade funcional que esta despesa não decorre de fracionamento artificial de compra ou contrato visando contornar os limites da POL-DIR-01.
              </span>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={decConflito}
                onChange={(e) => setDecConflito(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                <strong className="text-slate-900">4. Ausência de Conflito de Interesses:</strong> Declaro não possuir qualquer vínculo societário, familiar ou de parentesco direto com o fornecedor favorecido indicado.
              </span>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={decPrevia}
                onChange={(e) => setDecPrevia(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700">
                <strong className="text-slate-900">5. Aprovação Prévia ao Compromisso:</strong> Confirmo que nenhum compromisso financeiro formal ou informal foi assumido antes da autorização competente das alçadas designadas.
              </span>
            </label>
          </div>
        </div>

        {/* Submit & Cancel Footer Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-sm transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition flex items-center space-x-2 disabled:opacity-50"
          >
            {submitting ? (
              <span>Gravando e Enquadrando...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submeter Solicitação FOR-FIN-01</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
