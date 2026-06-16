import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import backupConfig from '../firebase-applet-config.json';

// Professional modular environment resolver for Next.js & Vite configurations
const getEnvVar = (key: string): string | undefined => {
  if (typeof window !== "undefined") {
    // Client-side execution (supporting import.meta.env for Vite and process.env for NextJS/Webpack fallback)
    const metaAny = import.meta as any;
    const viteEnv = metaAny && metaAny.env;
    if (viteEnv?.[`VITE_${key}`]) return viteEnv[`VITE_${key}`];
    if (viteEnv?.[`NEXT_PUBLIC_${key}`]) return viteEnv[`NEXT_PUBLIC_${key}`];

    const processEnv = (typeof process !== "undefined" ? process.env : {}) as Record<string, any>;
    if (processEnv?.[`NEXT_PUBLIC_${key}`]) return processEnv[`NEXT_PUBLIC_${key}`];
    if (processEnv?.[`VITE_${key}`]) return processEnv[`VITE_${key}`];
  } else {
    // Server-side / SSR context (Node.js)
    const processEnv = (typeof process !== "undefined" ? process.env : {}) as Record<string, any>;
    if (processEnv?.[`NEXT_PUBLIC_${key}`]) return processEnv[`NEXT_PUBLIC_${key}`];
    if (processEnv?.[`VITE_${key}`]) return processEnv[`VITE_${key}`];
  }
  return undefined;
};

// Ensure default platform env configurations don't override the configured Altura project
const getCleanEnvVar = (key: string): string | undefined => {
  const value = getEnvVar(key);
  if (value && value.includes("gen-lang-client")) {
    console.log(`[STORAGE_DIAGNOSTIC] Ignorando variable de entorno default '${key}' con valor '${value}' para favorecer el proyecto real Altura.`);
    return undefined;
  }
  return value;
};

// Map configuration elements from environment variables with safe fallback

  const firebaseConfig = {
  apiKey: "AIzaSyCmcT4ALxtnvG8HZCYuLiHltrvMJeaUusM",
  authDomain: "altura-5ed72.firebaseapp.com",
  projectId: "altura-5ed72",
  storageBucket: "altura-5ed72.firebasestorage.app",
  messagingSenderId: "888419976858",
  appId: "1:888419976858:web:a35b250451cc873da18123"
};

const databaseId = getCleanEnvVar('FIREBASE_FIRESTORE_DATABASE_ID') || backupConfig.firestoreDatabaseId;

// Initialize app single-instance style (safe for NextJS dev hot-reload & SSR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);
export const storage = getStorage(app, "gs://altura-5ed72.firebasestorage.app");

// --- Error Handling ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Connection Validation ---
async function testConnection() {
  try {
    // Try to get a non-existent document to check connectivity/auth
    await getDocFromServer(doc(db, 'system', 'connection-test'));
    console.log("Firebase connection verified");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase connection failed: Client is offline");
    } else {
      console.warn("Firebase connection test result:", error);
    }
  }
}

testConnection();
