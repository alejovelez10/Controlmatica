# Gastos que se quedaron esperando la segunda aprobación de alguien que ya no
# es el aprobador de su regla (2026-11-09).
#
# Desde el 9-nov, cambiar al segundo aprobador de una regla pasa solo los
# gastos en camino al nuevo aprobador (ExpenseRule#reasignar_gastos_en_camino!).
# Esta tarea pone al día los que quedaron pegados ANTES de ese cambio. Usa la
# misma lógica: solo toca la foto de los gastos en Creado, Pendiente 2ª o
# Rechazado cuyo aprobador ya no coincide con el de la regla, conserva la
# primera firma y deja la nota en el historial de la regla.
#
#   bin/rails gastos:poner_al_dia_segundo_aprobador            # solo muestra
#   APLICAR=1 bin/rails gastos:poner_al_dia_segundo_aprobador  # escribe y avisa
namespace :gastos do
  desc "Pasa al aprobador actual de su regla los gastos que esperan la segunda aprobación de otro"
  task poner_al_dia_segundo_aprobador: :environment do
    aplicar = ENV["APLICAR"] == "1"
    nombre = ->(u) { u ? "#{ExpenseRule.nombre_de_persona(u)} (##{u.id})" : "-" }
    cambios = []

    ActiveRecord::Base.transaction do
      ExpenseRule.where(requires_second_approval: true).order(:id).each do |regla|
        gastos = regla.reasignar_gastos_en_camino!
        cambios << [regla, gastos] if gastos.any?
      end
      raise ActiveRecord::Rollback unless aplicar
    end

    if cambios.empty?
      puts "Ningún gasto espera a un aprobador distinto del de su regla."
      next
    end

    cambios.each do |regla, gastos|
      puts "Regla ##{regla.id} #{regla.name} -> ahora la da #{regla.segundo_aprobador_label}"
      gastos.each do |g|
        sin_firma = g.pendiente_segunda? && g.personas_para_segunda_aprobacion.empty?
        puts "  gasto ##{g.id} | #{g.operational_state_label} | #{nombre.(g.user_invoice)} | " \
             "#{ExpenseBudgetService.money(g.invoice_total)} | 1ª firma: #{nombre.(g.first_approved_by)}" \
             "#{sin_firma ? " | OJO: nadie le puede dar la segunda" : ""}"
      end
      regla.avisar_segunda_aprobacion_a(gastos) if aplicar
    end

    puts(aplicar ? "Listo: gastos actualizados." : "Solo se mostró. Para aplicarlo: APLICAR=1")
  end
end
