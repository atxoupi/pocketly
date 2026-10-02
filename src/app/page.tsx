"use client";

import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function Home() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border border-surface-muted bg-surface p-6">
        <h1 className="mb-6 text-center text-lg font-semibold text-accent">POCKETLY</h1>
        <div className="mb-4 flex gap-2 text-sm">
          <button
            onClick={() => setTab("login")}
            className={tab === "login" ? "text-accent" : "text-text-secondary"}
          >
            Iniciar sesión
          </button>
          <span className="text-text-secondary">/</span>
          <button
            onClick={() => setTab("register")}
            className={tab === "register" ? "text-accent" : "text-text-secondary"}
          >
            Crear cuenta
          </button>
        </div>
        {tab === "login" ? <LoginForm /> : <RegisterForm />}
      </div>
    </main>
  );
}
