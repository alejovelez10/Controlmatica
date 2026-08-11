# Verificacion de SOLO LECTURA del esquema del proyecto de gastos/presupuesto/
# multimoneda/contabilidad. No escribe nada: se puede correr en desarrollo, test,
# staging y produccion.
#
# Forma parte del runbook de despliegue de la ola 2 como verificacion post-deploy.
#
# OJO con la verificacion 3 (backfill): comprueba que los gastos historicos
# quedaron en COP, sin presupuesto, sin comprobante y sin aprobacion contable.
# Eso es cierto INMEDIATAMENTE DESPUES DE MIGRAR. Cuando los paquetes 04, 05 y 06
# esten en uso, esos contadores dejaran de ser 0 legitimamente. Es un chequeo
# post-migracion, no una invariante permanente.
namespace :gastos_ia_schema do
  desc "Verifica el esquema y el backfill del proyecto de gastos/presupuesto/multimoneda (solo lectura)"
  task check: :environment do
    conn   = ActiveRecord::Base.connection
    fallos = []
    ok     = ->(msg) { puts "  OK    #{msg}" }
    falla  = ->(msg) { fallos << msg; puts "  FALLA #{msg}" }

    migraciones = %w[
      20260401000001 20260401000002 20260402000001
      20260403000001 20260403000002 20260404000001
    ]

    columnas_nuevas = %w[
      expense_budget_id budget_status budget_reason receipt_file currency
      foreign_value foreign_tax foreign_total exchange_rate exchange_rate_date
      exchange_rate_source accounting_approved accounting_approved_by_id
      accounting_approved_at
    ]

    indices_nuevos = %w[
      index_expense_budgets_on_center_user_active
      index_expense_budgets_on_cost_center_id
      index_expense_budgets_on_user_id
      index_report_expenses_on_expense_budget_id
      index_report_expenses_on_budget_status
      index_report_expenses_on_foreign_currency
      index_report_expenses_on_invoice_number_and_identification
      index_exchange_rates_on_currency_and_rate_date
      index_exchange_rates_on_currency_and_effective_date
      index_report_expenses_on_accounting_approved_and_date
    ]

    # Devuelve un hash nombre => fila de information_schema.columns
    columnas = lambda do |tabla|
      conn.select_all(<<~SQL).to_a.index_by { |f| f["column_name"] }
        SELECT column_name, data_type, is_nullable, column_default,
               numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = #{conn.quote(tabla)}
      SQL
    end

    puts "\nVerificando el esquema de gastos IA en #{Rails.env} (#{conn.current_database})\n\n"

    # --- 1. Las 6 migraciones aplicadas --------------------------------------
    puts "1. Migraciones aplicadas"
    aplicadas = conn.select_values(
      "SELECT version FROM schema_migrations WHERE version IN (#{migraciones.map { |v| conn.quote(v) }.join(', ')})"
    )
    faltantes = migraciones - aplicadas
    if faltantes.empty?
      ok.call("las 6 migraciones del proyecto estan aplicadas")
    else
      falla.call("faltan #{faltantes.size} migracion(es): #{faltantes.join(', ')}")
    end

    # --- 2. Las 14 columnas nuevas de report_expenses ------------------------
    puts "\n2. Columnas nuevas de report_expenses"
    re = columnas.call("report_expenses")
    ausentes = columnas_nuevas - re.keys
    if ausentes.empty?
      ok.call("las 14 columnas nuevas existen")
    else
      falla.call("faltan #{ausentes.size} columna(s) en report_expenses: #{ausentes.join(', ')}")
    end

    esperado = {
      "currency"            => { "data_type" => "character varying", "is_nullable" => "NO" },
      "budget_status"       => { "data_type" => "character varying", "is_nullable" => "NO" },
      "accounting_approved" => { "data_type" => "boolean",           "is_nullable" => "NO" },
      "exchange_rate"       => { "data_type" => "numeric", "numeric_precision" => 18, "numeric_scale" => 6 },
      "foreign_value"       => { "data_type" => "numeric", "numeric_precision" => 15, "numeric_scale" => 2 },
      "foreign_tax"         => { "data_type" => "numeric", "numeric_precision" => 15, "numeric_scale" => 2 },
      "foreign_total"       => { "data_type" => "numeric", "numeric_precision" => 15, "numeric_scale" => 2 }
    }
    esperado.each do |nombre, atributos|
      fila = re[nombre]
      next falla.call("#{nombre}: la columna no existe") if fila.nil?

      atributos.each do |clave, valor|
        real = fila[clave]
        real = real.to_i if valor.is_a?(Integer) && !real.nil?
        if real == valor
          ok.call("report_expenses.#{nombre}.#{clave} = #{valor}")
        else
          falla.call("report_expenses.#{nombre}.#{clave} = #{real.inspect}, se esperaba #{valor.inspect}")
        end
      end
    end

    defaults = {
      "currency"            => "'COP'::character varying",
      "budget_status"       => "'sin_presupuesto'::character varying",
      "accounting_approved" => "false"
    }
    defaults.each do |nombre, valor|
      real = re.dig(nombre, "column_default")
      if real == valor
        ok.call("report_expenses.#{nombre} default #{valor}")
      else
        falla.call("report_expenses.#{nombre} default #{real.inspect}, se esperaba #{valor.inspect}")
      end
    end

    # --- 3. Backfill de historicos -------------------------------------------
    puts "\n3. Backfill de los gastos historicos"
    backfill = conn.select_one(<<~SQL)
      SELECT count(*)                                                   AS total,
             count(*) FILTER (WHERE currency IS NULL)                   AS currency_nulos,
             count(*) FILTER (WHERE currency <> 'COP')                  AS currency_no_cop,
             count(*) FILTER (WHERE budget_status IS NULL)              AS estado_nulo,
             count(*) FILTER (WHERE budget_status <> 'sin_presupuesto') AS estado_no_default,
             count(*) FILTER (WHERE budget_reason IS NOT NULL)          AS con_motivo,
             count(*) FILTER (WHERE expense_budget_id IS NOT NULL)      AS con_partida,
             count(*) FILTER (WHERE accounting_approved)                AS contab_aprobados,
             count(*) FILTER (WHERE accounting_approved_by_id IS NOT NULL) AS contab_con_actor,
             count(*) FILTER (WHERE accounting_approved_at IS NOT NULL)    AS contab_con_fecha,
             count(*) FILTER (WHERE receipt_file IS NOT NULL)           AS con_comprobante,
             count(*) FILTER (WHERE foreign_value IS NOT NULL
                                 OR foreign_tax IS NOT NULL
                                 OR foreign_total IS NOT NULL
                                 OR exchange_rate IS NOT NULL
                                 OR exchange_rate_date IS NOT NULL
                                 OR exchange_rate_source IS NOT NULL)   AS con_multimoneda
      FROM report_expenses
    SQL
    puts "  (#{backfill['total']} gastos en la tabla)"
    backfill.except("total").each do |contador, valor|
      if valor.to_i.zero?
        ok.call("#{contador} = 0")
      else
        falla.call("#{contador} = #{valor} (se esperaba 0 inmediatamente despues de migrar)")
      end
    end

    # --- 4. Los tres campos de dinero viejos siguen en float -----------------
    puts "\n4. Invariante: los importes en COP siguen siendo float"
    %w[invoice_value invoice_tax invoice_total].each do |nombre|
      tipo = re.dig(nombre, "data_type")
      if tipo == "double precision"
        ok.call("report_expenses.#{nombre} sigue en double precision")
      else
        falla.call("report_expenses.#{nombre} es #{tipo.inspect}: eso rompe recalculate_cost_center")
      end
    end

    # --- 5. expense_budgets ---------------------------------------------------
    puts "\n5. Tabla expense_budgets"
    eb = columnas.call("expense_budgets")
    if eb.empty?
      falla.call("la tabla expense_budgets no existe")
    else
      esperadas_eb = %w[
        id cost_center_id user_id amount notes active created_by_id
        last_user_edited_id created_at updated_at
      ]
      if esperadas_eb.sort == eb.keys.sort
        ok.call("expense_budgets tiene sus 10 columnas exactas")
      else
        falla.call("columnas de expense_budgets: sobran #{(eb.keys - esperadas_eb).inspect}, faltan #{(esperadas_eb - eb.keys).inspect}")
      end

      amount = eb["amount"]
      if amount && amount["data_type"] == "numeric" && amount["numeric_precision"].to_i == 15 &&
         amount["numeric_scale"].to_i == 2 && amount["is_nullable"] == "NO" && amount["column_default"].to_f.zero?
        ok.call("amount es numeric(15,2) NOT NULL DEFAULT 0.0")
      else
        falla.call("amount no es numeric(15,2) NOT NULL DEFAULT 0.0: #{amount.inspect}")
      end

      active = eb["active"]
      if active && active["data_type"] == "boolean" && active["is_nullable"] == "NO" &&
         active["column_default"] == "true"
        ok.call("active es boolean NOT NULL DEFAULT true")
      else
        falla.call("active no es boolean NOT NULL DEFAULT true: #{active.inspect}")
      end

      %w[cost_center_id user_id].each do |nombre|
        if eb.dig(nombre, "is_nullable") == "NO"
          ok.call("#{nombre} es NOT NULL")
        else
          falla.call("expense_budgets.#{nombre} deberia ser NOT NULL")
        end
      end
    end

    # --- 6. exchange_rates ----------------------------------------------------
    puts "\n6. Tabla exchange_rates"
    er = columnas.call("exchange_rates")
    if er.empty?
      falla.call("la tabla exchange_rates no existe")
    else
      negocio = %w[currency rate_date effective_date rate_to_cop source fetched_at]
      esperadas_er = negocio + %w[id created_at updated_at]
      if esperadas_er.sort == er.keys.sort
        ok.call("exchange_rates tiene sus 6 columnas de negocio + id y timestamps")
      else
        falla.call("columnas de exchange_rates: sobran #{(er.keys - esperadas_er).inspect}, faltan #{(esperadas_er - er.keys).inspect}")
      end

      negocio.each do |nombre|
        if er.dig(nombre, "is_nullable") == "NO"
          ok.call("#{nombre} es NOT NULL")
        else
          falla.call("exchange_rates.#{nombre} deberia ser NOT NULL")
        end
      end

      tasa = er["rate_to_cop"]
      if tasa && tasa["numeric_precision"].to_i == 18 && tasa["numeric_scale"].to_i == 6
        ok.call("rate_to_cop es numeric(18,6)")
      else
        falla.call("rate_to_cop no es numeric(18,6): #{tasa.inspect}")
      end
    end

    # --- 7. Los 10 indices ----------------------------------------------------
    puts "\n7. Indices nuevos"
    presentes = conn.select_values(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (#{indices_nuevos.map { |i| conn.quote(i) }.join(', ')})"
    )
    if (indices_nuevos - presentes).empty?
      ok.call("los 10 indices nuevos existen con su nombre exacto")
    else
      falla.call("faltan #{(indices_nuevos - presentes).size} indice(s): #{(indices_nuevos - presentes).join(', ')}")
    end

    # --- 8. El indice de currency es parcial ---------------------------------
    puts "\n8. El indice de currency es parcial"
    definicion = conn.select_value(
      "SELECT indexdef FROM pg_indexes WHERE indexname = 'index_report_expenses_on_foreign_currency'"
    )
    if definicion.to_s.include?("WHERE ((currency)::text <> 'COP'::text)")
      ok.call("index_report_expenses_on_foreign_currency es parcial")
    else
      falla.call("index_report_expenses_on_foreign_currency no es parcial: #{definicion.inspect}")
    end

    # --- 9. El indice de exchange_rates es UNIQUE ----------------------------
    puts "\n9. El indice de la cache de TRM es unico"
    definicion = conn.select_value(
      "SELECT indexdef FROM pg_indexes WHERE indexname = 'index_exchange_rates_on_currency_and_rate_date'"
    )
    if definicion.to_s.start_with?("CREATE UNIQUE INDEX")
      ok.call("index_exchange_rates_on_currency_and_rate_date es UNIQUE")
    else
      falla.call("index_exchange_rates_on_currency_and_rate_date NO es UNIQUE: #{definicion.inspect}")
    end

    # --- 10. Ni foreign keys ni tabla currencies ------------------------------
    puts "\n10. Sin foreign keys y sin tabla currencies"
    fks = conn.select_value(<<~SQL).to_i
      SELECT count(*) FROM pg_constraint
      WHERE contype = 'f'
        AND conrelid::regclass::text IN ('report_expenses', 'expense_budgets', 'exchange_rates')
    SQL
    if fks.zero?
      ok.call("cero foreign keys en las tres tablas")
    else
      falla.call("#{fks} foreign key(s): rompen el orden de borrado de fixtures :all")
    end

    # `::text` para que el driver no tenga que reconocer el tipo regclass.
    if conn.select_value("SELECT to_regclass('public.currencies')::text").nil?
      ok.call("la tabla currencies no existe (el catalogo es una constante Ruby)")
    else
      falla.call("existe la tabla currencies: el catalogo de monedas debe ser una constante Ruby")
    end

    abort("\n#{fallos.size} verificacion(es) fallaron:\n  - #{fallos.join("\n  - ")}") if fallos.any?
    puts "\nEsquema de gastos IA verificado correctamente."
  end
end
