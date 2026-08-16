# Bitácora del curso — Frontend

Front de la **bitácora del curso** en **Next.js 16** (App Router). Es la única capa HTML del proyecto: el backend Spring (`springboot_java_project/`, repositorio hermano) es una **API REST pura** y no sirve vistas.

Las entradas de la bitácora son **estáticas** —viven en el código, no en la API—, pero todas las páginas se **renderizan por petición**: la barra común lee la cookie de sesión para rotular el botón de acceso con el nombre de quien entró, y eso descarta el prerenderizado. Las pantallas de autenticación, la cuenta, la zona de administración y el cierre del pedido **sí** hablan con la API. El simulador de tienda habla con una API pública de terceros, no con la nuestra; el carrito no habla con ninguna, porque vive en una cookie.

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
npm run build                  # compila; las páginas se sirven por petición
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
| `/{idioma}/admin` | Zona de administración: solo con `ROLE_ADMIN`; con otro rol, aviso y enlace a `account` |
| `/{idioma}/store` | Simulador de tienda: rejilla de productos con los filtros en la URL |
| `/{idioma}/store/{id}` | Ficha de un producto |
| `/{idioma}/cart` | Carrito: líneas, cantidades y total. No necesita sesión |
| `/{idioma}/checkout` | Datos de envío; sin sesión, panel de acceso en lugar del formulario |
| `/{idioma}/checkout/success?order=N` | Recibo del pedido, releído de la API |

`{idioma}` es `es`, `en` o `pt`; cualquier otro devuelve 404 (`dynamicParams = false` en el layout). El `{id}` de la tienda vuelve a abrirlo (`dynamicParams = true`): el catálogo lo llena un tercero, así que no hay lista de ids que prerenderizar. Los segmentos de ruta están en inglés en los tres idiomas: traducirlos exigiría un mapa de rutas por idioma sin ganar nada.

Con sesión abierta, `login`, `register` y `forgot-password` redirigen a `/{idioma}/account`. Sin sesión, `account` y `admin` redirigen a `login`.

`admin` decide con los roles que devuelve `GET /api/me`, no con el JWT leído en el front: quién eres lo sigue diciendo Spring. Un rol sin `ROLE_ADMIN` recibe el aviso y un enlace a `account`, nunca una redirección automática. El enlace a `admin` está en `account` y se ofrece con cualquier rol, a propósito: pulsarlo como `user` es la forma de ver la restricción funcionando. Aviso de alcance: mientras la página no muestre datos, esta comprobación es de renderizado, no de acceso; el día que muestre algo real tiene que apoyarse en un endpoint `/api/admin/**` que la API rechace.

## Autenticación

El navegador **nunca** ve el token ni llama a Spring:

1. El formulario envía los datos a un **Server Action** (`app/actions/auth.ts`), que corre en el proceso de Next.
2. La acción llama a la API, recibe el JWT y lo guarda en la cookie `bitacora_session` con `httpOnly`, `sameSite=lax` y `maxAge` igual a la vida del token. Ningún script de la página puede leerla — que es exactamente lo que no ofrece `localStorage`. El atributo `secure` se activa en builds de producción; Next lo omite cuando la conexión es http en claro, así que en despliegue real el sitio debe ir por https.
3. Las páginas privadas leen la cookie en el servidor y llaman a la API con `Authorization: Bearer …`.

Como quien llama a la API es Node y no el navegador, **no hace falta CORS** en el backend.

Cerrar sesión borra la cookie. El token sigue siendo válido en el servidor hasta que caduca: una sesión sin estado no se puede revocar.

Los errores llegan como códigos (`BAD_CREDENTIALS`, `EMAIL_TAKEN`, `EXPIRED_TOKEN`…) y el front los traduce con sus propias claves: la API no tiene i18n.

## Simulador de tienda

`/{idioma}/store` es un escaparate de solo lectura contra la [Platzi Fake Store](https://api.escuelajs.co), una API pública de ejemplo. **No toca el backend de Spring** ni la sesión: es otro consumidor de otra API que resulta que se pinta en la misma app. Su cliente vive aparte, en `lib/store-api.ts`, porque quiere justo lo contrario que `lib/api.ts`: aquél no cachea nada porque lleva credenciales, éste cachea 60 s porque el catálogo es igual para todo el mundo.

**Los filtros viven en la URL** — `?category=clothes&q=hoodie&min=10&max=100&page=2` — y se resuelven en el servidor, como el resto de la app. El formulario es un `<form method="get">` que apunta a su propia ruta: enviarlo **es** la navegación. No hay un solo componente de cliente, así que funciona con JavaScript apagado, el enlace se puede compartir y el botón de atrás hace lo que debe. Y como `page` no es un campo del formulario, cambiar un filtro vuelve a la página 1 gratis. El precio es un salto de página completo por filtro aplicado, aceptable para un catálogo.

La API tiene cuatro rarezas que la implementación tiene en cuenta:

| Lo que hace la API | Lo que hace el front |
|---|---|
| Los parámetros solo se aplican **por parejas** (`price_min` suelto se ignora, igual que `offset` sin `limit`) | Los extremos del precio viajan los dos o ninguno; rellenar solo uno completa el otro |
| `price_min=0` es *falsy* en el servidor y anula el filtro | El suelo del precio es **1**; ningún producto cuesta 0 |
| No hay total: la respuesta es un array pelado, sin `X-Total-Count` | **Anterior/siguiente**, sin números de página. Se piden 13 productos y se pintan 12: el sobrante responde a "¿hay más?" |
| Un id inexistente responde **400** con `EntityNotFoundError`, no 404 | `getProduct` devuelve `null` y la ficha pinta "producto no encontrado" |

Cualquier cosa ininteligible en la query string (`?min=abc`, `?page=-4`) se trata como ausente en vez de reenviarla: la API responde 400 a un precio que no es un número.

**El catálogo está sucio y el diseño lo asume.** Es un sandbox donde cualquiera puede publicar: hoy hay ~100 categorías de las que solo 5 son las de la semilla, productos llamados `phone_17856480419` e imágenes que no son URLs. Por eso el desplegable enseña solo `?limit=5` (las cinco categorías reales, ids 1–5 — el coste es que una categoría nueva y legítima tampoco aparecería) y por eso las imágenes pasan por un saneador que descarta lo que no empiece por `http` y pinta un hueco en su lugar. Tampoco se usa `next/image`: exige declarar los dominios permitidos en `next.config.ts`, y los de un sandbox abierto no son una lista fija.

**Los textos de los productos se quedan en inglés.** La chrome (`store.*`) sí está traducida, pero el catálogo no es nuestro y la API no tiene i18n. La página lo dice, para que `/pt` con nombres en inglés se lea como una decisión y no como un olvido. Los precios sí se localizan (`6911 US$` · `$6,911` · `US$ 6.911`).

Si la API no contesta —vive en un dyno gratuito que se duerme— cada llamada corta a los 8 s y la página muestra un aviso en lugar de una traza.

## Carrito y pedidos

El carrito **no es un recurso del backend**: es un borrador que pertenece a este navegador. Vive en la cookie `bitacora_cart` —`httpOnly`, `sameSite=lax`, 7 días, `secure` en producción, la misma forma que la de sesión— y no llega a Spring hasta que es un pedido cerrado. Así la API no guarda un estado a medias que nadie consulta, y un visitante anónimo puede llenar el carrito y tener que identificarse solo al final.

**Guarda una copia del producto, no su id**: `productId`, título, precio, imagen y cantidad — los mismos cinco campos que `order_item` congela en el backend. El catálogo es un sandbox que cualquiera puede reescribir, y un carrito que lo releyera cambiaría sus propios precios entre la rejilla y el checkout. De regalo, `/cart` se pinta sin una sola llamada a la tienda.

| Límite | Valor | Por qué |
|---|---|---|
| Productos distintos | **10** | Todos los navegadores cortan la cookie sobre los 4 KB y la que se pasa no da error: se pierde en silencio. El undécimo se rechaza con un aviso |
| Cantidad por producto | **99** | El mismo `@Max(99)` del backend |
| Tamaño de la cookie | **3500 bytes** | Margen bajo el tope del navegador |

Los nombres de los campos son de una letra (`{i,t,p,q,m}`). No es optimización prematura: es la diferencia entre que quepan seis productos o diez.

**Los controles son `<form>` de servidor con campos ocultos** —añadir, cambiar cantidad, quitar, vaciar—, así que enviar *es* la interacción y todo funciona con JavaScript apagado, igual que los filtros de la tienda. El único componente de cliente del flujo es el formulario de envío, porque los errores por campo tienen que volver a pintarse bajo su casilla; es el mismo patrón que los formularios de autenticación. El aviso de "carrito lleno" viaja en la query (`?cart=full`): un formulario de servidor no puede devolverle estado a la página que lo pintó.

Cerrar el pedido llama a `POST /api/orders` con el token de la cookie, borra el carrito y redirige a `/{idioma}/checkout/success?order=N`. **La redirección lleva solo el id**: la pantalla de confirmación vuelve a pedir el pedido con `GET /api/orders/{id}`, así que recargarla enseña el pedido de verdad y el id de un extraño responde 404 —la propiedad la comprueba Spring— en vez de pintar el recibo de otro. El correo de confirmación sale en el idioma de la URL desde la que se pidió.

`httpOnly` frena a los scripts, no al usuario ni a un proxy: **todo lo que sale de la cookie se vuelve a validar** en la acción, y detrás vuelve a validar la API. El precio unitario que viaja es el que la API se cree — ese agujero es del backend y está documentado en su README; aquí no se ensancha ni se puede cerrar.

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
│   ├── actions/cart.ts      # Server Actions: añadir, cantidad, quitar, vaciar, pedir
│   └── [locale]/
│       ├── layout.tsx       # layout raíz: <html lang>, fuentes, metadata
│       ├── page.tsx         # bitácora pública (entradas estáticas)
│       ├── login/, register/, forgot-password/, reset-password/, account/
│       ├── admin/            # zona restringida a ROLE_ADMIN
│       ├── store/           # rejilla con filtros + [id]/ con la ficha
│       ├── cart/            # el carrito
│       └── checkout/        # datos de envío + success/ con el recibo
├── components/
│   ├── PublicNav.tsx        # marca + tienda + carrito + acceso + idioma
│   ├── LanguageSwitcher.tsx # dropdown (cliente): cambia el segmento de idioma
│   ├── PostCard.tsx         # tarjeta de entrada
│   ├── auth/                # AuthCard, Field, FormError, SubmitButton + los 4 formularios
│   ├── cart/                # AddToCartForm, CartLineRow, CartSummary, CheckoutForm
│   └── store/               # StoreFilters, ProductCard, ProductImage, Pagination
├── lib/
│   ├── api.ts               # cliente de la API de Spring (solo servidor) + tipos
│   ├── cart.ts              # cookie del carrito: leer, escribir, límites, totales
│   ├── store-api.ts         # cliente de la Platzi Fake Store: tipos, query, saneado
│   ├── session.ts           # cookie de sesión: crear, leer (exp + sub), borrar
│   ├── validation.ts        # reglas de los campos, espejo del backend
│   ├── useValidatedForm.ts  # las mismas reglas en el navegador (blur, envío)
│   ├── i18n.ts              # idiomas, diccionarios, formato de fechas y precios
│   └── posts.ts             # entradas de la bitácora (estáticas)
└── messages/                # es.json · en.json · pt.json
```

El layout raíz vive **dentro** de `[locale]` porque `<html lang>` cambia con el idioma y solo el layout raíz puede emitir la etiqueta `<html>`. Por eso la raíz `/` se resuelve con una redirección en `next.config.ts` y no con una página.

`PublicNav` lee la cookie de sesión: con sesión abierta el botón de acceso muestra el nombre del claim `sub` del token y apunta a `account`; sin ella, el texto de entrar y `login`. No hay llamada a la API para saber el nombre, porque el token ya está en la cookie, y de ese valor no cuelga ningún permiso: es un rótulo. A cambio, ninguna página con la barra se prerenderiza — la bitácora incluida. El enlace a `admin` sigue en `account`, para no llenar la barra de rutas privadas.

## i18n

- Idiomas: `es` (por defecto), `en`, `pt`. Las claves originales vienen de los `messages*.properties` de Spring, con los mismos nombres; las de autenticación se añadieron bajo `auth.*`, las de la tienda bajo `store.*` y las del carrito bajo `cart.*`, `checkout.*` y `order.status.*`.
- Los textos se leen en componentes de servidor: los diccionarios **no** viajan al navegador (los formularios reciben solo el suyo).
- `lib/i18n.ts` toma el bundle español como referencia: si `en.json` o `pt.json` pierden una clave, el proyecto no compila.
- Las fechas se localizan con `Intl.DateTimeFormat` (`18 jul 2026` · `Jul 18, 2026` · `18 de jul. de 2026`) y los precios con `Intl.NumberFormat` (`6911 US$` · `$6,911` · `US$ 6.911`).
- Lo que llega de una API ajena no se traduce: los nombres y descripciones del catálogo se quedan en inglés, y la página lo dice.

## Estilos

Tailwind v4 se configura desde CSS. Los tokens del diseño original (marca, degradados del hero y de los banners, superficie) viven en el bloque `@theme` de `app/globals.css` y generan sus utilidades: `bg-brand`, `from-hero-1`, `to-accent-2`, etc. Las pantallas de autenticación reutilizan esos mismos tokens. No hay Bootstrap ni CSS por componente.

## Entradas de la bitácora

`lib/posts.ts` contiene las entradas. La forma del objeto es la que tendrá `GET /api/posts` en el backend, así que migrar a la API cambia el origen del array y nada más.

## Siguiente paso

Sustituir las entradas estáticas por `GET /api/posts`, y dar contenido real a `admin` contra `/api/admin/**` — hoy la ruta existe y restringe el renderizado, pero detrás no hay ningún endpoint que la API proteja.
