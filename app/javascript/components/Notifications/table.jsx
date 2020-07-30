import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from "react-number-format";
import ReactHtmlParser, { processNodes, convertNodeToElement, htmlparser2 } from 'react-html-parser';

class table extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      action: {},
    }
  }

  date = (fecha) => {
    var d = new Date(fecha),
    months = ['Enero','Febrero','Marzo','Abril','Mayo','junio','julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return months[d.getMonth()] + " " + d.getDate() + " " + 'del' + " " +d.getFullYear()
  }

  MessageSucces = (name_success, type, error_message) => {
        Swal.fire({
        position: "center",
        type: type,
        html: '<p>'  + error_message !=  undefined ? error_message : "asdasdasd"  +  '</p>',
        title: name_success,
        showConfirmButton: false,
        timer: 1500 
        });
    }
      

    handleClickUpdate = (id) => {
      fetch(`/${this.props.url}/${id}`)
      .then(response => response.json())
      .then(data => {
          this.props.loadInfo()
      });
    };
  


  render() {
    return (
      <React.Fragment>
        <ul className="nav nav-tabs mb-3" id="myTab" role="tablist">
          <li className="nav-item">
            <a className="nav-link active" id="home-tab" data-toggle="tab" href="#home" role="tab" aria-controls="home" aria-selected="true">Pendientes de revision <span className="badge badge-warning">{this.props.data.filter(notification => notification.state == "pending").length}</span></a>
          </li>

          <li className="nav-item">
            <a className="nav-link" id="profile-tab" data-toggle="tab" href="#profile" role="tab" aria-controls="profile" aria-selected="false">Revisadas <span className="badge badge-warning">{this.props.data.filter(notification => notification.state == "revised").length}</span></a>
          </li>
        </ul>

        <div className="tab-content" id="myTabContent">
          <div className="tab-pane fade show active" id="home" role="tabpanel" aria-labelledby="home-tab">
            {this.props.data.filter(notification => notification.state == this.props.pending).length >= 1 ? (
                this.props.data.filter(notification => notification.state == this.props.pending).map(accion => (
                  <div className={`card ${this.props.from != null ? (accion.id == this.props.from ? "select-item-back" : "") : ""}`} key={accion.id} style={{ marginBottom: "17px"}}>
                    <div className="card-body">
                        <div className="row">

                          <div className="col-md-10">
                            <div className="row">
                              <div className="col-md-4">
                                <h4 style={{ color: "#ffbe3b" }}>{accion.module}</h4>
                              </div>

                              <div className="col-md-7">
                                <p>Esta infomacion fue editada por: <b>{accion.user.names}</b> el dia: <b>{this.date(accion.date_update)}</b></p>
                              </div>
                            </div>

                            <hr className="mt-0"/>

                              {ReactHtmlParser(accion.description)}
                          </div>

                          <div className="col-md-2 text-center">
                            <i onClick={() => this.handleClickUpdate(accion.id)} className={`fas fa-exclamation-triangle icon-notification ${this.props.from != null ? (accion.id == this.props.from ? "select-item" : "") : ""}`}></i>
                          </div>

                        </div>
                    </div>
                  </div>  
                ))
              ) : (
                <div className="card">
                    <div className="card-body">
                        <h5>No hay Notificaciones pendientes</h5>
                    </div>
                </div>
              )}
          </div>

          <div className="tab-pane fade" id="profile" role="tabpanel" aria-labelledby="profile-tab">
            {this.props.data.filter(notification => notification.state == this.props.pending).length >= 1 ? (
                this.props.data.filter(notification => notification.state == this.props.pending).map(accion => (
                  <div className="card" key={accion.id} style={{ marginBottom: "17px" }}>
                    <div className="card-body">
                        <div className="row">

                          <div className="col-md-10">
                            <div className="row">
                              <div className="col-md-4">
                                <h4 style={{ color: "#ffbe3b" }}>{accion.module}</h4>
                              </div>

                              <div className="col-md-7">
                                <p>Esta infomacion fue editada por: <b>{accion.user.names}</b> el dia: <b>{this.date(accion.date_update)}</b></p>
                              </div>
                            </div>

                            <hr className="mt-0"/>

                              {ReactHtmlParser(accion.description)}
                          </div>

                          <div className="col-md-2 text-center">
                            <i className="fas fa-check icon-notification"></i>
                          </div>

                        </div>
                    </div>
                  </div>  
                ))
              ) : (
                <div className="card">
                    <div className="card-body">
                        <h5>No hay Notificaciones pendientes</h5>
                    </div>
                </div>
              )}
          </div>

        </div>
      </React.Fragment>
    );
  }
}

export default table;
