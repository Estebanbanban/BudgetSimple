"use client";

import type { ReactNode } from "react";

export function KebabMenu({
  label = "More actions",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <details className="menu">
      <summary className="icon-btn icon-btn-sm" aria-label={label} title={label}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
        </svg>
      </summary>
      <div className="menu-popover">{children}</div>
    </details>
  );
}

export function MenuItem({
  children,
  danger,
  ...props
}: {
  children: ReactNode;
  danger?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`menu-item ${danger ? "menu-item-danger" : ""}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

