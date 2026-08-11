require "test_helper"
# Object#stub viene de minitest/mock, que ya esta dentro de minitest: no es una
# gema nueva. rails/test_help no lo carga solo y test_helper.rb es del paquete 01.
require "minitest/mock"

# Contrato entre el stub de E2E y el servicio real.
#
# ES EL TEST MAS VALIOSO DEL PAQUETE 12: un stub que se desincroniza del servicio
# real produce 36 E2E verdes que no prueban nada. Aqui se comprueba que el stub
# conserva la firma, el tipo de retorno y el contrato de error del metodo que
# reemplaza.
#
# El initializer no se carga en la suite de Minitest (no hay E2E_STUBS), asi que
# estos tests lo cargan a mano con la variable puesta y la restauran despues.
#
# TRAMPA QUE ESTE ARCHIVO YA PAGO: `prepend` sobre el singleton_class es
# IRREVERSIBLE y gana sobre el metodo que escribe `Minitest#stub`. Por eso el
# initializer trae la guarda `E2eStubs.activo?`: con la variable apagada el
# modulo delega en `super` y los ~10 stubs de exchange_rate_service_test.rb
# siguen funcionando corra el orden que corra.
class E2eStubsTest < ActiveSupport::TestCase
  INITIALIZER = Rails.root.join("config", "initializers", "e2e_stubs.rb")

  setup do
    @flag_previo = ENV["E2E_STUBS"]
    ENV["E2E_STUBS"] = "1"
    load INITIALIZER
  end

  teardown do
    ENV["E2E_STUBS"] = @flag_previo
    ENV.delete("E2E_STUBS") if @flag_previo.nil?
    FileUtils.rm_f(E2eStubs::LOG) if defined?(E2eStubs)
  end

  test "el initializer de stubs aborta si E2E_STUBS esta activo fuera de test" do
    Rails.stub(:env, ActiveSupport::StringInquirer.new("production")) do
      error = assert_raises(RuntimeError) { load INITIALIZER }
      assert_equal "E2E_STUBS=1 fuera de RAILS_ENV=test", error.message
    end
  end

  test "el initializer de stubs no se carga sin el flag" do
    ENV.delete("E2E_STUBS")
    # Se carga otra vez sin flag: no debe agregar NADA nuevo a la cadena.
    antes = ExchangeRateService.singleton_class.ancestors.map(&:to_s).count { |m| m.include?("E2eStubs") }
    load INITIALIZER
    despues = ExchangeRateService.singleton_class.ancestors.map(&:to_s).count { |m| m.include?("E2eStubs") }

    assert_equal antes, despues, "sin E2E_STUBS el archivo no puede tocar el servicio"
  end

  test "sin el flag el stub delega en el metodo real y no rompe Minitest#stub" do
    ENV.delete("E2E_STUBS")

    testigo = ExchangeRateService::Result.new(ok: true, value: :del_stub_de_minitest, errors: [])
    ExchangeRateService.stub(:fetch_remote, ->(**) { testigo }) do
      resultado = ExchangeRateService.fetch_remote(currency: "USD", date: Date.new(2026, 6, 15))
      assert_equal :del_stub_de_minitest, resultado.value,
                   "el prepend del E2E no puede tapar los stubs de la suite de Minitest"
    end
  end

  test "el stub de tasas conserva la firma del metodo real" do
    assert_equal [%i[keyreq currency], %i[keyreq date]],
                 ExchangeRateService.method(:fetch_remote).parameters,
                 "si Multimoneda cambia la firma, este stub deja de ser valido"
  end

  test "el stub de tasas devuelve el mismo tipo de Result que el real" do
    resultado = ExchangeRateService.fetch_remote(currency: "USD", date: Date.new(2026, 6, 15))

    assert_instance_of ExchangeRateService::Result, resultado
    assert_respond_to resultado, :ok?
    assert_respond_to resultado, :value
    assert_respond_to resultado, :errors
    assert_instance_of ExchangeRateClient::Quote, resultado.value[:quote]
    assert_equal "trm_oficial", resultado.value[:source]
    assert_equal BigDecimal("4321.5"), resultado.value[:quote].rate
  end

  test "el stub de tasas devuelve el habil anterior para un sabado" do
    resultado = ExchangeRateService.fetch_remote(currency: "USD", date: Date.new(2026, 6, 13))

    assert resultado.ok?
    assert_equal Date.new(2026, 6, 12), resultado.value[:quote].effective_date
    assert_equal BigDecimal("4310.0"), resultado.value[:quote].rate
  end

  test "el stub de tasas falla sin excepcion para una fecha sin tasa" do
    resultado = nil
    assert_nothing_raised do
      resultado = ExchangeRateService.fetch_remote(currency: "USD", date: Date.new(2026, 1, 1))
    end

    refute resultado.ok?
    assert_equal ["sin_tasa"], resultado.errors
    assert_nil resultado.value
  end

  test "el stub de extraccion registra la llamada en stub_calls.log y COP no consulta nada" do
    FileUtils.rm_f(E2eStubs::LOG)

    ReceiptExtractionService.call_vision_model(payload_de("comprobante_ia.jpg"))
    lineas = File.readlines(E2eStubs::LOG).map { |l| JSON.parse(l) }

    assert_equal 1, lineas.size
    assert_equal "ReceiptExtractionService", lineas.last["service"]
    assert_equal "call_vision_model", lineas.last["method"]

    # COP no se consulta a nadie: el log NO crece.
    ExchangeRateService.fetch_remote(currency: "COP", date: Date.new(2026, 6, 15))
    assert_equal 1, File.readlines(E2eStubs::LOG).size,
                 "COP no puede escribir una linea: el servicio real tampoco sale a la red"
  end

  test "el stub de extraccion devuelve el hash crudo del modelo para el comprobante conocido" do
    crudo = ReceiptExtractionService.call_vision_model(payload_de("comprobante_ia.jpg"))

    assert_kind_of Hash, crudo
    assert_equal "HOTEL DANN CARLTON E2E", crudo["provider_name"]
    assert_equal "FE-E2E-IA-001", crudo["invoice_number"]
    assert_equal "COP", crudo["currency"]
    # Las claves de confianza son EXACTAMENTE las que el servicio real normaliza.
    assert_equal ReceiptExtractionService::CONFIDENCE_KEYS.sort, crudo["confidence"].keys.sort
  end

  test "el stub de extraccion no escribe los COP del caso USD: los calcula el servicio real" do
    crudo = ReceiptExtractionService.call_vision_model(payload_de("comprobante_ia_usd.pdf"))

    assert_equal "USD", crudo["currency"]
    assert_equal 120.0, crudo["value"]
    assert_equal 22.8, crudo["tax"]
  end

  test "el stub de extraccion devuelve vacio para un archivo desconocido y no lanza" do
    crudo = nil
    assert_nothing_raised { crudo = ReceiptExtractionService.call_vision_model(payload_de("comprobante.png")) }

    assert_equal({}, crudo)
    assert crudo.blank?, "el servicio real traduce un crudo vacio a 'No se pudo leer el comprobante'"
  end

  private

  # Arma el payload de 00-ARQUITECTURA 6.7 tal como lo construye
  # ReceiptExtractionService#payload_for: el nombre del archivo NO viaja en el
  # payload, solo sus bytes en base64. Por eso el stub selecciona por digesto.
  def payload_de(nombre)
    bytes = Rails.root.join("test", "fixtures", "files", nombre).binread

    { model: "modelo-de-prueba", max_tokens: 2048, system: "…",
      messages: [{ role: "user",
                   content: [{ type: "image",
                               source: { type: "base64", media_type: "image/jpeg",
                                         data: Base64.strict_encode64(bytes) } },
                             { type: "text", text: "Extrae los datos de este comprobante." }] }] }
  end
end
