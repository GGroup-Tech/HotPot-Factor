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
    <section className="flex flex-col items-center gap-10 px-6 pb-16 pt-14 md:px-10 md:pt-20 lg:flex-row lg:items-center lg:gap-16 lg:px-[100px] lg:pb-[104px] lg:pt-24">
      <div className="flex w-full flex-col items-start gap-7 lg:w-[556px] lg:shrink-0">
        <div className="rounded-pill border border-line px-4 py-[9px]">
          <p className="text-[12px] font-medium tracking-[1.2px] text-gold">
            COMIDA REAL, LISTA PARA TU SEMANA
          </p>
        </div>
        <h1 className="text-[38px] font-semibold leading-[44px] text-cream font-display sm:text-[48px] sm:leading-[54px] lg:text-display-xl">
          Tu semana resuelta,
          <br />
          platillo por platillo.
        </h1>
        <p className="w-full max-w-[492px] text-body-l text-muted">
          Compra un paquete, recibe tus créditos y elige tu menú. Nosotros
          cocinamos y lo entregamos en tu puerta.
        </p>
        <div className="flex flex-wrap items-start gap-[14px]">
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
        <div className="flex flex-wrap items-center gap-x-[26px] gap-y-2">
          {["Sin permanencia", "Créditos sin vencimiento", "Entrega a domicilio"].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="size-[5px] rounded-full bg-gold" />
              <p className="text-[14px] text-muted">{t}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative aspect-[560/500] w-full max-w-[720px] flex-1 overflow-hidden rounded-card-lg bg-raised">
        {HERO_IMAGES.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt="Platillos HotPot Factor"
            fill
            sizes="(max-width: 1024px) 100vw, 720px"
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
