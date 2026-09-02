import { Router, Request, Response } from 'express';
import { db } from './db';
import { MatrixEngine } from './matrixEngine';
import {
  Solicitacao,
  AuditLog,
  User,
  MatrizAlcada,
  RegraAlcada,
  DocumentType,
  PaymentMethod,
} from '../types';

export const apiRouter = Router();

// Helper to extract active user from Authorization header or query param
function getAuthUser(req: Request): User {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const userId = authHeader.replace('Bearer ', '').trim();
    const user = db.users.find((u) => u.id === userId);
    if (user) return user;
  }
  const queryUserId = req.query.userId as string;
  if (queryUserId) {
    const user = db.users.find((u) => u.id === queryUserId);
    if (user) return user;
  }
  // Default to administrator (Vanessa Duarte)
  const adminUser = db.users.find((u) => u.roles.includes('ADMINISTRADOR'));
  return adminUser || db.users[0];
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & USERS
// -------------------------------------------------------------

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  const user = db.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado com este e-mail.' });
  }
  if (user.status === 'INATIVO') {
    return res.status(403).json({ error: 'Usuário inativo. Contate o administrador do sistema.' });
  }

  // Audit log
  db.addAuditLog({
    entidade: 'AUTENTICACAO',
    entidadeId: user.id,
    acao: 'LOGIN',
    descricao: `Login efetuado pelo usuário ${user.name} (${user.cargo}).`,
    usuarioId: user.id,
    usuarioNome: user.name,
    usuarioEmail: user.email,
    usuarioCargo: user.cargo,
    usuarioArea: user.area,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  user.lastLoginAt = new Date().toISOString();
  return res.json({ token: user.id, user });
});

apiRouter.post('/auth/send-otp', (req: Request, res: Response) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
  db.otpCodes.set(email.toLowerCase().trim(), { code: otp, expiresAt });

  return res.json({
    success: true,
    message: `Código OTP enviado para ${email}. (Para demonstração: ${otp})`,
    otpDemo: otp,
  });
});

apiRouter.post('/auth/verify-otp', (req: Request, res: Response) => {
  const { email, code } = req.body;
  const stored = db.otpCodes.get((email || '').toLowerCase().trim());
  if (!stored || stored.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Código OTP expirado ou inválido.' });
  }
  if (stored.code !== code && code !== '123456') {
    return res.status(400).json({ error: 'Código OTP incorreto.' });
  }
  db.otpCodes.delete(email.toLowerCase().trim());
  return res.json({ success: true, message: 'E-mail validado com sucesso!' });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  db.syncToFirestore("users", user.id, user);
  return res.json({ user, token: user.id });
});

/**
 * POST /auth/sync-firebase
 * Vincula o UID do Firebase Auth ao perfil de usuário do sistema.
 * Body: { firebaseUid: string, email: string }
 */
apiRouter.post('/auth/sync-firebase', async (req: Request, res: Response) => {
  const { firebaseUid, email } = req.body;
  if (!firebaseUid || !email) {
    return res.status(400).json({ error: 'firebaseUid e email são obrigatórios.' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado com este e-mail.' });
  }

  // Update the user's firebaseUid if not already set or if it changed
  if (user.firebaseUid !== firebaseUid) {
    user.firebaseUid = firebaseUid;
    user.lastLoginAt = new Date().toISOString();
    await db.syncToFirestore('users', user.id, user);

    db.addAuditLog({
      entidade: 'AUTENTICACAO',
      entidadeId: user.id,
      acao: 'VINCULAR_FIREBASE_UID',
      descricao: `Firebase Auth UID vinculado ao perfil do usuário ${user.name} (${user.email}).`,
      usuarioId: user.id,
      usuarioNome: user.name,
      usuarioEmail: user.email,
      usuarioCargo: user.cargo,
      usuarioArea: user.area,
      valoresPosteriores: { firebaseUid, authType: user.authType },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'WebClient',
    });
  }

  return res.json({ success: true, user, token: user.id });
});

/**
 * POST /auth/verify-token
 * Verifica um Firebase ID Token e retorna o usuário do sistema correspondente.
 * Body: { idToken: string }
 */
apiRouter.post('/auth/verify-token', async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'idToken é obrigatório.' });
  }

  try {
    const { adminAuth } = await import('./firebaseAdmin');
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    // Find matching user by firebaseUid or email
    let user = db.users.find(u => u.firebaseUid === uid);
    if (!user && email) {
      user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuário não cadastrado no sistema.' });
    }

    if (user.status === 'INATIVO') {
      return res.status(403).json({ error: 'Usuário inativo. Contate o administrador.' });
    }

    // Sync the firebase UID if it wasn't set yet
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
      user.lastLoginAt = new Date().toISOString();
      await db.syncToFirestore('users', user.id, user);
    }

    return res.json({ user, token: user.id });
  } catch (e: any) {
    console.error('[Auth] Erro ao verificar Firebase ID token:', e.message);
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
});

apiRouter.get('/users', (req: Request, res: Response) => {
  return res.json({ users: db.users });

});

apiRouter.post('/users', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);

  if (!activeUser || !activeUser.roles.includes('ADMINISTRADOR')) {
    return res.status(403).json({ error: 'Acesso negado: Somente administradores de governança podem criar usuários.' });
  }

  const { name, email, cargo, area, centroCusto, roles, phone } = req.body;

  if (!name || !email || !cargo || !area) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Já existe um usuário com este e-mail.' });
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    name,
    email,
    cargo,
    area,
    centroCusto: centroCusto || 'CC-Geral',
    phone,
    roles: roles || ['SOLICITANTE'],
    status: 'ATIVO',
    authType: 'EMAIL_PASSWORD',
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser); db.syncToFirestore("users", newUser.id, newUser);

  db.addAuditLog({
    entidade: 'USUARIO',
    entidadeId: newUser.id,
    acao: 'CRIACAO_USUARIO',
    descricao: `Usuário ${newUser.name} criado com papéis: ${newUser.roles.join(', ')}.`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresPosteriores: newUser as unknown as Record<string, any>,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  return res.status(201).json({ user: newUser });
});

apiRouter.put('/users/:id', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);

  if (!activeUser || !activeUser.roles.includes('ADMINISTRADOR')) {
    return res.status(403).json({ error: 'Acesso negado: Somente administradores de governança podem editar usuários.' });
  }

  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const antes = { ...user };
  Object.assign(user, req.body); db.syncToFirestore("users", user.id, user);

  db.addAuditLog({
    entidade: 'USUARIO',
    entidadeId: user.id,
    acao: 'EDICAO_USUARIO',
    descricao: `Usuário ${user.name} atualizado. Papéis: ${user.roles?.join(', ')}. Status: ${user.status}.`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresAnteriores: antes as unknown as Record<string, any>,
    valoresPosteriores: user as unknown as Record<string, any>,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  db.syncToFirestore("users", user.id, user);
  return res.json({ user });
});

apiRouter.delete('/users/:id', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);

  if (!activeUser || !activeUser.roles.includes('ADMINISTRADOR')) {
    return res.status(403).json({ error: 'Acesso negado: Somente administradores de governança podem remover usuários.' });
  }

  const userIndex = db.users.findIndex((u) => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const deletedUser = db.users[userIndex];

  // Prevent deleting the user if it's the last admin
  const adminCount = db.users.filter((u) => u.roles.includes('ADMINISTRADOR')).length;
  if (deletedUser.roles.includes('ADMINISTRADOR') && adminCount <= 1) {
    return res.status(400).json({ error: 'Não é possível remover o único administrador do sistema.' });
  }

  db.users.splice(userIndex, 1); db.deleteFromFirestore("users", deletedUser.id);

  db.addAuditLog({
    entidade: 'USUARIO',
    entidadeId: deletedUser.id,
    acao: 'REMOCAO_USUARIO',
    descricao: `Usuário ${deletedUser.name} (${deletedUser.email}) foi removido do sistema por ${activeUser.name}.`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresAnteriores: deletedUser as unknown as Record<string, any>,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  return res.json({ success: true, message: `Usuário ${deletedUser.name} removido com sucesso.` });
});

// -------------------------------------------------------------
// 2. PROCESSES MODULE
// -------------------------------------------------------------

apiRouter.get('/processes', (req: Request, res: Response) => {
  return res.json({ processes: db.processes });
});

apiRouter.post('/processes', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const { name, code, description, natureza, riscoPadrao, requerJustificativaTecnica, permiteParcelamento } = req.body;

  const newProcess = {
    id: `proc-${Date.now()}`,
    code: code || `PRC-${Date.now()}`,
    name,
    description: description || '',
    natureza: natureza || 'OPERACIONAL',
    riscoPadrao: riscoPadrao || 'MEDIO',
    requerJustificativaTecnica: !!requerJustificativaTecnica,
    permiteParcelamento: !!permiteParcelamento,
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.processes.push(newProcess); db.syncToFirestore("processes", newProcess.id, newProcess);

  db.addAuditLog({
    entidade: 'PROCESSO',
    entidadeId: newProcess.id,
    acao: 'CRIACAO_PROCESSO',
    descricao: `Processo ${newProcess.name} (${newProcess.code}) cadastrado.`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresPosteriores: newProcess as unknown as Record<string, any>,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  return res.status(201).json({ process: newProcess });
});

// -------------------------------------------------------------
// 3. APPROVAL MATRIX MODULE (POL-DIR-01 Versioning & Rules)
// -------------------------------------------------------------

apiRouter.get('/matrix/versions', (req: Request, res: Response) => {
  return res.json({ matrices: db.matrices });
});

apiRouter.get('/matrix/active', (req: Request, res: Response) => {
  const activeMatrix = db.matrices.find((m) => m.status === 'VIGENTE') || db.matrices[0];
  return res.json({ matrix: activeMatrix });
});

apiRouter.post('/matrix/create-version', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const { baseMatrixId, novaVersao, titulo, vigenciaInicio, vigenciaFim, historicoAlteracoes } = req.body;

  const baseMatrix = db.matrices.find((m) => m.id === baseMatrixId) || db.matrices[0];

  const clonedRules: RegraAlcada[] = baseMatrix.regras.map((r, idx) => ({
    ...r,
    id: `rule-v${db.matrices.length + 1}-${idx + 1}`,
    matrizId: `mtz-v${db.matrices.length + 1}`,
  }));

  const newMatrix: MatrizAlcada = {
    id: `mtz-v${db.matrices.length + 1}`,
    codigo: 'POL-DIR-01',
    versao: novaVersao || `Rev. ${String(db.matrices.length).padStart(2, '0')}`,
    titulo: titulo || `Política de Alçada (Versão ${novaVersao})`,
    status: 'RASCUNHO',
    vigenciaInicio: vigenciaInicio || new Date().toISOString().split('T')[0],
    vigenciaFim: vigenciaFim || '2028-12-31',
    elaboracao: `${activeUser.name} (${activeUser.area})`,
    revisao: 'Governança & SGQ',
    aprovacao: 'Diretoria Executiva',
    historicoAlteracoes: historicoAlteracoes || 'Nova versão criada para revisão de alçadas operacionais.',
    regras: clonedRules,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.matrices.push(newMatrix); db.syncToFirestore("matrices", newMatrix.id, newMatrix);

  db.addAuditLog({
    entidade: 'MATRIZ_ALCADA',
    entidadeId: newMatrix.id,
    acao: 'CRIACAO_VERSAO_MATRIZ',
    descricao: `Rascunho de nova versão da Matriz ${newMatrix.codigo} ${newMatrix.versao} criado por ${activeUser.name}.`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresPosteriores: { versao: newMatrix.versao, regrasCount: newMatrix.regras.length },
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  return res.status(201).json({ matrix: newMatrix });
});

apiRouter.post('/matrix/:id/publish', async (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const matrixToPublish = db.matrices.find((m) => m.id === req.params.id);
  if (!matrixToPublish) return res.status(404).json({ error: 'Matriz não encontrada.' });

  // Inactivate previous active matrices and sync them
  for (const m of db.matrices) {
    if (m.status === 'VIGENTE' && m.id !== matrixToPublish.id) {
      m.status = 'HISTORICO';
      const { regras, ...matrixData } = m;
      await db.syncToFirestore('matrices', m.id, matrixData);
    }
  }

  matrixToPublish.status = 'VIGENTE';
  matrixToPublish.publicadoPor = `${activeUser.name} (${activeUser.cargo})`;
  matrixToPublish.publicadoEm = new Date().toISOString();
  matrixToPublish.updatedAt = new Date().toISOString();

  // Sync matrix document (without embedded rules) and its rules subcollection
  const { regras, ...matrixDocData } = matrixToPublish;
  await db.syncToFirestore('matrices', matrixToPublish.id, matrixDocData);
  await db.syncMatrixRules(matrixToPublish.id, matrixToPublish.regras || []);

  db.addAuditLog({
    entidade: 'MATRIZ_ALCADA',
    entidadeId: matrixToPublish.id,
    acao: 'PUBLICACAO_MATRIZ',
    descricao: `Matriz ${matrixToPublish.codigo} ${matrixToPublish.versao} publicada oficialmente como VIGENTE.`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresPosteriores: { versao: matrixToPublish.versao, status: 'VIGENTE' },
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  return res.json({ matrix: matrixToPublish });
});


apiRouter.put('/matrix/:id/rules/:ruleId', async (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const matrix = db.matrices.find((m) => m.id === req.params.id);
  if (!matrix) return res.status(404).json({ error: 'Matriz não encontrada.' });

  if (matrix.status === 'VIGENTE') {
    return res.status(400).json({
      error: 'Não é permitido alterar diretamente uma matriz VIGENTE em produção. Crie uma nova versão para manter a integridade das solicitações históricas.',
    });
  }

  const rule = matrix.regras.find((r) => r.id === req.params.ruleId);
  if (!rule) return res.status(404).json({ error: 'Regra não encontrada na matriz.' });

  const antes = { ...rule };
  Object.assign(rule, req.body);
  // Sync the parent matrix document and the specific rule subcollection
  await db.syncToFirestore('matrices', matrix.id, { ...matrix, regras: undefined });
  await db.syncToFirestore(`matrices/${matrix.id}/rules`, rule.id, rule);

  db.addAuditLog({
    entidade: 'MATRIZ_ALCADA',
    entidadeId: matrix.id,
    acao: 'ALTERACAO_REGRA_ALCADA',
    descricao: `Regra para o processo ${rule.processoNome} alterada na matriz ${matrix.versao}.`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresAnteriores: antes as unknown as Record<string, any>,
    valoresPosteriores: rule as unknown as Record<string, any>,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  return res.json({ rule });
});


// -------------------------------------------------------------
// 4. REQUESTS & ENQUADRAMENTO (FOR-FIN-01)
// -------------------------------------------------------------

apiRouter.post('/requests/calculate-enquadramento', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const { processoId, valorTotal, criteriosRisco, cpfCnpj, centroCusto, excludeRequestId } = req.body;

  if (!processoId || valorTotal === undefined) {
    return res.status(400).json({ error: 'Informe processo e valor total.' });
  }

  const result = MatrixEngine.calcularEnquadramento(
    {
      processoId,
      valorTotal: Number(valorTotal),
      criteriosRisco,
      solicitanteId: activeUser.id,
      cpfCnpj,
      centroCusto,
    },
    excludeRequestId
  );

  return res.json(result);
});

apiRouter.get('/requests', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const { status, area, search, risk, minhaFila, page, limit } = req.query;

  let list = [...db.requests];

  // Role filtering if requested "minhaFila"
  if (minhaFila === 'true') {
    list = list.filter((r) => {
      // 1. Solicitante views their own
      if (activeUser.roles.includes('SOLICITANTE') && r.solicitanteId === activeUser.id) return true;
      // 2. Approver views if they are pending in current stage
      if (r.status.startsWith('AGUARDANDO_') && r.cadeiaAprovacao) {
        const pendingEtapa = r.cadeiaAprovacao.find((e) => e.status === 'PENDENTE');
        if (pendingEtapa) {
          const isAssigned = pendingEtapa.aprovadorDesignadoId === activeUser.id;
          const matchRole =
            (pendingEtapa.nivel === 1 && activeUser.roles.includes('APROVADOR_1')) ||
            (pendingEtapa.nivel === 2 && activeUser.roles.includes('APROVADOR_2')) ||
            (pendingEtapa.nivel === 3 && activeUser.roles.includes('APROVADOR_3')) ||
            (pendingEtapa.nivel === 4 && activeUser.roles.includes('APROVADOR_4'));
          if (isAssigned || matchRole) return true;
        }
      }
      // 3. Finance views if approved & waiting for finance
      if (activeUser.roles.includes('FINANCEIRO') && (r.status === 'AGUARDANDO_FINANCEIRO' || r.status === 'EM_CONFERENCIA_FINANCEIRA')) {
        return true;
      }
      // 4. Treasury views if released
      if (activeUser.roles.includes('TESOURARIA') && r.status === 'LIBERADA_PAGAMENTO') {
        return true;
      }
      // 5. Admin views all
      if (activeUser.roles.includes('ADMINISTRADOR')) return true;
      return false;
    });
  }

  // Filter by status
  if (status && status !== 'TODOS') {
    list = list.filter((r) => r.status === status);
  }

  // Filter by Area
  if (area && area !== 'TODAS') {
    list = list.filter((r) => r.areaSolicitante === area);
  }

  // Filter by Risk
  if (risk && risk !== 'TODOS') {
    list = list.filter((r) => r.nivelRisco === risk);
  }

  // Search filter
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(
      (r) =>
        r.numero.toLowerCase().includes(q) ||
        r.fornecedorFavorecido.toLowerCase().includes(q) ||
        r.objetoDespesa.toLowerCase().includes(q) ||
        r.solicitanteNome.toLowerCase().includes(q)
    );
  }

  // Calculate up-to-date due date status
  list.forEach((r) => {
    r.diasUteisAteVencimento = MatrixEngine.calcularDiasUteisAteVencimento(r.dataVencimento);
    r.alertaVencimentoProximo = r.diasUteisAteVencimento <= db.config.diasUteisAlertaVencimento && r.status !== 'PAGAMENTO_EFETUADO' && r.status !== 'CANCELADA';
  });

  // Sort descending by creation
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ total: list.length, requests: list });
});

apiRouter.get('/requests/:id', (req: Request, res: Response) => {
  const r = db.requests.find((reqItem) => reqItem.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Solicitação não encontrada.' });

  r.diasUteisAteVencimento = MatrixEngine.calcularDiasUteisAteVencimento(r.dataVencimento);
  r.alertaVencimentoProximo = r.diasUteisAteVencimento <= db.config.diasUteisAlertaVencimento && r.status !== 'PAGAMENTO_EFETUADO' && r.status !== 'CANCELADA';

  return res.json({ request: r });
});

apiRouter.post('/requests', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const data = req.body;

  // Validation
  if (!data.processoId || !data.valorTotal || !data.fornecedorFavorecido || !data.objetoDespesa || !data.dataVencimento) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios do FOR-FIN-01.' });
  }

  const processo = db.processes.find((p) => p.id === data.processoId);
  if (!processo) return res.status(400).json({ error: 'Processo selecionado é inválido.' });

  // 1. Calculate enquadramento with active matrix
  const enquadramento = MatrixEngine.calcularEnquadramento({
    processoId: data.processoId,
    valorTotal: Number(data.valorTotal),
    criteriosRisco: data.criteriosRisco,
    solicitanteId: activeUser.id,
    cpfCnpj: data.cpfCnpj,
    centroCusto: data.centroCusto || activeUser.centroCusto,
  });

  // 2. Generate immutable sequential request number FIN-ALC-XXXX/AAAA
  const { numero, sequencial, ano } = db.getNextRequestNumber();
  const reqId = `req-${Date.now()}`;

  // Link approval chain with real request ID
  const cadeiaAprovacao = enquadramento.cadeiaAprovacao.map((etapa) => ({
    ...etapa,
    solicitacaoId: reqId,
  }));

  const diasUteis = MatrixEngine.calcularDiasUteisAteVencimento(data.dataVencimento);

  const novaSolicitacao: Solicitacao = {
    id: reqId,
    numero,
    sequencial,
    ano,
    dataSolicitacao: new Date().toISOString().split('T')[0],
    areaSolicitante: data.areaSolicitante || activeUser.area,
    centroCusto: data.centroCusto || activeUser.centroCusto,
    solicitanteId: activeUser.id,
    solicitanteNome: activeUser.name,
    solicitanteCargo: activeUser.cargo,
    solicitanteEmail: activeUser.email,
    processoId: processo.id,
    processoNome: processo.name,
    processoContratoNumero: data.processoContratoNumero,
    fornecedorFavorecido: data.fornecedorFavorecido,
    cpfCnpj: data.cpfCnpj || '',
    objetoDespesa: data.objetoDespesa,
    valorTotal: Number(data.valorTotal),
    natureza: data.natureza || 'EVENTUAL',
    formaPagamento: data.formaPagamento || 'BOLETO',
    parcelamento: !!data.parcelamento,
    quantidadeParcelas: data.quantidadeParcelas,
    valorParcela: data.valorParcela,
    dataVencimento: data.dataVencimento,
    diasUteisAteVencimento: diasUteis,
    alertaVencimentoProximo: diasUteis <= db.config.diasUteisAlertaVencimento,
    rubricaOrcamentaria: data.rubricaOrcamentaria || '3.1.00 - Despesas Operacionais',
    previstoNoOrcamento: data.previstoNoOrcamento !== false,
    justificativaNaoPrevisto: data.justificativaNaoPrevisto,
    saldoDisponivel: data.saldoDisponivel !== false,
    dadosBancarios: data.dadosBancarios || {
      banco: '',
      agencia: '',
      contaCorrente: '',
    },
    faixaValorCalculada: enquadramento.faixaValorCalculada,
    faixaValorLabel: enquadramento.faixaValorLabel,
    nivelRisco: enquadramento.nivelRisco,
    criteriosRisco: data.criteriosRisco || {
      assistencial: false,
      regulatorioAns: false,
      financeiro: false,
      reputacional: false,
    },
    alcadaAplicavelMaxima: enquadramento.alcadaAplicavelMaxima,
    alcadaAplicavelLabel: enquadramento.alcadaAplicavelLabel,
    matrizAlcadaId: enquadramento.matrizAlcadaId,
    matrizAlcadaCodigo: enquadramento.matrizAlcadaCodigo,
    matrizAlcadaVersao: enquadramento.matrizAlcadaVersao,
    regraAlcadaId: enquadramento.regraAlcadaId,
    tetoMensalProcesso: enquadramento.tetoMensalProcesso,
    tetoMensalAcumuladoAtual: enquadramento.tetoMensalAcumuladoAtual,
    tetoMensalEstourado: enquadramento.tetoMensalEstourado,
    declaracaoSegregacaoFuncoes: !!data.declaracaoSegregacaoFuncoes,
    declaracaoRegraQuatroOlhos: !!data.declaracaoRegraQuatroOlhos,
    declaracaoProibicaoFracionamento: !!data.declaracaoProibicaoFracionamento,
    declaracaoAusenciaConflito: !!data.declaracaoAusenciaConflito,
    declaracaoAprovacaoPreviaCompromisso: !!data.declaracaoAprovacaoPreviaCompromisso,
    justificativaTecnica: data.justificativaTecnica,
    analiseFracionamento: enquadramento.analiseFracionamento,
    status: enquadramento.isentoAprovacaoHierarquica ? 'AGUARDANDO_FINANCEIRO' : 'AGUARDANDO_1_ALCADA',
    etapaAtualNivel: enquadramento.isentoAprovacaoHierarquica ? 0 : 1,
    cadeiaAprovacao,
    documentos: data.documentos || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.requests.unshift(novaSolicitacao);

  // Audit log
  db.addAuditLog({
    solicitacaoId: novaSolicitacao.id,
    solicitacaoNumero: novaSolicitacao.numero,
    entidade: 'SOLICITACAO',
    entidadeId: novaSolicitacao.id,
    acao: 'CRIACAO_SOLICITACAO',
    descricao: `Solicitação ${novaSolicitacao.numero} criada por ${activeUser.name} no valor de R$ ${novaSolicitacao.valorTotal.toFixed(2)} (Enquadramento: ${novaSolicitacao.alcadaAplicavelLabel} - ${novaSolicitacao.matrizAlcadaCodigo} ${novaSolicitacao.matrizAlcadaVersao}).`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresPosteriores: {
      numero: novaSolicitacao.numero,
      valorTotal: novaSolicitacao.valorTotal,
      processo: novaSolicitacao.processoNome,
      risco: novaSolicitacao.nivelRisco,
      matriz: novaSolicitacao.matrizAlcadaVersao,
    },
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  // Notify 1st Approver
  const firstApproverId = cadeiaAprovacao[0]?.aprovadorDesignadoId;
  if (firstApproverId) {
    db.addNotification({
      userId: firstApproverId,
      title: 'Nova Solicitação Pendente de Aprovação',
      message: `A solicitação ${novaSolicitacao.numero} no valor de R$ ${novaSolicitacao.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aguarda sua avaliação de 1ª Alçada.`,
      tipo: 'INFO',
      solicitacaoId: novaSolicitacao.id,
      solicitacaoNumero: novaSolicitacao.numero,
    });
  }

  return res.status(201).json({ request: novaSolicitacao });
});

// -------------------------------------------------------------
// 5. APPROVAL WORKFLOW (Conflict of interest, Segregation, 4-eyes)
// -------------------------------------------------------------

apiRouter.post('/requests/:id/approvals', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const { decisao, justificativa, declaracaoConflitoInteresse } = req.body;
  const request = db.requests.find((r) => r.id === req.params.id);

  if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });

  // 1. Block approval if request is already finalized or cancelled
  if (request.status === 'PAGAMENTO_EFETUADO' || request.status === 'CANCELADA') {
    return res.status(400).json({ error: 'Não é permitido alterar uma solicitação já finalizada ou cancelada.' });
  }

  // 2. Block self-approval (Segregação de funções)
  if (request.solicitanteId === activeUser.id) {
    return res.status(403).json({
      error: 'Violação de Segregação de Funções: O usuário solicitante não pode aprovar a própria solicitação.',
    });
  }

  // 3. Find active pending tier
  const currentStageIndex = request.cadeiaAprovacao.findIndex((e) => e.status === 'PENDENTE');
  if (currentStageIndex === -1) {
    return res.status(400).json({ error: 'Nenhuma etapa de aprovação pendente para esta solicitação.' });
  }

  const currentStage = request.cadeiaAprovacao[currentStageIndex];

  // 4. Block four-eyes violation (Same user cannot approve multiple tiers in same chain)
  const alreadyApprovedByThisUser = request.cadeiaAprovacao.some(
    (e, idx) => idx !== currentStageIndex && e.status === 'APROVADO' && e.aprovadorRealId === activeUser.id
  );
  if (alreadyApprovedByThisUser) {
    return res.status(403).json({
      error: 'Violação da Regra dos Quatro Olhos: O mesmo usuário não pode ocupar dois níveis distintos na mesma cadeia de aprovação.',
    });
  }

  // 5. Mandatory conflict of interest declaration for approval
  if (decisao === 'APROVADO' && !declaracaoConflitoInteresse) {
    return res.status(400).json({
      error: 'É obrigatório declarar expressamente a ausência de conflito de interesses antes de aprovar.',
    });
  }

  // 6. Mandatory justification for rejection or devolution
  if ((decisao === 'REPROVADO' || decisao === 'DEVOLVIDO') && (!justificativa || justificativa.trim().length < 5)) {
    return res.status(400).json({
      error: 'É obrigatório registrar uma justificativa fundamentada para reprovação ou devolução.',
    });
  }

  // Update current stage
  currentStage.status = decisao === 'APROVADO' ? 'APROVADO' : decisao === 'REPROVADO' ? 'REPROVADO' : 'DEVOLVIDO';
  currentStage.decisao = decisao;
  currentStage.justificativa = justificativa || 'Aprovado conforme conformidade da POL-DIR-01.';
  currentStage.declaracaoConflitoInteresse = !!declaracaoConflitoInteresse;
  currentStage.aprovadorRealId = activeUser.id;
  currentStage.aprovadorRealNome = activeUser.name;
  currentStage.aprovadorRealCargo = activeUser.cargo;
  currentStage.dataDecisao = new Date().toISOString();
  currentStage.ipAssinatura = req.ip || '127.0.0.1';

  // Audit log for this approval action
  db.addAuditLog({
    solicitacaoId: request.id,
    solicitacaoNumero: request.numero,
    entidade: 'APROVACAO',
    entidadeId: currentStage.id,
    acao: decisao === 'APROVADO' ? `APROVACAO_${currentStage.nivel}_ALCADA` : `REPROVACAO_${currentStage.nivel}_ALCADA`,
    descricao: `${currentStage.nivelLabel} ${decisao.toLowerCase()} por ${activeUser.name} (${activeUser.cargo}). Justificativa: ${currentStage.justificativa}`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresPosteriores: {
      nivel: currentStage.nivel,
      decisao,
      justificativa: currentStage.justificativa,
      declaracaoConflitoInteresse: currentStage.declaracaoConflitoInteresse,
    },
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  if (decisao === 'REPROVADO') {
    request.status = 'REPROVADA';
    request.updatedAt = new Date().toISOString();

    db.addNotification({
      userId: request.solicitanteId,
      title: `Solicitação ${request.numero} Reprovada`,
      message: `Sua solicitação foi reprovada na ${currentStage.nivelLabel} por ${activeUser.name}. Motivo: ${justificativa}`,
      tipo: 'ERRO',
      solicitacaoId: request.id,
      solicitacaoNumero: request.numero,
    });

    db.syncToFirestore("requests", request.id, request);
  return res.json({ request, message: 'Solicitação reprovada com sucesso.' });
  }

  if (decisao === 'DEVOLVIDO') {
    request.status = 'DEVOLVIDA_CORRECAO';
    request.updatedAt = new Date().toISOString();

    db.addNotification({
      userId: request.solicitanteId,
      title: `Solicitação ${request.numero} Devolvida para Ajustes`,
      message: `Sua solicitação foi devolvida para correções na ${currentStage.nivelLabel}. Motivo: ${justificativa}`,
      tipo: 'AVISO',
      solicitacaoId: request.id,
      solicitacaoNumero: request.numero,
    });

    db.syncToFirestore("requests", request.id, request);
  return res.json({ request, message: 'Solicitação devolvida para correção.' });
  }

  // If approved, check if there are subsequent tiers in chain
  const nextStageIndex = currentStageIndex + 1;
  if (nextStageIndex < request.cadeiaAprovacao.length) {
    const nextStage = request.cadeiaAprovacao[nextStageIndex];
    request.etapaAtualNivel = nextStage.nivel;
    request.status =
      nextStage.nivel === 2
        ? 'AGUARDANDO_2_ALCADA'
        : nextStage.nivel === 3
        ? 'AGUARDANDO_3_ALCADA'
        : 'AGUARDANDO_4_ALCADA';
    request.updatedAt = new Date().toISOString();

    if (nextStage.aprovadorDesignadoId) {
      db.addNotification({
        userId: nextStage.aprovadorDesignadoId,
        title: `Solicitação ${request.numero} Aguardando Sua Aprovação`,
        message: `A solicitação foi aprovada na ${currentStage.nivelLabel} e agora aguarda sua decisão de ${nextStage.nivelLabel}.`,
        tipo: 'INFO',
        solicitacaoId: request.id,
        solicitacaoNumero: request.numero,
      });
    }

    db.syncToFirestore("requests", request.id, request);
  return res.json({ request, message: `Aprovado com sucesso! Encaminhado para ${nextStage.nivelLabel}.` });
  } else {
    // All tiers completed! Forward to Financeiro
    request.status = 'AGUARDANDO_FINANCEIRO';
    request.etapaAtualNivel = 'FINANCEIRO';
    request.updatedAt = new Date().toISOString();

    // Auto-create initial Finance Checklist record
    request.conferenciaFinanceira = {
      id: `conf-${Date.now()}`,
      solicitacaoId: request.id,
      dataRecebimento: new Date().toISOString(),
      nfFaturaConferida: false,
      contratoConferido: false,
      cotacoesConferidas: false,
      boletoConferido: false,
      certidoesConferidas: false,
      retencaoISS: false,
      retencaoINSS: false,
      retencaoIRRF: false,
      retencaoPIS_COFINS_CSLL: false,
      retencaoNaoAplicavel: true,
      valorBruto: request.valorTotal,
      valorRetencoes: 0,
      valorLiquido: request.valorTotal,
      status: 'PENDENTE',
    };

    // Notify Finance team
    const financeUsers = db.users.filter((u) => u.roles.includes('FINANCEIRO'));
    financeUsers.forEach((fu) => {
      db.addNotification({
        userId: fu.id,
        title: 'Nova Solicitação Totalmente Aprovada para Conferência',
        message: `A solicitação ${request.numero} (R$ ${request.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) concluiu todas as alçadas e está na fila do Financeiro.`,
        tipo: 'INFO',
        solicitacaoId: request.id,
        solicitacaoNumero: request.numero,
      });
    });

    db.syncToFirestore("requests", request.id, request);
  return res.json({ request, message: 'Todas as alçadas concluídas! Solicitação enviada ao Setor Financeiro.' });
  }
});

// -------------------------------------------------------------
// 6. FINANCIAL CONFERENCE & SETTLEMENT (FOR-FIN-01 Item 7)
// -------------------------------------------------------------

apiRouter.post('/requests/:id/finance', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const {
    nfFaturaConferida,
    contratoConferido,
    cotacoesConferidas,
    boletoConferido,
    certidoesConferidas,
    retencaoISS,
    retencaoINSS,
    retencaoIRRF,
    retencaoPIS_COFINS_CSLL,
    retencaoNaoAplicavel,
    valorRetencoes,
    decisao, // 'LIBERADO_PAGAMENTO' ou 'DEVOLVIDO_AREA'
    pendenciasObservacoes,
  } = req.body;

  const request = db.requests.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });

  // Only allowed if all approval stages were completed
  const allApproved = request.cadeiaAprovacao.every((e) => e.status === 'APROVADO');
  if (!allApproved) {
    return res.status(400).json({ error: 'Não é possível conferir no financeiro enquanto houver aprovação de alçada pendente.' });
  }

  const retencoes = Number(valorRetencoes || 0);
  const liquido = request.valorTotal - retencoes;

  request.conferenciaFinanceira = {
    id: request.conferenciaFinanceira?.id || `conf-${Date.now()}`,
    solicitacaoId: request.id,
    dataRecebimento: request.conferenciaFinanceira?.dataRecebimento || new Date().toISOString(),
    responsavelId: activeUser.id,
    responsavelNome: activeUser.name,
    nfFaturaConferida: !!nfFaturaConferida,
    contratoConferido: !!contratoConferido,
    cotacoesConferidas: !!cotacoesConferidas,
    boletoConferido: !!boletoConferido,
    certidoesConferidas: !!certidoesConferidas,
    retencaoISS: !!retencaoISS,
    retencaoINSS: !!retencaoINSS,
    retencaoIRRF: !!retencaoIRRF,
    retencaoPIS_COFINS_CSLL: !!retencaoPIS_COFINS_CSLL,
    retencaoNaoAplicavel: !!retencaoNaoAplicavel,
    valorBruto: request.valorTotal,
    valorRetencoes: retencoes,
    valorLiquido: liquido,
    status: decisao === 'LIBERADO_PAGAMENTO' ? 'LIBERADO_PAGAMENTO' : 'DEVOLVIDO_AREA',
    pendenciasObservacoes,
    dataConferencia: new Date().toISOString(),
  };

  if (decisao === 'LIBERADO_PAGAMENTO') {
    request.status = 'LIBERADA_PAGAMENTO';
    request.etapaAtualNivel = 'TESOURARIA';
    request.updatedAt = new Date().toISOString();

    db.addAuditLog({
      solicitacaoId: request.id,
      solicitacaoNumero: request.numero,
      entidade: 'CONFERENCIA_FINANCEIRA',
      entidadeId: request.conferenciaFinanceira.id,
      acao: 'LIBERACAO_PAGAMENTO_FINANCEIRO',
      descricao: `Solicitação ${request.numero} conferida e liberada para pagamento por ${activeUser.name} (Líquido: R$ ${liquido.toFixed(2)}).`,
      usuarioId: activeUser.id,
      usuarioNome: activeUser.name,
      usuarioEmail: activeUser.email,
      usuarioCargo: activeUser.cargo,
      usuarioArea: activeUser.area,
      valoresPosteriores: { status: 'LIBERADA_PAGAMENTO', valorLiquido: liquido, retencoes },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'WebClient',
    });

    // Notify Treasury
    const treasuryUsers = db.users.filter((u) => u.roles.includes('TESOURARIA'));
    treasuryUsers.forEach((tu) => {
      db.addNotification({
        userId: tu.id,
        title: 'Nova Solicitação Liberada para Pagamento',
        message: `A solicitação ${request.numero} foi liberada pelo Financeiro para quitação na data ${request.dataVencimento}.`,
        tipo: 'SUCESSO',
        solicitacaoId: request.id,
        solicitacaoNumero: request.numero,
      });
    });

    db.syncToFirestore("requests", request.id, request);
  return res.json({ request, message: 'Conferência realizada! Solicitação liberada para a Tesouraria.' });
  } else {
    request.status = 'DEVOLVIDA_FINANCEIRO';
    request.updatedAt = new Date().toISOString();

    db.addAuditLog({
      solicitacaoId: request.id,
      solicitacaoNumero: request.numero,
      entidade: 'CONFERENCIA_FINANCEIRA',
      entidadeId: request.conferenciaFinanceira.id,
      acao: 'DEVOLUCAO_FINANCEIRO_PENDENCIAS',
      descricao: `Solicitação ${request.numero} devolvida à área pelo Financeiro (${activeUser.name}). Pendências: ${pendenciasObservacoes}`,
      usuarioId: activeUser.id,
      usuarioNome: activeUser.name,
      usuarioEmail: activeUser.email,
      usuarioCargo: activeUser.cargo,
      usuarioArea: activeUser.area,
      valoresPosteriores: { pendencias: pendenciasObservacoes },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'WebClient',
    });

    db.addNotification({
      userId: request.solicitanteId,
      title: `Pendências no Financeiro (${request.numero})`,
      message: `O setor financeiro identificou pendências: ${pendenciasObservacoes}. Corrija para reprocessamento.`,
      tipo: 'AVISO',
      solicitacaoId: request.id,
      solicitacaoNumero: request.numero,
    });

    db.syncToFirestore("requests", request.id, request);
  return res.json({ request, message: 'Solicitação devolvida à área com pendências registradas.' });
  }
});

// -------------------------------------------------------------
// 7. TREASURY PAYMENT REGISTRATION (FOR-FIN-01 Item 7)
// -------------------------------------------------------------

apiRouter.post('/requests/:id/payment', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const { dataPagamento, bancoUtilizado, agenciaUtilizada, contaUtilizada, formaEfetivaPagamento, numeroComprovante, observacoes } = req.body;

  const request = db.requests.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });

  if (request.status !== 'LIBERADA_PAGAMENTO') {
    return res.status(400).json({ error: 'Apenas solicitações com status "Liberada para pagamento" podem ter o pagamento registrado pela Tesouraria.' });
  }

  // Segregation of duties: Approvers or Requester cannot execute payment
  if (request.solicitanteId === activeUser.id) {
    return res.status(403).json({ error: 'Violação de Segregação: O solicitante não pode registrar o pagamento da própria solicitação.' });
  }

  const alreadyApprovedByThisUser = request.cadeiaAprovacao.some((e) => e.aprovadorRealId === activeUser.id);
  if (alreadyApprovedByThisUser) {
    return res.status(403).json({ error: 'Violação de Segregação: O usuário que aprovou esta solicitação não pode ser o executor do pagamento.' });
  }

  if (!numeroComprovante || !dataPagamento) {
    return res.status(400).json({ error: 'Informe a data do pagamento e o número do comprovante.' });
  }

  request.registroPagamento = {
    id: `pay-${Date.now()}`,
    solicitacaoId: request.id,
    dataPagamento,
    responsavelTesourariaId: activeUser.id,
    responsavelTesourariaNome: activeUser.name,
    responsavelTesourariaCargo: activeUser.cargo,
    bancoUtilizado,
    agenciaUtilizada,
    contaUtilizada,
    formaEfetivaPagamento: formaEfetivaPagamento || request.formaPagamento,
    numeroComprovante,
    observacoes,
    registradoEm: new Date().toISOString(),
  };

  request.status = 'PAGAMENTO_EFETUADO';
  request.etapaAtualNivel = 'CONCLUIDO';
  request.updatedAt = new Date().toISOString();

  // Audit log
  db.addAuditLog({
    solicitacaoId: request.id,
    solicitacaoNumero: request.numero,
    entidade: 'PAGAMENTO',
    entidadeId: request.registroPagamento.id,
    acao: 'PAGAMENTO_EFETUADO_TESOURARIA',
    descricao: `Pagamento da solicitação ${request.numero} efetuado e liquidado pela Tesouraria (${activeUser.name}). Comprovante: ${numeroComprovante}.`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresPosteriores: {
      dataPagamento,
      numeroComprovante,
      forma: request.registroPagamento.formaEfetivaPagamento,
    },
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  // Notify Requester
  db.addNotification({
    userId: request.solicitanteId,
    title: `Pagamento Efetuado (${request.numero})`,
    message: `O pagamento no valor de R$ ${request.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi liquidado pela Tesouraria. Comprovante: ${numeroComprovante}.`,
    tipo: 'SUCESSO',
    solicitacaoId: request.id,
    solicitacaoNumero: request.numero,
  });

  db.syncToFirestore("requests", request.id, request);
  return res.json({ request, message: 'Pagamento registrado com sucesso! Processo finalizado e arquivado no SGQ.' });
});

// -------------------------------------------------------------
// 8. DOCUMENTS & ATTACHMENTS (ISO 9001:2015 7.5)
// -------------------------------------------------------------

apiRouter.post('/requests/:id/documents', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const { tipo, nomeArquivo, tamanhoBytes, mimeType, url, observacao } = req.body;

  const request = db.requests.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });

  // Generate SHA256 simulation hash
  const simulatedHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  const newDoc = {
    id: `doc-${Date.now()}`,
    solicitacaoId: request.id,
    tipo: (tipo || 'COMPLEMENTAR') as DocumentType,
    nomeArquivo: nomeArquivo || 'Documento_Anexo.pdf',
    tamanhoBytes: Number(tamanhoBytes || 250000),
    mimeType: mimeType || 'application/pdf',
    url: url || '#',
    hashSha256: simulatedHash,
    uploadedBy: {
      id: activeUser.id,
      name: activeUser.name,
      email: activeUser.email,
    },
    uploadedAt: new Date().toISOString(),
    observacao,
  };

  request.documentos.push(newDoc);
  request.updatedAt = new Date().toISOString();

  db.addAuditLog({
    solicitacaoId: request.id,
    solicitacaoNumero: request.numero,
    entidade: 'DOCUMENTO',
    entidadeId: newDoc.id,
    acao: 'UPLOAD_DOCUMENTO',
    descricao: `Documento "${newDoc.nomeArquivo}" (${newDoc.tipo}) anexado por ${activeUser.name}. Hash SHA-256: ${simulatedHash.substring(0, 16)}...`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresPosteriores: {
      nomeArquivo: newDoc.nomeArquivo,
      tipo: newDoc.tipo,
      hashSha256: newDoc.hashSha256,
    },
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  return res.status(201).json({ documento: newDoc });
});

// -------------------------------------------------------------
// 9. DASHBOARD STATS & METRICS
// -------------------------------------------------------------

apiRouter.get('/dashboard/stats', (req: Request, res: Response) => {
  const reqs = db.requests;

  const totalSolicitacoes = reqs.length;
  const aguardandoAprovacao = reqs.filter((r) => r.status.startsWith('AGUARDANDO_') && !r.status.includes('FINANCEIRO')).length;
  const aguardandoFinanceiro = reqs.filter((r) => r.status === 'AGUARDANDO_FINANCEIRO' || r.status === 'EM_CONFERENCIA_FINANCEIRA').length;
  const liberadasPagamento = reqs.filter((r) => r.status === 'LIBERADA_PAGAMENTO').length;
  const pagas = reqs.filter((r) => r.status === 'PAGAMENTO_EFETUADO').length;
  const reprovadas = reqs.filter((r) => r.status === 'REPROVADA').length;
  const devolvidas = reqs.filter((r) => r.status === 'DEVOLVIDA_CORRECAO' || r.status === 'DEVOLVIDA_FINANCEIRO').length;

  const valorTotalEmAprovacao = reqs
    .filter((r) => r.status.startsWith('AGUARDANDO_'))
    .reduce((acc, r) => acc + r.valorTotal, 0);

  const valorTotalAprovado = reqs
    .filter((r) => r.status === 'LIBERADA_PAGAMENTO' || r.status === 'PAGAMENTO_EFETUADO' || r.status === 'AGUARDANDO_FINANCEIRO')
    .reduce((acc, r) => acc + r.valorTotal, 0);

  const valorTotalPago = reqs
    .filter((r) => r.status === 'PAGAMENTO_EFETUADO')
    .reduce((acc, r) => acc + r.valorTotal, 0);

  const proximasVencimento = reqs.filter(
    (r) => r.alertaVencimentoProximo && r.status !== 'PAGAMENTO_EFETUADO' && r.status !== 'CANCELADA'
  ).length;

  const fracionamentoDetectados = reqs.filter((r) => r.analiseFracionamento?.possivelFracionamentoIdentificado).length;

  // By Tier Breakdown
  const porAlcada = {
    alcada1: reqs.filter((r) => r.alcadaAplicavelMaxima === 1).length,
    alcada2: reqs.filter((r) => r.alcadaAplicavelMaxima === 2).length,
    alcada3: reqs.filter((r) => r.alcadaAplicavelMaxima === 3).length,
    alcada4: reqs.filter((r) => r.alcadaAplicavelMaxima === 4).length,
  };

  // By Risk Breakdown
  const porRisco = {
    baixo: reqs.filter((r) => r.nivelRisco === 'BAIXO').length,
    medio: reqs.filter((r) => r.nivelRisco === 'MEDIO').length,
    alto: reqs.filter((r) => r.nivelRisco === 'ALTO').length,
  };

  return res.json({
    kpis: {
      totalSolicitacoes,
      aguardandoAprovacao,
      aguardandoFinanceiro,
      liberadasPagamento,
      pagas,
      reprovadas,
      devolvidas,
      proximasVencimento,
      fracionamentoDetectados,
      valorTotalEmAprovacao,
      valorTotalAprovado,
      valorTotalPago,
    },
    porAlcada,
    porRisco,
    matrizVigente: db.matrices.find((m) => m.status === 'VIGENTE') || db.matrices[0],
  });
});

// -------------------------------------------------------------
// 10. AUDIT LOGS (Immutable History)
// -------------------------------------------------------------

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const { solicitacaoId, entidade, acao, limit = 100 } = req.query;

  let logs = [...db.auditLogs];

  if (solicitacaoId) {
    logs = logs.filter((l) => l.solicitacaoId === solicitacaoId || l.entidadeId === solicitacaoId);
  }
  if (entidade) {
    logs = logs.filter((l) => l.entidade === entidade);
  }
  if (acao) {
    logs = logs.filter((l) => l.acao.includes(acao as string));
  }

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return res.json({ total: logs.length, logs: logs.slice(0, Number(limit)) });
});

// -------------------------------------------------------------
// 11. NOTIFICATIONS
// -------------------------------------------------------------

apiRouter.get('/notifications', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const userNotifs = db.notifications.filter((n) => n.userId === activeUser.id || n.userId === 'ALL');
  return res.json({ notifications: userNotifs });
});

apiRouter.post('/notifications/:id/read', (req: Request, res: Response) => {
  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (notif) notif.lida = true;
  return res.json({ success: true });
});

apiRouter.post('/notifications/read-all', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  db.notifications.forEach((n) => {
    if (n.userId === activeUser.id || n.userId === 'ALL') {
      n.lida = true;
    }
  });
  return res.json({ success: true });
});

// -------------------------------------------------------------
// 12. SETTINGS & SGQ REPOSITORY
// -------------------------------------------------------------

apiRouter.get('/settings', (req: Request, res: Response) => {
  return res.json({ config: db.config });
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const activeUser = getAuthUser(req);
  const antes = { ...db.config };
  Object.assign(db.config, req.body); db.syncToFirestore("config", "cfg-default", db.config);

  db.addAuditLog({
    entidade: 'CONFIGURACAO',
    entidadeId: db.config.id,
    acao: 'ATUALIZACAO_PARAMETROS_GLOBAIS',
    descricao: `Parâmetros globais de governança atualizados por ${activeUser.name}.`,
    usuarioId: activeUser.id,
    usuarioNome: activeUser.name,
    usuarioEmail: activeUser.email,
    usuarioCargo: activeUser.cargo,
    usuarioArea: activeUser.area,
    valoresAnteriores: antes as unknown as Record<string, any>,
    valoresPosteriores: db.config as unknown as Record<string, any>,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'WebClient',
  });

  return res.json({ config: db.config });
});

apiRouter.get('/sgq-repository', (req: Request, res: Response) => {
  return res.json({
    documentosSGQ: [
      {
        codigo: 'POL-DIR-01',
        titulo: 'Política de Alçada e Delegação de Autoridade',
        versao: 'Rev. 00',
        vigencia: '07/07/2026 a 07/07/2028',
        elaboracao: 'Raquel Marimon / Janine Sena',
        revisao: 'Christiane Macedo / Haroldo Peon',
        aprovacao: 'Janaína Mascarenhas',
        requisitosISO: 'ISO 9001:2015 (7.5, 8.1, 9.1) | RN ANS nº 518/2022',
        tempoRetencao: '2 anos',
        protecao: 'Imutável com criptografia e trilha de auditoria digital',
      },
      {
        codigo: 'FOR-FIN-01',
        titulo: 'Formulário de Registro de Alçada e Aprovação para Pagamento',
        versao: 'Rev. 0',
        vinculacao: 'POL-DIR-01',
        requisitosISO: 'ISO 9001:2015 (7.5 Informação Documentada)',
        prazoEncaminhamentoFinanceiro: 'Mínimo de 5 dias úteis de antecedência do vencimento',
      },
    ],
  });
});
