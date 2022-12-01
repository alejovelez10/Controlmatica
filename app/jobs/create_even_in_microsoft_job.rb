class CreateEvenInMicrosoftJob < ApplicationJob
  queue_as :default

  def perform(shift, access_token, user_timezone)
    ApplicationController.helpers.create_event(
      access_token,
      user_timezone,
      "Creacion de evento",
      shift.start_date,
      shift.end_date,
      [shift.user_responsible.email],
      shift.cost_center.code
    )
  end
end
