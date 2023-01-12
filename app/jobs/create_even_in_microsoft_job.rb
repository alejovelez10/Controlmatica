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
      shift.subject,
      DateTime.new(2023,1,1,8,0,0 , + '-5'),
      DateTime.new(2023,1,1,17,0,0 , + '-5'),
      array,
      shift.description
    )
  end
end
