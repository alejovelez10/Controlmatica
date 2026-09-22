# == Schema Information
#
# Table name: report_expense_options
#
#  id         :bigint           not null, primary key
#  category   :string
#  name       :string
#  used_by_ai :boolean          default(TRUE), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :integer
#

require 'test_helper'

class ReportExpenseOptionTest < ActiveSupport::TestCase
  # --- Tipos sin comprobante obligatorio (viaticos) --------------------------

  def tipo(nombre, categoria = "Tipo")
    ReportExpenseOption.new(name: nombre, category: categoria)
  end

  test "el tipo de viaticos de produccion no exige comprobante" do
    assert report_expense_options(:opcion_viaticos).comprobante_opcional?
  end

  test "un tipo cualquiera si exige comprobante" do
    refute report_expense_options(:opcion_tipo).comprobante_opcional?
  end

  test "la comparacion ignora tildes, mayusculas y espacios de mas" do
    assert tipo("VIATICOS alimentacion").comprobante_opcional?
    assert tipo("  viáticos de transporte").comprobante_opcional?
  end

  test "el espacio no separable de los nombres de produccion no rompe la comparacion" do
    # Varios nombres de produccion traen U+00A0 donde parece un espacio.
    assert tipo("Vi\u00E1ticos\u00A0de transporte").comprobante_opcional?
  end

  test "solo cuenta al comienzo del nombre" do
    refute tipo("Gastos de viaticos").comprobante_opcional?
  end

  test "un medio de pago con ese nombre no es un tipo exento" do
    refute tipo("Viaticos", "Medio de pago").comprobante_opcional?
  end

  test "ids_sin_comprobante devuelve solo los tipos exentos" do
    assert_equal [report_expense_options(:opcion_viaticos).id], ReportExpenseOption.ids_sin_comprobante
  end

  # --- Tipos de viatico (nombre propuesto en el formulario) ------------------

  test "el tipo de viaticos de produccion es viatico" do
    assert report_expense_options(:opcion_viaticos).viatico?
  end

  test "un tipo cualquiera no es viatico" do
    refute report_expense_options(:opcion_tipo).viatico?
  end

  test "viatico? normaliza igual que comprobante_opcional?" do
    assert tipo("VIATICOS alimentacion").viatico?
    assert tipo("Viáticos de transporte").viatico?
    refute tipo("Gastos de viaticos").viatico?
    refute tipo("Viaticos", "Medio de pago").viatico?
  end

  test "ids_viaticos devuelve solo los tipos de viatico" do
    assert_equal [report_expense_options(:opcion_viaticos).id], ReportExpenseOption.ids_viaticos
  end
end
