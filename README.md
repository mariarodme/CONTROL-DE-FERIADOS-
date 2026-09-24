# Control de jornadas · Jacó Beach / Monte Carlo

https://mariarodme.github.io/CONTROL-DE-FERIADOS-/

Aplicación administrativa en español para gestionar colaboradores y registrar días ordinarios y feriados con estados. Su diseño visual sigue el sitio de Oficina Administrativa de Monte Carlo: encabezado claro, fotografía de Monte Carlo y accesos en tarjetas. Se adapta a computadora y teléfono.

## Abrir y publicar

1. Abrí `index.html` para probarla en tu computadora.
2. Subí **los cinco archivos** (`index.html`, `styles.css`, `app.js` y las dos imágenes `.jpg`) a la raíz de un repositorio de GitHub.
3. En **Settings → Pages**, elegí **Deploy from a branch**, rama `main` y carpeta `/ (root)`. GitHub mostrará la dirección publicada.

No se necesitan paquetes, instalación ni claves.

## Uso

1. Los 12 colaboradores de la tabla proporcionada ya aparecen en **Colaboradores**, agrupados por empresa. Podés agregar, editar el nombre o cambiar la empresa, y eliminar personas. Al eliminar una persona también se borran sus registros, después de pedir confirmación.
2. Seleccioná un mes y creá registros desde **Nuevo registro**. Cada colaborador admite un registro por fecha.
3. Elegí si el día fue ordinario o feriado y seleccioná un único **Estado**: Pendiente, Disfrutado, Trabajado – Pago pendiente, Trabajado – Pagado o No aplica. Los comentarios son opcionales.
4. La pantalla inicial conserva la foto y los accesos y muestra **solo el Resumen del período** debajo. Cada tarjeta o enlace del menú abre la sección correspondiente de forma individual: **Dashboard**, **Calendario**, **Control General**, **Matriz Anual**, **Pendientes**, **Colaboradores**, **Feriados**, **Reportes** o **Configuración**. En Calendario, tocá una fecha para empezar un registro. Pendientes incluye cualquier mes.
5. En **Feriados**, elegí el año y usá **Agregar feriado** para guardar nombre y fecha. Cada feriado se puede editar o eliminar. La Matriz Anual y el Calendario usan esas fechas guardadas. Los feriados de 2026 se cargan inicialmente desde la tabla proporcionada; para otros años agregá los que correspondan.
6. Filtrá y exportá el resultado visible a CSV para abrirlo en Excel. **Descargar respaldo** guarda los colaboradores, feriados y registros en JSON.

El botón de tres rayitas abre un menú nativo con Inicio y todas las secciones, incluso en teléfono. **Configuración y diseño** permite cambiar la tipografía, el tamaño del texto y los colores; la selección se guarda en este navegador. Desde allí también se puede restablecer el diseño original y descargar un respaldo. Algunos visores de archivos en teléfonos no ejecutan JavaScript: en ese caso se puede abrir el menú y consultar las secciones, pero para registrar y guardar datos se debe abrir el archivo en un navegador compatible o publicar los archivos en GitHub Pages.

Los feriados iniciales de 2026 corresponden a las fechas de la tabla proporcionada. El estado se elige manualmente; la página no calcula pagos. Los registros de versiones anteriores conservan la fecha, el colaborador y los comentarios. Cuando no tenían un estado elegido, aparecen con **No aplica** para que puedas revisarlos.

## Datos y acceso

Los registros se guardan en `localStorage` del navegador y del dispositivo actual. GitHub Pages publica solamente el código: **no sincroniza los registros** entre computadoras ni ofrece autenticación. **Esta versión incluye nombres reales en `app.js`: si el repositorio es público, cualquier persona podrá verlos.** Usá un repositorio privado o quitá los nombres antes de publicar. No subás archivos JSON ni CSV con registros a un repositorio público. Esta versión es útil para administración por una sola persona; el trabajo compartido requiere acceso privado y una base de datos. El respaldo JSON está pensado para conservación externa y aún no se importa desde la interfaz.
