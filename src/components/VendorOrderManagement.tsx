import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  XCircle,
  User,
  Phone,
  MapPin,
  Edit,
  Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/utils/currency";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    id: string;
    name: string;
    unit: string;
    image_url: string | null;
  };
}

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
  order_items: OrderItem[];
}

interface VendorOrderManagementProps {
  vendorId: string;
}

export const VendorOrderManagement = ({ vendorId }: VendorOrderManagementProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [vendorId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Get orders that contain products from this vendor
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items!inner (
            id,
            quantity,
            unit_price,
            subtotal,
            products!inner (
              id,
              name,
              unit,
              image_url,
              vendor_id
            )
          )
        `)
        .eq('order_items.products.vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter order items to only include items from this vendor
      const filteredOrders = (data || []).map(order => ({
        ...order,
        order_items: order.order_items.filter(item => item.products.vendor_id === vendorId)
      }));

      setOrders(filteredOrders);

    } catch (error) {
      console.error('Error fetching vendor orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));

      toast({
        title: "Status Updated",
        description: `Order status updated to ${newStatus}`,
      });

    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.order_items.some(item => 
        item.products.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });



  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      dispatched: { label: 'Dispatched', color: 'bg-purple-100 text-purple-800', icon: Truck },
      in_transit: { label: 'In Transit', color: 'bg-orange-100 text-orange-800', icon: Truck },
      delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const config = configs[status as keyof typeof configs] || 
                   { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getVendorOrderTotal = (order: Order) => {
    return order.order_items.reduce((sum, item) => sum + item.subtotal, 0);
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
          <h2 className="text-2xl font-bold text-primary">Order Management</h2>
          <p className="text-muted-foreground">
            Manage orders for your products
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders, customers, or products..."
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
            <p className="text-muted-foreground">
              {orders.length === 0 
                ? "Orders for your products will appear here"
                : "Try adjusting your search or filter criteria"
              }
            </p>
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
                      From {order.customer_name} • {format(new Date(order.created_at), 'PPP')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(order.status)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Order Items */}
                <div className="space-y-2">
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
                      
                      <div className="flex-1">
                        <p className="font-medium">{item.products.name}</p>
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

                {/* Customer Info & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Total for your items: {formatPrice(getVendorOrderTotal(order))}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {order.customer_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {order.customer_phone}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Order Details</DialogTitle>
                          <DialogDescription>
                            Order #{selectedOrder?.id.slice(-8)} from {selectedOrder?.customer_name}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedOrder && (
                          <div className="space-y-6">
                            {/* Customer Information */}
                            <div>
                              <h4 className="font-medium mb-3">Customer Information</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <label className="text-muted-foreground">Name:</label>
                                  <p className="font-medium">{selectedOrder.customer_name}</p>
                                </div>
                                <div>
                                  <label className="text-muted-foreground">Email:</label>
                                  <p className="font-medium">{selectedOrder.customer_email}</p>
                                </div>
                                <div>
                                  <label className="text-muted-foreground">Phone:</label>
                                  <p className="font-medium">{selectedOrder.customer_phone}</p>
                                </div>
                                <div>
                                  <label className="text-muted-foreground">Payment:</label>
                                  <p className="font-medium">{selectedOrder.payment_method}</p>
                                </div>
                              </div>
                            </div>

                            {/* Delivery Address */}
                            <div>
                              <h4 className="font-medium mb-2">Delivery Address</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-line">
                                {selectedOrder.delivery_address}
                              </p>
                            </div>

                            {/* Order Items */}
                            <div>
                              <h4 className="font-medium mb-3">Your Items</h4>
                              <div className="space-y-2">
                                {selectedOrder.order_items.map((item) => (
                                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                    {item.products.image_url ? (
                                      <img
                                        src={item.products.image_url}
                                        alt={item.products.name}
                                        className="w-12 h-12 rounded object-cover"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}
                                    
                                    <div className="flex-1">
                                      <p className="font-medium">{item.products.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {item.quantity} {item.products.unit} × {formatPrice(item.unit_price)}
                                      </p>
                                    </div>
                                    
                                    <span className="font-medium">
                                      {formatPrice(item.subtotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Notes */}
                            {selectedOrder.notes && (
                              <div>
                                <h4 className="font-medium mb-2">Order Notes</h4>
                                <p className="text-sm text-muted-foreground">
                                  {selectedOrder.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="dispatched">Dispatched</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
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
                <p className="text-2xl font-bold text-yellow-600">
                  {orders.filter(o => o.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === 'delivered').length}
                </p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(orders.reduce((sum, order) => sum + getVendorOrderTotal(order), 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
