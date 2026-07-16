# Design System de GymNotes

## Estado y alcance

Este documento define la identidad visual de GymNotes y las reglas para sus
futuras migraciones visuales. Los tokens viven en `css/design/tokens.css`, se
cargan desde `index.html` y son consumidos por las capas activas de
`css/design`.

La caché PWA actual es `gym-notes-v1-05`. Su precaché incluye las 17 hojas
activas del Design System y, durante `activate`, el Service Worker elimina
cualquier caché distinta de la versión actual.

## Identidad visual

GymNotes debe sentirse como una libreta de entrenamiento moderna: clara,
práctica, ordenada y con un matiz retro discreto. El lenguaje visual combina un
fondo crema cálido, superficies limpias, bordes oscuros definidos y esquinas
amplias. La jerarquía debe depender de la tipografía, el espacio y el borde,
no de sombras pesadas ni de color excesivo.

La personalidad es técnica y cercana: los títulos, etiquetas funcionales y
temporizadores usan una familia monoespaciada del sistema; el contenido de
lectura conserva una sans-serif del sistema. Los estados usan colores suaves,
legibles y con texto oscuro, sin depender solo del color para comunicar su
significado.

### Principios de consistencia

- Usar tokens antes que valores literales en todo CSS nuevo o migrado.
- Evitar estilos inline; una excepción debe ser puntual, documentada y no
  sustituir una clase o componente reutilizable.
- Evitar `!important`; no debe utilizarse para resolver problemas de alcance o
  especificidad local.
- No modificar estilos globales para resolver un problema exclusivo de una
  pantalla.
- Mantener una responsabilidad clara por archivo: foundations, componente,
  patrón o pantalla.
- Reutilizar primero los componentes existentes o su futura variante oficial;
  no crear variantes visuales sin documentarlas.
- Preservar contraste, tamaño táctil, foco visible, legibilidad y jerarquía
  semántica.
- Respetar `prefers-reduced-motion`: el movimiento no puede ser la única forma
  de comunicar estado.
- Mantener la interfaz útil con texto ampliado, teclado y lectores de pantalla.

### Reglas para futuras pantallas

1. Una pantalla nueva debe usar tokens y componentes comunes antes de crear CSS
   específico.
2. Las reglas específicas deben estar acotadas por el contenedor de pantalla.
3. Toda acción principal debe ser visualmente única; las acciones secundarias y
   destructivas deben conservar la misma jerarquía en toda la aplicación.
4. Los estados vacío, carga, error y éxito deben reutilizar patrones comunes.
5. La navegación inferior se reserva para destinos principales. Es una barra
   estructural fija, de ancho completo y con esquinas superiores redondeadas;
   no debe convertirse en una tarjeta flotante.

## Paleta oficial

| Token conceptual | Valor | Uso |
|---|---:|---|
| Fondo principal | `#F6F0E3` | Fondo general de pantallas. |
| Superficie | `#FFFDF8` | Tarjetas, formularios y modales. |
| Superficie secundaria | `#EEE6D6` | Áreas agrupadas, controles secundarios y fondos sutiles. |
| Texto principal | `#25241E` | Títulos, cuerpo y controles principales. |
| Texto secundario | `#6D685E` | Metadatos, ayudas y contenido auxiliar. |
| Borde principal | `#2B2A24` | Borde oscuro y definido para elementos importantes. |
| Borde tenue | `#CFC6B6` | Separadores y agrupaciones de baja jerarquía. |
| Acento principal | `#B8DF4A` | Acción primaria, selección positiva y navegación activa. |
| Éxito | `#DCECCF` | Fondo de éxito; texto asociado `#315D32`. |
| Advertencia | `#F6E7B6` | Fondo de advertencia; texto asociado `#76570A`. |
| Error | `#F3D8D1` | Fondo de error; texto asociado `#8A3028`. |
| Información | `#DCE9F2` | Fondo informativo; texto asociado `#31536A`. |
| Deshabilitado | `#DDD7CB` | Fondo deshabilitado; texto asociado `#918A7F`. |

Los colores de estado se usarán junto con icono, texto o etiqueta explícita; no
se usarán como único indicador.

## Tipografía

No se añadirán fuentes externas. Las pilas del sistema son la opción oficial
por rendimiento, disponibilidad offline y coherencia PWA.

| Uso | Familia | Tamaño / peso / altura de línea |
|---|---|---|
| Títulos | `ui-monospace`, `SFMono-Regular`, `Consolas`, `Liberation Mono`, monospace | 24–32px, 700, 1.1–1.2 |
| Cuerpo | `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif | 14–16px, 400–500, 1.5 |
| Etiquetas | Familia de título | 12px, 600–700, 1.2, mayúsculas solo cuando aporten jerarquía |
| Temporizadores y números | Familia monoespaciada | 20–32px, 700, `tabular-nums` |

Escala oficial: 12, 14, 16, 20, 24 y 32px. Las mayúsculas se reservan para
etiquetas cortas, estados y temporizadores; nunca para párrafos ni títulos
largos.

## Espaciado

| Token | Valor | Uso recomendado |
|---|---:|---|
| XS | 4px | Ajustes internos, icono-texto compacto. |
| S | 8px | Separación entre controles relacionados. |
| M | 12px | Gaps de listas y grupos de controles. |
| L | 16px | Padding de controles y tarjetas compactas. |
| XL | 24px | Padding de tarjeta amplia y secciones. |
| 2XL | 32px | Separación entre bloques principales. |
| 3XL | 48px | Estados vacíos y aperturas de pantalla. |

## Radios

| Token | Valor | Uso |
|---|---:|---|
| Control pequeño | 12px | Chips, badges y controles compactos. |
| Control | 16px | Botones, inputs y selectores. |
| Tarjeta | 24px | Tarjetas y grupos de contenido. |
| Modal | 28px | Diálogos y hojas modales. |
| Pill | 999px | Acciones tipo píldora y elementos activos internos. |
| Círculo | 50% | Botones solo-icono y avatares. |

## Bordes

- Fino: `1px`, para separadores y campos de baja jerarquía.
- Estándar: `2px`, para controles interactivos, tarjetas y navegación.
- Destacado: `3px`, para foco, selección o elementos de alto énfasis.
- Principal: borde oscuro `#2B2A24`.
- Tenue: borde `#CFC6B6` para divisiones discretas.

## Sombras

- Sin sombra por defecto en superficies, tarjetas y controles.
- Menús: sombra mínima para separarse del contenido inmediato.
- Modales: sombra moderada, solo para reforzar la capa de overlay.
- Navegación inferior fija: sin sombra fuerte; el borde superior define su
  separación respecto al contenido.

## Movimiento

- Rápido: 120ms para presión y cambios de estado local.
- Estándar: 180ms para expandir, contraer y transiciones de componente.
- Overlay: 240ms para modales, lightbox y navegación interna.
- Curva principal: `ease-out`.
- Con `prefers-reduced-motion: reduce`, las transiciones decorativas deben
  reducirse a una duración casi instantánea y sin desplazamientos amplios.

## Responsive

| Contexto | Objetivo |
|---|---|
| Móvil pequeño | 320–359px: conservar acciones esenciales, evitar filas forzadas y mantener objetivos táctiles. |
| Móvil estándar | 360–599px: experiencia principal, una columna y navegación fija segura respecto al área inferior. |
| Tablet | 600–1023px: ampliar respiración y limitar el ancho de lectura sin duplicar la navegación. |
| Escritorio | 1024px o más: contenido centrado con ancho máximo, tarjetas amplias y acciones accesibles sin depender de hover. |

Estas medidas guían las capas activas y cualquier ajuste responsive posterior.

## Estado de migración de componentes

Las capas activas ya cubren botones, formularios, modales, tarjetas,
encabezados, menús contextuales y navegación inferior. Las pantallas de Hoy,
Ejercicios, el editor y visor de ejercicios, Historial, Entrenamiento activo,
temporizadores y Asistente IA también disponen de capas visuales propias.

Quill, estados vacíos, badges y acciones de cada pantalla se han adaptado
cuando pertenecen a esas capas. La consolidación futura debe conservar el
comportamiento existente, verificarse en móvil y escritorio y no eliminar CSS
heredado funcional sin una auditoría específica.
