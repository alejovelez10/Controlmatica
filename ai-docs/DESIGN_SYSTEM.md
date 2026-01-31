# Sistema de Diseño - Controlmatica

## Stack Frontend
- **Framework CSS:** Bootstrap 4.3 (gem) — se mantiene
- **Componentes React:** Reactstrap 8.9 — se mantiene
- **React:** 16.14 (class components) — se mantiene
- **Bundler:** Webpacker 3.5 — se mantiene
- **Tipografía:** Poppins (Google Fonts)
- **Iconos:** FontAwesome (ya incluido)

## Paleta de Colores

### Colores Primarios
| Variable CSS | Hex | Uso |
|---|---|---|
| `--cm-primary` | `#2a3f53` | Sidebar, headers, botones principales |
| `--cm-primary-dark` | `#1e2d3d` | Hover de primario, fondos oscuros |
| `--cm-primary-light` | `#3a5570` | Bordes activos, acentos suaves |
| `--cm-accent` | `#f5a623` | Botones de acción, highlights, CTA |
| `--cm-accent-light` | `#f7c948` | Hover de accent |

### Colores de Estado
| Variable CSS | Hex | Uso |
|---|---|---|
| `--cm-success` | `#28a745` | Éxito, activo, aprobado |
| `--cm-danger` | `#dc3545` | Error, eliminar, rechazado |
| `--cm-warning` | `#ffc107` | Advertencia, pendiente |
| `--cm-info` | `#17a2b8` | Información, enlace |

### Colores Neutros
| Variable CSS | Hex | Uso |
|---|---|---|
| `--cm-bg` | `#f5f6fa` | Fondo general de la app |
| `--cm-bg-card` | `#ffffff` | Fondo de cards y modales |
| `--cm-border` | `#e2e5ea` | Bordes de inputs, cards, tablas |
| `--cm-text` | `#212529` | Texto principal |
| `--cm-text-muted` | `#6c757d` | Texto secundario |
| `--cm-text-light` | `#9ca3af` | Placeholders |

## Tipografía

| Elemento | Font | Peso | Tamaño |
|---|---|---|---|
| Body | Poppins | 400 | 14px (0.875rem) |
| H1 - Títulos de página | Poppins | 700 | 24px |
| H2 - Títulos de sección | Poppins | 600 | 20px |
| H3 - Subtítulos | Poppins | 600 | 16px |
| Labels | Poppins | 500 | 13px |
| Small / Caption | Poppins | 400 | 12px |

## Componentes Base

### 1. Botones
- **Primario:** Fondo `--cm-primary`, texto blanco, border-radius 6px
- **Accent/CTA:** Gradiente `--cm-accent` → `--cm-accent-light`, texto `--cm-primary`
- **Outline:** Borde `--cm-primary`, fondo transparente
- **Danger:** Fondo `--cm-danger`, texto blanco
- **Tamaños:** sm (padding 6px 12px), md (padding 8px 16px), lg (padding 10px 20px)

### 2. Inputs
- Padding: 10px 14px
- Border: 1px solid `--cm-border`
- Border-radius: 6px
- Focus: borde `--cm-primary`, box-shadow 0 0 0 3px rgba(42,63,83,0.1)
- Placeholder: color `--cm-text-light`

### 3. Cards
- Background: `--cm-bg-card`
- Border: 1px solid `--cm-border`
- Border-radius: 10px
- Box-shadow: 0 2px 8px rgba(0,0,0,0.06)
- Padding: 20px

### 4. Tablas
- Header: fondo `--cm-primary`, texto blanco, font-weight 600
- Filas: fondo blanco, hover `--cm-bg`
- Bordes: 1px solid `--cm-border`
- Padding celdas: 10px 14px
- Border-radius en contenedor: 8px

### 5. Modales (Reactstrap)
- Border-radius: 12px
- Header: fondo `--cm-primary`, texto blanco
- Body: padding 24px
- Footer: borde top `--cm-border`

### 6. Alertas
- Border-radius: 8px
- Padding: 12px 16px
- Variantes: success, danger, warning, info (colores de estado)

### 7. Badges / Tags
- Border-radius: 50px (pill)
- Padding: 4px 10px
- Font-size: 11px, font-weight: 600

## Espaciado
Se usa el sistema de espaciado de Bootstrap:
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px

## Border Radius
- Inputs/Botones: 6px
- Cards: 10px
- Modales: 12px
- Badges: 50px (pill)

## Sombras
- `--cm-shadow-sm`: 0 1px 3px rgba(0,0,0,0.08)
- `--cm-shadow`: 0 2px 8px rgba(0,0,0,0.06)
- `--cm-shadow-lg`: 0 4px 16px rgba(0,0,0,0.1)
