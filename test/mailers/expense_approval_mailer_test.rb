require "test_helper"

# Contenido del correo de aprobacion. Lo que se prueba aqui es lo que el dueño
# del centro necesita para decidir SIN entrar a la aplicacion: cuanto, de quien,
# por que quedo retenido y el enlace.
class ExpenseApprovalMailerTest < ActionMailer::TestCase
  setup do
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
    @dueno = users(:dueno_centro)

    @gasto = as_user(users(:admin)) do
      ReportExpense.create!(user: users(:admin),
                            cost_center: @centro,
                            user_invoice: users(:ingeniero),
                            invoice_name: "Hotel del aviso",
                            invoice_date: Date.new(2026, 6, 1),
                            invoice_number: "FE-MAIL-001",
                            identification: "900111222",
                            invoice_value: 100_000.0, invoice_tax: 19_000.0, invoice_total: 119_000.0)
    end
    @gasto.update_columns(budget_status: ExpenseBudgetService::STATUS_EXCEDIDO,
                          budget_reason: "Excede el presupuesto disponible en $19.000")
    @gasto.reload
  end

  def correo = ExpenseApprovalMailer.pending_approval(@gasto, @dueno)

  test "va al propietario, con el codigo del centro en el asunto" do
    # El codigo en el ASUNTO no es adorno: quien es dueño de varios centros
    # filtra su bandeja sin abrir nada.
    assert_equal [@dueno.email], correo.to
    assert_match @centro.code, correo.subject
    assert_match(/pendiente de su aprobaci/i, correo.subject)
  end

  test "las dos partes del correo traen el valor, el responsable y el motivo" do
    # HTML Y TEXTO. Un multipart cuyo text/plain esta vacio o desactualizado se
    # ve roto en los clientes que prefieren texto, y ahi el aviso no sirve.
    [correo.html_part.body.to_s, correo.text_part.body.to_s].each do |cuerpo|
      assert_match "Hotel del aviso", cuerpo
      assert_match "119.000", cuerpo, "Falta el valor del gasto"
      assert_match users(:ingeniero).names, cuerpo, "Falta el responsable"
      assert_match "Excede el presupuesto disponible en $19.000", cuerpo, "Falta el motivo"
    end
  end

  test "el enlace lleva un token que resuelve a ESTE gasto" do
    enlace = correo.text_part.body.to_s[%r{https?://\S+}]
    assert enlace.present?, "El correo salio sin enlace de aprobacion"

    token = CGI.parse(URI.parse(enlace).query)["t"].first
    assert_equal @gasto.id, ExpenseApprovalToken.find_expense(token)&.id
  end

  test "el correo trae ademas el enlace a la lista de los centros a mi cargo" do
    # `?scope=owned_centers` es lo que hace que la pantalla abra ya parada en esa
    # pestaña (scopeInicial, en packs/ReportExpenseIndex.js). Sin el parametro el
    # dueño aterriza en "Mis gastos" y tiene que reencuadrar a mano.
    [correo.html_part.body.to_s, correo.text_part.body.to_s].each do |cuerpo|
      assert_match "/report_expenses?scope=owned_centers", CGI.unescapeHTML(cuerpo)
    end
  end

  test "el enlace usa el host configurado y no una ruta relativa" do
    # Un mailer no tiene request: sin action_mailer.default_url_options, armar
    # el correo revienta con ArgumentError y el aviso no sale NUNCA. Esta prueba
    # es la que avisa si alguien quita esa linea de config/application.rb.
    host = Rails.application.config.action_mailer.default_url_options[:host]
    assert_match host, correo.text_part.body.to_s
  end

  # --- Token ---------------------------------------------------------------

  test "un token manipulado o vencido no resuelve a ningun gasto" do
    assert_nil ExpenseApprovalToken.find_expense("esto-no-es-un-token")
    assert_nil ExpenseApprovalToken.find_expense("")
    assert_nil ExpenseApprovalToken.find_expense(nil)

    vencido = travel_to(ExpenseApprovalToken::CADUCIDAD.ago - 1.hour) do
      ExpenseApprovalToken.generate(@gasto)
    end
    assert_nil ExpenseApprovalToken.find_expense(vencido)
  end

  test "un token firmado para otro proposito no sirve aqui" do
    # `purpose` es lo que impide que una firma emitida en otra parte de la
    # aplicacion —con la misma llave secreta— sirva para aprobar gastos.
    ajeno = Rails.application.message_verifier(:expense_approval)
                 .generate(@gasto.id, purpose: "otra_cosa")

    assert_nil ExpenseApprovalToken.find_expense(ajeno)
  end

  # --- Correo de la decision al responsable (2026-10-06) --------------------

  def correo_de_decision(decisor = @dueno) = ExpenseApprovalMailer.decision(@gasto, decisor)

  test "la decision va al RESPONSABLE del gasto, no a quien lo creo" do
    # Son casi siempre la misma persona, pero cuando no lo son —un asistente
    # registra el gasto de un ingeniero— el que necesita enterarse es a quien se
    # le va a pagar o a quien hay que pedirle la factura corregida.
    assert_equal [users(:ingeniero).email], correo_de_decision.to
  end

  test "el asunto dice el resultado y el centro, sin abrir el correo" do
    as_user(users(:admin)) { @gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }

    assert_equal "Su gasto fue aprobado · #{@centro.code}", correo_de_decision.subject
  end

  test "el asunto de un rechazo dice rechazado" do
    as_user(users(:admin)) do
      @gasto.rechazar(actor: @dueno, motivo: "No corresponde")
      @gasto.save!
    end

    assert_equal "Su gasto fue rechazado · #{@centro.code}", correo_de_decision.subject
  end

  test "el correo de rechazo lleva el motivo en los dos formatos" do
    # El motivo es lo UNICO que le dice a la persona que hacer a continuacion.
    # Si se cae de una de las dos partes, el que lee en texto plano se queda sin
    # saber por que le rebotaron el gasto.
    as_user(users(:admin)) do
      @gasto.rechazar(actor: @dueno, motivo: "La factura no es de este centro")
      @gasto.save!
    end

    cuerpo = correo_de_decision.body.encoded

    assert_match "La factura no es de este centro", cuerpo
    assert_match(/rechazado/i, cuerpo)
  end

  test "el correo de rechazo dice como volver a intentarlo" do
    # Un rechazo que no explica el siguiente paso termina en una llamada.
    as_user(users(:admin)) do
      @gasto.rechazar(actor: @dueno, motivo: "x")
      @gasto.save!
    end

    assert_match(/al editarlo vuelve a quedar|editarlo vuelve/i, correo_de_decision.body.encoded)
  end

  test "el correo NO lleva ningun enlace con token" do
    # No hay nada que decidir: es un aviso de algo que ya paso. Un enlace con
    # token aqui seria una llave de 7 dias repartida sin motivo.
    as_user(users(:admin)) { @gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }

    refute_match "gastos/aprobar", correo_de_decision.body.encoded
    refute_match "gastos/rechazar", correo_de_decision.body.encoded
  end

end
