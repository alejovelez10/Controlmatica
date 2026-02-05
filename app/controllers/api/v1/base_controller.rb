module Api
  module V1
    class BaseController < ActionController::API
      before_action :authenticate_api_key!

      private

      def authenticate_api_key!
        api_key = ENV["API_KEY"]
        provided_key = request.headers["X-Api-Key"]

        unless api_key.present? && provided_key.present? && ActiveSupport::SecurityUtils.secure_compare(api_key, provided_key)
          render json: { error: "Unauthorized" }, status: :unauthorized
        end
      end
    end
  end
end
