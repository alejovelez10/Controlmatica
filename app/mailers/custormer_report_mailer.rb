class CustormerReportMailer < ApplicationMailer
  def approval_customer_email(customer_report)
    @customer_report = customer_report
    mail(to: "aprobaciones@controlmatica.com.co", :from => @customer_report.email, subject: "El reporte #{customer_report.report_code} fue aprobado")
  end

  def approval_email(customer_report)
    @customer_report = customer_report

    attachments["reporte.pdf"] = WickedPdf.new.pdf_from_string(render_to_string(:pdf => "Report", :template => "customer_reports/pdfs/format_customer.pdf.erb", layout: "pdf.html.erb"))
    mail(to: @customer_report.email, :from => "aprobaciones@controlmatica.com.co", subject: "Aprobacion de reporte #{customer_report.report_code}")
  end
end
