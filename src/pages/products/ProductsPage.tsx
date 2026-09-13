import React, { useEffect, useState } from 'react';
import { Plus, Package, AlertTriangle, Trash2, Search } from 'lucide-react';
import { Product, CreateProductDTO } from '@/types/product.types';
import { productsService } from '@/services/firebase/products.service';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateProductDTO>({
    name: '',
    description: '',
    category: 'cuidado_capilar',
    costPrice: 0,
    salePrice: 0,
    stock: 10,
    minStock: 3,
  });

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsService.getProducts();
      setProducts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await productsService.createProduct(formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        category: 'cuidado_capilar',
        costPrice: 0,
        salePrice: 0,
        stock: 10,
        minStock: 3,
      });
      await loadProducts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    try {
      await productsService.updateStock(id, delta);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p))
      );
    } catch {
      alert('No se pudo ajustar el stock');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      await productsService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Error al eliminar');
    }
  };

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">Inventario y Productos</h1>
          <p className="text-xs text-neutral-400">Control de stock y precios de venta en mostrador</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuevo Producto
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-md bg-neutral-900/50 border border-neutral-800 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400"
          />
        </div>
        <span className="text-xs text-neutral-500 font-mono">
          {filtered.length} referencias
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-neutral-800 bg-neutral-900/40 text-neutral-400 font-medium">
            <tr>
              <th className="py-3 px-4">Producto</th>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4 font-mono">Costo</th>
              <th className="py-3 px-4 font-mono">P. Venta</th>
              <th className="py-3 px-4">Margen</th>
              <th className="py-3 px-4 text-center">Stock</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3 px-4"><div className="h-3.5 w-32 bg-neutral-800 rounded" /></td>
                  <td className="py-3 px-4"><div className="h-3.5 w-20 bg-neutral-800 rounded" /></td>
                  <td className="py-3 px-4"><div className="h-3.5 w-16 bg-neutral-800 rounded" /></td>
                  <td className="py-3 px-4"><div className="h-3.5 w-16 bg-neutral-800 rounded" /></td>
                  <td className="py-3 px-4"><div className="h-3.5 w-12 bg-neutral-800 rounded" /></td>
                  <td className="py-3 px-4 text-center"><div className="h-3.5 w-10 bg-neutral-800 rounded mx-auto" /></td>
                  <td className="py-3 px-4 text-right"><div className="h-3.5 w-8 bg-neutral-800 rounded ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-500 space-y-2">
                  <Package className="h-8 w-8 mx-auto stroke-[1.25] text-neutral-600" />
                  <p>No hay productos registrados en inventario.</p>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isLowStock = item.stock <= item.minStock;
                const profit = item.salePrice - item.costPrice;
                return (
                  <tr key={item.id} className="hover:bg-neutral-900/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-200">{item.name}</div>
                      {item.description && (
                        <div className="text-[11px] text-neutral-500">{item.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-400 capitalize">
                      {item.category.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-400">{formatCOP(item.costPrice)}</td>
                    <td className="py-3 px-4 font-mono font-medium text-neutral-200">{formatCOP(item.salePrice)}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">+{formatCOP(profit)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(item.id, -1)}
                          className="h-6 w-6 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center font-mono text-neutral-300"
                        >
                          -
                        </button>
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded text-xs ${
                          isLowStock ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-neutral-200'
                        }`}>
                          {item.stock}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(item.id, 1)}
                          className="h-6 w-6 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center font-mono text-neutral-300"
                        >
                          +
                        </button>
                        {isLowStock && (
                          <span title="Stock bajo" className="flex items-center">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 ml-1" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Producto"
        description="Ingresa los datos para registrar un nuevo artículo en inventario."
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-1">
          <Input
            label="Nombre del Producto *"
            placeholder="Ej. Cera Mate Fijación Fuerte 100g"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-neutral-400">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as 'cuidado_capilar' | 'barba' | 'accesorios' | 'otros',
                })
              }
              className="w-full h-9 rounded-md border border-neutral-800 bg-neutral-900/50 px-3 text-xs text-neutral-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
            >
              <option value="cuidado_capilar">Cuidado Capilar</option>
              <option value="barba">Cuidado de Barba</option>
              <option value="accesorios">Accesorios y Cuchillas</option>
              <option value="otros">Otros</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio Costo (COP) *"
              type="number"
              required
              min="0"
              value={formData.costPrice || ''}
              onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
            />
            <Input
              label="Precio Venta (COP) *"
              type="number"
              required
              min="0"
              value={formData.salePrice || ''}
              onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Stock Inicial *"
              type="number"
              required
              min="0"
              value={formData.stock || ''}
              onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
            />
            <Input
              label="Stock Mínimo (Alerta)"
              type="number"
              min="1"
              value={formData.minStock || ''}
              onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800/40">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              Guardar Producto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};