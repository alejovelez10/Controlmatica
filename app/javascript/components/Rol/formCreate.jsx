import React from "react";
import { CmModal } from "../../generalcomponents/ui";
import CheckboxContainer from "../Rol/checkbox_container";

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { modal, toggle, backdrop, titulo, formValues, onChangeForm, FormSubmit, submit, nameSubmit, checkedItems, handleChangeAccions, checkboxes, modules } = this.props;

    return (
      <CmModal
        isOpen={modal}
        toggle={toggle}
        size="lg"
        footer={null}
        hideHeader={true}
      >
        <div className="cm-modal-container" style={{
          margin: "-20px -24px -24px -24px",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh"
        }}>
          {/* Header */}
          <div className="cm-modal-header" style={{
            background: "#fcfcfd",
            padding: "20px 32px",
            borderBottom: "1px solid #e9ecef",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0
          }}>
            <div className="cm-modal-header-content" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div className="cm-modal-icon" style={{
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(245, 166, 35, 0.3)"
              }}>
                <i className="fas fa-user-tag" style={{ color: "#fff", fontSize: "20px" }} />
              </div>
              <div className="cm-modal-header-text">
                <h2 className="cm-modal-title" style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: 600, color: "#333" }}>{titulo}</h2>
                <p className="cm-modal-subtitle" style={{ margin: 0, fontSize: "12px", color: "#6c757d" }}>
                  Configure los permisos del rol
                </p>
              </div>
            </div>
            <button
              type="button"
              className="cm-modal-close"
              onClick={toggle}
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

          {/* Form Content - Scrollable */}
          <form onSubmit={FormSubmit}>
            <div className="cm-modal-body-scroll" style={{
              padding: "24px 32px",
              flex: 1,
              overflowY: "auto"
            }}>
              {/* Name Input */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#6b7280"
                }}>
                  <i className="fas fa-tag" style={{ color: "#6b7280", fontSize: "12px" }} />
                  Nombre <span style={{ color: "#dc3545", fontWeight: 600 }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={onChangeForm}
                  autoComplete="off"
                  placeholder="Nombre del rol"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #e2e5ea",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "#fcfcfd",
                    transition: "all 0.2s",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => {
                    e.target.style.background = "#fff";
                    e.target.style.borderColor = "#f5a623";
                    e.target.style.boxShadow = "0 0 0 3px rgba(245, 166, 35, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.background = "#fcfcfd";
                    e.target.style.borderColor = "#e2e5ea";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Permissions Section */}
              <div style={{
                background: "#fcfcfd",
                borderRadius: "12px",
                border: "1px solid #e9ecef",
                overflow: "hidden"
              }}>
                <div style={{
                  background: "#fff",
                  padding: "14px 20px",
                  borderBottom: "1px solid #e9ecef",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(245, 166, 35, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <i className="fas fa-lock" style={{ color: "#f5a623", fontSize: "16px" }} />
                  </div>
                  <span style={{ fontWeight: 600, color: "#374151", fontSize: "16px" }}>
                    Permisos del rol
                  </span>
                </div>
                <div style={{
                  padding: "20px",
                  maxHeight: "400px",
                  overflowY: "auto"
                }}>
                  <CheckboxContainer
                    checkedItems={checkedItems}
                    handleChangeAccions={handleChangeAccions}
                    checkboxes={checkboxes}
                    modules={modules}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="cm-modal-footer" style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              padding: "16px 32px",
              background: "#fcfcfd",
              borderTop: "1px solid #e9ecef",
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={toggle}
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
                <i className="fas fa-times" /> Cancelar
              </button>
              <button
                type="submit"
                onClick={submit}
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
                <i className="fas fa-save" /> {nameSubmit}
              </button>
            </div>
          </form>
        </div>
      </CmModal>
    );
  }
}

export default FormCreate;
