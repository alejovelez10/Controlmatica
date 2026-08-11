// Solo el seed E2E: ni BD ni webpack. Lo usa support/db.js#reseedE2E() y el
// script npm `seed`.
const { execFileSync } = require("child_process");
const path = require("path");
const { RAILS_ROOT } = require("../support/env");

const SEED_FILE = path.join(RAILS_ROOT, "db", "seeds", "e2e.rb");

function seed({ silent = false } = {}) {
  // Ruta absoluta y PWD forzado: cuando esto lo lanza npm, PWD apunta a
  // test/e2e y el servidor precargado de Spring hace chdir a ENV["PWD"], asi
  // que una ruta relativa no se encuentra y Rails la interpreta como codigo.
  execFileSync("bin/rails", ["runner", SEED_FILE], {
    cwd: RAILS_ROOT,
    stdio: silent ? "pipe" : "inherit",
    env: { ...process.env, RAILS_ENV: "test", PWD: RAILS_ROOT },
  });
}

module.exports = { seed };

if (require.main === module) {
  seed();
}
