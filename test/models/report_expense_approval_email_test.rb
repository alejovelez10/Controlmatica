require "test_helper"

# Aviso al dueño del centro de costos cuando un gasto nace SIN aceptar
# (EXPENSE_APPROVAL_EMAIL).
#
# LO QUE CUIDA ESTE ARCHIVO ES QUE EL CORREO NO SE MANDE cuando no toca. Un
# aviso de mas no se puede deshacer: ya esta en la bandeja de alguien. Por eso
# hay cuatro pruebas de "no manda" y solo una de "manda".
class ReportExpenseApprovalEmailTest < ActiveSupport::TestCase
  setup do
    @centro = cost_centers(:centro_con_viaticos)
    @dueno = users(:dueno_centro)

    # Misma deuda del legado que compensa report_expenses_controller_test:
    # CostCenter#change_state multiplica hour_cotizada * eng_hours sin guarda de
    # nil y revienta al recalcular el centro.
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
  end

  def atributos(**overrides)
    { user: users(:admin),
      cost_center: @centro,
      user_invoice: users(:ingeniero),
      invoice_name: "Hotel del aviso",
      invoice_date: Date.new(2026, 6, 1),
      invoice_number: "FE-MAIL-#{SecureRandom.hex(3)}",
      identification: "900111222",
      invoice_value: 10_000.0, invoice_tax: 0.0, invoice_total: 10_000.0 }.merge(overrides)
  end

  def crear(**overrides)
    as_user(users(:admin)) { ReportExpense.create!(atributos(**overrides)) }
  end

  test "el flag arranca apagado" do
    # ES EL DEFAULT Y ES LA CONDICION CON LA QUE SE PIDIO LA FEATURE: el codigo
    # entra listo pero callado, y se enciende cuando el resto este aprobado.
    refute ReportExpense.aviso_de_aprobacion?
  end

  test "con el flag apagado un gasto sin aceptar no manda correo" do
    assert_no_enqueued_emails { crear }
  end

  test "con el flag encendido un gasto sin aceptar avisa al dueño del centro" do
    con_aviso_de_aprobacion do
      assert_enqueued_emails 1 do
        gasto = crear
        refute gasto.is_acepted, "La prueba no vale si el gasto nacio aceptado"
      end
    end
  end

  test "el correo va dirigido al propietario del centro y no al responsable del gasto" do
    # La distincion es TODA la feature: el responsable es quien reporto el
    # gasto, el destinatario es quien responde por el presupuesto del centro.
    con_aviso_de_aprobacion do
      perform_enqueued_jobs { crear }
    end

    correo = ActionMailer::Base.deliveries.last
    assert_equal [@dueno.email], correo.to
    refute_includes correo.to, users(:ingeniero).email
  end

  test "con el flag encendido un gasto que nace aceptado no manda correo" do
    # La condicion es el ESTADO FINAL, no el motivo: si cupo en el presupuesto
    # nace aceptado y no hay nada que aprobar.
    con_aviso_de_aprobacion do
      assert_no_enqueued_emails { crear(is_acepted: true) }
    end
  end

  test "el import no manda correo aunque el flag este encendido" do
    # Un archivo de 300 filas no son 300 solicitudes de aprobacion. La marca la
    # pone ReportExpense.import fila por fila.
    con_aviso_de_aprobacion do
      assert_no_enqueued_emails do
        as_user(users(:admin)) do
          gasto = ReportExpense.new(atributos)
          gasto.omitir_aviso_de_aprobacion = true
          gasto.save!
        end
      end
    end
  end

  test "un centro sin propietario no manda correo" do
    @centro.update_columns(user_owner_id: nil)
    con_aviso_de_aprobacion do
      assert_no_enqueued_emails { crear }
    end
  end

  test "un propietario sin correo no manda correo" do
    # Dato incompleto, no un error: no hay a quien escribirle y el gasto se crea
    # igual. Si esto lanzara, un usuario sin email en la base tumbaria el
    # registro de gastos de todo su centro.
    @dueno.update_columns(email: "")
    con_aviso_de_aprobacion do
      assert_no_enqueued_emails { assert crear.persisted? }
    end
  end

  # --- motivo_de_retencion --------------------------------------------------
  #
  # Es el texto que el dueño lee en el correo para decidir. Su gemelo en JS es
  # `budgetWarning` (expenseIndicators.js) y el orden de preferencia es el mismo.

  test "motivo_de_retencion prefiere las reglas incumplidas sobre el motivo presupuestal" do
    gasto = crear
    gasto.update_columns(budget_status: ExpenseBudgetService::STATUS_EXCEDIDO,
                         budget_reason: "Excede el presupuesto disponible en $1.000",
                         rule_violations: [{ "message" => "Supera el tope por factura" }])

    assert_equal "Supera el tope por factura", gasto.reload.motivo_de_retencion
  end

  test "motivo_de_retencion cae al budget_reason y despues al estado" do
    gasto = crear
    gasto.update_columns(budget_status: ExpenseBudgetService::STATUS_EXCEDIDO,
                         budget_reason: "Excede el presupuesto disponible en $1.000")
    assert_equal "Excede el presupuesto disponible en $1.000", gasto.reload.motivo_de_retencion

    gasto.update_columns(budget_reason: nil,
                         budget_status: ExpenseBudgetService::STATUS_SIN_PRESUPUESTO)
    assert_equal "No tiene presupuesto asignado", gasto.reload.motivo_de_retencion
  end

  test "motivo_de_retencion es nil cuando no hay nada que explicar" do
    gasto = crear
    gasto.update_columns(budget_status: ExpenseBudgetService::STATUS_APROBADO, budget_reason: nil)

    assert_nil gasto.reload.motivo_de_retencion
  end

  # --- El correo de la DECISION, al responsable (2026-10-06) ----------------
  #
  # Mismo criterio que arriba: pesan mas las pruebas de "no manda". Este correo
  # se dispara en cada cambio de estado, que es la operacion mas frecuente de la
  # pantalla, asi que una guarda que falle convierte el modulo en una fuente de
  # spam.

  test "con el flag apagado aceptar un gasto no manda correo" do
    gasto = crear
    assert_no_enqueued_emails do
      as_user(users(:admin)) { gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }
    end
  end

  test "con el flag encendido aceptar avisa al responsable" do
    gasto = crear
    con_aviso_de_aprobacion do
      assert_enqueued_emails 1 do
        # El actor es el DUEÑO del centro y no el responsable: si decidiera el
        # propio responsable no se manda nada (prueba de abajo).
        as_user(@dueno) { gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }
      end
    end
  end

  test "con el flag encendido rechazar avisa al responsable" do
    gasto = crear
    con_aviso_de_aprobacion do
      assert_enqueued_emails 1 do
        as_user(@dueno) do
          gasto.rechazar(actor: @dueno, motivo: "No corresponde")
          gasto.save!
        end
      end
    end
  end

  test "NO se avisa a quien decidio sobre su propio gasto" do
    # Es el caso mas comun de esta aplicacion: mucha gente registra y acepta lo
    # suyo. Mandarse un correo a uno mismo contandose lo que acaba de hacer
    # entrena a la gente a ignorar estos avisos, que es justo lo que no se quiere
    # del unico correo que avisa de un rechazo.
    gasto = crear(user_invoice: users(:ingeniero))
    con_aviso_de_aprobacion do
      assert_no_enqueued_emails do
        as_user(users(:ingeniero)) { gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }
      end
    end
  end

  test "volver un gasto a Creado NO es una decision y no manda correo" do
    # Una reapertura no es una respuesta: de eso avisa el OTRO correo, el del
    # dueño del centro.
    gasto = crear
    as_user(@dueno) { gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }

    con_aviso_de_aprobacion do
      assert_no_enqueued_emails do
        as_user(@dueno) { gasto.update!(operational_state: ReportExpense::STATE_CREADO) }
      end
    end
  end

  test "guardar sin mover el estado no manda correo" do
    # Se guardan gastos todo el dia por otros motivos: corregir una descripcion
    # no es una decision sobre el gasto.
    gasto = crear
    con_aviso_de_aprobacion do
      assert_no_enqueued_emails do
        as_user(@dueno) { gasto.update!(description: "otra cosa") }
      end
    end
  end

  test "un gasto que nace aceptado solo no avisa de ninguna decision" do
    # La aceptacion automatica del presupuesto no la tomo ninguna persona.
    con_aviso_de_aprobacion do
      # El unico correo que puede salir aqui es el del dueño del centro, y
      # tampoco sale porque el gasto nace ACEPTADO.
      assert_no_enqueued_emails do
        as_user(users(:admin)) do
          ReportExpense.create!(atributos(budget_status: ExpenseBudgetService::STATUS_APROBADO))
        end
      end
    end
  end

  test "el import no manda avisos de decision" do
    gasto = crear
    con_aviso_de_aprobacion do
      assert_no_enqueued_emails do
        as_user(@dueno) do
          gasto.omitir_aviso_de_aprobacion = true
          gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO)
        end
      end
    end
  end

end
