require "test_helper"

# Estado operativo del gasto: creado / aceptado / rechazado (2026-10-06).
#
# Hasta hoy el estado era el booleano `is_acepted` y el rechazo no existia: el
# "no" del aprobador era implicito —"si no esta de acuerdo, no haga nada"—.
#
# ESTE ARCHIVO CUIDA SOBRE TODO EL PUENTE, no el estado. El cambio se desplego
# en dos pasos y el paso A deja la columna vieja escrita y sincronizada: es lo
# unico que permite revertir el codigo sin reconstruir datos con gente usando el
# sistema. Si las pruebas de §"sincronizacion" se caen, el paso B no se puede
# desplegar.
class ReportExpenseOperationalStateTest < ActiveSupport::TestCase
  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro = cost_centers(:centro_con_viaticos)
  end

  def nuevo_gasto(**overrides)
    ReportExpense.new({
      omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro,
      user_invoice: @ingeniero, invoice_name: "Hotel", invoice_date: Date.current,
      invoice_value: 1_000, invoice_tax: 0, invoice_total: 1_000
    }.merge(overrides))
  end

  def gasto_guardado(**overrides)
    as_user(@admin) { nuevo_gasto(**overrides).tap(&:save!) }
  end

  # --- El estado ------------------------------------------------------------

  test "un gasto nace en creado" do
    assert_equal ReportExpense::STATE_CREADO, ReportExpense.new.operational_state
  end

  test "solo se aceptan los tres estados" do
    gasto = nuevo_gasto(operational_state: "inventado")

    refute gasto.valid?
    assert_includes gasto.errors.attribute_names, :operational_state
  end

  test "las etiquetas salen del modelo y no de cada pantalla" do
    # Viven aqui por el mismo motivo que BUDGET_STATUS_LABELS: con la etiqueta
    # copiada en cada tabla y en los dos Excel, agregar un estado deja alguna
    # pantalla diciendo "Creado" de un gasto rechazado y nadie lo nota.
    assert_equal "Creado",    nuevo_gasto.operational_state_label
    assert_equal "Aceptado",  nuevo_gasto(operational_state: "aceptado").operational_state_label
    assert_equal "Rechazado", nuevo_gasto(operational_state: "rechazado").operational_state_label
  end

  # --- El puente con is_acepted ---------------------------------------------

  test "is_acepted se lee del estado nuevo, no de la columna" do
    # En memoria y ANTES de guardar: el MCP y el serializer leen este metodo, y
    # un objeto recien modificado tiene que responder la verdad.
    gasto = nuevo_gasto(operational_state: ReportExpense::STATE_ACEPTADO)

    assert gasto.is_acepted
    assert gasto.is_acepted?
  end

  test "un rechazado NO es aceptado" do
    assert_equal false, nuevo_gasto(operational_state: ReportExpense::STATE_RECHAZADO).is_acepted
  end

  test "escribir is_acepted = true mueve el estado a aceptado" do
    gasto = nuevo_gasto
    gasto.is_acepted = true

    assert_equal ReportExpense::STATE_ACEPTADO, gasto.operational_state
  end

  test "escribir is_acepted = false lleva a creado y NUNCA a rechazado" do
    # Quien escribe el booleano no puede estar queriendo decir "rechazado": ese
    # estado no existia cuando se escribio esa linea. Si esta prueba se invierte,
    # cualquier des-aceptacion de la tabla pasaria a rechazar gastos en silencio.
    gasto = nuevo_gasto(operational_state: ReportExpense::STATE_ACEPTADO)
    gasto.is_acepted = false

    assert_equal ReportExpense::STATE_CREADO, gasto.operational_state
  end

  test "el desplegable manda los strings de un form y se castean igual" do
    gasto = nuevo_gasto
    gasto.is_acepted = "true"
    assert_equal ReportExpense::STATE_ACEPTADO, gasto.operational_state

    gasto.is_acepted = "false"
    assert_equal ReportExpense::STATE_CREADO, gasto.operational_state
  end

  # --- Sincronizacion: el seguro del paso A ---------------------------------

  test "guardar deja la columna vieja al dia" do
    gasto = gasto_guardado(operational_state: ReportExpense::STATE_ACEPTADO)

    # Se lee la COLUMNA, salteando el metodo derivado: es lo que encontraria el
    # codigo viejo si hubiera que revertir el despliegue.
    assert_equal true, gasto.reload[:is_acepted]
  end

  test "rechazar deja la columna vieja en false" do
    gasto = gasto_guardado(operational_state: ReportExpense::STATE_RECHAZADO)

    # Un rechazado visto por el codigo viejo es "no aceptado", que es lo mas
    # parecido a la verdad que ese codigo sabe expresar.
    assert_equal false, gasto.reload[:is_acepted]
  end

  test "mover el estado dos veces no desincroniza la columna" do
    gasto = gasto_guardado(operational_state: ReportExpense::STATE_ACEPTADO)

    as_user(@admin) { gasto.update!(operational_state: ReportExpense::STATE_RECHAZADO) }
    assert_equal false, gasto.reload[:is_acepted]

    as_user(@admin) { gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }
    assert_equal true, gasto.reload[:is_acepted]
  end

  # --- Consecuencias en el dinero -------------------------------------------

  test "un gasto rechazado NO consume presupuesto" do
    # Es la mitad de la mejora M8 y sale sola del diseño: lo que consume cupo es
    # la aceptacion, y un rechazado no esta aceptado.
    aceptado = gasto_guardado(operational_state: ReportExpense::STATE_ACEPTADO, invoice_value: 50_000)
    gasto_guardado(operational_state: ReportExpense::STATE_RECHAZADO, invoice_value: 900_000)

    consumidores = ExpenseBudgetService.consumidores(
      ReportExpense.where(cost_center_id: @centro.id, user_invoice_id: @ingeniero.id)
    )

    assert_includes consumidores.map(&:id), aceptado.id
    assert_equal [ReportExpense::STATE_ACEPTADO], consumidores.map(&:operational_state).uniq
  end

  # --- Filtros ---------------------------------------------------------------

  test "search filtra por el estado nuevo" do
    rechazado = gasto_guardado(operational_state: ReportExpense::STATE_RECHAZADO)
    gasto_guardado(operational_state: ReportExpense::STATE_ACEPTADO)

    encontrados = ReportExpense.search(operational_state: "rechazado").pluck(:id)

    assert_equal [rechazado.id], encontrados
  end

  test "search sigue entendiendo el filtro viejo is_acepted" do
    # Lo manda el MCP y lo lleva cualquier enlace guardado con `?is_acepted=true`.
    # Romperlo devuelve una tabla con los gastos equivocados y sin ningun error.
    aceptado = gasto_guardado(operational_state: ReportExpense::STATE_ACEPTADO)
    gasto_guardado(operational_state: ReportExpense::STATE_RECHAZADO)

    assert_includes ReportExpense.search(is_acepted: "true").pluck(:id), aceptado.id
    refute_includes ReportExpense.search(is_acepted: "true").pluck(:id),
                    ReportExpense.rechazados.first.id
  end

  test "el filtro viejo false trae los creados y NO los rechazados" do
    # `is_acepted=false` significaba "Creado" cuando se escribio, y un rechazado
    # no es un creado: colarlo ahi mezclaria en la misma lista lo que espera
    # revision con lo que ya se decidio que no.
    creado = gasto_guardado
    rechazado = gasto_guardado(operational_state: ReportExpense::STATE_RECHAZADO)

    encontrados = ReportExpense.search(is_acepted: "false").pluck(:id)

    assert_includes encontrados, creado.id
    refute_includes encontrados, rechazado.id
  end

  test "un gasto rechazado NO suma en viaticos ni en el AIU del centro" do
    # La otra mitad de M8, y esta SI hubo que escribirla: la suma de viaticos no
    # tenia ninguna condicion —sumaba todos los gastos del centro— y de ahi se
    # propaga a aiu, aiu_percent, aiu_real, aiu_percent_real y total_expenses,
    # que ademas se PERSISTEN en cost_centers.
    gasto_guardado(operational_state: ReportExpense::STATE_ACEPTADO, invoice_value: 100_000)
    gasto_guardado(operational_state: ReportExpense::STATE_RECHAZADO, invoice_value: 900_000)

    suman = ReportExpense.where(cost_center_id: @centro.id).suman_en_centro.sum(:invoice_value)

    refute_includes ReportExpense.where(cost_center_id: @centro.id).suman_en_centro.map(&:operational_state),
                    ReportExpense::STATE_RECHAZADO
    assert_equal 0, ReportExpense.where(cost_center_id: @centro.id).suman_en_centro.rechazados.count
    assert suman.positive?, "el aceptado tiene que seguir sumando"
  end

  test "los gastos en Creado SIGUEN sumando en el centro" do
    # Es el comportamiento de siempre y se deja a proposito: sacarlos moveria el
    # AIU de todos los centros de golpe, y eso es otra decision (D7). Si esta
    # prueba se cae, alguien amplio el filtro sin tomarla.
    creado = gasto_guardado(invoice_value: 70_000)

    ids = ReportExpense.where(cost_center_id: @centro.id).suman_en_centro.pluck(:id)

    assert_includes ids, creado.id
  end

end
