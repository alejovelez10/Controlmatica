module CostCentersHelper

	def color_value(cotizado, real)

		if cotizado > real

				"green"
		else

				"red"
		end	
			
	end
end
