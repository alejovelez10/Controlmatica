module CustomerReportsHelper
    def get_customer_reports
        customer_reports = CustomerReport.all
		customer_reports.collect do |customer_report|
			{
                :label => customer_report.description,
                :value => customer_report.id,
			}
		end
    end
end
