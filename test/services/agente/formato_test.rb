# frozen_string_literal: true

require "test_helper"

# Markdown del modelo a formato de WhatsApp (paquete 17).
class Agente::FormatoTest < ActiveSupport::TestCase
  test "negrita, titulos y enlaces pasan a la forma de WhatsApp" do
    texto = "## Resumen\n**Total:** $45.000\nVer [la factura](https://x.co/f)"
    assert_equal "*Resumen*\n*Total:* $45.000\nVer la factura: https://x.co/f", Agente::Formato.para_whatsapp(texto)
  end

  test "lo que ya esta en formato de WhatsApp no cambia" do
    texto = "*Centro de costo:* CC-0046\n*Fecha:* 14/07/2026"
    assert_equal texto, Agente::Formato.para_whatsapp(texto)
  end
end
