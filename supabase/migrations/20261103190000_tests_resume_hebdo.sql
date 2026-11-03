-- US-46 : tests de sécurité du résumé hebdomadaire, branchés sur private.run_smoke_tests().
-- Le test crée ses propres comptes et données, puis annule tout (rien ne reste en base).

CREATE OR REPLACE FUNCTION private.resume_en_tant_que(p_email text, p_depuis timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $hf$
DECLARE _j jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'email', p_email, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  _j := public.mon_resume_hebdo(p_depuis);
  RESET ROLE;
  RETURN _j;
END
$hf$;

CREATE OR REPLACE FUNCTION private.run_resume_tests()
RETURNS TABLE(test text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $tf$
DECLARE
  _res jsonb := '[]'::jsonb;
  _ta text := 'ZZ Test résumé A'; _tb text := 'ZZ Test résumé B';
  _ca uuid; _cb uuid; _m uuid; _adm uuid; _gone uuid;
  _sa uuid; _sa2 uuid; _sb uuid; _bl uuid; _n uuid;
  _since timestamptz := now() - interval '1 day';
  _j jsonb; _t text; _cnt int; _pub timestamptz;
BEGIN
  BEGIN
    INSERT INTO teams(name) VALUES (_ta), (_tb) ON CONFLICT DO NOTHING;
    INSERT INTO allowed_users(email, team) VALUES ('resume.collab.a@test.invalid', _ta) RETURNING id INTO _ca;
    INSERT INTO allowed_user_roles(allowed_user_id, role) VALUES (_ca, 'collaborateur');
    INSERT INTO allowed_users(email, team) VALUES ('resume.collab.b@test.invalid', _tb) RETURNING id INTO _cb;
    INSERT INTO allowed_user_roles(allowed_user_id, role) VALUES (_cb, 'collaborateur');
    INSERT INTO allowed_users(email) VALUES ('resume.manager.a@test.invalid') RETURNING id INTO _m;
    INSERT INTO allowed_user_roles(allowed_user_id, role) VALUES (_m, 'manager');
    INSERT INTO manager_teams(allowed_user_id, team) VALUES (_m, _ta);
    INSERT INTO allowed_users(email) VALUES ('resume.admin@test.invalid') RETURNING id INTO _adm;
    INSERT INTO allowed_user_roles(allowed_user_id, role) VALUES (_adm, 'admin');
    -- Le garde-fou « départ à 7 jours minimum » est suspendu le temps de créer un compte dont le départ est atteint (annulé à la fin du test).
    EXECUTE 'ALTER TABLE public.allowed_users DISABLE TRIGGER check_departure_date';
    INSERT INTO allowed_users(email, team, departure_date) VALUES ('resume.parti@test.invalid', _ta, current_date - 1) RETURNING id INTO _gone;
    EXECUTE 'ALTER TABLE public.allowed_users ENABLE TRIGGER check_departure_date';
    INSERT INTO allowed_user_roles(allowed_user_id, role) VALUES (_gone, 'collaborateur');

    PERFORM set_config('request.jwt.claims', '{"email":"resume.collab.a@test.invalid"}', true);
    INSERT INTO submissions(author_name, team, content) VALUES ('Smoke', 'x', 'Demande résumé A secrète') RETURNING id INTO _sa;
    INSERT INTO submissions(author_name, team, content) VALUES ('Smoke', 'x', 'Demande résumé A refusée') RETURNING id INTO _sa2;
    PERFORM set_config('request.jwt.claims', '{"email":"resume.collab.b@test.invalid"}', true);
    INSERT INTO submissions(author_name, team, content) VALUES ('Smoke', 'x', 'Demande résumé B secrète') RETURNING id INTO _sb;
    PERFORM set_config('request.jwt.claims', '{"email":"resume.manager.a@test.invalid"}', true);
    UPDATE submissions SET status = 'refusée', rejection_category = 'doublon', rejection_note = 'Test' WHERE id = _sa2;

    _j := private.resume_en_tant_que('resume.collab.b@test.invalid', _since); _t := _j::text;
    _res := _res || jsonb_build_object('t', 'Collaborateur : aucune demande d''une autre équipe dans son résumé', 'ok', position('Demande résumé A' in _t) = 0, 'd', 'recherche de « Demande résumé A »');
    _res := _res || jsonb_build_object('t', 'Collaborateur : sa propre demande en attente figure dans les éléments ouverts', 'ok', position('Demande résumé B secrète' in (_j->'ouverts')::text) > 0, 'd', '');
    _res := _res || jsonb_build_object('t', 'Collaborateur : pas de bloc « À traiter »', 'ok', jsonb_typeof(_j->'a_traiter') = 'null', 'd', coalesce(jsonb_typeof(_j->'a_traiter'), 'absent'));

    _j := private.resume_en_tant_que('resume.collab.a@test.invalid', _since);
    _res := _res || jsonb_build_object('t', 'Collaborateur : il reçoit la décision sur sa propre demande', 'ok', position('Demande résumé A refusée' in (_j->'mes_decisions')::text) > 0, 'd', '');

    _j := private.resume_en_tant_que('resume.manager.a@test.invalid', _since); _t := _j::text;
    _res := _res || jsonb_build_object('t', 'Manager : bloc « À traiter » avec les nouvelles demandes de son équipe', 'ok', position('Demande résumé A secrète' in (_j#>'{a_traiter,nouvelles}')::text) > 0 AND position('Demande résumé A secrète' in (_j#>'{a_traiter,en_attente}')::text) > 0, 'd', '');
    _res := _res || jsonb_build_object('t', 'Manager : aucune demande d''une équipe qui n''est pas la sienne', 'ok', position('Demande résumé B' in _t) = 0, 'd', 'recherche de « Demande résumé B »');
    _res := _res || jsonb_build_object('t', 'Manager : ses propres décisions n''apparaissent pas comme changements à traiter', 'ok', jsonb_array_length(_j#>'{a_traiter,changements}') = 0, 'd', jsonb_array_length(_j#>'{a_traiter,changements}') || ' changement(s)');

    _j := private.resume_en_tant_que('resume.admin@test.invalid', _since);
    _res := _res || jsonb_build_object('t', 'Admin : voit les demandes d''une équipe sans manager', 'ok', position('Demande résumé B secrète' in (_j->'a_traiter')::text) > 0, 'd', '');
    _res := _res || jsonb_build_object('t', 'Admin : ne voit pas dans « À traiter » les demandes d''une équipe qui a un manager', 'ok', position('Demande résumé A secrète' in (_j->'a_traiter')::text) = 0, 'd', '');

    _res := _res || jsonb_build_object('t', 'Compte dont le départ est atteint : pas de résumé', 'ok', private.resume_en_tant_que('resume.parti@test.invalid', _since) IS NULL, 'd', '');
    _res := _res || jsonb_build_object('t', 'Compte inconnu : pas de résumé', 'ok', private.resume_en_tant_que('inconnu.resume@test.invalid', _since) IS NULL, 'd', '');

    PERFORM set_config('request.jwt.claims', '{"email":"resume.admin@test.invalid"}', true);
    INSERT INTO blockers(title, department) VALUES ('Blocage test résumé', 'Test') RETURNING id INTO _bl;
    UPDATE blockers SET status = 'EN COURS' WHERE id = _bl;
    SELECT count(*) INTO _cnt FROM blocker_status_history WHERE blocker_id = _bl;
    _res := _res || jsonb_build_object('t', 'Points bloquants : création et changement de statut enregistrés (2 lignes)', 'ok', _cnt = 2, 'd', _cnt || ' ligne(s)');

    INSERT INTO news(title, body, status) VALUES ('Actu test résumé', 'x', 'brouillon') RETURNING id, published_at INTO _n, _pub;
    _res := _res || jsonb_build_object('t', 'Actu : un brouillon n''a pas de date de publication', 'ok', _pub IS NULL, 'd', '');
    UPDATE news SET status = 'publiée' WHERE id = _n;
    SELECT published_at INTO _pub FROM news WHERE id = _n;
    _res := _res || jsonb_build_object('t', 'Actu : la publication enregistre sa date', 'ok', _pub IS NOT NULL, 'd', coalesce(_pub::text, 'vide'));

    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = 'rollback_tests';
  EXCEPTION
    WHEN SQLSTATE 'P0099' THEN NULL;
    WHEN OTHERS THEN
      _res := _res || jsonb_build_object('t', 'Erreur pendant les tests du résumé', 'ok', false, 'd', SQLERRM);
  END;
  RETURN QUERY SELECT x->>'t', (x->>'ok')::boolean, x->>'d' FROM jsonb_array_elements(_res) x;
END
$tf$;

-- run_smoke_tests devient : tests historiques (run_smoke_tests_base) puis tests du résumé hebdomadaire.
-- Les tests historiques se modifient désormais dans run_smoke_tests_base.
ALTER FUNCTION private.run_smoke_tests() RENAME TO run_smoke_tests_base;

CREATE OR REPLACE FUNCTION private.run_smoke_tests()
RETURNS TABLE(test text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $w$
BEGIN
  RETURN QUERY SELECT * FROM private.run_smoke_tests_base();
  RETURN QUERY SELECT * FROM private.run_resume_tests();
END
$w$;

-- Retour arrière (à ne lancer que par une nouvelle migration) :
-- DROP FUNCTION IF EXISTS private.run_smoke_tests();
-- ALTER FUNCTION private.run_smoke_tests_base() RENAME TO run_smoke_tests;
-- DROP FUNCTION IF EXISTS private.run_resume_tests();
-- DROP FUNCTION IF EXISTS private.resume_en_tant_que(text, timestamptz);
