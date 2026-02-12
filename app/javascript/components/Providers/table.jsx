import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2";
import NumberFormat from "react-number-format";

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
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#009688",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si"
    }).then(result => {
      if (result.value) {
        fetch("/providers/" + id, {
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


        <div className="content">

        <table className="table table-hover table-bordered" id="sampleTable">
          <thead>
            <tr className="tr-title">
              <th>Nombre</th>
              <th>Telefono</th>
              <th>Dirección</th>
              <th>Nit</th>
              <th>Web</th>
              <th>Email</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {this.props.dataActions.length >= 1 ? (
              this.props.dataActions.map(accion => (
                <tr key={accion.id}>
                  <td>{accion.name}</td>
                  <td>{accion.phone}</td>
                  <td>{accion.address}</td>
                  <td>{accion.nit}</td>
                  <td>{accion.web}</td>
                  <td>{accion.email}</td>


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
                          {this.props.estados.edit == true && (
                            <a
                              href={`/providers/${accion.id}/edit`}
                              className="dropdown-item"
                            >
                              Editar
                            </a>
                          )}

                          {this.props.estados.delete == true && (
                            <button
                              onClick={() => this.delete(accion.id)}
                              className="dropdown-item"
                            >
                              Eliminar
                            </button>
                          )}

                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center">
                  <div className="text-center mt-4 mb-4">
                    <h4>No hay registros</h4>
                      {this.props.estados.create == true && (
                        <a href="/providers/new" className="btn btn-secondary" >Nuevo Proveedor</a>
                      )}
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
