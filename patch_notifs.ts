import * as fs from 'fs';
let content = fs.readFileSync('src/server/routes.ts', 'utf-8');

content = content.replace(
  /if \(notif\) notif.lida = true;\n  return res.json\(\{ success: true \}\);/g,
  `if (notif) {
    notif.lida = true;
    db.syncToFirestore('notifications', notif.id, notif);
  }
  return res.json({ success: true });`
);

content = content.replace(
  /if \(n.userId === activeUser.id \|\| n.userId === 'ALL'\) {\n      n.lida = true;\n    }/g,
  `if (n.userId === activeUser.id || n.userId === 'ALL') {
      n.lida = true;
      db.syncToFirestore('notifications', n.id, n);
    }`
);

fs.writeFileSync('src/server/routes.ts', content);
