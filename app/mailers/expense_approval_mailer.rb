# Los dos correos del circuito de aprobacion de un gasto. Los dos salen SOLO con
# EXPENSE_APPROVAL_EMAIL encendido, que hoy esta apagado en produccion.
#
#   1. `pending_approval` -> al DUEÑO DEL CENTRO: "tiene un gasto por decidir".
#      Lo dispara `ReportExpense#avisar_al_dueno_del_centro` al crear.
#   2. `decision` -> al RESPONSABLE DEL GASTO: "le aprobaron / le rechazaron lo
#      que reporto". Lo dispara `ReportExpense#avisar_la_decision_al_responsable`
#      cuando el estado operativo se mueve.
#
# Van en el MISMO mailer y no en dos, porque son las dos puntas de la misma
# conversacion y comparten remitente, estilo y la forma del asunto.
class ExpenseApprovalMailer < ApplicationMailer
  # El remitente sale de ENV para que en un despliegue nuevo no haya que tocar
  # codigo, con el mismo buzon que ya usa el correo de aprobacion de reportes
  # como respaldo.
  def self.remitente = ENV["EXPENSE_APPROVAL_FROM"].presence || "aprobaciones@controlmatica.com.co"

  def pending_approval(expense, approver)
    @expense = expense
    @approver = approver
    @cost_center = expense.cost_center
    @responsable = expense.user_invoice
    @motivo = expense.motivo_de_retencion

    # El token se genera AQUI y no en el modelo: es parte del correo, y ligarlo
    # al armado del mensaje deja claro que cada aviso lleva el suyo, con su
    # propia caducidad contada desde que se envio.
    @url_aprobar = expense_approval_url(t: ExpenseApprovalToken.generate(expense))

    # SEGUNDA SALIDA, para el que no quiere decidir sobre un gasto suelto sino
    # ver el panorama. `?scope=owned_centers` abre la pantalla de Gastos ya
    # parada en la pestaña "Centros a mi cargo" (ver `scopeInicial` en
    # packs/ReportExpenseIndex.js), asi que aterriza en SU lista y no en una
    # tabla que tiene que reencuadrar.
    #
    # ESTA SI PIDE SESION, a diferencia del boton de aprobar, y asi se quiere:
    # no lleva token porque no autoriza nada, solo navega. El que quiera mirar
    # su lista completa entra a la aplicacion como cualquier otro dia; el token
    # existe para lo unico que no puede esperar a un login, que es decidir sobre
    # el gasto que motivo el correo.
    @url_lista = report_expenses_url(scope: "owned_centers")

    mail(to: approver.email,
         from: self.class.remitente,
         subject: asunto)
  end

  # La respuesta al que reporto el gasto: se lo aprobaron o se lo rechazaron.
  #
  # VA AL RESPONSABLE (`user_invoice`) Y NO A QUIEN LO CREO. Son casi siempre la
  # misma persona, pero cuando no lo son —un asistente registra el gasto de un
  # ingeniero— el que necesita enterarse es a quien se le va a pagar o a quien
  # hay que pedirle la factura corregida.
  #
  # NO LLEVA TOKEN NI BOTONES. No hay nada que decidir: es un aviso de algo que
  # ya paso. Un enlace con token aqui seria una llave de 7 dias repartida sin
  # motivo.
  def decision(expense, decisor)
    @expense = expense
    @decisor = decisor
    @cost_center = expense.cost_center
    @responsable = expense.user_invoice
    @rechazado = expense.rechazado?
    @motivo_rechazo = expense.rejection_reason

    @url_lista = report_expenses_url(scope: "mine")

    mail(to: @responsable.email,
         from: self.class.remitente,
         subject: asunto_de_la_decision)
  end

  private

  # Mismo criterio que el otro asunto: el resultado y el centro van ANTES de
  # abrir el correo. Quien reporta diez gastos a la semana no deberia tener que
  # abrir diez correos para saber cual le rebotaron.
  def asunto_de_la_decision
    codigo = @cost_center&.code.presence || "sin centro"
    resultado = @rechazado ? "rechazado" : "aprobado"
    "Su gasto fue #{resultado} · #{codigo}"
  end

  # El codigo del centro va en el ASUNTO y no solo en el cuerpo: quien es dueño
  # de varios centros los filtra en su bandeja sin abrir nada.
  def asunto
    codigo = @cost_center&.code.presence || "sin centro"
    "Gasto pendiente de su aprobación · #{codigo}"
  end
end
