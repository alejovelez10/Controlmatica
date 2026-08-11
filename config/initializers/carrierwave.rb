CarrierWave.configure do |config|
  config.fog_credentials = {
    :provider              => "AWS",
    :aws_access_key_id     => ENV["AWS_ACCESS_KEY"],
    :aws_secret_access_key => ENV["AWS_SECRET_KEY"],
    # El bucket real (`controlmatica`) vive en us-east-2. Sin esta clave fog-aws
    # asume us-east-1 y devuelve PermanentRedirect intermitentes que parecen
    # errores de red. El default se deja en us-east-1 para no cambiar el
    # comportamiento de ningun entorno que ya estuviera alli.
    :region                => ENV.fetch("AWS_REGION", "us-east-1")
  }
  config.fog_directory = ENV["AWS_BUCKET"]

  if Rails.env.test?
    # Sin esto, cada fixture o registro con avatar dispara MiniMagick 5 veces
    # (AvatarUploader declara 5 `version`) y la suite se vuelve inusable.
    config.enable_processing = false
    config.storage           = :file
    # Valor unico y definitivo (00-ARQUITECTURA.md 4.8): por defecto tmp/, que ya
    # esta gitignoreado. El paquete 12 exporta E2E_UPLOAD_ROOT=public solo en su
    # corrida para que /uploads/... sea servible por Playwright.
    config.root              = ENV.fetch("E2E_UPLOAD_ROOT") { Rails.root.join("tmp", "uploads_test") }
  end
end
