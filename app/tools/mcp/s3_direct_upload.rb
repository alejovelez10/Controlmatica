# frozen_string_literal: true

module Mcp
  # Única pieza del paquete 11 que habla con fog-aws (fog-aws 3.31; en este
  # proyecto NO existe aws-sdk-s3).
  #
  # POR QUÉ URL FIRMADA Y NO EL BINARIO POR MCP: una foto de factura de 3 MB en
  # base64 son ~4 MB de texto dentro del contexto del modelo. Además de caro, es
  # inútil: el modelo no necesita ver los bytes, solo asociarlos. El agente sube
  # el archivo con un PUT directo a S3 y después nos dice la clave.
  module S3DirectUpload
    PREFIX      = "uploads/tmp/mcp_receipts"
    # 15 minutos: suficiente para un adjunto de WhatsApp con mala señal, corto
    # para una URL que da permiso de escritura en el bucket.
    TTL_SECONDS = 900
    MAX_BYTES   = 20 * 1024 * 1024

    # Los nombres de ENV son los del initializer de CarrierWave de este proyecto
    # (AWS_ACCESS_KEY / AWS_SECRET_KEY), NO los canónicos de AWS.
    def self.configured?
      ENV["AWS_BUCKET"].present? && ENV["AWS_ACCESS_KEY"].present? && ENV["AWS_SECRET_KEY"].present?
    end

    def self.bucket
      ENV["AWS_BUCKET"]
    end

    # NO SE MEMOIZA A PROPÓSITO: sostener la conexión entre requests de Puma
    # guarda un socket muerto que falla al primer uso. A cambio, ninguna tool
    # debe llamarla más de una vez por invocación.
    def self.connection
      Fog::Storage.new(CarrierWave::Uploader::Base.fog_credentials)
    end

    # "uploads/tmp/mcp_receipts/<uuid>/<nombre-saneado>"
    def self.build_key(filename)
      safe = File.basename(filename.to_s).gsub(/[^A-Za-z0-9._-]/, "_").last(120)
      safe = "comprobante" if safe.blank? || safe.start_with?(".")
      "#{PREFIX}/#{SecureRandom.uuid}/#{safe}"
    end

    # SOLO ACEPTAMOS CLAVES QUE EMITIMOS NOSOTROS. Es un control de seguridad,
    # no una validación de formato: sin él, quien tenga el MCP_API_KEY puede
    # adjuntar como "comprobante" cualquier objeto del bucket —avatares, hojas
    # de vida, órdenes de compra— pasando su ruta en upload_key. No se relaja
    # "para que funcione".
    def self.own_key?(key)
      key.to_s.match?(%r{\A#{Regexp.escape(PREFIX)}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\z})
    end

    def self.presign_put(key, content_type)
      connection.put_object_url(bucket, key, (Time.now + TTL_SECONDS).to_i,
                                { "Content-Type" => content_type })
    end

    # Bytes del objeto temporal, o nil.
    #
    # POR QUÉ NO SE USA `remote_receipt_file_url=` DE CARRIERWAVE: ese setter
    # descarga por HTTP y en CarrierWave 3 la descarga pasa por SsrfFilter, que
    # rechaza esquemas y destinos que no son HTTP público. Traer el objeto por
    # fog es una llamada menos, no necesita firmar una segunda URL y evita que
    # el adjunto dependa de que el propio servidor pueda salir a internet. La
    # validación final la sigue haciendo el uploader, que es lo que importa.
    def self.fetch_body(key)
      connection.get_object(bucket, key).body
    rescue StandardError
      nil
    end

    # => { content_length:, content_type: } o nil. NINGUNA excepción de red sale
    # de este módulo: un timeout de S3 no puede tumbar la respuesta del agente.
    def self.head(key)
      respuesta = connection.head_object(bucket, key)
      { content_length: respuesta.headers["Content-Length"].to_i,
        content_type: respuesta.headers["Content-Type"] }
    rescue StandardError
      nil
    end

    # Best effort: un temporal huérfano en S3 es preferible a decirle al agente
    # que falló algo que sí funcionó.
    def self.delete(key)
      connection.delete_object(bucket, key)
      true
    rescue StandardError
      false
    end
  end
end
