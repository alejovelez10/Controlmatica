import React from 'react';
import Index from "../components/Notifications/index"
import WebpackerReact from 'webpacker-react';

class NotificationsAlerts extends React.Component {
    render() {
        return (
            <React.Fragment>
                <Index 
                    usuario={this.props.usuario} 
                    url={"update_state_notification_alert"}
                    urlLoadData={"get_notifications_alerts"}
                    urlUpdateAll={"notification_alerts_update_all"}
                    pending={false}
                    review={true}
                    from={this.props.from} 
                    estados={this.props.estados}
                />
            </React.Fragment>
        );
    }
}

export default NotificationsAlerts;
WebpackerReact.setup({ NotificationsAlerts });
