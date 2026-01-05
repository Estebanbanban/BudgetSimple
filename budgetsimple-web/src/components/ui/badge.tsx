"use client";

import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "info";

function toneStyle(tone: BadgeTone): React.CSSProperties | undefined {
  if (tone === "success")
    return {
      borderColor: "rgba(18, 185, 129, 0.28)",
      background: "rgba(18, 185, 129, 0.10)",
      color: "rgba(6, 95, 70, 0.96)",
    };
  if (tone === "warning")
    return {
      borderColor: "rgba(244, 183, 64, 0.28)",
      background: "rgba(244, 183, 64, 0.10)",
      color: "rgba(146, 64, 14, 0.96)",
    };
  if (tone === "info")
    return {
      borderColor: "rgba(31, 111, 235, 0.24)",
      background: "rgba(31, 111, 235, 0.08)",
      color: "rgba(31, 111, 235, 0.96)",
    };
  return undefined;
}

export function Badge({
  tone = "neutral",
  dot,
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`badge ${className}`.trim()} style={toneStyle(tone)} {...props}>
      {dot ? <span className="badge-dot" /> : null}
      {children}
    </span>
  );
}

