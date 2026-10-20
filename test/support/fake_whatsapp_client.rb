# frozen_string_literal: true

# Doble de Whatsapp::Client (paquete 17). Anota cada envio en `enviados` y
# devuelve wamids falsos; `media` define lo que entrega descargar_media y
# `error_en` hace que un metodo levante el error indicado.
class FakeWhatsappClient
  attr_reader :enviados, :leidos
  attr_accessor :media, :error_en

  def initialize(media: nil, error_en: {})
    @enviados = []
    @leidos = []
    @media = media
    @error_en = error_en
    @contador = 0
  end

  def enviar_texto(destino, texto, responder_a: nil)
    anotar(:texto, destino, texto: texto, responder_a: responder_a)
  end

  def enviar_botones(destino, texto, botones, pie: nil, responder_a: nil)
    anotar(:botones, destino, texto: texto, botones: botones, pie: pie)
  end

  def enviar_lista(destino, texto, boton:, filas:, responder_a: nil)
    anotar(:lista, destino, texto: texto, boton: boton, filas: filas)
  end

  def marcar_leido(wamid, escribiendo: true)
    levantar_si(:marcar_leido)
    @leidos << wamid
    true
  end

  def descargar_media(_media_id)
    levantar_si(:descargar_media)
    @media || { bytes: "%PDF-1.4 falso".b, mime: "application/pdf", tamano: 14 }
  end

  def textos
    @enviados.map { |e| e[:texto] }
  end

  private

  def anotar(tipo, destino, datos)
    levantar_si(tipo)
    @contador += 1
    @enviados << datos.merge(tipo: tipo, destino: destino)
    "wamid.saliente.#{@contador}"
  end

  def levantar_si(metodo)
    error = @error_en[metodo]
    raise error if error
  end
end
