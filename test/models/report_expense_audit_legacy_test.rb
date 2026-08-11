require "test_helper"

# GOLDEN TESTS del HTML de auditoria de ReportExpense.
#
# POR QUE EXISTE: `RegisterEdit.description` guarda HTML escrito a mano, con
# etiquetas mal cerradas, espacios de sobra y un NIT repetido dos veces. Ese HTML
# se renderiza tal cual en la pantalla de auditoria y hay anos de registros
# historicos con ese formato. El paquete 03 mueve el codigo que lo genera a un
# concern; estos 14 casos son el contrato de que el resultado no cambia NI UN
# BYTE.
#
# Se escribieron ANTES del refactor (tarea C1), corrieron en verde contra el
# codigo legado, y NO se tocaron despues.
#
# REGLA PARA LOS PAQUETES QUE VIENEN DESPUES (04 presupuesto, 06 comprobante):
# estos tests fallan a proposito cuando alguien agrega un campo auditado.
# Actualizar la constante esperada AGREGANDO el segmento nuevo al final es parte
# del trabajo de ese paquete. Nadie los borra ni los relaja.
#
# OJO CON EL EDITOR: las constantes de abajo tienen espacios significativos al
# final de varios segmentos (`</p> `). Un editor que recorte espacios finales
# rompe los golden por una razon invisible a simple vista.
class ReportExpenseAuditLegacyTest < ActiveSupport::TestCase
  HTML_CREACION =
    "<p><p><strong>(SE CREO EL SIGUIENTE REGISTRO)</strong></p>" \
    "<p>Centro de costo: <b>CM-ACME-01-2026</b></p>" \
    "<p>Usuario: <b>Juan Perez</b></p>" \
    " <p>Tipo de gasto: <b>Alimentación</b> </p>" \
    " <p>Medio de pago: <b>Efectivo</b> </p>" \
    " <p>Fecha:2026-07-14</b> </p>" \
    " <p>Nombre: Hotel Dann</b></p> " \
    " <p>Descripción: Hospedaje</b></p>" \
    " <p>NIT/IDENTIFICACIÓN: 900123456</b></p> " \
    " <p>Numero de factura:FE-4821</b></p> " \
    " <p>Valor: <b >1000.0</b></p>" \
    " <p>IVA: <b >190.0</b> " \
    " <p>Total: <b >1190.0</b> </p>" \
    " <p>NIT/IDENTIFICACIÓN: 900123456</b></p> "

  # El borrado usa el MISMO cuerpo y el MISMO encabezado "(SE CREO ...)".
  # Si, el texto dice "SE CREO" al eliminar. Es el comportamiento actual.
  HTML_BORRADO = HTML_CREACION

  ENCABEZADO_EDICION = "<p><p><strong>(SE EDITO EL SIGUIENTE REGISTRO)</strong></p>".freeze

  HTML_EDICION_VALOR =
    ENCABEZADO_EDICION +
    "<p>Valor: <b class='color-true'>1000.0</b> / <b class='color-false'>2000.0</b></p>"

  HTML_EDICION_DOS_CAMPOS =
    ENCABEZADO_EDICION +
    "<p>Valor: <b class='color-true'>1000.0</b> / <b class='color-false'>2000.0</b></p>" \
    "<p>IVA: <b class='color-true'>190.0</b> / <b class='color-false'>380.0</b></p>"

  # PAQUETE 04 — segmento de `budget_status`, AGREGADO AL FINAL.
  #
  # Los 14 golden de arriba no se tocan: `budget_status` es el ultimo elemento de
  # `edit_fields`, asi que mientras no cambie su segmento renderiza "" y el HTML
  # de los casos existentes queda byte a byte igual. Esta constante fija donde
  # aterriza el segmento nuevo cuando SI cambia, que es lo unico que el paquete
  # 04 agrega al contrato. El paquete 06 hara lo mismo con `receipt_file`,
  # despues de este.
  HTML_EDICION_VALOR_Y_ESTADO_PRESUPUESTAL =
    HTML_EDICION_VALOR +
    "<p>Estado presupuestal: <b class='color-true'>sin_presupuesto</b> / " \
    "<b class='color-false'>aprobado</b></p>"

  setup do
    @actor = users(:admin)
    # Centro de costo con el code exacto del contrato.
    @centro = cost_centers(:centro_con_viaticos)
    # Las fixtures de usuario y de opciones no tienen los literales del contrato
    # ("Juan Perez", "Alimentación" con tilde, "Efectivo"), y son archivos de
    # otro paquete: se crean aqui en vez de tocarlas.
    @responsable = User.create!(email: "juan.perez.golden@controlmatica.test",
                                password: AuthenticationHelpers::FIXTURE_PASSWORD,
                                names: "Juan Perez", last_names: "Perez",
                                rol: rols(:ingeniero), document_type: "CC",
                                number_document: 100_000_900)
    @tipo = ReportExpenseOption.create!(name: "Alimentación", category: "Tipo", user_id: @actor.id)
    @pago = ReportExpenseOption.create!(name: "Efectivo", category: "Medio de pago", user_id: @actor.id)
  end

  def crear_gasto(**overrides)
    atributos = {
      user_id: @actor.id,
      cost_center_id: @centro.id,
      user_invoice_id: @responsable.id,
      type_identification_id: @tipo.id,
      payment_type_id: @pago.id,
      invoice_date: Date.new(2026, 7, 14),
      invoice_name: "Hotel Dann",
      description: "Hospedaje",
      identification: "900123456",
      invoice_number: "FE-4821",
      invoice_value: 1000.0,
      invoice_tax: 190.0,
      invoice_total: 1190.0
    }.merge(overrides)

    as_user(@actor) { ReportExpense.create!(atributos) }
  end

  def test_html_de_creacion_es_identico_al_legado
    crear_gasto
    assert_equal HTML_CREACION, RegisterEdit.last.description
  end

  def test_atributos_del_registro_de_creacion
    gasto = crear_gasto
    registro = RegisterEdit.last

    assert_equal "creo", registro.type_edit
    assert_equal "Gatos", registro.module
    assert_equal "pending", registro.state
    assert_equal gasto.id, registro.register_user_id
    assert_equal @actor.id, registro.user_id
    assert_equal Date.current, registro.date_update
  end

  def test_creacion_genera_un_solo_register_edit
    # CASO BORDE: el controller hace `create` y despues `save`, y ese save sin
    # cambios dispara before_update. El umbral 59 es lo unico que impide el
    # RegisterEdit fantasma.
    assert_difference("RegisterEdit.count", 1) do
      gasto = crear_gasto
      as_user(@actor) { gasto.save }
    end
  end

  def test_html_de_borrado_es_identico_al_de_creacion
    gasto = crear_gasto
    as_user(@actor) { gasto.destroy }
    assert_equal HTML_BORRADO, RegisterEdit.last.description
  end

  def test_atributos_del_registro_de_borrado
    gasto = crear_gasto
    as_user(@actor) { gasto.destroy }
    assert_equal "elimino", RegisterEdit.last.type_edit
  end

  def test_html_de_edicion_un_solo_campo
    gasto = crear_gasto
    as_user(@actor) { gasto.update!(invoice_value: 2000.0) }
    assert_equal HTML_EDICION_VALOR, RegisterEdit.last.description
  end

  def test_edicion_pone_el_valor_viejo_en_color_true
    gasto = crear_gasto
    as_user(@actor) { gasto.update!(invoice_value: 2000.0) }
    # Rareza: en escalares el valor VIEJO va en color-true y el nuevo en color-false.
    assert_includes RegisterEdit.last.description, "<b class='color-true'>1000.0</b>"
    assert_includes RegisterEdit.last.description, "<b class='color-false'>2000.0</b>"
  end

  def test_edicion_de_asociacion_ordena_por_id_no_por_viejo_nuevo
    # Rareza: en asociaciones se hace Klass.where(id: attr_change) y se usa
    # names[1] en color-true y names[0] en color-false. El orden lo decide la
    # consulta, NO viejo/nuevo, asi que aqui el valor NUEVO acaba en color-true.
    gasto = crear_gasto
    otro = cost_centers(:centro_ajeno)

    as_user(@actor) { gasto.update!(cost_center_id: otro.id) }
    html = RegisterEdit.last.description

    orden = CostCenter.where(id: [@centro.id, otro.id]).map(&:code)
    assert_equal "<p>Centro de costo: <b class='color-true'>#{orden[1]}</b> / " \
                 "<b class='color-false'>#{orden[0]}</b></p>",
                 html.sub(ENCABEZADO_EDICION, "")
    # Y la demostracion de la rareza: los dos centros salen, pero cual cae en
    # color-true lo decide EL ORDEN DE LA CONSULTA, no viejo/nuevo.
    #
    # ESTAS DOS LINEAS FIJABAN LA DIRECCION (`otro` en color-true) y eran
    # INTERMITENTES: `CostCenter.where(id: [...])` no lleva ORDER BY, asi que el
    # orden depende del plan que elija PostgreSQL. Con seq scan devuelve las
    # filas en orden fisico (el de las fixtures) y con bitmap index scan sobre
    # la PK las devuelve por id, que en las fixtures es un hash de la etiqueta y
    # va al reves. En cuanto la tabla acumula tuplas muertas —cualquier test que
    # actualice un centro, por ejemplo el de multimoneda— el planificador cambia
    # y este test fallaba una de cada ~15 corridas.
    #
    # La asercion NO se relaja: se afirma exactamente lo mismo que el comentario
    # del encabezado dice, contra el orden real de la consulta.
    assert_includes html, "<b class='color-true'>#{orden[1]}</b>"
    assert_includes html, "<b class='color-false'>#{orden[0]}</b>"
    assert_equal [@centro.code, otro.code].sort, orden.sort,
                 "los dos centros deben aparecer, en el orden que devuelva la consulta"
  end

  def test_edicion_sin_cambios_no_crea_register_edit
    gasto = crear_gasto
    assert_no_difference("RegisterEdit.count") do
      as_user(@actor) { gasto.save! }
    end
  end

  def test_edicion_de_dos_campos_concatena_sin_separador
    gasto = crear_gasto
    as_user(@actor) { gasto.update!(invoice_value: 2000.0, invoice_tax: 380.0) }
    assert_equal HTML_EDICION_DOS_CAMPOS, RegisterEdit.last.description
  end

  def test_edicion_de_nombre_lleva_el_mayor_que_de_sobra
    gasto = crear_gasto
    as_user(@actor) { gasto.update!(invoice_name: "Hotel Otro") }
    assert_includes RegisterEdit.last.description, "<p>>Nombre:"
  end

  def test_edicion_de_descripcion_va_sin_tilde
    gasto = crear_gasto
    as_user(@actor) { gasto.update!(description: "Otra cosa") }
    html = RegisterEdit.last.description
    assert_includes html, "<p>Descripcion:"
    refute_includes html, "<p>Descripción:"
  end

  # PAQUETE 04. No relaja ni reordena ninguno de los 14 golden anteriores: los
  # complementa fijando que el segmento nuevo va DESPUES del de Valor, que es lo
  # que el orden de merge (04 antes que 06) tiene que preservar.
  def test_html_de_edicion_incluye_budget_status_al_final
    gasto = crear_gasto
    as_user(@actor) { gasto.update!(invoice_value: 2000.0, budget_status: "aprobado") }

    assert_equal HTML_EDICION_VALOR_Y_ESTADO_PRESUPUESTAL, RegisterEdit.last.description
  end

  # El otro lado del contrato: `budget_status` NO se audita en creacion ni en
  # borrado, asi que HTML_CREACION y HTML_BORRADO no cambian.
  def test_budget_status_no_aparece_en_creacion_ni_en_borrado
    gasto = crear_gasto
    refute_includes RegisterEdit.last.description, "Estado presupuestal"

    as_user(@actor) { gasto.destroy }
    refute_includes RegisterEdit.last.description, "Estado presupuestal"
  end

  def test_creacion_repite_nit_dos_veces
    crear_gasto
    assert_equal 2, RegisterEdit.last.description.scan("NIT/IDENTIFICACIÓN").size
  end

  def test_creacion_con_asociaciones_nulas_omite_esos_segmentos
    crear_gasto(type_identification_id: nil, payment_type_id: nil)
    html = RegisterEdit.last.description

    refute_includes html, "Tipo de gasto"
    refute_includes html, "Medio de pago"
    # El resto del HTML queda intacto: los segmentos vacios siguen aportando sus
    # separadores, asi que quedan tres espacios seguidos donde estaban.
    esperado = HTML_CREACION
               .sub("<p>Tipo de gasto: <b>Alimentación</b> </p>", "")
               .sub("<p>Medio de pago: <b>Efectivo</b> </p>", "")
    assert_equal esperado, html
  end
end
