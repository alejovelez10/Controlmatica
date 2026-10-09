require "test_helper"

# Reapertura al editar (M6 de las mejoras de octubre, docs/plan-gastos-ia/15).
#
# Editar un gasto ya decidido lo devuelve a "Creado" y le vuelve a avisar al
# dueño del centro: la decision se tomo sobre UNOS datos y, si cambian, ya no
# vale. Lo delicado no es reabrir, es NO reabrir cuando no toca: aceptar,
# rechazar, adjuntar el comprobante o el redondeo que el propio modelo hace al
# guardar no son ediciones, y si contaran, la decision se desharia sola en el
# mismo guardado que la tomo. Por eso la mayoria de las pruebas son de "no
# reabre".
class ReportExpenseReaperturaTest < ActiveSupport::TestCase
  setup do
    @admin = users(:admin)
    @centro = cost_centers(:centro_con_viaticos)
    @dueno = users(:dueno_centro)

    # Misma deuda del legado que compensan los demas archivos de gastos:
    # CostCenter#change_state multiplica hour_cotizada * eng_hours sin guarda de
    # nil y revienta al recalcular el centro.
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
  end

  def crear(**overrides)
    as_user(@admin) do
      ReportExpense.create!({ user: @admin, cost_center: @centro, user_invoice: users(:ingeniero),
                              invoice_name: "Hotel de la reapertura",
                              invoice_date: Date.new(2026, 6, 1),
                              invoice_number: "FE-RE-#{SecureRandom.hex(3)}",
                              identification: "900111222",
                              invoice_value: 10_000.0, invoice_tax: 0.0,
                              invoice_total: 10_000.0 }.merge(overrides))
    end
  end

  def aceptado
    gasto = crear(operational_state: ReportExpense::STATE_ACEPTADO)
    assert gasto.aceptado?, "La prueba no vale si el gasto no nacio aceptado"
    gasto
  end

  def rechazado
    gasto = crear
    as_user(@admin) do
      gasto.rechazar(actor: @admin, motivo: "No corresponde al proyecto")
      gasto.save!
    end
    gasto
  end

  def editar(gasto, **attrs)
    as_user(@admin) { gasto.update!(attrs) }
    gasto.reload
  end

  # La columna vieja, leida de la base y no del metodo derivado: `is_acepted`
  # ahora responde desde `operational_state` y nunca mostraria el desfase.
  def columna_is_acepted(gasto)
    ReportExpense.where(id: gasto.id).pick(:is_acepted)
  end

  # --- reabre ---------------------------------------------------------------

  test "editar un gasto aceptado lo devuelve a Creado" do
    gasto = editar(aceptado, invoice_value: 90_000.0, invoice_total: 90_000.0)

    assert gasto.creado?
  end

  test "al reabrir un aceptado la columna is_acepted tambien vuelve a false" do
    # ES EL SEGURO DEL PASO A: mientras `is_acepted` exista, revertir el codigo
    # tiene que bastar. Si la columna se queda en true, el codigo viejo veria
    # aceptado un gasto que la pantalla nueva muestra en "Creado".
    gasto = editar(aceptado, invoice_name: "Hotel corregido")

    assert gasto.creado?
    assert_equal false, columna_is_acepted(gasto)
  end

  test "editar un gasto rechazado lo devuelve a Creado y borra los datos del rechazo" do
    # Sin limpiarlos, la pantalla mostraria "Creado" junto a "Rechazado el 6 de
    # octubre porque...", y el siguiente correo contaria un motivo viejo.
    gasto = editar(rechazado, invoice_name: "Hotel corregido")

    assert gasto.creado?
    assert_nil gasto.rejected_at
    assert_nil gasto.rejected_by_id
    assert_nil gasto.rejection_reason
  end

  test "cualquier campo del usuario reabre, tambien las observaciones" do
    # Decision D4: CUALQUIER edicion, no solo las de plata.
    assert editar(aceptado, observations: "Faltaba aclarar el proyecto").creado?
  end

  # --- no reabre --------------------------------------------------------------

  test "aceptar no cuenta como edicion" do
    gasto = editar(crear, operational_state: ReportExpense::STATE_ACEPTADO)

    assert gasto.aceptado?
  end

  test "rechazar no cuenta como edicion" do
    assert rechazado.reload.rechazado?
  end

  test "aceptar un gasto con decimales de mas no lo devuelve a Creado" do
    # EL CASO QUE MOTIVO PONER LA REAPERTURA ANTES DE LA VALIDACION. Hay gastos
    # historicos con ruido de coma flotante guardado (1006416.3200000001), y el
    # modelo los redondea en CADA guardado (`redondear_cifras_de_dinero`). Si la
    # reapertura mirara despues del redondeo, veria `invoice_value` cambiado y
    # convertiria la aceptacion en una reapertura: el gasto volveria a "Creado"
    # en el mismo clic que lo acepto, sin ningun error.
    gasto = crear
    gasto.update_columns(invoice_value: 1_006_416.3200000001, invoice_total: 1_006_416.3200000001)

    gasto = editar(gasto.reload, operational_state: ReportExpense::STATE_ACEPTADO)

    assert gasto.aceptado?
  end

  test "rechazar un gasto con decimales de mas no lo devuelve a Creado" do
    gasto = crear(operational_state: ReportExpense::STATE_ACEPTADO)
    gasto.update_columns(invoice_value: 1_006_416.3200000001, invoice_total: 1_006_416.3200000001)
    gasto.reload

    as_user(@admin) do
      gasto.rechazar(actor: @admin, motivo: "Duplicado")
      gasto.save!
    end

    assert gasto.reload.rechazado?
  end

  test "adjuntar el comprobante no reabre" do
    # DECISION DEL 2026-10-09. El agente de WhatsApp crea el gasto y DESPUES le
    # adjunta el comprobante en un segundo guardado: si eso reabriera, todo
    # gasto de WhatsApp que nace aceptado por caber en el presupuesto volveria a
    # "Creado" segundos despues, y con el correo encendido el dueño del centro
    # recibiria un aviso por cada uno.
    gasto = aceptado
    as_user(@admin) do
      gasto.receipt_file = upload_fixture("comprobante.pdf")
      gasto.save!
    end

    assert gasto.reload.aceptado?
  end

  test "guardar sin cambios no reabre" do
    # Las reglas reescriben `rule_violations` en cada guardado: sin excluirlo,
    # cualquier save reabriria.
    gasto = aceptado
    as_user(@admin) { gasto.save! }

    assert gasto.reload.aceptado?
  end

  test "contabilizar no reabre" do
    gasto = editar(aceptado, accounting_approved: true,
                             accounting_approved_at: Time.zone.now,
                             accounting_approved_by_id: @admin.id)

    assert gasto.aceptado?
  end

  test "el import no reabre" do
    # Una correccion masiva de 300 filas no son 300 aprobaciones pendientes.
    gasto = aceptado
    gasto.omitir_aviso_de_aprobacion = true
    as_user(@admin) { gasto.update!(invoice_name: "Corregido por Excel") }

    assert gasto.reload.aceptado?
  end

  # --- el correo --------------------------------------------------------------

  test "con el flag encendido reabrir le avisa al dueño del centro" do
    gasto = aceptado

    con_aviso_de_aprobacion do
      perform_enqueued_jobs { editar(gasto, invoice_name: "Hotel corregido") }
    end

    correo = ActionMailer::Base.deliveries.last
    assert_not_nil correo, "Reabrir con el flag encendido tiene que mandar el aviso"
    assert_equal [@dueno.email], correo.to
  end

  test "con el flag apagado reabre pero no manda correo" do
    gasto = aceptado

    assert_no_enqueued_emails { editar(gasto, invoice_name: "Hotel corregido") }
    assert gasto.creado?
  end

  test "editar un gasto que ya esta en Creado no manda correo" do
    # No hay decision que deshacer: el aviso de cuando nacio sigue vigente.
    gasto = crear

    con_aviso_de_aprobacion do
      assert_no_enqueued_emails { editar(gasto, invoice_name: "Hotel corregido") }
    end
  end

  test "volver a Creado a mano desde la tabla no manda el aviso de reapertura" do
    # Es alguien deshaciendo su propia decision, no un dato que cambio.
    gasto = aceptado

    con_aviso_de_aprobacion do
      assert_no_enqueued_emails { editar(gasto, operational_state: ReportExpense::STATE_CREADO) }
    end
  end
end
