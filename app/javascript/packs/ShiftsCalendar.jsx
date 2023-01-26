import React, { Component } from 'react';
import Calendar from '../components/Shifts/Calendar';
import WebpackerReact from 'webpacker-react';

class ShiftsCalendar extends Component {
    render() {
        return (
            <Calendar
                url_calendar={`/get_shifts/${this.props.view}`}
                cost_centers={this.props.cost_centers}
                users={this.props.users}
                microsoft_auth={this.props.microsoft_auth}
                current_user_name={this.props.current_user_name}
            />
        );
    }
}

export default ShiftsCalendar;
WebpackerReact.setup({ ShiftsCalendar });
