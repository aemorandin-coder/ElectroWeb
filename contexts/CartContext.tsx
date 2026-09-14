'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

const CART_KEY = 'cart';
// Dueño del carrito guardado en localStorage: el userId que lo sincronizó, o 'guest'
const CART_OWNER_KEY = 'cart-owner';
const GUEST_OWNER = 'guest';
// sessionStorage: marca que esta pestaña ya reconcilió el carrito con la BD para ese usuario
const DB_SYNC_KEY_PREFIX = 'cart-db-synced:';

// localStorage/sessionStorage pueden fallar (modo privado, almacenamiento bloqueado)
function readStorage(storage: 'local' | 'session', key: string): string | null {
  try {
    return (storage === 'local' ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: 'local' | 'session', key: string, value: string | null) {
  try {
    const target = storage === 'local' ? localStorage : sessionStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, value);
  } catch {
    // Sin almacenamiento el carrito sigue funcionando en memoria
  }
}

function clearDbSyncFlags() {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(DB_SYNC_KEY_PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignorar: ver readStorage
  }
}

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
  // Unidades en el carrito (no líneas): lo que muestran los contadores del header y la barra móvil
  totalItems: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Invitado que inicia sesión: se suman las cantidades una sola vez, con tope de stock
function mergeGuestCart(localItems: CartItem[], dbItems: CartItem[]): CartItem[] {
  const merged = [...localItems];

  dbItems.forEach((dbItem) => {
    const existingIdx = merged.findIndex((i) => i.id === dbItem.id);
    if (existingIdx > -1) {
      const localQuantity = merged[existingIdx].quantity;
      const maxQuantity = dbItem.stock > 0 ? dbItem.stock : Math.max(localQuantity, dbItem.quantity);
      merged[existingIdx] = {
        ...merged[existingIdx],
        ...dbItem,
        quantity: Math.min(localQuantity + dbItem.quantity, maxQuantity),
      };
    } else {
      merged.push(dbItem);
    }
  });

  return merged;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbSynced, setDbSynced] = useState(false);
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  // true cuando el usuario tocó el carrito en esta carga de página (no al leerlo de localStorage)
  const changedByUser = useRef(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = readStorage('local', CART_KEY);
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Reconciliar con la base de datos una vez por sesión de login (no en cada recarga):
  // - carrito local de la misma cuenta: gana la base de datos
  // - carrito de invitado: se suman cantidades con tope de stock
  // - carrito de otra cuenta: se descarta
  useEffect(() => {
    if (status !== 'authenticated' || !userId || !isLoaded || dbSynced) return;

    const syncKey = `${DB_SYNC_KEY_PREFIX}${userId}`;
    let cancelled = false;

    const syncWithDatabase = async () => {
      // Esta pestaña ya reconcilió en esta sesión: el carrito local está al día
      if (readStorage('session', syncKey)) {
        setDbSynced(true);
        return;
      }

      try {
        const res = await fetch('/api/cart');
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const dbCart: CartItem[] = Array.isArray(data.cartItems) ? data.cartItems : [];
        const owner = readStorage('local', CART_OWNER_KEY);

        setItems((localItems) => {
          if (owner === GUEST_OWNER) return mergeGuestCart(localItems, dbCart);
          if (owner && owner !== userId) return dbCart;
          // Misma cuenta (o carrito guardado antes de este cambio): gana la BD si tiene algo
          return dbCart.length > 0 ? dbCart : localItems;
        });

        writeStorage('session', syncKey, '1');
        writeStorage('local', CART_OWNER_KEY, userId);
        // Solo después de reconciliar se guarda en la BD, para no pisarla con un carrito viejo
        setDbSynced(true);
      } catch (error) {
        console.error('Error fetching database cart:', error);
      }
    };

    syncWithDatabase();

    return () => {
      cancelled = true;
    };
  }, [status, userId, isLoaded, dbSynced]);

  // Al cerrar sesión: el próximo login vuelve a reconciliar y el carrito de la cuenta no queda a la vista
  useEffect(() => {
    if (status !== 'unauthenticated') return;

    clearDbSyncFlags();

    if (dbSynced) {
      setItems([]);
      writeStorage('local', CART_KEY, null);
      writeStorage('local', CART_OWNER_KEY, null);
      setDbSynced(false);
    }
  }, [status, dbSynced]);

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
    if (!isLoaded) return;

    writeStorage('local', CART_KEY, JSON.stringify(items));
    // Un carrito armado sin sesión es de invitado: al iniciar sesión se suma a la BD
    if (status === 'unauthenticated' && changedByUser.current) {
      writeStorage('local', CART_OWNER_KEY, GUEST_OWNER);
    }
  }, [items, isLoaded, status]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    changedByUser.current = true;
    const requested = Math.max(1, Math.floor(quantity) || 1);

    setItems((currentItems) => {
      const existingItem = currentItems.find((i) => i.id === item.id);

      if (existingItem) {
        // Update quantity if item already exists
        return currentItems.map((i) =>
          i.id === item.id
            ? { ...i, quantity: Math.min(i.quantity + requested, item.stock) }
            : i
        );
      }

      // Add new item, also capped to stock
      const cappedQuantity = Math.min(requested, item.stock);
      if (cappedQuantity < 1) return currentItems;
      return [...currentItems, { ...item, quantity: cappedQuantity }];
    });
  };

  const removeItem = (id: string) => {
    changedByUser.current = true;
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    changedByUser.current = true;
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.stock)) }
          : item
      ).filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    changedByUser.current = true;
    setItems([]);
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  const getTotalItems = () => totalItems;

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
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
      totalItems: 0,
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
