"use client";

import { useEffect } from "react";
import { initAppRuntime } from "@/lib/runtime";

export default function AppRuntime() {
  useEffect(() => {
    initAppRuntime();
  }, []);

  return null;
}
