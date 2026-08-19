# frozen_string_literal: true

require "test_helper"

# El filtro `code` es la unica pieza de esta tool que agrego el proyecto de
# gastos: sin el, un agente que recibe "CC-0046" no puede resolver el centro,
# porque el codigo NO vive en la descripcion (que dice "#46"). El resto de la
# tool es legado y no tenia pruebas; aqui se cubre lo que se toco.
class CostCentersListToolTest < ActiveSupport::TestCase
  include McpTestHelpers

  def listar(**kwargs)
    with_mcp_key { tool_json(CostCentersListTool.call(server_context: ctx, **kwargs)) }
  end

  def codigos(cuerpo) = cuerpo.map { |cc| cc["code"] }

  test "el codigo exacto devuelve solo ese centro" do
    cuerpo = listar(code: "CM-ACME-01-2026")

    assert_equal ["CM-ACME-01-2026"], codigos(cuerpo)
  end

  test "el codigo es insensible a mayusculas y tolera espacios alrededor" do
    cuerpo = listar(code: "  cm-acme-01-2026  ")

    assert_equal ["CM-ACME-01-2026"], codigos(cuerpo)
  end

  # Es exacto a proposito: "CM-ACME-01" no debe traer "CM-ACME-01-2026". Un
  # prefijo que arrastra varios centros es peor que cero resultados, porque el
  # agente elegiria uno al azar y le imputaria el gasto a otro proyecto.
  test "el codigo no hace match parcial" do
    assert_empty listar(code: "CM-ACME-01")
  end

  test "un codigo inexistente devuelve la lista vacia, no un error" do
    assert_empty listar(code: "NO-EXISTE-0000")
  end

  test "sin codigo no se filtra por codigo" do
    completa = listar
    assert_operator completa.length, :>, 1
    assert_includes codigos(completa), "CM-ACME-01-2026"
    assert_includes codigos(completa), "CM-BETA-01-2026"
  end

  # El codigo convive con los filtros de siempre: si el centro no cumple los
  # dos, no sale.
  test "el codigo se combina con los demas filtros" do
    assert_equal ["CM-ACME-01-2026"], codigos(listar(code: "CM-ACME-01-2026",
                                                     service_type: "PROYECTO"))
    assert_empty listar(code: "CM-ACME-01-2026", service_type: "SERVICIO")
  end

  test "sin api key valida no responde nada del dominio" do
    respuesta = CostCentersListTool.call(server_context: ctx(api_key: "otra-cosa"), code: "CM-ACME-01-2026")

    assert_tool_error respuesta, "Unauthorized"
    refute_includes tool_text(respuesta), "CM-ACME-01-2026"
  end
end
