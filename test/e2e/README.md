# E2E con Playwright

```bash
# Primera vez
cd test/e2e
npm install
npm run install:browsers      # descarga chromium (~95 MB), una sola vez

# Uso diario (desde test/e2e)
npm run prepare:app           # db:test:prepare + webpack si hace falta + seed
npm test                      # todos los specs
npm run test:smoke            # solo el smoke, para validar el andamiaje
npm run seed                  # solo re-sembrar la BD de test
SKIP_WEBPACK=1 npm test       # sin recompilar packs (SOLO si no se toco app/javascript)
npm run report                # abre el reporte HTML de la ultima corrida
```

`npm test` levanta solo el server de test en el 3001; no hay que arrancarlo a mano.

## Tiempos reales medidos

| Paso | Tiempo |
|---|---|
| `npm install` | ~3 s |
| `npm run install:browsers` (una vez) | ~40 s, 95 MB |
| `bin/webpack` en frio (packs-test y cache borrados, 29 packs) | **6,2 s** |
| `bin/webpack` saltado por mtime | 0 s |
| `npm run test:smoke` **en frio** (`rm -rf public/packs-test tmp/cache/webpacker`) | **~20 s**, 6 tests |
| `npm run test:smoke` **en tibio** (packs ya compilados) | **~12 s**, 6 tests |

Medidos en esta maquina (M-series, `node_modules` instalado, chromium ya
descargado) con el server de test cayendose y levantandose en cada corrida. La
fila "en frio" incluye los 6,2 s de webpack: son el mismo comando, la diferencia
es solo si `prepare.js` salta la compilacion por mtime.

## Cosas que cuestan horas si no se saben

- **`config.cache_classes = true` en test**: el server NO recarga codigo. Tras
  editar un modelo o un controller hay que **matar el server** (`reuseExistingServer`
  lo reutiliza tal cual) o correr con `CI=1`.
- **`SKIP_WEBPACK=1` despues de tocar `app/javascript/` da falsos verdes**: el
  spec corre contra packs viejos. Usarlo solo si `git diff --name-only` no toca
  esa carpeta.
- **`allow_forgery_protection = false` en test**: un E2E verde **no valida CSRF**.
  Eso se prueba en el nivel de controller.
- **Nunca usar helpers `*_url` de Rails en un spec**: `config/routes.rb` fija
  `default_url_options host: "controlmatica.herokuapp.com"` y apuntarian a
  **produccion**. Siempre rutas relativas sobre `baseURL`.
- **`engines.node: "16.x"` del `package.json` de la raiz** (contrato con Heroku)
  contra el Node 22 de las maquinas de desarrollo: cualquier `yarn <script>`
  aborta con *"The engine node is incompatible with this module"*. Webpacker
  caia ahi porque resolvia el binario con `yarn bin`, cuya salida viene con
  codigos ANSI cuando stdout es una tuberia, y al no encontrar el archivo se iba
  a su plan B `yarn webpack`. Arreglado en `bin/webpack` fijando
  `WEBPACKER_NODE_MODULES_BIN_PATH`. Si vuelve a aparecer ese error, mirar ahi
  antes que nada: el sintoma es un E2E que sale con exit 1 sin correr un test.
- Los specs funcionales son del **paquete 12**. Aqui solo vive `smoke.spec.js`.
