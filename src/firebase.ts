import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getFirestore,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Ensure configuration is present
if (!firebaseConfig || !firebaseConfig.projectId) {
  throw new Error("Firebase configuration in firebase-applet-config.json is missing or invalid.");
}

// Initialize Main Client SDK App with proper error handling
let appInstance;
try {
  if (getApps().length === 0) {
    appInstance = initializeApp(firebaseConfig);
  } else {
    appInstance = getApp();
  }
} catch (error) {
  console.error("Firebase App initialization failed:", error);
  throw error;
}

export const app = appInstance;

// Initialize Auth
let authInstance;
try {
  authInstance = getAuth(app);
} catch (error) {
  console.error("Firebase Auth initialization failed:", error);
  throw error;
}
export const auth = authInstance;

// Primary named database dynamic selection and fallback
let fallbackDbApp: any = null;
let isFallbackEnabled = false;

export function getDbInstance() {
  if (isFallbackEnabled) {
    if (!fallbackDbApp) {
      try {
        fallbackDbApp = initializeApp(firebaseConfig, 'fallback-db-app');
      } catch (e) {
        fallbackDbApp = getApp('fallback-db-app');
      }
    }
    return getFirestore(fallbackDbApp);
  }
  
  try {
    // Attempt with named firestore database ID
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    console.warn("Primary database selection with firestoreDatabaseId failed, falling back to default:", err);
    isFallbackEnabled = true;
    if (!fallbackDbApp) {
      try {
        fallbackDbApp = initializeApp(firebaseConfig, 'fallback-db-app');
      } catch (e) {
        fallbackDbApp = getApp('fallback-db-app');
      }
    }
    return getFirestore(fallbackDbApp);
  }
}

// Wrapper for all Firestore database operations with database fallback
async function runWithRetry<T>(op: (dbInstance: any) => Promise<T>): Promise<T> {
  let dbInstance = getDbInstance();
  try {
    return await op(dbInstance);
  } catch (error: any) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const errCode = error && typeof error === 'object' && 'code' in error ? String((error as any).code) : '';
    
    const isDbNotFound = 
      errCode === 'not-found' || 
      errMessage.includes('not-found') || 
      errMessage.includes('NOT_FOUND') || 
      errMessage.includes('Database') || 
      errMessage.includes('database') || 
      errMessage.includes('does not exist') ||
      errMessage.includes('not exist') ||
      errMessage.includes('FAILED_PRECONDITION');

    if (isDbNotFound && !isFallbackEnabled) {
      console.warn("Primary named database not found. Automatically falling back to (default) database...");
      isFallbackEnabled = true;
      dbInstance = getDbInstance();
      try {
        return await op(dbInstance);
      } catch (retryError) {
        throw retryError;
      }
    }
    throw error;
  }
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const user = auth.currentUser;
  
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: user?.uid || null,
      email: user?.email || null,
      emailVerified: user?.emailVerified || null,
      isAnonymous: user?.isAnonymous || null,
      tenantId: user?.tenantId || null,
      providerInfo: user?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Wrapper classes satisfying the expected object-oriented firestore API structure
export class DocumentReference {
  constructor(private path: string, public id: string) {}

  async get() {
    try {
      return await runWithRetry(async (dbInstance) => {
        const docRef = doc(dbInstance, this.path, this.id);
        const snap = await getDoc(docRef);
        return {
          id: snap.id,
          exists: snap.exists(),
          data: () => snap.data()
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${this.path}/${this.id}`);
    }
  }

  async update(data: any) {
    try {
      await runWithRetry(async (dbInstance) => {
        const docRef = doc(dbInstance, this.path, this.id);
        await updateDoc(docRef, data);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${this.path}/${this.id}`);
    }
  }

  async delete() {
    try {
      await runWithRetry(async (dbInstance) => {
        const docRef = doc(dbInstance, this.path, this.id);
        await deleteDoc(docRef);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${this.path}/${this.id}`);
    }
  }
}

export class CollectionReference {
  constructor(private path: string, private queryConstraints: any[] = []) {}

  where(field: string, op: string, value: any) {
    return new CollectionReference(this.path, [...this.queryConstraints, where(field, op as any, value)]);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new CollectionReference(this.path, [...this.queryConstraints, orderBy(field, direction)]);
  }

  limit(num: number) {
    return new CollectionReference(this.path, [...this.queryConstraints, limit(num)]);
  }

  doc(id: string) {
    return new DocumentReference(this.path, id);
  }

  async add(data: any) {
    try {
      return await runWithRetry(async (dbInstance) => {
        const colRef = collection(dbInstance, this.path);
        const docRef = await addDoc(colRef, data);
        return new DocumentReference(this.path, docRef.id);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, this.path);
    }
  }

  async get() {
    try {
      return await runWithRetry(async (dbInstance) => {
        const colRef = collection(dbInstance, this.path);
        const q = query(colRef, ...this.queryConstraints);
        const snapshot = await getDocs(q);
        return {
          empty: snapshot.empty,
          size: snapshot.size,
          docs: snapshot.docs.map(d => ({
            id: d.id,
            exists: d.exists(),
            data: () => d.data()
          })),
          forEach: (callback: (doc: any) => void) => {
            snapshot.docs.forEach(d => {
              callback({
                id: d.id,
                data: () => d.data()
              });
            });
          }
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.path);
    }
  }
}

// Export a standard db object representing the collection structure
export const db = {
  collection(path: string) {
    return new CollectionReference(path);
  }
};

// Export the native standard raw firestore instance as "rawDb"
export const rawDb = getDbInstance();

// Run mandatory test connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(rawDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Primary database client is offline. Please check your Firebase configuration.");
    }
  }
}
testConnection();
