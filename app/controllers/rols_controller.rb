class RolsController < ApplicationController
  before_action :set_rol, only: [:edit, :update, :destroy]

  # GET /rols
  # GET /rols.json
  def index
    @rols = Rol.all.paginate(:page => params[:page], :per_page => 10)
  end

  # GET /rols/1
  # GET /rols/1.json

  # GET /rols/new
  def new
    @rol = Rol.new
  end

  # GET /rols/1/edit
  def edit
  end

  # POST /rols
  # POST /rols.json
  def create
    @rol = Rol.new(rol_params)

    respond_to do |format|
      if @rol.save
        format.html { redirect_to rols_path }
        format.json { render :show, status: :created, location: @rol }
        flash[:success] = "El Rol Se Creo Con Exito!"
      else
        format.html { render :new }
        format.json { render json: @rol.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /rols/1
  # PATCH/PUT /rols/1.json
  def update
    respond_to do |format|
      if @rol.update(rol_params)
        format.html { redirect_to rols_path }
        format.json { render :show, status: :ok, location: @rol }
        flash[:update] = "El Rol Se Actualizo Con Exito!"
      else
        format.html { render :edit }
        format.json { render json: @rol.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /rols/1
  # DELETE /rols/1.json
  def destroy
    @rol.destroy
    respond_to do |format|
      format.html { redirect_to rols_url}
      format.json { head :no_content }
      flash[:danger] = "El Rol Se Elimino Con Exito!"
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_rol
      @rol = Rol.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def rol_params
      params.require(:rol).permit(:name, :description)
    end
end
