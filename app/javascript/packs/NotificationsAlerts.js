import React from 'react';
import ItemNotification from "../components/Notifications/ItemNotification"
import WebpackerReact from 'webpacker-react';

class NotificationsAlerts extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            currentTab: "pending"
        }
    }

    handleChangeTab = (tab) => {
        this.setState({
            currentTab: tab
        })
    }

    render() {
        return (
            <React.Fragment>
                {/*<Index 
                    usuario={this.props.usuario} 
                    url={"update_state_notification_alert"}
                    urlLoadData={"get_notifications_alerts"}
                    urlUpdateAll={"notification_alerts_update_all"}
                    pending={false}
                    review={true}
                    from={this.props.from} 
                    estados={this.props.estados}
                />*/}
                
                <div className="card card-table">
                    <div className="card-body">
                        <ul className="nav nav-tabs mb-3" id="myTab" role="tablist">
                            <li className="nav-item" onClick={() => this.handleChangeTab("pending")}>
                                <a className={`nav-link ${this.state.currentTab == "pending" ? "active" : null}`}>Pendientes de revision</a>
                            </li>

                            <li className="nav-item" onClick={() => this.handleChangeTab("revised")}>
                                <a className={`nav-link ${this.state.currentTab == "revised" ? "active" : null}`}>Revisadas</a>
                            </li>
                        </ul>

                        {this.state.currentTab == "pending" && (
                            <ItemNotification
                                url={"/get_notifications_alerts/false"}
                                updateState={"/update_state_notification_alert"}
                                updateAll={"/notification_alerts_update_all"}
                                state={"pending"}
                                from={this.props.from}
                                estados={this.props.estados}
                            />
                        )}

                        {this.state.currentTab == "revised" && (
                            <ItemNotification
                                url={"/get_notifications_alerts/true"}
                                updateState={"/update_state_notification_alert"}
                                updateAll={"/notification_alerts_update_all"}
                                state={"revised"}
                                from={this.props.from}
                                estados={this.props.estados}
                            />
                        )}

                    </div>
                </div>
            </React.Fragment>
        );
    }
}

export default NotificationsAlerts;
WebpackerReact.setup({ NotificationsAlerts });
