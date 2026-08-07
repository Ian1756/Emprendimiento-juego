-- ============================================================================
-- LIMPIAR LOS DATOS ANTES DE UNA ACTIVACIÓN
--
-- Borra jugadores, partidas y puntajes. NO toca las tablas, los índices ni la
-- configuración de seguridad: el esquema queda intacto y la app sigue
-- funcionando igual, solo que vacía.
--
-- Se corre en Supabase → SQL Editor → New query → pegar → Run.
--
-- ⚠  ESTO NO SE PUEDE DESHACER. Si en la base hay contactos reales que quieras
--    conservar, EXPORTA PRIMERO (ver el bloque de exportación al final).
-- ============================================================================


-- PASO 1 — Ver qué hay antes de borrar. Corre esto solo y revisa los números.
select
  (select count(*) from players)       as jugadores,
  (select count(*) from game_sessions) as partidas,
  (select count(*) from scores)        as puntajes;


-- PASO 2 — Borrar. `truncate` vacía las tres tablas de golpe; `cascade` se
-- encarga de las llaves foráneas entre ellas.
truncate table scores, game_sessions, players cascade;


-- PASO 3 — Confirmar que quedó en ceros.
select
  (select count(*) from players)       as jugadores,
  (select count(*) from game_sessions) as partidas,
  (select count(*) from scores)        as puntajes;


-- ============================================================================
-- EXPORTAR ANTES DE BORRAR (opcional pero recomendado)
--
-- Corre esta consulta, y en el SQL Editor usa "Download CSV" para guardarte los
-- contactos. Son datos personales: guárdalos en un lugar privado, no en el
-- repositorio ni en un Drive compartido con quien no deba verlos (§4.5).
-- ============================================================================
-- select p.display_name  as nombre,
--        p.matricula,
--        p.email         as correo,
--        p.consent_at    as acepto_aviso,
--        max(s.score)    as mejor_puntaje,
--        count(s.id)     as partidas_guardadas
--   from players p
--   left join scores s on s.player_id = p.id
--  group by p.id, p.display_name, p.matricula, p.email, p.consent_at
--  order by mejor_puntaje desc nulls last;
