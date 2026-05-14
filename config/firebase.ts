import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Client SDK in compat mode (uses API Key, confirmed working)
const app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.app();

// Export services in compat mode
export const db = app.firestore();
export const auth = app.auth();

export default app;
