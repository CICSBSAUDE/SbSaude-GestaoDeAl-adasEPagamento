import { adminDb } from './src/server/firebaseAdmin';

async function deleteCollection(collectionPath: string, batchSize: number) {
  if (!adminDb) return;
  const collectionRef = adminDb.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query: any, resolve: any) {
  const snapshot = await query.get();
  if (snapshot.size === 0) {
    resolve();
    return;
  }
  const batch = adminDb!.batch();
  snapshot.docs.forEach((doc: any) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function main() {
  await deleteCollection('requests', 100);
  await deleteCollection('auditLogs', 100);
  await deleteCollection('notifications', 100);
  console.log('Successfully deleted mock data from Firestore.');
}

main().catch(console.error);
