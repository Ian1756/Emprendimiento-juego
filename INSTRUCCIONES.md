# Juego de Emprendimiento — Especificación e Instrucciones de Desarrollo

> **REGLA #0 — Obligatoria.** Este documento se lee **antes de cada cambio** y se
> actualiza **después de cada cambio** que altere reglas, flujo, datos o seguridad.
> Ningún PR/commit se considera terminado si contradice este archivo sin haberlo
> actualizado primero. Ver [Checklist de cada cambio](#10-checklist-obligatorio-de-cada-cambio).

Última actualización: 2026-07-27 · Estado: implementación inicial completa.

---

## 1. Resumen del producto

Juego web de una sola sesión, tipo *match-3* (estilo Candy Crush), pensado para
activaciones presenciales: la gente escanea un **QR**, entra desde el celular,
juega **90 segundos**, obtiene una "empresa" según su desempeño y se le invita a
conectar con **Emprendimiento Tec CEM**.

Objetivos de negocio, en orden:
1. Captar contactos (nombre + correo) con consentimiento.
2. Generar competencia social (leaderboard Top 5) para que la gente repita y comparta.
3. Convertir: unirse a la comunidad de WhatsApp.

Restricciones de diseño que se derivan de eso:
- **Mobile-first**, vertical, una mano, sin instrucciones largas.
- Tiempo total de la primera sesión ≤ 2 minutos (registro incluido).
- Funciona con conexión mala: la partida corre offline en el cliente; solo el
  registro y el envío de puntaje necesitan red.

---

## 2. Flujo del usuario (canónico)

```
[QR] → /  ──┬── (sin sesión) → Pantalla de Registro (nombre + correo + consentimiento)
            │                          │
            └── (con sesión) ──────────┴──→ Pantalla de Inicio
                                                 │  Top 5 leaderboard
                                                 │  [ JUGAR ]  [ Compartir ]  [ Comunidad WhatsApp ]
                                                 ▼
                                          Partida (90 s)
                                                 ▼
                                          Resultado: tamaño + rubro de empresa
                                                 ▼
                                          Nombrar la empresa
                                                 ▼
                                          CTA: "¿Quieres hacer esto en la vida real?
                                                Conecta con Emprendimiento Tec CEM"
                                                 │
                                                 └──→ volver a Inicio (puede rejugar)
```

### 2.1 Registro (solo la primera vez)
- Campos: **nombre** (2–40 caracteres), **matrícula** y **correo electrónico**.
- La matrícula es obligatoria y debe cumplir `^A0\d{5,9}$` (se acepta `a0…` y se
  normaliza a mayúsculas). Ejemplo: `A01234567`.
- Checkbox **explícito** de aviso de privacidad (no premarcado). Sin él, no se envía.
- Al enviarse correctamente, el servidor crea el jugador y devuelve una **sesión
  persistente** (cookie `HttpOnly`). El usuario **no vuelve a registrarse** en ese
  dispositivo/navegador.
- Si el correo ya existe → se reutiliza el jugador existente (no se duplica, no se
  revela al usuario que "ya existía" con un mensaje distinto; ver §6.6).
- La persistencia es por dispositivo. Si borran cookies, se registran de nuevo:
  eso es aceptable y **no** se resuelve con fingerprinting.

### 2.2 Pantalla de Inicio
- **Top 5** global: posición, nombre público del jugador, puntaje, nombre de su empresa.
- Si el jugador ya jugó, se muestra además su mejor puntaje y su posición aunque
  esté fuera del Top 5 ("Tú: #23 — 4,320").
- Botón primario **JUGAR**.
- Botón **Compartir**: usa `navigator.share()` si existe; si no, copia el enlace al
  portapapeles y muestra confirmación. El enlace compartido es la URL pública del
  juego (la misma del QR).
- Botón **Unirse a la comunidad**: abre el enlace de invitación de WhatsApp en
  pestaña nueva (`target="_blank" rel="noopener noreferrer"`).

### 2.3 Partida
- Tablero **8×8**, 5 colores.
- Duración **90 s** exactos, cronómetro visible; empieza al primer render del
  tablero, no antes.
- Al terminar, la persona tiene **tiempo ilimitado** para nombrar su empresa
  (§4.1, punto 6).
- Mecánica: intercambiar dos fichas **adyacentes**; el movimiento solo es válido si
  produce una línea de **3 o más** del mismo color. Las fichas alineadas explotan,
  las de arriba caen y se rellena desde el techo.
- **Dos formas de mover, ambas válidas:**
  1. **Tocar** una ficha y luego una vecina.
  2. **Arrastrar** una ficha hacia una vecina. Solo cuenta la dirección
     dominante del gesto y solo vecinas ortogonales: nada de diagonales, saltos
     ni soltar fuera del tablero. Mientras se arrastra, la ficha sigue al dedo
     sin easing (manipulación directa) recortada a una celda, y la vecina se
     aparta para adelantar el intercambio.
  - Si el intercambio es imposible, todo vuelve a su sitio y **las dos** fichas
    tambalean. *Cuidado al tocar esto:* el clic sintético que sigue a un
    arrastre debe ignorarse, pero la bandera que lo ignora se limpia al
    **empezar** el gesto siguiente, no al recibir el clic — si un arrastre
    termina fuera de la ficha nunca llega ese clic y la bandera se quedaría
    encendida, tragándose el siguiente toque (bug real del 2026-07-31).
- **Cascadas**: los combos que se forman solos al caer también puntúan, con
  multiplicador creciente.
- No hay estados perdedores; si el tablero se queda sin movimientos posibles, se
  rebaraja automáticamente.

**Puntaje (valores canónicos — cualquier cambio se refleja aquí y en el servidor):**

| Concepto | Valor |
|---|---|
| Ficha eliminada | 10 pts |
| Match de 4 | +30 pts extra |
| Match de 5 o más | +80 pts extra |
| Multiplicador de cascada | ×1, ×1.5, ×2, ×2.5 (tope ×3) |

Se lleva además un **contador por color** de fichas eliminadas: define el rubro.

### 2.4 Los cinco colores

| Color | Concepto | Rubro de empresa que desbloquea |
|---|---|---|
| Azul | **Clientes** | Empresa Comercial / Retail |
| Amarillo | **Ideas** | Empresa de Tecnología e Innovación |
| Verde | **Recursos** | Empresa Sustentable |
| Morado | **Talento** | Empresa Educativa / Consultoría |
| Rojo | **Pasión** | Empresa Social / Comunitaria |

- El rubro lo determina el **color con más fichas eliminadas**.
- **Empate**: gana el de mayor puntaje aportado; si sigue el empate, el orden fijo
  de la tabla de arriba (Clientes → Ideas → Recursos → Talento → Pasión). El
  desempate debe ser **determinista**, nunca aleatorio.

### 2.5 Tamaño de la empresa

| Puntaje final | Tamaño |
|---|---|
| < 2,000 | Pequeña empresa |
| 2,000 – 3,299 | Mediana empresa |
| 3,300 – 5,999 | Gran empresa |
| ≥ 6,000 | Unicornio 🦄 |

Los umbrales viven en **una sola constante compartida** (`GAME_RULES`), nunca
duplicados en cliente y servidor por copiar-pegar. Cada tamaño lleva además su
artículo (`COMPANY_SIZE_ARTICLE`) para que la frase concuerde: "construiste
**una** gran empresa" pero "construiste **un** unicornio".

*Calibrado el 2026-07-27 por la organización, para partidas de 90 s.*

### 2.6 Resultado, nombre y cierre
1. Pantalla de resultado: puntaje, tamaño, rubro, desglose por color.
2. Campo para **nombrar la empresa** (2–30 caracteres). Se valida y sanitiza igual
   que el nombre de persona (§6.4). Es obligatorio para publicar en el leaderboard.
3. Mensaje final + CTA: *"¿Quieres hacer esto en la vida real? Conecta con
   Emprendimiento Tec CEM"* con el botón de comunidad de WhatsApp.
4. El puntaje se guarda siempre; se **muestra** públicamente solo si entra al Top 5.
5. Se conserva el **mejor puntaje por jugador** (no se acumulan intentos).

### 2.7 Tablero en vivo (pantalla del evento)
- Ruta `/tablero`: el Top 5 a pantalla completa, pensado para proyectar.
- Se refresca solo cada 4 s consultando `/api/leaderboard`; **no** recarga la
  página. Si la red falla, conserva el último tablero y avisa en el pie.
- Resalta durante 8 s a quien acaba de entrar o cambiar de puesto.
- Muestra exactamente los mismos datos que el leaderboard del juego: nombre,
  empresa y puntaje. Nada de correo ni matrícula (§4.5).
- No se indexa en buscadores (`robots: noindex`).
- **Decisión del 2026-07-27:** se sirve solo como ruta, sin subdominio propio.
  Un subdominio real exige un dominio propio y no aportaba nada al evento. Si
  algún día hace falta, el middleware que lo resolvía está en el historial de
  git (commit `b335aa2`).

### 2.8 Intentos por jugador
- Cada persona tiene **2 partidas**, ni una más (`GAME_RULES.MAX_INTENTOS`).
- **Se cuenta al abrir la partida, no al guardarla.** Si contáramos solo las
  guardadas, cualquiera podría jugar, ver un puntaje bajo, no guardarlo y
  volver a empezar indefinidamente. El costo de esta decisión es que abandonar
  una partida a medias gasta el intento: es el precio de que el límite sea real.
- El tope lo aplica **el servidor** en `POST /api/sessions` (403 al pedir la
  tercera). La interfaz solo refleja lo que el servidor reporta: esconder el
  botón no es la protección (§4.1).
- Se guarda **el puntaje más alto**, no el último ni la suma: el leaderboard ya
  toma el mejor por jugador (§3.1).
- Mensajes: tras la primera partida, *"Te queda una oportunidad más. Se guarda
  tu puntaje más alto."*; al agotarlas, desaparece el botón de jugar y quedan
  los de compartir y comunidad.

---

## 3. Arquitectura

Stack asumido (si se cambia, se actualiza esta sección **antes** de escribir código):

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind. Tablero en React con
  estado en un reducer puro; animaciones con CSS transforms. Sin motor de juego
  pesado: el match-3 es lógica de arreglos, no necesita Phaser.
- **Backend:** Route Handlers de Next.js (`/api/*`). Toda escritura pasa por aquí.
- **Base de datos:** Postgres (Supabase o equivalente). El cliente **nunca** habla
  directo con la base de datos.
- **Hosting:** Vercel. HTTPS obligatorio.

```
app/
  page.tsx                 → server component: decide registro vs inicio y precarga el Top 5
  tablero/                 → Top 5 a pantalla completa para proyectar (§2.7)
  aviso-de-privacidad/     → texto legal (§4.5)
  api/
    players/route.ts       → alta/reuso por correo, emite cookie de sesión
    sessions/route.ts      → abre una partida, genera la semilla en el servidor
    scores/route.ts        → re-simula, valida y guarda el puntaje
    leaderboard/route.ts   → Top 5 público (solo lectura)
    health/route.ts        → diagnóstico de configuración (solo booleanos, §4.9)
components/
  Juego.tsx                → máquina de pantallas (registro→inicio→jugando→resultado)
  PantallaRegistro.tsx  PantallaInicio.tsx  PantallaJuego.tsx  PantallaResultado.tsx
  Leaderboard.tsx  BotonesComunidad.tsx
lib/
  game/
    rules.ts               → GAME_RULES: constantes compartidas
    rng.ts                 → PRNG determinista sembrado por el servidor
    board.ts               → crear tablero, buscar líneas, colapsar, rellenar
    scoring.ts             → puntaje puro, sin estado ni DOM
    company.ts             → puntaje + colores → tamaño y rubro
    engine.ts              → applyMove / replayGame (puros y deterministas)
  server/
    env.ts  session.ts  validation.ts  rateLimit.ts  http.ts
    store/                 → interfaz + adaptador de archivo JSON y de Postgres
db/schema.sql              → esquema de Postgres
```

**Navegación:** las cuatro pantallas son estados de un componente cliente, no
rutas distintas. Una partida de 90 s no debe cruzar una navegación (perdería el
estado y metería latencia); la única ruta real es `/`.

**Persistencia:** la app habla con la interfaz `Store`. Si hay `DATABASE_URL` usa
Postgres; si no, un archivo JSON local (`.data/db.json`), suficiente para
desarrollo. **El almacén en archivo solo sirve dentro de un proceso**: comparte
una copia de la base y una cola de operaciones en `globalThis` para que
leer-modificar-escribir sea atómico. Sin eso, `next dev` cargaba el módulo una
vez por ruta y `/api/scores` no veía las sesiones de `/api/sessions` (bug real
del 2026-07-31: 49 de 50 puntajes rechazados bajo carga). Además reescribe el
archivo completo en cada operación, así que su latencia crece con el número de
jugadores: no sirve para medir capacidad. **En producción `DATABASE_URL` es obligatoria**: el almacén en
archivo no funciona en un hosting serverless (sistema de archivos de solo
lectura y una instancia distinta por petición), así que `getStore()` falla
con un mensaje explícito en vez de dar un 500 sin explicación. El archivo contiene
datos personales: está en `.gitignore` y no debe copiarse a ningún lado (§4.5).

**Regla de capas:** `lib/game/*` es **puro** — sin `window`, sin `fetch`, sin React,
sin `Date.now()` inyectado implícitamente (el tiempo se pasa como parámetro). Eso lo
hace testeable y **reutilizable por el servidor** para revalidar puntajes.

### 3.1 Modelo de datos

```sql
players (
  id            uuid primary key,
  display_name  text not null,        -- nombre mostrado en el leaderboard
  email         text not null,        -- PRIVADO, nunca sale en una API pública
  matricula     text,                 -- PRIVADO igual que el correo (nullable:
                                      -- los registros anteriores no la tienen)
  consent_at    timestamptz not null,
  created_at    timestamptz not null default now()
)
-- unique index players_email_unico on players (lower(email))
-- (índice en vez de citext: la migración no requiere extensiones ni permisos
--  especiales en Supabase)

game_sessions (
  id          uuid primary key,
  player_id   uuid not null references players(id),
  seed        bigint not null, -- semilla del tablero, generada en el servidor (§4.1)
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  status      text not null    -- 'open' | 'closed' | 'rejected'
)

scores (
  id            uuid primary key,
  session_id    uuid not null unique references game_sessions(id),
  player_id     uuid not null references players(id),
  score         int  not null check (score >= 0),
  company_name  text not null,
  company_size  text not null,
  company_type  text not null,
  color_counts  jsonb not null,
  created_at    timestamptz not null default now()
)
```

- Leaderboard = mejor `score` por `player_id`, orden `score desc, created_at asc`
  (empate: gana quien lo logró primero), `limit 5`.
- Índice en `scores(score desc)` y en `scores(player_id)`.

---

## 4. Aspectos fundamentales de seguridad

Esta sección no es opcional. Un cambio que la debilite se rechaza.

### 4.1 El cliente no es de confianza — anti-trampa
El navegador puede mandar `score: 999999999`. Por eso:

1. La partida **se abre en el servidor**: `POST /api/sessions` crea una fila con
   `startedAt` y una **semilla generada en el servidor**, y devuelve al cliente
   solo `sessionId` + `seed`. No hace falta firmar nada: la semilla y la hora de
   inicio viven en la base, así que el cliente no puede alterarlas.
2. El cliente genera el tablero **a partir de esa semilla** (PRNG determinista, no
   `Math.random()` libre).
3. Al terminar, `POST /api/scores` envía `sessionId` + el **log de movimientos**
   (índices de celda y orden), no solo el número final.
4. El servidor **re-simula** la partida con la misma semilla y el mismo motor puro
   de `lib/game/` y calcula el puntaje él mismo. **El puntaje que cuenta es el del
   servidor**, el del cliente se ignora.
5. Rechazos automáticos: sesión ya cerrada, sesión de otro jugador, movimientos
   imposibles, y más de `MAX_MOVES` movimientos.
6. **NO hay límite de tiempo para enviar el puntaje, y es a propósito.** El
   reloj nunca fue una defensa: un cliente manipulado envía cuando quiere, así
   que un plazo corto solo le quita la partida a quien se tarda pensando el
   nombre de su empresa. *Bug real del 2026-07-27: con 75 s, cualquiera que
   tardara más de 15 s nombrando su empresa perdía su puntaje.* Lo que sí acota
   el abuso es `MAX_MOVES`, fijado en un techo que un humano no alcanza en el
   tiempo de la partida. **No vuelvas a agregar una validación por tiempo
   creyendo que endurece algo.**
7. Si la re-simulación resulta cara, el mínimo aceptable es: validar techo de
   puntaje por tiempo (`score <= MAX_PPS * segundos`) + un movimiento por sesión +
   sesión de un solo uso. **Nunca** aceptar el puntaje crudo sin ninguna validación.

### 4.2 Sesión y autenticación
- Cookie de sesión: `HttpOnly`, `Secure`, `SameSite=Lax`, firmada, expiración larga
  (90 días) — es una activación, no un banco.
- El `playerId` **siempre** se lee de la cookie en el servidor. Jamás se acepta un
  `playerId` que venga en el body: eso permitiría escribir puntajes a nombre de otro.
- No hay contraseñas, así que no hay recuperación de cuenta ni superficie de login
  que atacar. El correo **no** es credencial: conocerlo no da acceso a nada.

### 4.3 Rate limiting y abuso
| Endpoint | Límite |
|---|---|
| `POST /api/players` | 400 / hora por IP |
| `POST /api/sessions` | 20 / hora por jugador · **máx. 2 partidas en total** (§2.8) |
| `POST /api/scores` | 1 por sesión (único), 20 / hora por jugador |
| `GET /api/leaderboard` | 600 / minuto por IP |

**Los límites por IP van altos a propósito.** En un evento presencial toda la
sala sale por la misma IP pública del WiFi del campus. Un límite bajo no frena a
un atacante —le basta cambiar de red— pero sí deja fuera a la fila entera de
asistentes. *Bug real del 2026-07-31: con 5 registros/hora por IP, la sexta
persona en registrarse ya no podía jugar; 12 registros simultáneos devolvieron
12 veces `429`.* Lo que de verdad acota el abuso son los límites **por cuenta**:
el tope de 2 partidas y el de un puntaje por sesión.

**Ojo con escalar:** el contador vive en memoria del proceso. En Vercel, con
varias instancias, cada una lleva su propio conteo y el límite efectivo se
multiplica. Si algún día importa que el límite sea exacto, hay que moverlo a un
contador compartido (Redis/Upstash) sin cambiar la interfaz de `rateLimit.ts`.

Al superarse: `429` con mensaje neutro. Registrar el evento, no el contenido.

### 4.4 Secretos y configuración
- Secretos (`DATABASE_URL`, `SESSION_SECRET`, `HMAC_SECRET`, service keys) **solo**
  en variables de entorno del servidor. Nada con prefijo `NEXT_PUBLIC_` que sea secreto.
- Nunca commitear `.env*`. Debe existir `.env.example` sin valores reales.
- Si el proyecto usa Supabase: **RLS activado** en todas las tablas; el `anon key`
  no debe poder leer `players.email` ni escribir en `scores`.

### 4.5 Datos personales (esto es México, hay ley)
- Se recolectan datos personales (nombre + correo) → aplica la LFPDPPP.
- **Aviso de privacidad** enlazado y visible en el registro, con: quién trata los
  datos (Tec CEM / la organización responsable), para qué (contacto sobre
  emprendimiento), y cómo ejercer derechos ARCO.
- Consentimiento **explícito y no premarcado**, con fecha guardada (`consent_at`).
- **Minimización:** se piden nombre, **matrícula** y correo. Nada más: ni teléfono,
  ni edad, ni carrera, ni ubicación.
  - *Decisión del 2026-07-27:* la matrícula se agregó a petición de la
    organización para poder identificar a los participantes del Tec. Es dato
    personal y sube el impacto de una fuga, así que se trata con el mismo
    cuidado que el correo: obligatoria al registrarse, guardada normalizada en
    mayúsculas y **nunca** expuesta.
- El correo **y la matrícula** nunca se exponen en ninguna respuesta pública, ni
  en el leaderboard, ni en logs, ni en mensajes de error, ni en analytics.
- Debe existir una forma de borrar a un jugador a petición (script administrativo
  basta) y una fecha de retención definida por la organización.

### 4.6 Enumeración de correos
El registro responde **igual** exista o no el correo (mismo mensaje, mismo tiempo
aproximado). No hay endpoint que diga "¿existe este correo?".

### 4.7 Entradas y salidas
- **Toda** entrada se valida en el servidor con un esquema (Zod o equivalente).
  Validar en el cliente es UX, no seguridad; se hace en ambos lados.
- Nombres: longitud acotada, sin caracteres de control, sin URLs, se hace `trim` y
  se colapsan espacios.
- **Filtro de groserías** (`lib/server/palabrasProhibidas.ts`): el leaderboard se
  proyecta en pantalla, así que un nombre obsceno es un incidente. La lista sale
  de LDNOOBW (Shutterstock, CC BY 4.0) en español e inglés, curada a mano:
  - Se **quitaron** entradas que en México son palabras legítimas —*concha*
    (pan dulce y apodo de Concepción), *martillo*, *heroína*, *infierno*,
    *drogas*, *asno*, *trío*—: bloquear a alguien con nombre válido es peor que
    dejar pasar una palabra suave.
  - Se **agregaron** groserías mexicanas que la lista no traía (la original en
    español tiene solo 68 entradas y es peninsular).
  - La comparación es por **palabra completa, nunca por subcadena**. Con
    subcadena quedarían bloqueados "Cassandra" (*ass*), "computadora" y
    "disputas" (*puta*), "cálculo" (*culo*), "análisis" (*anal*) y "Titán"
    (*tit*). **No lo cambies a `includes`.**
  - Se normaliza para detectar disfraces: acentos, mayúsculas, leet (`put0`,
    `pu70`), letras repetidas (`puuuto`), camelCase (`PutoElQueLoLea`) y
    letra por letra (`p u t o`).
  - **Un token puramente numérico nunca se decodifica**: `455` no es `ass` ni
    `717` es `tit`. Sin esa excepción quedaban bloqueados nombres normales como
    "Asistente 455" o "Grupo 360" (falso positivo real del 2026-07-31).
  - Hay pruebas de las dos direcciones: que rechace groserías y que **no**
    rechace nombres legítimos. Al tocar la lista, corre `npm test`.
- **Nunca** `dangerouslySetInnerHTML` con nombres de jugador o de empresa. React
  escapa por defecto; no lo desactives.
- SQL siempre parametrizado / vía ORM. Cero concatenación de strings.

### 4.8 Cabeceras y transporte
- HTTPS forzado + HSTS.
- **TLS con la base de datos.** Por defecto se verifica el certificado contra
  las CA del sistema. El pooler de Supabase presenta una cadena que Node no
  puede validar, así que el despliegue usa `DATABASE_SSL_MODE=no-verify`: el
  tráfico sigue cifrado pero no se autentica al servidor (mismo nivel que el
  `sslmode=require` que documenta Supabase). Riesgo aceptado y consciente. Para
  cerrarlo del todo, descarga el certificado de Supabase (Settings → Database →
  SSL Configuration) y pásalo en `DATABASE_CA_CERT`: eso restaura la
  verificación completa. `/api/health` reporta en qué modo está.
- CSP estricta. **`'unsafe-eval'` solo en desarrollo**: el bundle de dev de Next
  evalúa strings y sin ese permiso React no hidrata — la página carga pero
  ningún botón responde (bug real, ya corregido en `next.config.mjs`). En
  producción la CSP no lo incluye; si vuelves a tocarla, prueba el build de
  producción, no solo `npm run dev`.
- `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.
- CORS: las APIs de escritura solo aceptan el propio origen.
- El enlace de WhatsApp y cualquier `target="_blank"` llevan `rel="noopener noreferrer"`.

### 4.9 Errores y logs
- Al usuario: mensajes genéricos ("No se pudo guardar tu puntaje, intenta de nuevo").
- Al log: detalle técnico **sin** datos personales ni tokens.
- Nunca devolver stack traces al cliente en producción.

### 4.10 El QR
- Apunta a la URL pública del juego, **sin** parámetros de identidad ni tokens.
- Si se quiere medir por evento, usar un parámetro de campaña inocuo (`?e=expo-2026`)
  que se guarde como texto plano y no afecte la lógica.

---

## 5. Calidad de código — code smells a evitar

Reglas concretas, verificables en revisión:

1. **Números mágicos.** `60`, `8`, `1500`, `10` no aparecen sueltos. Todos viven en
   `GAME_RULES` con nombre. Si el mismo número está en dos archivos, está mal.
2. **Duplicación de reglas cliente/servidor.** Una sola implementación en
   `lib/game/`, importada por ambos. Si el servidor "recalcula a su manera", el
   juego se desincroniza tarde o temprano.
3. **Componentes-Dios.** Ningún componente React mezcla lógica de tablero + red +
   render + timers. La partida es: reducer puro + un hook de tiempo + componentes
   de presentación. Objetivo: ninguna función > ~40 líneas, ningún archivo > ~300.
4. **Estado duplicado.** Una sola fuente de verdad para el tablero, el puntaje y el
   tiempo. Nada de `useState` paralelos que hay que mantener sincronizados a mano.
5. **Efectos con dependencias mentirosas.** No silenciar `react-hooks/exhaustive-deps`;
   arreglar la causa. Timers y listeners **siempre** se limpian.
6. **`any` y `@ts-ignore`.** Prohibidos salvo comentario justificando por qué y con
   fecha. TypeScript en `strict`.
7. **Booleanos de bandera en firmas.** `render(board, true, false)` es ilegible;
   usar objetos con nombre o funciones separadas.
8. **Comentarios que narran el código.** Se comenta el *porqué* (una regla de
   negocio, una decisión anti-trampa), nunca el *qué*.
9. **Código muerto y "por si acaso".** Se borra. El historial de git lo guarda.
10. **`console.log` olvidados.** Fuera del código de producción; usar un logger.
11. **Nombres vagos.** Nada de `data`, `info`, `temp`, `handleClick2`. El dominio
    tiene vocabulario: `board`, `match`, `cascade`, `tile`, `player`, `run`.
12. **Anidamiento profundo.** Máximo ~3 niveles; usar retornos tempranos.
13. **Promesas sin `await` ni manejo de error.** Todo `fetch` tiene su rama de fallo
    y su estado de carga en la UI.
14. **Acoplamiento a la UI en la lógica.** `lib/game/` no importa React ni toca el DOM.

Herramientas mínimas configuradas desde el primer commit: **TypeScript strict,
ESLint, Prettier**. El build falla con errores de lint; no se mergea en rojo.

### 5.1 Pruebas mínimas
No hace falta cobertura total, sí estos casos:
- Detección de matches horizontales, verticales y de 4/5.
- Colapso y relleno dejan el tablero completo y sin matches pendientes.
- Puntaje de cascadas con multiplicador.
- Mapeo puntaje → tamaño y colores → rubro, incluyendo **empates**.
- Rechazo de puntaje: sesión reutilizada, duración excesiva, movimiento inválido.

---

## 6. Accesibilidad y UX no negociables

- Contraste suficiente y **forma/ícono además de color** en cada ficha: hay gente
  daltónica y los cinco colores incluyen rojo y verde. Los iconos son SVG
  propios (`components/IconosJuego.tsx`), no emoji: el emoji cambia de dibujo
  según el sistema operativo, no se puede colorear y se ve borroso proyectado.
- **Identidad de movimiento** (arquetipo *Energetic*, ver `app/globals.css`):
  una curva firma `--sale`, tres duraciones (`--rapida/--normal/--lenta`) y un
  único patrón de entrada (`.entra`). Cualquier animación nueva usa esas
  constantes; no se inventan curvas ni tiempos sueltos.
- **La marca** (`components/LogoTec.tsx`) aparece en todas las pantallas, con
  "TEC CEM" bajo el rayo. Se pinta con `mask-image` y `currentColor`, así que
  funciona sobre fondo oscuro o claro con un solo archivo.
- Objetivos táctiles ≥ 44×44 px.
- Respetar `prefers-reduced-motion` (bajar animaciones de cascada).
- El juego no depende de sonido. Si hay sonido, arranca apagado.
- Textos en español, tuteo, cortos.

---

## 7. Definición de "listo" por entrega

Una funcionalidad está terminada cuando: cumple esta especificación, tiene
validación de servidor donde toca, no introduce ninguno de los smells de §5, pasa
lint y pruebas, funciona en un celular real de gama media, y este documento quedó
actualizado si algo cambió.

---

## 8. Pendientes conocidos

Cosas que la organización debe cerrar antes del evento (no son deuda técnica,
son datos que faltan):

- `SESSION_SECRET` real en el hosting (en producción la app no arranca sin él).
- `NEXT_PUBLIC_WHATSAPP_URL`: enlace de invitación al grupo.
- Revisión legal del texto de `app/aviso-de-privacidad/page.tsx` y nombre del
  responsable de los datos.
- Calibrar los umbrales de tamaño de empresa (§2.5) jugando partidas reales: hoy
  son una estimación.
- Si se esperan varias instancias del servidor a la vez, mover el rate limit a un
  contador compartido y usar `DATABASE_URL` (Postgres) en vez del archivo JSON.

---

## 9. Fuera de alcance (por ahora)

Cuentas con contraseña, multijugador en tiempo real, pagos, notificaciones push,
app nativa, y cualquier recolección de datos adicional. Si alguien lo pide, se
discute y se actualiza este documento **antes** de implementarlo.

---

## 10. Checklist obligatorio de cada cambio

Antes de dar por terminado cualquier cambio:

- [ ] Releí las secciones de este documento que toca mi cambio.
- [ ] Las reglas del juego que modifiqué siguen viviendo en **una sola** constante.
- [ ] Ningún dato personal nuevo se recolecta, expone o registra en logs.
- [ ] Toda entrada nueva se valida en el **servidor**.
- [ ] Ningún puntaje puede escribirse sin pasar por la validación de sesión (§4.1).
- [ ] Ningún secreto quedó en el cliente ni en el repositorio.
- [ ] Revisé mi diff contra la lista de code smells (§5).
- [ ] `lint` y pruebas en verde.
- [ ] Actualicé este archivo si cambió una regla, un flujo, un dato o una decisión
      de seguridad.
