"use client";

import { useEffect, useRef, useState } from "react";
import { guardarPoligonoCobertura, alternarPoligonoCobertura, eliminarPoligonoCobertura } from "../../actions";

/**
 * Editor de mapa para dibujar/editar los polígonos de cobertura —
 * Fase "polígono de cobertura" del proyecto de ruteo óptimo (backlog
 * #55, a petición del usuario 2026-08-19).
 *
 * REESCRITO 2026-08-19: la primera versión usaba
 * `google.maps.drawing.DrawingManager`, pero Google la retiró por
 * completo de la Maps JavaScript API (deprecada el 8 de agosto de
 * 2025, eliminada en mayo de 2026 — error real en producción:
 * "The DrawingManager functionality... is no longer available").
 * El reemplazo que Google recomienda es una librería externa
 * (Terra Draw), pero eso significa agregar una dependencia de npm
 * nueva — justo lo que se evitó desde el principio por el flujo de
 * copiar/pegar a GitHub sin `npm install` local. En vez de eso, el
 * dibujo del polígono se hizo a mano: clic en el mapa agrega un
 * vértice, un botón "Terminar" cierra la figura (en vez de
 * doble-clic, que es más frágil de detectar sin la librería de
 * drawing), y el polígono resultante queda editable (arrastra los
 * vértices) antes de guardar.
 *
 * Sigue sin haber `@types/google.maps` instalado — el namespace
 * `google` se trata como `any` a propósito (ver el `declare global`
 * abajo) en vez de traer tipos oficiales.
 *
 * Simplificación deliberada: después de guardar/activar/eliminar una
 * zona, se recarga la página completa (`window.location.reload()`)
 * en vez de sincronizar a mano los overlays de Google Maps (que viven
 * fuera de React) con el nuevo estado del servidor — es una pantalla
 * de uso ocasional, no vale la pena la complejidad de un sync fino.
 */

declare global {
  interface Window {
    google: any;
  }
}

interface Zona {
  id: string;
  nombre: string;
  puntos: { lat: number; lng: number }[];
  activo: boolean;
}

const CENTRO_MONTERREY = { lat: 25.6866, lng: -100.3161 };

export function CoberturaMapa({ zonas }: { zonas: Zona[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [scriptListo, setScriptListo] = useState(false);
  const [dibujando, setDibujando] = useState(false);
  const [numPuntos, setNumPuntos] = useState(0);
  const [nuevoPoligono, setNuevoPoligono] = useState<{ lat: number; lng: number }[] | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayEnProgresoRef = useRef<any>(null);
  const listenerClickRef = useRef<any>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Carga el script de Google Maps una sola vez. Ya NO se pide
  // `libraries=drawing` — esa librería ya no existe en la API, y
  // pedirla es justo lo que causaba el error en consola.
  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps) {
      setScriptListo(true);
      return;
    }
    const existente = document.getElementById("google-maps-script");
    if (existente) {
      existente.addEventListener("load", () => setScriptListo(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.onload = () => setScriptListo(true);
    document.head.appendChild(script);
  }, [apiKey]);

  // Inicializa el mapa + dibuja los polígonos existentes.
  useEffect(() => {
    if (!scriptListo || !mapDivRef.current || mapRef.current) return;
    const google = window.google;

    const map = new google.maps.Map(mapDivRef.current, {
      center: CENTRO_MONTERREY,
      zoom: 12,
      disableDefaultUI: false,
    });
    mapRef.current = map;

    for (const zona of zonas) {
      new google.maps.Polygon({
        paths: zona.puntos,
        map,
        strokeColor: zona.activo ? "#C9A15C" : "#888780",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: zona.activo ? "#C9A15C" : "#888780",
        fillOpacity: 0.15,
      });
    }
  }, [scriptListo, zonas]);

  function empezarDibujo() {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map) return;

    setError(null);
    setNuevoPoligono(null);
    setNombreNuevo("");
    setDibujando(true);
    setNumPuntos(0);

    const poligono = new google.maps.Polygon({
      map,
      // `[[]]` = un anillo, vacío — NO `[]` a secas. Con `[]` la API no
      // puede distinguir "un anillo vacío" de "cero anillos" y elige lo
      // segundo, así que `getPath()` regresa `undefined` y el primer
      // `.push()` revienta con "Cannot read properties of undefined"
      // (error real visto en producción 2026-08-19).
      paths: [[]],
      strokeColor: "#7FB069",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: "#7FB069",
      fillOpacity: 0.2,
      editable: false,
      clickable: false,
    });
    overlayEnProgresoRef.current = poligono;

    listenerClickRef.current = map.addListener("click", (evento: any) => {
      const path = poligono.getPath();
      path.push(evento.latLng);
      setNumPuntos(path.getLength());
    });
  }

  function terminarDibujo() {
    const google = window.google;
    const poligono = overlayEnProgresoRef.current;
    if (!poligono || !google) return;

    const path = poligono.getPath();
    if (path.getLength() < 3) {
      setError("Dibuja al menos 3 puntos antes de terminar.");
      return;
    }

    if (listenerClickRef.current) {
      google.maps.event.removeListener(listenerClickRef.current);
      listenerClickRef.current = null;
    }
    poligono.setOptions({ editable: true, clickable: true });

    const puntos: { lat: number; lng: number }[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const punto = path.getAt(i);
      puntos.push({ lat: punto.lat(), lng: punto.lng() });
    }
    setNuevoPoligono(puntos);
    setDibujando(false);
  }

  function cancelarDibujo() {
    const google = window.google;
    if (listenerClickRef.current) {
      google?.maps.event.removeListener(listenerClickRef.current);
      listenerClickRef.current = null;
    }
    overlayEnProgresoRef.current?.setMap(null);
    overlayEnProgresoRef.current = null;
    setDibujando(false);
    setNuevoPoligono(null);
    setNumPuntos(0);
    setError(null);
  }

  async function guardarNuevo() {
    const poligono = overlayEnProgresoRef.current;
    if (!poligono) return;

    // Vuelve a leer el path por si el usuario arrastró algún vértice
    // después de darle "Terminar" (el polígono queda editable).
    const path = poligono.getPath();
    const puntos: { lat: number; lng: number }[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const punto = path.getAt(i);
      puntos.push({ lat: punto.lat(), lng: punto.lng() });
    }

    setError(null);
    setGuardando(true);
    const res = await guardarPoligonoCobertura(null, nombreNuevo, puntos);
    setGuardando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar la zona.");
      return;
    }
    window.location.reload();
  }

  if (!apiKey) {
    return (
      <div className="rounded-card border border-dashed border-line/70 px-5 py-4">
        <p className="text-[13px] text-muted">
          Falta configurar <code className="text-cream">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en las variables de
          entorno para poder mostrar el mapa.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {zonas.length} {zonas.length === 1 ? "zona dibujada" : "zonas dibujadas"}
        </p>
        {dibujando ? (
          <div className="flex gap-2.5">
            <button type="button" onClick={cancelarDibujo} className="btn-secondary rounded-control px-[18px] py-[10px] text-[13px]">
              Cancelar
            </button>
            <button
              type="button"
              disabled={numPuntos < 3}
              onClick={terminarDibujo}
              className="btn-primary rounded-control px-[18px] py-[10px] text-[13px] disabled:opacity-40"
            >
              Terminar ({numPuntos} {numPuntos === 1 ? "punto" : "puntos"})
            </button>
          </div>
        ) : (
          <button type="button" onClick={empezarDibujo} className="btn-primary rounded-control px-[18px] py-[10px] text-[13px]">
            + Nueva zona
          </button>
        )}
      </div>

      <div ref={mapDivRef} className="h-[420px] w-full rounded-card border border-line" />

      {dibujando && (
        <p className="text-[12px] text-muted">
          Haz clic en el mapa para ir marcando los vértices de la zona (mínimo 3). Cuando termines, dale "Terminar".
        </p>
      )}

      {nuevoPoligono && (
        <div className="flex w-full max-w-[420px] flex-col gap-3 rounded-card border border-line bg-surface p-5">
          <p className="text-[13px] font-medium text-cream">Nombre de la zona</p>
          <p className="text-[12px] text-muted">
            Puedes arrastrar los vértices del polígono en el mapa para ajustarlo antes de guardar.
          </p>
          <input
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Ej. Zona Centro"
            className="input"
          />
          <div className="flex gap-2.5">
            <button
              type="button"
              disabled={guardando || !nombreNuevo.trim()}
              onClick={guardarNuevo}
              className="btn-primary rounded-control px-5 py-2.5 text-[13px] disabled:opacity-40"
            >
              {guardando ? "Guardando…" : "Guardar zona"}
            </button>
            <button type="button" onClick={cancelarDibujo} className="btn-secondary rounded-control px-5 py-2.5 text-[13px]">
              Descartar
            </button>
          </div>
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>
      )}

      {dibujando && error && <p className="text-[12px] text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        {zonas.map((z) => (
          <ZonaFila key={z.id} zona={z} />
        ))}
      </div>
    </div>
  );
}

function ZonaFila({ zona }: { zona: Zona }) {
  const [pending, setPending] = useState(false);

  async function alternar() {
    setPending(true);
    await alternarPoligonoCobertura(zona.id, !zona.activo);
    setPending(false);
    window.location.reload();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar la zona "${zona.nombre}"?`)) return;
    setPending(true);
    await eliminarPoligonoCobertura(zona.id);
    setPending(false);
    window.location.reload();
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className={`size-[8px] rounded-full ${zona.activo ? "bg-gold" : "bg-muted/50"}`} />
        <p className="text-[14px] text-cream">{zona.nombre}</p>
        <p className="text-[12px] text-muted">{zona.puntos.length} puntos</p>
      </div>
      <div className="flex gap-3">
        <button type="button" disabled={pending} onClick={alternar} className="text-[12px] text-muted hover:text-cream disabled:opacity-40">
          {zona.activo ? "Desactivar" : "Activar"}
        </button>
        <button type="button" disabled={pending} onClick={eliminar} className="text-[12px] text-muted hover:text-danger disabled:opacity-40">
          Eliminar
        </button>
      </div>
    </div>
  );
}
