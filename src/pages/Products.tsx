import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, Filter, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/utils/currency";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  stock_quantity: number;
  image_url: string;
  category_id: string;
  vendor_id: string;
  categories: {
    name: string;
  };
  vendors: {
    business_name: string;
    location: string | null;
  } | null;
}

interface Category {
  id: string;
  name: string;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (name),
          vendors (business_name, location)
        `)
        .eq('is_active', true)
        .not('vendors', 'is', null); // Only get products with valid vendors

      if (error) throw error;

      // Filter out any products that still have null vendors as a safety measure
      const validProducts = (data || []).filter(product => product.vendors !== null);
      setProducts(validProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      // If the query fails, try a simpler query without vendor filtering
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select(`
            *,
            categories (name),
            vendors (business_name, location)
          `)
          .eq('is_active', true);

        if (fallbackError) throw fallbackError;
        setProducts(fallbackData || []);
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.vendors?.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: Product) => {
    if (!product.vendors) {
      console.error('Product has no vendor information');
      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      image_url: product.image_url,
      vendorId: product.vendor_id,
      vendorName: product.vendors.business_name,
      maxStock: product.stock_quantity,
      quantity: 1,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading products...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">Fresh Produce Marketplace</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover fresh, quality agricultural products directly from local farmers and vendors
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products, vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              {products.length === 0 ? "No products available" : "No products match your search"}
            </h3>
            <p className="text-muted-foreground">
              {products.length === 0
                ? "Check back later for fresh produce from local farmers"
                : "Try adjusting your search terms or category filter"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
            <Card key={product.id} className="group hover:shadow-agricultural transition-all duration-300 hover:scale-105">
              <CardHeader className="p-0">
                <div className="relative h-32 bg-muted rounded-t-lg overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                      <ShoppingCart className="h-12 w-12 text-primary-foreground/60" />
                    </div>
                  )}
                  <Badge className="absolute top-1 right-1 bg-secondary text-xs">
                    {product.categories.name}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-3">
                <CardTitle className="text-sm mb-1 text-primary line-clamp-1">{product.name}</CardTitle>
                <CardDescription className="text-xs mb-2 line-clamp-1">
                  {product.description}
                </CardDescription>

                <div className="space-y-1 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      per {product.unit}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>Stock: {product.stock_quantity} {product.unit}</p>
                    <p className="line-clamp-1">Vendor: {product.vendors?.business_name || 'Unknown Vendor'}</p>
                  </div>
                </div>
                
                <Button
                  className="w-full text-xs py-1"
                  variant="harvest"
                  size="sm"
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock_quantity === 0}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Products;