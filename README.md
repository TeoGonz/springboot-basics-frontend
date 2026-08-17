# Bitácora del curso — Frontend

Front de la **bitácora del curso** en **Next.js 16** (App Router). Es la única capa HTML del proyecto: el backend Spring (`springboot_java_project/`, repositorio hermano) es una **API REST pura** y no sirve vistas.

Las entradas de la bitácora son **estáticas** —viven en el código, no en la API—, pero todas las páginas se **renderizan por petición**: la barra común lee la cookie de sesión para rotular el botón de acceso con el nombre de quien entró, y eso descarta el prerenderizado. Las pantallas de autenticación, la cuenta, la zona de administración, el cierre del pedido y el seguimiento **sí** hablan con la API. El simulador de tienda habla con una API pública de terceros, no con la nuestra; el carrito no habla con ninguna, porque vive en una cookie.

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
| `/{idioma}/admin/orders` | Todos los pedidos de la tienda, con filtro por estado y el control para moverlos |
| `/{idioma}/store` | Simulador de tienda: rejilla de productos con los filtros en la URL |
| `/{idioma}/store/{id}` | Ficha de un producto |
| `/{idioma}/cart` | Carrito: líneas, cantidades y total. No necesita sesión |
| `/{idioma}/checkout` | Datos de envío; sin sesión, panel de acceso en lugar del formulario |
| `/{idioma}/checkout/success?order=N` | Recibo del pedido, releído de la API |
| `/{idioma}/orders` | Mis pedidos, del más nuevo al más viejo; sin sesión, panel de acceso |
| `/{idioma}/orders/{id}` | Seguimiento de un pedido: mapa de estado, envío y líneas |
| `/api/orders/{id}/stream` | No es una pantalla: el proxy del stream de estado. Sin idioma, porque no lleva prosa |

`{idioma}` es `es`, `en` o `pt`; cualquier otro devuelve 404 (`dynamicParams = false` en el layout). El `{id}` de la tienda vuelve a abrirlo (`dynamicParams = true`): el catálogo lo llena un tercero, así que no hay lista de ids que prerenderizar. Los segmentos de ruta están en inglés en los tres idiomas: traducirlos exigiría un mapa de rutas por idioma sin ganar nada. `/api/...` se queda fuera de `[locale]` y no choca con él: en el enrutado de Next un segmento estático gana al dinámico.

Con sesión abierta, `login`, `register` y `forgot-password` redirigen a `/{idioma}/account`. Sin sesión, `account` y `admin` redirigen a `login`.

`admin` decide con los roles que devuelve `GET /api/me`, no con el JWT leído en el front: quién eres lo sigue diciendo Spring. Un rol sin `ROLE_ADMIN` recibe el aviso y un enlace a `account`, nunca una redirección automática. El enlace a `admin` está en `account` y se ofrece con cualquier rol, a propósito: pulsarlo como `user` es la forma de ver la restricción funcionando. Aviso de alcance: mientras la página no muestre datos, esta comprobación es de renderizado, no de acceso; el día que muestre algo real tiene que apoyarse en un endpoint `/api/admin/**` que la API rechace.

## Autenticación

El navegador **nunca** ve el token ni llama a Spring:

1. El formulario envía los datos a un **Server Action** (`app/actions/auth.ts`), que corre en el proceso de Next.
2. La acción llama a la API, recibe el JWT y lo guarda en la cookie `bitacora_session` con `httpOnly`, `sameSite=lax` y `maxAge` igual a la vida del token. Ningún script de la página puede leerla — que es exactamente lo que no ofrece `localStorage`. El atributo `secure` se activa en builds de producción; Next lo omite cuando la conexión es http en claro, así que en despliegue real el sitio debe ir por https.
3. Las páginas privadas leen la cookie en el servidor y llaman a la API con `Authorization: Bearer …`.

Como quien llama a la API es Node y no el navegador, **no hace falta CORS** en el backend. La única petición que el navegador hace por su cuenta es el stream de seguimiento (`/api/orders/{id}/stream`), y va a una ruta de esta misma app que reenvía a Spring desde el servidor: sigue sin salir de aquí ni un token ni una llamada cruzada.

Cerrar sesión borra la cookie. El token sigue siendo válido en el servidor hasta que caduca: una sesión sin estado no se puede revocar.

Los errores llegan como códigos (`BAD_CREDENTIALS`, `EMAIL_TAKEN`, `EXPIRED_TOKEN`…) y el front los traduce con sus propias claves: la API no tiene i18n.

## Simulador de tienda

`/{idioma}/store` es un escaparate de solo lectura contra [DummyJSON](https://dummyjson.com), una API pública de ejemplo. **No toca el backend de Spring** ni la sesión: es otro consumidor de otra API que resulta que se pinta en la misma app. Su cliente vive aparte, en `lib/store-api.ts`, porque quiere justo lo contrario que `lib/api.ts`: aquél no cachea nada porque lleva credenciales, éste cachea 300 s porque el catálogo es igual para todo el mundo.

**Los filtros viven en la URL** — `?category=mens-watches&q=watch&min=100&max=1000&page=2` — y se resuelven en el servidor, como el resto de la app. El formulario es un `<form method="get">` que apunta a su propia ruta: enviarlo **es** la navegación. No hay un solo componente de cliente, así que funciona con JavaScript apagado, el enlace se puede compartir y el botón de atrás hace lo que debe. Y como `page` no es un campo del formulario, cambiar un filtro vuelve a la página 1 gratis. El precio es un salto de página completo por filtro aplicado, aceptable para un catálogo.

**Los cuatro filtros se aplican aquí, no en la API.** La tienda los combina en AND y la API no sabe hacer eso: no tiene ningún parámetro de precio, y `q` junto a `category` descarta la categoría en silencio. Así que se pide el catálogo entero en una llamada —194 productos, 68 KB porque `select` deja fuera los campos que no se pintan—, se cachea 300 s y se filtra y se pagina en memoria. Abrir una ficha no cuesta ninguna petición extra: sale del mismo catálogo, así que no puede contradecir a la rejilla desde la que se abrió.

Esa decisión **tiene fecha de caducidad y conviene nombrarla**: se sostiene porque el catálogo es pequeño y fijo. Uno de varios miles de productos le da la vuelta al cálculo, y entonces el filtrado vuelve al servidor de la API aceptando que los filtros dejen de combinarse.

Cualquier cosa ininteligible en la query string (`?min=abc`, `?page=-4`, `?category=noexiste`) se trata como ausente. La categoría se valida contra la lista real antes de aplicarse, así que una inventada devuelve el catálogo completo en lugar de una rejilla vacía.

La paginación es **anterior/siguiente**, sin números de página: la respuesta trae un `total` que los haría posibles, pero numerar es una pantalla distinta, no una adaptación.

Las imágenes pasan por un saneador que descarta lo que no empiece por `http`. Hoy todas viven en `cdn.dummyjson.com` y el guardia parece de sobra; se queda porque también pinta las URLs congeladas en pedidos viejos, que son de cuando el catálogo era otro. Tampoco se usa `next/image`: exige declarar los dominios permitidos en `next.config.ts`.

**Los textos de los productos se quedan en inglés.** La chrome (`store.*`) sí está traducida, pero el catálogo no es nuestro y la API no tiene i18n. La página lo dice, para que `/pt` con nombres en inglés se lea como una decisión y no como un olvido. Los precios sí se localizan, **siempre con céntimos** (`1.499,99 US$` · `$1,499.99`): el catálogo los trae, y redondear a unidades enseñaría un `3 × 9.99 = 30 US$` contra un total real de `29,97`.

Si la API no contesta, cada llamada corta a los 8 s y la página muestra un aviso en lugar de una traza.

## Carrito y pedidos

El carrito **no es un recurso del backend**: es un borrador que pertenece a este navegador. Vive en la cookie `bitacora_cart` —`httpOnly`, `sameSite=lax`, 7 días, `secure` en producción, la misma forma que la de sesión— y no llega a Spring hasta que es un pedido cerrado. Así la API no guarda un estado a medias que nadie consulta, y un visitante anónimo puede llenar el carrito y tener que identificarse solo al final.

**Guarda una copia del producto, no su id**: `productId`, título, precio, imagen y cantidad — los mismos cinco campos que `order_item` congela en el backend. El catálogo es de un tercero que puede reescribirlo cuando quiera, y un carrito que lo releyera cambiaría sus propios precios entre la rejilla y el checkout. De regalo, `/cart` se pinta sin una sola llamada a la tienda.

| Límite | Valor | Por qué |
|---|---|---|
| Productos distintos | **10** | Todos los navegadores cortan la cookie sobre los 4 KB y la que se pasa no da error: se pierde en silencio. El undécimo se rechaza con un aviso |
| Cantidad por producto | **99** | El mismo `@Max(99)` del backend |
| Tamaño de la cookie | **3500 bytes** | Margen bajo el tope del navegador |

Los nombres de los campos son de una letra (`{i,t,p,q,m}`). No es optimización prematura: es la diferencia entre que quepan seis productos o diez.

**Los controles son `<form>` de servidor con campos ocultos** —añadir, cambiar cantidad, quitar, vaciar—, así que enviar *es* la interacción y todo funciona con JavaScript apagado, igual que los filtros de la tienda. Dos piezas del flujo son de cliente: el formulario de envío, porque los errores por campo tienen que volver a pintarse bajo su casilla —el mismo patrón que los formularios de autenticación—, y la casilla de cantidad, que **se guarda sola**: envía medio segundo después de la última tecla, porque sin esa espera escribir `12` mandaría dos peticiones y la primera guardaría `1`. Un campo vacío no se envía; borrar el producto lo sigue pidiendo el `0`. Su botón «Actualizar» se pinta en el servidor y solo desaparece cuando el componente ha montado, que es la prueba de que el envío automático puede funcionar: sin JavaScript el botón se queda y la cantidad se cambia con él. El aviso de "carrito lleno" viaja en la query (`?cart=full`): un formulario de servidor no puede devolverle estado a la página que lo pintó.

Cerrar el pedido llama a `POST /api/orders` con el token de la cookie, borra el carrito y redirige a `/{idioma}/checkout/success?order=N`. **La redirección lleva solo el id**: la pantalla de confirmación vuelve a pedir el pedido con `GET /api/orders/{id}`, así que recargarla enseña el pedido de verdad y el id de un extraño responde 404 —la propiedad la comprueba Spring— en vez de pintar el recibo de otro. El correo de confirmación sale en el idioma de la URL desde la que se pidió.

`httpOnly` frena a los scripts, no al usuario ni a un proxy: **todo lo que sale de la cookie se vuelve a validar** en la acción, y detrás vuelve a validar la API. El precio unitario que viaja es el que la API se cree — ese agujero es del backend y está documentado en su README; aquí no se ensancha ni se puede cerrar.

## Seguimiento de pedidos

`/{idioma}/orders` y `/{idioma}/orders/{id}` son **solo lectura**: leen `GET /api/orders` y `GET /api/orders/{id}` con el token de la cookie y pintan lo que llega. No hay cancelar, repetir ni editar la dirección — no son requisitos y no hay endpoint detrás.

El detalle enseña el **mapa de estado**: tres pasos (`PREPARING` · `SHIPPED` · `DELIVERED`) en un `<ol>` con tres estados por paso —hecho, actual, pendiente—, el actual marcado con `aria-current="step"` y cada estado escrito además del color. La traducción del estado vive aquí, bajo `order.status.*`: la API contesta `"SHIPPED"`, como todo lo que devuelve. Un estado que este front no conozca deja los tres pasos pendientes y enseña el código crudo, en vez de romperse: la API puede ganar uno antes de que el front se entere.

**El mapa se mueve solo.** Cuando un administrador cambia el estado, la pantalla del cliente lo refleja en el momento, sin recargar: el detalle abre un `EventSource` contra `/api/orders/{id}/stream` y repinta el mapa, la fecha del último movimiento y la etiqueta de la cabecera. Nada de sondeo — un temporizador cada tres segundos son 1.200 peticiones por hora y por pestaña, casi todas contestando que no ha pasado nada, y la novedad llegaría igualmente tarde.

Ese `/api/orders/{id}/stream` es un **route handler de Next**, no el endpoint de Spring. Es el único sitio donde el navegador llama a algo de esta app por su cuenta, y sigue sin hablar con la API: el handler corre en Node, lee la cookie de sesión y abre el stream del backend con el token. No es un rodeo, es la única forma. `EventSource` acepta una URL y nada más —no hay manera de ponerle una cabecera `Authorization`— y el token vive en una cookie `httpOnly` que ningún script puede leer. Las salidas serían meter el token en la query, donde queda escrito en cada log de acceso y en el historial, o abrir la API al navegador y con ella el CORS que este proyecto no tiene por decisión. Un Server Action tampoco vale: contesta una vez y termina, y esto es una conexión que se queda abierta.

El handler no decide nada sobre permisos. Reenvía la petición con el token y contesta Spring: un pedido ajeno responde el mismo `404` de siempre, y sin sesión el handler devuelve `401` sin redirigir —un `EventSource` no sigue una redirección a una pantalla de acceso de forma útil—.

**Es una mejora, no un requisito.** El componente en vivo se renderiza también en el servidor, así que con JavaScript apagado la página es exactamente la de antes: el mismo mapa, la misma fecha y la nota de recargar. La nota es lo único que cambia — pasa a «En vivo» cuando la conexión está abierta y vuelve a pedir que se recargue si se cae del todo. El mapa **nunca retrocede**: un evento que no vaya por delante de lo que hay en pantalla se ignora. Y `DELIVERED` cierra la conexión desde el navegador, porque el backend también termina el stream ahí y las dos partes tienen que estar de acuerdo: si solo colgase el servidor, `EventSource` reconectaría sola cada pocos segundos para recibir siempre la misma noticia.

Las líneas salen del pedido, **nunca del catálogo**: por eso el backend guardó una copia. Un producto renombrado o borrado en DummyJSON no reescribe lo que el cliente compró.

La propiedad la comprueba Spring, no esta página. Un pedido ajeno responde `404`, igual que uno inexistente, y las dos cosas se pintan iguales: distinguirlas confirmaría qué ids existen. Ese "no encontrado" se pinta **dentro** de la página —no con `notFound()`— porque la 404 de Next vive fuera del layout de idioma y perdería la barra y el idioma. Si el token de la cookie sigue ahí pero la API lo rechaza, sale el mismo aviso de sesión caducada que `account`, con el botón de cerrar sesión: redirigir a `login` con la cookie puesta sería un bucle.

## Administración de pedidos

`/{idioma}/admin/orders` es la pantalla de operación: una **tabla** —número, cliente, fecha, estado, líneas, total y el control— porque un operador repasa filas; las tarjetas sirven para pasear por un catálogo, no para trabajar. Enseña el `username` y **nunca el correo**: la API no lo manda y esta página no lo pide.

**La barrera es la API, no la página.** El `if` de rol de `admin` decide qué se pinta y nada más; quien falsifique una cookie ve el armazón. Aquí no hay comprobación propia: se llama a `GET /api/admin/orders` con el token y contesta Spring. Un `403` se pinta como denegación —que es la denegación de verdad, no una imitación—, un `401` saca el aviso de sesión caducada y sin cookie sale el panel de acceso. Las dos capas existen y ninguna sobra: una evita enseñar una pantalla que no va a funcionar, la otra decide qué datos hay.

El control es un `<select>` que **solo ofrece lo que la API va a aceptar**. El enum avanza y puede saltarse un paso, pero nunca retrocede ni repite el actual, así que un pedido entregado no lleva formulario: la ausencia del control *es* la información. Aun así la acción vuelve a validar el id y el estado, porque los dos llegan de un campo oculto y un desplegable, es decir, del navegador.

Un cambio rechazado se cuenta, no se reintenta. `409 INVALID_STATUS_TRANSITION` es lo que produce un doble clic o una pestaña vieja, y reintentarlo le mandaría al cliente un segundo correo diciendo lo mismo. El resultado viaja en la query (`?error=CÓDIGO`), como el aviso de carrito lleno: un `<form>` de servidor no puede devolverle estado a la página que lo pintó, y hacerlo con `useActionState` convertiría la tabla en un componente de cliente.

El filtro es `<form method="get">` con `?status=`, igual que los de la tienda: la URL guarda el estado, el botón de atrás funciona y el enlace se comparte. Un `?status=` que no sea uno de los tres se trata como ausente en vez de reenviarse a la API, que contestaría `400` por una URL mal escrita. **No hay paginación** porque la API no pagina; inventar páginas sobre un array completo solo escondería que la lista crece sin freno.

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
│   ├── actions/admin-orders.ts # Server Action: mover un pedido de estado
│   ├── api/orders/[id]/stream/ # route handler: proxy del SSE con el token de la cookie
│   └── [locale]/
│       ├── layout.tsx       # layout raíz: <html lang>, fuentes, metadata
│       ├── page.tsx         # bitácora pública (entradas estáticas)
│       ├── login/, register/, forgot-password/, reset-password/, account/
│       ├── admin/           # zona restringida a ROLE_ADMIN + orders/ con la tabla
│       ├── store/           # rejilla con filtros + [id]/ con la ficha
│       ├── cart/            # el carrito
│       ├── checkout/        # datos de envío + success/ con el recibo
│       └── orders/          # mis pedidos + [id]/ con el seguimiento
├── components/
│   ├── PublicNav.tsx        # marca + tienda + carrito + acceso + idioma
│   ├── LanguageSwitcher.tsx # dropdown (cliente): cambia el segmento de idioma
│   ├── PostCard.tsx         # tarjeta de entrada
│   ├── admin/               # AdminOrderFilters, AdminOrderRow, AdminStatusForm
│   ├── auth/                # AuthCard, Field, FormError, SubmitButton + los 4 formularios
│   ├── cart/                # AddToCartForm, CartLineRow, QuantityInput, CartSummary, CheckoutForm
│   ├── orders/              # OrderCard, OrderStatusBadge, OrderStatusSteps, OrderStatusLive
│   └── store/               # StoreFilters, ProductCard, ProductImage, Pagination
├── lib/
│   ├── api.ts               # cliente de la API de Spring (solo servidor) + tipos
│   ├── cart.ts              # cookie del carrito: leer, escribir, límites, totales
│   ├── store-api.ts         # cliente de DummyJSON: catálogo cacheado, filtros, saneado
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

- Idiomas: `es` (por defecto), `en`, `pt`. Las claves originales vienen de los `messages*.properties` de Spring, con los mismos nombres; las de autenticación se añadieron bajo `auth.*`, las de la tienda bajo `store.*`, las del carrito bajo `cart.*` y `checkout.*`, las de los pedidos bajo `orders.*`, las de administración bajo `admin.orders.*`, y los nombres de los estados bajo `order.status.*`, que comparten el recibo, el seguimiento y la tabla del administrador.
- Los textos se leen en componentes de servidor. Al navegador solo baja el diccionario del idioma que se está viendo, y solo porque lo reciben como prop las pocas piezas de cliente que hay: los formularios y el seguimiento en vivo.
- `lib/i18n.ts` toma el bundle español como referencia: si `en.json` o `pt.json` pierden una clave, el proyecto no compila.
- Las fechas se localizan con `Intl.DateTimeFormat` (`18 jul 2026` · `Jul 18, 2026` · `18 de jul. de 2026`) y los precios con `Intl.NumberFormat`, siempre con céntimos (`6911,00 US$` · `$6,911.00` · `US$ 6.911,00`). Los pedidos llevan fecha **y hora**, porque dos del mismo día se distinguen por ella; el formato lo pone el servidor con su zona horaria. La única excepción son las fechas que llegan por el stream de seguimiento, que se formatean en el navegador porque para entonces no hay servidor al que preguntar; la inicial sí baja formateada, para que el HTML del servidor y el del navegador no discrepen al hidratar.
- Lo que llega de una API ajena no se traduce: los nombres y descripciones del catálogo se quedan en inglés, y la página lo dice.

## Estilos

Tailwind v4 se configura desde CSS. Los tokens del diseño original (marca, degradados del hero y de los banners, superficie) viven en el bloque `@theme` de `app/globals.css` y generan sus utilidades: `bg-brand`, `from-hero-1`, `to-accent-2`, etc. Las pantallas de autenticación reutilizan esos mismos tokens. No hay Bootstrap ni CSS por componente.

## Entradas de la bitácora

`lib/posts.ts` contiene las entradas. La forma del objeto es la que tendrá `GET /api/posts` en el backend, así que migrar a la API cambia el origen del array y nada más.

## Siguiente paso

Sustituir las entradas estáticas por `GET /api/posts`.

La administración de pedidos se queda sin pantalla de detalle: la API no responde un pedido concreto a un administrador. `GET /api/admin/orders` da el resumen —sin líneas ni dirección— y `GET /api/orders/{id}` filtra por propietario dentro de la consulta, así que un administrador que abra el pedido de otro recibe `404`. Cuando el backend añada `GET /api/admin/orders/{id}`, la tabla puede enlazar a un detalle con las líneas, los datos de envío y las dos fechas.
