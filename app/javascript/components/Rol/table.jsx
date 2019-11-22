import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormCreate from "../Rol/formCreate";

class table extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      title: "Nuevo rol",
      modal: false,
      backdrop: "static",
      modeEdit: false,
      action: {},
      form: {
        name: "",
        description: "",
        short_name: "",
        user_id: this.props.usuario.id,
        accion_module_ids: []
      },
      checkedItems: new Map(),
      checkboxes: [],
      modules:[]
    };
    this.handleChange = this.handleChange.bind(this);
    this.toggle = this.toggle.bind(this);
  }

  handleChangeAccions = e => {
    const item = e.target.value;
    const isChecked = e.target.checked;
    this.setState(prevState => ({
      checkedItems: prevState.checkedItems.set(item, isChecked)
    }));

  };

  closeModal() {
    this.setState({ 
      modalIsOpen: false,
      checkedItems: new Map() 
    });
  
  }

  openModal(name) {
    if (name == "edit") {
      this.setState({
        modeEdit: false
      });
    } else {

      this.setState({
        title: "Nuevo rol",
        modeEdit: false,
        form: {
          name: "",
          description: "",
          short_name: "",
          user_id: this.props.usuario.id,
          accion_module_ids: []
        }
      });
    }

    this.setState({
      modalIsOpen: true
    });
  }

  MessageSucces = name_success => {
    Swal.fire({
      position: "center",
      type: "success",
      title: name_success,
      showConfirmButton: false,
      timer: 1500
    });
  };

  handleSubmit = e => {
    e.preventDefault();
  };

  handleChange = e => {
    this.setState({
      form: {
        ...this.state.form,
        [e.target.name]: e.target.value
      }
    });
  };

  HandleClick = e => {
    if (this.state.modeEdit == true) {

      let accion_module_ids = [];
      this.state.checkedItems.forEach((value, key) => {
        if (value == true) {
          accion_module_ids.push(key);
        }
      });
      let form = {};
      form = this.state.form
      form.accion_module_ids = accion_module_ids;


      fetch("/rols/" + this.state.action.id, {
        method: "PATCH", // or 'PUT'
        body: JSON.stringify(form), // data can be `string` or {object}!
        headers: {
          "Content-Type": "application/json"
        }
      })
        .then(res => res.json())
        .catch(error => console.error("Error:", error))
        .then(response => {
          this.props.loadInfo();
          this.MessageSucces(response.message);

          this.setState({
            modal: false,
            form: {
              name: "",
              short_name: "",
              description: ""
            }
          });
        });


    } else {

       
    let accion_module_ids = [];
    this.state.checkedItems.forEach((value, key) => {
      if (value == true) {
        accion_module_ids.push(key);
      }
    });
    let form = {};
    form = this.state.form
    form.accion_module_ids = accion_module_ids;

      fetch("/rols", {
        method: "POST", // or 'PUT'
        body: JSON.stringify(form), // data can be `string` or {object}!
        headers: {
          "Content-Type": "application/json"
        }
      })
        .then(res => res.json())
        .catch(error => console.error("Error:", error))
        .then(data => {
          this.props.loadInfo();

          this.MessageSucces("¡El Registro fue creado con exito!");

          this.setState({
            modal: false,
            form: {
              name: "",
              description: "",
              short_name: "",
              user_id: this.props.usuario.id
              
              
            },
            checkedItems: new Map()
          });
        });
    }
  };

  edit = accion_register => {
    if(this.state.modeEdit === true){
      this.setState({modeEdit: false})
    }else{
      this.setState({modeEdit: true})
    }

    this.toggle("edit")
  

      fetch("/get_accions")
      .then(response => response.json())
      .then(data => {
       
        
        let map = new Map();
        data[1].forEach(element=>{
      
        accion_register.accion_modules.forEach(element_accion => {
            if (element.id == element_accion.id)
            {
             map.set(element_accion.id.toString(),true)
            }
           
  
        });
  
      })


        this.setState({
          checkboxes: data[1],
          modules: data[0],
          checkedItems: map
        });
        
      });
  
    
      this.setState(prevState =>({
        action: accion_register,
        title: "Editando al rol " + accion_register.name,
        form: {
          name: accion_register.name,
          short_name: accion_register.short_name,
          description: accion_register.description
        },
        
       
      }));
 

  };

  toggle(from) {
    
    if(from == "edit"){
      console.log("edidididididdidididididi")
      this.setState({
        modeEdit: true
      })
      
    }else if(from == "new"){
      console.log("enwnewnenwenwenwnewnenwenw")
      this.setState({
        modeEdit: false ,
        title: "Nuevo rol",
        form: {
          name: "",
          short_name: "",
          description: ""
        },

        checkedItems: new Map(),
        checkboxes: []
      })

    }else{
      if(this.state.modeEdit === true){
        this.setState({
          modeEdit: false,
          checkedItems: new Map(),
          checkboxes: []
        })
        
      }else{
        this.setState({modeEdit: true})
      }

    }

    this.setState(prevState => ({
      modal: !prevState.modal
    }));

    fetch("/get_accions")
    .then(response => response.json())
    .then(data => {
      this.setState({
        checkboxes: data[1],
        modules:data[0],
      });
      
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
        fetch("/rols/" + id, {
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
        <FormCreate
          loadDataTable={this.props.loadDataTable}

          toggle={this.toggle}
          backdrop={this.state.backdrop}
          modal={this.state.modal}


          onChangeForm={this.handleChange}
          formValues={this.state.form}
          submit={this.HandleClick}
          FormSubmit={this.handleSubmit}
          titulo={this.state.title}
          nameSubmit={this.state.modeEdit == true ? "Actualizar" : "Crear"}
          checkedItems={this.state.checkedItems}
          handleChangeAccions={this.handleChangeAccions}
          checkboxes={this.state.checkboxes}
          modules={this.state.modules}
          estados={this.props.estados}

        />

        <div className="col-md-12 p-0 mb-4">
            <button className="btn btn-secondary float-right" onClick={() => this.toggle("new")}>Nuevo rol</button>
        </div>

        <br />
        <br />

        <div className="content">

        <table className="table table-hover table-bordered" id="sampleTable">
          <thead>
            <tr className="tr-title">
              <th>Nombre</th>
              <th>Descripcion</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {this.props.dataActions.length >= 1 ? (
              this.props.dataActions.map(accion => (
                <tr key={accion.id}>
                  <td>{accion.name}</td>
                  <td>{accion.description}</td>

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

                            <button
                              onClick={() => this.edit(accion)}
                              className="dropdown-item"
                            >
                              Editar
                            </button>


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
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center">
                  <div className="text-center mt-4 mb-4">
                    <h4>No hay registros</h4>
                        <button className="btn btn-secondary mt-3" onClick={() => this.toggle("new")}>Nuevo rol</button>
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
