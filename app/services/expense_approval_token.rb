# Token del enlace "Aprobar" que viaja en el correo al dueño del centro de
# costos. Autoriza UNA cosa y una sola: aceptar EL gasto que nombra.
#
# FIRMADO Y NO UNA COLUMNA. El precedente del repo —CustomerReport#token— es una
# columna con SecureRandom que vive para siempre en la fila. Un verificador
# firmado no necesita migracion, no cuesta una consulta y, sobre todo, CADUCA
# solo: a los 7 dias el enlace deja de servir aunque el correo siga en la
# bandeja de entrada, que es justo el riesgo de un enlace que se reenvia.
#
# LO QUE ESTE TOKEN NO RESUELVE, escrito para que nadie lo descubra tarde: no se
# puede revocar antes de tiempo y no se invalida al usarse, porque no hay estado
# donde anotarlo. Lo que lo hace tolerable es que la accion es IDEMPOTENTE
# —aceptar un gasto ya aceptado no hace nada— y que el alcance es un gasto.
# Si algun dia hace falta revocar, esto pasa a ser una columna con un nonce.
module ExpenseApprovalToken
  CADUCIDAD = 7.days

  # `purpose` ata la firma a ESTE uso: un token generado para otra cosa con la
  # misma llave secreta no sirve aqui, y al reves.
  PROPOSITO = "expense_approval"

  # Para el correo, que esta en español. `CADUCIDAD.inspect` devuelve "7 days" y
  # se colaba en ingles en medio de una frase en castellano.
  def self.caducidad_en_dias = (CADUCIDAD / 1.day).to_i

  def self.generate(expense)
    verificador.generate(expense.id, purpose: PROPOSITO, expires_in: CADUCIDAD)
  end

  # => ReportExpense, o nil si el enlace ya no sirve.
  #
  # NUNCA LANZA. Token vencido, token manipulado, token de un gasto que despues
  # borraron: los tres son "este enlace ya no sirve", que es una pantalla que se
  # le muestra a una persona, no un 500. `verified` (y no `verify`) es
  # justamente la version que devuelve nil en vez de reventar.
  def self.find_expense(token)
    id = verificador.verified(token.to_s, purpose: PROPOSITO)
    return nil if id.blank?

    ReportExpense.find_by(id: id)
  end

  # VA EN LA QUERY STRING Y NO EN EL PATH. `MessageVerifier` firma con
  # Base64 estandar, que incluye "+" y "/": un token con una barra dentro de un
  # segmento de ruta parte el enrutamiento o llega como %2F, que varios
  # proxys normalizan por su cuenta. En la query no hay nada de eso.
  def self.verificador
    Rails.application.message_verifier(:expense_approval)
  end
  private_class_method :verificador
end
