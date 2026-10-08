# Contexto Del Proyecto

## Ubicacion

- Proyecto local: `C:\OpenCode\calculadora-precios`
- Repositorio GitHub: `https://github.com/servidoragricultor/calculadora-precios`
- URL publica GitHub Pages: `https://servidoragricultor.github.io/calculadora-precios/`
- Branch principal: `main`

## Publicacion

- GitHub Pages publica desde la carpeta `docs`.
- Cada cambio en archivos web principales debe copiarse tambien a `docs`.
- Archivos que normalmente deben sincronizarse:
  - `index.html` -> `docs/index.html`
  - `assets/css/styles.css` -> `docs/assets/css/styles.css`
  - `assets/js/app.js` -> `docs/assets/js/app.js`
  - `assets/js/firebase.js` -> `docs/assets/js/firebase.js`

## Firebase

- Proyecto Firebase: `calculadora-esquina`.
- La aplicacion usa Firebase Authentication con Email/Password.
- La configuracion de despliegue esta en `firebase.json`.
- Firestore guarda la configuracion del usuario en `configs/{uid}`.
- Las reglas de Firestore solo permiten acceso al usuario autenticado cuyo UID coincide con el documento.
- Para publicar cambios en las reglas:

```bash
npx firebase-tools deploy --only firestore:rules --project calculadora-esquina
```

- Si aparece `Missing or insufficient permissions`, comprobar que el usuario haya iniciado sesion y que las reglas esten publicadas en el proyecto correcto.

## Herramientas

- Git esta instalado en: `C:\Program Files\Git\cmd\git.exe`
- GitHub CLI (`gh`) no esta instalado.
- Archivo local no trackeado: `Calculadora de Precios.txt`
- `Calculadora de Precios.txt` es respaldo original y no debe subirse ni borrarse sin indicacion expresa.

## Estado Visual Y Funcional Actual

- Paleta unica activa: `theme-harvest`.
- `theme-harvest` esta aplicada desde el `<body>` para evitar flash de paleta vieja al recargar.
- Titulo visible: `La Esquina del Agricultor`.
- Navegacion `Calculadora / Configuracion` esta arriba del titulo y en formato compacto.
- Boton de nube esta pegado al grupo de navegacion.
- Se eliminaron los botones rapidos de calculadora:
  - `Copiar precio`
  - `Copiar escalas`
  - `Reiniciar`
  - `Modulos`
- Imagen de categoria en Calculadora y Configuracion es circular.
- Al hacer click en la imagen de Calculadora se abre editor de encuadre con sliders `Horizontal` y `Vertical`.
- El encuadre se guarda por categoria en `categoryMetadata[cat].imgPosition`.
- El buscador de categorias muestra el texto en mayusculas visualmente, pero conserva valores internos originales.
- Desplegable IEPS tiene colores por etiqueta.
- `Asistente de Granel` fue unificado visualmente con el design system de Categoria.
- `Descuentos sobre margen` usa borde gris como las demas secciones.
- En `Gestion de Categorias`, los botones `+ Agregar Categoria` y `Ordenar A-Z` estan debajo del buscador.
- En `Editor de Margenes`, se elimino el boton `Restablecer`.
- En `Editor de Margenes`, las columnas indican `Rango de precio` y `Porcentaje de margen`.
- La palomita de cada categoria confirma, ordena y guarda sus rangos de menor a mayor.
- Presionar `Enter` en cualquier campo del editor ejecuta la misma confirmacion.
- El editor permite pegar tablas desde Excel o Google Sheets para reemplazar todos los rangos de la categoria.
- El pegado acepta dos columnas separadas por espacios o tabulaciones y limpia formatos como `$2,500` y `14%`.
- Si una fila pegada es invalida, se conservan los rangos anteriores.

Formato de pegado recomendado:

```text
$2,500 14%
$2,800 13.5%
$3,000 13%
$3,500 12%
```

El boton `Reemplazar rangos` sustituye toda la tabla de la categoria; no agrega filas a la configuracion anterior.

## Commits Recientes Relevantes

- `6907542 Add bulk margin range import`
- `6efc9bd Remove reset margins button`
- `875fe35 Move category actions below search`
- `2942750 Remove quick action buttons`
- `4aa9b1a Align cloud button with navigation`
- `fc59ba9 Update app title`
- `f8cca2d Move navigation above title`
- `33ba6c8 Publish app through GitHub Pages docs`
- `6d8917b Refactor price calculator app`

## Flujo Recomendado Para Publicar Cambios

1. Editar archivos principales.
2. Si cambian archivos web, copiar tambien a `docs/`.
3. Validar JavaScript:

```powershell
node --check "C:\OpenCode\calculadora-precios\assets\js\app.js"
```

Para probar la aplicacion localmente:

```powershell
python -m http.server 8000
```

Abrir `http://localhost:8000/` y usar `Ctrl + F5` despues de cambios publicados.

4. Revisar estado:

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\OpenCode\calculadora-precios" status --short
```

5. Crear commit con usuario temporal:

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\OpenCode\calculadora-precios" -c user.name="servidoragricultor" -c user.email="servidoragricultor@users.noreply.github.com" commit -m "Mensaje del commit"
```

6. Subir a GitHub:

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\OpenCode\calculadora-precios" push origin main
```

## Notas

- No revertir ni borrar `Calculadora de Precios.txt`.
- GitHub Pages puede tardar de 1 a 5 minutos en reflejar cambios.
- Si se ve una version vieja, usar `Ctrl + F5` o abrir en ventana de incognito.
