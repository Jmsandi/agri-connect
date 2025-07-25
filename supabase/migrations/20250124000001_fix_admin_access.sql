-- Fix RLS policies to allow admin access to all tables

-- Drop existing restrictive policies and create admin-friendly ones
DROP POLICY IF EXISTS "Vendors can manage their own vendor profile" ON public.vendors;
DROP POLICY IF EXISTS "Users can create their own vendor profile" ON public.vendors;

-- Allow admins to view and manage all vendors
CREATE POLICY "Admins can manage all vendors" 
ON public.vendors FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow vendors to manage their own profile
CREATE POLICY "Vendors can manage their own profile" 
ON public.vendors FOR ALL 
USING (auth.uid() = user_id);

-- Allow users to create their own vendor profile during registration
CREATE POLICY "Users can create vendor profile" 
ON public.vendors FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow public to view verified vendors (for marketplace)
CREATE POLICY "Public can view verified vendors" 
ON public.vendors FOR SELECT 
USING (verification_status = 'verified');

-- Fix products table policies for admin access
DROP POLICY IF EXISTS "Vendors can manage their own products" ON public.products;

-- Allow admins to manage all products
CREATE POLICY "Admins can manage all products" 
ON public.products FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow vendors to manage their own products
CREATE POLICY "Vendors can manage their own products" 
ON public.products FOR ALL 
USING (
  vendor_id IN (
    SELECT id FROM public.vendors WHERE user_id = auth.uid()
  )
);

-- Allow public to view active products from verified vendors
CREATE POLICY "Public can view active products" 
ON public.products FOR SELECT 
USING (
  is_active = true 
  AND vendor_id IN (
    SELECT id FROM public.vendors WHERE verification_status = 'verified'
  )
);

-- Fix categories table for admin access
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;

-- Allow everyone to view categories
CREATE POLICY "Public can view categories" 
ON public.categories FOR SELECT 
USING (true);

-- Allow admins to manage categories
CREATE POLICY "Admins can manage categories" 
ON public.categories FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Fix user_roles table for admin access
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can add vendor role for themselves" ON public.user_roles;
DROP POLICY IF EXISTS "Users can add customer role for themselves" ON public.user_roles;

-- Allow admins to manage all user roles
CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to add vendor role for themselves during registration
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

-- Allow users to add customer role for themselves
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

-- Create profiles table policies if they don't exist
CREATE POLICY "Users can view and edit their own profile" 
ON public.profiles FOR ALL 
USING (auth.uid() = user_id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create orders table policies (if orders table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
    
    -- Allow admins to view all orders
    EXECUTE 'CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
    
    -- Allow customers to view their own orders
    EXECUTE 'CREATE POLICY "Customers can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id)';
    
    -- Allow vendors to view orders for their products
    EXECUTE 'CREATE POLICY "Vendors can view orders for their products" ON public.orders FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.products p ON oi.product_id = p.id
        JOIN public.vendors v ON p.vendor_id = v.id
        WHERE oi.order_id = orders.id AND v.user_id = auth.uid()
      )
    )';
  END IF;
END $$;
