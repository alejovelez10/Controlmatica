import React from 'react';
import ItemNotification from "../components/Notifications/ItemNotification"
import WebpackerReact from 'webpacker-react';

class Notifications extends React.Component {
    constructor(props) {
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
                    url={"update_state"}
                    urlLoadData={"get_notifications"}
                    urlUpdateAll={"register_edit_update_all"}
                    pending={"pending"}
                    review={"revised"}
                    from={this.props.from} 
                    estados={this.props.estados}
                />*/}

                <div className="card card-table">
                    <div className="card-body">
                        <ul className="nav nav-tabs mb-3" id="myTab" role="tablist">
                            <li className="nav-item" onClick={() => this.handleChangeTab("pending")}>
                                <a className={`nav-link ${this.state.currentTab == "pending" ? "active" : null}`}>Pendientes de revisión</a>
                            </li>

                            <li className="nav-item" onClick={() => this.handleChangeTab("revised")}>
                                <a className={`nav-link ${this.state.currentTab == "revised" ? "active" : null}`}>Revisadas</a>
                            </li>
                        </ul>

                        {this.state.currentTab == "pending" && (
                            <ItemNotification
                                url={"/get_notifications/pending"}
                                updateState={"/update_state"}
                                updateAll={"/register_edit_update_all"}
                                state={"pending"}
                                from={this.props.from}
                                estados={this.props.estados}
                            />
                        )}

                        {this.state.currentTab == "revised" && (
                            <ItemNotification
                                url={"/get_notifications/revised"}
                                updateState={"/update_state"}
                                updateAll={"/register_edit_update_all"}
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



export default Notifications;
WebpackerReact.setup({ Notifications });
