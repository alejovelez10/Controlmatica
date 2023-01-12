class DeleteShiftJob < ApplicationJob
  queue_as :default

  def perform(shift)
    Shift.find(shift.id).destroy
  end
end
