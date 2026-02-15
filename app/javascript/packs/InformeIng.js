import React, { Component } from 'react';
import WebpackerReact from 'webpacker-react';
import HourPerMonth from '../components/DashboardIng/HourPerMonth';
import ReporterHours from '../components/DashboardIng/ReporterHours';
import HourProjectMonth from '../components/DashboardIng/HourProjectMonth';
import HourDay from '../components/DashboardIng/HourDay';
import Commisions from '../components/DashboardIng/Commisions';
import Calendar from '../components/Shifts/Calendar';



class InformeIng extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            form: {
                value: this.props.current_user_id,
                name: this.props.current_user_name
            },
            is_tablerista: this.props.rol.name
        }
    }


    componentDidMount() {
        this.loadData(10);
    }

    loadData = (type) => {

        /*         fetch(`/home/get_dashboard_four_ing/${type}`, {
                    method: 'GET', // or 'PUT'
                    headers: {
                        "X-CSRF-Token": this.token,
                        "Content-Type": "application/json"
                    }
                })
                    .then(response => response.json())
                    .then(data => {
                        this.setState({
                            data: data
                        });
                    }); */
    }

    handleChange = (e) => {
        let value = e.target.value.split(",")
        console.log(value)
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: value[0],
                name: value[1],
                
            },
            is_tablerista: value[2]

        });
        /*   this.loadData(e.target.value); */
    }


    triggerChildAlert() {
        this.refs.child.showAlert();
    }

    render() {
        return (
            <div className={`${this.props.current_tab != "home" ? "" : "row"}`}>

                {/* Header personalizado del dashboard */}
                <div className="col-md-12 dashboard-custom-header">
                    <div className="dashboard-header-left">
                        <div className="dashboard-header-icon">
                            <i className="fas fa-chart-line"></i>
                        </div>
                        <div className="dashboard-header-text">
                            <h1>Hola, {this.state.form.name || 'Usuario'}</h1>
                            <p>Bienvenido a tu tablero de control</p>
                        </div>
                    </div>
                    {this.props.ver_todos && (
                        <select
                            name="value"
                            className="dashboard-select"
                            value={[this.state.form.value, this.state.form.name]}
                            onChange={this.handleChange}
                        >
                            <option value="">Seleccione Usuario</option>
                            {this.props.users.map(user => (
                                <option key={user.id} value={[user.id, user.names, user.rol]}>{user.names}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="col-md-12 pl-0">
                    <style>{`
                        .dashboard-custom-header {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 16px 0;
                            margin-bottom: 16px;
                            background: #ffffff;
                        }
                        .dashboard-header-left {
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        }
                        .dashboard-header-icon {
                            width: 40px;
                            height: 40px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .dashboard-header-icon i {
                            color: #f5a623;
                            font-size: 24px;
                        }
                        .dashboard-header-text h1 {
                            margin: 0;
                            font-size: 18px;
                            font-weight: 600;
                            color: #1f2937;
                            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
                        }
                        .dashboard-header-text p {
                            margin: 2px 0 0 0;
                            font-size: 13px;
                            color: #6b7280;
                            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
                        }
                        .dashboard-tabs {
                            display: flex;
                            gap: 8px;
                            padding: 0;
                            margin: 0;
                            list-style: none;
                            border-bottom: 2px solid #e5e7eb;
                        }
                        .dashboard-tabs .nav-item {
                            margin-bottom: -2px;
                        }
                        .dashboard-tabs .nav-link {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            padding: 12px 20px;
                            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
                            font-size: 14px;
                            font-weight: 500;
                            color: #6b7280;
                            text-decoration: none;
                            border: none;
                            border-bottom: 2px solid transparent;
                            background: transparent;
                            transition: all 0.2s ease;
                        }
                        .dashboard-tabs .nav-link:hover {
                            color: #f5a623;
                        }
                        .dashboard-tabs .nav-link.active {
                            color: #f5a623;
                            border-bottom: 2px solid #f5a623;
                        }
                    `}</style>
                    <ul className="nav dashboard-tabs" id="myTab" role="tablist">
                        <li className="nav-item">
                            <a className={`nav-link ${this.props.current_tab == "home" ? "active" : ""}`} id="home-tab" href={`/home/dashboard_ing?tab=home`}>
                                <i className="fas fa-chart-bar"></i> Informacion
                            </a>
                        </li>

                        <li className="nav-item">
                            <a className={`nav-link ${this.props.current_tab != "home" ? "active" : ""}`} id="profile-tab" href={`/home/dashboard_ing?tab=calendar`}>
                                <i className="fas fa-calendar-alt"></i> Calendario
                            </a>
                        </li>
                    </ul>
                </div>

                <div className="tab-content" id="myTabContent">
                    <div className={`tab-pane fade ${this.props.current_tab == "home" ? "show active" : ""}`} id="home" role="tabpanel" aria-labelledby="home-tab">
                        <div className="row">

                            {this.state.is_tablerista == "TABLERISTA" ? (
                                <div className='row pl-3' style={{width:"100%"}}>
                                    <div className='col-md-6' style={{ padding: "10px" }}>
                                        <HourDay user={this.state.form.value} ref="child" height="400" />
                                    </div>

                                    <div className='col-md-6' style={{ padding: "10px" }}>
                                        <ReporterHours user={this.state.form.value} ref="child"  height="350" />
                                    </div>
                                </div>
                            ): (
                                <div className='col-md-12'>
                                    <div className="row pl-3" style={{width:"100%"}}>
                                        <div className='col-md-4' style={{ padding: "10px" }}>
                                            <HourDay user={this.state.form.value} ref="child" height="400" />
                                        </div>

                                        <div className='col-md-4' style={{ padding: "10px" }}>
                                            <ReporterHours user={this.state.form.value} ref="child"  height="350" />
                                        </div>

                                        <div className='col-md-4' style={{ padding: "10px" }}>
                                            <Commisions user={this.state.form.value} ref="child" height="350" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="col-md-12" style={{ marginTop: "20px" }}>
                                <HourProjectMonth user={this.state.form.value} ref="child" height="400" />
                            </div>

                            <div className="col-md-12" style={{ marginTop: "20px" }}>
                                <HourPerMonth user={this.state.form.value} ref="child" height="400"  />
                            </div>
                        </div>
                    </div>

                    <div className={`tab-pane fade ${this.props.current_tab != "home" ? "show active" : ""}`} id="profile" role="tabpanel" aria-labelledby="profile-tab" >
                                
                            <Calendar
                                url_calendar={`/get_shifts/MY`}
                                cost_centers={this.props.cost_centers}
                                users={this.props.current_user}
                                microsoft_auth={this.props.microsoft_auth}
                                current_user_name={this.props.current_user_name}
                            />
                    </div>

                </div>
            </div>
        )

    }
}

export default InformeIng;
WebpackerReact.setup({ InformeIng });