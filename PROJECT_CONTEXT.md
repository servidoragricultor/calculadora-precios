# Contexto Del Proyecto

## Ubicacion

- Proyecto local: `C:\Users\Admin\Progamacion\Calculadora de Precios`
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

## Commits Recientes Relevantes

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
node --check "C:\Users\Admin\Progamacion\Calculadora de Precios\assets\js\app.js"
```

4. Revisar estado:

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\Users\Admin\Progamacion\Calculadora de Precios" status --short
```

5. Crear commit con usuario temporal:

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\Users\Admin\Progamacion\Calculadora de Precios" -c user.name="servidoragricultor" -c user.email="servidoragricultor@users.noreply.github.com" commit -m "Mensaje del commit"
```

6. Subir a GitHub:

```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "C:\Users\Admin\Progamacion\Calculadora de Precios" push origin main
```

## Notas

- No revertir ni borrar `Calculadora de Precios.txt`.
- GitHub Pages puede tardar de 1 a 5 minutos en reflejar cambios.
- Si se ve una version vieja, usar `Ctrl + F5` o abrir en ventana de incognito.
