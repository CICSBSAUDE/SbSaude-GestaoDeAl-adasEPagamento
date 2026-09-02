import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
async function test() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    console.log("Client Docs:", snap.docs.length);
  } catch(e) {
    console.error("Client Error:", e);
  }
  process.exit(0);
}
test();
