# Continuidade do projeto no Google AI Studio

## Contexto

Sistema de Gestão de Alçada e Aprovação de Pagamentos da SB Saúde.
Stack atual: React + TypeScript + Vite + Express + Firebase/Firestore.

## Estado atual

O projeto foi preparado para entrada em produção sem transações fictícias.

### Coleções transacionais — iniciar vazias
- `requests`
- `auditLogs`
- `notifications`

### Coleções estruturais — preservar
- `users`
- `processes`
- `matrices`
- `config`

## Regras importantes para o AI Studio

1. Não criar seed de solicitações de pagamento.
2. Não criar seed de auditoria.
3. Não criar seed de notificações.
4. Não apagar automaticamente transações no carregamento ou no startup.
5. Não alterar usuários, processos, matrizes ou configurações sem solicitação explícita.
6. Antes de alterar o modelo de dados, verificar `src/types/index.ts` e `src/server/db.ts`.
7. Antes de alterar regras de alçada, verificar `src/server/matrixEngine.ts`.
8. Antes de alterar endpoints, verificar `src/server/routes.ts` e `src/services/api.ts`.
9. Manter a separação entre dados estruturais e dados transacionais.
10. Toda nova funcionalidade transacional deve persistir no Firestore e respeitar a trilha de auditoria existente.

## Prompt-base para continuar o desenvolvimento

Você está continuando o desenvolvimento do Sistema de Gestão de Alçada e Aprovação de Pagamentos da SB Saúde no Google AI Studio.

Analise primeiro a estrutura existente e preserve as funcionalidades que já estão implementadas. Não reescreva o projeto inteiro. Faça alterações incrementais, mantendo React/TypeScript/Vite/Express/Firebase/Firestore.

O sistema está sendo preparado para produção e deve iniciar sem dados transacionais fictícios. Nunca reintroduza seeds em `requests`, `auditLogs` ou `notifications`. Usuários, processos, matrizes e configurações são dados estruturais e devem ser preservados. Não implemente limpeza automática do Firestore no startup.

Ao implementar qualquer nova funcionalidade:
- identifique os arquivos existentes que devem ser alterados antes de criar novos;
- preserve os contratos das APIs existentes quando possível;
- mantenha a persistência no Firestore;
- mantenha a auditoria das operações relevantes;
- respeite autenticação, perfis e alçadas;
- informe claramente quais arquivos foram alterados e por quê;
- evite dependências desnecessárias;
- não substitua funcionalidades existentes por mocks ou dados fictícios.
