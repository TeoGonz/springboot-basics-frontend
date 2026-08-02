# Bitácora del curso — Frontend

Front de la **bitácora del curso** en **Next.js 16** (App Router). Es la única capa HTML del proyecto: el backend Spring (`springboot_java_project/`, repositorio hermano) es una **API REST pura** y no sirve vistas.

La bitácora pública sigue siendo **estática** (se renderiza en build). Las pantallas de autenticación —entrar, registrarse, recuperar contraseña y cuenta— **sí** hablan con la API.

## Stack

| Pieza | Detalle |
|---|---|
| Framework | Next.js 16.2 (App Router) + React 19 |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind v4 (configuración en CSS, sin `tailwind.config.js`) |
| Iconos | `react-icons/bs` — el set de Bootstrap Icons, como componentes SVG |
| i18n | Diccionarios JSON propios + rutas por idioma |
| Sesión | JWT del backend guardado en cookie `httpOnly` |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # API_BASE_URL=http://localhost:8080
npm run dev                    # http://localhost:3000 -> redirige a /es
npm run build                  # /es, /en y /pt como HTML estático
npm start                      # sirve el build
npm run lint
```

La bitácora pública funciona sin backend. Las pantallas de autenticación necesitan la API levantada: en el repositorio del backend, `docker compose -f docker/docker-compose.yml up -d` arranca Postgres, la API en `:8080` y **Mailpit** en `:8025`, donde aparecen los correos de recuperación.

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Redirige a `/es` (idioma por defecto) |
| `/{idioma}` | Bitácora pública: hero, entradas, acerca de |
| `/{idioma}/login` | Entrar con usuario y contraseña |
| `/{idioma}/register` | Crear cuenta: usuario, correo y contraseña |
| `/{idioma}/forgot-password` | Pedir el enlace de recuperación por correo |
| `/{idioma}/reset-password?token=…` | Destino del enlace del correo: elegir contraseña nueva |
| `/{idioma}/account` | Zona privada: lo que devuelve `GET /api/me` + cerrar sesión |

`{idioma}` es `es`, `en` o `pt`; cualquier otro devuelve 404 (`dynamicParams = false`). Los segmentos de ruta están en inglés en los tres idiomas: traducirlos exigiría un mapa de rutas por idioma sin ganar nada.

Con sesión abierta, `login`, `register` y `forgot-password` redirigen a `/{idioma}/account`. Sin sesión, `account` redirige a `login`.

## Autenticación

El navegador **nunca** ve el token ni llama a Spring:

1. El formulario envía los datos a un **Server Action** (`app/actions/auth.ts`), que corre en el proceso de Next.
2. La acción llama a la API, recibe el JWT y lo guarda en la cookie `bitacora_session` con `httpOnly`, `sameSite=lax` y `maxAge` igual a la vida del token. Ningún script de la página puede leerla — que es exactamente lo que no ofrece `localStorage`. El atributo `secure` se activa en builds de producción; Next lo omite cuando la conexión es http en claro, así que en despliegue real el sitio debe ir por https.
3. Las páginas privadas leen la cookie en el servidor y llaman a la API con `Authorization: Bearer …`.

Como quien llama a la API es Node y no el navegador, **no hace falta CORS** en el backend.

Cerrar sesión borra la cookie. El token sigue siendo válido en el servidor hasta que caduca: una sesión sin estado no se puede revocar.

Los errores llegan como códigos (`BAD_CREDENTIALS`, `EMAIL_TAKEN`, `EXPIRED_TOKEN`…) y el front los traduce con sus propias claves: la API no tiene i18n.

## Validación de los formularios

Las reglas viven una sola vez, en `lib/validation.ts`, y las usan los dos lados:

- **En el navegador** (`lib/useValidatedForm.ts`, en entrar y crear cuenta): el campo se valida al salir de él y en cada tecla una vez que ya falló, y un envío inválido no llega a salir. Es comodidad; se desactiva apagando JavaScript.
- **En el servidor** (`app/actions/auth.ts`): la acción vuelve a validarlo todo antes de llamar a la API. Aquí se decide.

Sin JavaScript los formularios siguen funcionando: React deja los campos ocultos que hacen falta, la acción se ejecuta con el envío normal del navegador y los mismos mensajes se pintan bajo las casillas.

Entrar solo comprueba que los campos vengan llenos. Exigir ahí el formato de usuario publicaría cómo son los nombres válidos y rechazaría cuentas anteriores a esa regla.

`confirmPassword` no viaja a la API: la segunda casilla es una ayuda contra erratas, así que se comprueba donde se escribe.

## Estructura

```
front-react-project/
├── .env.example             # API_BASE_URL (sin NEXT_PUBLIC_: es solo del servidor)
├── next.config.ts           # redirección / -> /es
├── app/
│   ├── globals.css          # import de Tailwind + tokens del diseño (@theme)
│   ├── actions/auth.ts      # Server Actions: login, register, forgot, reset, logout
│   └── [locale]/
│       ├── layout.tsx       # layout raíz: <html lang>, fuentes, metadata
│       ├── page.tsx         # bitácora pública (estática)
│       ├── login/, register/, forgot-password/, reset-password/, account/
├── components/
│   ├── PublicNav.tsx        # marca + acceso + selector de idioma
│   ├── LanguageSwitcher.tsx # dropdown (cliente): cambia el segmento de idioma
│   ├── PostCard.tsx         # tarjeta de entrada
│   └── auth/                # AuthCard, Field, FormError, SubmitButton + los 4 formularios
├── lib/
│   ├── api.ts               # cliente de la API (solo servidor) + tipos de respuesta
│   ├── session.ts           # cookie de sesión: crear, leer, borrar
│   ├── validation.ts        # reglas de los campos, espejo del backend
│   ├── useValidatedForm.ts  # las mismas reglas en el navegador (blur, envío)
│   ├── i18n.ts              # idiomas, diccionarios, formato de fechas
│   └── posts.ts             # entradas de la bitácora (estáticas)
└── messages/                # es.json · en.json · pt.json
```

El layout raíz vive **dentro** de `[locale]` porque `<html lang>` cambia con el idioma y solo el layout raíz puede emitir la etiqueta `<html>`. Por eso la raíz `/` se resuelve con una redirección en `next.config.ts` y no con una página.

`PublicNav` no lee la cookie a propósito: hacerlo convertiría la bitácora prerenderizada en una página dinámica.

## i18n

- Idiomas: `es` (por defecto), `en`, `pt`. Las claves originales vienen de los `messages*.properties` de Spring, con los mismos nombres; las de autenticación se añadieron bajo `auth.*`.
- Los textos se leen en componentes de servidor: los diccionarios **no** viajan al navegador (los formularios reciben solo el suyo).
- `lib/i18n.ts` toma el bundle español como referencia: si `en.json` o `pt.json` pierden una clave, el proyecto no compila.
- Las fechas se localizan con `Intl.DateTimeFormat` (`18 jul 2026` · `Jul 18, 2026` · `18 de jul. de 2026`).

## Estilos

Tailwind v4 se configura desde CSS. Los tokens del diseño original (marca, degradados del hero y de los banners, superficie) viven en el bloque `@theme` de `app/globals.css` y generan sus utilidades: `bg-brand`, `from-hero-1`, `to-accent-2`, etc. Las pantallas de autenticación reutilizan esos mismos tokens. No hay Bootstrap ni CSS por componente.

## Entradas de la bitácora

`lib/posts.ts` contiene las entradas. La forma del objeto es la que tendrá `GET /api/posts` en el backend, así que migrar a la API cambia el origen del array y nada más.

## Siguiente paso

Sustituir las entradas estáticas por `GET /api/posts` y añadir la zona de administración (`ROLE_ADMIN`) contra `/api/admin/**`.
