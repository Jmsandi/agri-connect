import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Calendar, 
  Search, 
  Filter,
  Eye,
  RefreshCw,
  ShoppingBag,
  Truck,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/utils/currency";
import { format } from "date-fns";

interface Order {
  id: string;
  total_amount: number;
  delivery_address: string;
  delivery_fee: number;
  status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products: {
      name: string;
      unit: string;
      image_url: string | null;
      vendors: {
        business_name: string;
      };
    };
  }[];
}

interface CustomerOrderHistoryProps {
  userId: string;
}

export const CustomerOrderHistory = ({ userId }: CustomerOrderHistoryProps) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

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
              image_url,
              vendors (
                business_name
              )
            )
          )
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);

    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load order history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order_items.some(item => 
        item.products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.products.vendors.business_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || order.payment_status === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });



  const getStatusBadge = (status: string, type: 'order' | 'payment' = 'order') => {
    const configs = {
      order: {
        pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
        confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
        dispatched: { label: 'Dispatched', color: 'bg-purple-100 text-purple-800', icon: Truck },
        in_transit: { label: 'In Transit', color: 'bg-orange-100 text-orange-800', icon: Truck },
        delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
        cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
      },
      payment: {
        pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
        completed: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle },
        failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle },
      }
    };

    const config = configs[type][status as keyof typeof configs[typeof type]] || 
                   { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Order History</h2>
          <p className="text-muted-foreground">
            Track your orders and view purchase history
          </p>
        </div>
        <Button 
          onClick={fetchOrders} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders, products, or vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {orders.length === 0 ? "No orders yet" : "No orders match your filters"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {orders.length === 0 
                ? "Start shopping to see your orders here"
                : "Try adjusting your search or filter criteria"
              }
            </p>
            {orders.length === 0 && (
              <Button onClick={() => navigate("/products")}>
                Browse Products
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Order #{order.id.slice(-8)}
                    </CardTitle>
                    <CardDescription>
                      Placed on {format(new Date(order.created_at), 'PPP')} at {format(new Date(order.created_at), 'p')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {getStatusBadge(order.status)}
                    {getStatusBadge(order.payment_status, 'payment')}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Order Items Preview */}
                <div className="space-y-2">
                  {order.order_items.slice(0, 2).map((item) => (
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
                      
                      <div className="flex-1">
                        <p className="font-medium">{item.products.name}</p>
                        <p className="text-muted-foreground">
                          From {item.products.vendors.business_name} • {item.quantity} {item.products.unit}
                        </p>
                      </div>
                      
                      <span className="font-medium">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                  
                  {order.order_items.length > 2 && (
                    <p className="text-sm text-muted-foreground">
                      +{order.order_items.length - 2} more item{order.order_items.length - 2 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Order Summary */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Payment: {getPaymentMethodLabel(order.payment_method)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.order_items.length} item{order.order_items.length > 1 ? 's' : ''} • Total: {formatPrice(order.total_amount)}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/order-confirmation/${order.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {order.payment_status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/payment/${order.id}`)}
                      >
                        Complete Payment
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{orders.length}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === 'delivered').length}
                </p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {orders.filter(o => ['pending', 'confirmed', 'dispatched', 'in_transit'].includes(o.status)).length}
                </p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(orders.reduce((sum, order) => sum + order.total_amount, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
