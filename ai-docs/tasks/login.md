# Login - Modernización UI

## Resumen
Rediseño completo de las vistas de autenticación (login, recuperar contraseña, cambiar contraseña) con un estilo glassmorphism moderno.

## Archivos modificados

### Vistas
- `app/views/devise/sessions/new.html.erb` — Login principal
- `app/views/devise/passwords/new.html.erb` — Solicitar recuperación de contraseña
- `app/views/devise/passwords/edit.html.erb` — Cambiar contraseña

### Estilos
- `app/assets/stylesheets/login.css` — **Nuevo archivo** con todos los estilos del login

### Layout
- `app/views/layouts/application.html.erb` — Se agregó Google Fonts (Poppins) en el `<head>`

## Qué se hizo

1. **Fondo fullscreen**: Imagen industrial de Controlmatica (`beewo.s3.amazonaws.com/...`) cubriendo toda la pantalla con overlay oscuro semi-transparente.

2. **Card con glassmorphism**: Tarjeta centrada con fondo translúcido, `backdrop-filter: blur(20px)`, bordes suaves y sombra.

3. **Elementos del login**:
   - Logo de Controlmatica (90px)
   - Título "Iniciar Sesión"
   - Campo Email
   - Campo Contraseña
   - Botón "Ingresar" con gradiente dorado/naranja
   - Link "Olvidó su contraseña? Click aquí"

4. **Alertas integradas**: Se agregó soporte para mostrar mensajes de error y avisos de Devise directamente dentro del card de login. Antes no se veían los errores cuando las credenciales eran incorrectas o el email estaba vacío. Ahora se muestran con estilo glass integrado:
   - **Errores** (`alert`): Fondo rojo translúcido con texto rojo claro (ej: "Email o contraseña inválidos")
   - **Avisos** (`notice`): Fondo amarillo translúcido con texto dorado (ej: "Sesión expirada")

5. **Fuente Poppins**: Se cargó desde Google Fonts directamente en el `<head>` del layout para asegurar consistencia con el resto de la app. Se forzó con `!important` en los elementos del login.

6. **Recuperar contraseña** (`passwords/new`): Mismo estilo glass con campo Email, botón "Enviar" y link "Volver al inicio".

7. **Cambiar contraseña** (`passwords/edit`): Mismo estilo glass con campos nueva contraseña y confirmación, botón "Actualizar" y link "Volver al inicio".

8. **Responsive**: El card se adapta a pantallas pequeñas (90% width en móvil).

## Diseño de referencia
- Estilo inspirado en login glassmorphism centrado (similar a SaleSkip pero con card central en vez de split-screen)
- Imagen de fondo: planta industrial de automatización
- Paleta: azul oscuro overlay, dorado/naranja para acciones, blanco para texto
