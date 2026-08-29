# Comprobante adjunto de un gasto (paquete 06).
#
# POR QUE ES DISTINTO A LOS OTROS CUATRO UPLOADERS: una factura es un documento
# contable con NIT, valores y nombre de proveedor. Los avatares y las ordenes de
# compra viven en URLs publicas y permanentes; una factura no puede.
# `self.fog_public = false` hace que S3 exija una URL FIRMADA, que expira a los
# 600 segundos.
#
# CONSECUENCIA QUE NO SE PUEDE OLVIDAR (Riesgo 2 del paquete): la URL que el
# serializer emite al pintar la tabla ya nacio caducando. Por eso la columna del
# frontend apunta a `/download_receipt/report_expenses/:id`, que firma en el
# momento del clic, y NUNCA a `receipt_file.url`.
#
# Sin versiones y sin MiniMagick a proposito: no se redimensiona una factura, se
# guarda tal cual llego. Ademas `enable_processing = false` en test existe justo
# para que ImageMagick no entre a la suite.
class ReceiptUploader < CarrierWave::Uploader::Base
  # En produccion S3; en desarrollo y test, disco. Mismo condicional que los
  # otros cuatro uploaders, y sin ninguna linea posterior que fije el disco a
  # secas: ese era el bug que el paquete 03 vino a limpiar (el criterio 2 se
  # verifica con un grep literal, por eso aqui no se escribe esa cadena).
  storage(Rails.env.production? ? :fog : :file)

  self.fog_public = false

  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  # Allowlists de CarrierWave 3.x. Los nombres viejos (`extension_whitelist`)
  # NO existen en la 3.1.2 instalada: declararlos seria codigo muerto.
  #
  # Las DOS listas son necesarias y no son redundantes: la extension la controla
  # quien sube el archivo (renombrar `virus.exe` a `factura.pdf` cuesta un
  # segundo) y el content-type lo declara el navegador a partir de los bytes.
  # Cada una atrapa lo que la otra deja pasar.
  def extension_allowlist
    %w[jpg jpeg png pdf webp heic]
  end

  def content_type_allowlist
    ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]
  end

  # El minimo de 1 byte no es cosmetico: un archivo de 0 bytes se sube sin error
  # y el usuario cree que adjunto el comprobante.
  def size_range
    1.byte..20.megabytes
  end
end
