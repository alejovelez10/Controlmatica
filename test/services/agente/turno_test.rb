# frozen_string_literal: true

require "test_helper"
require "minitest/mock"

# El agente de WhatsApp (paquete 17) con un Claude falso: cero red y cero
# tokens. Las tools del MCP corren de verdad, en proceso, contra la base de
# pruebas.
class Agente::TurnoTest < ActiveSupport::TestCase
  include McpTestHelpers

  setup do
    @usuario = users(:ingeniero)
    @centro = cost_centers(:centro_con_viaticos)
    @centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0)
    ExpenseRule.update_all(active: false)
    @conversacion = WhatsappConversation.create!(user: @usuario, wa_id: "573001234567",
                                                 last_inbound_at: Time.current)
    @whatsapp = FakeWhatsappClient.new
    @respondedor = Whatsapp::Respondedor.new(destino: { wa_id: "573001234567" }, usuario: @usuario,
                                             conversacion: @conversacion, client: @whatsapp)
    @mcp_previo = ENV["MCP_API_KEY"]
    ENV["MCP_API_KEY"] = VALID_KEY
  end

  teardown do
    ENV["MCP_API_KEY"] = @mcp_previo
  end

  def entrante(texto = "hola", tipo: "text", payload: {}, wamid: "wamid.#{SecureRandom.hex(4)}", **extra)
    WhatsappMessage.create!({ wamid: wamid, direction: WhatsappMessage::ENTRANTE, wa_id: "573001234567",
                              message_type: tipo, body: texto, payload: payload, user: @usuario,
                              whatsapp_conversation: @conversacion }.merge(extra))
  end

  def con_archivo(fixture: "comprobante_factura.jpg", mime: "image/jpeg")
    mensaje = entrante("", tipo: "image", media_id: "media-1", media_mime: mime, media_filename: fixture)
    mensaje.media_file = File.open(Rails.root.join("test/fixtures/files", fixture))
    mensaje.save!
    mensaje
  end

  def turno(mensaje, *respuestas)
    @claude = FakeClaudeClient.new(*respuestas)
    Agente::Turno.new(mensaje: mensaje, usuario: @usuario, conversacion: @conversacion,
                      respondedor: @respondedor, claude: @claude).call
  end

  def boton(id, titulo)
    entrante(titulo, tipo: "interactive", payload: { interactive: { type: "button_reply",
                                                                    button_reply: { id: id, title: titulo } } })
  end

  def args_de_gasto(extra = {})
    { cost_center_id: @centro.id, type_identification_id: report_expense_options(:opcion_tipo).id,
      payment_type_id: report_expense_options(:opcion_pago).id, invoice_name: "Restaurante El Sol",
      invoice_date: Date.current.iso8601, invoice_value: 45_000, invoice_tax: 0, invoice_total: 45_000,
      currency: "COP", description: "Almuerzo", hallazgos_politica: [],
      resumen: "Voy a registrar este gasto:\n\n*Total:* $45.000" }.merge(extra)
  end

  def borrador
    @conversacion.reload.estado["borrador"]
  end

  # ---- conversacion ---------------------------------------------------------

  test "contesta con el texto del modelo y guarda el historial con el contexto de quien escribe" do
    turno(entrante("hola"), FakeClaudeClient.texto("¡Hola! ¿Qué quieres registrar?"))

    assert_equal ["¡Hola! ¿Qué quieres registrar?"], @whatsapp.textos
    @conversacion.reload
    assert_equal 2, @conversacion.messages.size
    contexto = @conversacion.messages.first["content"].first["text"]
    assert_includes contexto, "[Contexto] Te escribe"
    assert_includes contexto, Time.current.in_time_zone("America/Bogota").to_date.iso8601
    assert @conversacion.prompt_version.present?
    assert_equal 100, @conversacion.input_tokens
    assert_equal 50, @conversacion.cache_read_tokens
  end

  test "el prompt de sistema y las herramientas van con cache y el modelo configurado" do
    turno(entrante("hola"), FakeClaudeClient.texto("ok"))
    cuerpo = @claude.pedidos.first[:cuerpo]

    assert_equal "claude-sonnet-5-5", cuerpo[:model]
    assert_equal({ type: "ephemeral" }, cuerpo[:system].first[:cache_control])
    assert_equal({ type: "ephemeral" }, cuerpo[:cache_control])
    assert_equal "drop_block", cuerpo.dig(:thinking, :block_binding, :prefix_mismatch_behavior)
    nombres = cuerpo[:tools].map { |t| t["name"] }
    assert_includes nombres, "proponer_gasto"
    assert_includes nombres, "cost_centers_list"
    refute_includes nombres, "report_expenses_create", "crear lo hace el boton, no el modelo"
  end

  test "ejecuta una tool del MCP en proceso y le devuelve el resultado al modelo" do
    turno(entrante("¿qué tipos de gasto hay?"),
          FakeClaudeClient.tools(["report_expense_options_list", { category: "Tipo" }]),
          FakeClaudeClient.texto("1. Alimentacion"))

    resultado = @claude.pedidos.last[:cuerpo][:messages].last["content"].first
    assert_equal "tool_result", resultado["type"]
    refute resultado["is_error"]
    assert_includes resultado["content"], "Alimentacion"
    assert_equal ["1. Alimentacion"], @whatsapp.textos
  end

  test "una tool que no esta en la lista del agente no se ejecuta" do
    assert_no_difference -> { ReportExpense.count } do
      turno(entrante("registralo"),
            FakeClaudeClient.tools(["report_expenses_create", { cost_center_id: @centro.id }]),
            FakeClaudeClient.texto("No puedo"))
    end
    resultado = @claude.pedidos.last[:cuerpo][:messages].last["content"].first
    assert resultado["is_error"]
  end

  test "records_search sobre users se niega" do
    turno(entrante("busca usuarios"),
          FakeClaudeClient.tools(["records_search", { entity: "users", q: "a" }]),
          FakeClaudeClient.texto("No puedo"))
    resultado = @claude.pedidos.last[:cuerpo][:messages].last["content"].first
    assert resultado["is_error"]
    assert_includes resultado["content"], "usuarios"
  end

  test "ofrecer_opciones manda botones y termina el turno sin volver a llamar al modelo" do
    turno(entrante("hola"),
          FakeClaudeClient.tools(["ofrecer_opciones", { texto: "¿Qué quieres registrar?",
                                                        opciones: ["Gasto", "Reporte de servicio"] }]))

    envio = @whatsapp.enviados.last
    assert_equal :botones, envio[:tipo]
    assert_equal ["Gasto", "Reporte de servicio"], envio[:botones].map { |b| b[:titulo] }
    assert_equal 1, @claude.pedidos.size
    assert_equal "tool_result", @conversacion.reload.messages.last["content"].first["type"]
  end

  test "con mas de tres opciones manda una lista" do
    opciones = %w[CC-1 CC-2 CC-3 CC-4]
    turno(entrante("hola"), FakeClaudeClient.tools(["ofrecer_opciones", { texto: "¿Cuál centro?", opciones: opciones }]))
    assert_equal :lista, @whatsapp.enviados.last[:tipo]
  end

  # ---- proponer y confirmar -------------------------------------------------

  test "proponer_gasto guarda el borrador y manda el resumen con Confirmar, Corregir y Cancelar" do
    turno(entrante("listo"), FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))

    envio = @whatsapp.enviados.last
    assert_equal :botones, envio[:tipo]
    assert_equal %w[Confirmar Corregir Cancelar], envio[:botones].map { |b| b[:titulo] }
    assert_equal "pendiente", borrador["estado"]
    assert_equal "borrador:confirmar:#{borrador['id']}", envio[:botones].first[:id]
    assert_equal 0, ReportExpense.where(invoice_name: "Restaurante El Sol").count, "proponer no guarda"
  end

  test "un aviso que el modelo ya puso en su resumen no se repite" do
    as_user(users(:admin)) do
      ExpenseRule.create!(name: "Tope", active: true, applies_to_all_roles: true, check_duplicates: false,
                          mandatory: false, max_invoice_value: 10_000)
    end
    resumen = "Voy a registrar este gasto:\n\n⚠️ El valor supera el tope de $10.000"
    turno(entrante("listo"), FakeClaudeClient.tools(["proponer_gasto", args_de_gasto(resumen: resumen)]))

    texto = @whatsapp.enviados.last[:texto]
    assert_equal 1, texto.scan("supera el tope").size
    assert_equal "pendiente", borrador["estado"]
  end

  test "proponer_gasto con una moneda invalida no manda botones y le explica al modelo" do
    turno(entrante("listo"), FakeClaudeClient.tools(["proponer_gasto", args_de_gasto(currency: "XYZ")]),
          FakeClaudeClient.texto("¿En qué moneda?"))
    assert_nil borrador
    assert @claude.pedidos.last[:cuerpo][:messages].last["content"].first["is_error"]
  end

  test "Confirmar crea el gasto, adjunta la foto y cierra la conversacion" do
    foto = con_archivo
    turno(foto, FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
    id = borrador["id"]

    assert_difference -> { ReportExpense.count }, 1 do
      turno(boton("borrador:confirmar:#{id}", "Confirmar"))
    end

    gasto = ReportExpense.order(:id).last
    assert_equal @usuario.id, gasto.user_invoice_id
    assert_equal "Restaurante El Sol", gasto.invoice_name
    assert gasto.receipt_file.present?, "la foto de la conversacion queda como comprobante"
    assert_includes @whatsapp.textos.last, "quedó registrado el gasto *##{gasto.id}*"
    assert_includes @whatsapp.textos.last, "Comprobante adjunto"
    @conversacion.reload
    refute @conversacion.abierta?
    assert_equal "registro", @conversacion.closed_reason
    assert_equal "creado", @conversacion.estado.dig("borrador", "estado")
  end

  test "un segundo Confirmar del mismo borrador no duplica el gasto" do
    turno(entrante("listo"), FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
    id = borrador["id"]
    turno(boton("borrador:confirmar:#{id}", "Confirmar"))

    assert_no_difference -> { ReportExpense.count } do
      turno(boton("borrador:confirmar:#{id}", "Confirmar"))
    end
  end

  test "un si escrito confirma cuando hay un borrador pendiente" do
    turno(entrante("listo"), FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
    assert_difference -> { ReportExpense.count }, 1 do
      turno(entrante("Sí"))
    end
  end

  test "un si escrito sin borrador pendiente va al modelo como cualquier mensaje" do
    turno(entrante("si"), FakeClaudeClient.texto("¿Sí a qué?"))
    assert_equal ["¿Sí a qué?"], @whatsapp.textos
  end

  test "Cancelar no guarda nada y cierra la conversacion" do
    turno(entrante("listo"), FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
    assert_no_difference -> { ReportExpense.count } do
      turno(boton("borrador:cancelar:#{borrador['id']}", "Cancelar"))
    end
    assert_equal "Listo, no guardé nada.", @whatsapp.textos.last
    assert_equal "cancelado", @conversacion.reload.closed_reason
  end

  test "un borrador vencido no se crea" do
    turno(entrante("listo"), FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
    viejo = borrador.merge("creado_en" => 20.minutes.ago.iso8601)
    @conversacion.update!(estado: @conversacion.estado.merge("borrador" => viejo))

    assert_no_difference -> { ReportExpense.count } do
      turno(boton("borrador:confirmar:#{viejo['id']}", "Confirmar"))
    end
    assert_includes @whatsapp.textos.last, "venció"
  end

  test "Corregir le pasa el pedido al modelo" do
    turno(entrante("listo"), FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
    turno(boton("borrador:corregir:#{borrador['id']}", "Corregir"), FakeClaudeClient.texto("¿Qué dato corrijo?"))

    ultimo = @claude.pedidos.last[:cuerpo][:messages].last["content"].last["text"]
    assert_equal "Quiero corregir algo del resumen.", ultimo
  end

  test "si el servidor rechaza al confirmar, avisa y deja la nota para el modelo" do
    turno(entrante("listo"), FakeClaudeClient.tools(["proponer_gasto", args_de_gasto]))
    # Entre proponer y confirmar, el tipo dejo de ser valido (un id de otra categoria).
    invalido = borrador.deep_dup
    invalido["args"]["type_identification_id"] = report_expense_options(:opcion_pago).id
    @conversacion.update!(estado: @conversacion.estado.merge("borrador" => invalido))

    assert_no_difference -> { ReportExpense.count } do
      turno(boton("borrador:confirmar:#{borrador['id']}", "Confirmar"))
    end
    assert_includes @whatsapp.textos.last, "No pude registrarlo"
    assert_includes @conversacion.reload.messages.last["content"], "[Sistema]"
  end

  test "un gasto que incumple una regla obligatoria por lo que se ve en el comprobante no se propone" do
    regla = as_user(users(:admin)) do
      ExpenseRule.create!(name: "Sin licor", active: true, applies_to_all_roles: true, check_duplicates: false,
                          mandatory: true, agent_instructions: "No se aceptan bebidas alcohólicas.")
    end
    turno(entrante("listo"),
          FakeClaudeClient.tools(["proponer_gasto",
                                  args_de_gasto(hallazgos_politica: [{ rule_id: regla.id, motivo: "Incluye una cerveza" }])]),
          FakeClaudeClient.texto("No se puede registrar así"))

    assert_nil borrador
    resultado = @claude.pedidos.last[:cuerpo][:messages].last["content"].first
    assert resultado["is_error"]
    assert_includes resultado["content"], "NO se puede registrar"
  end

  test "proponer_reporte y Confirmar crean el reporte de servicio" do
    contacto = Contact.create!(name: "Laura Gómez", customer_id: @centro.customer_id, user_id: users(:admin).id)
    @centro.update_columns(hour_real: 100_000)
    args = { cost_center_id: @centro.id, contact_id: contacto.id, report_date: Date.current.iso8601,
             working_time: 2, displacement_hours: 1, viatic_value: 0, work_description: "Mantenimiento",
             resumen: "Voy a registrar este reporte de servicio:" }
    turno(entrante("listo"), FakeClaudeClient.tools(["proponer_reporte", args]))

    assert_difference -> { Report.count }, 1 do
      turno(boton("borrador:confirmar:#{borrador['id']}", "Confirmar"))
    end
    assert_includes @whatsapp.textos.last, "quedó registrado el reporte"
    assert_equal @usuario.id, Report.order(:id).last.report_execute_id
  end

  # ---- archivos -------------------------------------------------------------

  test "la foto viaja al modelo en base64 y en la base queda solo la referencia" do
    foto = con_archivo
    turno(foto, FakeClaudeClient.texto("Leí el comprobante"))

    bloque = @claude.pedidos.first[:cuerpo][:messages].last["content"].find { |b| b["type"] == "image" }
    assert_equal "base64", bloque.dig("source", "type")
    assert bloque.dig("source", "data").length > 100

    guardado = @conversacion.reload.messages.first["content"].find { |b| b["type"] == "image" }
    assert_equal "whatsapp_media", guardado.dig("source", "type")
    assert_equal foto.id, guardado.dig("source", "whatsapp_message_id")
  end

  test "un PDF viaja como documento" do
    pdf = con_archivo(fixture: "comprobante_factura.pdf", mime: "application/pdf")
    turno(pdf, FakeClaudeClient.texto("ok"))
    bloque = @claude.pedidos.first[:cuerpo][:messages].last["content"].find { |b| b["type"] == "document" }
    assert_equal "application/pdf", bloque.dig("source", "media_type")
  end

  # ---- lo que se resuelve sin el modelo -------------------------------------

  test "@limpiar cierra la conversacion sin llamar al modelo" do
    turno(entrante("@limpiar"))
    assert_equal "reinicio", @conversacion.reload.closed_reason
    assert_equal [Agente::Turno::REINICIADO], @whatsapp.textos
  end

  def nota_de_voz
    mensaje = entrante("", tipo: "audio", media_id: "media-voz", media_mime: "audio/ogg", media_filename: "nota.ogg")
    Tempfile.create(["nota", ".ogg"], binmode: true) do |archivo|
      archivo.write("OggS audio falso")
      archivo.rewind
      mensaje.media_file = CarrierWave::SanitizedFile.new(tempfile: archivo, filename: "nota.ogg",
                                                          content_type: "audio/ogg")
      mensaje.save!
    end
    mensaje
  end

  def con_openai(valor)
    previa = ENV["OPENAI_API_KEY"]
    valor ? ENV["OPENAI_API_KEY"] = valor : ENV.delete("OPENAI_API_KEY")
    yield
  ensure
    ENV["OPENAI_API_KEY"] = previa
  end

  test "sin transcriptor configurado, una nota de voz recibe el aviso de que todavia no se escucha" do
    con_openai(nil) { turno(nota_de_voz) }
    assert_equal [Agente::Turno::SIN_VOZ_TODAVIA], @whatsapp.textos
  end

  test "una nota de voz se transcribe y le llega al modelo marcada como tal" do
    transcriptor = Object.new
    def transcriptor.transcribir(_bytes, mime:, terminos:) = "almuerzo ochenta mil pesos hoy"
    mensaje = nota_de_voz
    con_openai("sk-x") do
      Voz::Transcriptor.stub(:new, transcriptor) { turno(mensaje, FakeClaudeClient.texto("¿En qué centro de costo?")) }
    end

    enviado = @claude.pedidos.first[:cuerpo][:messages].last["content"].last["text"]
    assert_equal "#{Agente::Turno::PREFIJO_VOZ} almuerzo ochenta mil pesos hoy", enviado
    assert_equal "almuerzo ochenta mil pesos hoy", mensaje.reload.body
    assert_equal ["¿En qué centro de costo?"], @whatsapp.textos
  end

  test "si la transcripcion falla, pide que lo escriba" do
    transcriptor = Object.new
    def transcriptor.transcribir(*) = raise(Voz::Transcriptor::Error, "HTTP 500")
    con_openai("sk-x") do
      Voz::Transcriptor.stub(:new, transcriptor) { turno(nota_de_voz) }
    end
    assert_equal [Agente::Turno::VOZ_ILEGIBLE], @whatsapp.textos
  end

  # ---- fallos ---------------------------------------------------------------

  test "un rechazo de los clasificadores cierra la conversacion con un mensaje amable" do
    turno(entrante("algo raro"), FakeClaudeClient.rechazo)
    assert_equal [Agente::Turno::RECHAZO], @whatsapp.textos
    assert_equal "rechazo", @conversacion.reload.closed_reason
  end

  test "pasado el tope de llamadas a tools corta el turno" do
    cuatro = Array.new(4) { ["cost_centers_list", { code: "X" }] }
    turno(entrante("busca"), *Array.new(4) { FakeClaudeClient.tools(*cuatro) })
    assert_equal [Agente::Turno::NO_TERMINE], @whatsapp.textos
    assert_equal "tope", @conversacion.reload.closed_reason
  end

  test "un 400 de Claude no se reintenta: avisa y cierra la conversacion" do
    turno(entrante("hola"), Claude::Client::Error.new("bad", status: 400, tipo: "invalid_request_error"))
    assert_equal [Agente::Turno::FALLO], @whatsapp.textos
    assert_equal "error", @conversacion.reload.closed_reason
  end

  test "un 529 de Claude sube para que el job reintente y no guarda nada" do
    assert_raises(Claude::Client::Error) do
      turno(entrante("hola"), Claude::Client::Error.new("overloaded", status: 529, tipo: "overloaded_error"))
    end
    assert_empty @conversacion.reload.messages
    assert_empty @whatsapp.textos
  end

  test "si cambio la version del prompt arranca una conversacion nueva" do
    @conversacion.update!(prompt_version: "vieja", messages: [{ "role" => "user", "content" => "x" },
                                                               { "role" => "assistant", "content" => "y" }])
    mensaje = entrante("hola")
    turno(mensaje, FakeClaudeClient.texto("ok"))

    assert_equal "nueva_version", @conversacion.reload.closed_reason
    nueva = mensaje.reload.whatsapp_conversation
    refute_equal @conversacion, nueva
    assert_equal 2, nueva.messages.size
  end
end
