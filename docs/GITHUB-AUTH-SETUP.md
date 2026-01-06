# GitHub Authentication Setup

## Quick Setup: Personal Access Token

### Step 1: Generate Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Fill in:
   - **Note:** "BudgetSimple Project"
   - **Expiration:** 90 days (or your preference)
   - **Scopes:** Check ✅ **`repo`** (Full control of private repositories)
4. Click **"Generate token"**
5. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)

### Step 2: Push Using Token

When you run `git push`, you'll be prompted:

- **Username:** `Estebanbanban`
- **Password:** [paste your token here] ← NOT your GitHub password!

### Step 3: Alternative - Store Credentials (Optional)

To avoid entering token each time:

```bash
# Store credentials in macOS Keychain (one time)
git config --global credential.helper osxkeychain

# Then push (will prompt once, then remember)
git push -u origin main
```

---

## Alternative: SSH Setup (For Frequent Use)

### Step 1: Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Press Enter for no passphrase (or set one)
```

### Step 2: Add to GitHub

```bash
# Copy your public key
cat ~/.ssh/id_ed25519.pub
# Copy the entire output
```

Then:

1. Go to: https://github.com/settings/keys
2. Click **"New SSH key"**
3. Title: "MacBook - BudgetSimple"
4. Key: Paste the copied key
5. Click **"Add SSH key"**

### Step 3: Switch to SSH URL

```bash
git remote set-url origin git@github.com:Estebanbanban/BudgetSimple.git
git push -u origin main
```

---

## Quick Test

After setup, verify:

```bash
git push -u origin main
```

If successful, you'll see:

```
Enumerating objects: 812, done.
Counting objects: 100% (812/812), done.
...
To https://github.com/Estebanbanban/BudgetSimple.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```
