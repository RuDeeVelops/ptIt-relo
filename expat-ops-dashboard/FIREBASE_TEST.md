# ✅ Firebase Setup Validation Checklist

## Your Configuration
- **Project ID**: `expat-ops-dashboard`
- **Auth Domain**: `expat-ops-dashboard.firebaseapp.com`
- **API Key**: `AIzaSyAVF0NIEtLG-7B8yp0ZAI6oRfYisM1jqMQ` ✅
- **Saved in**: `.env.local` ✅

## ✅ Verification Steps (Do These in Firebase Console)

### 1. Authentication ✅
- [ ] Go to **Build** → **Authentication**
- [ ] Check that **Google** provider is **Enabled** (toggle is blue)
- [ ] Verify `fanti.rodolfo@gmail.com` is listed as an authorized tester

### 2. Firestore Database ✅
- [ ] Go to **Build** → **Firestore Database**
- [ ] Database exists and is in **Production mode**
- [ ] Region shows as: `eur3` or similar (Europe)

### 3. Security Rules ✅
- [ ] Go to **Firestore** → **Rules** tab
- [ ] Rules are published (green checkmark):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /steps/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## 🧪 How to Test

### Option 1: Local Development
```bash
cd expat-ops-dashboard
npm run dev
# Visit http://localhost:5173
# Click "Sign in with Google"
# If login works, Firebase is connected!
```

### Option 2: Check Browser Console
1. Open DevTools (F12)
2. Go to **Console** tab
3. If you see errors like "Firebase not initialized", config is wrong
4. If login button works, Firebase is connected!

### Option 3: Check Network Tab
1. Open DevTools (F12)
2. Go to **Network** tab
3. Click "Sign in with Google"
4. Look for requests to:
   - `identitytoolkit.googleapis.com` (should be 200)
   - `firebaseinstallations.googleapis.com` (should be 200)
5. If these show 200, Firebase is connected!

## 🔍 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Sign in button does nothing" | Check `.env.local` has all values |
| "Firebase is not defined" | Rebuild: `npm run build` then `npm run dev` |
| "Permission denied" | Check Firestore rules are published (green checkmark) |
| "Email not authorized" | Add your email to Google provider authorized testers |
| CORS error | This shouldn't happen - check auth domain in Firebase Console |

## ✅ When Everything Works

You should see:
1. **Login Screen** with "Sign in with Google" button
2. Click button → Google login popup appears
3. Login with `fanti.rodolfo@gmail.com`
4. Redirected to dashboard with your email shown
5. Add a card → Saved to Firestore immediately
6. Refresh page → Card still there (proof it's in Firestore!)

## 📊 Testing Results

- [ ] Build completes without errors
- [ ] Dev server starts (`npm run dev`)
- [ ] Can access http://localhost:5173
- [ ] "Sign in with Google" button appears
- [ ] Clicking button opens Google login
- [ ] Login succeeds with your email
- [ ] Dashboard shows your email
- [ ] Can add/edit cards
- [ ] Cards persist after refresh
- [ ] Logout works

---

**If all boxes are checked above, your Firebase setup is 100% correct!** 🎉

Next step: Deploy with `npm run deploy`
