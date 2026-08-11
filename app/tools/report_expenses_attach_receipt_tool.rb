# frozen_string_literal: true

class ReportExpensesAttachReceiptTool < ApplicationTool
  tool_name "report_expenses_attach_receipt"
  description "Paso 2 de 2: asocia al gasto el comprobante ya subido (upload_key de " \
              "report_expenses_receipt_url_get). Alternativa para archivos pequeños: file_base64 " \
              "(máx 4 MB codificados), que requiere filename y content_type. Si llegan los dos, " \
              "gana upload_key. Reemplaza el comprobante anterior si el gasto ya tenía uno."
  input_schema(
    properties: {
      report_expense_id: { type: "integer", description: "ID del gasto (requerido)" },
      upload_key:        { type: "string",  description: "Clave devuelta por report_expenses_receipt_url_get" },
      file_base64:       { type: "string",  description: "Contenido del archivo en base64 (solo si no usas upload_key; máx 4 MB)" },
      filename:          { type: "string",  description: "Nombre del archivo (requerido con file_base64)" },
      content_type:      { type: "string",  description: "MIME (requerido con file_base64)" }
    },
    required: %w[report_expense_id]
  )

  MAX_BASE64_BYTES = 4 * 1024 * 1024

  def self.call(report_expense_id:, server_context:, upload_key: nil, file_base64: nil,
                filename: nil, content_type: nil)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    re = ReportExpense.find_by(id: report_expense_id)
    return not_found!("report_expense #{report_expense_id}") unless re

    if upload_key.present?
      adjuntar_por_key(re, upload_key, tenant, server_context)
    elsif file_base64.present?
      adjuntar_por_base64(re, file_base64, filename, content_type, tenant, server_context)
    else
      text("Error: indica upload_key (recomendado) o file_base64 con filename y content_type.")
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
