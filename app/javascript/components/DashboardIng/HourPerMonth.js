import React, { Component } from 'react';
import BarDayIng from '../../generalcomponents/BarDayIng';

class HourPerMonth extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            form: {
                value: new Date().getFullYear(),
                count: 5
            }
        }
    }



    componentWillReceiveProps(nextProps) {
        this.loadData(new Date().getFullYear(), nextProps.user, 5);
    }

    componentDidMount() {
        this.loadData(new Date().getFullYear(), this.props.user, 5);
    }



    loadData = (type, user, count) => {

        fetch(`/home/get_dashboard_ing/${type}/${user}/${count}`, {
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
        this.loadData(e.target.value, this.props.user, this.state.form.count);
    }

    handleChangeCount = e => {
        this.setState({
            form: {
                ...this.state.form,
                [e.target.name]: e.target.value
            }
        });
        this.loadData(this.state.form.value, this.props.user, e.target.value);
    }


    render() {
        return (
            <div >
                <div className='p-1' style={{ display: "flex" }}>
                    <select
                        name="value"
                        className={`form form-control`}
                        value={this.state.form.value}
                        onChange={this.handleChange}
                        style={{ width: "200px" }}
                    >
                        <option value="">Seleccione año</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2021">2021</option>
                        <option value="2020">2020</option>
                        <option value="2019">2019</option>
                        <option value="2018">2018</option>
                        <option value="2017">2017</option>

                    </select>
                    <select
                        name="count"
                        className={`form form-control ml-2`}
                        value={this.state.form.count}
                        onChange={this.handleChangeCount}
                        style={{ width: "400px" }}
                    >

                        <option value="5">5 CC en los que mas trabajó</option>
                        <option value="10">10 CC en los que mas trabajó</option>
                        <option value="20">20 CC en los que mas trabajó</option>
                    </select>
                    {/* <button className='btn btn-primary' onClick={()=>this.loadData("6")}> 6 </button>
                        <button className='btn btn-primary' onClick={()=>this.loadData("3")}> 3 </button> */}
                </div>
                <hr />
                <BarDayIng data={this.state.data} title={"ESTAS SON TUS HORAS POR PROYECTO POR MES"} type="none" height={this.props.height} />
            </div>
        )

    }
}

export default HourPerMonth;
