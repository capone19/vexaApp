-- Permite que cada usuario lea su propia fila en user_roles al iniciar sesión,
-- sin depender de user_belongs_to_tenant (bootstrap chicken-and-egg).
DROP POLICY IF EXISTS "Users can view own user_role row" ON public.user_roles;

CREATE POLICY "Users can view own user_role row"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
