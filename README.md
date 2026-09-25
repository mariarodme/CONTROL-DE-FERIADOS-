# Control de jornadas · Jacó Beach / Monte Carlo

https://mariarodme.github.io/CONTROL-DE-FERIADOS-/

Aplicación administrativa en español para gestionar colaboradores y registrar días ordinarios y feriados con estados. Su diseño visual sigue el sitio de Oficina Administrativa de Monte Carlo: encabezado claro, fotografía de Monte Carlo y accesos en tarjetas. Se adapta a computadora y teléfono.

## Abrir y publicar

1. Abrí `index.html` para probarla en tu computadora.
2. Subí los archivos de la página (`index.html`, `styles.css`, `app.js`, `cloud.js`, `firebase-config.js` y las dos imágenes `.jpg`) a la raíz de un repositorio de GitHub. `database.rules.json` es para pegarlo en Firebase, no se publica como datos de empleados.
3. En **Settings → Pages**, elegí **Deploy from a branch**, rama `main` y carpeta `/ (root)`. GitHub mostrará la dirección publicada.

La página funciona sin instalación. Para sincronizar datos entre dispositivos necesitás configurar el guardado en línea descrito abajo.

## Uso

1. Los 12 colaboradores de la tabla proporcionada ya aparecen en **Colaboradores**, agrupados por empresa. Podés agregar, editar el nombre o cambiar la empresa, y eliminar personas. Al eliminar una persona también se borran sus registros, después de pedir confirmación.
2. Seleccioná un mes y creá registros desde **Nuevo registro**. Cada colaborador admite un registro por fecha.
3. Elegí si el día fue ordinario o feriado y seleccioná un único **Estado**: Pendiente, Disfrutado, Trabajado – Pago pendiente, Trabajado – Pagado o No aplica. Los comentarios son opcionales.
4. La pantalla inicial conserva la foto y los accesos y muestra **solo el Resumen del período** debajo. Cada tarjeta o enlace del menú abre la sección correspondiente de forma individual: **Dashboard**, **Calendario**, **Control General**, **Matriz Anual**, **Pendientes**, **Colaboradores**, **Feriados**, **Reportes** o **Configuración**. En Calendario, tocá una fecha para empezar un registro. Pendientes incluye cualquier mes.
5. En **Feriados**, elegí el año y usá **Agregar feriado** para guardar nombre y fecha. Cada feriado se puede editar o eliminar. La Matriz Anual y el Calendario usan esas fechas guardadas. Los feriados de 2026 se cargan inicialmente desde la tabla proporcionada; para otros años agregá los que correspondan.
6. Filtrá y exportá el resultado visible a CSV para abrirlo en Excel. **Descargar respaldo** guarda los colaboradores, feriados y registros en JSON. **Importar / combinar respaldo** permite trasladar esos datos desde otro dispositivo.

El botón de tres rayitas abre un menú nativo con Inicio y todas las secciones, incluso en teléfono. **Configuración y diseño** permite cambiar la tipografía, el tamaño del texto y los colores; la selección se guarda en este navegador. Desde allí también se puede restablecer el diseño original y descargar un respaldo. Algunos visores de archivos en teléfonos no ejecutan JavaScript: en ese caso se puede abrir el menú y consultar las secciones, pero para registrar y guardar datos se debe abrir el archivo en un navegador compatible o publicar los archivos en GitHub Pages.

Los feriados iniciales de 2026 corresponden a las fechas de la tabla proporcionada. El estado se elige manualmente; la página no calcula pagos. Los registros de versiones anteriores conservan la fecha, el colaborador y los comentarios. Cuando no tenían un estado elegido, aparecen con **No aplica** para que puedas revisarlos.

## Datos y acceso

GitHub Pages solo publica los archivos. Antes de configurar la nube, los datos se guardan en el navegador actual y la página lo indica expresamente. **El código incluye nombres reales en `app.js`: si el repositorio es público, cualquier persona podrá verlos.** No subás respaldos JSON ni CSV con registros al repositorio público.

### Activar guardado en línea

1. Entrá a [Firebase Console](https://console.firebase.google.com/) con tu cuenta de Google y creá un proyecto en el plan Spark, sin Google Analytics si no lo necesitás. Registrá una **app web** para obtener `apiKey`, `authDomain`, `projectId` y `appId`.
2. En **Build → Authentication → Sign-in method**, activá el proveedor **Google**. En **Authentication → Settings → Authorized domains**, agregá `mariarodme.github.io`.
3. En **Build → Realtime Database**, creá una base. En **Rules**, reemplazá las reglas iniciales con el contenido de [`database.rules.json`](database.rules.json) y publicalas. Copiá la URL de esta base como `databaseURL`.
4. Pegá los cinco datos de configuración de Firebase en [`firebase-config.js`](firebase-config.js). Son identificadores públicos de la aplicación web; **no coloqués contraseñas ni claves privadas**. Publicá los archivos actualizados en GitHub Pages, manteniendo las dos imágenes `.jpg` aparte.
5. **Primero en el teléfono donde tenés los registros:** abrí la misma página y navegador donde los ingresaste, descargá un respaldo en Configuración, tocá **Entrar con Google** y después **Subir datos de este dispositivo**. Verificá **Guardado en línea**. En la computadora, entrá con **la misma cuenta de Google** y elegí **Abrir datos en línea**. Antes de abrirlos se descarga automáticamente un respaldo de lo que hubiese en la computadora.

Cada cambio se conserva además localmente. Si no hay conexión o dos dispositivos cambian datos simultáneamente, la página lo advierte y ofrece descargar un respaldo para importar y combinar los registros; no sustituye los datos del otro dispositivo en silencio. Con la sesión iniciada, los cambios llegan en tiempo real. Nunca compartas tu contraseña en GitHub ni en los archivos de la página.
