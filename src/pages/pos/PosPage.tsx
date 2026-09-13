import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, ArrowRight, AlertCircle } from 'lucide-react';
import { Product } from '@/types/product.types';
import { ServiceItem } from '@/types/service.types';
import { SaleItem, PaymentMethod } from '@/types/sale.types';
import { productsService } from '@/services/firebase/products.service';
import { servicesService } from '@/services/firebase/services.service';
import { salesService } from '@/services/firebase/sales.service';
import { Button } from '@/components/common/Button';

export const PosPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [barberName, setBarberName] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const loadCatalog = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [prodsRes, svcsRes] = await Promise.allSettled([
        productsService.getProducts(),
        servicesService.getServices(),
      ]);

      if (prodsRes.status === 'fulfilled') {
        setProducts(prodsRes.value);
      } else {
        console.error('Error cargando productos:', prodsRes.reason);
      }

      if (svcsRes.status === 'fulfilled') {
        setServices(svcsRes.value);
      } else {
        console.error('Error cargando servicios:', svcsRes.reason);
      }

      if (prodsRes.status === 'rejected' && svcsRes.status === 'rejected') {
        setFetchError('No se pudo conectar con Firestore. Revisa la conexión de red o bloqueos del navegador.');
      }
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Error inesperado al cargar catálogo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const addToCart = (id: string, type: 'product' | 'service', name: string, price: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) =>
          i.id === id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
            : i
        );
      }
      return [...prev, { id, type, name, price, quantity: 1, subtotal: price }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const nextQty = i.quantity + delta;
            return { ...i, quantity: nextQty, subtotal: nextQty * i.price };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      await salesService.createSale({
        items: cart,
        total,
        paymentMethod,
        barberName: barberName.trim() || undefined,
      });

      setCart([]);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
      await loadCatalog();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al procesar la venta');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Caja y Punto de Venta (POS)</h1>
          <p className="text-xs text-neutral-400">Facturación de mostrador para productos y servicios</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadCatalog} isLoading={loading}>
          Recargar Catálogo
        </Button>
      </div>

      {fetchError && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
          Venta registrada con éxito y stock actualizado.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Servicios */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Servicios</h2>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-neutral-900/40 border border-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="p-4 rounded-lg border border-neutral-800/60 bg-neutral-950 text-xs text-neutral-500">
                No hay servicios cargados.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addToCart(s.id, 'service', s.name, s.price)}
                    className="p-3 text-left rounded-lg border border-neutral-800 bg-neutral-950 hover:border-neutral-700 hover:bg-neutral-900/40 transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-medium text-neutral-200 line-clamp-1">{s.name}</p>
                    <p className="text-xs font-mono font-semibold text-neutral-100 mt-1">{formatCOP(s.price)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Productos en Stock */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Productos en Stock</h2>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-neutral-900/40 border border-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="p-4 rounded-lg border border-neutral-800/60 bg-neutral-950 text-xs text-neutral-500">
                No hay productos cargados en inventario.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((p) => {
                  const outOfStock = p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => addToCart(p.id, 'product', p.name, p.salePrice)}
                      className="p-3 text-left rounded-lg border border-neutral-800 bg-neutral-950 hover:border-neutral-700 hover:bg-neutral-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <p className="text-xs font-medium text-neutral-200 line-clamp-1">{p.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs font-mono font-semibold text-neutral-100">{formatCOP(p.salePrice)}</p>
                        <span className="text-[10px] font-mono text-neutral-500">Disp: {p.stock}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Ticket de Caja / Carrito */}
        <div className="border border-neutral-800 bg-neutral-950 rounded-xl p-5 flex flex-col justify-between space-y-4 h-fit">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-neutral-400" />
                <h3 className="text-sm font-semibold text-neutral-100">Ticket de Venta</h3>
              </div>
              <span className="text-xs font-mono text-neutral-500">{cart.length} items</span>
            </div>

            {cart.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center">Selecciona un producto o servicio para facturar</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-900">
                    <div className="flex-1 pr-2">
                      <p className="text-neutral-200 font-medium line-clamp-1">{item.name}</p>
                      <p className="text-[11px] font-mono text-neutral-500">{formatCOP(item.price)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 rounded bg-neutral-900 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-mono text-neutral-200 px-1">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 rounded bg-neutral-900 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-neutral-500 hover:text-red-400 ml-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 pt-3 border-t border-neutral-800/80 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-md border text-xs cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                        : 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
                    }`}
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-md border text-xs cursor-pointer ${
                      paymentMethod === 'transfer'
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                        : 'border-neutral-800 text-neutral-400 hover:bg-neutral-900'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Transferencia
                  </button>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Barbero asignado (Opcional)</label>
                <input
                  type="text"
                  placeholder="Nombre del barbero"
                  value={barberName}
                  onChange={(e) => setBarberName(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md bg-neutral-900/50 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Total a Pagar</span>
              <span className="font-mono font-bold text-neutral-100 text-base">{formatCOP(total)}</span>
            </div>

            <Button
              className="w-full flex items-center justify-center gap-2"
              disabled={cart.length === 0 || submitting}
              isLoading={submitting}
              onClick={handleCheckout}
            >
              Completar Cobro
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};