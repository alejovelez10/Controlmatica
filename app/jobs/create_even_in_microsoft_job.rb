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
      DateTime.new(shift.start_date.year, shift.start_date.month, shift.start_date.day, shift.start_date.hour,0,0 , + '-5'),
      DateTime.new(shift.end_date.year,  shift.end_date.month , shift.end_date.day, shift.end_date.hour,0,0 , + '-5'),
      array,
      shift.description,
      shift.id
    )
  end
end
