// Deja la app lista para correr E2E: BD de test, packs compilados y seed.
//
// Se usa de dos formas:
//   - a mano:            npm run prepare:app
//   - desde playwright:  global-setup.js lo importa y llama a prepare()
//
// El paso caro es el webpack. Se salta cuando ya hay un manifest mas reciente
// que el archivo mas nuevo de app/javascript: es la diferencia entre segundos y
// minutos por corrida.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { RAILS_ROOT } = require("../support/env");

const MANIFEST = path.join(RAILS_ROOT, "public", "packs-test", "manifest.json");
const JS_ROOT = path.join(RAILS_ROOT, "app", "javascript");

function run(cmd, args, extraEnv = {}) {
  execFileSync(cmd, args, {
    cwd: RAILS_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      RAILS_ENV: "test",
      // PWD apunta a test/e2e cuando esto lo lanza npm, y Spring hace chdir a
      // ENV["PWD"] en el servidor precargado: `bin/rails runner db/seeds/e2e.rb`
      // no encontraba el archivo y Rails lo interpretaba como CODIGO
      // ("undefined local variable or method `db'"). Se corrige aqui y ademas
      // el seed se pasa por ruta absoluta.
      PWD: RAILS_ROOT,
      ...extraEnv,
    },
  });
}

// mtime del archivo mas reciente bajo app/javascript/
function newestJsMtime(dir = JS_ROOT) {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestJsMtime(full));
    } else {
      newest = Math.max(newest, fs.statSync(full).mtimeMs);
    }
  }
  return newest;
}

function packsAreFresh() {
  if (!fs.existsSync(MANIFEST)) return false;

  // Un manifest vacio es peor que no tener manifest: Rails levanta y falla al
  // renderizar la vista, con un error que no menciona a webpack.
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    if (Object.keys(manifest).length === 0) return false;
  } catch (e) {
    return false;
  }

  return fs.statSync(MANIFEST).mtimeMs > newestJsMtime();
}

function prepare({ skipDb = false } = {}) {
  if (skipDb) {
    console.log("[prepare] 1/3 db:test:prepare SALTADO");
  } else {
    // OJO: db:test:prepare hace db:test:purge, que hace DROP DATABASE. Si el
    // server de test ya esta arriba, Postgres responde
    // "database is being accessed by other users" y aborta. Por eso este paso
    // corre ANTES de levantar el server, desde webServer.command.
    console.log("[prepare] 1/3 db:test:prepare");
    run("bin/rails", ["db:test:prepare"]);
  }

  if (process.env.SKIP_WEBPACK === "1") {
    // TRAMPA: usar SKIP_WEBPACK despues de tocar app/javascript hace que el E2E
    // corra contra packs viejos y falle, o peor, PASE contra codigo que ya no
    // existe. Solo si `git diff --name-only` no toca app/javascript/.
    console.log("[prepare] 2/3 webpack SALTADO por SKIP_WEBPACK=1");
  } else if (packsAreFresh()) {
    console.log("[prepare] 2/3 webpack saltado: packs-test mas nuevo que app/javascript");
  } else {
    console.log("[prepare] 2/3 bin/webpack (paso lento: 1-3 min la primera vez)");
    const inicio = Date.now();
    run("bin/webpack", [], {
      NODE_ENV: "development",
      // Webpack 3.5 usa md4, que OpenSSL 3 (Node 17+) ya no expone. Sin esto el
      // build muere con ERR_OSSL_EVP_UNSUPPORTED.
      NODE_OPTIONS: `--openssl-legacy-provider ${process.env.NODE_OPTIONS || ""}`.trim(),
    });
    console.log(`[prepare]     webpack tardo ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
  }

  console.log("[prepare] 3/3 seed E2E");
  run("bin/rails", ["runner", path.join(RAILS_ROOT, "db", "seeds", "e2e.rb")]);
}

module.exports = { prepare };

if (require.main === module) {
  prepare({ skipDb: process.env.E2E_SKIP_DB === "1" });
}
