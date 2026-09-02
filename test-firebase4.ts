import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json';
const app = initializeApp({
  credential: applicationDefault(),
  projectId: firebaseConfig.projectId,
  databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
});
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
async function test() {
  try {
    const snap = await db.collection('users').get();
    console.log("Docs:", snap.docs.length);
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
