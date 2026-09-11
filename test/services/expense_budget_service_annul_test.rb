require "test_helper"

# ANULACION DE PARTIDAS: la regla de los tres casos.
#
# Anular no es siempre `active = false`. Lo unico que se le puede devolver al
# centro es lo que la partida todavia NO tiene ejecutado:
#
#   gastado = 0          -> anulacion completa (active = false).
#   0 < gastado < monto  -> la partida SIGUE ACTIVA con el monto recortado a lo
#                           gastado. Se libera el resto.
#   gastado >= monto     -> no hay saldo que liberar: no se cambia nada.
#
# El caso del medio es el que sostiene el tope del centro, y por eso el test que
# de verdad importa de este archivo es `..._el_tope_sigue_contando_lo_gastado`:
# `ExpenseBudget.cap_violation_for` suma SOLO partidas ACTIVAS, asi que si la
# anulacion parcial desactivara la partida, el dinero ya gastado dejaria de
# contar contra `viatic_value` y el centro creeria tener mas margen del que
# tiene.
class ExpenseBudgetServiceAnnulTest < ActiveSupport::TestCase
  MENSAJE_TOTAL = "La partida fue anulada: no tenía gastos ejecutados, así que se liberaron " \
                  "$400.000 al centro de costos".freeze

  MENSAJE_PARCIAL = "La partida tenía $200.000 ejecutados: se recortó de $500.000 a $200.000 " \
                    "y sigue activa para respaldar ese gasto. Se liberaron $300.000 " \
                    "al centro de costos".freeze

  MENSAJE_SIN_SALDO = "La partida ya tiene $200.000 ejecutados sobre $200.000 asignados: " \
                      "no hay saldo por liberar y no se realizó ningún cambio".freeze

  setup do
    @admin  = users(:admin)
    # centro_ajeno: viatic_value 1.000.000 y sin partidas en las fixtures, asi que
    # las cifras de cada caso son exactas y predecibles.
    @centro = cost_centers(:centro_ajeno)
    @user   = users(:ingeniero_dos)
  end

  def crear_partida(amount, **overrides)
    as_user(@admin) do
      ExpenseBudget.create!({ cost_center: @centro, user: @user, amount: amount,
                              created_by_id: @admin.id }.merge(overrides))
    end
  end

  # `created_at` explicito porque el reparto del cupo es FIFO por esa fecha.
  def crear_gasto(valor, dia:, **overrides)
    gasto = as_user(@admin) do
      ReportExpense.create!({
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true, user_id: @admin.id, cost_center_id: @centro.id,
                              user_invoice_id: @user.id, invoice_name: "Gasto #{dia}",
                              invoice_date: Date.new(2026, 6, dia), invoice_value: valor,
                              invoice_tax: 0, invoice_total: valor,
                              # Los gastos de estas pruebas representan cupo YA COMPROMETIDO.
                              # Desde 2026-09-10 solo lo ACEPTADO consume (ver
                              # ExpenseBudgetService.consumidores); con el default de la columna
                              # —false— no descontarian nada y el disponible saldria intacto.
                              is_acepted: true,
                              budget_status: "aprobado" }.merge(overrides))
    end
    gasto.update_columns(created_at: Time.zone.local(2026, 6, dia, 8, 0, 0))
    gasto.reload
  end

  def anular(partida, valor = false)
    ExpenseBudgetService.update_budget!(partida, { active: valor }, actor: @admin)
  end

  # --- Caso 1: gastado = 0 ---------------------------------------------------

  def test_anular_sin_gasto_desactiva_la_partida
    partida = crear_partida(400_000)

    resultado = anular(partida)

    assert_predicate resultado, :ok?
    partida.reload
    assert_not partida.active
    # El monto NO se toca: la partida queda como testimonio de lo que se habia
    # asignado, simplemente deja de contar.
    assert_equal BigDecimal("400000.0"), partida.amount
    assert_equal MENSAJE_TOTAL, resultado.value.mensaje_anulacion
  end

  def test_anular_sin_gasto_libera_todo_el_cupo_al_centro
    partida = crear_partida(400_000)
    anular(partida)

    # El millon entero vuelve a estar disponible para el centro: una partida
    # inactiva no suma en `cap_violation_for`.
    assert_nil ExpenseBudget.cap_violation_for(cost_center: @centro, amount: 1_000_000, active: true)
  end

  # --- Caso 2: 0 < gastado < monto -------------------------------------------

  def test_anular_con_gasto_parcial_recorta_el_monto_y_la_deja_activa
    partida = crear_partida(500_000)
    crear_gasto(200_000, dia: 1)

    resultado = anular(partida)

    assert_predicate resultado, :ok?
    partida.reload
    # ACTIVA, no anulada: desactivarla sacaria del tope del centro los 200.000 ya
    # ejecutados y dejaria ese gasto sin partida activa a la que imputarse.
    assert partida.active, "La partida con gasto ejecutado tiene que seguir ACTIVA"
    assert_equal BigDecimal("200000.0"), partida.amount
    assert_equal MENSAJE_PARCIAL, resultado.value.mensaje_anulacion
  end

  def test_anular_con_gasto_parcial_deja_el_disponible_del_par_en_cero
    partida = crear_partida(500_000)
    crear_gasto(200_000, dia: 1)

    anular(partida)

    cupo = ExpenseBudgetService.available_for(cost_center_id: @centro.id, user_id: @user.id)
    assert_equal BigDecimal("200000.0"), cupo[:assigned]
    assert_equal BigDecimal("200000.0"), cupo[:spent]
    assert_equal BigDecimal("0.0"), cupo[:available]
  end

  # ESTE es el test que impide "arreglar" la regla desactivando la partida.
  def test_anular_con_gasto_parcial_el_tope_sigue_contando_lo_gastado
    partida = crear_partida(500_000)
    crear_gasto(200_000, dia: 1)

    anular(partida)

    # Tope 1.000.000 menos los 200.000 que la partida recortada sigue ocupando:
    # quedan 800.000 libres, ni un peso mas.
    assert_nil ExpenseBudget.cap_violation_for(cost_center: @centro, amount: 800_000, active: true)
    assert_not_nil ExpenseBudget.cap_violation_for(cost_center: @centro, amount: 800_001, active: true),
                   "Si la anulacion parcial desactivara la partida, los 200.000 ya gastados " \
                   "dejarian de contar contra el tope y el centro creeria tener 1.000.000 libres"
  end

  def test_anular_con_gasto_parcial_conserva_los_gastos_aprobados
    partida = crear_partida(500_000)
    gasto = crear_gasto(200_000, dia: 1)

    anular(partida)

    # El recorte deja el cupo justo: el gasto sigue aprobado y sigue imputado a
    # esta partida, que para eso se dejo activa.
    assert_equal "aprobado", gasto.reload.budget_status
    assert_equal partida.id, gasto.reload.expense_budget_id
  end

  def test_anular_con_gasto_parcial_ignora_el_amount_que_venga_en_el_body
    partida = crear_partida(500_000)
    crear_gasto(200_000, dia: 1)

    # En una anulacion el monto no lo elige el usuario: lo decide lo ejecutado.
    resultado = ExpenseBudgetService.update_budget!(partida, { active: false, amount: 999_999 },
                                                     actor: @admin)

    assert_predicate resultado, :ok?
    assert_equal BigDecimal("200000.0"), partida.reload.amount
  end

  # --- Caso 3: gastado >= monto ----------------------------------------------

  def test_anular_con_gasto_igual_al_monto_no_cambia_nada
    partida = crear_partida(200_000)
    crear_gasto(200_000, dia: 1)

    resultado = anular(partida)

    assert_predicate resultado, :error?
    assert_equal MENSAJE_SIN_SALDO, resultado.errors.first
    partida.reload
    assert partida.active
    assert_equal BigDecimal("200000.0"), partida.amount
  end

  def test_anular_con_gasto_mayor_al_monto_no_cambia_nada
    partida = crear_partida(200_000)
    # Un historico `sin_presupuesto` consume cupo aunque el reevaluo no lo toque:
    # el par se lleva gastados 250.000 contra una partida de 200.000.
    crear_gasto(250_000, dia: 1, budget_status: "sin_presupuesto")

    resultado = anular(partida)

    assert_predicate resultado, :error?
    partida.reload
    assert partida.active
    assert_equal BigDecimal("200000.0"), partida.amount
  end

  def test_anular_sin_saldo_no_escribe_auditoria
    partida = crear_partida(200_000)
    crear_gasto(200_000, dia: 1)

    # No cambia nada, asi que tampoco puede quedar rastro de un cambio que no
    # ocurrio.
    assert_no_difference("RegisterEdit.count") { anular(partida) }
  end

  # --- Auditoria -------------------------------------------------------------

  def test_anulacion_total_queda_en_la_auditoria_como_anulacion
    partida = crear_partida(400_000)

    assert_difference("RegisterEdit.count", 1) { anular(partida) }

    registro = RegisterEdit.last
    assert_equal "Presupuesto", registro.module
    assert_includes registro.description, "(SE ANULO LA SIGUIENTE PARTIDA)"
    # El formato de los segmentos no cambia: el nuevo valor en color-true y el
    # anterior en color-false.
    assert_includes registro.description,
                    "<p>Estado: <b class='color-true'>Inactiva</b> / <b class='color-false'>Activa</b></p>"
    assert_includes registro.description, MENSAJE_TOTAL
  end

  def test_anulacion_parcial_queda_en_la_auditoria_como_anulacion_y_no_como_edicion
    partida = crear_partida(500_000)
    crear_gasto(200_000, dia: 1)

    assert_difference("RegisterEdit.count", 1) { anular(partida) }

    registro = RegisterEdit.last
    assert_includes registro.description, "(SE ANULO LA SIGUIENTE PARTIDA)"
    # Sin el encabezado propio, el recorte se leeria como un cambio de monto
    # cualquiera y nadie podria reconstruir que alguien anulo esta partida.
    refute_includes registro.description, "(SE EDITO LA SIGUIENTE PARTIDA)"
    assert_includes registro.description,
                    "<p>Valor: <b class='color-true'>$200.000</b> / <b class='color-false'>$500.000</b></p>"
    assert_includes registro.description, MENSAJE_PARCIAL
  end

  def test_editar_una_partida_sin_anularla_conserva_el_encabezado_de_edicion
    partida = crear_partida(400_000)

    ExpenseBudgetService.update_budget!(partida, { amount: 300_000 }, actor: @admin)

    assert_includes RegisterEdit.last.description, "(SE EDITO LA SIGUIENTE PARTIDA)"
    refute_includes RegisterEdit.last.description, "(SE ANULO LA SIGUIENTE PARTIDA)"
    assert_nil partida.mensaje_anulacion
  end

  def test_anular_sin_user_current_no_revienta_por_la_auditoria
    partida = crear_partida(400_000)

    # Los callbacks de auditoria leen User.current, que fuera de un request web es
    # nil. El actor entra por parametro y el modelo tiene sus respaldos.
    resultado = nil
    assert_nothing_raised { resultado = ExpenseBudgetService.update_budget!(partida, { active: false }, actor: nil) }

    assert_predicate resultado, :ok?
    assert_not partida.reload.active
    assert_equal @admin.id, RegisterEdit.last.user_id
  end

  # --- Detalles del disparo --------------------------------------------------

  def test_anular_acepta_el_string_false_del_formulario
    partida = crear_partida(500_000)
    crear_gasto(200_000, dia: 1)

    # En un request form-encoded `params[:active]` llega como el STRING "false",
    # que sin castear es truthy en Ruby y se colaria como una edicion normal.
    resultado = anular(partida, "false")

    assert_predicate resultado, :ok?
    assert partida.reload.active
    assert_equal BigDecimal("200000.0"), partida.amount
  end

  def test_reactivar_una_partida_no_dispara_la_regla_de_anulacion
    partida = crear_partida(400_000, active: false)

    resultado = ExpenseBudgetService.update_budget!(partida, { active: true }, actor: @admin)

    assert_predicate resultado, :ok?
    assert partida.reload.active
    assert_nil partida.mensaje_anulacion
  end

  def test_reenviar_active_false_sobre_una_partida_ya_anulada_no_hace_nada
    partida = crear_partida(400_000, active: false)

    resultado = anular(partida)

    # Solo la transicion ACTIVA -> inactiva es una anulacion.
    assert_predicate resultado, :ok?
    assert_not partida.reload.active
    assert_nil partida.mensaje_anulacion
  end

  def test_anular_conserva_las_notas_que_vengan_en_el_body
    partida = crear_partida(400_000)

    ExpenseBudgetService.update_budget!(partida, { active: false, notes: "Proyecto cerrado" },
                                         actor: @admin)

    assert_equal "Proyecto cerrado", partida.reload.notes
    assert_not partida.active
  end

  def test_anular_toma_el_lock_del_centro
    partida = crear_partida(400_000)
    sqls = []
    subscriptor = ActiveSupport::Notifications.subscribe("sql.active_record") do |*, payload|
      sqls << payload[:sql]
    end
    anular(partida)
    ActiveSupport::Notifications.unsubscribe(subscriptor)

    # Lo gastado se lee DENTRO del lock: sin el, un gasto simultaneo dejaria el
    # recorte corto y la partida respaldando menos de lo ejecutado.
    assert sqls.any? { |s| s =~ /FOR UPDATE/ && s =~ /cost_centers/ },
           "La anulacion tiene que serializarse con SELECT ... FOR UPDATE sobre cost_centers.\n" \
           "#{sqls.join("\n")}"
  end
end
