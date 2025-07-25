import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users,
  Calendar,
  RefreshCw,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

interface ProductSales {
  name: string;
  sales: number;
  revenue: number;
  quantity: number;
}

interface CategorySales {
  name: string;
  value: number;
  percentage: number;
}

interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

interface SalesAnalyticsProps {
  vendorId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const SalesAnalytics = ({ vendorId }: SalesAnalyticsProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalCustomers: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [vendorId, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      const days = parseInt(timeRange);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      // Fetch orders data
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            subtotal,
            products (
              name,
              categories (name)
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('order_items.products.vendor_id', vendorId)
        .eq('payment_status', 'completed');

      if (ordersError) throw ordersError;

      // Process sales data by date
      const salesByDate = new Map<string, { revenue: number; orders: number; customers: Set<string> }>();
      
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        salesByDate.set(date, { revenue: 0, orders: 0, customers: new Set() });
      }

      orders?.forEach(order => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        const existing = salesByDate.get(date);
        if (existing) {
          existing.revenue += order.total_amount;
          existing.orders += 1;
          existing.customers.add(order.customer_id);
        }
      });

      const processedSalesData = Array.from(salesByDate.entries())
        .map(([date, data]) => ({
          date: format(new Date(date), 'MMM dd'),
          revenue: data.revenue,
          orders: data.orders,
          customers: data.customers.size,
        }))
        .reverse();

      setSalesData(processedSalesData);

      // Process product sales
      const productSalesMap = new Map<string, { sales: number; revenue: number; quantity: number }>();
      
      orders?.forEach(order => {
        order.order_items.forEach(item => {
          const productName = item.products.name;
          const existing = productSalesMap.get(productName);
          if (existing) {
            existing.sales += 1;
            existing.revenue += item.subtotal;
            existing.quantity += item.quantity;
          } else {
            productSalesMap.set(productName, {
              sales: 1,
              revenue: item.subtotal,
              quantity: item.quantity,
            });
          }
        });
      });

      const processedProductSales = Array.from(productSalesMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setProductSales(processedProductSales);

      // Process category sales
      const categorySalesMap = new Map<string, number>();
      let totalCategoryRevenue = 0;

      orders?.forEach(order => {
        order.order_items.forEach(item => {
          const categoryName = item.products.categories.name;
          const revenue = item.subtotal;
          categorySalesMap.set(categoryName, (categorySalesMap.get(categoryName) || 0) + revenue);
          totalCategoryRevenue += revenue;
        });
      });

      const processedCategorySales = Array.from(categorySalesMap.entries())
        .map(([name, value]) => ({
          name,
          value,
          percentage: totalCategoryRevenue > 0 ? (value / totalCategoryRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);

      setCategorySales(processedCategorySales);

      // Calculate metrics
      const totalRevenue = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const totalOrders = orders?.length || 0;
      const uniqueCustomers = new Set(orders?.map(order => order.customer_id)).size;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate growth (compare with previous period)
      const previousStartDate = startOfDay(subDays(startDate, days));
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString())
        .eq('payment_status', 'completed');

      const previousRevenue = previousOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const previousOrderCount = previousOrders?.length || 0;

      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      const ordersGrowth = previousOrderCount > 0 ? ((totalOrders - previousOrderCount) / previousOrderCount) * 100 : 0;

      setMetrics({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalCustomers: uniqueCustomers,
        revenueGrowth,
        ordersGrowth,
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
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
          <h2 className="text-2xl font-bold text-primary">Sales Analytics</h2>
          <p className="text-muted-foreground">
            Track your sales performance and revenue trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={fetchAnalyticsData} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(metrics.totalRevenue)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {metrics.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(metrics.revenueGrowth)}
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalOrders}</p>
                <div className="flex items-center gap-1 mt-1">
                  {metrics.ordersGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs ${metrics.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(metrics.ordersGrowth)}
                  </span>
                </div>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(metrics.averageOrderValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Per order
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
                <p className="text-sm font-medium text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.totalCustomers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Unique buyers
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Orders Trend</CardTitle>
              <CardDescription>
                Daily revenue and order count over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'revenue' ? formatCurrency(Number(value)) : value,
                        name === 'revenue' ? 'Revenue' : 'Orders'
                      ]}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#82ca9d"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>
                Products ranked by revenue generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productSales} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>
                Revenue distribution across product categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySales}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categorySales.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* No Data State */}
      {metrics.totalOrders === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No sales data yet</h3>
            <p className="text-muted-foreground">
              Analytics will appear here once you start receiving orders
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
