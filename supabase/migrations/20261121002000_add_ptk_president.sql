INSERT INTO public.admin_users (user_id, role)
VALUES (
  '3344e00c-c2de-41d9-959d-4dda46a17912'::uuid,
  'president'
)
ON CONFLICT (user_id)
DO UPDATE SET role = EXCLUDED.role;