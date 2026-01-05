export type ToastVariant = "neutral" | "success" | "warning" | "danger";

const VARIANT_CLASS: Record<ToastVariant, string> = {
  neutral: "",
  success: "toast-success",
  warning: "toast-warning",
  danger: "toast-danger",
};

/**
 * Minimal toast helper that targets the existing #toast element in AppShell.
 * Keeps scope small (no deps) and matches the app's design system.
 */
let toastTimer: number | undefined;

export function showToast(message: string, variant: ToastVariant = "neutral", ttlMs = 1600) {
  if (typeof window === "undefined") return;
  const el = document.getElementById("toast");
  if (!el) return;

  // Reset any previous state
  el.classList.remove("toast-success", "toast-warning", "toast-danger");
  const klass = VARIANT_CLASS[variant];
  if (klass) el.classList.add(klass);

  el.textContent = message;
  el.removeAttribute("hidden");

  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.setAttribute("hidden", "true");
  }, ttlMs);
}

