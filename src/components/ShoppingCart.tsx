import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart as CartIcon, 
  Plus, 
  Minus, 
  Trash2, 
  Package,
  ArrowRight,
  X
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface ShoppingCartProps {
  trigger?: 'icon' | 'button';
  showItemCount?: boolean;
}

export const ShoppingCart = ({ trigger = 'icon', showItemCount = true }: ShoppingCartProps) => {
  const { state, updateQuantity, removeFromCart, clearCart, getCartTotal, getItemCount } = useCart();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Debug logging
  console.log('Cart state:', state);
  console.log('Cart item count:', getItemCount());
  console.log('Cart is open:', isOpen);

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleCartClick = () => {
    console.log('Cart clicked, opening cart');
    setIsOpen(true);
  };

  const TriggerComponent = () => {
    if (trigger === 'button') {
      return (
        <Button variant="outline" className="relative">
          <CartIcon className="h-4 w-4 mr-2" />
          Cart
          {showItemCount && getItemCount() > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {getItemCount()}
            </Badge>
          )}
        </Button>
      );
    }

    return (
      <Button variant="ghost" size="icon" className="relative">
        <CartIcon className="h-5 w-5" />
        {showItemCount && getItemCount() > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
            {getItemCount()}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <React.Fragment>
      <div onClick={handleCartClick} style={{ cursor: 'pointer' }}>
        <TriggerComponent />
      </div>

      {/* Simple Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsOpen(false)}>
          <div 
            className="fixed right-0 top-0 h-full w-full sm:max-w-lg bg-background shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CartIcon className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Shopping Cart ({getItemCount()} items)</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Review your items and proceed to checkout
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col">
                {state.items.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        Your cart is empty
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Add some fresh produce to get started
                      </p>
                      <Button onClick={() => {
                        setIsOpen(false);
                        navigate('/products');
                      }}>
                        Browse Products
                      </Button>
                    </div>
                  </div>
                ) : (
                  <React.Fragment>
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="space-y-4">
                        {state.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                From {item.vendorName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatPrice(item.price)} per {item.unit}
                              </p>
                              <p className="text-sm font-medium">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.id)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                  className="w-12 h-6 text-center text-xs"
                                  min="1"
                                  max={item.maxStock}
                                />
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  className="h-6 w-6 p-0"
                                  disabled={item.quantity >= item.maxStock}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <span className="text-xs text-muted-foreground">
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-lg font-bold text-primary">
                          {formatPrice(getCartTotal())}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={clearCart}
                          className="flex-1"
                          disabled={state.items.length === 0}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear Cart
                        </Button>
                        
                        <Button
                          onClick={handleCheckout}
                          className="flex-1"
                          disabled={state.items.length === 0}
                        >
                          Checkout
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground text-center">
                        Delivery fees will be calculated at checkout
                      </p>
                    </div>
                  </React.Fragment>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};
