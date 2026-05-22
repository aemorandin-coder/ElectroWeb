'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  stock: number;
  // Shipping fields
  productType?: 'PHYSICAL' | 'DIGITAL';
  weightKg?: number;
  isConsolidable?: boolean;
  shippingCost?: number;
  dimensions?: string; // JSON string: {length, width, height} in cm
  digitalUsername?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbSynced, setDbSynced] = useState(false);
  const { data: session, status } = useSession();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Merge database cart with localStorage cart when logging in
  useEffect(() => {
    if (status === 'authenticated' && isLoaded && !dbSynced) {
      const fetchAndMergeCart = async () => {
        try {
          const res = await fetch('/api/cart');
          if (res.ok) {
            const data = await res.json();
            const dbCart: CartItem[] = data.cartItems || [];

            if (dbCart.length > 0) {
              setItems((currentLocalItems) => {
                const merged = [...currentLocalItems];

                dbCart.forEach((dbItem) => {
                  const existingIdx = merged.findIndex((i) => i.id === dbItem.id);
                  if (existingIdx > -1) {
                    // Combine quantities up to the database item's stock
                    const newQty = Math.min(merged[existingIdx].quantity + dbItem.quantity, dbItem.stock);
                    merged[existingIdx] = {
                      ...merged[existingIdx],
                      ...dbItem,
                      quantity: newQty
                    };
                  } else {
                    merged.push(dbItem);
                  }
                });

                return merged;
              });
            }
          }
        } catch (error) {
          console.error('Error fetching database cart:', error);
        } finally {
          setDbSynced(true);
        }
      };

      fetchAndMergeCart();
    } else if (status === 'unauthenticated' && dbSynced) {
      // Clear cart and reset sync when signing out
      setItems([]);
      localStorage.removeItem('cart');
      setDbSynced(false);
    }
  }, [status, isLoaded, dbSynced]);

  // Save cart to database with debounce
  useEffect(() => {
    if (status === 'authenticated' && dbSynced && isLoaded) {
      const delayDebounceFn = setTimeout(() => {
        fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartItems: items })
        }).catch(err => console.error('Error auto-saving cart to DB:', err));
      }, 1000);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [items, status, dbSynced, isLoaded]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((i) => i.id === item.id);

      if (existingItem) {
        // Update quantity if item already exists
        return currentItems.map((i) =>
          i.id === item.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, item.stock) }
            : i
        );
      } else {
        // Add new item
        return [...currentItems, { ...item, quantity }];
      }
    });
  };

  const removeItem = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.stock)) }
          : item
      ).filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

// Safe version of useCart that doesn't throw - useful for components that may render before provider mounts
export function useCartSafe(): CartContextType {
  const context = useContext(CartContext);
  if (context === undefined) {
    // Return safe default values during initial render before provider mounts
    return {
      items: [],
      addItem: () => { },
      removeItem: () => { },
      updateQuantity: () => { },
      clearCart: () => { },
      getTotalItems: () => 0,
      getTotalPrice: () => 0,
    };
  }
  return context;
}
