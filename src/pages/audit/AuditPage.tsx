import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/Layout';
import { Select } from '@/components/common/Input';
import { Alert, EmptyState, SkeletonRows } from '@/components/common/Feedback';
import { useAsync } from '@/hooks/useAsync';
import { auditService, AUDIT_LABELS } from '@/services/firebase/audit.service';
import { formatDateTime } from '@/lib/format';
import type { AuditAction } from '@/types/audit.types';

const formatDetails = (details: Record<string, unknown>) =>
  Object.entries(details)
    .map(([k, v]) => `${k}: ${v === null ? '—' : String(v)}`)
    .join(' · ');

export const AuditPage: React.FC = () => {
  const logs = useAsync(() => auditService.list(), []);
  const [action, setAction] = useState<'all' | AuditAction>('all');
  const visible = (logs.data ?? []).filter((l) => action === 'all' || l.action === action);

  return (
    <>
      <PageHeader title="Auditoría" description="Registro inmutable de operaciones sensibles: roles, precios, costos, inventario, anulaciones y agenda." />
      <div className="w-full max-w-xs">
        <Select label="Tipo de acción" value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
          <option value="all">Todas</option>
          {Object.entries(AUDIT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      {logs.error && <Alert>{logs.error}</Alert>}
      <div className="card overflow-hidden">
        {logs.loading ? (
          <SkeletonRows />
        ) : visible.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Sin registros" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Responsable</th>
                  <th>Entidad</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(l.at)}</td>
                    <td>{AUDIT_LABELS[l.action] ?? l.action}</td>
                    <td>{l.actorName}</td>
                    <td className="text-xs text-muted">
                      {l.entity}/{l.entityId.slice(0, 8)}
                    </td>
                    <td className="text-xs text-muted">{formatDetails(l.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
