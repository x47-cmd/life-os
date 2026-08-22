-- =========================================================
-- LIFE OS — Version 1 Development Seed
-- File: supabase/seed.sql
--
-- PURPOSE:
-- Provide safe synthetic development data for LIFE OS V1.
--
-- IMPORTANT:
--
-- 1. THIS FILE MUST NEVER CONTAIN REAL PERSONAL DATA.
--
-- 2. THIS FILE MUST NOT BE REQUIRED BY PRODUCTION.
--
-- 3. THIS FILE ONLY SEEDS THE DEDICATED DEVELOPMENT USER:
--
--      life-os-dev@example.invalid
--
-- 4. If that user does not exist in Supabase Auth,
--    this script safely exits without inserting anything.
--
-- =========================================================


do $$
declare

  -- =======================================================
  -- DEVELOPMENT USER
  -- =======================================================

  v_user_id uuid;


  -- =======================================================
  -- FIXED SYNTHETIC ENTITY IDS
  --
  -- Fixed UUIDs make the development seed deterministic.
  -- =======================================================

  v_goal_finance uuid :=
    '10000000-0000-4000-8000-000000000001';

  v_goal_career uuid :=
    '10000000-0000-4000-8000-000000000002';

  v_goal_learning uuid :=
    '10000000-0000-4000-8000-000000000003';

  v_goal_travel uuid :=
    '10000000-0000-4000-8000-000000000004';


  v_project_ai uuid :=
    '20000000-0000-4000-8000-000000000001';

  v_project_education uuid :=
    '20000000-0000-4000-8000-000000000002';


  v_asset_etf uuid :=
    '30000000-0000-4000-8000-000000000001';

  v_asset_stock uuid :=
    '30000000-0000-4000-8000-000000000002';


begin

  -- =======================================================
  -- 1. FIND DEDICATED DEVELOPMENT USER
  -- =======================================================

  select id
  into v_user_id
  from auth.users
  where lower(email) = 'life-os-dev@example.invalid'
  limit 1;


  -- =======================================================
  -- 2. SAFETY GUARD
  --
  -- Never seed an arbitrary account.
  -- =======================================================

  if v_user_id is null then

    raise notice
      'LIFE OS seed skipped: development user life-os-dev@example.invalid does not exist.';

    return;

  end if;


  raise notice
    'LIFE OS seed started for dedicated synthetic development user: %',
    v_user_id;


  -- =======================================================
  -- 3. CLEAR PREVIOUS SYNTHETIC DATA
  --
  -- Only records belonging to the dedicated development
  -- account are removed.
  --
  -- Dependency order is intentional.
  -- =======================================================


  delete from public.audit_logs
  where user_id = v_user_id;


  delete from public.ai_recommendations
  where user_id = v_user_id;


  delete from public.memory_items
  where user_id = v_user_id;


  delete from public.tasks
  where user_id = v_user_id;


  delete from public.learning_items
  where user_id = v_user_id;


  delete from public.career_items
  where user_id = v_user_id;


  delete from public.projects
  where user_id = v_user_id;


  delete from public.goals
  where user_id = v_user_id;


  delete from public.investment_transactions
  where user_id = v_user_id;


  delete from public.investment_assets
  where user_id = v_user_id;


  delete from public.monthly_snapshots
  where user_id = v_user_id;


  delete from public.budget_items
  where user_id = v_user_id;


  delete from public.income_sources
  where user_id = v_user_id;


  delete from public.profiles
  where user_id = v_user_id;


  -- =======================================================
  -- 4. PROFILE
  -- =======================================================

  insert into public.profiles (
    user_id,
    display_name,
    default_currency,
    timezone,
    locale
  )
  values (
    v_user_id,
    'مستخدم LIFE OS التجريبي',
    'AED',
    'Asia/Dubai',
    'ar-AE'
  );


  -- =======================================================
  -- 5. INCOME SOURCES
  -- =======================================================

  insert into public.income_sources (
    user_id,
    name,
    amount,
    frequency,
    is_active,
    next_expected_date,
    notes
  )
  values
  (
    v_user_id,
    'الراتب التجريبي',
    25000.00,
    'monthly',
    true,
    (date_trunc('month', current_date)
      + interval '1 month')::date,
    'بيانات وهمية لاستخدام التطوير فقط'
  ),
  (
    v_user_id,
    'دخل إضافي تجريبي',
    3000.00,
    'annual',
    true,
    null,
    'مثال وهمي لدخل غير شهري'
  );


  -- =======================================================
  -- 6. BUDGET ITEMS
  -- =======================================================

  insert into public.budget_items (
    user_id,
    name,
    category,
    item_type,
    amount,
    frequency,
    due_day,
    is_active,
    notes
  )
  values
  (
    v_user_id,
    'التزامات المنزل',
    'housing',
    'expense',
    3500.00,
    'monthly',
    1,
    true,
    'مثال تجريبي'
  ),
  (
    v_user_id,
    'المصاريف الشخصية',
    'personal',
    'expense',
    4000.00,
    'monthly',
    null,
    true,
    'مثال تجريبي'
  ),
  (
    v_user_id,
    'المواصلات',
    'transport',
    'expense',
    1200.00,
    'monthly',
    null,
    true,
    'مثال تجريبي'
  ),
  (
    v_user_id,
    'صندوق الطوارئ',
    'emergency',
    'saving',
    1500.00,
    'monthly',
    null,
    true,
    'مثال تجريبي'
  ),
  (
    v_user_id,
    'توفير السفر',
    'travel',
    'saving',
    1500.00,
    'monthly',
    null,
    true,
    'مثال تجريبي'
  ),
  (
    v_user_id,
    'الاستثمار الشهري',
    'investments',
    'investment',
    3500.00,
    'monthly',
    null,
    true,
    'مثال تجريبي'
  ),
  (
    v_user_id,
    'التطوير والتعليم',
    'education',
    'expense',
    2000.00,
    'monthly',
    null,
    true,
    'مثال تجريبي'
  );


  -- =======================================================
  -- 7. MONTHLY FINANCIAL SNAPSHOTS
  -- =======================================================

  insert into public.monthly_snapshots (
    user_id,
    month,
    total_income,
    total_budget,
    total_savings,
    total_investments,
    available_amount,
    emergency_fund_balance,
    travel_savings_balance,
    notes
  )
  values
  (
    v_user_id,
    (
      date_trunc('month', current_date)
      - interval '2 months'
    )::date,
    25000.00,
    17000.00,
    2500.00,
    3000.00,
    8000.00,
    5000.00,
    3000.00,
    'لقطة مالية تجريبية'
  ),
  (
    v_user_id,
    (
      date_trunc('month', current_date)
      - interval '1 month'
    )::date,
    25000.00,
    17500.00,
    3000.00,
    3500.00,
    7500.00,
    6500.00,
    4500.00,
    'لقطة مالية تجريبية'
  ),
  (
    v_user_id,
    date_trunc('month', current_date)::date,
    25000.00,
    17200.00,
    3000.00,
    3500.00,
    7800.00,
    8000.00,
    6000.00,
    'الشهر التجريبي الحالي'
  );


  -- =======================================================
  -- 8. INVESTMENT ASSETS
  -- =======================================================

  insert into public.investment_assets (
    id,
    user_id,
    ticker,
    name,
    market,
    asset_type,
    currency,
    quantity,
    average_cost,
    reference_price,
    monthly_contribution_target,
    target_quantity,
    is_active,
    notes
  )
  values
  (
    v_asset_etf,
    v_user_id,
    'DEMOETF',
    'صندوق نمو تجريبي',
    'DEMO',
    'etf',
    'AED',
    150.00000000,
    10.500000,
    11.250000,
    2000.00,
    300.00000000,
    true,
    'أصل استثماري وهمي للتطوير فقط'
  ),
  (
    v_asset_stock,
    v_user_id,
    'DEMOSTK',
    'شركة تجريبية',
    'DEMO',
    'stock',
    'AED',
    500.00000000,
    4.200000,
    4.550000,
    1500.00,
    1000.00000000,
    true,
    'أصل استثماري وهمي للتطوير فقط'
  );


  -- =======================================================
  -- 9. INVESTMENT TRANSACTIONS
  -- =======================================================

  insert into public.investment_transactions (
    user_id,
    asset_id,
    transaction_type,
    transaction_date,
    quantity,
    unit_price,
    total_amount,
    fees,
    notes
  )
  values
  (
    v_user_id,
    v_asset_etf,
    'buy',
    current_date - 120,
    100.00000000,
    10.000000,
    1000.00,
    0.00,
    'عملية شراء تجريبية'
  ),
  (
    v_user_id,
    v_asset_etf,
    'buy',
    current_date - 60,
    50.00000000,
    11.500000,
    575.00,
    0.00,
    'عملية شراء تجريبية'
  ),
  (
    v_user_id,
    v_asset_stock,
    'buy',
    current_date - 100,
    300.00000000,
    4.000000,
    1200.00,
    0.00,
    'عملية شراء تجريبية'
  ),
  (
    v_user_id,
    v_asset_stock,
    'buy',
    current_date - 45,
    200.00000000,
    4.500000,
    900.00,
    0.00,
    'عملية شراء تجريبية'
  ),
  (
    v_user_id,
    v_asset_stock,
    'dividend',
    current_date - 20,
    null,
    null,
    75.00,
    0.00,
    'توزيع أرباح تجريبي'
  );


  -- =======================================================
  -- 10. GOALS
  -- =======================================================

  insert into public.goals (
    id,
    user_id,
    title,
    category,
    description,
    target_value,
    current_value,
    unit,
    progress_percent,
    target_date,
    priority,
    status,
    next_action,
    sort_order
  )
  values
  (
    v_goal_finance,
    v_user_id,
    'بناء احتياطي مالي',
    'finance',
    'إنشاء احتياطي مالي مريح ومنظم',
    30000.0000,
    8000.0000,
    'AED',
    27,
    current_date + 365,
    'high',
    'active',
    'الاستمرار في المساهمة الشهرية',
    1
  ),
  (
    v_goal_career,
    v_user_id,
    'الوصول إلى دور مهني أقوى',
    'career',
    'رفع المستوى المهني والانتقال إلى دور تقني وقيادي أقوى',
    null,
    null,
    null,
    40,
    current_date + 730,
    'high',
    'active',
    'إكمال المشروع التقني الرئيسي وتوثيق الإنجازات',
    2
  ),
  (
    v_goal_learning,
    v_user_id,
    'تطوير مهارات الذكاء الاصطناعي',
    'learning',
    'بناء معرفة عملية قوية بالذكاء الاصطناعي',
    null,
    null,
    null,
    55,
    current_date + 365,
    'high',
    'active',
    'إكمال المسار التعليمي الحالي قبل إضافة دورة جديدة',
    3
  ),
  (
    v_goal_travel,
    v_user_id,
    'رحلة شخصية مستقبلية',
    'travel',
    'تجهيز ميزانية رحلة بدون التأثير على الأهداف الأساسية',
    12000.0000,
    6000.0000,
    'AED',
    50,
    current_date + 240,
    'medium',
    'active',
    'الاستمرار في توفير السفر',
    4
  );


  -- =======================================================
  -- 11. PROJECTS
  -- =======================================================

  insert into public.projects (
    id,
    user_id,
    goal_id,
    title,
    description,
    category,
    status,
    progress_percent,
    priority,
    start_date,
    target_date,
    next_action
  )
  values
  (
    v_project_ai,
    v_user_id,
    v_goal_career,
    'منصة ذكاء اصطناعي تجريبية',
    'مشروع تقني وهمي يستخدم لاختبار إدارة المشاريع داخل LIFE OS',
    'ai',
    'active',
    65,
    'high',
    current_date - 90,
    current_date + 120,
    'إكمال الواجهة الرئيسية'
  ),
  (
    v_project_education,
    v_user_id,
    v_goal_learning,
    'خطة تعليم متقدمة',
    'مشروع تجريبي لتنظيم برنامج تعليمي طويل المدى',
    'education',
    'active',
    35,
    'high',
    current_date - 30,
    current_date + 300,
    'مراجعة المادة التعليمية التالية'
  );


  raise notice
    'LIFE OS synthetic development seed completed successfully.';

end;
$$;