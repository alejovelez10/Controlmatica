# Configuracion > Documentacion: manuales, formatos y politicas de la empresa.
#
# PERMISOS (decision de producto, 2026-09-16):
#   * VER la pantalla, ver y descargar documentos: cualquier usuario con sesion.
#     Por eso no hay permiso de menu: la documentacion existe para que la lea
#     todo el mundo.
#   * Crear, editar, borrar documentos y borrar modulos: SOLO el rol
#     Administrador. No se reparte por permisos de menu para no sumar otro
#     modulo a la matriz de roles por cuatro botones.
#
# El gate de escritura vive AQUI, en cada accion. La pantalla oculta los
# botones a quien no es administrador, pero eso es cortesia visual.
#
# Respuestas: mismo contrato que el resto de pantallas nuevas (ExpenseRules):
# 403 con cuerpo JSON cuando falta permiso, y errores de validacion con HTTP 200
# + `type: "error"`, que el frontend discrimina por `type`.
class DocumentationModulesController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin!, only: [:create, :update, :destroy, :destroy_file]
  before_action :set_documentation_module, only: [:update, :destroy]
  before_action :set_documentation_file, only: [:download, :destroy_file]

  # Tope de archivos por envio. Cada archivo puede pesar 50 MB y la peticion
  # entera tiene que terminar antes del timeout de 30 s de Heroku: mas vale
  # pedir dos tandas que perder una subida grande a medias.
  MAX_FILES_PER_REQUEST = 20

  # HTML: monta el pack. JSON: los modulos con sus archivos. La pantalla pide
  # el JSON al montar y despues de cada cambio, asi no hay que recargar.
  def index
    respond_to do |format|
      format.html do
        @estados = { manage: is_admin? }
        @limits = {
          max_file_size: DocumentationFileUploader::MAX_SIZE,
          max_files: MAX_FILES_PER_REQUEST,
          extensions: DocumentationFileUploader::EXTENSIONS
        }
      end
      format.json do
        modulos = DocumentationModule.alfabetico.includes(:documentation_files, :user)
        render json: { data: modulos.map { |m| module_json(m) }, total: modulos.size }
      end
    end
  end

  def create
    modulo = DocumentationModule.new(module_params)
    modulo.user_id = current_user.id
    guardar_con_archivos(modulo, "¡El módulo fue creado con éxito!")
  end

  # Renombrar y/o agregar archivos. Los archivos existentes no se tocan aqui:
  # se borran uno por uno con `destroy_file`, que pide su propia confirmacion.
  def update
    @documentation_module.assign_attributes(module_params)
    guardar_con_archivos(@documentation_module, "¡El módulo fue actualizado con éxito!")
  end

  def destroy
    nombre = @documentation_module.name
    if @documentation_module.destroy
      render json: { success: "Se eliminó el módulo «#{nombre}»", type: "delete" }
    else
      validation_error(@documentation_module.errors.full_messages)
    end
  end

  def destroy_file
    modulo = @documentation_file.documentation_module
    if @documentation_file.destroy
      render json: { success: "Se eliminó el documento «#{@documentation_file.name}»", type: "delete",
                     register: module_json(modulo.reload) }
    else
      validation_error(@documentation_file.errors.full_messages)
    end
  end

  # Ver y descargar. Copia de ReportExpensesController#download_receipt:
  #   * `?disposition=inline` es para el modal de vista previa; sin el, el
  #     navegador descarga en vez de pintar y el modal sale en blanco.
  #   * El default es "attachment" (el boton Descargar no manda el parametro).
  #   * En S3 se redirige a una URL firmada EN ESTE MOMENTO; en disco se sirve
  #     con send_file.
  #
  # Diferencia con el comprobante: aqui llegan Word, Excel, txt o zip, y solo
  # los tipos que el navegador pinta de forma segura (PDF e imagen) se
  # entregan inline. Un .txt inline se abriria como pagina de la aplicacion.
  def download
    archivo = @documentation_file
    if archivo.file.blank?
      return render json: { type: "error", message: ["El documento ya no está disponible"] }, status: :not_found
    end

    modo = params[:disposition].to_s == "inline" && archivo.previewable? ? "inline" : "attachment"

    if remote_storage?
      # `ContentDisposition.format` codifica tildes y comillas del nombre
      # (filename*=UTF-8''…); armar la cabecera a mano rompe "Guía \"final\".pdf".
      disposicion = ActionDispatch::Http::ContentDisposition.format(disposition: modo, filename: archivo.name)
      # Rails 6.1 no acepta `allow_other_host:` (llego en Rails 7).
      redirect_to archivo.file.url(query: { "response-content-disposition" => disposicion,
                                            "response-content-type" => archivo.content_type.presence || "application/octet-stream" })
    else
      send_file archivo.file.path,
                filename: archivo.name,
                type: archivo.content_type.presence || "application/octet-stream",
                disposition: modo
    end
  end

  private

  def is_admin?
    @_is_admin ||= current_user.rol&.name == "Administrador"
  end

  def require_admin!
    return if is_admin?

    render json: { type: "error", message: ["Solo un administrador puede modificar la documentación"] },
           status: :forbidden
  end

  def validation_error(messages)
    render json: { success: "¡Ocurrió un error!", type: "error", message: Array(messages) }
  end

  def set_documentation_module
    @documentation_module = DocumentationModule.find(params[:id])
  end

  def set_documentation_file
    @documentation_file = DocumentationFile.find(params[:id])
  end

  # Se pregunta al uploader y no a `Rails.env`, igual que en gastos: asi la
  # prueba puede simular S3 sin cambiar de entorno.
  def remote_storage?
    DocumentationFileUploader.storage.to_s.include?("Fog")
  end

  def module_params
    params.permit(:name, :description)
  end

  # `files[]` del multipart. Se descartan los valores que no son archivo (un
  # campo vacio llega como "" en algunos navegadores).
  def archivos_subidos
    Array(params[:files]).select { |f| f.respond_to?(:original_filename) }
  end

  # Crear y editar comparten el mismo camino: construir los archivos nuevos,
  # validar TODO antes de escribir y guardar en una sola transaccion.
  #
  # POR QUE SE VALIDA ARCHIVO POR ARCHIVO ANTES DE GUARDAR: si uno de cinco
  # archivos es un .exe, el administrador tiene que saber CUAL. El error que da
  # Rails por la asociacion ("Documentation files is invalid") no lo dice.
  # Ademas, validar primero evita subir cuatro archivos a S3 para despues
  # deshacer la transaccion y dejarlos huerfanos.
  def guardar_con_archivos(modulo, mensaje_exito)
    archivos = archivos_subidos
    if archivos.size > MAX_FILES_PER_REQUEST
      return validation_error(["Puede subir hasta #{MAX_FILES_PER_REQUEST} archivos a la vez"])
    end

    nuevos = archivos.map do |upload|
      modulo.documentation_files.build(file: upload, user_id: current_user.id)
    end

    errores = []
    errores.concat(modulo.errors.full_messages) unless modulo.valid?
    nuevos.each do |doc|
      next if doc.valid?

      doc.errors.full_messages.each { |m| errores << "«#{doc.name}»: #{m}" }
    end
    # `modulo.valid?` tambien valida los hijos nuevos y agrega el generico
    # "Documentation files is invalid"; ya se explico archivo por archivo.
    errores.reject! { |m| m.start_with?("Documentation files") }

    return validation_error(errores.uniq) if errores.any?

    DocumentationModule.transaction { modulo.save! }
    render json: { success: mensaje_exito, type: "success", register: module_json(modulo.reload) }
  rescue ActiveRecord::RecordNotUnique
    # Dos administradores guardando el mismo nombre a la vez: la validacion de
    # los dos paso, el indice LOWER(name) detuvo al segundo.
    validation_error(["Ya existe un módulo con ese nombre"])
  rescue ActiveRecord::RecordInvalid => e
    validation_error(e.record.errors.full_messages)
  end

  def module_json(modulo)
    {
      id: modulo.id,
      name: modulo.name,
      description: modulo.description,
      user_name: modulo.user && [modulo.user.names, modulo.user.last_names].compact.join(" "),
      created_at: modulo.created_at,
      updated_at: modulo.updated_at,
      files: modulo.documentation_files.map { |f| file_json(f) }
    }
  end

  # Sin `file.url` a proposito: con almacenamiento privado esa URL nace
  # caducando. La pantalla usa siempre `download_url`.
  def file_json(doc)
    {
      id: doc.id,
      name: doc.name,
      content_type: doc.content_type,
      byte_size: doc.byte_size,
      extension: doc.extension,
      previewable: doc.previewable?,
      created_at: doc.created_at,
      download_url: download_documentation_file_path(doc)
    }
  end
end
