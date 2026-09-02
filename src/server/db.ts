import { db as sqlDb } from '../db/index.ts';
import { appData } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import {
  User,
  ProcessItem,
  MatrizAlcada,
  RegraAlcada,
  Solicitacao,
  AuditLog,
  SystemNotification,
  SystemConfig,
  CostCenter,
} from '../types.ts';

// Cloud SQL PostgreSQL transactional data store
class Database {
  users: User[] = [];
  processes: ProcessItem[] = [];
  matrices: MatrizAlcada[] = [];
  requests: Solicitacao[] = [];
  auditLogs: AuditLog[] = [];
  notifications: SystemNotification[] = [];
  costCenters: CostCenter[] = [];
  config: SystemConfig = {
    id: 'cfg-default',
    diasUteisAlertaVencimento: 5,
    janelaDiasDeteccaoFracionamento: 30,
    bloquearEstouroTetoMensal: false,
    exigirOtpLogin: false,
    restringirDominioGoogleOAuth: false,
    dominioPermitido: '@sbsaude.com.br',
    slaAprovacaoHoras: 48,
    sgqRepositorioCodigo: 'POL-DIR-01 / FOR-FIN-01 (ISO 9001:2015 7.5)',
    tempoRetencaoAnos: 2,
  };
  otpCodes: Map<string, { code: string; expiresAt: number }> = new Map();

  constructor() {
    this.seed();
  }

  public async loadFromDatabase() {
    try {
      // Load all collections directly from Cloud SQL PostgreSQL
      const rows = await sqlDb.select().from(appData);
      if (rows.length > 0) {
        const usersList: User[] = [];
        const processesList: ProcessItem[] = [];
        const matricesList: MatrizAlcada[] = [];
        const requestsList: Solicitacao[] = [];
        const logsList: AuditLog[] = [];
        const notifsList: SystemNotification[] = [];
        const costCentersList: CostCenter[] = [];
        let loadedConfig: SystemConfig | null = null;

        for (const row of rows) {
          if (row.collection === 'users') usersList.push(row.data as User);
          else if (row.collection === 'processes') processesList.push(row.data as ProcessItem);
          else if (row.collection === 'matrices') matricesList.push(row.data as MatrizAlcada);
          else if (row.collection === 'requests') requestsList.push(row.data as Solicitacao);
          else if (row.collection === 'auditLogs') logsList.push(row.data as AuditLog);
          else if (row.collection === 'notifications') notifsList.push(row.data as SystemNotification);
          else if (row.collection === 'costCenters') costCentersList.push(row.data as CostCenter);
          else if (row.collection === 'config') loadedConfig = row.data as SystemConfig;
        }

        if (usersList.length > 0) this.users = usersList;
        if (processesList.length > 0) this.processes = processesList;
        if (matricesList.length > 0) {
          this.matrices = matricesList;
        } else {
          for (const m of this.matrices) await this.syncToSql('matrices', m.id, m);
        }
        if (requestsList.length > 0) this.requests = requestsList;
        if (logsList.length > 0) this.auditLogs = logsList;
        if (notifsList.length > 0) this.notifications = notifsList;
        if (costCentersList.length > 0) this.costCenters = costCentersList;
        else {
          for (const c of this.costCenters) await this.syncToSql('costCenters', c.id, c);
        }
        if (loadedConfig) this.config = { ...this.config, ...loadedConfig };

        // Ensure robust user password persistence and prevent masked placeholders
        let usersUpdated = false;
        for (const user of this.users) {
          const userEmail = (user.email || '').toLowerCase().trim();
          const userGoogleEmail = (user.googleEmail || '').toLowerCase().trim();

          // Ramon Reis account configuration
          if (userEmail.includes('ramon') || userGoogleEmail.includes('ramonreis')) {
            if (!user.password || user.password === '••••••••') {
              user.password = 'v3ntimL3m0s';
            }
            user.email = 'ramon.reis@sbsaude.com.br';
            user.googleEmail = 'ramonreis.mmn@gmail.com';
            user.status = 'ATIVO';
            user.mustChangePassword = false;
            user.tempPassword = undefined;
            await this.syncToSql('users', user.id, user);
            usersUpdated = true;
          } 
          // Default fallback passwords for users with empty/masked placeholders
          else if (!user.password || user.password === '••••••••') {
            user.password = '123456';
            await this.syncToSql('users', user.id, user);
            usersUpdated = true;
          }
        }

        console.log(`[Cloud SQL Postgres] Dados carregados com sucesso: ${this.users.length} usuários, ${this.requests.length} solicitações, ${this.matrices.length} matrizes.`);
      } else {
        // Initial database seed to Cloud SQL PostgreSQL
        console.log('[Cloud SQL Postgres] Banco vazio. Realizando seed inicial...');
        for (const u of this.users) await this.syncToSql('users', u.id, u);
        for (const c of this.costCenters) await this.syncToSql('costCenters', c.id, c);
        for (const p of this.processes) await this.syncToSql('processes', p.id, p);
        for (const m of this.matrices) await this.syncToSql('matrices', m.id, m);
        for (const r of this.requests) await this.syncToSql('requests', r.id, r);
        for (const l of this.auditLogs) await this.syncToSql('auditLogs', l.id, l);
        for (const n of this.notifications) await this.syncToSql('notifications', n.id, n);
        await this.syncToSql('config', 'cfg-default', this.config);
        console.log('[Cloud SQL Postgres] Seed inicial concluído.');
      }

      this.syncCostCentersFromMatrices();
    } catch (e: any) {
      console.error('[Cloud SQL Postgres] Erro ao sincronizar com o banco:', e?.message || e);
    }
  }

  // Alias for backward compatibility if called
  public async loadFromFirestore() {
    return this.loadFromDatabase();
  }

  public async syncToSql(collection: string, docId: string, data: any) {
    try {
      await sqlDb.insert(appData).values({
        collection,
        id: docId,
        data,
      }).onConflictDoUpdate({
        target: [appData.collection, appData.id],
        set: {
          data,
          updatedAt: new Date(),
        },
      });
    } catch (e: any) {
      console.warn(`[Cloud SQL Postgres] Erro ao gravar (${collection}/${docId}):`, e?.message || e);
    }
  }

  public async syncToFirestore(collection: string, docId: string, data: any) {
    return this.syncToSql(collection, docId, data);
  }

  public async deleteFromSql(collection: string, docId: string) {
    try {
      await sqlDb.delete(appData).where(and(eq(appData.collection, collection), eq(appData.id, docId)));
    } catch (e: any) {
      console.warn(`[Cloud SQL Postgres] Erro ao excluir (${collection}/${docId}):`, e?.message || e);
    }
  }

  public async deleteFromFirestore(collection: string, docId: string) {
    return this.deleteFromSql(collection, docId);
  }

  private seed() {
    // 0. Seed Cost Centers (including core departmental units and extracted matrix cargo positions)
    this.costCenters = [
      { id: 'cc-1010', codigo: 'CC-1010', nome: 'Recursos Humanos', descricao: 'Gestão de Pessoas e Departamento Pessoal', responsavel: 'Raquel Marimon', ativo: true },
      { id: 'cc-1010-cgg', codigo: 'CC-1010-CGG', nome: 'Coord. Gente e Gestão', descricao: 'Coordenação de Gente e Gestão (1ª Alçada)', responsavel: 'Raquel Marimon', ativo: true },
      { id: 'cc-1010-agg', codigo: 'CC-1010-AGG', nome: 'Analista de Gente e Gestão', descricao: 'Analista de Gente e Gestão (1ª Alçada)', responsavel: 'Raquel Marimon', ativo: true },
      { id: 'cc-2020', codigo: 'CC-2020', nome: 'Rede Credenciada', descricao: 'Relacionamento e Gestão da Rede Credenciada', responsavel: 'Haroldo Peon / Juliana Barbosa', ativo: true },
      { id: 'cc-2020-scr', codigo: 'CC-2020-SCR', nome: 'Supervisor de Credenciamento', descricao: 'Supervisão de Credenciamento (1ª Alçada)', responsavel: 'Haroldo Peon', ativo: true },
      { id: 'cc-2020-scm', codigo: 'CC-2020-SCM', nome: 'Supervisora de Credenciamento', descricao: 'Supervisora de Credenciamento (2ª Alçada)', responsavel: 'Haroldo Peon', ativo: true },
      { id: 'cc-2020-gcr', codigo: 'CC-2020-GCR', nome: 'Gerência de Credenciamento', descricao: 'Gerência de Credenciamento (2ª Alçada)', responsavel: 'Juliana Barbosa / Christiane Macedo', ativo: true },
      { id: 'cc-2020-ger', codigo: 'CC-2020-GER', nome: 'Gerente Credenciamento', descricao: 'Gerente de Credenciamento (2ª Alçada)', responsavel: 'Juliana Barbosa', ativo: true },
      { id: 'cc-2020-gca', codigo: 'CC-2020-GCA', nome: 'Gerente de Credenciamento e Núcleo Assistencial', descricao: 'Gerência de Credenciamento e Assistencial (2ª Alçada)', responsavel: 'Christiane Macedo', ativo: true },
      { id: 'cc-2030-gna', codigo: 'CC-2030-GNA', nome: 'Gerência de Núcleo Assistencial', descricao: 'Gerência de Núcleo Assistencial (2ª Alçada)', responsavel: 'Christiane Macedo', ativo: true },
      { id: 'cc-2010-cas', codigo: 'CC-2010-CAS', nome: 'Coordenação Assistencial', descricao: 'Coordenação Assistencial (1ª Alçada)', responsavel: 'Coordenação Assistencial', ativo: true },
      { id: 'cc-2010-neb', codigo: 'CC-2010-NEB', nome: 'Coordenador Núcleo de Experiência do Beneficiário', descricao: 'Experiência do Beneficiário / NIPs (1ª Alçada)', responsavel: 'Coordenador de Experiência', ativo: true },
      { id: 'cc-3030', codigo: 'CC-3030', nome: 'Finanças', descricao: 'Tesouraria, Contabilidade e Controladoria', responsavel: 'Janine Sena', ativo: true },
      { id: 'cc-3030-cfi', codigo: 'CC-3030-CFI', nome: 'Coordenadora de Finanças', descricao: 'Coordenação Financeira (1ª Alçada)', responsavel: 'Janine Sena', ativo: true },
      { id: 'cc-3000-dfi', codigo: 'CC-3000-DFI', nome: 'Diretoria Financeira', descricao: 'Diretoria Financeira (3ª Alçada)', responsavel: 'Roberto Guimarães', ativo: true },
      { id: 'cc-3000-dir', codigo: 'CC-3000-DIR', nome: 'Diretor Financeiro', descricao: 'Diretor Financeiro (3ª Alçada)', responsavel: 'Roberto Guimarães', ativo: true },
      { id: 'cc-4040', codigo: 'CC-4040', nome: 'Marketing', descricao: 'Comunicação, Mídia e Captação', responsavel: 'Dr. Carlos Eduardo', ativo: true },
      { id: 'cc-4040-mkt', codigo: 'CC-4040-MKT', nome: 'Gerente de COM & MKT', descricao: 'Gerência de Comunicação e Marketing (2ª Alçada)', responsavel: 'Dr. Carlos Eduardo', ativo: true },
      { id: 'cc-4010-ccm', codigo: 'CC-4010-CCM', nome: 'Coordenadora Comercial', descricao: 'Coordenação Comercial e Pós-Venda (1ª Alçada)', responsavel: 'Coordenadora Comercial', ativo: true },
      { id: 'cc-5050', codigo: 'CC-5050', nome: 'Operações', descricao: 'Operações Corporativas e Logística', responsavel: 'Dra. Mariana Silva', ativo: true },
      { id: 'cc-5000-dop', codigo: 'CC-5000-DOP', nome: 'Diretoria de Operações', descricao: 'Diretoria de Operações (3ª Alçada)', responsavel: 'Dra. Mariana Silva', ativo: true },
      { id: 'cc-5000-dro', codigo: 'CC-5000-DRO', nome: 'Diretora de Operações', descricao: 'Diretora de Operações (3ª Alçada)', responsavel: 'Dra. Mariana Silva', ativo: true },
      { id: 'cc-6060', codigo: 'CC-6060', nome: 'Tecnologia da Informação', descricao: 'Sistemas, Infraestrutura e Segurança', responsavel: 'Ramon Reis', ativo: true },
      { id: 'cc-7070', codigo: 'CC-7070', nome: 'Jurídico', descricao: 'Compliance e Assuntos Jurídicos', responsavel: 'Dr. Roberto', ativo: true },
      { id: 'cc-7010-cnr', codigo: 'CC-7010-CNR', nome: 'Coordenador de Núcleo Regulatório', descricao: 'Coordenação de Núcleo Regulatório (1ª Alçada)', responsavel: 'Coordenador Regulatório', ativo: true },
      { id: 'cc-8080-gql', codigo: 'CC-8080-GQL', nome: 'Gerente da Qualidade', descricao: 'Gerência de Qualidade e SGQ (2ª Alçada)', responsavel: 'Vanessa Duarte', ativo: true },
      { id: 'cc-9000-dec', codigo: 'CC-9000-DEC', nome: 'Diretoria Executiva / Conselho', descricao: 'Diretoria Executiva / Conselho de Administração (4ª Alçada)', responsavel: 'Janaína Mascarenhas', ativo: true },
      { id: 'cc-9000-dex', codigo: 'CC-9000-DEX', nome: 'Diretoria Executiva', descricao: 'Diretoria Executiva (4ª Alçada)', responsavel: 'Janaína Mascarenhas', ativo: true },
      { id: 'cc-9000-csh', codigo: 'CC-9000-CSH', nome: 'Conselho', descricao: 'Conselho Deliberativo (4ª Alçada)', responsavel: 'Conselho de Administração', ativo: true },
    ];

    // 1. Seed Users (SB Saúde official corporate structure with multi-cost-centers support)
    this.users = [
      {
        id: 'usr-ramon',
        name: 'Ramon Reis',
        email: 'ramon.reis@sbsaude.com.br',
        googleEmail: 'ramonreis.mmn@gmail.com',
        cargo: 'Analista de Sistemas',
        area: 'Tecnologia da Informação',
        centroCusto: 'CC-6060 - Tecnologia da Informação',
        centrosCusto: ['CC-6060 - Tecnologia da Informação', 'CC-1010 - Recursos Humanos', 'CC-5050 - Operações'],
        phone: '(11) 99999-8888',
        roles: ['ADMINISTRADOR', 'SOLICITANTE', 'APROVADOR_1', 'APROVADOR_2', 'APROVADOR_3', 'APROVADOR_4', 'FINANCEIRO', 'TESOURARIA'],
        status: 'ATIVO',
        authType: 'GOOGLE',
        isEmailVerified: true,
        password: 'v3ntimL3m0s',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-1',
        name: 'Raquel Marimon',
        email: 'raquel.marimon@sbsaude.com.br',
        cargo: 'Analista de Gente e Gestão',
        area: 'Gente e Gestão',
        centroCusto: 'CC-1010 - Recursos Humanos',
        centrosCusto: ['CC-1010 - Recursos Humanos', 'CC-1010-AGG - Analista de Gente e Gestão', 'CC-1010-CGG - Coord. Gente e Gestão'],
        phone: '(11) 98765-4321',
        roles: ['SOLICITANTE', 'APROVADOR_1'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-2',
        name: 'Haroldo Peon',
        email: 'haroldo.peon@sbsaude.com.br',
        cargo: 'Supervisor de Credenciamento',
        area: 'Credenciamento',
        centroCusto: 'CC-2020 - Rede Credenciada',
        centrosCusto: ['CC-2020 - Rede Credenciada', 'CC-2020-SCR - Supervisor de Credenciamento'],
        phone: '(11) 98765-1111',
        roles: ['APROVADOR_1'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-juliana',
        name: 'Juliana Barbosa',
        email: 'juliana.barbosa@sbsaude.com.br',
        cargo: 'Gerente de Credenciamento e Núcleo Assistencial',
        area: 'Credenciamento',
        centroCusto: 'CC-2020 - Rede Credenciada',
        centrosCusto: ['CC-2020 - Rede Credenciada', 'CC-2020-GCR - Gerência de Credenciamento', 'CC-2020-GER - Gerente Credenciamento', 'CC-2020-GCA - Gerente de Credenciamento e Núcleo Assistencial'],
        phone: '(11) 98765-3322',
        roles: ['APROVADOR_2'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-3',
        name: 'Janine Sena',
        email: 'janine.sena@sbsaude.com.br',
        cargo: 'Coordenadora de Finanças',
        area: 'Finanças e Controladoria',
        centroCusto: 'CC-3030 - Finanças',
        centrosCusto: ['CC-3030 - Finanças', 'CC-3030-CFI - Coordenadora de Finanças'],
        phone: '(11) 98765-2222',
        roles: ['APROVADOR_1'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-4',
        name: 'Christiane Macedo',
        email: 'christiane.macedo@sbsaude.com.br',
        cargo: 'Gerente de Credenciamento e Núcleo Assistencial',
        area: 'Núcleo Assistencial',
        centroCusto: 'CC-2020 - Rede Credenciada',
        centrosCusto: ['CC-2020 - Rede Credenciada', 'CC-2020-GCA - Gerente de Credenciamento e Núcleo Assistencial', 'CC-2030-GNA - Gerência de Núcleo Assistencial'],
        phone: '(11) 98765-3333',
        roles: ['APROVADOR_2'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-5',
        name: 'Dr. Carlos Eduardo',
        email: 'carlos.eduardo@sbsaude.com.br',
        cargo: 'Gerente de COM & MKT',
        area: 'Comunicação e Marketing',
        centroCusto: 'CC-4040 - Marketing',
        centrosCusto: ['CC-4040 - Marketing', 'CC-4040-MKT - Gerente de COM & MKT'],
        phone: '(11) 98765-4444',
        roles: ['APROVADOR_2'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-6',
        name: 'Dra. Mariana Silva',
        email: 'mariana.silva@sbsaude.com.br',
        cargo: 'Diretora de Operações',
        area: 'Diretoria de Operações',
        centroCusto: 'CC-5050 - Operações',
        centrosCusto: ['CC-5050 - Operações', 'CC-5000-DOP - Diretoria de Operações', 'CC-5000-DRO - Diretora de Operações'],
        phone: '(11) 98765-5555',
        roles: ['APROVADOR_3'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-7',
        name: 'Roberto Guimarães',
        email: 'roberto.guimaraes@sbsaude.com.br',
        cargo: 'Diretor Financeiro',
        area: 'Diretoria Financeira',
        centroCusto: 'CC-3030 - Finanças',
        centrosCusto: ['CC-3030 - Finanças', 'CC-3000-DFI - Diretoria Financeira', 'CC-3000-DIR - Diretor Financeiro'],
        phone: '(11) 98765-6666',
        roles: ['APROVADOR_3'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-8',
        name: 'Janaína Mascarenhas',
        email: 'janaina.mascarenhas@sbsaude.com.br',
        cargo: 'Diretoria Executiva / Conselho',
        area: 'Presidência Executiva',
        centroCusto: 'CC-9000-DEC - Diretoria Executiva / Conselho',
        centrosCusto: ['CC-9000-DEC - Diretoria Executiva / Conselho', 'CC-9000-DEX - Diretoria Executiva', 'CC-9000-CSH - Conselho'],
        phone: '(11) 98765-7777',
        roles: ['APROVADOR_4'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-9',
        name: 'Patrícia Mendes',
        email: 'patricia.mendes@sbsaude.com.br',
        cargo: 'Analista de Contas a Pagar / Financeiro',
        area: 'Contas a Pagar',
        centroCusto: 'CC-3030 - Finanças',
        centrosCusto: ['CC-3030 - Finanças'],
        phone: '(11) 98765-8888',
        roles: ['FINANCEIRO'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-10',
        name: 'Fernando Rocha',
        email: 'fernando.rocha@sbsaude.com.br',
        cargo: 'Coordenador de Tesouraria',
        area: 'Tesouraria',
        centroCusto: 'CC-3030 - Finanças',
        centrosCusto: ['CC-3030 - Finanças'],
        phone: '(11) 98765-9999',
        roles: ['TESOURARIA'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
      {
        id: 'usr-11',
        name: 'Vanessa Duarte',
        email: 'vanessa.duarte@sbsaude.com.br',
        cargo: 'Gerente de Governança e SGQ / Admin',
        area: 'Governança e Qualidade',
        centroCusto: 'CC-8080-GQL - Gerente da Qualidade',
        centrosCusto: ['CC-8080-GQL - Gerente da Qualidade', 'CC-7070 - Jurídico'],
        phone: '(11) 98765-0000',
        roles: ['ADMINISTRADOR'],
        status: 'ATIVO',
        authType: 'EMAIL_PASSWORD',
        isEmailVerified: true,
        password: '123456',
        createdAt: '2026-07-01T08:00:00Z',
        lastLoginAt: '2026-08-27T07:30:00Z',
      },
    ];

    // 2. Seed All Processes from POL-DIR-01
    const rawProcesses: Array<Omit<ProcessItem, 'createdAt' | 'updatedAt'>> = [
      {
        id: 'proc-01',
        code: 'PRC-DEMISSOES-ALTO-RISCO',
        name: 'Demissões de alto risco jurídico ou envolvendo cargos estratégicos',
        description: 'Desligamentos estratégicos ou com potencial de litígio trabalhista relevante',
        natureza: 'RH',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: true,
        cargoHabilitadoDocumento: 'Diretoria de Operações',
        cargosHabilitadosSolicitante: ["Diretoria de Operações","Diretora de Operações","Operações","CC-5050","CC-5000-DOP"],
        ativo: true,
      },
      {
        id: 'proc-02',
        code: 'PRC-COMPRAS-TI',
        name: 'Compras de equipamento e outras demandas de tecnologia da informação (TI)',
        description: 'Aquisição de hardware, infraestrutura de servidores e licenças de software corporativo',
        natureza: 'TI',
        riscoPadrao: 'BAIXO',
        requerJustificativaTecnica: false,
        permiteParcelamento: true,
        cargoHabilitadoDocumento: 'DIRETORIA FINANCEIRA',
        cargosHabilitadosSolicitante: ["DIRETORIA FINANCEIRA","Diretoria Financeira","Diretor Financeiro","CC-3000-DFI","CC-3030"],
        ativo: true,
      },
      {
        id: 'proc-03',
        code: 'PRC-PRESTADORES-REDE',
        name: 'Pagamento de prestadores (Rede)',
        description: 'Honorários médicos, clínicas, laboratórios e rede hospitalar credenciada',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerente Credenciamento',
        cargosHabilitadosSolicitante: ["Gerente Credenciamento","Gerência de Credenciamento","Gerente de Credenciamento e Núcleo Assistencial","Credenciamento","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-04',
        code: 'PRC-PARTOS-EMERGENCIAIS',
        name: 'Autorização de partos Emergenciais / Eletivos',
        description: 'Procedimentos obstétricos e partos em maternidades parceiras',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Acolhimento a Gestantes',
        cargosHabilitadosSolicitante: ["Acolhimento a Gestantes","Coordenação Assistencial","Gerência de Núcleo Assistencial","Núcleo Assistencial","Credenciamento","CC-2010-CAS","CC-2020","CC-2030-GNA"],
        ativo: true,
      },
      {
        id: 'proc-05',
        code: 'PRC-PAGAMENTOS-DIVERSOS-DIR',
        name: 'Autorização de pagamentos diversos (Diretoria)',
        description: 'Despesas extraordinárias e demandas estratégicas corporativas',
        natureza: 'FINANCEIRO',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: true,
        cargoHabilitadoDocumento: 'Diretora de Operações',
        cargosHabilitadosSolicitante: ["Diretora de Operações","Diretoria de Operações","Operações","CC-5050","CC-5000-DOP"],
        ativo: true,
      },
      {
        id: 'proc-06',
        code: 'PRC-CIRURGIA-EMERGENCIAL',
        name: 'Autorização de cirurgia emergencial',
        description: 'Cirurgias urgentes e intervenções hospitalares imediatas',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerente Credenciamento',
        cargosHabilitadosSolicitante: ["Gerente Credenciamento","Gerência de Credenciamento","Gerente de Credenciamento e Núcleo Assistencial","Credenciamento","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-07',
        code: 'PRC-ONCO-CRONICOS-ALTA',
        name: 'Procedimentos oncológicos/Crônicos de maior complexidade (acima R$ 2.001,00)',
        description: 'Tratamentos oncológicos contínuos, quimioterapia, imunoterapia e terapias de alto custo',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: true,
        cargoHabilitadoDocumento: 'Gerência de Núcleo Assistencial',
        cargosHabilitadosSolicitante: ["Gerência de Núcleo Assistencial","Gerente de Credenciamento e Núcleo Assistencial","Núcleo Assistencial","CC-2030-GNA","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-08',
        code: 'PRC-CIRURGIAS-JUDICIAIS',
        name: 'Autorização de Cirurgias provenientes de processos judiciais',
        description: 'Cumprimento de liminares e determinações judiciais para cirurgias',
        natureza: 'JURIDICO',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Coordenador de Núcleo Regulatório',
        cargosHabilitadosSolicitante: ["Coordenador de Núcleo Regulatório","Núcleo Regulatório","Jurídico","CC-7010-CNR","CC-7070"],
        ativo: true,
      },
      {
        id: 'proc-09',
        code: 'PRC-NIPS-ELETIVAS',
        name: 'Autorização de NIPs eletivas',
        description: 'Demandas da Notificação de Intermediação Preliminar da ANS em caráter eletivo',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Coordenador Núcleo de Experiência do Beneficiário',
        cargosHabilitadosSolicitante: ["Coordenador Núcleo de Experiência do Beneficiário","Núcleo de Experiência do Beneficiário","Experiência do Beneficiário","Atendimento","CC-2010-NEB","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-10',
        code: 'PRC-PREPAG-CONSULTAS-EXAMES',
        name: 'Pré pagamentos de consultas e exames eletivo',
        description: 'Adiantamento e pré-pagamento para clínicas e laboratórios de rotina',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'MEDIO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Supervisor de Credenciamento',
        cargosHabilitadosSolicitante: ["Supervisor de Credenciamento","Supervisora de Credenciamento","Credenciamento","CC-2020-SCR","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-11',
        code: 'PRC-NIP-URGENCIA',
        name: 'Autorização de NIP de urgência',
        description: 'Notificação de Intermediação Preliminar ANS com prazo urgente/crítico',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Coordenador Núcleo de Experiência do Beneficiário',
        cargosHabilitadosSolicitante: ["Coordenador Núcleo de Experiência do Beneficiário","Núcleo de Experiência do Beneficiário","Experiência do Beneficiário","Atendimento","CC-2010-NEB","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-12',
        code: 'PRC-PREPAG-NIPEIROS',
        name: 'Pré pagamentos de beneficiários com reclamações reincidentes (Nipeiros)',
        description: 'Liberação assistencial para mitigação de riscos de reincidência perante a ANS',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerente da Qualidade',
        cargosHabilitadosSolicitante: ["Gerente da Qualidade","Gerente de Governança e SGQ","Qualidade","Governança e Qualidade","CC-8080-GQL","CC-8080"],
        ativo: true,
      },
      {
        id: 'proc-13',
        code: 'PRC-REEMBOLSO',
        name: 'Reembolso',
        description: 'Reembolso de despesas médico-hospitalares conforme contrato do plano',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'MEDIO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerência de Núcleo Assistencial',
        cargosHabilitadosSolicitante: ["Gerência de Núcleo Assistencial","Gerente de Credenciamento e Núcleo Assistencial","Núcleo Assistencial","CC-2030-GNA","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-14',
        code: 'PRC-ACORDOS-JUDICIAIS',
        name: 'Autorização de Acordos Judiciais',
        description: 'Homologação e pagamentos de acordos e conciliações cíveis e assistenciais',
        natureza: 'JURIDICO',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: true,
        cargoHabilitadoDocumento: 'Coordenador de Núcleo Regulatório',
        cargosHabilitadosSolicitante: ["Coordenador de Núcleo Regulatório","Núcleo Regulatório","Jurídico","CC-7010-CNR","CC-7070"],
        ativo: true,
      },
      {
        id: 'proc-15',
        code: 'PRC-ANESTESIAS',
        name: 'Autorização de Anestesias',
        description: 'Honorários de equipes anestésicas e cooperativas anestesiológicas',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'MEDIO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Supervisor de Credenciamento',
        cargosHabilitadosSolicitante: ["Supervisor de Credenciamento","Supervisora de Credenciamento","Credenciamento","CC-2020-SCR","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-16',
        code: 'PRC-ACOES-EXTERNAS-MKT',
        name: 'Ações Externas (Parceiros / Corretores / Beneficiários)',
        description: 'Eventos institucionais externos, stands, relacionamento e premiações',
        natureza: 'MARKETING',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'proc-17',
        code: 'PRC-POS-VENDA',
        name: 'Pagamentos de demandas do Pós Venda',
        description: 'Ressarcimentos e adequações contratuais pós-adesão',
        natureza: 'OPERACIONAL',
        riscoPadrao: 'MEDIO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Coordenadora Comercial',
        cargosHabilitadosSolicitante: ["Coordenadora Comercial","Comercial","Pós Venda","CC-4010-CCM","CC-4040"],
        ativo: true,
      },
      {
        id: 'proc-18',
        code: 'PRC-INFLUENCER-MIDIA',
        name: 'Influencer Mídia',
        description: 'Contratação de influenciadores e campanhas de alcance em mídias sociais',
        natureza: 'MARKETING',
        riscoPadrao: 'MEDIO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'proc-19',
        code: 'PRC-PROC-AMB-ACIMA-2K',
        name: 'Procedimentos ambulatoriais eletivos (acima de R$ 2.001,00)',
        description: 'Consultas especializadas e procedimentos ambulatoriais de maior custo',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'BAIXO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerência de Núcleo Assistencial',
        cargosHabilitadosSolicitante: ["Gerência de Núcleo Assistencial","Gerente de Credenciamento e Núcleo Assistencial","Núcleo Assistencial","CC-2030-GNA","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-20',
        code: 'PRC-CIRURGIAS-MAIOR-COMPLEX',
        name: 'Cirurgias de maior complexidade (acima R$ 2.001,00)',
        description: 'Intervenções cirúrgicas de médio e grande porte',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Diretoria de Operações',
        cargosHabilitadosSolicitante: ["Diretoria de Operações","Diretora de Operações","Operações","CC-5050","CC-5000-DOP"],
        ativo: true,
      },
      {
        id: 'proc-21',
        code: 'PRC-PROC-AMB-ATE-2K',
        name: 'Procedimentos ambulatoriais eletivos (até R$ 2.000,00)',
        description: 'Exames e consultas de rotina em clínicas credenciadas',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'BAIXO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Supervisor de Credenciamento',
        cargosHabilitadosSolicitante: ["Supervisor de Credenciamento","Supervisora de Credenciamento","Credenciamento","CC-2020-SCR","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-22',
        code: 'PRC-CIRURGIAS-MENOR-COMPLEX',
        name: 'Cirurgias de menor complexidade (até R$ 2.000,00)',
        description: 'Pequenas cirurgias e procedimentos de curta permanência',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'MEDIO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Supervisor de Credenciamento',
        cargosHabilitadosSolicitante: ["Supervisor de Credenciamento","Supervisora de Credenciamento","Credenciamento","CC-2020-SCR","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-23',
        code: 'PRC-ONCO-CRONICOS-ATE-2K',
        name: 'Procedimentos oncológicos / Crônicos de menor complexidade (até R$ 2.000,00)',
        description: 'Medicamentos orais e aplicações de suporte ambulatorial oncológico',
        natureza: 'ASSISTENCIAL',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Supervisor de Credenciamento',
        cargosHabilitadosSolicitante: ["Supervisor de Credenciamento","Supervisora de Credenciamento","Credenciamento","CC-2020-SCR","CC-2020"],
        ativo: true,
      },
      {
        id: 'proc-24',
        code: 'PRC-CAMPANHAS-INTERNAS',
        name: 'Campanhas Internas',
        description: 'Comunicação interna, endomarketing e eventos com colaboradores',
        natureza: 'MARKETING',
        riscoPadrao: 'BAIXO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'proc-25',
        code: 'PRC-PROJETO-SOCIAL',
        name: 'Projeto Social "Alguém Que Se Importa"',
        description: 'Iniciativas sociais e ações humanitárias institucionais SB Saúde',
        natureza: 'MARKETING',
        riscoPadrao: 'BAIXO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'proc-26',
        code: 'PRC-PAGAMENTOS-DIVERSOS-FIN',
        name: 'Autorização de pagamentos diversos (Finanças)',
        description: 'Taxas, emolumentos, serviços cartorários e despesas operacionais rotineiras',
        natureza: 'FINANCEIRO',
        riscoPadrao: 'MEDIO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Coordenadora de Finanças',
        cargosHabilitadosSolicitante: ["Coordenadora de Finanças","Finanças","Finanças e Controladoria","CC-3030-CFI","CC-3030"],
        ativo: true,
      },
      {
        id: 'proc-27',
        code: 'PRC-DEMISSOES-BAIXO-RISCO',
        name: 'Demissões sem justa causa de baixo risco jurídico',
        description: 'Rescisões contratuais padrão de colaboradores operacionais',
        natureza: 'RH',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: false,
        permiteParcelamento: true,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
      {
        id: 'proc-28',
        code: 'PRC-ACORDOS-TRABALHISTAS',
        name: 'Acordos trabalhistas até um valor pré-definido',
        description: 'Transações e acordos em câmaras de conciliação trabalhista',
        natureza: 'JURIDICO',
        riscoPadrao: 'MEDIO',
        requerJustificativaTecnica: true,
        permiteParcelamento: true,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
      {
        id: 'proc-29',
        code: 'PRC-ACOES-INTERNAS-EVENTUAIS',
        name: 'Ações Internas Eventuais',
        description: 'Comemorações, premiações de equipes e ações de engajamento',
        natureza: 'MARKETING',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'proc-30',
        code: 'PRC-FORNECEDORES-ADM-RH',
        name: 'Contratação de fornecedores para atender as demandas administrativas e recursos humanos',
        description: 'Serviços de limpeza, manutenção predial, suprimentos e apoio operacional',
        natureza: 'ADMINISTRATIVO',
        riscoPadrao: 'MEDIO',
        requerJustificativaTecnica: false,
        permiteParcelamento: true,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
      {
        id: 'proc-31',
        code: 'PRC-TREINAMENTOS-RH',
        name: 'Contratação de treinamentos e consultorias de RH dentro do orçamento',
        description: 'Capacitações técnicas, cursos e consultorias especializadas',
        natureza: 'RH',
        riscoPadrao: 'BAIXO',
        requerJustificativaTecnica: false,
        permiteParcelamento: true,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
      {
        id: 'proc-32',
        code: 'PRC-PROMOCOES-SALARIAIS',
        name: 'Promoções e movimentações internas com impacto salarial até determinado limite (ex.: até 10% de aumento)',
        description: 'Ajustes no plano de cargos e salários e promoções de mérito',
        natureza: 'RH',
        riscoPadrao: 'BAIXO',
        requerJustificativaTecnica: true,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
      {
        id: 'proc-33',
        code: 'PRC-TRAFEGO-PAGO',
        name: 'Tráfego Pago (Instagram)',
        description: 'Investimento em anúncios digitais, meta ads e campanhas de captação',
        natureza: 'MARKETING',
        riscoPadrao: 'ALTO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'proc-34',
        code: 'PRC-BENEFICIOS-NAO-OBRIGATORIOS',
        name: 'Benefícios não obrigatórios dentro de orçamento aprovado',
        description: 'Subsídios, convênios e benefícios opcionais para o quadro funcional',
        natureza: 'RH',
        riscoPadrao: 'BAIXO',
        requerJustificativaTecnica: false,
        permiteParcelamento: false,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
    ];

    this.processes = rawProcesses.map((p) => ({
      ...p,
      createdAt: '2026-07-07T09:00:00Z',
      updatedAt: '2026-07-07T09:00:00Z',
    }));

    // 3. Seed Matrix POL-DIR-01 Rev. 00
    const rules: RegraAlcada[] = [
      {
        id: 'rule-01',
        matrizId: 'mtz-00',
        processoId: 'proc-01',
        processoNome: 'Demissões de alto risco jurídico ou envolvendo cargos estratégicos',
        risco: 'ALTO',
        alçadaPorEvento: 0,
        tetoMensal: 0,
        alcadasObrigatorias: [3],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações'],
        cargosHabilitados4: [],
        nivelMaximoRequerido: 3,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Diretoria de Operações',
        cargosHabilitadosSolicitante: ["Diretoria de Operações","Diretora de Operações","Operações","CC-5050","CC-5000-DOP"],
        ativo: true,
      },
      {
        id: 'rule-02',
        matrizId: 'mtz-00',
        processoId: 'proc-02',
        processoNome: 'Compras de equipamento e outras demandas de tecnologia da informação (TI)',
        risco: 'BAIXO',
        alçadaPorEvento: 0,
        tetoMensal: 0,
        alcadasObrigatorias: [3],
        cargosHabilitados3: ['Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: [],
        nivelMaximoRequerido: 3,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'DIRETORIA FINANCEIRA',
        cargosHabilitadosSolicitante: ["DIRETORIA FINANCEIRA","Diretoria Financeira","Diretor Financeiro","CC-3000-DFI","CC-3030"],
        ativo: true,
      },
      {
        id: 'rule-03',
        matrizId: 'mtz-00',
        processoId: 'proc-03',
        processoNome: 'Pagamento de prestadores (Rede)',
        risco: 'ALTO',
        alçadaPorEvento: 150000,
        tetoMensal: 500000,
        alcadasObrigatorias: [2, 3, 4],
        cargosHabilitados2: ['Gerente Credenciamento', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações'],
        cargosHabilitados4: ['Diretor Financeiro', 'Diretoria Financeira'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Gerente Credenciamento',
        cargosHabilitadosSolicitante: ["Gerente Credenciamento","Gerência de Credenciamento","Gerente de Credenciamento e Núcleo Assistencial","Credenciamento","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-04',
        matrizId: 'mtz-00',
        processoId: 'proc-04',
        processoNome: 'Autorização de partos Emergenciais / Eletivos',
        risco: 'ALTO',
        alçadaPorEvento: 25000,
        tetoMensal: 70000,
        alcadasObrigatorias: [1, 2, 3, 4],
        cargosHabilitados1: ['Acolhimento a Gestantes', 'Supervisor de Credenciamento'],
        cargosHabilitados2: ['Gerência de Núcleo Assistencial', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Acolhimento a Gestantes',
        cargosHabilitadosSolicitante: ["Acolhimento a Gestantes","Coordenação Assistencial","Gerência de Núcleo Assistencial","Núcleo Assistencial","Credenciamento","CC-2010-CAS","CC-2020","CC-2030-GNA"],
        ativo: true,
      },
      {
        id: 'rule-05',
        matrizId: 'mtz-00',
        processoId: 'proc-05',
        processoNome: 'Autorização de pagamentos diversos (Diretoria)',
        risco: 'ALTO',
        alçadaPorEvento: 25000,
        tetoMensal: 100000,
        alcadasObrigatorias: [3, 4],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Diretora de Operações',
        cargosHabilitadosSolicitante: ["Diretora de Operações","Diretoria de Operações","Operações","CC-5050","CC-5000-DOP"],
        ativo: true,
      },
      {
        id: 'rule-06',
        matrizId: 'mtz-00',
        processoId: 'proc-06',
        processoNome: 'Autorização de cirurgia emergencial',
        risco: 'ALTO',
        alçadaPorEvento: 20000,
        tetoMensal: 80000,
        alcadasObrigatorias: [2, 3, 4],
        cargosHabilitados2: ['Gerente Credenciamento', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Gerente Credenciamento',
        cargosHabilitadosSolicitante: ["Gerente Credenciamento","Gerência de Credenciamento","Gerente de Credenciamento e Núcleo Assistencial","Credenciamento","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-07',
        matrizId: 'mtz-00',
        processoId: 'proc-07',
        processoNome: 'Procedimentos oncológicos/Crônicos de maior complexidade (acima R$ 2.001,00)',
        risco: 'ALTO',
        alçadaPorEvento: 20000,
        tetoMensal: 80000,
        alcadasObrigatorias: [2, 3, 4],
        cargosHabilitados2: ['Gerência de Núcleo Assistencial', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Gerência de Núcleo Assistencial',
        cargosHabilitadosSolicitante: ["Gerência de Núcleo Assistencial","Gerente de Credenciamento e Núcleo Assistencial","Núcleo Assistencial","CC-2030-GNA","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-08',
        matrizId: 'mtz-00',
        processoId: 'proc-08',
        processoNome: 'Autorização de Cirurgias provenientes de processos judiciais',
        risco: 'ALTO',
        alçadaPorEvento: 20000,
        tetoMensal: 40000,
        alcadasObrigatorias: [1, 3, 4],
        cargosHabilitados1: ['Coordenador de Núcleo Regulatório', 'Supervisor de Credenciamento'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Coordenador de Núcleo Regulatório',
        cargosHabilitadosSolicitante: ["Coordenador de Núcleo Regulatório","Núcleo Regulatório","Jurídico","CC-7010-CNR","CC-7070"],
        ativo: true,
      },
      {
        id: 'rule-09',
        matrizId: 'mtz-00',
        processoId: 'proc-09',
        processoNome: 'Autorização de NIPs eletivas',
        risco: 'ALTO',
        alçadaPorEvento: 12500,
        tetoMensal: 50000,
        alcadasObrigatorias: [1, 3, 4],
        cargosHabilitados1: ['Coordenador Núcleo de Experiência do Beneficiário', 'Coordenadora de Finanças'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Coordenador Núcleo de Experiência do Beneficiário',
        cargosHabilitadosSolicitante: ["Coordenador Núcleo de Experiência do Beneficiário","Núcleo de Experiência do Beneficiário","Experiência do Beneficiário","Atendimento","CC-2010-NEB","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-10',
        matrizId: 'mtz-00',
        processoId: 'proc-10',
        processoNome: 'Pré pagamentos de consultas e exames eletivo',
        risco: 'MEDIO',
        alçadaPorEvento: 13000,
        tetoMensal: 52000,
        alcadasObrigatorias: [1, 2, 3],
        cargosHabilitados1: ['Supervisor de Credenciamento'],
        cargosHabilitados2: ['Gerência de Credenciamento', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        nivelMaximoRequerido: 3,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Supervisor de Credenciamento',
        cargosHabilitadosSolicitante: ["Supervisor de Credenciamento","Supervisora de Credenciamento","Credenciamento","CC-2020-SCR","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-11',
        matrizId: 'mtz-00',
        processoId: 'proc-11',
        processoNome: 'Autorização de NIP de urgência',
        risco: 'ALTO',
        alçadaPorEvento: 10000,
        tetoMensal: 40000,
        alcadasObrigatorias: [1, 3, 4],
        cargosHabilitados1: ['Coordenador Núcleo de Experiência do Beneficiário', 'Coordenadora de Finanças'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Coordenador Núcleo de Experiência do Beneficiário',
        cargosHabilitadosSolicitante: ["Coordenador Núcleo de Experiência do Beneficiário","Núcleo de Experiência do Beneficiário","Experiência do Beneficiário","Atendimento","CC-2010-NEB","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-12',
        matrizId: 'mtz-00',
        processoId: 'proc-12',
        processoNome: 'Pré pagamentos de beneficiários com reclamações reincidentes (Nipeiros)',
        risco: 'ALTO',
        alçadaPorEvento: 5000,
        tetoMensal: 20000,
        alcadasObrigatorias: [2, 3, 4],
        cargosHabilitados2: ['Gerente da Qualidade', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Gerente da Qualidade',
        cargosHabilitadosSolicitante: ["Gerente da Qualidade","Gerente de Governança e SGQ","Qualidade","Governança e Qualidade","CC-8080-GQL","CC-8080"],
        ativo: true,
      },
      {
        id: 'rule-13',
        matrizId: 'mtz-00',
        processoId: 'proc-13',
        processoNome: 'Reembolso',
        risco: 'MEDIO',
        alçadaPorEvento: 5000,
        tetoMensal: 20000,
        alcadasObrigatorias: [2, 3, 4],
        cargosHabilitados2: ['Gerência de Núcleo Assistencial', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Gerência de Núcleo Assistencial',
        cargosHabilitadosSolicitante: ["Gerência de Núcleo Assistencial","Gerente de Credenciamento e Núcleo Assistencial","Núcleo Assistencial","CC-2030-GNA","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-14',
        matrizId: 'mtz-00',
        processoId: 'proc-14',
        processoNome: 'Autorização de Acordos Judiciais',
        risco: 'ALTO',
        alçadaPorEvento: 5000,
        tetoMensal: 20000,
        alcadasObrigatorias: [1, 4],
        cargosHabilitados1: ['Coordenador de Núcleo Regulatório', 'Coordenadora de Finanças'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Coordenador de Núcleo Regulatório',
        cargosHabilitadosSolicitante: ["Coordenador de Núcleo Regulatório","Núcleo Regulatório","Jurídico","CC-7010-CNR","CC-7070"],
        ativo: true,
      },
      {
        id: 'rule-15',
        matrizId: 'mtz-00',
        processoId: 'proc-15',
        processoNome: 'Autorização de Anestesias',
        risco: 'MEDIO',
        alçadaPorEvento: 3000,
        tetoMensal: 12000,
        alcadasObrigatorias: [1, 2, 3],
        cargosHabilitados1: ['Supervisor de Credenciamento'],
        cargosHabilitados2: ['Gerência de Credenciamento', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        nivelMaximoRequerido: 3,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Supervisor de Credenciamento',
        cargosHabilitadosSolicitante: ["Supervisor de Credenciamento","Supervisora de Credenciamento","Credenciamento","CC-2020-SCR","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-16',
        matrizId: 'mtz-00',
        processoId: 'proc-16',
        processoNome: 'Ações Externas (Parceiros / Corretores / Beneficiários)',
        risco: 'ALTO',
        alçadaPorEvento: 3000,
        tetoMensal: 3000,
        alcadasObrigatorias: [2, 4],
        cargosHabilitados2: ['Gerente de COM & MKT'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'rule-17',
        matrizId: 'mtz-00',
        processoId: 'proc-17',
        processoNome: 'Pagamentos de demandas do Pós Venda',
        risco: 'MEDIO',
        alçadaPorEvento: 2500,
        tetoMensal: 10000,
        alcadasObrigatorias: [1, 3, 4],
        cargosHabilitados1: ['Coordenadora Comercial', 'Coordenadora de Finanças'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Coordenadora Comercial',
        cargosHabilitadosSolicitante: ["Coordenadora Comercial","Comercial","Pós Venda","CC-4010-CCM","CC-4040"],
        ativo: true,
      },
      {
        id: 'rule-18',
        matrizId: 'mtz-00',
        processoId: 'proc-18',
        processoNome: 'Influencer Mídia',
        risco: 'MEDIO',
        alçadaPorEvento: 2500,
        tetoMensal: 2500,
        alcadasObrigatorias: [2, 4],
        cargosHabilitados2: ['Gerente de COM & MKT'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'rule-19',
        matrizId: 'mtz-00',
        processoId: 'proc-19',
        processoNome: 'Procedimentos ambulatoriais eletivos (acima de R$ 2.001,00)',
        risco: 'BAIXO',
        alçadaPorEvento: 2001,
        tetoMensal: 60000,
        alcadasObrigatorias: [2, 3, 4],
        cargosHabilitados2: ['Gerência de Núcleo Assistencial', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Gerência de Núcleo Assistencial',
        cargosHabilitadosSolicitante: ["Gerência de Núcleo Assistencial","Gerente de Credenciamento e Núcleo Assistencial","Núcleo Assistencial","CC-2030-GNA","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-20',
        matrizId: 'mtz-00',
        processoId: 'proc-20',
        processoNome: 'Cirurgias de maior complexidade (acima R$ 2.001,00)',
        risco: 'ALTO',
        alçadaPorEvento: 2001,
        tetoMensal: 50000,
        alcadasObrigatorias: [3, 4],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Diretoria de Operações',
        cargosHabilitadosSolicitante: ["Diretoria de Operações","Diretora de Operações","Operações","CC-5050","CC-5000-DOP"],
        ativo: true,
      },
      {
        id: 'rule-21',
        matrizId: 'mtz-00',
        processoId: 'proc-21',
        processoNome: 'Procedimentos ambulatoriais eletivos (até R$ 2.000,00)',
        risco: 'BAIXO',
        alçadaPorEvento: 2000,
        tetoMensal: 8000,
        alcadasObrigatorias: [1, 2, 3],
        cargosHabilitados1: ['Supervisor de Credenciamento'],
        cargosHabilitados2: ['Gerência de Credenciamento', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        nivelMaximoRequerido: 3,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Supervisor de Credenciamento',
        cargosHabilitadosSolicitante: ["Supervisor de Credenciamento","Supervisora de Credenciamento","Credenciamento","CC-2020-SCR","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-22',
        matrizId: 'mtz-00',
        processoId: 'proc-22',
        processoNome: 'Cirurgias de menor complexidade (até R$ 2.000,00)',
        risco: 'MEDIO',
        alçadaPorEvento: 2000,
        tetoMensal: 8000,
        alcadasObrigatorias: [1, 2, 3],
        cargosHabilitados1: ['Supervisor de Credenciamento'],
        cargosHabilitados2: ['Gerência de Credenciamento', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        nivelMaximoRequerido: 3,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Supervisor de Credenciamento',
        cargosHabilitadosSolicitante: ["Supervisor de Credenciamento","Supervisora de Credenciamento","Credenciamento","CC-2020-SCR","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-23',
        matrizId: 'mtz-00',
        processoId: 'proc-23',
        processoNome: 'Procedimentos oncológicos / Crônicos de menor complexidade (até R$ 2.000,00)',
        risco: 'ALTO',
        alçadaPorEvento: 2000,
        tetoMensal: 8000,
        alcadasObrigatorias: [1, 2, 3],
        cargosHabilitados1: ['Supervisor de Credenciamento'],
        cargosHabilitados2: ['Gerência de Credenciamento', 'Gerente de Credenciamento e Núcleo Assistencial'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        nivelMaximoRequerido: 3,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Supervisor de Credenciamento',
        cargosHabilitadosSolicitante: ["Supervisor de Credenciamento","Supervisora de Credenciamento","Credenciamento","CC-2020-SCR","CC-2020"],
        ativo: true,
      },
      {
        id: 'rule-24',
        matrizId: 'mtz-00',
        processoId: 'proc-24',
        processoNome: 'Campanhas Internas',
        risco: 'BAIXO',
        alçadaPorEvento: 2000,
        tetoMensal: 2000,
        alcadasObrigatorias: [2, 4],
        cargosHabilitados2: ['Gerente de COM & MKT'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'rule-25',
        matrizId: 'mtz-00',
        processoId: 'proc-25',
        processoNome: 'Projeto Social "Alguém Que Se Importa"',
        risco: 'BAIXO',
        alçadaPorEvento: 2000,
        tetoMensal: 2000,
        alcadasObrigatorias: [2, 4],
        cargosHabilitados2: ['Gerente de COM & MKT'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'rule-26',
        matrizId: 'mtz-00',
        processoId: 'proc-26',
        processoNome: 'Autorização de pagamentos diversos (Finanças)',
        risco: 'MEDIO',
        alçadaPorEvento: 2000,
        tetoMensal: 10000,
        alcadasObrigatorias: [1, 4],
        cargosHabilitados1: ['Coordenadora de Finanças'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Coordenadora de Finanças',
        cargosHabilitadosSolicitante: ["Coordenadora de Finanças","Finanças","Finanças e Controladoria","CC-3030-CFI","CC-3030"],
        ativo: true,
      },
      {
        id: 'rule-27',
        matrizId: 'mtz-00',
        processoId: 'proc-27',
        processoNome: 'Demissões sem justa causa de baixo risco jurídico',
        risco: 'ALTO',
        alçadaPorEvento: 1500,
        tetoMensal: 6000,
        alcadasObrigatorias: [1, 3, 4],
        cargosHabilitados1: ['Coord. Gente e Gestão', 'Analista de Gente e Gestão'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
      {
        id: 'rule-28',
        matrizId: 'mtz-00',
        processoId: 'proc-28',
        processoNome: 'Acordos trabalhistas até um valor pré-definido',
        risco: 'MEDIO',
        alçadaPorEvento: 1500,
        tetoMensal: 6000,
        alcadasObrigatorias: [1, 3, 4],
        cargosHabilitados1: ['Coord. Gente e Gestão', 'Analista de Gente e Gestão'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
      {
        id: 'rule-29',
        matrizId: 'mtz-00',
        processoId: 'proc-29',
        processoNome: 'Ações Internas Eventuais',
        risco: 'ALTO',
        alçadaPorEvento: 1000,
        tetoMensal: 1000,
        alcadasObrigatorias: [2, 4],
        cargosHabilitados2: ['Gerente de COM & MKT'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'rule-30',
        matrizId: 'mtz-00',
        processoId: 'proc-30',
        processoNome: 'Contratação de fornecedores para atender as demandas administrativas e recursos humanos',
        risco: 'MEDIO',
        alçadaPorEvento: 750,
        tetoMensal: 3000,
        alcadasObrigatorias: [1, 3, 4],
        cargosHabilitados1: ['Coord. Gente e Gestão', 'Analista de Gente e Gestão'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
      {
        id: 'rule-31',
        matrizId: 'mtz-00',
        processoId: 'proc-31',
        processoNome: 'Contratação de treinamentos e consultorias de RH dentro do orçamento',
        risco: 'BAIXO',
        alçadaPorEvento: 600,
        tetoMensal: 2400,
        alcadasObrigatorias: [1, 3, 4],
        cargosHabilitados1: ['Coord. Gente e Gestão', 'Analista de Gente e Gestão'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
      {
        id: 'rule-32',
        matrizId: 'mtz-00',
        processoId: 'proc-32',
        processoNome: 'Promoções e movimentações internas com impacto salarial até determinado limite (ex.: até 10% de aumento)',
        risco: 'BAIXO',
        alçadaPorEvento: 500,
        tetoMensal: 2000,
        alcadasObrigatorias: [1, 3, 4],
        cargosHabilitados1: ['Coord. Gente e Gestão', 'Analista de Gente e Gestão'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: true,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
      {
        id: 'rule-33',
        matrizId: 'mtz-00',
        processoId: 'proc-33',
        processoNome: 'Tráfego Pago (Instagram)',
        risco: 'ALTO',
        alçadaPorEvento: 500,
        tetoMensal: 500,
        alcadasObrigatorias: [2, 4],
        cargosHabilitados2: ['Gerente de COM & MKT'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Gerente de COM & MKT',
        cargosHabilitadosSolicitante: ["Gerente de COM & MKT","Comunicação e Marketing","Marketing","CC-4040-MKT","CC-4040"],
        ativo: true,
      },
      {
        id: 'rule-34',
        matrizId: 'mtz-00',
        processoId: 'proc-34',
        processoNome: 'Benefícios não obrigatórios dentro de orçamento aprovado',
        risco: 'BAIXO',
        alçadaPorEvento: 250,
        tetoMensal: 1000,
        alcadasObrigatorias: [1, 3, 4],
        cargosHabilitados1: ['Coord. Gente e Gestão', 'Analista de Gente e Gestão'],
        cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'],
        cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'],
        nivelMaximoRequerido: 4,
        requerJustificativaSeAcimaLimite: false,
        cargoHabilitadoDocumento: 'Coord. Gente e Gestão',
        cargosHabilitadosSolicitante: ["Coord. Gente e Gestão","Analista de Gente e Gestão","Gente e Gestão","Recursos Humanos","CC-1010-CGG","CC-1010"],
        ativo: true,
      },
    ];

    this.matrices = [
      {
        id: 'mtz-00',
        codigo: 'POL-DIR-01',
        versao: 'Rev. 00',
        titulo: 'Política de Alçada e Delegação de Autoridade (Vigência 2026-2028)',
        status: 'VIGENTE',
        vigenciaInicio: '2026-07-07',
        vigenciaFim: '2028-07-07',
        elaboracao: 'Raquel Marimon / Janine Sena',
        revisao: 'Christiane Macedo / Haroldo Peon',
        aprovacao: 'Janaína Mascarenhas',
        publicadoPor: 'Vanessa Duarte (SGQ)',
        publicadoEm: '2026-07-07T10:00:00Z',
        historicoAlteracoes: 'Emissão Inicial aprovada pela Diretoria Executiva conforme RN ANS nº 518/2022 e ISO 9001:2015.',
        regras: rules,
        createdAt: '2026-07-07T08:00:00Z',
        updatedAt: '2026-07-07T10:00:00Z',
      },
    ];

    // 4. Start with empty requests for production
    this.requests = [];

    // 5. Start with empty audit logs for production
    this.auditLogs = [];

    // 6. Start with empty notifications for production
    this.notifications = [];

    // Automatically synchronize and populate all cost centers from active matrix rules
    this.syncCostCentersFromMatrices();
  }

  // --- Cost Center Synchronization from Approval Matrices ---
  public syncCostCentersFromMatrices(): number {
    let addedCount = 0;
    const allCargos: { cargo: string; level: number; sourceRule: string }[] = [];

    (this.matrices || []).forEach((m) => {
      (m.regras || []).forEach((r) => {
        (r.cargosHabilitados1 || []).forEach((c) => c && allCargos.push({ cargo: c.trim(), level: 1, sourceRule: r.processoNome }));
        (r.cargosHabilitados2 || []).forEach((c) => c && allCargos.push({ cargo: c.trim(), level: 2, sourceRule: r.processoNome }));
        (r.cargosHabilitados3 || []).forEach((c) => c && allCargos.push({ cargo: c.trim(), level: 3, sourceRule: r.processoNome }));
        (r.cargosHabilitados4 || []).forEach((c) => c && allCargos.push({ cargo: c.trim(), level: 4, sourceRule: r.processoNome }));
      });
    });

    // Helper map for clean codes and responsibles
    const getPrefixForCargo = (cargo: string, level: number): { codigo: string; responsavel: string } => {
      const c = cargo.toLowerCase();
      if (c.includes('gente') || c.includes('rh') || c.includes('pessoal')) return { codigo: 'CC-1010', responsavel: 'Raquel Marimon' };
      if (c.includes('credenciamento') || c.includes('assistencial') || c.includes('experiência') || c.includes('beneficiário')) return { codigo: 'CC-2020', responsavel: 'Haroldo Peon / Juliana Barbosa' };
      if (c.includes('finan') || c.includes('tesouraria') || c.includes('contábil') || c.includes('contabil')) return { codigo: 'CC-3030', responsavel: 'Janine Sena / Roberto Guimarães' };
      if (c.includes('comercial') || c.includes('marketing') || c.includes('com & mkt')) return { codigo: 'CC-4040', responsavel: 'Dr. Carlos Eduardo' };
      if (c.includes('operaç') || c.includes('operac') || c.includes('logística')) return { codigo: 'CC-5050', responsavel: 'Dra. Mariana Silva' };
      if (c.includes('ti') || c.includes('tecnologia') || c.includes('sistema')) return { codigo: 'CC-6060', responsavel: 'Ramon Reis' };
      if (c.includes('regulatório') || c.includes('regulatorio') || c.includes('juríd') || c.includes('jurid')) return { codigo: 'CC-7010', responsavel: 'Coordenação Regulatória / Jurídico' };
      if (c.includes('qualidade') || c.includes('governança') || c.includes('sgq')) return { codigo: 'CC-8080', responsavel: 'Vanessa Duarte' };
      if (c.includes('executiva') || c.includes('conselho') || c.includes('presid')) return { codigo: 'CC-9000', responsavel: 'Janaína Mascarenhas' };
      return { codigo: `CC-${level}000`, responsavel: 'Responsável Designado' };
    };

    const uniqueCargos = Array.from(new Set(allCargos.map((item) => item.cargo))).filter(Boolean);

    if (!this.costCenters) {
      this.costCenters = [];
    }

    uniqueCargos.forEach((cargoName, index) => {
      const match = allCargos.find((i) => i.cargo === cargoName);
      const level = match ? match.level : 1;
      const { codigo: baseCode, responsavel } = getPrefixForCargo(cargoName, level);

      // Check if already exists in this.costCenters by exact or normalized name
      const alreadyExists = this.costCenters.some(
        (cc) =>
          cc.nome.toLowerCase().trim() === cargoName.toLowerCase().trim()
      );

      if (!alreadyExists) {
        const words = cargoName.split(/\s+/).filter((w) => w.length > 2);
        const acronym = words.map((w) => w[0].toUpperCase()).join('').substring(0, 4) || String(index + 1).padStart(2, '0');
        const customCode = `${baseCode}-${acronym}`;

        let finalCode = customCode;
        let counter = 1;
        while (this.costCenters.some((c) => c.codigo.toUpperCase() === finalCode.toUpperCase())) {
          finalCode = `${customCode}-${counter++}`;
        }

        const newCC: CostCenter = {
          id: `cc-cargo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          codigo: finalCode,
          nome: cargoName,
          descricao: `Centro de Custo derivado do cargo habilitado na Matriz de Alçadas (${level}ª Alçada)`,
          responsavel: responsavel,
          ativo: true,
        };

        this.costCenters.push(newCC);
        this.syncToSql('costCenters', newCC.id, newCC);
        addedCount++;
      }
    });

    // Make sure all users have centrosCusto array populated
    (this.users || []).forEach((u) => {
      if (!u.centrosCusto || u.centrosCusto.length === 0) {
        u.centrosCusto = u.centroCusto ? [u.centroCusto] : ['CC-1010 - Recursos Humanos'];
        this.syncToSql('users', u.id, u);
      }
    });

    return addedCount;
  }

  // --- Transactions & Helpers ---

  getNextRequestNumber(): { numero: string; sequencial: number; ano: number } {
    const currentYear = new Date().getFullYear();
    const requestsThisYear = this.requests.filter((r) => r.ano === currentYear);
    const maxSeq = requestsThisYear.reduce((max, r) => Math.max(max, r.sequencial), 0);
    const sequencial = maxSeq + 1;
    const padded = String(sequencial).padStart(4, '0');
    return {
      numero: `FIN-ALC-${padded}/${currentYear}`,
      sequencial,
      ano: currentYear,
    };
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...log,
      timestamp: new Date().toISOString(),
    };
    // Logs are strictly immutable: append-only
    this.auditLogs.unshift(newLog);
    this.syncToSql('auditLogs', newLog.id, newLog);
    return newLog;
  }

  addNotification(notif: Omit<SystemNotification, 'id' | 'createdAt' | 'lida'>): SystemNotification {
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...notif,
      lida: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(newNotif);
    this.syncToSql('notifications', newNotif.id, newNotif);
    return newNotif;
  }
}

export const db = new Database();
