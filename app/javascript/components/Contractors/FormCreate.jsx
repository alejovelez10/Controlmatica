import React from "react";
import Select from "react-select";
import NumberFormat from "react-number-format";
import { CmModal, CmButton } from "../../generalcomponents/ui";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    background: "#fcfcfd",
    borderColor: state.isFocused ? "#f5a623" : "#e2e5ea",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(245, 166, 35, 0.15)" : "none",
    "&:hover": { borderColor: "#f5a623" },
    borderRadius: "8px",
    padding: "2px 4px",
    fontSize: "14px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "#f5a623" : state.isFocused ? "#fff3e0" : "#fff",
    color: state.isSelected ? "#fff" : "#333",
    fontSize: "14px",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const styles = {
  modalBody: {
    padding: "0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8f9fa",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconCircle: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f5a623 0%, #f7b731 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(245, 166, 35, 0.3)",
  },
  iconCircleIcon: {
    color: "#fff",
    fontSize: "18px",
  },
  titleContainer: {
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#1a1a2e",
    margin: "0",
  },
  subtitle: {
    fontSize: "12px",
    color: "#6b7280",
    margin: "2px 0 0 0",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "20px",
    color: "#6b7280",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "4px",
    transition: "all 0.2s",
  },
  content: {
    padding: "20px",
    maxHeight: "calc(80vh - 140px)",
    overflowY: "auto",
  },
  formGrid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "400",
    color: "#374151",
    marginBottom: "6px",
  },
  labelIcon: {
    color: "#6b7280",
    fontSize: "13px",
  },
  required: {
    color: "#dc3545",
    fontWeight: "600",
  },
  hint: {
    fontSize: "11px",
    color: "#9ca3af",
    fontWeight: "400",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid #e2e5ea",
    borderRadius: "8px",
    background: "#fcfcfd",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
  },
  inputError: {
    borderColor: "#dc3545",
    boxShadow: "0 0 0 3px rgba(220, 53, 69, 0.15)",
  },
  textarea: {
    resize: "vertical",
    minHeight: "100px",
  },
  alert: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "16px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "16px 20px",
    borderTop: "1px solid #e5e7eb",
    background: "#f8f9fa",
  },
};

class FormCreate extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      costCenterInputValue: "",
      costCenterOptions: [],
      isLoadingCostCenter: false,
    };
    this.debounceTimer = null;
  }

  handleCostCenterInputChange = (inputValue, { action }) => {
    if (action === "input-change") {
      this.setState({ costCenterInputValue: inputValue });

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      if (inputValue.length >= 3) {
        this.setState({ isLoadingCostCenter: true });
        this.debounceTimer = setTimeout(() => {
          fetch("/search_cost_centers?q=" + encodeURIComponent(inputValue))
            .then((response) => response.json())
            .then((data) => {
              this.setState({
                costCenterOptions: data,
                isLoadingCostCenter: false,
              });
            })
            .catch(() => {
              this.setState({ costCenterOptions: [], isLoadingCostCenter: false });
            });
        }, 300);
      } else {
        this.setState({
          costCenterOptions: [],
          isLoadingCostCenter: false,
        });
      }
    }
    return inputValue;
  };

  render() {
    const p = this.props;

    const inputStyle = (hasError) => ({
      ...styles.input,
      ...(hasError ? styles.inputError : {}),
    });

    return (
      <CmModal
        isOpen={p.modal}
        toggle={p.toggle}
        hideHeader={true}
        footer={null}
        size="lg"
      >
        {/* Custom Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconCircle}>
              <i className="fas fa-tools" style={styles.iconCircleIcon} />
            </div>
            <div style={styles.titleContainer}>
              <h5 style={styles.title}>{p.titulo}</h5>
              <p style={styles.subtitle}>Complete los datos del registro tablerista</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={p.toggle}>
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content} className="cm-modal-scroll">
          {p.errorValues === false && (
            <div style={styles.alert}>
              <i className="fas fa-exclamation-circle" />
              <span>Debes completar todos los campos requeridos</span>
            </div>
          )}

          <div style={styles.formGrid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="fas fa-calendar-alt" style={styles.labelIcon} /> Fecha{" "}
                <span style={styles.required}>*</span>
              </label>
              <input
                type="date"
                name="sales_date"
                value={p.formValues.sales_date}
                onChange={p.onChangeForm}
                style={inputStyle(p.errorValues === false && p.formValues.sales_date === "")}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="fas fa-clock" style={styles.labelIcon} /> Horas trabajadas{" "}
                <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="hours"
                value={p.formValues.hours}
                onChange={p.onChangeForm}
                style={inputStyle(p.errorValues === false && p.formValues.hours === "")}
                placeholder="Horas trabajadas"
              />
            </div>
          </div>

          <div style={styles.formGrid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <i className="fas fa-user" style={styles.labelIcon} /> Realizado por{" "}
                <span style={styles.required}>*</span>
              </label>
              <Select
                onChange={p.onChangeAutocompleteUsers}
                options={p.users}
                autoFocus={false}
                value={p.formAutocompleteUsers}
                placeholder="Realizado por"
                styles={{
                  ...selectStyles,
                  control: (base, state) => ({
                    ...selectStyles.control(base, state),
                    ...(p.errorValues === false && p.formValues.user_execute_id === ""
                      ? { borderColor: "#dc3545", boxShadow: "0 0 0 3px rgba(220, 53, 69, 0.15)" }
                      : {}),
                  }),
                }}
                menuPortalTarget={document.body}
              />
            </div>

            {/* Centro de costo - Solo mostrar si NO viene con cost_center_id predefinido */}
            {!p.cost_center_id && (
              <div style={styles.formGroup}>
                <input
                  type="hidden"
                  name="cost_center_id"
                  value={p.formAutocompleteCentro ? p.formAutocompleteCentro.value : ""}
                />
                <label style={styles.label}>
                  <i className="fas fa-building" style={styles.labelIcon} /> Centro de costo{" "}
                  <span style={styles.hint}>(escribe al menos 3 letras)</span>{" "}
                  <span style={styles.required}>*</span>
                </label>
                <Select
                  onChange={p.onChangeAutocompleteCentro}
                  onInputChange={this.handleCostCenterInputChange}
                  options={this.state.costCenterOptions}
                  isLoading={this.state.isLoadingCostCenter}
                  autoFocus={false}
                  value={p.formAutocompleteCentro}
                  placeholder="Centro de costos"
                  styles={{
                    ...selectStyles,
                    control: (base, state) => ({
                      ...selectStyles.control(base, state),
                      ...(p.errorValues === false && p.formValues.cost_center_id === ""
                        ? { borderColor: "#dc3545", boxShadow: "0 0 0 3px rgba(220, 53, 69, 0.15)" }
                        : {}),
                    }),
                  }}
                  menuPortalTarget={document.body}
                  noOptionsMessage={() =>
                    this.state.costCenterInputValue.length < 3
                      ? "Escribe al menos 3 letras para buscar"
                      : "No se encontraron resultados"
                  }
                />
              </div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <i className="fas fa-dollar-sign" style={styles.labelIcon} /> Monto
            </label>
            <NumberFormat
              name="ammount"
              value={p.formValues.ammount}
              thousandSeparator={true}
              prefix="$"
              style={styles.input}
              placeholder="$0"
              onValueChange={(values) => {
                const ev = { target: { name: "ammount", value: values.formattedValue } };
                p.onChangeForm(ev);
              }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <i className="fas fa-align-left" style={styles.labelIcon} /> Descripcion{" "}
              <span style={styles.required}>*</span>
            </label>
            <textarea
              name="description"
              style={{
                ...styles.input,
                ...styles.textarea,
                ...(p.errorValues === false && p.formValues.description === "" ? styles.inputError : {}),
              }}
              value={p.formValues.description}
              onChange={p.onChangeForm}
              placeholder="Descripcion..."
              rows="4"
            />
          </div>

        </div>

        {/* Custom Footer */}
        <div style={styles.footer}>
          <CmButton variant="outline" onClick={p.toggle}>
            <i className="fas fa-times" /> Cancelar
          </CmButton>
          <CmButton variant="accent" onClick={p.submit} disabled={p.isLoading}>
            {p.isLoading ? (
              <span>
                <i className="fas fa-spinner fa-spin" /> Guardando...
              </span>
            ) : (
              <span>
                <i className="fas fa-save" /> {p.nameSubmit}
              </span>
            )}
          </CmButton>
        </div>
      </CmModal>
    );
  }
}

export default FormCreate;
