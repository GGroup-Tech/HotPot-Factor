import { Nav } from "@/app/components/sitio/Nav";
import { Footer } from "@/app/components/sitio/Footer";
import { Hero } from "@/app/components/sitio/Hero";
import { ComoFunciona } from "@/app/components/sitio/ComoFunciona";
import { PaquetesSection } from "@/app/components/sitio/PaquetesSection";
import { MenuSemanalSection } from "@/app/components/sitio/MenuSemanalSection";
import { FAQSection } from "@/app/components/sitio/FAQSection";
import { CtaFinal } from "@/app/components/sitio/CtaFinal";
import { SofiaFabGuest } from "@/app/components/sitio/SofiaFabGuest";

/** Landing v2 — Sin membresía. Figma node 244:2. */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <div className="h-px w-full bg-line" />
      <main className="flex-1">
        <Hero />
        <ComoFunciona />
        <PaquetesSection />
        <MenuSemanalSection />
        <FAQSection />
        <CtaFinal />
      </main>
      <Footer />
      <SofiaFabGuest />
    </div>
  );
}
