const fs = require('fs');
let code = fs.readFileSync('src/server/routes.ts', 'utf8');

// Replace all `return res.json({ request` with a sync call before it
code = code.replace(/return\s+res\.json\(\{\s*request[\s,}]/g, (match) => {
  return `db.syncToFirestore("requests", request.id, request);\n  ` + match;
});
code = code.replace(/return\s+res\.json\(\{\s*user[\s,}]/g, (match) => {
  if(match.includes('users')) return match; // skip lists
  return `db.syncToFirestore("users", user.id, user);\n  ` + match;
});

// For created requests, which uses `novaSolicitacao`
code = code.replace(/return\s+res\.status\(201\)\.json\(\{\s*solicitacao:\s*novaSolicitacao/g, 'db.syncToFirestore("requests", novaSolicitacao.id, novaSolicitacao);\n  return res.status(201).json({ solicitacao: novaSolicitacao');

// Matrices and processes
code = code.replace(/return\s+res\.json\(\{\s*matrix[\s,}]/g, (match) => {
  return `db.syncToFirestore("matrices", matrix.id, matrix);\n  ` + match;
});
code = code.replace(/return\s+res\.json\(\{\s*process[\s,}]/g, (match) => {
  return `db.syncToFirestore("processes", process.id, process);\n  ` + match;
});

fs.writeFileSync('src/server/routes.ts', code);
