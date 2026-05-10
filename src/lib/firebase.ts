import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Test Firestore connection on boot (Pillar: Validate Connection)
const testConnection = async () => {
  try {
    const { doc, getDocFromServer } = await import('firebase/firestore');
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified.");
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Firestore is offline. Check Firebase config.");
    } else {
      console.warn("Firestore connection check:", error.message);
    }
  }
};
testConnection();
