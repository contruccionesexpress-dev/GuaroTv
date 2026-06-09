import { useState, useEffect, useRef, useCallback } from "react";

interface Gaceta {
  id: number;
  title: string;
  track: string;
  country: "VEN" | "USA";
  date: string;
  link: string;
}

interface ChannelAdj {
  cropTop: number;
  zoom: number;
}

const DEFAULT_GACETAS: Gaceta[] = [
  { id: 1, title: "Gaceta Hípica Oficial", track: "La Rinconada", country: "VEN", date: "2026-06-14", link: "https://www.desafiohipico.com/retrospectos" },
  { id: 2, title: "Línea del Éxito", track: "Valencia", country: "VEN", date: "2026-06-13", link: "https://www.desafiohipico.com/retrospectos" },
  { id: 3, title: "Daily Racing Form", track: "Gulfstream Park", country: "USA", date: "2026-06-14", link: "https://grtv.us/" },
];

const VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-horse-racing-on-a-sunny-day-40291-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-running-race-horses-side-view-40289-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-horse-jumping-obstacles-41584-large.mp4",
];

interface ToastState {
  visible: boolean;
  title: string;
  message: string;
  icon: string;
  isAlert: boolean;
}

interface ChatMsg {
  id: number;
  badge: string;
  badgeClass: string;
  author: string;
  authorClass: string;
  text: string;
  textClass: string;
}

export default function App() {
  const [role, setRole] = useState<"viewer" | "admin">("viewer");
  const [activeChannel, setActiveChannel] = useState<1 | 2 | 3 | "multi">(1);
  const [isGuaroRoom, setIsGuaroRoom] = useState(false);
  const [realLink, setRealLink] = useState("Generando url...");
  const [gacetas, setGacetas] = useState<Gaceta[]>(DEFAULT_GACETAS);
  const [filter, setFilter] = useState<"ALL" | "VEN" | "USA">("ALL");
  const [toast, setToast] = useState<ToastState>({ visible: false, title: "", message: "", icon: "🛡️", isAlert: false });
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { id: 1, badge: "VIP", badgeClass: "bg-emerald-950 text-emerald-400 border border-emerald-500/20", author: "Carlos_Hipico:", authorClass: "text-amber-400", text: "¡Qué buena calidad se ve la señal hoy, Guaro! Arrasando.", textClass: "text-slate-300" },
    { id: 2, badge: "FIJO 🐎", badgeClass: "bg-red-950 text-red-400 border border-red-500/20", author: "El_Guaro_Informa:", authorClass: "text-red-400", text: "¡Atentos que ya subí las revistas autorizadas abajo para descarga gratuita!", textClass: "text-amber-200 font-semibold" },
  ]);
  const [chatInput, setChatInput] = useState("");

  const [channelAdj, setChannelAdj] = useState<Record<number, ChannelAdj>>({
    1: { cropTop: 30, zoom: 110 },
    2: { cropTop: 0, zoom: 100 },
    3: { cropTop: 0, zoom: 100 },
  });
  const [selectedAdjChan, setSelectedAdjChan] = useState(1);
  const [cropTopVal, setCropTopVal] = useState(30);
  const [zoomVal, setZoomVal] = useState(110);

  const [adminTitle, setAdminTitle] = useState("");
  const [adminTrack, setAdminTrack] = useState("");
  const [adminCountry, setAdminCountry] = useState<"VEN" | "USA">("VEN");
  const [adminDate, setAdminDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [adminLink, setAdminLink] = useState("");

  const [dlModal, setDlModal] = useState(false);
  const [dlTitle, setDlTitle] = useState("");
  const [dlSubtitle, setDlSubtitle] = useState("");
  const [dlPercent, setDlPercent] = useState(0);
  const [dlLink, setDlLink] = useState("#");
  const [dlReady, setDlReady] = useState(false);
  const dlIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [recording, setRecording] = useState<Record<number, boolean>>({ 1: false, 2: false, 3: false });
  const mediaRecorderRef = useRef<Record<number, MediaRecorder | null>>({ 1: null, 2: null, 3: null });
  const recordedChunksRef = useRef<Record<number, Blob[]>>({ 1: [], 2: [], 3: [] });

  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);
  const videoRef3 = useRef<HTMLVideoElement>(null);
  const viewportRef1 = useRef<HTMLDivElement>(null);
  const viewportRef2 = useRef<HTMLDivElement>(null);
  const viewportRef3 = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getVideoRef = (ch: number) => [videoRef1, videoRef2, videoRef3][ch - 1];
  const getViewportRef = (ch: number) => [viewportRef1, viewportRef2, viewportRef3][ch - 1];

  const triggerNotification = useCallback((title: string, message: string, icon = "🛡️", isAlert = false) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, title, message, icon, isAlert });
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3200);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guaro = params.get("sala") === "elguaro" || window.location.hash === "#elguaro";
    setIsGuaroRoom(guaro);
    if (guaro) {
      triggerNotification("Conexión VIP", "Bienvenido a la señal premium de El Guaro.", "👑");
    }
    const base = window.location.href.split("?")[0].split("#")[0];
    setRealLink(`${base}?sala=elguaro`);

    const stored = localStorage.getItem("elguaro_gacetas");
    if (stored) {
      try { setGacetas(JSON.parse(stored)); } catch {}
    }
  }, [triggerNotification]);

  const applyAdj = useCallback((chanId: number, adj: ChannelAdj) => {
    const vp = getViewportRef(chanId).current;
    const vid = getVideoRef(chanId).current;
    if (!vp || !vid) return;
    vp.style.clipPath = `inset(${adj.cropTop}px 0px 0px 0px)`;
    vid.style.transform = `scale(${adj.zoom / 100})`;
  }, []);

  useEffect(() => {
    [1, 2, 3].forEach(i => applyAdj(i, channelAdj[i]));
  }, [channelAdj, applyAdj]);

  const loadAdjForChan = (chanId: number) => {
    setSelectedAdjChan(chanId);
    setCropTopVal(channelAdj[chanId].cropTop);
    setZoomVal(channelAdj[chanId].zoom);
  };

  const handleAdjChange = (field: "cropTop" | "zoom", val: number) => {
    if (field === "cropTop") setCropTopVal(val);
    else setZoomVal(val);
    const updated = { ...channelAdj, [selectedAdjChan]: { ...channelAdj[selectedAdjChan], [field]: val } };
    setChannelAdj(updated);
    applyAdj(selectedAdjChan, updated[selectedAdjChan]);
  };

  const copyLink = () => {
    try {
      navigator.clipboard.writeText(realLink).then(() => {
        triggerNotification("Enlace Copiado", "Listo para pegar en tu grupo hípico de WhatsApp.", "📋");
      }).catch(() => {
        const el = document.createElement("input");
        el.value = realLink;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        triggerNotification("Enlace Copiado", "Listo para pegar en tu grupo hípico de WhatsApp.", "📋");
      });
    } catch {
      triggerNotification("Error al copiar", "Selecciónalo manualmente.", "❌", true);
    }
  };

  const uploadGaceta = () => {
    if (!adminTitle.trim() || !adminTrack.trim() || !adminDate) {
      triggerNotification("Campos Vacíos", "Rellena los datos requeridos.", "❌", true);
      return;
    }
    const newList = [{ id: Date.now(), title: adminTitle.trim(), track: adminTrack.trim(), country: adminCountry, date: adminDate, link: adminLink.trim() || "#" }, ...gacetas];
    setGacetas(newList);
    localStorage.setItem("elguaro_gacetas", JSON.stringify(newList));
    setAdminTitle(""); setAdminTrack(""); setAdminLink("");
    triggerNotification("Documento Indexado", "La revista ya está disponible para el público.", "📁");
  };

  const startDownload = (pdf: Gaceta) => {
    setDlTitle("Abriendo " + pdf.title);
    setDlSubtitle(pdf.track + " - Programa Oficial");
    setDlLink(pdf.link !== "#" ? pdf.link : "https://www.desafiohipico.com/retrospectos");
    setDlPercent(0);
    setDlReady(false);
    setDlModal(true);
    if (dlIntervalRef.current) clearInterval(dlIntervalRef.current);
    let p = 0;
    dlIntervalRef.current = setInterval(() => {
      p += 20;
      if (p >= 100) { p = 100; clearInterval(dlIntervalRef.current!); setDlReady(true); }
      setDlPercent(p);
    }, 100);
  };

  const closeDlModal = () => {
    if (dlIntervalRef.current) clearInterval(dlIntervalRef.current);
    setDlModal(false);
  };

  const startCapture = async (ch: number) => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { cursor: "always" }, audio: true });
      const vid = getVideoRef(ch).current;
      if (vid) { vid.srcObject = stream; vid.play(); }
      triggerNotification("Señal Transmitida", "Tu app externa se está retransmitiendo con éxito.", "📲");
    } catch {
      triggerNotification("Captura cancelada", "No seleccionaste pantalla.", "❌", true);
    }
  };

  const toggleRecording = (ch: number) => {
    const recorder = mediaRecorderRef.current[ch];
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      setRecording(r => ({ ...r, [ch]: false }));
      return;
    }
    const vid = getVideoRef(ch).current;
    if (!vid) return;
    const stream = vid.srcObject instanceof MediaStream ? vid.srcObject : (vid as any).captureStream?.() ?? (vid as any).mozCaptureStream?.();
    if (!stream) { triggerNotification("Error", "No hay stream activo.", "❌", true); return; }
    recordedChunksRef.current[ch] = [];
    try {
      const mr = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });
      mr.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current[ch].push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current[ch], { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `ElGuaro_Carrera_${Date.now()}.webm`; a.click();
        triggerNotification("Grabación Lista", "El archivo de la carrera se descargó de forma local.", "💾");
      };
      mr.start();
      mediaRecorderRef.current[ch] = mr;
      setRecording(r => ({ ...r, [ch]: true }));
    } catch {
      triggerNotification("Error de Códec", "No soportado en este navegador.", "❌", true);
    }
  };

  const postChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg: ChatMsg = {
      id: Date.now(),
      badge: "TÚ",
      badgeClass: "bg-red-950 text-red-400 border border-red-500/20",
      author: "Espectador:",
      authorClass: "text-amber-400",
      text: chatInput.trim(),
      textClass: "text-slate-200",
    };
    setChatMessages(m => [...m, msg]);
    setChatInput("");
    setTimeout(() => { if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; }, 50);
  };

  const filteredGacetas = gacetas.filter(g => filter === "ALL" || g.country === filter);

  const isChannelVisible = (ch: number) => {
    if (activeChannel === "multi") return true;
    return activeChannel === ch;
  };

  const channelBtnClass = (ch: number | "multi") =>
    activeChannel === ch
      ? ch === "multi"
        ? "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all bg-amber-500 text-black border border-amber-400 flex items-center gap-1.5"
        : "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all bg-emerald-700 text-white border border-emerald-500 flex items-center gap-1.5"
      : "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all bg-black/40 text-slate-300 border border-red-900/40 hover:border-amber-500 flex items-center gap-1.5";

  const filterBtnClass = (f: string) =>
    filter === f
      ? "flex-1 py-1 rounded text-[10px] font-bold uppercase transition-all bg-red-700 text-white"
      : "flex-1 py-1 rounded text-[10px] font-bold uppercase transition-all text-slate-400 hover:text-white";

  const gridClass = activeChannel === "multi"
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    : "grid grid-cols-1 gap-4";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0202", color: "#f1f5f9" }}>

      {/* TOAST */}
      <div
        className={`fixed top-5 right-5 z-50 transition-transform duration-300 ease-in-out px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 max-w-sm border border-amber-500/30 ${toast.isAlert ? "bg-red-700" : "bg-emerald-700"} ${toast.visible ? "translate-x-0" : "translate-x-full"}`}
        style={{ pointerEvents: toast.visible ? "auto" : "none" }}
      >
        <span className="text-2xl">{toast.icon}</span>
        <div>
          <h4 className="font-bold text-sm text-amber-400">{toast.title}</h4>
          <p className="text-xs text-slate-200">{toast.message}</p>
        </div>
      </div>

      {/* CINTILLO BIENVENIDA EL GUARO */}
      {isGuaroRoom && (
        <div className="bg-gradient-to-r from-red-700 via-amber-500 to-emerald-700 text-white text-center py-2.5 px-4 font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 border-b-2 border-amber-400 animate-pulse">
          <i className="fa-solid fa-crown text-amber-300"></i>
          <span>Transmisión Oficial en Vivo de "EL GUARO" 🐎🔥 ¡Señal Premium Activa!</span>
          <i className="fa-solid fa-crown text-amber-300"></i>
        </div>
      )}

      {/* CABECERA */}
      <header className="bg-gradient-to-r from-black via-red-950 to-black border-b-2 border-amber-500/60 px-4 py-3 sticky top-0 z-40 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-amber-500 via-red-600 to-emerald-600 p-2.5 rounded-xl shadow-lg border border-amber-400">
              <i className="fa-solid fa-horse-head text-2xl text-white"></i>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 brand-title">
                EL GUARO TV
              </h1>
              <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping inline-block"></span>
                <span>MULTICANAL HÍPICO MULTI-STREAM</span>
              </p>
            </div>
          </div>

          {!isGuaroRoom && (
            <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-xl border border-red-900/40">
              <button
                onClick={() => setRole("viewer")}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center space-x-2 ${role === "viewer" ? "bg-emerald-700 text-white border border-emerald-500 shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                <i className="fa-solid fa-tv"></i>
                <span>Espectador</span>
              </button>
              <button
                onClick={() => { setRole("admin"); loadAdjForChan(selectedAdjChan); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center space-x-2 ${role === "admin" ? "bg-amber-500 text-black border border-amber-400 font-black shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                <i className="fa-solid fa-gears"></i>
                <span>Admin</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* IZQUIERDA: TRANSMISIONES */}
        <section className="lg:col-span-8 flex flex-col space-y-4">

          {/* SELECTOR DE CANALES */}
          <div className="bg-gradient-to-b from-red-950 to-black p-3 rounded-2xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <i className="fa-solid fa-play text-red-500"></i> SELECCIÓN DE SEÑAL:
            </span>
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <button onClick={() => setActiveChannel(1)} className={channelBtnClass(1)}>
                <span className={`w-2 h-2 rounded-full ${activeChannel === 1 ? "bg-red-500 animate-pulse" : "bg-slate-600"}`}></span>
                Canal 1 (Nacional)
              </button>
              <button onClick={() => setActiveChannel(2)} className={channelBtnClass(2)}>
                <span className={`w-2 h-2 rounded-full ${activeChannel === 2 ? "bg-red-500 animate-pulse" : "bg-slate-600"}`}></span>
                Canal 2 (USA)
              </button>
              <button onClick={() => setActiveChannel(3)} className={channelBtnClass(3)}>
                <span className={`w-2 h-2 rounded-full ${activeChannel === 3 ? "bg-red-500 animate-pulse" : "bg-slate-600"}`}></span>
                Canal 3 (Internacional)
              </button>
              <button onClick={() => setActiveChannel("multi")} className={channelBtnClass("multi")}>
                <i className="fa-solid fa-table-cells-large text-amber-400"></i> Múltiple
              </button>
            </div>
          </div>

          {/* CONTENEDOR DE PANTALLAS */}
          <div className={gridClass}>
            {[1, 2, 3].map((ch) => (
              <div key={ch} className={`bg-black rounded-2xl border-2 border-amber-500/40 overflow-hidden shadow-2xl flex flex-col ${isChannelVisible(ch) ? "" : "hidden"}`}>
                <div className="bg-gradient-to-r from-red-950 via-black to-red-950 px-4 py-2 border-b border-amber-500/20 flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-bold flex items-center gap-2">
                    <i className="fa-solid fa-circle text-[8px] text-red-500 animate-ping"></i>
                    {ch === 1 ? "TRANSMISIÓN DESTACADA: EN VIVO" : ch === 2 ? "SEÑAL INTERNACIONAL 2" : "SEÑAL INTERNACIONAL 3"}
                  </span>
                  {recording[ch] && (
                    <span className="text-red-500 font-bold animate-pulse flex items-center gap-1">
                      <i className="fa-solid fa-circle-dot"></i> GRABANDO...
                    </span>
                  )}
                </div>

                <div className="relative bg-neutral-950 flex items-center justify-center" style={{ height: activeChannel === "multi" ? "220px" : "420px" }}>
                  <div ref={ch === 1 ? viewportRef1 : ch === 2 ? viewportRef2 : viewportRef3} className="stream-viewport w-full h-full">
                    <video
                      ref={ch === 1 ? videoRef1 : ch === 2 ? videoRef2 : videoRef3}
                      className="stream-video-element object-cover"
                      autoPlay loop muted playsInline
                      src={VIDEOS[ch - 1]}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>
                    {ch === 1 && (
                      <div className="absolute top-3 left-3 bg-red-950/80 text-[10px] text-amber-400 px-3 py-1 rounded-md border border-amber-500/40 font-bold tracking-wider">
                        <i className="fa-solid fa-shield-halved text-emerald-400 mr-1"></i> ESCUDO DE EMISIÓN ACTIVO
                      </div>
                    )}
                    {ch === 2 && (
                      <div className="absolute top-3 left-3 bg-red-950/80 text-[10px] text-amber-400 px-3 py-1 rounded-md border border-amber-500/40 font-bold">
                        SEÑAL RESPALDO HD
                      </div>
                    )}
                  </div>
                </div>

                {role === "admin" && (
                  <div className="bg-neutral-900 p-3 border-t border-amber-500/20 flex items-center flex-wrap gap-2">
                    <button
                      onClick={() => startCapture(ch)}
                      className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all border border-emerald-500"
                    >
                      <i className="fa-solid fa-desktop"></i> Capturar Pantalla
                    </button>
                    {ch === 1 && (
                      <button
                        onClick={() => toggleRecording(ch)}
                        className={`font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all border ${recording[ch] ? "bg-neutral-800 text-amber-400 animate-pulse border-amber-500" : "bg-red-700 hover:bg-red-600 text-white border-red-500"}`}
                      >
                        <i className={`fa-solid ${recording[ch] ? "fa-square" : "fa-circle-dot"}`}></i>
                        {recording[ch] ? "Detener" : "Grabar Carrera"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CHAT EN DIRECTO */}
          <div className="bg-gradient-to-b from-neutral-900 to-black rounded-2xl border border-red-900/40 p-4 flex flex-col space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-red-950 pb-2">
              <div className="flex items-center space-x-2">
                <i className="fa-solid fa-comments text-amber-400"></i>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Chat de Suscriptores</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">EN VIVO</span>
            </div>

            <div ref={chatBoxRef} className="h-28 overflow-y-auto space-y-2.5 text-xs pr-1">
              {chatMessages.map(msg => (
                <div key={msg.id} className="flex items-start space-x-2">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${msg.badgeClass}`}>{msg.badge}</span>
                  <strong className={msg.authorClass}>{msg.author}</strong>
                  <span className={msg.textClass}>{msg.text}</span>
                </div>
              ))}
            </div>

            <form onSubmit={postChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Envía un mensaje al grupo..."
                className="flex-grow bg-black text-xs text-slate-200 border border-red-950 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 placeholder-neutral-600"
              />
              <button
                type="submit"
                className="bg-red-700 hover:bg-red-600 border border-red-500 text-white px-5 rounded-xl font-bold text-xs flex items-center justify-center transition-all"
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </section>

        {/* DERECHA: HERRAMIENTAS / GACETAS */}
        <section className="lg:col-span-4 flex flex-col space-y-6">

          {/* PANEL COMPARTIR */}
          <div className="bg-gradient-to-b from-neutral-900 to-black rounded-2xl border border-amber-500/30 p-5 shadow-2xl space-y-4">
            <div className="border-b border-red-950 pb-2.5 flex items-center space-x-2">
              <div className="bg-amber-500/10 text-amber-400 p-2 rounded-lg border border-amber-500/20 text-lg">
                <i className="fa-solid fa-share-nodes"></i>
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">ENLACE PARA EL GRUPO</h2>
                <p className="text-[10px] text-slate-400">Tus clientes entrarán como espectadores directos</p>
              </div>
            </div>

            <div className="bg-black p-3 rounded-xl border border-red-950 space-y-3">
              <span className="text-[9px] font-bold text-red-400 uppercase block tracking-wider">ENLACE COMPATIBLE (COPIA ESTE AL SUBIR A REPLIT):</span>
              <div className="flex items-center justify-between bg-neutral-950 border border-red-950 p-2 rounded-lg gap-2">
                <code className="text-[11px] text-slate-300 overflow-x-auto whitespace-nowrap pr-2 font-mono flex-1 truncate">
                  {realLink}
                </code>
                <button
                  onClick={copyLink}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white p-2 rounded-md text-xs transition-all flex items-center justify-center border border-emerald-500 flex-shrink-0"
                >
                  <i className="fa-solid fa-copy"></i>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed bg-red-950/10 p-3 rounded-lg border border-red-900/20">
              ✨ <strong>Acceso blindado:</strong> Al pulsar este link, se activa de forma automática el bloqueo del panel de control. Tus clientes solo verán el reproductor y el chat.
            </p>
          </div>

          {/* PANEL ADMIN */}
          {role === "admin" && (
            <div className="bg-gradient-to-b from-neutral-900 to-black rounded-2xl border-2 border-red-700 p-5 shadow-2xl space-y-5">
              <div className="border-b border-red-950 pb-2.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-red-500 flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-amber-400"></i>
                  <span>ESCUDO ANTI-NOTIFICACIONES</span>
                </h2>
                <p className="text-[10px] text-slate-400 mt-1">Esconde alertas recortando los bordes.</p>
              </div>

              <div>
                <label className="text-[10px] text-amber-400 block font-bold mb-1">SELECCIONA SEÑAL A RECORTAR:</label>
                <select
                  value={selectedAdjChan}
                  onChange={e => loadAdjForChan(Number(e.target.value))}
                  className="w-full bg-black border border-red-950 rounded-lg p-2 text-xs text-slate-200 focus:border-amber-400"
                >
                  <option value={1}>Canal 1 (Señal Principal)</option>
                  <option value={2}>Canal 2 (Señal Secundaria)</option>
                  <option value={3}>Canal 3 (Señal Respaldo)</option>
                </select>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Corte Superior (Ocultar Notificaciones)</span>
                    <span className="font-bold text-red-500">{cropTopVal}px</span>
                  </div>
                  <input
                    type="range" min={0} max={150} value={cropTopVal}
                    onChange={e => handleAdjChange("cropTop", Number(e.target.value))}
                    className="w-full accent-red-600 bg-black h-1 rounded"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Ajuste de Enfoque (Zoom)</span>
                    <span className="font-bold text-emerald-400">{zoomVal}%</span>
                  </div>
                  <input
                    type="range" min={100} max={300} value={zoomVal}
                    onChange={e => handleAdjChange("zoom", Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-black h-1 rounded"
                  />
                </div>
              </div>

              {/* PUBLICADOR DE GACETAS */}
              <div className="bg-black p-4 rounded-xl border border-red-950 space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center justify-between border-b border-red-950 pb-1.5">
                  <span>Cargar Revista PDF</span>
                  <i className="fa-solid fa-file-pdf text-red-500"></i>
                </h3>
                <div>
                  <label className="text-[9px] text-slate-400 block mb-0.5">Título del Folleto</label>
                  <input
                    type="text" value={adminTitle} onChange={e => setAdminTitle(e.target.value)}
                    placeholder="Ej: Gaceta Hípica Sabatina"
                    className="w-full bg-neutral-900 border border-red-950 rounded p-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block mb-0.5">Hipódromo / Reunión</label>
                  <input
                    type="text" value={adminTrack} onChange={e => setAdminTrack(e.target.value)}
                    placeholder="Ej: La Rinconada"
                    className="w-full bg-neutral-900 border border-red-950 rounded p-1.5 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">Procedencia</label>
                    <select
                      value={adminCountry} onChange={e => setAdminCountry(e.target.value as "VEN" | "USA")}
                      className="w-full bg-neutral-900 border border-red-950 rounded p-1.5 text-xs text-white"
                    >
                      <option value="VEN">Venezuela 🇻🇪</option>
                      <option value="USA">EE. UU. 🇺🇸</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5">Fecha</label>
                    <input
                      type="date" value={adminDate} onChange={e => setAdminDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-red-950 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block mb-0.5">Enlace de Descarga Directa</label>
                  <input
                    type="text" value={adminLink} onChange={e => setAdminLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-neutral-900 border border-red-950 rounded p-1.5 text-xs text-white"
                  />
                </div>
                <button
                  onClick={uploadGaceta}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-white font-bold text-xs py-2 rounded-lg transition-all"
                >
                  Publicar Gaceta al Instante
                </button>
              </div>
            </div>
          )}

          {/* SECCIÓN DESCARGAS */}
          <div className="bg-gradient-to-b from-neutral-900 to-black rounded-2xl border border-amber-500/30 p-5 shadow-2xl space-y-4">
            <div className="border-b border-red-950 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">REVISTAS Y PROGRAMAS GRATIS</h2>
                <p className="text-[10px] text-slate-400">Haz clic para descargar las gacetas oficiales</p>
              </div>
              <span className="text-xl text-red-500"><i className="fa-solid fa-book-open"></i></span>
            </div>

            <div className="flex space-x-2 bg-black p-1 rounded-xl border border-red-950">
              {(["ALL", "VEN", "USA"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={filterBtnClass(f)}>
                  {f === "ALL" ? "Todas" : f === "VEN" ? "Nacionales 🇻🇪" : "USA 🇺🇸"}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto">
              {filteredGacetas.length === 0 ? (
                <div className="text-center py-4 text-neutral-600 text-xs">No hay revistas disponibles.</div>
              ) : (
                filteredGacetas.map(pdf => (
                  <div key={pdf.id} className="bg-black p-3 rounded-xl border border-red-950 flex items-center justify-between hover:border-amber-500/30 transition-all">
                    <div className="flex items-center space-x-2">
                      <div className="text-red-500 text-xl px-1"><i className="fa-solid fa-file-pdf"></i></div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{pdf.title}</h4>
                        <p className="text-[10px] text-amber-500/80 font-medium">
                          {pdf.track} {pdf.country === "VEN" ? "🇻🇪" : "🇺🇸"} • 📅 {pdf.date}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => startDownload(pdf)}
                      className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all"
                    >
                      Bajar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* PIE DE PÁGINA */}
      <footer className="bg-black border-t-2 border-amber-400 py-4 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
          <div className="flex items-center space-x-2">
            <i className="fa-solid fa-crown text-amber-500"></i>
            <p>© 2026 El Guaro TV. Sistema Exclusivo de Distribución Hípica Protegida.</p>
          </div>
        </div>
      </footer>

      {/* MODAL DESCARGA */}
      {dlModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-amber-500/50 rounded-2xl max-w-sm w-full p-5 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl border border-red-500/20">
              <i className={`fa-solid ${dlReady ? "fa-check text-emerald-400" : "fa-circle-notch animate-spin text-amber-400"}`}></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{dlTitle}</h3>
              <p className="text-[11px] text-slate-400 mt-1">{dlSubtitle}</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-amber-400 font-bold">
                <span>Descargando...</span>
                <span>{dlPercent}%</span>
              </div>
              <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-red-950">
                <div
                  className="bg-gradient-to-r from-red-600 to-amber-400 h-full transition-all duration-100"
                  style={{ width: `${dlPercent}%` }}
                ></div>
              </div>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={closeDlModal}
                className="flex-grow bg-black hover:bg-neutral-900 border border-red-950 text-xs text-slate-300 py-2 rounded-xl transition-all"
              >
                Cerrar
              </button>
              {dlReady && (
                <a
                  href={dlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-grow bg-emerald-700 hover:bg-emerald-600 text-xs text-white py-2 rounded-xl font-bold transition-all border border-emerald-500 flex items-center justify-center gap-1"
                >
                  <i className="fa-solid fa-file-arrow-down"></i> Ver PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
