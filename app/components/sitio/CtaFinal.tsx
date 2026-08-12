import Link from "next/link";

/** CTA final — Figma node 244:190. */
export function CtaFinal() {
  return (
    <section className="flex flex-col items-center gap-[22px] bg-[#1f1815] px-6 py-16 md:px-10 lg:px-[100px] lg:py-[110px]">
      <p className="w-full max-w-[900px] text-center text-[32px] font-semibold leading-[40px] text-cream font-display sm:text-[50px] sm:leading-[58px]">
        Deja de pensar qué vas a comer
      </p>
      <p className="w-full max-w-[560px] text-center text-[18px] leading-7 text-muted">
        Elige tu paquete hoy y tu semana queda resuelta.
      </p>
      <Link href="/paquetes" className="btn-primary rounded-control px-9 py-[18px] text-[18px]">
        Ver paquetes
      </Link>
    </section>
  );
}
