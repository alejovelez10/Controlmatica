require "test_helper"

class CurrencyTest < ActiveSupport::TestCase
  test "CODES contiene COP USD EUR y esta congelado" do
    assert_equal %w[COP USD EUR], Currency::CODES
    assert Currency::CODES.frozen?, "CODES debe estar congelado"
    assert Currency::CATALOG.frozen?, "CATALOG debe estar congelado"
    assert_equal "COP", Currency::DEFAULT
  end

  test "valid? normaliza minusculas y espacios" do
    assert Currency.valid?(" usd ")
    assert Currency.valid?("USD")
    assert_not Currency.valid?("XXX")
    assert_not Currency.valid?(nil)
    assert_not Currency.valid?("")
  end

  test "foreign? distingue COP de las demas" do
    assert_not Currency.foreign?("COP")
    assert Currency.foreign?("usd")
    assert_not Currency.foreign?("ZZZ")
    assert_not Currency.foreign?(nil)
  end

  test "options devuelve label y value para react-select" do
    options = Currency.options

    assert_equal 3, options.size
    assert_equal({ label: "COP — Peso colombiano", value: "COP" }, options.first)
    options.each do |option|
      assert_equal %i[label value], option.keys
    end
  end

  test "find devuelve el simbolo de la moneda" do
    assert_equal "€", Currency.find("eur")[:symbol]
    assert_nil Currency.find("XXX")
  end
end
