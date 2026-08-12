"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const HERO_IMAGES = [
  "/hero/hero-1.jpg",
  "/hero/hero-2.jpg",
  "/hero/hero-3.jpg",
];

const CAROUSEL_INTERVAL_MS = 3000;

/**
 * Hero — Figma node 244:14. El diseño trae una sola imagen; el brief
 * pide un carrusel automático de 3s, así que rotamos entre las fotos
 * en /public/hero (el cliente debe reemplazarlas por fotografía real).
 */
export function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="flex items-center gap-16 px-[100px] pb-[104px] pt-24">
      <div className="flex w-[556px] flex-col items-start gap-7">
        <div className="rounded-pill border border-line px-4 py-[9px]">
          <p className="text-[12px] font-medium tracking-[1.2px] text-gold">
            COMIDA REAL, LISTA PARA TU SEMANA
          </p>
        </div>
        <h1 className="text-display-xl text-cream">
          Tu semana resuelta,
          <br />
          platillo por platillo.
        </h1>
        <p className="w-[492px] text-body-l text-muted">
          Compra un paquete, recibe tus créditos y elige tu menú. Nosotros
          cocinamos y lo entregamos en tu puerta.
        </p>
        <div className="flex items-start gap-[14px]">
          <Link href="/paquetes" className="btn-primary rounded-control px-[30px] py-4 text-[17px]">
            Ver paquetes
          </Link>
          <Link
            href="/#menu-semanal"
            className="btn-secondary rounded-control px-[30px] py-4 text-[17px]"
          >
            Ver menú de la semana
          </Link>
        </div>
        <div className="flex items-center gap-[26px]">
          {["Sin permanencia", "Créditos sin vencimiento", "Entrega a domicilio"].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="size-[5px] rounded-full bg-gold" />
              <p className="text-[14px] text-muted">{t}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative h-[500px] w-[560px] overflow-hidden rounded-card-lg bg-raised">
        {HERO_IMAGES.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt="Platillos HotPot Factor"
            fill
            sizes="560px"
            priority={i === 0}
            className="object-cover transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0 }}
          />
        ))}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {HERO_IMAGES.map((_, i) => (
            <span
              key={i}
              className={`size-[6px] rounded-full transition-colors ${
                i === index ? "bg-gold" : "bg-cream/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
