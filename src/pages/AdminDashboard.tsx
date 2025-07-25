import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  LogOut,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdminVerification } from "@/components/AdminVerification";

interface AdminStats {
  totalVendors: number;
  pendingVendors: number;
  verifiedVendors: number;
  totalProducts: number;
  totalOrders: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalVendors: 0,
    pendingVendors: 0,
    verifiedVendors: 0,
    totalProducts: 0,
    totalOrders: 0,
  });

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
      
      if (session?.user) {
        checkAdminAccess(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminAccess = async (userId: string) => {
    try {
      // Check if user has admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const hasAdminRole = roles?.some(role => role.role === 'admin');
      
      if (!hasAdminRole) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchStats();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('Fetching admin stats...');

      // Fetch vendor stats
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('verification_status');

      console.log('Vendors stats query:', { vendors, vendorsError });

      if (vendorsError) {
        console.error('Error fetching vendors for stats:', vendorsError);
      }

      const totalVendors = vendors?.length || 0;
      const pendingVendors = vendors?.filter(v => v.verification_status === 'pending').length || 0;
      const verifiedVendors = vendors?.filter(v => v.verification_status === 'verified').length || 0;

      // Fetch product stats
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id');

      console.log('Products stats query:', { products, productsError });

      const totalProducts = products?.length || 0;

      // Fetch order stats (this might fail if orders table doesn't exist yet)
      let totalOrders = 0;
      try {
        const { data: orders } = await supabase
          .from('orders')
          .select('id');
        totalOrders = orders?.length || 0;
      } catch (ordersError) {
        console.warn('Orders table might not exist yet:', ordersError);
      }

      const newStats = {
        totalVendors,
        pendingVendors,
        verifiedVendors,
        totalProducts,
        totalOrders,
      };

      console.log('Final stats:', newStats);
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your admin account.",
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have admin privileges</p>
          <Button onClick={() => navigate("/")}>Return to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">
              Welcome back, Administrator
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-red-100 text-red-800">Admin</Badge>
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Vendors</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalVendors}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.verifiedVendors} verified
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Pending Verification</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pendingVendors}</p>
                  <p className="text-xs text-orange-700 mt-1">
                    Need review
                  </p>
                </div>
                <Shield className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Verified Vendors</p>
                  <p className="text-2xl font-bold text-green-600">{stats.verifiedVendors}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Active sellers
                  </p>
                </div>
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalProducts}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    In marketplace
                  </p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.totalOrders}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Verification Alert */}
        {stats.pendingVendors > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-orange-600" />
                  <div>
                    <h4 className="font-medium text-orange-800">
                      {stats.pendingVendors} vendor{stats.pendingVendors > 1 ? 's' : ''} awaiting verification
                    </h4>
                    <p className="text-sm text-orange-700">
                      Review and verify vendor applications to allow them to sell on the platform
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => {
                    // Scroll to verification section or switch tab
                    document.getElementById('verification-tab')?.click();
                  }}
                >
                  Review Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Tabs */}
        <Tabs defaultValue="verification" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="verification" id="verification-tab" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Vendor Verification
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Vendors
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verification">
            <AdminVerification />
          </TabsContent>

          <TabsContent value="vendors">
            <Card>
              <CardHeader>
                <CardTitle>All Vendors</CardTitle>
                <CardDescription>
                  Complete list of all registered vendors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Vendor management interface coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>
                  Manage all products across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Product management interface coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
                <CardDescription>
                  Platform-wide statistics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Analytics dashboard coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
