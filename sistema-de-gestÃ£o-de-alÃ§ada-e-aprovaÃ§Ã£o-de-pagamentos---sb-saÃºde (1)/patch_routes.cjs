const fs = require('fs');
let code = fs.readFileSync('src/server/routes.ts', 'utf8');

// Replacements for push
code = code.replace(/db\.users\.push\(([^)]+)\);/g, 'db.users.push($1); db.syncToFirestore("users", $1.id, $1);');
code = code.replace(/db\.processes\.push\(([^)]+)\);/g, 'db.processes.push($1); db.syncToFirestore("processes", $1.id, $1);');
code = code.replace(/db\.matrices\.push\(([^)]+)\);/g, 'db.matrices.push($1); db.syncToFirestore("matrices", $1.id, $1);');
code = code.replace(/db\.requests\.push\(([^)]+)\);/g, 'db.requests.push($1); db.syncToFirestore("requests", $1.id, $1);');

// Deletes
code = code.replace(/db\.users\.splice\(userIndex,\s*1\);/g, 'db.users.splice(userIndex, 1); db.deleteFromFirestore("users", deletedUser.id);');

// Assings / Edits
code = code.replace(/Object\.assign\(user,\s*req\.body\);/g, 'Object.assign(user, req.body); db.syncToFirestore("users", user.id, user);');
code = code.replace(/Object\.assign\(rule,\s*req\.body\);/g, 'Object.assign(rule, req.body); db.syncToFirestore("matrices", matrix.id, matrix);');
code = code.replace(/Object\.assign\(db\.config,\s*req\.body\);/g, 'Object.assign(db.config, req.body); db.syncToFirestore("config", "cfg-default", db.config);');

// Request updates are all over the place. Let's find every occurrence of `res.json({ request` and `res.json({ request:` and prepend a sync.
code = code.replace(/res\.json\(\{\s*request: request\s*\}\);/g, 'db.syncToFirestore("requests", request.id, request); res.json({ request: request });');
code = code.replace(/res\.json\(\{\s*request\s*\}\);/g, 'db.syncToFirestore("requests", request.id, request); res.json({ request });');
code = code.replace(/res\.status\(201\)\.json\(\{\s*request\s*\}\);/g, 'db.syncToFirestore("requests", request.id, request); res.status(201).json({ request });');

// Ensure matrix update saves
code = code.replace(/res\.json\(\{\s*matrix\s*\}\);/g, 'db.syncToFirestore("matrices", matrix.id, matrix); res.json({ matrix });');

fs.writeFileSync('src/server/routes.ts', code);
