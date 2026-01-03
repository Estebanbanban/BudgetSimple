const CONFIG_KEY = "budgetsimple:v1";
const DB_NAME = "budgetsimple";
const DB_VERSION = 3; // Incremented to add milestones store
const FALLBACK_PREFIX = "budgetsimple:fallback:";
const ONBOARD_KEY = "budgetsimple:onboarding";

type TxType = "expense" | "income" | "investment" | "transfer";

type Category = {
  id: string;
  name: string;
  type: TxType;
};

type Rule = {
  id: string;
  kind: "regex" | "exact";
  pattern?: string;
  match?: string;
  category: string;
  type?: TxType | null;
};

type Account = {
  id: string;
  name: string;
  kind: string;
  createdAt: number;
  currency?: string;
};

type Settings = {
  currency: string;
  monthStartDay: number;
  defaultRangePreset: string;
  rangePresetUserSet?: boolean;
  netWorthManual?: number;
  manualIncomeSources?: string[];
  categoryColors: Record<string, string>;
  navCollapsed: boolean;
  accounts: Account[];
  housing: "rent" | "own";
  rentBudget: number | null;
  rentMode: "monthly" | "once" | "off";
  rentPayDay: number;
  location?: {
    country?: string;
    city?: string;
    zip?: string;
  };
};

type Config = {
  categories: Category[];
  rules: Rule[];
  budgets: Record<string, number>;
  settings: Settings;
};

type Transaction = {
  id: string;
  dateISO: string;
  amount: number;
  type: TxType;
  categoryId: string;
  description: string;
  account: string;
  sourceFile: string;
  createdAt: number;
  hash: string;
  isDuplicate?: boolean;
};

type Income = {
  id: string;
  dateISO: string;
  amount: number;
  source: string;
  createdAt: number;
};

type Envelope = {
  id: string;
  name: string;
  targetAmount: number;
  createdAt: number;
  planMonthly?: number;
  targetDateISO?: string;
};

type EnvelopeContrib = {
  id: string;
  envelopeId: string;
  dateISO: string;
  amount: number;
  fromAccountId?: string;
  toAccountId?: string;
  note?: string;
  createdAt?: number;
};

type StoreName =
  | "transactions"
  | "income"
  | "envelopes"
  | "envelopeContribs"
  | "meta"
  | "milestones";

type OnboardingState = {
  currentStep: string;
  completed: Record<string, boolean>;
  skipped: Record<string, boolean>;
};

let started = false;

// Store runtime instance to expose functions to window
let runtimeInstance: ReturnType<typeof createRuntime> | null = null;

export function initAppRuntime() {
  if (started || typeof window === "undefined") return;
  started = true;
  const app = createRuntime();
  runtimeInstance = app;
  app.init();
  
  // Expose runtime functions to window after initialization
  if (typeof window !== 'undefined') {
    (window as any).budgetsimpleRuntime = {
      analyzeMerchants: () => {
        if (runtimeInstance?.analyzeMerchants) {
          return runtimeInstance.analyzeMerchants();
        }
        // Fallback if runtime not initialized yet
        return { merchants: [], subscriptions: [] };
      },
      transactions: () => transactions,
      income: () => income,
      config: () => config,
      getStore: () => runtimeInstance?.getStore() || null
    };
  }
}

function createRuntime() {
  const store = createStore();
  let config = loadConfig();
  let transactions: Transaction[] = [];
  let income: Income[] = [];
  let envelopes: Envelope[] = [];
  let envelopeContribs: EnvelopeContrib[] = [];
  let drilldownCategoryId: string | null = null;
  let editingEnvelopeId: string | null = null;
  let editingAccountId: string | null = null;
  let lastCsvRows: string[][] = [];
  let lastIncomeRows: string[][] = [];
  let lastCsvHeaders: string[] = [];
  let lastIncomeHeaders: string[] = [];
  let lastRenderPath =
    typeof window !== "undefined" ? window.location.pathname : "";
  let csvFormatSettings = {
    dateFormat: "auto", // "auto" | "iso" | "us" | "eu" | "long"
    numberFormat: "auto", // "auto" | "us" | "eu" | "swiss"
    currencySymbol: "", // "" for auto-detect, or "CA$", "$", "€", etc.
  };
  const onboardSteps = [
    "upload",
    "map",
    "accounts",
    "location",
    "review",
    "envelope",
    "health",
  ];
  const onboardRequired = new Set(["upload", "map"]);
  let onboarding = loadOnboarding();
  const boundEvents = new WeakMap<HTMLElement, Set<string>>();
  let rebindTimer: number | null = null;
  let isRendering = false;

  function init() {
    applyNavCollapsed();
    bindAll();
    loadAll().then(() => {
      renderAll();
    });
    observeDom();
  }

  async function loadAll() {
    transactions = await store.getAll("transactions");
    income = await store.getAll("income");
    envelopes = await store.getAll("envelopes");
    envelopeContribs = await store.getAll("envelopeContribs");
  }

  function applyNavCollapsed() {
    if (config.settings.navCollapsed) {
      document.body.classList.add("nav-collapsed");
    } else {
      document.body.classList.remove("nav-collapsed");
    }
  }

  function bindAll() {
    bindGlobalDelegates();
    bindHeaderActions();
    bindSettings();
    bindImport();
    bindIncome();
    bindManualIncome();
    bindIncomeTable();
    bindInvesting();
    bindEnvelopes();
    bindQuickAdd();
    bindRent();
    bindBudgets();
    bindActionItems();
    bindDrilldownButtons();
    bindLocation();
    bindOnboarding();
  }

  function observeDom() {
    const observer = new MutationObserver(() => scheduleRebind());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function scheduleRebind() {
    if (isRendering) return;
    if (rebindTimer) window.clearTimeout(rebindTimer);
    rebindTimer = window.setTimeout(async () => {
      bindAll();
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== lastRenderPath
      ) {
        lastRenderPath = window.location.pathname;
        renderAll();
      }
      rebindTimer = null;
    }, 50);
  }

  function bindHeaderActions() {
    const navToggle = byId("btnToggleNav");
    const navEdgeToggle = byId("navEdgeToggle");
    const openRange = byId("btnOpenRange");
    const closeRange = byId("btnCloseRange");
    const quickAdd = byId("btnQuickAdd");
    const resetAll = byId("btnResetAll");
    const exportSummary = byId("btnExportSummaryCsv");
    const setupBtn = byId("btnSetup");
    const rangeControls = byId("rangeControls");
    const currencySelect = byId<HTMLSelectElement>("currencySelect");
    const customRangeGroup = byId("customRangeGroup");
    const rangeFrom = byId<HTMLInputElement>("rangeFrom");
    const rangeTo = byId<HTMLInputElement>("rangeTo");
    const applyCustomRange = byId("applyCustomRange");
    const clearFilter = byId("btnClearFilter");
    const momAsPercent = byId<HTMLInputElement>("momAsPercent");
    const momStacked = byId<HTMLInputElement>("momStacked");

    // Only bind once using flags
    if (navToggle && !navToggle.hasAttribute("data-bound")) {
      navToggle.setAttribute("data-bound", "true");
      on(navToggle, "click", toggleNav);
    }
    if (navEdgeToggle && !navEdgeToggle.hasAttribute("data-bound")) {
      navEdgeToggle.setAttribute("data-bound", "true");
      on(navEdgeToggle, "click", toggleNav);
    }

    if (openRange && !openRange.hasAttribute("data-bound")) {
      openRange.setAttribute("data-bound", "true");
      on(openRange, "click", () => {
        const controls = byId("rangeControls");
        const closeBtn = byId("btnCloseRange");
        if (controls) controls.hidden = false;
        if (closeBtn) closeBtn.hidden = false;
      });
    }
    if (closeRange && !closeRange.hasAttribute("data-bound")) {
      closeRange.setAttribute("data-bound", "true");
      on(closeRange, "click", () => {
        const controls = byId("rangeControls");
        if (controls) controls.hidden = true;
      });
    }

    if (quickAdd && !quickAdd.hasAttribute("data-bound")) {
      quickAdd.setAttribute("data-bound", "true");
      on(quickAdd, "click", () => toggleModal("quickAdd", true));
    }
    if (exportSummary && !exportSummary.hasAttribute("data-bound")) {
      exportSummary.setAttribute("data-bound", "true");
      on(exportSummary, "click", exportSummaryCsv);
    }
    if (setupBtn && !setupBtn.hasAttribute("data-bound")) {
      setupBtn.setAttribute("data-bound", "true");
      on(setupBtn, "click", () => {
        window.location.href = "/settings";
      });
    }
    if (currencySelect) {
      currencySelect.value = config.settings.currency;
      on(currencySelect, "change", () => {
        config.settings.currency = currencySelect.value || "USD";
        saveConfig();
        renderAll();
      });
    }
    if (clearFilter && !clearFilter.hasAttribute("data-bound")) {
      clearFilter.setAttribute("data-bound", "true");
      on(clearFilter, "click", () => setDrilldownCategory(null));
    }
    if (momAsPercent && !momAsPercent.hasAttribute("data-bound")) {
      momAsPercent.setAttribute("data-bound", "true");
      on(momAsPercent, "change", () => renderMoMChart());
    }
    if (momStacked && !momStacked.hasAttribute("data-bound")) {
      momStacked.setAttribute("data-bound", "true");
      on(momStacked, "change", () => renderMoMChart());
    }

    // Cashflow map button handlers
    const clearFlowDrill = byId("btnClearFlowDrill");
    if (clearFlowDrill && !clearFlowDrill.hasAttribute("data-bound")) {
      clearFlowDrill.setAttribute("data-bound", "true");
      on(clearFlowDrill, "click", () => {
        const explainPanel = byId("cashflowExplain");
        if (explainPanel) explainPanel.hidden = true;
        clearFlowDrill.hidden = true;
        // Clear node highlights
        document
          .querySelectorAll<HTMLElement>("[data-flow-node]")
          .forEach((node) => {
            node.classList.remove("is-highlighted");
          });
      });
    }

    const centerFlow = byId("btnCenterFlow");
    if (centerFlow && !centerFlow.hasAttribute("data-bound")) {
      centerFlow.setAttribute("data-bound", "true");
      on(centerFlow, "click", () => {
        // Reset pan/zoom (for future implementation)
        renderCashflowMap();
      });
    }

    const exportFlowPng = byId("btnExportFlowPng");
    if (exportFlowPng && !exportFlowPng.hasAttribute("data-bound")) {
      exportFlowPng.setAttribute("data-bound", "true");
      on(exportFlowPng, "click", () => {
        const svg = byId("flowSankey")?.querySelector("svg");
        if (!svg) return;
        // Export SVG as PNG (simplified - would need canvas conversion in production)
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "cashflow-map.svg";
        link.click();
        URL.revokeObjectURL(url);
      });
    }
    on(resetAll, "click", async () => {
      if (!confirm("Reset all local data? This cannot be undone.")) return;
      await store.clearAll();
      localStorage.removeItem(CONFIG_KEY);
      localStorage.removeItem("budgetsimple:range");
      localStorage.removeItem(ONBOARD_KEY);
      config = loadConfig();
      await loadAll();
      renderAll();
    });

    const rangePreset = byId<HTMLSelectElement>("rangePreset");
    if (rangePreset) {
      rangePreset.value = config.settings.defaultRangePreset || "month";
    }
    on(rangePreset, "change", () => {
      const val = rangePreset?.value || "month";
      config.settings.defaultRangePreset = val;
      config.settings.rangePresetUserSet = true;
      saveConfig();
      if (customRangeGroup) customRangeGroup.hidden = val !== "custom";
      renderAll();
    });

    if (rangePreset && customRangeGroup) {
      customRangeGroup.hidden =
        (rangePreset.value || config.settings.defaultRangePreset) !== "custom";
    }

    if (rangeFrom && rangeTo) {
      const custom = readCustomRange();
      if (custom?.from) rangeFrom.value = custom.from;
      if (custom?.to) rangeTo.value = custom.to;
    }

    on(applyCustomRange, "click", () => {
      if (!rangeFrom?.value || !rangeTo?.value) return;
      const from = rangeFrom.value;
      const to = rangeTo.value;
      localStorage.setItem("budgetsimple:range", JSON.stringify({ from, to }));
      config.settings.defaultRangePreset = "custom";
      config.settings.rangePresetUserSet = true;
      saveConfig();
      renderAll();
    });
  }

  function loadOnboarding(): OnboardingState {
    const raw = localStorage.getItem(ONBOARD_KEY);
    if (!raw) {
      return { currentStep: "upload", completed: {}, skipped: {} };
    }
    try {
      const parsed = JSON.parse(raw) as OnboardingState;
      if (!parsed.currentStep) parsed.currentStep = "upload";
      parsed.completed = parsed.completed || {};
      parsed.skipped = parsed.skipped || {};
      if (!onboardSteps.includes(parsed.currentStep))
        parsed.currentStep = "upload";
      return parsed;
    } catch {
      return { currentStep: "upload", completed: {}, skipped: {} };
    }
  }

  function saveOnboarding() {
    localStorage.setItem(ONBOARD_KEY, JSON.stringify(onboarding));
  }

  function markOnboardingComplete(step: string, skipped = false) {
    if (!onboardSteps.includes(step)) return;
    if (skipped) onboarding.skipped[step] = true;
    onboarding.completed[step] = true;
    saveOnboarding();
    updateOnboardingUI();
  }

  function setOnboardingStep(step: string) {
    if (!onboardSteps.includes(step)) return;
    onboarding.currentStep = step;
    saveOnboarding();
    updateOnboardingUI();
  }

  function canJumpTo(step: string) {
    const targetIdx = onboardSteps.indexOf(step);
    if (targetIdx === -1) return false;
    for (let i = 0; i < targetIdx; i += 1) {
      const required = onboardRequired.has(onboardSteps[i]);
      const done = onboarding.completed[onboardSteps[i]];
      if (required && !done) return false;
    }
    return true;
  }

  function showOnboardMessage(message: string) {
    const el = byId("onboardMessage");
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  }

  function updateOnboardingUI() {
    syncOnboardingFromData();
    const current = onboarding.currentStep;
    const panels = document.querySelectorAll<HTMLElement>("[data-step]");
    panels.forEach((panel) => {
      const step = panel.getAttribute("data-step");
      panel.hidden = step !== current;
    });

    const stepButtons =
      document.querySelectorAll<HTMLButtonElement>(".onboard-step");
    stepButtons.forEach((btn) => {
      const step = btn.getAttribute("data-step-target") || "";
      const complete = onboarding.completed[step] || onboarding.skipped[step];
      btn.classList.toggle("is-complete", !!complete);
      btn.classList.toggle("is-active", step === current);
      btn.classList.toggle("is-disabled", !canJumpTo(step));
      const status = btn.querySelector<HTMLElement>(
        `[data-step-status=\"${step}\"]`
      );
      if (status) status.textContent = complete ? "✓" : "";
    });
  }

  function bindOnboarding() {
    const stepList = byId("onboardStepList");
    if (stepList && !stepList.hasAttribute("data-bound")) {
      stepList.setAttribute("data-bound", "true");
      stepList
        .querySelectorAll<HTMLButtonElement>(".onboard-step")
        .forEach((btn) => {
          on(btn, "click", () => {
            const step = btn.getAttribute("data-step-target") || "";
            if (!canJumpTo(step)) return;
            setOnboardingStep(step);
          });
        });
    }

    document
      .querySelectorAll<HTMLElement>("[data-onboard-next]")
      .forEach((btn) => {
        if (btn.hasAttribute("data-bound")) return;
        btn.setAttribute("data-bound", "true");
        on(btn, "click", () => {
          const current = onboarding.currentStep;
          if (onboardRequired.has(current) && !onboarding.completed[current]) {
            showOnboardMessage("Complete this step before continuing.");
            return;
          }
          showOnboardMessage("");
          markOnboardingComplete(current);
          const idx = onboardSteps.indexOf(current);
          const next = onboardSteps[Math.min(onboardSteps.length - 1, idx + 1)];
          setOnboardingStep(next);
        });
      });

    document
      .querySelectorAll<HTMLElement>("[data-onboard-back]")
      .forEach((btn) => {
        if (btn.hasAttribute("data-bound")) return;
        btn.setAttribute("data-bound", "true");
        on(btn, "click", () => {
          showOnboardMessage("");
          const idx = onboardSteps.indexOf(onboarding.currentStep);
          const prev = onboardSteps[Math.max(0, idx - 1)];
          setOnboardingStep(prev);
        });
      });

    document
      .querySelectorAll<HTMLElement>("[data-onboard-skip]")
      .forEach((btn) => {
        if (btn.hasAttribute("data-bound")) return;
        btn.setAttribute("data-bound", "true");
        on(btn, "click", () => {
          const current = onboarding.currentStep;
          if (onboardRequired.has(current)) return;
          showOnboardMessage("");
          markOnboardingComplete(current, true);
          const idx = onboardSteps.indexOf(current);
          const next = onboardSteps[Math.min(onboardSteps.length - 1, idx + 1)];
          setOnboardingStep(next);
        });
      });

    document
      .querySelectorAll<HTMLElement>("[data-onboard-finish]")
      .forEach((btn) => {
        if (btn.hasAttribute("data-bound")) return;
        btn.setAttribute("data-bound", "true");
        on(btn, "click", () => {
          markOnboardingComplete("health");
          window.location.href = "/dashboard";
        });
      });
  }

  function syncOnboardingFromData() {
    if (transactions.length > 0 || income.length > 0) {
      onboarding.completed.upload = true;
      onboarding.completed.map = true;
    }
    if (config.settings.accounts.length > 0 || income.length > 0) {
      onboarding.completed.accounts = true;
    }
    const loc = config.settings.location || {};
    if ((loc.country && loc.city) || loc.zip) {
      onboarding.completed.location = true;
    }
    if (envelopes.length > 0) {
      onboarding.completed.envelope = true;
    }
    saveOnboarding();
  }

  function bindGlobalDelegates() {
    const root = document.documentElement;
    if (!root || root.hasAttribute("data-bound-global-delegate")) return;
    root.setAttribute("data-bound-global-delegate", "true");
    document.addEventListener(
      "click",
      async (event) => {
        const target = event.target as HTMLElement | null;
        const addCard = target?.closest(".envelope-add") as HTMLElement | null;
        if (addCard) {
          createEnvelope();
          return;
        }
        const card = target?.closest(
          ".envelope-card[data-envelope-id]"
        ) as HTMLElement | null;
        if (card) {
          const envelopeId = card.getAttribute("data-envelope-id");
          if (envelopeId) openEnvelopeModal(envelopeId);
          return;
        }
        const incomeBtn = target?.closest(
          "button[data-income-action]"
        ) as HTMLButtonElement | null;
        if (incomeBtn) {
          const action = incomeBtn.getAttribute("data-income-action");
          const id = incomeBtn.getAttribute("data-income-id");
          const kind = incomeBtn.getAttribute("data-income-kind");
          if (!action || !id || !kind) return;
          if (action === "remove") {
            if (!confirm("Remove this income entry?")) return;
            await store.remove(
              kind === "income" ? "income" : "transactions",
              id
            );
            await loadAll();
            renderAll();
            return;
          }
          if (action === "edit") {
            const current =
              kind === "income"
                ? income.find((row) => row.id === id)
                : transactions.find(
                    (row) => row.id === id && row.type === "income"
                  );
            if (!current) return;
            const currentAmount =
              kind === "income"
                ? (current as Income).amount
                : Math.abs((current as Transaction).amount);
            const dateISO = prompt("Date (YYYY-MM-DD):", current.dateISO);
            if (!dateISO) return;
            const source = prompt(
              "Source:",
              kind === "income"
                ? (current as Income).source
                : (current as Transaction).description
            );
            if (!source) return;
            const amountStr = prompt("Amount:", String(currentAmount));
            if (!amountStr) return;
            const amountValue = Number(amountStr);
            if (Number.isNaN(amountValue) || amountValue <= 0) return;
            if (kind === "income") {
              const row = current as Income;
              row.dateISO = dateISO;
              row.source = source;
              row.amount = amountValue;
              await store.put("income", row);
            } else {
              const row = current as Transaction;
              row.dateISO = dateISO;
              row.description = source;
              row.amount = Math.abs(amountValue);
              row.hash = hashRow([
                row.dateISO,
                row.amount,
                row.description,
                row.account,
              ]);
              await store.put("transactions", row);
            }
            await loadAll();
            renderAll();
            return;
          }
        }
        const budgetBtn = target?.closest(
          "button[data-budget-action]"
        ) as HTMLButtonElement | null;
        if (budgetBtn) {
          const action = budgetBtn.getAttribute("data-budget-action");
          const encoded = budgetBtn.getAttribute("data-budget-name");
          if (!action || !encoded) return;
          const name = decodeURIComponent(encoded);
          const budgetForm = byId<HTMLFormElement>("budgetForm");
          const budgetCategory = byId<HTMLSelectElement>("budgetCategory");
          const budgetAmount = byId<HTMLInputElement>("budgetAmount");
          const submitBtn = budgetForm?.querySelector<HTMLButtonElement>(
            'button[type="submit"]'
          );
          if (action === "edit") {
            const amount = config.budgets[name];
            if (budgetCategory) budgetCategory.value = name;
            if (budgetAmount) {
              budgetAmount.value = String(amount || "");
              budgetAmount.focus();
            }
            if (budgetForm) budgetForm.dataset.editingBudget = name;
            if (submitBtn) submitBtn.textContent = "Update";
            return;
          }
          if (action === "remove") {
            if (!confirm(`Remove budget for "${name}"?`)) return;
            delete config.budgets[name];
            saveConfig();
            renderAll();
          }
        }
      },
      true
    );
  }

  function bindSettings() {
    const monthStart = byId<HTMLSelectElement>("settingsMonthStart");
    const defaultRange = byId<HTMLSelectElement>("settingsDefaultRange");
    const displayCurrency = byId<HTMLSelectElement>("settingsDisplayCurrency");
    const housing = byId<HTMLSelectElement>("settingsHousing");
    const rentPayDay = byId<HTMLInputElement>("settingsRentPayDay");
    const navCollapsed = byId<HTMLInputElement>("settingsNavCollapsed");
    const saveBtn = byId("btnSaveSettings");

    if (monthStart) {
      monthStart.innerHTML = "";
      for (let i = 1; i <= 28; i += 1) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = String(i);
        monthStart.appendChild(opt);
      }
      monthStart.value = String(config.settings.monthStartDay);
    }

    if (defaultRange) defaultRange.value = config.settings.defaultRangePreset;
    if (displayCurrency) displayCurrency.value = config.settings.currency;
    if (housing) housing.value = config.settings.housing;
    if (rentPayDay) rentPayDay.value = String(config.settings.rentPayDay || "");
    if (navCollapsed) navCollapsed.checked = config.settings.navCollapsed;

    on(saveBtn, "click", () => {
      if (monthStart)
        config.settings.monthStartDay = Number(monthStart.value || 1);
      if (defaultRange)
        config.settings.defaultRangePreset = defaultRange.value || "month";
      config.settings.rangePresetUserSet = true;
      if (displayCurrency)
        config.settings.currency = displayCurrency.value || "USD";
      if (housing)
        config.settings.housing =
          (housing.value as Settings["housing"]) || "rent";
      if (rentPayDay)
        config.settings.rentPayDay = Number(rentPayDay.value || 1);
      if (navCollapsed) config.settings.navCollapsed = navCollapsed.checked;
      saveConfig();
      applyNavCollapsed();
      renderAll();
    });
  }

  function bindImport() {
    const fileInput = byId<HTMLInputElement>("txCsvFile");
    const chooseBtn = byId("btnChooseTxCsv");
    const importBtn = byId("btnImportTx");
    const dropzone = byId("txDropzone");
    const analyzing = byId("txAnalyzing");

    on(chooseBtn, "click", (e) => {
      e.stopPropagation();
      fileInput?.click();
    });
    on(fileInput, "change", async () => {
      if (!fileInput?.files?.[0]) return;
      analyzing && (analyzing.hidden = false);
      await handleCsvFile(fileInput.files[0]);
      analyzing && (analyzing.hidden = true);
      markOnboardingComplete("upload");
      if (onboarding.currentStep === "upload") setOnboardingStep("map");
    });

    on(dropzone, "click", (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button")) return;
      fileInput?.click();
    });
    on(dropzone, "dragover", (e) => e.preventDefault());
    on(dropzone, "drop", async (e) => {
      e.preventDefault();
      const dt = (e as DragEvent).dataTransfer;
      if (!dt?.files?.[0]) return;
      analyzing && (analyzing.hidden = false);
      await handleCsvFile(dt.files[0]);
      analyzing && (analyzing.hidden = true);
      markOnboardingComplete("upload");
      if (onboarding.currentStep === "upload") setOnboardingStep("map");
    });

    on(importBtn, "click", async () => {
      if (!lastCsvRows.length || !lastCsvHeaders.length) return;
      // Read format settings
      const dateFormatSelect = byId<HTMLSelectElement>("dateFormat");
      const numberFormatSelect = byId<HTMLSelectElement>("numberFormat");
      const currencySymbolInput = byId<HTMLInputElement>("currencySymbol");
      csvFormatSettings = {
        dateFormat: dateFormatSelect?.value || "auto",
        numberFormat: numberFormatSelect?.value || "auto",
        currencySymbol: currencySymbolInput?.value?.trim() || "",
      };
      const mapping = readMapping("mappingGrid");
      await importTransactions(lastCsvHeaders, lastCsvRows, mapping);
      markOnboardingComplete("map");
      if (onboarding.currentStep === "map") setOnboardingStep("accounts");
    });

    // Format settings bindings
    const resetFormatBtn = byId("btnResetFormat");
    on(resetFormatBtn, "click", () => {
      const dateFormatSelect = byId<HTMLSelectElement>("dateFormat");
      const numberFormatSelect = byId<HTMLSelectElement>("numberFormat");
      const currencySymbolInput = byId<HTMLInputElement>("currencySymbol");
      if (dateFormatSelect) dateFormatSelect.value = "auto";
      if (numberFormatSelect) numberFormatSelect.value = "auto";
      if (currencySymbolInput) currencySymbolInput.value = "";
      // Re-detect formats
      if (lastCsvHeaders.length && lastCsvRows.length) {
        detectAndDisplayFormats(lastCsvHeaders, lastCsvRows);
      }
    });

    // Only bind modal version if modal exists (not for connect page)
    const addAccountBtn = byId("btnAddAccount");
    const createAccountModal = byId("createAccountModal");
    if (addAccountBtn && createAccountModal) {
      on(addAccountBtn, "click", () => {
        toggleModal("createAccountModal", true);
      });
    }

    document.querySelectorAll("#btnCreateEnvelope").forEach((btn) => {
      const el = btn as HTMLElement;
      if (el.hasAttribute("data-bound")) return;
      el.setAttribute("data-bound", "true");
      on(el, "click", () => {
        editingEnvelopeId = null;
        setText("createEnvelopeTitle", "Create envelope");
        setText("createEnvelopeSub", "Set a goal and target amount.");
        const nameInput = byId<HTMLInputElement>("createEnvelopeName");
        const targetInput = byId<HTMLInputElement>("createEnvelopeTarget");
        if (nameInput) nameInput.value = "";
        if (targetInput) targetInput.value = "";
        toggleModal("createEnvelopeModal", true);
      });
    });

    const accountForm = byId<HTMLFormElement>("createAccountForm");
    on(accountForm, "submit", (e) => {
      e.preventDefault();
      const name = byId<HTMLInputElement>("createAccountName")?.value;
      const kind =
        byId<HTMLSelectElement>("createAccountKind")?.value || "bank";
      if (!name) return;
      if (editingAccountId) {
        const acc = config.settings.accounts.find(
          (row) => row.id === editingAccountId
        );
        if (acc) {
          acc.name = name.trim();
          acc.kind = kind;
        }
      } else {
        config.settings.accounts.push({
          id: uid(),
          name,
          kind,
          createdAt: Date.now(),
          currency: config.settings.currency,
        });
      }
      saveConfig();
      renderAll();
      accountForm?.reset();
      editingAccountId = null;
      const title = byId("createAccountTitle");
      const sub = byId("createAccountSub");
      const submit = byId<HTMLButtonElement>("createAccountSubmit");
      if (title) title.textContent = "Add account";
      if (sub) sub.textContent = "Name and type for importing transactions.";
      if (submit) submit.textContent = "Add";
      toggleModal("createAccountModal", false);
    });

    const envelopeForm = byId<HTMLFormElement>("createEnvelopeForm");
    on(envelopeForm, "submit", (e) => {
      e.preventDefault();
      const name = byId<HTMLInputElement>("createEnvelopeName")?.value;
      const target = Number(
        byId<HTMLInputElement>("createEnvelopeTarget")?.value || 0
      );
      if (!name || !target) return;
      if (editingEnvelopeId) {
        const env = envelopes.find((e) => e.id === editingEnvelopeId);
        if (!env) return;
        env.name = name;
        env.targetAmount = target;
        store.put("envelopes", env).then(() => {
          renderAll();
        });
      } else {
        const env: Envelope = {
          id: uid(),
          name,
          targetAmount: target,
          createdAt: Date.now(),
        };
        store.put("envelopes", env).then(() => {
          envelopes.unshift(env);
          renderAll();
          markOnboardingComplete("envelope");
        });
      }
      editingEnvelopeId = null;
      envelopeForm?.reset();
      toggleModal("createEnvelopeModal", false);
    });
  }

  function bindIncome() {
    const fileInput = byId<HTMLInputElement>("incomeCsvFile");
    const chooseBtn = byId("btnChooseIncomeCsv");
    const previewBtn = byId("btnLoadIncomeCsv");
    const importBtn = byId("btnImportIncome");
    const dropzone = byId("incomeDropzone");

    on(chooseBtn, "click", () => fileInput?.click());
    on(fileInput, "change", async () => {
      if (!fileInput?.files?.[0]) return;
      await handleIncomeCsv(fileInput.files[0]);
    });
    on(previewBtn, "click", () => {
      renderIncomePreview();
    });
    on(dropzone, "click", () => fileInput?.click());
    on(dropzone, "dragover", (e) => e.preventDefault());
    on(dropzone, "drop", async (e) => {
      e.preventDefault();
      const dt = (e as DragEvent).dataTransfer;
      if (!dt?.files?.[0]) return;
      await handleIncomeCsv(dt.files[0]);
    });

    on(importBtn, "click", async () => {
      if (!lastIncomeRows.length || !lastIncomeHeaders.length) return;
      const mapping = readMapping("incomeMappingGrid");
      await importIncome(lastIncomeHeaders, lastIncomeRows, mapping);
    });
  }

  function bindManualIncome() {
    const form = byId<HTMLFormElement>("manualIncomeForm");
    const dateInput = byId<HTMLInputElement>("manualIncomeDate");
    const sourceSelect = byId<HTMLSelectElement>("manualIncomeSourceSelect");
    const sourceCustom = byId<HTMLInputElement>("manualIncomeSourceCustom");
    const amountInput = byId<HTMLInputElement>("manualIncomeAmount");

    // Only bind change event once
    if (sourceSelect && !sourceSelect.hasAttribute("data-bound-income")) {
      sourceSelect.setAttribute("data-bound-income", "true");
      on(sourceSelect, "change", (e) => {
        e.stopPropagation();
        const val = sourceSelect.value;
        if (sourceCustom) sourceCustom.hidden = val !== "Custom...";
      });
    }

    on(form, "submit", async (e) => {
      e.preventDefault();
      if (!dateInput?.value || !amountInput?.value) return;
      const source =
        sourceSelect?.value === "Custom..."
          ? sourceCustom?.value || "Income"
          : sourceSelect?.value || "Income";
      const row: Income = {
        id: uid(),
        dateISO: dateInput.value,
        amount: Math.abs(Number(amountInput.value)),
        source,
        createdAt: Date.now(),
      };
      await store.put("income", row);
      income.unshift(row);
      if (sourceSelect?.value === "Custom..." && sourceCustom?.value) {
        const cleaned = sourceCustom.value.trim();
        if (cleaned) {
          const existing = new Set(config.settings.manualIncomeSources || []);
          if (!existing.has(cleaned)) {
            config.settings.manualIncomeSources = [cleaned, ...existing];
            saveConfig();
          }
        }
      }
      renderAll();
      form?.reset();
    });
  }

  function bindInvesting() {
    const form = byId<HTMLFormElement>("investmentForm");
    const dateInput = byId<HTMLInputElement>("investmentDate");
    const instrument = byId<HTMLSelectElement>("investmentInstrument");
    const instrumentCustom = byId<HTMLInputElement>(
      "investmentInstrumentCustom"
    );
    const amountInput = byId<HTMLInputElement>("investmentAmount");

    // Populate select via populateSelects, don't do it here
    // Only bind change event once using a flag
    if (instrument && !instrument.hasAttribute("data-bound-invest")) {
      instrument.setAttribute("data-bound-invest", "true");
      on(instrument, "change", (e) => {
        e.stopPropagation();
        if (instrumentCustom)
          instrumentCustom.hidden = instrument.value !== "Custom...";
      });
    }

    on(form, "submit", async (e) => {
      e.preventDefault();
      if (!dateInput?.value || !amountInput?.value) return;
      const desc =
        instrument?.value === "Custom..."
          ? instrumentCustom?.value || "Investment"
          : instrument?.value || "Investment";
      const row: Transaction = {
        id: uid(),
        dateISO: dateInput.value,
        amount: -Math.abs(Number(amountInput.value)),
        type: "investment",
        categoryId: getCategoryIdByName("Investments", "investment"),
        description: desc,
        account: "Investing",
        sourceFile: "manual",
        createdAt: Date.now(),
        hash: hashRow([dateInput.value, amountInput.value, desc, "Investing"]),
      };
      await store.put("transactions", row);
      transactions.unshift(row);
      renderAll();
      form?.reset();
    });

    const accountForm = byId<HTMLFormElement>("accountCreateForm");
    const accountName = byId<HTMLInputElement>("accountName");
    const accountKind = byId<HTMLSelectElement>("accountKind");
    const btnAddAccount = byId("btnAddAccount");

    // Bind add account button (in connect page)
    if (btnAddAccount && !btnAddAccount.hasAttribute("data-bound")) {
      btnAddAccount.setAttribute("data-bound", "true");
      on(btnAddAccount, "click", () => {
        if (accountName) accountName.focus();
      });
    }

    on(accountForm, "submit", (e) => {
      e.preventDefault();
      if (!accountName?.value) return;
      config.settings.accounts.push({
        id: uid(),
        name: accountName.value,
        kind: accountKind?.value || "bank",
        createdAt: Date.now(),
        currency: config.settings.currency,
      });
      saveConfig();
      renderAll();
      accountForm?.reset();
    });

    const runScenario = byId("btnRunWealthScenario");
    on(runScenario, "click", () => {
      const start = Number(
        byId<HTMLInputElement>("wealthStartNetWorth")?.value || 0
      );
      const monthly = Number(
        byId<HTMLInputElement>("wealthMonthlyContribution")?.value || 0
      );
      const annual =
        Number(byId<HTMLInputElement>("wealthAnnualReturn")?.value || 0) / 100;
      const years = Number(byId<HTMLInputElement>("wealthYears")?.value || 0);
      const series: { label: string; value: number }[] = [];
      let value = start;
      const months = Math.max(1, years * 12);
      for (let i = 0; i <= months; i += 3) {
        const growth = Math.pow(1 + annual / 12, i);
        value =
          start * growth + monthly * ((growth - 1) / (annual / 12 || 0.0001));
        series.push({ label: `M${i}`, value });
      }
      const chart = byId("wealthBuilderChart");
      if (chart) renderLineChart(chart, series);
      const empty = byId("wealthBuilderEmpty");
      if (empty) empty.hidden = true;
      config.settings.netWorthManual = start;
      saveConfig();
      renderAll();
    });
  }

  function bindRent() {
    // Connect page quick rent
    const saveRentFromImport = byId("btnSaveRentFromImport");
    const importRentAmount = byId<HTMLInputElement>("importRentAmount");
    const importRentMode = byId<HTMLSelectElement>("importRentMode");
    const importRentSavedNote = byId("importRentSavedNote");

    if (saveRentFromImport) {
      on(saveRentFromImport, "click", async () => {
        if (!importRentAmount?.value) return;
        const amount = Number(importRentAmount.value);
        const mode = importRentMode?.value || "monthly";

        config.settings.rentBudget = amount;
        config.settings.rentMode = mode as "monthly" | "once" | "off";
        saveConfig();

        // If mode is monthly or once, create rent transaction(s)
        if (mode === "monthly" || mode === "once") {
          const now = new Date();
          const rentPayDay = config.settings.rentPayDay || 1;
          const dates: string[] = [];

          if (mode === "once") {
            // Single transaction for current month
            const rentDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              Math.min(rentPayDay, 28)
            );
            dates.push(toISO(rentDate));
          } else {
            // Monthly transactions for last 3 months and next 3 months
            for (let i = -3; i <= 3; i++) {
              const rentDate = new Date(
                now.getFullYear(),
                now.getMonth() + i,
                Math.min(rentPayDay, 28)
              );
              dates.push(toISO(rentDate));
            }
          }

          // Remove existing rent transactions first
          const existingRents = transactions.filter((t) => {
            const cat = config.categories.find((c) => c.id === t.categoryId);
            return cat?.name === "Rent" || cat?.name === "Housing";
          });

          // Remove from store by re-putting all transactions except rent ones
          const nonRentTransactions = transactions.filter(
            (t) => !existingRents.find((r) => r.id === t.id)
          );
          await store.bulkPut("transactions", nonRentTransactions);
          transactions = nonRentTransactions;

          // Create new rent transactions
          const newRents: Transaction[] = [];
          for (const dateISO of dates) {
            const rent: Transaction = {
              id: uid(),
              dateISO,
              amount: -Math.abs(amount),
              type: "expense",
              categoryId:
                getCategoryIdByName("Rent", "expense") ||
                getCategoryIdByName("Housing", "expense"),
              description: "Rent",
              account: config.settings.accounts[0]?.name || "Bank",
              sourceFile: "manual",
              createdAt: Date.now(),
              hash: hashRow([dateISO, amount, "Rent", "manual"]),
            };
            await store.put("transactions", rent);
            newRents.push(rent);
          }
          transactions = newRents.concat(transactions);
        }

        await loadAll();
        renderAll();

        if (importRentSavedNote) {
          importRentSavedNote.textContent = `Saved: ${formatCurrency(amount)} ${
            mode === "monthly"
              ? "per month"
              : mode === "once"
              ? "one-time"
              : "budget only"
          }`;
          setTimeout(() => {
            if (importRentSavedNote) importRentSavedNote.textContent = "";
          }, 3000);
        }
      });
    }

    // Plan page rent
    const saveRent = byId("btnSaveRent");
    const rentAmount = byId<HTMLInputElement>("rentAmount");
    const rentMode = byId<HTMLSelectElement>("rentMode");
    const rentSavedNote = byId("rentSavedNote");

    if (saveRent) {
      // Load existing rent budget
      if (rentAmount && config.settings.rentBudget) {
        rentAmount.value = String(config.settings.rentBudget);
      }
      if (rentMode && config.settings.rentMode) {
        rentMode.value = config.settings.rentMode;
      }

      on(saveRent, "click", async () => {
        if (!rentAmount?.value) return;
        const amount = Number(rentAmount.value);
        const mode = rentMode?.value || "monthly";

        config.settings.rentBudget = amount;
        config.settings.rentMode = mode as "monthly" | "once" | "off";
        saveConfig();

        // If mode is monthly or once, create rent transaction(s)
        if (mode === "monthly" || mode === "once") {
          const now = new Date();
          const rentPayDay = config.settings.rentPayDay || 1;
          const dates: string[] = [];

          if (mode === "once") {
            const rentDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              Math.min(rentPayDay, 28)
            );
            dates.push(toISO(rentDate));
          } else {
            for (let i = -3; i <= 3; i++) {
              const rentDate = new Date(
                now.getFullYear(),
                now.getMonth() + i,
                Math.min(rentPayDay, 28)
              );
              dates.push(toISO(rentDate));
            }
          }

          // Remove existing rent transactions
          const existingRents = transactions.filter((t) => {
            const cat = config.categories.find((c) => c.id === t.categoryId);
            return cat?.name === "Rent" || cat?.name === "Housing";
          });

          // Remove from store by re-putting all transactions except rent ones
          const nonRentTransactions = transactions.filter(
            (t) => !existingRents.find((r) => r.id === t.id)
          );
          await store.bulkPut("transactions", nonRentTransactions);
          transactions = nonRentTransactions;

          // Create new rent transactions
          const newRents: Transaction[] = [];
          for (const dateISO of dates) {
            const rent: Transaction = {
              id: uid(),
              dateISO,
              amount: -Math.abs(amount),
              type: "expense",
              categoryId:
                getCategoryIdByName("Rent", "expense") ||
                getCategoryIdByName("Housing", "expense"),
              description: "Rent",
              account: config.settings.accounts[0]?.name || "Bank",
              sourceFile: "manual",
              createdAt: Date.now(),
              hash: hashRow([dateISO, amount, "Rent", "manual"]),
            };
            await store.put("transactions", rent);
            newRents.push(rent);
          }
          transactions = newRents.concat(transactions);
        }

        await loadAll();
        renderAll();

        if (rentSavedNote) {
          rentSavedNote.textContent = `Saved: ${formatCurrency(amount)} ${
            mode === "monthly"
              ? "per month"
              : mode === "once"
              ? "one-time"
              : "budget only"
          }`;
          setTimeout(() => {
            if (rentSavedNote) rentSavedNote.textContent = "";
          }, 3000);
        }
      });
    }
  }

  function bindBudgets() {
    const budgetForm = byId<HTMLFormElement>("budgetForm");
    const budgetCategory = byId<HTMLSelectElement>("budgetCategory");
    const budgetAmount = byId<HTMLInputElement>("budgetAmount");
    const submitBtn = budgetForm?.querySelector<HTMLButtonElement>(
      'button[type="submit"]'
    );

    if (budgetForm && !budgetForm.hasAttribute("data-bound")) {
      budgetForm.setAttribute("data-bound", "true");
      on(budgetForm, "submit", (e) => {
        e.preventDefault();
        if (!budgetCategory?.value || !budgetAmount?.value) return;
        const categoryName = budgetCategory.value;
        const amount = Number(budgetAmount.value);
        const editing = budgetForm.dataset.editingBudget;
        if (editing && editing !== categoryName) {
          delete config.budgets[editing];
        }
        config.budgets[categoryName] = amount;
        saveConfig();
        renderAll();
        budgetForm?.reset();
        if (submitBtn) submitBtn.textContent = "Set";
        budgetForm.dataset.editingBudget = "";
      });
    }

    const budgetsTable = byId("budgetsTable");
    if (budgetsTable && !budgetsTable.hasAttribute("data-bound")) {
      budgetsTable.setAttribute("data-bound", "true");
      on(budgetsTable, "click", (event) => {
        const target = event.target as HTMLElement | null;
        const button = target?.closest(
          "button[data-budget-action]"
        ) as HTMLButtonElement | null;
        if (!button) return;
        const action = button.getAttribute("data-budget-action");
        const encoded = button.getAttribute("data-budget-name");
        if (!action || !encoded) return;
        const name = decodeURIComponent(encoded);
        if (action === "edit") {
          const amount = config.budgets[name];
          if (budgetCategory) budgetCategory.value = name;
          if (budgetAmount) {
            budgetAmount.value = String(amount || "");
            budgetAmount.focus();
          }
          budgetForm.dataset.editingBudget = name;
          if (submitBtn) submitBtn.textContent = "Update";
        }
        if (action === "remove") {
          if (!confirm(`Remove budget for "${name}"?`)) return;
          delete config.budgets[name];
          saveConfig();
          renderAll();
        }
      });
    }

    renderBudgetsTable();
  }

  function bindLocation() {
    const countryInput = byId<HTMLInputElement>("locationCountry");
    const cityInput = byId<HTMLInputElement>("locationCity");
    const zipInput = byId<HTMLInputElement>("locationZip");
    const saveBtn = byId("btnSaveLocation");
    const note = byId("locationSavedNote");
    if (!countryInput || !cityInput || !zipInput || !saveBtn) return;
    if (!countryInput.value && !cityInput.value && !zipInput.value) {
      const loc = config.settings.location || {};
      countryInput.value = loc.country || "";
      cityInput.value = loc.city || "";
      zipInput.value = loc.zip || "";
    }
    on(saveBtn, "click", () => {
      config.settings.location = {
        country: countryInput.value.trim(),
        city: cityInput.value.trim(),
        zip: zipInput.value.trim(),
      };
      saveConfig();
      if (note) note.textContent = "Location saved.";
      markOnboardingComplete("location");
    });
  }

  function bindActionItems() {
    // Bind action buttons in dashboard
    const actionItems = document.querySelectorAll(
      "#actionItems .action-item button"
    );
    actionItems.forEach((btn) => {
      if (btn.hasAttribute("data-bound")) return;
      btn.setAttribute("data-bound", "true");
      on(btn as HTMLElement, "click", () => {
        const url = btn.getAttribute("data-drilldown-url");
        if (url) {
          window.open(url, "_blank");
          return;
        }
        const text = btn.textContent?.toLowerCase() || "";
        if (text.includes("create envelope")) {
          createEnvelope();
        } else if (text.includes("review")) {
          // Navigate to connect page to review subscriptions
          window.location.href = "/connect";
        } else if (text.includes("benchmark")) {
          // Scroll to rent benchmark section
          const rentSection = byId("rentBenchmarkTable")?.closest("section");
          if (rentSection) rentSection.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

    // Bind action buttons in cashflow page
    const cashflowActions = document.querySelectorAll(
      "#cashflowNarrative .action-item button"
    );
    cashflowActions.forEach((btn) => {
      if (btn.hasAttribute("data-bound")) return;
      btn.setAttribute("data-bound", "true");
      on(btn as HTMLElement, "click", () => {
        const text = btn.textContent?.toLowerCase() || "";
        if (text.includes("drill")) {
          // TODO: Implement drilldown
        } else if (text.includes("envelope")) {
          window.location.href = "/plan";
        } else if (text.includes("assign")) {
          window.location.href = "/plan";
        }
      });
    });
  }

  function bindDrilldownButtons() {
    const buttons = document.querySelectorAll<HTMLElement>("[data-drilldown]");
    buttons.forEach((btn) => {
      if (btn.hasAttribute("data-bound")) return;
      btn.setAttribute("data-bound", "true");
      on(btn, "click", () => {
        const type = btn.getAttribute("data-drilldown");
        const metric = btn.getAttribute("data-drilldown-metric") || "";
        const chart = btn.getAttribute("data-drilldown-chart") || "";
        const useCategory =
          btn.getAttribute("data-drilldown-uses-category") === "true";
        const explicitCategory = btn.getAttribute("data-drilldown-category");
        const category = useCategory
          ? explicitCategory || getActiveCategoryName()
          : null;
        if (type === "kpi") {
          openDrilldown({ source: "kpi", metric });
        } else if (type === "chart") {
          const view =
            chart === "mom"
              ? byId<HTMLInputElement>("momStacked")?.checked
                ? "categories"
                : "cashflow"
              : "";
          openDrilldown({ source: "chart", chart, category, view });
        }
      });
    });
  }

  function bindEnvelopes() {
    const contribForm = byId<HTMLFormElement>("envelopeContribForm");
    const toggleContribBtn = byId("btnToggleEnvelopeContrib");
    const cancelContribBtn = byId("btnCancelEnvelopeContrib");
    const contribWrap = byId("envelopeContribFormWrap");
    const editBtn = byId("btnEditEnvelope");

    on(toggleContribBtn, "click", () => {
      if (contribWrap) contribWrap.hidden = !contribWrap.hidden;
    });
    on(cancelContribBtn, "click", () => {
      if (contribWrap) contribWrap.hidden = true;
    });

    on(editBtn, "click", () => {
      const envelopeId = editBtn?.getAttribute("data-envelope-id");
      if (!envelopeId) return;
      const env = envelopes.find((e) => e.id === envelopeId);
      if (!env) return;
      editingEnvelopeId = envelopeId;
      setText("createEnvelopeTitle", "Edit envelope");
      setText("createEnvelopeSub", "Update the goal name or target.");
      const nameInput = byId<HTMLInputElement>("createEnvelopeName");
      const targetInput = byId<HTMLInputElement>("createEnvelopeTarget");
      if (nameInput) nameInput.value = env.name;
      if (targetInput) targetInput.value = String(env.targetAmount);
      toggleModal("createEnvelopeModal", true);
    });

    on(contribForm, "submit", async (e) => {
      e.preventDefault();
      const envelopeId = contribForm?.dataset.envelopeId;
      if (!envelopeId) return;
      const dateInput = byId<HTMLInputElement>("envelopeContribDate");
      const amountInput = byId<HTMLInputElement>("envelopeContribAmount");
      const noteInput = byId<HTMLInputElement>("envelopeContribNote");
      const fromAccount = byId<HTMLSelectElement>("envelopeFromAccount");
      const toAccount = byId<HTMLSelectElement>("envelopeToAccount");
      if (!dateInput?.value || !amountInput?.value) return;

      const row: EnvelopeContrib = {
        id: uid(),
        envelopeId,
        dateISO: dateInput.value,
        amount: Math.abs(Number(amountInput.value)),
        fromAccountId: fromAccount?.value,
        toAccountId: toAccount?.value,
        note: noteInput?.value,
        createdAt: Date.now(),
      };
      await store.put("envelopeContribs", row);
      envelopeContribs.unshift(row);
      renderAll();
      renderEnvelopeChart(envelopeId);
      renderEnvelopeContribTable(envelopeId);
      contribForm?.reset();
    });
  }

  function bindQuickAdd() {
    const addIncome = byId("qaAddIncome");
    const addExpense = byId("qaAddExpense");
    const addInvest = byId("qaAddInvest");

    on(addIncome, "click", async () => {
      const date = byId<HTMLInputElement>("qaIncomeDate")?.value;
      const source =
        byId<HTMLInputElement>("qaIncomeSource")?.value || "Income";
      const amount = Number(
        byId<HTMLInputElement>("qaIncomeAmount")?.value || 0
      );
      if (!date || !amount) return;
      const row: Income = {
        id: uid(),
        dateISO: date,
        amount: Math.abs(amount),
        source,
        createdAt: Date.now(),
      };
      await store.put("income", row);
      income.unshift(row);
      renderAll();
    });

    on(addExpense, "click", async () => {
      const date = byId<HTMLInputElement>("qaExpenseDate")?.value;
      const cat =
        byId<HTMLSelectElement>("qaExpenseCategory")?.value || "Uncategorized";
      const amount = Number(
        byId<HTMLInputElement>("qaExpenseAmount")?.value || 0
      );
      const desc = byId<HTMLInputElement>("qaExpenseDesc")?.value || "Expense";
      const account =
        byId<HTMLInputElement>("qaExpenseAccount")?.value || "Bank";
      if (!date || !amount) return;
      const row: Transaction = {
        id: uid(),
        dateISO: date,
        amount: -Math.abs(amount),
        type: "expense",
        categoryId: getCategoryIdByName(cat, "expense"),
        description: desc,
        account,
        sourceFile: "manual",
        createdAt: Date.now(),
        hash: hashRow([date, amount, desc, account]),
      };
      await store.put("transactions", row);
      transactions.unshift(row);
      renderAll();
    });

    on(addInvest, "click", async () => {
      const date = byId<HTMLInputElement>("qaInvestDate")?.value;
      const instrument =
        byId<HTMLSelectElement>("qaInvestInstrument")?.value || "Investment";
      const amount = Number(
        byId<HTMLInputElement>("qaInvestAmount")?.value || 0
      );
      if (!date || !amount) return;
      const row: Transaction = {
        id: uid(),
        dateISO: date,
        amount: -Math.abs(amount),
        type: "investment",
        categoryId: getCategoryIdByName("Investments", "investment"),
        description: instrument,
        account: "Investing",
        sourceFile: "manual",
        createdAt: Date.now(),
        hash: hashRow([date, amount, instrument, "Investing"]),
      };
      await store.put("transactions", row);
      transactions.unshift(row);
      renderAll();
    });
  }

  async function handleCsvFile(file: File) {
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    lastCsvHeaders = headers;
    lastCsvRows = rows;

    // Detect and show format settings
    detectAndDisplayFormats(headers, rows);

    renderMapping("mappingGrid", headers, [
      "date",
      "amount",
      "description",
      "category",
      "account",
      "currency",
      "type",
    ]);
    renderPreview("previewTable", headers, rows);
    const note = byId("txFileNote");
    if (note) note.textContent = `${file.name} - ${rows.length} rows`;
    // Show preview, format, and mapping panels
    const previewPanel = byId("previewPanel");
    if (previewPanel) previewPanel.hidden = false;
    const formatPanel = byId("formatPanel");
    if (formatPanel) formatPanel.hidden = false;
    const mappingPanel = byId("mappingPanel");
    if (mappingPanel) mappingPanel.hidden = false;
  }

  async function handleIncomeCsv(file: File) {
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    lastIncomeHeaders = headers;
    lastIncomeRows = rows;
    renderMapping("incomeMappingGrid", headers, ["date", "amount", "source"]);
    const wrap = byId("incomeMappingWrap");
    if (wrap) wrap.hidden = false;
    const note = byId("incomeFileNote");
    if (note) note.textContent = `${file.name} - ${rows.length} rows`;
  }

  function renderIncomePreview() {
    renderPreview(
      "incomeTable",
      lastIncomeHeaders,
      lastIncomeRows.slice(0, 20)
    );
  }

  async function importTransactions(
    headers: string[],
    rows: string[][],
    mapping: Mapping
  ) {
    const inferType =
      byId<HTMLInputElement>("inferTypeFromSign")?.checked ?? true;
    const doNotDedup =
      byId<HTMLInputElement>("doNotDeduplicate")?.checked ?? true;
    const existingHashes = new Set(transactions.map((t) => t.hash));
    const existingIncomeHashes = new Set(
      income.map((i) => hashRow([i.dateISO, i.amount, i.source]))
    );
    const imported: Transaction[] = [];
    const importedIncome: Income[] = [];
    const amountScan = rows.map((row) => {
      const record = mapRow(headers, row, mapping);
      return parseAmount(record.amount);
    });
    const hasNegativeAmounts = amountScan.some(
      (value) => Number.isFinite(value) && value < 0
    );
    const hasPositiveAmounts = amountScan.some(
      (value) => Number.isFinite(value) && value > 0
    );
    const treatPositiveAsExpense =
      inferType && !hasNegativeAmounts && hasPositiveAmounts;

    for (const row of rows) {
      const record = mapRow(headers, row, mapping);
      const dateISO = parseDate(record.date);
      const amountValue = parseAmount(record.amount);
      // Skip rows with invalid or missing dates/amounts (empty dates are skipped)
      if (!dateISO || Number.isNaN(amountValue)) continue;
      let type: TxType | null = normalizeType(record.type) as TxType | null;
      if (!type && inferType) {
        if (amountValue < 0) {
          type = "expense";
        } else if (treatPositiveAsExpense) {
          type =
            guessIncomeType(record.category, record.description) || "expense";
        } else {
          type = "income";
        }
      }
      if (!type) type = "expense";
      const description = record.description || "Transaction";
      const account = record.account || "Bank";
      const categoryName = (record.category || "Uncategorized").trim();
      const amount = normalizeAmount(amountValue, type);
      const hash = hashRow([dateISO, amount, description, account]);

      if (type === "income") {
        const incomeHash = hashRow([
          dateISO,
          Math.abs(amountValue),
          description,
        ]);
        const duplicate = existingIncomeHashes.has(incomeHash);
        if (duplicate && !doNotDedup) continue;
        existingIncomeHashes.add(incomeHash);
        importedIncome.push({
          id: uid(),
          dateISO,
          amount: Math.abs(amountValue),
          source: description,
          createdAt: Date.now(),
        });
      } else {
        const categoryId = getCategoryIdByName(categoryName, type);
        const duplicate = existingHashes.has(hash);
        if (duplicate && !doNotDedup) continue;
        existingHashes.add(hash);
        imported.push({
          id: uid(),
          dateISO,
          amount,
          type,
          categoryId,
          description,
          account,
          sourceFile: record.sourceFile || "import",
          createdAt: Date.now(),
          hash,
          isDuplicate: duplicate,
        });
      }
    }

    if (imported.length) {
      // Add new transactions to existing ones before storing
      const allTransactions = [...transactions, ...imported];
      await store.bulkPut("transactions", allTransactions);
    }
    if (importedIncome.length) {
      const allIncome = [...income, ...importedIncome];
      await store.bulkPut("income", allIncome);
    }
    if (imported.length || importedIncome.length) {
      // Reload all transactions from store to ensure consistency
      await loadAll();
    }
    renderAll();
    const result = byId("importResult");
    if (result) {
      const totalImported = imported.length + importedIncome.length;
      result.textContent =
        totalImported > 0
          ? `Imported ${totalImported} rows. Navigate to Dashboard to see them.`
          : "No transactions imported. Check your date/amount mapping.";
    }
    if ((transactions.length || income.length) && shouldExpandRange()) {
      renderAll();
    }
  }

  async function importIncome(
    headers: string[],
    rows: string[][],
    mapping: Mapping
  ) {
    const imported: Income[] = [];
    for (const row of rows) {
      const record = mapRow(headers, row, mapping);
      const dateISO = parseDate(record.date);
      // Handle amount parsing with currency stripping
      let amountStr = (record.amount || "").toString().trim();
      amountStr = amountStr
        .replace(/^[A-Z]{2,3}\$/i, "")
        .replace(/^\$/, "")
        .replace(/,/g, "")
        .trim();
      const amountValue = Number(amountStr);
      if (!dateISO || Number.isNaN(amountValue)) continue;
      imported.push({
        id: uid(),
        dateISO,
        amount: Math.abs(amountValue),
        source: record.source || "Income",
        createdAt: Date.now(),
      });
    }
    if (imported.length) {
      await store.bulkPut("income", imported);
      // Reload all income from store to ensure consistency
      await loadAll();
    }
    if ((transactions.length || income.length) && shouldExpandRange()) {
      renderAll();
    }
    renderAll();
    const result = byId("incomeImportResult");
    if (result)
      result.textContent = `Imported ${imported.length} income rows. Navigate to Dashboard to see them.`;
  }

  function renderAll() {
    if (isRendering) return;
    isRendering = true;
    const tooltip = document.getElementById("chartTooltip");
    if (tooltip) tooltip.style.display = "none";
    populateSelects();
    renderSummaryCards();
    renderBudgetList();
    renderExpensePie();
    renderMoMChart();
    renderTopTables();
    renderDailySpending();
    renderCashflowPreview();
    renderCashflowMap();
    renderCashflowExplain();
    renderCashflowNarrative();
    // PAUSED: Envelope features - not in MVP golden path
    // renderEnvelopes();
    // renderEnvelopeProjection();
    renderIncomeTable();
    renderInvestmentTable();
    renderAccountsTable();
    renderSubscriptionsTable();
    // PAUSED: Rent benchmark - not in MVP golden path
    // renderRentBenchmark();
    renderDataHealth();
    // PAUSED: Envelope onboarding - not in MVP golden path
    // renderEnvelopeOnboard();
    renderBudgetsTable();
    renderWhatChanged();
    // renderMilestones(); // TODO: Implement milestones rendering if needed
    renderActionItems().catch(err => console.error('Error rendering action items:', err));
    renderDrilldownPage();
    updateDrilldownButtons();
    updateOnboardingUI();
    isRendering = false;
  }

  function renderBudgetsTable() {
    const table = byId<HTMLTableElement>("budgetsTable");
    if (!table) return;
    const entries = Object.entries(config.budgets);
    if (!entries.length) {
      table.innerHTML = `<tr><td class="muted small">No budgets yet</td></tr>`;
      return;
    }
    const header = `
      <thead>
        <tr>
          <th>Category</th>
          <th>Monthly budget</th>
          <th class="table-actions-head">Actions</th>
        </tr>
      </thead>
    `;
    const body = entries
      .map(([cat, amount]) => {
        const encoded = encodeURIComponent(cat);
        return `
          <tr>
            <td>${escapeHtml(cat)}</td>
            <td>${escapeHtml(formatCurrency(amount))}</td>
            <td class="table-actions">
              <button class="btn btn-quiet btn-sm" type="button" data-budget-action="edit" data-budget-name="${encoded}">Edit</button>
              <button class="btn btn-quiet btn-sm" type="button" data-budget-action="remove" data-budget-name="${encoded}">Remove</button>
            </td>
          </tr>
        `;
      })
      .join("");
    table.innerHTML = `${header}<tbody>${body}</tbody>`;
    table
      .querySelectorAll<HTMLButtonElement>("button[data-budget-action]")
      .forEach((btn) => {
        if (btn.hasAttribute("data-bound")) return;
        btn.setAttribute("data-bound", "true");
        on(btn, "click", () => {
          const action = btn.getAttribute("data-budget-action");
          const encoded = btn.getAttribute("data-budget-name");
          if (!action || !encoded) return;
          const name = decodeURIComponent(encoded);
          const budgetForm = byId<HTMLFormElement>("budgetForm");
          const budgetCategory = byId<HTMLSelectElement>("budgetCategory");
          const budgetAmount = byId<HTMLInputElement>("budgetAmount");
          const submitBtn = budgetForm?.querySelector<HTMLButtonElement>(
            'button[type="submit"]'
          );
          if (action === "edit") {
            const amount = config.budgets[name];
            if (budgetCategory) budgetCategory.value = name;
            if (budgetAmount) {
              budgetAmount.value = String(amount || "");
              budgetAmount.focus();
            }
            if (budgetForm) budgetForm.dataset.editingBudget = name;
            if (submitBtn) submitBtn.textContent = "Update";
            return;
          }
          if (action === "remove") {
            if (!confirm(`Remove budget for "${name}"?`)) return;
            delete config.budgets[name];
            saveConfig();
            renderAll();
          }
        });
      });
  }

  function renderBudgetList() {
    const el = byId("budgetList");
    if (!el) return;
    const emptyEl = byId("budgetListEmpty");
    const entries = Object.entries(config.budgets).filter(
      ([, amount]) => amount > 0
    );
    if (!entries.length) {
      el.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    const range = getRange();
    const expenseRows = transactions.filter(
      (t) => t.type === "expense" && withinRange(t.dateISO, range)
    );
    const byCategory = groupByCategory(expenseRows);
    const rentBudget = buildRentBudgetByMonth(range, expenseRows);
    if (rentBudget.total) {
      byCategory[rentBudget.name] =
        (byCategory[rentBudget.name] || 0) + rentBudget.total;
    }
    const monthsInRange = listMonthsInRange(
      range,
      expenseRows.map((t) => t.dateISO),
      income.map((i) => i.dateISO)
    );
    const monthCount = monthsInRange.length || 1;
    const list = entries
      .map(([name, monthlyBudget]) => {
        const target = monthlyBudget * monthCount;
        const spent = byCategory[name] || 0;
        const ratio = target ? spent / target : 0;
        const progress = Math.min(100, Math.round(ratio * 100));
        const state = ratio >= 1 ? "is-over" : ratio >= 0.85 ? "is-warn" : "";
        return `
          <div class="budget-item ${state}">
            <div class="budget-item-head">
              <div>
                <div class="small muted">${escapeHtml(name)}</div>
                <div class="card-value">${formatCurrency(spent)}</div>
              </div>
              <div class="small muted">${formatCurrency(target)} target</div>
            </div>
            <div class="budget-bar"><div style="width:${progress}%"></div></div>
          </div>
        `;
      })
      .join("");
    el.innerHTML = `<div class="budget-list">${list}</div>`;
  }

  function renderSummaryCards() {
    const range = getRange();
    const totals = summarizeRange(range);
    const envelopeTotal = envelopeContribs
      .filter((c) => withinRange(c.dateISO, range))
      .reduce((sum, c) => sum + c.amount, 0);
    const unallocated = Math.max(
      0,
      totals.incomeTotal -
        totals.expenses -
        totals.investments -
        totals.transfers -
        envelopeTotal
    );
    setText("kpiSavingsRate", formatPercent(totals.savingsRate));
    setText(
      "kpiSavingsRateSub",
      `Net income: ${formatCurrency(totals.netIncome)}`
    );
    setText("kpiInvestedRate", formatPercent(totals.investedRate));
    setText(
      "kpiInvestedRateSub",
      `Invested: ${formatCurrency(totals.investments)}`
    );
    setText("kpiBurnRate", formatCurrency(totals.burnRate));
    setText("kpiBurnRateSub", "Avg monthly expenses");
    setText("kpiTotalIncome", formatCurrency(totals.incomeTotal));
    setText("kpiTotalIncomeSub", `In ${formatRangeLabel()}`);
    setText("kpiTotalExpenses", formatCurrency(totals.expenses));
    setText("kpiTotalExpensesSub", `In ${formatRangeLabel()}`);
    const budgetEntries = Object.entries(config.budgets).filter(
      ([, amount]) => amount > 0
    );
    if (budgetEntries.length) {
      const totalBudget = budgetEntries.reduce(
        (sum, [, amount]) => sum + amount,
        0
      );
      const budgetNames = budgetEntries.map(([name]) => name.toLowerCase());
      const spentBudget = transactions
        .filter((t) => t.type === "expense" && withinRange(t.dateISO, range))
        .reduce((sum, t) => {
          const name =
            config.categories
              .find((c) => c.id === t.categoryId)
              ?.name?.toLowerCase() || "";
          if (!budgetNames.includes(name)) return sum;
          return sum + Math.abs(t.amount);
        }, 0);
      const rentBudget = buildRentBudgetByMonth(
        range,
        transactions.filter((t) => withinRange(t.dateISO, range))
      );
      const rentBudgetSpend = budgetNames.includes(
        rentBudget.name.toLowerCase()
      )
        ? rentBudget.total
        : 0;
      const budgetMonths = listMonthsInRange(
        range,
        transactions.map((t) => t.dateISO),
        income.map((i) => i.dateISO)
      );
      const monthCount = budgetMonths.length || 1;
      const totalBudgetRange = totalBudget * monthCount;
      const totalSpent = spentBudget + rentBudgetSpend;
    } else {
    }
    setText(
      "kpiRunway",
      totals.runwayMonths ? `${totals.runwayMonths} mo` : "--"
    );
    setText("kpiRunwaySub", "Cash + liquid assets");
    setText("kpiNetWorth", formatCurrency(totals.netWorth));
    setText("kpiNetWorthSub", "Assets minus liabilities");
  }

  function renderExpensePie() {
    const el = byId("expensePie");
    if (!el) return;
    const emptyEl = byId("expensePieEmpty");
    const range = getRange();
    const rows = transactions.filter(
      (t) => t.type === "expense" && withinRange(t.dateISO, range)
    );
    const data = groupByCategory(rows);
    const rentBudget = buildRentBudgetByMonth(range, rows);
    if (rentBudget.total) {
      data[rentBudget.name] = (data[rentBudget.name] || 0) + rentBudget.total;
    }
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    if (!total) {
      el.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    renderPie(el, data, {
      onSliceClick: (label) => setDrilldownCategory(label),
    });
  }

  function renderMoMChart() {
    const el = byId("momChart");
    if (!el) return;
    const emptyEl = byId("momChartEmpty");
    const asPercent = byId<HTMLInputElement>("momAsPercent")?.checked ?? false;
    const showCategories =
      byId<HTMLInputElement>("momStacked")?.checked ?? true;
    const activeCategory = drilldownCategoryId
      ? config.categories.find((c) => c.id === drilldownCategoryId)
      : null;
    const range = getRange();
    const data = activeCategory
      ? monthlyCategoryTrendSeries(activeCategory, range)
      : showCategories
      ? monthlyCategorySeries(10, range)
      : monthlyCashflowSeries(range);
    const momSubtitle = byId("momSubtitle");
    if (!activeCategory && momSubtitle) {
      momSubtitle.textContent = showCategories
        ? `Expenses by category (${formatRangeLabel()})`
        : "Savings (green) = income - expenses - invested";
    }
    if (!data.series.length) {
      el.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    renderStackedBars(el, data.series, {
      categories: data.categories,
      asPercent,
      onSegmentClick: (category) => {
        if (!showCategories) return;
        const exists = config.categories.find(
          (c) => c.name.toLowerCase() === category.toLowerCase()
        );
        if (!exists) return;
        setDrilldownCategory(exists.name);
      },
    });
  }

  function renderTopTables() {
    renderTopCategoriesTable();
    renderTopMerchantsTable();
  }

  function renderWhatChanged() {
    const list = byId("whatChangedList");
    const emptyEl = byId("whatChangedEmpty");
    if (!list) return;

    const range = getRange();
    const month = range.to
      ? range.to.slice(0, 7)
      : new Date().toISOString().slice(0, 7);
    const prevMonth = (() => {
      const [year, mon] = month.split("-").map(Number);
      const date = new Date(year, mon - 2, 1);
      return date.toISOString().slice(0, 7);
    })();

    // Get spending for both months
    const currentSpend = categorySpendForMonth(month);
    const prevSpend = categorySpendForMonth(prevMonth);
    
    // Get income for both months
    const currentIncome = incomeForMonth(month);
    const prevIncome = incomeForMonth(prevMonth);
    
    // Get total expenses
    const currentTotal = Object.values(currentSpend).reduce((sum, val) => sum + val, 0);
    const prevTotal = Object.values(prevSpend).reduce((sum, val) => sum + val, 0);

    // Check if we have data for both months
    const hasCurrentData = currentTotal > 0 || currentIncome > 0;
    const hasPrevData = prevTotal > 0 || prevIncome > 0;

    if (!hasCurrentData || !hasPrevData) {
      list.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    const changes: Array<{
      category: string;
      current: number;
      previous: number;
      change: number;
      changePercent: number;
      type: 'expense' | 'income';
    }> = [];

    // Calculate category changes
    const allCategories = new Set([...Object.keys(currentSpend), ...Object.keys(prevSpend)]);
    for (const category of allCategories) {
      const current = currentSpend[category] || 0;
      const previous = prevSpend[category] || 0;
      if (current === 0 && previous === 0) continue;
      
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : (current > 0 ? 100 : 0);
      
      // Only show significant changes (>10% or >$50)
      if (Math.abs(change) > 50 || Math.abs(changePercent) > 10) {
        changes.push({
          category,
          current,
          previous,
          change,
          changePercent,
          type: 'expense'
        });
      }
    }

    // Add income change
    if (currentIncome > 0 || prevIncome > 0) {
      const incomeChange = currentIncome - prevIncome;
      const incomeChangePercent = prevIncome > 0 ? (incomeChange / prevIncome) * 100 : (currentIncome > 0 ? 100 : 0);
      changes.push({
        category: 'Income',
        current: currentIncome,
        previous: prevIncome,
        change: incomeChange,
        changePercent: incomeChangePercent,
        type: 'income'
      });
    }

    // Add total expenses change
    const totalChange = currentTotal - prevTotal;
    const totalChangePercent = prevTotal > 0 ? (totalChange / prevTotal) * 100 : (currentTotal > 0 ? 100 : 0);
    changes.push({
      category: 'Total Expenses',
      current: currentTotal,
      previous: prevTotal,
      change: totalChange,
      changePercent: totalChangePercent,
      type: 'expense'
    });

    // Sort by absolute change (largest first)
    changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    // Take top 5 changes
    const topChanges = changes.slice(0, 5);

    if (topChanges.length === 0) {
      list.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    list.innerHTML = topChanges
      .map((change) => {
        const isIncrease = change.change > 0;
        const isIncome = change.type === 'income';
        const arrow = isIncrease ? '↑' : '↓';
        const colorClass = isIncome 
          ? (isIncrease ? 'text-success' : 'text-danger')
          : (isIncrease ? 'text-danger' : 'text-success');
        const sign = isIncrease ? '+' : '';
        
        return `
          <div class="action-item">
            <div>
              <div class="action-title">
                ${escapeHtml(change.category)} 
                <span class="${colorClass}">
                  ${arrow} ${sign}${formatCurrency(Math.abs(change.change))} 
                  (${sign}${change.changePercent.toFixed(1)}%)
                </span>
              </div>
              <div class="action-sub">
                ${formatCurrency(change.current)} this month vs ${formatCurrency(change.previous)} last month
              </div>
            </div>
            <button class="btn btn-quiet" type="button" data-drilldown-url="${escapeHtml(
              buildDrilldownUrl({
                source: change.type === 'income' ? 'income' : 'category-spike',
                category: change.category
              })
            )}">
              View details
            </button>
          </div>
        `;
      })
      .join("");
  }

  function incomeForMonth(month: string): number {
    return income
      .filter((i) => i.dateISO.startsWith(month))
      .reduce((sum, i) => sum + i.amount, 0);
  }

  async function renderActionItems() {
    const list = byId("actionItems");
    const emptyEl = byId("actionItemsEmpty");
    if (!list) return;
    const range = getRange();
    const hasDataInRange =
      transactions.some((t) => withinRange(t.dateISO, range)) ||
      income.some((i) => withinRange(i.dateISO, range));
    if (!hasDataInRange) {
      list.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    const items: Array<{
      title: string;
      sub: string;
      url: string;
      label: string;
    }> = [];

    // MVP: Use deterministic insights engine (loaded dynamically to avoid circular deps)
    try {
      const month = range.to
        ? range.to.slice(0, 7)
        : new Date().toISOString().slice(0, 7);
      
      // Prepare transaction data for insights engine
      const txData = transactions.map(tx => ({
        id: tx.id,
        date: tx.dateISO,
        amount: tx.amount,
        description: tx.description,
        category: config.categories.find(c => c.id === tx.categoryId)?.name || 'Uncategorized',
        merchant: tx.description
      }))

      // Dynamic import to avoid circular dependencies
      const insightsModule = await import('./insightsEngine')
      const insights = insightsModule.generateInsights(txData, config.budgets || {}, month)

      // Add monthly delta insights
      for (const delta of insights.monthlyDelta.slice(0, 2)) {
        if (delta.change > 0) {
          items.push({
            title: `Spending increase: ${delta.category}`,
            sub: `${formatCurrency(delta.change)} (${delta.changePercent.toFixed(1)}%) higher than last month`,
            url: buildDrilldownUrl({
              source: "category-spike",
              category: delta.category,
            }),
            label: "View details",
          })
        }
      }

      // Add budget pace insights
      for (const pace of insights.budgetPace.slice(0, 1)) {
        if (pace.paceStatus === 'overspending') {
          items.push({
            title: `Budget alert: ${pace.category}`,
            sub: `Projected to overspend by ${formatCurrency(pace.projectedOverspend)} this month`,
            url: buildDrilldownUrl({
              source: "category-spike",
              category: pace.category,
            }),
            label: "View details",
          })
        }
      }

      // Add new recurring insights
      for (const recurring of insights.recurringNew.slice(0, 1)) {
        if (recurring.confidence === 'high') {
          items.push({
            title: `New subscription detected: ${recurring.merchant}`,
            sub: `${formatCurrency(recurring.monthlyAmount)}/month (${recurring.occurrenceCount} occurrences)`,
            url: buildDrilldownUrl({ source: "subscriptions" }),
            label: "Review",
          })
        }
      }
    } catch (error) {
      console.error('Error generating insights:', error)
      // Fallback to simple rules
    }

    // Fallback: Simple category spike detection
    const month = range.to
      ? range.to.slice(0, 7)
      : new Date().toISOString().slice(0, 7);
    const prevMonth = (() => {
      const [year, mon] = month.split("-").map(Number);
      const date = new Date(year, mon - 2, 1);
      return date.toISOString().slice(0, 7);
    })();
    const currentSpend = categorySpendForMonth(month);
    const prevSpend = categorySpendForMonth(prevMonth);
    const currentTop = topCategoryFromMap(currentSpend);
    if (currentTop && items.length < 3) {
      const prevValue = prevSpend[currentTop.name] || 0;
      if (prevValue > 0 && currentTop.value > prevValue * 1.25) {
        const diff = currentTop.value - prevValue;
        items.push({
          title: `Category spike: ${currentTop.name}`,
          sub: `${formatCurrency(diff)} higher than last month`,
          url: buildDrilldownUrl({
            source: "category-spike",
            category: currentTop.name,
          }),
          label: "View drilldown",
        });
      }
    }

    // Add subscriptions total
    const analysis = analyzeMerchants();
    const subTotal = analysis.subscriptions.reduce(
      (sum, row) => sum + row.monthly,
      0
    );
    if (subTotal > 0 && items.length < 3) {
      items.push({
        title: "Subscriptions total",
        sub: `${formatCurrency(subTotal)} per month across recurring merchants`,
        url: buildDrilldownUrl({ source: "subscriptions" }),
        label: "View drilldown",
      });
    }

    const limited = items.slice(0, 3);
    if (!limited.length) {
      list.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    list.innerHTML = limited
      .map(
        (item) => `
        <div class="action-item">
          <div>
            <div class="action-title">${escapeHtml(item.title)}</div>
            <div class="action-sub">${escapeHtml(item.sub)}</div>
          </div>
          <button class="btn btn-quiet" type="button" data-drilldown-url="${escapeHtml(
            item.url
          )}">
            ${escapeHtml(item.label)}
          </button>
        </div>
      `
      )
      .join("");
  }

  function renderDailySpending() {
    const el = byId("dailySpend");
    if (!el) return;
    const emptyEl = byId("dailySpendEmpty");
    const series = dailySeries(30, drilldownCategoryId);
    const total = series.reduce((sum, item) => sum + item.value, 0);
    if (!total) {
      el.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    renderLineChart(el, series);
  }

  function renderCashflowPreview() {
    const el = byId("cashflowPreview");
    if (!el) return;
    const emptyEl = byId("cashflowPreviewEmpty");
    const range = getRange();

    // Compute flow graph from local data (same as main map)
    const flowGraph = computeFlowGraphFromLocalData(range);

    // Show empty state if no data
    if (!flowGraph.nodes || flowGraph.nodes.length === 0) {
      el.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    // Render same Sankey diagram as main map (smaller size for preview)
    renderSankeyDiagram(el, flowGraph, true); // true = isPreview
  }

  function monthRange(month: string) {
    const [year, mon] = month.split("-").map(Number);
    const start = `${month}-01`;
    const endDate = new Date(year, mon, 0);
    const end = endDate.toISOString().slice(0, 10);
    return { from: start, to: end };
  }

  function categorySpendForMonth(month: string) {
    const range = monthRange(month);
    const rows = transactions.filter(
      (t) => t.type === "expense" && withinRange(t.dateISO, range)
    );
    const data = groupByCategory(rows);
    const rentBudget = buildRentBudgetByMonth(range, rows);
    if (rentBudget.total) {
      data[rentBudget.name] = (data[rentBudget.name] || 0) + rentBudget.total;
    }
    return data;
  }

  function topCategoryFromMap(data: Record<string, number>) {
    const entries = Object.entries(data);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return { name: entries[0][0], value: entries[0][1] };
  }

  function findEnvelopeBehindPace(month: string) {
    const range = monthRange(month);
    for (const env of envelopes) {
      if (!env.planMonthly || env.planMonthly <= 0) continue;
      const current = envelopeContribs
        .filter((c) => c.envelopeId === env.id && withinRange(c.dateISO, range))
        .reduce((sum, c) => sum + c.amount, 0);
      if (current + 0.01 < env.planMonthly) {
        return { id: env.id, name: env.name, current, target: env.planMonthly };
      }
    }
    return null;
  }

  function renderCashflowMap() {
    const el = byId("flowSankey");
    const emptyEl = byId("flowSankeyEmpty");
    const categoryListEl = byId("cashflowCategoryList");
    if (!el) return;
    const range = getRange();

    // Compute flow graph from local data
    const flowGraph = computeFlowGraphFromLocalData(range);

    // Show empty state if no data
    if (!flowGraph.nodes || flowGraph.nodes.length === 0) {
      el.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      if (categoryListEl) categoryListEl.innerHTML = "";
      renderTable("flowTopSinks", []);
      renderTable("flowTopSavings", []);
      renderTable("flowUnallocated", []);
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    // Render interactive Sankey diagram with responsive sizing
    renderSankeyDiagram(el, flowGraph);
    applyFlowExplainHighlights(el);

    // Render category list in details panel
    if (categoryListEl) {
      renderCategoryList(categoryListEl, flowGraph);
    }

    // Render supporting tables
    const topSinks = flowGraph.nodes
      .filter(
        (n: any) => n.type === "expense-category" || n.type === "merchant"
      )
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 5)
      .map((n: any) => [n.label, formatCurrency(n.amount)]);

    const topSavings = flowGraph.nodes
      .filter((n: any) => n.type === "envelope" || n.type === "investing")
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 5)
      .map((n: any) => [n.label, formatCurrency(n.amount)]);

    renderTable("flowTopSinks", topSinks);
    renderTable("flowTopSavings", topSavings);
    renderTable("flowUnallocated", []); // Unallocated is now part of savings
  }

  function renderCategoryList(
    container: HTMLElement,
    flowGraph: { nodes: any[]; edges: any[]; metadata: any }
  ) {
    const expenseCategoryNodes = flowGraph.nodes.filter(
      (n) => n.type === "expense-category"
    );
    const sortedCategories = [...expenseCategoryNodes].sort(
      (a, b) => b.amount - a.amount
    );
    const totalExpenses = flowGraph.metadata.totalExpenses || 0;

    if (sortedCategories.length === 0) {
      container.innerHTML =
        '<div class="muted small">No expense categories</div>';
      return;
    }

    // Category colors matching the chart
    const categoryColors = [
      "#ef6b6f",
      "#9b59b6",
      "#2fbf8a",
      "#3498db",
      "#e91e63",
      "#5b4c9a",
      "#ff6b35",
      "#95a5a6",
    ];

    const html = sortedCategories
      .map((category, index) => {
        const percentage =
          totalExpenses > 0
            ? ((category.amount / totalExpenses) * 100).toFixed(1)
            : "0";
        const color = categoryColors[index % categoryColors.length];
        return `
        <div class="category-list-item" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border, #e5e5e5);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
            <span style="font-size: 13px;">${escapeHtml(category.label)}</span>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600; font-size: 13px;">${formatCurrency(
              category.amount
            )}</div>
            <div style="font-size: 11px; color: var(--muted, #6a717a);">${percentage}%</div>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = html;
  }

  function computeFlowGraphFromLocalData(range: { from: string; to: string }) {
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeMap = new Map<string, any>();
    const edgeMap = new Map<string, any>();

    const displayCurrency = config.settings.currency || "USD";
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalSavings = 0;
    let totalTransfers = 0;

    // Process income
    const rangeIncome = income.filter((i) => withinRange(i.dateISO, range));
    rangeIncome.forEach((inc) => {
      const nodeId = `income:${inc.source || "other"}`;
      const label = inc.source || "Other Income";

      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, {
          id: nodeId,
          label,
          type: "income",
          amount: 0,
          currency: displayCurrency,
        });
      }
      nodeMap.get(nodeId).amount += inc.amount;
      totalIncome += inc.amount;
    });

    // Process transactions (expenses, transfers, investments)
    const rangeTransactions = transactions.filter((t) =>
      withinRange(t.dateISO, range)
    );
    rangeTransactions.forEach((tx) => {
      // Exclude split transactions and investment buy/sell
      if (tx.isDuplicate || tx.type === "investment") {
        // Skip investment transactions for now (they're handled separately)
        return;
      }

      if (tx.type === "expense") {
        const category = config.categories.find((c) => c.id === tx.categoryId);
        const categoryName = category?.name || "Uncategorized";
        const categoryNodeId = `expense-category:${categoryName}`;

        // Create/update category node
        if (!nodeMap.has(categoryNodeId)) {
          nodeMap.set(categoryNodeId, {
            id: categoryNodeId,
            label: categoryName,
            type: "expense-category",
            amount: 0,
            currency: displayCurrency,
          });
        }
        const expenseAmount = Math.abs(tx.amount);
        nodeMap.get(categoryNodeId).amount += expenseAmount;
        totalExpenses += expenseAmount;

        // Create edge from expenses aggregate to category (not from income directly)
        const expensesAggregateId = "expenses:all";
        const edgeKey = `${expensesAggregateId}:${categoryNodeId}`;
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            source: expensesAggregateId,
            target: categoryNodeId,
            amount: 0,
            currency: displayCurrency,
            transactionIds: [],
          });
        }
        edgeMap.get(edgeKey).amount += expenseAmount;
        edgeMap.get(edgeKey).transactionIds.push(tx.id);
      } else if (tx.type === "transfer") {
        // Transfers shown as category
        const nodeId = "transfer:all";
        if (!nodeMap.has(nodeId)) {
          nodeMap.set(nodeId, {
            id: nodeId,
            label: "Transfers",
            type: "transfer",
            amount: 0,
            currency: displayCurrency,
          });
        }
        const transferAmount = Math.abs(tx.amount);
        nodeMap.get(nodeId).amount += transferAmount;
        totalTransfers += transferAmount;

        // Create edge from income to transfer
        const incomeSourceId = `income:other`;
        const edgeKey = `${incomeSourceId}:${nodeId}`;
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            source: incomeSourceId,
            target: nodeId,
            amount: 0,
            currency: displayCurrency,
            transactionIds: [],
          });
        }
        edgeMap.get(edgeKey).amount += transferAmount;
        edgeMap.get(edgeKey).transactionIds.push(tx.id);
      }
    });

    // Process envelope contributions
    const envelopeTotal = envelopeContribs
      .filter((c) => withinRange(c.dateISO, range))
      .reduce((sum, c) => sum + c.amount, 0);

    if (envelopeTotal > 0) {
      const nodeId = "envelope:all";
      nodeMap.set(nodeId, {
        id: nodeId,
        label: "Envelopes",
        type: "envelope",
        amount: envelopeTotal,
        currency: displayCurrency,
      });
      totalSavings += envelopeTotal;

      // Create edge from income to envelopes
      const incomeSourceId = `income:other`;
      const edgeKey = `${incomeSourceId}:${nodeId}`;
      edgeMap.set(edgeKey, {
        source: incomeSourceId,
        target: nodeId,
        amount: envelopeTotal,
        currency: displayCurrency,
        transactionIds: [],
      });
    }

    // Calculate unallocated (will be merged into savings)
    const totalUnallocated = Math.max(
      0,
      totalIncome - totalExpenses - totalSavings - totalTransfers
    );

    // Create aggregated Expenses node
    if (totalExpenses > 0) {
      nodeMap.set("expenses:all", {
        id: "expenses:all",
        label: "Expenses",
        type: "expenses",
        amount: totalExpenses,
        currency: displayCurrency,
      });

      // Create edge from income to expenses aggregate
      const incomeSourceId = `income:other`;
      edges.push({
        source: incomeSourceId,
        target: "expenses:all",
        amount: totalExpenses,
        currency: displayCurrency,
        transactionIds: [],
      });
    }

    // Create aggregated Savings node (combining envelopes and unallocated)
    const totalSavingsCombined = totalSavings + totalUnallocated;
    if (totalSavingsCombined > 0) {
      nodeMap.set("savings:all", {
        id: "savings:all",
        label: "Savings",
        type: "savings",
        amount: totalSavingsCombined,
        currency: displayCurrency,
      });

      // Create edge from income to savings aggregate
      const incomeSourceId = `income:other`;
      edges.push({
        source: incomeSourceId,
        target: "savings:all",
        amount: totalSavingsCombined,
        currency: displayCurrency,
        transactionIds: [],
      });
    }

    // Convert maps to arrays
    nodes.push(...Array.from(nodeMap.values()));
    edges.push(...Array.from(edgeMap.values()));

    return {
      nodes,
      edges,
      metadata: {
        startDate: range.from,
        endDate: range.to,
        displayCurrency,
        fxRateDate: new Date().toISOString().split("T")[0],
        totalIncome,
        totalExpenses,
        totalSavings: totalSavingsCombined,
        totalUnallocated,
      },
    };
  }

  function getExplainParams() {
    if (typeof window === "undefined") return null;
    if (!window.location.pathname.startsWith("/cashflow")) return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get("explain") !== "1") return null;
    return {
      source: params.get("source") || "",
      metric: params.get("metric") || "",
      chart: params.get("chart") || "",
      category: params.get("category"),
      view: params.get("view") || "",
      envelopeId: params.get("envelope") || "",
      range: rangeFromParams(params),
    };
  }

  function explainKeysForParams(params: ReturnType<typeof getExplainParams>) {
    if (!params) return [];
    const keys: string[] = [];
    if (params.metric === "total-income") keys.push("income");
    if (params.metric === "total-expenses") keys.push("expenses");
    if (params.metric === "savings-rate")
      keys.push("savings", "envelopes", "investments", "unallocated");
    if (params.metric === "runway") keys.push("expenses");
    if (
      params.chart === "expense-pie" ||
      params.chart === "daily" ||
      params.chart === "mom"
    ) {
      if (params.category) keys.push(normalizeFlowKey(params.category));
      else keys.push("expenses");
    }
    if (params.source === "subscriptions")
      keys.push(normalizeFlowKey("Subscriptions"));
    if (params.source === "category-spike" && params.category)
      keys.push(normalizeFlowKey(params.category));
    if (params.source === "envelope") keys.push("envelopes");
    return keys;
  }

  function applyFlowExplainHighlights(container: HTMLElement) {
    const params = getExplainParams();
    if (!params) return;

    const keys = explainKeysForParams(params);
    const nodes = container.querySelectorAll<HTMLElement>("[data-flow-node]");
    nodes.forEach((node) => {
      const nodeId = node.getAttribute("data-flow-node") || "";
      const key = normalizeFlowKey(nodeId);
      const shouldHighlight =
        keys.includes(key) || keys.some((k) => nodeId.includes(k));
      node.classList.toggle("is-highlighted", shouldHighlight);

      // If this node should be highlighted, scroll it into view
      if (shouldHighlight) {
        setTimeout(() => {
          node.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }, 100);
      }
    });

    // If a specific node is requested, show its drilldown
    const highlightNode = params.metric || params.category;
    if (highlightNode) {
      const targetNode = Array.from(nodes).find((node) => {
        const nodeId = node.getAttribute("data-flow-node") || "";
        return (
          nodeId.includes(highlightNode) ||
          normalizeFlowKey(nodeId) === normalizeFlowKey(highlightNode)
        );
      });
      if (targetNode) {
        const nodeId = targetNode.getAttribute("data-flow-node");
        if (nodeId) {
          setTimeout(() => handleNodeClick(nodeId), 200);
        }
      }
    }
  }

  function renderCashflowNarrative() {
    const container = byId("cashflowNarrative");
    if (!container) return;

    const range = getRange();
    const flowGraph = computeFlowGraphFromLocalData(range);
    const { nodes, metadata } = flowGraph;

    if (metadata.totalIncome === 0) {
      container.innerHTML =
        '<div class="chart-empty">Add transactions to see cashflow insights.</div>';
      return;
    }

    // Top 3 expense categories for podium
    const topExpenses = nodes
      .filter((n: any) => n.type === "expense-category")
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 3);

    // Savings insights
    const savingsAggregate = nodes.find((n: any) => n.id === "savings:all");
    const savingsRate =
      metadata.totalIncome > 0
        ? ((savingsAggregate?.amount || 0) / metadata.totalIncome) * 100
        : 0;
    const expenseRate =
      metadata.totalIncome > 0
        ? (metadata.totalExpenses / metadata.totalIncome) * 100
        : 0;

    // Benchmark data (placeholder - would come from external source in production)
    const avgSavingsRate = 20; // Average savings rate for local population
    const avgExpenseRate = 80;
    const benchmarkComparison =
      savingsRate > avgSavingsRate
        ? "above"
        : savingsRate < avgSavingsRate
        ? "below"
        : "at";
    const benchmarkDiff = Math.abs(savingsRate - avgSavingsRate);

    let html =
      '<div style="display: flex; flex-direction: column; gap: 24px;">';

    // Podium for top 3 expenses
    if (topExpenses.length > 0) {
      html += `
        <div style="background: var(--card-bg, #fff); border-radius: 12px; padding: 20px;">
          <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Top Expenses</h3>
          <div style="display: flex; align-items: flex-end; justify-content: center; gap: 12px; height: 180px;">
            ${topExpenses
              .map((exp: any, idx: number) => {
                const height =
                  topExpenses[0].amount > 0
                    ? (exp.amount / topExpenses[0].amount) * 100
                    : 0;
                const positions = [1, 0, 2]; // 2nd, 1st, 3rd for visual podium
                const pos = positions[idx];
                const colors = ["#c0c0c0", "#ffd700", "#cd7f32"]; // Silver, Gold, Bronze
                const labels = ["2nd", "1st", "3rd"];
                return `
                <div style="display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 120px;">
                  <div style="
                    background: ${colors[pos]};
                    width: 100%;
                    height: ${height}%;
                    min-height: 40px;
                    border-radius: 8px 8px 0 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 14px;
                    position: relative;
                  ">
                    <div style="position: absolute; top: -24px; font-size: 12px; color: var(--text, #1f2933);">${
                      labels[pos]
                    }</div>
                    ${formatCurrency(exp.amount)}
                  </div>
                  <div style="margin-top: 8px; text-align: center;">
                    <div style="font-weight: 600; font-size: 13px;">${
                      exp.label
                    }</div>
                    <div style="font-size: 11px; color: var(--muted, #6a717a); margin-top: 2px;">
                      ${((exp.amount / metadata.totalIncome) * 100).toFixed(
                        1
                      )}% of income
                    </div>
                  </div>
                  <button class="btn btn-quiet" data-narrative-node="${
                    exp.id
                  }" type="button" style="margin-top: 8px; font-size: 11px;">
                    View details
                  </button>
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      `;
    }

    // Savings insights
    html += `
      <div style="background: var(--card-bg, #fff); border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Savings Insights</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <div style="font-size: 12px; color: var(--muted, #6a717a); margin-bottom: 4px;">Savings Rate</div>
            <div style="font-size: 24px; font-weight: 700; color: ${
              savingsRate >= avgSavingsRate ? "#2fbf8a" : "#ef6b6f"
            };">
              ${savingsRate.toFixed(1)}%
            </div>
            <div style="font-size: 11px; color: var(--muted, #6a717a); margin-top: 4px;">
              ${formatCurrency(savingsAggregate?.amount || 0)} saved
            </div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--muted, #6a717a); margin-bottom: 4px;">Expense Rate</div>
            <div style="font-size: 24px; font-weight: 700;">
              ${expenseRate.toFixed(1)}%
            </div>
            <div style="font-size: 11px; color: var(--muted, #6a717a); margin-top: 4px;">
              ${formatCurrency(metadata.totalExpenses)} spent
            </div>
          </div>
        </div>
      </div>
    `;

    // Benchmark comparison
    html += `
      <div style="background: var(--card-bg, #fff); border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Benchmark vs Local Average</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px;">Your Savings Rate</span>
              <span style="font-weight: 600; font-size: 13px;">${savingsRate.toFixed(
                1
              )}%</span>
            </div>
            <div style="height: 8px; background: var(--bg-secondary, #f5f5f5); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${Math.min(
                100,
                (savingsRate / avgSavingsRate) * 100
              )}%; background: ${
      savingsRate >= avgSavingsRate ? "#2fbf8a" : "#ef6b6f"
    };"></div>
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px;">Local Average</span>
              <span style="font-weight: 600; font-size: 13px;">${avgSavingsRate}%</span>
            </div>
            <div style="height: 8px; background: var(--bg-secondary, #f5f5f5); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: 100%; background: #6a717a;"></div>
            </div>
          </div>
          <div style="padding-top: 8px; border-top: 1px solid var(--border, #e5e5e5);">
            <div style="font-size: 12px; color: var(--muted, #6a717a);">
              You're <strong>${benchmarkComparison}</strong> the local average by ${benchmarkDiff.toFixed(
      1
    )} percentage points
            </div>
          </div>
        </div>
      </div>
    `;

    html += "</div>";
    container.innerHTML = html;

    // Add click handlers
    container
      .querySelectorAll<HTMLButtonElement>("[data-narrative-node]")
      .forEach((btn) => {
        const nodeId = btn.getAttribute("data-narrative-node");
        if (nodeId) {
          btn.addEventListener("click", () => handleNodeClick(nodeId));
        }
      });
  }

  function renderCashflowExplain() {
    const panel = byId("cashflowExplain");
    if (!panel) return;
    const params = getExplainParams();
    if (!params) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const titleEl = byId("cashflowExplainTitle");
    const subEl = byId("cashflowExplainSub");
    const rowsTable = byId("cashflowExplainTable");
    const emptyEl = byId("cashflowExplainEmpty");
    const savingsTable = byId("cashflowSavingsTable");
    const savingsWrap = byId("cashflowSavingsWrap");
    const runwayWrap = byId("cashflowRunwayWrap");
    const runwayChart = byId("runwayChart");
    const runwayEmpty = byId("runwayChartEmpty");

    const explainData = buildDrilldownData({
      source: params.source,
      metric: params.metric,
      chart: params.chart,
      category: params.category,
      view: params.view,
      envelopeId: params.envelopeId,
      range: params.range,
    });

    if (titleEl) titleEl.textContent = explainData.title;
    if (subEl) subEl.textContent = explainData.filters;

    if (!rowsTable) return;
    if (!explainData.rows.length) {
      rowsTable.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      renderDrilldownTable(rowsTable, explainData.rows);
    }

    const totals = summarizeRange(params.range);
    const envelopeTotal = envelopeContribs
      .filter((c) => withinRange(c.dateISO, params.range))
      .reduce((sum, c) => sum + c.amount, 0);
    const unallocated = Math.max(
      0,
      totals.incomeTotal -
        totals.expenses -
        totals.investments -
        totals.transfers -
        envelopeTotal
    );

    if (savingsWrap && savingsTable) {
      if (params.metric === "savings-rate") {
        savingsWrap.hidden = false;
        if (subEl) {
          const rate = summarizeRange(params.range).savingsRate;
          subEl.textContent = `${
            explainData.filters
          } · Savings rate ${formatPercent(rate)}`;
        }
        savingsTable.innerHTML = `
          <tr><td>Envelopes</td><td>${formatCurrency(envelopeTotal)}</td></tr>
          <tr><td>Investments</td><td>${formatCurrency(
            totals.investments
          )}</td></tr>
          <tr><td>Unallocated</td><td>${formatCurrency(unallocated)}</td></tr>
        `;
      } else {
        savingsWrap.hidden = true;
      }
    }

    if (runwayWrap && runwayChart && runwayEmpty) {
      if (params.metric === "runway") {
        runwayWrap.hidden = false;
        const series = runwaySeries(params.range, 24);
        if (!series.length) {
          runwayChart.innerHTML = "";
          runwayEmpty.hidden = false;
        } else {
          runwayEmpty.hidden = true;
          renderLineChart(runwayChart, series);
        }
      } else {
        runwayWrap.hidden = true;
      }
    }
  }

  function renderEnvelopes() {
    const grid = byId("envelopesGrid");
    if (!grid) return;
    grid.className = "envelope-grid";
    grid.innerHTML = "";
    if (!grid.hasAttribute("data-bound")) {
      grid.setAttribute("data-bound", "true");
      on(grid, "click", (event) => {
        const target = event.target as HTMLElement | null;
        const card = target?.closest(".envelope-card") as HTMLElement | null;
        if (!card) return;
        if (card.classList.contains("envelope-add")) {
          createEnvelope();
          return;
        }
        const envelopeId = card.getAttribute("data-envelope-id");
        if (envelopeId) openEnvelopeModal(envelopeId);
      });
    }
    const hero = byId("envelopesHero");
    const list = envelopes.slice(0, 8);
    if (hero) {
      if (!envelopes.length) {
        hero.innerHTML = "";
      } else {
        const totalSaved = envelopes.reduce(
          (sum, env) => sum + envelopeBalance(env.id),
          0
        );
        const totalTarget = envelopes.reduce(
          (sum, env) => sum + env.targetAmount,
          0
        );
        const percent = totalTarget
          ? Math.min(100, Math.round((totalSaved / totalTarget) * 100))
          : 0;
        hero.innerHTML = `
          <div class="envelopes-hero">
            <div class="panel envelope-hero-panel">
              <div class="panel-head">
                <div>
                  <div class="panel-title">Envelope progress</div>
                  <div class="panel-sub">Combined savings across all envelopes.</div>
                </div>
                <div class="ring ring-lg"><span>${percent}%</span></div>
              </div>
              <div class="panel-body">
                <div class="row">
                  <div>
                    <div class="small muted">Saved</div>
                    <div class="card-value">${formatCurrency(totalSaved)}</div>
                  </div>
                  <div>
                    <div class="small muted">Target</div>
                    <div class="card-value">${formatCurrency(totalTarget)}</div>
                  </div>
                  <div>
                    <div class="small muted">Active envelopes</div>
                    <div class="card-value">${envelopes.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }
    for (const env of list) {
      const balance = envelopeBalance(env.id);
      const percent = env.targetAmount
        ? Math.min(100, Math.round((balance / env.targetAmount) * 100))
        : 0;
      const card = document.createElement("button");
      card.className = "envelope-card";
      card.type = "button";
      card.setAttribute("data-envelope-id", env.id);
      card.innerHTML = `
        <div class="envelope-card-head">
          <div>
            <div class="envelope-card-title">${escapeHtml(env.name)}</div>
            <div class="envelope-card-sub">Target ${formatCurrency(
              env.targetAmount
            )}</div>
          </div>
          <div class="ring ring-md"><span>${percent}%</span></div>
        </div>
        <div class="envelope-card-foot">
          <div class="small muted">${formatCurrency(balance)} saved</div>
          <span class="badge"><span class="badge-dot"></span>ETA ${formatEta(
            env
          )}</span>
        </div>
      `;
      grid.appendChild(card);
    }

    const add = document.createElement("button");
    add.className = "envelope-card envelope-add";
    add.type = "button";
    add.innerHTML = `
      <div class="envelope-card-title">Create envelope</div>
      <div class="envelope-card-sub">Add a goal and track progress.</div>
    `;
    add.addEventListener("click", () => createEnvelope());
    grid.appendChild(add);
  }

  function renderEnvelopeProjection() {
    const el = byId("envelopeProjectionChart");
    if (!el) return;
    const emptyEl = byId("envelopeProjectionEmpty");
    const env = envelopes[0];
    if (!env) {
      el.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    const hasContribs = envelopeContribs.some((c) => c.envelopeId === env.id);
    if (!hasContribs) {
      el.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    const { planSeries, historicalSeries } = projectionSeries(env);
    if (!planSeries.length && !historicalSeries.length) {
      el.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    renderDualLineChart(el, planSeries, historicalSeries);
  }

  function renderIncomeTable() {
    const table = byId<HTMLTableElement>("incomeTable");
    if (!table) return;
    const combined = [
      ...income.map((row) => ({
        id: row.id,
        kind: "income",
        dateISO: row.dateISO,
        source: row.source,
        amount: row.amount,
      })),
      ...transactions
        .filter((t) => t.type === "income")
        .map((row) => ({
          id: row.id,
          kind: "transaction",
          dateISO: row.dateISO,
          source: row.description,
          amount: Math.abs(row.amount),
        })),
    ]
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
      .slice(0, 15);
    if (!combined.length) {
      table.innerHTML = `<tr><td class="muted small">No income yet</td></tr>`;
      return;
    }
    const header = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Source</th>
          <th>Amount</th>
          <th class="table-actions-head">Actions</th>
        </tr>
      </thead>
    `;
    const body = combined
      .map((row) => {
        return `
          <tr>
            <td>${escapeHtml(row.dateISO)}</td>
            <td>${escapeHtml(row.source)}</td>
            <td>${escapeHtml(formatCurrency(row.amount))}</td>
            <td class="table-actions">
              <button class="btn btn-quiet btn-sm" type="button" data-income-action="edit" data-income-id="${
                row.id
              }" data-income-kind="${row.kind}">Edit</button>
              <button class="btn btn-quiet btn-sm" type="button" data-income-action="remove" data-income-id="${
                row.id
              }" data-income-kind="${row.kind}">Remove</button>
            </td>
          </tr>
        `;
      })
      .join("");
    table.innerHTML = `${header}<tbody>${body}</tbody>`;
    table
      .querySelectorAll<HTMLButtonElement>("button[data-income-action]")
      .forEach((btn) => {
        if (btn.hasAttribute("data-bound")) return;
        btn.setAttribute("data-bound", "true");
        on(btn, "click", async () => {
          const action = btn.getAttribute("data-income-action");
          const id = btn.getAttribute("data-income-id");
          const kind = btn.getAttribute("data-income-kind");
          if (!action || !id || !kind) return;
          if (action === "remove") {
            if (!confirm("Remove this income entry?")) return;
            await store.remove(
              kind === "income" ? "income" : "transactions",
              id
            );
            await loadAll();
            renderAll();
            return;
          }
          if (action === "edit") {
            const current =
              kind === "income"
                ? income.find((row) => row.id === id)
                : transactions.find(
                    (row) => row.id === id && row.type === "income"
                  );
            if (!current) return;
            const currentAmount =
              kind === "income"
                ? (current as Income).amount
                : Math.abs((current as Transaction).amount);
            const dateISO = prompt("Date (YYYY-MM-DD):", current.dateISO);
            if (!dateISO) return;
            const source = prompt(
              "Source:",
              kind === "income"
                ? (current as Income).source
                : (current as Transaction).description
            );
            if (!source) return;
            const amountStr = prompt("Amount:", String(currentAmount));
            if (!amountStr) return;
            const amountValue = Number(amountStr);
            if (Number.isNaN(amountValue) || amountValue <= 0) return;
            if (kind === "income") {
              const row = current as Income;
              row.dateISO = dateISO;
              row.source = source;
              row.amount = amountValue;
              await store.put("income", row);
            } else {
              const row = current as Transaction;
              row.dateISO = dateISO;
              row.description = source;
              row.amount = Math.abs(amountValue);
              row.hash = hashRow([
                row.dateISO,
                row.amount,
                row.description,
                row.account,
              ]);
              await store.put("transactions", row);
            }
            await loadAll();
            renderAll();
          }
        });
      });
  }

  function bindIncomeTable() {}

  function renderInvestmentTable() {
    const inv = transactions
      .filter((t) => t.type === "investment")
      .slice(0, 12);
    renderTable(
      "investmentTable",
      inv.map((row) => [
        row.dateISO,
        row.description,
        formatCurrency(Math.abs(row.amount)),
      ])
    );
  }

  function renderAccountsTable() {
    const accountsTable = byId("accountsTable");
    const accountsConfirmTable = byId("accountsConfirmTable");

    if (!accountsTable && !accountsConfirmTable) return;

    // Create rows with edit/delete actions for connect page
    const connectTable = accountsConfirmTable;
    if (connectTable) {
      const rows: string[][] = [];
      for (const acc of config.settings.accounts) {
        rows.push([
          acc.name,
          acc.kind,
          acc.currency || config.settings.currency,
          acc.id,
        ]);
      }
      renderTableWithActions("accountsConfirmTable", rows, (row, accId) => {
        const editBtn = document.createElement("button");
        editBtn.className = "btn btn-quiet btn-sm";
        editBtn.textContent = "Edit";
        editBtn.type = "button";
        editBtn.onclick = () => {
          const acc = config.settings.accounts.find((a) => a.id === accId);
          if (!acc) return;
          editingAccountId = accId;
          const title = byId("createAccountTitle");
          const sub = byId("createAccountSub");
          const submit = byId<HTMLButtonElement>("createAccountSubmit");
          const nameInput = byId<HTMLInputElement>("createAccountName");
          const kindSelect = byId<HTMLSelectElement>("createAccountKind");
          if (title) title.textContent = "Edit account";
          if (sub) sub.textContent = "Update the name or type.";
          if (submit) submit.textContent = "Save";
          if (nameInput) nameInput.value = acc.name;
          if (kindSelect) kindSelect.value = acc.kind;
          toggleModal("createAccountModal", true);
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-quiet btn-sm";
        deleteBtn.textContent = "Delete";
        deleteBtn.type = "button";
        deleteBtn.onclick = () => {
          if (
            confirm(
              `Delete account "${
                config.settings.accounts.find((a) => a.id === accId)?.name
              }"?`
            )
          ) {
            config.settings.accounts = config.settings.accounts.filter(
              (a) => a.id !== accId
            );
            saveConfig();
            renderAll();
          }
        };

        const cell = document.createElement("td");
        cell.style.display = "flex";
        cell.style.gap = "8px";
        cell.appendChild(editBtn);
        cell.appendChild(deleteBtn);
        return cell;
      });
    }

    // Regular table for investing page
    if (accountsTable) {
      const rows = config.settings.accounts.map((acc) => [
        acc.name,
        acc.kind,
        acc.currency || config.settings.currency,
      ]);
      renderTable("accountsTable", rows);
    }
  }

  function renderTableWithActions(
    tableId: string,
    rows: string[][],
    actionCell: (row: string[], id: string) => HTMLElement
  ) {
    const table = byId<HTMLTableElement>(tableId);
    if (!table) return;

    table.innerHTML = "";
    if (rows.length === 0) {
      const row = table.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 4;
      cell.textContent = "No accounts yet";
      cell.className = "muted";
      return;
    }

    // Header
    const header = table.createTHead();
    const headerRow = header.insertRow();
    ["Name", "Type", "Currency", "Actions"].forEach((text, index) => {
      const th = document.createElement("th");
      th.textContent = text;
      if (index === 3) th.className = "table-actions-head";
      headerRow.appendChild(th);
    });

    // Body
    const tbody = table.createTBody();
    for (const row of rows) {
      const tr = tbody.insertRow();
      row.slice(0, 3).forEach((cellText) => {
        const td = tr.insertCell();
        td.textContent = cellText;
      });
      const actionTd = actionCell(row, row[3]);
      actionTd.classList.add("table-actions");
      tr.appendChild(actionTd);
    }
  }

  function renderSubscriptionsTable() {
    const analysis = analyzeMerchants();
    renderTable(
      "subscriptionsTable",
      analysis.subscriptions.map((row) => [
        row.merchant,
        formatCurrency(row.monthly),
        `${row.count} months`,
      ])
    );
    renderTable(
      "merchantReviewTable",
      analysis.merchants.map((row) => [
        row.merchant,
        formatCurrency(row.monthly),
        row.tag,
      ])
    );
  }

  function analyzeMerchants() {
    const expenseRows = transactions.filter((t) => t.type === "expense");
    const byMerchant = new Map<
      string,
      { dates: string[]; total: number; count: number }
    >();
    for (const row of expenseRows) {
      const merchant = normalizeMerchant(row.description || "Unknown");
      const entry = byMerchant.get(merchant) || {
        dates: [],
        total: 0,
        count: 0,
      };
      entry.dates.push(row.dateISO);
      entry.total += Math.abs(row.amount);
      entry.count += 1;
      byMerchant.set(merchant, entry);
    }
    const merchants = Array.from(byMerchant.entries()).map(
      ([merchant, data]) => {
        const months = new Set(data.dates.map((d) => d.slice(0, 7)));
        const monthly = data.total / Math.max(1, months.size);
        const isSubscription = isRecurring(data.dates);
        return {
          merchant,
          monthly,
          count: months.size,
          tag: isSubscription ? "Subscription" : "Review",
          isSubscription,
        };
      }
    );
    const subs = merchants
      .filter((m) => m.isSubscription)
      .sort((a, b) => b.monthly - a.monthly);
    const topMerchants = merchants
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 12);
    return { merchants: topMerchants, subscriptions: subs };
  }

  function normalizeMerchant(name: string) {
    const cleaned = name
      .toLowerCase()
      .replace(/\\d+/g, "")
      .replace(/[^a-z\\s]/g, "")
      .replace(/\\s+/g, " ")
      .trim();
    if (!cleaned) return "Unknown";
    const words = cleaned.split(" ").slice(0, 3).join(" ");
    return words.replace(/\\b\\w/g, (c) => c.toUpperCase());
  }

  function isRecurring(dates: string[]) {
    if (dates.length < 3) return false;
    const sorted = dates.slice().sort();
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = new Date(sorted[i - 1] + "T00:00:00").getTime();
      const next = new Date(sorted[i] + "T00:00:00").getTime();
      if (!Number.isNaN(prev) && !Number.isNaN(next)) {
        intervals.push(Math.round((next - prev) / (1000 * 60 * 60 * 24)));
      }
    }
    if (!intervals.length) return false;
    const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    return avg >= 25 && avg <= 40;
  }

  function renderRentBenchmark() {
    // Only count rent transactions within the current range being viewed
    const range = getRange();
    const rentRows = transactions.filter((t) => {
      if (t.type !== "expense") return false;
      if (
        !isCategory(t.categoryId, "Rent") &&
        !isCategory(t.categoryId, "Housing")
      )
        return false;
      return withinRange(t.dateISO, range);
    });

    // Sum unique rent amounts (in case multiple months exist, get monthly average)
    const uniqueAmounts = new Set(rentRows.map((t) => Math.abs(t.amount)));
    const monthlyRent =
      uniqueAmounts.size > 0 ? Array.from(uniqueAmounts)[0] : 0;

    // Count months in range that have rent
    const monthsWithRent = new Set(rentRows.map((t) => t.dateISO.slice(0, 7)));
    const totalRent = monthlyRent * monthsWithRent.size;

    // If rentMode is "off" (budget only) and no transactions, use budget amount for actual
    const actualRent =
      config.settings.rentMode === "off" &&
      totalRent === 0 &&
      config.settings.rentBudget
        ? config.settings.rentBudget
        : totalRent || config.settings.rentBudget || 0;
    const rows = [
      ["Actual rent", formatCurrency(actualRent)],
      ["Budget", formatCurrency(config.settings.rentBudget || 0)],
      ["Benchmark (city)", "TBD"],
    ];
    renderTable("rentBenchmarkTable", rows);
  }

  function renderDataHealth() {
    const flaggedDuplicates = transactions.filter((t) => t.isDuplicate).length;
    const duplicateCount =
      flaggedDuplicates || countDuplicateTransactions(transactions);
    const rows = [
      ["Duplicates", String(duplicateCount)],
      ["Missing currency", "0"],
      [
        "Uncategorized",
        String(
          transactions.filter((t) => isCategory(t.categoryId, "Uncategorized"))
            .length
        ),
      ],
    ];
    renderTable("dataHealthTable", rows);
  }

  function renderEnvelopeOnboard() {
    const rows = envelopes
      .slice(0, 3)
      .map((env) => [env.name, formatCurrency(envelopeBalance(env.id))]);
    renderTable("envelopeOnboardTable", rows);
  }

  function populateSelects() {
    const expenseCategories = config.categories.filter(
      (c) => c.type === "expense"
    );
    fillSelect(
      "qaExpenseCategory",
      expenseCategories.map((c) => c.name)
    );
    fillSelect(
      "budgetCategory",
      expenseCategories.map((c) => c.name)
    );
    fillSelect("qaInvestInstrument", ["ETF", "Stocks", "Crypto", "Custom..."]);
    const incomeSources = (
      config.settings.manualIncomeSources || [
        "Salary",
        "Freelance",
        "Investment",
        "Gift",
      ]
    ).slice();
    if (!incomeSources.includes("Custom...")) incomeSources.push("Custom...");
    fillSelect("manualIncomeSourceSelect", incomeSources);

    const accounts = config.settings.accounts.map((acc) => ({
      label: acc.name,
      value: acc.id,
    }));
    fillSelect(
      "envelopeFromAccount",
      accounts.map((a) => a.value),
      accounts.map((a) => a.label)
    );
    fillSelect(
      "envelopeToAccount",
      accounts.map((a) => a.value),
      accounts.map((a) => a.label)
    );
  }

  function fillSelect(id: string, values: string[], labels?: string[]) {
    const select = byId<HTMLSelectElement>(id);
    if (!select) return;

    // Check if select is already populated with same values to prevent infinite loops
    const existingValues = Array.from(select.options).map((opt) => opt.value);
    const valuesMatch =
      existingValues.length === values.length &&
      existingValues.every((val, idx) => val === values[idx]);

    if (valuesMatch && select.options.length > 0) {
      // Values already match, don't repopulate
      return;
    }

    const current = select.value;
    const wasOpen = document.activeElement === select;

    // Temporarily disable change events during population
    select.disabled = true;
    select.innerHTML = "";
    values.forEach((val, idx) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = labels?.[idx] || val;
      select.appendChild(opt);
    });
    if (current && values.includes(current)) {
      select.value = current;
    }
    select.disabled = false;
  }

  function createEnvelope() {
    editingEnvelopeId = null;
    setText("createEnvelopeTitle", "Create envelope");
    setText("createEnvelopeSub", "Set a goal and target amount.");
    const nameInput = byId<HTMLInputElement>("createEnvelopeName");
    const targetInput = byId<HTMLInputElement>("createEnvelopeTarget");
    if (nameInput) nameInput.value = "";
    if (targetInput) targetInput.value = "";
    toggleModal("createEnvelopeModal", true);
  }

  function openEnvelopeModal(envelopeId: string) {
    const env = envelopes.find((e) => e.id === envelopeId);
    if (!env) return;
    setText("envelopeModalTitle", env.name);
    setText("envelopeModalSub", `Target ${formatCurrency(env.targetAmount)}`);
    const editBtn = byId("btnEditEnvelope");
    if (editBtn) editBtn.setAttribute("data-envelope-id", envelopeId);
    const form = byId<HTMLFormElement>("envelopeContribForm");
    if (form) form.dataset.envelopeId = envelopeId;
    const contribWrap = byId("envelopeContribFormWrap");
    if (contribWrap) contribWrap.hidden = false;
    const dateInput = byId<HTMLInputElement>("envelopeContribDate");
    if (dateInput && !dateInput.value) dateInput.value = toISO(new Date());
    renderEnvelopeChart(envelopeId);
    renderEnvelopeContribTable(envelopeId);
    toggleModal("envelopeModal", true);
  }

  function renderEnvelopeChart(envelopeId: string) {
    const el = byId("envelopeChart");
    if (!el) return;
    const series = envelopeSeries(envelopeId);
    const emptyEl = byId("envelopeChartEmpty");
    if (!series.length) {
      el.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    renderLineChart(el, series);
  }

  function renderEnvelopeContribTable(envelopeId: string) {
    const rows = envelopeContribs
      .filter((c) => c.envelopeId === envelopeId)
      .slice(0, 10)
      .map((c) => [c.dateISO, formatCurrency(c.amount), c.note || ""]);
    renderTable("envelopeContribTable", rows);
  }

  function toggleNav() {
    config.settings.navCollapsed = !config.settings.navCollapsed;
    saveConfig();
    applyNavCollapsed();
  }

  function toggleModal(id: string, open: boolean) {
    const modal = byId(id);
    if (!modal) return;
    modal.hidden = !open;
    if (open) {
      on(modal, "click", (e) => {
        const target = e.target as HTMLElement;
        if (target?.dataset?.close !== undefined) {
          modal.hidden = true;
        }
      });
    }
  }

  function exportSummaryCsv() {
    const totals = summarizeRange(getRange());
    const rows = [
      ["Metric", "Value"],
      ["Savings rate", formatPercent(totals.savingsRate)],
      ["Net income", formatCurrency(totals.netIncome)],
      ["Invested %", formatPercent(totals.investedRate)],
      ["Burn rate", formatCurrency(totals.burnRate)],
      ["Net worth", formatCurrency(totals.netWorth)],
    ];
    downloadCsv("summary.csv", rows);
  }

  function getRange() {
    const preset = config.settings.defaultRangePreset || "month";
    const now = new Date();
    if (preset === "custom") {
      const custom = readCustomRange();
      if (custom?.from && custom?.to) {
        return { from: custom.from, to: custom.to };
      }
    }
    if (preset === "all")
      return { from: null as string | null, to: null as string | null };
    if (preset === "ytd") {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: toISO(from), to: toISO(now) };
    }
    if (preset === "quarter") {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const from = new Date(now.getFullYear(), quarterStartMonth, 1);
      return { from: toISO(from), to: toISO(now) };
    }
    if (preset === "12m") {
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return { from: toISO(from), to: toISO(now) };
    }
    const monthStart = config.settings.monthStartDay || 1;
    const startMonthOffset = now.getDate() < monthStart ? -1 : 0;
    const from = new Date(
      now.getFullYear(),
      now.getMonth() + startMonthOffset,
      monthStart
    );
    return { from: toISO(from), to: toISO(now) };
  }

  function readCustomRange() {
    const raw = localStorage.getItem("budgetsimple:range");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { from?: string; to?: string };
    } catch {
      return null;
    }
  }

  function shouldExpandRange() {
    return false;
  }

  function getRentCategoryName() {
    const rent = config.categories.find((c) => c.name.toLowerCase() === "rent");
    if (rent) return rent.name;
    const housing = config.categories.find(
      (c) => c.name.toLowerCase() === "housing"
    );
    if (housing) return housing.name;
    return "Rent";
  }

  function buildRentBudgetByMonth(
    range: { from: string | null; to: string | null },
    rows: Transaction[]
  ) {
    if (config.settings.rentMode !== "off" || !config.settings.rentBudget) {
      return {
        name: getRentCategoryName(),
        byMonth: {} as Record<string, number>,
        total: 0,
      };
    }
    const rentName = getRentCategoryName();
    const rentMonths = new Set(
      rows
        .filter(
          (t) =>
            t.type === "expense" &&
            (isCategory(t.categoryId, "Rent") ||
              isCategory(t.categoryId, "Housing"))
        )
        .map((t) => t.dateISO.slice(0, 7))
    );
    const monthsInRange = listMonthsInRange(
      range,
      rows.map((t) => t.dateISO)
    );
    const byMonth: Record<string, number> = {};
    monthsInRange.forEach((month) => {
      if (!rentMonths.has(month)) {
        byMonth[month] = config.settings.rentBudget || 0;
      }
    });
    const total = Object.values(byMonth).reduce((sum, value) => sum + value, 0);
    return { name: rentName, byMonth, total };
  }

  function summarizeRange(range: { from: string | null; to: string | null }) {
    const inRange = transactions.filter((t) => withinRange(t.dateISO, range));
    let expenses = inRange
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const rentBudget = buildRentBudgetByMonth(range, inRange);
    const rentBudgetMonths = Object.keys(rentBudget.byMonth).length;
    if (rentBudget.total) {
      expenses += rentBudget.total;
    }
    const investments = inRange
      .filter((t) => t.type === "investment")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const transfers = inRange
      .filter((t) => t.type === "transfer")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const incomeTotal =
      income
        .filter((i) => withinRange(i.dateISO, range))
        .reduce((s, i) => s + i.amount, 0) +
      inRange
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    const netIncome = incomeTotal - expenses;
    const savingsRate = incomeTotal ? netIncome / incomeTotal : 0;
    const investedRate = incomeTotal ? investments / incomeTotal : 0;
    const burnRate = avgMonthlyExpense(range, inRange, rentBudgetMonths);
    const netWorth = computeNetWorth();
    const unallocated = Math.max(
      0,
      incomeTotal - expenses - investments - transfers
    );
    const byCategory = groupByCategory(
      inRange.filter((t) => t.type === "expense")
    );
    if (rentBudget.total) {
      byCategory[rentBudget.name] =
        (byCategory[rentBudget.name] || 0) + rentBudget.total;
    }

    // Calculate runway months (months of expenses that can be covered by net worth)
    const runwayMonths =
      burnRate > 0 && netWorth > 0 ? Math.floor(netWorth / burnRate) : null;

    return {
      expenses,
      investments,
      transfers,
      incomeTotal,
      netIncome,
      savingsRate,
      investedRate,
      burnRate,
      netWorth,
      unallocated,
      byCategory,
      runwayMonths,
    };
  }

  function monthlyCashflowSeries(range: {
    from: string | null;
    to: string | null;
  }) {
    const buckets: Record<
      string,
      { income: number; expense: number; invest: number }
    > = {};
    const txRows = transactions.filter((row) =>
      withinRange(row.dateISO, range)
    );
    for (const row of txRows) {
      const key = row.dateISO.slice(0, 7);
      if (!buckets[key]) buckets[key] = { income: 0, expense: 0, invest: 0 };
      if (row.type === "expense") buckets[key].expense += Math.abs(row.amount);
      if (row.type === "investment")
        buckets[key].invest += Math.abs(row.amount);
      if (row.type === "income") buckets[key].income += Math.abs(row.amount);
    }
    for (const row of income.filter((i) => withinRange(i.dateISO, range))) {
      const key = row.dateISO.slice(0, 7);
      if (!buckets[key]) buckets[key] = { income: 0, expense: 0, invest: 0 };
      buckets[key].income += row.amount;
    }
    const rentBudget = buildRentBudgetByMonth(range, txRows);
    Object.entries(rentBudget.byMonth).forEach(([month, value]) => {
      if (!buckets[month])
        buckets[month] = { income: 0, expense: 0, invest: 0 };
      buckets[month].expense += value;
    });
    const rentMonthDates = Object.keys(rentBudget.byMonth).map(
      (month) => `${month}-01`
    );
    const months = listMonthsInRange(
      range,
      txRows.map((t) => t.dateISO),
      income.map((i) => i.dateISO),
      rentMonthDates
    );
    const series = months.map((key) => ({
      label: key,
      values: [
        buckets[key]?.expense || 0,
        buckets[key]?.invest || 0,
        Math.max(
          0,
          (buckets[key]?.income || 0) -
            (buckets[key]?.expense || 0) -
            (buckets[key]?.invest || 0)
        ),
      ],
      total: buckets[key]?.income || 0,
    }));
    return { series, categories: ["Expenses", "Investments", "Savings"] };
  }

  function monthlyCategorySeries(
    limit: number,
    range: { from: string | null; to: string | null }
  ) {
    const expenses = transactions.filter(
      (t) => t.type === "expense" && withinRange(t.dateISO, range)
    );
    const rentBudget = buildRentBudgetByMonth(range, expenses);
    if (!expenses.length && !rentBudget.total)
      return { series: [], categories: [] };
    const rentMonthDates = Object.keys(rentBudget.byMonth).map(
      (month) => `${month}-01`
    );
    const months = listMonthsInRange(
      range,
      expenses.map((t) => t.dateISO),
      rentMonthDates
    );
    const monthSet = new Set(months);
    const byCategoryTotals = groupByCategory(
      expenses.filter((t) => monthSet.has(t.dateISO.slice(0, 7)))
    );
    if (rentBudget.total) {
      byCategoryTotals[rentBudget.name] =
        (byCategoryTotals[rentBudget.name] || 0) + rentBudget.total;
    }
    const ranked = Object.entries(byCategoryTotals).sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, Math.max(1, limit)).map(([name]) => name);
    const categories = ranked.length > limit ? [...top, "Other"] : top;
    const categorySet = new Set(top);

    const incomeByMonth = buildIncomeByMonth(range);

    const series = months.map((month) => {
      const values = categories.map(() => 0);
      let other = 0;
      for (const row of expenses) {
        if (row.dateISO.slice(0, 7) !== month) continue;
        const name =
          config.categories.find((c) => c.id === row.categoryId)?.name ||
          "Uncategorized";
        if (categorySet.has(name)) {
          const idx = categories.indexOf(name);
          values[idx] += Math.abs(row.amount);
        } else if (categories.includes("Other")) {
          other += Math.abs(row.amount);
        }
      }
      const rentValue = rentBudget.byMonth[month] || 0;
      if (rentValue) {
        if (categorySet.has(rentBudget.name)) {
          values[categories.indexOf(rentBudget.name)] += rentValue;
        } else if (categories.includes("Other")) {
          other += rentValue;
        }
      }
      if (categories.includes("Other")) {
        values[categories.indexOf("Other")] = other;
      }
      return { label: month, values, total: incomeByMonth[month] || 0 };
    });
    return { series, categories };
  }

  function monthlyCategoryTrendSeries(
    category: Category,
    range: { from: string | null; to: string | null }
  ) {
    const expenses = transactions.filter(
      (t) =>
        t.type === "expense" &&
        t.categoryId === category.id &&
        withinRange(t.dateISO, range)
    );
    const rentBudget =
      category.name.toLowerCase() === getRentCategoryName().toLowerCase()
        ? buildRentBudgetByMonth(
            range,
            transactions.filter(
              (t) => t.type === "expense" && withinRange(t.dateISO, range)
            )
          )
        : { name: category.name, byMonth: {}, total: 0 };
    if (!expenses.length && !rentBudget.total)
      return { series: [], categories: [] };
    const rentMonthDates = Object.keys(rentBudget.byMonth).map(
      (month) => `${month}-01`
    );
    const months = listMonthsInRange(
      range,
      expenses.map((t) => t.dateISO),
      rentMonthDates
    );
    const incomeByMonth = buildIncomeByMonth(range);
    const series = months.map((month) => {
      const total =
        expenses
          .filter((t) => t.dateISO.slice(0, 7) === month)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0) +
        (rentBudget.byMonth[month] || 0);
      return {
        label: month,
        values: [total],
        total: incomeByMonth[month] || 0,
      };
    });
    return { series, categories: [category.name] };
  }

  function buildIncomeByMonth(range: {
    from: string | null;
    to: string | null;
  }) {
    const incomeByMonth: Record<string, number> = {};
    for (const row of income.filter((i) => withinRange(i.dateISO, range))) {
      const key = row.dateISO.slice(0, 7);
      incomeByMonth[key] = (incomeByMonth[key] || 0) + row.amount;
    }
    for (const row of transactions.filter(
      (t) => t.type === "income" && withinRange(t.dateISO, range)
    )) {
      const key = row.dateISO.slice(0, 7);
      incomeByMonth[key] = (incomeByMonth[key] || 0) + Math.abs(row.amount);
    }
    return incomeByMonth;
  }

  function listMonthsInRange(
    range: { from: string | null; to: string | null },
    ...dateLists: string[][]
  ) {
    const dates = dateLists.flat();
    if (!dates.length && !range.from && !range.to) return [];
    const sorted = dates.slice().sort();
    const minDate = range.from || sorted[0];
    const maxDate = range.to || sorted[sorted.length - 1] || toISO(new Date());
    if (!minDate || !maxDate) return [];
    const start = new Date(minDate);
    const end = new Date(maxDate);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    const months: string[] = [];
    while (cursor <= endMonth) {
      months.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(
          2,
          "0"
        )}`
      );
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }

  function dailySeries(days: number, categoryId?: string | null) {
    const now = new Date();
    const series: { label: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(now.getTime());
      d.setDate(now.getDate() - i);
      const key = toISO(d);
      const total = transactions
        .filter(
          (t) =>
            t.type === "expense" &&
            t.dateISO === key &&
            (!categoryId || t.categoryId === categoryId)
        )
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      series.push({ label: key, value: total });
    }
    return series;
  }

  function runwaySeries(
    range: { from: string | null; to: string | null },
    months: number
  ) {
    const totals = summarizeRange(range);
    if (!totals.netWorth || !totals.burnRate) return [];
    const series: { label: string; value: number }[] = [];
    const start = new Date();
    for (let i = 0; i <= months; i += 1) {
      const remaining = Math.max(0, totals.netWorth - totals.burnRate * i);
      const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const label = date.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      });
      series.push({ label, value: remaining });
    }
    return series;
  }

  function envelopeSeries(envelopeId: string) {
    const rows = envelopeContribs
      .filter((c) => c.envelopeId === envelopeId)
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    let sum = 0;
    return rows.map((row) => {
      sum += row.amount;
      return { label: row.dateISO, value: sum };
    });
  }

  function projectionSeries(env: Envelope) {
    const current = envelopeBalance(env.id);
    const planMonthly = env.planMonthly || recommendMonthly(env);
    const historicalMonthly = historicalMonthlyAvg(env.id);
    const planSeries = buildProjectionSeries(
      current,
      env.targetAmount,
      planMonthly,
      env.targetDateISO
    );
    const historicalSeries = buildProjectionSeries(
      current,
      env.targetAmount,
      historicalMonthly,
      env.targetDateISO
    );
    return { planSeries, historicalSeries };
  }

  function buildProjectionSeries(
    current: number,
    target: number,
    monthly: number,
    targetDateISO?: string
  ) {
    if (!monthly || monthly <= 0) return [];
    const series: { label: string; value: number }[] = [];
    let value = current;
    const start = new Date();
    const totalMonths = targetDateISO
      ? monthsBetween(start, new Date(targetDateISO))
      : 12;
    const steps = Math.max(6, Math.min(36, totalMonths));
    for (let i = 0; i <= steps; i += 1) {
      value = Math.min(target, current + monthly * i);
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      series.push({
        label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}`,
        value,
      });
    }
    return series;
  }

  function envelopeBalance(envelopeId: string) {
    return envelopeContribs
      .filter((c) => c.envelopeId === envelopeId)
      .reduce((s, c) => s + c.amount, 0);
  }

  function historicalMonthlyAvg(envelopeId: string) {
    const rows = envelopeContribs.filter((c) => c.envelopeId === envelopeId);
    if (!rows.length) return 0;
    const months = new Set(rows.map((r) => r.dateISO.slice(0, 7))).size;
    return rows.reduce((s, r) => s + r.amount, 0) / Math.max(1, months);
  }

  function recommendMonthly(env: Envelope) {
    const current = envelopeBalance(env.id);
    const remaining = Math.max(0, env.targetAmount - current);
    const months = env.targetDateISO
      ? monthsBetween(new Date(), new Date(env.targetDateISO))
      : 12;
    return months ? remaining / months : 0;
  }

  function formatEta(env: Envelope) {
    const monthly = historicalMonthlyAvg(env.id);
    if (!monthly) return "--";
    const current = envelopeBalance(env.id);
    const remaining = Math.max(0, env.targetAmount - current);
    const months = Math.ceil(remaining / monthly);
    if (!months || months === Infinity) return "--";
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function detectSubscriptions() {
    const expenses = transactions.filter((t) => {
      // Exclude rent and housing from subscriptions
      const cat = config.categories.find((c) => c.id === t.categoryId);
      const catName = cat?.name?.toLowerCase() || "";
      if (catName === "rent" || catName === "housing") return false;
      return t.type === "expense";
    });
    const byMerchant: Record<string, Transaction[]> = {};
    for (const row of expenses) {
      const key = row.description.toLowerCase().trim();
      // Also exclude transactions explicitly named "rent"
      if (key === "rent") continue;
      if (!byMerchant[key]) byMerchant[key] = [];
      byMerchant[key].push(row);
    }
    const result = [];
    for (const [merchant, rows] of Object.entries(byMerchant)) {
      if (rows.length < 2) continue;
      const total = rows.reduce((s, r) => s + Math.abs(r.amount), 0);
      const monthly = total / rows.length;
      result.push({ merchant, monthly, count: rows.length });
    }
    return result.slice(0, 6);
  }

  function renderTopCategoriesTable() {
    const table = byId("topCategoriesTable");
    if (!table) return;
    const range = getRange();
    const rows = topCategoriesDetailed(8, range);
    if (!rows.length) {
      table.innerHTML = `<tr><td class="muted small">No data yet</td></tr>`;
      return;
    }
    table.innerHTML = `
      <thead>
        <tr>
          <th>Category</th>
          <th>Amount</th>
          <th>% of expenses</th>
          <th class="table-actions-head">Score</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(formatCurrency(row.value))}</td>
            <td>${escapeHtml(formatPercent(row.percent))}</td>
            <td class="table-actions">${row.score}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    `;
  }

  function renderTopMerchantsTable() {
    const table = byId("topMerchantsTable");
    if (!table) return;
    const range = getRange();
    const rows = topMerchantsDetailed(8, range);
    if (!rows.length) {
      table.innerHTML = `<tr><td class="muted small">No data yet</td></tr>`;
      return;
    }
    table.innerHTML = `
      <thead>
        <tr>
          <th>Merchant</th>
          <th>Amount</th>
          <th>% of expenses</th>
          <th class="table-actions-head">Score</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(formatCurrency(row.value))}</td>
            <td>${escapeHtml(formatPercent(row.percent))}</td>
            <td class="table-actions">${row.score}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    `;
  }

  function topCategoriesDetailed(
    limit: number,
    range: { from: string | null; to: string | null }
  ) {
    const rows = transactions.filter(
      (t) => t.type === "expense" && withinRange(t.dateISO, range)
    );
    const byCat = groupByCategory(rows);
    const rentBudget = buildRentBudgetByMonth(range, rows);
    if (rentBudget.total) {
      byCat[rentBudget.name] = (byCat[rentBudget.name] || 0) + rentBudget.total;
    }
    const total = summarizeRange(range).expenses || 1;
    const monthCount =
      listMonthsInRange(
        range,
        rows.map((t) => t.dateISO)
      ).length || 1;
    return Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, value]) => {
        const budget = budgetForCategory(name, monthCount);
        const benchmark = benchmarkForCategory(name, monthCount);
        const score = computeScore(value, budget ?? benchmark);
        return { name, value, percent: value / total, score };
      });
  }

  function topMerchantsDetailed(
    limit: number,
    range: { from: string | null; to: string | null }
  ) {
    const rows = transactions.filter(
      (t) => t.type === "expense" && withinRange(t.dateISO, range)
    );
    const byMerchant: Record<string, { value: number; category: string }> = {};
    for (const row of rows) {
      const key = row.description;
      const category =
        config.categories.find((c) => c.id === row.categoryId)?.name ||
        "Uncategorized";
      if (!byMerchant[key]) {
        byMerchant[key] = { value: 0, category };
      }
      byMerchant[key].value += Math.abs(row.amount);
    }
    const total = summarizeRange(range).expenses || 1;
    const monthCount =
      listMonthsInRange(
        range,
        rows.map((t) => t.dateISO)
      ).length || 1;
    return Object.entries(byMerchant)
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, limit)
      .map(([name, data]) => {
        const budget = budgetForCategory(data.category, monthCount);
        const benchmark = benchmarkForCategory(data.category, monthCount);
        const score = computeScore(data.value, budget ?? benchmark);
        return { name, value: data.value, percent: data.value / total, score };
      });
  }

  function budgetForCategory(categoryName: string, monthCount: number) {
    const match = Object.entries(config.budgets).find(
      ([name]) => name.toLowerCase() === categoryName.toLowerCase()
    );
    if (!match) return null;
    const amount = match[1] || 0;
    return amount * Math.max(1, monthCount);
  }

  function benchmarkForCategory(categoryName: string, monthCount: number) {
    const baseBenchmarks: Record<string, number> = {
      Rent: 1400,
      Housing: 1400,
      Groceries: 420,
      "Eating out": 220,
      Transportation: 160,
      Subscription: 80,
      Subscriptions: 80,
      Entertainment: 120,
      Coffee: 60,
      "Self Care": 90,
      Clothing: 120,
      "Alcohol/going out": 110,
    };
    const base = baseBenchmarks[categoryName] ?? 200;
    const loc = config.settings.location || {};
    const country = (loc.country || "").toLowerCase();
    let multiplier = 1;
    if (country.includes("canada") || country === "ca") multiplier = 1.1;
    if (country.includes("france") || country === "fr") multiplier = 0.95;
    if (
      country.includes("usa") ||
      country.includes("united states") ||
      country === "us"
    )
      multiplier = 1;
    return base * multiplier * Math.max(1, monthCount);
  }

  function computeScore(value: number, target: number | null) {
    if (!target || target <= 0) return 50;
    if (value <= target) return 100;
    const ratio = value / target;
    const over = Math.min(2, ratio);
    const score = Math.max(0, Math.round(100 - (over - 1) * 100));
    return score;
  }

  function topCategoriesSimple(
    limit: number,
    range: { from: string | null; to: string | null }
  ) {
    return topCategoriesDetailed(limit, range).map((row) => [
      row.name,
      formatCurrency(row.value),
    ]);
  }

  function topSavings(limit: number) {
    const items: [string, number][] = [];
    for (const env of envelopes) {
      items.push([env.name, envelopeBalance(env.id)]);
    }
    return items
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, value]) => [name, formatCurrency(value)]);
  }

  function avgMonthlyExpense(
    range?: { from: string | null; to: string | null },
    inRange?: Transaction[],
    rentBudgetMonths = 0
  ) {
    const rows = inRange ?? transactions;
    const expenseRows = rows.filter((t) => t.type === "expense");
    const months = new Set(expenseRows.map((t) => t.dateISO.slice(0, 7)));
    const rangeMonths = range
      ? listMonthsInRange(
          range,
          expenseRows.map((t) => t.dateISO)
        )
      : [];
    let total = expenseRows.reduce((s, t) => s + Math.abs(t.amount), 0);
    if (rentBudgetMonths > 0 && config.settings.rentBudget) {
      total += config.settings.rentBudget * rentBudgetMonths;
    }
    const monthCount =
      rangeMonths.length || months.size || Math.max(1, rentBudgetMonths);
    return monthCount ? total / monthCount : 0;
  }

  function computeNetWorth() {
    return config.settings.netWorthManual || 0;
  }

  function groupByCategory(rows: Transaction[]) {
    const map: Record<string, number> = {};
    for (const row of rows) {
      const cat =
        config.categories.find((c) => c.id === row.categoryId)?.name ||
        "Uncategorized";
      map[cat] = (map[cat] || 0) + Math.abs(row.amount);
    }
    return map;
  }

  function buildCategoryBreakdown(
    byCategory: Record<string, number>,
    limit: number
  ) {
    const entries = Object.entries(byCategory)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);
    if (entries.length <= limit) return entries;
    const trimmed = entries.slice(0, Math.max(1, limit - 1));
    const otherValue = entries
      .slice(trimmed.length)
      .reduce((sum, [, value]) => sum + value, 0);
    return [...trimmed, ["Other", otherValue]];
  }

  function renderTable(id: string, rows: Array<(string | number)[]>) {
    const table = byId(id);
    if (!table) return;
    if (!rows.length) {
      table.innerHTML = `<tr><td class="muted small">No data yet</td></tr>`;
      return;
    }
    const html = rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${escapeHtml(String(cell))}</td>`)
            .join("")}</tr>`
      )
      .join("");
    table.innerHTML = html;
  }

  function renderDrilldownPage() {
    const table = byId("drilldownTable");
    if (!table) return;
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source") || "kpi";
    const metric = params.get("metric") || "";
    const chart = params.get("chart") || "";
    const category = params.get("category");
    const view = params.get("view") || "";
    const envelopeId = params.get("envelope") || "";
    const range = rangeFromParams(params);
    const titleEl = byId("drilldownTitle");
    const totalEl = byId("drilldownTotal");
    const filterEl = byId("drilldownFilters");
    const emptyEl = byId("drilldownEmpty");

    const result = buildDrilldownData({
      source,
      metric,
      chart,
      category,
      view,
      envelopeId,
      range,
    });
    if (titleEl) titleEl.textContent = result.title;
    if (totalEl) totalEl.textContent = result.totalLabel;
    if (filterEl) filterEl.textContent = result.filters;

    if (!result.rows.length) {
      table.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    renderDrilldownTable(table, result.rows);
  }

  function renderDrilldownTable(
    table: HTMLElement,
    rows: Array<Record<string, string | number>>
  ) {
    const head = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th>Type</th>
          <th class="table-actions-head">Amount</th>
        </tr>
      </thead>
    `;
    const body = rows
      .map(
        (row) => `
        <tr>
          <td>${escapeHtml(String(row.date || ""))}</td>
          <td>${escapeHtml(String(row.description || ""))}</td>
          <td>${escapeHtml(String(row.category || ""))}</td>
          <td>${escapeHtml(String(row.type || ""))}</td>
          <td class="table-actions">${escapeHtml(String(row.amount || ""))}</td>
        </tr>`
      )
      .join("");
    table.innerHTML = head + body;
  }

  function rangeFromParams(params: URLSearchParams) {
    const from = params.get("from");
    const to = params.get("to");
    if (from && to) {
      return { from, to };
    }
    return getRange();
  }

  function buildDrilldownUrl(options: {
    source: string;
    metric?: string;
    chart?: string;
    category?: string | null;
    view?: string;
    envelopeId?: string;
  }) {
    const params = new URLSearchParams();
    const preset = config.settings.defaultRangePreset || "month";
    const range = getRange();
    params.set("preset", preset);
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    params.set("explain", "1");
    params.set("source", options.source);
    if (options.metric) params.set("metric", options.metric);
    if (options.chart) params.set("chart", options.chart);
    if (options.category) params.set("category", options.category);
    if (options.view) params.set("view", options.view);
    if (options.envelopeId) params.set("envelope", options.envelopeId);
    return `/cashflow?${params.toString()}`;
  }

  function openDrilldown(options: {
    source: string;
    metric?: string;
    chart?: string;
    category?: string | null;
    view?: string;
    envelopeId?: string;
  }) {
    const url = buildDrilldownUrl(options);
    window.open(url, "_blank");
  }

  function buildDrilldownData(options: {
    source: string;
    metric: string;
    chart: string;
    category: string | null;
    view: string;
    envelopeId: string;
    range: { from: string | null; to: string | null };
  }) {
    const { source, metric, chart, category, view, envelopeId, range } =
      options;
    const rows: Array<Record<string, string | number>> = [];
    const totals = summarizeRange(range);
    let title = "Drilldown";
    let totalLabel = "--";
    let filters = `Range: ${formatRangeLabel()}`;

    if (source === "kpi") {
      if (metric === "total-expenses") {
        title = "Total expenses drilldown";
        totalLabel = formatCurrency(totals.expenses);
        filters = `Range: ${formatRangeLabel()} · Expenses`;
        rows.push(...expenseRows(range));
      } else if (metric === "total-income") {
        title = "Total income drilldown";
        totalLabel = formatCurrency(totals.incomeTotal);
        filters = `Range: ${formatRangeLabel()} · Income`;
        rows.push(...incomeRows(range));
      } else if (metric === "savings-rate") {
        title = "Savings rate drilldown";
        totalLabel = formatPercent(totals.savingsRate);
        filters = `Range: ${formatRangeLabel()} · Income - Expenses`;
        rows.push(...incomeRows(range), ...expenseRows(range));
      } else if (metric === "invested-rate") {
        title = "Invested rate drilldown";
        totalLabel = formatPercent(totals.investedRate);
        filters = `Range: ${formatRangeLabel()} · Investments`;
        rows.push(...investmentRows(range));
      } else if (metric === "runway") {
        title = "Runway drilldown";
        totalLabel = totals.runwayMonths ? `${totals.runwayMonths} mo` : "--";
        filters = `Range: ${formatRangeLabel()} · Net worth / burn rate`;
        rows.push(
          {
            date: "",
            description: "Net worth (manual)",
            category: "",
            type: "summary",
            amount: formatCurrency(totals.netWorth),
          },
          {
            date: "",
            description: "Burn rate (avg monthly expenses)",
            category: "",
            type: "summary",
            amount: formatCurrency(totals.burnRate),
          },
          ...expenseRows(range)
        );
      } else if (metric === "net-worth") {
        title = "Net worth drilldown";
        totalLabel = formatCurrency(totals.netWorth);
        filters = "Manual net worth setting";
        rows.push({
          date: "",
          description: "Manual net worth",
          category: "",
          type: "summary",
          amount: formatCurrency(totals.netWorth),
        });
      }
    }

    if (source === "chart") {
      if (chart === "expense-pie") {
        title = category ? `Category: ${category}` : "Expenses by category";
        filters = `Range: ${formatRangeLabel()} · Expenses`;
        rows.push(...expenseRows(range, category));
        totalLabel = formatCurrency(sumRowAmounts(rows));
      }
      if (chart === "mom") {
        title = category ? `MoM: ${category}` : "Month over month";
        filters = `Range: ${formatRangeLabel()} · ${
          view === "cashflow" ? "Cashflow" : "Expenses"
        }`;
        if (view === "cashflow") {
          rows.push(
            ...incomeRows(range),
            ...expenseRows(range),
            ...investmentRows(range)
          );
        } else {
          rows.push(...expenseRows(range, category));
        }
        totalLabel = formatCurrency(sumRowAmounts(rows));
      }
      if (chart === "daily") {
        title = category ? `Daily spending: ${category}` : "Daily spending";
        filters = `Range: ${formatRangeLabel()} · Expenses`;
        rows.push(...expenseRows(range, category));
        totalLabel = formatCurrency(sumRowAmounts(rows));
      }
    }

    if (source === "subscriptions") {
      title = "Subscriptions drilldown";
      filters = "Recurring merchants detected";
      const subs = analyzeMerchants().subscriptions.map((s) =>
        s.merchant.toLowerCase()
      );
      rows.push(
        ...transactions
          .filter(
            (t) =>
              t.type === "expense" &&
              subs.includes(
                normalizeMerchant(t.description || "").toLowerCase()
              )
          )
          .map((t) => toRow(t))
      );
      totalLabel = formatCurrency(sumRowAmounts(rows));
    }

    if (source === "category-spike" && category) {
      title = `Category spike: ${category}`;
      filters = `Range: ${formatRangeLabel()} · Expenses`;
      rows.push(...expenseRows(range, category));
      totalLabel = formatCurrency(sumRowAmounts(rows));
    }

    if (source === "envelope" && envelopeId) {
      const env = envelopes.find((e) => e.id === envelopeId);
      title = env ? `Envelope: ${env.name}` : "Envelope drilldown";
      filters = "Envelope contributions";
      rows.push(
        ...envelopeContribs
          .filter(
            (c) => c.envelopeId === envelopeId && withinRange(c.dateISO, range)
          )
          .map((c) => ({
            date: formatFullDate(c.dateISO),
            description: c.note || "Contribution",
            category: "",
            type: "envelope",
            amount: formatCurrency(c.amount),
          }))
      );
      totalLabel = formatCurrency(
        envelopeContribs
          .filter(
            (c) => c.envelopeId === envelopeId && withinRange(c.dateISO, range)
          )
          .reduce((s, c) => s + c.amount, 0)
      );
    }

    return { title, totalLabel, filters, rows };
  }

  function toRow(tx: Transaction) {
    const category =
      config.categories.find((c) => c.id === tx.categoryId)?.name ||
      "Uncategorized";
    const amountValue = Math.abs(tx.amount);
    return {
      date: formatFullDate(tx.dateISO),
      description: tx.description,
      category,
      type: tx.type,
      amount: formatCurrency(amountValue),
      amountValue,
    };
  }

  function incomeRows(range: { from: string | null; to: string | null }) {
    const rows: Array<Record<string, string | number>> = [];
    income
      .filter((i) => withinRange(i.dateISO, range))
      .forEach((i) => {
        rows.push({
          date: formatFullDate(i.dateISO),
          description: i.source || "Income",
          category: "Income",
          type: "income",
          amount: formatCurrency(i.amount),
          amountValue: i.amount,
        });
      });
    transactions
      .filter((t) => t.type === "income" && withinRange(t.dateISO, range))
      .forEach((t) => rows.push(toRow(t)));
    return rows;
  }

  function expenseRows(
    range: { from: string | null; to: string | null },
    category?: string | null
  ) {
    const rows = transactions
      .filter((t) => t.type === "expense" && withinRange(t.dateISO, range))
      .filter((t) => {
        if (!category) return true;
        const name =
          config.categories.find((c) => c.id === t.categoryId)?.name || "";
        return name.toLowerCase() === category.toLowerCase();
      })
      .map((t) => toRow(t));
    const rentBudget = buildRentBudgetByMonth(
      range,
      transactions.filter((t) => withinRange(t.dateISO, range))
    );
    if (!category || rentBudget.name.toLowerCase() === category.toLowerCase()) {
      Object.entries(rentBudget.byMonth).forEach(([month, value]) => {
        rows.push({
          date: formatFullDate(`${month}-01`),
          description: "Rent budget (no transaction)",
          category: rentBudget.name,
          type: "budget",
          amount: formatCurrency(value),
          amountValue: value,
        });
      });
    }
    return rows;
  }

  function investmentRows(range: { from: string | null; to: string | null }) {
    return transactions
      .filter((t) => t.type === "investment" && withinRange(t.dateISO, range))
      .map((t) => toRow(t));
  }

  function sumRowAmounts(rows: Array<Record<string, string | number>>) {
    return rows.reduce((sum, row) => {
      const amountValue =
        typeof row.amountValue === "number" ? row.amountValue : null;
      if (amountValue !== null) return sum + amountValue;
      const numeric = Number(String(row.amount || "").replace(/[^0-9.-]/g, ""));
      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }, 0);
  }

  function renderPreview(id: string, headers: string[], rows: string[][]) {
    const table = byId(id);
    if (!table) return;
    if (!rows.length) {
      table.innerHTML = `<tr><td class="muted small">No preview</td></tr>`;
      return;
    }
    const head = `<tr>${headers
      .map((h) => `<th>${escapeHtml(h)}</th>`)
      .join("")}</tr>`;
    const body = rows
      .slice(0, 50)
      .map(
        (row) =>
          `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`
      )
      .join("");
    table.innerHTML = head + body;
  }

  function renderMapping(id: string, headers: string[], fields: string[]) {
    const grid = byId(id);
    if (!grid) return;
    grid.innerHTML = "";
    for (const field of fields) {
      const row = document.createElement("div");
      row.className = "map-row";
      row.innerHTML = `
        <div class="map-title">${field}</div>
        <div class="map-controls">
          <select class="select" data-map="${field}">
            <option value="">(none)</option>
            ${headers
              .map(
                (h) =>
                  `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`
              )
              .join("")}
          </select>
          <input class="input" type="text" placeholder="Fixed value" data-fixed="${field}">
        </div>
      `;
      grid.appendChild(row);
      const select = row.querySelector("select") as HTMLSelectElement | null;
      if (select) {
        select.value = guessMapping(field, headers);
      }
    }
  }

  function readMapping(id: string): Mapping {
    const grid = byId(id);
    if (!grid) return {};
    const mapping: Mapping = {};
    grid.querySelectorAll("select[data-map]").forEach((select) => {
      const key = (select as HTMLSelectElement).dataset.map || "";
      const value = (select as HTMLSelectElement).value;
      // Only add to mapping if value is not empty (i.e., not "(none)")
      // This ensures empty mappings don't interfere with fallback logic
      if (key && value && value.trim()) {
        mapping[key] = { column: value.trim() };
      }
    });
    grid.querySelectorAll("input[data-fixed]").forEach((input) => {
      const key = (input as HTMLInputElement).dataset.fixed || "";
      const value = (input as HTMLInputElement).value;
      if (key && value && value.trim()) {
        mapping[key] = { column: null, fixed: value.trim() };
      }
    });
    return mapping;
  }

  function mapRow(headers: string[], row: string[], mapping: Mapping) {
    const record: Record<string, string> = {};
    // Process explicit mappings first - only use non-null/non-empty column mappings
    for (const key of Object.keys(mapping)) {
      const entry = mapping[key];
      if (entry.fixed) {
        record[key] = entry.fixed;
      } else if (entry.column && entry.column.trim()) {
        // Only use the mapping if column is actually set (not empty/null)
        const idx = headers.indexOf(entry.column);
        record[key] = idx >= 0 ? row[idx] : "";
      }
      // If column is null or empty, don't set record[key] - let fallback handle it
    }

    // Smart fallback: if date/amount aren't mapped, auto-detect from headers
    // This handles cases where mapping selects are empty, null, or not set
    if (
      !record.date ||
      (typeof record.date === "string" && !record.date.trim())
    ) {
      // Try to find date column by name first (most reliable)
      const dateIdx = headers.findIndex((h) =>
        /date|posted|transaction.date/i.test(h)
      );
      if (
        dateIdx >= 0 &&
        row[dateIdx] &&
        typeof row[dateIdx] === "string" &&
        row[dateIdx].trim()
      ) {
        record.date = row[dateIdx].trim();
      } else if (row[0] && typeof row[0] === "string" && row[0].trim()) {
        // Last resort: use first column (common convention)
        record.date = row[0].trim();
      }
    }
    if (
      !record.amount ||
      (typeof record.amount === "string" && !record.amount.trim())
    ) {
      // Try to find amount column by name first (most reliable) - including French names
      const amountIdx = headers.findIndex((h) => {
        const lower = h
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return /amount|amt|value|price|cost|coût|montant/i.test(lower);
      });
      if (
        amountIdx >= 0 &&
        row[amountIdx] &&
        typeof row[amountIdx] === "string" &&
        row[amountIdx].trim()
      ) {
        record.amount = row[amountIdx].trim();
      } else {
        // Try common positions for amount (skip first column which is usually description)
        for (let i = 1; i < Math.min(row.length, 4); i++) {
          const val = row[i];
          if (val && typeof val === "string") {
            const trimmed = val.trim();
            // Check if it looks like a number (with or without currency prefix)
            const numStr = trimmed
              .replace(/^[A-Z]{2,3}\$/i, "")
              .replace(/^\$/, "")
              .replace(/,/g, "");
            if (numStr && !isNaN(Number(numStr)) && Number(numStr) !== 0) {
              record.amount = trimmed;
              break;
            }
          }
        }
      }
    }
    return record;
  }

  function renderPie(
    container: HTMLElement,
    data: Record<string, number>,
    options: { onSliceClick?: (label: string) => void } = {}
  ) {
    const entries = Object.entries(data);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    if (!total) {
      container.innerHTML = "";
      return;
    }

    // Create tooltip element
    const tooltip = ensureChartTooltip();

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const { width, height } = getChartSize(container, 240, 240);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.cssText = "max-width: 100%; height: 100%;";
    let start = 0;
    const radius = Math.min(width, height) * 0.44;
    const cx = width / 2;
    const cy = height / 2;
    entries.forEach(([label, value], idx) => {
      const slice = (value / total) * 360;
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", describeArc(cx, cy, radius, start, start + slice));
      path.setAttribute("fill", colorFor(label, idx));
      path.style.cursor = "pointer";
      if (options.onSliceClick) {
        path.addEventListener("click", () => options.onSliceClick?.(label));
      }

      // Add hover tooltip with percentage of total expense
      const percentage = ((value / total) * 100).toFixed(1);
      path.addEventListener("mouseenter", (e) => {
        if (!tooltip) return;
        const mouseEvent = e as MouseEvent;
        tooltip.style.display = "block";
        tooltip.innerHTML = `<div style="font-weight: 600;">${escapeHtml(
          label
        )}</div><div>${formatCurrency(
          value
        )}</div><div style="font-size: 11px; color: #666; margin-top: 2px;">${percentage}% of total expenses</div>`;
        tooltip.style.left = `${mouseEvent.pageX + 10}px`;
        tooltip.style.top = `${mouseEvent.pageY + 10}px`;
      });
      path.addEventListener("mousemove", (e) => {
        if (!tooltip) return;
        const mouseEvent = e as MouseEvent;
        tooltip.style.left = `${mouseEvent.pageX + 10}px`;
        tooltip.style.top = `${mouseEvent.pageY + 10}px`;
      });
      path.addEventListener("mouseleave", () => {
        if (!tooltip) return;
        tooltip.style.display = "none";
      });

      svg.appendChild(path);
      start += slice;
    });
    container.innerHTML = "";
    container.appendChild(svg);
  }

  function renderStackedBars(
    container: HTMLElement,
    series: { label: string; values: number[]; total?: number }[],
    options: {
      categories: string[];
      asPercent?: boolean;
      onSegmentClick?: (category: string) => void;
    }
  ) {
    if (!series.length) {
      container.innerHTML = "";
      return;
    }

    const tooltip = ensureChartTooltip();

    const { width, height } = getChartSize(container, 720, 260);
    const categories = options.categories;
    const asPercent = options.asPercent ?? false;
    const padding = { top: 16, right: 18, bottom: 48, left: 54 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
    svg.style.cssText = "max-width: 100%; height: 100%;";

    const totals = series.map((s) => s.values.reduce((a, b) => a + b, 0));
    const max = Math.max(...(asPercent ? [100] : totals));

    // Axes
    const yAxis = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    yAxis.setAttribute("x1", String(padding.left));
    yAxis.setAttribute("y1", String(padding.top));
    yAxis.setAttribute("x2", String(padding.left));
    yAxis.setAttribute("y2", String(height - padding.bottom));
    yAxis.setAttribute("stroke", "#666");
    yAxis.setAttribute("stroke-width", "1");
    svg.appendChild(yAxis);

    const xAxis = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    xAxis.setAttribute("x1", String(padding.left));
    xAxis.setAttribute("y1", String(height - padding.bottom));
    xAxis.setAttribute("x2", String(width - padding.right));
    xAxis.setAttribute("y2", String(height - padding.bottom));
    xAxis.setAttribute("stroke", "#666");
    xAxis.setAttribute("stroke-width", "1");
    svg.appendChild(xAxis);

    for (let i = 0; i <= 4; i += 1) {
      const value = asPercent ? (100 * i) / 4 : (max * i) / 4;
      const y = height - padding.bottom - (chartHeight * i) / 4;
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", String(padding.left - 8));
      text.setAttribute("y", String(y + 4));
      text.setAttribute("text-anchor", "end");
      text.setAttribute("font-size", "10");
      text.setAttribute("fill", "#666");
      text.textContent = asPercent
        ? `${Math.round(value)}%`
        : formatCurrency(value);
      svg.appendChild(text);
    }

    const step = chartWidth / series.length;
    series.forEach((s, i) => {
      let y = height - padding.bottom;
      const barWidth = Math.max(10, step - 12);
      const x = padding.left + i * step + (step - barWidth) / 2;
      const label = formatMonthLabel(s.label);

      if (i % Math.ceil(series.length / 6) === 0 || i === series.length - 1) {
        const text = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        text.setAttribute("x", String(x + barWidth / 2));
        text.setAttribute("y", String(height - padding.bottom + 20));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "10");
        text.setAttribute("fill", "#666");
        text.textContent = label;
        svg.appendChild(text);
      }

      s.values.forEach((v, idx) => {
        const total = s.total || totals[i] || 0;
        const value = asPercent && total ? (v / total) * 100 : v;
        const h = max ? (value / max) * chartHeight : 0;
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        rect.setAttribute("x", String(x));
        rect.setAttribute("y", String(y - h));
        rect.setAttribute("width", String(barWidth));
        rect.setAttribute("height", String(h));
        rect.setAttribute(
          "fill",
          colorFor(categories[idx] || `stack-${idx}`, idx)
        );
        rect.setAttribute("data-segment", "stacked-bar");
        rect.setAttribute("data-series-label", s.label);
        rect.setAttribute("data-category", categories[idx] || "");
        rect.style.cursor = "pointer";
        if (options.onSegmentClick) {
          rect.addEventListener("click", () =>
            options.onSegmentClick?.(categories[idx] || "")
          );
        }

        // Add hover tooltip
        if (v > 0) {
          rect.addEventListener("mouseenter", (e) => {
            if (!tooltip) return;
            const mouseEvent = e as MouseEvent;
            tooltip.style.display = "block";
            tooltip.innerHTML = `<div style="font-weight: 600;">${escapeHtml(
              formatMonthLabel(s.label)
            )} • ${escapeHtml(categories[idx] || "Category")}</div><div>${
              asPercent ? `${Math.round(value)}%` : formatCurrency(v)
            }</div>`;
            tooltip.style.left = `${mouseEvent.pageX + 10}px`;
            tooltip.style.top = `${mouseEvent.pageY + 10}px`;
          });
          rect.addEventListener("mousemove", (e) => {
            if (!tooltip) return;
            const mouseEvent = e as MouseEvent;
            tooltip.style.left = `${mouseEvent.pageX + 10}px`;
            tooltip.style.top = `${mouseEvent.pageY + 10}px`;
          });
          rect.addEventListener("mouseleave", () => {
            if (!tooltip) return;
            tooltip.style.display = "none";
          });
        }

        svg.appendChild(rect);
        y -= h;
      });
    });

    // Legend removed - hover tooltip provides all information
    container.innerHTML = "";
    container.appendChild(svg);
  }

  function renderLineChart(
    container: HTMLElement,
    series: { label: string; value: number }[]
  ) {
    if (!series.length) {
      container.innerHTML = "";
      return;
    }

    const tooltip = ensureChartTooltip();

    const { width, height } = getChartSize(container, 720, 260);
    const padding = { top: 20, right: 20, bottom: 48, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
    svg.style.cssText = "max-width: 100%; height: 100%;";

    // Add axes
    const max = Math.max(...series.map((s) => s.value));
    const min = Math.min(...series.map((s) => s.value));
    const yRange = max - min || 1;

    // Y-axis
    const yAxis = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    yAxis.setAttribute("x1", String(padding.left));
    yAxis.setAttribute("y1", String(padding.top));
    yAxis.setAttribute("x2", String(padding.left));
    yAxis.setAttribute("y2", String(height - padding.bottom));
    yAxis.setAttribute("stroke", "#666");
    yAxis.setAttribute("stroke-width", "1");
    svg.appendChild(yAxis);

    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const value = min + (yRange * i) / 4;
      const y = height - padding.bottom - (chartHeight * i) / 4;
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", String(padding.left - 10));
      text.setAttribute("y", String(y + 4));
      text.setAttribute("text-anchor", "end");
      text.setAttribute("font-size", "10");
      text.setAttribute("fill", "#666");
      text.textContent = formatCurrency(value);
      svg.appendChild(text);
    }

    // X-axis
    const xAxis = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    xAxis.setAttribute("x1", String(padding.left));
    xAxis.setAttribute("y1", String(height - padding.bottom));
    xAxis.setAttribute("x2", String(width - padding.right));
    xAxis.setAttribute("y2", String(height - padding.bottom));
    xAxis.setAttribute("stroke", "#666");
    xAxis.setAttribute("stroke-width", "1");
    svg.appendChild(xAxis);

    const xDenom = Math.max(1, series.length - 1);
    // X-axis labels (dates)
    series.forEach((s, i) => {
      if (i % Math.ceil(series.length / 6) === 0 || i === series.length - 1) {
        const x = padding.left + (i / xDenom) * chartWidth;
        const text = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        text.setAttribute("x", String(x));
        text.setAttribute("y", String(height - padding.bottom + 20));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "10");
        text.setAttribute("fill", "#666");
        text.setAttribute(
          "transform",
          `rotate(-35 ${x} ${height - padding.bottom + 20})`
        );
        text.textContent = formatDayLabel(s.label);
        svg.appendChild(text);
      }
    });

    // Draw line
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const points = series.map((s, i) => {
      const x = padding.left + (i / xDenom) * chartWidth;
      const y =
        height - padding.bottom - ((s.value - min) / yRange) * chartHeight;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    });
    path.setAttribute("d", points.join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#1f6feb");
    path.setAttribute("stroke-width", "3");
    svg.appendChild(path);

    const circles: SVGCircleElement[] = [];
    series.forEach((s, i) => {
      const x = padding.left + (i / xDenom) * chartWidth;
      const y =
        height - padding.bottom - ((s.value - min) / yRange) * chartHeight;

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      circle.setAttribute("cx", String(x));
      circle.setAttribute("cy", String(y));
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", "#1f6feb");
      circle.style.opacity = "0.2";
      circles.push(circle);
      svg.appendChild(circle);
    });

    const hoverLine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    hoverLine.setAttribute("y1", String(padding.top));
    hoverLine.setAttribute("y2", String(height - padding.bottom));
    hoverLine.setAttribute("stroke", "rgba(31,111,235,0.3)");
    hoverLine.setAttribute("stroke-width", "1");
    hoverLine.style.display = "none";
    svg.appendChild(hoverLine);

    const hoverCircle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    hoverCircle.setAttribute("r", "5");
    hoverCircle.setAttribute("fill", "#1f6feb");
    hoverCircle.style.display = "none";
    svg.appendChild(hoverCircle);

    const overlay = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    overlay.setAttribute("x", String(padding.left));
    overlay.setAttribute("y", String(padding.top));
    overlay.setAttribute("width", String(chartWidth));
    overlay.setAttribute("height", String(chartHeight));
    overlay.setAttribute("fill", "transparent");
    overlay.setAttribute("pointer-events", "all");

    const showAtIndex = (idx: number, event: MouseEvent) => {
      if (!tooltip) return;
      const clamped = Math.max(0, Math.min(series.length - 1, idx));
      const x = padding.left + (clamped / xDenom) * chartWidth;
      const y =
        height -
        padding.bottom -
        ((series[clamped].value - min) / yRange) * chartHeight;
      circles.forEach((c, i) => {
        c.style.opacity = i === clamped ? "1" : "0.2";
      });
      hoverLine.style.display = "block";
      hoverLine.setAttribute("x1", String(x));
      hoverLine.setAttribute("x2", String(x));
      hoverCircle.style.display = "block";
      hoverCircle.setAttribute("cx", String(x));
      hoverCircle.setAttribute("cy", String(y));
      tooltip.style.display = "block";
      tooltip.innerHTML = `<div style="font-weight: 600;">${escapeHtml(
        formatFullDate(series[clamped].label)
      )}</div><div>${formatCurrency(series[clamped].value)}</div>`;
      tooltip.style.left = `${event.pageX + 10}px`;
      tooltip.style.top = `${event.pageY + 10}px`;
    };

    overlay.addEventListener("mousemove", (e) => {
      const rect = svg.getBoundingClientRect();
      const mouseEvent = e as MouseEvent;
      const x = mouseEvent.clientX - rect.left;
      const ratio = (x - padding.left) / chartWidth;
      const idx = Math.round(ratio * (series.length - 1));
      showAtIndex(idx, mouseEvent);
    });
    overlay.addEventListener("mouseleave", () => {
      if (!tooltip) return;
      tooltip.style.display = "none";
      hoverLine.style.display = "none";
      hoverCircle.style.display = "none";
      circles.forEach((c) => (c.style.opacity = "0.2"));
    });

    svg.appendChild(overlay);

    container.innerHTML = "";
    container.appendChild(svg);
  }

  function renderDualLineChart(
    container: HTMLElement,
    seriesA: { label: string; value: number }[],
    seriesB: { label: string; value: number }[]
  ) {
    if (!seriesA.length && !seriesB.length) {
      container.innerHTML = "";
      return;
    }
    const { width, height } = getChartSize(container, 720, 260);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
    svg.style.cssText = "max-width: 100%; height: 100%;";
    const values = seriesA.concat(seriesB).map((s) => s.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    svg.appendChild(buildLine(seriesA, width, height, min, max, "#1f6feb"));
    svg.appendChild(buildLine(seriesB, width, height, min, max, "#12b981"));
    container.innerHTML = "";
    container.appendChild(svg);
  }

  function buildLine(
    series: { label: string; value: number }[],
    width: number,
    height: number,
    min: number,
    max: number,
    color: string
  ) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const points = series.map((s, i) => {
      const x = (i / Math.max(1, series.length - 1)) * (width - 20) + 10;
      const y =
        height -
        20 -
        ((s.value - min) / Math.max(1, max - min)) * (height - 40);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    });
    path.setAttribute("d", points.join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "3");
    return path;
  }

  function renderFlowSummary(
    container: HTMLElement,
    totals: ReturnType<typeof summarizeRange>,
    compact = false,
    breakdown?: {
      expenseCategories?: Array<[string, number]>;
      savingsCategories?: Array<[string, number]>;
      savingsTotal?: number;
    }
  ) {
    const size = getChartSize(
      container,
      compact ? 720 : 1040,
      compact ? 360 : 520
    );
    const width = size.width;
    const height = size.height;
    const columnWidth = compact ? 130 : Math.max(160, Math.floor(width * 0.18));
    const columnSpacing = compact
      ? 120
      : Math.max(170, Math.floor(width * 0.2));
    const paddingTop = 30;
    const paddingBottom = 24;
    const accentWidth = compact ? 8 : 10;
    const labelPad = compact ? 10 : 14;
    const palette = {
      income: "#2fbf8a",
      incomeSoft: "rgba(47, 191, 138, 0.14)",
      expense: "#ef6b6f",
      expenseSoft: "rgba(239, 107, 111, 0.18)",
      savings: "#35c6a1",
      savingsSoft: "rgba(53, 198, 161, 0.14)",
    };

    if (totals.incomeTotal === 0 && totals.expenses === 0) {
      container.innerHTML = "";
      return;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
    svg.style.cssText = "max-width: 100%; height: 100%;";

    // Calculate positions and sizes for Sankey-like flow
    const savingsTotal =
      breakdown?.savingsTotal ?? totals.investments + totals.unallocated;
    const flowIncomeTotal =
      totals.incomeTotal || Math.max(0, totals.expenses + savingsTotal);
    const maxValue = Math.max(
      flowIncomeTotal,
      totals.expenses,
      savingsTotal,
      1
    );
    const scale = (value: number) =>
      (value / maxValue) * (height - paddingTop - paddingBottom);

    // Left column: Income
    const incomeY = paddingTop;
    const incomeHeight = scale(flowIncomeTotal);

    // Middle columns: Expenses and Savings
    const expensesHeight = scale(totals.expenses);
    const savingsHeight = scale(savingsTotal);

    // Right column: Expense categories (top categories)
    const topCategories = breakdown?.expenseCategories?.length
      ? breakdown.expenseCategories
      : Object.entries(totals.byCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, Math.min(12, Object.keys(totals.byCategory).length));
    const savingsCategories = breakdown?.savingsCategories || [];

    // Draw Income bar
    const incomeX = compact ? 30 : 38;
    const incomeRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    incomeRect.setAttribute("x", String(incomeX));
    incomeRect.setAttribute("y", String(incomeY));
    incomeRect.setAttribute("width", String(columnWidth));
    incomeRect.setAttribute("height", String(incomeHeight));
    incomeRect.setAttribute("fill", palette.incomeSoft);
    incomeRect.setAttribute("rx", "12");
    incomeRect.setAttribute("data-flow-node", "income");
    incomeRect.classList.add("flow-node");
    svg.appendChild(incomeRect);

    const incomeAccent = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    incomeAccent.setAttribute("x", String(incomeX));
    incomeAccent.setAttribute("y", String(incomeY));
    incomeAccent.setAttribute("width", String(accentWidth));
    incomeAccent.setAttribute("height", String(incomeHeight));
    incomeAccent.setAttribute("fill", palette.income);
    incomeAccent.setAttribute("rx", "8");
    incomeAccent.setAttribute("data-flow-node", "income");
    incomeAccent.classList.add("flow-node");
    svg.appendChild(incomeAccent);

    // Income label
    const incomeLabel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    incomeLabel.setAttribute("x", String(incomeX + accentWidth + labelPad));
    incomeLabel.setAttribute("y", String(incomeY + 18));
    incomeLabel.setAttribute("text-anchor", "start");
    incomeLabel.setAttribute("font-size", compact ? "11" : "12");
    incomeLabel.setAttribute("font-weight", "700");
    incomeLabel.setAttribute("fill", "#1f2933");
    incomeLabel.textContent = "Income";
    incomeLabel.setAttribute("data-flow-node", "income");
    incomeLabel.classList.add("flow-label");
    svg.appendChild(incomeLabel);

    const incomeAmount = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    incomeAmount.setAttribute("x", String(incomeX + accentWidth + labelPad));
    incomeAmount.setAttribute("y", String(incomeY + 36));
    incomeAmount.setAttribute("text-anchor", "start");
    incomeAmount.setAttribute("font-size", compact ? "10" : "11");
    incomeAmount.setAttribute("fill", "#4b5563");
    incomeAmount.textContent = formatCurrency(flowIncomeTotal);
    incomeAmount.setAttribute("data-flow-node", "income");
    incomeAmount.classList.add("flow-label");
    svg.appendChild(incomeAmount);

    // Draw Expenses bar
    const expensesX = incomeX + columnWidth + columnSpacing;
    const expensesY = incomeY;
    const expensesRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    expensesRect.setAttribute("x", String(expensesX));
    expensesRect.setAttribute("y", String(expensesY));
    expensesRect.setAttribute("width", String(columnWidth));
    expensesRect.setAttribute("height", String(expensesHeight));
    expensesRect.setAttribute("fill", palette.expenseSoft);
    expensesRect.setAttribute("rx", "12");
    expensesRect.setAttribute("data-flow-node", "expenses");
    expensesRect.classList.add("flow-node");
    svg.appendChild(expensesRect);

    const expensesAccent = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    expensesAccent.setAttribute("x", String(expensesX));
    expensesAccent.setAttribute("y", String(expensesY));
    expensesAccent.setAttribute("width", String(accentWidth));
    expensesAccent.setAttribute("height", String(expensesHeight));
    expensesAccent.setAttribute("fill", palette.expense);
    expensesAccent.setAttribute("rx", "8");
    expensesAccent.setAttribute("data-flow-node", "expenses");
    expensesAccent.classList.add("flow-node");
    svg.appendChild(expensesAccent);

    // Expenses label
    const expensesLabel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    expensesLabel.setAttribute("x", String(expensesX + accentWidth + labelPad));
    expensesLabel.setAttribute("y", String(expensesY + 18));
    expensesLabel.setAttribute("text-anchor", "start");
    expensesLabel.setAttribute("font-size", compact ? "11" : "12");
    expensesLabel.setAttribute("font-weight", "700");
    expensesLabel.setAttribute("fill", "#1f2933");
    expensesLabel.textContent = "Expenses";
    expensesLabel.setAttribute("data-flow-node", "expenses");
    expensesLabel.classList.add("flow-label");
    svg.appendChild(expensesLabel);

    const expensesAmount = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    expensesAmount.setAttribute(
      "x",
      String(expensesX + accentWidth + labelPad)
    );
    expensesAmount.setAttribute("y", String(expensesY + 36));
    expensesAmount.setAttribute("text-anchor", "start");
    expensesAmount.setAttribute("font-size", compact ? "10" : "11");
    expensesAmount.setAttribute("fill", "#4b5563");
    expensesAmount.textContent = formatCurrency(totals.expenses);
    expensesAmount.setAttribute("data-flow-node", "expenses");
    expensesAmount.classList.add("flow-label");
    svg.appendChild(expensesAmount);

    // Draw Savings bar (below expenses)
    const savingsX = expensesX;
    const savingsY = Math.min(
      height - paddingBottom - savingsHeight,
      expensesY + expensesHeight + (compact ? 18 : 26)
    );
    const savingsRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    savingsRect.setAttribute("x", String(savingsX));
    savingsRect.setAttribute("y", String(savingsY));
    savingsRect.setAttribute("width", String(columnWidth));
    savingsRect.setAttribute("height", String(savingsHeight));
    savingsRect.setAttribute("fill", palette.savingsSoft);
    savingsRect.setAttribute("rx", "12");
    savingsRect.setAttribute("data-flow-node", "savings");
    savingsRect.classList.add("flow-node");
    svg.appendChild(savingsRect);

    const savingsAccent = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    savingsAccent.setAttribute("x", String(savingsX));
    savingsAccent.setAttribute("y", String(savingsY));
    savingsAccent.setAttribute("width", String(accentWidth));
    savingsAccent.setAttribute("height", String(savingsHeight));
    savingsAccent.setAttribute("fill", palette.savings);
    savingsAccent.setAttribute("rx", "8");
    savingsAccent.setAttribute("data-flow-node", "savings");
    savingsAccent.classList.add("flow-node");
    svg.appendChild(savingsAccent);

    // Savings label
    const savingsLabel = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    savingsLabel.setAttribute("x", String(savingsX + accentWidth + labelPad));
    savingsLabel.setAttribute("y", String(savingsY + 18));
    savingsLabel.setAttribute("text-anchor", "start");
    savingsLabel.setAttribute("font-size", compact ? "11" : "12");
    savingsLabel.setAttribute("font-weight", "700");
    savingsLabel.setAttribute("fill", "#1f2933");
    savingsLabel.textContent = "Savings";
    savingsLabel.setAttribute("data-flow-node", "savings");
    savingsLabel.classList.add("flow-label");
    svg.appendChild(savingsLabel);

    const savingsAmount = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    savingsAmount.setAttribute("x", String(savingsX + accentWidth + labelPad));
    savingsAmount.setAttribute("y", String(savingsY + 36));
    savingsAmount.setAttribute("text-anchor", "start");
    savingsAmount.setAttribute("font-size", compact ? "10" : "11");
    savingsAmount.setAttribute("fill", "#4b5563");
    savingsAmount.textContent = formatCurrency(savingsTotal);
    savingsAmount.setAttribute("data-flow-node", "savings");
    savingsAmount.classList.add("flow-label");
    svg.appendChild(savingsAmount);

    // Draw flow from Income to Expenses
    if (flowIncomeTotal > 0 && totals.expenses > 0) {
      const flow1 = drawFlow(
        svg,
        incomeX + columnWidth,
        incomeY,
        expensesX,
        expensesY,
        expensesHeight,
        palette.expense
      );
    }

    // Draw flow from Income to Savings
    if (flowIncomeTotal > 0 && savingsTotal > 0) {
      const expenseRatio = totals.expenses / flowIncomeTotal;
      const flowStartY = incomeY + expenseRatio * incomeHeight;
      const flowHeight = incomeHeight - expenseRatio * incomeHeight;
      const flow2 = drawFlow(
        svg,
        incomeX + columnWidth,
        flowStartY,
        savingsX,
        savingsY,
        savingsHeight,
        palette.savings
      );
    }

    // Draw expense categories on the right
    if (
      !compact &&
      (topCategories.length > 0 || savingsCategories.length > 0)
    ) {
      const categoriesX = expensesX + columnWidth + columnSpacing;
      const catWidth = compact ? 10 : 12;
      const labelX = categoriesX + catWidth + 12;
      let categoryY = expensesY;
      const totalExpenseCat =
        topCategories.reduce((sum, [, val]) => sum + val, 0) || 1;
      const availableHeight = Math.max(40, expensesHeight);
      const minHeight = compact ? 6 : 12;
      const baseGap = compact ? 4 : 8;
      const categoryScale = availableHeight / totalExpenseCat;
      let rawHeights = topCategories.map(([, value]) =>
        Math.max(minHeight, value * categoryScale)
      );
      let rawTotal = rawHeights.reduce((sum, value) => sum + value, 0);
      let gap = Math.max(
        2,
        Math.floor(
          (availableHeight - rawTotal) / Math.max(1, topCategories.length - 1)
        )
      );
      gap = Math.min(baseGap, gap);
      const availableForBars = Math.max(
        minHeight * topCategories.length,
        availableHeight - gap * (topCategories.length - 1)
      );
      const heightScale =
        rawTotal > availableForBars ? availableForBars / rawTotal : 1;
      rawHeights = rawHeights.map((value) =>
        Math.max(minHeight, value * heightScale)
      );
      rawTotal = rawHeights.reduce((sum, value) => sum + value, 0);
      if (rawTotal + gap * (topCategories.length - 1) > availableHeight) {
        gap = Math.max(
          2,
          Math.floor(
            (availableHeight - rawTotal) / Math.max(1, topCategories.length - 1)
          )
        );
      }

      topCategories.forEach(([category, value], idx) => {
        const catHeight = rawHeights[idx];
        const catColor = colorFor(category, idx);

        const catRect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        catRect.setAttribute("x", String(categoriesX));
        catRect.setAttribute("y", String(categoryY));
        catRect.setAttribute("width", String(catWidth));
        catRect.setAttribute("height", String(catHeight));
        catRect.setAttribute("fill", catColor);
        catRect.setAttribute("fill-opacity", "0.7");
        catRect.setAttribute("rx", "6");
        catRect.setAttribute("data-flow-node", normalizeFlowKey(category));
        catRect.classList.add("flow-node");
        svg.appendChild(catRect);

        // Category label
        const legendDot = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        legendDot.setAttribute("cx", String(labelX));
        legendDot.setAttribute("cy", String(categoryY + catHeight / 2));
        legendDot.setAttribute("r", "3.5");
        legendDot.setAttribute("fill", catColor);
        svg.appendChild(legendDot);

        const legendText = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        legendText.setAttribute("x", String(labelX + 8));
        legendText.setAttribute("y", String(categoryY + catHeight / 2));
        legendText.setAttribute("font-size", "11");
        legendText.setAttribute("fill", "#1f2933");
        legendText.setAttribute("dominant-baseline", "middle");
        legendText.textContent = `${category} • ${formatCurrency(value)}`;
        legendText.setAttribute("data-flow-node", normalizeFlowKey(category));
        legendText.classList.add("flow-label");
        svg.appendChild(legendText);

        // Draw flow from Expenses to Category
        const flow = drawFlow(
          svg,
          expensesX + columnWidth,
          expensesY + (categoryY - expensesY),
          categoriesX,
          categoryY,
          catHeight,
          catColor
        );

        categoryY += catHeight + gap;
      });

      if (savingsCategories.length > 0) {
        let savingsYCursor = savingsY;
        const totalSavingsCat =
          savingsCategories.reduce((sum, [, val]) => sum + val, 0) || 1;
        const savingsScale = savingsHeight / totalSavingsCat;
        let savingsHeights = savingsCategories.map(([, value]) =>
          Math.max(minHeight, value * savingsScale)
        );
        let savingsTotalHeight = savingsHeights.reduce(
          (sum, value) => sum + value,
          0
        );
        let savingsGap = Math.max(
          2,
          Math.floor(
            (savingsHeight - savingsTotalHeight) /
              Math.max(1, savingsCategories.length - 1)
          )
        );
        savingsGap = Math.min(baseGap, savingsGap);
        const savingsAvailable = Math.max(
          minHeight * savingsCategories.length,
          savingsHeight - savingsGap * (savingsCategories.length - 1)
        );
        const savingsHeightScale =
          savingsTotalHeight > savingsAvailable
            ? savingsAvailable / savingsTotalHeight
            : 1;
        savingsHeights = savingsHeights.map((value) =>
          Math.max(minHeight, value * savingsHeightScale)
        );
        savingsTotalHeight = savingsHeights.reduce(
          (sum, value) => sum + value,
          0
        );
        if (
          savingsTotalHeight + savingsGap * (savingsCategories.length - 1) >
          savingsHeight
        ) {
          savingsGap = Math.max(
            2,
            Math.floor(
              (savingsHeight - savingsTotalHeight) /
                Math.max(1, savingsCategories.length - 1)
            )
          );
        }

        savingsCategories.forEach(([category, value], idx) => {
          const catHeight = savingsHeights[idx];
          const colorIdx = topCategories.length + idx;
          const catColor = colorFor(category, colorIdx);

          const catRect = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect"
          );
          catRect.setAttribute("x", String(categoriesX));
          catRect.setAttribute("y", String(savingsYCursor));
          catRect.setAttribute("width", String(catWidth));
          catRect.setAttribute("height", String(catHeight));
          catRect.setAttribute("fill", catColor);
          catRect.setAttribute("fill-opacity", "0.7");
          catRect.setAttribute("rx", "6");
          catRect.setAttribute("data-flow-node", normalizeFlowKey(category));
          catRect.classList.add("flow-node");
          svg.appendChild(catRect);

          const legendDot = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );
          legendDot.setAttribute("cx", String(labelX));
          legendDot.setAttribute("cy", String(savingsYCursor + catHeight / 2));
          legendDot.setAttribute("r", "3.5");
          legendDot.setAttribute("fill", catColor);
          svg.appendChild(legendDot);

          const legendText = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
          );
          legendText.setAttribute("x", String(labelX + 8));
          legendText.setAttribute("y", String(savingsYCursor + catHeight / 2));
          legendText.setAttribute("font-size", "11");
          legendText.setAttribute("fill", "#1f2933");
          legendText.setAttribute("dominant-baseline", "middle");
          legendText.textContent = `${category} • ${formatCurrency(value)}`;
          legendText.setAttribute("data-flow-node", normalizeFlowKey(category));
          legendText.classList.add("flow-label");
          svg.appendChild(legendText);

          drawFlow(
            svg,
            savingsX + columnWidth,
            savingsY + (savingsYCursor - savingsY),
            categoriesX,
            savingsYCursor,
            catHeight,
            catColor
          );

          savingsYCursor += catHeight + savingsGap;
        });
      }
    }

    container.innerHTML = "";
    container.appendChild(svg);
  }

  function normalizeFlowKey(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
  }

  function drawFlow(
    svg: SVGSVGElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    height: number,
    color: string
  ) {
    // Draw a curved flow path (simplified Sankey link)
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const curve = Math.min(160, (x2 - x1) * 0.55);
    const xCtrl1 = x1 + curve;
    const xCtrl2 = x2 - curve;
    const y1b = y1 + height;
    const y2b = y2 + height;
    const d = `M ${x1} ${y1} C ${xCtrl1} ${y1}, ${xCtrl2} ${y2}, ${x2} ${y2} L ${x2} ${y2b} C ${xCtrl2} ${y2b}, ${xCtrl1} ${y1b}, ${x1} ${y1b} Z`;
    path.setAttribute("d", d);
    path.setAttribute("fill", color);
    path.setAttribute("fill-opacity", "0.24");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-opacity", "0.18");
    path.setAttribute("stroke-width", "0.6");
    svg.appendChild(path);
    return path;
  }

  // Build a true Sankey ribbon path - data-driven, not decorative
  function buildRibbonPath(
    sourceX: number,
    targetX: number,
    y0: number,  // top at source
    y1: number,  // top at target
    width: number  // ribbon thickness
  ): string {
    // Clamp coordinates to prevent overflow (safety check)
    const y0b = y0 + width;  // bottom at source
    const y1b = y1 + width;  // bottom at target
    
    // Data-driven curvature: control points at 50% of horizontal distance
    // This creates the classic Sankey S-curve based on geometry, not decoration
    const dx = targetX - sourceX;
    const c1x = sourceX + dx * 0.5;
    const c2x = targetX - dx * 0.5;
    
    // Build closed ribbon path: top curve + vertical line + bottom curve + vertical line
    // Top edge: smooth bezier from source to target
    // Bottom edge: smooth bezier from target back to source
    // Closed path (Z) ensures thickness is intrinsic, no stroke caps needed
    return [
      `M ${sourceX} ${y0}`,
      `C ${c1x} ${y0} ${c2x} ${y1} ${targetX} ${y1}`,
      `L ${targetX} ${y1b}`,
      `C ${c2x} ${y1b} ${c1x} ${y0b} ${sourceX} ${y0b}`,
      `Z`
    ].join(" ");
  }

  function drawSankeyFlowPath(
    flowsGroup: SVGGElement,
    sourceX: number,
    y0: number,  // top at source
    y1: number,  // top at target
    targetX: number,
    width: number,  // ribbon thickness
    color: string,
    opacity: number = 0.3
  ): SVGPathElement {
    // Draw a true Sankey ribbon using the proper ribbon path builder
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    
    // Build the ribbon path using data-driven curvature
    const d = buildRibbonPath(sourceX, targetX, y0, y1, width);
    
    path.setAttribute("d", d);
    path.setAttribute("fill", color);
    path.setAttribute("fill-opacity", String(opacity));
    path.setAttribute("stroke", "none");
    
    // Append to flows group (renders behind nodes)
    flowsGroup.appendChild(path);
    return path;
  }

  function byId<T extends HTMLElement = HTMLElement>(id: string) {
    return document.getElementById(id) as T | null;
  }

  function ensureChartTooltip() {
    let tooltip = document.getElementById("chartTooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "chartTooltip";
      tooltip.style.cssText =
        "position: absolute; background: rgba(0,0,0,0.9); color: white; padding: 8px 12px; border-radius: 6px; pointer-events: none; z-index: 10000; font-size: 12px; display: none;";
      document.body.appendChild(tooltip);
    }
    return tooltip;
  }

  function getChartSize(
    container: HTMLElement,
    fallbackWidth: number,
    fallbackHeight: number
  ) {
    const rect = container.getBoundingClientRect();
    // Use actual container dimensions, or fallback if container has no size yet
    const width = rect.width > 0 ? Math.floor(rect.width) : fallbackWidth;
    // For cashflow map, use available height or calculate based on viewport
    const height =
      rect.height > 0
        ? Math.floor(rect.height)
        : fallbackHeight || Math.max(400, window.innerHeight * 0.6);
    return { width: Math.max(320, width), height: Math.max(220, height) };
  }

  // Helper: Group expense categories into major buckets (hierarchy level 2)
  function groupCategoryIntoBucket(categoryName: string): string {
    const name = categoryName.toLowerCase();

    // Housing bucket
    if (
      name.includes("rent") ||
      name.includes("housing") ||
      name.includes("mortgage") ||
      name.includes("utilities") ||
      name.includes("electric") ||
      name.includes("water") ||
      (name.includes("gas") && !name.includes("fuel")) ||
      name.includes("internet") ||
      name.includes("phone") ||
      (name.includes("insurance") &&
        (name.includes("home") || name.includes("renters")))
    ) {
      return "Housing";
    }

    // Daily Life bucket
    if (
      name.includes("groceries") ||
      name.includes("food") ||
      name.includes("restaurant") ||
      name.includes("dining") ||
      name.includes("coffee") ||
      name.includes("shopping") ||
      name.includes("clothing") ||
      name.includes("personal") ||
      name.includes("care") ||
      name.includes("health") ||
      name.includes("medical") ||
      name.includes("pharmacy")
    ) {
      return "Daily Life";
    }

    // Subscriptions bucket
    if (
      name.includes("subscription") ||
      name.includes("netflix") ||
      name.includes("spotify") ||
      name.includes("prime") ||
      name.includes("youtube") ||
      name.includes("disney") ||
      name.includes("hulu") ||
      (name.includes("apple") && name.includes("music")) ||
      name.includes("streaming") ||
      name.includes("software") ||
      name.includes("saas") ||
      name.includes("github") ||
      name.includes("patreon") ||
      name.includes("revolut")
    ) {
      return "Subscriptions";
    }

    // Transportation bucket
    if (
      name.includes("transport") ||
      name.includes("car") ||
      (name.includes("gas") && name.includes("fuel")) ||
      name.includes("fuel") ||
      name.includes("uber") ||
      name.includes("lyft") ||
      name.includes("taxi") ||
      name.includes("parking") ||
      name.includes("toll")
    ) {
      return "Transportation";
    }

    // Investments bucket
    if (
      name.includes("invest") ||
      name.includes("savings") ||
      name.includes("retirement") ||
      name.includes("401k") ||
      name.includes("ira") ||
      name.includes("stocks") ||
      name.includes("bonds") ||
      name.includes("crypto") ||
      name.includes("trading") ||
      name.includes("cto") ||
      name.includes("pea") ||
      name.includes("brokerage")
    ) {
      return "Investments";
    }

    // Entertainment bucket
    if (
      name.includes("entertainment") ||
      name.includes("movies") ||
      name.includes("cinema") ||
      name.includes("games") ||
      name.includes("hobby") ||
      name.includes("sports") ||
      name.includes("gym") ||
      name.includes("fitness")
    ) {
      return "Entertainment";
    }

    // Default to "Other"
    return "Other";
  }

  function renderSankeyDiagram(
    container: HTMLElement,
    flowGraph: { nodes: any[]; edges: any[]; metadata: any },
    isPreview = false
  ) {
    // Measure container size - container should now have proper height from CSS flex chain
    const containerRect = container.getBoundingClientRect();
    let containerWidth = containerRect.width;
    let containerHeight = containerRect.height;

    // Fallback if container has no size yet
    if (containerWidth === 0 || containerHeight === 0) {
      containerWidth = window.innerWidth * 0.7;
      containerHeight = window.innerHeight * 0.6;
    }

    // Ensure minimum dimensions
    containerWidth = Math.max(600, containerWidth);
    containerHeight = Math.max(400, containerHeight);

    // Define explicit margins for layout
    const margin = {
      top: 24,
      bottom: 24,
      left: 24,
      right: 340, // Reserve space for labels
    };

    // Calculate available space - use full container dimensions
    const width = containerWidth;
    const height = containerHeight;
    
    // Compute layout dimensions (the actual drawable area)
    const layoutWidth = width - margin.left - margin.right;
    const layoutHeight = height - margin.top - margin.bottom;
    
    // DEBUG: Log measurements to console for verification
    console.log('[Sankey] Container measurements:', {
      containerWidth,
      containerHeight,
      layoutWidth,
      layoutHeight,
      margin,
      visibleHeight: container.getBoundingClientRect().height,
      parentHeight: container.parentElement?.getBoundingClientRect().height
    });

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    // Initial viewBox - will be updated after column positions are calculated
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
    svg.style.cssText = "width: 100%; height: 100%; display: block;";

    // Create a single root group for all content with coordinate system transform
    // This group will contain everything and be positioned at (margin.left, margin.top)
    const rootGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    rootGroup.setAttribute("class", "sankey-root");
    rootGroup.setAttribute("transform", `translate(${margin.left}, ${margin.top})`);
    svg.appendChild(rootGroup);

    // Create a group for all flow paths so they render behind nodes
    const flowsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    flowsGroup.setAttribute("class", "sankey-flows");
    rootGroup.appendChild(flowsGroup);
    
    // Create a group for all nodes so they render on top of links (hides any link protrusion)
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodesGroup.setAttribute("class", "sankey-nodes");
    rootGroup.appendChild(nodesGroup);

    // Color palette matching the reference design
    const incomeColor = "#22c55e"; // Green for income
    const budgetColor = "#64748b"; // Neutral gray for budget
    const savingsColor = "#f4b740"; // Orange/yellow for savings

    // Use the app's colorFor function for consistent colors across the app
    // This ensures colors match the dashboard and category sections

    // Get aggregated nodes
    const incomeNodes = flowGraph.nodes.filter((n) => n.type === "income");
    const expensesAggregate = flowGraph.nodes.find(
      (n) => n.id === "expenses:all"
    );
    const savingsAggregate = flowGraph.nodes.find(
      (n) => n.id === "savings:all"
    );
    const expenseCategoryNodes = flowGraph.nodes.filter(
      (n) => n.type === "expense-category"
    );

    const totalIncome = flowGraph.metadata.totalIncome || 1;
    const totalExpenses =
      expensesAggregate?.amount || flowGraph.metadata.totalExpenses || 0;
    const totalSavings =
      savingsAggregate?.amount || flowGraph.metadata.totalSavings || 0;

    // Calculate scale for proportional sizing - use layoutHeight to fill available space
    const maxValue = Math.max(totalIncome, totalExpenses + totalSavings);
    const scale = (value: number) => (value / maxValue) * layoutHeight;

    // STEP 1: Build proper hierarchy: Budget → Expenses/Savings → Categories
    // Level 0: Income sources (already have incomeNodes)
    // Level 1: Budget (hub) - single node
    // Level 2: Expenses and Savings (two main buckets)
    // Level 3: Individual expense categories (under Expenses) and savings details (under Savings)

    // Separate expenses and savings
    const expenseCategories = expenseCategoryNodes.map((cat) => ({
      id: cat.id,
      label: cat.label,
      amount: Math.abs(cat.amount),
      type: cat.type,
    }));

    // Calculate unallocated money (income - expenses - explicit savings)
    const allocatedAmount = totalExpenses + totalSavings;
    const unallocatedAmount = Math.max(0, totalIncome - allocatedAmount);
    const totalSavingsWithUnallocated = totalSavings + unallocatedAmount;

    // Create two main buckets: Expenses and Savings
    const mainBuckets = [
      {
        name: "Expenses",
        total: totalExpenses,
        categories: expenseCategories.sort((a, b) => b.amount - a.amount),
        type: "expenses",
      },
      {
        name: "Savings",
        total: totalSavingsWithUnallocated,
        categories: totalSavingsWithUnallocated > 0
          ? [
              ...(totalSavings > 0
                ? [
                    {
                      id: "savings",
                      label: "Savings",
                      amount: totalSavings,
                      type: "savings",
                    },
                  ]
                : []),
              ...(unallocatedAmount > 0
                ? [
                    {
                      id: "unallocated",
                      label: "Unallocated",
                      amount: unallocatedAmount,
                      type: "savings",
                    },
                  ]
                : []),
            ]
          : [],
        type: "savings",
      },
    ].filter((bucket) => bucket.total > 0);

    // STEP 2: Apply "Top N + Other" at detail level (Level 3) for expense categories
    const TOP_N = 10; // Show top 10 expense categories
    const bucketsWithDetails = mainBuckets.map((bucket) => {
      if (bucket.categories.length <= TOP_N) {
        return {
          ...bucket,
          details: bucket.categories,
          otherAmount: 0,
        };
      }

      const topDetails = bucket.categories.slice(0, TOP_N);
      const otherCategories = bucket.categories.slice(TOP_N);
      const otherAmount = otherCategories.reduce(
        (sum, cat) => sum + cat.amount,
        0
      );

      // For Expenses bucket, apply Top N + Other
      if (bucket.name === "Expenses") {
        return {
          ...bucket,
          details:
            otherAmount > 0
              ? [
                  ...topDetails,
                  {
                    id: `other:${bucket.name}`,
                    label: `Other Expenses`,
                    amount: otherAmount,
                    type: "expense-category",
                  },
                ]
              : topDetails,
          otherAmount,
        };
      } else {
        // For Savings bucket, show all categories (usually just Savings and Unallocated)
        return {
          ...bucket,
          details: bucket.categories,
          otherAmount: 0,
        };
      }
    });

    // STEP 3: Define column positions with improved spacing for better flow
    // Use layoutWidth (already accounts for right margin)
    const availableWidth = layoutWidth;

    const nodeWidth = 140; // Slightly wider nodes for better visibility
    const columnSpacing = 240; // Increased spacing for better visual separation and flow

    // Column 0: Individual income sources (Salary, Bonus, etc.)
    // All X positions are relative to layout (0-based within rootGroup)
    const incomeSourcesX = 0;

    // Column 1: Budget (hub) - single node that aggregates all income sources
    const budgetHubX = incomeSourcesX + nodeWidth + columnSpacing;

    // Column 2: Major buckets (segmented bar) - Expenses, Savings, Investments, etc.
    const bucketsX = budgetHubX + nodeWidth + columnSpacing;
    const bucketBarWidth = 120; // Wider bucket bars for better visibility

    // Column 3: Details (individual category nodes)
    const detailsX = bucketsX + bucketBarWidth + columnSpacing;
    const detailNodeWidth = 120; // Wider detail nodes
    // Label X is relative to layout, but needs to account for margin.right offset
    const labelX = detailsX + detailNodeWidth + 24; // Increased air gap before labels

    // STEP 4: Render individual income sources (Column 0)
    // Sort income nodes by amount descending
    const sortedIncomeNodes = [...incomeNodes].sort((a, b) => b.amount - a.amount);
    
    // Calculate positions for each income source
    const incomeSourcePositions: Array<{
      y: number;
      height: number;
      centerY: number;
      node: any;
    }> = [];
    
    // Compute positions within [0..layoutHeight] coordinate system
    // CRITICAL: Ensure nodes fill the full layoutHeight
    let incomeY = 0;
    sortedIncomeNodes.forEach((incomeNode) => {
      const incomeHeight = scale(Math.abs(incomeNode.amount));
      const minHeight = Math.max(30, layoutHeight * 0.05);
      const actualHeight = Math.max(minHeight, incomeHeight);
      const centerY = incomeY + actualHeight / 2;
      
      incomeSourcePositions.push({
        y: incomeY,
        height: actualHeight,
        centerY,
        node: incomeNode,
      });
      
      incomeY += actualHeight + 8; // Gap between income sources
    });
    
    // CRITICAL FIX: Scale to fill layoutHeight (use 85% to leave some padding)
    const totalIncomeHeight = incomeSourcePositions.reduce((sum, pos) => sum + pos.height, 0);
    const totalIncomeHeightWithGaps = totalIncomeHeight + (sortedIncomeNodes.length - 1) * 8;
    const targetHeight = layoutHeight * 0.85; // Use 85% of available height
    
    if (totalIncomeHeightWithGaps > 0) {
      // Always scale to fill targetHeight
      const scaleFactor = targetHeight / totalIncomeHeightWithGaps;
      let currentY = (layoutHeight - targetHeight) / 2; // Center vertically
      incomeSourcePositions.forEach((pos) => {
        pos.height *= scaleFactor;
        pos.y = currentY;
        pos.centerY = currentY + pos.height / 2;
        currentY += pos.height + 8;
      });
    }
    
    // Render each income source node
    incomeSourcePositions.forEach((pos) => {
      const incomeRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      incomeRect.setAttribute("x", String(incomeSourcesX));
      incomeRect.setAttribute("y", String(pos.y));
      incomeRect.setAttribute("width", String(nodeWidth));
      incomeRect.setAttribute("height", String(pos.height));
      incomeRect.setAttribute("fill", incomeColor);
      incomeRect.setAttribute("fill-opacity", "1.0"); // Full opacity for better visibility
      incomeRect.setAttribute("rx", "12"); // More rounded corners for smoother appearance
      incomeRect.setAttribute("ry", "12");
      incomeRect.setAttribute("data-flow-node", pos.node.id);
      incomeRect.style.cursor = "pointer";
      nodesGroup.appendChild(incomeRect);

      const incomeLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      incomeLabel.setAttribute("x", String(incomeSourcesX + 14));
      incomeLabel.setAttribute("y", String(pos.y + pos.height - 10));
      incomeLabel.setAttribute("font-size", "13");
      incomeLabel.setAttribute("font-weight", "600");
      incomeLabel.setAttribute("fill", "#ffffff");
      incomeLabel.textContent = pos.node.label || pos.node.id.replace("income:", "");
      nodesGroup.appendChild(incomeLabel);

      const incomeAmount = document.createElementNS("http://www.w3.org/2000/svg", "text");
      incomeAmount.setAttribute("x", String(incomeSourcesX + 14));
      incomeAmount.setAttribute("y", String(pos.y + pos.height - 32));
      incomeAmount.setAttribute("font-size", "15");
      incomeAmount.setAttribute("font-weight", "700");
      incomeAmount.setAttribute("fill", "#ffffff");
      incomeAmount.textContent = formatCurrency(Math.abs(pos.node.amount));
      nodesGroup.appendChild(incomeAmount);
    });

    // STEP 5: Render Budget (hub) node (Column 1) - aggregates from Income/Budget
    // Calculate budget hub height - it should match the sum of income node heights
    // After income nodes are scaled to fill 85% of layoutHeight, budget hub should match
    const incomeTotalHeight = incomeSourcePositions.reduce((sum, pos) => sum + pos.height, 0);
    const incomeGaps = (incomeSourcePositions.length - 1) * 8;
    const budgetHubHeight = incomeTotalHeight; // Budget hub height = sum of income heights (without gaps)
    // Center vertically within layoutHeight (matching income nodes vertical center)
    const budgetHubY = (layoutHeight - budgetHubHeight) / 2;

    const budgetHubRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    budgetHubRect.setAttribute("x", String(budgetHubX));
    budgetHubRect.setAttribute("y", String(budgetHubY));
    budgetHubRect.setAttribute("width", String(nodeWidth));
    budgetHubRect.setAttribute("height", String(budgetHubHeight));
    budgetHubRect.setAttribute("fill", budgetColor);
    budgetHubRect.setAttribute("fill-opacity", "1.0"); // Full opacity
      budgetHubRect.setAttribute("rx", "12"); // More rounded corners
      budgetHubRect.setAttribute("ry", "12");
    budgetHubRect.setAttribute("data-flow-node", "budget-hub");
    budgetHubRect.style.cursor = "pointer";
    nodesGroup.appendChild(budgetHubRect);

    const budgetHubLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    budgetHubLabel.setAttribute("x", String(budgetHubX + 14));
    budgetHubLabel.setAttribute("y", String(budgetHubY + budgetHubHeight - 14));
    budgetHubLabel.setAttribute("font-size", "14");
    budgetHubLabel.setAttribute("font-weight", "600");
    budgetHubLabel.setAttribute("fill", "#ffffff");
      budgetHubLabel.textContent = "Budget";
      nodesGroup.appendChild(budgetHubLabel);

    const budgetHubAmount = document.createElementNS("http://www.w3.org/2000/svg", "text");
    budgetHubAmount.setAttribute("x", String(budgetHubX + 14));
    budgetHubAmount.setAttribute("y", String(budgetHubY + budgetHubHeight - 36));
    budgetHubAmount.setAttribute("font-size", "17");
    budgetHubAmount.setAttribute("font-weight", "700");
    budgetHubAmount.setAttribute("fill", "#ffffff");
      budgetHubAmount.textContent = formatCurrency(totalIncome);
      nodesGroup.appendChild(budgetHubAmount);

    // STEP 6: Calculate bucket segment positions (Column 2 - single continuous segmented bar)
    // Ensure we have at least one bucket to render - this is critical for the visualization
    if (bucketsWithDetails.length === 0) {
      // If no buckets were created from categories, create buckets from aggregates
      if (totalExpenses > 0) {
        bucketsWithDetails.push({
          name: "Expenses",
          total: totalExpenses,
          categories: [],
          details: [
            {
              id: "expenses:all",
              label: "All Expenses",
              amount: totalExpenses,
              type: "expense-category",
            },
          ],
          otherAmount: 0,
        });
      }
      if (totalSavings > 0) {
        bucketsWithDetails.push({
          name: "Savings",
          total: totalSavings,
          categories: [],
          details: [
            {
              id: "savings",
              label: "Savings",
              amount: totalSavings,
              type: "savings",
            },
          ],
          otherAmount: 0,
        });
      }
      // If still no buckets, create a minimal placeholder
      if (bucketsWithDetails.length === 0 && totalIncome > 0) {
        bucketsWithDetails.push({
          name: "Allocated",
          total: totalIncome,
          categories: [],
          details: [
            {
              id: "allocated",
              label: "Allocated",
              amount: totalIncome,
              type: "expense-category",
            },
          ],
          otherAmount: 0,
        });
      }
    }

    const totalBucketAmount =
      bucketsWithDetails.reduce((sum, b) => sum + b.total, 0) || 1;
    // Start from 0 in layout coordinate system
    let segmentY = 0;
    const bucketSegmentPositions: Array<{
      y: number;
      height: number;
      centerY: number;
      color: string;
      bucket: (typeof bucketsWithDetails)[0];
    }> = [];

    // Bucket color mapping using app's colorFor function for consistency
    const bucketColorMap = new Map<string, string>();
    bucketsWithDetails.forEach((bucket, idx) => {
      // Use colorFor to get consistent colors
      bucketColorMap.set(bucket.name, colorFor(bucket.name, idx));
    });
    
    // Category color mapping - use colorFor for each category
    const categoryColorMap = new Map<string, string>();
    bucketsWithDetails.forEach((bucket) => {
      bucket.details.forEach((detail, idx) => {
        if (!categoryColorMap.has(detail.id)) {
          categoryColorMap.set(detail.id, colorFor(detail.label, idx));
        }
      });
    });

    // Calculate segment heights with improved spacing for better visual separation
    const bucketGap = 12; // Increased gap between buckets for better visual separation
    const totalGaps = (bucketsWithDetails.length - 1) * bucketGap;
    const availableHeight = layoutHeight - totalGaps;
    
    const bucketSegmentHeights: number[] = [];
    bucketsWithDetails.forEach((bucket) => {
      const proportionalHeight =
        (bucket.total / totalBucketAmount) * availableHeight;
      const minHeight = Math.max(50, availableHeight * 0.06); // Increased min height for better visibility
      bucketSegmentHeights.push(Math.max(minHeight, proportionalHeight));
    });

    // Normalize to fit exactly within available height
    const totalBucketHeight = bucketSegmentHeights.reduce(
      (sum, h) => sum + h,
      0
    );
    const bucketHeightScale =
      totalBucketHeight > 0 ? availableHeight / totalBucketHeight : 1;

    // Build bucket segments with spacing
    bucketsWithDetails.forEach((bucket, index) => {
      const segmentHeight = bucketSegmentHeights[index] * bucketHeightScale;
      const centerY = segmentY + segmentHeight / 2;
      const color = bucketColorMap.get(bucket.name) || colorFor(bucket.name, 0);

      bucketSegmentPositions.push({
        y: segmentY,
        height: segmentHeight,
        centerY,
        color,
        bucket,
      });

      // Add gap after each segment (except the last one)
      segmentY += segmentHeight + (index < bucketsWithDetails.length - 1 ? bucketGap : 0);
    });

    // CRITICAL FIX: Scale buckets to fill layoutHeight (use 85% to leave padding)
    const totalBucketHeightWithGaps = bucketSegmentPositions.reduce(
      (sum, pos) => sum + pos.height,
      0
    ) + (bucketsWithDetails.length - 1) * bucketGap;
    const targetBucketHeight = layoutHeight * 0.85;
    
    if (totalBucketHeightWithGaps > 0 && totalBucketHeightWithGaps < targetBucketHeight) {
      const bucketScaleFactor = targetBucketHeight / totalBucketHeightWithGaps;
      const bucketStartY = (layoutHeight - targetBucketHeight) / 2; // Center vertically
      let currentBucketY = bucketStartY;
      
      bucketSegmentPositions.forEach((pos, idx) => {
        pos.height *= bucketScaleFactor;
        pos.y = currentBucketY;
        pos.centerY = currentBucketY + pos.height / 2;
        currentBucketY += pos.height + (idx < bucketsWithDetails.length - 1 ? bucketGap : 0);
      });
    } else if (totalBucketHeightWithGaps > layoutHeight) {
      // Scale down if too large
      const bucketScaleFactor = layoutHeight / totalBucketHeightWithGaps;
      let currentBucketY = 0;
      bucketSegmentPositions.forEach((pos, idx) => {
        pos.height *= bucketScaleFactor;
        pos.y = currentBucketY;
        pos.centerY = currentBucketY + pos.height / 2;
        currentBucketY += pos.height + (idx < bucketsWithDetails.length - 1 ? bucketGap : 0);
      });
    }

    // STEP 7: Render bucket segments (Column 2 - single continuous segmented bar)
    bucketSegmentPositions.forEach((pos, index) => {
      // Skip if height is too small (would be invisible)
      if (pos.height < 1) {
        return;
      }

      const segmentRect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      segmentRect.setAttribute("x", String(bucketsX));
      segmentRect.setAttribute("y", String(pos.y));
      segmentRect.setAttribute("width", String(bucketBarWidth));
      segmentRect.setAttribute("height", String(Math.max(1, pos.height))); // Ensure at least 1px
      segmentRect.setAttribute("fill", pos.color);
      segmentRect.setAttribute("fill-opacity", "1.0"); // Full opacity for better visibility
      segmentRect.setAttribute("rx", "8"); // More rounded corners for smoother appearance
      segmentRect.setAttribute("ry", "8");
      segmentRect.setAttribute("stroke", "none"); // No stroke for cleaner look
      segmentRect.setAttribute("data-flow-node", `bucket:${pos.bucket.name}`);
      segmentRect.style.cursor = "pointer";
      segmentRect.addEventListener("click", () =>
        handleNodeClick(`bucket:${pos.bucket.name}`)
      );
      nodesGroup.appendChild(segmentRect);

      // Bucket title on top of the segment (clearly visible)
      const bucketTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
      bucketTitle.setAttribute("x", String(bucketsX + bucketBarWidth / 2));
      bucketTitle.setAttribute("y", String(pos.y + 20));
      bucketTitle.setAttribute("font-size", "15");
      bucketTitle.setAttribute("font-weight", "700");
      bucketTitle.setAttribute("fill", "#ffffff");
      bucketTitle.setAttribute("text-anchor", "middle");
      bucketTitle.setAttribute("dominant-baseline", "hanging");
      // Add text shadow for better visibility
      bucketTitle.setAttribute("stroke", "#000000");
      bucketTitle.setAttribute("stroke-width", "0.6");
      bucketTitle.setAttribute("stroke-opacity", "0.4");
      bucketTitle.textContent = pos.bucket.name;
      bucketTitle.setAttribute("data-flow-node", `bucket:${pos.bucket.name}`);
      bucketTitle.style.cursor = "pointer";
      bucketTitle.addEventListener("click", () =>
        handleNodeClick(`bucket:${pos.bucket.name}`)
      );
      nodesGroup.appendChild(bucketTitle);

      // Bucket amount below the title
      const bucketAmount = document.createElementNS("http://www.w3.org/2000/svg", "text");
      bucketAmount.setAttribute("x", String(bucketsX + bucketBarWidth / 2));
      bucketAmount.setAttribute("y", String(pos.y + 40));
      bucketAmount.setAttribute("font-size", "13");
      bucketAmount.setAttribute("font-weight", "600");
      bucketAmount.setAttribute("fill", "#ffffff");
      bucketAmount.setAttribute("text-anchor", "middle");
      bucketAmount.setAttribute("dominant-baseline", "hanging");
      bucketAmount.setAttribute("stroke", "#000000");
      bucketAmount.setAttribute("stroke-width", "0.6");
      bucketAmount.setAttribute("stroke-opacity", "0.4");
      bucketAmount.textContent = formatCurrency(pos.bucket.total);
      bucketAmount.setAttribute("data-flow-node", `bucket:${pos.bucket.name}`);
      bucketAmount.style.cursor = "pointer";
      bucketAmount.addEventListener("click", () =>
        handleNodeClick(`bucket:${pos.bucket.name}`)
      );
      nodesGroup.appendChild(bucketAmount);
    });

    // STEP 8: Draw flows from each income source → Budget (hub)
    // Use proper Sankey link slotting with cumulative offsets
    if (incomeSourcePositions.length > 0) {
      const budgetHubTop = budgetHubY;
      const budgetHubBottom = budgetHubY + budgetHubHeight;
      
      // Initialize offsets for Budget hub (target node)
      let budgetHubInOffset = 0;
      
      // Sort income sources by position for consistent ordering
      const sortedIncomeSources = [...incomeSourcePositions].sort((a, b) => a.y - b.y);
      
      // Create links with proper slotting
      const incomeLinks: Array<{
        sourcePos: typeof incomeSourcePositions[0];
        sy0: number;
        sy1: number;
        ty0: number;
        ty1: number;
        value: number;
      }> = [];
      
      sortedIncomeSources.forEach((pos) => {
        const linkValue = Math.abs(pos.node.amount);
        // CRITICAL FIX: Use actual node height, not scale function, to match scaled nodes
        const linkThickness = pos.height;
        
        // Source node: use full height of income source
        const sourceY0 = pos.y;
        const sourceY1 = pos.y + pos.height;
        
        // Target node: assign slot using cumulative offset
        const targetY0 = budgetHubTop + budgetHubInOffset;
        const targetY1 = targetY0 + linkThickness;
        budgetHubInOffset += linkThickness;
        
        incomeLinks.push({
          sourcePos: pos,
          sy0: sourceY0,
          sy1: sourceY1,
          ty0: targetY0,
          ty1: targetY1,
          value: linkValue,
        });
      });
      
      // Render links (larger first so smaller ones stay visible on top)
      incomeLinks.sort((a, b) => b.value - a.value);
      incomeLinks.forEach((link) => {
        const linkWidth = link.sy1 - link.sy0; // Ribbon thickness
        const flowPath = drawSankeyFlowPath(
          flowsGroup,
          incomeSourcesX + nodeWidth, // Source node right edge (x1)
          link.sy0, // Top at source (y0)
          link.ty0, // Top at target (y1)
          budgetHubX, // Target node left edge (x0)
          linkWidth, // Ribbon thickness
          incomeColor,
          0.3 // Reduced opacity for cleaner financial dashboard style
        );
        flowPath.setAttribute("data-flow-edge", `${link.sourcePos.node.id}:budget-hub`);
        flowPath.style.cursor = "pointer";
      });
    }

    // STEP 9: Draw flows Budget (hub) → Major Buckets
    // Use proper Sankey link slotting with cumulative offsets
    const budgetHubTop = budgetHubY;
    const budgetHubBottom = budgetHubY + budgetHubHeight;
    
    // Initialize offsets for Budget hub (source node)
    let budgetHubOutOffset = 0;
    
    // Sort buckets by target position for consistent ordering (reduces crossings)
    const sortedBucketPositions = [...bucketSegmentPositions].sort((a, b) => a.y - b.y);
    
    // Create links with proper slotting
    const bucketLinks: Array<{
      bucketPos: typeof bucketSegmentPositions[0];
      sy0: number;
      sy1: number;
      ty0: number;
      ty1: number;
      value: number;
    }> = [];
    
    sortedBucketPositions.forEach((pos) => {
      const linkValue = pos.bucket.total;
      // CRITICAL FIX: Use actual bucket segment height, not scale function, to match scaled nodes
      const linkThickness = pos.height;
      
      // Source node: align with bucket position on budget hub using cumulative value
      // This ensures proper alignment regardless of gaps between buckets
      const budgetHubTop = budgetHubY;
      const budgetHubBottom = budgetHubY + budgetHubHeight;
      
      // Calculate cumulative value of buckets before this one
      const cumulativeValueBefore = sortedBucketPositions
        .filter(p => p.y < pos.y)
        .reduce((sum, p) => sum + p.bucket.total, 0);
      
      // Total value of all buckets
      const totalBucketValue = sortedBucketPositions.reduce((sum, p) => sum + p.bucket.total, 0);
      
      // Map based on cumulative value proportion
      // CRITICAL FIX: Ensure links stay within budget hub bounds (prevent overflow)
      const valueProportion = totalBucketValue > 0 ? cumulativeValueBefore / totalBucketValue : 0;
      let sourceY0 = budgetHubTop + valueProportion * budgetHubHeight;
      let sourceY1 = sourceY0 + linkThickness;
      
      // Clamp to ensure link stays within budget hub bounds (prevent overflow)
      if (sourceY0 < budgetHubTop) {
        sourceY0 = budgetHubTop;
        sourceY1 = sourceY0 + linkThickness;
      }
      if (sourceY1 > budgetHubBottom) {
        sourceY1 = budgetHubBottom;
        sourceY0 = sourceY1 - linkThickness;
      }
      
      // Ensure link doesn't exceed budget hub height
      if (sourceY1 - sourceY0 > budgetHubHeight) {
        sourceY0 = budgetHubTop;
        sourceY1 = budgetHubBottom;
      }
      
      // Track offset for verification
      budgetHubOutOffset += linkThickness;
      
      // Target node: use full height of bucket segment
      const targetY0 = pos.y;
      const targetY1 = pos.y + pos.height;
      
      bucketLinks.push({
        bucketPos: pos,
        sy0: sourceY0,
        sy1: sourceY1,
        ty0: targetY0,
        ty1: targetY1,
        value: linkValue,
      });
    });
    
    // Render links (larger first so smaller ones stay visible on top)
    bucketLinks.sort((a, b) => b.value - a.value);
    bucketLinks.forEach((link) => {
      const linkWidth = link.sy1 - link.sy0; // Ribbon thickness
      const flowFromHub = drawSankeyFlowPath(
        flowsGroup,
        budgetHubX + nodeWidth, // Source node right edge (x1)
        link.sy0, // Top at source (y0)
        link.ty0, // Top at target (y1)
        bucketsX, // Target node left edge (x0)
        linkWidth, // Ribbon thickness
        link.bucketPos.color,
        0.3 // Reduced opacity for cleaner financial dashboard style
      );
      flowFromHub.setAttribute("data-flow-edge", `budget-hub:bucket:${link.bucketPos.bucket.name}`);
      flowFromHub.style.cursor = "pointer";
      flowFromHub.addEventListener("click", () => handleNodeClick(`bucket:${link.bucketPos.bucket.name}`));
    });

    // STEP 10: Calculate detail node positions (Column 3)
    // Group details under their parent buckets, maintaining order
    const detailPositions: Array<{
      y: number;
      height: number;
      centerY: number;
      color: string;
      detail: any;
      bucketName: string;
      bucketCenterY: number;
    }> = [];

    // For each bucket, position its details within the bucket's vertical space
    bucketSegmentPositions.forEach((bucketPos) => {
      const bucket = bucketPos.bucket;
      const bucketColor = bucketPos.color;
      const details = bucket.details;

      if (details.length === 0) return;

      // Distribute details within bucket's vertical space proportionally to their amounts
      const bucketTop = bucketPos.y;
      const bucketBottom = bucketPos.y + bucketPos.height;
      const detailSpace = bucketBottom - bucketTop;
      const totalDetailAmount = details.reduce((sum, d) => sum + d.amount, 0) || 1;
      
      // Calculate proportional heights for each detail
      const detailHeights = details.map((detail) => {
        const proportionalHeight = (detail.amount / totalDetailAmount) * detailSpace;
        const minHeight = Math.max(20, detailSpace * 0.02); // Minimum 2% of bucket height
        return Math.max(minHeight, proportionalHeight);
      });
      
      // Normalize to fit exactly within bucket space
      const totalDetailHeight = detailHeights.reduce((sum, h) => sum + h, 0);
      const detailHeightScale = totalDetailHeight > 0 ? detailSpace / totalDetailHeight : 1;
      const scaledHeights = detailHeights.map((h) => h * detailHeightScale);
      
      // Micro-spacing discipline: increased gap between leaf nodes for "airy" feeling
      const detailGap = Math.min(6, detailSpace * 0.02); // Increased from 4 to 6px
      const totalGaps = (details.length - 1) * detailGap;
      const availableSpace = detailSpace - totalGaps;
      const finalScale = availableSpace / detailSpace;
      
      let currentY = bucketTop;
      details.forEach((detail, idx) => {
        const detailHeight = scaledHeights[idx] * finalScale;
        const centerY = currentY + detailHeight / 2;
        detailPositions.push({
          y: currentY,
          height: detailHeight,
          centerY,
          color: categoryColorMap.get(detail.id) || bucketColor, // Use category color for consistency
          detail,
          bucketName: bucket.name,
          bucketCenterY: bucketPos.centerY,
        });
        currentY += detailHeight + detailGap;
      });
    });

    // Sort detail positions by bucket order, then by Y position (to maintain visual grouping)
    detailPositions.sort((a, b) => {
      const bucketOrderA = bucketSegmentPositions.findIndex(
        (p) => p.bucket.name === a.bucketName
      );
      const bucketOrderB = bucketSegmentPositions.findIndex(
        (p) => p.bucket.name === b.bucketName
      );
      if (bucketOrderA !== bucketOrderB) return bucketOrderA - bucketOrderB;
      return a.y - b.y;
    });

    // STEP 11: Render detail nodes (Column 3) with labels
    detailPositions.forEach((pos, index) => {
      // Detail node
      const detailRect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      detailRect.setAttribute("x", String(detailsX));
      detailRect.setAttribute("y", String(pos.y));
      detailRect.setAttribute("width", String(detailNodeWidth));
      detailRect.setAttribute("height", String(pos.height));
      detailRect.setAttribute("fill", pos.color);
      detailRect.setAttribute("fill-opacity", "0.95"); // High opacity for better visibility
      detailRect.setAttribute("rx", "10"); // More rounded corners for smoother appearance
      detailRect.setAttribute("ry", "10");
      detailRect.setAttribute("data-flow-node", pos.detail.id);
      detailRect.style.cursor = "pointer";
      detailRect.addEventListener("click", () =>
        handleNodeClick(pos.detail.id)
      );
      nodesGroup.appendChild(detailRect);

      // Detail label with overlap prevention
      const labelText = pos.detail.label;
      const labelAmount = formatCurrency(pos.detail.amount);
      const fullLabel = `${labelText} — ${labelAmount}`;

      let labelY = pos.centerY;
      const minLabelSpacing = 16;

      for (let prevIndex = 0; prevIndex < index; prevIndex++) {
        const prevPos = detailPositions[prevIndex];
        const prevLabelY = (prevPos as any).labelY || prevPos.centerY;
        const distance = Math.abs(labelY - prevLabelY);
        if (distance < minLabelSpacing) {
          labelY =
            labelY > prevLabelY
              ? prevLabelY + minLabelSpacing
              : prevLabelY - minLabelSpacing;
        }
      }

      const nodeTop = pos.y + 4;
      const nodeBottom = pos.y + pos.height - 4;
      labelY = Math.max(nodeTop, Math.min(nodeBottom, labelY));
      (pos as any).labelY = labelY;

      const detailLabel = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      detailLabel.setAttribute("x", String(labelX));
      detailLabel.setAttribute("y", String(labelY));
      detailLabel.setAttribute("font-size", isPreview ? "11" : "13");
      detailLabel.setAttribute("font-weight", "600");
      detailLabel.setAttribute("fill", "#1f2933");
      detailLabel.setAttribute("dominant-baseline", "middle");
      detailLabel.textContent = fullLabel;
      detailLabel.setAttribute("data-flow-node", pos.detail.id);
      detailLabel.style.cursor = "pointer";
      detailLabel.addEventListener("click", () =>
        handleNodeClick(pos.detail.id)
      );
      nodesGroup.appendChild(detailLabel);
    });

    // STEP 12: Draw flows from Buckets → Details using proper Sankey link slotting
    // Group details by bucket and use cumulative offsets for proper slotting
    bucketSegmentPositions.forEach((bucketPos) => {
      // Get all details for this bucket, sorted by position
      const bucketDetails = detailPositions
        .filter((dp) => dp.bucketName === bucketPos.bucket.name)
        .sort((a, b) => a.y - b.y);
      
      if (bucketDetails.length === 0) return;
      
      // Initialize offsets for this bucket (source node)
      let bucketOutOffset = 0;
      
      // Create links with proper slotting
      const detailLinks: Array<{
        detailPos: typeof detailPositions[0];
        sy0: number;
        sy1: number;
        ty0: number;
        ty1: number;
        value: number;
      }> = [];
      
      bucketDetails.forEach((detailPos) => {
        const linkValue = detailPos.detail.amount;
        // CRITICAL FIX: Use actual detail node height, not scale function, to match scaled nodes
        const linkThickness = detailPos.height;
        
        // Source node: align with detail position on bucket
        // Map detail position to bucket position proportionally
        const bucketTop = bucketPos.y;
        const bucketBottom = bucketPos.y + bucketPos.height;
        const detailTop = detailPos.y;
        const detailBottom = detailPos.y + detailPos.height;
        
        // Calculate where this detail should connect on the bucket
        const detailStartOffset = bucketDetails
          .filter(d => d.y < detailPos.y)
          .reduce((sum, d) => sum + d.height, 0);
        
        const totalDetailHeight = bucketDetails.reduce((sum, d) => sum + d.height, 0);
        const sourceY0 = bucketTop + (detailStartOffset / totalDetailHeight) * (bucketBottom - bucketTop);
        const sourceY1 = sourceY0 + linkThickness;
        
        // Track offset for verification
        bucketOutOffset += linkThickness;
        
        // Target node: use full height of detail node
        const targetY0 = detailPos.y;
        const targetY1 = detailPos.y + detailPos.height;
        
        detailLinks.push({
          detailPos,
          sy0: sourceY0,
          sy1: sourceY1,
          ty0: targetY0,
          ty1: targetY1,
          value: linkValue,
        });
      });
      
      // Render links (larger first so smaller ones stay visible on top)
      detailLinks.sort((a, b) => b.value - a.value);
      detailLinks.forEach((link) => {
        const linkWidth = link.sy1 - link.sy0; // Ribbon thickness
        const flowPath = drawSankeyFlowPath(
          flowsGroup,
          bucketsX + bucketBarWidth, // Source node right edge (x1)
          link.sy0, // Top at source (y0)
          link.ty0, // Top at target (y1)
          detailsX, // Target node left edge (x0)
          linkWidth, // Ribbon thickness
          link.detailPos.color,
          0.3 // Reduced opacity for cleaner financial dashboard style
        );
        flowPath.setAttribute(
          "data-flow-edge",
          `bucket:${link.detailPos.bucketName}:${link.detailPos.detail.id}`
        );
        flowPath.style.cursor = "pointer";
        flowPath.addEventListener("click", () =>
          handleNodeClick(link.detailPos.detail.id)
        );
      });
    });

    // Add click handlers to main nodes
    // Income sources are already handled in their rendering loop above
    if (budgetHubRect) {
      budgetHubRect.addEventListener("click", () => {
        handleNodeClick("budget-hub");
      });
    }

    // Wrap SVG in pan/zoom container - ensure it uses full available space
    const wrapper = document.createElement("div");
    wrapper.className = "sankey-wrapper";
    wrapper.style.cssText =
      "position: relative; width: 100%; height: 100%; min-height: 100%; overflow: hidden; cursor: grab;";
    wrapper.setAttribute("data-sankey-wrapper", "true");

    // Add pan/zoom controls (only for main map, not preview)
    if (!isPreview) {
      const controls = document.createElement("div");
      controls.style.cssText =
        "position: absolute; top: 10px; right: 10px; z-index: 10; display: flex; gap: 8px;";

      const zoomIn = document.createElement("button");
      zoomIn.textContent = "+";
      zoomIn.className = "btn btn-quiet";
      zoomIn.style.cssText =
        "width: 32px; height: 32px; padding: 0; font-size: 18px;";
      zoomIn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentScale = parseFloat(
          svg.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || "1"
        );
        svg.style.transform = `scale(${Math.min(3, currentScale * 1.2)})`;
      });

      const zoomOut = document.createElement("button");
      zoomOut.textContent = "−";
      zoomOut.className = "btn btn-quiet";
      zoomOut.style.cssText =
        "width: 32px; height: 32px; padding: 0; font-size: 18px;";
      zoomOut.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentScale = parseFloat(
          svg.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || "1"
        );
        svg.style.transform = `scale(${Math.max(0.5, currentScale / 1.2)})`;
      });

      const reset = document.createElement("button");
      reset.textContent = "⌂";
      reset.className = "btn btn-quiet";
      reset.style.cssText =
        "width: 32px; height: 32px; padding: 0; font-size: 14px;";
      reset.addEventListener("click", (e) => {
        e.stopPropagation();
        svg.style.transform = "scale(1) translate(0, 0)";
        svg.style.transformOrigin = "center center";
      });

      controls.appendChild(zoomIn);
      controls.appendChild(zoomOut);
      controls.appendChild(reset);
      wrapper.appendChild(controls);
    }

    // Make SVG transformable
    svg.style.transformOrigin = "center center";
    svg.style.transition = "transform 0.2s ease";

    // Pan functionality
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    wrapper.addEventListener("mousedown", (e) => {
      if (e.button === 0 && !isPreview) {
        // Left mouse button, only for main map
        isPanning = true;
        wrapper.style.cursor = "grabbing";
        startX = e.clientX - currentX;
        startY = e.clientY - currentY;
      }
    });

    wrapper.addEventListener("mousemove", (e) => {
      if (isPanning && !isPreview) {
        e.preventDefault();
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;
        const currentScale = parseFloat(
          svg.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || "1"
        );
        const translateX = currentX / currentScale;
        const translateY = currentY / currentScale;
        svg.style.transform = `scale(${currentScale}) translate(${translateX}px, ${translateY}px)`;
      }
    });

    wrapper.addEventListener("mouseup", () => {
      if (isPanning) {
        isPanning = false;
        wrapper.style.cursor = "grab";
      }
    });

    wrapper.addEventListener("mouseleave", () => {
      if (isPanning) {
        isPanning = false;
        wrapper.style.cursor = "grab";
      }
    });

    // Zoom with mouse wheel (only for main map, and only when hovering over wrapper)
    if (!isPreview) {
      wrapper.addEventListener("wheel", (e) => {
        // Only zoom if mouse is over the wrapper, not when scrolling the page
        if (e.target === wrapper || (e.target as Element).closest('.sankey-wrapper')) {
          e.preventDefault();
          e.stopPropagation();
          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          const currentScale = parseFloat(
            svg.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || "1"
          );
          const newScale = Math.max(0.5, Math.min(3, currentScale * delta));
          svg.style.transform = `scale(${newScale})`;
        }
      }, { passive: false });
    }

    // STEP 13: Final centering and debug visuals
    // Calculate the total height of all nodes (min y to max y + height)
    let minY = Infinity;
    let maxY = -Infinity;
    
    // Check income sources
    incomeSourcePositions.forEach((pos) => {
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + pos.height);
    });
    
    // Check budget hub
    if (budgetHubY !== undefined && budgetHubHeight !== undefined) {
      minY = Math.min(minY, budgetHubY);
      maxY = Math.max(maxY, budgetHubY + budgetHubHeight);
    }
    
    // Check bucket segments
    bucketSegmentPositions.forEach((pos) => {
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + pos.height);
    });
    
    // Check detail nodes
    detailPositions.forEach((pos) => {
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + pos.height);
    });
    
    // Center vertically within layoutHeight (nodes should already fill 85% from earlier scaling)
    const finalHeight = maxY - minY;
    const verticalOffset = (layoutHeight - finalHeight) / 2 - minY;
    
    // Apply transform to rootGroup
    rootGroup.setAttribute(
      "transform",
      `translate(${margin.left}, ${margin.top + verticalOffset})`
    );
    
    // Update viewBox to actual width needed (after all elements are positioned)
    // Calculate the rightmost position (labels + some padding)
    const actualWidth = Math.max(width, labelX + 250); // Add extra space for labels
    svg.setAttribute("viewBox", `0 0 ${actualWidth} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMinYMid meet"); // Align left to show full diagram
    
    wrapper.appendChild(svg);
    container.innerHTML = "";
    container.appendChild(wrapper);
    
    // CRITICAL: Add ResizeObserver to handle dynamic container resizing
    if (!isPreview && typeof ResizeObserver !== 'undefined') {
      // Clean up previous observer if it exists
      if ((container as any).__sankeyResizeObserver) {
        (container as any).__sankeyResizeObserver.disconnect();
      }
      
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: newWidth, height: newHeight } = entry.contentRect;
          // Only re-render if size changed significantly (avoid infinite loops)
          if (Math.abs(newWidth - containerWidth) > 10 || Math.abs(newHeight - containerHeight) > 10) {
            console.log('[Sankey] Container resized, re-rendering:', { newWidth, newHeight, oldWidth: containerWidth, oldHeight: containerHeight });
            // Debounce to avoid too many re-renders
            clearTimeout((container as any).__resizeTimeout);
            (container as any).__resizeTimeout = setTimeout(() => {
              renderSankeyDiagram(container, flowGraph, isPreview);
            }, 100);
          }
        }
      });
      
      resizeObserver.observe(container);
      
      // Store observer reference for cleanup
      (container as any).__sankeyResizeObserver = resizeObserver;
    }
  }

  function computeDrilldownFromLocalData(
    nodeId: string,
    range: { from: string; to: string }
  ) {
    const resultTransactions: any[] = [];
    let nodeLabel = nodeId;
    let totalAmount = 0;

    // Parse node ID to determine type
    if (nodeId === "income" || nodeId.startsWith("income:")) {
      // Income node - show all income transactions
      const rangeIncome = income.filter((i) => withinRange(i.dateISO, range));
      nodeLabel = "Income";
      totalAmount = rangeIncome.reduce((sum, i) => sum + i.amount, 0);
      resultTransactions.push(
        ...rangeIncome.map((i) => ({
          date: i.dateISO,
          description: i.source || "Income",
          merchant: i.source || "",
          category: "Income",
          amount: i.amount,
        }))
      );
    } else if (nodeId === "expenses:all" || nodeId === "expenses") {
      // Expenses aggregate - show all expense transactions
      const rangeTransactions = transactions.filter(
        (t) => withinRange(t.dateISO, range) && t.type === "expense"
      );
      nodeLabel = "Expenses";
      totalAmount = rangeTransactions.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
      );
      rangeTransactions.forEach((tx) => {
        const category = config.categories.find((c) => c.id === tx.categoryId);
        resultTransactions.push({
          date: tx.dateISO,
          description: tx.description || tx.merchant || "",
          merchant: tx.merchant || "",
          category: category?.name || "Uncategorized",
          amount: Math.abs(tx.amount),
        });
      });
    } else if (nodeId.startsWith("expense-category:")) {
      // Expense category - show transactions for that category
      const categoryName = nodeId.split(":")[1];
      const category = config.categories.find((c) => c.name === categoryName);
      const rangeTransactions = transactions.filter(
        (t) =>
          withinRange(t.dateISO, range) &&
          t.type === "expense" &&
          t.categoryId === category?.id
      );
      nodeLabel = categoryName;
      totalAmount = rangeTransactions.reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
      );
      rangeTransactions.forEach((tx) => {
        resultTransactions.push({
          date: tx.dateISO,
          description: tx.description || tx.merchant || "",
          merchant: tx.merchant || "",
          category: categoryName,
          amount: Math.abs(tx.amount),
        });
      });
    } else if (nodeId === "savings:all" || nodeId === "savings") {
      // Savings aggregate - show envelope contributions
      const rangeEnvelopes = envelopeContribs.filter((c) =>
        withinRange(c.dateISO, range)
      );
      nodeLabel = "Savings";
      totalAmount = rangeEnvelopes.reduce((sum, c) => sum + c.amount, 0);
      rangeEnvelopes.forEach((contrib) => {
        const envelope = envelopes.find((e) => e.id === contrib.envelopeId);
        resultTransactions.push({
          date: contrib.dateISO,
          description: `Contribution to ${envelope?.name || "Envelope"}`,
          merchant: "",
          category: "Savings",
          amount: contrib.amount,
        });
      });
    } else if (nodeId === "unallocated") {
      // Unallocated is now part of savings - redirect to savings
      return computeDrilldownFromLocalData("savings:all", range);
    }

    return {
      nodeLabel,
      totalAmount,
      transactions: resultTransactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };
  }

  function handleNodeClick(nodeId: string) {
    // Show drilldown for selected node
    const explainPanel = byId("cashflowExplain");
    const explainTitle = byId("cashflowExplainTitle");
    const explainSub = byId("cashflowExplainSub");
    const explainTable = byId("cashflowExplainTable");
    const clearBtn = byId("btnClearFlowDrill");

    if (explainPanel) explainPanel.hidden = false;
    if (explainTitle) explainTitle.textContent = `Node: ${nodeId}`;
    if (explainSub) explainSub.textContent = "Loading transactions...";
    if (clearBtn) clearBtn.hidden = false;

    // Compute drilldown data from local data
    const range = getRange();
    const drilldownData = computeDrilldownFromLocalData(nodeId, range);

    if (explainTitle)
      explainTitle.textContent = drilldownData.nodeLabel || nodeId;
    if (explainSub)
      explainSub.textContent = `Total: ${formatCurrency(
        drilldownData.totalAmount || 0
      )}`;

    // Render transactions table
    if (explainTable && drilldownData.transactions) {
      const headers = ["Date", "Description", "Merchant", "Category", "Amount"];
      const rows = drilldownData.transactions.map((tx: any) => [
        formatFullDate(tx.date),
        tx.description || "",
        tx.merchant || "",
        tx.category || "",
        formatCurrency(tx.amount),
      ]);
      renderTable("cashflowExplainTable", rows, headers);
    }

    // Highlight selected node
    const nodes = document.querySelectorAll<HTMLElement>("[data-flow-node]");
    nodes.forEach((node) => {
      node.classList.toggle(
        "is-highlighted",
        node.getAttribute("data-flow-node") === nodeId
      );
    });
  }

  function formatMonthLabel(label: string) {
    if (!label.includes("-")) return label;
    const [year, month] = label.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString(undefined, { month: "short" });
  }

  function formatDayLabel(label: string) {
    if (!label.includes("-")) return label;
    const date = new Date(label + "T00:00:00");
    if (Number.isNaN(date.getTime())) return label;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  function formatFullDate(label: string) {
    if (!label.includes("-")) return label;
    const date = new Date(label + "T00:00:00");
    if (Number.isNaN(date.getTime())) return label;
    return date.toLocaleDateString();
  }

  function formatRangeLabel() {
    const preset = config.settings.defaultRangePreset || "month";
    if (preset === "month") return "this month";
    if (preset === "quarter") return "this quarter";
    if (preset === "ytd") return "year to date";
    if (preset === "12m") return "last 12 months";
    if (preset === "all") return "all time";
    if (preset === "custom") {
      const custom = readCustomRange();
      if (custom?.from && custom?.to) return `${custom.from} → ${custom.to}`;
      return "custom range";
    }
    return "current range";
  }

  function setDrilldownCategory(categoryName: string | null) {
    const existing = categoryName
      ? config.categories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase()
        )
      : null;
    drilldownCategoryId = existing?.id || null;
    const btn = byId("btnClearFilter");
    if (btn) btn.hidden = !drilldownCategoryId;
    const pieSubtitle = byId("pieSubtitle");
    const dailySubtitle = byId("dailySpendSub");
    const momSubtitle = byId("momSubtitle");
    if (drilldownCategoryId) {
      const name = existing?.name || categoryName || "Category";
      if (pieSubtitle)
        pieSubtitle.textContent = `Filtered to ${name}. Click to change.`;
      if (dailySubtitle)
        dailySubtitle.textContent = `Daily spending for ${name} (last 30 days)`;
      if (momSubtitle) momSubtitle.textContent = `Month over month for ${name}`;
    } else {
      const showCategories =
        byId<HTMLInputElement>("momStacked")?.checked ?? true;
      if (pieSubtitle)
        pieSubtitle.textContent = "Click a slice to drill into transactions";
      if (dailySubtitle)
        dailySubtitle.textContent = "Last 30 days (expenses only)";
      if (momSubtitle) {
        momSubtitle.textContent = showCategories
          ? `Expenses by category (${formatRangeLabel()})`
          : "Savings (green) = income - expenses - invested";
      }
    }
    renderMoMChart();
    renderDailySpending();
    updateDrilldownButtons();
  }

  function getActiveCategoryName() {
    if (!drilldownCategoryId) return null;
    const category = config.categories.find(
      (c) => c.id === drilldownCategoryId
    );
    return category?.name || null;
  }

  function updateDrilldownButtons() {
    const category = getActiveCategoryName();
    document
      .querySelectorAll<HTMLElement>('[data-drilldown-uses-category="true"]')
      .forEach((btn) => {
        if (category) {
          btn.setAttribute("data-drilldown-category", category);
        } else {
          btn.removeAttribute("data-drilldown-category");
        }
      });
  }

  function countDuplicateTransactions(rows: Transaction[]) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const hash =
        row.hash ||
        hashRow([row.dateISO, row.amount, row.description, row.account]);
      counts.set(hash, (counts.get(hash) || 0) + 1);
    }
    let duplicates = 0;
    for (const count of counts.values()) {
      if (count > 1) duplicates += count - 1;
    }
    return duplicates;
  }

  function on(
    el: HTMLElement | null,
    event: string,
    handler: (e: Event) => void
  ) {
    if (!el) return;
    let set = boundEvents.get(el);
    if (!set) {
      set = new Set();
      boundEvents.set(el, set);
    }
    if (set.has(event)) return;
    el.addEventListener(event, handler);
    set.add(event);
  }

  function setText(id: string, value: string) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function parseCsv(text: string) {
    const clean = text.replace(/^\uFEFF/, "");
    const firstLine = clean.split(/\r?\n/)[0] || "";
    const delimiter = detectDelimiter(firstLine);
    const rows: string[][] = [];
    let current: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < clean.length; i += 1) {
      const char = clean[i];
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        current.push(field.trim());
        field = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (field.length || current.length) {
          current.push(field.trim());
          rows.push(current);
        }
        current = [];
        field = "";
      } else {
        field += char;
      }
    }
    if (field.length || current.length) {
      current.push(field.trim());
      rows.push(current);
    }
    const headers = rows.shift() || [];
    const cleanRows = rows.filter((row) => row.some((c) => c.trim() !== ""));
    return { headers, rows: cleanRows };
  }

  function detectDelimiter(line: string) {
    const counts = {
      ",": (line.match(/,/g) || []).length,
      ";": (line.match(/;/g) || []).length,
      "\t": (line.match(/\t/g) || []).length,
    };
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return (best && best[1] > 0 ? best[0] : ",") as "," | ";" | "\t";
  }

  function detectAndDisplayFormats(headers: string[], rows: string[][]) {
    // Detect date format
    let detectedDateFormat = "auto";
    let detectedNumberFormat = "auto";
    let detectedCurrency = "";

    // Find date and amount columns
    const dateColIdx = headers.findIndex((h) => /date/i.test(h));
    const amountColIdx = headers.findIndex((h) =>
      /coût|amount|amt|value|cost|prix|montant/i.test(h)
    );

    // Analyze date format from sample rows
    if (dateColIdx >= 0) {
      for (const row of rows.slice(0, 10)) {
        const dateVal = row[dateColIdx]?.trim();
        if (!dateVal) continue;

        if (/\d{4}-\d{2}-\d{2}/.test(dateVal)) {
          detectedDateFormat = "iso";
          break;
        } else if (/[A-Za-z]+\s+\d+,\s+\d{4}/.test(dateVal)) {
          detectedDateFormat = "long";
          break;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateVal)) {
          // Try to determine if US or EU
          const parts = dateVal.split("/");
          if (parts.length === 3 && parseInt(parts[0]) > 12) {
            detectedDateFormat = "eu";
          } else {
            detectedDateFormat = "us";
          }
          break;
        }
      }
    }

    // Analyze number format and currency from sample rows
    if (amountColIdx >= 0) {
      for (const row of rows.slice(0, 10)) {
        const amountVal = row[amountColIdx]?.trim();
        if (!amountVal) continue;

        // Detect currency symbol
        const currencyMatch = amountVal.match(/([A-Z]{2,3}\$|\$|[€£¥])/);
        if (currencyMatch && !detectedCurrency) {
          detectedCurrency = currencyMatch[1];
        }

        // Detect number format
        if (
          /^\d{1,3}(\.\d{3})*,\d{2}$/.test(amountVal.replace(/[^0-9.,]/g, ""))
        ) {
          detectedNumberFormat = "eu";
        } else if (
          /^\d{1,3}('\d{3})*\.\d{2}$/.test(amountVal.replace(/[^0-9'.]/g, ""))
        ) {
          detectedNumberFormat = "swiss";
        } else if (
          /^\d{1,3}(,\d{3})*\.\d{2}$/.test(amountVal.replace(/[^0-9.,]/g, ""))
        ) {
          detectedNumberFormat = "us";
        }
      }
    }

    // Update UI with detected formats
    const dateFormatSelect = byId<HTMLSelectElement>("dateFormat");
    const numberFormatSelect = byId<HTMLSelectElement>("numberFormat");
    const currencySymbolInput = byId<HTMLInputElement>("currencySymbol");
    const detectedDateFormatEl = byId("detectedDateFormat");
    const detectedNumberFormatEl = byId("detectedNumberFormat");

    if (dateFormatSelect) {
      dateFormatSelect.value = detectedDateFormat;
    }
    if (numberFormatSelect) {
      numberFormatSelect.value = detectedNumberFormat;
    }
    if (currencySymbolInput) {
      currencySymbolInput.value = detectedCurrency;
    }
    if (detectedDateFormatEl) {
      const formatNames: Record<string, string> = {
        auto: "Auto-detect",
        iso: "ISO (YYYY-MM-DD)",
        us: "US (MM/DD/YYYY)",
        eu: "European (DD/MM/YYYY)",
        long: "Long (November 2, 2025)",
      };
      detectedDateFormatEl.textContent = `Detected: ${
        formatNames[detectedDateFormat] || "Auto-detect"
      }`;
    }
    if (detectedNumberFormatEl) {
      const formatNames: Record<string, string> = {
        auto: "Auto-detect",
        us: "US (1,234.56)",
        eu: "European (1.234,56)",
        swiss: "Swiss (1'234.56)",
      };
      detectedNumberFormatEl.textContent = `Detected: ${
        formatNames[detectedNumberFormat] || "Auto-detect"
      }`;
    }

    // Update format settings
    csvFormatSettings = {
      dateFormat: detectedDateFormat,
      numberFormat: detectedNumberFormat,
      currencySymbol: detectedCurrency,
    };
  }

  function guessMapping(field: string, headers: string[]) {
    const map: Record<string, string[]> = {
      date: [
        // English
        "date",
        "posted",
        "transaction date",
        "transaction_date",
        // French
        "date",
        "date de transaction",
        "date_transaction",
        // Spanish
        "fecha",
        "fecha_transaccion",
        // German
        "datum",
        "transaktionsdatum",
      ],
      amount: [
        // English
        "amount",
        "amt",
        "value",
        "cost",
        "price",
        // French
        "coût",
        "prix",
        "montant",
        "somme",
        // Spanish
        "cantidad",
        "importe",
        "monto",
        // German
        "betrag",
        "summe",
      ],
      description: [
        // English
        "description",
        "memo",
        "details",
        "merchant",
        "name",
        "note",
        // French
        "nom",
        "libellé",
        "description",
        "détails",
        // Spanish
        "descripción",
        "descripcion",
        "concepto",
        // German
        "beschreibung",
        "bezeichnung",
      ],
      category: [
        // English
        "category",
        "type",
        "tag",
        // French
        "catégorie",
        "categorie",
        "select",
        // Spanish
        "categoría",
        "categoria",
        // German
        "kategorie",
      ],
      account: [
        // English
        "account",
        "account_name",
        // French
        "compte",
        // Spanish
        "cuenta",
        // German
        "konto",
      ],
      currency: ["currency", "ccy", "devise", "moneda", "währung"],
      type: ["type", "tipo", "typ"],
      source: ["source", "origen", "quelle"],
    };
    const options = map[field] || [];
    const headerLower = headers.map((h) =>
      h
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    );
    for (const opt of options) {
      const normalized = opt.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const idx = headerLower.indexOf(normalized);
      if (idx >= 0) return headers[idx];
    }
    return "";
  }

  function normalizeType(value?: string) {
    if (!value) return null;
    const v = value.toLowerCase().trim();
    if (v.startsWith("inc")) return "income";
    if (v.startsWith("inv")) return "investment";
    if (v.startsWith("trans")) return "transfer";
    return "expense";
  }

  function parseAmount(value?: string): number {
    if (!value || !value.trim()) return NaN;
    let amountStr = value.trim();
    const format = csvFormatSettings.numberFormat;
    const currencySymbol = csvFormatSettings.currencySymbol;

    // Remove currency symbol (explicit or auto-detect)
    if (currencySymbol) {
      amountStr = amountStr.replace(
        new RegExp(`^${escapeRegex(currencySymbol)}`, "i"),
        ""
      );
    } else {
      // Auto-detect: remove common currency prefixes/suffixes
      amountStr = amountStr.replace(/^[A-Z]{2,3}\$/i, ""); // CA$, USD$, EUR$
      amountStr = amountStr.replace(/^\$/, ""); // $
      amountStr = amountStr.replace(/\s*[€£¥]\s*$/, ""); // €, £, ¥ (suffix)
    }
    amountStr = amountStr.trim();

    // Handle different number formats
    if (
      format === "eu" ||
      (format === "auto" && /^\d{1,3}(\.\d{3})*,\d{2}$/.test(amountStr))
    ) {
      // European: 1.234,56 (dot for thousands, comma for decimal)
      amountStr = amountStr.replace(/\./g, "").replace(",", ".");
    } else if (
      format === "swiss" ||
      (format === "auto" && /^\d{1,3}('\d{3})*\.\d{2}$/.test(amountStr))
    ) {
      // Swiss: 1'234.56 (apostrophe for thousands, dot for decimal)
      amountStr = amountStr.replace(/'/g, "");
    } else {
      // US format: 1,234.56 (comma for thousands, dot for decimal)
      // Remove thousands separators (commas)
      amountStr = amountStr.replace(/,/g, "");
    }

    // Remove any remaining spaces
    amountStr = amountStr.replace(/\s+/g, "");

    return Number(amountStr);
  }

  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizeAmount(amount: number, type: TxType) {
    if (type === "income") return Math.abs(amount);
    return -Math.abs(amount);
  }

  function guessIncomeType(category?: string, description?: string) {
    const label = `${category || ""} ${description || ""}`.toLowerCase();
    if (
      /(income|salary|paycheck|pay cheque|payroll|bonus|interest|refund|rebate|dividend|deposit|credit)/.test(
        label
      )
    ) {
      return "income" as TxType;
    }
    return null;
  }

  function parseDate(value?: string) {
    if (!value || !value.trim()) return "";
    const trimmed = value.trim();
    const format = csvFormatSettings.dateFormat;

    // ISO format: YYYY-MM-DD
    if (
      format === "iso" ||
      (format === "auto" && /\d{4}-\d{2}-\d{2}/.test(trimmed))
    ) {
      if (/\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    }

    // Long format: "November 2, 2025" or "2 November 2025"
    if (
      format === "long" ||
      (format === "auto" && /[A-Za-z]+\s+\d+,\s+\d{4}/.test(trimmed))
    ) {
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }

    // US format: MM/DD/YYYY
    if (
      format === "us" ||
      (format === "auto" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed))
    ) {
      const parts = trimmed.split("/");
      if (parts.length === 3) {
        const month = parts[0].padStart(2, "0");
        const day = parts[1].padStart(2, "0");
        const year = parts[2];
        // Validate month/day ranges
        if (parseInt(month) <= 12 && parseInt(day) <= 31) {
          return `${year}-${month}-${day}`;
        }
      }
    }

    // European format: DD/MM/YYYY
    if (
      format === "eu" ||
      (format === "auto" &&
        /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed) &&
        !format.startsWith("us"))
    ) {
      const parts = trimmed.split("/");
      if (parts.length === 3) {
        const day = parts[0].padStart(2, "0");
        const month = parts[1].padStart(2, "0");
        const year = parts[2];
        // Validate: if first part > 12, it's likely DD/MM
        if (
          parseInt(parts[0]) > 12 ||
          (parseInt(parts[1]) <= 12 && parseInt(parts[0]) <= 31)
        ) {
          return `${year}-${month}-${day}`;
        }
      }
    }

    // Fallback: Try Date constructor (handles various formats)
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    return "";
  }

  function toISO(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  function withinRange(
    dateISO: string,
    range: { from: string | null; to: string | null }
  ) {
    if (range.from && dateISO < range.from) return false;
    if (range.to && dateISO > range.to) return false;
    return true;
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: config.settings.currency || "USD",
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  function formatPercent(value: number) {
    if (!Number.isFinite(value)) return "--";
    return `${Math.round(value * 100)}%`;
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function hashRow(parts: Array<string | number>) {
    return parts.join("|").toLowerCase();
  }

  function monthsBetween(a: Date, b: Date) {
    const months =
      (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    return Math.max(1, months);
  }

  function escapeHtml(str: string) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Consistent color mapping for categories across all visualizations
  const categoryColorMap: Record<string, string> = {
    Rent: "#e5484d",
    Groceries: "#8b5cf6",
    "Eating out": "#12b981",
    "Alcohol/going out": "#0ea5e9",
    Entertainment: "#f97316",
    Transportation: "#1f6feb",
    Amazon: "#f4b740",
    Other: "#64748b",
    Others: "#64748b",
    Uncategorized: "#475569",
    Income: "#12b981",
    Expenses: "#e5484d",
    Investments: "#1f6feb",
    Savings: "#12b981",
  };

  function colorFor(label: string, idx: number) {
    const key = label.trim();
    if (config.settings.categoryColors[key])
      return config.settings.categoryColors[key];
    if (categoryColorMap[key]) return categoryColorMap[key];
    const hash = hashString(key || String(idx));
    const hue = hash % 360;
    const sat = 62;
    const light = 54;
    return `hsl(${hue} ${sat}% ${light}%)`;
  }

  function hashString(value: string) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function describeArc(
    x: number,
    y: number,
    r: number,
    startAngle: number,
    endAngle: number
  ) {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      "L",
      x,
      y,
      "Z",
    ].join(" ");
  }

  function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  }

  function downloadCsv(filename: string, rows: Array<(string | number)[]>) {
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getCategoryIdByName(name: string, type: TxType) {
    const cleaned = name.trim().replace(/\s+/g, " ");
    const finalName = cleaned || "Uncategorized";
    const existing = config.categories.find(
      (c) => c.name.toLowerCase() === finalName.toLowerCase()
    );
    if (existing) return existing.id;
    const id = uid();
    config.categories.push({ id, name: finalName, type });
    saveConfig();
    return id;
  }

  function isCategory(categoryId: string, name: string) {
    const cat = config.categories.find((c) => c.id === categoryId);
    return cat?.name.toLowerCase() === name.toLowerCase();
  }

  function loadConfig(): Config {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Config;
        if (!parsed.settings.rangePresetUserSet) {
          parsed.settings.defaultRangePreset = "month";
          parsed.settings.rangePresetUserSet = false;
          localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed));
        }
        if (!parsed.settings.manualIncomeSources) {
          parsed.settings.manualIncomeSources = [
            "Salary",
            "Freelance",
            "Investment",
            "Gift",
          ];
          localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed));
        }
        if (!parsed.settings.location) {
          parsed.settings.location = {};
          localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed));
        }
        return parsed;
      } catch {
        localStorage.removeItem(CONFIG_KEY);
      }
    }
    const defaults: Config = {
      categories: defaultCategories(),
      rules: [],
      budgets: {},
      settings: {
        currency: "USD",
        monthStartDay: 1,
        defaultRangePreset: "month",
        rangePresetUserSet: false,
        netWorthManual: 0,
        manualIncomeSources: ["Salary", "Freelance", "Investment", "Gift"],
        categoryColors: {},
        navCollapsed: false,
        accounts: [
          {
            id: uid(),
            name: "Bank",
            kind: "bank",
            createdAt: Date.now(),
            currency: "USD",
          },
          {
            id: uid(),
            name: "Cash",
            kind: "cash",
            createdAt: Date.now(),
            currency: "USD",
          },
        ],
        housing: "rent",
        rentBudget: null,
        rentMode: "monthly",
        rentPayDay: 1,
        location: {},
      },
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(defaults));
    return defaults;
  }

  function saveConfig() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  return { 
    init,
    analyzeMerchants, // Expose analyzeMerchants from runtime
    getStore: () => store, // Expose store for milestones
    transactions: () => transactions,
    income: () => income
  };
}

type Mapping = Record<string, { column?: string | null; fixed?: string }>;

function defaultCategories(): Category[] {
  return [
    { id: "cat-rent", name: "Rent", type: "expense" },
    { id: "cat-groceries", name: "Groceries", type: "expense" },
    { id: "cat-transport", name: "Transport", type: "expense" },
    { id: "cat-dining", name: "Dining", type: "expense" },
    { id: "cat-subscriptions", name: "Subscriptions", type: "expense" },
    { id: "cat-utilities", name: "Utilities", type: "expense" },
    { id: "cat-health", name: "Health", type: "expense" },
    { id: "cat-income", name: "Income", type: "income" },
    { id: "cat-invest", name: "Investments", type: "investment" },
    { id: "cat-transfer", name: "Transfers", type: "transfer" },
    { id: "cat-uncat", name: "Uncategorized", type: "expense" },
  ];
}

function createStore() {
  let dbPromise: Promise<IDBDatabase | null> | null = null;
  let useFallback = false;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (!("indexedDB" in window)) {
        useFallback = true;
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("transactions"))
          db.createObjectStore("transactions", { keyPath: "id" });
        if (!db.objectStoreNames.contains("income"))
          db.createObjectStore("income", { keyPath: "id" });
        if (!db.objectStoreNames.contains("envelopes"))
          db.createObjectStore("envelopes", { keyPath: "id" });
        if (!db.objectStoreNames.contains("envelopeContribs")) {
          const store = db.createObjectStore("envelopeContribs", {
            keyPath: "id",
          });
          store.createIndex("envelopeId", "envelopeId", { unique: false });
        }
        if (!db.objectStoreNames.contains("meta"))
          db.createObjectStore("meta", { keyPath: "key" });
        if (!db.objectStoreNames.contains("milestones"))
          db.createObjectStore("milestones", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        useFallback = true;
        resolve(null);
      };
    });
    return dbPromise;
  }

  async function getAll(storeName: StoreName) {
    if (useFallback) return fallbackGetAll(storeName);
    const db = await openDB();
    if (!db) return fallbackGetAll(storeName);
    return new Promise<any[]>((resolve) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async function put(storeName: StoreName, value: any) {
    if (useFallback) return fallbackPut(storeName, value);
    const db = await openDB();
    if (!db) return fallbackPut(storeName, value);
    return new Promise<void>((resolve) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async function remove(storeName: StoreName, id: string) {
    if (useFallback) return fallbackRemove(storeName, id);
    const db = await openDB();
    if (!db) return fallbackRemove(storeName, id);
    return new Promise<void>((resolve) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async function bulkPut(storeName: StoreName, values: any[]) {
    if (useFallback) return fallbackBulkPut(storeName, values);
    const db = await openDB();
    if (!db) return fallbackBulkPut(storeName, values);
    return new Promise<void>((resolve) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      values.forEach((value) => store.put(value));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async function clearAll() {
    if (useFallback) return fallbackClear();
    const db = await openDB();
    if (!db) return fallbackClear();
    return new Promise<void>((resolve) => {
      const tx = db.transaction(
        ["transactions", "income", "envelopes", "envelopeContribs", "meta"],
        "readwrite"
      );
      tx.objectStore("transactions").clear();
      tx.objectStore("income").clear();
      tx.objectStore("envelopes").clear();
      tx.objectStore("envelopeContribs").clear();
      tx.objectStore("meta").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  function fallbackGetAll(storeName: StoreName) {
    const raw = localStorage.getItem(`${FALLBACK_PREFIX}${storeName}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function fallbackPut(storeName: StoreName, value: any) {
    const list = fallbackGetAll(storeName);
    const idx = list.findIndex((row: any) => row.id === value.id);
    if (idx === -1) list.unshift(value);
    else list[idx] = value;
    localStorage.setItem(
      `${FALLBACK_PREFIX}${storeName}`,
      JSON.stringify(list)
    );
  }

  function fallbackRemove(storeName: StoreName, id: string) {
    const list = fallbackGetAll(storeName).filter((row: any) => row.id !== id);
    localStorage.setItem(
      `${FALLBACK_PREFIX}${storeName}`,
      JSON.stringify(list)
    );
  }

  function fallbackBulkPut(storeName: StoreName, values: any[]) {
    const list = values.concat(fallbackGetAll(storeName));
    localStorage.setItem(
      `${FALLBACK_PREFIX}${storeName}`,
      JSON.stringify(list)
    );
  }

  function fallbackClear() {
    ["transactions", "income", "envelopes", "envelopeContribs", "meta", "milestones"].forEach(
      (key) => {
        localStorage.removeItem(`${FALLBACK_PREFIX}${key}`);
      }
    );
  }

  return { getAll, put, remove, bulkPut, clearAll };
}

// Initialize window.budgetsimpleRuntime with safe fallbacks immediately
// This ensures React components can access it even if initAppRuntime hasn't run yet
if (typeof window !== 'undefined') {
  (window as any).budgetsimpleRuntime = (window as any).budgetsimpleRuntime || {
    analyzeMerchants: () => {
      // Try to get from runtime instance if available
      if (runtimeInstance?.analyzeMerchants) {
        return runtimeInstance.analyzeMerchants();
      }
      // Fallback: return empty result
      return { merchants: [], subscriptions: [] };
    },
    transactions: () => [],
    income: () => [],
    config: () => ({ categories: [], rules: [], budgets: {}, settings: {} }),
    getStore: () => null
  };
}
