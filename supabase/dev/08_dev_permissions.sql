-- الغرض: منح reception@elitegym.mr صلاحيات الاستقبال الأساسية فقط (لا can_cancel_payments ولا can_manage_plans).
-- المخاطر: تعديل permissions لموظف واحد. الاختبار: SELECT permissions FROM gym_staff JOIN auth.users ... .
-- التراجع: UPDATE gym_staff SET permissions='{}' للموظف نفسه.
DO $$
DECLARE v_u uuid; v_n int; BEGIN
  SELECT id INTO v_u FROM auth.users WHERE email='reception@elitegym.mr';
  IF v_u IS NULL THEN RAISE EXCEPTION '08: reception@elitegym.mr introuvable'; END IF;
  UPDATE public.gym_staff SET permissions = coalesce(permissions,'{}'::jsonb)
      || '{"can_manage_members":true,"can_record_payments":true,"can_scan_qr":true}'::jsonb
   WHERE user_id=v_u AND gym_id='a0000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n<>1 THEN RAISE EXCEPTION '08: gym_staff de la réception introuvable (exécutez dev_users.sql)'; END IF;
END $$;
SELECT '08_dev_permissions applied' AS result;
