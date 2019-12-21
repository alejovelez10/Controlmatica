import React from "react";
import SweetAlert from "sweetalert2-react";
import Swal from "sweetalert2/dist/sweetalert2.js";
import FormUser from "../Users/FormCreate";


class Table extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: {},
      title: "Nuevo usuario",
      modal: false,
      backdrop: "static",
      modeEdit: false,
      passwor: true,
      password_confir: true,

      form: {
        names: "",
        email: "",
        avatar: {},
        number_document: "",
        document_type: "",
        password: "",
        password_confirmation: "",
        rol_id: ""
      },

      ErrorValues: true,

      selectedOption: {
        rol_id: "",
        label: "Selecionar"
      },

      roles: []
    };
    this.toggle = this.toggle.bind(this);
  }

  handleFileUpload = e => {
    this.setState({
      avatar: e.target.files[0]
    });
  };

  passwordConfirmationValidate = () => {
    var regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/

    if (regex.test(this.state.form.password_confirmation)){
      console.log("el campo de confirmacion de contraseña es correcto" + this.state.form.password_confirmation)   
      this.setState({password_confir: true})
    }else{
      console.log("el campo de confirmacion de contraseña no es correcto" + this.state.form.password_confirmation)
      this.setState({password_confir: false})
    }         
  

  }

  validatePasswords () {
    if (this.state.form.password == this.state.form.password_confirmation) {
      console.log("trueeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee pass")
      return true
    }else{
      console.log("falseeeeeee pass")
      return false
    }
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
        fetch("/user/" + id, {
          method: "delete"
        })
          .then(response => response.json())
          .then(response => {
            this.props.loadDataTable();

            Swal.fire(
              "Borrado!",
              "¡El registro fue eliminado con exito!",
              "success"
            );
          });
      }
    });
  };

  componentDidMount(){

    let array = []

    this.props.rols.map((item) => (
      array.push({label: item.name, value: item.id})
    ))

    this.setState({
      roles: array
    })

  }

  edit = user => {
    console.log(user)
    if(this.state.modeEdit === true){
      this.setState({modeEdit: false})
    }else{
      this.setState({modeEdit: true})
    }

    this.toggle("edit")
    
    this.setState({

      user: user,
      title: "Editar a " + user.email,
      form: {
        names: user.names,
        email: user.email,
        avatar: user.avatar.url,
        number_document: user.number_document,
        document_type: user.document_type,
        password: "",
        password_confirmation: "",
        rol_id: user.rol_id
      },

      selectedOption: {
        label: `${user.rol != undefined ? user.rol.name : "Sin rol"}`,
        value: user.rol != undefined ? user.rol.id : ""
      }


    });
  };

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
    if (e.target.name == "password") {
      var regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/
      //(?=.*[@$!%*_?&])
      if (regex.test(e.target.value)){
        console.log("el campo de contraseña es correcto" + e.target.value)   
        this.setState({passwor: true})
      }else{
        console.log("el campo de contraseña no es correcto" + e.target.value)
        this.setState({passwor: false})
      }  
    }


    if (e.target.name == "password_confirmation") {
      this.validatePasswords()
    }

    

    

    this.setState({
      form: {
        ...this.state.form,
        [e.target.name]: e.target.value
      }
    });
  };

  validationForm = () => {
    if (this.state.form.name != "" &&  
        this.state.form.email != "" && 
        this.state.form.phone != "" && 
        this.state.form.state != "" && 
        this.state.form.number_document != "" && 
        this.state.form.rol_id != "" 

        ) {
    console.log("los campos estan llenos")
      this.setState({ ErrorValues: true })
      return true
    }else{
      console.log("los campos no se han llenado")
      this.setState({ ErrorValues: false })
      return false
      
    }
  }

  HandleClick = e => {
    if (this.validationForm() == true && this.validatePasswords() == true) {
    const formData = new FormData();
    formData.append("avatar", this.state.avatar);
    formData.append("names", this.state.form.names);
    formData.append("email", this.state.form.email);
    formData.append("number_document", this.state.form.number_document);
    formData.append("document_type", this.state.form.document_type);
    formData.append("rol_id", this.state.form.rol_id);
    formData.append("password", this.state.form.password);
    formData.append(
      "password_confirmation",
      this.state.form.password_confirmation
    );

    if (this.state.modeEdit == true) {
      fetch("/update_user/" + this.state.user.id, {
        method: "PATCH", // or 'PUT'
        body: formData, // data can be `string` or {object}!
        headers: {}
      })
        .then(res => res.json())
        .catch(error => console.error("Error:", error))
        .then(response => {
          this.props.loadDataTable();
          this.MessageSucces("¡El Registro fue actualizado con exito!");

          this.setState({
            user: {},
            modal: false,
            form: {
              names: "",
              email: "",
              avatar: {},
              number_document: "",
              document_type: "",
              password: "",
              password_confirmation: "",
              rol_id: ""
            },

            selectedOption: {
              rol_id: "",
              label: "Selecionar"
            },

          });
        });
    } else {
      fetch("/create_user", {
        method: "POST", // or 'PUT'
        body: formData, // data can be `string` or {object}!
        headers: {}
      })
        .then(res => res.json())
        .catch(error => console.error("Error:", error))
        .then(data => {

          this.props.loadDataTable();

          this.MessageSucces("¡El Registro fue creado con exito!");

          this.setState({
            modal: false,
            passwor: true,

            selectedOption: {
              rol_id: "",
              label: "Selecionar"
            },

            form: {
              names: "",
              email: "",
              avatar: {},
              number_document: "",
              document_type: "",
              password: "",
              password_confirmation: "",
              rol_id: ""
            },
          });
        });
    }

  }
  };

  toggle(from) {
    if(from == "edit"){
      this.setState({modeEdit: true})
      
    }else if(from == "new"){

      this.setState({
        modeEdit: false ,
        title: "Nuevo usuario",
        form: {
          names: "",
          email: "",
          avatar: {},
          number_document: "",
          document_type: "",
          password: "",
          password_confirmation: "",
          rol_id: ""
        },

        selectedOption: {
          rol_id: "",
          label: "Selecionar"
        },
      })

    }else{
      if(this.state.modeEdit === true){
        this.setState({modeEdit: false})
      }else{
        this.setState({modeEdit: true})
      }

      this.setState({
        user: {},
        ErrorValues: true,
        passwor: true
      })

    }

    this.setState(prevState => ({
      modal: !prevState.modal
    }));
  }


  handleChangeAutocomplete = selectedOption => {
    this.setState({
      selectedOption,
      form: {
        ...this.state.form,
        rol_id: selectedOption.value
      }
    });
  };

  render() {
    return (
      <React.Fragment>
        <div className="col-md-12 pr-0 mb-3">
          <div className="row">
            <div className="col-md-2 text-left pl-0">
                <select
                  id="lang"
                  className="form form-control"
                  onChange={this.props.showFilter}
                >
                  <option value="">Cantidad</option>

                  {
                    this.props.all_users >= 5 &&
                    <option value="5">5</option>
                  }

                  {
                    this.props.all_users >= 10 &&
                    <option value="10">10</option>
                  }

                  {
                    this.props.all_users >= 15 &&
                    <option value="15">15</option>
                  }

                  {
                    this.props.all_users >= 20 &&
                    <option value="20">20</option>
                  }

                  {
                    this.props.all_users >= 25 &&
                    <option value="25">25</option>
                  }

                  {
                    this.props.all_users >= 50 &&
                    <option value="50">50</option>
                  }

                  {
                    this.props.all_users >= 100 &&
                    <option value="100">100</option>
                  }
                  
                </select>
            </div>
 
              <FormUser

                toggle={this.toggle}
                backdrop={this.state.backdrop}
                modal={this.state.modal}

                onChangeForm={this.handleChange}
                formValues={this.state.form}
                submit={this.HandleClick}
                FormSubmit={this.handleSubmit}

                titulo={this.state.title}
                nameSubmit={this.state.modeEdit == true ? "Actualizar" : "Crear"}



                loadDataTable={this.props.loadDataTable}
                handleFileUpload={this.handleFileUpload}
                editState={this.state.modeEdit}
                formAutocomplete={this.state.selectedOption}
                roles={this.state.roles}
                onChangeAutocomplete={this.handleChangeAutocomplete}
                errorValues={this.state.ErrorValues}
                onBlurPasswordConfirmation={this.passwordConfirmationValidate}

                passworState={this.state.passwor}
                passworConfirmationState={this.validatePasswords()}

              />

            <div className="col-md-10 text-right btn-search">
              {this.props.estados.create == true && (
                <button className="btn btn-secondary" color="danger" onClick={() => this.toggle("new")}>Nuevo usuario</button>
              )}
            </div>
          </div>
        </div>

        <div className="content">

        <table className="table table-hover table-bordered" id="sampleTable">
          <thead>
            <tr>
              <th className="text-center">Avatar</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Tipo de documento</th>
              <th>Documento</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {this.props.dataUsers.length >= 1 ? (
              this.props.dataUsers.map(user => (
                <tr key={user.id}>
                  <td className="text-center">
                    <img className="img-user" src={user.avatar.url != undefined ? user.avatar.url : "https://dnuba.s3.amazonaws.com/uploads/bank_image/achivo/44/user.jpeg"} alt=""/>
                  </td>

                  <td>{user.names}</td>
                  <td>{user.email}</td>
                  <td>{user.rol != undefined ? user.rol.name : "Sin rol"}</td>
                  <td>
                    {user.document_type}
                  </td>
                  <td>{user.number_document}</td>

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
                            <button
                              onClick={() => this.edit(user)}
                              className="dropdown-item"
                            >
                              Editar
                            </button>
                          )}

                          {this.props.estados.edit == true && (

                            <button
                              onClick={() => this.delete(user.id)}
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
                  <h4>No hay registros con el criterio de búsqueda</h4>
                  <button
                    onClick={this.props.cancelFilter}
                    className="btn btn-danger mt-4"
                  >
                    Cancelar búsqueda
                  </button>
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

export default Table;




/*asdasdasdasdaasd*/