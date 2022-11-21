import React, { Component } from 'react';
import Calendar from '../components/Shifts/Calendar';
import WebpackerReact from 'webpacker-react';

class ShiftsCalendar extends Component {
    render() {
        return (
            <Calendar
                url_calendar={"/get_shifts"}
                cost_centers={this.props.cost_centers}
                users={this.props.users}
            />
        );
    }
}

export default ShiftsCalendar;
WebpackerReact.setup({ ShiftsCalendar });
