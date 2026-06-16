import React, { useState, useEffect } from "react";
import { useFirebase } from "./FirebaseProvider";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  orderBy 
} from "firebase/firestore";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Building, 
  MapPin, 
  DollarSign, 
  Maximize2, 
  ArrowUpRight, 
  Menu, 
  MoreVertical, 
  User, 
  LogOut, 
  LayoutGrid, 
  Sliders, 
  Percent, 
  Bed, 
  Bath, 
  SlidersHorizontal,
  Home,
  Briefcase,
  Layers,
  HelpCircle,
  FileText,
  Sparkles,
  Phone,
  TrendingUp,
  Send
} from "lucide-react";

import { PropertyCreateWizard } from "./PropertyCreateWizard";

interface PropertiesDashboardProps {
  onNavigate: (path: string) => void;
}

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  type: string;
  businessType?: "Venta" | "Alquiler" | "Venta y Alquiler" | string;
  status: "Available" | "Leased" | "Sold" | "Reserved" | "EN_REVISION";
  area: number;
  bedrooms: number;
  bathrooms: number;
  imageUrl: string;
  imageUrls?: string[];
  description: string;
  createdAt: any;
  // Specific specification fields for adaptive grouping parameters:
  roi?: number | string | null;
  cashFlow?: number | string | null;
  zoning?: string | null;
  parking?: number | null;
  landUse?: string | null;
  water?: string | null;
  electricity?: string | null;
  topography?: string | null;
  streetFront?: number | null;
  amenities?: string | null;
}

function getTypeGroup(type: string): "COMERCIAL" | "LOTES_FINCAS" | "CASAS" {
  if (["Local comercial", "Oficina", "Edificio", "Bodega", "Proyecto", "Inversión"].includes(type)) {
    return "COMERCIAL";
  }
  if (["Lote", "Finca"].includes(type)) {
    return "LOTES_FINCAS";
  }
  return "CASAS";
}

const MODERN_PRESETS = [
  { name: "Glass Penthouse", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80" },
  { name: "Brutalist Concrete Villa", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" },
  { name: "Floating Minimalism Loft", url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80" },
  { name: "Scandinavian Glass House", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80" },
  { name: "Lakeside Brutalism Residence", url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80" }
];

export function PropertiesDashboard({ onNavigate }: PropertiesDashboardProps) {
  const { user, isAdmin, logout } = useFirebase();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"listings" | "analytics" | "performance">("listings");
  const [brandVersion, setBrandVersion] = useState<1 | 2 | 3>(1);
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Lightbox visual gallery states for saved images
  const [selectedGalleryProperty, setSelectedGalleryProperty] = useState<Property | null>(null);
  const [galleryActiveIndex, setGalleryActiveIndex] = useState<number>(0);
  
  // Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactCategory, setContactCategory] = useState("Inversión");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState<"Available" | "Leased" | "Sold" | "Reserved" | "EN_REVISION">("Available");
  const [editBusinessType, setEditBusinessType] = useState("Venta");

  // Read properties in real-time
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Property[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Property);
      });
      setProperties(list);
      setLoading(false);
    }, (error) => {
      console.error("Firestore properties read error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteProperty = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar permanentemente esta propiedad de la base de datos de Altura?")) {
      try {
        await deleteDoc(doc(db, "properties", id));
      } catch (err) {
        console.error("Error deleting document:", err);
        alert("Permiso denegado por las reglas de seguridad. Solo el rol de Administrador puede realizar eliminaciones.");
      }
    }
  };

  const handleStartEditing = (property: Property) => {
    setEditingId(property.id);
    setEditPrice(property.price.toString());
    setEditStatus(property.status);
    setEditBusinessType(property.businessType || "Venta");
  };

  const handleSaveEdit = async (id: string) => {
    const parsedPrice = parseFloat(editPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert("Introduce un precio válido.");
      return;
    }

    try {
      await updateDoc(doc(db, "properties", id), {
        price: parsedPrice,
        status: editStatus,
        businessType: editBusinessType
      });
      setEditingId(null);
    } catch (err) {
      console.error("Error updating property:", err);
      alert("Error al actualizar la propiedad.");
    }
  };

  // Filter properties in memory
  const filteredProperties = properties.filter((prop) => {
    const matchesSearch = 
      prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || prop.status === statusFilter;
    const matchesType = typeFilter === "all" || prop.type === typeFilter;
    const matchesBusinessType = businessTypeFilter === "all" || 
      (prop.businessType || "Venta") === businessTypeFilter;

    return matchesSearch && matchesStatus && matchesType && matchesBusinessType;
  });

  // Unique types from current list for filters
  const uniqueTypes = Array.from(new Set(properties.map((p) => p.type)));

  // Global calculations
  const totalValue = properties.reduce((acc, curr) => acc + curr.price, 0);
  const availableCount = properties.filter((p) => p.status === "Available").length;
  const leasedCount = properties.filter((p) => p.status === "Leased").length;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0c0c] text-neutral-900 dark:text-neutral-100 flex flex-col md:flex-row font-sans selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
      
      {/* BACKGROUND GRAPHIC LINES FOR PREMIUM VIBE */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1b1b1b_1px,transparent_1px),linear-gradient(to_bottom,#1b1b1b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40 z-0" />

      {/* MOBILE TOPBAR BAR */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-[#111111] border-b border-neutral-200 dark:border-neutral-900 relative z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-md tracking-tighter">
            A
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase">ALTURA</h1>
            <p className="text-[9px] text-neutral-500 font-mono">ESTATE CONSOLE</p>
          </div>
        </div>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 border border-neutral-200 dark:border-neutral-800 rounded hover:bg-neutral-50 dark:hover:bg-neutral-950 active:bg-neutral-100 dark:active:bg-neutral-900 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* DESKTOP & MOBILE SIDEBAR DIALOG */}
      <aside 
        className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#0d0d0d] border-r border-[#e8e8e8] dark:border-[#1d1d1d] z-40 transform md:transform-none transition-transform duration-300 ease-out flex flex-col justify-between ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col flex-1 p-6 overflow-y-auto">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3 select-none">
              <div className="w-10 h-10 rounded-xs bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-lg tracking-tighter">
                A
              </div>
              <div>
                <h1 className="text-md font-bold tracking-widest uppercase leading-tight">ALTURA</h1>
                <p className="text-[10px] text-neutral-500 font-mono tracking-tight font-medium">REAL ESTATE CO.</p>
              </div>
            </div>
            
            {/* Close Sidebar button for mobile view */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 border border-neutral-200 dark:border-neutral-800 rounded text-neutral-500 hover:text-black dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-bold mb-4 font-mono">
            Administración
          </div>

          {/* Sidebar Links / Navigation */}
          <nav className="space-y-1 mb-8">
            <button 
              onClick={() => { setActiveTab("listings"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-md transition-all ${
                activeTab === "listings"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-lg shadow-neutral-900/10 dark:shadow-none"
                  : "text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Propiedades</span>
              <span className="ml-auto text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded-full font-mono font-bold">
                {properties.length}
              </span>
            </button>

            <button 
              onClick={() => { setActiveTab("analytics"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-md transition-all ${
                activeTab === "analytics"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-lg"
                  : "text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span>Análisis de Cartera</span>
            </button>

            <button 
              onClick={() => { setActiveTab("performance"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-md transition-all ${
                activeTab === "performance"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-lg"
                  : "text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Configuración</span>
            </button>
          </nav>

          <div className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500 font-bold mb-4 font-mono">
            Enlaces Rápidos
          </div>

          <div className="space-y-1">
            <button 
              onClick={() => onNavigate("/")}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-md text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left"
            >
              <Briefcase className="w-4 h-4 shrink-0" />
              <span>Inicio de Plataforma</span>
            </button>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-xs font-semibold rounded-md text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Registrar Propiedad</span>
            </button>
          </div>
        </div>

        {/* User Gated Profile Info in Sidebar */}
        <div className="p-6 border-t border-[#e8e8e8] dark:border-[#1d1d1d] bg-neutral-50/50 dark:bg-neutral-950/20">
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-9 h-9 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold font-mono text-sm border border-neutral-200 dark:border-neutral-800">
              {user?.displayName ? user.displayName[0].toUpperCase() : "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-neutral-900 dark:text-white leading-tight">
                {user?.displayName || "Administrador"}
              </p>
              <p className="text-[9px] text-neutral-400 dark:text-neutral-500 truncate font-mono">
                {user?.email || "admin@altura.com"}
              </p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md transition-all active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* BACKGROUND SCREEN OVERLAY FOR MOBILE SIDEBAR OPEN */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* PRIMARY WORKSPACE */}
      <main className="flex-1 md:pl-72 relative min-h-screen flex flex-col z-10 w-full overflow-x-hidden">
        
        {/* DESKTOP TOP CONSOLE BAR */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-[#e8e8e8] dark:border-[#1d1d1d] bg-white/70 dark:bg-[#0c0c0c]/70 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono tracking-widest uppercase font-bold">Portafolio Activo</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-neutral-600 dark:text-neutral-400 font-mono font-medium">Altura Luxury Portfolio</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block font-mono font-bold uppercase tracking-wider">ROL ASIGNADO</span>
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-tight">Administrador Premium</span>
            </div>
            
            <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800" />

            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-semibold text-xs px-4 py-2.5 rounded-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm tracking-tight"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Propiedad</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE MAIN BODY */}
        <div className="flex-1 p-6 md:p-10 space-y-8 max-w-7xl w-full mx-auto">
          
          {/* HEADER INTRO TITLE CARD WITH PREMIUM BRANDING */}
          <div className="flex flex-col gap-6 pb-6 border-b border-neutral-200/80 dark:border-neutral-900">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-3 max-w-4xl">
                <div className="space-y-2">
                  <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 font-sans leading-tight flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                    ALTURA — Propiedades con valor, visión y presencia.
                  </h1>
                  <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed max-w-3xl">
                    Representación profesional de propiedades, inversión inmobiliaria y activos comerciales.
                  </p>
                </div>
              </div>

              {/* Action Button (Mobile Fallback UI) */}
              <div className="md:hidden">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-[#cca355] text-neutral-950 hover:opacity-90 font-bold text-xs px-5 py-3 rounded-md shadow-lg shadow-amber-500/10 transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 text-neutral-950 font-bold" />
                  <span>Nueva Propiedad</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-900/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[9px] font-black text-neutral-450 dark:text-neutral-500 font-mono uppercase tracking-wider">PORTAFOLIO DE INVERSIONES ACTIVO</span>
              </div>
              
              <div className="text-[10px] text-neutral-400 dark:text-neutral-600 font-mono hidden sm:block">
                <span>Sesión activa en el servidor de Altura S.A.</span>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "listings" && (
              <motion.div 
                key="listings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* NAVEGACIÓN VISUAL ELEGANTE Y ENFOQUES PREMIUM */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card 1: Propiedades Destacadas */}
                  <div 
                    onClick={() => {
                      setStatusFilter("Available");
                      setTypeFilter("all");
                      setBusinessTypeFilter("all");
                      setSearchQuery("");
                    }}
                    className="cursor-pointer bg-white dark:bg-[#111111] border border-neutral-200/70 dark:border-neutral-900 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:border-amber-500/30 dark:hover:border-[#cca355]/30 transition-all duration-300 relative overflow-hidden group select-none hover:scale-[1.01]"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-500 to-[#cca355]" />
                    <div className="flex items-center justify-between">
                      <Sparkles className="w-5 h-5 text-amber-550 dark:text-[#cca355]" />
                      <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-amber-550 dark:group-hover:text-[#cca355] transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mt-4 uppercase">
                      Propiedades Destacadas
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium leading-relaxed">
                      Acceso total al portafolio de listados exclusivos de la más alta tasación y arquitectura premium.
                    </p>
                  </div>

                  {/* Card 2: Activos Comerciales */}
                  <div 
                    onClick={() => {
                      setTypeFilter("all");
                      setSearchQuery("comercial");
                    }}
                    className="cursor-pointer bg-white dark:bg-[#111111] border border-neutral-200/70 dark:border-neutral-900 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:border-amber-500/30 dark:hover:border-[#cca355]/30 transition-all duration-300 relative overflow-hidden group select-none hover:scale-[1.01]"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-neutral-300 dark:bg-neutral-850" />
                    <div className="flex items-center justify-between">
                      <Building className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                      <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mt-4 uppercase">
                      Activos Comerciales
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium leading-relaxed">
                      Curaduría de oficinas corporativas, edificios de diseño y locales estratégicos de alto perfil comercial.
                    </p>
                  </div>

                  {/* Card 3: Inversión Inmobiliaria */}
                  <div 
                    onClick={() => {
                      setBusinessTypeFilter("Venta");
                      setSearchQuery("");
                      setStatusFilter("Available");
                    }}
                    className="cursor-pointer bg-white dark:bg-[#111111] border border-neutral-200/70 dark:border-neutral-900 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:border-emerald-500/20 dark:hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden group select-none hover:scale-[1.01]"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/80" />
                    <div className="flex items-center justify-between">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mt-4 uppercase">
                      Inversión Inmobiliaria
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium leading-relaxed">
                      Oportunidades de adquisición con tasas de capitalización destacadas y plusvalía garantizada.
                    </p>
                  </div>

                  {/* Card 4: Experiencia Premium / Contacto */}
                  <div 
                    onClick={() => {
                      setContactSuccess(false);
                      setIsContactModalOpen(true);
                    }}
                    className="cursor-pointer bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border border-neutral-900 dark:border-neutral-100 rounded-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:opacity-90 transition-all duration-300 relative overflow-hidden group select-none hover:scale-[1.01]"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#cca355]" />
                    <div className="flex items-center justify-between">
                      <Phone className="w-5 h-5 text-amber-400 dark:text-[#cca355]" />
                      <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-white dark:group-hover:text-neutral-950 transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold tracking-tight text-white dark:text-neutral-900 mt-4 uppercase">
                      Agendar Consulta Privada
                    </h3>
                    <p className="text-[11px] text-neutral-350 dark:text-neutral-600 mt-2 font-medium leading-relaxed">
                      Contacte de forma rápida con nuestros representantes profesionales para una asesoría exclusiva y personalizada.
                    </p>
                  </div>
                </div>

                {/* FILTERS AND ACTIONS CONSOLE CONTROL */}
                <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-900 rounded-lg p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                    
                    {/* Search Field */}
                    <div className="relative w-full lg:max-w-md">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400 dark:text-neutral-600">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar por título, ubicación o tipología..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md py-2.5 pl-10 pr-4 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-all"
                      />
                    </div>

                    {/* Filter Fields */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                      <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md p-1">
                        <button
                          onClick={() => setStatusFilter("all")}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                            statusFilter === "all"
                              ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                          }`}
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => setStatusFilter("Available")}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                            statusFilter === "Available"
                              ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                          }`}
                        >
                          Disponibles
                        </button>
                        <button
                          onClick={() => setStatusFilter("Leased")}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                            statusFilter === "Leased"
                              ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                          }`}
                        >
                          Alquilados
                        </button>
                        <button
                          onClick={() => setStatusFilter("Sold")}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                            statusFilter === "Sold"
                              ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                          }`}
                        >
                          Vendidos
                        </button>
                        <button
                          onClick={() => setStatusFilter("EN_REVISION")}
                          className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                            statusFilter === "EN_REVISION"
                              ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                          }`}
                        >
                          En Revisión
                        </button>
                      </div>

                      {/* Dropdown Type Filter */}
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs py-2.5 px-3 rounded-md text-neutral-700 dark:text-neutral-300 focus:outline-none"
                      >
                        <option value="all">Tipología: Todas</option>
                        {uniqueTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      {/* Dropdown Business Type Filter */}
                      <select
                        value={businessTypeFilter}
                        onChange={(e) => setBusinessTypeFilter(e.target.value)}
                        className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs py-2.5 px-3 rounded-md text-neutral-700 dark:text-neutral-300 focus:outline-none font-semibold hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors"
                      >
                        <option value="all">Negocio: Todos</option>
                        <option value="Venta">Venta</option>
                        <option value="Alquiler">Alquiler</option>
                        <option value="Venta y Alquiler">Venta y Alquiler</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* PREMIUM MINIMALIST PROPERTIES TABLE */}
                <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-900 rounded-lg overflow-hidden shadow-xs">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <div className="w-8 h-8 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-mono tracking-widest text-neutral-400 uppercase">Consultando base de datos...</span>
                    </div>
                  ) : filteredProperties.length === 0 ? (
                    <div className="text-center py-24 text-neutral-500">
                      <Building className="w-12 h-12 text-neutral-300 dark:text-neutral-800 mx-auto mb-4" />
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">Ninguna propiedad coincide con los filtros</p>
                      <p className="text-xs text-neutral-400 mt-1">Intenta modificar tu término de búsqueda o crea una propiedad nueva.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-950 text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-black font-mono">
                            <th className="p-4 pl-6">Unidad / Diseño</th>
                            <th className="p-4">Tipología</th>
                            <th className="p-4">Ubicación</th>
                            <th className="p-4">Precio (USD)</th>
                            <th className="p-4">Superficie</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 pr-6 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                          {filteredProperties.map((prop) => {
                            const isEditing = editingId === prop.id;

                            return (
                              <tr key={prop.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20 transition-all">
                                
                                {/* Photo & Title */}
                                <td className="p-4 pl-6">
                                  <div className="flex items-center gap-4">
                                    <div 
                                      onClick={() => {
                                        setSelectedGalleryProperty(prop);
                                        setGalleryActiveIndex(0);
                                      }}
                                      title="Ver fotos de la propiedad"
                                      className="w-12 h-12 bg-neutral-100 dark:bg-neutral-950 rounded-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden shrink-0 cursor-zoom-in relative group"
                                    >
                                      <img 
                                        src={prop.imageUrl} 
                                        alt={prop.title} 
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover grayscale contrast-110 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" 
                                      />
                                      {prop.imageUrls && prop.imageUrls.length > 1 && (
                                        <div className="absolute bottom-0 right-0 bg-[#cca355] text-neutral-950 font-mono text-[8px] font-black px-1.5 py-0.5 rounded-tl-xs select-none">
                                          {prop.imageUrls.length}
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-bold block text-neutral-900 dark:text-neutral-100 truncate">
                                        {prop.title}
                                      </span>
                                      {getTypeGroup(prop.type) === "CASAS" ? (
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-mono font-medium text-[#818181] flex items-center gap-1">
                                            <Bed className="w-3 h-3 text-[#9c9c9c]" /> {prop.bedrooms || 0} Hab
                                          </span>
                                          <span className="w-1 h-1 bg-neutral-300 dark:bg-neutral-800 rounded-full" />
                                          <span className="text-[10px] font-mono font-medium text-[#818181] flex items-center gap-1">
                                            <Bath className="w-3 h-3 text-[#9c9c9c]" /> {prop.bathrooms || 0} Baños
                                          </span>
                                          {prop.parking ? (
                                            <>
                                              <span className="w-1 h-1 bg-neutral-300 dark:bg-neutral-800 rounded-full" />
                                              <span className="text-[10px] font-mono font-medium text-[#818181]">
                                                🅿️ {prop.parking} P
                                              </span>
                                            </>
                                          ) : null}
                                        </div>
                                      ) : getTypeGroup(prop.type) === "COMERCIAL" ? (
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          {prop.roi ? (
                                            <span className="text-[9px] font-mono font-bold bg-neutral-900 dark:bg-white text-white dark:text-black px-1.5 py-0.5 rounded leading-none">
                                              ROI {prop.roi}%
                                            </span>
                                          ) : null}
                                          {prop.cashFlow ? (
                                            <span className="text-[10px] font-mono font-medium text-[#818181]">
                                              Flujo: +${prop.cashFlow.toLocaleString()}/m
                                            </span>
                                          ) : null}
                                          {prop.parking ? (
                                            <span className="text-[10px] font-mono font-medium text-[#818181]">
                                              P: {prop.parking}
                                            </span>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          {prop.landUse ? (
                                            <span className="text-[9px] font-mono font-bold bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-300 px-1.5 py-0.5 rounded leading-none">
                                              Uso: {prop.landUse}
                                            </span>
                                          ) : null}
                                          {prop.topography ? (
                                            <span className="text-[10px] font-mono font-medium text-[#818181]">
                                              {prop.topography}
                                            </span>
                                          ) : null}
                                          {prop.streetFront ? (
                                            <span className="text-[10px] font-mono font-medium text-[#818181]">
                                              Frente: {prop.streetFront}m
                                            </span>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Type */}
                                <td className="p-4">
                                  <div className="flex flex-col gap-1.5">
                                    <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-350 rounded font-mono text-[10px] font-bold uppercase tracking-wider border border-neutral-200/50 dark:border-neutral-850 inline-block w-fit">
                                      {prop.type}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest font-mono border w-fit ${
                                      prop.businessType === "Alquiler"
                                        ? "bg-teal-500/15 border-teal-500/25 text-teal-600 dark:text-teal-400"
                                        : prop.businessType === "Venta y Alquiler"
                                        ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-600 dark:text-indigo-400"
                                        : "bg-amber-500/15 border-amber-500/25 text-amber-700 dark:text-amber-400"
                                    }`}>
                                      {prop.businessType || "Venta"}
                                    </span>
                                  </div>
                                </td>

                                {/* Location */}
                                <td className="p-4">
                                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>{prop.location}</span>
                                  </div>
                                </td>

                                {/* Price */}
                                <td className="p-4">
                                  {isEditing ? (
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-neutral-400 font-mono">$</span>
                                        <input
                                          type="number"
                                          value={editPrice}
                                          onChange={(e) => setEditPrice(e.target.value)}
                                          className="w-24 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs rounded p-1 font-mono text-neutral-900 dark:text-white"
                                        />
                                      </div>
                                      <select
                                        value={editBusinessType}
                                        onChange={(e) => setEditBusinessType(e.target.value as any)}
                                        className="w-24 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-[9px] rounded p-1 font-mono text-neutral-850 dark:text-neutral-250 outline-none"
                                      >
                                        <option value="Venta">Venta</option>
                                        <option value="Alquiler">Alquiler</option>
                                        <option value="Venta y Alquiler">Venta y Alquiler</option>
                                      </select>
                                    </div>
                                  ) : (
                                    <div className="font-mono text-xs font-bold text-neutral-900 dark:text-white flex flex-col gap-0.5">
                                      <span className="text-neutral-900 dark:text-white font-extrabold">${prop.price.toLocaleString("es-ES")}</span>
                                      {prop.businessType === "Alquiler" && (
                                        <span className="text-[9px] text-teal-600 dark:text-teal-400 font-medium font-mono">/ mes</span>
                                      )}
                                      {prop.businessType === "Venta y Alquiler" && (
                                        <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium font-sans">Venta / Renta</span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Area */}
                                <td className="p-4">
                                  <span className="text-xs font-mono text-neutral-500 font-medium">
                                    {prop.area} m²
                                  </span>
                                </td>

                                {/* Status Badge and Selector */}
                                <td className="p-4">
                                  {isEditing ? (
                                    <select
                                      value={editStatus}
                                      onChange={(e) => setEditStatus(e.target.value as any)}
                                      className="bg-neutral-150 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-[10px] rounded p-1 font-mono outline-none"
                                    >
                                      <option value="EN_REVISION">En Revisión</option>
                                      <option value="Available">Available</option>
                                      <option value="Leased">Leased</option>
                                      <option value="Sold">Sold</option>
                                      <option value="Reserved">Reserved</option>
                                    </select>
                                  ) : (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border rounded ${
                                      prop.status === "Available"
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        : prop.status === "Leased"
                                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                        : prop.status === "Sold"
                                        ? "bg-neutral-900 border-neutral-900 text-white"
                                        : prop.status === "EN_REVISION"
                                        ? "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                    }`}>
                                      <span className={`w-1 h-1 rounded-full ${
                                        prop.status === "Available" ? "bg-emerald-500" :
                                        prop.status === "Leased" ? "bg-indigo-500" :
                                        prop.status === "Sold" ? "bg-white" :
                                        prop.status === "EN_REVISION" ? "bg-orange-500" : "bg-amber-500"
                                      }`} />
                                      {prop.status === "EN_REVISION" ? "En Revisión" : prop.status}
                                    </span>
                                  )}
                                </td>

                                {/* Row Actions */}
                                <td className="p-4 pr-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {isEditing ? (
                                      <>
                                        <button 
                                          onClick={() => handleSaveEdit(prop.id)}
                                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded border border-emerald-250 dark:border-emerald-900/50"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingId(null)}
                                          className="p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-850"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          onClick={() => handleStartEditing(prop)}
                                          className="p-1 text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded transition-colors group"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteProperty(prop.id)}
                                          className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ROUTE / TAB ANALYTICS */}
            {activeTab === "analytics" && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-900 rounded-lg p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold">Distribución de Cartera Luxury</h3>
                    <p className="text-xs text-neutral-500 mt-1">Auditoría geométrica e inversión inmobiliaria activa.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <div className="space-y-4 border border-neutral-100 dark:border-neutral-850 p-6 rounded-lg bg-neutral-50/50 dark:bg-neutral-950/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-neutral-400">Precio promedio por tipología</h4>
                      <div className="space-y-3">
                        {uniqueTypes.map((type) => {
                          const typeProps = properties.filter((p) => p.type === type);
                          const avgPrice = typeProps.reduce((a, c) => a + c.price, 0) / typeProps.length;
                          return (
                            <div key={type} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-neutral-800 dark:text-neutral-200">{type}</span>
                                <span className="font-mono text-neutral-600 dark:text-neutral-400">${avgPrice.toLocaleString("es-ES", { maximumFractionDigits: 0 })}</span>
                              </div>
                              <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-neutral-900 dark:bg-white rounded-full" style={{ width: `${Math.min(100, (avgPrice / 3000000) * 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {uniqueTypes.length === 0 && <span className="text-xs italic text-neutral-400">Sin datos</span>}
                      </div>
                    </div>

                    <div className="space-y-4 border border-neutral-100 dark:border-neutral-850 p-6 rounded-lg bg-neutral-50/50 dark:bg-neutral-950/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-neutral-400">Superficie Cubierta Promedio</h4>
                      <div className="space-y-3">
                        {uniqueTypes.map((type) => {
                          const typeProps = properties.filter((p) => p.type === type);
                          const avgArea = typeProps.reduce((a, c) => a + c.area, 0) / typeProps.length;
                          return (
                            <div key={type} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-neutral-800 dark:text-neutral-200">{type}</span>
                                <span className="font-mono text-neutral-600 dark:text-neutral-400">{avgArea.toFixed(1)} m²</span>
                              </div>
                              <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-neutral-900 dark:bg-white rounded-full" style={{ width: `${Math.min(100, (avgArea / 500) * 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {uniqueTypes.length === 0 && <span className="text-xs italic text-neutral-400">Sin datos</span>}
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* ROUTE / TAB PERFORMANCE SETTINGS */}
            {activeTab === "performance" && (
              <motion.div 
                key="performance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-900 rounded-lg p-8 max-w-2xl">
                  <h3 className="text-md font-bold text-neutral-900 dark:text-white">Ajustes Generales del Consorcio</h3>
                  <p className="text-xs text-neutral-400 mt-1">Configuración técnica de la plataforma y almacenamiento.</p>

                  <div className="mt-8 space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#a8a8a8] font-mono">Nombre de Agencia</label>
                      <input
                        type="text"
                        defaultValue="Consorcio Altura S.A."
                        disabled
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 rounded-md text-xs text-neutral-400 font-medium select-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#a8a8a8] font-mono">Moneda del Portfolio</label>
                      <select
                        disabled
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 rounded-md text-xs text-neutral-400"
                      >
                        <option>Dólar Estadounidense (USD)</option>
                      </select>
                    </div>

                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-md text-orange-600 dark:text-orange-400 text-xs">
                      <strong>Panel Gated:</strong> Los cambios sobre la base de datos están limitados a tu cuenta y a tu entorno local. Las mutaciones son síncronas usando Firebase rules.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* WORKSPACE LIGHTWEIGHT FOOTER STATUS BAR */}
        <footer className="mt-auto px-8 py-4 border-t border-neutral-200 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-950/40 text-neutral-500 dark:text-neutral-500 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] font-mono font-medium">
          <span>Altura Global Registry Index &copy; 2026. Todos los derechos reservados.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><SlidersHorizontal className="w-3 h-3" /> REST SYNC ACTIVE</span>
            <span className="flex items-center gap-1">SECURE CONTEXT</span>
          </div>
        </footer>

      </main>

      {/* DIALOG WIZARD FOR "NUEVA PROPIEDAD" CREATION */}
      <AnimatePresence>
        {isModalOpen && (
          <PropertyCreateWizard 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmitSuccess={() => {
              // Real-time Firestore snapshot will update areally.
            }}
          />
        )}
      </AnimatePresence>

      {/* QUICK CONTACT MODAL */}
      <AnimatePresence>
        {isContactModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-900 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl relative"
            >
              <div className="p-5 border-b border-neutral-100 dark:border-neutral-900 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-950/20">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-500" />
                  <h3 className="text-[10px] font-bold tracking-widest uppercase text-neutral-950 dark:text-white font-mono">Consulta Profesional Altura</h3>
                </div>
                <button
                  onClick={() => setIsContactModalOpen(false)}
                  className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {contactSuccess ? (
                <div className="p-8 text-center space-y-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-lg font-bold">
                    ✓
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-tight">Solicitud de Representación Registrada</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    Hemos recibido su requerimiento para el sector de <strong className="text-neutral-800 dark:text-neutral-200">{contactCategory}</strong>. Un especialista asignado a propiedades de alta tasación formalizará el contacto brevemente.
                  </p>
                  <button
                    onClick={() => {
                      setIsContactModalOpen(false);
                      setContactSuccess(false);
                    }}
                    className="mt-4 px-6 py-2 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded text-[10px] font-mono font-bold tracking-widest hover:opacity-90 transition-all uppercase"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setContactSubmitting(true);
                    setTimeout(() => {
                      setContactSubmitting(false);
                      setContactSuccess(true);
                      // Reset fields
                      setContactName("");
                      setContactEmail("");
                      setContactPhone("");
                      setContactMessage("");
                    }, 800);
                  }}
                  className="p-6 space-y-4 text-left"
                >
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-mono">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Inversionista Premium"
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded text-xs text-neutral-955 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-mono">Correo Electrónico</label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="e.g. contacto@inversion.com"
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded text-xs text-neutral-955 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-mono">Forma de Contacto Directo</label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="e.g. +506 8888-8888"
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded text-xs text-neutral-955 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-mono">Sector Inmobiliario de Interés</label>
                    <select
                      value={contactCategory}
                      onChange={(e) => setContactCategory(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded text-xs text-neutral-850 dark:text-neutral-200 focus:outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="Activos Comerciales">Activos Comerciales (Oficinas, Locales, Edificios)</option>
                      <option value="Inversión Inmobiliaria">Inversión Inmobiliaria (ROI, Adquisiciones)</option>
                      <option value="Propiedades Destacadas">Propiedades Destacadas (Residencial de Colección)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-mono">Mensaje o Requerimientos de Inversión</label>
                    <textarea
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Describa brevemente el tipo de activo o retorno buscado..."
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 px-3 py-2 rounded text-xs text-neutral-955 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsContactModalOpen(false)}
                      className="px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded text-neutral-500 hover:text-neutral-950 dark:hover:text-white text-[10px] font-mono uppercase font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={contactSubmitting}
                      className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-850 dark:bg-white dark:hover:bg-neutral-50 text-white dark:text-neutral-950 font-bold rounded text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {contactSubmitting ? (
                        <>
                          <span className="w-3 h-3 border border-t-transparent border-current rounded-full animate-spin" />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Enviar Requerimiento</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BRAND-ALIGNED IMAGE LIGHTBOX GALLERY (HIGH-END PREVIEW MODAL) */}
      <AnimatePresence>
        {selectedGalleryProperty && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <button
              onClick={() => setSelectedGalleryProperty(null)}
              className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl relative flex flex-col justify-center items-center"
            >
              {/* Main Image Slider */}
              <div className="w-full aspect-video border border-neutral-800 rounded-sm overflow-hidden bg-neutral-950 flex items-center justify-center relative shadow-2xl">
                <img
                  src={
                    selectedGalleryProperty.imageUrls && selectedGalleryProperty.imageUrls.length > galleryActiveIndex
                      ? selectedGalleryProperty.imageUrls[galleryActiveIndex]
                      : selectedGalleryProperty.imageUrl
                  }
                  alt={selectedGalleryProperty.title}
                  className="max-h-full max-w-full object-contain select-none"
                  referrerPolicy="no-referrer"
                />

                {/* Left/Right Navigation Arrows */}
                {selectedGalleryProperty.imageUrls && selectedGalleryProperty.imageUrls.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setGalleryActiveIndex((prev) =>
                          prev === 0 ? selectedGalleryProperty.imageUrls!.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black text-white hover:text-[#cca355] transition-all cursor-pointer flex items-center justify-center w-8 h-8 font-bold"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setGalleryActiveIndex((prev) =>
                          prev === selectedGalleryProperty.imageUrls!.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black text-white hover:text-[#cca355] transition-all cursor-pointer flex items-center justify-center w-8 h-8 font-bold"
                    >
                      ›
                    </button>
                  </>
                )}

                {/* Info Overlay */}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex justify-between items-end">
                  <div className="min-w-0 pr-4">
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#cca355] block">
                      {selectedGalleryProperty.type || "Residencia"}
                    </span>
                    <h4 className="text-sm font-semibold text-white truncate">{selectedGalleryProperty.title}</h4>
                    <span className="text-[10px] text-neutral-300 font-mono">
                      Ubicación: {selectedGalleryProperty.location}
                    </span>
                  </div>
                  {selectedGalleryProperty.imageUrls && (
                    <span className="text-[10px] font-mono text-neutral-300 font-bold bg-neutral-900/90 border border-neutral-800 px-2.5 py-1 rounded leading-none shrink-0">
                      {galleryActiveIndex + 1} de {selectedGalleryProperty.imageUrls.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails list underneath */}
              {selectedGalleryProperty.imageUrls && selectedGalleryProperty.imageUrls.length > 1 && (
                <div className="flex gap-2.5 justify-center items-center mt-4 overflow-x-auto max-w-full px-2">
                  {selectedGalleryProperty.imageUrls.map((url: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setGalleryActiveIndex(idx)}
                      className={`relative w-16 h-12 border rounded-sm overflow-hidden bg-neutral-900 shrink-0 transition-all ${
                        idx === galleryActiveIndex
                          ? "border-amber-500 scale-105 shadow-md shadow-amber-500/10"
                          : "border-neutral-800 hover:border-neutral-600 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`gallery_thumb_${idx}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
