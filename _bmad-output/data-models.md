# Budgetsimple - Data Models

**Date:** 2025-12-20

This app uses plain JavaScript objects persisted locally.

## localStorage Config (`budgetsimple:v1`)

### Category

- `id: string`
- `name: string`
- `type: "expense" | "income" | "investment" | "transfer"`

### Rule

- `id: string`
- `kind: "regex" | "exact"`
- `pattern?: string` (for `regex`)
- `match?: string` (for `exact`)
- `category: string` (category name, not id)
- `type?: "expense" | "income" | "investment" | "transfer" | null`

### Budgets

- `budgets: Record<categoryId, number>` (monthly amount)

### Settings (selected)

- `currency: string` (e.g. `USD`)
- `monthStartDay: number` (1–28)
- `defaultRangePreset: "month" | "all" | "custom" | ...`
- `categoryColors: Record<id, hexColor>`
- `navCollapsed: boolean`
- `accounts: Array<{ id: string; name: string; kind: string; createdAt: number }>`
- `housing: "rent" | ...`
- `rentBudget: number | null`, `rentMode: "monthly" | ...`, `rentPayDay: number`

## IndexedDB Database (`budgetsimple`, v2)

### transactions (keyPath `id`)

- `id: string`
- `dateISO: string` (YYYY-MM-DD)
- `amount: number` (expenses/investments stored as negative numbers)
- `type: "expense" | "income" | "investment" | "transfer"`
- `categoryId: string`
- `description: string`
- `account: string`
- `sourceFile: string` (e.g. filename or `"manual"`)
- `createdAt: number` (epoch ms)
- `hash: string` (used for dedupe)
- `isDuplicate?: boolean` (UI hint)

### income (keyPath `id`)

- `id: string`
- `dateISO: string`
- `amount: number` (stored positive)
- `source: string`
- `createdAt: number`

### envelopes (keyPath `id`)

- `id: string`
- `name: string`
- `targetAmount: number`
- `createdAt: number`

### envelopeContribs (keyPath `id`, index `envelopeId`)

- `id: string`
- `envelopeId: string`
- `dateISO: string`
- `amount: number`
- `fromAccountId?: string`
- `toAccountId?: string`
- `note?: string`
- `createdAt?: number`

### meta (keyPath `key`)

Used for misc persisted metadata.

---

_Generated using BMAD Method `document-project` workflow_

