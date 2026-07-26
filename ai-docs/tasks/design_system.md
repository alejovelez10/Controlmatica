# Tarea 0.1 - Sistema de Diseño y Stack Frontend

## Decisión
Se mantiene el stack actual: **Bootstrap 4 (gem) + Reactstrap 8.9 + React 16 + Webpacker 3.5**. No se migra a Bootstrap 5 ni Tailwind para minimizar riesgo y esfuerzo.

## Archivos creados

### Documentación
- `ai-docs/DESIGN_SYSTEM.md` — Documento completo del sistema de diseño (paleta, tipografía, componentes, espaciado)

### CSS
- `app/assets/stylesheets/design_system.css` — Variables CSS custom (`--cm-*`) y estilos base para botones, inputs, cards, tablas, modales, alertas y badges

### Componentes React (class components)
Ubicación: `app/javascript/generalcomponents/ui/`

| Componente | Archivo | Props principales |
|---|---|---|
| `CmButton` | `CmButton.jsx` | `variant`, `size`, `icon`, `children` |
| `CmInput` | `CmInput.jsx` | `label`, `error`, + attrs de input |
| `CmCard` | `CmCard.jsx` | `title`, `actions`, `children` |
| `CmTable` | `CmTable.jsx` | `columns`, `data`, `actions` |
| `CmModal` | `CmModal.jsx` | `isOpen`, `toggle`, `title`, `size`, `footer` |
| `CmAlert` | `CmAlert.jsx` | `variant`, `children` |
| `CmBadge` | `CmBadge.jsx` | `variant`, `children` |
| `index.js` | `index.js` | Barrel export de todos los componentes |

## Uso
```jsx
import { CmButton, CmInput, CmCard, CmTable, CmModal, CmAlert, CmBadge } from "../../generalcomponents/ui";

// Botón
<CmButton variant="primary" icon="fa fa-plus">Crear</CmButton>
<CmButton variant="danger" size="sm">Eliminar</CmButton>

// Input
<CmInput label="Email" placeholder="correo@ejemplo.com" error="Campo requerido" />

// Card
<CmCard title="Usuarios" actions={<CmButton variant="accent">Nuevo</CmButton>}>
  contenido...
</CmCard>

// Tabla
<CmTable
  columns={[{ key: "name", label: "Nombre" }, { key: "email", label: "Email" }]}
  data={[{ id: 1, name: "Juan", email: "juan@test.com" }]}
  actions={(row) => <CmButton variant="outline" size="sm">Editar</CmButton>}
/>

// Modal (usa Reactstrap internamente)
<CmModal isOpen={this.state.modal} toggle={this.toggle} title="Crear Usuario">
  formulario...
</CmModal>

// Alerta
<CmAlert variant="success">Registro guardado exitosamente</CmAlert>

// Badge
<CmBadge variant="success">Activo</CmBadge>
```

## Paleta de colores definida
- **Primario:** `#2a3f53` (sidebar/headers actual)
- **Accent:** `#f5a623` (dorado, para CTAs)
- **Neutros:** `#f5f6fa` (fondo), `#e2e5ea` (bordes), `#212529` (texto)
- **Estados:** Bootstrap estándar (success, danger, warning, info)

## Convenciones
- Todas las clases CSS del design system usan prefijo `cm-`
- Componentes React usan prefijo `Cm`
- Class components (consistente con el código existente)
- Los componentes son wrappers ligeros — no reemplazan Bootstrap/Reactstrap, lo complementan
