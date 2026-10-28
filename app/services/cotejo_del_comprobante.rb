# Cotejo del comprobante contra el formulario (2026-10-25).
#
# Una regla con «Cotejar el comprobante» (ExpenseRule#cross_check_receipt) pide
# que lo que se escribio en el gasto coincida con lo que dice la factura. Si no
# coincide, o si no se pudo comprobar, el gasto se guarda pero NO SE APRUEBA
# SOLO: queda para que una persona lo revise y aparece en el informe
# «Incumplen reglas». Lo que coincide sigue el camino de siempre y nadie tiene
# que mirarlo, que es justo lo que se pidio: que no haya que validarlo todo.
#
# NUNCA FRENA EL REGISTRO, aunque la regla sea de las que impiden guardar. Lo
# que se compara sale de una lectura de IA, y una foto movida no puede dejar a
# alguien en campo sin poder registrar un gasto real. «Impedir guardar» sigue
# aplicando a los demas limites de la misma regla.
#
# DOS PARTES, Y SOLO UNA HABLA CON LA IA:
#
#   * La LECTURA (`leer`, `lectura_desde`) la piden quienes tienen el archivo
#     en la mano —la web al guardar y el agente de WhatsApp al proponer— y la
#     dejan en `ReportExpense#lectura_del_comprobante`. El gasto la guarda en
#     `receipt_check` para volver a comparar al editarlo sin leer otra vez.
#   * La COMPARACION (`evaluar`) es determinista y no cuesta nada: la corre el
#     motor de reglas cada vez que evalua el gasto.
#
# Sin lectura no hay cotejo. Un gasto que nadie leyo —el import de Excel, uno
# de antes de la regla— no se marca por eso: no se le puede reprochar una
# lectura que no se hizo. Quien si lee y no encuentra comprobante lo dice con
# `sin_comprobante`, y eso SI deja el gasto para revision.
class CotejoDelComprobante
  # Codigo estable del motivo, como los de ExpenseRuleService.
  CODE = "receipt_mismatch".freeze

  # Estados de una lectura.
  LEIDO       = "leido".freeze
  SIN_LECTURA = "sin_lectura".freeze

  # Estados del cotejo.
  COINCIDE    = "coincide".freeze
  DIFERENCIAS = "diferencias".freeze
  SIN_COTEJAR = "sin_cotejar".freeze

  # Lo que se compara. El nombre del proveedor no: casi nunca se escribe igual
  # que en la factura («Restaurante El Sol» contra «INVERSIONES SOL S.A.S.») y
  # todo gasto terminaria marcado.
  #
  # El valor antes de IVA (`value`) se compara desde el 2026-10-27, y solo cuando
  # se registro IVA: si la persona cambia el valor, el formulario recalcula el
  # total y antes solo salia la diferencia del total, sin decir que el dato
  # cambiado fue el valor. Las lecturas guardadas antes de esa fecha no lo
  # traen y siguen comparando como antes.
  CAMPOS = %w[value total tax invoice_date identification invoice_number currency].freeze

  # Un peso: la factura puede traer centavos y el gasto se guarda redondeado.
  TOLERANCIA_COP    = BigDecimal("1")
  TOLERANCIA_DIVISA = BigDecimal("0.01")

  # Por que no se pudo cotejar, en palabras para quien aprueba. Las claves son
  # los codigos de error de ReceiptExtractionService mas los dos propios.
  MOTIVOS = {
    "sin_comprobante"    => "el gasto no tiene comprobante",
    "sin_datos"          => "no se leyó con seguridad ningún dato para comparar",
    "unreadable"         => "el comprobante está borroso, cortado u oscuro",
    "not_an_invoice"     => "el archivo no parece una factura o comprobante",
    "unsupported_format" => "el formato del archivo no se puede leer (adjunte JPG, PNG o PDF)",
    "too_large"          => "el archivo supera los 20 MB",
    "timeout"            => "la lectura automática tardó demasiado"
  }.freeze
  MOTIVO_POR_DEFECTO = "la lectura automática no respondió".freeze

  # --- Lectura ---------------------------------------------------------------

  # Si la lectura automatica esta puesta. Apagada no hay cotejo: marcar todos
  # los gastos por una IA que nadie encendio solo llenaria el informe de ruido.
  def self.activo?
    ReceiptExtractionService.enabled? && ReceiptExtractionService.configured?
  end

  # Si a un gasto con estas reglas hay que cotejarle el comprobante.
  def self.aplica?(expense, reglas)
    activo? && Array(reglas).any?(&:cross_check_receipt) && !expense&.type_identification&.viatico?
  end

  # Lee el comprobante con la IA. nil si la lectura esta apagada. `archivo` es
  # cualquier cosa que acepte ReceiptExtractionService (un archivo subido o
  # `{ data:, media_type:, filename: }`).
  def self.leer(archivo, cost_center_code: nil, tipo_de_gasto: nil)
    return nil unless activo?

    lectura_desde(ReceiptExtractionService.extract(archivo, cost_center_code: cost_center_code,
                                                            tipo_de_gasto: tipo_de_gasto))
  end

  # La lectura en la forma que guarda el gasto, desde el Result de
  # ReceiptExtractionService. SOLO LOS CAMPOS LEIDOS CON SEGURIDAD: uno que la
  # IA marco como dudoso no sirve para acusar a nadie de haber escrito otra
  # cosa.
  def self.lectura_desde(result)
    return nil if result.nil? || result.not_configured?
    return { "estado" => SIN_LECTURA, "motivo" => result.error.to_s } unless result.ok?

    dudosos = Array(result.fields[:low_confidence]).map(&:to_s)
    campos = CAMPOS.each_with_object({}) do |campo, acc|
      valor = result.fields[campo.to_sym]
      next if valor.blank? || dudosos.include?(campo)

      acc[campo] = valor.is_a?(Date) ? valor.iso8601 : valor.to_s
    end
    { "estado" => LEIDO, "campos" => campos, "model" => result.model, "leido_en" => Time.current.iso8601 }
  end

  def self.sin_comprobante
    { "estado" => SIN_LECTURA, "motivo" => "sin_comprobante" }
  end

  # LA LECTURA DEL BOTON «EXTRAER DATOS» VIAJA FIRMADA HASTA EL GUARDADO. Sin
  # esto, cotejar al guardar volveria a mandarle a la IA el mismo archivo que
  # acaba de leer. La firma es del servidor y va atada a los bytes del archivo:
  # el navegador no puede inventar una lectura que cuadre, ni reusar la de otro
  # comprobante.
  def self.token(lectura, bytes)
    verificador.generate({ "digest" => Digest::SHA256.hexdigest(bytes.to_s), "lectura" => lectura },
                         expires_in: 2.hours, purpose: :cotejo)
  end

  # La lectura de un token, si es valido y es de ESTE archivo. nil si no.
  def self.desde_token(token, bytes)
    return nil if token.blank?

    datos = verificador.verified(token.to_s, purpose: :cotejo)
    return nil unless datos.is_a?(Hash) && datos["digest"] == Digest::SHA256.hexdigest(bytes.to_s)

    datos["lectura"]
  rescue StandardError
    nil
  end

  def self.verificador
    Rails.application.message_verifier("cotejo_del_comprobante")
  end
  private_class_method :verificador

  # --- Comparacion -----------------------------------------------------------

  # => nil si a este gasto no se le coteja nada; si no,
  #    { "estado" => coincide | diferencias | sin_cotejar, "motivo" => ...,
  #      "diferencias" => [{ "campo", "comprobante", "formulario", "mensaje" }],
  #      "lectura" => {...}, "cotejado_en" => ... }
  #
  # `reglas` son las del gasto (ExpenseRule.para_gasto). Las de HOY, como en el
  # resto del motor: quitarle el cotejo a la regla deja de marcar el gasto la
  # proxima vez que se evalue.
  def self.evaluar(expense, reglas)
    return nil if expense.nil?
    return nil unless Array(reglas).any?(&:cross_check_receipt)
    # Un viatico no tiene factura de un proveedor: no hay nada que cotejar.
    return nil if expense.type_identification&.viatico?

    lectura = lectura_de(expense)
    return nil if lectura.blank?
    return resultado(SIN_COTEJAR, lectura, motivo: lectura["motivo"]) unless lectura["estado"] == LEIDO

    diferencias, comparados = comparar(expense, lectura["campos"] || {})
    return resultado(SIN_COTEJAR, lectura, motivo: "sin_datos") if comparados.zero? && diferencias.empty?

    resultado(diferencias.any? ? DIFERENCIAS : COINCIDE, lectura, diferencias: diferencias)
  end

  # Lo que se le dice a quien aprueba. Vacio si coincide.
  def self.mensajes(evaluacion)
    return [] if evaluacion.nil?

    case evaluacion["estado"]
    when DIFERENCIAS then Array(evaluacion["diferencias"]).map { |d| d["mensaje"] }
    when SIN_COTEJAR then ["No se pudo verificar el comprobante: #{MOTIVOS.fetch(evaluacion['motivo'].to_s, MOTIVO_POR_DEFECTO)}"]
    else []
    end
  end

  # La lectura recien hecha, o la que quedo guardada en el gasto. Un gasto nuevo
  # solo tiene la recien hecha.
  def self.lectura_de(expense)
    fresca = expense.lectura_del_comprobante
    return fresca.deep_stringify_keys if fresca.present?
    return nil if expense.new_record?

    guardada = expense.receipt_check
    guardada.is_a?(Hash) ? guardada["lectura"].presence : nil
  end
  private_class_method :lectura_de

  def self.resultado(estado, lectura, motivo: nil, diferencias: [])
    { "estado" => estado, "motivo" => motivo, "diferencias" => diferencias,
      "lectura" => lectura, "cotejado_en" => Time.current.iso8601 }
  end
  private_class_method :resultado

  # => [diferencias, cuantos campos se pudieron comparar]
  def self.comparar(expense, campos)
    diferencias = []
    comparados = 0
    moneda = Currency.normalize(expense.currency.presence || Currency::DEFAULT)

    # LA MONEDA SOLO SE ACUSA SI LA FACTURA DICE UNA DIVISA. Sin moneda impresa
    # la IA asume COP, y una factura en dolares que solo trae el signo «$» se
    # leeria como pesos: compararla con un gasto en USD daria un falso positivo.
    leida = campos["currency"].presence && Currency.normalize(campos["currency"])
    if leida && leida != Currency::DEFAULT && leida != moneda
      diferencias << diferencia("currency", leida, moneda, "La moneda del comprobante es #{leida} y se registró #{moneda}")
      # Con monedas distintas los montos no se pueden comparar.
      return [diferencias, comparados + 1]
    end

    tolerancia = Currency.foreign?(moneda) ? TOLERANCIA_DIVISA : TOLERANCIA_COP
    # En el orden del formulario —valor, IVA, total— para que quien lee vea
    # primero el dato que se cambio y despues el total que se movio con el.

    # EL VALOR Y EL IVA SOLO CUANDO SE REGISTRO IVA. Mucha gente pone todo en el
    # valor y deja el IVA en cero: entonces el valor es el total, el total ya se
    # compara, y marcar el valor o el IVA dejaria para revision casi todo.
    iva = iva_del_formulario(expense, moneda)

    valor_leido = monto(campos["value"])
    valor = valor_del_formulario(expense, moneda)
    if valor_leido && iva.positive? && valor.positive?
      comparados += 1
      if (valor_leido - valor).abs > tolerancia
        diferencias << diferencia("value", valor_leido, valor,
                                  "El valor antes de IVA del comprobante es #{dinero(valor_leido, moneda)} " \
                                  "y se registró #{dinero(valor, moneda)}")
      end
    end

    iva_leido = monto(campos["tax"])
    if iva_leido && iva.positive?
      comparados += 1
      if (iva_leido - iva).abs > tolerancia
        diferencias << diferencia("tax", iva_leido, iva,
                                  "El IVA del comprobante es #{dinero(iva_leido, moneda)} " \
                                  "y se registró #{dinero(iva, moneda)}")
      end
    end

    total_leido = monto(campos["total"])
    total = total_del_formulario(expense, moneda)
    if total_leido && total.positive?
      comparados += 1
      if (total_leido - total).abs > tolerancia
        diferencias << diferencia("total", total_leido, total,
                                  "El total del comprobante es #{dinero(total_leido, moneda)} " \
                                  "y se registró #{dinero(total, moneda)}")
      end
    end

    fecha_leida = fecha(campos["invoice_date"])
    if fecha_leida && expense.invoice_date.present?
      comparados += 1
      if fecha_leida != expense.invoice_date.to_date
        diferencias << diferencia("invoice_date", fecha_leida.iso8601, expense.invoice_date.to_date.iso8601,
                                  "La fecha del comprobante es #{fecha_leida.strftime('%d/%m/%Y')} " \
                                  "y se registró #{expense.invoice_date.to_date.strftime('%d/%m/%Y')}")
      end
    end

    nit_leido = solo_digitos(campos["identification"])
    nit = solo_digitos(expense.identification)
    if nit_leido.present? && nit.present?
      comparados += 1
      unless mismo_nit?(nit_leido, nit)
        diferencias << diferencia("identification", nit_leido, expense.identification.to_s.strip,
                                  "El NIT del comprobante es #{nit_leido} y se registró #{expense.identification.to_s.strip}")
      end
    end

    # Un «N/A» o la cedula en el numero no es un numero de factura: no hay nada
    # que comparar (es el mismo relleno que ignora el chequeo de duplicados).
    numero_leido = campos["invoice_number"].to_s.strip
    numero = expense.invoice_number.to_s.strip
    if numero_leido.present? && numero.present? && !ExpenseRuleService.numero_de_relleno?(expense)
      comparados += 1
      unless mismo_numero?(numero_leido, numero)
        diferencias << diferencia("invoice_number", numero_leido, numero,
                                  "El número de factura del comprobante es #{numero_leido} y se registró #{numero}")
      end
    end

    [diferencias, comparados]
  end
  private_class_method :comparar

  # El total en la moneda del documento: en divisa, el de la factura en esa
  # divisa, no el convertido a pesos. El mayor entre el total y valor + IVA,
  # igual que el tope de valor (ExpenseRuleService.valor_evaluable): el total
  # puede venir en cero desde WhatsApp.
  def self.total_del_formulario(expense, moneda)
    if Currency.foreign?(moneda)
      [expense.foreign_total.to_d, expense.foreign_value.to_d + expense.foreign_tax.to_d].max
    else
      [expense.invoice_total.to_d, expense.invoice_value.to_d + expense.invoice_tax.to_d].max
    end
  end
  private_class_method :total_del_formulario

  def self.valor_del_formulario(expense, moneda)
    Currency.foreign?(moneda) ? expense.foreign_value.to_d : expense.invoice_value.to_d
  end
  private_class_method :valor_del_formulario

  def self.iva_del_formulario(expense, moneda)
    Currency.foreign?(moneda) ? expense.foreign_tax.to_d : expense.invoice_tax.to_d
  end
  private_class_method :iva_del_formulario

  # El NIT con o sin digito de verificacion es el mismo: 900123456 y
  # 9001234567 (900.123.456-7) no son una discrepancia.
  def self.mismo_nit?(leido, registrado)
    return true if leido == registrado

    (leido.length == registrado.length + 1 && leido.start_with?(registrado)) ||
      (registrado.length == leido.length + 1 && registrado.start_with?(leido))
  end
  private_class_method :mismo_nit?

  # «FE-00482» y «482» son la misma factura: el prefijo y los ceros a la
  # izquierda se escriben o no segun quien digite. Se compara el texto sin
  # signos y, si no coincide, solo los digitos sin ceros adelante.
  def self.mismo_numero?(leido, registrado)
    return true if solo_letras_y_digitos(leido) == solo_letras_y_digitos(registrado)

    digitos_leidos = solo_digitos(leido).to_s.sub(/\A0+/, "")
    digitos_leidos.present? && digitos_leidos == solo_digitos(registrado).to_s.sub(/\A0+/, "")
  end
  private_class_method :mismo_numero?

  def self.diferencia(campo, comprobante, formulario, mensaje)
    { "campo" => campo, "comprobante" => comprobante.to_s, "formulario" => formulario.to_s, "mensaje" => mensaje }
  end
  private_class_method :diferencia

  def self.dinero(valor, moneda)
    return ExpenseBudgetService.money(valor) unless Currency.foreign?(moneda)

    ActiveSupport::NumberHelper.number_to_currency(valor.to_d.round(2), unit: "#{moneda} ", delimiter: ".",
                                                                        separator: ",", precision: 2, format: "%u%n")
  end
  private_class_method :dinero

  def self.monto(valor)
    return nil if valor.blank?

    BigDecimal(valor.to_s)
  rescue ArgumentError, TypeError
    nil
  end
  private_class_method :monto

  def self.fecha(valor)
    return nil if valor.blank?

    Date.iso8601(valor.to_s)
  rescue ArgumentError, TypeError, Date::Error
    nil
  end
  private_class_method :fecha

  def self.solo_digitos(valor)
    valor.to_s.gsub(/\D/, "").presence
  end
  private_class_method :solo_digitos

  def self.solo_letras_y_digitos(valor)
    I18n.transliterate(valor.to_s).upcase.gsub(/[^A-Z0-9]/, "")
  end
  private_class_method :solo_letras_y_digitos
end
