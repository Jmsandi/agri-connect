import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter,
  Archive,
  DollarSign,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  stock_quantity: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  categories: {
    name: string;
  };
}

interface InventoryStats {
  totalProducts: number;
  activeProducts: number;
  totalStock: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  averageStockLevel: number;
}

interface InventoryMonitoringProps {
  vendorId: string;
}

export const InventoryMonitoring = ({ vendorId }: InventoryMonitoringProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("stock_asc");

  useEffect(() => {
    fetchProducts();
  }, [vendorId]);

  const fetchProducts = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (name)
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (): InventoryStats => {
    const activeProducts = products.filter(p => p.is_active);
    const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
    const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0);
    const lowStockCount = products.filter(p => p.stock_quantity <= 10 && p.stock_quantity > 0 && p.is_active).length;
    const outOfStockCount = products.filter(p => p.stock_quantity === 0 && p.is_active).length;
    const averageStockLevel = products.length > 0 ? totalStock / products.length : 0;

    return {
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      totalStock,
      totalValue,
      lowStockCount,
      outOfStockCount,
      averageStockLevel,
    };
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { 
      label: "Out of Stock", 
      variant: "destructive" as const, 
      color: "bg-red-100 text-red-800",
      priority: 3
    };
    if (quantity <= 5) return { 
      label: "Critical", 
      variant: "destructive" as const, 
      color: "bg-red-100 text-red-800",
      priority: 2
    };
    if (quantity <= 10) return { 
      label: "Low Stock", 
      variant: "secondary" as const, 
      color: "bg-yellow-100 text-yellow-800",
      priority: 1
    };
    return { 
      label: "In Stock", 
      variant: "default" as const, 
      color: "bg-green-100 text-green-800",
      priority: 0
    };
  };

  const getStockLevel = (quantity: number) => {
    const maxStock = Math.max(...products.map(p => p.stock_quantity), 100);
    return Math.min((quantity / maxStock) * 100, 100);
  };

  const filteredAndSortedProducts = () => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.categories.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesFilter = true;
      switch (stockFilter) {
        case 'out_of_stock':
          matchesFilter = product.stock_quantity === 0;
          break;
        case 'low_stock':
          matchesFilter = product.stock_quantity > 0 && product.stock_quantity <= 10;
          break;
        case 'in_stock':
          matchesFilter = product.stock_quantity > 10;
          break;
        case 'active':
          matchesFilter = product.is_active;
          break;
        case 'inactive':
          matchesFilter = !product.is_active;
          break;
      }
      
      return matchesSearch && matchesFilter;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'stock_asc':
          return a.stock_quantity - b.stock_quantity;
        case 'stock_desc':
          return b.stock_quantity - a.stock_quantity;
        case 'value_desc':
          return (b.stock_quantity * b.price) - (a.stock_quantity * a.price);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'priority':
          return getStockStatus(a.stock_quantity).priority - getStockStatus(b.stock_quantity).priority;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const stats = calculateStats();
  const filteredProducts = filteredAndSortedProducts();

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
          <h2 className="text-2xl font-bold text-primary">Inventory Monitoring</h2>
          <p className="text-muted-foreground">
            Track stock levels and manage inventory alerts
          </p>
        </div>
        <Button 
          onClick={fetchProducts} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stock Units</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalStock.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {stats.averageStockLevel.toFixed(1)} per product
                </p>
              </div>
              <Archive className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold text-green-600">${stats.totalValue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activeProducts} active products
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Need restocking soon
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStockCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Immediate attention needed
                </p>
              </div>
              <Package className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {(stats.outOfStockCount > 0 || stats.lowStockCount > 0) && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-orange-800">
            <strong>Inventory Alert:</strong> You have {stats.outOfStockCount} out-of-stock and {stats.lowStockCount} low-stock items that need attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority (Stock Status)</SelectItem>
                  <SelectItem value="stock_asc">Stock: Low to High</SelectItem>
                  <SelectItem value="stock_desc">Stock: High to Low</SelectItem>
                  <SelectItem value="value_desc">Value: High to Low</SelectItem>
                  <SelectItem value="name_asc">Name: A to Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Inventory Details ({filteredProducts.length})
          </CardTitle>
          <CardDescription>
            Detailed view of your product inventory with stock levels and values
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No products match your filters
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stock Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product.stock_quantity);
                    const stockLevel = getStockLevel(product.stock_quantity);
                    const totalValue = product.stock_quantity * product.price;
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.is_active ? 'Active' : 'Inactive'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.categories.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {product.stock_quantity} {product.unit}
                            </p>
                            <Progress value={stockLevel} className="h-2 w-20" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            ${product.price.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            ${totalValue.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={stockStatus.color}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {stockStatus.priority <= 1 ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {stockLevel.toFixed(0)}%
                            </span>
                          </div>
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
