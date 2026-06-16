import React, { useState } from "react";
import { useFirebase } from "./FirebaseProvider";
import { motion } from "motion/react";
import { Mail, Lock, User, LogIn, LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";

interface LoginViewProps {
  onNavigate: (path: string) => void;
}

export function LoginView({ onNavigate }: LoginViewProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, user, isAdmin } = useFirebase();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isRegister && !name.trim()) {
      setError("Por favor, ingresa tu nombre");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        await signUpWithEmail(email, password, name.trim());
      } else {
        await signInWithEmail(email, password);
      }
      onNavigate("/");
    } catch (err: any) {
      console.error(err);
      let localizedError = "Ocurrió un error inesperado. Por favor, verifica tus datos.";
      if (err?.code === "auth/email-already-in-use") {
        localizedError = "Este correo electrónico ya está registrado.";
      } else if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found") {
        localizedError = "Correo electrónico o contraseña incorrectos.";
      } else if (err?.code === "auth/weak-password") {
        localizedError = "La contraseña es muy débil.";
      } else if (err?.code === "auth/invalid-email") {
        localizedError = "El correo electrónico ingresado no es válido.";
      }
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onNavigate("/");
    } catch (err: any) {
      console.error(err);
      setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-4">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-900 rounded-lg p-8 shadow-sm relative overflow-hidden"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white mb-1.5 uppercase font-sans">
            {isRegister ? "Crear una Cuenta" : "Iniciar Sesión"}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            {isRegister 
              ? "Regístrate para comenzar a gestionar tus propiedades de diseño." 
              : "Ingresa tus credenciales para acceder a la base de datos."}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded text-rose-500 text-xs text-center font-bold"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                required
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-bold uppercase tracking-wider text-[10px] py-3 rounded transition-all disabled:opacity-50 mt-6 shadow-xs"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? "Registrarse" : "Ingresar"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200 dark:border-neutral-900"></div>
          </div>
          <span className="relative bg-white dark:bg-[#111111] px-2.5 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono">Continuar</span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-[#171717] dark:hover:bg-[#222] border border-neutral-200 dark:border-neutral-850 text-neutral-800 dark:text-neutral-300 font-bold uppercase tracking-wider text-[9px] py-3 rounded transition-all disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.86-4.53-6.16-4.53z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Google Cloud Session
        </button>

        <div className="text-center mt-5">
          <p className="text-xs text-neutral-400">
            {isRegister ? "¿Ya dispones de clave?" : "¿No tienes cuenta habilitada?"}{" "}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-neutral-950 dark:text-neutral-100 hover:underline font-bold ml-1 transition-all"
            >
              {isRegister ? "Inicia Sesión" : "Crear Acceso"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
