import * as fs from 'fs';

let content = fs.readFileSync('src/server/db.ts', 'utf-8');

// The rules mistakenly put Financeira as Alçada 4. 
// We should replace cargosHabilitados4: ['Diretoria Financeira', 'Diretor Financeiro']
// with cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho']
content = content.replace(/cargosHabilitados4: \['Diretoria Financeira', 'Diretor Financeiro'\]/g, "cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho']");
content = content.replace(/cargosHabilitados4: \['DIRETORIA FINANCEIRA', 'Diretor Financeiro'\]/g, "cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho']");
content = content.replace(/cargosHabilitados4: \['Diretoria Financeira', 'Diretoria Executiva \/ Conselho'\]/g, "cargosHabilitados4: ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho']");

// And for cargosHabilitados3, if they only had Operações, let's also allow Financeira since Alçada 3 is "Diretoria de Área / Financeira"
// Actually, let's just append Financeira to all cargosHabilitados3 arrays if they don't have it.
content = content.replace(/cargosHabilitados3: \['Diretoria de Operações', 'Diretora de Operações'\]/g, "cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro']");
content = content.replace(/cargosHabilitados3: \['Diretora de Operações', 'Diretoria de Operações'\]/g, "cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro']");
content = content.replace(/cargosHabilitados3: \['Diretoria De Operações', 'Diretora de Operações'\]/g, "cargosHabilitados3: ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro']");

fs.writeFileSync('src/server/db.ts', content);
