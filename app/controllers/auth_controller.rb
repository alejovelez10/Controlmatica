class AuthController < ApplicationController
    skip_before_action :set_user
    
    def callback
        # Access the authentication hash for omniauth
        data = request.env['omniauth.auth']

        # Save the data in the session
        save_in_session data

        redirect_to root_url
    end

    def signout
        reset_session
        redirect_to root_url
    end
end
