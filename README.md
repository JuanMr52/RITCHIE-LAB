# Ritchie Lab

Simulación interactiva del método de Ritchie (concentración por formol-éter), para exposición universitaria de Tecnología Médica. Pensada para que 10–40 estudiantes participen desde su teléfono al mismo tiempo, con un ranking grupal compartido.

Todo el contenido científico (cantidades, tiempos, rpm, orden de las capas, preguntas y explicaciones) proviene exclusivamente del procedimiento que se te proporcionó. No se agregó información externa.

## 1. Cómo funciona la arquitectura

- **Frontend**: HTML + CSS + JavaScript vanilla, sin frameworks ni Node.js en producción. Es una sola página (`index.html`) que muestra/oculta "pantallas" (`<section class="screen">`) según el avance del estudiante.
- **Estado**: se mantiene en un objeto JavaScript en memoria (`state` en `script.js`) mientras el estudiante hace la simulación: puntuación, configuración de la centrífuga, orden elegido de las capas, hora de inicio/fin.
- **Puntuación**: 100 puntos distribuidos exactamente como se especificó (10 + 10 + 20 + 20 + 20 + 10 + 10). Se calcula en el navegador del estudiante, en el momento en que responde cada pregunta.
- **Ranking**: al terminar, el estudiante guarda su puntuación. Esto se envía a una tabla `ritchie_scores` en Supabase (base de datos remota), para que todos los teléfonos vean el mismo ranking. Si Supabase no está configurado, la app cae automáticamente en **modo demo** y guarda todo en `localStorage` del propio teléfono (sin compartir entre dispositivos).
- **Modo presentador**: una vista protegida por una clave simple (configurable en `script.js`) que consulta el TOP 10 de Supabase cada pocos segundos, para proyectarlo en pantalla durante la exposición.

## 2. Archivos del proyecto

```
ritchie-lab/
│
├── index.html            # estructura de todas las pantallas
├── style.css              # estética de laboratorio (oscuro + cian)
├── script.js               # lógica, puntuación, Supabase/demo
├── supabase_schema.sql   # SQL para crear la tabla y las políticas
└── README.md
```

## 3. Probar la aplicación en modo DEMO (sin configurar nada)

1. Abre `index.html` directamente en el navegador (doble clic), o publícala en GitHub Pages (paso 6).
2. Juega la simulación completa. Al final verás la nota **"Modo demostración: ranking local"**.
3. El ranking en ese caso solo existe en tu propio navegador (vía `localStorage`), no se comparte entre teléfonos. Es útil para probar antes de la exposición.

## 4. Configurar Supabase (ranking compartido entre teléfonos)

### Paso 1 — Crear el proyecto en Supabase
1. Entra a [supabase.com](https://supabase.com) y crea una cuenta (gratis).
2. Haz clic en **New project**.
3. Elige un nombre (por ejemplo `ritchie-lab`), una contraseña de base de datos y una región cercana.
4. Espera a que el proyecto termine de crearse (1–2 minutos).

### Paso 2 — Crear la tabla
1. En el menú lateral de tu proyecto, entra a **SQL Editor**.
2. Abre el archivo `supabase_schema.sql` de este proyecto, copia todo su contenido.
3. Pégalo en el SQL Editor de Supabase y haz clic en **Run**.
4. Esto crea la tabla `ritchie_scores` y las políticas necesarias.

### Paso 3 — Configurar las políticas (RLS)
Las políticas ya se crean automáticamente al ejecutar `supabase_schema.sql`:
- Cualquiera con la clave pública puede **insertar** su propia puntuación.
- Cualquiera con la clave pública puede **leer** el ranking (para el TOP 10 y el modo presentador).
- Nadie puede editar ni borrar puntuaciones desde la app.

### Paso 4 — Copiar el Project URL
1. En el menú lateral, entra a **Settings → API**.
2. Copia el valor de **Project URL** (algo como `https://xxxxxxxx.supabase.co`).

### Paso 5 — Copiar la clave pública (anon key)
1. En la misma página (**Settings → API**), copia la clave llamada **anon / public**.
2. **Nunca** copies la clave `service_role` — esa es privada y no debe usarse en el navegador.

### Paso 6 — Insertarlas en el código
Abre `script.js` y edita estas dos líneas al principio del archivo:

```javascript
const SUPABASE_URL = "PEGAR_AQUI";
const SUPABASE_ANON_KEY = "PEGAR_AQUI";
```

Reemplázalas por tu Project URL y tu clave anon, por ejemplo:

```javascript
const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

En cuanto ambos valores estén configurados, la app deja el modo demo automáticamente y muestra **"Ranking grupal activo"**.

## 5. Activar / probar el ranking

1. Con Supabase ya configurado, abre la app y completa la simulación en dos navegadores o dispositivos distintos (por ejemplo tu teléfono y tu computadora).
2. En ambos, presiona **Guardar mi puntuación** al final.
3. Presiona **Ver ranking** en cualquiera de los dos: deberías ver ambas puntuaciones en el mismo TOP 10.

## 6. Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `ritchie-lab`).
2. Sube estos archivos a la raíz del repositorio: `index.html`, `style.css`, `script.js` (y opcionalmente `README.md`).
3. Ve a **Settings → Pages** en tu repositorio.
4. En **Source**, selecciona la rama `main` (o `master`) y la carpeta `/ (root)`.
5. Guarda. GitHub te dará una URL pública, algo como:
   `https://tu-usuario.github.io/ritchie-lab/`
6. Esa es la URL que puedes convertir en un código QR (con cualquier generador de QR) para proyectar el día de la exposición.

## 7. Modo presentador

1. En la app publicada, entra al enlace pequeño **"Modo presentador"** que aparece en la esquina inferior derecha.
2. Ingresa la clave configurada en `script.js` (por defecto `ritchie2026`; cámbiala antes de la exposición).
3. Verás el TOP 10 actualizándose automáticamente cada pocos segundos — ideal para proyectar en pantalla mientras tus compañeros responden desde sus teléfonos.

Para cambiar la clave, edita en `script.js`:

```javascript
const PRESENTER_KEY = "ritchie2026";
```

## 8. Notas importantes

- No se incluyen credenciales privadas en el código: solo se usa la clave pública (`anon key`) de Supabase, que está diseñada para exponerse en el navegador. La seguridad la dan las políticas de RLS (solo insertar y leer, nunca editar ni borrar).
- Toda la información científica de la app (cantidades, tiempos, rpm, orden de las capas, preguntas y explicaciones) proviene exclusivamente del material de estudio proporcionado.
- Puntuación máxima: 100 puntos (10 + 10 + 20 + 20 + 20 + 10 + 10).
- La app es responsive y mobile-first: pensada para usarse con el pulgar, sin depender de hover ni de mouse.
