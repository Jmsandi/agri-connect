-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dispatched', 'in_transit', 'delivered', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('orange_money', 'afrimoney', 'stripe')),
  notes TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('orange_money', 'afrimoney', 'stripe')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'SLL',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  transaction_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders table
CREATE POLICY "Customers can view their own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create their own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own orders" 
ON public.orders FOR UPDATE 
USING (auth.uid() = customer_id);

-- Allow vendors to view orders that contain their products
CREATE POLICY "Vendors can view orders for their products" 
ON public.orders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE oi.order_id = orders.id AND v.user_id = auth.uid()
  )
);

-- Allow vendors to update order status for orders containing their products
CREATE POLICY "Vendors can update orders for their products" 
ON public.orders FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    JOIN public.vendors v ON p.vendor_id = v.id
    WHERE oi.order_id = orders.id AND v.user_id = auth.uid()
  )
);

-- Allow admins to manage all orders
CREATE POLICY "Admins can manage all orders" 
ON public.orders FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for order_items table
CREATE POLICY "Users can view order items for their orders" 
ON public.order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id 
    AND (
      o.customer_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.vendors v ON p.vendor_id = v.id
        WHERE p.id = order_items.product_id AND v.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Customers can create order items for their orders" 
ON public.order_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id AND o.customer_id = auth.uid()
  )
);

-- Allow admins to manage all order items
CREATE POLICY "Admins can manage all order items" 
ON public.order_items FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payments table
CREATE POLICY "Users can view payments for their orders" 
ON public.payments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = payments.order_id AND o.customer_id = auth.uid()
  )
);

CREATE POLICY "Users can create payments for their orders" 
ON public.payments FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = payments.order_id AND o.customer_id = auth.uid()
  )
);

-- Allow payment system to update payment status
CREATE POLICY "System can update payment status" 
ON public.payments FOR UPDATE 
USING (true);

-- Allow admins to manage all payments
CREATE POLICY "Admins can manage all payments" 
ON public.payments FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update order totals when items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.orders 
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0) + delivery_fee
    FROM public.order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update order totals
CREATE TRIGGER update_order_total_on_insert
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION update_order_total();

CREATE TRIGGER update_order_total_on_update
  AFTER UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION update_order_total();

CREATE TRIGGER update_order_total_on_delete
  AFTER DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION update_order_total();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update timestamps
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample order statuses for reference
COMMENT ON COLUMN public.orders.status IS 'Order status: pending, confirmed, dispatched, in_transit, delivered, cancelled';
COMMENT ON COLUMN public.orders.payment_status IS 'Payment status: pending, completed, failed, cancelled';
COMMENT ON COLUMN public.orders.payment_method IS 'Payment method: orange_money, afrimoney, stripe';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
