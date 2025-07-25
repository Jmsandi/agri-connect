import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, DollarSign, AlertCircle, Settings, LogOut, User as UserIcon, BarChart3, ShoppingCart, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProductManagement } from "@/components/ProductManagement";
import { OrderManagement } from "@/components/OrderManagement";
import { InventoryMonitoring } from "@/components/InventoryMonitoring";
import { SalesAnalytics } from "@/components/SalesAnalytics";
import { VendorProfile } from "@/components/VendorProfile";
import { toast } from "@/hooks/use-toast";

interface Vendor {
  id: string;
  business_name: string;
  description: string;
  location: string;
  verification_status: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  stock_quantity: number;
  is_active: boolean;
  categories: {
    name: string;
  };
}

const VendorDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("products");

  useEffect(() => {
    // Handle tab parameter from URL
    const tabParam = searchParams.get('tab');
    if (tabParam && ['products', 'orders', 'inventory', 'analytics', 'profile'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchVendorData();
    }
  }, [user]);

  const fetchVendorData = async () => {
    if (!user) return;

    try {
      // Check if user is a vendor
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isVendor = roles?.some(role => role.role === 'vendor');
      
      if (!isVendor) {
        navigate("/vendor-registration");
        return;
      }

      // Fetch vendor profile
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (vendorError) throw vendorError;
      setVendor(vendorData);

      // Fetch vendor products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          categories (name)
        `)
        .eq('vendor_id', vendorData.id);

      if (productsError) throw productsError;
      setProducts(productsData || []);

    } catch (error) {
      console.error('Error fetching vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Vendor Registration Required</CardTitle>
              <CardDescription>
                You need to complete vendor registration to access the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/vendor-registration")} className="w-full">
                Complete Registration
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const activeProducts = products.filter(p => p.is_active);
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0);
  const lowStockProducts = products.filter(p => p.stock_quantity <= 10 && p.is_active);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0 && p.is_active);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Vendor Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Welcome back, {vendor.business_name}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={vendor.verification_status === 'verified' ? 'default' : 'secondary'}
              className={vendor.verification_status === 'verified' ? 'bg-green-100 text-green-800' : ''}
            >
              {vendor.verification_status === 'verified' ? '✓ Verified' : vendor.verification_status}
            </Badge>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {vendor.verification_status !== 'verified' && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Account Verification Pending</p>
                <p className="text-sm text-orange-600">
                  Your vendor account is under review. Some features may be limited until verification is complete.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold text-blue-600">{totalProducts}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeProducts.length} active
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Stock</p>
                  <p className="text-2xl font-bold text-green-600">{totalStock}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    units available
                  </p>
                </div>
                <Archive className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Inventory Value</p>
                  <p className="text-2xl font-bold text-yellow-600">${totalValue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    total worth
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≤10 units left
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    need restocking
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                Low Stock Alert
              </CardTitle>
              <CardDescription className="text-orange-700">
                {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} running low on stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lowStockProducts.slice(0, 6).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.categories.name}</p>
                    </div>
                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                      {product.stock_quantity} {product.unit}
                    </Badge>
                  </div>
                ))}
              </div>
              {lowStockProducts.length > 6 && (
                <p className="text-sm text-orange-700 mt-4">
                  And {lowStockProducts.length - 6} more products need restocking...
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <ProductManagement vendorId={vendor.id} />
          </TabsContent>

          <TabsContent value="orders">
            <OrderManagement vendorId={vendor.id} />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryMonitoring vendorId={vendor.id} />
          </TabsContent>

          <TabsContent value="analytics">
            <SalesAnalytics vendorId={vendor.id} />
          </TabsContent>

          <TabsContent value="profile">
            <VendorProfile vendorId={vendor.id} userEmail={user?.email || ''} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default VendorDashboard;