# frozen_string_literal: true

require "test_helper"
require "minitest/mock"

# Transcripcion de notas de voz (paquete 17, fase 4). HTTParty.post se
# reemplaza: lo que se prueba es que se le manda y como se lee la respuesta.
class Voz::TranscriptorTest < ActiveSupport::TestCase
  Respuesta = Struct.new(:code, :parsed_response) do
    def success? = code == 200
  end

  setup do
    @previa = ENV["OPENAI_API_KEY"]
    ENV["OPENAI_API_KEY"] = "sk-openai-de-mentira"
  end

  teardown do
    ENV["OPENAI_API_KEY"] = @previa
  end

  test "manda el audio con el modelo, el idioma y los codigos como terminos" do
    enviado = nil
    post = lambda do |_url, headers:, body:, timeout:|
      enviado = { headers: headers, body: body }
      Respuesta.new(200, { "text" => "Almuerzo en CM-ACME-12, ochenta mil pesos" })
    end

    texto = HTTParty.stub(:post, post) do
      Voz::Transcriptor.new.transcribir("OggS-falso".b, mime: "audio/ogg", terminos: ["CM-ACME-12", "CM-ACME-12", ""])
    end

    assert_equal "Almuerzo en CM-ACME-12, ochenta mil pesos", texto
    assert_equal "gpt-transcribe", enviado[:body][:model]
    assert_equal ["es"], enviado[:body]["languages"]
    assert_equal ["CM-ACME-12"], enviado[:body]["keywords"]
    assert_equal ".ogg", File.extname(enviado[:body][:file].path)
    assert_equal "Bearer sk-openai-de-mentira", enviado[:headers]["Authorization"]
  end

  # Visto el 2026-10-21 con la primera nota de voz real: con HTTParty.post
  # reemplazado el multipart nunca se armaba, y al armarlo de verdad un audio
  # binario junto al prompt con tildes reventaba con Encoding::CompatibilityError.
  test "el multipart se arma con un audio binario de verdad y textos con tildes" do
    cuerpo_armado = nil
    post = lambda do |_url, headers:, body:, timeout:|
      cuerpo_armado = HTTParty::Request::Body.new(body).call
      Respuesta.new(200, { "text" => "Viáticos cincuenta mil" })
    end

    texto = HTTParty.stub(:post, post) do
      Voz::Transcriptor.new.transcribir("OggS\x00\x02\xFF\xFE\xC3\x9Faudio".b, mime: "audio/ogg",
                                        terminos: ["PRO-DÑB-2-2026"])
    end

    assert_equal "Viáticos cincuenta mil", texto
    assert_includes cuerpo_armado, "ingenier".b
    assert_includes cuerpo_armado, "\xFF\xFE".b
  end

  test "un error HTTP levanta Error" do
    HTTParty.stub(:post, ->(*_a, **_k) { Respuesta.new(500, {}) }) do
      assert_raises(Voz::Transcriptor::Error) { Voz::Transcriptor.new.transcribir("x".b) }
    end
  end

  test "sin la api key no se llama a nadie" do
    ENV.delete("OPENAI_API_KEY")
    refute Voz::Transcriptor.configurado?
    assert_raises(Voz::Transcriptor::Error) { Voz::Transcriptor.new.transcribir("x".b) }
  end
end
