import { adminDb } from './src/server/firebaseAdmin';
async function test() {
  if (!adminDb) {
    console.log("No adminDb!");
    return;
  }
  try {
    console.log("Fetching...");
    const snap = await adminDb.collection('users').get();
    console.log("Docs:", snap.docs.length);
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
