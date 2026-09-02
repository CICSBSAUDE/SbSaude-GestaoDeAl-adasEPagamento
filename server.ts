import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/routes';
import { db } from './src/server/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      system: 'Sistema de Gestão de Alçada e Aprovação de Pagamentos - SB Saúde',
      standard: 'POL-DIR-01 / FOR-FIN-01 / ISO 9001:2015',
      time: new Date().toISOString(),
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await db.loadFromFirestore();
  console.log('[SB Saúde] Sincronização com o Cloud SQL Postgres concluída.');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SB Saúde - Gestão de Alçada] Servidor iniciado com sucesso em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SB Saúde] Falha ao iniciar o servidor:', err);
});
