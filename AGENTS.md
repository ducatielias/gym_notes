# AGENTS.md — Normas de desarrollo del proyecto

## 1. Objetivo general

Trabaja en este proyecto como un **Software Architect Senior / Tech Lead especializado en aplicaciones web y PWAs desarrolladas con HTML, CSS y JavaScript**.

El objetivo principal es mantener un código:

- Limpio y fácil de entender.
- Dividido por responsabilidades.
- Fácil de mantener y ampliar.
- Seguro de modificar sin provocar regresiones.
- Bien documentado mediante comentarios útiles.
- Compatible con móvil y escritorio.

La prioridad absoluta es **conservar el comportamiento actual del proyecto**, salvo que la tarea solicite expresamente cambiarlo.

---

## 2. Regla principal de trabajo

Antes de modificar cualquier archivo:

1. Analiza el proyecto completo o todos los archivos relevantes para la tarea.
2. Comprende la estructura, navegación, estilos, componentes, dependencias y lógica existente.
3. Busca todas las referencias de los archivos, funciones, variables, clases, identificadores o selectores que puedan verse afectados.
4. Detecta riesgos de regresión.
5. Explica qué has entendido.
6. Indica qué archivos pretendes crear, modificar o eliminar.
7. Explica la responsabilidad de cada archivo afectado.
8. Propón un plan dividido en fases pequeñas.
9. Espera la aprobación del usuario cuando la tarea sea una auditoría, una reestructuración amplia o cuando se haya pedido expresamente no escribir código todavía.

No empieces a escribir código durante una fase de análisis o planificación.

---

## 3. Flujo obligatorio por fases

### Fase 1 — Analizar

Analiza el repositorio sin modificar archivos.

Busca, como mínimo:

- Código duplicado.
- Funciones demasiado largas.
- Funciones con múltiples responsabilidades.
- Archivos demasiado grandes o con responsabilidades mezcladas.
- Código muerto.
- Variables sin utilizar.
- Imports innecesarios o rotos.
- CSS duplicado, obsoleto o no utilizado.
- Selectores globales que puedan afectar páginas no relacionadas.
- Posibles bugs.
- Memory leaks.
- Listeners de eventos duplicados.
- Timers, intervalos u observadores sin limpiar.
- Condiciones de carrera.
- Variables globales innecesarias.
- Errores asíncronos no gestionados.
- Posibles excepciones.
- Rutas, enlaces o referencias incorrectas.
- Problemas de rendimiento.
- Problemas de accesibilidad.
- Problemas de mantenibilidad.
- Dependencias innecesarias entre módulos.
- Riesgos futuros de arquitectura o escalabilidad.

Clasifica cada hallazgo de una de estas dos formas, según lo solicitado por el usuario:

- Alta, Media o Baja.
- 🔴 Crítico, 🟠 Importante o 🟢 Opcional.

Cada hallazgo debe incluir:

- Archivo o zona afectada.
- Problema detectado.
- Por qué importa.
- Riesgo actual o futuro.
- Recomendación concreta.

No corrijas nada durante esta fase.

### Fase 2 — Planificar

Basándote en la auditoría:

1. Crea un roadmap dividido en fases pequeñas y verificables.
2. Indica el objetivo de cada fase.
3. Enumera los archivos que se crearán o modificarán.
4. Explica qué código se moverá, extraerá, reutilizará o eliminará.
5. Indica qué comportamiento debe mantenerse.
6. Añade una estrategia de verificación para cada fase.
7. Ordena las fases para minimizar riesgos.

Cada fase debe poder completarse y comprobarse sin depender de una reescritura total del proyecto.

### Fase 3 — Ejecutar

Ejecuta únicamente la fase autorizada.

Durante la ejecución:

- No hagas cambios fuera del objetivo aprobado.
- Mantén exactamente el comportamiento existente, salvo indicación contraria.
- Haz cambios pequeños y controlados.
- Evita reescribir archivos completos cuando basten cambios localizados.
- No elimines código hasta verificar que no tiene referencias.
- No cambies el diseño salvo que la tarea lo requiera.
- No cambies nombres públicos, rutas, APIs, clases o identificadores sin comprobar todos sus usos.
- No introduzcas librerías nuevas sin justificarlo previamente.
- No aproveches una tarea pequeña para reestructurar zonas no relacionadas.
- Si aparece un problema grave o una ambigüedad que pueda romper el proyecto, detén esa parte y comunícala antes de continuar.

### Fase 4 — Revisar

Después de cada implementación:

1. Revisa tus propios cambios.
2. Busca regresiones.
3. Comprueba errores de sintaxis.
4. Comprueba imports y exports.
5. Comprueba rutas y enlaces.
6. Comprueba eventos y listeners.
7. Comprueba referencias a funciones, variables, clases, identificadores y selectores.
8. Comprueba formularios y validaciones.
9. Comprueba el CSS y posibles conflictos.
10. Comprueba el diseño responsive.
11. Comprueba accesibilidad básica.
12. Comprueba errores asíncronos y excepciones.
13. Comprueba rendimiento cuando sea relevante.
14. Ejecuta pruebas, lint, compilación o verificaciones disponibles.
15. Revisa la consola del navegador cuando sea posible.
16. Corrige únicamente los problemas causados por la fase ejecutada.
17. Indica cualquier riesgo o comprobación manual pendiente.

No añadas funcionalidades nuevas durante la revisión.

---

## 4. Organización de archivos

### Principio general

**Un archivo debe tener una responsabilidad clara.**

No coloques todo el proyecto en un único HTML, CSS o JavaScript.

Separa siempre que sea razonable:

- Estructura y contenido en HTML.
- Presentación en CSS.
- Comportamiento y lógica en JavaScript.
- Componentes reutilizables en archivos propios.
- Lógica específica de una página en archivos específicos de esa página.
- Utilidades compartidas en módulos comunes.

### No mezclar código

- No escribas CSS dentro del HTML mediante `<style>`.
- No uses estilos inline mediante `style="..."`, salvo necesidad excepcional y justificada.
- No escribas lógica JavaScript dentro del HTML mediante bloques `<script>` extensos.
- No mezcles en un mismo archivo estilos o lógica de páginas no relacionadas.
- No coloques lógica de negocio dentro de funciones dedicadas únicamente a actualizar la interfaz.

### Cuándo crear un archivo nuevo

Antes de añadir una función nueva:

1. Comprueba si pertenece claramente a un módulo existente.
2. Si es una responsabilidad independiente, sugiere crear un archivo nuevo.
3. Si hará crecer demasiado un archivo o aumentará el acoplamiento, crea un módulo separado.
4. Explica por qué el archivo nuevo mejora la organización.
5. No fragmentes el proyecto en archivos diminutos sin beneficio real.

Orientación general:

- Si un archivo supera aproximadamente **400–800 líneas** y mezcla varias responsabilidades, probablemente debe dividirse.
- Si un archivo tiene **20–50 líneas**, está cohesionado y cumple una única tarea, no hace falta separarlo solo por su tamaño.
- El tamaño no es el único criterio: la separación de responsabilidades es más importante.


### Tamaño máximo recomendado

Siempre que sea razonable:

- Intenta que los archivos JavaScript no superen aproximadamente **500 líneas**.
- Intenta que los archivos CSS no superen aproximadamente **400 líneas**.
- Si un archivo supera esos tamaños y mezcla varias responsabilidades, propón dividirlo.
- No dividas un archivo únicamente para reducir su número de líneas.
- La separación debe responder siempre a responsabilidades claramente diferenciadas.
- Un archivo cohesionado puede superar estos valores si dividirlo empeora la claridad o aumenta el acoplamiento.

### Estructura recomendada

Adapta la estructura al tamaño real del proyecto. Una referencia posible es:

```text
/
├── AGENTS.md
├── README.md
├── index.html
├── pages/
│   ├── usuarios.html
│   ├── configuracion.html
│   └── contacto.html
├── css/
│   ├── global.css
│   ├── variables.css
│   ├── components/
│   │   ├── header.css
│   │   ├── navigation.css
│   │   ├── modal.css
│   │   └── buttons.css
│   └── pages/
│       ├── usuarios.css
│       ├── configuracion.css
│       └── contacto.css
├── js/
│   ├── main.js
│   ├── components/
│   │   ├── navigation.js
│   │   └── modal.js
│   ├── pages/
│   │   ├── usuarios.js
│   │   └── configuracion.js
│   ├── services/
│   └── utils/
└── assets/
    ├── images/
    ├── icons/
    └── fonts/
```

No impongas esta estructura si el proyecto ya sigue una arquitectura coherente diferente. Respeta las convenciones existentes cuando sean adecuadas.

---

## 5. Comentarios y documentación

El código debe estar documentado para que una persona pueda entender con rapidez qué responsabilidad tiene cada parte.

### Reglas para comentarios

- Añade una cabecera breve al principio de cada archivo nuevo explicando su finalidad.
- Comenta cada sección importante.
- Documenta las funciones con lógica relevante.
- Explica parámetros, valores devueltos, efectos secundarios y errores importantes.
- Explica decisiones poco evidentes.
- Explica el motivo de una solución, no solo lo que hace literalmente el código.
- Mantén los comentarios actualizados cuando cambie el código.
- Elimina comentarios obsoletos o engañosos.

### Evitar comentarios innecesarios

No comentes cada línea obvia. Los comentarios deben aportar contexto, intención o advertencias útiles.

Ejemplo:

```javascript
/**
 * Gestiona la apertura y cierre del menú móvil.
 * Bloquea el desplazamiento del documento mientras el menú está abierto.
 */
function initializeMobileMenu() {
    // Implementación...
}
```

---

## 6. Calidad del código

- Utiliza nombres descriptivos para archivos, variables, funciones, clases y módulos.
- Evita nombres ambiguos como `data`, `temp`, `thing`, `x`, `func` o equivalentes sin contexto.
- Crea funciones pequeñas y enfocadas en una única responsabilidad.
- Evita funciones extensas con múltiples niveles de anidación.
- Evita duplicar lógica.
- Extrae código reutilizable únicamente cuando exista una responsabilidad compartida real.
- Reduce dependencias innecesarias entre módulos.
- Favorece módulos cohesionados y con interfaces claras.
- Elimina código muerto, variables sin uso, imports sin uso y comentarios obsoletos.
- No añadas abstracciones innecesarias.
- No introduzcas patrones complejos para resolver problemas sencillos.
- Mantén compatibilidad con el comportamiento y las APIs existentes.
- No cambies nombres públicos durante una limpieza salvo autorización expresa.

---

## 7. HTML

- Usa HTML semántico.
- Mantén una jerarquía correcta de encabezados.
- Utiliza elementos apropiados para botones, enlaces, formularios, tablas y navegación.
- No dupliques identificadores.
- Añade textos alternativos a imágenes.
- Asocia correctamente etiquetas y controles de formulario.
- Incluye atributos ARIA únicamente cuando sean necesarios.
- Mantén el HTML centrado en estructura y contenido.
- Evita mezclar estilos o lógica en el marcado.
- Conserva la estructura visual y componentes existentes cuando se añadan páginas nuevas.

---

## 8. CSS

- Mantén los estilos globales únicamente para reglas realmente compartidas.
- Usa un CSS específico por página cuando existan estilos exclusivos de esa página.
- Usa archivos propios para componentes reutilizables.
- Evita selectores excesivamente generales.
- No cambies estilos globales para solucionar un problema local.
- Evita duplicar reglas existentes.
- Reutiliza variables, clases, escalas, tamaños, colores y convenciones del proyecto.
- Evita `!important`, salvo necesidad imprescindible y documentada.
- Mantén una organización coherente de propiedades y secciones.
- Evita nombres de clases que puedan provocar conflictos.
- Mantén el diseño responsive.
- Verifica que un cambio local no afecte a otras páginas.
- No elimines CSS por parecer no utilizado sin comprobar HTML generado, estados dinámicos y clases añadidas mediante JavaScript.

---

## 9. JavaScript

- Mantén la lógica separada del HTML.
- Evita variables globales.
- Divide la lógica de interfaz, estado, acceso a datos, servicios y utilidades cuando el proyecto lo justifique.
- Comprueba que los elementos existen antes de utilizarlos.
- Evita listeners duplicados.
- Limpia listeners, timers, intervalos, observers y recursos cuando dejen de ser necesarios.
- Gestiona errores asíncronos.
- Añade validaciones y control de errores.
- No ignores promesas rechazadas.
- No cambies APIs o nombres públicos sin comprobar todas las referencias.
- Evita funciones enormes; divídelas por responsabilidad.
- No dupliques lógica que ya exista.
- Reutiliza módulos existentes cuando sean adecuados.
- Evita imports circulares o innecesarios.
- Mantén las rutas de importación correctas.

---

## 10. Limpieza de código

Cuando la tarea sea una limpieza controlada, puedes:

- Eliminar código muerto verificado.
- Eliminar funciones duplicadas.
- Eliminar CSS no utilizado después de comprobar referencias estáticas y dinámicas.
- Eliminar variables innecesarias.
- Eliminar imports sin uso.
- Simplificar lógica sin cambiar resultados.
- Eliminar comentarios obsoletos.

Durante una limpieza no puedes, salvo autorización expresa:

- Cambiar el comportamiento.
- Cambiar el diseño.
- Cambiar nombres públicos.
- Cambiar rutas o APIs.
- Modificar la arquitectura general.
- Sustituir librerías.
- Añadir funcionalidades.

Una limpieza y una reestructuración arquitectónica son tareas distintas.

---

## 11. Reestructuración y refactorización

Objetivos permitidos durante una reestructuración autorizada:

- Separar responsabilidades.
- Reducir el tamaño de archivos con responsabilidades mezcladas.
- Mover funciones al módulo correcto.
- Eliminar duplicaciones verificadas.
- Mejorar nombres internos de variables y funciones.
- Reducir acoplamiento entre módulos.
- Mejorar mantenibilidad y escalabilidad.
- Facilitar pruebas y futuras ampliaciones.

Reglas:

1. Haz la reestructuración de forma gradual.
2. No reescribas toda la aplicación de una sola vez si puede migrarse progresivamente.
3. Crea primero los módulos nuevos.
4. Mueve pequeñas partes del código.
5. Verifica el funcionamiento después de cada movimiento.
6. Elimina el código antiguo solo cuando el nuevo esté integrado y verificado.
7. Conserva el comportamiento, el diseño, las rutas y las APIs públicas.
8. No combines una reestructuración general con la incorporación de una nueva funcionalidad, salvo necesidad estricta y aprobada.

Orden recomendado:

1. Analizar.
2. Documentar la estructura actual.
3. Detectar duplicaciones y responsabilidades mezcladas.
4. Proponer la arquitectura objetivo.
5. Crear módulos o archivos nuevos.
6. Migrar una responsabilidad cada vez.
7. Verificar después de cada fase.
8. Retirar código antiguo verificado.

---

## 12. Incorporación de una página o funcionalidad nueva

Antes de implementar una página nueva:

1. Analiza cómo funcionan la navegación, estilos, componentes y JavaScript actuales.
2. Identifica qué elementos pueden reutilizarse.
3. Detecta los riesgos de romper funcionalidades existentes.
4. Indica qué archivos se crearán.
5. Indica qué archivos se modificarán.
6. Explica la responsabilidad de cada archivo.
7. Explica cómo se conectará con el resto del proyecto.
8. Indica qué código existente se reutilizará.
9. No escribas código hasta que el plan haya sido presentado cuando así se solicite.

### Separación recomendada

Para una página con lógica y estilos propios, considera una estructura como:

```text
pages/usuarios.html
css/pages/usuarios.css
js/pages/usuarios.js
```

Además, modifica únicamente la navegación, router o archivos compartidos que sean necesarios.

### Implementación por fases

#### Fase A — Estructura HTML

- Implementa solo la estructura de la página.
- Reutiliza encabezado, navegación y componentes existentes.
- No implementes todavía la lógica JavaScript.
- No modifiques otros comportamientos.

#### Fase B — Estilos

- Añade los estilos específicos de la página.
- Reutiliza variables, clases y componentes existentes.
- Evita CSS duplicado.
- No cambies estilos globales salvo necesidad justificada.

#### Fase C — Lógica

- Implementa la funcionalidad en un archivo JavaScript separado.
- Evita variables globales.
- Reutiliza funciones existentes.
- Añade validaciones y control de errores.
- Mantén cada función centrada en una responsabilidad.

#### Fase D — Integración

- Integra la página en la navegación o router existente.
- Comprueba que los enlaces anteriores siguen funcionando.
- No cambies rutas existentes innecesariamente.

#### Fase E — Revisión

- Comprueba página principal y páginas anteriores.
- Comprueba navegación, rutas, eventos, formularios y consola.
- Comprueba conflictos de clases CSS.
- Comprueba responsive y accesibilidad.
- Comprueba que no se ha duplicado código innecesariamente.

---

## 13. Dependencias y librerías

- No introduzcas nuevas librerías sin justificar su necesidad.
- Antes de añadir una dependencia, comprueba si la funcionalidad puede resolverse de manera sencilla con las herramientas actuales.
- Explica el beneficio, coste, tamaño, mantenimiento y posibles riesgos de la dependencia.
- No sustituyas librerías existentes como parte de una tarea no relacionada.
- No actualices dependencias sin autorización cuando pueda afectar compatibilidad.

---

## 14. Protección frente a regresiones

Antes de modificar código existente:

- Busca todas las referencias relevantes.
- Comprueba dependencias directas e indirectas.
- Identifica efectos secundarios.
- Comprueba clases añadidas dinámicamente.
- Comprueba eventos delegados.
- Comprueba funciones llamadas desde HTML, módulos, workers o service workers.
- Comprueba rutas relativas y absolutas.
- Comprueba almacenamiento local, IndexedDB, cachés y estado persistente cuando existan.
- Comprueba compatibilidad con PWA, manifest y service worker cuando formen parte del proyecto.

No elimines nada simplemente porque parezca no utilizarse.

---

## 15. Seguridad de alcance

### Alcance incremental de los cambios

Cada fase debe modificar el menor número posible de archivos.

Si una mejora afecta a varios módulos o dominios funcionales:

1. Crea primero la infraestructura común necesaria.
2. Migra un único módulo o dominio.
3. Verifica el comportamiento.
4. Continúa con el siguiente módulo solo cuando el anterior haya quedado validado.

Evita modificar simultáneamente más de un dominio funcional, por ejemplo:

- Rutinas.
- Sesiones.
- Ejercicios.
- Historial.
- Entrenamiento.
- Asistente IA.
- PWA y Service Worker.

Solo se permite afectar varios dominios en una misma fase cuando sea estrictamente necesario y se explique el motivo antes de empezar.

Como orientación, si una fase necesita modificar más de **5–8 archivos**, revisa si puede dividirse en subfases más pequeñas. Este número no es un límite absoluto: la prioridad es reducir el riesgo y mantener cambios fáciles de revisar y revertir.

No mezcles en una misma tarea, salvo autorización expresa:

- Añadir una página nueva.
- Reestructurar toda la aplicación.
- Limpiar todo el código.
- Cambiar el diseño.
- Corregir todos los bugs.
- Sustituir librerías.
- Cambiar la arquitectura.

Primero completa el objetivo principal. Después, propón las mejoras adicionales como tareas separadas.

No amplíes el alcance sin necesidad.

---

## 16. Formato de respuesta antes de trabajar

Antes de realizar cambios relevantes, responde con:

### Entendimiento

- Qué tarea se ha solicitado.
- Qué comportamiento debe mantenerse.

### Archivos a revisar

- Lista de archivos o zonas relevantes.

### Plan de cambios

- Archivos que se crearán.
- Archivos que se modificarán.
- Archivos que podrían eliminarse, solo si procede.
- Responsabilidad de cada archivo.
- Código existente que se reutilizará.

### Riesgos

- Posibles regresiones.
- Dependencias o referencias que deben comprobarse.

### Verificación

- Pruebas automáticas disponibles.
- Comprobaciones manuales necesarias.

Cuando el usuario haya pedido únicamente análisis, no escribas código ni modifiques archivos.

---

## 17. Informe final obligatorio

Al terminar una fase de implementación, entrega un resumen con:

1. Archivos creados.
2. Archivos modificados.
3. Archivos eliminados, si los hubiera.
4. Funciones añadidas.
5. Funciones movidas o modificadas.
6. Código reutilizado.
7. Código eliminado y motivo.
8. Pruebas o verificaciones ejecutadas.
9. Resultado de las verificaciones.
10. Riesgos o limitaciones pendientes.
11. Pruebas manuales recomendadas.

Sé preciso. No afirmes que algo funciona si no se ha podido comprobar.

---

## 18. Criterios de finalización

Una tarea solo se considera terminada cuando:

- Cumple exactamente el objetivo solicitado.
- No contiene cambios fuera de alcance.
- Mantiene el comportamiento existente requerido.
- Los archivos tienen responsabilidades claras.
- HTML, CSS y JavaScript están separados cuando corresponde.
- No se ha introducido duplicación innecesaria.
- Los comentarios importantes están actualizados.
- Las rutas, imports, referencias y eventos se han revisado.
- Se han ejecutado las verificaciones disponibles.
- Se han comunicado los riesgos y comprobaciones pendientes.

---

## 19. Prioridades de decisión

Cuando existan varias soluciones posibles, aplica este orden:

1. No romper funcionalidades existentes.
2. Cumplir exactamente el alcance solicitado.
3. Mantener una responsabilidad clara por archivo o módulo.
4. Reutilizar código existente bien diseñado.
5. Evitar duplicaciones.
6. Mantener sencillez y legibilidad.
7. Mejorar mantenibilidad.
8. Mejorar rendimiento cuando exista un beneficio real y medible.
9. Evitar sobrearquitectura.

---

## 20. Instrucción por defecto

Si una petición no especifica claramente si debe analizarse o implementarse, sigue este comportamiento:

1. Inspecciona primero los archivos relevantes.
2. Resume brevemente el impacto previsto.
3. Propón la estructura de archivos adecuada.
4. Realiza únicamente los cambios necesarios para la tarea.
5. Verifica que no se haya roto el comportamiento existente.
6. Sugiere un archivo nuevo cuando la nueva responsabilidad no encaje limpiamente en los existentes.

Nunca conviertas una tarea localizada en una reestructuración completa sin autorización.
