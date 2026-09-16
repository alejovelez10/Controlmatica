require "test_helper"

# Evaluacion de las reglas deterministas (paquete 14, tarea 3).
#
# LAS TRES REGLAS SE EVALUAN EN EL SERVIDOR Y ESO ES EL PUNTO ENTERO DEL
# PAQUETE: un gasto que entra por la web tiene que validarse exactamente igual
# que uno que entra por WhatsApp. Por eso los tests son de servicio y no de
# controller: lo que se prueba es la regla, no el canal.
#
# El texto semantico (`agent_instructions`) NO se evalua aqui: se expone. Que
# nunca aparezca en `violations` es tambien una asercion de este archivo.
class ExpenseRuleServiceTest < ActiveSupport::TestCase
  setup do
    @admin = users(:admin)
    @ingeniero = users(:ingeniero)
    @centro = cost_centers(:centro_con_viaticos)
    # El callback de reglas corre en cada save de gasto y las fixtures de gasto
    # no pueden depender de una regla concreta: cada test crea las suyas.
  end

  def regla(**attrs)
    as_user(@admin) do
      ExpenseRule.create!({ name: "Regla #{SecureRandom.hex(3)}", active: true,
                            check_duplicates: false, user: @admin }.merge(attrs))
    end
  end

  # Regla asignada al ROL del ingeniero. Desde 2026-09-10 las reglas se asignan
  # por rol, no persona por persona; el escenario es el mismo porque el ingeniero
  # es el unico usuario de su rol en las fixtures.
  def regla_del_ingeniero(**attrs)
    r = regla(**attrs)
    r.rols = [@ingeniero.rol]
    r
  end

  # Gasto SIN GUARDAR: el agente valida antes de crear y el servicio tiene que
  # aceptar un objeto nuevo.
  def gasto_nuevo(**attrs)
    ReportExpense.new({
        # Estas pruebas no cubren la regla del comprobante obligatorio
        # (ReportExpense#comprobante_obligatorio); adjuntarle un PDF a cada gasto
        # solo agregaria I/O. Los tres canales tienen su propia prueba.
        omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro, user_invoice: @ingeniero,
                        invoice_name: "Hotel", invoice_date: Date.current,
                        invoice_number: "FE-#{SecureRandom.hex(3)}", identification: "900111222",
                        invoice_value: 10_000, invoice_tax: 0, invoice_total: 10_000 }.merge(attrs))
  end

  def gasto_guardado(**attrs)
    as_user(@admin) { gasto_nuevo(**attrs).tap(&:save!) }
  end

  # Un gasto que YA incumple una regla. Desde que las reglas son duras
  # (validacion que bloquea) no se puede crear uno por la via normal, y aun asi
  # existen: son los gastos anteriores a la regla, o los registrados por WhatsApp
  # con la confirmacion expresa de la persona. `save(validate: false)` reproduce
  # esa situacion sin fabricar un camino que la aplicacion no tenga.
  def gasto_infractor(**attrs)
    as_user(@admin) { gasto_nuevo(**attrs).tap { |g| g.save(validate: false) } }
  end

  def violaciones(expense, **kwargs)
    ExpenseRuleService.validate(expense, **kwargs).value[:violations]
  end

  def codigos(expense, **kwargs)
    violaciones(expense, **kwargs).map { |v| v[:code] }
  end

  # --- Antiguedad -----------------------------------------------------------

  test "comprobante dentro del plazo no genera violaciones" do
    regla_del_ingeniero(max_invoice_age_days: 30)

    resultado = ExpenseRuleService.validate(gasto_nuevo(invoice_date: Date.current - 10))

    assert resultado.ok?
    assert_empty resultado.value[:violations]
  end

  test "comprobante vencido genera invoice_too_old con los dias reales" do
    regla_del_ingeniero(max_invoice_age_days: 30)

    v = violaciones(gasto_nuevo(invoice_date: Date.current - 45))

    assert_equal [ExpenseRuleService::CODE_TOO_OLD], v.map { |x| x[:code] }
    assert_equal "El comprobante tiene 45 días y el máximo son 30", v.first[:message]
  end

  test "el plazo es inclusivo: exactamente el maximo no viola" do
    regla_del_ingeniero(max_invoice_age_days: 30)

    assert_empty violaciones(gasto_nuevo(invoice_date: Date.current - 30))
  end

  test "invoice_date nula no evalua antiguedad y no revienta" do
    regla_del_ingeniero(max_invoice_age_days: 1)

    # Un gasto sin fecha es un dato incompleto, no una infraccion: no se inventa
    # una fecha ni se rechaza.
    assert_nothing_raised do
      assert_empty violaciones(gasto_nuevo(invoice_date: nil))
    end
  end

  test "la antiguedad se mide contra Date_current y no contra created_at" do
    regla_del_ingeniero(max_invoice_age_days: 10)
    # Gasto viejo REGISTRADO HOY: si se midiera contra created_at pasaria el
    # filtro, que es exactamente el fraude que la regla quiere evitar.
    gasto = gasto_infractor(invoice_date: Date.current - 60)
    gasto.update_columns(created_at: Time.current)

    assert_includes codigos(gasto.reload), ExpenseRuleService::CODE_TOO_OLD
  end

  # --- Tope de valor ---------------------------------------------------------

  test "valor por encima del tope genera invoice_value_exceeded" do
    regla_del_ingeniero(max_invoice_value: 100_000)

    v = violaciones(gasto_nuevo(invoice_total: 150_000))

    assert_equal [ExpenseRuleService::CODE_VALUE], v.map { |x| x[:code] }
    assert_includes v.first[:message], "supera el tope"
  end

  test "valor exactamente igual al tope no viola" do
    regla_del_ingeniero(max_invoice_value: 100_000)

    # Un tope de $100.000 que rechaza un gasto de $100.000 es incomprensible
    # para quien lo configura.
    assert_empty violaciones(gasto_nuevo(invoice_total: 100_000))
  end

  # --- Duplicados ------------------------------------------------------------

  test "duplicado con mismo numero y NIT genera duplicate_invoice" do
    regla_del_ingeniero(check_duplicates: true)
    existente = gasto_guardado(invoice_number: "FE-DUP", identification: "900111222")

    v = violaciones(gasto_nuevo(invoice_number: "FE-DUP", identification: "900111222"))

    assert_equal [ExpenseRuleService::CODE_DUPLICATE], v.map { |x| x[:code] }
    assert_includes v.first[:message], "##{existente.id}"
  end

  test "mismo numero pero distinto NIT no es duplicado" do
    regla_del_ingeniero(check_duplicates: true)
    gasto_guardado(invoice_number: "FE-DUP", identification: "900111222")

    assert_empty violaciones(gasto_nuevo(invoice_number: "FE-DUP", identification: "800999888"))
  end

  test "al editar un gasto no se acusa a si mismo de duplicado" do
    regla_del_ingeniero(check_duplicates: true)
    gasto = gasto_guardado(invoice_number: "FE-SOLO", identification: "900111222")

    # Sin el `where.not(id:)`, TODO gasto editado quedaria marcado como duplicado
    # de si mismo en cada guardado.
    assert_empty violaciones(gasto.reload)
  end

  test "invoice_number vacio no evalua duplicados" do
    regla_del_ingeniero(check_duplicates: true)
    gasto_guardado(invoice_number: nil, identification: "900111222")

    # Con campos vacios, media base de datos seria "duplicada" entre si.
    assert_empty violaciones(gasto_nuevo(invoice_number: nil, identification: "900111222"))
  end

  test "identification vacia no evalua duplicados" do
    regla_del_ingeniero(check_duplicates: true)
    gasto_guardado(invoice_number: "FE-SIN-NIT", identification: nil)

    assert_empty violaciones(gasto_nuevo(invoice_number: "FE-SIN-NIT", identification: nil))
  end

  test "check_duplicates false no evalua aunque haya duplicado" do
    regla_del_ingeniero(check_duplicates: false)
    gasto_guardado(invoice_number: "FE-DUP", identification: "900111222")

    assert_empty violaciones(gasto_nuevo(invoice_number: "FE-DUP", identification: "900111222"))
  end

  # --- Combinacion de varias reglas -----------------------------------------

  test "dos reglas con antiguedades 30 y 15 aplican la mas restrictiva" do
    regla_del_ingeniero(max_invoice_age_days: 30)
    regla_del_ingeniero(max_invoice_age_days: 15)

    # GANA LA MAS RESTRICTIVA. La alternativa —que la mas especifica sobrescriba
    # a la general— permitiria que ASIGNARLE una regla a alguien AFLOJE un
    # control, que es lo contrario de lo que espera quien administra.
    v = violaciones(gasto_nuevo(invoice_date: Date.current - 20))

    assert_equal [ExpenseRuleService::CODE_TOO_OLD], v.map { |x| x[:code] }
    assert_includes v.first[:message], "el máximo son 15"
  end

  test "dos reglas una con tope nulo y otra con tope aplican el que existe" do
    regla_del_ingeniero(max_invoice_value: nil)
    regla_del_ingeniero(max_invoice_value: 50_000)

    # `nil` significa "sin limite" y nunca puede ganarle a un numero: si el
    # minimo se calculara sin `compact`, nil ganaria y el tope desapareceria.
    assert_includes codigos(gasto_nuevo(invoice_total: 80_000)), ExpenseRuleService::CODE_VALUE
  end

  test "check_duplicates queda activo si alguna de las reglas lo pide" do
    regla_del_ingeniero(check_duplicates: false)
    regla_del_ingeniero(check_duplicates: true)
    gasto_guardado(invoice_number: "FE-DUP2", identification: "900111222")

    assert_includes codigos(gasto_nuevo(invoice_number: "FE-DUP2", identification: "900111222")),
                    ExpenseRuleService::CODE_DUPLICATE
  end

  test "las agent_instructions de varias reglas se concatenan en orden de nombre" do
    regla_del_ingeniero(name: "B regla", agent_instructions: "Segunda instruccion")
    regla_del_ingeniero(name: "A regla", agent_instructions: "Primera instruccion")
    regla_del_ingeniero(name: "C regla", agent_instructions: "   ")

    valor = ExpenseRuleService.validate(gasto_nuevo).value

    # Orden estable por nombre: sin el, el prompt del agente cambia de una
    # peticion a otra y las respuestas dejan de ser reproducibles. Las vacias no
    # aportan parrafos en blanco.
    assert_equal "Primera instruccion\n\nSegunda instruccion", valor[:agent_instructions]
  end

  test "el texto semantico nunca aparece como violacion" do
    regla_del_ingeniero(agent_instructions: "No se aceptan licores")

    resultado = ExpenseRuleService.validate(gasto_nuevo)

    # Lo semantico se EXPONE, no se evalua: el servidor no tiene criterio para
    # decidir si una cuenta de restaurante incluye licor.
    assert resultado.ok?
    assert_empty resultado.value[:violations]
    assert_includes resultado.value[:agent_instructions], "licores"
  end

  test "applied_rules trae los nombres de las reglas que se usaron" do
    regla_del_ingeniero(name: "Regla aplicada")

    assert_equal ["Regla aplicada"], ExpenseRuleService.validate(gasto_nuevo).value[:applied_rules]
  end

  # --- Sin reglas ------------------------------------------------------------

  test "usuario sin reglas y sin default da ok true sin violaciones" do
    resultado = ExpenseRuleService.validate(gasto_nuevo(invoice_date: Date.current - 3650,
                                                        invoice_total: 999_999_999))

    assert resultado.ok?
    assert_empty resultado.value[:violations]
    assert_empty resultado.value[:applied_rules]
    assert_equal "", resultado.value[:agent_instructions]
  end

  test "el usuario sin reglas propias hereda la regla por defecto" do
    default = regla(name: "Regla general", is_default: true, max_invoice_age_days: 10)

    v = violaciones(gasto_nuevo(invoice_date: Date.current - 40))

    assert_equal [ExpenseRuleService::CODE_TOO_OLD], v.map { |x| x[:code] }
    assert_equal [default.name], ExpenseRuleService.validate(gasto_nuevo).value[:applied_rules]
  end

  test "el parametro user manda sobre el responsable del gasto" do
    regla_del_ingeniero(max_invoice_age_days: 5)
    # El gasto es de otro responsable, pero se evalua contra las reglas del
    # ingeniero: es lo que necesita el agente cuando arma un borrador para
    # alguien distinto de quien escribe.
    gasto = gasto_nuevo(user_invoice: users(:contador), invoice_date: Date.current - 40)

    assert_empty codigos(gasto)
    assert_includes codigos(gasto, user: @ingeniero), ExpenseRuleService::CODE_TOO_OLD
  end

  # --- Efecto sobre el gasto -------------------------------------------------

  # LA REGLA SE INVIRTIO (2026-08-29): las reglas de gasto son DURAS. Antes este
  # test afirmaba `resultado.ok?` y comprobaba que el gasto se guardaba en
  # "sin_presupuesto"; ahora el guardado se rechaza y no se crea nada.
  test "un gasto con violacion NO se guarda, aunque quepa de sobra en el presupuesto" do
    regla(name: "Regla general", is_default: true, max_invoice_age_days: 5)

    gasto = ReportExpense.new(
        omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro, user_invoice: @ingeniero,
                              invoice_name: "Hotel viejo", invoice_date: Date.current - 60,
                              invoice_number: "FE-VIEJA", identification: "900111222",
                              invoice_value: 10_000, invoice_tax: 0, invoice_total: 10_000)

    resultado = nil
    assert_no_difference "ReportExpense.count" do
      resultado = ExpenseBudgetService.persist_with_evaluation!(gasto, actor: @admin)
    end

    # Cabe de sobra en la partida (700.000 asignados, 200.000 gastados) y aun asi
    # se rechaza: el presupuesto no salva a un gasto que rompe una regla.
    refute resultado.ok?
    assert_includes resultado.errors.join(" "), "El comprobante tiene 60 días"
  end

  # La otra mitad, y es la rama que el flag `mandatory` devolvio a la vida: con
  # la regla marcada como NO obligatoria el mismo gasto SI se guarda, y aplica la
  # regla de "no impide guardar, pero impide aprobar".
  #
  # ASI SE LLEGABA AQUI HASTA 2026-09-15: con `reglas_confirmadas_por_el_usuario`,
  # el escape de WhatsApp. Se retiro —una regla obligatoria no se puede confirmar—
  # y el disparador pasó a ser la configuracion de la regla, que es donde el
  # administrador puede verlo. Las aserciones son las mismas de entonces: lo que
  # cambio es QUIEN decide, no que pasa.
  test "con la regla no obligatoria el gasto se guarda pero no queda aprobado" do
    regla(name: "Regla general", is_default: true, max_invoice_age_days: 5, mandatory: false)

    gasto = ReportExpense.new(
        omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro, user_invoice: @ingeniero,
                              invoice_name: "Hotel viejo", invoice_date: Date.current - 60,
                              invoice_number: "FE-VIEJA-OK", identification: "900111222",
                              invoice_value: 10_000, invoice_tax: 0, invoice_total: 10_000)

    resultado = ExpenseBudgetService.persist_with_evaluation!(gasto, actor: @admin)

    assert resultado.ok?, resultado.errors.inspect
    gasto.reload
    refute_equal "aprobado", gasto.budget_status
    assert_includes gasto.budget_reason.to_s, "reglas de gasto"
    assert_equal 1, gasto.rule_violations.size
    assert_equal ExpenseRuleService::CODE_TOO_OLD, gasto.rule_violations.first["code"]
  end

  test "un gasto sin violaciones si queda aprobado y con rule_violations vacio" do
    regla(name: "Regla general", is_default: true, max_invoice_age_days: 90)

    gasto = ReportExpense.new(
        omitir_comprobante_obligatorio: true, user: @admin, cost_center: @centro, user_invoice: @ingeniero,
                              invoice_name: "Hotel de ayer", invoice_date: Date.current - 1,
                              invoice_number: "FE-NUEVA", identification: "900111222",
                              invoice_value: 10_000, invoice_tax: 0, invoice_total: 10_000)
    ExpenseBudgetService.persist_with_evaluation!(gasto, actor: @admin)

    gasto.reload
    assert_equal "aprobado", gasto.budget_status
    assert_empty gasto.rule_violations
  end

  test "las violaciones se persisten y no se recalculan al leer" do
    regla(name: "Regla general", is_default: true, max_invoice_age_days: 5)
    gasto = gasto_infractor(invoice_date: Date.current - 60)
    assert_equal 1, gasto.reload.rule_violations.size

    # El administrador afloja la regla DESPUES: el gasto de ayer no deja de estar
    # marcado de forma retroactiva. La foto se tomo cuando se registro.
    as_user(@admin) { ExpenseRule.find_by(name: "Regla general").update!(max_invoice_age_days: 365) }

    assert_equal 1, gasto.reload.rule_violations.size
  end

  test "el Result expone ok? y errors como el resto del proyecto" do
    regla_del_ingeniero(max_invoice_age_days: 1)

    resultado = ExpenseRuleService.validate(gasto_nuevo(invoice_date: Date.current - 30))

    assert resultado.error?
    refute resultado.ok?
    assert_kind_of Array, resultado.errors
    assert_equal 1, resultado.errors.size
  end

  # === QUE FRENA Y QUE SOLO AVISA (flag `mandatory`, 2026-09-15) =============
  #
  # ESTE BLOQUE EXISTE POR UN ERROR QUE ESTUVO A PUNTO DE COMETERSE: la idea
  # obvia al implementar el flag es marcar cada violacion con el `mandatory` de
  # "su" regla y filtrar. No se puede. `effective_limits` colapsa las N reglas
  # de la persona en UN tope tomando el minimo, asi que una violacion del tope
  # efectivo no tiene una regla dueña —por eso `violation` deja `rule` en nil—.
  # La unica forma honesta es resolver los limites otra vez usando SOLO las
  # reglas obligatorias, y eso es lo que estos tests fijan.

  test "la violacion que sale de una regla blanda NO frena, aunque el tope efectivo sea el suyo" do
    # La dura es la MAS FLOJA de las dos: 30 dias. La blanda es la estricta: 5.
    # El tope efectivo es 5 (gana la mas restrictiva), pero el que frena es 30.
    regla_del_ingeniero(name: "Dura floja",     max_invoice_age_days: 30, mandatory: true)
    regla_del_ingeniero(name: "Blanda estricta", max_invoice_age_days: 5,  mandatory: false)

    valor = ExpenseRuleService.validate(gasto_nuevo(invoice_date: Date.current - 10)).value

    # Se incumple el limite efectivo: la foto lo registra y cita los 5 dias.
    assert_equal 1, valor[:violations].size
    assert_equal ExpenseRuleService::CODE_TOO_OLD, valor[:violations].first[:code]
    assert_includes valor[:violations].first[:message], "el máximo son 5"

    # Pero NADA frena: 10 dias caben en los 30 de la unica regla obligatoria.
    assert_empty valor[:blocking_violations]
  end

  test "la misma pareja al reves SI frena: la estricta es la obligatoria" do
    regla_del_ingeniero(name: "Dura estricta", max_invoice_age_days: 5,  mandatory: true)
    regla_del_ingeniero(name: "Blanda floja",  max_invoice_age_days: 30, mandatory: false)

    valor = ExpenseRuleService.validate(gasto_nuevo(invoice_date: Date.current - 10)).value

    assert_equal 1, valor[:blocking_violations].size
    assert_equal ExpenseRuleService::CODE_TOO_OLD, valor[:blocking_violations].first[:code]
  end

  # EL MENSAJE DEL ERROR CITA EL TOPE QUE DE VERDAD FRENA, no el efectivo. Es la
  # consecuencia sutil del doble pase y se fija aqui a proposito: al usuario hay
  # que decirle el numero que tiene que respetar para poder guardar, no el de
  # una regla que no le va a cerrar la puerta.
  test "el tope que cita el bloqueo es el de la regla obligatoria, no el efectivo" do
    regla_del_ingeniero(name: "Dura",   max_invoice_value: 2_000_000, mandatory: true)
    regla_del_ingeniero(name: "Blanda", max_invoice_value: 200_000,   mandatory: false)

    valor = ExpenseRuleService.validate(gasto_nuevo(invoice_total: 3_000_000)).value

    assert_includes valor[:violations].first[:message],          "200.000"
    assert_includes valor[:blocking_violations].first[:message], "2.000.000"
  end

  # INVARIANTE DEL DISENO: las obligatorias son un SUBCONJUNTO, asi que su tope
  # nunca puede ser mas estricto que el efectivo. Si este test falla, alguien
  # cambio `effective_limits` para que una regla AFLOJE en vez de restringir.
  test "todo lo que frena esta tambien en la foto completa" do
    regla_del_ingeniero(name: "Dura",   max_invoice_age_days: 5, max_invoice_value: 100, mandatory: true)
    regla_del_ingeniero(name: "Blanda", max_invoice_age_days: 3, mandatory: false)

    valor = ExpenseRuleService.validate(
      gasto_nuevo(invoice_date: Date.current - 10, invoice_total: 5_000)
    ).value

    codigos_foto = valor[:violations].map { |v| v[:code] }
    valor[:blocking_violations].each { |v| assert_includes codigos_foto, v[:code] }
    assert_equal 2, valor[:blocking_violations].size
  end

  test "sin ninguna regla obligatoria no frena nada, ni con las tres reglas incumplidas" do
    regla_del_ingeniero(name: "Blanda todo", max_invoice_age_days: 1, max_invoice_value: 100,
                        check_duplicates: true, mandatory: false)
    # Un gasto real con la misma factura, para que el duplicado tenga con que chocar.
    gasto_nuevo(invoice_number: "FE-DUP", invoice_total: 1_000_000).save!(validate: false)

    valor = ExpenseRuleService.validate(
      gasto_nuevo(invoice_date: Date.current - 30, invoice_number: "FE-DUP", invoice_total: 1_000_000)
    ).value

    assert_equal 3, valor[:violations].size
    assert_empty valor[:blocking_violations]
    # `ok` sigue mirando la foto completa: hay algo que contarle a la persona
    # aunque no haya nada que frenarla.
    refute valor[:ok]
  end

  # EL DUPLICADO ES EL UNICO CHECK QUE VA A LA BASE y el doble pase no lo puede
  # consultar dos veces: seria duplicar una consulta en cada guardado de cada
  # gasto del sistema.
  test "el duplicado se consulta una sola vez aunque se resuelvan dos juegos de limites" do
    regla_del_ingeniero(name: "Dura dup", check_duplicates: true, mandatory: true)
    gasto_nuevo(invoice_number: "FE-UNICA").save!(validate: false)

    candidato = gasto_nuevo(invoice_number: "FE-UNICA")
    consultas = 0
    suscriptor = ActiveSupport::Notifications.subscribe("sql.active_record") do |*, datos|
      consultas += 1 if datos[:sql].to_s.include?("report_expenses") &&
                        datos[:sql].to_s.include?("invoice_number")
    end
    begin
      valor = ExpenseRuleService.validate(candidato).value
    ensure
      ActiveSupport::Notifications.unsubscribe(suscriptor)
    end

    assert_equal 1, consultas, "el check de duplicados se corrio dos veces"
    assert_equal ExpenseRuleService::CODE_DUPLICATE, valor[:violations].first[:code]
    assert_equal ExpenseRuleService::CODE_DUPLICATE, valor[:blocking_violations].first[:code]
  end

  test "una regla blanda que pide duplicados los anota pero no frena" do
    regla_del_ingeniero(name: "Blanda dup", check_duplicates: true, mandatory: false)
    gasto_nuevo(invoice_number: "FE-BLANDA").save!(validate: false)

    valor = ExpenseRuleService.validate(gasto_nuevo(invoice_number: "FE-BLANDA")).value

    assert_equal ExpenseRuleService::CODE_DUPLICATE, valor[:violations].first[:code]
    assert_empty valor[:blocking_violations]
  end
end
