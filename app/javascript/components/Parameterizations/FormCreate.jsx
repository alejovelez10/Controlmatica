import React from "react";
import { Modal, ModalBody } from "reactstrap";
import NumberFormat from "react-number-format";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <React.Fragment>
        <Modal
          returnFocusAfterClose={true}
          isOpen={this.props.modal}
          className="modal-dialog-centered"
          toggle={this.props.toggle}
          backdrop={this.props.backdrop}
        >
          <ModalBody style={{ padding: 0 }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh"
            }}>
              {/* Header - Provider style with yellow gradient icon */}
              <div style={{
                background: "#fcfcfd",
                padding: "20px 32px",
                borderBottom: "1px solid #e9ecef",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                borderRadius: "4px 4px 0 0"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)"
                  }}>
                    <i className="fas fa-sliders-h" style={{ color: "#fff", fontSize: "20px" }} />
                  </div>
                  <div>
                    <h2 style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}>
                      {this.props.titulo}
                    </h2>
                    <p style={{ margin: 0, fontSize: "12px", color: "#6c757d" }}>
                      Complete los datos de la parametrizacion
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={this.props.toggle}
                  style={{
                    width: "32px",
                    height: "32px",
                    border: "none",
                    background: "#e9ecef",
                    borderRadius: "50%",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6c757d",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "#dc3545"; e.currentTarget.style.color = "#fff"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "#e9ecef"; e.currentTarget.style.color = "#6c757d"; }}
                >
                  <i className="fas fa-times" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={this.props.FormSubmit}>
                <div style={{
                  padding: "24px 32px",
                  flex: 1,
                  overflowY: "auto"
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px"
                  }}>
                    <div>
                      <label style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#6b7280"
                      }}>
                        <i className="fa fa-tag" style={{ color: "#6b7280", fontSize: "12px" }} />
                        Nombre <span style={{ color: "#dc3545", fontWeight: "bold" }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={this.props.formValues.name}
                        onChange={this.props.onChangeForm}
                        autoComplete="off"
                        placeholder="Nombre"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          border: this.props.errorValues === false && this.props.formValues.name === ""
                            ? "1px solid #dc3545"
                            : "1px solid #e2e5ea",
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: this.props.errorValues === false && this.props.formValues.name === ""
                            ? "#fff5f5"
                            : "#fcfcfd",
                          transition: "all 0.2s",
                          outline: "none"
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#6b7280"
                      }}>
                        <i className="fa fa-dollar-sign" style={{ color: "#6b7280", fontSize: "12px" }} />
                        Valor monetario <span style={{ color: "#dc3545", fontWeight: "bold" }}>*</span>
                      </label>
                      <NumberFormat
                        name="money_value"
                        thousandSeparator={true}
                        prefix={"$"}
                        value={this.props.formValues.money_value}
                        onChange={this.props.onChangeForm}
                        placeholder="Valor monetario"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          border: this.props.errorValues === false && this.props.formValues.money_value === ""
                            ? "1px solid #dc3545"
                            : "1px solid #e2e5ea",
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: this.props.errorValues === false && this.props.formValues.money_value === ""
                            ? "#fff5f5"
                            : "#fcfcfd",
                          transition: "all 0.2s",
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  {this.props.errorValues === false && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      marginTop: "20px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                      fontSize: "14px"
                    }}>
                      <i className="fa fa-exclamation-circle" style={{ fontSize: "16px" }} />
                      <span>Debes de completar todos los campos requeridos</span>
                    </div>
                  )}
                </div>

                {/* Footer - Provider style */}
                <div style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  padding: "16px 32px",
                  background: "#fcfcfd",
                  borderTop: "1px solid #e9ecef",
                  flexShrink: 0,
                  borderRadius: "0 0 4px 4px"
                }}>
                  <button
                    type="button"
                    onClick={this.props.toggle}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: 500,
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: "1px solid #dee2e6",
                      background: "#fff",
                      color: "#6c757d"
                    }}
                  >
                    <i className="fa fa-times" /> Cerrar
                  </button>
                  <button
                    type="submit"
                    onClick={this.props.submit}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: 500,
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: "none",
                      background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                      color: "#fff"
                    }}
                  >
                    <i className="fa fa-check" /> {this.props.nameSubmit}
                  </button>
                </div>
              </form>
            </div>
          </ModalBody>
        </Modal>
      </React.Fragment>
    );
  }
}

export default FormCreate;
