"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BellRing, Zap, Brain, Shield, Menu, X } from "lucide-react";
import { ThemeSelector } from "@/app/components/ui/theme-selector";
import { LanguageToggle } from "@/app/components/ui/language-toggle";
import { useLanguage } from "@/app/contexts/language-context";

const copy = {
  en: {
    nav: { login: "Login", cta: "Start Free" },
    hero: {
      headline: "Stop chasing clients who don't pay",
      sub: "PayRemind automatically sends professional reminder emails at day 3, 7, and 14 after the due date — so you get paid without awkward conversations.",
      cta1: "Start for free",
      cta2: "See how it works",
    },
    proof: {
      label: "Join freelancers who get paid faster",
      stats: ["⚡ 2 min setup", "📧 Automated emails", "💰 $12/mo flat"],
    },
    how: {
      title: "How it works",
      steps: [
        { title: "Add your invoice", desc: "Enter client info and due date" },
        { title: "We handle reminders", desc: "AI writes personalized emails at day 3, 7 and 14" },
        { title: "Get paid", desc: "Mark as paid when the money arrives" },
      ],
    },
    features: {
      title: "Everything you need to get paid",
      cards: [
        { title: "Automatic reminders", desc: "Set it once. We send day 3, 7 and 14 reminders automatically." },
        { title: "AI-powered emails", desc: "Each email is personalized with client name, amount and invoice number." },
        { title: "Tone that escalates", desc: "Friendly at day 3, firm at day 7, final notice at day 14." },
      ],
    },
    pricing: {
      title: "Simple pricing",
      free: { label: "Free", desc: "3 active invoices, manual reminders" },
      pro: { label: "Pro", price: "$12/mo", desc: "Unlimited invoices + automatic reminders" },
      cta: "Start free, upgrade when ready",
    },
    finalCta: {
      title: "Ready to get paid faster?",
      sub: "Start free today. No credit card required.",
      btn: "Get started free",
    },
    footer: { rights: "© 2026 PayRemind" },
  },
  es: {
    nav: { login: "Iniciar sesión", cta: "Empieza gratis" },
    hero: {
      headline: "Deja de perseguir clientes que no pagan",
      sub: "PayRemind envía recordatorios automáticos por email a los 3, 7 y 14 días del vencimiento — cobras sin conversaciones incómodas.",
      cta1: "Empieza gratis",
      cta2: "Cómo funciona",
    },
    proof: {
      label: "Únete a freelancers que cobran más rápido",
      stats: ["⚡ 2 min de setup", "📧 Emails automáticos", "💰 $12/mes fijo"],
    },
    how: {
      title: "Cómo funciona",
      steps: [
        { title: "Agrega tu factura", desc: "Ingresa el cliente y fecha de vencimiento" },
        { title: "Nosotros enviamos", desc: "La IA redacta emails personalizados en el día 3, 7 y 14" },
        { title: "Cobra", desc: "Marca como pagada cuando llegue el dinero" },
      ],
    },
    features: {
      title: "Todo lo que necesitas para cobrar",
      cards: [
        { title: "Recordatorios automáticos", desc: "Configúralo una vez. Enviamos en el día 3, 7 y 14." },
        { title: "Emails con IA", desc: "Cada email incluye nombre del cliente, monto y número de factura." },
        { title: "Tono que escala", desc: "Amable el día 3, firme el día 7, aviso final el día 14." },
      ],
    },
    pricing: {
      title: "Precio simple",
      free: { label: "Gratis", desc: "3 facturas activas, recordatorios manuales" },
      pro: { label: "Pro", price: "$12/mes", desc: "Facturas ilimitadas + recordatorios automáticos" },
      cta: "Empieza gratis, mejora cuando quieras",
    },
    finalCta: {
      title: "¿Listo para cobrar más rápido?",
      sub: "Empieza gratis hoy. Sin tarjeta de crédito.",
      btn: "Empezar gratis",
    },
    footer: { rights: "© 2026 PayRemind" },
  },
};

const featureIcons = [Zap, Brain, Shield];

export default function LandingPage() {
  const { language, setLanguage } = useLanguage();
  const lang = language;
  const t = copy[lang];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<number | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    fetch(`${apiUrl}/stats/trial-slots`)
      .then((r) => r.json())
      .then((data) => setAvailableSlots(data.available))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white overflow-x-hidden">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <BellRing className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">PayRemind</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeSelector />
            <LanguageToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
            >
              {t.nav.cta}
            </Link>
          </div>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
            >
              {t.nav.cta}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-lg">
            <div className="px-4 py-4 space-y-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition border-b border-gray-100 dark:border-gray-800"
              >
                {t.nav.login}
              </Link>
              <div className="py-2">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide font-medium">Idioma</p>
                <LanguageToggle />
              </div>
              <div className="py-2">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide font-medium">Tema</p>
                <ThemeSelector />
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-b from-indigo-50 dark:from-gray-800 to-white dark:to-gray-900 px-6 py-16 md:py-36 text-center">
        <div className="mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 mb-6">
            <Zap className="w-3 h-3 shrink-0" />
            Automated payment reminders
          </span>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight mb-6">
            {lang === "en" ? (
              <>Stop chasing clients who <span className="text-indigo-600">don&apos;t pay</span></>
            ) : (
              <>Deja de perseguir clientes que <span className="text-indigo-600">no pagan</span></>
            )}
          </h1>
          <p className="mx-auto max-w-2xl text-base md:text-xl text-gray-500 dark:text-gray-300 leading-relaxed mb-10 px-2">
            {t.hero.sub}
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full md:w-auto min-h-[44px] rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-700 transition shadow-lg hover:shadow-indigo-200"
            >
              {t.hero.cta1}
            </Link>
            <a
              href="#how"
              className="w-full md:w-auto min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-8 py-4 text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center"
            >
              {t.hero.cta2} ↓
            </a>
          </div>
          {availableSlots !== null && availableSlots > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-indigo-700 dark:text-indigo-400 font-medium">
                {availableSlots} de 10 lugares gratis disponibles
              </span>
            </div>
          )}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="bg-gray-50 dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700 px-6 py-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">{t.proof.label}</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-16">
            {t.proof.stats.map((stat) => (
              <span key={stat} className="text-base font-semibold text-gray-800 dark:text-gray-200">
                {stat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12 md:mb-16">
            {t.how.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.how.steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white text-lg font-bold shadow-lg">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-gray-50 dark:bg-gray-800 px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12 md:mb-16">
            {t.features.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.features.cards.map((card, i) => {
              const Icon = featureIcons[i];
              return (
                <div
                  key={i}
                  className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 md:p-7 shadow-sm hover:shadow-md transition"
                >
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                    <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-10 md:mb-12">
            {t.pricing.title}
          </h2>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 md:px-8 py-7 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold text-gray-900 dark:text-white">{t.pricing.free.label}</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">$0</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-300">{t.pricing.free.desc}</p>
            </div>
            <div className="px-6 md:px-8 py-7 bg-indigo-50 dark:bg-indigo-900/30 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">Most Popular</span>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold text-indigo-900 dark:text-indigo-300">{t.pricing.pro.label}</span>
                <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{t.pricing.pro.price}</span>
              </div>
              <p className="text-sm text-indigo-700 dark:text-indigo-400">{t.pricing.pro.desc}</p>
            </div>
            <div className="px-6 md:px-8 py-6">
              <Link
                href="/register"
                className="block w-full min-h-[44px] rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white text-center hover:bg-indigo-700 transition shadow-sm"
              >
                {t.pricing.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-indigo-600 px-6 py-16 md:py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            {t.finalCta.title}
          </h2>
          <p className="text-indigo-200 text-base md:text-lg mb-10">{t.finalCta.sub}</p>
          <Link
            href="/register"
            className="inline-block w-full max-w-xs mx-auto min-h-[44px] rounded-xl bg-white px-10 py-4 text-base font-bold text-indigo-600 hover:bg-indigo-50 transition shadow-lg"
          >
            {t.finalCta.btn}
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 dark:bg-gray-950 border-t border-gray-800 px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <BellRing className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">PayRemind</span>
          </div>
          <div className="flex flex-col items-center gap-3 md:flex-row md:gap-6 text-sm text-gray-400">
            <Link href="/login" className="hover:text-white transition min-h-[44px] flex items-center">Login</Link>
            <Link href="/register" className="hover:text-white transition min-h-[44px] flex items-center">Register</Link>
            <Link href="/terms" className="hover:text-white transition min-h-[44px] flex items-center">Terms of Service</Link>
            <Link href="/refunds" className="hover:text-white transition min-h-[44px] flex items-center">Refund Policy</Link>
            <span>{t.footer.rights}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
