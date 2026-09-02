import * as fs from 'fs';

let content = fs.readFileSync('src/server/matrixEngine.ts', 'utf-8');
content = content.replace(
  "1: '1ª Alçada - Coordenação/Supervisão (N1)',",
  "1: '1ª Alçada — Coordenação / Supervisão',"
);
content = content.replace(
  "2: '2ª Alçada - Gerência (N2)',",
  "2: '2ª Alçada — Gerência de Área',"
);
content = content.replace(
  "3: '3ª Alçada - Diretoria de Operações (N3)',",
  "3: '3ª Alçada — Diretoria de Área / Financeira',"
);
content = content.replace(
  "4: '4ª Alçada - Diretoria Financeira / Executiva (N4)',",
  "4: '4ª Alçada — Diretoria Executiva / Conselho',"
);

content = content.replace(
  "else if (lvl === 2) cargosPermitidos = regra.cargosHabilitados2 || ['Gerência da Área', 'Gerente de Credenciamento e Núcleo Assistencial'];",
  "else if (lvl === 2) cargosPermitidos = regra.cargosHabilitados2 || ['Gerência da Área'];"
);
content = content.replace(
  "else if (lvl === 3) cargosPermitidos = regra.cargosHabilitados3 || ['Diretoria de Operações', 'Diretora de Operações'];",
  "else if (lvl === 3) cargosPermitidos = regra.cargosHabilitados3 || ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'];"
);
content = content.replace(
  "else if (lvl === 4) cargosPermitidos = regra.cargosHabilitados4 || ['Diretoria Financeira', 'Diretor Financeiro', 'Diretoria Executiva / Conselho'];",
  "else if (lvl === 4) cargosPermitidos = regra.cargosHabilitados4 || ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'];"
);

fs.writeFileSync('src/server/matrixEngine.ts', content);
