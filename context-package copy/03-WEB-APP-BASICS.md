# Web App Basics: How Everything Works Together

## 🎯 The Big Picture

Think of a web app like a **restaurant**:

- **Frontend** = The dining room (what customers see and interact with)
- **Backend** = The kitchen (where the work happens)
- **Database** = The pantry (where ingredients/data are stored)
- **Localhost** = Your private test restaurant (not open to the public yet)

---

## 🏗️ The Three Main Parts

### 1. **Frontend** (What Users See)

**Location in your project:** `budgetsimple-web/`

**What it is:**

- The visual interface users interact with in their browser
- Built with HTML, CSS, and JavaScript (in your case, React/Next.js)
- Runs in the user's browser (client-side)

**What it does:**

- Displays your dashboard, charts, forms
- Handles user clicks, typing, scrolling
- Makes requests to the backend for data
- Shows the results to the user

**Example from your app:**
When you click "Detect Subscriptions" button:

1. Frontend sends a request: "Hey backend, detect subscriptions for user X"
2. Waits for response
3. Displays the results on screen

**Technology:** Next.js (React framework) running on `localhost:3000`

---

### 2. **Backend** (The Brain)

**Location in your project:** `budgetsimple-api/`

**What it is:**

- The server that processes requests
- Contains business logic (how things work)
- Never directly seen by users
- Runs on a server (could be your computer or a cloud server)

**What it does:**

- Receives requests from frontend
- Processes data (calculations, validations, etc.)
- Talks to the database to get/save data
- Sends responses back to frontend

**Example from your app:**
When frontend asks "Detect subscriptions":

1. Backend receives the request
2. Queries database: "Get all transactions for user X"
3. Runs detection algorithm (finds recurring patterns)
4. Saves results to database
5. Sends back: "Found 3 subscriptions: Netflix, Spotify, Rent"

**Technology:** Fastify (Node.js) running on `localhost:3001`

---

### 3. **Database** (The Storage)

**Location:** Supabase (cloud service) or could be local PostgreSQL

**What it is:**

- Permanent storage for all your data
- Like a filing cabinet that never forgets
- Organized in tables (like spreadsheets)

**What it does:**

- Stores transactions, subscriptions, user data
- Allows fast searching and filtering
- Ensures data doesn't get lost
- Can handle multiple users securely

**Example from your app:**
Tables you have:

- `transactions` - All income/expense records
- `subscriptions` - Detected subscription patterns
- `subscription_transactions` - Links subscriptions to transactions

**Technology:** Supabase (PostgreSQL database in the cloud)

---

## 🔄 How They Talk to Each Other

### The Request-Response Cycle

```
User clicks button
    ↓
Frontend (Browser)
    ↓ HTTP Request
Backend (Server)
    ↓ SQL Query
Database
    ↓ Data
Backend (processes data)
    ↓ HTTP Response
Frontend (displays result)
    ↓
User sees updated screen
```

### Real Example: Loading Subscriptions

1. **User Action:** Opens `/subscriptions` page
2. **Frontend:** "I need subscription data for user 'demo-user'"
3. **HTTP Request:** `GET http://localhost:3001/api/subscriptions/candidates?status=pending`
4. **Backend:** Receives request, checks authentication
5. **Backend → Database:** `SELECT * FROM subscriptions WHERE user_id = 'demo-user' AND status = 'pending'`
6. **Database:** Returns array of subscription records
7. **Backend:** Formats data as JSON
8. **HTTP Response:** `{ "data": [{ "merchant": "Netflix", "amount": 15.99, ... }] }`
9. **Frontend:** Receives JSON, renders it as a table
10. **User:** Sees subscription list on screen

---

## 🏠 What is "Localhost"?

**Localhost** = Your computer talking to itself

### Why Use It?

- **Development:** Test your app before deploying
- **Privacy:** Only you can access it (not on the internet)
- **Speed:** No network delays
- **Free:** No hosting costs during development

### Ports Explained

Think of ports like **apartment numbers** in a building:

- **Port 3000:** Frontend lives here (`http://localhost:3000`)
- **Port 3001:** Backend lives here (`http://localhost:3001`)
- **Port 5432:** Database (usually, but Supabase uses cloud)

When you type `localhost:3000`, you're saying:

- "Go to my computer (localhost)"
- "Visit apartment 3000 (the frontend)"

### Your Current Setup

```
┌─────────────────────────────────────┐
│         Your Computer                │
│                                       │
│  ┌──────────────┐  ┌──────────────┐ │
│  │  Frontend    │  │   Backend    │ │
│  │  :3000       │  │   :3001      │ │
│  │              │  │              │ │
│  │  Next.js     │  │  Fastify     │ │
│  │  React       │  │  Node.js     │ │
│  └──────┬───────┘  └──────┬───────┘ │
│         │                 │          │
│         └────────┬────────┘          │
│                  │ HTTP Requests     │
│                  │                   │
└──────────────────┼───────────────────┘
                   │
                   │ HTTPS/API Calls
                   │
         ┌─────────▼─────────┐
         │   Supabase Cloud   │
         │   (Database)       │
         │   PostgreSQL       │
         └────────────────────┘
```

---

## 📁 Your Project Structure

```
budgetsimple/
├── budgetsimple-web/          ← FRONTEND
│   ├── src/
│   │   ├── app/              ← Pages (dashboard, subscriptions, etc.)
│   │   ├── components/       ← Reusable UI pieces
│   │   └── lib/              ← Frontend utilities
│   └── package.json          ← Dependencies
│
├── budgetsimple-api/          ← BACKEND
│   ├── routes/               ← API endpoints
│   ├── lib/                  ← Business logic
│   ├── plugins/              ← Backend utilities
│   └── package.json          ← Dependencies
│
└── docs/                      ← Documentation
```

---

## 🔌 API Endpoints Explained

**API** = Application Programming Interface (how frontend talks to backend)

### What is an Endpoint?

An endpoint is like a **specific function** the backend provides.

**Format:** `METHOD /path/to/endpoint`

### Examples from Your App

#### 1. Get Subscription Candidates

```
GET /api/subscriptions/candidates?status=pending
```

- **GET** = "I want to read data"
- **Path** = Which data I want
- **Query** = Filters (status=pending)

#### 2. Detect Subscriptions

```
POST /api/subscriptions/detect
Body: { "userId": "demo-user", "startDate": "2024-01-01", ... }
```

- **POST** = "I want to create/process something"
- **Body** = Data to send

#### 3. Health Check

```
GET /health
```

- Simple check: "Is backend alive?"
- Returns: `{ "ok": true }`

---

## 🗄️ Database Basics

### What is a Database?

A **database** is organized storage, like Excel but much more powerful.

### Tables = Spreadsheets

```
transactions table:
┌────┬──────────┬────────┬────────┬─────────┐
│ id │   date   │ amount │merchant│ user_id │
├────┼──────────┼────────┼────────┼─────────┤
│ 1  │2024-01-15│ -15.99 │Netflix │demo-user│
│ 2  │2024-02-15│ -15.99 │Netflix │demo-user│
│ 3  │2024-01-20│ -9.99  │Spotify │demo-user│
└────┴──────────┴────────┴────────┴─────────┘
```

### SQL Queries = Questions

**Question:** "Show me all Netflix transactions"

```sql
SELECT * FROM transactions
WHERE merchant = 'Netflix'
AND user_id = 'demo-user'
```

**Question:** "Count how many subscriptions I have"

```sql
SELECT COUNT(*) FROM subscriptions
WHERE user_id = 'demo-user'
AND status = 'confirmed'
```

### Why Supabase?

- **Cloud-hosted:** No need to run database on your computer
- **PostgreSQL:** Powerful, reliable database
- **Row Level Security:** Automatic user data isolation
- **Free tier:** Good for learning and small projects

---

## 🚀 The Development Workflow

### 1. Start Backend

```bash
cd budgetsimple-api
npm run dev
```

- Starts server on `localhost:3001`
- Listens for requests from frontend

### 2. Start Frontend

```bash
cd budgetsimple-web
npm run dev
```

- Starts server on `localhost:3000`
- Opens in browser automatically

### 3. Make Changes

- Edit code
- Save file
- Browser auto-refreshes (hot reload)
- See changes instantly

### 4. Test

- Click buttons
- Fill forms
- Check browser console for errors
- Check backend logs for issues

---

## 🌐 How It Works in Production

### Development (Now)

```
Your Computer
├── Frontend (localhost:3000)
├── Backend (localhost:3001)
└── Database (Supabase cloud)
```

### Production (Later)

```
Internet
├── Frontend (Vercel/Netlify)
├── Backend (Railway/Render)
└── Database (Supabase cloud)
```

**Key Difference:**

- **Development:** Everything local except database
- **Production:** Everything on internet, accessible to anyone

---

## 🔐 Security Basics

### Authentication

- **Who are you?** (Login)
- Your app uses `userId = 'demo-user'` (placeholder)
- Real apps use tokens/cookies

### Authorization

- **What can you do?** (Permissions)
- Database RLS ensures users only see their data

### HTTPS

- Encrypted connection
- Prevents data interception
- Required in production

---

## 📦 Dependencies Explained

### What are `node_modules`?

**Dependencies** = Code libraries written by others that you use

**Example:**

- `react` = UI framework (builds components)
- `fastify` = Web server framework
- `@supabase/supabase-js` = Database client

**Why use them?**

- Don't reinvent the wheel
- Well-tested code
- Saves time

**How it works:**

```json
// package.json lists what you need
{
  "dependencies": {
    "react": "19.2.3"  ← "I need React version 19.2.3"
  }
}
```

Running `npm install` downloads all dependencies to `node_modules/`

---

## 🎓 Key Concepts Summary

### Frontend

- **What:** User interface
- **Where:** Browser
- **Tech:** React, Next.js, HTML, CSS
- **Port:** 3000

### Backend

- **What:** Server logic
- **Where:** Server/your computer
- **Tech:** Node.js, Fastify
- **Port:** 3001

### Database

- **What:** Data storage
- **Where:** Cloud (Supabase)
- **Tech:** PostgreSQL
- **Access:** Via backend API

### Localhost

- **What:** Your computer
- **Why:** Development/testing
- **How:** `http://localhost:PORT`

### API

- **What:** Communication protocol
- **How:** HTTP requests/responses
- **Format:** JSON data

---

## 🛠️ Common Tasks Explained

### "npm run dev"

- Starts development server
- Watches for file changes
- Auto-restarts on errors
- Shows logs in terminal

### "npm install"

- Reads `package.json`
- Downloads dependencies
- Creates `node_modules/` folder

### "git commit"

- Saves your code changes
- Creates a checkpoint
- Can revert if needed

---

## 🐛 Debugging Basics

### Frontend Errors

- **Check:** Browser console (F12)
- **Look for:** Red error messages
- **Common:** Network errors, JavaScript errors

### Backend Errors

- **Check:** Terminal where `npm run dev` is running
- **Look for:** Stack traces, error messages
- **Common:** Database connection, missing files

### Database Errors

- **Check:** Supabase dashboard
- **Look for:** Query errors, connection issues
- **Common:** Wrong credentials, missing tables

---

## 📚 Next Steps to Learn

1. **HTTP Methods:** GET, POST, PUT, DELETE
2. **REST APIs:** Standard way to design endpoints
3. **JSON:** Data format for APIs
4. **SQL:** Database query language
5. **Environment Variables:** Secrets management
6. **Deployment:** How to put app online

---

## 💡 Real-World Analogy

Think of your web app like **ordering food delivery**:

1. **You (User)** open app (Frontend)
2. **App (Frontend)** shows menu
3. **You** select items and order
4. **App** sends order to restaurant (Backend)
5. **Restaurant (Backend)** checks inventory (Database)
6. **Database** confirms items available
7. **Backend** processes order
8. **Backend** sends confirmation to **Frontend**
9. **Frontend** shows "Order confirmed!" to **You**

---

## 🎯 Your Budgetsimple Project

### What Happens When You Click "Detect Subscriptions"?

1. **Frontend** (`budgetsimple-web/src/app/subscriptions/page.tsx`)

   - User clicks button
   - Collects date range
   - Sends POST request to backend

2. **Backend** (`budgetsimple-api/routes/subscriptions.js`)

   - Receives request
   - Calls `getTransactionsForRange()`
   - Queries Supabase database

3. **Database** (Supabase)

   - Executes SQL query
   - Returns transaction records
   - Sends data back to backend

4. **Backend** (`budgetsimple-api/lib/subscription-detection.js`)

   - Runs detection algorithm
   - Finds recurring patterns
   - Calculates confidence scores
   - Saves candidates to database

5. **Backend** → **Frontend**

   - Sends JSON response with results
   - Includes detected subscriptions

6. **Frontend**
   - Receives data
   - Updates UI
   - Shows subscription list

**Total time:** Usually < 1 second!

---

## ✅ Quick Checklist

When building a web app, you need:

- [x] **Frontend** - User sees and interacts
- [x] **Backend** - Processes requests
- [x] **Database** - Stores data
- [x] **API** - Communication layer
- [x] **Development environment** - Localhost
- [ ] **Production environment** - Live on internet (future)

---

## 🎓 Summary

**Web App = Frontend + Backend + Database**

- **Frontend** = What users see (React/Next.js)
- **Backend** = The logic (Node.js/Fastify)
- **Database** = The storage (Supabase/PostgreSQL)
- **Localhost** = Your test environment
- **API** = How they communicate

You're building all three parts! That's why it's called "full-stack" development.

---

**Questions?** The best way to learn is by doing. Try modifying code and see what happens! 🚀
