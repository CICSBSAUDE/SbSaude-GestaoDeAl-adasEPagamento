import { adminDb } from './src/server/firebaseAdmin';

async function main() {
  const snap = await adminDb!.collection('requests').get();
  console.log('Read ' + snap.size + ' docs');
}

main().catch(console.error);
