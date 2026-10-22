import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Package, Scissors } from 'lucide-react';
import { PageHeader, Segmented } from '@/components/common/Layout';
import { Alert, EmptyState, Spinner } from '@/components/common/Feedback';
import { useAsync } from '@/hooks/useAsync';
import { servicesService } from '@/services/firebase/services.service';
import { productsService } from '@/services/firebase/products.service';
import { formatCOP } from '@/lib/format';
import { PRODUCT_CATEGORY_LABELS } from '@/types/product.types';

export const CatalogPage: React.FC = () => {
  const [tab, setTab] = useState<'services' | 'products'>('services');
  const data = useAsync(() => Promise.all([servicesService.getServices(), productsService.getProducts()]), []);
  const [services, products] = data.data ?? [[], []];
  const activeServices = services.filter((s) => s.status === 'active');
  const activeProducts = products.filter((p) => p.active);

  return (
    <>
      <PageHeader title="Catálogo" description="Precios vigentes del estudio. Los productos se compran en el local." />
      <Segmented
        label="Catálogo"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'services', label: 'Servicios' },
          { value: 'products', label: 'Productos' },
        ]}
      />
      {data.error && <Alert>{data.error}</Alert>}
      {data.loading ? (
        <Spinner />
      ) : tab === 'services' ? (
        activeServices.length === 0 ? (
          <div className="card">
            <EmptyState icon={Scissors} title="Sin servicios publicados" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeServices.map((s) => (
              <article key={s.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium text-ink">{s.name}</h2>
                  <p className="font-semibold text-ink">{formatCOP(s.price)}</p>
                </div>
                <p className="mt-1 flex-1 text-sm text-muted">{s.description || 'Servicio profesional de barbería.'}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-subtle">
                    <Clock className="h-3 w-3" aria-hidden /> {s.durationMinutes} min
                  </span>
                  <Link to="/portal/reservar" className="text-sm font-medium text-accent hover:underline">
                    Reservar
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )
      ) : activeProducts.length === 0 ? (
        <div className="card">
          <EmptyState icon={Package} title="Sin productos publicados" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeProducts.map((p) => (
            <article key={p.id} className="card p-5">
              <p className="text-xs text-subtle">{PRODUCT_CATEGORY_LABELS[p.category] ?? p.category}</p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <h2 className="font-medium text-ink">{p.name}</h2>
                <p className="font-semibold text-ink">{formatCOP(p.salePrice)}</p>
              </div>
              {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
              <p className={`mt-3 text-xs ${p.stock > 0 ? 'text-success' : 'text-subtle'}`}>{p.stock > 0 ? 'Disponible en el estudio' : 'Agotado'}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
};
