-- الغرض: صالة B للاختبار (عزل المستأجرين) بمعرّفات ثابتة وأعمدة حقيقية.
-- المخاطر: يضيف صفوفًا ثابتة (ON CONFLICT DO NOTHING)؛ لا يحذف شيئًا.
-- الاختبار: SELECT count(*) FROM members WHERE gym_id='a1000000-0000-0000-0000-000000000002' → 1.
-- التراجع: حذف الصفوف ذات المعرّفات a1.. / b1.. / c1.. / d1.. / e1.. / f1.. يدويًا (صالة B فقط).
-- يعمل قبل 05 و06 (المشغلات اللاحقة تمنع الكتابة بلا auth.uid()). يتطلب owner@elitegym.mr كمسجّل للدفع.
DO $$
DECLARE
  v_gym uuid := 'a1000000-0000-0000-0000-000000000002';
  v_branch uuid := 'b1000000-0000-0000-0000-000000000002';
  v_plan uuid := 'c1000000-0000-0000-0000-000000000002';
  v_member uuid := 'd1000000-0000-0000-0000-000000000002';
  v_sub uuid := 'e1000000-0000-0000-0000-000000000002';
  v_pay uuid := 'f1000000-0000-0000-0000-000000000002';
  v_actor uuid;
BEGIN
  SELECT id INTO v_actor FROM auth.users WHERE email='owner@elitegym.mr';
  IF v_actor IS NULL THEN RAISE EXCEPTION '07: owner@elitegym.mr introuvable dans auth.users'; END IF;
  INSERT INTO public.gyms(id,name,slug,city,status) VALUES (v_gym,'Gym B Test','gym-b-test','Nouadhibou','active') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.branches(id,gym_id,name,is_main) VALUES (v_branch,v_gym,'Branche principale B',true) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.plans(id,gym_id,name,duration_days,price_mru,active) VALUES (v_plan,v_gym,'Mensuel B',30,1500,true) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.members(id,gym_id,branch_id,full_name,phone,status) VALUES (v_member,v_gym,v_branch,'عضو الصالة B','30000002','inactive') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.subscriptions(id,gym_id,member_id,plan_id,start_date,status) VALUES (v_sub,v_gym,v_member,v_plan,now(),'active') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.payments(id,gym_id,member_id,subscription_id,amount_mru,method,transaction_ref,recorded_by,status)
    VALUES (v_pay,v_gym,v_member,v_sub,1500,'cash','FIXTURE-B',v_actor,'completed') ON CONFLICT (id) DO NOTHING;
  UPDATE public.members SET status='active' WHERE id=v_member AND status<>'active';
END $$;

-- ربط staffb@championgym.mr بالصالة B (إن وُجد الحساب)
DO $$
DECLARE v_u uuid; BEGIN
  SELECT id INTO v_u FROM auth.users WHERE email='staffb@championgym.mr';
  IF v_u IS NULL THEN RAISE NOTICE 'staffb@championgym.mr absent: lien ignoré'; RETURN; END IF;
  INSERT INTO public.profiles(id,full_name,phone,language,is_super_admin) VALUES (v_u,'Staff B','+222 45 00 00 09','ar',false)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.gym_staff(gym_id,user_id,branch_id,role,is_active,permissions)
    VALUES ('a1000000-0000-0000-0000-000000000002',v_u,'b1000000-0000-0000-0000-000000000002','gym_owner',true,'{}'::jsonb)
    ON CONFLICT (gym_id,user_id) DO UPDATE SET is_active=true, role='gym_owner';
END $$;

-- ربط member@elitegym.mr بعضو من الصالة A (d..001 من demo_data)
DO $$
DECLARE v_u uuid; BEGIN
  SELECT id INTO v_u FROM auth.users WHERE email='member@elitegym.mr';
  IF v_u IS NULL THEN RAISE NOTICE 'member@elitegym.mr absent: lien ignoré'; RETURN; END IF;
  INSERT INTO public.profiles(id,full_name,phone,language,is_super_admin) VALUES (v_u,'Membre Test','+222 45 00 00 10','ar',false)
    ON CONFLICT (id) DO NOTHING;
  UPDATE public.members SET user_id=v_u WHERE id='d0000000-0000-0000-0000-000000000001' AND user_id IS DISTINCT FROM v_u;
  IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM public.members WHERE user_id=v_u) THEN
    RAISE NOTICE 'Aucun membre d..001: exécutez demo_data.sql puis relancez ce bloc';
  END IF;
END $$;
SELECT '07_gym_b_fixture applied' AS result;
