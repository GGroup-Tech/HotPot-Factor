/**
 * Geocodificación de direcciones — Fase 1 del proyecto de ruteo
 * óptimo + WhatsApp al repartidor (backlog #55).
 *
 * Usa la API de Geocoding de Google (misma cuenta que luego se usará
 * para Directions/optimizeWaypoints en la Fase 2 — un solo API key de
 * Google Maps sirve para ambas). No hace nada útil hasta que exista
 * `GOOGLE_MAPS_API_KEY` en las variables de entorno — mientras tanto
 * regresa `null` en vez de tronar, para que el flujo de creación de
 * cuenta/perfil nunca falle por esto (una dirección sin lat/lng
 * simplemente no puede entrar en el ruteo óptimo hasta que se
 * geocodifique).
 *
 * IMPORTANTE: Google cobra por uso de Geocoding API (hay cuota
 * gratuita mensual, pero requiere facturación activada en el proyecto
 * de Google Cloud para poder usarla). Necesitas: 1) un proyecto en
 * Google Cloud Console, 2) facturación activada, 3) la API
 * "Geocoding API" habilitada, 4) una API key restringida a esa API.
 */

export interface Coordenadas {
  lat: number;
  lng: number;
}

/**
 * Convierte una dirección de texto libre en coordenadas. Regresa
 * `null` si no hay API key configurada, si Google no encuentra la
 * dirección, o si la llamada falla — nunca lanza, para que el
 * llamador pueda decidir qué hacer (guardar sin lat/lng, reintentar
 * después, etc.) sin envolver cada uso en try/catch.
 */
export async function geocodificarDireccion(direccion: string): Promise<Coordenadas | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("geocodificarDireccion: falta GOOGLE_MAPS_API_KEY — se omite geocodificación.");
    return null;
  }
  if (!direccion.trim()) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", direccion);
    url.searchParams.set("key", apiKey);
    // Sesga resultados hacia Monterrey/área metropolitana — sin esto,
    // una colonia con nombre común en México podría geocodificarse en
    // otra ciudad.
    url.searchParams.set("region", "mx");

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error("geocodificarDireccion: HTTP", res.status);
      return null;
    }
    const data = (await res.json()) as {
      status: string;
      results: { geometry: { location: { lat: number; lng: number } } }[];
    };

    if (data.status !== "OK" || data.results.length === 0) {
      console.warn("geocodificarDireccion: sin resultado", { direccion, status: data.status });
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } catch (err) {
    console.error("geocodificarDireccion: fallo inesperado", err);
    return null;
  }
}

/** Arma la dirección completa de un usuario para mandar a geocodificar. */
export function direccionParaGeocodificar(u: {
  calle_numero: string | null;
  colonia: string | null;
  codigo_postal: string | null;
}): string | null {
  const partes = [u.calle_numero, u.colonia, u.codigo_postal, "Monterrey, Nuevo León, México"].filter(Boolean);
  // Sin calle_numero no vale la pena geocodificar — el resultado
  // caería en el centroide de la colonia, no en la dirección real, y
  // eso arruinaría cualquier optimización de ruta después.
  if (!u.calle_numero) return null;
  return partes.join(", ");
}
