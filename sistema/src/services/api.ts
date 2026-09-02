import {
  Solicitacao,
  MatrizAlcada,
  Processo,
  User,
  AuditLog,
  NotificationItem,
  SystemConfig,
  RiskLevel,
} from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Auth
  async login(email: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro no login');
    }
    return res.json();
  }

  async sendOtp(email: string) {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  }

  async verifyOtp(email: string, code: string) {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Código inválido');
    }
    return res.json();
  }

  async getMe(): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Não autenticado');
    return res.json();
  }

  async getUsers(): Promise<{ users: User[] }> {
    const res = await fetch(`${API_BASE}/users`, { headers: this.getHeaders() });
    return res.json();
  }

  async createUser(userData: Partial<User>): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao cadastrar usuário');
    }
    return res.json();
  }

  async updateUser(id: string, userData: Partial<User>): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao atualizar usuário');
    }
    return res.json();
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao remover usuário');
    }
    return res.json();
  }

  // Processes
  async getProcesses(): Promise<{ processes: Processo[] }> {
    const res = await fetch(`${API_BASE}/processes`, { headers: this.getHeaders() });
    return res.json();
  }

  async createProcess(processData: Partial<Processo>): Promise<{ process: Processo }> {
    const res = await fetch(`${API_BASE}/processes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(processData),
    });
    return res.json();
  }

  // Matrices
  async getMatrixVersions(): Promise<{ matrices: MatrizAlcada[] }> {
    const res = await fetch(`${API_BASE}/matrix/versions`, { headers: this.getHeaders() });
    return res.json();
  }

  async getActiveMatrix(): Promise<{ matrix: MatrizAlcada }> {
    const res = await fetch(`${API_BASE}/matrix/active`, { headers: this.getHeaders() });
    return res.json();
  }

  async createMatrixVersion(data: any): Promise<{ matrix: MatrizAlcada }> {
    const res = await fetch(`${API_BASE}/matrix/create-version`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async publishMatrix(id: string): Promise<{ matrix: MatrizAlcada }> {
    const res = await fetch(`${API_BASE}/matrix/${id}/publish`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async updateMatrixRule(matrixId: string, ruleId: string, ruleData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/matrix/${matrixId}/rules/${ruleId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(ruleData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao atualizar regra');
    }
    return res.json();
  }

  // Requests
  async calculateEnquadramento(params: {
    processoId: string;
    valorTotal: number;
    criteriosRisco?: any;
    cpfCnpj?: string;
    centroCusto?: string;
    excludeRequestId?: string;
  }) {
    const res = await fetch(`${API_BASE}/requests/calculate-enquadramento`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao calcular enquadramento');
    }
    return res.json();
  }

  async getRequests(params?: {
    status?: string;
    area?: string;
    search?: string;
    risk?: string;
    minhaFila?: boolean;
  }): Promise<{ total: number; requests: Solicitacao[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.area) query.set('area', params.area);
    if (params?.search) query.set('search', params.search);
    if (params?.risk) query.set('risk', params.risk);
    if (params?.minhaFila) query.set('minhaFila', 'true');

    const res = await fetch(`${API_BASE}/requests?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async getRequestById(id: string): Promise<{ request: Solicitacao }> {
    const res = await fetch(`${API_BASE}/requests/${id}`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Solicitação não encontrada');
    return res.json();
  }

  async createRequest(data: any): Promise<{ request: Solicitacao }> {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao criar solicitação');
    }
    return res.json();
  }

  // Approvals
  async submitApproval(
    requestId: string,
    data: {
      decisao: 'APROVADO' | 'REPROVADO' | 'DEVOLVIDO';
      justificativa?: string;
      declaracaoConflitoInteresse: boolean;
    }
  ): Promise<{ request: Solicitacao; message: string }> {
    const res = await fetch(`${API_BASE}/requests/${requestId}/approvals`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao processar aprovação');
    }
    return res.json();
  }

  // Finance Conference
  async submitFinanceConference(
    requestId: string,
    data: {
      nfFaturaConferida: boolean;
      contratoConferido: boolean;
      cotacoesConferidas: boolean;
      boletoConferido: boolean;
      certidoesConferidas: boolean;
      retencaoISS: boolean;
      retencaoINSS: boolean;
      retencaoIRRF: boolean;
      retencaoPIS_COFINS_CSLL: boolean;
      retencaoNaoAplicavel: boolean;
      valorRetencoes: number;
      decisao: 'LIBERADO_PAGAMENTO' | 'DEVOLVIDO_AREA';
      pendenciasObservacoes?: string;
    }
  ): Promise<{ request: Solicitacao; message: string }> {
    const res = await fetch(`${API_BASE}/requests/${requestId}/finance`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha na conferência financeira');
    }
    return res.json();
  }

  // Treasury Payment
  async submitTreasuryPayment(
    requestId: string,
    data: {
      dataPagamento: string;
      bancoUtilizado: string;
      agenciaUtilizada?: string;
      contaUtilizada?: string;
      formaEfetivaPagamento: string;
      numeroComprovante: string;
      observacoes?: string;
    }
  ): Promise<{ request: Solicitacao; message: string }> {
    const res = await fetch(`${API_BASE}/requests/${requestId}/payment`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Falha ao registrar pagamento');
    }
    return res.json();
  }

  // Documents upload
  async uploadDocument(requestId: string, docData: any) {
    const res = await fetch(`${API_BASE}/requests/${requestId}/documents`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(docData),
    });
    return res.json();
  }

  // Stats & KPIs
  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/dashboard/stats`, { headers: this.getHeaders() });
    return res.json();
  }

  async getDashboardMetrics() {
    return this.getDashboardStats();
  }

  // Audit Logs
  async getAuditLogs(params?: { solicitacaoId?: string; entidade?: string; acao?: string }) {
    const query = new URLSearchParams();
    if (params?.solicitacaoId) query.set('solicitacaoId', params.solicitacaoId);
    if (params?.entidade) query.set('entidade', params.entidade);
    if (params?.acao) query.set('acao', params.acao);

    const res = await fetch(`${API_BASE}/audit-logs?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  // Notifications
  async getNotifications(): Promise<{ notifications: NotificationItem[] }> {
    const res = await fetch(`${API_BASE}/notifications`, { headers: this.getHeaders() });
    return res.json();
  }

  async markNotificationRead(id: string) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  // Settings
  async getSettings(): Promise<{ config: SystemConfig }> {
    const res = await fetch(`${API_BASE}/settings`, { headers: this.getHeaders() });
    return res.json();
  }

  async updateSettings(config: Partial<SystemConfig>): Promise<{ config: SystemConfig }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(config),
    });
    return res.json();
  }

  // SGQ
  async getSGQRepository() {
    const res = await fetch(`${API_BASE}/sgq-repository`, { headers: this.getHeaders() });
    return res.json();
  }
}

export const api = new ApiService();
