-- Final Revised Migration: Fix returns for users without profiles
-- STEP 4: Robust Permissions & Profile Join Support (Schema Fixed)

-- 1. Remove any old constraints
ALTER TABLE public.return_requests 
DROP CONSTRAINT IF EXISTS return_requests_user_id_fkey_profiles;

-- 2. Create missing profiles automatically
-- NOTE: In this schema, profiles has both 'id' (PK) and 'user_id' (NOT NULL UNIQUE)
INSERT INTO public.profiles (id, user_id, display_name)
SELECT 
  gen_random_uuid(), 
  user_id, 
  'Customer ' || substr(user_id::text, 1, 8)
FROM public.return_requests
WHERE user_id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Establish the correct Foreign Key for joining
-- We join return_requests.user_id -> profiles.user_id
ALTER TABLE public.return_requests
ADD CONSTRAINT return_requests_user_id_fkey_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- 4. Ensure Admin permissions for profiles
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- 5. Final User Permission check
DROP POLICY IF EXISTS "return_requests_user_select" ON public.return_requests;
CREATE POLICY "return_requests_user_select"
ON public.return_requests
FOR SELECT
USING (auth.uid() = user_id);
