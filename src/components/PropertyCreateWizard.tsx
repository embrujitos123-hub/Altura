import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "../lib/firebase";
import { useFirebase } from "./FirebaseProvider";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Sparkles,
  Building,
  MapPin,
  Maximize2,
  Bed,
  Bath,
  DollarSign,
  Percent,
  Car,
  Layers,
  Map,
  TrendingUp
} from "lucide-react";

interface PropertyCreateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const MODERN_PRESETS = [
  { name: "Glass Penthouse", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80" },
  { name: "Brutalist Concrete Villa", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80" }
];

export function getTypeGroup(type: string): "COMERCIAL" | "LOTES_FINCAS" | "CASAS" {
  if (["Local comercial", "Oficina", "Edificio", "Bodega", "Proyecto", "Inversión"].includes(type)) {
    return "COMERCIAL";
  }
  if (["Lote", "Finca"].includes(type)) {
    return "LOTES_FINCAS";
  }
  return "CASAS";
}

export function PropertyCreateWizard({ isOpen, onClose, onSubmitSuccess }: PropertyCreateWizardProps) {
  const { user } = useFirebase();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Image Upload States
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [fileName: string]: number }>({});
  const [uploadError, setUploadError] = useState("");

  // Step 1 State: Basic Information
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Casa");
  const [businessType, setBusinessType] = useState("Venta");
  const [description, setDescription] = useState("");

  // Step 2 State: Technical Specifications
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("2");

  // Dynamic Specific parameters (COMERCIAL, LOTES/FINCAS, CASAS)
  const [roi, setRoi] = useState("");
  const [cashFlow, setCashFlow] = useState("");
  const [zoning, setZoning] = useState("");
  const [parking, setParking] = useState("");
  const [landUse, setLandUse] = useState("");
  const [water, setWater] = useState("Sí");
  const [electricity, setElectricity] = useState("Sí");
  const [topography, setTopography] = useState("Plana");
  const [streetFront, setStreetFront] = useState("");
  const [amenities, setAmenities] = useState("");

  // Step 3 State: Pricing & final status summary
  const [price, setPrice] = useState("");

  // Clean form fields
  const resetForm = () => {
    console.log("Reiniciando valores del formulario de propiedad...");
    setStep(1);
    setTitle("");
    setType("Casa");
    setBusinessType("Venta");
    setDescription("");
    setLocation("");
    setArea("");
    setBedrooms("2");
    setBathrooms("2");
    setRoi("");
    setCashFlow("");
    setZoning("");
    setParking("");
    setLandUse("");
    setWater("Sí");
    setElectricity("Sí");
    setTopography("Plana");
    setStreetFront("");
    setAmenities("");
    setPrice("");
    setFormError("");
    setSuccessMessage("");
    setSelectedImages([]);
    // Revoke object URLs to avoid memory leaks
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setUploadProgress({});
    setUploadError("");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    const files = e.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    // Combine currently selected files with new ones (up to 5 maximum)
    const totalFiles = [...selectedImages];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        setUploadError("Por favor seleccione únicamente imágenes (Los videos no están permitidos).");
        continue;
      }
      
      // Check if we reached maximum
      if (totalFiles.length + newFiles.length >= 5) {
        setUploadError("Has alcanzado el límite máximo de 5 imágenes.");
        break;
      }
      
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setSelectedImages(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    // Clear name from upload progress if it's there
    const fileName = selectedImages[index]?.name;
    if (fileName && uploadProgress[fileName] !== undefined) {
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next[fileName];
        return next;
      });
    }
  };

  if (!isOpen) return null;

  // Validation routines per step
  const handleNextStep = () => {
    setFormError("");
    setSuccessMessage("");
    
    if (step === 1) {
      if (!title.trim()) {
        setFormError("El título de la propiedad es requerido.");
        return;
      }
      console.log("Paso 1 completado con éxito. Pasando a Paso 2 (Detalles técnicos).");
      setStep(2);
    } else if (step === 2) {
      if (!location.trim()) {
        setFormError("La ubicación es requerida.");
        return;
      }
      const areaNum = parseFloat(area);
      if (!area || isNaN(areaNum) || areaNum <= 0) {
        setFormError("La superficie m² debe ser un número positivo.");
        return;
      }
      console.log("Paso 2 completado con éxito. Pasando a Paso 3 (Tasación).");
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setFormError("");
    setSuccessMessage("");
    setStep(prev => Math.max(1, prev - 1));
  };

  // Submit text representation strictly to Firestore
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setFormError("El precio de tasación debe ser un número positivo.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setSuccessMessage("");
    console.log("[STORAGE_DIAGNOSTIC] Iniciando envío de la propiedad a Firestore con imágenes...");
    console.log("[STORAGE_DIAGNOSTIC] Firebase Storage Bucket configurado:", storage.app.options.storageBucket || "No configurado explícitamente en variables locales");
    console.log("[STORAGE_DIAGNOSTIC] Current user ID:", user?.uid || "Anonymous/Not logged in");

    // Elegant high-end background preset illustration chosen randomly or first preset
    const defaultPlaceholderUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";

    let urls: string[] = [];
    if (selectedImages.length > 0) {
      console.log(`[STORAGE_DIAGNOSTIC] Preparando subida de ${selectedImages.length} imágenes...`);
      try {
        const uploadPromises = selectedImages.map((file, i) => {
          return new Promise<string>((resolve, reject) => {
            const fileExtension = file.name.split('.').pop() || 'jpg';
            const storagePath = `properties/${Date.now()}_img_${i}_${Math.floor(Math.random() * 1000)}.${fileExtension}`;
            const storageRef = ref(storage, storagePath);
            
            console.log(`[STORAGE_DIAGNOSTIC] [Imagen #${i + 1}] Iniciando tarea para: "${file.name}"`);
            console.log(`[STORAGE_DIAGNOSTIC] - Tamaño del archivo: ${(file.size / (1024 * 1024)).toFixed(3)} MB`);
            console.log(`[STORAGE_DIAGNOSTIC] - Tipo de contenido: "${file.type}"`);
            console.log(`[STORAGE_DIAGNOSTIC] - Ruta en Storage: "${storagePath}"`);
            console.log(`[STORAGE_DIAGNOSTIC] - Referencia completa:`, storageRef.toString());

            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const percentage = snapshot.totalBytes > 0 
                  ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                  : 0;
                
                console.log(`[STORAGE_DIAGNOSTIC] [Imagen #${i + 1}] "${file.name}" -> Progreso: ${percentage}% (${snapshot.bytesTransferred} de ${snapshot.totalBytes} bytes)`);
                
                setUploadProgress((prev) => ({
                  ...prev,
                  [file.name]: percentage,
                }));
              },
              (error: any) => {
                console.error(`[STORAGE_DIAGNOSTIC] [Imagen #${i + 1}] Error crítico subiendo "${file.name}":`, error);
                // Attach a helpful message depending on the common Firebase Storage errors
                let friendlyMsg = error.message || String(error);
                if (error.code === 'storage/unauthorized') {
                  friendlyMsg = "Permiso denegado por las reglas de seguridad de Firebase Storage (unauthorized). Verifique que las reglas permitan la escritura.";
                } else if (error.code === 'storage/canceled') {
                  friendlyMsg = "La carga del archivo fue cancelada por el usuario o navegador.";
                } else if (error.code === 'storage/unknown') {
                  friendlyMsg = "Error desconocido del servidor de almacenamiento. Intente con una imagen más pequeña.";
                }
                reject(new Error(`[Archivo: ${file.name}] ${friendlyMsg}`));
              },
              async () => {
                try {
                  console.log("upload success");
                  console.log(`[STORAGE_DIAGNOSTIC] [Imagen #${i + 1}] "${file.name}" subida completada con éxito. Solicitando URL pública...`);
                  const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                  console.log("download URL generated: " + downloadUrl);
                  console.log(`[STORAGE_DIAGNOSTIC] [Imagen #${i + 1}] URL obtenida con éxito: "${downloadUrl}"`);
                  resolve(downloadUrl);
                } catch (urlErr: any) {
                  console.error(`[STORAGE_DIAGNOSTIC] [Imagen #${i + 1}] Fallo obteniendo downloadURL para "${file.name}":`, urlErr);
                  reject(new Error(`No se pudo generar el enlace de descarga para ${file.name}: ${urlErr.message || urlErr}`));
                }
              }
            );
          });
        });

        urls = await Promise.all(uploadPromises);
        console.log("[STORAGE_DIAGNOSTIC] ¡Éxito absoluto! Todas las imágenes se subieron y se obtuvieron sus URLs:", urls);
      } catch (err: any) {
        console.error("[STORAGE_DIAGNOSTIC] Capturado error en bloque general de carga:", err);
        setFormError(`Error durante la carga de imágenes: ${err.message || err}`);
        setIsSubmitting(false);
        return;
      }
    }

    const propertyData = {
      title: title.trim(),
      location: location.trim(),
      price: priceNum,
      type,
      businessType, // Options Venta | Alquiler | Venta y Alquiler
      status: "EN_REVISION", // MANDATORY EN_REVISION initial state
      area: parseFloat(area),
      bedrooms: parseInt(bedrooms) || 0,
      bathrooms: parseInt(bathrooms) || 0,
      imageUrl: urls.length > 0 ? urls[0] : defaultPlaceholderUrl,
      imageUrls: urls.length > 0 ? urls : [defaultPlaceholderUrl],
      description: description.trim() || "Propiedad premium de diseño exclusivo bajo tasación de catálogo Altura.",
      ownerId: user?.uid || "anon",
      createdAt: serverTimestamp(),
      // Specific specification fields for adaptive grouping parameters:
      roi: roi.trim() ? parseFloat(roi) || 0 : null,
      cashFlow: cashFlow.trim() ? parseFloat(cashFlow) || 0 : null,
      zoning: zoning.trim() || null,
      parking: parking.trim() ? parseInt(parking) || 0 : null,
      landUse: landUse.trim() || null,
      water: water.trim() || null,
      electricity: electricity.trim() || null,
      topography: topography.trim() || null,
      streetFront: streetFront.trim() ? parseFloat(streetFront) || 0 : null,
      amenities: amenities.trim() || null
    };

    console.log("Firestore save started", propertyData);

    try {
      const docRef = await addDoc(collection(db, "properties"), propertyData);
      console.log("Firestore save success");
      console.log("[STORAGE_DIAGNOSTIC] Éxito de inserción en Firestore. ID asignado:", docRef.id);
      
      setSuccessMessage("¡Propiedad registrada con éxito en la base de datos de Altura!");
      
      setTimeout(() => {
        onSubmitSuccess();
        resetForm();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error("Firestore save failed", error);
      const errorMsg = error?.message || String(error);
      console.error("Firestore save error: " + errorMsg);
      console.error("Fallo crítico detectado en inserción Firestore:", error);
      try {
        handleFirestoreError(error, OperationType.CREATE, "properties");
      } catch (processedErr: any) {
        setFormError(`No se pudo guardar la propiedad: ${processedErr.message || processedErr}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark blurry backdrop overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        onClick={() => !isSubmitting && onClose()}
        className="absolute inset-0 bg-black backdrop-blur-xs"
        id="create-wizard-overlay"
      />

      {/* Main Wizard Card container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl flex flex-col font-sans"
        id="create-wizard-card"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-900 flex justify-between items-center bg-neutral-50/55 dark:bg-neutral-950/20">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Registrar Nueva Propiedad</h3>
            <p className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase font-semibold mt-0.5">Asistente de Catalogación en Pasos</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 border border-neutral-200 dark:border-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded text-neutral-500 hover:text-black dark:hover:text-white transition-all disabled:opacity-30"
            id="wizard-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Stepper HUD indicator bar */}
        <div className="px-6 py-3 bg-neutral-100/60 dark:bg-neutral-950/40 border-b border-neutral-100 dark:border-neutral-900 grid grid-cols-3 gap-2 text-center">
          {[
            { num: 1, label: "Info Básica" },
            { num: 2, label: "Detalles" },
            { num: 3, label: "Tasación" }
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-1">
              <div className="flex items-center w-full">
                <div className={`h-1.5 rounded-full w-full transition-all duration-300 ${
                  step >= s.num ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
                }`} />
              </div>
              <span className={`text-[9px] font-mono font-bold tracking-tight uppercase ${
                step === s.num ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-600"
              }`}>
                {s.num}. {s.label}
              </span>
            </div>
          ))}
        </div>

        {formError && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded text-xs text-center font-bold font-sans">
            {formError}
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded text-xs text-center font-bold font-sans">
            {successMessage}
          </div>
        )}

        {/* Dynamic Wizard Body Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#9c9c9c] font-mono">Nombre / Título de la Propiedad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Penthouse Moderno de Cristal y Cuarzo"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-3 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 dark:focus:border-white font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-100 dark:border-neutral-900 p-4 rounded mt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#9c9c9c] font-mono block mb-1.5">Tipo de Propiedad *</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-3 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
                    >
                      <option value="Casa">Casa</option>
                      <option value="Condominio">Condominio</option>
                      <option value="Apartamento">Apartamento</option>
                      <option value="Lote">Lote</option>
                      <option value="Finca">Finca</option>
                      <option value="Casa de playa">Casa de playa</option>
                      <option value="Local comercial">Local comercial</option>
                      <option value="Oficina">Oficina</option>
                      <option value="Edificio">Edificio</option>
                      <option value="Bodega">Bodega</option>
                      <option value="Proyecto">Proyecto</option>
                      <option value="Airbnb">Airbnb</option>
                      <option value="Inversión">Inversión</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-100 dark:border-neutral-900 p-4 rounded mt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#9c9c9c] font-mono block mb-1.5">Tipo de Negocio *</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-3 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
                    >
                      <option value="Venta">Venta</option>
                      <option value="Alquiler">Alquiler</option>
                      <option value="Venta y Alquiler">Venta y Alquiler</option>
                    </select>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-orange-700 dark:text-amber-400 rounded flex items-center gap-2 text-[10px] font-mono">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Configuración seleccionada para {type} en {businessType}.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#9c9c9c] font-mono">Descripción Técnica (Opcional)</label>
                  <textarea
                    rows={4}
                    placeholder="Describe los acabados, orientación, vistas panorámicas y cualquier elemento premium adicional..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-3 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 dark:focus:border-white resize-none"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#9c9c9c] font-mono flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" /> Ubicación Geográfica *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Barcelona, Pedralbes"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-3 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 dark:focus:border-white font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#9c9c9c] font-mono flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-neutral-400" /> Superficie m² *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="180"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-3 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 dark:focus:border-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="border-t border-neutral-100 dark:border-neutral-900 pt-5 mt-3">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-900 text-white dark:bg-white dark:text-black px-2 py-0.5 rounded">
                      Campos de Categoría {getTypeGroup(type)}
                    </span>
                    <span className="text-[9px] text-neutral-400 font-mono">Modo adaptativo inteligente</span>
                  </div>

                  {getTypeGroup(type) === "COMERCIAL" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-neutral-400" /> ROI Anual Estimado (%)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 8.5"
                          value={roi}
                          onChange={(e) => setRoi(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs text-neutral-900 dark:text-white font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-neutral-400" /> Flujo de Caja (USD/mes)
                        </label>
                        <input
                          type="number"
                          placeholder="Ej: 3500"
                          value={cashFlow}
                          onChange={(e) => setCashFlow(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs text-neutral-900 dark:text-white font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-neutral-400" /> Zonificación
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Comercial Alta Densidad (CAD)"
                          value={zoning}
                          onChange={(e) => setZoning(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs font-semibold text-neutral-900 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-neutral-400" /> Espacios de Parqueo
                        </label>
                        <input
                          type="number"
                          placeholder="Ej: 12"
                          value={parking}
                          onChange={(e) => setParking(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs text-neutral-900 dark:text-white font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {getTypeGroup(type) === "LOTES_FINCAS" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono flex items-center gap-1.5">
                          <Map className="w-3.5 h-3.5 text-neutral-400" /> Uso de Suelo
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Agroindustrial premium / Habitacional nivel 1"
                          value={landUse}
                          onChange={(e) => setLandUse(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs font-semibold text-neutral-900 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono block">Agua Potable</label>
                        <select
                           value={water}
                           onChange={(e) => setWater(e.target.value)}
                           className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none"
                        >
                          <option value="Sí">Sí (Conexión Activa)</option>
                          <option value="No">No Disponible</option>
                          <option value="Prevista / Concesión">Concesión / Prevista</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono block">Electricidad</label>
                        <select
                           value={electricity}
                           onChange={(e) => setElectricity(e.target.value)}
                           className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none"
                        >
                          <option value="Sí">Sí (Acometida estándar)</option>
                          <option value="Trifásica">Trifásica / Alta Potencia</option>
                          <option value="No">No Disponible</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono block">Topografía</label>
                        <input
                          type="text"
                          placeholder="Ej: Plana / Regular / Ondulada"
                          value={topography}
                          onChange={(e) => setTopography(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs font-semibold text-neutral-900 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">Frente Calle (m)</label>
                        <input
                          type="number"
                          placeholder="Ej: 30"
                          value={streetFront}
                          onChange={(e) => setStreetFront(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs text-neutral-900 dark:text-white font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {getTypeGroup(type) === "CASAS" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono flex items-center gap-1.5">
                          <Bed className="w-3.5 h-3.5 text-neutral-400" /> Habitaciones / Dormitorios
                        </label>
                        <select
                          value={bedrooms}
                          onChange={(e) => setBedrooms(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none"
                        >
                          <option value="1">1 Dormitorio</option>
                          <option value="2">2 Dormitorios</option>
                          <option value="3">3 Dormitorios</option>
                          <option value="4">4 Dormitorios</option>
                          <option value="5">5+ Dormitorios</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono flex items-center gap-1.5">
                          <Bath className="w-3.5 h-3.5 text-neutral-400" /> Cuartos de Baño
                        </label>
                        <select
                          value={bathrooms}
                          onChange={(e) => setBathrooms(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none"
                        >
                          <option value="1">1 Baño</option>
                          <option value="2">2 Baños</option>
                          <option value="3">3 Baños</option>
                          <option value="4">4+ Baños</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-neutral-400" /> Plazas de Parqueo
                        </label>
                        <input
                          type="number"
                          placeholder="Ej: 2"
                          value={parking}
                          onChange={(e) => setParking(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs text-neutral-900 dark:text-white font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1.5 bg-neutral-50/40 dark:bg-neutral-950/20 border border-neutral-150 p-3 rounded sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-neutral-400" /> Amenidades Exclusivas
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Piscina Privada, Club House, Seguridad 24/7, Fibra Óptica, Deck"
                          value={amenities}
                          onChange={(e) => setAmenities(e.target.value)}
                          className="w-full bg-white dark:bg-[#151515] border border-neutral-200 dark:border-neutral-850 rounded p-2.5 text-xs text-neutral-900 dark:text-white"
                        />
                        <span className="text-[9px] text-neutral-400 font-mono">Separa las amenidades utilizando comas para mejor indexación.</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Pricing validation */}
                <div className="space-y-4 bg-linear-to-br from-neutral-50 to-white dark:from-[#111111] dark:to-[#0a0a0a]/50 border border-neutral-200/60 dark:border-neutral-900 p-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#9c9c9c] font-mono flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-amber-500 animate-pulse" /> 
                      {
                        businessType === "Alquiler" 
                          ? "Precio mensual (USD) *" 
                          : businessType === "Venta"
                          ? "Precio de venta (USD) *"
                          : "Precio de venta y alquiler mensual (USD) *"
                      }
                    </label>
                    <span className={`text-[8px] font-extrabold uppercase tracking-widest font-mono px-2 py-0.5 rounded-full border ${
                      businessType === "Alquiler"
                        ? "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400"
                        : businessType === "Venta y Alquiler"
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-500"
                    }`}>
                      {businessType}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-neutral-400 select-none">
                      $
                    </span>
                    <input
                      type="number"
                      required
                      placeholder={businessType === "Alquiler" ? "Ej: 2200" : "Ej: 850000"}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-lg py-3 pl-8 pr-4 text-sm font-bold font-mono text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 dark:focus:ring-amber-500/15 dark:focus:border-[#cca355] transition-all"
                    />
                  </div>

                  <p className="text-[9px] text-neutral-400 font-sans leading-relaxed">
                    {
                      businessType === "Alquiler" 
                        ? "Sugerido según cánones de arrendamiento de la zona e índices de plusvalía." 
                        : "Sugerido según tipología local e índices de plusvalía residencial."
                    }
                  </p>
                </div>

                {/* IMAGE UPLOAD PANEL */}
                <div className="space-y-4 bg-linear-to-br from-neutral-50 to-white dark:from-[#111111] dark:to-[#0a0a0a]/50 border border-neutral-200/60 dark:border-neutral-900 p-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#cca355] font-mono flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      Subir imágenes de la propiedad
                    </label>
                    <span className="text-[9px] font-mono text-neutral-400">
                      {selectedImages.length} de 5 seleccionadas
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-6 bg-white dark:bg-[#151515] hover:border-amber-500/50 dark:hover:border-amber-500/30 transition-colors relative">
                    <input
                      type="file"
                      id="property-images-upload"
                      multiple
                      accept="image/*"
                      disabled={isSubmitting}
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-full text-[#cca355]">
                        <Building className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Haga clic o presione aquí para cargar fotos
                      </span>
                      <span className="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-800 text-white rounded text-[9px] font-mono font-bold uppercase tracking-wider mt-1.5">
                        Seleccionar imágenes
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-1">
                        Límite: 5 fotos (JPG, PNG o WEBP)
                      </span>
                    </div>
                  </div>

                  {uploadError && (
                    <p className="text-[10px] font-mono font-bold text-rose-500 dark:text-rose-400 bg-rose-500/10 border border-rose-500/15 p-2 rounded text-center">
                      {uploadError}
                    </p>
                  )}

                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 pt-2">
                      {imagePreviews.map((url, idx) => {
                        const file = selectedImages[idx];
                        const progress = file ? uploadProgress[file.name] : undefined;
                        return (
                          <div key={idx} className="relative aspect-square border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden group bg-neutral-100 dark:bg-neutral-900">
                            <img
                              src={url}
                              alt={`preview_${idx}`}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            
                            {/* Individual progress overlay */}
                            {progress !== undefined && progress < 100 && (
                              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-[9px] text-white font-mono font-bold">
                                <span>{progress}%</span>
                                <div className="w-10 h-1 bg-neutral-800 rounded-full overflow-hidden mt-1">
                                  <div className="h-full bg-amber-500" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            )}

                            {progress === 100 && (
                              <div className="absolute inset-0 bg-[#000000]/40 flex items-center justify-center text-emerald-500 text-xs font-bold">
                                ✓
                              </div>
                            )}

                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black text-white hover:text-rose-500 rounded transition-colors opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Final Review Board */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#9c9c9c] font-mono block">Resumen de Registro de Catastro</span>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs bg-neutral-50/40 dark:bg-neutral-950/10 border border-neutral-100 dark:border-neutral-900 p-4 rounded-lg divide-y divide-neutral-100/50 dark:divide-neutral-900/50">
                    <div className="col-span-2 pb-2">
                      <span className="text-[9px] font-bold text-neutral-400 font-mono block">Título de la Propiedad</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{title || "Sin título"}</span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[9px] font-bold text-neutral-400 font-mono block">Tipografía / Tipo</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{type}</span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[9px] font-bold text-neutral-400 font-mono block">Tipo de Negocio</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-500 font-mono text-[10px]">{businessType}</span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[9px] font-bold text-neutral-400 font-mono block">Ubicación</span>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-neutral-400" /> {location || "No provista"}
                      </span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[9px] font-bold text-neutral-400 font-mono block">Superficie Terreno / Unidad</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{area || "0"} m²</span>
                    </div>

                    {getTypeGroup(type) === "CASAS" ? (
                      <>
                        <div className="pt-2">
                          <span className="text-[9px] font-bold text-neutral-400 font-mono block">Dormitorios / Baños</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{bedrooms} Hab, {bathrooms} Baños</span>
                        </div>
                        {parking && (
                          <div className="pt-2">
                            <span className="text-[9px] font-bold text-neutral-400 font-mono block">Estacionamientos</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{parking} espacios</span>
                          </div>
                        )}
                        {amenities && (
                          <div className="col-span-2 pt-2">
                            <span className="text-[9px] font-bold text-neutral-400 font-mono block">Amenidades</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{amenities}</span>
                          </div>
                        )}
                      </>
                    ) : getTypeGroup(type) === "COMERCIAL" ? (
                      <>
                        <div className="pt-2">
                          <span className="text-[9px] font-bold text-neutral-400 font-mono block">Rentabilidad ROI</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{roi ? `${roi}% anual` : "No registrado"}</span>
                        </div>
                        {cashFlow && (
                          <div className="pt-2">
                            <span className="text-[9px] font-bold text-neutral-400 font-mono block">Flujo de Caja</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">${cashFlow} USD/mes</span>
                          </div>
                        )}
                        <div className="pt-2">
                          <span className="text-[9px] font-bold text-neutral-400 font-mono block">Zonificación</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{zoning || "No especificada"}</span>
                        </div>
                        {parking && (
                          <div className="pt-2">
                            <span className="text-[9px] font-bold text-neutral-400 font-mono block">Parqueos</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{parking} espacios</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="pt-2">
                          <span className="text-[9px] font-bold text-neutral-400 font-mono block">Uso de Suelo Autorizado</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{landUse || "No especificado"}</span>
                        </div>
                        <div className="pt-2">
                          <span className="text-[9px] font-bold text-neutral-400 font-mono block">Topografía Lote</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{topography || "Plana"}</span>
                        </div>
                        <div className="pt-2">
                          <span className="text-[9px] font-bold text-neutral-400 font-mono block">Acceso Servicios</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono text-[10px]">Agua: {water} | Luz: {electricity}</span>
                        </div>
                        {streetFront && (
                          <div className="pt-2">
                            <span className="text-[9px] font-bold text-neutral-400 font-mono block font-sans">Frente a Calle</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">{streetFront} metros</span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="col-span-2 pt-2">
                      <span className="text-[9px] font-bold text-neutral-400 font-mono block">Ilustración de Portada</span>
                      <span className="font-semibold text-[#cca355] font-mono text-[10px]">
                        {selectedImages.length > 0
                          ? `Se cargarán ${selectedImages.length} imágenes personalizadas a Firebase Storage`
                          : "Imagen del catálogo Altura preestablecida automáticamente (Sin Cargas)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Initial State Gate Warning */}
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                    <span>ENTORNO DE AUDITORÍA PROTOCOLARES</span>
                  </div>
                  <p className="text-[10px] font-medium leading-relaxed">
                    <strong>Estado inicial: EN_REVISION.</strong> Según regulación inmobiliaria de la plataforma Altura, esta propiedad NO se publicará automáticamente en listados de venta activa hasta ser autorizada por tasación y control de calidad de administradores.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-6 border-t border-neutral-100 dark:border-neutral-950 bg-neutral-50/50 dark:bg-neutral-950/20 flex justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={step === 1 || isSubmitting}
            className="px-4 py-2 border border-neutral-200 dark:border-neutral-850 bg-[#fafafa] dark:bg-[#0c0c0c] text-neutral-800 dark:text-neutral-300 rounded font-semibold text-xs tracking-wide hover:bg-neutral-150 hover:text-black dark:hover:bg-neutral-900 flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Atrás</span>
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-semibold text-xs rounded transition-all flex items-center gap-1.5"
            >
              <span>Continuar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-neutral-900 dark:bg-[#cca355] text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-[#ddb771] font-bold text-xs rounded transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>Registrar Propiedad</span>
                  <Check className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
