export * from './types/index';

import {
  ProcessItem,
  SystemNotification,
  Solicitacao,
  MatrizAlcada,
  User,
  AuditLog,
} from './types/index';

export type Processo = ProcessItem;
export type NotificationItem = SystemNotification;

export interface DashboardData {
  totalSolicitacoes: number;
  valorTotalGeral: number;
  solicitacoesAguardandoAprovacao: number;
  solicitacoesAguardandoFinanceiro: number;
  solicitacoesLiberadasPagamento: number;
  solicitacoesPagas: number;
  alertasSlaVencimento: number;
  alertasFracionamento: number;
  distribuicaoPorAlcada: {
    alcada1: number;
    alcada2: number;
    alcada3: number;
    alcada4: number;
  };
  distribuicaoPorRisco: {
    baixo: number;
    medio: number;
    alto: number;
  };
  recentActivities: AuditLog[];
  urgenciasSLA: Solicitacao[];
}
