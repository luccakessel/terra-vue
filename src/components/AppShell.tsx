/**
 * Layout de la aplicación: navegación de las 4 secciones + guarda de sesión.
 * - Escritorio/tablet horizontal: sidebar fija.
 * - Tablet vertical / celular: barra inferior fija (cómoda con una mano).
 */

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, Bell, LayoutDashboard, LogOut, Settings, Sprout } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const SECCIONES = [
  { to: "/", etiqueta: "Dashboard", icono: LayoutDashboard },
  { to: "/alertas", etiqueta: "Alertas", icono: Bell },
  { to: "/configuracion", etiqueta: "Configuración", icono: Settings },
  { to: "/reportes", etiqueta: "Reportes", icono: BarChart3 },
] as const;

export function AppShell({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { autenticado, usuario, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Guarda de sesión: el token vive en memoria, así que si no hay sesión → login.
  useEffect(() => {
    if (!autenticado) navigate({ to: "/login" });
  }, [autenticado, navigate]);

  if (!autenticado) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Redirigiendo al inicio de sesión…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Sidebar (md+) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <Sprout className="size-6 text-sidebar-primary" aria-hidden />
          <span className="font-display text-xl font-semibold">GreenSense</span>
        </Link>

        <nav className="mt-4 flex flex-col gap-1" aria-label="Secciones">
          {SECCIONES.map(({ to, etiqueta, icono: Icono }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent"
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <Icono className="size-4" aria-hidden />
              {etiqueta}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-sidebar-border pt-3">
          <p className="px-3 text-xs text-sidebar-foreground/70">Sesión</p>
          <p className="px-3 text-sm font-medium capitalize">{usuario?.nombre}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" aria-hidden /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabecera móvil */}
        <header className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 md:hidden">
          <span className="flex items-center gap-2 font-display text-lg font-semibold">
            <Sprout className="size-5 text-primary" aria-hidden /> GreenSense
          </span>
          <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={logout}>
            <LogOut className="size-4" aria-hidden />
          </Button>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10">
          <h1 className="font-display text-2xl font-semibold md:text-3xl">{titulo}</h1>
          <div className="mt-5">{children}</div>
        </main>

        {/* Navegación inferior (móvil / tablet vertical) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-card md:hidden"
          aria-label="Secciones"
        >
          {SECCIONES.map(({ to, etiqueta, icono: Icono }) => {
            const activo = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  activo ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icono className="size-5" aria-hidden />
                {etiqueta}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
