<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/867dd7e8-d2d8-4c76-9d3a-34dc4352f734

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Continuidade do desenvolvimento no Google AI Studio

Este projeto foi preparado para continuar o desenvolvimento no Google AI Studio.

### Estado inicial das transações

O código-fonte não possui dados transacionais de demonstração. As coleções abaixo
são inicializadas vazias quando o banco ainda não possui registros:

- `requests`
- `auditLogs`
- `notifications`

Os dados estruturais do sistema continuam separados das transações:

- `users`
- `processes`
- `matrices`
- `config`

### Banco de produção

Se o projeto do Firestore já tiver registros de teste nas coleções transacionais,
a limpeza deve ser feita diretamente no ambiente/banco correto antes da publicação.
O código não executa limpeza automática no startup, evitando o risco de apagar
transações reais em uma futura reinicialização da aplicação.

### Regra para futuras alterações

Ao continuar o desenvolvimento no AI Studio, não reintroduza registros fictícios
em seeds em `requests`, `auditLogs` ou `notifications`. Dados de teste devem ser
criados somente em ambiente de desenvolvimento/teste.
