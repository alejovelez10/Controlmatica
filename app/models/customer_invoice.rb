class CustomerInvoice < ApplicationRecord
	mount_uploader :delivery_certificate_file, CertificateUploader
	mount_uploader :reception_report_file, InformationUploader
	belongs_to :cost_center , optional: true
end
