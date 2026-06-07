import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
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
  limit 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Client SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific named database ID
const firestoreInstance = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

class DocumentReference {
  constructor(private dbInstance: any, private path: string, public id: string) {}

  async get() {
    const docRef = doc(this.dbInstance, this.path, this.id);
    const snap = await getDoc(docRef);
    return {
      id: snap.id,
      exists: snap.exists(),
      data: () => snap.data()
    };
  }

  async update(data: any) {
    const docRef = doc(this.dbInstance, this.path, this.id);
    await updateDoc(docRef, data);
  }

  async delete() {
    const docRef = doc(this.dbInstance, this.path, this.id);
    await deleteDoc(docRef);
  }
}

class CollectionReference {
  constructor(private dbInstance: any, private path: string, private queryConstraints: any[] = []) {}

  where(field: string, op: string, value: any) {
    return new CollectionReference(this.dbInstance, this.path, [...this.queryConstraints, where(field, op as any, value)]);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new CollectionReference(this.dbInstance, this.path, [...this.queryConstraints, orderBy(field, direction)]);
  }

  limit(num: number) {
    return new CollectionReference(this.dbInstance, this.path, [...this.queryConstraints, limit(num)]);
  }

  doc(id: string) {
    return new DocumentReference(this.dbInstance, this.path, id);
  }

  async add(data: any) {
    const colRef = collection(this.dbInstance, this.path);
    const docRef = await addDoc(colRef, data);
    return new DocumentReference(this.dbInstance, this.path, docRef.id);
  }

  async get() {
    const colRef = collection(this.dbInstance, this.path);
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
  }
}

export const db = {
  collection(path: string) {
    return new CollectionReference(firestoreInstance, path);
  }
};

export default app;

