module Agente
  # Adjunta al gasto el archivo que la persona mando por WhatsApp (paquete 17).
  #
  # Por la tool report_expenses_attach_receipt en proceso (modo file_base64):
  # la validacion final la hace el ReceiptUploader, igual que en los otros
  # caminos, y la edicion queda a nombre de la persona.
  module Adjunto
    module_function

    # => { texto:, error: }
    def adjuntar(report_expense_id, mensaje, usuario:)
      bytes = mensaje.media_file.read.to_s.b
      return { texto: "El archivo de la conversación está vacío.", error: true } if bytes.empty?

      McpEnProceso.llamar(
        "report_expenses_attach_receipt",
        { report_expense_id: report_expense_id, file_base64: Base64.strict_encode64(bytes),
          filename: mensaje.media_filename.presence || "comprobante", content_type: mensaje.media_mime },
        usuario: usuario, wa_id: mensaje.wa_id
      )
    rescue StandardError => e
      Rails.logger.error("[agente] adjunto #{report_expense_id}: #{e.class}: #{e.message}")
      { texto: "No se pudo leer el archivo guardado.", error: true }
    end
  end
end
