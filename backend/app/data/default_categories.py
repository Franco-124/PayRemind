INCOME_CATEGORIES = [
    {
        "name": "Pago de factura",
        "icon": "receipt",
        "color": "#22C55E",
        "scan_fields": ["client_name", "invoice_number"],
    },
    {
        "name": "Proyecto freelance",
        "icon": "work",
        "color": "#6366F1",
        "scan_fields": ["client_name", "project_name"],
    },
    {
        "name": "Consultoría",
        "icon": "psychology",
        "color": "#8B5CF6",
        "scan_fields": ["client_name"],
    },
    {
        "name": "Productos digitales",
        "icon": "inventory_2",
        "color": "#06B6D4",
        "scan_fields": ["product_name"],
    },
    {
        "name": "Inversiones",
        "icon": "trending_up",
        "color": "#F59E0B",
        "scan_fields": ["instrument_name"],
    },
    {
        "name": "Otros ingresos",
        "icon": "add_circle",
        "color": "#94A3B8",
        "scan_fields": [],
    },
]

EXPENSE_CATEGORIES = [
    {
        "name": "Alimentación",
        "icon": "restaurant",
        "color": "#EF4444",
        "scan_fields": ["vendor_name"],
    },
    {
        "name": "Transporte",
        "icon": "directions_car",
        "color": "#F97316",
        "scan_fields": ["provider_name", "destination"],
    },
    {
        "name": "Servicios",
        "icon": "electrical_services",
        "color": "#EAB308",
        "scan_fields": ["provider_name"],
    },
    {
        "name": "Suscripciones",
        "icon": "subscriptions",
        "color": "#8B5CF6",
        "scan_fields": ["service_name", "billing_period"],
    },
    {
        "name": "Software y tools",
        "icon": "computer",
        "color": "#6366F1",
        "scan_fields": ["tool_name", "billing_period"],
    },
    {
        "name": "Marketing",
        "icon": "campaign",
        "color": "#EC4899",
        "scan_fields": ["vendor_name"],
    },
    {
        "name": "Educación",
        "icon": "school",
        "color": "#14B8A6",
        "scan_fields": ["institution_name", "course_name"],
    },
    {
        "name": "Salud",
        "icon": "health_and_safety",
        "color": "#22C55E",
        "scan_fields": ["provider_name"],
    },
    {
        "name": "Vivienda",
        "icon": "home",
        "color": "#F59E0B",
        "scan_fields": ["concept"],
    },
    {
        "name": "Entretenimiento",
        "icon": "sports_esports",
        "color": "#06B6D4",
        "scan_fields": ["venue_name"],
    },
    {
        "name": "Otros gastos",
        "icon": "remove_circle",
        "color": "#94A3B8",
        "scan_fields": [],
    },
]
