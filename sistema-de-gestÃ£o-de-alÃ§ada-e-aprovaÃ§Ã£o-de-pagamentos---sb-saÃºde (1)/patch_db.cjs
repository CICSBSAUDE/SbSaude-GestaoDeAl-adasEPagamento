const fs = require('fs');
let code = fs.readFileSync('src/server/db.ts', 'utf8');

const importAdmin = `import { adminDb } from './firebaseAdmin';\n`;
if (!code.includes('firebaseAdmin')) {
  code = importAdmin + code;
}

const syncMethods = `
  public async loadFromFirestore() {
    try {
      const usersSnap = await adminDb.collection('users').get();
      if (!usersSnap.empty) {
        this.users = usersSnap.docs.map(d => d.data() as User);
      }
      const processSnap = await adminDb.collection('processes').get();
      if (!processSnap.empty) {
        this.processes = processSnap.docs.map(d => d.data() as ProcessItem);
      }
      const matricesSnap = await adminDb.collection('matrices').get();
      if (!matricesSnap.empty) {
        this.matrices = matricesSnap.docs.map(d => d.data() as MatrizAlcada);
      }
      const requestsSnap = await adminDb.collection('requests').get();
      if (!requestsSnap.empty) {
        this.requests = requestsSnap.docs.map(d => d.data() as Solicitacao);
      }
      const logsSnap = await adminDb.collection('auditLogs').get();
      if (!logsSnap.empty) {
        this.auditLogs = logsSnap.docs.map(d => d.data() as AuditLog);
      }
      const notifsSnap = await adminDb.collection('notifications').get();
      if (!notifsSnap.empty) {
        this.notifications = notifsSnap.docs.map(d => d.data() as SystemNotification);
      }
      const configSnap = await adminDb.collection('config').doc('cfg-default').get();
      if (configSnap.exists) {
        this.config = configSnap.data() as SystemConfig;
      } else {
        // save default
        await this.syncToFirestore('config', 'cfg-default', this.config);
      }
      
      // If users empty, run seed and save to Firestore
      if (this.users.length === 0) {
        this.seed();
        for (const u of this.users) await this.syncToFirestore('users', u.id, u);
        for (const p of this.processes) await this.syncToFirestore('processes', p.id, p);
        for (const m of this.matrices) await this.syncToFirestore('matrices', m.id, m);
      }
    } catch(e) {
      console.error('Failed to load from Firestore', e);
    }
  }

  public async syncToFirestore(collection: string, docId: string, data: any) {
    try {
      await adminDb.collection(collection).doc(docId).set(data, { merge: true });
    } catch (e) {
      console.error('Firestore sync error:', e);
    }
  }

  public async deleteFromFirestore(collection: string, docId: string) {
    try {
      await adminDb.collection(collection).doc(docId).delete();
    } catch (e) {
      console.error('Firestore delete error:', e);
    }
  }
`;

code = code.replace('constructor() {', syncMethods + '\n  constructor() {');
code = code.replace('this.seed();', '// this.seed(); defer to loadFromFirestore');

// add sync to addAuditLog
code = code.replace(
  'this.auditLogs.unshift(log);',
  'this.auditLogs.unshift(log);\n    this.syncToFirestore("auditLogs", log.id, log);'
);

// add sync to addNotification
code = code.replace(
  'this.notifications.unshift(notification);',
  'this.notifications.unshift(notification);\n    this.syncToFirestore("notifications", notification.id, notification);'
);

fs.writeFileSync('src/server/db.ts', code);
