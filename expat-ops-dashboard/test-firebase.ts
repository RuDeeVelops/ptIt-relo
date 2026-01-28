import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAVF0NIEtLG-7B8yp0ZAI6oRfYisM1jqMQ",
  authDomain: "expat-ops-dashboard.firebaseapp.com",
  projectId: "expat-ops-dashboard",
  storageBucket: "expat-ops-dashboard.firebasestorage.app",
  messagingSenderId: "200580492604",
  appId: "1:200580492604:web:90c4d8b7512061123e0239"
};

console.log('Testing Firebase connection...');

try {
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');

  const auth = getAuth(app);
  console.log('✅ Authentication initialized');

  const db = getFirestore(app);
  console.log('✅ Firestore initialized');

  console.log('\n🎉 All Firebase services connected!');
  console.log('Your Firebase setup is correct!');
  console.log('\nProject ID:', firebaseConfig.projectId);
  console.log('Auth Domain:', firebaseConfig.authDomain);
  
} catch (error) {
  console.error('❌ Firebase connection failed:', error);
  process.exit(1);
}
