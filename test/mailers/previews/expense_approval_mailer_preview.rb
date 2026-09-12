# Vista previa en http://localhost:3000/rails/mailers/expense_approval_mailer
#
# EXISTE PORQUE LA FEATURE SE ENTREGA APAGADA. Sin esto, la unica forma de ver
# como queda el correo antes de encender EXPENSE_APPROVAL_EMAIL en produccion
# seria mandarselo a alguien de verdad.
#
# NO ENVIA NADA y NO ESCRIBE NADA: toma el ultimo gasto sin aceptar que haya en
# la base de desarrollo y arma el mensaje en memoria.
class ExpenseApprovalMailerPreview < ActionMailer::Preview
  def pending_approval
    gasto = ReportExpense.where(is_acepted: false).where.not(cost_center_id: nil).order(id: :desc).first
    return sin_datos if gasto.nil?

    # El destinatario real es el propietario del centro; si ese centro no tiene
    # uno, se usa cualquier usuario para poder pintar la plantilla.
    dueno = gasto.cost_center&.user_owner || User.first
    return sin_datos if dueno.nil?

    ExpenseApprovalMailer.pending_approval(gasto, dueno)
  end

  private

  def sin_datos
    raise "No hay ningun gasto sin aceptar con centro de costos en esta base para previsualizar."
  end
end
