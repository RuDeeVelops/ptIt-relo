# Sign-In Popup Issue - Solution

## Problem
When clicking "Sign in with Google", the popup appears and immediately closes.

## Cause
**Redirect URI Mismatch** - Firebase OAuth configuration doesn't include your GitHub Pages domain.

## Solution

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Select your `expat-ops-dashboard` project
3. Go to **Build** → **Authentication**

### Step 2: Add OAuth Authorized Domains
1. Click on the **Settings** tab (gear icon in left sidebar)
2. Find **Authorized domains**
3. Click **Add Domain**
4. Add: `rudevelops.github.io` (no https://)
5. Click **Add**

### Step 3: Configure Google OAuth Redirect URIs
1. Still in Settings, scroll down to find **Web API keys** or go to **APIs & Services** (in Google Cloud Console tab)
2. Click on the Web API key for your project
3. Find **Authorized JavaScript origins** and add:
   - `https://RuDeeVelops.github.io`
   - `https://RuDeeVelops.github.io/ptIt-relo`
4. Find **Authorized redirect URIs** and add:
   - `https://RuDeeVelops.github.io/ptIt-relo/`
5. Click **Save**

### Step 4: Test Locally First (Optional)
If you want to test locally before deploying:
1. Add to both lists:
   - `http://localhost`
   - `http://localhost:5173`
   - `http://localhost:5173/`

## Detailed Firebase Console Path
If above is unclear, here's the exact path:

```
Firebase Console → Your Project
  → Build → Authentication
    → Settings tab
      → Authorized domains: Add rudevelops.github.io
      
Then go to: Google Cloud Console
  → APIs & Services
    → Credentials
      → Click your Web API key
        → Authorized JavaScript origins: 
          * https://RuDeeVelops.github.io
          * https://RuDeeVelops.github.io/ptIt-relo
        → Authorized redirect URIs:
          * https://RuDeeVelops.github.io/ptIt-relo/
          * https://rudevelops.github.io/ptIt-relo/ (lowercase)
```

## After Making Changes
1. Wait 2-3 minutes for changes to propagate
2. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Try signing in again

## Still Not Working?

### Check Browser Console
1. Open your live app: https://RuDeeVelops.github.io/ptIt-relo/
2. Press F12 to open DevTools
3. Go to **Console** tab
4. Click "Sign in with Google"
5. Look for error messages like:
   - `popup_closed_by_user` → User closed popup (try again)
   - `UNAUTHORIZED_DOMAIN` → Domain not in Firebase
   - `REDIRECT_URI_MISMATCH` → Redirect URI not configured
   - `INVALID_CLIENT` → OAuth app not properly configured

### Common Fixes
- Clear browser cache (DevTools → Application → Clear storage)
- Use incognito/private window to avoid cache issues
- Check that you're accessing https:// (not http://)
- Verify email is lowercase in Firebase auth

## Contact
If still stuck, check:
- https://firebase.google.com/docs/auth/web/google-signin
- Your Firebase project settings → General → Public-facing name
