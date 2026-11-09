require "test_helper"

# Cambiar al segundo aprobador de una regla (2026-11-09).
#
# El caso de prod: un gasto quedó en «Pendiente 2ª aprobación» esperando a la
# persona que la regla tenía cuando se registró. Después la regla pasó a otra
# persona y el gasto se quedó pegado, porque solo quien figura en la foto del
# gasto lo puede firmar. Ahora, al cambiar el aprobador, los gastos que todavía
# esperan pasan al nuevo. Lo que no cambia es si hace falta la segunda firma.
class ExpenseRuleCambioDeAprobadorTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @admin     = users(:admin)
    @ingeniero = users(:ingeniero)
    @dueno     = users(:dueno_centro)
    @gerente   = users(:gerente)
    @centro    = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0, user_owner_id: @dueno.id)
    ExpenseRule.update_all(active: false)
    ActionMailer::Base.deliveries.clear
  end

  # Gastos de más de $100.000 necesitan la segunda aprobación de Beatriz (gerente).
  def regla_doble(**attrs)
    as_user(@admin) do
      ExpenseRule.create!({ name: "Montos altos", active: true, applies_to_all_roles: true,
                            mandatory: false, check_duplicates: false, max_invoice_value: 100_000,
                            requires_second_approval: true, second_approver_user: @gerente,
                            user: @admin }.merge(attrs))
    end
  end

  def crear(valor)
    as_user(@admin) do
      ReportExpense.create!(omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro,
                            user_invoice: @ingeniero, invoice_name: "Proveedor",
                            invoice_date: Date.current, invoice_number: "FE-CA-#{SecureRandom.hex(3)}",
                            identification: "900111222", invoice_value: valor, invoice_tax: 0,
                            invoice_total: valor)
    end
  end

  def decidir(gasto, quien, estado = ReportExpense::STATE_ACEPTADO)
    as_user(quien) { gasto.update(operational_state: estado) }
  end

  def cambiar_aprobador(regla, **attrs)
    as_user(@admin) { regla.update!(attrs) }
  end

  test "el gasto pendiente de la segunda pasa al nuevo aprobador y conserva la primera firma" do
    regla = regla_doble
    gasto = crear(150_000)
    decidir(gasto, @dueno)
    assert gasto.reload.pendiente_segunda?

    cambiar_aprobador(regla, second_approver_user: @admin)
    gasto.reload

    assert gasto.pendiente_segunda?, "Cambiar quien firma no puede mover el estado"
    assert_equal @dueno.id, gasto.first_approved_by_id
    assert_equal [@admin.id], gasto.segundos_aprobadores_ids
    assert_match "Usuario:", gasto.segundos_aprobadores_label
    assert_equal [gasto.id], regla.gastos_reasignados.map(&:id)

    assert_not decidir(gasto, @gerente), "El aprobador de antes ya no firma"
    assert decidir(gasto.reload, @admin)
    assert gasto.reload.aceptado?
    assert_equal @admin.id, gasto.second_approved_by_id
  end

  test "pasar de una persona a un cargo tambien se reasigna" do
    regla = regla_doble(second_approver_user: @admin)
    gasto = crear(150_000)
    decidir(gasto, @dueno)

    cambiar_aprobador(regla, second_approver_user: nil, second_approver_rol: rols(:gerente))
    gasto.reload

    assert_empty gasto.segundos_aprobadores_ids
    assert_equal [rols(:gerente).id], gasto.segundos_aprobadores_rol_ids
    assert decidir(gasto, @gerente)
    assert gasto.reload.aceptado?
  end

  test "el gasto todavia en Creado tambien pasa, y al aceptarlo espera al nuevo" do
    regla = regla_doble
    gasto = crear(150_000)
    assert gasto.creado?

    cambiar_aprobador(regla, second_approver_user: @admin)
    decidir(gasto.reload, @dueno)

    assert gasto.reload.pendiente_segunda?
    assert_equal [@admin.id], gasto.segundos_aprobadores_ids
  end

  test "lo aceptado no se toca" do
    regla = regla_doble
    gasto = crear(150_000)
    decidir(gasto, @dueno)
    decidir(gasto.reload, @gerente)
    assert gasto.reload.aceptado?

    cambiar_aprobador(regla, second_approver_user: @admin)

    assert_equal [@gerente.id], gasto.reload.segundos_aprobadores_ids
    assert_empty regla.gastos_reasignados
  end

  test "apagar la doble aprobacion no le quita la segunda firma a lo que va en camino" do
    regla = regla_doble
    gasto = crear(150_000)
    decidir(gasto, @dueno)

    cambiar_aprobador(regla, requires_second_approval: false)

    gasto.reload
    assert gasto.pendiente_segunda?
    assert_equal [@gerente.id], gasto.segundos_aprobadores_ids
  end

  test "editar la regla sin cambiar al aprobador no toca los gastos" do
    regla = regla_doble
    gasto = crear(150_000)
    foto = gasto.second_approval_rules

    cambiar_aprobador(regla, name: "Montos muy altos")

    assert_equal foto, gasto.reload.second_approval_rules
    assert_empty regla.gastos_reasignados
  end

  test "solo cambia la parte de la foto que viene de esa regla" do
    regla = regla_doble
    otra = regla_doble(name: "Tipo con aprobación", max_invoice_value: 120_000,
                       second_approver_user: nil, second_approver_rol: rols(:gerente))
    gasto = crear(150_000)
    assert_equal 2, gasto.second_approval_rules.size

    cambiar_aprobador(regla, second_approver_user: @admin)
    foto = gasto.reload.second_approval_rules.index_by { |f| f["rule_id"] }

    assert_equal @admin.id, foto[regla.id]["user_id"]
    assert_equal rols(:gerente).id, foto[otra.id]["rol_id"]
    assert_nil foto[otra.id]["user_id"]
  end

  test "no es una edicion del gasto: no lo reabre ni le escribe historial de gasto" do
    regla = regla_doble
    gasto = crear(150_000)
    decidir(gasto, @dueno)

    assert_no_difference -> { RegisterEdit.where(module: "Gatos").count } do
      cambiar_aprobador(regla, second_approver_user: @admin)
    end
    assert gasto.reload.pendiente_segunda?
  end

  test "queda escrito en el historial de la regla, con el gasto que nadie puede firmar" do
    regla = regla_doble
    gasto = crear(150_000)
    decidir(gasto, @dueno)

    cambiar_aprobador(regla, second_approver_user: @dueno)

    registro = RegisterEdit.where(module: "Reglas de gastos").order(:id).last
    assert_match "GASTOS QUE PASAN AL NUEVO SEGUNDO APROBADOR", registro.description
    assert_match "Gasto ##{gasto.id}", registro.description
    assert_match "el nuevo aprobador dio la primera", registro.description
  end

  test "al nuevo aprobador le llega el aviso de los que ya tienen la primera firma" do
    regla = regla_doble
    pendiente = crear(150_000)
    decidir(pendiente, @dueno)
    crear(160_000) # en Creado: avisa solo cuando lo acepten
    ActionMailer::Base.deliveries.clear

    con_aviso_de_aprobacion do
      perform_enqueued_jobs { cambiar_aprobador(regla, second_approver_user: @admin) }
    end

    correos = ActionMailer::Base.deliveries.select { |m| m.subject.include?("segunda aprobación") }
    assert_equal 1, correos.size
    assert_equal [@admin.email], correos.first.to
  end
end
