# Bitácora del curso — Frontend

Front de la **bitácora del curso** en **Next.js 16** (App Router). Es la única capa HTML del proyecto: el backend Spring (`springboot_java_project/`, repositorio hermano) quedó como **API REST pura** y no sirve vistas.

Hoy el contenido es **estático**: la página pública se renderiza en build, sin llamar a la API. El consumo de la API (login, zona privada) llega con la autenticación JWT del backend.

## Stack

| Pieza | Detalle |
|---|---|
| Framework | Next.js 16.2 (App Router) + React 19 |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind v4 (configuración en CSS, sin `tailwind.config.js`) |
| Iconos | `react-icons/bs` — el set de Bootstrap Icons, como componentes SVG |
| i18n | Diccionarios JSON propios + rutas por idioma |

## Puesta en marcha

```bash
npm install
npm run dev     # http://localhost:3000 -> redirige a /es
npm run build   # genera /es, /en y /pt como HTML estático
npm start       # sirve el build
npm run lint
```

No requiere el backend levantado.

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Redirige a `/es` (idioma por defecto) |
| `/es`, `/en`, `/pt` | Bitácora pública: hero, entradas, acerca de |

Cualquier otro idioma devuelve 404 (`dynamicParams = false`).

## Estructura

```
front-react-project/
├── next.config.ts           # redirección / -> /es
├── app/
│   ├── globals.css          # import de Tailwind + tokens del diseño (@theme)
│   └── [locale]/
│       ├── layout.tsx       # layout raíz: <html lang>, fuentes, metadata
│       └── page.tsx         # bitácora pública
├── components/
│   ├── PublicNav.tsx        # marca + selector de idioma
│   ├── LanguageSwitcher.tsx # dropdown (cliente): cambia el segmento de idioma
│   └── PostCard.tsx         # tarjeta de entrada
├── lib/
│   ├── i18n.ts              # idiomas, diccionarios, formato de fechas
│   └── posts.ts             # entradas de la bitácora (estáticas)
└── messages/                # es.json · en.json · pt.json
```

El layout raíz vive **dentro** de `[locale]` porque `<html lang>` cambia con el idioma y solo el layout raíz puede emitir la etiqueta `<html>`. Por eso la raíz `/` se resuelve con una redirección en `next.config.ts` y no con una página.

## i18n

- Idiomas: `es` (por defecto), `en`, `pt`. Las 53 claves vienen de los `messages*.properties` de Spring, con los mismos nombres.
- Los textos se leen en componentes de servidor: los diccionarios **no** viajan al navegador.
- `lib/i18n.ts` toma el bundle español como referencia: si `en.json` o `pt.json` pierden una clave, el proyecto no compila.
- Las fechas se localizan con `Intl.DateTimeFormat` (`18 jul 2026` · `Jul 18, 2026` · `18 de jul. de 2026`).

## Estilos

Tailwind v4 se configura desde CSS. Los tokens del diseño original (marca, degradados del hero y de los banners, superficie) viven en el bloque `@theme` de `app/globals.css` y generan sus utilidades: `bg-brand`, `from-hero-1`, `to-accent-2`, etc. No hay Bootstrap ni CSS por componente.

## Entradas de la bitácora

`lib/posts.ts` contiene las entradas. La forma del objeto es la que tendrá `GET /api/posts` en el backend, así que migrar a la API cambia el origen del array y nada más.

## Siguiente paso

Login y zona privada (`user`/`admin`) contra la API JWT del backend. Depende de que el backend publique `POST /api/auth/login`.
