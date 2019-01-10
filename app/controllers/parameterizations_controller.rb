class ParameterizationsController < ApplicationController
  before_action :set_parameterization, only: [:show, :edit, :update, :destroy]

  # GET /parameterizations
  # GET /parameterizations.json
  def index
    @parameterizations = Parameterization.all.paginate(:page => params[:page], :per_page => 10)
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
    @parameterization = Parameterization.new(parameterization_params)

    respond_to do |format|
      if @parameterization.save
        format.html { redirect_to parameterizations_path, notice: 'Parameterization was successfully created.' }
        format.json { render :show, status: :created, location: @parameterization }
      else
        format.html { render :new }
        format.json { render json: @parameterization.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /parameterizations/1
  # PATCH/PUT /parameterizations/1.json
  def update
    respond_to do |format|
      if @parameterization.update(parameterization_params)
        format.html { redirect_to parameterizations_path, notice: 'Parameterization was successfully updated.' }
        format.json { render :show, status: :ok, location: @parameterization }
      else
        format.html { render :edit }
        format.json { render json: @parameterization.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /parameterizations/1
  # DELETE /parameterizations/1.json
  def destroy
    @parameterization.destroy
    respond_to do |format|
      format.html { redirect_to parameterizations_url, notice: 'Parameterization was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_parameterization
      @parameterization = Parameterization.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def parameterization_params
      params.require(:parameterization).permit(:name, :user_id, :number_value, :money_value)
    end
end
