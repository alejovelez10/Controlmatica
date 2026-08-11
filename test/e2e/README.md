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
- Los specs funcionales son del **paquete 12**. Aqui solo vive `smoke.spec.js`.
