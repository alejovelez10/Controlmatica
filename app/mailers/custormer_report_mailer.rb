class CustormerReportMailer < ApplicationMailer

	def approval_email(customer_report)
		@customer_report = customer_report
		mail(to: "alejovelez10@gmail.com", subject: "Aprobacion de reporte de trabajo")
	end
end
