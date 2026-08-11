class ExchangeRatesController < ApplicationController
  # Solo autenticacion (00-ARQUITECTURA E.1). La TRM es un dato publico: pedir
  # un AccionModule para consultarla dejaria sin poder registrar un gasto en
  # dolares a los mismos usuarios que si pueden registrarlo en pesos.
  before_action :authenticate_user!

  # LOS DOS CASOS RESPONDEN HTTP 200 a proposito: el frontend del repo
  # discrimina por la clave `type`, no por el status. Devolver 4xx aqui haria
  # que el formulario mostrara el error generico de red en vez del mensaje
  # "ingresela manualmente", que es la accion que el usuario tiene que tomar.
  def get_exchange_rate
    result = ExchangeRateService.fetch(currency: params[:currency], date: params[:date])

    if result.ok?
      r = result.value
      render json: {
        type: "success", currency: r.currency,
        rate_date: r.rate_date, requested_date: r.requested_date,
        rate_to_cop: r.rate_to_cop, source: r.source,
        cached: r.cached, stale: r.stale
      }
    else
      # SIN rate_to_cop. Nunca se devuelve una tasa inventada ni la de otra
      # fecha sin decirlo: un gasto causado con una tasa falsa es un error
      # contable que nadie detecta hasta el cierre.
      render json: {
        type: "error", currency: Currency.normalize(params[:currency]),
        requested_date: params[:date], message: result.errors
      }
    end
  end
end
