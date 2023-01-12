class CreateEvenInMicrosoftJob < ApplicationJob
  queue_as :default

  def perform(shift, access_token, user_timezone)
    
    if shift.user_responsible.present?
      array = [shift.user_responsible.email]
    else
      array = []
    end
    
    ApplicationController.helpers.create_event(
      access_token,
      user_timezone,
      "Creacion de evento",
      shift.start_date,
      shift.end_date,
      array,
      shift.cost_center.code
    )
  end
end
