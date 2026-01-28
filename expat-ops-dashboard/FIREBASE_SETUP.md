# Firebase Setup Instructions

Your Expat Ops Dashboard is now configured with Firebase authentication and Firestore database. Here's how to complete the setup:

##Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Project name: `expat-ops-dashboard`
4. Accept terms and create

## Step 2: Get Your Firebase Configuration

1. In your Firebase project, click the **gear icon** → **Project settings**
2. Scroll down to "Your apps" and click the web icon `</>`
3. Register app with name: `expat-ops-dashboard`
4. You'll see a config object like:

```javascript
const firebaseConfig = {
  apiKey: "AIz..." ,
  authDomain: "expat-ops-dashboard-XXXX.firebaseapp.com",
  projectId: "expat-ops-dashboard-XXXX",
  storageBucket: "expat-ops-dashboard-XXXX.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

## Step 3: Add Firebase Config to Your App

1. Open `expat-ops-dashboard/.env.local`
2. Copy the values from your Firebase config:

```env
VITE_FIREBASE_API_KEY=AIz...
VITE_FIREBASE_AUTH_DOMAIN=expat-ops-dashboard-XXXX.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=expat-ops-dashboard-XXXX
VITE_FIREBASE_STORAGE_BUCKET=expat-ops-dashboard-XXXX.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

## Step 4: Enable Google Sign-In

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **Get started** (if not already started)
3. Click **Google** provider
4. Toggle it **ON**
5. Add your email (`fanti.rodolfo@gmail.com`) as an authorized tester
6. Click **Save**

## Step 5: Create Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **Create database**
3. Start in **Production mode**
4. Choose region closest to you (e.g., Europe)
5. Click **Create**

## Step 6: Set Up Firestore Security Rules

1. In Firestore, go to **Rules** tab
2. Replace the default rules with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow access to the owner's data
    match /steps/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
  }
}
```

3. Click **Publish**

## Step 7: Test Locally

```bash
cd expat-ops-dashboard
npm run dev
```

Visit `http://localhost:5173` and click "Sign in with Google" with your account (`fanti.rodolfo@gmail.com`).

## Step 8: Deploy to GitHub Pages

When ready to deploy:

```bash
cd expat-ops-dashboard
npm run deploy
```

Your app is now live at: `https://rudevelops.github.io/ptIt-relo/`

---

## Important Security Notes

✅ **Private Data**: Only `fanti.rodolfo@gmail.com` can read/write your cards due to Firestore rules
✅ **Public Repo**: The repository can be public - Firebase rules protect your data, not the repo visibility
✅ **Environment Variables**: `.env.local` is gitignored and won't be committed
✅ **API Keys**: Firebase API keys are safe to expose (they're used client-side)

## Troubleshooting

**"Sign in button does nothing"**: Make sure `.env.local` has all Firebase values
**"Cards not saving"**: Check Firestore rules are published and your email is whitelisted
**"CORS error"**: This shouldn't happen with Firebase. Check the domain in auth settings.

---

Need help? Refer to [Firebase Docs](https://firebase.google.com/docs/web/setup)
