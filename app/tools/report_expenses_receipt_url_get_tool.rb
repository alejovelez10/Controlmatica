# frozen_string_literal: true

class ReportExpensesReceiptUrlGetTool < ApplicationTool
  tool_name "report_expenses_receipt_url_get"
  description "Paso 1 de 2 para adjuntar un comprobante. Devuelve una URL firmada de S3 para subir " \
              "el archivo con un PUT directo (no envíes el binario por MCP). El PUT debe llevar " \
              "EXACTAMENTE el Content-Type que devuelve esta tool o S3 responde 403. Luego llama a " \
              "report_expenses_attach_receipt con el upload_key que devuelve aquí."
  input_schema(
    properties: {
      report_expense_id: { type: "integer", description: "ID del gasto (requerido)" },
      filename:          { type: "string",  description: "Nombre del archivo con extensión: jpg, jpeg, png, webp, heic o pdf" },
      content_type:      { type: "string",  description: "MIME: image/jpeg, image/png, image/webp, image/heic o application/pdf" },
      byte_size:         { type: "integer", description: "Tamaño en bytes (máx 10485760)" }
    },
    required: %w[report_expense_id filename content_type]
  )

  def self.call(report_expense_id:, filename:, content_type:, server_context:, byte_size: nil)
    tenant = current_tenant(server_context)
    return unauthorized! unless tenant

    re = ReportExpense.find_by(id: report_expense_id)
    return not_found!("report_expense #{report_expense_id}") unless re

    unless Mcp::S3DirectUpload.configured?
      return text("Error: el almacenamiento de archivos no está configurado en este entorno. " \
                  "Usa report_expenses_attach_receipt con file_base64.")
    end

    # LAS DOS ALLOWLISTS SE LEEN DEL UPLOADER, no se duplican aquí: una sola
    # fuente de verdad (§4.8). Si el paquete 06 agrega un formato, esta tool se
    # entera sola.
    uploader = ReceiptUploader.new
    extension = File.extname(filename.to_s).delete(".").downcase
    unless uploader.extension_allowlist.include?(extension)
      return text("Error: extensión no permitida. Válidas: #{uploader.extension_allowlist.join(', ')}")
    end

    unless uploader.content_type_allowlist.include?(content_type.to_s)
      return text("Error: tipo de archivo no permitido. Válidos: #{uploader.content_type_allowlist.join(', ')}")
    end

    if byte_size.present? && byte_size.to_i > Mcp::S3DirectUpload::MAX_BYTES
      return text("Error: el archivo pesa más de #{Mcp::S3DirectUpload::MAX_BYTES / 1024 / 1024} MB, " \
                  "que es el máximo permitido.")
    end

    key = Mcp::S3DirectUpload.build_key(filename)
    url = Mcp::S3DirectUpload.presign_put(key, content_type.to_s)

    json(upload_url: url,
         upload_key: key,
         method: "PUT",
         headers: { "Content-Type" => content_type.to_s },
         expires_in_seconds: Mcp::S3DirectUpload::TTL_SECONDS,
         max_bytes: Mcp::S3DirectUpload::MAX_BYTES,
         report_expense_id: re.id,
         next_step: "Sube el archivo con PUT a upload_url usando exactamente ese header " \
                    "Content-Type, sin cabecera de autorización. Después llama a " \
                    "report_expenses_attach_receipt con report_expense_id y upload_key.")
  end
end
