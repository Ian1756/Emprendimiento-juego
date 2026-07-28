# CLAUDE.md

## Regla principal

**Antes de cualquier cambio en este repositorio, lee [INSTRUCCIONES.md](INSTRUCCIONES.md) completo.**
Es la especificación canónica del juego: flujo, reglas de puntaje, modelo de datos,
requisitos de seguridad y lista de code smells prohibidos.

**Después de cada cambio**, recorre el checklist de la sección 10 de ese archivo y
actualízalo si el cambio alteró una regla, un flujo, un dato o una decisión de seguridad.

## Recordatorios rápidos (el detalle está en INSTRUCCIONES.md)

- El cliente **nunca** es fuente de verdad del puntaje: el servidor re-simula (§4.1).
- El `playerId` se lee de la cookie de sesión, jamás del body (§4.2).
- El correo del jugador nunca sale en una respuesta pública ni en logs (§4.5).
- Las constantes del juego viven solo en `lib/game/rules.ts` (§5.1).
- `lib/game/*` es lógica pura: sin React, sin DOM, sin `fetch` (§3).
- TypeScript strict, sin `any`, sin `@ts-ignore` sin justificar (§5.6).
