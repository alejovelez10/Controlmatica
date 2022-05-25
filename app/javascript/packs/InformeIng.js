import React, { Component } from 'react';
import WebpackerReact from 'webpacker-react';
import HourPerMonth from '../components/DashboardIng/HourPerMonth';
import ReporterHours from '../components/DashboardIng/ReporterHours';
import HourProjectMonth from '../components/DashboardIng/HourProjectMonth';
import HourDay from '../components/DashboardIng/HourDay';
import Commisions from '../components/DashboardIng/Commisions';



class InformeIng extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            form: {
                value: this.props.current_user_id,
                name: this.props.current_user_name
            }
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
                name: value[1]
            }
        });
        /*   this.loadData(e.target.value); */
    }


    triggerChildAlert() {
        this.refs.child.showAlert();
    }

    render() {
        return (
            <div className='row'>
                <div className='col-md-12 title-board-ing' >
                    <div style={{ fontSize: "25px", margin: "0px" }}> ¡HOLA! <span> {this.state.form.name.toUpperCase()} A CONTINUACION VAS A VER TU TABLERO</span> </div>
                    {this.props.ver_todos && (
                        <select
                            name="value"
                            className={`form form-control`}
                            value={[this.state.form.value, this.state.form.name]}
                            onChange={this.handleChange}
                            style={{ width: "200px", marginLeft: "10px" }}
                        >  <option value="">Seleccione año</option>
                            {this.props.users.map(user => (
                                <option value={[user.id, user.names]}>{user.names}</option>
                            ))}

                        </select>
                    )}

                           
                </div>

                {this.props.rol.name == "TABLERISTA" ? (
                                        <div className='row' style={{width:"100%"}}>
                        <div style={{ background: "white", padding: "10px" }} className='col-md-6'>
                        <HourDay user={this.state.form.value} ref="child" height="400" />
                    </div>

                    <div style={{ background: "white", padding: "10px" }} className='col-md-6'>
                        <ReporterHours user={this.state.form.value} ref="child"  height="350" />
                    </div>
                   </div>
                ): (
                    <div className='row' style={{width:"100%"}}>
                    <div style={{ background: "white", padding: "10px" }} className='col-md-4'>
                    <HourDay user={this.state.form.value} ref="child" height="400" />
                </div>

                <div style={{ background: "white", padding: "10px" }} className='col-md-4'>
                    <ReporterHours user={this.state.form.value} ref="child"  height="350" />
                </div>
                <div style={{ background: "white", padding: "10px" }} className='col-md-4'>
                    <Commisions user={this.state.form.value} ref="child" height="350" />
                </div>
                </div>
                )}
           



                <div className='col-md-12'> <hr /></div>

                <div style={{ background: "white", padding: "10px" }} className='col-md-12'>
                    <HourProjectMonth user={this.state.form.value} ref="child" height="400" />
                </div>
                <div className='col-md-12'> <hr /></div>

                <div style={{ background: "white", padding: "10px" }} className='col-md-12'>
                    <HourPerMonth user={this.state.form.value} ref="child" height="400"  />
                </div>

            </div>
        )

    }
}

export default InformeIng;
WebpackerReact.setup({ InformeIng });