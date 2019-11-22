class ParameterizationsController < ApplicationController
  before_action :set_parameterization, only: [:show, :edit, :update, :destroy]
    before_action :authenticate_user!
    skip_before_action :verify_authenticity_token
  # GET /parameterizations
  # GET /parameterizations.json
  def index
    @parameterizations = Parameterization.all.paginate(:page => params[:page], :per_page => 10)
  end

  def get_parameterizations
    if params[:name].present?
      parameterizations = Parameterization.search(params[:name])
    else
      parameterizations = Parameterization.all
    end
    render :json => parameterizations
  end
  


  # GET /parameterizations/1
  # GET /parameterizations/1.json
  def show
  end

  # GET /parameterizations/new
  def new
    @parameterization = Parameterization.new
  end

  # GET /parameterizations/1/edit
  def edit
  end

  # POST /parameterizations
  # POST /parameterizations.json
  def create
    valor1 = parameterization_params["money_value"].gsub('$','').gsub(',','')
    params["money_value"] = valor1

    @parameterization = Parameterization.create(parameterization_params)

      if @parameterization.save
        render :json => {
          message: "¡El Registro fue creado con exito!",
          type: "success"
        }
      else
        render :json => {
          message: "¡El Registro no fue creado!",
          type: "error",
          message_error: @parameterization.errors.full_messages
        }
      end
  	
  end

  # PATCH/PUT /parameterizations/1
  # PATCH/PUT /parameterizations/1.json

  def update
    valor1 = parameterization_params["money_value"].gsub('$','').gsub(',','')
    params["money_value"] = valor1
    
    if @parameterization.update(parameterization_params) 
      render :json => {
        message: "¡El Registro fue actualizado con exito!",
        type: "success"
      }
    else 
      render :json => {
        message: "¡El Registro no fue actualizado!",
        type: "error",
        message_error: @parameterization.errors.full_messages
      }
    end
  end

  # DELETE /parameterizations/1
  # DELETE /parameterizations/1.json
  def destroy
    if @parameterization.destroy
      render :json => @parameterization
    else 
      render :json => @parameterization.errors.full_messages
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_parameterization
      @parameterization = Parameterization.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def parameterization_params
      params.permit(:name, :user_id, :number_value, :money_value)
    end
end
