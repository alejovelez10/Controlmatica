# frozen_string_literal: true

class ReportExpensesAttachReceiptTool < ApplicationTool
  tool_name "report_expenses_attach_receipt"
  description "Asocia al gasto su comprobante. Tres modos, en orden de precedencia: " \
              "(1) upload_key de report_expenses_receipt_url_get; " \
              "(2) file_url: URL https firmada de Google Cloud Storage emitida por " \
              "get_attachment_url en este mismo turno (el servidor la descarga; máx 20 MB; " \
              "manda también filename); " \
              "(3) file_base64 (máx 4 MB codificados), que requiere filename y content_type. " \
              "Reemplaza el comprobante anterior si el gasto ya tenía uno."
  input_schema(
    properties: {
      report_expense_id: { type: "integer", description: "ID del gasto (requerido)" },
      upload_key:        { type: "string",  description: "Clave devuelta por report_expenses_receipt_url_get" },
      file_url:          { type: "string",  description: "URL https firmada de storage.googleapis.com o storage.cloud.google.com (get_attachment_url). El servidor descarga el archivo; máx 20 MB" },
      file_base64:       { type: "string",  description: "Contenido del archivo en base64 (solo si no usas upload_key ni file_url; máx 4 MB)" },
      filename:          { type: "string",  description: "Nombre del archivo (requerido con file_base64; recomendado con file_url)" },
      content_type:      { type: "string",  description: "MIME (requerido con file_base64; con file_url se deduce de la respuesta si falta)" }
    },
    required: %w[report_expense_id]
  )

  MAX_BASE64_BYTES = 20 * 1024 * 1024

  def self.call(report_expense_id:, server_context:, upload_key: nil, file_url: nil,
                file_base64: nil, filename: nil, content_type: nil)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    re = ReportExpense.find_by(id: report_expense_id)
    return not_found!("report_expense #{report_expense_id}") unless re

    if upload_key.present?
      adjuntar_por_key(re, upload_key, tenant, server_context)
    elsif file_url.present?
      adjuntar_por_url(re, file_url, filename, content_type, tenant, server_context)
    elsif file_base64.present?
      adjuntar_por_base64(re, file_base64, filename, content_type, tenant, server_context)
    else
      text("Error: indica upload_key (recomendado), file_url (URL firmada de get_attachment_url) " \
           "o file_base64 con filename y content_type.")
    end
  end

  # --- Modo A: upload_key (el único que se usa en producción) ---------------

  def self.adjuntar_por_key(re, upload_key, tenant, server_context)
    unless Mcp::S3DirectUpload.own_key?(upload_key)
      return text("Error: upload_key inválida. Obtenla con report_expenses_receipt_url_get.")
    end

    meta = Mcp::S3DirectUpload.head(upload_key)
    if meta.nil?
      return text("Error: no se encontró el archivo subido. Vuelve a pedir la URL y sube el " \
                  "archivo antes de adjuntar.")
    end

    if meta[:content_length].to_i > Mcp::S3DirectUpload::MAX_BYTES
      return text("Error: el archivo pesa más de #{Mcp::S3DirectUpload::MAX_BYTES / 1024 / 1024} MB.")
    end

    # ADJUNTAR ES EDITAR EL GASTO: dispara edit_values y create_edit_register, que
    # escriben last_user_edited_id. Atribuirle esa edición al Administrador
    # genérico es exactamente lo que este paquete vino a eliminar.
    cuerpo = Mcp::S3DirectUpload.fetch_body(upload_key)
    if cuerpo.nil?
      return text("Error: no se encontró el archivo subido. Vuelve a pedir la URL y sube el " \
                  "archivo antes de adjuntar.")
    end

    as_actor_strict(tenant, server_context) do
      # Al asignar el archivo, CarrierWave lo re-almacena en el store_dir
      # definitivo aplicando de nuevo extension_allowlist, content_type_allowlist
      # y size_range: LA VALIDACIÓN FINAL LA HACE EL UPLOADER, no esta tool.
      resultado = escribir_archivo(re, cuerpo, File.basename(upload_key), meta[:content_type])
      if resultado.nil?
        # Limpieza best-effort: si el borrado falla, queda un huérfano en S3 y
        # la respuesta sigue siendo de éxito, porque el adjunto sí funcionó.
        Mcp::S3DirectUpload.delete(upload_key)
        json(Mcp::Serialize.record(re.reload, ReportExpensesListTool::KEYS))
      else
        text("Error: #{resultado}")
      end
    end
  end
  private_class_method :adjuntar_por_key

  # --- Modo C: file_url (adjuntos que el agente de Taimes ya tiene en GCS) --
  #
  # El agente de WhatsApp no puede hacer un PUT a S3: lo que tiene es la URL
  # firmada de Google Cloud Storage que mintea su tool get_attachment_url en el
  # mismo turno. SOLO se aceptan esos hosts: sin la allowlist, quien tenga el
  # MCP_API_KEY podría hacernos descargar cualquier URL de internet (SSRF) y
  # adjuntarla como comprobante. No se relaja "para que funcione";
  # MCP_FILE_URL_EXTRA_HOSTS (coma-separada) es la válvula si Taimes cambia de
  # bucket sin redesplegar esto.
  ALLOWED_FILE_URL_HOSTS = %w[storage.googleapis.com storage.cloud.google.com].freeze
  URL_OPEN_TIMEOUT = 5
  URL_READ_TIMEOUT = 25

  # Señal interna para abortar la descarga en streaming al pasarse del tope.
  class DescargaDemasiadoGrande < StandardError; end

  def self.hosts_permitidos
    ALLOWED_FILE_URL_HOSTS +
      ENV["MCP_FILE_URL_EXTRA_HOSTS"].to_s.split(",").map(&:strip).reject(&:blank?)
  end

  def self.adjuntar_por_url(re, file_url, filename, content_type, tenant, server_context)
    begin
      uri = URI.parse(file_url)
    rescue URI::InvalidURIError
      return text("Error: file_url no es una URL válida.")
    end

    unless uri.is_a?(URI::HTTPS) && hosts_permitidos.include?(uri.host)
      return text("Error: file_url debe ser una URL https de " \
                  "#{ALLOWED_FILE_URL_HOSTS.join(' o ')} (la genera get_attachment_url).")
    end

    descarga = descargar_archivo_remoto(file_url)
    return text("Error: #{descarga[:error]}") unless descarga[:ok]

    nombre = filename.presence || File.basename(uri.path.to_s).presence || "comprobante"
    tipo   = content_type.presence || descarga[:content_type]

    as_actor_strict(tenant, server_context) do
      # La validación final (extensión, MIME, tamaño) la hace el ReceiptUploader
      # al asignar, igual que en los otros dos modos.
      resultado = escribir_archivo(re, descarga[:bytes], File.basename(nombre.to_s), tipo.to_s)
      if resultado.nil?
        json(Mcp::Serialize.record(re.reload, ReportExpensesListTool::KEYS))
      else
        text("Error: #{resultado}")
      end
    end
  end
  private_class_method :adjuntar_por_url

  # Descarga en streaming con corte al superar el tope, sin seguir redirects
  # (una URL firmada de GCS no redirige; un redirect es señal de que algo anda
  # mal). NUNCA se loguea la URL completa: el query string lleva la firma.
  # Devuelve { ok: true, bytes:, content_type: } o { ok: false, error: }.
  # Ninguna excepción de red sale de aquí: un timeout no puede tumbar la
  # respuesta del agente.
  def self.descargar_archivo_remoto(file_url)
    cuerpo = +""
    respuesta = HTTParty.get(file_url,
                             stream_body: true, follow_redirects: false,
                             open_timeout: URL_OPEN_TIMEOUT, timeout: URL_READ_TIMEOUT,
                             headers: { "User-Agent" => "controlmatica-mcp/1.0" }) do |fragmento|
      cuerpo << fragmento if fragmento.code.to_i == 200
      raise DescargaDemasiadoGrande if cuerpo.bytesize > Mcp::S3DirectUpload::MAX_BYTES
    end

    codigo = respuesta.code.to_i
    if codigo == 200
      { ok: true, bytes: cuerpo, content_type: respuesta.headers["Content-Type"] }
    elsif [401, 403].include?(codigo)
      { ok: false, error: "la URL firmada expiró o no es válida. Genera una nueva con " \
                          "get_attachment_url y reintenta." }
    else
      { ok: false, error: "no se pudo descargar el archivo (HTTP #{codigo}). Reintenta." }
    end
  rescue DescargaDemasiadoGrande
    { ok: false, error: "el archivo pesa más de #{Mcp::S3DirectUpload::MAX_BYTES / 1024 / 1024} MB." }
  rescue StandardError => e
    Rails.logger.warn("[report_expenses_attach_receipt] descarga de file_url: #{e.class}")
    { ok: false, error: "no se pudo descargar el archivo (#{e.class.name.demodulize}). Reintenta." }
  end
  private_class_method :descargar_archivo_remoto

  # --- Modo B: base64 (entornos sin S3 y pruebas) --------------------------

  def self.adjuntar_por_base64(re, file_base64, filename, content_type, tenant, server_context)
    if filename.blank? || content_type.blank?
      return text("Error: con file_base64 hay que enviar también filename y content_type.")
    end

    # El corte va ANTES de decodificar: el objetivo es no inflar memoria (ni el
    # contexto del modelo) con un archivo que igual se va a rechazar.
    if file_base64.bytesize > MAX_BASE64_BYTES
      return text("Error: file_base64 supera los #{MAX_BASE64_BYTES / 1024 / 1024} MB. " \
                  "Usa report_expenses_receipt_url_get para archivos grandes.")
    end

    begin
      binario = Base64.strict_decode64(file_base64)
    rescue ArgumentError
      return text("Error: file_base64 no es base64 válido")
    end

    as_actor_strict(tenant, server_context) do
      resultado = escribir_archivo(re, binario, File.basename(filename.to_s), content_type.to_s)
      if resultado.nil?
        json(Mcp::Serialize.record(re.reload, ReportExpensesListTool::KEYS))
      else
        text("Error: #{resultado}")
      end
    end
  end
  private_class_method :adjuntar_por_base64

  # Escribe el binario en el gasto a través del uploader. Devuelve nil si guardó
  # y el mensaje de error si no.
  #
  # El Tempfile se borra SIEMPRE en el ensure: CarrierWave ya copió el contenido
  # a su store_dir al asignar, así que dejarlo vivo solo llena /tmp del dyno.
  # Una excepción del uploader (extensión prohibida, tipo prohibido, tamaño) se
  # traduce a mensaje: es un dato malo del llamador, no un fallo del servidor.
  def self.escribir_archivo(re, binario, filename, content_type)
    archivo = Tempfile.new(["mcp_receipt", File.extname(filename.to_s)])
    begin
      archivo.binmode
      archivo.write(binario)
      archivo.rewind

      re.receipt_file = CarrierWave::SanitizedFile.new(
        tempfile: archivo, filename: filename, content_type: content_type
      )
      re.save ? nil : re.errors.full_messages.join(", ")
    rescue CarrierWave::IntegrityError, CarrierWave::ProcessingError => e
      e.message
    ensure
      archivo.close
      archivo.unlink
    end
  end
  private_class_method :escribir_archivo
end
