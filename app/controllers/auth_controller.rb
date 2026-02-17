class AuthController < ApplicationController
    skip_before_action :set_user

    def callback
        # Access the authentication hash for omniauth
        data = request.env['omniauth.auth']

        Rails.logger.info "=== MICROSOFT AUTH CALLBACK ==="
        Rails.logger.info "Auth data present: #{data.present?}"
        Rails.logger.info "Display name: #{data.dig(:extra, :raw_info, :displayName)}" if data.present?
        Rails.logger.info "Email: #{data.dig(:extra, :raw_info, :mail)}" if data.present?

        # Save the data in the session
        save_in_session data

        Rails.logger.info "Session user_name after save: #{session[:user_name]}"
        Rails.logger.info "=== END MICROSOFT AUTH ==="

        redirect_to root_url
    end

    def signout
        reset_session
        redirect_to root_url
    end
end
