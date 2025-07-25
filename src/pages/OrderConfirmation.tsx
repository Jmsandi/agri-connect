import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Package, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  CreditCard,
  ArrowLeft,
  Download,
  Share
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/utils/currency";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { format } from "date-fns";

interface Order {
  id: string;
  total_amount: number;
  delivery_address: string;
  delivery_fee: number;
  status: string;
  payment_status: string;
  payment_method: string;
  notes: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products: {
      id: string;
      name: string;
      unit: string;
      image_url: string | null;
      vendors: {
        business_name: string;
        location: string | null;
      };
    };
  }[];
}

const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

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
              id,
              name,
              unit,
              image_url,
              vendors (
                business_name,
                location
              )
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
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



  const getStatusBadge = (status: string, type: 'order' | 'payment' = 'order') => {
    const configs = {
      order: {
        pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
        confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
        dispatched: { label: 'Dispatched', color: 'bg-purple-100 text-purple-800' },
        in_transit: { label: 'In Transit', color: 'bg-orange-100 text-orange-800' },
        delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
        cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
      },
      payment: {
        pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
        completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
        failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
      }
    };

    const config = configs[type][status as keyof typeof configs[typeof type]] || 
                   { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      orange_money: 'Orange Money',
      afrimoney: 'AfriMoney',
      stripe: 'Credit/Debit Card',
    };
    return methods[method as keyof typeof methods] || method;
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
              The order you're looking for doesn't exist or you don't have access to it.
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">Order Confirmed!</h1>
            <p className="text-lg text-muted-foreground">
              Thank you for your order. We've received your request and will process it shortly.
            </p>
          </div>

          {/* Order Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Order Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Order #{order.id.slice(-8)}
                    </span>
                    <div className="flex gap-2">
                      {getStatusBadge(order.status)}
                      {getStatusBadge(order.payment_status, 'payment')}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Placed on {format(new Date(order.created_at), 'PPP')} at {format(new Date(order.created_at), 'p')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        {item.products.image_url ? (
                          <img
                            src={item.products.image_url}
                            alt={item.products.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <h4 className="font-medium">{item.products.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            From {item.products.vendors.business_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {item.products.unit} × {formatPrice(item.unit_price)}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(item.subtotal)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Customer Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{order.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{order.customer_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{order.customer_phone}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Delivery Address</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {order.delivery_address}
                    </p>
                  </div>

                  {order.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Order Notes</h4>
                        <p className="text-sm text-muted-foreground">
                          {order.notes}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                      <p className="mt-1">{getPaymentMethodLabel(order.payment_method)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Payment Status</label>
                      <div className="mt-1">
                        {getStatusBadge(order.payment_status, 'payment')}
                      </div>
                    </div>
                  </div>
                  
                  {order.payment_status === 'pending' && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Payment Pending:</strong> You will receive payment instructions shortly via email or SMS.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Total</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(order.total_amount - order.delivery_fee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>{formatPrice(order.delivery_fee)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-primary">{formatPrice(order.total_amount)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Button className="w-full" onClick={() => navigate("/products")}>
                      Continue Shopping
                    </Button>
                    
                    <Button variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </Button>
                    
                    <Button variant="outline" className="w-full">
                      <Share className="h-4 w-4 mr-2" />
                      Share Order
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• You will receive email updates about your order</p>
                    <p>• Estimated delivery: 1-3 business days</p>
                    <p>• Contact support if you have any questions</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => navigate("/products")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderConfirmation;
