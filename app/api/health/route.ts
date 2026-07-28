/**
 * Diagnóstico de configuración. Responde SOLO con booleanos y nombres de tabla:
 * nunca la cadena de conexión, el secreto ni datos de jugadores (§4.5, §4.9).
 *
 * Sirve para saber, desde el navegador, por qué falla un despliegue.
 */
import { NextResponse } from 'next/server';
import { getStore } from '@/lib/server/store';
import { checkRateLimit, clientIp } from '@/lib/server/rateLimit';
import { logServerError, tooManyRequests } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

const LIMIT_PER_MINUTE = 10;
const ONE_MINUTE_SECONDS = 60;

/**
 * Traduce el fallo a una causa accionable. Nunca devolvemos el mensaje crudo:
 * puede incluir host y usuario de la base.
 */
function explicar(mensaje: string): string {
  const causas: Array<[RegExp, string]> = [
    [/does not exist|relation .* does not exist/i, 'Las tablas no existen: aplica db/schema.sql en el SQL Editor de Supabase.'],
    [/password authentication failed|SASL|SCRAM/i, 'La contraseña de DATABASE_URL es incorrecta o falta codificar un carácter especial.'],
    [/ENOTFOUND|EAI_AGAIN|getaddrinfo/i, 'El host de DATABASE_URL no resuelve: revisa que copiaste la URI completa.'],
    [/ETIMEDOUT|timeout/i, 'La base no respondió a tiempo: usa el pooler de Supabase, no la conexión directa.'],
    [
      /self.signed|certificate|CERT_/i,
      'El certificado TLS de la base no se puede verificar: agrega DATABASE_SSL_MODE=no-verify en el hosting y redespliega.',
    ],
    [/Falta DATABASE_URL/i, 'Falta la variable DATABASE_URL en el hosting.'],
  ];

  const encontrada = causas.find(([patron]) => patron.test(mensaje));
  return encontrada ? encontrada[1] : 'La base de datos no responde. Revisa los logs del servidor.';
}

export async function GET(request: Request) {
  const limit = checkRateLimit(`health:${clientIp(request)}`, LIMIT_PER_MINUTE, ONE_MINUTE_SECONDS);
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds);

  const diagnostico = {
    entorno: process.env.NODE_ENV,
    sessionSecretConfigurado: Boolean(process.env.SESSION_SECRET),
    databaseUrlConfigurada: Boolean(process.env.DATABASE_URL),
    whatsappConfigurado: !(process.env.NEXT_PUBLIC_WHATSAPP_URL ?? '').includes('PENDIENTE'),
    baseDeDatos: 'sin probar' as string,
    problema: null as string | null,
  };

  try {
    const store = await getStore();
    // Una lectura real: si las tablas no existen, esto falla.
    await store.topScores(1);
    diagnostico.baseDeDatos = 'responde y las tablas existen';
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'error desconocido';
    diagnostico.baseDeDatos = 'falla';
    diagnostico.problema = explicar(mensaje);
    // El detalle completo va al log del servidor, no a la respuesta pública.
    logServerError('health.GET', error);
  }

  const ok = diagnostico.problema === null && diagnostico.sessionSecretConfigurado;
  return NextResponse.json({ ok, ...diagnostico }, { status: ok ? 200 : 503 });
}
