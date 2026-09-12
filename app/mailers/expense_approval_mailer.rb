# Aviso al dueño de un centro de costos de que un gasto suyo quedo pendiente de
# aprobacion. Lo dispara `ReportExpense#avisar_al_dueno_del_centro` y solo sale
# con EXPENSE_APPROVAL_EMAIL encendido.
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

  private

  # El codigo del centro va en el ASUNTO y no solo en el cuerpo: quien es dueño
  # de varios centros los filtra en su bandeja sin abrir nada.
  def asunto
    codigo = @cost_center&.code.presence || "sin centro"
    "Gasto pendiente de su aprobación · #{codigo}"
  end
end
