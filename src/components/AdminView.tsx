import React, { useEffect, useState } from "react";
import { useFirebase } from "./FirebaseProvider";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  orderBy 
} from "firebase/firestore";
import { 
  Users, 
  Shield, 
  UserCheck, 
  UserX, 
  Trash2, 
  AlertTriangle, 
  FolderLock, 
  Calendar, 
  Mail, 
  Sparkles, 
  ArrowLeft,
  Search,
  Filter,
  Check,
  X,
  Pencil,
  Home,
  MapPin,
  Maximize2,
  Building,
  DollarSign,
  Clock,
  TrendingUp,
  Layers
} from "lucide-react";

interface AdminViewProps {
  onNavigate: (path: string) => void;
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

export function AdminView({ onNavigate }: AdminViewProps) {
  const { user, isAdmin, loading: authLoading } = useFirebase();
  const [users, setUsers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"properties" | "users">("properties");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Users Tab filters/searches
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "member">("all");
  const [roleChangeLoading, setRoleChangeLoading] = useState<string | null>(null);

  // Properties Tab filters/searches
  const [propertySearchQuery, setPropertySearchQuery] = useState("");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<string>("all");

  // Lightbox visual gallery states for saved images
  const [selectedGalleryProperty, setSelectedGalleryProperty] = useState<any | null>(null);
  const [galleryActiveIndex, setGalleryActiveIndex] = useState<number>(0);

  // Property Edit State
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editBusinessType, setEditBusinessType] = useState("Venta");

  // Action feedback states
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Access security gating
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      onNavigate("/login");
    }
  }, [user, isAdmin, authLoading]);

  // Combined real-time snapshot setup
  useEffect(() => {
    if (!user || !isAdmin) return;

    setLoading(true);
    setErrorMsg(null);

    // Users listener
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(fetchedUsers);
    }, (error) => {
      console.error("Firestore users read error:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, "users");
      } catch (err: any) {
        setErrorMsg("Error de permisos: No se pudieron cargar los usuarios. Revisa las reglas de seguridad.");
      }
    });

    // Properties listener
    const propertiesQuery = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsubscribeProperties = onSnapshot(propertiesQuery, (snapshot) => {
      const fetchedProps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProperties(fetchedProps);
      setLoading(false);
    }, (error) => {
      console.error("Firestore properties read error:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeProperties();
    };
  }, [user, isAdmin]);

  // Actions: User Roles Toggle
  const handleToggleRole = async (targetUserId: string, currentRole: string) => {
    if (targetUserId === user?.uid) {
      alert("No puedes revocar tu propio permiso de administrador.");
      return;
    }

    setRoleChangeLoading(targetUserId);
    const newRole = currentRole === "admin" ? "member" : "admin";
    
    try {
      const userRef = doc(db, "users", targetUserId);
      await updateDoc(userRef, {
        role: newRole
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("No se pudo actualizar el rol. Permiso denegado por las reglas de seguridad de Firestore.");
    } finally {
      setRoleChangeLoading(null);
    }
  };

  // Actions: Approve Property (Set status to 'Available')
  const handleApproveProperty = async (propertyId: string) => {
    setActionInProgress(propertyId);
    try {
      await updateDoc(doc(db, "properties", propertyId), {
        status: "Available"
      });
    } catch (err) {
      console.error("Error approving property:", err);
      alert("No se pudo aprobar la propiedad. Intente nuevamente.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Actions: Reject Property (Set status to 'RECHAZADO')
  const handleRejectProperty = async (propertyId: string) => {
    setActionInProgress(propertyId);
    try {
      await updateDoc(doc(db, "properties", propertyId), {
        status: "RECHAZADO"
      });
    } catch (err) {
      console.error("Error rejecting property:", err);
      alert("No se pudo rechazar la propiedad. Intente nuevamente.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Actions: Delete Property (Optional backup helper)
  const handleDeletePropertyCheck = async (propertyId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar permanentemente esta propiedad?")) {
      setActionInProgress(propertyId);
      try {
        await deleteDoc(doc(db, "properties", propertyId));
      } catch (err) {
        console.error("Error deleting property:", err);
        alert("Error al eliminar la propiedad de la base de datos.");
      } finally {
        setActionInProgress(null);
      }
    }
  };

  // Actions: Start Editing Property
  const handleStartEditing = (property: any) => {
    setEditingProperty(property);
    setEditTitle(property.title || "");
    setEditPrice(property.price?.toString() || "");
    setEditStatus(property.status || "EN_REVISION");
    setEditLocation(property.location || "");
    setEditArea(property.area?.toString() || "");
    setEditBusinessType(property.businessType || "Venta");
  };

  // Actions: Save Property Edit
  const handleSavePropertyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    const parsedPrice = parseFloat(editPrice);
    const parsedArea = parseFloat(editArea);

    if (!editTitle.trim()) {
      alert("Por favor introduce un título válido.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert("Por favor introduce un precio válido mayor a 0.");
      return;
    }
    if (isNaN(parsedArea) || parsedArea <= 0) {
      alert("Por favor introduce una superficie m² válida mayor a 0.");
      return;
    }

    setActionInProgress(editingProperty.id);
    try {
      await updateDoc(doc(db, "properties", editingProperty.id), {
        title: editTitle.trim(),
        price: parsedPrice,
        status: editStatus,
        location: editLocation.trim(),
        area: parsedArea,
        businessType: editBusinessType
      });
      setEditingProperty(null);
    } catch (err) {
      console.error("Error updating property details:", err);
      alert("No se pudo modificar la propiedad. Revisa los permisos.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Filter Logic: Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.displayName || "").toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(userSearchQuery.toLowerCase());
    
    const matchesFilter = 
      roleFilter === "all" || 
      u.role === roleFilter;

    return matchesSearch && matchesFilter;
  });

  // Filter Logic: Properties
  const filteredProperties = properties.filter((p) => {
    const matchesSearch = 
      (p.title || "").toLowerCase().includes(propertySearchQuery.toLowerCase()) ||
      (p.location || "").toLowerCase().includes(propertySearchQuery.toLowerCase());

    const matchesFilter = 
      propertyStatusFilter === "all" || 
      p.status === propertyStatusFilter;

    return matchesSearch && matchesFilter;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
        <div className="w-10 h-10 border-2 border-[#cca355] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#a3a3a3] text-xs tracking-widest uppercase font-semibold font-mono">Iniciando panel de administración...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 px-4 sm:px-0">
      
      {/* Header and Back navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
        <div className="flex items-center gap-4 animate-fade-in">
          <button 
            onClick={() => onNavigate("/")}
            className="p-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-2xl text-neutral-400 hover:text-white transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#cca355]" />
              <h2 className="text-2xl font-display font-medium tracking-tight text-white">Panel de Administración</h2>
            </div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold font-mono mt-1">
              Gestión de propiedades, validación de listados y control de acceso.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-[#cca355]/10 border border-[#cca355]/20 rounded-2xl">
          <Sparkles className="w-4 h-4 text-[#cca355] animate-pulse" />
          <span className="text-xs font-semibold text-[#ddb771]">Nivel de Seguridad: Administrador</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-medium">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black font-mono">Total de Usuarios</p>
            <h3 className="text-4xl font-display font-bold text-white mt-2">{users.length}</h3>
          </div>
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black font-mono">Patrimonio de Cartera</p>
            <h3 className="text-4xl font-display font-bold text-amber-500 mt-2">
              ${(properties.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0) / 1000000).toFixed(2)}M
            </h3>
            <span className="text-[9px] text-neutral-400 font-mono mt-1 block">
              ${properties.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0).toLocaleString("es-ES")} USD
            </span>
          </div>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black font-mono">Unidades Registradas</p>
            <h3 className="text-4xl font-display font-medium text-white mt-2">{properties.length}</h3>
          </div>
          <div className="p-4 bg-neutral-850 border border-neutral-800 rounded-2xl text-neutral-300">
            <Home className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black font-mono">Disponibilidad Activa</p>
            <h3 className="text-4xl font-display font-medium text-emerald-500 mt-2">
              {properties.filter(p => p.status === "Available").length}
            </h3>
          </div>
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-400">
            <Check className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black font-mono">Alquiladas / Arrendadas</p>
            <h3 className="text-4xl font-display font-medium text-blue-500 mt-2">
              {properties.filter(p => p.status === "Leased" || p.status === "Sold").length}
            </h3>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/25 rounded-2xl text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black font-mono">En Revisión / Pendientes</p>
            <h3 className="text-4xl font-display font-medium text-amber-500 mt-2">
              {properties.filter(p => p.status === "EN_REVISION" || !p.status).length}
            </h3>
          </div>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-neutral-800 gap-6">
        <button
          onClick={() => setActiveTab("properties")}
          className={`pb-4 px-1 text-xs uppercase font-bold tracking-widest font-mono transition-all flex items-center gap-2 relative ${
            activeTab === "properties" 
              ? "text-white" 
              : "text-neutral-500 hover:text-white"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Gestión de Propiedades ({properties.length})</span>
          {activeTab === "properties" && (
            <motion.div 
              layoutId="adminTabIndicator" 
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#cca355]" 
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`pb-4 px-1 text-xs uppercase font-bold tracking-widest font-mono transition-all flex items-center gap-2 relative ${
            activeTab === "users" 
              ? "text-white" 
              : "text-neutral-500 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Directorio de Miembros ({users.length})</span>
          {activeTab === "users" && (
            <motion.div 
              layoutId="adminTabIndicator" 
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#cca355]" 
            />
          )}
        </button>
      </div>

      {/* Main Database Content */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        
        {activeTab === "properties" ? (
          <div>
            {/* Header, Search, Filters */}
            <div className="p-6 border-b border-neutral-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900/40">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[#cca355] font-mono">Control y Tasación de Propiedades</h3>
                <p className="text-[10px] text-neutral-400 font-medium">Aprueba, rechaza y depura el inventario de propiedades exclusivas de Altura</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por título o ubicación..."
                    value={propertySearchQuery}
                    onChange={(e) => setPropertySearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cca355] transition-all font-semibold"
                  />
                </div>

                <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-850 rounded-2xl p-1 w-full sm:w-auto overflow-x-auto shrink-0">
                  <button
                    onClick={() => setPropertyStatusFilter("all")}
                    className={`px-2.5 py-1.5 rounded-xl text-[9px] uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                      propertyStatusFilter === "all" ? "bg-[#cca355] text-neutral-950" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Todo
                  </button>
                  <button
                    onClick={() => setPropertyStatusFilter("EN_REVISION")}
                    className={`px-2.5 py-1.5 rounded-xl text-[9px] uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                      propertyStatusFilter === "EN_REVISION" ? "bg-amber-500 text-neutral-950" : "text-amber-500/80 hover:text-amber-400"
                    }`}
                  >
                    Pendientes
                  </button>
                  <button
                    onClick={() => setPropertyStatusFilter("Available")}
                    className={`px-2.5 py-1.5 rounded-xl text-[9px] uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                      propertyStatusFilter === "Available" ? "bg-emerald-500 text-neutral-950" : "text-emerald-400 hover:text-emerald-300"
                    }`}
                  >
                    Aprobados
                  </button>
                  <button
                    onClick={() => setPropertyStatusFilter("RECHAZADO")}
                    className={`px-2.5 py-1.5 rounded-xl text-[9px] uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                      propertyStatusFilter === "RECHAZADO" ? "bg-rose-500 text-white" : "text-rose-400 hover:text-rose-300"
                    }`}
                  >
                    Rechazados
                  </button>
                </div>
              </div>
            </div>

            {/* List Table */}
            <div className="divide-y divide-neutral-800">
              {filteredProperties.length === 0 ? (
                <div className="text-center py-20 text-neutral-500 text-sm">
                  <Home className="w-12 h-12 text-[#1f1f1f] mx-auto mb-4" />
                  <span>No se encontraron propiedades bajo el filtro seleccionado.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-950 text-neutral-400 uppercase tracking-widest text-[9px] font-bold font-mono border-b border-neutral-850">
                        <th className="p-4 pl-6">Imagen y Título</th>
                        <th className="p-4">Ubicación y Área</th>
                        <th className="p-4">Precio (USD)</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4">Fecha de Alta</th>
                        <th className="p-4 text-right pr-6">Acciones de Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850/40">
                      {filteredProperties.map((p) => {
                        const isPending = p.status === "EN_REVISION" || !p.status;
                        const isApproved = p.status === "Available";
                        const isRejected = p.status === "RECHAZADO";

                        const formattedDate = p.createdAt?.toDate 
                          ? p.createdAt.toDate().toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) 
                          : p.createdAt?.seconds
                          ? new Date(p.createdAt.seconds * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
                          : "Pendiente";

                        return (
                          <tr key={p.id} className="hover:bg-neutral-850/10 transition-colors">
                            {/* Main photo & layout title */}
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-4">
                                <div 
                                  onClick={() => {
                                    if (p.imageUrl) {
                                      setSelectedGalleryProperty(p);
                                      setGalleryActiveIndex(0);
                                    }
                                  }}
                                  title={p.imageUrl ? "Ver fotos de la propiedad" : undefined}
                                  className={`w-14 h-14 bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden shrink-0 relative group ${p.imageUrl ? 'cursor-zoom-in' : ''}`}
                                >
                                  {p.imageUrl ? (
                                    <>
                                      <img 
                                        src={p.imageUrl} 
                                        alt={p.title} 
                                        className="w-full h-full object-cover grayscale contast-110 group-hover:grayscale-0 group-hover:scale-105 duration-300"
                                        referrerPolicy="no-referrer"
                                      />
                                      {p.imageUrls && p.imageUrls.length > 1 && (
                                        <div className="absolute bottom-0 right-0 bg-[#cca355] text-neutral-950 font-mono text-[8px] font-black px-1.5 py-0.5 rounded-tl-xs select-none">
                                          {p.imageUrls.length}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] bg-neutral-850 text-neutral-600 font-mono">No pic</div>
                                  )}
                                  <div className="absolute top-0.5 left-0.5 bg-black/90 border border-neutral-800 px-1 py-0.5 rounded text-[7px] font-mono text-[#cca355] tracking-widest uppercase">
                                    {p.type || "Casa"}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-white block">
                                    {p.title || "Propiedad sin título"}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[9px] text-[#cca355] font-mono tracking-widest uppercase">
                                      Categoría: {getTypeGroup(p.type || "Casa")}
                                    </span>
                                    <span className="text-neutral-600 font-mono text-[9px]">•</span>
                                    <span className={`text-[8px] font-black uppercase tracking-widest font-mono border rounded px-1.5 py-0.5 leading-none ${
                                      p.businessType === "Alquiler"
                                        ? "bg-teal-550/10 border-teal-550/20 text-teal-400"
                                        : p.businessType === "Venta y Alquiler"
                                        ? "bg-indigo-550/10 border-indigo-550/20 text-indigo-400"
                                        : "bg-amber-550/10 border-amber-550/20 text-amber-500"
                                    }`}>
                                      {p.businessType || "Venta"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Location & Area */}
                            <td className="p-4">
                              <div className="flex flex-col gap-0.5 text-xs text-neutral-300">
                                <span className="flex items-center gap-1 font-semibold">
                                  <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                                  {p.location || "Ubicación sin registrar"}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono font-bold">
                                  <Maximize2 className="w-3 h-3" />
                                  {p.area || 0} m²
                                </span>
                              </div>
                            </td>

                            {/* Price */}
                            <td className="p-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-white font-mono bg-neutral-950/40 px-2.5 py-1.5 rounded border border-neutral-800 inline-block w-fit">
                                  ${p.price ? p.price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "0"} USD
                                </span>
                                {p.businessType === "Alquiler" && (
                                  <span className="text-[9px] text-teal-400 font-medium font-mono">/ mes</span>
                                )}
                                {p.businessType === "Venta y Alquiler" && (
                                  <span className="text-[9px] text-indigo-400 font-medium font-mono">Venta / Alq</span>
                                )}
                              </div>
                            </td>

                            {/* State/Status Badge */}
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                isApproved 
                                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                  : isRejected
                                  ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                                  : "bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  isApproved ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-amber-500 animate-ping"
                                }`} />
                                {isApproved ? "Disponible" : isRejected ? "Rechazado" : "En Revisión"}
                              </span>
                            </td>

                            {/* Creation Date */}
                            <td className="p-4 text-xs text-neutral-400 font-mono">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                                {formattedDate}
                              </span>
                            </td>

                            {/* Actions Panel */}
                            <td className="p-4 text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Approve Action */}
                                <button
                                  onClick={() => handleApproveProperty(p.id)}
                                  disabled={isApproved || actionInProgress === p.id}
                                  title={isApproved ? "Propiedad ya autorizada" : "Aprobar Propiedad"}
                                  className={`p-1.5 rounded transition-all text-[10px] font-bold flex items-center justify-center gap-1 border ${
                                    isApproved 
                                      ? "bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed" 
                                      : "bg-emerald-500/10 hover:bg-emerald-600 hover:text-neutral-950 border-emerald-500/25 text-emerald-400"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span className="hidden lg:inline">Aprobar</span>
                                </button>

                                {/* Reject Action */}
                                <button
                                  onClick={() => handleRejectProperty(p.id)}
                                  disabled={isRejected || actionInProgress === p.id}
                                  title={isRejected ? "Propiedad ya rechazada" : "Rechazar Propiedad"}
                                  className={`p-1.5 rounded transition-all text-[10px] font-bold flex items-center justify-center gap-1 border ${
                                    isRejected 
                                      ? "bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed" 
                                      : "bg-rose-500/10 hover:bg-rose-600 hover:text-white border-rose-500/25 text-rose-400"
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span className="hidden lg:inline">Rechazar</span>
                                </button>

                                {/* Edit Action */}
                                <button
                                  onClick={() => handleStartEditing(p)}
                                  disabled={actionInProgress === p.id}
                                  title="Editar Propiedad"
                                  className="p-1.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-600 hover:text-white text-neutral-400 rounded transition-all text-[10px] font-semibold flex items-center justify-center gap-1"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
                                  <span className="hidden lg:inline">Editar</span>
                                </button>

                                {/* Delete Action */}
                                <button
                                  onClick={() => handleDeletePropertyCheck(p.id)}
                                  disabled={actionInProgress === p.id}
                                  title="Eliminar Propiedad"
                                  className="p-1.5 bg-neutral-950 border border-neutral-850 hover:bg-rose-950/20 hover:border-rose-850/40 text-neutral-600 hover:text-rose-500 rounded transition-all flex items-center justify-center"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
          </div>
        ) : (
          <div>
            {/* Header, Search, Filters */}
            <div className="p-6 border-b border-neutral-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900/40">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[#cca355] font-mono">Directorio de Usuarios de Altura</h3>
                <p className="text-[10px] text-neutral-400 font-medium">Asigna privilegios y audita roles globales de gobernanza de la plataforma</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o correo..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-150 border border-slate-800 rounded-2xl p-1 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => setRoleFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all ${
                      roleFilter === "all" ? "bg-[#cca355] text-neutral-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setRoleFilter("admin")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all ${
                      roleFilter === "admin" ? "bg-[#cca355] text-neutral-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Admins
                  </button>
                  <button
                    onClick={() => setRoleFilter("member")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all ${
                      roleFilter === "member" ? "bg-[#cca355] text-neutral-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Miembros
                  </button>
                </div>
              </div>
            </div>

            {/* Directory List */}
            <div className="divide-y divide-slate-800">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  <Users className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <span>No se encontraron usuarios bajo este filtro.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 uppercase tracking-widest text-[9px] font-bold border-b border-fold-800 font-mono">
                        <th className="p-4 pl-6">Usuario</th>
                        <th className="p-4">Contacto</th>
                        <th className="p-4">Rol</th>
                        <th className="p-4">Registro</th>
                        <th className="p-4 text-right pr-6">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredUsers.map((u) => {
                        const isSelf = u.id === user?.uid;
                        const isUserAdmin = u.role === "admin";
                        const isJoined = u.createdAt?.toDate ? u.createdAt.toDate() : null;

                        return (
                          <tr key={u.id} className="hover:bg-slate-800/10 transition-colors">
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                                  {u.photoURL ? (
                                    <img src={u.photoURL} alt={u.displayName || "User"} referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className="text-xs font-bold text-indigo-400 font-mono font-bold">
                                      {(u.displayName || "U")[0].toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-white">
                                      {u.displayName || "Nombre de Usuario"}
                                    </span>
                                    {isSelf && (
                                      <span className="text-[8px] bg-[#cca355]/20 text-[#ddb771] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">
                                        Tú
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-slate-500 font-mono">{u.id}</span>
                                </div>
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold">
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                <span>{u.email || "No provisto"}</span>
                              </div>
                            </td>

                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                isUserAdmin 
                                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                                  : "bg-slate-950 border border-slate-800 text-slate-400"
                              }`}>
                                <Shield className="w-3 h-3Color text-[#cca355]" />
                                {isUserAdmin ? "Administrador" : "Miembro"}
                              </span>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span>
                                  {isJoined ? isJoined.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : "Desconocido"}
                                </span>
                              </div>
                            </td>

                            <td className="p-4 text-right pr-6">
                              <button
                                onClick={() => handleToggleRole(u.id, u.role)}
                                disabled={isSelf || roleChangeLoading === u.id}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider ${
                                  isSelf 
                                    ? "bg-slate-950 border border-slate-900 text-slate-705 cursor-not-allowed"
                                    : roleChangeLoading === u.id
                                    ? "bg-slate-950 border border-slate-800 text-slate-500"
                                    : isUserAdmin
                                    ? "bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white"
                                    : "bg-[#cca355] hover:bg-[#cca355]/85 text-neutral-950"
                                }`}
                              >
                                {roleChangeLoading === u.id ? (
                                  <span className="w-3 h-3 inline-block border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                ) : isUserAdmin ? (
                                  "Degradar"
                                ) : (
                                  "Hacer Admin"
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Editing Property Modal Overlay */}
      <AnimatePresence>
        {editingProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Blurry Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProperty(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Dialog Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0f0f0f] border border-neutral-800 rounded-3xl w-full max-w-lg relative z-10 shadow-2xl overflow-hidden text-left"
            >
              <div className="p-6 border-b border-neutral-850 bg-neutral-900/40 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#cca355]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Editar Parámetros de Propiedad</h3>
                </div>
                <button
                  onClick={() => setEditingProperty(null)}
                  className="p-1.5 bg-neutral-950 border border-neutral-850 text-neutral-400 hover:text-white rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePropertyEdit} className="p-6 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-mono">Nombre / Título de Diseño *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cca355] font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Price */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-mono">Precio tasado (USD) *</label>
                    <input
                      type="number"
                      required
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#cca355]"
                    />
                  </div>

                  {/* Status Select */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-mono">Estado de Inventario</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 text-xs text-white font-semibold focus:outline-none focus:border-[#cca355]"
                    >
                      <option value="Available">Disponible</option>
                      <option value="EN_REVISION">En Revisión</option>
                      <option value="RECHAZADO">Rechazado</option>
                      <option value="Leased">Alquilado</option>
                      <option value="Sold">Vendido</option>
                      <option value="Reserved">Reservado</option>
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-mono">Ubicación Geográfica *</label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#cca355]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Tipo de Negocio */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#cca355] font-mono">Tipo de Negocio *</label>
                    <select
                      value={editBusinessType}
                      onChange={(e) => setEditBusinessType(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl p-3 text-xs text-white font-semibold focus:outline-none focus:border-[#cca355]"
                    >
                      <option value="Venta">Venta</option>
                      <option value="Alquiler">Alquiler</option>
                      <option value="Venta y Alquiler">Venta y Alquiler</option>
                    </select>
                  </div>

                  {/* Area (Superficie) */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 font-mono">Superficie Terreno / Unidad (m²)</label>
                    <input
                      type="number"
                      required
                      value={editArea}
                      onChange={(e) => setEditArea(e.target.value)}
                      className="w-full bg-[#030303] bg-neutral-950 border border-neutral-850 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-[#cca355]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-850 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingProperty(null)}
                    className="px-4 py-2.5 bg-neutral-950 border border-neutral-850 text-neutral-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#cca355] text-neutral-950 hover:bg-[#ddb771] rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
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
