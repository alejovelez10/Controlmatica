class AlertMailer < ApplicationMailer

  # Subject can be set in your I18n file at config/locales/en.yml
  # with the following lookup:
  #
  #   en.alert_mailer.send_alert.subject
  #
  def send_alert(value1, value2, text)
    @value1 = value1
    @value2 = value2
    @text = text

    mail(to: "alejovelez10@gmail.com", :from => "alejovelez10@gmail.com", subject: "Alerta de gastos")
  end
end
