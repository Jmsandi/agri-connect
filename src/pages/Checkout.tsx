import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  ShoppingCart, 
  User, 
  MapPin, 
  CreditCard, 
  Truck,
  Package,
  ArrowLeft,
  ArrowRight,
  Phone,
  Mail
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/utils/currency";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const checkoutSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  delivery_address: z.string().min(1, "Delivery address is required"),
  payment_method: z.enum(["orange_money", "afrimoney", "stripe"], {
    required_error: "Please select a payment method",
  }),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const Checkout = () => {
  const navigate = useNavigate();
  const { state, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [deliveryFee, setDeliveryFee] = useState(5.00); // Default delivery fee

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      delivery_address: "",
      payment_method: "orange_money",
      notes: "",
    },
  });

  useEffect(() => {
    // Check if cart is empty
    if (state.items.length === 0) {
      navigate("/products");
      return;
    }

    // Get current user and profile
    getCurrentUser();
  }, [state.items.length, navigate]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to continue with checkout",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setUser(user);

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        // Pre-fill form with profile data
        form.reset({
          full_name: profileData.full_name || "",
          email: user.email || "",
          phone: profileData.phone || "",
          delivery_address: profileData.address || "",
          payment_method: "orange_money",
          notes: "",
        });
      } else {
        // Pre-fill with user email at least
        form.reset({
          ...form.getValues(),
          email: user.email || "",
        });
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const calculateTotal = () => {
    return state.total + deliveryFee;
  };

  const groupedItems = state.items.reduce((groups, item) => {
    const vendorId = item.vendorId;
    if (!groups[vendorId]) {
      groups[vendorId] = {
        vendorName: item.vendorName,
        items: [],
        subtotal: 0,
      };
    }
    groups[vendorId].items.push(item);
    groups[vendorId].subtotal += item.price * item.quantity;
    return groups;
  }, {} as Record<string, { vendorName: string; items: typeof state.items; subtotal: number }>);

  const onSubmit = async (data: CheckoutFormData) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to place an order",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      // Create order
      const orderData = {
        customer_id: user.id,
        total_amount: calculateTotal(),
        delivery_address: data.delivery_address,
        delivery_fee: deliveryFee,
        status: 'pending',
        payment_status: 'pending',
        payment_method: data.payment_method,
        notes: data.notes || null,
        customer_name: data.full_name,
        customer_email: data.email,
        customer_phone: data.phone,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = state.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      clearCart();

      toast({
        title: "Order placed successfully!",
        description: `Your order #${order.id.slice(-8)} has been placed and is being processed.`,
      });

      // Navigate to payment page
      navigate(`/payment/${order.id}?method=${data.payment_method}`);

    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        title: "Order failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-4">
              Add some products to your cart before checking out
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/products")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue Shopping
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary">Checkout</h1>
              <p className="text-muted-foreground">
                Review your order and complete your purchase
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Customer Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your phone number" {...field} />
                            </FormControl>
                            <FormDescription>
                              For delivery coordination and order updates
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Delivery Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Delivery Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="delivery_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Address *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter your complete delivery address..."
                                className="resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Please provide a detailed address for accurate delivery
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Delivery Fee</span>
                        </div>
                        <span className="font-medium">{formatPrice(deliveryFee)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Method */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="payment_method"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-1 gap-4"
                              >
                                <div className="flex items-center space-x-2 border rounded-lg p-4">
                                  <RadioGroupItem value="orange_money" id="orange_money" />
                                  <Label htmlFor="orange_money" className="flex-1 cursor-pointer">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">Orange Money</p>
                                        <p className="text-sm text-muted-foreground">
                                          Pay with your Orange Money account
                                        </p>
                                      </div>
                                      <Badge variant="secondary">Mobile Money</Badge>
                                    </div>
                                  </Label>
                                </div>

                                <div className="flex items-center space-x-2 border rounded-lg p-4">
                                  <RadioGroupItem value="afrimoney" id="afrimoney" />
                                  <Label htmlFor="afrimoney" className="flex-1 cursor-pointer">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">AfriMoney</p>
                                        <p className="text-sm text-muted-foreground">
                                          Pay with your AfriMoney account
                                        </p>
                                      </div>
                                      <Badge variant="secondary">Mobile Money</Badge>
                                    </div>
                                  </Label>
                                </div>

                                <div className="flex items-center space-x-2 border rounded-lg p-4">
                                  <RadioGroupItem value="stripe" id="stripe" />
                                  <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">Credit/Debit Card</p>
                                        <p className="text-sm text-muted-foreground">
                                          Pay with Visa, Mastercard, or other cards
                                        </p>
                                      </div>
                                      <Badge variant="outline">International</Badge>
                                    </div>
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Order Notes */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Notes (Optional)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Any special instructions for your order..."
                                className="resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Special delivery instructions, preferences, etc.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Place Order"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </Form>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items by Vendor */}
                  {Object.entries(groupedItems).map(([vendorId, group]) => (
                    <div key={vendorId} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {group.vendorName}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 text-sm">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className="text-muted-foreground">
                                {item.quantity} {item.unit} × {formatPrice(item.price)}
                              </p>
                            </div>
                            
                            <span className="font-medium">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <Separator />
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(state.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>{formatPrice(deliveryFee)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-primary">{formatPrice(calculateTotal())}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>• Payment will be processed securely</p>
                    <p>• You will receive order confirmation via email</p>
                    <p>• Delivery typically takes 1-3 business days</p>
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

export default Checkout;
