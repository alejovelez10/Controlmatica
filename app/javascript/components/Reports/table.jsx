import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import NumberFormat from 'react-number-format';

class table extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            action: {},
        }
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


  delete = id => {
    Swal.fire({
      title: "Estas seguro?",
      text: "El registro sera eliminado para siempre!",
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#009688",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si"
    }).then(result => {
      if (result.value) {
        fetch("/customers/" + id, {
          method: "delete"
        })
          .then(response => response.json())
          .then(response => {
            this.props.loadInfo();

            Swal.fire(
              "Borrado!",
              "¡El registro fue eliminado con exito!",
              "success"
            );
          });
      }
    });
  };



  render() {
    return (
      <React.Fragment>
        <div className="row mb-4">
            <div className="col-md-12">
                <div className="row">
                    <div className="col-md-8">

                    </div>

                    <div className="col-md-4 text-right">
                    <button
                      className="btn btn-light mr-3"
                      onClick={this.props.show}
                      disabled={this.props.dataActions.length >= 1 ? false : true}
                    >
                      Filtros <i class="fas fa-search ml-2"></i>
                    </button>
                        <a href="/reports/new" className="btn btn-secondary" >Nuevo Reporte</a>
                    </div>
                </div>
            </div>
        </div>

        <div className="content-table">

        <table className="table table-hover table-bordered table-width" id="sampleTable">
          <thead>
            <tr className="tr-title">
              <th className="text-center">Acciones</th>
              <th>Codigo</th>
              <th>Centro de Costos</th>
              <th>Fecha de Ejecucion</th>
              <th>Responsable Ejecucion</th>
              <th>Horas Laboradas</th>
              <th>Descripcion del Trabajo</th>
              <th>Valor de los Viaticos</th>
              <th>Descripcion de Viaticos</th>
              <th>Valor del Reporte</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {this.props.dataActions.length >= 1 ? (
              this.props.dataActions.map(accion => (
                <tr key={accion.id}>
                  <td className="text-right" style={{ width: "10px" }}>
                    <div
                      className="btn-group"
                      role="group"
                      aria-label="Button group with nested dropdown"
                    >
                      <div className="btn-group" role="group">
                        <button
                          className="btn btn-secondary"
                          id="btnGroupDrop1"
                          type="button"
                          data-toggle="dropdown"
                          aria-haspopup="true"
                          aria-expanded="false"
                        >
                          <i className="fas fa-bars"></i>
                        </button>
                        <div className="dropdown-menu dropdown-menu-right">
                            <a
                              href={`/reports/${accion.id}/edit`}
                              className="dropdown-item"
                            >
                              Editar
                            </a>

                            <button
                              onClick={() => this.delete(accion.id)}
                              className="dropdown-item"
                            >
                              Eliminar
                            </button>

                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{accion.code_report}</td>
                  <td>{accion.cost_center.code}</td>
                  <td>{accion.report_date}</td>
                  <td>{accion.report_execute.name}</td>
                  <td>{accion.working_time}</td>
                  <td>{accion.work_description}</td>
                  <td><NumberFormat value={accion.viatic_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                  <td>{accion.viatic_description}</td>
                  <td><NumberFormat value={accion.total_value} displayType={"text"} thousandSeparator={true} prefix={"$"}/></td>
                  <td>{accion.report_sate ? "Aprobado" : "Sin Aprobar"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center">
                  <div className="text-center mt-4 mb-4">
                    <h4>No hay registros</h4>
                        <a href="/reports/new" className="btn btn-secondary" >Nuevo Reporte</a>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        </div>
      </React.Fragment>
    );
  }
}

export default table;
