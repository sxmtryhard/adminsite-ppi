import React from 'react';
import { Receipt, Scissors } from 'lucide-react';
import { Card, PageHeader } from '@/components/common/Layout';
import { Alert, EmptyState, Spinner } from '@/components/common/Feedback';
import { Badge, StatusBadge } from '@/components/common/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/context/auth-context';
import { appointmentsService } from '@/services/firebase/appointments.service';
import { salesService } from '@/services/firebase/sales.service';
import { formatCOP, formatDateTime } from '@/lib/format';
import { PAYMENT_LABELS } from '@/types/sale.types';

export const ClientHistoryPage: React.FC = () => {
  const { user } = useSession();
  const data = useAsync(() => Promise.all([appointmentsService.listForClient(user.uid), salesService.listForClient(user.uid)]), [user.uid]);
  const [appts, sales] = data.data ?? [[], []];
  const served = [...appts].filter((a) => a.status === 'completed').reverse();

  return (
    <>
      <PageHeader title="Mi historial" description="Servicios recibidos y pagos registrados a tu nombre." />
      {data.error && <Alert>{data.error}</Alert>}
      {data.loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Servicios recibidos" icon={Scissors} bodyClassName="p-0">
            {served.length === 0 ? (
              <EmptyState icon={Scissors} title="Aún no hay servicios completados" />
            ) : (
              <ul className="divide-y divide-line">
                {served.map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="text-ink">{a.serviceName}</p>
                      <p className="text-xs text-subtle">
                        {a.date} · {a.barberName}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Pagos" icon={Receipt} bodyClassName="p-0">
            {sales.length === 0 ? (
              <EmptyState icon={Receipt} title="Sin pagos registrados" description="Los pagos aparecen cuando el estudio registra el cobro a tu nombre." />
            ) : (
              <ul className="divide-y divide-line">
                {sales.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-ink">{s.items.map((i) => i.name).join(', ')}</p>
                      <p className="text-xs text-subtle">
                        {formatDateTime(s.createdAt)} · {PAYMENT_LABELS[s.paymentMethod]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${s.status === 'voided' ? 'text-subtle line-through' : 'text-ink'}`}>{formatCOP(s.total)}</p>
                      {s.status === 'voided' && <Badge tone="danger">Anulado</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
};
