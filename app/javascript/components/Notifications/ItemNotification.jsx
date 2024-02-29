import React from 'react';
import Pagination from "react-js-pagination";
import ReactHtmlParser, { processNodes, convertNodeToElement, htmlparser2 } from 'react-html-parser';

class ItemNotification extends React.Component {
    constructor(props){
        super(props)
        this.token = document.querySelector("[name='csrf-token']").content;
        this.state = {
            data: [],
            isLoaded: true,
            isUpdating: false,

            activePage: 1,
            countPage: 10,
            totalData: 0
        }
    }

    componentDidMount = () => {
        this.loadData();
    }

    loadData = () => {
        fetch(this.props.url, {
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
                totalData: data.total,
                isLoaded: false,
                isUpdating: false
            })
        });
    }

    handlePageChange = (pageNumber) => {
        fetch(`${this.props.url}?page=${pageNumber}`, {
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
                totalData: data.total,
                activePage: pageNumber,
                isLoaded: false
            })
        });
    }

    handleClickUpdate = (register_edit_id) => {
        fetch(`${this.props.updateState}/${register_edit_id}`, {
            method: 'PATCH', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.loadData();
        });
    }

    handleClickUpdateAll = () => {
        this.setState({ isUpdating: true })
        fetch(this.props.updateAll, {
            method: 'PATCH', // or 'PUT'
            headers: {
                "X-CSRF-Token": this.token,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            this.loadData();
        });
    }

    render() {
        return (
            <React.Fragment>
                {(this.props.state == "pending" && this.state.data.length >= 1)&& (
                    <div className="row mb-4">
                        <div className="col-md-10"></div>
                        <div className="col-md-2 text-right">
                            <button
                                className='btn btn-secondary'
                                disabled={this.state.isUpdating}
                                onClick={() => this.handleClickUpdateAll()}
                            >
                                {this.state.isUpdating ? "Actualizando..." : "Revisar todas"}
                            </button>
                        </div>
                    </div>
                )}

                {this.state.data.length >= 1 ? (
                    this.state.data.map(accion => (
                        <div className={`card ${this.props.from != null ? (accion.id == this.props.from ? "select-item-back" : "") : ""}`} key={accion.id} style={{ marginBottom: "17px" }}>
                            <div className="card-body">
                                <div className="row">
            
                                    <div className="col-md-10">
                                        <div className="row">
                                            <div className="col-md-4">
                                                <h4 style={{ color: "#ffbe3b" }}>{accion.module}</h4>
                                            </div>
                
                                            <div className="col-md-7">
                                                <p> Usuario que registra: <b>{accion.user.names}</b> el dia: <b>{accion.date_update}</b></p>
                                            </div>
                                        </div>
                
                                        <hr className="mt-0" />
                
                                        {ReactHtmlParser(accion.description)} <br /><hr />
                                    
                                        {accion.real != undefined && (
                                            <div>
                                                <div style={{ fontSize: "20px" }}>
                                                    Margen minimo: <span style={{ color: "green", marginRight: "40px" }}>{accion.expected}% </span>  Real: <span style={{ color: "red" }}>{accion.real}% </span>
                                                </div>
                                                <hr />
                                                <div style={{ fontSize: "16px" }}>
                                                    <p> Centro de costos: ({accion.cost_center != undefined ? accion.cost_center.code : " "}) {accion.cost_center != undefined ? accion.cost_center.description : " "}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
            
                                    {this.props.estados.review && (
                                        <div className="col-md-2 text-center">
                                            <i onClick={() => this.handleClickUpdate(accion.id)} className={`${this.props.state == "pending" ? "fas fa-exclamation-triangle" : "fas fa-check"} icon-notification ${this.props.from != null ? (accion.id == this.props.from ? "select-item" : "") : ""}`}></i>
                                        </div>
                                    )}
            
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card">
                        <div className="card-body text-center">
                            <h5>No hay notificaciones {this.props.state == "pending" ? "pendientes" : "revisadas"}</h5>
                        </div>
                    </div>
                )}
                
                {true && (
                    <div className="row mt-3">
                        <div className="col-md-3 text-left">
                            <p>Mostrando {this.state.data.length} de {this.state.totalData}</p>
                        </div>

                        <div className="col-md-9 pl-0">
                            <Pagination
                                hideNavigation
                                activePage={this.state.activePage}
                                itemsCountPerPage={this.state.countPage}
                                itemClass="page-item"
                                innerClass="pagination"
                                linkClass="page-link"
                                totalItemsCount={this.state.totalData}
                                pageRangeDisplayed={this.state.countPage}
                                onChange={this.handlePageChange}
                            />
                        </div>
                    </div>
                )}
            </React.Fragment>
        );
    }
}



export default ItemNotification;
