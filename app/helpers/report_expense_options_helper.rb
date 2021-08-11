module ReportExpenseOptionsHelper
    def get_report_expense_options
        report_expense_oiptions = ReportExpenseOption.all
        report_expense_oiptions.collect do |report_expense_oiption|
          {
            :id => report_expense_oiption.id,
            :name => report_expense_oiption.name,
            :category => report_expense_oiption.category
          }
        end
    end
end
