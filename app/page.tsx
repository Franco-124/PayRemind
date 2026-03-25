"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, Zap, Brain, Shield } from "lucide-react";

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
  const [lang, setLang] = useState<"en" | "es">("es");
  const t = copy[lang];

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <BellRing className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">PayRemind</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
              <button
                onClick={() => setLang("en")}
                className={`rounded-full px-3 py-1 transition ${lang === "en" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang("es")}
                className={`rounded-full px-3 py-1 transition ${lang === "es" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                ES
              </button>
            </div>

            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
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
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-gradient-to-b from-indigo-50 to-white px-4 sm:px-6 py-24 md:py-36 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 mb-8">
            <BellRing className="h-3.5 w-3.5" />
            PayRemind
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 leading-tight mb-6">
            {t.hero.headline}
          </h1>
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-gray-500 leading-relaxed mb-10">
            {t.hero.sub}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-700 transition shadow-lg hover:shadow-indigo-200"
            >
              {t.hero.cta1}
            </Link>
            <a
              href="#how"
              className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              {t.hero.cta2} ↓
            </a>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="bg-gray-50 border-y border-gray-100 px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium text-gray-500 mb-6">{t.proof.label}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            {t.proof.stats.map((stat) => (
              <span key={stat} className="text-base font-semibold text-gray-800">
                {stat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-4 sm:px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            {t.how.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.how.steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white text-lg font-bold shadow-lg">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-gray-50 px-4 sm:px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            {t.features.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.features.cards.map((card, i) => {
              const Icon = featureIcons[i];
              return (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-gray-200 p-7 shadow-sm hover:shadow-md transition"
                >
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="px-4 sm:px-6 py-24">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">
            {t.pricing.title}
          </h2>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Free tier */}
            <div className="px-8 py-7 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-semibold text-gray-900">{t.pricing.free.label}</span>
                <span className="text-2xl font-bold text-gray-900">$0</span>
              </div>
              <p className="text-sm text-gray-500">{t.pricing.free.desc}</p>
            </div>
            {/* Pro tier */}
            <div className="px-8 py-7 bg-indigo-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-indigo-900">{t.pricing.pro.label}</span>
                  <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">Popular</span>
                </div>
                <span className="text-2xl font-bold text-indigo-700">{t.pricing.pro.price}</span>
              </div>
              <p className="text-sm text-indigo-700">{t.pricing.pro.desc}</p>
            </div>
            {/* CTA */}
            <div className="px-8 py-6">
              <Link
                href="/register"
                className="block w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white text-center hover:bg-indigo-700 transition shadow-sm"
              >
                {t.pricing.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-indigo-600 px-4 sm:px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            {t.finalCta.title}
          </h2>
          <p className="text-indigo-200 text-lg mb-10">{t.finalCta.sub}</p>
          <Link
            href="/register"
            className="inline-block rounded-xl bg-white px-10 py-4 text-base font-bold text-indigo-600 hover:bg-indigo-50 transition shadow-lg"
          >
            {t.finalCta.btn}
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <BellRing className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">PayRemind</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/login" className="hover:text-white transition">Login</Link>
            <Link href="/register" className="hover:text-white transition">Register</Link>
            <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
            <Link href="/refunds" className="hover:text-white transition">Refund Policy</Link>
            <span>{t.footer.rights}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
