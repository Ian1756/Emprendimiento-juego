# Reto Emprendedor — juego web por QR

Juego *match-3* de 90 segundos para activaciones de **Emprendimiento Tec CEM**.
La especificación completa (reglas, seguridad, estilo de código) está en
**[INSTRUCCIONES.md](INSTRUCCIONES.md)** — léela antes de tocar el código.

## Arrancar en local

```bash
npm install
cp .env.example .env.local     # en PowerShell: copy .env.example .env.local
# genera el secreto y pégalo en SESSION_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run dev
```

Abre <http://localhost:3000>. Sin `DATABASE_URL` la app guarda todo en
`.data/db.json` (ignorado por git), suficiente para desarrollo y para un evento
de un solo servidor.

Comandos: `npm run dev` · `npm run build` · `npm start` · `npm run lint` ·
`npm run typecheck` · `npm test`

## Con Supabase (base de datos real)

Mientras no exista `DATABASE_URL`, todo se guarda en `.data/db.json`. Para
guardar en Supabase:

1. Crea un proyecto en <https://supabase.com> (plan gratuito) y guarda la
   contraseña de la base que te pide al crearlo.
2. En el proyecto: **Connect** (arriba) → pestaña **ORMs / Connection string** →
   copia la URI y sustituye `[YOUR-PASSWORD]` por tu contraseña.
   - **Session pooler** (puerto `5432`) para desarrollo local y migraciones.
   - **Transaction pooler** (puerto `6543`) si despliegas en Vercel u otro
     entorno serverless.
3. Pégala en `.env.local`:
   ```
   DATABASE_URL=postgresql://postgres.xxxx:TU-PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
4. Crea las tablas y verifica:
   ```bash
   npm run db:migrate   # aplica db/schema.sql (idempotente)
   npm run db:check     # prueba escritura, lectura y limpieza contra la base real
   ```
5. Reinicia `npm run dev`: el adaptador se elige solo por la presencia de
   `DATABASE_URL`.

La `DATABASE_URL` es un **secreto**: da acceso total a los datos de los
jugadores. Va en `.env.local` (ignorado por git) y en las variables de entorno
del hosting; nunca en el código ni en capturas de pantalla.

## Configuración antes del evento

| Variable | Para qué |
|---|---|
| `SESSION_SECRET` | Firma la cookie de sesión. **Obligatoria en producción.** |
| `NEXT_PUBLIC_WHATSAPP_URL` | Enlace de invitación al grupo de la comunidad. |
| `NEXT_PUBLIC_ORG_NAME` | Nombre de la organización responsable. |
| `NEXT_PUBLIC_PRIVACY_URL` | Aviso de privacidad (por defecto, el interno). |
| `DATABASE_URL` | Opcional: activa Postgres en vez del archivo JSON. |

Además, revisa el texto de `app/aviso-de-privacidad/page.tsx` con quien sea
responsable de los datos (§4.5 de INSTRUCCIONES.md).

## Desplegar en Vercel

1. Sube el proyecto a un repositorio de GitHub e impórtalo en Vercel.
2. En **Settings → Environment Variables** (entorno *Production*):

   | Variable | Valor |
   |---|---|
   | `SESSION_SECRET` | uno **nuevo**, distinto al de tu máquina |
   | `DATABASE_URL` | la URI del **Transaction pooler** de Supabase (puerto `6543`) |
   | `NEXT_PUBLIC_WHATSAPP_URL` | el enlace del grupo |
   | `NEXT_PUBLIC_ORG_NAME` | `Emprendimiento Tec CEM` |

3. Despliega y prueba el flujo completo desde un celular antes del evento.
4. Genera el QR apuntando a la URL final de Vercel (o a tu dominio propio).

## Tablero en vivo para proyectar

`https://TU-URL/tablero` muestra el Top 5 a pantalla completa, se refresca solo
cada 4 segundos y resalta a quien acaba de entrar. Pensado para una pantalla o
proyector durante el evento (pon el navegador en pantalla completa con `F11`).

Consejo para el evento: deja esa pestaña abierta en la máquina que proyecta y
no la toques. Se refresca sola; no hace falta recargar ni volver a entrar.

## Diagnóstico de un despliegue

Si el juego falla en producción, abre `https://TU-URL/api/health`. Responde solo
con booleanos (nunca secretos ni datos de jugadores) y dice qué falta:

```json
{ "ok": false, "databaseUrlConfigurada": true, "baseDeDatos": "falla",
  "problema": "Las tablas no existen: aplica db/schema.sql en el SQL Editor de Supabase." }
```

## El QR

Apunta el QR a la URL pública del juego, **sin tokens ni datos en la URL**
(§4.10). Si quieres medir por evento, usa un parámetro inocuo: `?e=expo-2026`.

## Estructura

```
app/            pantallas (server components) y rutas /api
components/     UI del juego (client components)
lib/game/       motor puro: tablero, puntaje, empresa  ← lo usa cliente Y servidor
lib/server/     sesión, validación, rate limit, persistencia
db/schema.sql   esquema de Postgres
tests/          pruebas del motor y de la validación anti-trampa
```

**La regla que sostiene todo:** el navegador nunca decide el puntaje. El servidor
genera la semilla, recibe el log de movimientos y **re-simula la partida** con el
mismo motor de `lib/game/`. Ver §4.1 de INSTRUCCIONES.md.
