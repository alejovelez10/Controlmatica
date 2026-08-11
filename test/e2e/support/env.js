// Constantes compartidas por toda la infraestructura E2E. Sin logica.
const path = require("path");

module.exports = {
  BASE_URL: process.env.E2E_BASE_URL || "http://127.0.0.1:3001",
  RAILS_ROOT: path.resolve(__dirname, "../../.."),

  // Credenciales del usuario que siembra db/seeds/e2e.rb. Si se cambian aqui,
  // hay que volver a correr el seed (el paso 4 reasigna la password siempre).
  USER: {
    email: "e2e@controlmatica.test",
    password: "e2e-password-123",
  },

  // Datos deterministas del seed. Cualquier spec que los asierte los lee de aqui,
  // nunca los escribe a mano.
  SEED: {
    costCenterCode: "CM-E2E-01-2026",
    customerName: "CLIENTE E2E S.A.S",
    beneficiario: "Ingeniero E2E",
    invoiceNumbers: ["FE-E2E-001", "FE-E2E-002"],
  },
};
