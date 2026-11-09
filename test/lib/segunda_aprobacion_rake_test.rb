require "test_helper"
require "rake"

# `gastos:poner_al_dia_segundo_aprobador` (2026-11-09): los gastos que quedaron
# esperando la segunda aprobación de alguien que ya no es el aprobador de su
# regla, de antes de que cambiar la regla los moviera solos. Sin APLICAR solo
# muestra; con APLICAR=1 los pasa al aprobador de hoy sin tocar la primera firma.
class SegundaAprobacionRakeTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @rake = Rake::Application.new
    Rake.application = @rake
    Rake::Task.define_task(:environment)
    load Rails.root.join("lib/tasks/segunda_aprobacion.rake")

    @admin   = users(:admin)
    @dueno   = users(:dueno_centro)
    @gerente = users(:gerente)
    centro = cost_centers(:centro_con_viaticos)
    centro.update_columns(hour_cotizada: 0.0, eng_hours: 0.0, user_owner_id: @dueno.id)
    ExpenseRule.update_all(active: false)

    @regla = as_user(@admin) do
      ExpenseRule.create!(name: "Montos altos", active: true, applies_to_all_roles: true, mandatory: false,
                          check_duplicates: false, max_invoice_value: 100_000, requires_second_approval: true,
                          second_approver_user: @gerente, user: @admin)
    end
    @gasto = as_user(@admin) do
      ReportExpense.create!(omitir_comprobante_obligatorio: true, user: @admin, cost_center: centro,
                            user_invoice: users(:ingeniero), invoice_name: "Proveedor",
                            invoice_date: Date.current, invoice_number: "FE-RK-1", identification: "900111222",
                            invoice_value: 150_000, invoice_tax: 0, invoice_total: 150_000)
    end
    as_user(@dueno) { @gasto.update!(operational_state: ReportExpense::STATE_ACEPTADO) }
    # Así quedó en prod: la regla cambió de aprobador cuando eso no movía los gastos.
    @regla.update_columns(second_approver_user_id: @admin.id)
    ActionMailer::Base.deliveries.clear
  end

  teardown do
    Rake.application = nil
    User.current = nil
    ENV.delete("APLICAR")
  end

  def correr(aplicar: false)
    ENV["APLICAR"] = "1" if aplicar
    salida, = capture_io do
      con_aviso_de_aprobacion do
        perform_enqueued_jobs { @rake["gastos:poner_al_dia_segundo_aprobador"].tap(&:reenable).invoke }
      end
    end
    salida
  end

  test "sin APLICAR solo muestra el gasto y no cambia nada" do
    salida = correr

    assert_match "gasto ##{@gasto.id}", salida
    assert_match "Solo se mostró", salida
    assert_equal [@gerente.id], @gasto.reload.segundos_aprobadores_ids
    assert_empty ActionMailer::Base.deliveries
  end

  test "con APLICAR lo pasa al aprobador de hoy, conserva la primera firma y le avisa" do
    correr(aplicar: true)
    @gasto.reload

    assert @gasto.pendiente_segunda?
    assert_equal @dueno.id, @gasto.first_approved_by_id
    assert_equal [@admin.id], @gasto.segundos_aprobadores_ids
    assert @gasto.puede_dar_segunda_aprobacion?(@admin)
    assert_equal [[@admin.email]], ActionMailer::Base.deliveries.map(&:to)
  end

  test "correrla otra vez no cambia nada" do
    correr(aplicar: true)
    ActionMailer::Base.deliveries.clear

    assert_match "Ningún gasto espera", correr(aplicar: true)
    assert_empty ActionMailer::Base.deliveries
  end
end
