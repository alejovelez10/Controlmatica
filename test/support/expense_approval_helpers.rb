# Helpers del aviso de aprobacion por correo (EXPENSE_APPROVAL_EMAIL).
module ExpenseApprovalHelpers
  # Enciende EXPENSE_APPROVAL_EMAIL solo dentro del bloque.
  #
  # Mismo patron y mismo motivo que `con_comprobante_obligatorio`: el flag
  # arranca APAGADO (ReportExpense.aviso_de_aprobacion?), asi que las pruebas
  # que cubren el correo tienen que encenderlo a mano, y se restaura en `ensure`
  # porque dejarlo encendido le mandaria correos a todo lo que corra despues en
  # el mismo proceso.
  def con_aviso_de_aprobacion
    anterior = ENV["EXPENSE_APPROVAL_EMAIL"]
    ENV["EXPENSE_APPROVAL_EMAIL"] = "true"
    yield
  ensure
    ENV["EXPENSE_APPROVAL_EMAIL"] = anterior
  end
end
