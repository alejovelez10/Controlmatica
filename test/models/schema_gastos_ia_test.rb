require "test_helper"

# Prueba el ESQUEMA y el BACKFILL de las seis migraciones del proyecto de
# gastos/presupuesto/multimoneda/contabilidad.
#
# Se prueba con `ActiveRecord::Base.connection` y SQL crudo a proposito:
# `ExpenseBudget` y `ExchangeRate` todavia NO existen como modelo (son de los
# paquetes 04 y 05), asi que no hay clase que consultar. Las inserciones crudas
# van dentro del rollback automatico de la transaccion del test, de modo que no
# ensucian la base.
#
# Lo que este archivo NO prueba, porque es de otros paquetes: validaciones de
# modelo, aritmetica de conversion y contratos JSON.
class SchemaGastosIaTest < ActiveSupport::TestCase
  # Las seis migraciones de este paquete. `20260405000001` (telefono) es del
  # paquete 11 y no se cuenta aqui.
  MIGRACIONES = %w[
    20260401000001
    20260401000002
    20260402000001
    20260403000001
    20260403000002
    20260404000001
  ].freeze

  # Los 10 indices nuevos: 3 de expense_budgets, 2 de exchange_rates y 5 de
  # report_expenses.
  INDICES_NUEVOS = %w[
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
  ].freeze

  setup do
    @conn = ActiveRecord::Base.connection
  end

  def col(tabla, nombre)
    @conn.columns(tabla).find { |c| c.name == nombre }
  end

  def indice(tabla, nombre)
    @conn.indexes(tabla).find { |i| i.name == nombre }
  end

  def indexdef(nombre)
    @conn.select_value("SELECT indexdef FROM pg_indexes WHERE indexname = #{@conn.quote(nombre)}")
  end

  # --- expense_budgets ------------------------------------------------------

  test "expense_budgets existe con las 10 columnas esperadas" do
    assert @conn.table_exists?("expense_budgets"), "no existe la tabla expense_budgets"

    esperadas = %w[
      active amount cost_center_id created_at created_by_id id
      last_user_edited_id notes updated_at user_id
    ]
    assert_equal esperadas, @conn.columns("expense_budgets").map(&:name).sort
  end

  test "expense_budgets.amount es decimal 15,2 not null default 0" do
    c = col("expense_budgets", "amount")

    assert_equal :decimal, c.type
    assert_equal 15, c.precision
    assert_equal 2, c.scale
    assert_equal false, c.null
    assert_equal 0, c.default.to_d
  end

  test "expense_budgets.active es boolean not null default true" do
    c = col("expense_budgets", "active")

    assert_equal :boolean, c.type
    assert_equal false, c.null
    assert_equal "true", c.default
  end

  test "expense_budgets.cost_center_id y user_id son not null" do
    assert_equal false, col("expense_budgets", "cost_center_id").null
    assert_equal false, col("expense_budgets", "user_id").null
  end

  test "expense_budgets tiene los 3 indices con nombre exacto" do
    compuesto = indice("expense_budgets", "index_expense_budgets_on_center_user_active")
    assert_not_nil compuesto, "falta index_expense_budgets_on_center_user_active"
    assert_equal %w[cost_center_id user_id active], compuesto.columns
    assert_equal false, compuesto.unique, "el indice compuesto NO debe ser unico"

    assert_not_nil indice("expense_budgets", "index_expense_budgets_on_cost_center_id")
    assert_not_nil indice("expense_budgets", "index_expense_budgets_on_user_id")
  end

  test "insertar expense_budget sin cost_center_id levanta NotNullViolation" do
    assert_raises(ActiveRecord::NotNullViolation) do
      @conn.execute(<<~SQL)
        INSERT INTO expense_budgets (user_id, amount, active, created_at, updated_at)
        VALUES (1, 100, true, now(), now())
      SQL
    end
  end

  test "expense_budget insertado sin amount toma el default 0.0" do
    @conn.execute(<<~SQL)
      INSERT INTO expense_budgets (cost_center_id, user_id, active, created_at, updated_at)
      VALUES (1, 1, true, now(), now())
    SQL

    assert_equal 0, @conn.select_value("SELECT amount FROM expense_budgets ORDER BY id DESC LIMIT 1").to_d
  end

  test "amount con mas de 2 decimales se redondea a 2" do
    @conn.execute(<<~SQL)
      INSERT INTO expense_budgets (cost_center_id, user_id, amount, active, created_at, updated_at)
      VALUES (1, 1, 100.006, true, now(), now()), (1, 1, 100.004, true, now(), now())
    SQL

    valores = @conn.select_values("SELECT amount FROM expense_budgets ORDER BY id DESC LIMIT 2").map(&:to_d)

    assert_includes valores, BigDecimal("100.01")
    assert_includes valores, BigDecimal("100.00")
  end

  # El plan pedia "14 enteros entra, 15 revienta". Es aritmeticamente imposible:
  # en numeric(15,2) los 15 digitos INCLUYEN los 2 decimales, asi que la parte
  # entera admite 13 digitos y el tope real es 9_999_999_999_999.99. La prueba
  # se deja sobre el limite verdadero, que es mas estricto que el del plan.
  test "amount con 13 enteros entra y con 14 revienta" do
    @conn.execute(<<~SQL)
      INSERT INTO expense_budgets (cost_center_id, user_id, amount, active, created_at, updated_at)
      VALUES (1, 1, 9999999999999.99, true, now(), now())
    SQL
    assert_equal BigDecimal("9999999999999.99"),
                 @conn.select_value("SELECT amount FROM expense_budgets ORDER BY id DESC LIMIT 1").to_d

    assert_raises(ActiveRecord::StatementInvalid) do
      @conn.execute(<<~SQL)
        INSERT INTO expense_budgets (cost_center_id, user_id, amount, active, created_at, updated_at)
        VALUES (1, 1, 99999999999999.99, true, now(), now())
      SQL
    end
  end

  # --- report_expenses: presupuesto -----------------------------------------

  test "report_expenses tiene las 3 columnas presupuestales" do
    partida = col("report_expenses", "expense_budget_id")
    assert_equal :integer, partida.type
    assert_equal true, partida.null

    estado = col("report_expenses", "budget_status")
    assert_equal :string, estado.type
    assert_equal false, estado.null
    assert_equal "sin_presupuesto", estado.default

    motivo = col("report_expenses", "budget_reason")
    assert_equal :string, motivo.type
    assert_equal true, motivo.null
  end

  test "todos los gastos existentes quedan en sin_presupuesto y sin partida" do
    assert_operator ReportExpense.count, :>, 0, "sin gastos cargados el backfill no prueba nada"

    assert_equal 0, ReportExpense.where.not(budget_status: "sin_presupuesto").count
    assert_equal 0, ReportExpense.where.not(expense_budget_id: nil).count
    assert_equal 0, ReportExpense.where.not(budget_reason: nil).count
  end

  # --- report_expenses: comprobante -----------------------------------------

  test "report_expenses.receipt_file es string nullable sin indice" do
    c = col("report_expenses", "receipt_file")

    assert_equal :string, c.type
    assert_equal true, c.null
    assert @conn.indexes("report_expenses").none? { |i| i.columns.include?("receipt_file") },
           "receipt_file no debe tener indice: nunca se filtra por el nombre del archivo"
  end

  # --- report_expenses: multimoneda -----------------------------------------

  test "report_expenses tiene las 7 columnas multimoneda con precision correcta" do
    moneda = col("report_expenses", "currency")
    assert_equal :string, moneda.type
    assert_equal false, moneda.null
    assert_equal "COP", moneda.default

    %w[foreign_value foreign_tax foreign_total].each do |nombre|
      c = col("report_expenses", nombre)
      assert_equal :decimal, c.type, nombre
      assert_equal 15, c.precision, nombre
      assert_equal 2, c.scale, nombre
      assert_equal true, c.null, nombre
    end

    tasa = col("report_expenses", "exchange_rate")
    assert_equal :decimal, tasa.type
    assert_equal 18, tasa.precision
    assert_equal 6, tasa.scale
    assert_equal true, tasa.null

    assert_equal :date, col("report_expenses", "exchange_rate_date").type
    assert_equal true, col("report_expenses", "exchange_rate_date").null
    assert_equal :string, col("report_expenses", "exchange_rate_source").type
    assert_equal true, col("report_expenses", "exchange_rate_source").null
  end

  test "todos los gastos existentes quedan en COP y sin datos de conversion" do
    assert_operator ReportExpense.count, :>, 0, "sin gastos cargados el backfill no prueba nada"

    assert_equal 0, ReportExpense.where.not(currency: "COP").count
    assert_equal 0, ReportExpense.where.not(exchange_rate: nil).count
    assert_equal 0, ReportExpense.where.not(foreign_value: nil).count
  end

  test "insertar un gasto con currency NULL explicito levanta NotNullViolation" do
    assert_raises(ActiveRecord::NotNullViolation) do
      @conn.execute("UPDATE report_expenses SET currency = NULL WHERE id = #{ReportExpense.first.id}")
    end
  end

  test "exchange_rate conserva 6 decimales" do
    gasto = ReportExpense.first
    @conn.execute("UPDATE report_expenses SET exchange_rate = 4120.500001 WHERE id = #{gasto.id}")

    assert_equal BigDecimal("4120.500001"), gasto.reload.exchange_rate
  end

  test "el indice de currency es parcial sobre currency distinto de COP" do
    definicion = indexdef("index_report_expenses_on_foreign_currency")

    assert_not_nil definicion, "falta index_report_expenses_on_foreign_currency"
    assert_includes definicion, "WHERE"
    assert_includes definicion, "'COP'"
  end

  test "existe el indice compuesto invoice_number identification" do
    i = indice("report_expenses", "index_report_expenses_on_invoice_number_and_identification")

    assert_not_nil i
    assert_equal %w[invoice_number identification], i.columns
  end

  # --- exchange_rates -------------------------------------------------------

  test "exchange_rates existe con sus 6 columnas de negocio y sus 2 indices" do
    assert @conn.table_exists?("exchange_rates"), "no existe la tabla exchange_rates"

    esperadas = %w[created_at currency effective_date fetched_at id rate_date rate_to_cop source updated_at]
    assert_equal esperadas, @conn.columns("exchange_rates").map(&:name).sort

    %w[currency rate_date effective_date rate_to_cop source fetched_at].each do |nombre|
      assert_equal false, col("exchange_rates", nombre).null, "#{nombre} debe ser NOT NULL"
    end

    tasa = col("exchange_rates", "rate_to_cop")
    assert_equal :decimal, tasa.type
    assert_equal 18, tasa.precision
    assert_equal 6, tasa.scale

    assert_equal :date, col("exchange_rates", "effective_date").type
    assert_equal :date, col("exchange_rates", "rate_date").type

    assert_not_nil indice("exchange_rates", "index_exchange_rates_on_currency_and_rate_date")
    assert_not_nil indice("exchange_rates", "index_exchange_rates_on_currency_and_effective_date")
  end

  test "el indice de exchange_rates es unico sobre currency y rate_date" do
    i = indice("exchange_rates", "index_exchange_rates_on_currency_and_rate_date")

    assert_not_nil i
    assert_equal true, i.unique, "sin UNIQUE la cache de TRM pierde su unica garantia"
    assert_equal %w[currency rate_date], i.columns
  end

  test "dos tasas con la misma moneda y fecha levantan RecordNotUnique" do
    # Las 8 columnas van nombradas a proposito: effective_date es NOT NULL, y un
    # INSERT posicional de 7 valores moriria con NotNullViolation en la PRIMERA
    # insercion, con lo que este test nunca probaria el indice unico.
    insert = <<~SQL
      INSERT INTO exchange_rates (currency, rate_date, effective_date, rate_to_cop, source, fetched_at, created_at, updated_at)
      VALUES ('USD', '2026-07-14', '2026-07-14', 4120.5, 'trm_oficial', now(), now(), now())
    SQL

    @conn.execute(insert)

    assert_raises(ActiveRecord::RecordNotUnique) { @conn.execute(insert) }
  end

  test "misma moneda con fechas distintas si convive" do
    @conn.execute(<<~SQL)
      INSERT INTO exchange_rates (currency, rate_date, effective_date, rate_to_cop, source, fetched_at, created_at, updated_at)
      VALUES ('USD', '2026-07-14', '2026-07-14', 4120.5, 'trm_oficial', now(), now(), now())
    SQL
    @conn.execute(<<~SQL)
      INSERT INTO exchange_rates (currency, rate_date, effective_date, rate_to_cop, source, fetched_at, created_at, updated_at)
      VALUES ('USD', '2026-07-15', '2026-07-15', 4130.75, 'trm_oficial', now(), now(), now())
    SQL

    # Se cuentan LAS DOS FILAS DE ESTE TEST, no todas las USD de la tabla: el
    # paquete 05 agrego test/fixtures/exchange_rates.yml (3 filas USD) y un
    # count global pasaria a medir las fixtures en vez del indice. La asercion
    # no se relaja, se acota a lo que el test inserta.
    convivientes = @conn.select_value(<<~SQL).to_i
      SELECT count(*) FROM exchange_rates
      WHERE currency = 'USD' AND rate_date IN ('2026-07-14', '2026-07-15')
    SQL

    assert_equal 2, convivientes
  end

  # --- report_expenses: contabilidad ----------------------------------------

  test "report_expenses tiene las 3 columnas contables" do
    aprobado = col("report_expenses", "accounting_approved")
    assert_equal :boolean, aprobado.type
    assert_equal false, aprobado.null
    assert_equal "false", aprobado.default

    actor = col("report_expenses", "accounting_approved_by_id")
    assert_equal :integer, actor.type
    assert_equal true, actor.null

    fecha = col("report_expenses", "accounting_approved_at")
    assert_equal :datetime, fecha.type
    assert_equal true, fecha.null
  end

  test "ningun gasto existente quedo aprobado por contabilidad" do
    assert_operator ReportExpense.count, :>, 0, "sin gastos cargados el backfill no prueba nada"

    assert_equal 0, ReportExpense.where(accounting_approved: true).count
    assert_equal 0, ReportExpense.where.not(accounting_approved_at: nil).count
  end

  test "existe el indice compuesto accounting_approved invoice_date" do
    i = indice("report_expenses", "index_report_expenses_on_accounting_approved_and_date")

    assert_not_nil i
    assert_equal %w[accounting_approved invoice_date], i.columns
  end

  # --- invariantes que no se pueden romper ----------------------------------

  test "is_acepted quedo intacto" do
    c = col("report_expenses", "is_acepted")

    assert_equal :boolean, c.type
    assert_equal "false", c.default
    assert_equal true, c.null, "is_acepted era nullable y debe seguir siendolo"
    assert_not_nil indice("report_expenses", "index_report_expenses_on_is_acepted")
  end

  test "los tres campos de dinero en COP siguen siendo float" do
    %w[invoice_value invoice_tax invoice_total].each do |nombre|
      assert_equal :float, col("report_expenses", nombre).type,
                   "#{nombre} dejo de ser float: eso rompe recalculate_cost_center"
    end
  end

  test "no se introdujo ninguna foreign key" do
    assert_empty @conn.foreign_keys("expense_budgets")
    assert_empty @conn.foreign_keys("exchange_rates")
    assert_empty @conn.foreign_keys("report_expenses")
  end

  test "el catalogo de monedas no es una tabla" do
    refute @conn.table_exists?("currencies"),
           "el catalogo de monedas es una constante Ruby, no una tabla"
  end

  test "todos los nombres de indice nuevos caben en el limite de 63 de postgres" do
    assert_equal 10, INDICES_NUEVOS.size

    INDICES_NUEVOS.each do |nombre|
      assert_operator nombre.length, :<=, 63, "#{nombre} tiene #{nombre.length} caracteres"
    end
  end

  # --- defaults vistos desde ActiveRecord -----------------------------------

  test "un ReportExpense nuevo nace con los defaults del proyecto" do
    re = ReportExpense.new

    assert_equal "sin_presupuesto", re.budget_status
    assert_equal "COP", re.currency
    assert_equal false, re.accounting_approved
    assert_nil re.expense_budget_id
    # AJUSTADO POR EL PAQUETE 06: al montar ReceiptUploader, `receipt_file`
    # devuelve SIEMPRE un uploader, nunca nil. Se afirma sobre la COLUMNA, que es
    # lo que este test de esquema quiere verificar, y ademas que el uploader
    # viene vacio: las dos juntas son mas estrictas que el `assert_nil` anterior.
    assert_nil re.read_attribute(:receipt_file)
    assert re.receipt_file.blank?
  end

  test "un ReportExpense guardado persiste los defaults" do
    # as_user es obligatorio: los callbacks de auditoria de ReportExpense leen
    # el actor y sin el la creacion revienta.
    gasto = as_user(users(:admin)) do
      ReportExpense.create!(
        user_id: users(:admin).id,
        user_invoice_id: users(:ingeniero).id,
        cost_center_id: cost_centers(:centro_con_viaticos).id,
        invoice_name: "Gasto para defaults de esquema",
        invoice_date: Date.new(2026, 6, 20),
        invoice_number: "FE-SCHEMA-001",
        invoice_value: 10_000.0,
        invoice_tax: 1_900.0,
        invoice_total: 11_900.0
      )
    end

    releido = ReportExpense.find(gasto.id)

    assert_equal "sin_presupuesto", releido.budget_status
    assert_equal "COP", releido.currency
    assert_equal false, releido.accounting_approved
    assert_nil releido.expense_budget_id
    # Ver la nota del test anterior (paquete 06).
    assert_nil releido.read_attribute(:receipt_file)
    assert releido.receipt_file.blank?
  end

  # --- estado migratorio ----------------------------------------------------

  test "las 6 migraciones del proyecto estan aplicadas" do
    versiones = @conn.select_values("SELECT version FROM schema_migrations")

    MIGRACIONES.each do |v|
      assert_includes versiones, v, "falta aplicar la migracion #{v}"
    end
  end
end
