# == Schema Information
#
# Table name: report_expenses
#
#  id                        :bigint           not null, primary key
#  accounting_approved       :boolean          default(FALSE), not null
#  accounting_approved_at    :datetime
#  budget_reason             :string
#  budget_status             :string           default("sin_presupuesto"), not null
#  currency                  :string           default("COP"), not null
#  description               :text
#  exchange_rate             :decimal(18, 6)
#  exchange_rate_date        :date
#  exchange_rate_source      :string
#  foreign_tax               :decimal(15, 2)
#  foreign_total             :decimal(15, 2)
#  foreign_value             :decimal(15, 2)
#  identification            :string
#  invoice_date              :date
#  invoice_name              :string
#  invoice_number            :string
#  invoice_tax               :float            default(0.0)
#  invoice_total             :float            default(0.0)
#  invoice_type              :string
#  invoice_value             :float            default(0.0)
#  is_acepted                :boolean          default(FALSE)
#  payment_type              :string
#  receipt_file              :string
#  rule_violations           :jsonb            not null
#  type_identification       :string
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  accounting_approved_by_id :integer
#  cost_center_id            :integer
#  expense_budget_id         :integer
#  last_user_edited_id       :integer
#  payment_type_id           :integer
#  type_identification_id    :integer
#  user_id                   :integer
#  user_invoice_id           :integer
#
# Indexes
#
#  index_report_expenses_on_accounting_approved_and_date       (accounting_approved,invoice_date)
#  index_report_expenses_on_budget_status                      (budget_status)
#  index_report_expenses_on_cost_center_id                     (cost_center_id)
#  index_report_expenses_on_created_at                         (created_at)
#  index_report_expenses_on_expense_budget_id                  (expense_budget_id)
#  index_report_expenses_on_foreign_currency                   (currency) WHERE ((currency)::text <> 'COP'::text)
#  index_report_expenses_on_invoice_date                       (invoice_date)
#  index_report_expenses_on_invoice_number_and_identification  (invoice_number,identification)
#  index_report_expenses_on_is_acepted                         (is_acepted)
#  index_report_expenses_on_payment_type_id                    (payment_type_id)
#  index_report_expenses_on_type_identification_id             (type_identification_id)
#  index_report_expenses_on_user_id                            (user_id)
#  index_report_expenses_on_user_invoice_id                    (user_invoice_id)
#
require "test_helper"

# Forma del JSON de un gasto (contrato B.1 de 00-ARQUITECTURA.md).
#
# POR QUE SE PRUEBA EL SERIALIZER Y NO SOLO EL ENDPOINT: este archivo es la
# frontera con TRES pantallas (el formulario del 08, las dos tablas del 09 y la
# vista de contabilidad del 06) y todas leen claves por string. Un atributo que
# desaparece de la lista no rompe ninguna prueba de controller —el JSON sigue
# siendo JSON valido— y la pantalla se queda con una columna vacia en silencio.
class ReportExpenseSerializerTest < ActiveSupport::TestCase
  # Las 13 claves que el paquete 07 agrego. Es la union exacta de lo que
  # necesitaban el 05 (las 7 de moneda) y el 06 (las 3 contables + el
  # comprobante), mas las 3 de presupuesto del 04.
  CLAVES_NUEVAS = %i[
    budget_status budget_reason expense_budget_id
    accounting_approved accounting_approved_at
    receipt_file
    currency foreign_value foreign_tax foreign_total
    exchange_rate exchange_rate_date exchange_rate_source
  ].freeze

  setup do
    @gasto = report_expenses(:one)
  end

  def serializar(objeto)
    ActiveModelSerializers::SerializableResource.new(objeto, serializer: ReportExpenseSerializer).as_json
  end

  test "receipt_file es nil cuando no hay comprobante" do
    hash = serializar(@gasto)

    # `assert_nil` y NO `assert_empty`: CarrierWave devuelve {"url": nil} si se
    # le deja serializar el uploader crudo, y ese hash es truthy en JavaScript.
    # Con el, el boton de "ver comprobante" aparece en gastos que no tienen
    # ninguno y el usuario recibe un 404.
    assert_nil hash[:receipt_file]
  end

  test "receipt_file devuelve un hash con url cuando hay comprobante" do
    as_user(users(:admin)) do
      @gasto.receipt_file = upload_fixture("comprobante.pdf")
      @gasto.save!
    end

    hash = serializar(@gasto.reload)

    assert_kind_of Hash, hash[:receipt_file]
    assert_kind_of String, hash[:receipt_file][:url]
    refute_empty hash[:receipt_file][:url]
  end

  test "expone los 13 campos nuevos" do
    hash = serializar(@gasto)

    assert_equal [], CLAVES_NUEVAS - hash.keys,
                 "Faltan claves en el serializer de gasto: #{(CLAVES_NUEVAS - hash.keys).inspect}"
  end

  test "expone accounting_approved_by como asociacion" do
    hash = serializar(@gasto)

    assert_includes hash.keys, :accounting_approved_by
  end

  test "no hay atributos que colisionen con asociaciones nuevas" do
    # §4.3: el archivo ya arrastra la colision preexistente de `payment_type`
    # (atributo string + belongs_to con el mismo nombre) y esta prohibido
    # empeorarla. Las asociaciones NUEVAS de este paquete no pueden repetir el
    # nombre de ningun atributo.
    atributos = ReportExpenseSerializer._attributes.map(&:to_sym)
    asociaciones_nuevas = %i[accounting_approved_by]

    asociaciones_nuevas.each do |nombre|
      refute_includes atributos, nombre,
                      "`#{nombre}` esta como atributo Y como asociacion: colision prohibida por §4.3"
    end

    # Y la que la regla prohibe explicitamente: expense_budget se expone como id
    # y nunca como objeto anidado.
    refute_includes ReportExpenseSerializer._reflections.keys.map(&:to_sym), :expense_budget,
                    "belongs_to :expense_budget esta prohibido: colisiona con el atributo expense_budget_id"
  end

  test "los decimales se serializan como string" do
    as_user(users(:admin)) do
      @gasto.update_columns(currency: "USD", foreign_value: BigDecimal("120.50"),
                            foreign_tax: BigDecimal("0.0"), foreign_total: BigDecimal("120.50"),
                            exchange_rate: BigDecimal("4100.123456"))
    end

    hash = serializar(@gasto.reload)

    # BigDecimal -> String en el JSON. El frontend hace parseFloat; convertirlos
    # a float aqui perderia centavos en montos grandes.
    assert_kind_of BigDecimal, hash[:foreign_value]
    assert_equal "120.5", hash[:foreign_value].to_s
    assert_equal "4100.123456", hash[:exchange_rate].to_s
  end

  test "accounting_approved_by serializa solo id names y phone y es nil cuando nadie aprobo" do
    assert_nil serializar(@gasto)[:accounting_approved_by],
               "Un gasto sin aprobar no puede traer aprobador"

    as_user(users(:admin)) do
      @gasto.update_columns(accounting_approved: true,
                            accounting_approved_by_id: users(:contador).id,
                            accounting_approved_at: Time.current)
    end

    hash = serializar(@gasto.reload)

    # UserSerializer expone id, names y phone (phone lo agrego el trabajo de
    # WhatsApp que ya estaba en la rama; el contrato pedia id y names y esas dos
    # siguen ahi).
    assert_equal %i[id names phone].sort, hash[:accounting_approved_by].keys.sort
    assert_equal users(:contador).id, hash[:accounting_approved_by][:id]
  end

  test "conserva los 19 atributos originales y no los reordena" do
    # El orden de `attributes` es el orden de las claves del JSON y hay tablas
    # del frontend que arman columnas por posicion. Los 19 originales van
    # primero y en su orden historico.
    originales = %i[id invoice_name invoice_date identification description invoice_number
                    invoice_type payment_type invoice_value invoice_tax invoice_total
                    cost_center_id user_invoice_id user_invoice type_identification_id
                    payment_type_id updated_at is_acepted created_at]

    assert_equal originales, ReportExpenseSerializer._attributes.first(19).map(&:to_sym)
  end
end
