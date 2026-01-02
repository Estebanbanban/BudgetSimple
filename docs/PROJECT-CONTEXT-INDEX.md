# Budgetsimple - Complete Project Context Index

This document lists all key files needed to provide full context to an AI assistant about the Budgetsimple project.

## 📋 Quick Reference

**To give an AI full context, share these files in this order:**

1. This index (PROJECT-CONTEXT-INDEX.md)
2. PRD (Product Requirements Document)
3. Architecture documentation
4. Epic plans (3, 4, 5)
5. Story documents
6. Frontend spec
7. Web app basics guide

---

## 📁 File Structure

```
docs/
├── PROJECT-CONTEXT-INDEX.md          ← YOU ARE HERE (start here)
├── architecture.md                    ← Backend infrastructure & database
├── web-app-basics.md                 ← Beginner guide to web apps
├── front-end-spec.md                 ← UI/UX specifications
│
├── Epic Plans/
│   ├── epic-3-dashboard-plan.md
│   ├── epic-4-subscription-detection-plan.md
│   ├── epic-4-implementation-summary.md
│   └── epic-5-milestones-projection-plan.md
│
└── stories/
    ├── Epic 3 Stories/
    │   ├── 3.1.core-dashboard-kpis.md
    │   ├── 3.2.explain-number-drilldowns.md
    │   └── 3.3.action-items-panel.md
    │
    ├── Epic 4 Stories/
    │   ├── 4.1.subscription-detection.md
    │   ├── 4.2.subscription-review-ui.md
    │   └── 4.3.subscription-summaries.md
    │
    └── Epic 5 Stories/
        ├── 5.1.milestone-management.md
        ├── 5.2.projection-engine.md
        ├── 5.3.milestone-status-eta.md
        ├── 5.4.timeline-visualization.md
        └── 5.5.dashboard-widget.md

_bmad-output/
└── prd.md                            ← Product Requirements Document

README.md                             ← Project overview & setup
```

---

## 📚 Core Documents (Read First)

### 1. Product Requirements Document (PRD)

**File:** `_bmad-output/prd.md`
**Purpose:** Complete product vision, features, user stories, and requirements
**Why:** This is the master document that defines WHAT we're building

### 2. Architecture Documentation

**File:** `docs/architecture.md`
**Purpose:** Backend infrastructure, database schema, API structure, technology stack
**Why:** Explains HOW the system is built technically

### 3. Web App Basics

**File:** `docs/web-app-basics.md`
**Purpose:** Beginner-friendly explanation of frontend, backend, database, localhost
**Why:** Context for understanding the overall system architecture

### 4. Frontend Specification

**File:** `docs/front-end-spec.md`
**Purpose:** UI/UX design, user flows, information architecture
**Why:** Defines the user experience and interface design

---

## 🎯 Epic Plans (What We're Building)

### Epic 3: Dashboard Enhancements

**File:** `docs/epic-3-dashboard-plan.md`
**Status:** ✅ Completed
**Stories:**

- `docs/stories/3.1.core-dashboard-kpis.md` - Core KPIs (expenses, income, savings rate, etc.)
- `docs/stories/3.2.explain-number-drilldowns.md` - "Explain this number" feature
- `docs/stories/3.3.action-items-panel.md` - Actionable insights panel

### Epic 4: Subscription Detection

**File:** `docs/epic-4-subscription-detection-plan.md`
**Implementation Summary:** `docs/epic-4-implementation-summary.md`
**Status:** ✅ Completed
**Stories:**

- `docs/stories/4.1.subscription-detection.md` - Detection algorithm
- `docs/stories/4.2.subscription-review-ui.md` - Review interface
- `docs/stories/4.3.subscription-summaries.md` - Summary page & widget

**Additional:**

- `docs/SUBSCRIPTION_SETUP.md` - Setup instructions

### Epic 5: Milestones & Projection Timeline

**File:** `docs/epic-5-milestones-projection-plan.md`
**Status:** 📋 Planned (Not yet implemented)
**Stories:**

- `docs/stories/5.1.milestone-management.md` - Create/edit milestones
- `docs/stories/5.2.projection-engine.md` - Net worth projection calculations
- `docs/stories/5.3.milestone-status-eta.md` - Status tracking & ETA calculations
- `docs/stories/5.4.timeline-visualization.md` - Timeline chart visualization
- `docs/stories/5.5.dashboard-widget.md` - Dashboard widget integration

---

## 🛠️ Technical Context

### Project Setup

**File:** `README.md`
**Contains:** How to run the app locally, project structure

### Backend API

**Location:** `budgetsimple-api/`
**Key Files:**

- `app.js` - Main Fastify application
- `routes/subscriptions.js` - Subscription API endpoints
- `lib/subscription-detection.js` - Detection algorithm
- `lib/db-subscriptions.js` - Database service layer
- `plugins/supabase.js` - Database connection
- `migrations/001_create_subscriptions_tables.sql` - Database schema

### Frontend

**Location:** `budgetsimple-web/`
**Key Files:**

- `src/app/dashboard/page.tsx` - Main dashboard
- `src/app/subscriptions/page.tsx` - Subscription review page
- `src/components/subscription-widget.tsx` - Dashboard widget
- `src/lib/runtime.ts` - Cashflow map rendering (Sankey diagram)

---

## 📦 BMAD Framework Context

### What is BMAD?

BMAD (Build Method for AI-Driven Development) is the methodology used to structure this project.

### Key BMAD Concepts

- **Epic:** Large feature area (e.g., "Subscription Detection")
- **Story:** Specific user-facing feature (e.g., "Detect recurring subscriptions")
- **PRD:** Product Requirements Document (defines WHAT)
- **Architecture:** Technical design (defines HOW)

### BMAD Framework Files

**Location:** `_bmad/` directory
**Note:** These are framework templates and workflows. You typically don't need to share these unless the AI needs to understand the BMAD methodology itself.

**Key BMAD Agents Used:**

- `_bmad/bmm/agents/pm.md` - Product Manager agent
- `_bmad/bmm/agents/dev.md` - Developer agent
- `_bmad/bmm/agents/architect.md` - Architect agent

---

## 🚀 How to Package for AI Context

### Option 1: Share File Paths (Recommended)

When talking to an AI, reference files like this:

```
Please read these files for full context:
1. docs/PROJECT-CONTEXT-INDEX.md
2. _bmad-output/prd.md
3. docs/architecture.md
4. docs/epic-4-subscription-detection-plan.md
5. docs/stories/4.1.subscription-detection.md
```

### Option 2: Create a Context Package

Use the provided script to copy all key files to a single directory:

```bash
# Run the packaging script
./scripts/package-context.sh

# This creates: context-package/
#   ├── 00-INDEX.md
#   ├── 01-PRD.md
#   ├── 02-ARCHITECTURE.md
#   └── ...
```

### Option 3: Manual Copy

Copy these files to a new folder:

```bash
mkdir project-context
cp _bmad-output/prd.md project-context/
cp docs/architecture.md project-context/
cp docs/web-app-basics.md project-context/
cp docs/front-end-spec.md project-context/
cp docs/epic-*.md project-context/
cp docs/stories/*.md project-context/
```

---

## 📝 Document Reading Order for AI

When providing context to an AI, share in this order:

### 1. Start Here

- `docs/PROJECT-CONTEXT-INDEX.md` (this file)

### 2. Product Vision

- `_bmad-output/prd.md` - Complete product requirements

### 3. Technical Foundation

- `docs/architecture.md` - How the system works
- `docs/web-app-basics.md` - Beginner context (if AI needs it)

### 4. User Experience

- `docs/front-end-spec.md` - UI/UX design

### 5. Current Work (Epic 4)

- `docs/epic-4-subscription-detection-plan.md`
- `docs/epic-4-implementation-summary.md`
- `docs/stories/4.1.subscription-detection.md`
- `docs/stories/4.2.subscription-review-ui.md`
- `docs/stories/4.3.subscription-summaries.md`

### 6. Future Work (Epic 5)

- `docs/epic-5-milestones-projection-plan.md`
- `docs/stories/5.*.md` (all 5 stories)

### 7. Completed Work (Epic 3)

- `docs/epic-3-dashboard-plan.md`
- `docs/stories/3.*.md` (all 3 stories)

---

## 🎯 Quick Context for Specific Tasks

### Working on Subscription Detection?

Share:

- `docs/epic-4-subscription-detection-plan.md`
- `docs/stories/4.1.subscription-detection.md`
- `docs/architecture.md` (database section)
- `budgetsimple-api/lib/subscription-detection.js` (code)

### Working on Milestones Feature?

Share:

- `docs/epic-5-milestones-projection-plan.md`
- `docs/stories/5.1.milestone-management.md`
- `docs/stories/5.2.projection-engine.md`
- `docs/architecture.md` (for database context)

### Understanding the System?

Share:

- `docs/architecture.md`
- `docs/web-app-basics.md`
- `README.md`

### Building UI Components?

Share:

- `docs/front-end-spec.md`
- Relevant story document (e.g., `docs/stories/4.2.subscription-review-ui.md`)

---

## 📊 Project Status Summary

### ✅ Completed

- **Epic 3:** Dashboard Enhancements
- **Epic 4:** Subscription Detection

### 📋 In Progress / Planned

- **Epic 5:** Milestones & Projection Timeline

### 🔧 Technical Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Backend:** Fastify (Node.js), TypeScript
- **Database:** Supabase (PostgreSQL)
- **Methodology:** BMAD Framework

---

## 🔗 Key Links & References

### Internal Documentation

- Architecture: `docs/architecture.md`
- Web Basics: `docs/web-app-basics.md`
- Frontend Spec: `docs/front-end-spec.md`

### Code Locations

- Frontend: `budgetsimple-web/src/`
- Backend: `budgetsimple-api/`
- Database Migrations: `budgetsimple-api/migrations/`

### BMAD Framework

- Framework Docs: `_bmad/bmm/docs/`
- Workflows: `_bmad/bmm/workflows/`

---

## 💡 Tips for AI Context

1. **Always start with the PRD** - It defines the "what" and "why"
2. **Include architecture docs** - Explains the "how"
3. **Share relevant epics/stories** - Provides feature-specific context
4. **Reference code files** - When asking about implementation details
5. **Include this index** - Helps AI understand the document structure

---

## 📦 File Sizes (Approximate)

- PRD: ~50-100 KB
- Architecture: ~20 KB
- Epic Plans: ~10-20 KB each
- Stories: ~5-10 KB each
- **Total Context Package: ~200-300 KB**

---

## ✅ Checklist: What to Share with AI

When starting a new conversation with an AI about this project:

- [ ] This index file (`PROJECT-CONTEXT-INDEX.md`)
- [ ] PRD (`_bmad-output/prd.md`)
- [ ] Architecture doc (`docs/architecture.md`)
- [ ] Relevant Epic plan(s)
- [ ] Relevant Story document(s)
- [ ] Frontend spec (if working on UI)
- [ ] Code files (if asking about specific implementation)

---

**Last Updated:** 2025-01-XX
**Project:** Budgetsimple
**Status:** Active Development
