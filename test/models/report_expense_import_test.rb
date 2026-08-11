require "test_helper"

# `ReportExpense.import` — deteccion de layout y mapeo de 18 posiciones
# (paquete 06, tarea C2; dueño unico de este metodo segun §7.2).
#
# ⚠️ SOBRE LAS FIXTURES .xlsx. `gastos_legacy_11col.xlsx` y `gastos_v2_18col.xlsx`
# se REGENERARON en este paquete. Los que traia el paquete 01 declaraban en
# §7.12 ser "el layout viejo de 11 columnas" y "el layout nuevo de 18", pero su
# encabezado real era otro (`FECHA` primero, `BENEFICIARIO` con el email en vez
# del nombre), incompatible tanto con el mapeo que `import` lee HOY como con el
# de las dos plantillas .axlsx. Con ese contenido, el test de no-regresion mas
# importante del paquete era imposible de escribir en verde. Los dos archivos
# los consume UNICAMENTE este paquete (§7.12), y `gastos_multimoneda.xlsx` —que
# si consume el paquete 05— se dejo intacto.
class ReportExpenseImportTest < ActiveSupport::TestCase
  LEGACY = Rails.root.join("test/fixtures/files/gastos_legacy_11col.xlsx").freeze
  V2 = Rails.root.join("test/fixtures/files/gastos_v2_18col.xlsx").freeze

  ENCABEZADO_V2 = ["ID", "Centro de costo", "Responsable", "Fecha de factura", "Nombre",
                   "NIT / CEDULA", "Descripcion", "Numero de factura", "Tipo", "Medio de pago",
                   "Estado operativo", "Estado presupuestal", "Motivo presupuestal", "Moneda",
                   "Valor extranjero", "TRM", "Valor del pago (COP)", "IVA (COP)"].freeze

  setup do
    @admin = users(:admin)
  end

  # `import` recibe un objeto que responde a `path` (en produccion el uploaded
  # file de Rails). Aqui basta con el archivo real.
  def importar(ruta)
    as_user(@admin) { ReportExpense.import(Struct.new(:path).new(ruta.to_s), @admin.id) }
  end

  # Construye un .xlsx temporal con el encabezado v2 y las filas dadas. Los casos
  # que dependen de un id concreto o de una moneda inventada no se pueden
  # commitear como fixture: el id lo asigna la base en cada corrida.
  def con_excel_v2(filas, encabezado: ENCABEZADO_V2)
    paquete = Axlsx::Package.new
    paquete.workbook.add_worksheet(name: "Items") do |hoja|
      hoja.add_row encabezado
      filas.each { |f| hoja.add_row f }
    end
    tmp = Tempfile.new(["gastos_v2", ".xlsx"])
    tmp.close
    paquete.serialize(tmp.path)
    yield tmp.path
  ensure
    tmp.unlink
  end

  def fila_v2(**overrides)
    valores = {
      id: nil, centro: "CM-ACME-01-2026", responsable: "Juan",
      fecha: Date.new(2026, 6, 10), nombre: "Gasto temporal", nit: "900111222",
      descripcion: "Alojamiento", numero: "FE-T#{SecureRandom.hex(3)}",
      tipo: "Alimentacion", medio: "Efectivo", estado_operativo: nil,
      estado_presupuestal: nil, motivo: nil, moneda: "COP",
      valor_extranjero: nil, trm: nil, valor: 100_000, iva: 19_000
    }.merge(overrides)

    valores.values_at(:id, :centro, :responsable, :fecha, :nombre, :nit, :descripcion,
                      :numero, :tipo, :medio, :estado_operativo, :estado_presupuestal,
                      :motivo, :moneda, :valor_extranjero, :trm, :valor, :iva)
  end

  # --- deteccion de layout --------------------------------------------------

  test "detect_layout distingue v1 de v2" do
    assert_equal :v1, ReportExpense.detect_layout(
      ["Centro de costo", "Responsable", "Fecha de factura", "Nombre", "NIT / CEDULA",
       "Descripcion", "Numero de factura", "Tipo", "Medio de pago", "Valor del pago", "IVA"]
    )
    assert_equal :v2, ReportExpense.detect_layout(ENCABEZADO_V2)
  end

  test "detect_layout trata como v1 un archivo de 18 columnas al que le borraron el ID" do
    # Es lo que documenta el manual: si borra la columna ID el archivo CREA
    # gastos nuevos; si la conserva, los actualiza.
    assert_equal :v1, ReportExpense.detect_layout(ENCABEZADO_V2.drop(1))
  end

  # --- layout legacy (no-regresion) ----------------------------------------

  test "archivo legacy de 11 columnas sigue importando" do
    # EL test de no-regresion mas importante del paquete: es el archivo que los
    # usuarios ya tienen guardado en el disco.
    exito = nil
    assert_difference "ReportExpense.count", 2 do
      exito, = importar(LEGACY)
    end

    assert_equal 2, exito.length
    gasto = ReportExpense.find_by(invoice_number: "FE-L001")
    assert_equal 100_000.0, gasto.invoice_value
    assert_equal 19_000.0, gasto.invoice_tax
    assert_equal 119_000.0, gasto.invoice_total
    assert_equal cost_centers(:centro_con_viaticos).id, gasto.cost_center_id
    assert_equal users(:ingeniero).id, gasto.user_invoice_id
    assert_equal Date.new(2026, 6, 1), gasto.invoice_date
  end

  test "archivo legacy no escribe currency distinto de COP" do
    importar(LEGACY)

    assert_equal "COP", ReportExpense.find_by(invoice_number: "FE-L001").currency
    assert_nil ReportExpense.find_by(invoice_number: "FE-L001").exchange_rate
  end

  # --- layout v2 ------------------------------------------------------------

  test "archivo v2 crea gastos con moneda y trm" do
    assert_difference "ReportExpense.count", 3 do
      importar(V2)
    end

    gasto = ReportExpense.find_by(invoice_number: "FE-V002")
    assert_equal "USD", gasto.currency
    assert_equal BigDecimal("120"), gasto.foreign_value
    assert_equal BigDecimal("4120.5"), gasto.exchange_rate
    assert_equal "manual", gasto.exchange_rate_source
    assert_equal gasto.invoice_date, gasto.exchange_rate_date
  end

  test "archivo v2 respeta el invoice_value del archivo y no lo recalcula" do
    importar(V2)

    # "Cena NY V2": 100 USD x 4.000 = 400.000, pero el Excel trae 401.000. Los
    # 1.000 de diferencia son el cuadre de contabilidad y son exactamente lo que
    # se pierde si el servidor recalcula. Invariante #3.
    gasto = ReportExpense.find_by(invoice_number: "FE-V003")
    assert_equal 401_000.0, gasto.invoice_value
    refute_equal 400_000.0, gasto.invoice_value
  end

  test "archivo v2 calcula los pesos cuando la columna viene vacia" do
    con_excel_v2([fila_v2(numero: "FE-CALC-1", moneda: "USD", valor_extranjero: 200,
                          trm: 4000, valor: nil, iva: nil)]) do |ruta|
      importar(ruta)
    end

    gasto = ReportExpense.find_by(invoice_number: "FE-CALC-1")
    assert_equal 800_000.0, gasto.invoice_value
  end

  test "archivo v2 con id existente actualiza y no duplica" do
    importar(V2)
    gasto = ReportExpense.find_by(invoice_number: "FE-V001")

    assert_no_difference "ReportExpense.count" do
      con_excel_v2([fila_v2(id: gasto.id, numero: "FE-V001", nombre: "Hotel Uno CORREGIDO")]) do |ruta|
        importar(ruta)
      end
    end

    assert_equal "Hotel Uno CORREGIDO", gasto.reload.invoice_name
  end

  test "archivo v2 ignora estado presupuestal" do
    # La prueba de que el import NO puede fabricar aprobaciones presupuestales.
    importar(V2)
    gasto = ReportExpense.find_by(invoice_number: "FE-V001")

    # La fixture trae "Aprobado" en la columna 11 y "Motivo escrito a mano..."
    # en la 12.
    assert_equal "sin_presupuesto", gasto.budget_status
    assert_nil gasto.budget_reason
  end

  test "archivo v2 ignora estado operativo" do
    importar(V2)

    # La fixture trae "Aceptado" en la columna 10.
    refute ReportExpense.find_by(invoice_number: "FE-V001").is_acepted
  end

  test "archivo v2 no escribe accounting_approved" do
    con_excel_v2([fila_v2(numero: "FE-ACC-1") + ["true", Time.now]],
                 encabezado: ENCABEZADO_V2 + ["accounting_approved", "accounting_approved_at"]) do |ruta|
      importar(ruta)
    end

    gasto = ReportExpense.find_by(invoice_number: "FE-ACC-1")
    refute gasto.accounting_approved
    assert_nil gasto.accounting_approved_at
  end

  test "moneda invalida cae a COP" do
    con_excel_v2([fila_v2(numero: "FE-XYZ-1", moneda: "XYZ", valor_extranjero: 50, trm: 4000)]) do |ruta|
      importar(ruta)
    end

    gasto = ReportExpense.find_by(invoice_number: "FE-XYZ-1")
    assert_equal "COP", gasto.currency
    assert_nil gasto.foreign_value
    assert_nil gasto.exchange_rate
  end

  test "moneda vacia cae a COP" do
    con_excel_v2([fila_v2(numero: "FE-VAC-1", moneda: nil)]) do |ruta|
      importar(ruta)
    end

    assert_equal "COP", ReportExpense.find_by(invoice_number: "FE-VAC-1").currency
  end

  # --- filas malas ----------------------------------------------------------

  test "fila con centro inexistente va a fail_records" do
    fallos = nil
    con_excel_v2([fila_v2(numero: "FE-OK-1"),
                  fila_v2(numero: "FE-MALA-1", centro: "CM-NO-EXISTE")]) do |ruta|
      _, fallos = importar(ruta)
    end

    # La fila 3 del ARCHIVO (la 1 es el encabezado), que es lo que el usuario ve
    # en Excel.
    assert_equal [3], fallos
  end

  test "una fila mala no aborta las demas" do
    exito = nil
    con_excel_v2([fila_v2(numero: "FE-B1"),
                  fila_v2(numero: "FE-B2", centro: "CM-NO-EXISTE"),
                  fila_v2(numero: "FE-B3")]) do |ruta|
      exito, = importar(ruta)
    end

    assert_equal 2, exito.length
    assert ReportExpense.exists?(invoice_number: "FE-B1")
    assert ReportExpense.exists?(invoice_number: "FE-B3")
    refute ReportExpense.exists?(invoice_number: "FE-B2")
  end

  # --- entorno sin request --------------------------------------------------

  test "import corre sin User.current en consola" do
    # Capa 1 del paquete 01: `audit_actor_id` cae a user_id / user_invoice_id.
    # Sin ella, importar desde una rake task o desde la consola revienta con
    # NoMethodError dentro del callback de auditoria.
    assert_nil User.current

    assert_nothing_raised do
      ReportExpense.import(Struct.new(:path).new(LEGACY.to_s), users(:admin).id)
    end
    assert_equal 2, ReportExpense.where(invoice_number: %w[FE-L001 FE-L002]).count
  end

  test "import no deja ningun puts en el codigo" do
    # Criterio 28. Los ocho puts anteriores volcaban los datos de cada factura
    # al log de produccion.
    fuente = File.read(Rails.root.join("app/models/report_expense.rb"))
    cuerpo = fuente[/def self\.import.*?\n  end\n/m]

    refute_nil cuerpo, "no se encontro el cuerpo de ReportExpense.import"
    refute_match(/^\s*puts\b/, cuerpo)
  end
end
