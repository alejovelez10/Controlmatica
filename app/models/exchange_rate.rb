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
class ExchangeRate < ApplicationRecord
  # cross_usd = agregador de mercado cruzado por la TRM, aceptado explicitamente
  # por el usuario para DOP/CRC/HNL porque ningun banco central las publica
  # contra el euro.
  SOURCES = %w[trm_oficial bce manual cross_usd].freeze

  validates :currency,       presence: true, inclusion: { in: Currency::CODES }
  validates :rate_date,      presence: true, uniqueness: { scope: :currency }
  validates :effective_date, presence: true
  validates :rate_to_cop,    presence: true, numericality: { greater_than: 0 }
  validates :source,         presence: true, inclusion: { in: SOURCES }
  validates :fetched_at,     presence: true

  validate :effective_not_after_rate_date

  # rate_date es el dia al que APLICA la tasa (clave de cache y lado del indice
  # unico); effective_date es el dia habil que la PUBLICO. Ver 00-ARQUITECTURA
  # 1.5: sin las dos columnas, pedir la tasa de un sabado nunca da cache hit y
  # cada consulta de fin de semana vuelve a pegarle a la red.
  scope :applicable_on, ->(currency, date) { where(currency: currency, rate_date: date) }
  scope :latest_before, ->(currency, date, window) {
    where(currency: currency)
      .where(rate_date: (date - window)..date)
      .order(rate_date: :desc)
  }

  # "Stale" = la fila que se va a devolver no es la del dia pedido. Lo consume
  # el contrato E.1 para que el frontend avise "no hay tasa del X, se aplico la
  # del Y" en vez de mentir en silencio.
  def stale_for?(date) = rate_date != date.to_date

  private

  def effective_not_after_rate_date
    return if effective_date.blank? || rate_date.blank?

    errors.add(:effective_date, "no puede ser posterior a la fecha de aplicación") if effective_date > rate_date
  end
end
