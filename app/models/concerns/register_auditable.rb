# Auditoria declarativa hacia RegisterEdit.
#
# POR QUE EXISTE: ReportExpense tenia ~200 lineas de HTML escrito a mano
# repartidas en tres metodos casi identicos (create_create_register,
# create_edit_register, create_destroy_register). Los paquetes de Presupuesto,
# Multimoneda y Contabilidad agregan entre los tres 10 columnas visibles: con el
# patron anterior eso son 30 bloques de HTML escritos a mano, en tres PRs
# distintos y por tres personas distintas. La probabilidad de que los tres
# metodos queden desalineados es 1.
#
# Con este concern, agregar un campo auditado cuesta UNA linea `audit_field` mas
# una entrada en cada lista de `audit_register`.
#
# LO QUE NO CAMBIA: el patron sigue siendo "el modelo escribe su HTML en
# RegisterEdit.description". El formato guardado es byte a byte el mismo; los 14
# golden de test/models/report_expense_audit_legacy_test.rb lo garantizan.
# Cambia donde vive el codigo, no lo que produce.
#
# ALCANCE: solo ReportExpense. CostCenter, SalesOrder y los demas modelos con el
# mismo patron NO se migran (00-ARQUITECTURA.md 5.3): cada uno tiene su propia
# variante y tocarlos multiplicaria el riesgo sin resolver nada.
#
# TRAMPA: el renderizado usa `format`, asi que un `%` literal en un label o en un
# formato revienta con ArgumentError DENTRO de un after_create, es decir, tumba
# la creacion del registro. Un label como "% de IVA" hay que escribirlo "%% de
# IVA".
module RegisterAuditable
  extend ActiveSupport::Concern

  Field = Struct.new(:key, :label, :kind, :assoc_class, :assoc_attr,
                     :create_format, :edit_format, keyword_init: true)

  DEFAULT_CREATE_FORMAT = "<p>%{label}: <b>%{value}</b></p>".freeze
  DEFAULT_EDIT_FORMAT   = "<p>%{label}: <b class='color-true'>%{left}</b> / <b class='color-false'>%{right}</b></p>".freeze

  included do
    class_attribute :audit_fields,  instance_writer: false, default: {}
    class_attribute :audit_options, instance_writer: false, default: nil
  end

  class_methods do
    # Declara UN campo auditable. No instala callbacks.
    #
    #   kind: :scalar (default) | :association
    #
    # En :association, assoc_class y assoc_attr dicen de donde sale el nombre
    # legible (code / names / name): en la auditoria nunca se guarda un id.
    def audit_field(key, label:, kind: :scalar, assoc_class: nil, assoc_attr: nil,
                    create_format: nil, edit_format: nil)
      campo = Field.new(key: key.to_sym, label: label, kind: kind,
                        assoc_class: assoc_class, assoc_attr: assoc_attr,
                        create_format: create_format, edit_format: edit_format)
      self.audit_fields = audit_fields.merge(key.to_sym => campo)
      campo
    end

    # Declara el layout y AQUI SI instala los tres callbacks.
    #
    # create_fields / edit_fields son listas ORDENADAS que admiten claves
    # repetidas (ReportExpense repite `identification` a proposito).
    def audit_register(module_name:,
                       create_header:, edit_header:,
                       create_fields:, edit_fields:,
                       create_min_length: 5, edit_min_length: 59,
                       create_joiner: " ", create_no_joiner_after: [],
                       edit_joiner: "",
                       create_type_edit: "creo",
                       destroy_type_edit: "elimino",
                       edit_type_edit: nil,
                       destroy_header: nil,
                       destroy_fields: nil,
                       touch_last_user_edited: true)
      self.audit_options = {
        module_name: module_name,
        create_header: create_header,
        edit_header: edit_header,
        destroy_header: destroy_header || create_header,
        create_fields: create_fields.map(&:to_sym),
        edit_fields: edit_fields.map(&:to_sym),
        destroy_fields: (destroy_fields || create_fields).map(&:to_sym),
        create_min_length: create_min_length,
        edit_min_length: edit_min_length,
        create_joiner: create_joiner,
        create_no_joiner_after: create_no_joiner_after.map(&:to_sym),
        edit_joiner: edit_joiner,
        create_type_edit: create_type_edit,
        destroy_type_edit: destroy_type_edit,
        edit_type_edit: edit_type_edit,
        touch_last_user_edited: touch_last_user_edited
      }.freeze

      # ORDEN OBLIGATORIO. create es after_create y NO after_save: con after_save
      # cada update generaria ademas un registro de "creacion", y el controller
      # (create seguido de save) produciria dos.
      after_create :write_create_audit_register
      before_update :write_edit_audit_register
      before_destroy :write_destroy_audit_register
    end
  end

  # Actor de la auditoria. Publico y sobreescribible.
  #
  # User.current solo existe dentro de un request web
  # (ApplicationController#set_current_user): en tests, jobs, rake tasks, consola
  # y MCP es nil. Los tres respaldos son las FKs que el propio registro ya trae.
  def audit_actor_id
    User.current&.id || try(:user_id) || try(:user_invoice_id) || try(:last_user_edited_id)
  end

  # Renderiza UN segmento. modo: :create (tambien usado por el borrado) | :edit.
  # Devuelve "" cuando el segmento no aplica; los vacios participan igual en el
  # ensamblado, que es lo que hacia el codigo viejo al interpolar una cadena
  # vacia.
  def render_audit_segment(field, modo)
    modo == :edit ? render_audit_edit_segment(field) : render_audit_create_segment(field)
  end

  private

  def render_audit_create_segment(field)
    if field.kind == :association
      return "" unless public_send("#{field.key}?")

      registro = field.assoc_class.constantize.where(id: self[field.key]).take
      # `&.` a proposito: con una FK colgante el legado reventaba con
      # NoMethodError DENTRO del callback y el registro no se podia guardar.
      valor = registro&.public_send(field.assoc_attr)
    else
      valor = public_send(field.key)
    end

    format(field.create_format || DEFAULT_CREATE_FORMAT, label: field.label, value: valor)
  end

  def render_audit_edit_segment(field)
    return "" unless public_send("#{field.key}_changed?")

    if field.kind == :association
      # Rareza conservada: el orden lo decide la consulta, no viejo/nuevo.
      nombres = field.assoc_class.constantize
                     .where(id: public_send("#{field.key}_change"))
                     .map { |r| r.public_send(field.assoc_attr) }
      izquierda = nombres[1]
      derecha   = nombres[0]
    else
      cambio = public_send("#{field.key}_change")
      izquierda = cambio[0]
      derecha   = cambio[1]
    end

    format(field.edit_format || DEFAULT_EDIT_FORMAT,
           label: field.label, left: izquierda, right: derecha)
  end

  # Ensambla la lista ordenada de segmentos y le antepone el encabezado.
  def build_audit_description(modo, claves, header, joiner, no_joiner_after)
    cuerpo = +""
    anterior = nil

    claves.each_with_index do |clave, i|
      campo = self.class.audit_fields.fetch(clave) do
        raise ArgumentError, "audit_register referencia el campo :#{clave}, que no esta declarado con audit_field"
      end
      cuerpo << joiner if i.positive? && !no_joiner_after.include?(anterior)
      cuerpo << render_audit_segment(campo, modo)
      anterior = clave
    end

    header + cuerpo
  end

  def write_audit_register(str, min_length, type_edit)
    return unless str.length > min_length

    atributos = {
      user_id: audit_actor_id,
      register_user_id: id,
      state: "pending",
      # date_update es columna `date` y recibe un Time: se trunca. Es el
      # comportamiento historico.
      date_update: Time.now,
      module: self.class.audit_options[:module_name],
      description: str
    }
    # En edicion no se pasa type_edit para que quede el default "edito" de la
    # columna.
    atributos[:type_edit] = type_edit unless type_edit.nil?

    # `create` sin bang, a proposito: si audit_actor_id es nil, el
    # `belongs_to :user` de RegisterEdit falla y la auditoria se pierde en
    # silencio, pero el registro auditado SI se guarda. Con `create!` un gasto
    # creado desde una rake task sin actor no se podria guardar.
    RegisterEdit.create(atributos)
  end

  def write_create_audit_register
    opciones = self.class.audit_options
    str = build_audit_description(:create, opciones[:create_fields], opciones[:create_header],
                                  opciones[:create_joiner], opciones[:create_no_joiner_after])
    write_audit_register(str, opciones[:create_min_length], opciones[:create_type_edit])
  end

  def write_destroy_audit_register
    opciones = self.class.audit_options
    str = build_audit_description(:create, opciones[:destroy_fields], opciones[:destroy_header],
                                  opciones[:create_joiner], opciones[:create_no_joiner_after])
    write_audit_register(str, opciones[:create_min_length], opciones[:destroy_type_edit])
  end

  def write_edit_audit_register
    opciones = self.class.audit_options
    if opciones[:touch_last_user_edited] && respond_to?(:last_user_edited_id=)
      self.last_user_edited_id = audit_actor_id
    end

    str = build_audit_description(:edit, opciones[:edit_fields], opciones[:edit_header],
                                  opciones[:edit_joiner], [])
    write_audit_register(str, opciones[:edit_min_length], opciones[:edit_type_edit])
  end
end
