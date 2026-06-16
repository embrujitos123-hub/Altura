/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFirebase } from "./components/FirebaseProvider";
import { LoginView } from "./components/LoginView";
import { AdminView } from "./components/AdminView";
import { PropertiesDashboard } from "./components/PropertiesDashboard";
import { Zap } from "lucide-react";

export default function App() {
  const { user, loading, isAdmin } = useFirebase();
  const [route, setRoute] = useState(window.location.pathname);

  // Client-side lightweight history routing synchronization
  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState(null, "", path);
    setRoute(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0c0c] flex flex-col items-center justify-center gap-4">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="w-10 h-10 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full"
        />
        <p className="text-neutral-500 dark:text-neutral-400 text-[10px] font-mono tracking-widest uppercase">Cargando Altura...</p>
      </div>
    );
  }

  // Active user is required for accessing dashboard features
  if (!user) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0c0c] text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle background luxury mesh lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1b1b1b_1px,transparent_1px),linear-gradient(to_bottom,#1b1b1b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40 z-0" />
        
        <div className="w-full max-w-md relative z-10 space-y-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-display font-black tracking-widest text-neutral-950 dark:text-white uppercase">ALTURA</h1>
            <p className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase font-bold mt-1">PROPIEDADES CON VALOR, VISIÓN Y PRESENCIA</p>
          </div>
          <LoginView onNavigate={navigate} />
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={route}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-screen w-full bg-[#fafafa] dark:bg-[#0c0c0c]"
      >
        {route === "/admin" && isAdmin ? (
          <div className="p-6 md:p-10">
            <AdminView onNavigate={navigate} />
          </div>
        ) : (
          <PropertiesDashboard onNavigate={navigate} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
