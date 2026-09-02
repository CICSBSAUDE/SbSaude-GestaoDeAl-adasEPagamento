import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Import dotenv to ensure env vars are loaded
import 'dotenv/config';

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Option 1: Service account key as JSON string in env var (recommended for most deployments)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('[Firebase Admin] Iniciado com FIREBASE_SERVICE_ACCOUNT.');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Option 2: Path to service account key file (set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json)
      initializeApp({ credential: applicationDefault() });
      console.log('[Firebase Admin] Iniciado com GOOGLE_APPLICATION_CREDENTIALS.');
    } else {
      // Option 3: Application Default Credentials — funciona em Cloud Run, App Engine, GKE automaticamente
      initializeApp({ credential: applicationDefault() });
      console.log('[Firebase Admin] Iniciado com Application Default Credentials (ADC).');
      console.warn(
        '[Firebase Admin] AVISO: Nenhuma chave de service account configurada.\n' +
        'Para rodar localmente, defina a variável de ambiente FIREBASE_SERVICE_ACCOUNT com o conteúdo JSON\n' +
        'da chave de serviço gerada em:\n' +
        'https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk'
      );
    }
  } catch (err: any) {
    console.error('[Firebase Admin] ERRO ao inicializar:', err.message);
    console.error(
      'Certifique-se de que FIREBASE_SERVICE_ACCOUNT contém um JSON válido de chave de serviço,\n' +
      'ou que GOOGLE_APPLICATION_CREDENTIALS aponta para um arquivo de chave válido.'
    );
    // Re-throw so the server fails fast with a clear error
    throw err;
  }
}

const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID;

// Use named database if configured, otherwise use default
export const adminDb = firestoreDatabaseId
  ? getFirestore(getApps()[0], firestoreDatabaseId)
  : getFirestore();

export const adminAuth = getAuth();

