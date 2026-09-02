import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

try {
  const app = !getApps().length
    ? initializeApp({
        projectId: firebaseConfig.projectId,
      })
    : getApp();

  adminDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  adminAuth = getAuth(app);
} catch (err) {
  console.warn('[Firebase Admin] Executando em modo de persistência local/fallback:', err);
}

export { adminDb, adminAuth };


