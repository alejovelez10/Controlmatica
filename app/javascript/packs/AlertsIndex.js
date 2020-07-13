import React, { Component } from 'react';
import WebpackerReact from 'webpacker-react';
import Table from '../components/Alerts/Table'

class AlertsIndex extends Component {
    constructor(props) {
        super(props);
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            isLoaded: true,
        }
    }

    componentDidMount(){
        this.loadData();
    }

    updateStateLoad = (state) => {
        this.setState({ isLoaded: state })
    } 

    loadData = () => {
        fetch(`/get_alerts`, {
            method: 'GET', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
          this.setState({
            data: data.data,
            isLoaded: false
          });
        });
    }


    render() {
        return (
            <React.Fragment>
                <Table
                    updateStateLoad={this.updateStateLoad}
                    loadData={this.loadData}
                    data={this.state.data}
                    estados={this.props.estados}
                    isLoaded={this.state.isLoaded}
                />
            </React.Fragment>
        );
    }
}


export default AlertsIndex;
WebpackerReact.setup({ AlertsIndex });