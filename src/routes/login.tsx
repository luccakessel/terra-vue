/**
 * Pantalla de inicio de sesión.
 * El token que devuelve el backend se guarda sólo en memoria (AuthContext).
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { mensajeDeError } from "@/services/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión · GreenSense" },
      {
        name: "description",
        content: "Accedé al panel de monitoreo y control de tus invernaderos GreenSense.",
      },
      { property: "og:title", content: "Iniciar sesión · GreenSense" },
      { property: "og:description", content: "Acceso al panel de monitoreo de invernaderos." },
    ],
  }),
  component: Login,
});

function Login() {
  const { login, autenticado } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("productor@greensense.ar");
  const [password, setPassword] = useState("demo1234");
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión activa no tiene sentido mostrar el formulario.
  useEffect(() => {
    if (autenticado) navigate({ to: "/" });
  }, [autenticado, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await login(email, password);
      toast.success("Bienvenido a GreenSense");
      navigate({ to: "/" });
    } catch (error) {
      toast.error(mensajeDeError(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-sm">
        <div className="flex items-center gap-2">
          <Sprout className="size-7 text-primary" aria-hidden />
          <span className="font-display text-2xl font-semibold">GreenSense</span>
        </div>
        <h1 className="mt-5 font-display text-xl font-semibold">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitoreo y control inteligente de invernaderos.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="mt-2" disabled={enviando}>
            {enviando ? "Verificando…" : "Ingresar"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Modo demo: cualquier correo válido con una contraseña de 4+ caracteres inicia sesión.
        </p>
      </div>
    </main>
  );
}
