# Abre WhatsApp con el mensaje que vincula el numero de la persona a su
# usuario (paquete 17, fase 4). Ver Whatsapp::Vinculo.
class WhatsappVinculosController < ApplicationController
  before_action :authenticate_user!

  def show
    enlace = Whatsapp::Vinculo.enlace_para(current_user)
    return render(plain: "El canal de WhatsApp todavía no está configurado.", status: :service_unavailable) unless enlace

    redirect_to enlace
  end
end
