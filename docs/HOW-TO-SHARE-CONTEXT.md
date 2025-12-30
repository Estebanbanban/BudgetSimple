# How to Share Project Context with AI

## 🚀 Quick Start

### Option 1: Use the Packaging Script (Easiest)

```bash
# Run the script
./scripts/package-context.sh

# This creates a context-package/ folder with all key documents
# Share the entire folder with your AI
```

The script creates a numbered, organized package:
- `00-INDEX.md` - Master index
- `01-PRD.md` - Product Requirements
- `02-ARCHITECTURE.md` - Technical docs
- `03-WEB-APP-BASICS.md` - Beginner guide
- `04-FRONTEND-SPEC.md` - UI/UX specs
- `06-09-EPIC-*.md` - Feature plans
- `stories/` - Individual stories

### Option 2: Share File Paths Directly

When chatting with an AI, reference files like this:

```
Please read these files for full context:
1. docs/PROJECT-CONTEXT-INDEX.md
2. _bmad-output/project-planning-artifacts/prd.md
3. docs/architecture.md
4. docs/epic-4-subscription-detection-plan.md
```

### Option 3: Manual Copy

```bash
# Create a folder
mkdir my-context

# Copy key files
cp _bmad-output/project-planning-artifacts/prd.md my-context/
cp docs/architecture.md my-context/
cp docs/PROJECT-CONTEXT-INDEX.md my-context/
# ... etc
```

---

## 📋 What to Share for Different Tasks

### General Project Understanding
```
Share:
- docs/PROJECT-CONTEXT-INDEX.md
- _bmad-output/project-planning-artifacts/prd.md
- docs/architecture.md
- docs/web-app-basics.md
```

### Working on a Specific Feature
```
Share:
- Relevant Epic plan (e.g., docs/epic-4-subscription-detection-plan.md)
- Relevant Story documents (e.g., docs/stories/4.1.subscription-detection.md)
- docs/architecture.md (for technical context)
- Code files you're working on
```

### Building UI Components
```
Share:
- docs/front-end-spec.md
- Relevant story document
- Existing component code (if any)
```

### Understanding the System
```
Share:
- docs/architecture.md
- docs/web-app-basics.md
- README.md
```

---

## 🎯 Recommended Reading Order for AI

1. **PROJECT-CONTEXT-INDEX.md** - Overview and file structure
2. **PRD** - Product vision and requirements
3. **architecture.md** - Technical foundation
4. **web-app-basics.md** - System concepts (if needed)
5. **Relevant Epic/Story docs** - Feature-specific context

---

## 💡 Pro Tips

1. **Always include the index** - Helps AI navigate the documents
2. **Start with PRD** - Provides the "why" and "what"
3. **Include architecture** - Explains the "how"
4. **Be specific** - Share only what's relevant to the task
5. **Update context** - Re-share if you've made significant changes

---

## 📦 File Sizes

- **Full context package:** ~164 KB (23 files)
- **PRD alone:** ~50-100 KB
- **Architecture:** ~20 KB
- **Epic plans:** ~10-20 KB each
- **Stories:** ~5-10 KB each

---

## ✅ Checklist

Before sharing with AI:
- [ ] Included PROJECT-CONTEXT-INDEX.md
- [ ] Included PRD
- [ ] Included relevant Epic/Story docs
- [ ] Included architecture.md (for technical tasks)
- [ ] Included code files (if asking about implementation)

---

**Need help?** Check `docs/PROJECT-CONTEXT-INDEX.md` for the complete file list.

