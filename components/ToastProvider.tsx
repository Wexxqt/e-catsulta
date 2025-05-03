"use client";

import { Toaster } from "@/components/ui/toast";
import React from "react";

interface ToastProviderProps {
  children: React.ReactNode;
}

export default function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
