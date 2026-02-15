import React, { Component } from 'react';
import BarDayIng from '../../generalcomponents/BarDayIng';

class Commisions extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            form: {
                value: new Date().getFullYear(),
            }
        }
    }



    componentWillReceiveProps(nextProps) {
        this.loadData(new Date().getFullYear(), nextProps.user);
    }

    componentDidMount() {
        this.loadData(new Date().getFullYear(), this.props.user);
    }



    loadData = (type, user) => {

        fetch(`/home/get_dashboard_five_ing/${type}/${user}`, {
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
            });
    }

    handleChange = e => {
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: e.target.value
            }
        });
        this.loadData(e.target.value, this.props.user);
    }


    render() {
        return (
            <div>
                <div className='dashboard-filters'>
                    <select
                        name="value"
                        className="dashboard-select"
                        value={this.state.form.value}
                        onChange={this.handleChange}
                    >
                        <option value="">Seleccione año</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2021">2021</option>
                        <option value="2020">2020</option>
                    </select>
                </div>
                <div className="dashboard-card">
                    <BarDayIng data={this.state.data} title={"Comisiones Acumuladas por Trimestre"} type="currency" height={this.props.height} />
                </div>
            </div>
        )

    }
}

export default Commisions;
