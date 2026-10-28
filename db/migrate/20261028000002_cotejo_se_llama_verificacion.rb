# «Cotejo» pasa a llamarse «verificación» en todo lo que se ve (2026-10-28,
# pedido del usuario: "en todas partes donde diga Cotejo pon verificación").
#
# El codigo ya escribe el texto nuevo; esto corrige los mensajes que quedaron
# guardados desde el 2026-10-25 en los gastos que no se pudieron verificar, para
# que el informe, los correos y el agente no muestren dos nombres para lo mismo.
# Solo toca la frase exacta del sistema, nunca lo que escribio una persona.
#
# Irreversible a proposito: volver al nombre viejo no tiene sentido.
class CotejoSeLlamaVerificacion < ActiveRecord::Migration[6.1]
  VIEJO = "No se pudo cotejar el comprobante".freeze
  NUEVO = "No se pudo verificar el comprobante".freeze

  def up
    viejo = quote(VIEJO)
    nuevo = quote(NUEVO)
    patron = quote("%#{VIEJO}%")

    execute("UPDATE report_expense_rule_hits SET message = replace(message, #{viejo}, #{nuevo}) " \
            "WHERE message LIKE #{patron}")
    %w[rule_violations second_approval_rules].each do |columna|
      execute("UPDATE report_expenses SET #{columna} = replace(#{columna}::text, #{viejo}, #{nuevo})::jsonb " \
              "WHERE #{columna}::text LIKE #{patron}")
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end

  private

  def quote(valor)
    ActiveRecord::Base.connection.quote(valor)
  end
end
