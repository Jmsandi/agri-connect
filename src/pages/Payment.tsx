import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Package, 
  CreditCard,
  Smartphone,
  CheckCircle,
  XCircle
} from "lucide-react";
import { PaymentProcessor } from "@/components/PaymentProcessor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/utils/currency";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Order {
  id: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products: {
      name: string;
      unit: string;
      image_url: string | null;
    };
  }[];
}

const Payment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // Get payment method from URL params or order
  const paymentMethodParam = searchParams.get('method') as 'orange_money' | 'afrimoney' | 'stripe' | null;

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            subtotal,
            products (
              name,
              unit,
              image_url
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Check if payment is already completed
      if (data.payment_status === 'completed') {
        setPaymentComplete(true);
        toast({
          title: "Payment Already Completed",
          description: "This order has already been paid for.",
        });
        setTimeout(() => navigate(`/order-confirmation/${orderId}`), 2000);
        return;
      }

      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentComplete(true);
    toast({
      title: "Payment Successful!",
      description: "Your payment has been processed successfully.",
    });
    
    // Redirect to order confirmation after a short delay
    setTimeout(() => {
      navigate(`/order-confirmation/${orderId}`);
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };



  const getPaymentMethodInfo = (method: string) => {
    const methods = {
      orange_money: {
        name: 'Orange Money',
        icon: Smartphone,
        color: 'bg-orange-100 text-orange-800',
      },
      afrimoney: {
        name: 'AfriMoney',
        icon: Smartphone,
        color: 'bg-blue-100 text-blue-800',
      },
      stripe: {
        name: 'Credit/Debit Card',
        icon: CreditCard,
        color: 'bg-purple-100 text-purple-800',
      },
    };
    return methods[method as keyof typeof methods] || {
      name: method,
      icon: CreditCard,
      color: 'bg-gray-100 text-gray-800',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Order not found</h1>
            <p className="text-muted-foreground mb-4">
              The order you're trying to pay for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate("/products")}>
              Browse Products
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground mb-4">
              Your payment has been processed successfully. Redirecting to order confirmation...
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const paymentMethod = paymentMethodParam || order.payment_method as 'orange_money' | 'afrimoney' | 'stripe';
  const methodInfo = getPaymentMethodInfo(paymentMethod);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/order-confirmation/${orderId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary">Complete Payment</h1>
              <p className="text-muted-foreground">
                Order #{order.id.slice(-8)} • {formatPrice(order.total_amount)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Payment Processor */}
            <div className="lg:col-span-2">
              <PaymentProcessor
                orderId={order.id}
                amount={order.total_amount}
                paymentMethod={paymentMethod}
                customerInfo={{
                  name: order.customer_name,
                  email: order.customer_email,
                  phone: order.customer_phone,
                }}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                  <CardDescription>
                    Order #{order.id.slice(-8)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Payment Method */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <methodInfo.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{methodInfo.name}</span>
                    </div>
                    <Badge className={methodInfo.color}>
                      Payment Method
                    </Badge>
                  </div>

                  <Separator />

                  {/* Order Items */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Items ({order.order_items.length})</h4>
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 text-sm">
                        {item.products.image_url ? (
                          <img
                            src={item.products.image_url}
                            alt={item.products.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.products.name}</p>
                          <p className="text-muted-foreground">
                            {item.quantity} {item.products.unit} × {formatPrice(item.unit_price)}
                          </p>
                        </div>
                        
                        <span className="font-medium">
                          {formatPrice(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Total */}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">{formatPrice(order.total_amount)}</span>
                  </div>

                  {/* Security Notice */}
                  <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                    <p>🔒 Your payment is secured with industry-standard encryption</p>
                    <p>📱 Mobile money payments are processed securely</p>
                    <p>💳 Card payments are processed via Stripe</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Payment;
