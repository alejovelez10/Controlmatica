# Aprobacion de un gasto desde el enlace del correo, SIN iniciar sesion.
#
# NO LLEVA `authenticate_user!` a proposito: el dueño de un centro de costos
# abre el correo en el telefono y no tiene por que tener sesion abierta. Lo que
# autoriza la accion es el token firmado (ExpenseApprovalToken), que vale para
# UN gasto y caduca.
#
# SON DOS PASOS Y NO UNO, y esta es la decision que mas importa de este archivo.
# El precedente del repo —`aprobar_informe`, un GET que aprueba de una— tiene un
# defecto conocido: los antivirus de correo, Outlook Safe Links y los
# prefetchers de los clientes VISITAN los enlaces de un correo para revisarlos.
# Con un GET que muta, el gasto se aprobaria solo, sin que nadie hiciera clic, y
# nadie entenderia por que. Aqui el GET solo PINTA el gasto y la aprobacion
# viaja en un POST desde el boton, que ningun escaner dispara.
class ExpenseApprovalsController < ApplicationController
  layout "application"

  # Paso 1: el enlace del correo. No cambia nada.
  def show
    @expense = ExpenseApprovalToken.find_expense(params[:t])
    return render :invalid, status: :not_found if @expense.nil?

    @token = params[:t]
  end

  # Paso 2: el boton de la pantalla anterior.
  def create
    @expense = ExpenseApprovalToken.find_expense(params[:t])
    return render :invalid, status: :not_found if @expense.nil?

    # IDEMPOTENTE. Si el gasto ya estaba aceptado no se vuelve a escribir ni se
    # reevalua el presupuesto: es el caso de quien hace doble clic, de quien
    # abre el mismo correo dos veces y de quien lo reenvia. Y es tambien lo que
    # hace tolerable un token que no se puede revocar.
    if @expense.is_acepted?
      @ya_estaba = true
      return render :done
    end

    aprobador = @expense.cost_center&.user_owner

    # El actor de la auditoria es el dueño del centro y no `nil`: los callbacks
    # del modelo leen `User.current`, que en una peticion sin sesion viene
    # vacio, y el registro de edicion quedaria sin autor. Se restaura en el
    # `ensure` porque `User.current` es estado de hilo y el hilo se reutiliza.
    previo = User.current
    begin
      User.current = aprobador
      @aprobado = @expense.update(is_acepted: true)
    ensure
      User.current = previo
    end

    # Mismo motivo que en `update_state_report_expense`: aceptar compromete
    # cupo, asi que el par (centro, responsable) hay que reevaluarlo en FIFO o
    # el disponible de las pantallas se queda como estaba.
    if @aprobado && @expense.cost_center_id.present? && @expense.user_invoice_id.present?
      ExpenseBudgetService.reevaluate_center_user!(cost_center_id: @expense.cost_center_id,
                                                   user_id: @expense.user_invoice_id,
                                                   actor: aprobador)
      @expense.reload
    end

    render :done
  end
end
