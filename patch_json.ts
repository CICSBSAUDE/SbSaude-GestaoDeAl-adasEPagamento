import * as fs from 'fs';

const storePath = '.app_data_store.json';
const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));

if (data.matrices) {
  for (const matrix of data.matrices) {
    if (matrix.regras) {
      for (const regra of matrix.regras) {
        if (regra.cargosHabilitados4) {
          const c4 = regra.cargosHabilitados4.join(',');
          if (c4.includes('Diretoria Financeira') || c4.includes('DIRETORIA FINANCEIRA') || c4.includes('Diretor Financeiro')) {
            regra.cargosHabilitados4 = ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'];
          }
        }
        if (regra.cargosHabilitados3) {
          const c3 = regra.cargosHabilitados3.join(',');
          if (c3.includes('Operações') && !c3.includes('Financeira')) {
            regra.cargosHabilitados3 = ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'];
          }
        }
      }
    }
  }
}

fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
