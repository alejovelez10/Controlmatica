#!/usr/bin/env python3
"""Genera imagenes de comprobantes de gasto con Gemini para probar la carga de
gastos y la extraccion.

El texto del recibo lo arma este script, linea por linea, imitando lo que
imprime de verdad cada tipo de comercio en cada pais (encabezado fiscal, forma
en que aparece el pago, impuestos y recargos locales). Gemini solo lo dibuja.
Cada imagen sale con un .json al lado con los valores esperados.

Auth: GEMINI_API_KEY o GOOGLE_API_KEY (Developer API); si no hay, ADC de
gcloud contra Vertex AI.
"""
import argparse
import datetime as dt
import json
import os
import random
import subprocess
import sys
from pathlib import Path

# gemini-2.5-flash-image revuelve los textos largos; los 3.x los dibujan bien.
DEFAULT_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")

# Sin proporcion explicita salen apaisadas y el recibo queda chico o acostado.
PROPORCION = {"ticket": "9:16", "factura": "3:4", "app": "9:16", "manuscrito": "3:4"}

# ---------------------------------------------------------------------------
# Paises. Los codigos son los de Currency::CATALOG (app/models/currency.rb).
#   fx:     unidades de la moneda por 1 USD (aprox.), para escalar precios
#   paso:   a que multiplo se redondea un precio de lista
#   modo:   "incluido" = los precios ya traen el impuesto y abajo se desglosa
#           "agregado" = subtotal + impuestos (+ recargos) = total
# ---------------------------------------------------------------------------
PAISES = {
    "COP": dict(pais="Colombia", ciudades=["Bogotá D.C.", "Medellín", "Cali", "Barranquilla", "Bucaramanga"],
                simbolo="$", fx=4000, paso=100, dec=0, sep=(".", ","), modo="incluido", idioma="es",
                sociedad="S.A.S.", fecha="%d/%m/%Y", unidad_comb="GAL"),
    "USD": dict(pais="United States", ciudades=["Miami, FL", "Houston, TX", "Orlando, FL", "Atlanta, GA"],
                simbolo="$", fx=1, paso=0.01, dec=2, sep=(",", "."), modo="agregado", idioma="en",
                sociedad="LLC", fecha="%m/%d/%Y", unidad_comb="GAL"),
    "EUR": dict(pais="España", ciudades=["Madrid", "Barcelona", "Valencia", "Bilbao"],
                simbolo="€", fx=0.88, paso=0.05, dec=2, sep=(".", ","), modo="incluido", idioma="es",
                sociedad="S.L.", fecha="%d/%m/%Y", unidad_comb="L"),
    "MXN": dict(pais="México", ciudades=["Ciudad de México", "Monterrey, N.L.", "Guadalajara, Jal."],
                simbolo="$", fx=18.5, paso=0.5, dec=2, sep=(",", "."), modo="incluido", idioma="es",
                sociedad="S.A. de C.V.", fecha="%d/%m/%Y", unidad_comb="L"),
    "DOP": dict(pais="República Dominicana", ciudades=["Santo Domingo", "Santiago de los Caballeros", "Punta Cana"],
                simbolo="RD$", fx=62, paso=1, dec=2, sep=(",", "."), modo="agregado", idioma="es",
                sociedad="S.R.L.", fecha="%d-%m-%Y", unidad_comb="GAL"),
    "CRC": dict(pais="Costa Rica", ciudades=["San José", "Heredia", "Alajuela", "Escazú"],
                simbolo="₡", fx=505, paso=50, dec=2, sep=(" ", ","), modo="incluido", idioma="es",
                sociedad="S.A.", fecha="%d/%m/%Y", unidad_comb="L"),
    "HNL": dict(pais="Honduras", ciudades=["Tegucigalpa", "San Pedro Sula", "La Ceiba"],
                simbolo="L", fx=26, paso=0.5, dec=2, sep=(",", "."), modo="agregado", idioma="es",
                sociedad="S. de R.L.", fecha="%d/%m/%Y", unidad_comb="GAL"),
}

# Combustible: nombre en el surtidor y precio por unidad en moneda local.
COMBUSTIBLES = {
    "COP": [("GASOLINA CORRIENTE", 16200), ("ACPM", 10900), ("GASOLINA EXTRA", 19800)],
    "USD": [("UNLEADED 87", 3.45), ("PREMIUM 93", 4.19), ("DIESEL", 3.89)],
    "EUR": [("SIN PLOMO 95", 1.55), ("DIESEL e+", 1.49)],
    "MXN": [("MAGNA", 24.49), ("PREMIUM", 26.59), ("DIESEL", 26.09)],
    "DOP": [("GASOLINA REGULAR", 272.50), ("GASOLINA PREMIUM", 293.60), ("GASOIL OPTIMO", 242.10)],
    "CRC": [("REGULAR", 655.00), ("SUPER", 672.00), ("DIESEL", 562.00)],
    "HNL": [("REGULAR", 96.40), ("SUPER", 104.90), ("DIESEL", 91.30)],
}

# Tipos de db/seeds/report_expense_options.rb.
#   items: (nombre es, nombre en, precio USD min, max, cantidad max)
#   docs:  documentos que de verdad emite ese tipo de comercio
TIPOS = {
    "taxi": dict(nombre="Taxis y buses", giro=("Transporte", "Rides"), docs=["app", "manuscrito"],
                 items=[("Servicio de transporte", "Ride", 3, 35, 1)]),
    "restaurante": dict(nombre="Casino y restaurante", giro=("Restaurante", "Grill"), docs=["ticket", "factura"],
                        items=[("Almuerzo ejecutivo", "Lunch special", 5, 14, 3), ("Limonada natural", "Iced tea", 1.5, 4, 3),
                               ("Bandeja de la casa", "House burger", 8, 18, 2), ("Café americano", "Coffee", 1.2, 3.5, 2),
                               ("Postre del día", "Cheesecake", 3, 7, 2), ("Sopa del día", "Soup of the day", 3, 7, 2)]),
    "parqueadero": dict(nombre="Parqueaderos", giro=("Parqueadero", "Parking"), docs=["ticket"], items=[]),
    "peaje": dict(nombre="Peajes", giro=("Peaje", "Toll"), docs=["ticket"], items=[]),
    "combustible": dict(nombre="Combustibles", giro=("Estación de Servicio", "Gas Station"), docs=["ticket", "factura"], items=[]),
    "aereo": dict(nombre="Pasajes aéreos", giro=("Aerolíneas", "Airlines"), docs=["app", "factura"],
                  items=[("Tarifa aérea", "Airfare", 70, 650, 1), ("Equipaje en bodega 23 kg", "Checked bag", 25, 60, 1),
                         ("Selección de silla", "Seat selection", 8, 30, 1)]),
    "hotel": dict(nombre="Alojamiento y manutención", giro=("Hotel", "Inn & Suites"), docs=["factura", "ticket"],
                  items=[("Alojamiento habitación estándar", "Room charge - King", 55, 180, 3), ("Desayuno buffet", "Breakfast", 8, 20, 3),
                         ("Servicio de lavandería", "Laundry service", 6, 25, 1)]),
    "dotacion": dict(nombre="Dotación", giro=("Seguridad Industrial", "Workwear"), docs=["factura", "ticket"],
                     items=[("Bota de seguridad puntera acero", "Steel toe boots", 30, 80, 3), ("Overol en dril", "Coveralls", 15, 40, 4),
                            ("Guante nitrilo x par", "Nitrile gloves pair", 1, 4, 12), ("Casco dieléctrico", "Hard hat", 8, 25, 3)]),
    "representacion": dict(nombre="Gastos de representación", giro=("Restaurante", "Steakhouse"), docs=["ticket", "factura"],
                           items=[("Lomo al carbón", "Ribeye 12oz", 18, 45, 4), ("Copa de vino tinto", "Glass of cabernet", 7, 16, 6),
                                  ("Entrada de la casa", "Appetizer", 8, 18, 2), ("Agua mineral", "Sparkling water", 2, 5, 4)]),
    "papeleria": dict(nombre="Útiles papelería", giro=("Papelería", "Office Supply"), docs=["ticket", "factura"],
                      items=[("Resma papel carta 75 g", "Copy paper ream", 4, 9, 5), ("Bolígrafo negro caja x12", "Pens 12 pk", 3, 8, 3),
                             ("Cuaderno argollado", "Spiral notebook", 2, 6, 4), ("Carpeta legajadora", "File folders", 0.5, 2, 10)]),
    "aseo": dict(nombre="Elementos de aseo y cafetería", giro=("Supermercado", "Market"), docs=["ticket", "factura"],
                 items=[("Café molido 500 g", "Ground coffee 12oz", 5, 11, 3), ("Azúcar 1 kg", "Sugar 4 lb", 1, 4, 2),
                        ("Toalla de cocina x3", "Paper towels 6 pk", 3, 9, 3), ("Detergente líquido 1 L", "Dish soap", 2, 6, 3),
                        ("Vasos desechables x50", "Paper cups 50 ct", 2, 5, 4)]),
    "ferreteria": dict(nombre="Enseres menores", giro=("Ferretería", "Hardware"), docs=["ticket", "factura", "manuscrito"],
                       items=[("Cinta aislante negra", "Electrical tape", 1, 3, 5), ("Destornillador pala 1/4", "Screwdriver", 3, 9, 2),
                              ("Extensión eléctrica 5 m", "Extension cord 15ft", 6, 18, 2), ("Tornillo drywall x100", "Drywall screws 100 ct", 2, 6, 3)]),
    "farmacia": dict(nombre="Gastos médicos y drogas", giro=("Droguería", "Pharmacy"), docs=["ticket"],
                     items=[("Acetaminofén 500 mg x20", "Acetaminophen 500mg 24ct", 1, 6, 2), ("Suero oral 500 ml", "Electrolyte drink", 1, 4, 4),
                            ("Curitas x20", "Bandages 30ct", 1, 5, 2), ("Loratadina 10 mg x10", "Loratadine 10mg", 2, 9, 1)]),
    "celular": dict(nombre="Celular", giro=("Comunicaciones", "Wireless"), docs=["app", "ticket"],
                    items=[("Recarga prepago", "Prepaid refill", 3, 25, 1), ("Paquete de datos 10 GB", "Data add-on", 4, 20, 1)]),
    "reparacion": dict(nombre="Reparaciones locativas", giro=("Mantenimientos", "Repairs"), docs=["factura", "manuscrito"],
                       items=[("Mano de obra reparación", "Labor", 40, 600, 1), ("Materiales", "Materials", 10, 300, 1)]),
}

MEDIOS = {"tarjeta": "TARJETA DE CREDITO", "efectivo": "EFECTIVO", "credito": "CREDITO PROVEEDORES"}

DOCUMENTOS = {
    "ticket": "tiquete de impresora térmica POS, papel angosto (80 mm), tipografía monoespaciada, encabezado centrado",
    "factura": "representación impresa de factura electrónica en hoja tamaño carta, logo sencillo del comercio, tabla de ítems con bordes y código QR",
    "app": "comprobante digital de una app o correo de confirmación, tipografía sans-serif moderna",
    "manuscrito": "recibo de talonario: encabezado y datos fiscales preimpresos, y los ítems, valores y fecha escritos a mano con bolígrafo",
}

CAPTURAS = {
    "plano": "escaneado o fotografiado de frente, bien iluminado, ocupa casi todo el cuadro",
    "foto": "foto tomada con celular sobre una superficie cotidiana (escritorio, mesa, tablero del carro), con leve inclinación, papel algo curvado o arrugado y luz natural",
    "borroso": "foto de celular difícil de leer: desenfoque leve, sombra de la mano, reflejo y tinta térmica algo desvanecida, pero con los números aún legibles",
    "pantalla": "captura de pantalla de un celular, con barra de estado arriba",
}

NOMBRES = ["La Ceiba", "El Mirador", "Santa Bárbara", "Los Almendros", "Río Claro", "Punto Norte", "La Esquina",
           "San Rafael", "El Roble", "Las Palmas", "Villa Real", "Altamira", "Monteverde", "La Fragua"]
NOMBRES_EN = ["Bayside", "Oak Hill", "Harbor", "Cypress", "Northgate", "Red Maple", "Lakeview", "Pinecrest"]
CAJEROS = ["Luisa M.", "Andrés P.", "Karen G.", "Jhon F.", "Diana R.", "Carlos T.", "Yuliana S."]
CAJEROS_EN = ["Ashley", "Marcus", "Jenny", "Tyler", "Brianna"]
AIDS = {"VISA": "A0000000031010", "MASTERCARD": "A0000000041010", "AMEX": "A00000002501"}
PLACAS = ["KLM", "FTR", "JHQ", "BXD", "GTS", "WPT"]


# ---------------------------------------------------------------------------
# Formato
# ---------------------------------------------------------------------------
def fmt(valor, mon, dec=None):
    p = PAISES[mon]
    dec = p["dec"] if dec is None else dec
    miles, decimal = p["sep"]
    return f"{valor:,.{dec}f}".replace(",", "\0").replace(".", decimal).replace("\0", miles)


def dinero(valor, mon):
    return f"{PAISES[mon]['simbolo']}{fmt(valor, mon)}"


def redondear(valor, mon):
    p = PAISES[mon]
    return round(round(valor / p["paso"]) * p["paso"], p["dec"])


def fila(izq, der, ancho=40):
    return f"{izq}{' ' * max(1, ancho - len(izq) - len(der))}{der}"


def es_en(mon):
    return PAISES[mon]["idioma"] == "en"


def hexa(r, n):
    return "".join(r.choice("0123456789abcdef") for _ in range(n))


# ---------------------------------------------------------------------------
# Identificadores con el formato de cada pais (valores inventados)
# ---------------------------------------------------------------------------
def id_fiscal(mon, r):
    d = lambda n: "".join(str(r.randint(0, 9)) for _ in range(n))
    L = lambda n: "".join(r.choice("ABCDEFGHJKLMNPRSTUVWXYZ") for _ in range(n))
    return {
        "COP": f"NIT {r.randint(800, 901)}.{d(3)}.{d(3)}-{d(1)}",
        "USD": f"Store #{d(4)}",
        "EUR": f"NIF B{d(8)}",
        "MXN": f"RFC {L(3)}{r.randint(90, 99)}{r.randint(1, 12):02d}{r.randint(1, 28):02d}{L(2)}{d(1)}",
        "DOP": f"RNC 1-{d(2)}-{d(5)}-{d(1)}",
        "CRC": f"Céd. Jurídica 3-101-{d(6)}",
        "HNL": f"RTN 0801{r.randint(1990, 2020)}{d(6)}",
    }[mon]


# ---------------------------------------------------------------------------
# Impuestos y recargos locales por tipo de gasto.
# Devuelve (impuestos, recargos) como listas de (etiqueta, tasa). Los
# recargos (propina, servicio) no hacen parte de la base del impuesto.
# ---------------------------------------------------------------------------
def impuestos_de(mon, tipo, r):
    comida = tipo in ("restaurante", "representacion")
    if mon == "COP":
        if comida:
            return [("INC 8%", 0.08)], ([("Propina voluntaria 10%", 0.10)] if r.random() < 0.6 else [])
        if tipo in ("combustible", "peaje", "taxi", "farmacia"):
            return [], []
        return [("IVA 19%", 0.19)], []
    if mon == "USD":
        if tipo == "hotel":
            return [("State Tax 6%", 0.06), ("Occupancy Tax 6%", 0.06)], []
        if tipo in ("combustible", "peaje", "taxi", "aereo"):
            return [], []
        return [("Sales Tax 7%", 0.07)], []
    if mon == "EUR":
        if comida or tipo in ("hotel", "taxi", "aereo"):
            return [("IVA 10%", 0.10)], []
        if tipo == "farmacia":
            return [("IVA 4%", 0.04)], []
        return [("IVA 21%", 0.21)], []
    if mon == "MXN":
        if tipo == "farmacia":
            return [], []
        return [("IVA 16%", 0.16)], []
    if mon == "DOP":
        if comida or tipo == "hotel":
            return [("ITBIS 18%", 0.18)], [("10% Ley", 0.10)]
        if tipo in ("combustible", "peaje", "farmacia", "taxi"):
            return [], []
        return [("ITBIS 18%", 0.18)], []
    if mon == "CRC":
        if comida:
            return [("IVA 13%", 0.13)], [("Servicio 10%", 0.10)]
        if tipo == "farmacia":
            return [("IVA 2%", 0.02)], []
        if tipo in ("combustible", "peaje", "taxi"):
            return [], []
        return [("IVA 13%", 0.13)], []
    if mon == "HNL":
        if tipo == "hotel":
            return [("ISV 15%", 0.15)], [("Tasa de turismo 4%", 0.04)]
        if tipo in ("combustible", "peaje", "farmacia", "taxi"):
            return [], []
        return [("ISV 15%", 0.15)], []
    raise KeyError(mon)


# ---------------------------------------------------------------------------
# Caso: numeros coherentes
# ---------------------------------------------------------------------------
def armar_items(mon, tipo, r):
    p = PAISES[mon]
    en = es_en(mon)
    if tipo == "combustible":
        nombre, precio = r.choice(COMBUSTIBLES[mon])
        # Casi todo el mundo tanquea por un valor redondo; la cantidad sale sola.
        objetivo = r.uniform(15, 110) * p["fx"]
        objetivo = float(round(objetivo, -4 if mon == "COP" else (0 if mon in ("USD", "EUR") else -2)))
        cant = round(objetivo / precio, 3)
        return [dict(desc=nombre, cant=cant, unidad=p["unidad_comb"], precio=precio, valor=objetivo)]
    if tipo == "peaje":
        valor = redondear(r.uniform(3, 9) * p["fx"], mon)
        return [dict(desc="Class 1" if en else "Categoría I", cant=1, precio=valor, valor=valor)]
    if tipo == "parqueadero":
        minutos = r.randint(25, 540)
        valor = redondear(minutos * r.uniform(0.02, 0.06) * p["fx"], mon)
        etiqueta = "Parking" if en else "Tiempo"
        return [dict(desc=f"{etiqueta} {minutos // 60}h {minutos % 60:02d}m", cant=1, precio=valor, valor=valor,
                     minutos=minutos)]
    pool = TIPOS[tipo]["items"]
    items = []
    minimo = 2 if tipo in ("restaurante", "representacion") else 1  # nadie legaliza un cafe suelto
    for es_, en_, lo, hi, qmax in r.sample(pool, r.randint(minimo, min(len(pool), 4))):
        cant = r.randint(1, qmax)
        precio = redondear(r.uniform(lo, hi) * p["fx"], mon)
        if mon == "USD":
            precio = round(int(precio) + r.choice([0.49, 0.99, 0.29, 0.79, 0.0]), 2)
        items.append(dict(desc=en_ if en else es_, cant=cant, precio=precio, valor=round(cant * precio, p["dec"])))
    return items


def liquidar(mon, items, imps, recs):
    p = PAISES[mon]
    dec = p["dec"]
    bruto = round(sum(i["valor"] for i in items), dec)
    tasa = sum(t for _, t in imps)
    if p["modo"] == "incluido":
        base = round(bruto / (1 + tasa), dec) if tasa else bruto
        restante = round(bruto - base, dec)
        lineas_imp = []
        for k, (et, t) in enumerate(imps):
            v = restante if k == len(imps) - 1 else round(base * t, dec)
            restante = round(restante - v, dec)
            lineas_imp.append(dict(etiqueta=et, tasa=t, valor=v))
    else:
        base = bruto
        lineas_imp = [dict(etiqueta=et, tasa=t, valor=round(base * t, dec)) for et, t in imps]
    lineas_rec = [dict(etiqueta=et, tasa=t, valor=round(base * t, dec)) for et, t in recs]
    total = bruto + sum(x["valor"] for x in lineas_rec)
    if p["modo"] == "agregado":
        total += sum(x["valor"] for x in lineas_imp)
    return dict(subtotal=bruto, base=base, impuestos=lineas_imp, recargos=lineas_rec, total=round(total, dec))


def ajustar_a_monto(mon, tipo, items, imps, recs, monto):
    """Escala los precios para que el total quede en `monto` exacto."""
    dec = PAISES[mon]["dec"]
    factor = monto / liquidar(mon, items, imps, recs)["total"]
    for i in items:
        if tipo == "combustible":
            i["valor"] = round(i["valor"] * factor, dec)
            i["cant"] = round(i["valor"] / i["precio"], 3)
        else:
            i["precio"] = round(i["precio"] * factor, dec)
            i["valor"] = round(i["cant"] * i["precio"], dec)
    # El redondeo deja centavos sueltos: el ultimo item pasa a cantidad 1 y
    # absorbe la diferencia.
    ultimo = items[-1]
    unidad = 10 ** -dec

    def fijar(valor):
        ultimo["valor"] = round(valor, dec)
        if tipo == "combustible":
            ultimo["cant"] = round(ultimo["valor"] / ultimo["precio"], 3)
        else:
            ultimo["cant"], ultimo["precio"] = 1, ultimo["valor"]

    for _ in range(20):  # acercamiento grueso
        dif = round(monto - liquidar(mon, items, imps, recs)["total"], dec)
        if abs(dif) <= unidad * 3:
            break
        fijar(ultimo["valor"] + dif / 1.3)
    # Con impuestos y recargos redondeados aparte, no todo total es alcanzable
    # moviendo un solo item: se prueban valores vecinos.
    centro = ultimo["valor"]
    for k in sorted(range(-300, 301), key=abs):
        fijar(centro + k * unidad)
        if round(liquidar(mon, items, imps, recs)["total"], dec) == monto:
            return liquidar(mon, items, imps, recs)
    fijar(centro)
    liq = liquidar(mon, items, imps, recs)
    # Ultimo recurso: la propina, el recargo o el impuesto agregado absorbe el
    # centavo que sobra (en facturas reales el redondeo por linea hace lo mismo).
    dif = round(monto - liq["total"], dec)
    absorbe = liq["recargos"] or (liq["impuestos"] if PAISES[mon]["modo"] == "agregado" else [])
    if absorbe:
        absorbe[0]["valor"] = round(absorbe[0]["valor"] + dif, dec)
        liq["total"] = round(liq["total"] + dif, dec)
    return liq


def armar_caso(args, r):
    mon = args.moneda or r.choice(list(PAISES))
    p = PAISES[mon]
    en = es_en(mon)
    tipo = args.tipo or r.choice(list(TIPOS))
    t = TIPOS[tipo]

    # Credito a proveedor solo existe con factura o con el recibo de un contratista.
    admite_credito = [d for d in t["docs"] if d in ("factura",) or (tipo == "reparacion" and d == "manuscrito")]
    medio = args.medio or r.choice(["tarjeta", "tarjeta", "efectivo"] + (["credito"] if admite_credito else []))

    doc = args.documento
    if not doc:
        doc = r.choice(admite_credito if medio == "credito" and admite_credito else t["docs"])
    elif doc not in t["docs"]:
        print(f"aviso: '{doc}' no es habitual para {tipo} (lo normal: {', '.join(t['docs'])})", file=sys.stderr)

    captura = args.captura or ("pantalla" if doc == "app" else r.choices(["plano", "foto", "borroso"], [3, 5, 2])[0])

    imps, recs = impuestos_de(mon, tipo, r)
    if args.sin_impuesto:
        imps = []
    items = armar_items(mon, tipo, r)
    liq = (ajustar_a_monto(mon, tipo, items, imps, recs, round(args.monto, p["dec"]))
           if args.monto is not None else liquidar(mon, items, imps, recs))

    fecha = dt.date.fromisoformat(args.fecha) if args.fecha else dt.date.today() - dt.timedelta(days=r.randint(0, 60))
    # A la hora de comer se paga en restaurantes; lo demas, en horario comercial.
    horas = [12, 13, 14, 19, 20, 21] if tipo in ("restaurante", "representacion") else list(range(7, 20))
    hora = dt.time(r.choice(horas), r.randint(0, 59))

    nombre = r.choice(NOMBRES_EN if en else NOMBRES)
    giro_es, giro_en = t["giro"]
    comercial = f"{nombre} {giro_en}" if en else f"{giro_es} {nombre}"
    if tipo == "aereo":
        comercial = f"Skyway {nombre} Airlines" if en else f"Aerolíneas Cóndor {nombre}"

    return dict(
        moneda=mon, pais=p["pais"], ciudad=r.choice(p["ciudades"]), tipo_key=tipo, tipo_gasto=t["nombre"],
        medio_key=medio, medio_pago=MEDIOS[medio], documento=doc, captura=captura,
        comercio=comercial, razon_social=f"{'' if en else 'Inversiones '}{nombre} {p['sociedad']}",
        id_fiscal=id_fiscal(mon, r), fecha=fecha.isoformat(), hora=hora.strftime("%H:%M"),
        items=items, **liq,
    )


# ---------------------------------------------------------------------------
# Texto del recibo
# ---------------------------------------------------------------------------
def bloque_pago(c, r):
    """Como se ve el pago en un documento real: nunca 'Forma de pago: TARJETA DE CREDITO'."""
    mon, total, medio, doc = c["moneda"], c["total"], c["medio_key"], c["documento"]
    en = es_en(mon)
    last4 = f"{r.randint(0, 9999):04d}"
    marca = r.choice(["VISA", "MASTERCARD", "VISA", "AMEX"] if en else ["VISA", "MASTERCARD", "VISA"])
    auth = f"{r.randint(0, 999999):06d}"

    if medio == "credito":
        vence = (dt.date.fromisoformat(c["fecha"]) + dt.timedelta(days=30)).strftime(PAISES[mon]["fecha"])
        if doc == "manuscrito":
            return [f"Queda debiendo — pagar antes del {vence}"]
        return {
            "COP": ["Forma de pago: Crédito", "Medio de pago: Transferencia débito bancario", f"Fecha de vencimiento: {vence}"],
            "MXN": ["Forma de pago: 99 - Por definir", "Método de pago: PPD - Pago en parcialidades o diferido",
                    "Condiciones de pago: Crédito 30 días"],
            "CRC": ["Condición de venta: Crédito", "Plazo de crédito: 30 días", "Medio de pago: Transferencia"],
            "DOP": ["Condiciones: Crédito a 30 días", f"Fecha de vencimiento: {vence}"],
            "HNL": ["Condición: CRÉDITO 30 DÍAS", f"Vence: {vence}"],
            "EUR": ["Forma de pago: Transferencia bancaria a 30 días",
                    f"IBAN: ES{r.randint(10, 99)} {r.randint(1000, 9999)} {r.randint(1000, 9999)} **** **** {r.randint(1000, 9999)}",
                    f"Vencimiento: {vence}"],
            "USD": ["Terms: Net 30", f"Due date: {vence}", "Please remit payment by ACH."],
        }[mon]

    tarjeta = medio == "tarjeta"
    if doc == "factura":
        # En la factura electronica el pago si va como campo, con los nombres
        # y codigos del esquema de cada pais.
        return {
            "COP": ["Forma de pago: Contado", f"Medio de pago: {'Tarjeta Crédito' if tarjeta else 'Efectivo'}"],
            "MXN": [f"Forma de pago: {'04 - Tarjeta de crédito' if tarjeta else '01 - Efectivo'}",
                    "Método de pago: PUE - Pago en una sola exhibición"],
            "CRC": ["Condición de venta: Contado", f"Medio de pago: {'Tarjeta' if tarjeta else 'Efectivo'}"],
            "DOP": ["Condiciones: Contado", f"Pagado con: {f'Tarjeta {marca} ****{last4}' if tarjeta else 'Efectivo'}"],
            "HNL": ["Condición: CONTADO", f"Pago: {f'{marca} ****{last4}' if tarjeta else 'EFECTIVO'}"],
            "EUR": [f"Pagado con {f'tarjeta {marca} ************{last4}' if tarjeta else 'efectivo'}"],
            "USD": [f"Paid: {f'{marca} ending in {last4}' if tarjeta else 'Cash'}"],
        }[mon]

    if doc == "app":
        return [f"{marca} •••• {last4}" if tarjeta else ("Paid in cash" if en else "Pagado en efectivo")]

    if doc == "manuscrito":
        return ["Pagó con tarjeta" if tarjeta else "Cancelado en efectivo"]

    if not tarjeta:
        billetes = {"COP": [20000, 50000, 100000], "USD": [20, 50, 100], "EUR": [10, 20, 50],
                    "MXN": [200, 500], "DOP": [500, 1000, 2000], "CRC": [5000, 10000, 20000], "HNL": [100, 500]}[mon]
        billete = next((b for b in billetes if b >= total), billetes[-1])
        recibido = billete * -(-total // billete)
        cambio = round(recibido - total, PAISES[mon]["dec"])
        et = ("CASH", "CHANGE") if en else ("ENTREGADO", "CAMBIO") if mon == "EUR" else ("EFECTIVO", "CAMBIO")
        return [fila(et[0], dinero(recibido, mon)), fila(et[1], dinero(cambio, mon))]

    # Tarjeta en tiquete: lo que imprime el datafono.
    if mon == "COP":
        return [fila("TARJETA CREDITO", dinero(total, mon)), "",
                "------- COMPROBANTE DATAFONO -------",
                f"{marca}  ************{last4}", fila("COMPRA", dinero(total, mon)),
                fila("APROBACION", auth), fila("RECIBO", f"{r.randint(1, 999999):06d}"),
                fila("RRN", str(r.randint(10**11, 10**12 - 1))), fila("CUOTAS", str(r.choice([1, 1, 1, 3, 6]))),
                f"TERMINAL {hexa(r, 8).upper()}", "*** ACEPTO PAGAR EL VALOR TOTAL ***"]
    if mon == "USD":
        return [fila(f"{marca} CREDIT", dinero(total, mon)), f"Card: XXXXXXXXXXXX{last4}", "Entry: CHIP",
                f"AID: {AIDS[marca]}", f"Auth Code: {auth}", "Response: APPROVED"]
    if mon == "MXN":
        return [fila("TARJETA", dinero(total, mon)), f"{marca} **** {last4}", f"AUT: {auth}", "PAGO CON CHIP"]
    if mon == "EUR":
        return [fila("TARJETA", dinero(total, mon)), f"{marca} ************{last4}", "CONTACTLESS",
                f"AUT: {auth}   OP: {r.randint(100000, 999999)}", "OPERACIÓN APROBADA"]
    return [fila("TARJETA", dinero(total, mon)), f"{marca} XXXX{last4}", f"AUTORIZACION: {auth}",
            f"REF: {r.randint(100000000, 999999999)}"]


def encabezado_fiscal(c, r):
    mon, doc = c["moneda"], c["documento"]
    f = dt.date.fromisoformat(c["fecha"])
    fecha = f.strftime(PAISES[mon]["fecha"])
    n = r.randint(1200, 98000)
    if mon == "COP":
        resol = f"1876{r.randint(10**9, 10**10 - 1)}"
        if doc == "factura":
            return [f"FACTURA ELECTRÓNICA DE VENTA No. FEV{n}",
                    f"Resolución DIAN No. {resol} del {(f - dt.timedelta(days=200)):%d/%m/%Y}",
                    "Prefijo FEV del 1 al 100000 - Vigencia 24 meses", "Responsable de IVA",
                    f"Fecha de emisión: {fecha} {c['hora']}"]
        return ["DOCUMENTO EQUIVALENTE ELECTRÓNICO", f"TIQUETE POS No. POS{n}",
                f"Resol. DIAN {resol} Rango POS1 - POS200000", f"Fecha: {fecha}  Hora: {c['hora']}"]
    if mon == "MXN":
        if doc == "factura":
            return ["FACTURA  (CFDI 4.0)", f"Serie A  Folio {n}", "Régimen fiscal: 601 General de Ley Personas Morales",
                    f"Lugar de expedición: {r.randint(10000, 99999)}",
                    f"Fecha: {f.isoformat()}T{c['hora']}:{r.randint(10, 59)}",
                    "Uso CFDI: G03 - Gastos en general", "Tipo de comprobante: I - Ingreso"]
        return [f"TICKET: {n}   CAJA: {r.randint(1, 6)}", f"FECHA: {fecha}  {c['hora']}"]
    if mon == "DOP":
        credito = c["medio_key"] == "credito"
        titulo = "FACTURA DE CRÉDITO FISCAL ELECTRÓNICA" if credito else "FACTURA DE CONSUMO ELECTRÓNICA"
        return [titulo, f"e-NCF: E{'31' if credito else '32'}{r.randint(10**9, 10**10 - 1)}",
                f"Válida hasta: 31-12-{f.year + 1}", f"Fecha: {fecha}  Hora: {c['hora']}"]
    if mon == "CRC":
        factura = doc == "factura"
        cons = f"001{r.randint(1, 20):05d}{'01' if factura else '04'}{r.randint(1, 99999):010d}"
        cedula = "".join(ch for ch in c["id_fiscal"] if ch.isdigit()).rjust(12, "0")
        clave = f"506{f:%d%m%y}{cedula}{cons}1{r.randint(10**7, 10**8 - 1)}"
        return ["FACTURA ELECTRÓNICA" if factura else "TIQUETE ELECTRÓNICO",
                f"Consecutivo: {cons}", f"Clave: {clave[:25]}", f"       {clave[25:]}", f"Fecha: {fecha} {c['hora']}"]
    if mon == "HNL":
        pto = f"000-{r.randint(1, 3):03d}-01"
        cai = "-".join(hexa(r, 6).upper() for _ in range(5)) + "-" + hexa(r, 2).upper()
        return [f"CAI: {cai}", f"FACTURA No. {pto}-{n:08d}",
                f"Rango autorizado: {pto}-00000001 al {pto}-00050000",
                f"Fecha límite de emisión: {(f + dt.timedelta(days=r.randint(60, 300))):%d/%m/%Y}",
                f"Fecha: {fecha}  {c['hora']}"]
    if mon == "EUR":
        if doc == "factura":
            return [f"FACTURA Nº {f.year}/{n:05d}", f"Fecha de expedición: {fecha}"]
        L = [f"FACTURA SIMPLIFICADA Nº T{r.randint(1, 4):03d}-{n:06d}", f"{fecha}  {c['hora']}"]
        if c["tipo_key"] in ("restaurante", "representacion"):
            L.append(f"Mesa {r.randint(1, 30)}   Atendido por: {r.choice(CAJEROS)}")
        return L
    # USD
    if doc == "factura":
        return [f"INVOICE #{n}", f"Invoice date: {fecha}"]
    hora12 = dt.datetime.combine(f, dt.time.fromisoformat(c["hora"])).strftime("%I:%M %p")
    L = [f"{fecha}  {hora12}", f"Order #{n}   Reg {r.randint(1, 6)}"]
    if c["tipo_key"] in ("restaurante", "representacion"):
        L.append(f"Server: {r.choice(CAJEROS_EN)}   Table {r.randint(1, 40)}   Guests {r.randint(1, 5)}")
    return L


def pie_fiscal(c, r):
    mon, doc = c["moneda"], c["documento"]
    if mon == "COP":
        return [f"{'CUFE' if doc == 'factura' else 'CUDE'}: {hexa(r, 32)}", hexa(r, 32), hexa(r, 32), "[código QR]",
                f"Proveedor tecnológico: Soluciones {r.choice(NOMBRES)} S.A.S.", "GRACIAS POR SU COMPRA"]
    if mon == "MXN":
        if doc == "factura":
            uuid = f"{hexa(r, 8)}-{hexa(r, 4)}-{hexa(r, 4)}-{hexa(r, 4)}-{hexa(r, 12)}".upper()
            return [f"Folio fiscal (UUID): {uuid}",
                    f"No. de serie del certificado del SAT: 00001000000{r.randint(500000000, 509999999)}",
                    f"Sello digital del CFDI: {hexa(r, 44)}...", "[código QR]",
                    "Este documento es una representación impresa de un CFDI"]
        pie = []
        if c["tipo_key"] == "combustible":
            pie = [f"Estación: E{r.randint(1000, 15000):05d}",
                   f"Permiso CRE: PL/{r.randint(1000, 23000)}/EXP/ES/{r.randint(2015, 2019)}",
                   f"Bomba: {r.randint(1, 12)}   Folio: {r.randint(100000, 999999)}", f"Web ID: {hexa(r, 5).upper()}"]
        return pie + ["Para facturar ingrese a nuestro portal", "con su folio dentro del mes de consumo", "¡GRACIAS POR SU VISITA!"]
    if mon == "DOP":
        return [f"Código de seguridad: {hexa(r, 6).upper()}", f"Fecha de firma: {c['fecha'].replace('-', '/')} {c['hora']}",
                "[código QR]", "GRACIAS POR PREFERIRNOS"]
    if mon == "CRC":
        return ["Emitida conforme a la normativa de", "comprobantes electrónicos del Ministerio de Hacienda", "¡Gracias por su compra!"]
    if mon == "HNL":
        return ["ORIGINAL: CLIENTE", 'LA FACTURA ES BENEFICIO DE TODOS "EXÍJALA"']
    if mon == "EUR":
        return ["IVA INCLUIDO", "[código QR]  VERI*FACTU", "Gracias por su visita"]
    return ["Thank you for your business!"] if doc == "factura" else ["CUSTOMER COPY", "THANK YOU - PLEASE COME AGAIN"]


def lineas_impuestos(c):
    mon = c["moneda"]
    if mon == "EUR" and c["impuestos"]:
        L = [fila("TIPO     BASE IMP.", "CUOTA")]
        return L + [fila(f"{x['etiqueta'][4:]:<8} {fmt(c['base'], mon)}", fmt(x["valor"], mon)) for x in c["impuestos"]]
    return [fila(x["etiqueta"], dinero(x["valor"], mon)) for x in c["impuestos"]]


def totales_ticket(c):
    """Bloque de totales con el orden de cada pais."""
    mon = c["moneda"]
    recargos = [fila(x["etiqueta"].upper(), dinero(x["valor"], mon)) for x in c["recargos"]]
    total = fila("TOTAL" if mon in ("USD", "EUR", "COP") else f"TOTAL {mon}", dinero(c["total"], mon))
    if PAISES[mon]["modo"] == "agregado":
        return [fila("SUBTOTAL", dinero(c["subtotal"], mon))] + lineas_impuestos(c) + recargos + [total]
    if mon == "MXN":
        return ([fila("SUBTOTAL", dinero(c["base"], mon))] if c["impuestos"] else []) + lineas_impuestos(c) + [total]
    if mon == "COP" and c["impuestos"]:
        return ([fila("SUBTOTAL", dinero(c["subtotal"], mon))] + recargos + [total, "",
                "DISCRIMINACIÓN DE IMPUESTOS", fila("BASE", dinero(c["base"], mon))] + lineas_impuestos(c))
    # EUR, CRC y los tiquetes sin impuesto: total primero, desglose despues
    L = ([fila("SUBTOTAL", dinero(c["subtotal"], mon))] if recargos else []) + recargos + [total]
    if c["impuestos"]:
        L += ["", *lineas_impuestos(c)]
        if mon == "CRC":
            L.insert(-len(c["impuestos"]), fila("Monto gravado", dinero(c["base"], mon)))
    return L


def texto_ticket(c, r):
    mon = c["moneda"]
    p = PAISES[mon]
    en = es_en(mon)
    tipo = c["tipo_key"]
    it = c["items"][0]
    tel = f"Tel: {r.randint(200, 999)} {r.randint(100, 999)} {r.randint(1000, 9999)}"
    if en:
        direccion = f"{r.randint(100, 9999)} {r.choice(['Main St', 'Coral Way', 'Westheimer Rd', 'Peachtree St'])}"
    elif mon == "COP":
        direccion = f"{r.choice(['Calle', 'Carrera', 'Av.'])} {r.randint(1, 120)} # {r.randint(1, 99)}-{r.randint(1, 99)}"
    else:
        direccion = f"{r.choice(['Av.', 'Calle', 'Blvd.'])} {r.choice(NOMBRES)} {r.randint(1, 900)}"

    if tipo == "peaje":
        L = [f"CONCESIÓN VIAL {r.choice(NOMBRES).upper()} {p['sociedad']}", c["id_fiscal"],
             f"ESTACIÓN DE PEAJE {c['comercio'].split(' ', 1)[1].upper()}", ""]
    else:
        L = [c["comercio"].upper()] + ([] if en else [c["razon_social"]]) + [c["id_fiscal"], direccion,
                                                                              c["ciudad"], tel, ""]
    L += encabezado_fiscal(c, r)
    if tipo == "peaje":
        L += [f"Carril: {r.randint(1, 6)}   Sentido: {r.choice(['Norte-Sur', 'Sur-Norte'])}", f"Operador: {r.choice(CAJEROS)}"]
    elif not en and mon != "EUR":
        L.append(f"Cajero: {r.choice(CAJEROS)}")
    if mon == "HNL":
        L += ["Cliente: CONSUMIDOR FINAL", "RTN: -"]
    L.append("-" * 40)

    if tipo == "combustible":
        u = it["unidad"]
        L += [f"{'PUMP' if en else 'SURTIDOR'} {r.randint(1, 8)}",
              f"{'PRODUCT' if en else 'PRODUCTO'}: {it['desc']}",
              f"{'QTY' if en else 'CANTIDAD'}: {fmt(it['cant'], mon, 3)} {u}",
              fila(f"{'PRICE' if en else 'PRECIO'}/{u}:", dinero(it["precio"], mon))]
        if mon == "COP":
            L += [f"PLACA: {r.choice(PLACAS)}{r.randint(100, 999)}", f"KILOMETRAJE: {r.randint(12000, 180000)}"]
    elif tipo == "peaje":
        L += [fila("Categoría:", it["desc"].split()[-1]), fila("Vehículo:", "Automóvil / Campero")]
    elif tipo == "parqueadero":
        salida = dt.datetime.combine(dt.date.fromisoformat(c["fecha"]), dt.time.fromisoformat(c["hora"]))
        entrada = salida - dt.timedelta(minutes=it["minutos"])
        L += [f"{'Plate' if en else 'Placa'}: {r.choice(PLACAS)}{r.randint(100, 999)}",
              f"{'In ' if en else 'Entrada'}: {entrada:%d/%m/%Y %H:%M}",
              f"{'Out' if en else 'Salida'}:  {salida:%d/%m/%Y %H:%M}", it["desc"]]
    else:
        L.append(fila("QTY ITEM" if en else "CANT DESCRIPCIÓN", "VALOR" if not en else "AMOUNT"))
        for i in c["items"]:
            L.append(fila(f"{i['cant']:>3} {i['desc'][:25]}", fmt(i["valor"], mon)))
            if i["cant"] > 1:
                L.append(f"      {i['cant']} x {fmt(i['precio'], mon)}")
    L.append("-" * 40)
    L += totales_ticket(c)
    L.append("")
    L += bloque_pago(c, r)
    if mon == "USD" and tipo in ("restaurante", "representacion"):
        L += ["", "TIP:      ____________", "TOTAL:    ____________", "", "X________________________"]
    L.append("")
    L += pie_fiscal(c, r)
    return L


def texto_factura(c, r):
    mon = c["moneda"]
    p = PAISES[mon]
    en = es_en(mon)
    L = [c["comercio"]] + ([] if en else [c["razon_social"]]) + [c["id_fiscal"], f"{c['ciudad']}, {p['pais']}", ""]
    L += encabezado_fiscal(c, r)
    cliente_id = {"COP": "NIT 901.456.782-3", "MXN": "RFC ICA1504219K7", "DOP": "RNC 1-31-45872-9",
                  "CRC": "Céd. Jurídica 3-101-712334", "HNL": "RTN 08019015678123", "EUR": "NIF B87654321",
                  "USD": "Houston, TX 77002"}[mon]
    cliente = ("Bill to: Andean Industrial Controls Inc." if en
               else f"{'Receptor' if mon == 'MXN' else 'Cliente'}: Ingeniería y Control Andino {p['sociedad']}")
    L += ["", cliente, cliente_id, ""]
    L.append(" | ".join(["Qty", "Description", "Unit price", "Amount"] if en
                        else ["Cant.", "Descripción", "Vr. unitario", "Vr. total"]))
    for i in c["items"]:
        cant = f"{fmt(i['cant'], mon, 3)} {i['unidad']}" if "unidad" in i else str(i["cant"])
        L.append(" | ".join([cant, i["desc"], dinero(i["precio"], mon), dinero(i["valor"], mon)]))
    L.append("")
    if p["modo"] == "incluido" and c["impuestos"]:
        L.append(fila("Subtotal" if en else "Subtotal (base gravable)", dinero(c["base"], mon)))
    else:
        L.append(fila("Subtotal", dinero(c["subtotal"], mon)))
    L += [fila(x["etiqueta"], dinero(x["valor"], mon)) for x in c["impuestos"]]
    L += [fila(x["etiqueta"], dinero(x["valor"], mon)) for x in c["recargos"]]
    etiqueta_total = ("TOTAL DUE" if c["medio_key"] == "credito" else "TOTAL") if en else f"TOTAL {mon}"
    L += [fila(etiqueta_total, dinero(c["total"], mon)), ""]
    L += bloque_pago(c, r)
    L.append("")
    L += pie_fiscal(c, r)
    return L


def texto_app(c, r):
    mon = c["moneda"]
    p = PAISES[mon]
    en = es_en(mon)
    tipo = c["tipo_key"]
    f = dt.date.fromisoformat(c["fecha"]).strftime(p["fecha"])
    pie = ["", f"{c['razon_social']} · {c['id_fiscal']}"]
    if tipo == "taxi":
        dist = round(r.uniform(2, 25), 1)
        base = redondear(c["total"] * 0.35, mon)
        return [r.choice(["Rodar", "Voy", "Zipa", "Llega"]),
                "Thanks for riding" if en else "Gracias por viajar con nosotros", "",
                f"{f} · {c['hora']}", fila("Total", dinero(c["total"], mon)), "",
                f"● {r.choice(['Cl. 93 #11-27', 'Av. Reforma 222', 'Av. Winston Churchill 95', 'Paseo Colón 400'])}",
                f"● {r.choice(['Aeropuerto Internacional', 'Centro Empresarial', 'Zona Industrial', 'Hotel Centro'])}",
                f"{fmt(dist, mon, 1)} km · {int(dist * r.uniform(2.5, 4))} min", "",
                fila("Base fare" if en else "Tarifa base", dinero(base, mon)),
                fila("Distance & time" if en else "Distancia y tiempo", dinero(round(c["total"] - base, p["dec"]), mon)),
                fila("Total", dinero(c["total"], mon)), "", *bloque_pago(c, r),
                f"{'Driver' if en else 'Conductor'}: {r.choice(['Wilson', 'Fredy', 'Ramón', 'Esteban'])} · "
                f"{r.choice(PLACAS)}{r.randint(100, 999)}"] + pie
    if tipo == "aereo":
        ruta = r.choice(["BOG → MDE", "BOG → MIA", "MEX → MTY", "SDQ → PTY", "SJO → BOG", "SAP → SAL", "MAD → BCN"])
        L = [c["comercio"], "Purchase confirmation" if en else "Confirmación de compra", "",
             f"{'Confirmation code' if en else 'Código de reserva'}: {hexa(r, 6).upper()}",
             f"{ruta}   {f}   {c['hora']}",
             "Passenger: RAMIREZ/JOSE" if en else "Pasajero: VELASQUEZ/JUAN CAMILO", ""]
        L += [fila(i["desc"], dinero(i["valor"], mon)) for i in c["items"]]
        sufijo = "" if p["modo"] == "agregado" or en else " (incluido)"
        L += [fila(x["etiqueta"] + sufijo, dinero(x["valor"], mon)) for x in c["impuestos"]]
        return L + [fila("Total paid" if en else "Total pagado", f"{dinero(c['total'], mon)} {mon}"), "",
                    *bloque_pago(c, r)] + pie
    linea = (f"Line: (305) {r.randint(100, 999)}-{r.randint(1000, 9999)}" if en
             else f"Línea: 3{r.randint(0, 2)}{r.randint(0, 9)} {r.randint(100, 999)} {r.randint(1000, 9999)}")
    L = [c["comercio"], "Payment receipt" if en else "Comprobante de recarga", "", f"{f} {c['hora']}", linea,
         f"{'Transaction' if en else 'Transacción'}: {r.randint(10**9, 10**10 - 1)}", ""]
    L += [fila(i["desc"], dinero(i["valor"], mon)) for i in c["items"]]
    if p["modo"] == "agregado":
        L += [fila(x["etiqueta"], dinero(x["valor"], mon)) for x in c["impuestos"]]
    return L + [fila("Total", dinero(c["total"], mon)), "", *bloque_pago(c, r)] + pie


def texto_manuscrito(c, r):
    mon = c["moneda"]
    p = PAISES[mon]
    f = dt.date.fromisoformat(c["fecha"]).strftime("%d / %m / %Y")
    if c["tipo_key"] == "taxi":
        impreso = [f"TAXI {r.choice(PLACAS)}{r.randint(100, 999)}", f"Radio Taxi {r.choice(NOMBRES)}",
                   c["id_fiscal"], f"Tel. {r.randint(3000000, 3999999)}", "RECIBO DE PAGO"]
        mano = [f"Fecha: {f}", f"Origen: {r.choice(['Aeropuerto', 'Hotel', 'Centro'])}",
                f"Destino: {r.choice(['Planta', 'Oficina', 'Terminal'])}", f"Valor: {dinero(c['total'], mon)}",
                f"Conductor: {r.choice(['Wilson R.', 'Fredy M.', 'Jairo P.'])}", "Firma: (garabato)"]
        return impreso, mano
    impreso = [c["comercio"].upper(), c["razon_social"], c["id_fiscal"],
               f"{c['ciudad']} - Tel. {r.randint(3000000, 3999999)}"]
    if mon == "HNL":
        impreso += encabezado_fiscal(c, r)[:4]
    else:
        if mon == "DOP":
            impreso.append(f"NCF: B01{r.randint(10**7, 10**8 - 1)}")
        impreso.append(f"RECIBO No. {r.randint(100, 9999):04d}")
    mano = [f"Fecha: {f}", "Señores: Ingeniería y Control Andino"]
    mano += [f"{i['cant']}  {i['desc']}  ....  {dinero(i['valor'], mon)}" for i in c["items"]]
    if c["impuestos"] or c["recargos"]:
        base = c["base"] if p["modo"] == "incluido" else c["subtotal"]
        mano.append(f"Subtotal  {dinero(base, mon)}")
        mano += [f"{x['etiqueta']}  {dinero(x['valor'], mon)}" for x in c["impuestos"] + c["recargos"]]
    mano += [f"TOTAL  {dinero(c['total'], mon)}", *bloque_pago(c, r), "Recibí: (firma y sello)"]
    return impreso, mano


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
def armar_prompt(c, r, extra):
    doc = c["documento"]
    if doc == "manuscrito":
        impreso, mano = texto_manuscrito(c, r)
        c["texto"] = impreso + ["--- a mano ---"] + mano
        cuerpo = ("PARTE PREIMPRESA (tipografía de imprenta):\n" + "\n".join(impreso) +
                  "\n\nPARTE ESCRITA A MANO (bolígrafo azul, letra cursiva legible):\n" + "\n".join(mano))
    else:
        c["texto"] = {"ticket": texto_ticket, "factura": texto_factura, "app": texto_app}[doc](c, r)
        cuerpo = "TEXTO EXACTO (respeta el orden, los saltos de línea, los números y la ortografía):\n" + "\n".join(c["texto"])
    idioma = "inglés" if es_en(c["moneda"]) else "español"
    return (f"Genera una imagen fotorrealista de un documento de compra, en {idioma}.\n"
            f"Tipo de documento: {DOCUMENTOS[doc]}.\n"
            f"Cómo se ve la imagen: {CAPTURAS[c['captura']]}.\n"
            f"El comercio es ficticio y queda en {c['ciudad']}, {c['pais']}. No uses logos ni marcas reales.\n"
            "Escribe solo el texto de abajo: no agregues títulos, etiquetas ni montos que no estén ahí. "
            "Donde diga [código QR], dibuja un código QR.\n\n"
            f"{cuerpo}\n\n{extra or ''}").strip()


# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------
def cliente():
    from google import genai
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key:
        # Con API key no hace falta ADC, y la libreria igual intenta cargar
        # GOOGLE_APPLICATION_CREDENTIALS: si ese archivo esta roto, revienta.
        os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)
        return genai.Client(api_key=key, vertexai=False)
    cred = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred:
        # google-auth no expande "~", y una ruta rota tumba ADC entero.
        ruta = Path(os.path.expanduser(cred))
        if ruta.is_file():
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(ruta)
        else:
            os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS")
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project:
        project = subprocess.run(["gcloud", "config", "get-value", "project"],
                                 capture_output=True, text=True).stdout.strip()
    if not project:
        sys.exit("Sin credenciales: exporta GEMINI_API_KEY o configura un proyecto de gcloud.")
    return genai.Client(vertexai=True, project=project,
                        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("-n", type=int, default=1, help="cuántas imágenes")
    p.add_argument("--moneda", choices=PAISES, help="aleatoria si se omite")
    p.add_argument("--monto", type=float, help="total exacto; si se omite sale de los precios de los ítems")
    p.add_argument("--tipo", choices=TIPOS)
    p.add_argument("--medio", choices=MEDIOS)
    p.add_argument("--documento", choices=DOCUMENTOS, help="por defecto, uno que ese comercio emita de verdad")
    p.add_argument("--captura", choices=CAPTURAS)
    p.add_argument("--fecha", help="YYYY-MM-DD")
    p.add_argument("--sin-impuesto", action="store_true")
    p.add_argument("--extra", help="instrucción adicional para el prompt")
    p.add_argument("--seed", type=int)
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--out", default=os.path.expanduser("~/Desktop/comprobantes-gastos"))
    p.add_argument("--dry-run", action="store_true", help="solo imprime los prompts")
    args = p.parse_args()

    r = random.Random(args.seed)
    out = Path(args.out)
    client = None
    if not args.dry_run:
        from google.genai import types
        client = cliente()
        out.mkdir(parents=True, exist_ok=True)

    fallos = 0
    for _ in range(args.n):
        caso = armar_caso(args, r)
        prompt = armar_prompt(caso, r, args.extra)
        if args.dry_run:
            print(prompt, "\n" + "=" * 60)
            continue
        base = out / f"{caso['moneda']}_{caso['tipo_key']}_{caso['documento']}_{dt.datetime.now():%Y%m%d-%H%M%S-%f}"
        try:
            resp = client.models.generate_content(
                model=args.model, contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio=PROPORCION[caso["documento"]]),
                ),
            )
            parte = next((pt for cand in (resp.candidates or []) for pt in (cand.content.parts or [])
                          if pt.inline_data and pt.inline_data.data), None)
            if not parte:
                raise RuntimeError(f"la respuesta no trae imagen: {resp.text!r}")
            ext = ".jpg" if "jpeg" in (parte.inline_data.mime_type or "") else ".png"
            Path(f"{base}{ext}").write_bytes(parte.inline_data.data)
            esperado = {k: v for k, v in caso.items() if k not in ("tipo_key", "medio_key")}
            esperado.update(modelo=args.model, prompt=prompt)
            Path(f"{base}.json").write_text(json.dumps(esperado, ensure_ascii=False, indent=2))
            print(f"OK  {base}{ext}  {caso['moneda']} {fmt(caso['total'], caso['moneda'])}  "
                  f"{caso['tipo_gasto']} · {caso['medio_pago']}")
        except Exception as e:  # sigue con las demas; un fallo no debe tumbar el lote
            fallos += 1
            print(f"ERR {caso['moneda']} {caso['tipo_gasto']}: {e}", file=sys.stderr)
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
