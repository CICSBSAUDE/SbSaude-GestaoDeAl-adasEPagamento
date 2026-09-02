/**
 * seedFirestore.ts
 * =====================================================================
 * Script utilitário para popular o Firestore com os dados iniciais (seed)
 * do sistema SB Saúde — Gestão de Alçada e Aprovação de Pagamentos.
 *
 * COMO USAR:
 *   1. Configure a variável de ambiente FIREBASE_SERVICE_ACCOUNT ou
 *      GOOGLE_APPLICATION_CREDENTIALS antes de executar.
 *   2. Configure FIRESTORE_DATABASE_ID com o ID do banco (se não for o padrão).
 *   3. Execute: npx tsx src/server/seedFirestore.ts
 *
 * ATENÇÃO: Este script sobrescreve dados existentes nas coleções.
 * Use apenas para o primeiro setup ou quando precisar reinicializar o banco.
 * =====================================================================
 */

import 'dotenv/config';
import { db } from './db';

async function main() {
  console.log('='.repeat(70));
  console.log('  SB Saúde — Seed Inicial do Firestore');
  console.log('='.repeat(70));
  console.log(`  Projeto: tera-galaxy-lnm9t`);
  console.log(`  Database: ${process.env.FIRESTORE_DATABASE_ID || '(default)'}`);
  console.log('='.repeat(70));

  try {
    console.log('\n[Seed] Verificando dados existentes no Firestore...');
    await db.loadFromFirestore();

    if (db.users.length > 0) {
      console.log(`\n[Seed] AVISO: O Firestore já contém ${db.users.length} usuário(s).`);
      console.log('[Seed] Para forçar o re-seed, delete as coleções manualmente no console Firebase.');
      console.log('[Seed] Saindo sem sobrescrever dados.');
      process.exit(0);
    }

    console.log('\n[Seed] Banco vazio detectado. Iniciando seed completo...');
    await db.seedToFirestore();

    console.log('\n' + '='.repeat(70));
    console.log('  ✅ Seed concluído com sucesso!');
    console.log('='.repeat(70));
    console.log(`  ✔ ${db.users.length} usuários`);
    console.log(`  ✔ ${db.processes.length} processos`);
    console.log(`  ✔ ${db.matrices.length} matrizes`);
    console.log(`  ✔ ${db.requests.length} solicitações`);
    console.log(`  ✔ ${db.auditLogs.length} logs de auditoria`);
    console.log(`  ✔ ${db.notifications.length} notificações`);
    console.log('='.repeat(70));
    console.log('\nAcesse o console Firebase para verificar os dados:');
    console.log('https://console.firebase.google.com/project/tera-galaxy-lnm9t/firestore');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('\n[Seed] ❌ ERRO durante o seed:', err);
    console.error('\nVerifique se:');
    console.error('  1. A variável FIREBASE_SERVICE_ACCOUNT está configurada corretamente.');
    console.error('  2. O Firestore está habilitado no projeto tera-galaxy-lnm9t.');
    console.error('  3. A conta de serviço tem permissão de escrita no Firestore.');
    process.exit(1);
  }
}

main();
