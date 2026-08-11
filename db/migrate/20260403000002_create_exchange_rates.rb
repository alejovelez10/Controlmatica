# Cache persistente de tasas de cambio.
#
# Semantica de las dos fechas, para que nadie las invierta:
#   rate_date      = fecha SOLICITADA. Es la clave de cache.
#   effective_date = fecha de VIGENCIA REAL publicada por la fuente. La TRM publica
#                    `vigenciadesde`/`vigenciahasta` y la del viernes rige sabado y
#                    domingo; sin esta columna no hay cache-hit para fechas no habiles.
#
# El indice UNIQUE sobre (currency, rate_date) NO es decorativo: es el mecanismo de
# serializacion de la cache de TRM con 5 hilos de Puma. Sin `unique: true`,
# `find_or_create_by!` deja duplicados silenciosos.
class CreateExchangeRates < ActiveRecord::Migration[6.1]
  def up
    unless table_exists?(:exchange_rates)
      create_table :exchange_rates do |t|
        t.string   :currency,       null: false
        t.date     :rate_date,      null: false
        t.date     :effective_date, null: false
        t.decimal  :rate_to_cop,    precision: 18, scale: 6, null: false
        t.string   :source,         null: false
        t.datetime :fetched_at,     null: false
        t.timestamps
      end
    end

    unless index_exists?(:exchange_rates, %i[currency rate_date],
                         name: "index_exchange_rates_on_currency_and_rate_date")
      add_index :exchange_rates, %i[currency rate_date], unique: true,
                name: "index_exchange_rates_on_currency_and_rate_date"
    end

    unless index_exists?(:exchange_rates, %i[currency effective_date],
                         name: "index_exchange_rates_on_currency_and_effective_date")
      add_index :exchange_rates, %i[currency effective_date],
                name: "index_exchange_rates_on_currency_and_effective_date"
    end
  end

  def down
    # Los dos indices se van con la tabla.
    drop_table :exchange_rates, if_exists: true
  end
end
