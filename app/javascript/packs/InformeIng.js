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