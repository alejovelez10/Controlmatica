# ZIP con los comprobantes de un lote de gastos. Lo usan las dos pantallas que
# descargan comprobantes: Contabilidad y Gastos (M10, 2026-10-09).
#
# VIVE AQUI Y NO COPIADO EN CADA CONTROLLER a proposito: dos ZIP que divergen
# —uno con nombres legibles y el otro con "25704-IMG_0431.jpg", uno que avisa
# los faltantes y el otro que no— es exactamente el problema que ya tienen las
# dos plantillas `.xlsx.axlsx`, que son copias byte a byte por obligacion.
#
# Cada controller decide QUE gastos entran (su permiso, su recorte, su tope);
# esto solo decide COMO se empaquetan.
#
# SE ARMA EN MEMORIA y no en disco: Heroku tiene filesystem efimero y un
# Tempfile que sobreviva a la respuesta es una fuga. Con el tope de 20 MB por
# comprobante y MAX gastos el peor caso teorico es grande, pero el real no —una
# seleccion son decenas de facturas de pocos cientos de KB—. Si algun dia se
# vuelve un problema, el cambio es a `zip_tricks` en streaming, no a escribir en
# disco.
#
# Los gastos SIN comprobante no revientan el ZIP: se listan en un
# `FALTANTES.txt` dentro del propio archivo. Un ZIP con 28 de 30 facturas y sin
# decir cuales faltan es peor que uno que lo diga.
class ReceiptsZip
  # Cuantos gastos caben en una descarga. Es el mismo numero que la aprobacion
  # masiva de Contabilidad: el criterio de "cuantos gastos caben en una
  # operacion" no puede depender de cual boton se pulso.
  MAX = 500

  def self.build(gastos)
    new.build(gastos)
  end

  def build(gastos)
    faltantes = []
    usados = {}

    buffer = Zip::OutputStream.write_buffer do |zip|
      gastos.each do |gasto|
        unless gasto.receipt_file.present?
          faltantes << "##{gasto.id} - #{gasto.invoice_name} (#{gasto.invoice_number})"
          next
        end

        contenido = leer_comprobante(gasto)
        if contenido.nil?
          faltantes << "##{gasto.id} - #{gasto.invoice_name}: el archivo no se pudo leer"
          next
        end

        zip.put_next_entry(nombre_en_zip(gasto, usados))
        zip.write(contenido)
      end

      if faltantes.any?
        zip.put_next_entry("FALTANTES.txt")
        zip.write("Gastos seleccionados que no tienen comprobante adjunto:\n\n" + faltantes.join("\n") + "\n")
      end
    end

    buffer.rewind
    buffer.read
  end

  def self.nombre_de_descarga
    "comprobantes-#{Date.current.strftime('%Y%m%d')}.zip"
  end

  private

  # Bytes del comprobante, vengan de S3 o del disco. Devuelve nil si el archivo
  # ya no esta: un comprobante borrado del bucket no puede tumbar la descarga
  # entera de las otras 29 facturas.
  def leer_comprobante(gasto)
    gasto.receipt_file.read
  rescue StandardError => e
    Rails.logger.error("[comprobantes zip] comprobante #{gasto.id} ilegible: #{e.class}: #{e.message}")
    nil
  end

  # NOMBRE DE CADA COMPROBANTE DENTRO DEL ZIP (2026-09-21).
  #
  #   2026-09-21 - CLARO SOLUCIONES SA - FV-12345.pdf
  #
  # Antes era "#{id}-#{nombre original}", o sea "25704-IMG_0431.jpg": para
  # contabilidad eso no es un nombre, es un acertijo. Ahora lleva los tres datos
  # con los que se busca una factura: fecha, tercero y numero.
  #
  # LA FECHA VA AL REVES DE COMO SE LEE (ano-mes-dia y no dia-mes) A PROPOSITO.
  # El explorador de archivos ordena alfabeticamente, asi que con dia-mes un ZIP
  # de fin de ano lista "01-12" antes que "28-11" y el lote queda revuelto justo
  # cuando mas facturas trae. Con ano-mes-dia el orden alfabetico ES el orden
  # cronologico, y los dos datos que se pidieron siguen ahi.
  #
  # `invoice_date` y no `created_at`: es la fecha de la factura, que es por la
  # que causa contabilidad. El fallback existe solo por los gastos historicos
  # que se importaron sin ella.
  def nombre_en_zip(gasto, usados)
    fecha  = (gasto.invoice_date || gasto.created_at).strftime("%Y-%m-%d")
    partes = [fecha, limpiar_para_archivo(gasto.invoice_name), limpiar_para_archivo(gasto.invoice_number)]
    base   = partes.reject(&:blank?).join(" - ")
    unico(base, File.extname(gasto.receipt_file.file.filename.to_s).downcase, usados)
  end

  # Windows rechaza \ / : * ? " < > | en un nombre de archivo, y un ZIP que no
  # se puede extraer alla no le sirve a nadie: la razon social del tercero trae
  # puntos y comas sin problema, pero un "S.A.S / SUCURSAL" rompe la extraccion.
  # Se recorta a 60 porque hay razones sociales de mas de 100 caracteres y la
  # ruta completa en Windows tiene tope.
  def limpiar_para_archivo(texto)
    texto.to_s.gsub(%r{[\\/:*?"<>|]}, " ").gsub(/[[:cntrl:]]/, "").squish.truncate(60, omission: "")
  end

  # Dos gastos del mismo dia, mismo tercero y misma factura (un duplicado, o dos
  # sin numero) chocarian en el mismo nombre, y varios descompresores se quedan
  # con el ultimo SIN avisar: el ZIP saldria con menos archivos de los que dice.
  # El sufijo solo aparece cuando hace falta.
  def unico(base, extension, usados)
    usados[base] = usados.fetch(base, 0) + 1
    repetido = usados[base]
    repetido > 1 ? "#{base} (#{repetido})#{extension}" : "#{base}#{extension}"
  end
end
