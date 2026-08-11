# == Schema Information
#
# Table name: exchange_rates
#
#  id             :bigint           not null, primary key
#  currency       :string           not null
#  effective_date :date             not null
#  fetched_at     :datetime         not null
#  rate_date      :date             not null
#  rate_to_cop    :decimal(18, 6)   not null
#  source         :string           not null
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#
# Indexes
#
#  index_exchange_rates_on_currency_and_effective_date  (currency,effective_date)
#  index_exchange_rates_on_currency_and_rate_date       (currency,rate_date) UNIQUE
#
require "test_helper"

class ExchangeRateTest < ActiveSupport::TestCase
  test "es valida con todos los campos" do
    assert exchange_rates(:usd_habil).valid?
  end

  test "rechaza moneda fuera del catalogo" do
    rate = exchange_rates(:usd_habil)
    rate.currency = "XXX"

    assert_not rate.valid?
    assert_includes rate.errors.attribute_names, :currency
  end

  test "rechaza source fuera de SOURCES" do
    rate = exchange_rates(:usd_habil)
    rate.source = "google"

    assert_not rate.valid?
    assert_includes rate.errors.attribute_names, :source
  end

  test "rechaza rate_to_cop cero o negativa" do
    rate = exchange_rates(:usd_habil)

    rate.rate_to_cop = 0
    assert_not rate.valid?, "rate_to_cop = 0 debe ser invalida"

    rate.rate_to_cop = -1
    assert_not rate.valid?, "rate_to_cop negativa debe ser invalida"
  end

  test "rechaza effective_date posterior a rate_date" do
    rate = exchange_rates(:usd_habil)
    rate.effective_date = rate.rate_date + 1

    assert_not rate.valid?
    assert_includes rate.errors[:effective_date], "no puede ser posterior a la fecha de aplicación"
  end

  test "el indice unico impide duplicar moneda y fecha" do
    # insert! salta las validaciones a proposito: el objetivo es ejercitar el
    # indice de PostgreSQL, no la validacion de uniqueness de Rails (que en
    # concurrencia real no alcanza).
    assert_raises(ActiveRecord::RecordNotUnique) do
      ExchangeRate.insert!({
        currency: "USD", rate_date: Date.new(2026, 7, 17), effective_date: Date.new(2026, 7, 17),
        rate_to_cop: 9999.0, source: "manual", fetched_at: Time.current,
        created_at: Time.current, updated_at: Time.current
      })
    end
  end

  test "stale_for? es true solo cuando rate_date difiere" do
    assert_not exchange_rates(:usd_fin_de_semana).stale_for?(Date.new(2026, 7, 18))
    assert exchange_rates(:usd_habil).stale_for?(Date.new(2026, 7, 18))
  end

  test "applicable_on y latest_before resuelven la cache" do
    assert_equal exchange_rates(:usd_habil),
                 ExchangeRate.applicable_on("USD", Date.new(2026, 7, 17)).first

    # Con ventana de 10 dias desde el 2026-07-05 solo alcanza a usd_vieja.
    assert_equal exchange_rates(:usd_vieja),
                 ExchangeRate.latest_before("USD", Date.new(2026, 7, 5), 10).first
  end
end
