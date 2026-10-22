module Voz
  # Transcribe las notas de voz de WhatsApp (paquete 17, fase 4).
  #
  # Claude no recibe audio, asi que la voz pasa primero por un transcriptor.
  # OpenAI `gpt-transcribe` por defecto: recibe el audio/ogg con Opus que manda
  # WhatsApp sin convertirlo, admite una lista de terminos literales (los
  # codigos de centro de costo) y no entrena con los datos. Taimes, en cambio,
  # le pasaba el audio a Gemini despues de convertirlo con ffmpeg.
  #
  # Multipart con HTTParty (ya esta en el Gemfile): la gema oficial `openai`
  # exige Ruby >= 3.3.
  class Transcriptor
    URL = "https://api.openai.com/v1/audio/transcriptions".freeze
    MODELO_POR_DEFECTO = "gpt-transcribe".freeze
    TIMEOUT = 30
    MAX_TERMINOS = 40

    PROMPT = (
      "Nota de voz de un empleado de una empresa colombiana de ingeniería que registra un gasto o un " \
      "reporte de servicio. Los montos son en pesos colombianos. Los centros de costo tienen códigos " \
      "como CM-ACME-12-2026."
    ).freeze

    class Error < StandardError; end

    def self.configurado? = ENV["OPENAI_API_KEY"].present?

    def self.modelo = ENV["TRANSCRIPCION_MODELO"].presence || MODELO_POR_DEFECTO

    # => el texto transcrito. Levanta Error si no se pudo.
    def transcribir(bytes, mime: "audio/ogg", terminos: [])
      raise Error, "sin OPENAI_API_KEY" unless self.class.configurado?

      Tempfile.create(["nota", extension_para(mime)], binmode: true) do |archivo|
        archivo.write(bytes)
        archivo.rewind
        # Los textos van como bytes (.b), igual que el audio: HTTParty pega las
        # partes del multipart como strings, y un audio binario junto a un
        # prompt UTF-8 con tildes revienta con Encoding::CompatibilityError
        # (visto el 2026-10-21 con la primera nota de voz real).
        cuerpo = { file: archivo, model: self.class.modelo, "languages" => ["es"], prompt: PROMPT.b,
                   response_format: "json" }
        palabras = Array(terminos).map(&:to_s).map(&:strip).reject(&:blank?).uniq.first(MAX_TERMINOS)
        cuerpo["keywords"] = palabras.map(&:b) if palabras.any?
        respuesta = HTTParty.post(URL, headers: { "Authorization" => "Bearer #{ENV['OPENAI_API_KEY']}" },
                                       body: cuerpo, timeout: TIMEOUT)
        raise Error, "transcripcion HTTP #{respuesta.code}" unless respuesta.success?

        texto = respuesta.parsed_response.is_a?(Hash) ? respuesta.parsed_response["text"].to_s.strip : ""
        raise Error, "transcripcion vacia" if texto.empty?

        texto
      end
    rescue Net::OpenTimeout, Net::ReadTimeout, SocketError, Errno::ECONNREFUSED => e
      raise Error, "transcripcion sin respuesta (#{e.class})"
    end

    private

    # La extension es obligatoria: el servicio deduce el formato por el nombre.
    def extension_para(mime)
      { "audio/ogg" => ".ogg", "audio/opus" => ".ogg", "audio/mpeg" => ".mp3", "audio/mp4" => ".m4a",
        "audio/aac" => ".aac", "audio/amr" => ".amr" }.fetch(mime.to_s, ".ogg")
    end
  end
end
