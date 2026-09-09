require "test_helper"

class CurrencyTest < ActiveSupport::TestCase
  test "CODES contiene los 7 codigos, COP primero, y esta congelado" do
    assert_equal %w[COP USD EUR MXN DOP CRC HNL], Currency::CODES
    assert Currency::CODES.frozen?, "CODES debe estar congelado"
    assert Currency::CATALOG.frozen?, "CATALOG debe estar congelado"
    assert_equal "COP", Currency::DEFAULT
  end

  test "valid? normaliza minusculas y espacios" do
    assert Currency.valid?(" usd ")
    assert Currency.valid?("USD")
    assert Currency.valid?("dop")
    assert_not Currency.valid?("XXX")
    assert_not Currency.valid?(nil)
    assert_not Currency.valid?("")
  end

  test "foreign? distingue COP de las demas" do
    assert_not Currency.foreign?("COP")
    assert Currency.foreign?("usd")
    assert Currency.foreign?("dop")
    assert Currency.foreign?("crc")
    assert Currency.foreign?("hnl")
    assert Currency.foreign?("mxn")
    assert_not Currency.foreign?("ZZZ")
    assert_not Currency.foreign?(nil)
  end

  test "options devuelve label y value para react-select" do
    options = Currency.options

    assert_equal 7, options.size
    assert_equal({ label: "COP — Peso colombiano", value: "COP" }, options.first)
    options.each do |option|
      assert_equal %i[label value], option.keys
    end
  end

  test "todas las monedas tienen 2 decimales" do
    assert_equal [2] * 7, Currency::CATALOG.map { |c| c[:decimals] }
  end

  test "find devuelve el simbolo de la moneda" do
    assert_equal "€", Currency.find("eur")[:symbol]
    assert_equal "L", Currency.find("hnl")[:symbol]
    assert_nil Currency.find("XXX")
  end

  test "rate_source declara la fuente de cada moneda" do
    assert_equal :identity,  Currency.rate_source("COP")
    assert_equal :trm,       Currency.rate_source("USD")
    assert_equal :ecb,       Currency.rate_source("EUR")
    assert_equal :ecb,       Currency.rate_source("MXN")
    assert_equal :cross_usd, Currency.rate_source("DOP")
    assert_equal :cross_usd, Currency.rate_source("CRC")
    assert_equal :cross_usd, Currency.rate_source("HNL")
  end

  test "rate_source normaliza y no levanta para monedas invalidas" do
    assert_equal :cross_usd, Currency.rate_source(" dop ")
    assert_nil Currency.rate_source("XXX")
    assert_nil Currency.rate_source(nil)
  end
end
