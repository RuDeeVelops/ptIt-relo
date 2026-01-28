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

### Step 3: Configure Google OAuth Redirect URIs (Google Cloud Console)

This is the tricky part - you need to go to **Google Cloud Console**, not Firebase Console.

**Path:**
1. Go to: https://console.cloud.google.com/
2. At the top left, click the project dropdown
3. Select your Firebase project (`expat-ops-dashboard`)
4. Left sidebar → Search for **"APIs & Services"** or click **APIs & Services**
5. Click **Credentials** (left sidebar under "APIs & Services")
6. Under **OAuth 2.0 Client IDs**, find the entry with type **"Web application"**
7. Click the **Edit** (pencil icon) button on that row
8. In the form that opens, find:
   - **Authorized JavaScript origins** → Click **Add URI**
     - Add: `https://RuDeeVelops.github.io`
     - Click **Add URI** again
     - Add: `https://RuDeeVelops.github.io/ptIt-relo`
   - **Authorized redirect URIs** → Click **Add URI**
     - Add: `https://RuDeeVelops.github.io/ptIt-relo/`
9. Click **Save** (blue button at bottom)

### Step 4: Test Locally First (Optional)
If you want to test locally before deploying:
1. Add to both lists:
   - `http://localhost`
   - `http://localhost:5173`
   - `http://localhost:5173/`

## Detailed Firebase Console Path
If above is unclear, here's the exact clickable path:

**For Authorized Domains (Step 2):**
```
https://console.firebase.google.com/
  → Select "expat-ops-dashboard" project (click it)
    → Build → Authentication
      → Settings (gear icon, right side)
        → Authorized domains section
          → Add Domain
            → Type: rudevelops.github.io
            → Add
```

**For OAuth Redirect URIs (Step 3):**
```
https://console.cloud.google.com/
  → Project selector (top-left dropdown)
    → Select "expat-ops-dashboard"
      → Left sidebar → Type "APIs & Services" in search
        → Click "APIs & Services"
          → Credentials (left sidebar)
            → Find "OAuth 2.0 Client IDs" section
              → Find row with type "Web application"
                → Click Edit (pencil icon)
                  → Add URIs to both fields:
                    ✓ Authorized JavaScript origins:
                      - https://RuDeeVelops.github.io
                      - https://RuDeeVelops.github.io/ptIt-relo
                    ✓ Authorized redirect URIs:
                      - https://RuDeeVelops.github.io/ptIt-relo/
                  → Save (blue button)
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
