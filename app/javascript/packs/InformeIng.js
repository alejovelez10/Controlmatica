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
                <div style={{ background: "white", padding: "10px", display: "flex" }} className='col-md-12'>
                    <p style={{ fontSize: "25px", margin: "0px" }}> TABLERO DE {this.state.form.name.toUpperCase()}</p>
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
                <div className='col-md-12'> <hr /></div>
                <div style={{ background: "white", padding: "10px" }} className='col-md-6'>
                    <HourPerMonth user={this.state.form.value} ref="child" />
                </div>
                <div style={{ background: "white", padding: "10px" }} className='col-md-6'>
                    <ReporterHours user={this.state.form.value} ref="child" />
                </div>
                <div className='col-md-12'> <hr /></div>

                <div style={{ background: "white", padding: "10px" }} className='col-md-12'>
                    <HourProjectMonth user={this.state.form.value} ref="child" />
                </div>
                <div className='col-md-12'> <hr /></div>
                <div style={{ background: "white", padding: "10px" }} className='col-md-6'>
                    <Commisions user={this.state.form.value} ref="child" />
                </div>
                <div style={{ background: "white", padding: "10px" }} className='col-md-6'>
                    <HourDay user={this.state.form.value} ref="child" />
                </div>

            </div>
        )

    }
}

export default InformeIng;
WebpackerReact.setup({ InformeIng });