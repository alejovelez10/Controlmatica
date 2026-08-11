// Ids deterministas que exporta db/seeds/e2e.rb. Ningun spec hardcodea un id.
//
// PROHIBIDO MEMOIZAR. Los specs que llaman reseedE2E() en beforeAll obtienen
// ids NUEVOS; una cache de modulo devolveria los viejos y el fallo seria un
// timeout de 15 s sin ninguna pista de la causa.
const fs = require("fs");
const path = require("path");

const FILE = path.resolve(__dirname, "../.auth/seed-ids.json");

function ids() {
  if (!fs.existsSync(FILE)) {
    throw new Error("Falta test/e2e/.auth/seed-ids.json. Corre: npm run prepare:app");
  }
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

const cc = (slug) => ids().cost_centers[slug];
const user = (slug) => ids().users[slug];
const expense = (slug) => ids().expenses[slug];
const budget = (slug) => ids().budgets[slug];

module.exports = { ids, cc, user, expense, budget };
