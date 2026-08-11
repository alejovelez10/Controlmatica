# frozen_string_literal: true

require "test_helper"
# Object#stub: se estubea ExchangeRateService.fetch en vez de agregar WebMock
# (arquitectura §6.7). La suite no abre sockets.
require "minitest/mock"

class ExchangeRatesGetToolTest < ActiveSupport::TestCase
  include McpTestHelpers

  def rate(**attrs)
    ExchangeRateService::Rate.new({ currency: "USD", requested_date: Date.new(2026, 7, 17),
                                    rate_date: Date.new(2026, 7, 17),
                                    rate_to_cop: BigDecimal("4120.5"), source: "trm_oficial",
                                    cached: true, stale: false }.merge(attrs))
  end

  def ok(valor) = ExchangeRateService::Result.new(ok: true, value: valor, errors: [])
  def falla(msg) = ExchangeRateService::Result.new(ok: false, value: nil, errors: [msg])

  test "KEYS tiene exactamente las 7 claves canonicas con id y effective_date" do
    assert_equal %i[id currency rate_date effective_date rate_to_cop source fetched_at],
                 ExchangeRatesGetTool::KEYS
  end

  test "COP devuelve 1.0 sin consultar el servicio" do
    ExchangeRateService.stub(:fetch, ->(*) { flunk "no debio llamarse para COP" }) do
      with_mcp_key do
        cuerpo = tool_json(ExchangeRatesGetTool.call(currency: "cop", date: "2026-07-17",
                                                     server_context: ctx))
        assert_equal "1.0", cuerpo["rate_to_cop"]
        assert_equal "identity", cuerpo["source"]
      end
    end
  end

  test "devuelve la tasa cuando el servicio responde ok" do
    ExchangeRateService.stub(:fetch, ok(rate)) do
      with_mcp_key do
        cuerpo = tool_json(ExchangeRatesGetTool.call(currency: "USD", date: "2026-07-17",
                                                     server_context: ctx))
        assert_equal "4120.5", cuerpo["rate_to_cop"]
        assert_equal "trm_oficial", cuerpo["source"]
        assert_equal true, cuerpo["cached"]
      end
    end
  end

  test "distingue requested_date de rate_date" do
    domingo = rate(requested_date: Date.new(2026, 7, 19), rate_date: Date.new(2026, 7, 17),
                   stale: true)
    ExchangeRateService.stub(:fetch, ok(domingo)) do
      with_mcp_key do
        cuerpo = tool_json(ExchangeRatesGetTool.call(currency: "USD", date: "2026-07-19",
                                                     server_context: ctx))
        assert_equal "2026-07-19", cuerpo["requested_date"]
        assert_equal "2026-07-17", cuerpo["rate_date"]
        assert_includes cuerpo["message"], "no estaba publicada"
      end
    end
  end

  test "moneda invalida devuelve error con la lista de validas" do
    with_mcp_key do
      texto = tool_text(ExchangeRatesGetTool.call(currency: "JPY", date: "2026-07-17",
                                                  server_context: ctx))
      assert_includes texto, "USD"
      assert_includes texto, "EUR"
    end
  end

  test "fecha invalida devuelve error" do
    with_mcp_key do
      assert_tool_error ExchangeRatesGetTool.call(currency: "USD", date: "14/07/2026",
                                                  server_context: ctx),
                        "YYYY-MM-DD"
    end
  end

  test "cuando el servicio falla devuelve error y no inventa tasa" do
    ExchangeRateService.stub(:fetch, falla("fuente TRM no disponible")) do
      with_mcp_key do
        texto = tool_text(ExchangeRatesGetTool.call(currency: "USD", date: "2026-07-17",
                                                    server_context: ctx))
        assert texto.start_with?("Error:")
        # Ni un numero de tres cifras: si se colara, seria una tasa inventada.
        refute_match(/\d{3,}/, texto)
      end
    end
  end

  test "sin api key devuelve unauthorized" do
    with_mcp_key do
      assert_tool_error ExchangeRatesGetTool.call(currency: "USD", date: "2026-07-17",
                                                  server_context: ctx(api_key: "mala")),
                        "Unauthorized"
    end
  end
end
