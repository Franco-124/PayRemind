"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type Language = "es" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "es",
  setLanguage: () => {},
  t: (key) => key,
});

const translations: Record<Language, Record<string, string>> = {
  es: {
    // Auth
    "auth.login.title":          "Iniciar sesión",
    "auth.login.subtitle":       "Bienvenido de vuelta",
    "auth.login.email":          "Email",
    "auth.login.password":       "Contraseña",
    "auth.login.submit":         "Iniciar sesión",
    "auth.login.no_account":     "¿No tenés cuenta?",
    "auth.login.register":       "Crear cuenta",
    "auth.login.error":          "Email o contraseña incorrectos",

    "auth.register.title":       "Crear cuenta",
    "auth.register.subtitle":    "Empieza gratis hoy",
    "auth.register.name":        "Nombre completo",
    "auth.register.email":       "Email",
    "auth.register.password":    "Contraseña",
    "auth.register.submit":      "Crear cuenta",
    "auth.register.has_account": "¿Ya tenés cuenta?",
    "auth.register.login":       "Iniciar sesión",

    // Nav
    "nav.dashboard":      "Dashboard",
    "nav.invoices":       "Facturas",
    "nav.clients":        "Clientes",
    "nav.emails":         "Emails",
    "nav.feedback":       "Feedback",
    "nav.settings":       "Ajustes",
    "nav.admin":          "Admin",
    "nav.logout":         "Cerrar sesión",
    "nav.theme":          "Tema",
    "nav.language":       "Idioma",
    "nav.theme.light":    "Claro",
    "nav.theme.dark":     "Oscuro",
    "nav.theme.system":   "Sistema",

    // Dashboard
    "dashboard.title":         "Dashboard",
    "dashboard.subtitle":      "Resumen de tu actividad",
    "dashboard.pending":       "Facturas pendientes",
    "dashboard.overdue":       "Facturas vencidas",
    "dashboard.total_pending": "Monto total pendiente",
    "dashboard.recent":        "Actividad reciente",
    "dashboard.no_activity":   "Sin actividad reciente",
    "dashboard.no_activity_sub": "Creá tu primera factura para empezar.",
    "dashboard.free_limit":    "Has alcanzado el límite del plan Free",
    "dashboard.free_limit_sub": "Upgrade a Pro para crear facturas ilimitadas.",

    // Invoices
    "invoices.title":              "Facturas",
    "invoices.subtitle":           "Seguimiento de cobros y recordatorios automáticos",
    "invoices.new":                "+ Nueva factura",
    "invoices.no_client_warning":  "Primero debés registrar un cliente para crear facturas.",
    "invoices.info_banner":        "Los recordatorios se envían automáticamente a las 9:00 AM UTC en los días 3, 7 y 14 después del vencimiento.",
    "invoices.filter.all":         "Todos",
    "invoices.filter.pending":     "Pendiente",
    "invoices.filter.overdue":     "Vencida",
    "invoices.filter.paid":        "Pagada",
    "invoices.filter.cancelled":   "Cancelada",
    "invoices.col.number":         "#",
    "invoices.col.client":         "Cliente",
    "invoices.col.amount":         "Monto",
    "invoices.col.due":            "Vencimiento",
    "invoices.col.status":         "Estado",
    "invoices.col.reminders":      "Recordatorios",
    "invoices.col.actions":        "Acciones",
    "invoices.empty":              "No hay facturas para este filtro.",
    "invoices.loading":            "Cargando...",
    "invoices.action.paid":        "Pagada",
    "invoices.action.send":        "Enviar",
    "invoices.action.pause":       "Pausar",
    "invoices.action.resume":      "Reanudar",
    "invoices.action.history":     "Historial",
    "invoices.action.cobrada":     "Cobrada",
    "invoices.action.cancelled":   "Cancelada",
    "invoices.create.title":       "Nueva factura",
    "invoices.create.client":      "Cliente *",
    "invoices.create.number":      "Número de factura *",
    "invoices.create.currency":    "Moneda",
    "invoices.create.amount":      "Monto *",
    "invoices.create.due":         "Vencimiento *",
    "invoices.create.desc":        "Descripción",
    "invoices.create.reminders":   "Recordatorios automáticos",
    "invoices.create.submit":      "Crear factura",
    "invoices.create.creating":    "Creando...",
    "invoices.create.cancel":      "Cancelar",
    "invoices.create.email_config": "Personalizar emails para esta factura",
    "invoices.create.email_config_hint": "(opcional — usa config del cliente por defecto)",
    "invoices.send_now":           "📧 Enviar recordatorio ahora",
    "invoices.sending":            "Enviando...",
    "invoices.email_log.title":    "Historial de emails",
    "invoices.email_log.empty":    "No se han enviado emails aún.",
    "invoices.close":              "Cerrar",
    "invoices.upgrade.title":      "Límite del plan Free alcanzado",
    "invoices.upgrade.desc":       "El plan gratuito permite hasta 3 facturas activas.",
    "invoices.upgrade.cta":        "Actualizar a Pro",
    "invoices.upgrade.later":      "Ahora no",

    // Clients
    "clients.title":           "Clientes",
    "clients.subtitle":        "Gestiona los contactos a quienes facturás",
    "clients.new":             "+ Nuevo cliente",
    "clients.col.name":        "Nombre",
    "clients.col.email":       "Email",
    "clients.col.company":     "Empresa",
    "clients.col.created":     "Creado",
    "clients.col.actions":     "Acciones",
    "clients.empty.title":     "Sin clientes aún",
    "clients.empty.desc":      "Creá tu primer cliente para poder emitir facturas y enviar recordatorios.",
    "clients.loading":         "Cargando...",
    "clients.edit":            "Editar",
    "clients.delete":          "Eliminar",
    "clients.deleting":        "Eliminando...",
    "clients.create.title":    "Nuevo cliente",
    "clients.edit.title":      "Editar cliente",
    "clients.confirm_delete":  "¿Eliminar cliente?",
    "clients.confirm_desc":    "Esta acción no se puede deshacer.",
    "clients.form.name":       "Nombre *",
    "clients.form.email":      "Email *",
    "clients.form.company":    "Empresa",
    "clients.form.notes":      "Notas",
    "clients.form.save":       "Crear cliente",
    "clients.form.save_edit":  "Guardar cambios",
    "clients.form.cancel":     "Cancelar",
    "clients.form.saving":     "Guardando...",

    // Emails
    "emails.title":        "Emails enviados",
    "emails.subtitle":     "Historial completo de recordatorios enviados a tus clientes",
    "emails.filter.all":   "Todos",
    "emails.filter.sent":  "Enviados",
    "emails.filter.failed":"Fallidos",
    "emails.search":       "Buscar cliente o factura...",
    "emails.col.client":   "Cliente",
    "emails.col.invoice":  "Factura",
    "emails.col.subject":  "Asunto",
    "emails.col.day":      "Día",
    "emails.col.tone":     "Tono",
    "emails.col.status":   "Estado",
    "emails.col.sent_at":  "Enviado",
    "emails.empty":        "No hay emails enviados aún.",
    "emails.empty.sub":    "Crea una factura y activa los recordatorios automáticos para empezar.",
    "emails.loading":      "Cargando...",
    "emails.tone.friendly":"Amable",
    "emails.tone.firm":    "Firme",
    "emails.tone.final":   "Final",
    "emails.status.sent":  "Enviado",
    "emails.status.failed":"Fallido",
    "emails.detail.title": "Detalle del email",
    "emails.detail.client":"Cliente",
    "emails.detail.invoice":"Factura",
    "emails.detail.sent":  "Enviado",
    "emails.detail.day":   "Día del recordatorio",
    "emails.detail.tone":  "Tono",
    "emails.detail.status":"Estado",
    "emails.detail.subject":"Asunto",
    "emails.detail.body":  "Cuerpo",
    "emails.close":        "Cerrar",

    // Settings
    "settings.title":       "Ajustes",
    "settings.subtitle":    "Administra tu cuenta y suscripción",
    "settings.account":     "Mi cuenta",
    "settings.name":        "Nombre",
    "settings.email":       "Email",
    "settings.plan":        "Plan",
    "settings.member_since":"Miembro desde",
    "settings.subscription":"Suscripción",
    "settings.pro_active":  "Plan Pro activo",
    "settings.pro_desc":    "Disfrutás de recordatorios ilimitados y todas las funciones premium.",
    "settings.manage":      "Gestionar suscripción",
    "settings.manage_desc": "Para cancelar tu suscripción, revisa el email de confirmación que recibiste al suscribirte.",
    "settings.free_title":  "Plan Free",
    "settings.free_desc":   "Hasta 3 facturas activas. Actualizá a Pro para desbloquear recordatorios ilimitados.",
    "settings.upgrade":     "Upgrade a Pro",
    "settings.loading":     "Cargando...",

    // Feedback
    "feedback.title":           "Enviar feedback",
    "feedback.subtitle":        "Tu opinión nos ayuda a mejorar PayRemind. Cuéntanos qué piensas.",
    "feedback.category":        "Categoría *",
    "feedback.priority":        "Prioridad *",
    "feedback.rating":          "Valoración general *",
    "feedback.message":         "Mensaje *",
    "feedback.submit":          "Enviar feedback",
    "feedback.sending":         "Enviando...",
    "feedback.success.title":   "¡Gracias por tu feedback!",
    "feedback.success.desc":    "Lo revisaremos pronto y lo tendremos en cuenta para mejorar PayRemind.",
    "feedback.send_another":    "Enviar otro feedback",
    "feedback.priority.low":    "Baja",
    "feedback.priority.medium": "Media",
    "feedback.priority.high":   "Alta",

    // Common
    "common.cancel":   "Cancelar",
    "common.close":    "Cerrar",
    "common.loading":  "Cargando...",
    "common.error":    "Error, intenta de nuevo",
    "common.upgrade":  "Upgrade a Pro",
  },

  en: {
    // Auth
    "auth.login.title":          "Sign in",
    "auth.login.subtitle":       "Welcome back",
    "auth.login.email":          "Email",
    "auth.login.password":       "Password",
    "auth.login.submit":         "Sign in",
    "auth.login.no_account":     "Don't have an account?",
    "auth.login.register":       "Create account",
    "auth.login.error":          "Invalid email or password",

    "auth.register.title":       "Create account",
    "auth.register.subtitle":    "Start for free today",
    "auth.register.name":        "Full name",
    "auth.register.email":       "Email",
    "auth.register.password":    "Password",
    "auth.register.submit":      "Create account",
    "auth.register.has_account": "Already have an account?",
    "auth.register.login":       "Sign in",

    // Nav
    "nav.dashboard":      "Dashboard",
    "nav.invoices":       "Invoices",
    "nav.clients":        "Clients",
    "nav.emails":         "Emails",
    "nav.feedback":       "Feedback",
    "nav.settings":       "Settings",
    "nav.admin":          "Admin",
    "nav.logout":         "Log out",
    "nav.theme":          "Theme",
    "nav.language":       "Language",
    "nav.theme.light":    "Light",
    "nav.theme.dark":     "Dark",
    "nav.theme.system":   "System",

    // Dashboard
    "dashboard.title":         "Dashboard",
    "dashboard.subtitle":      "Your billing overview",
    "dashboard.pending":       "Pending invoices",
    "dashboard.overdue":       "Overdue invoices",
    "dashboard.total_pending": "Total pending",
    "dashboard.recent":        "Recent activity",
    "dashboard.no_activity":   "No recent activity",
    "dashboard.no_activity_sub": "Create your first invoice to get started.",
    "dashboard.free_limit":    "You've reached the Free plan limit",
    "dashboard.free_limit_sub": "Upgrade to Pro to create unlimited invoices.",

    // Invoices
    "invoices.title":              "Invoices",
    "invoices.subtitle":           "Track payments and automatic reminders",
    "invoices.new":                "+ New invoice",
    "invoices.no_client_warning":  "You need to register a client first to create invoices.",
    "invoices.info_banner":        "Reminders are sent automatically at 9:00 AM UTC on days 3, 7 and 14 after the due date.",
    "invoices.filter.all":         "All",
    "invoices.filter.pending":     "Pending",
    "invoices.filter.overdue":     "Overdue",
    "invoices.filter.paid":        "Paid",
    "invoices.filter.cancelled":   "Cancelled",
    "invoices.col.number":         "#",
    "invoices.col.client":         "Client",
    "invoices.col.amount":         "Amount",
    "invoices.col.due":            "Due date",
    "invoices.col.status":         "Status",
    "invoices.col.reminders":      "Reminders",
    "invoices.col.actions":        "Actions",
    "invoices.empty":              "No invoices for this filter.",
    "invoices.loading":            "Loading...",
    "invoices.action.paid":        "Paid",
    "invoices.action.send":        "Send",
    "invoices.action.pause":       "Pause",
    "invoices.action.resume":      "Resume",
    "invoices.action.history":     "History",
    "invoices.action.cobrada":     "Collected",
    "invoices.action.cancelled":   "Cancelled",
    "invoices.create.title":       "New invoice",
    "invoices.create.client":      "Client *",
    "invoices.create.number":      "Invoice number *",
    "invoices.create.currency":    "Currency",
    "invoices.create.amount":      "Amount *",
    "invoices.create.due":         "Due date *",
    "invoices.create.desc":        "Description",
    "invoices.create.reminders":   "Automatic reminders",
    "invoices.create.submit":      "Create invoice",
    "invoices.create.creating":    "Creating...",
    "invoices.create.cancel":      "Cancel",
    "invoices.create.email_config": "Customize emails for this invoice",
    "invoices.create.email_config_hint": "(optional — uses client config by default)",
    "invoices.send_now":           "📧 Send reminder now",
    "invoices.sending":            "Sending...",
    "invoices.email_log.title":    "Email history",
    "invoices.email_log.empty":    "No emails sent yet.",
    "invoices.close":              "Close",
    "invoices.upgrade.title":      "Free plan limit reached",
    "invoices.upgrade.desc":       "The free plan allows up to 3 active invoices.",
    "invoices.upgrade.cta":        "Upgrade to Pro",
    "invoices.upgrade.later":      "Not now",

    // Clients
    "clients.title":           "Clients",
    "clients.subtitle":        "Manage your clients",
    "clients.new":             "+ New client",
    "clients.col.name":        "Name",
    "clients.col.email":       "Email",
    "clients.col.company":     "Company",
    "clients.col.created":     "Created",
    "clients.col.actions":     "Actions",
    "clients.empty.title":     "No clients yet",
    "clients.empty.desc":      "Create your first client to start issuing invoices and sending reminders.",
    "clients.loading":         "Loading...",
    "clients.edit":            "Edit",
    "clients.delete":          "Delete",
    "clients.deleting":        "Deleting...",
    "clients.create.title":    "New client",
    "clients.edit.title":      "Edit client",
    "clients.confirm_delete":  "Delete client?",
    "clients.confirm_desc":    "This action cannot be undone.",
    "clients.form.name":       "Name *",
    "clients.form.email":      "Email *",
    "clients.form.company":    "Company",
    "clients.form.notes":      "Notes",
    "clients.form.save":       "Create client",
    "clients.form.save_edit":  "Save changes",
    "clients.form.cancel":     "Cancel",
    "clients.form.saving":     "Saving...",

    // Emails
    "emails.title":        "Sent emails",
    "emails.subtitle":     "Complete history of reminders sent to your clients",
    "emails.filter.all":   "All",
    "emails.filter.sent":  "Sent",
    "emails.filter.failed":"Failed",
    "emails.search":       "Search client or invoice...",
    "emails.col.client":   "Client",
    "emails.col.invoice":  "Invoice",
    "emails.col.subject":  "Subject",
    "emails.col.day":      "Day",
    "emails.col.tone":     "Tone",
    "emails.col.status":   "Status",
    "emails.col.sent_at":  "Sent at",
    "emails.empty":        "No emails sent yet.",
    "emails.empty.sub":    "Create an invoice and enable automatic reminders to get started.",
    "emails.loading":      "Loading...",
    "emails.tone.friendly":"Friendly",
    "emails.tone.firm":    "Firm",
    "emails.tone.final":   "Final",
    "emails.status.sent":  "Sent",
    "emails.status.failed":"Failed",
    "emails.detail.title": "Email detail",
    "emails.detail.client":"Client",
    "emails.detail.invoice":"Invoice",
    "emails.detail.sent":  "Sent at",
    "emails.detail.day":   "Reminder day",
    "emails.detail.tone":  "Tone",
    "emails.detail.status":"Status",
    "emails.detail.subject":"Subject",
    "emails.detail.body":  "Body",
    "emails.close":        "Close",

    // Settings
    "settings.title":       "Settings",
    "settings.subtitle":    "Manage your account and subscription",
    "settings.account":     "My account",
    "settings.name":        "Name",
    "settings.email":       "Email",
    "settings.plan":        "Plan",
    "settings.member_since":"Member since",
    "settings.subscription":"Subscription",
    "settings.pro_active":  "Pro plan active",
    "settings.pro_desc":    "You enjoy unlimited reminders and all premium features.",
    "settings.manage":      "Manage subscription",
    "settings.manage_desc": "To cancel your subscription, check the confirmation email you received when subscribing.",
    "settings.free_title":  "Free plan",
    "settings.free_desc":   "Up to 3 active invoices. Upgrade to Pro to unlock unlimited reminders.",
    "settings.upgrade":     "Upgrade to Pro",
    "settings.loading":     "Loading...",

    // Feedback
    "feedback.title":           "Send feedback",
    "feedback.subtitle":        "Your opinion helps us improve PayRemind.",
    "feedback.category":        "Category *",
    "feedback.priority":        "Priority *",
    "feedback.rating":          "Overall rating *",
    "feedback.message":         "Message *",
    "feedback.submit":          "Send feedback",
    "feedback.sending":         "Sending...",
    "feedback.success.title":   "Thanks for your feedback!",
    "feedback.success.desc":    "We'll review it soon and take it into account to improve PayRemind.",
    "feedback.send_another":    "Send another feedback",
    "feedback.priority.low":    "Low",
    "feedback.priority.medium": "Medium",
    "feedback.priority.high":   "High",

    // Common
    "common.cancel":   "Cancel",
    "common.close":    "Close",
    "common.loading":  "Loading...",
    "common.error":    "Error, please try again",
    "common.upgrade":  "Upgrade to Pro",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("payremind_language") as Language;
    if (saved && ["es", "en"].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("payremind_language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] ?? key;
  };

  if (!mounted) return <>{children}</>;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
