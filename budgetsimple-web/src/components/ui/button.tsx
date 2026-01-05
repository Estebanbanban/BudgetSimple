"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "default" | "quiet" | "accent" | "danger";

function variantClass(variant: ButtonVariant) {
  if (variant === "quiet") return "btn btn-quiet";
  if (variant === "accent") return "btn btn-accent";
  if (variant === "danger") return "btn btn-danger";
  return "btn";
}

export function Button({
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button {...props} className={`${variantClass(variant)} ${className}`.trim()} />;
}

export function ButtonLink({
  href,
  children,
  variant = "default",
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  // Internal routes use Next Link; external fall back to <a>.
  const isInternal = href.startsWith("/");
  const klass = `${variantClass(variant)} ${className}`.trim();

  if (isInternal) {
    return (
      <Link href={href} className={klass} {...(props as any)} style={{ textDecoration: "none" }}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={klass} {...props} style={{ textDecoration: "none" }}>
      {children}
    </a>
  );
}

