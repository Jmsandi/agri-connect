-- Fix RLS policies to allow vendor registration

-- Drop existing restrictive policy for user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create more permissive policies for user_roles
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow users to insert vendor role for themselves during registration
CREATE POLICY "Users can add vendor role for themselves" 
ON public.user_roles FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'vendor'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'vendor'
  )
);

-- Allow users to insert customer role for themselves (for completeness)
CREATE POLICY "Users can add customer role for themselves" 
ON public.user_roles FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'customer'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'customer'
  )
);

-- Also ensure vendors can insert their vendor profile
DROP POLICY IF EXISTS "Vendors can manage their own vendor profile" ON public.vendors;

CREATE POLICY "Vendors can manage their own vendor profile" 
ON public.vendors FOR ALL 
USING (auth.uid() = user_id);

-- Allow users to insert their own vendor profile during registration
CREATE POLICY "Users can create their own vendor profile" 
ON public.vendors FOR INSERT 
WITH CHECK (auth.uid() = user_id);
