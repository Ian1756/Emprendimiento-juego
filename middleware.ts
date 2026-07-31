/**
 * Ruteo por subdominio — INSTRUCCIONES.md §2.7.
 *
 * Si la petición llega al host configurado en LEADERBOARD_HOST, la raíz sirve
 * el tablero en vivo en vez del juego. Así el mismo despliegue atiende
 * juego.midominio.mx y tablero.midominio.mx sin duplicar proyectos.
 *
 * Sin esa variable, el middleware no hace nada y /tablero sigue accesible por
 * su ruta normal.
 */
import { NextResponse, type NextRequest } from 'next/server';

const RUTA_TABLERO = '/tablero';

export function middleware(request: NextRequest) {
  const hostConfigurado = process.env.LEADERBOARD_HOST?.trim().toLowerCase();
  if (!hostConfigurado) return NextResponse.next();

  // El puerto no forma parte de la comparación: en local sería localhost:3000.
  const host = (request.headers.get('host') ?? '').toLowerCase().split(':')[0];
  if (host !== hostConfigurado) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === RUTA_TABLERO || pathname.startsWith(`${RUTA_TABLERO}/`)) {
    return NextResponse.next();
  }

  // En el subdominio del tablero, cualquier ruta de página muestra el tablero:
  // nadie debería poder registrarse ni jugar desde la pantalla proyectada.
  return NextResponse.rewrite(new URL(RUTA_TABLERO, request.url));
}

export const config = {
  // Las rutas de API y los archivos estáticos se sirven igual en ambos hosts:
  // el tablero necesita /api/leaderboard para refrescarse.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
