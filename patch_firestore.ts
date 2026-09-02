import { adminDb } from './src/server/firebaseAdmin';

async function main() {
  if (!adminDb) {
    console.log("No admin db");
    return;
  }
  const matricesSnap = await adminDb.collection('matrices').get();
  for (const doc of matricesSnap.docs) {
    const data = doc.data();
    let changed = false;
    if (data.regras) {
      for (const regra of data.regras) {
        if (regra.cargosHabilitados4) {
          const c4 = regra.cargosHabilitados4.join(',');
          if (c4.includes('Diretoria Financeira') || c4.includes('DIRETORIA FINANCEIRA') || c4.includes('Diretor Financeiro')) {
            regra.cargosHabilitados4 = ['Diretoria Executiva / Conselho', 'Diretoria Executiva', 'Conselho'];
            changed = true;
          }
        }
        if (regra.cargosHabilitados3) {
          const c3 = regra.cargosHabilitados3.join(',');
          if (c3.includes('Operações') && !c3.includes('Financeira')) {
            regra.cargosHabilitados3 = ['Diretoria de Operações', 'Diretora de Operações', 'Diretoria Financeira', 'Diretor Financeiro'];
            changed = true;
          }
        }
      }
    }
    if (changed) {
      await adminDb.collection('matrices').doc(doc.id).set(data);
      console.log(`Updated matrix ${doc.id}`);
    }
  }
}

main().catch(console.error);
