require "test_helper"

# Doble aprobacion de gastos (2026-10-18).
#
# Lo que mas importa de estas pruebas es lo que NO cambia: el pedido fue que
# fuera aditivo, que lo aprobado y lo que ya esta en camino siga igual. Por eso
# hay tantas pruebas de "sin doble aprobacion, como siempre" como del circuito
# nuevo.
class ReportExpenseDobleAprobacionTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @admin     = users(:admin)
    @ingeniero = users(:ingeniero)
    @dueno     = users(:dueno_centro)
    @gerente   = users(:gerente)
    @centro    = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0, user_owner_id: @dueno.id)
    # Las fixtures traen reglas activas; cada prueba ve solo las suyas.
    ExpenseRule.update_all(active: false)
    ActionMailer::Base.deliveries.clear
  end

  # Gastos de mas de $100.000 necesitan la segunda aprobacion de Gerencia.
  def regla_doble(**attrs)
    as_user(@admin) do
      ExpenseRule.create!({ name: "Montos altos", active: true, applies_to_all_roles: true,
                            mandatory: false, check_duplicates: false, max_invoice_value: 100_000,
                            requires_second_approval: true, second_approver_rol: rols(:gerente),
                            user: @admin }.merge(attrs))
    end
  end

  def crear(valor, **attrs)
    as_user(@admin) do
      ReportExpense.create!({ omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro,
                              user_invoice: @ingeniero, invoice_name: "Proveedor",
                              invoice_date: Date.current, invoice_number: "FE-DA-#{SecureRandom.hex(3)}",
                              identification: "900111222", invoice_value: valor, invoice_tax: 0,
                              invoice_total: valor }.merge(attrs))
    end
  end

  def decidir(gasto, quien, estado = ReportExpense::STATE_ACEPTADO)
    as_user(quien) { gasto.update(operational_state: estado) }
  end

  def columna_is_acepted(gasto)
    ReportExpense.where(id: gasto.id).pick(:is_acepted)
  end

  # --- lo que NO cambia ---------------------------------------------------------

  test "sin reglas de doble aprobacion, aceptar deja el gasto aceptado como siempre" do
    regla_doble(requires_second_approval: false, second_approver_rol: nil)
    gasto = crear(150_000)

    assert decidir(gasto, @dueno)
    assert gasto.reload.aceptado?
    assert_empty gasto.second_approval_rules
    assert columna_is_acepted(gasto)
  end

  test "un gasto que no incumple la regla no pide segunda aprobacion" do
    regla_doble
    gasto = crear(50_000)

    assert_empty gasto.second_approval_rules
    assert decidir(gasto, @dueno)
    assert gasto.reload.aceptado?
  end

  test "un gasto registrado antes de configurar la doble aprobacion se aprueba como siempre" do
    regla = regla_doble(requires_second_approval: false, second_approver_rol: nil)
    gasto = crear(150_000)

    as_user(@admin) { regla.update!(requires_second_approval: true, second_approver_rol: rols(:gerente)) }

    assert decidir(gasto, @dueno)
    assert gasto.reload.aceptado?, "Configurar la regla despues no puede cambiarle el circuito a un gasto en camino"
    assert_empty gasto.second_approval_rules
  end

  test "aprobar un gasto viejo con ruido de coma flotante no le saca la foto" do
    # El redondeo que el modelo hace en cada guardado aparece en `changed`; si
    # contara como edicion, aprobar un gasto historico le pediria segunda firma.
    regla = regla_doble(requires_second_approval: false, second_approver_rol: nil)
    gasto = crear(150_000)
    gasto.update_columns(invoice_value: 150_000.00000001, invoice_total: 150_000.00000001)
    as_user(@admin) { regla.update!(requires_second_approval: true, second_approver_rol: rols(:gerente)) }

    assert decidir(gasto.reload, @dueno)
    assert gasto.reload.aceptado?
  end

  test "un gasto ya aceptado no cambia al configurar la doble aprobacion" do
    regla = regla_doble(requires_second_approval: false, second_approver_rol: nil)
    gasto = crear(150_000)
    decidir(gasto, @dueno)
    as_user(@admin) { regla.update!(requires_second_approval: true, second_approver_rol: rols(:gerente)) }

    assert gasto.reload.aceptado?
    assert ReportExpense.aceptados.exists?(gasto.id)
  end

  # --- la foto ------------------------------------------------------------------

  test "el gasto que incumple la regla guarda quien da la segunda aprobacion y por que" do
    regla = regla_doble
    gasto = crear(150_000)

    foto = gasto.second_approval_rules.first
    assert_equal regla.id, foto["rule_id"]
    assert_equal rols(:gerente).id, foto["rol_id"]
    assert_match "Cargo:", foto["approver"]
    assert_match "tope", foto["reasons"].first
    assert gasto.creado?
  end

  test "una regla que pide doble aprobacion e impide guardar no se puede crear" do
    regla = ExpenseRule.new(name: "Mala", active: true, applies_to_all_roles: true, mandatory: true,
                            max_invoice_value: 100, requires_second_approval: true,
                            second_approver_rol: rols(:gerente))

    assert_not regla.valid?
    assert_match "impide guardar", regla.errors.full_messages.join
  end

  test "la doble aprobacion necesita un cargo o una persona" do
    regla = ExpenseRule.new(name: "Sin aprobador", active: true, applies_to_all_roles: true,
                            mandatory: false, max_invoice_value: 100, requires_second_approval: true)

    assert_not regla.valid?
    assert_match "elija el cargo o la persona", regla.errors.full_messages.join
  end

  test "quitar la doble aprobacion borra el aprobador, y elegir persona borra el cargo" do
    regla = regla_doble
    as_user(@admin) { regla.update!(second_approver_user: @gerente) }
    assert_nil regla.reload.second_approver_rol_id

    as_user(@admin) { regla.update!(requires_second_approval: false) }
    assert_nil regla.reload.second_approver_user_id
  end

  # --- el circuito --------------------------------------------------------------

  test "la primera aprobacion lo deja pendiente de la segunda, fuera de Contabilidad" do
    regla_doble
    gasto = crear(150_000)

    assert decidir(gasto, @dueno)
    gasto.reload
    assert gasto.pendiente_segunda?
    assert_equal @dueno.id, gasto.first_approved_by_id
    assert_not columna_is_acepted(gasto), "is_acepted manda a Contabilidad: tiene que seguir en false"
    assert_not ReportExpense.aceptados.exists?(gasto.id)
  end

  test "la segunda aprobacion de alguien del cargo lo acepta" do
    regla_doble
    gasto = crear(150_000)
    decidir(gasto, @dueno)

    assert decidir(gasto.reload, @gerente)
    gasto.reload
    assert gasto.aceptado?
    assert_equal @gerente.id, gasto.second_approved_by_id
    assert columna_is_acepted(gasto)
  end

  test "alguien que no es del cargo no puede dar la segunda aprobacion" do
    regla_doble
    gasto = crear(150_000)
    decidir(gasto, @dueno)

    assert_not decidir(gasto.reload, @admin)
    assert_match "le corresponde a Cargo", gasto.errors.full_messages.join
    assert gasto.reload.pendiente_segunda?
  end

  test "quien dio la primera aprobacion no puede dar la segunda" do
    regla_doble
    gasto = crear(150_000)
    decidir(gasto, @gerente)
    assert gasto.reload.pendiente_segunda?

    assert_not decidir(gasto, @gerente)
    assert_match "Usted dio la primera aprobación", gasto.errors.full_messages.join
  end

  test "con una persona como segundo aprobador solo ella puede darla" do
    regla_doble(second_approver_rol: nil, second_approver_user: @admin)
    gasto = crear(150_000)
    decidir(gasto, @dueno)

    assert_not decidir(gasto.reload, @gerente)
    assert decidir(gasto.reload, @admin)
    assert gasto.reload.aceptado?
  end

  test "pendiente de segunda aprobacion no se puede pedir directo" do
    regla_doble
    gasto = crear(150_000)

    assert_not decidir(gasto, @dueno, ReportExpense::STATE_PENDIENTE_SEGUNDA)
  end

  test "rechazar desde la segunda aprobacion lo deja rechazado y sin firmas" do
    regla_doble
    gasto = crear(150_000)
    decidir(gasto, @dueno)

    as_user(@gerente) do
      gasto.reload.rechazar(actor: @gerente, motivo: "No corresponde")
      assert gasto.save
    end
    gasto.reload
    assert gasto.rechazado?
    assert_nil gasto.first_approved_by_id
  end

  test "editar un gasto pendiente de la segunda lo devuelve a Creado sin firmas" do
    regla_doble
    gasto = crear(150_000)
    decidir(gasto, @dueno)

    as_user(@admin) { gasto.reload.update!(invoice_name: "Proveedor corregido") }
    gasto.reload
    assert gasto.creado?
    assert_nil gasto.first_approved_by_id
    assert gasto.pide_segunda_aprobacion?, "Sigue incumpliendo la regla: la foto se conserva"
  end

  test "editar el valor por debajo del tope le quita la segunda aprobacion" do
    regla_doble
    gasto = crear(150_000)

    as_user(@admin) { gasto.update!(invoice_value: 80_000, invoice_total: 80_000) }
    assert_empty gasto.reload.second_approval_rules
  end

  test "lo que encontro la IA sobrevive a una edicion sin comprobante nuevo" do
    regla = regla_doble(max_invoice_value: nil, agent_instructions: "No se acepta licor")
    gasto = as_user(@admin) do
      g = ReportExpense.new(omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro,
                            user_invoice: @ingeniero, invoice_name: "Bar", invoice_date: Date.current,
                            invoice_number: "FE-IA-1", identification: "900111222",
                            invoice_value: 50_000, invoice_tax: 0, invoice_total: 50_000)
      g.agent_policy_verdict = { compliant: false, findings: [{ rule_id: regla.id, message: "Trae whisky" }] }
      g.save!
      g
    end
    assert_equal ["Trae whisky"], gasto.second_approval_rules.first["ia_reasons"]

    as_user(@admin) { ReportExpense.find(gasto.id).update!(description: "Cena con cliente") }
    assert_equal ["Trae whisky"], gasto.reload.second_approval_rules.first["ia_reasons"]
  end

  # --- el rechazo de Contabilidad ------------------------------------------------

  test "Contabilidad rechaza un gasto con doble aprobacion igual que uno de una sola" do
    # Pedido del usuario (2026-10-18): con una o con dos aprobaciones, el
    # rechazo de Contabilidad deja el gasto "Rechazado", no lo devuelve.
    regla_doble
    gasto = crear(150_000)
    decidir(gasto, @dueno)
    decidir(gasto.reload, @gerente)

    as_user(users(:contador)) do
      gasto.reload.rechazar(actor: users(:contador))
      assert gasto.save(validate: false)
    end
    gasto.reload
    assert gasto.rechazado?
    assert_nil gasto.first_approved_by_id
    assert_nil gasto.second_approved_by_id
    assert_not columna_is_acepted(gasto)
  end

  # --- los correos ---------------------------------------------------------------

  test "la primera aprobacion le avisa a las personas del cargo" do
    regla_doble
    gasto = crear(150_000)

    con_aviso_de_aprobacion do
      perform_enqueued_jobs { decidir(gasto, @dueno) }
    end

    correo = ActionMailer::Base.deliveries.find { |m| m.subject.include?("segunda aprobación") }
    assert correo, "Tiene que salir el aviso de la segunda aprobacion"
    assert_includes correo.to, @gerente.email
    assert_includes correo.body.encoded, "gastos/aprobar"
  end

  test "sin doble aprobacion no sale ningun aviso de segunda aprobacion" do
    gasto = crear(150_000)

    con_aviso_de_aprobacion do
      perform_enqueued_jobs { decidir(gasto, @dueno) }
    end

    assert_not ActionMailer::Base.deliveries.any? { |m| m.subject.include?("segunda aprobación") }
  end
end
