import * as fs from 'fs';

const storePath = '.app_data_store.json';
const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));

data.requests = [];
data.auditLogs = data.auditLogs.filter(log => log.entidade !== 'SOLICITACAO' && log.entidade !== 'APROVACAO');
data.notifications = [];

fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
