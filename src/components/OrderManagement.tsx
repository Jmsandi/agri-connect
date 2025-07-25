import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, Clock, CheckCircle, Truck, MapPin, User, Phone, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    phone: string | null;
  };
  order_items: OrderItem[];
}

interface OrderManagementProps {
  vendorId: string;
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'dispatched', label: 'Dispatched', color: 'bg-purple-100 text-purple-800' },
  { value: 'in_transit', label: 'In Transit', color: 'bg-orange-100 text-orange-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
];

export const OrderManagement = ({ vendorId }: OrderManagementProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [vendorId]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_customer_id_fkey (
            full_name,
            phone
          ),
          order_items (
            id,
            quantity,
            unit_price,
            subtotal,
            products (
              id,
              name,
              unit,
              image_url
            )
          )
        `)
        .eq('order_items.products.vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
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
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, type: 'order' | 'payment' = 'order') => {
    const statuses = type === 'order' ? ORDER_STATUSES : PAYMENT_STATUSES;
    const statusConfig = statuses.find(s => s.value === status);
    return statusConfig || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'dispatched': 
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.delivery_address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
            Track and manage your customer orders
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search orders by ID, customer, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orders ({filteredOrders.length})
          </CardTitle>
          <CardDescription>
            {orders.length === 0 
              ? "No orders found."
              : `Showing ${filteredOrders.length} of ${orders.length} orders`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {orders.length === 0 ? "No orders yet" : "No orders match your filters"}
              </h3>
              <p className="text-muted-foreground">
                {orders.length === 0 
                  ? "Orders will appear here when customers place them"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const orderStatus = getStatusBadge(order.status);
                    const paymentStatus = getStatusBadge(order.payment_status, 'payment');
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-mono text-sm">
                            #{order.id.slice(-8)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {order.profiles.full_name || 'Unknown Customer'}
                            </p>
                            {order.profiles.phone && (
                              <p className="text-sm text-muted-foreground">
                                {order.profiles.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.order_items.length} item{order.order_items.length > 1 ? 's' : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ${order.total_amount.toFixed(2)}
                          </div>
                          {order.delivery_fee > 0 && (
                            <div className="text-xs text-muted-foreground">
                              +${order.delivery_fee.toFixed(2)} delivery
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={orderStatus.color}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(order.status)}
                              {orderStatus.label}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={paymentStatus.color}>
                            {paymentStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(order.created_at), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh]">
                              <DialogHeader>
                                <DialogTitle>Order Details</DialogTitle>
                                <DialogDescription>
                                  Order #{order.id.slice(-8)} - {format(new Date(order.created_at), 'PPP')}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <ScrollArea className="max-h-[70vh]">
                                <div className="space-y-6 p-1">
                                  {/* Customer Information */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                          <User className="h-4 w-4" />
                                          Customer Information
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-muted-foreground" />
                                          <span>{order.profiles.full_name || 'Unknown Customer'}</span>
                                        </div>
                                        {order.profiles.phone && (
                                          <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>{order.profiles.phone}</span>
                                          </div>
                                        )}
                                        <div className="flex items-start gap-2">
                                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                          <span className="text-sm">{order.delivery_address}</span>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    <Card>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                          <Package className="h-4 w-4" />
                                          Order Status
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        <div>
                                          <label className="text-sm font-medium">Order Status</label>
                                          <Select 
                                            value={order.status} 
                                            onValueChange={(value) => updateOrderStatus(order.id, value)}
                                          >
                                            <SelectTrigger className="mt-1">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {ORDER_STATUSES.map((status) => (
                                                <SelectItem key={status.value} value={status.value}>
                                                  {status.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-muted-foreground" />
                                          <span className="text-sm">
                                            Last updated: {format(new Date(order.updated_at), 'PPp')}
                                          </span>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Order Items */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">Order Items</CardTitle>
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
                                                {item.quantity} {item.products.unit} × ${item.unit_price.toFixed(2)}
                                              </p>
                                            </div>
                                            <div className="text-right">
                                              <p className="font-medium">${item.subtotal.toFixed(2)}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      <Separator className="my-4" />
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span>Subtotal:</span>
                                          <span>${(order.total_amount - order.delivery_fee).toFixed(2)}</span>
                                        </div>
                                        {order.delivery_fee > 0 && (
                                          <div className="flex justify-between">
                                            <span>Delivery Fee:</span>
                                            <span>${order.delivery_fee.toFixed(2)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between font-bold text-lg">
                                          <span>Total:</span>
                                          <span>${order.total_amount.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Payment Information */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Payment Information
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-sm font-medium text-muted-foreground">Payment Status</label>
                                          <Badge className={`${paymentStatus.color} mt-1`}>
                                            {paymentStatus.label}
                                          </Badge>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                                          <p className="mt-1">{order.payment_method || 'Not specified'}</p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Notes */}
                                  {order.notes && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Order Notes</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <p className="text-sm">{order.notes}</p>
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
