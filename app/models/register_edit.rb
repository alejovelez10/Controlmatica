# == Schema Information
#
# Table name: register_edits
#
#  id               :bigint           not null, primary key
#  date_update      :date
#  description      :text
#  editValues       :json
#  module           :string
#  newValues        :json
#  state            :string
#  type_edit        :string           default("edito")
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  register_user_id :integer
#  user_id          :integer
#

class RegisterEdit < ApplicationRecord
    belongs_to :user
    belongs_to :register_user, :class_name => "User", optional: true

    before_create :update_json

    def update_json
        #self.editValues = {name: false, email: false, document_type: false, number_document: false, rol_id: false}
        #self.newValues = {name: "", email: "", document_type: "", number_document: "", rol_id: ""}
        #self.oldValues = {name: "", email: "", document_type: "", number_document: "", rol_id: ""}
    end
end
