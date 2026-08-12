import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // typedRoutes queda apagado hasta que existan todas las rutas del
  // sitio (áreas cliente/admin llegan en fases siguientes) — con rutas
  // faltantes, el chequeo estricto de Link/redirect truena el build.
  // Reactivar en la Fase 5 (verificación final) una vez que /cuenta,
  // /admin-login, /privacidad y /terminos ya existan.
};

export default nextConfig;
