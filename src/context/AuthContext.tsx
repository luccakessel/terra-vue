/**
 * Contexto de autenticación.
 * El token se mantiene SOLO en memoria (requisito del proyecto): al refrescar
 * la página el usuario vuelve a loguearse. También se inyecta en el cliente
 * axios para que todas las llamadas viajen autenticadas.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { api, setAuthToken } from "@/services/api";

interface Usuario {
  nombre: string;
  email: string;
}

interface AuthContextValue {
  usuario: Usuario | null;
  autenticado: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const { token, nombre } = await api.login(email, password);
    setAuthToken(token); // token en memoria dentro del módulo api
    setUsuario({ nombre, email });
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUsuario(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ usuario, autenticado: usuario !== null, login, logout }),
    [usuario, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
