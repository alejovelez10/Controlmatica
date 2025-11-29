# Configuración optimizada para heroku-22 + wkhtmltopdf 0.12.6 - file:// strategy
WickedPdf.config ||= {
  exe_path: Rails.env.production? ? '/app/bin/wkhtmltopdf' : '/usr/local/bin/wkhtmltopdf',
  page_size: 'A4',
  dpi: 72,
  zoom: 0.75,
  margin: { top: 5, bottom: 5, left: 5, right: 5 },
  extra: [
    '--load-error-handling', 'ignore',         # Ignorar errores de carga de páginas
    '--load-media-error-handling', 'ignore',   # Permite que algunas imágenes fallen sin detener el proceso
    '--no-stop-slow-scripts',                  # No detener por scripts lentos
    '--images',                                # Habilitar procesamiento de imágenes
    '--enable-external-links',                 # Permitir URLs externas (funciona en 0.12.6)
    '--enable-local-file-access',              # CRÍTICO: Permitir acceso a archivos locales file://
    '--allow', '/tmp/',                        # Permitir acceso a /tmp (Heroku)
    '--allow', '/var/folders/',                # Permitir acceso a carpeta temp de macOS (desarrollo)
    '--allow', '/app/tmp/',                    # Permitir acceso a /app/tmp (Heroku específico)
    '--image-quality', '85',                   # Calidad alta para PDFs (85%)
    '--image-dpi', '150',                      # DPI alto para imágenes nítidas
    '--javascript-delay', '2000'               # Tiempo para que archivos temporales estén listos
  ]
}
