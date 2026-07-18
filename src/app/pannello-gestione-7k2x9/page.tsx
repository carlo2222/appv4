"use client";

import { useEffect, useState } from "react";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";

const ADMIN_TOKEN_KEY = "concorsopro:admin-token";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(window.localStorage.getItem(ADMIN_TOKEN_KEY));
    setReady(true);
  }, []);

  function handleSuccess(newToken: string) {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, newToken);
    setToken(newToken);
  }

  function handleLogout() {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  }

  if (!ready) return null;

  return token ? (
    <AdminDashboard token={token} onLogout={handleLogout} />
  ) : (
    <AdminLogin onSuccess={handleSuccess} />
  );
}
