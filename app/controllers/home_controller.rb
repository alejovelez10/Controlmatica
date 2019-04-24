class HomeController < ApplicationController
	before_action :authenticate_user!
  def index
  end

  def dashboard
  	
  end


  def users_new
  	
  end

  def index_user
  	@user = User.all
  end
  
end
