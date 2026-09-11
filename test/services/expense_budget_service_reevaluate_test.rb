require "test_helper"

# El reevaluo FIFO: cuando cambia la partida o desaparece un gasto, hay que
# repartir el cupo otra vez entre TODOS los gastos del par.
#
# La regla que decide quien se queda con el cupo es la antiguedad: los gastos
# mas viejos lo conservan y los mas nuevos son los que se caen a `excedido`.
# Cualquier otro criterio (por monto, por tipo) haria que registrar un gasto
# viejo cambiara el estado de gastos ya aprobados, y nadie podria explicarle al
# ingeniero por que su gasto de la semana pasada dejo de estar aprobado.
class ExpenseBudgetServiceReevaluateTest < ActiveSupport::TestCase
  setup do
    @admin      = users(:admin)
    @centro_lab = cost_centers(:centro_ajeno)      # viatic_value 1.000.000, sin fixtures
    @user_lab   = users(:ingeniero_dos)
    @centro_dos = cost_centers(:centro_con_viaticos)
  end

  def crear_partida(amount, cost_center: @centro_lab, user: @user_lab, **overrides)
    as_user(@admin) do
      ExpenseBudget.create!({ cost_center: cost_center, user: user, amount: amount,
                              created_by_id: @admin.id }.merge(overrides))
    end
  end

  # Gasto persistido con `created_at` explicito: el FIFO ordena por created_at y
  # sin fechas fijas el orden de tres inserciones en el mismo milisegundo seria
  # no determinista.
  def crear_gasto(valor, dia:, cost_center: @centro_lab, user: @user_lab, **overrides)
    gasto = as_user(@admin) do
      ReportExpense.create!({
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true, user_id: @admin.id, cost_center_id: cost_center.id,
                              user_invoice_id: user.id, invoice_name: "Gasto #{dia}",
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

  def reevaluar(cost_center: @centro_lab, user: @user_lab)
    ExpenseBudgetService.reevaluate_center_user!(cost_center_id: cost_center.id, user_id: user.id)
  end

  def test_fifo_los_mas_viejos_conservan_el_cupo
    crear_partida(100_000)
    viejo   = crear_gasto(60_000, dia: 1)
    medio   = crear_gasto(60_000, dia: 2)
    nuevo   = crear_gasto(60_000, dia: 3)

    reevaluar

    assert_equal "aprobado", viejo.reload.budget_status
    assert_equal "excedido", medio.reload.budget_status
    # LA CASCADA AHORA ES REAL (2026-09-10). Antes el segundo no arrastraba al
    # tercero —"lo que no cabe no consume"— y los dos excedian por los mismos
    # $20.000. Ahora los tres estan ACEPTADOS, luego los tres consumen, y el
    # mensaje del tercero reporta el sobregiro ACUMULADO del par: 180.000
    # gastados contra 100.000 asignados. Es el dato util: decir "$20.000" cuando
    # el cupo esta 80.000 en rojo engañaria a quien lo lee.
    assert_equal "excedido", nuevo.reload.budget_status
    assert_equal "Excede el presupuesto disponible en $80.000", nuevo.reload.budget_reason
  end

  def test_reducir_partida_bajo_lo_gastado_empuja_a_excedido_a_los_mas_nuevos
    partida = crear_partida(200_000)
    viejo = crear_gasto(100_000, dia: 1)
    nuevo = crear_gasto(100_000, dia: 2)

    resultado = ExpenseBudgetService.update_budget!(partida, { amount: 100_000 }, actor: @admin)

    assert_predicate resultado, :ok?
    assert_equal "aprobado", viejo.reload.budget_status
    assert_equal "excedido", nuevo.reload.budget_status
  end

  def test_reducir_partida_bajo_lo_gastado_no_bloquea_la_edicion
    partida = crear_partida(200_000)
    crear_gasto(100_000, dia: 1)
    crear_gasto(100_000, dia: 2)

    resultado = ExpenseBudgetService.update_budget!(partida, { amount: 100_000 }, actor: @admin)

    # La validacion de tope solo mira hacia ARRIBA. Bloquear la reduccion
    # dejaria al jefe sin forma de corregir una partida inflada por error.
    assert_predicate resultado, :ok?
    assert_equal BigDecimal("100000.0"), partida.reload.amount
  end

  def test_ampliar_partida_recupera_excedidos
    partida = crear_partida(50_000)
    gasto = crear_gasto(60_000, dia: 1)
    reevaluar
    assert_equal "excedido", gasto.reload.budget_status

    ExpenseBudgetService.update_budget!(partida, { amount: 100_000 }, actor: @admin)

    assert_equal "aprobado", gasto.reload.budget_status
    assert_nil gasto.reload.budget_reason
  end

  # La anulacion COMPLETA (la partida no tiene nada ejecutado) es la unica que
  # desactiva la partida, y ahi si los gastos se quedan sin cupo.
  #
  # QUE CUENTA COMO "EJECUTADO" CAMBIO (2026-09-10): antes lo definia el estado
  # presupuestal (un `excedido` no consumia y por eso no estorbaba); ahora lo
  # define la ACEPTACION. Por eso el gasto de este escenario va SIN aceptar: es
  # la unica forma de que la partida siga sin nada ejecutado.
  def test_desactivar_partida_sin_gasto_ejecutado_deja_los_gestionados_en_sin_presupuesto
    partida = crear_partida(200_000)
    excedido = crear_gasto(500_000, dia: 1)
    # `update_columns` y no un override en `crear_gasto`: el helper crea con
    # budget_status "aprobado" y `auto_accept_if_within_budget` (before_create)
    # pisaria cualquier `is_acepted: false` que se le pase al constructor.
    excedido.update_columns(is_acepted: false)
    reevaluar
    assert_equal "excedido", excedido.reload.budget_status

    ExpenseBudgetService.update_budget!(partida, { active: false }, actor: @admin)

    assert_not partida.reload.active
    assert_equal "sin_presupuesto", excedido.reload.budget_status
    assert_nil excedido.reload.expense_budget_id
  end

  # Con gasto ejecutado la partida NO se desactiva: se recorta a lo gastado y
  # sigue activa. Si se desactivara, ese dinero saldria del tope del centro y sus
  # gastos quedarian sin partida activa.
  def test_anular_partida_con_gasto_ejecutado_recorta_y_conserva_la_imputacion
    partida = crear_partida(200_000)
    aprobado = crear_gasto(100_000, dia: 1)
    # SIN aceptar: lo ejecutado son los 100.000 del aprobado. Si este tambien
    # contara, el par llevaria 600.000 sobre una partida de 200.000 y no habria
    # nada que recortar —que es otro caso, el de `anular_con_gasto_mayor_al_monto`.
    excedido = crear_gasto(500_000, dia: 2)
    # `update_columns` y no un override en `crear_gasto`: el helper crea con
    # budget_status "aprobado" y `auto_accept_if_within_budget` (before_create)
    # pisaria cualquier `is_acepted: false` que se le pase al constructor.
    excedido.update_columns(is_acepted: false)
    reevaluar
    assert_equal "excedido", excedido.reload.budget_status

    ExpenseBudgetService.update_budget!(partida, { active: false }, actor: @admin)

    partida.reload
    assert partida.active
    assert_equal BigDecimal("100000.0"), partida.amount
    # El aprobado conserva su cupo y su partida; el excedido sigue sin caber.
    assert_equal "aprobado", aprobado.reload.budget_status
    assert_equal partida.id, aprobado.reload.expense_budget_id
    assert_equal "excedido", excedido.reload.budget_status
  end

  def test_eliminar_partida_nulifica_y_reevalua
    partida = crear_partida(200_000)
    gasto = crear_gasto(100_000, dia: 1)
    reevaluar
    assert_equal partida.id, gasto.reload.expense_budget_id

    ExpenseBudgetService.destroy_budget!(partida, actor: @admin)

    assert_nil gasto.reload.expense_budget_id
    assert_equal "sin_presupuesto", gasto.reload.budget_status
  end

  def test_eliminar_una_de_dos_partidas_reimputa_a_la_que_queda
    vieja = crear_partida(100_000)
    vieja.update_columns(created_at: Time.zone.local(2026, 1, 1))
    segunda = crear_partida(100_000)
    segunda.update_columns(created_at: Time.zone.local(2026, 2, 1))

    gasto = crear_gasto(50_000, dia: 5)
    reevaluar
    assert_equal vieja.id, gasto.reload.expense_budget_id

    ExpenseBudgetService.destroy_budget!(vieja.reload, actor: @admin)

    assert_equal segunda.id, gasto.reload.expense_budget_id
    assert_equal "aprobado", gasto.reload.budget_status
  end

  def test_sin_presupuesto_nunca_cambia_de_estado_en_el_reevaluo
    historico = crear_gasto(50_000, dia: 1, budget_status: "sin_presupuesto")

    ExpenseBudgetService.create_budget!(cost_center_id: @centro_lab.id, user_id: @user_lab.id,
                                        amount: 500_000, actor: @admin)

    # Si el reevaluo lo adoptara, un historico podria acabar en `excedido` y
    # SALIR de la vista de contabilidad, que es justo lo que la decision de no
    # tocar datos historicos evitaba. Sale de sin_presupuesto solo si el propio
    # gasto se edita.
    assert_equal "sin_presupuesto", historico.reload.budget_status
    assert_nil historico.reload.expense_budget_id
  end

  def test_sin_presupuesto_si_consume_cupo_en_el_reevaluo
    crear_partida(100_000)
    crear_gasto(80_000, dia: 1, budget_status: "sin_presupuesto")
    gestionado = crear_gasto(50_000, dia: 2)

    reevaluar

    # El historico ocupa 80.000 del cupo aunque el reevaluo no lo toque: al
    # gestionado solo le quedan 20.000.
    assert_equal "excedido", gestionado.reload.budget_status
    assert_equal "Excede el presupuesto disponible en $30.000", gestionado.reload.budget_reason
  end

  def test_reevaluo_escribe_un_solo_register_edit
    partida = crear_partida(500_000)
    5.times { |i| crear_gasto(100_000, dia: i + 1) }

    # UNO, el de la partida. Con `update` en vez de `update_columns` serian 6 y
    # una edicion de partida con 40 gastos ensuciaria la pantalla de
    # notificaciones con 41 registros.
    assert_difference("RegisterEdit.count", 1) do
      ExpenseBudgetService.update_budget!(partida, { amount: 150_000 }, actor: @admin)
    end
  end

  def test_reevaluo_no_pisa_last_user_edited_id_de_los_gastos
    partida = crear_partida(500_000)
    gastos = 3.times.map { |i| crear_gasto(100_000, dia: i + 1) }
    antes = gastos.map { |g| g.reload.last_user_edited_id }

    ExpenseBudgetService.update_budget!(partida, { amount: 150_000 }, actor: users(:gerente))

    assert_equal antes, gastos.map { |g| g.reload.last_user_edited_id }
  end

  def test_reevaluo_no_toca_is_acepted_ni_accounting_approved
    partida = crear_partida(500_000)
    gasto = crear_gasto(100_000, dia: 1)
    gasto.update_columns(is_acepted: true, accounting_approved: true)

    ExpenseBudgetService.update_budget!(partida, { amount: 50_000 }, actor: @admin)

    assert_equal true, gasto.reload.is_acepted
    assert_equal true, gasto.reload.accounting_approved
    assert_equal "excedido", gasto.reload.budget_status
  end

  def test_reevaluo_es_idempotente
    crear_partida(100_000)
    gasto = crear_gasto(150_000, dia: 1)

    assert_equal 1, reevaluar.value
    marca = gasto.reload.updated_at

    # La segunda pasada no escribe nada: el reevaluo solo toca las filas cuyo
    # destino difiere del estado actual, asi que no produce ruido en updated_at
    # ni en la pantalla de contabilidad, que ordena por fecha.
    assert_equal 0, reevaluar.value
    assert_equal marca, gasto.reload.updated_at
  end

  def test_editar_gasto_cambiando_de_centro_reevalua_ambos_pares
    crear_partida(100_000)                                        # centro_lab
    crear_partida(100_000, cost_center: @centro_dos)              # centro_con_viaticos

    viejo    = crear_gasto(60_000, dia: 1)
    a_mover  = crear_gasto(30_000, dia: 2)
    ultimo   = crear_gasto(30_000, dia: 3)
    reevaluar
    # 60.000 + 30.000 caben en los 100.000; el tercero no.
    assert_equal "aprobado", viejo.reload.budget_status
    assert_equal "excedido", ultimo.reload.budget_status

    prev_cc = a_mover.cost_center_id
    prev_u  = a_mover.user_invoice_id
    a_mover.cost_center_id = @centro_dos.id
    ExpenseBudgetService.persist_with_evaluation!(a_mover, actor: @admin,
                                                  previous_cost_center_id: prev_cc,
                                                  previous_user_invoice_id: prev_u)

    # En el centro de ORIGEN se liberaron 30.000 y el que estaba excedido vuelve
    # a caber. Sin reevaluar el par de origen se quedaria excedido para siempre.
    assert_equal "aprobado", ultimo.reload.budget_status
    assert_nil ultimo.reload.budget_reason
    # Y en el centro DESTINO el gasto movido se evalua contra la partida de alli.
    assert_equal @centro_dos.id, a_mover.reload.cost_center_id
    assert_equal "aprobado", a_mover.reload.budget_status
  end

  def test_gasto_aprobado_contablemente_empujado_a_excedido_conserva_la_aprobacion
    partida = crear_partida(200_000)
    gasto = crear_gasto(150_000, dia: 1)
    momento = Time.zone.local(2026, 6, 10, 9, 30, 0)
    gasto.update_columns(accounting_approved: true, accounting_approved_at: momento,
                         accounting_approved_by_id: @admin.id)

    ExpenseBudgetService.update_budget!(partida, { amount: 100_000 }, actor: @admin)

    assert_equal "excedido", gasto.reload.budget_status
    # La aprobacion contable es un hecho ya ocurrido: el presupuesto no la
    # revoca. Reducir una partida saca el gasto de la vista de contabilidad,
    # pero no deshace lo que el contador ya aprobo.
    assert_equal true, gasto.reload.accounting_approved
    assert_equal momento, gasto.reload.accounting_approved_at
  end

  def test_on_expense_destroyed_libera_cupo
    crear_partida(100_000)
    primero = crear_gasto(60_000, dia: 1)
    segundo = crear_gasto(60_000, dia: 2)
    reevaluar
    assert_equal "excedido", segundo.reload.budget_status

    cc = primero.cost_center_id
    u  = primero.user_invoice_id
    as_user(@admin) { primero.destroy }
    ExpenseBudgetService.on_expense_destroyed!(cost_center_id: cc, user_id: u, actor: @admin)

    # Eliminar un gasto LIBERA cupo. Sin este reevaluo el segundo se quedaria
    # marcado como excedido para siempre y desapareceria de contabilidad sin
    # razon.
    assert_equal "aprobado", segundo.reload.budget_status
    assert_nil segundo.reload.budget_reason
  end

  # El otro lado de la discrepancia D1: 2.7 solo manda recalcular "el gasto
  # editado", pero BAJARLE el valor libera cupo para los demas del par
  # exactamente igual que eliminarlo.
  def test_bajar_el_valor_de_un_gasto_rescata_a_los_excedidos_posteriores
    crear_partida(100_000)
    primero = crear_gasto(60_000, dia: 1)
    segundo = crear_gasto(60_000, dia: 2)
    reevaluar
    assert_equal "excedido", segundo.reload.budget_status

    primero.invoice_value = 30_000
    ExpenseBudgetService.persist_with_evaluation!(primero, actor: @admin)

    # 30.000 + 60.000 caben en los 100.000. Sin el reevaluo del par el segundo
    # se quedaria excedido aunque ya sobre cupo, y desapareceria de la vista de
    # contabilidad sin ninguna razon visible para el usuario.
    assert_equal "aprobado", primero.reload.budget_status
    assert_equal "aprobado", segundo.reload.budget_status
    assert_nil segundo.reload.budget_reason
  end

  # Y el simetrico: subir el valor de un gasto viejo empuja a excedido a los
  # posteriores, porque el FIFO le da el cupo al mas antiguo.
  def test_subir_el_valor_de_un_gasto_viejo_empuja_a_excedido_al_posterior
    crear_partida(100_000)
    primero = crear_gasto(30_000, dia: 1)
    segundo = crear_gasto(60_000, dia: 2)
    reevaluar
    assert_equal "aprobado", segundo.reload.budget_status

    primero.invoice_value = 90_000
    ExpenseBudgetService.persist_with_evaluation!(primero, actor: @admin)

    assert_equal "aprobado", primero.reload.budget_status
    assert_equal "excedido", segundo.reload.budget_status
    assert_equal "Excede el presupuesto disponible en $50.000", segundo.reload.budget_reason
  end
end
