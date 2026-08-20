"use client";

import { useEffect, useRef, useState } from "react";
import { guardarPoligonoCobertura, alternarPoligonoCobertura, eliminarPoligonoCobertura } from "../../actions";

/**
 * Editor de mapa para dibujar/editar los polígonos de cobertura —
 * Fase "polígono de cobertura" del proyecto de ruteo óptimo (backlog
 * #55, a petición del usuario 2026-08-19).
 *
 * Usa el script de Google Maps JS directo (`<script>` + Drawing
 * Manager), SIN ningún paquete de npm nuevo — el proyecto se pega
 * archivo por archivo en GitHub, así que evitar una dependencia nueva
 * evita cualquier riesgo con package-lock.json. Por la misma razón no
 * hay `@types/google.maps` instalado: el namespace `google` se trata
 * como `any` a propósito (ver el `declare global` abajo) en vez de
 * traer tipos oficiales.
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
  const drawingManagerRef = useRef<any>(null);
  const [scriptListo, setScriptListo] = useState(false);
  const [dibujando, setDibujando] = useState(false);
  const [nuevoPoligono, setNuevoPoligono] = useState<{ lat: number; lng: number }[] | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nuevoOverlayRef = useRef<any>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Carga el script de Google Maps una sola vez.
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing`;
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

    const drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: { strokeColor: "#7FB069", fillColor: "#7FB069", fillOpacity: 0.2, editable: true },
    });
    drawingManager.setMap(map);
    drawingManagerRef.current = drawingManager;

    google.maps.event.addListener(drawingManager, "overlaycomplete", (evento: any) => {
      drawingManager.setDrawingMode(null);
      setDibujando(false);
      nuevoOverlayRef.current = evento.overlay;
      const path = evento.overlay.getPath();
      const puntos: { lat: number; lng: number }[] = [];
      for (let i = 0; i < path.getLength(); i++) {
        const punto = path.getAt(i);
        puntos.push({ lat: punto.lat(), lng: punto.lng() });
      }
      setNuevoPoligono(puntos);
    });
  }, [scriptListo, zonas]);

  function empezarDibujo() {
    setError(null);
    setNuevoPoligono(null);
    setNombreNuevo("");
    setDibujando(true);
    drawingManagerRef.current?.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
  }

  function cancelarDibujo() {
    setDibujando(false);
    setNuevoPoligono(null);
    nuevoOverlayRef.current?.setMap(null);
    nuevoOverlayRef.current = null;
    drawingManagerRef.current?.setDrawingMode(null);
  }

  async function guardarNuevo() {
    if (!nuevoPoligono) return;
    setError(null);
    setGuardando(true);
    const res = await guardarPoligonoCobertura(null, nombreNuevo, nuevoPoligono);
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
          <button type="button" onClick={cancelarDibujo} className="btn-secondary rounded-control px-[18px] py-[10px] text-[13px]">
            Cancelar dibujo
          </button>
        ) : (
          <button type="button" onClick={empezarDibujo} className="btn-primary rounded-control px-[18px] py-[10px] text-[13px]">
            + Nueva zona
          </button>
        )}
      </div>

      <div ref={mapDivRef} className="h-[420px] w-full rounded-card border border-line" />

      {dibujando && !nuevoPoligono && (
        <p className="text-[12px] text-muted">
          Haz clic en el mapa para ir marcando los vértices de la zona; termina haciendo doble clic o cerrando el
          polígono sobre el primer punto.
        </p>
      )}

      {nuevoPoligono && (
        <div className="flex w-full max-w-[420px] flex-col gap-3 rounded-card border border-line bg-surface p-5">
          <p className="text-[13px] font-medium text-cream">Nombre de la zona</p>
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
