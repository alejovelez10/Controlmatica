# Aprobacion O RECHAZO de un gasto desde el enlace del correo, SIN iniciar
# sesion.
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
#
# DOS ENLACES DISTINTOS DESDE LA DOBLE APROBACION (2026-10-18):
#   * el del DUEÑO DEL CENTRO (`ExpenseApprovalToken.generate`), que da la
#     primera firma. Si el gasto pide segunda aprobacion, el modelo lo deja en
#     "Pendiente 2ª aprobación" en vez de "Aceptado";
#   * el del SEGUNDO APROBADOR (`generate_segunda`), que dice quien firma y solo
#     sirve mientras el gasto espera la segunda firma.
# Las mismas tres acciones atienden a los dos; `cargar_gasto` decide cual es.
class ExpenseApprovalsController < ApplicationController
  layout "application"

  # Paso 1: el enlace del correo. No cambia nada.
  def show
    return render :invalid, status: :not_found unless cargar_gasto
  end

  # Paso 2: el boton de la pantalla anterior.
  def create
    return render :invalid, status: :not_found unless cargar_gasto

    @accion = :aprobado
    return segunda_firma if @segunda

    # IDEMPOTENTE. Si el gasto ya estaba aceptado no se vuelve a escribir ni se
    # reevalua el presupuesto: es el caso de quien hace doble clic, de quien
    # abre el mismo correo dos veces y de quien lo reenvia. Y es tambien lo que
    # hace tolerable un token que no se puede revocar. Un gasto que ya tiene la
    # primera firma y espera la segunda tambien esta "ya aprobado" para el
    # dueño del centro.
    if @expense.aceptado? || @expense.pendiente_segunda?
      @ya_estaba = true
      return render :done
    end

    decidir(@expense.cost_center&.user_owner) do
      @expense.update(operational_state: ReportExpense::STATE_ACEPTADO)
    end
    render :done
  end

  # Paso 2b: el otro boton de la misma pantalla.
  #
  # MISMO TOKEN QUE APROBAR, y es deliberado: quien puede decir que si sobre un
  # gasto puede decir que no. Un token aparte obligaria a mandar dos enlaces en
  # el correo y a duplicar la caducidad, sin ganar nada —el que tiene el de
  # aprobar ya puede decidir—.
  #
  # Y ES UN POST, por lo mismo que el de aprobar: un GET que rechaza lo
  # dispararia solo el primer antivirus de correo que visite el enlace, y ahi el
  # daño es peor que el de una aprobacion automatica, porque el gasto sale de
  # circulacion y nadie entiende por que.
  def reject
    return render :invalid, status: :not_found unless cargar_gasto

    @accion = :rechazado

    # IDEMPOTENTE, igual que aprobar, y ademas CERRADO: si el gasto ya no esta
    # esperando a QUIEN abrio el enlace no se toca. Cubre el doble clic y tambien
    # el caso de verdad: que alguien ya lo decidio desde la pantalla de Gastos
    # entre que salio el correo y se abrio el enlace. Rechazar por encima de una
    # aceptacion que ya movio presupuesto, desde un correo de hace seis dias,
    # seria pisar una decision mas nueva con uno mas viejo.
    unless @esperando
      @ya_estaba = true
      return render :done
    end
    return render(:invalid, status: :forbidden) if @segunda && !@expense.puede_dar_segunda_aprobacion?(@firmante)

    decidir(@firmante) do
      @expense.rechazar(actor: @firmante, motivo: params[:rejection_reason])
      @expense.save
    end
    render :done
  end

  private

  # Carga el gasto y QUIEN decide segun el enlace. => false si no sirve.
  #
  #   @segunda   - el enlace es del segundo aprobador;
  #   @firmante  - la persona a nombre de quien queda la decision;
  #   @esperando - si el gasto esta esperando justo a esta persona (los botones
  #                se pintan solo entonces).
  def cargar_gasto
    @token = params[:t]

    segunda = ExpenseApprovalToken.find_segunda(@token)
    if segunda
      @expense, @firmante = segunda
      @segunda = true
      @esperando = @expense.pendiente_segunda?
      return true
    end

    @expense = ExpenseApprovalToken.find_expense(@token)
    return false if @expense.nil?

    @firmante = @expense.cost_center&.user_owner
    @esperando = @expense.creado?
    true
  end

  def segunda_firma
    unless @expense.pendiente_segunda?
      @ya_estaba = true
      return render :done
    end

    decidir(@firmante) do
      @expense.update(operational_state: ReportExpense::STATE_ACEPTADO)
    end
    render :done
  end

  # Guarda la decision a nombre de `actor` y reevalua el presupuesto.
  #
  # El actor de la auditoria es quien decide y no `nil`: los callbacks del
  # modelo leen `User.current`, que en una peticion sin sesion viene vacio, y el
  # registro de edicion quedaria sin autor (y la doble aprobacion no sabria
  # quien firma). Se restaura en el `ensure` porque `User.current` es estado de
  # hilo y el hilo se reutiliza.
  #
  # Aceptar compromete cupo y rechazar lo libera, asi que el par (centro,
  # responsable) hay que reevaluarlo en FIFO o el disponible de las pantallas
  # se queda como estaba.
  def decidir(actor)
    previo = User.current
    begin
      User.current = actor
      @resuelto = yield
    ensure
      User.current = previo
    end

    return unless @resuelto && @expense.cost_center_id.present? && @expense.user_invoice_id.present?

    ExpenseBudgetService.reevaluate_center_user!(cost_center_id: @expense.cost_center_id,
                                                 user_id: @expense.user_invoice_id,
                                                 actor: actor)
    @expense.reload
  end
end
