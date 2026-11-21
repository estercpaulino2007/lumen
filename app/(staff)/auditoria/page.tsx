'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Link2 } from 'lucide-react';
import { fetcher, fmt } from '@/lib/client';
import { PageHead, Section, Chip, Note } from '@/components/ui';

export default function Auditoria() {
  const [f, setF] = useState({ role: '', action: '', entity: '', patient: '', from: '', to: '' });
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as any).toString();
  const { data } = useSWR('/api/audit?' + qs, fetcher, { refreshInterval: 5000 });
  const chain = useSWR('/api/audit/verify', fetcher, { refreshInterval: 10000 }).data;
  const pats = useSWR('/api/patients', fetcher).data;
  return (
    <>
      <PageHead title="Auditoría" sub="Bitácora append-only encadenada con SHA-256. Se puede consultar; no se puede editar ni borrar."
        right={chain && (chain.ok ? <Chip tone="safe" icon={<ShieldCheck size={12} />}>Cadena íntegra · {chain.count} eventos</Chip> : <Chip tone="err" icon={<ShieldAlert size={12} />}>Alteración detectada en #{chain.brokenAt}</Chip>)} />
      <Section title="Filtros">
        <div className="grid gap-2 md:grid-cols-6">
          <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} aria-label="Papel"><option value="">Todos los papeles</option>{['lab', 'captura', 'clinico', 'admin', 'paciente', 'sistema', 'anonimo'].map((r) => <option key={r}>{r}</option>)}</select>
          <input className="input" placeholder="Acción (ej. otp, documento)" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} aria-label="Acción" />
          <input className="input" placeholder="ID de resultado" value={f.entity} onChange={(e) => setF({ ...f, entity: e.target.value })} aria-label="Resultado" />
          <select className="input" value={f.patient} onChange={(e) => setF({ ...f, patient: e.target.value })} aria-label="Paciente"><option value="">Todas las pacientes</option>{pats?.patients?.map((p: any) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select>
          <input type="date" className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label="Desde" />
          <input type="date" className="input" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label="Hasta" />
        </div>
      </Section>
      <div className="mt-4"><Note>Los registros guardan quién, qué, cuándo y sobre qué ID. IP y navegador se guardan como hash; nunca contenido clínico.</Note></div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm"><thead className="bg-s2 text-left text-mute"><tr><th className="p-3">#</th><th>Fecha</th><th>Papel</th><th>Actor</th><th>Acción</th><th>Entidad</th><th>Motivo</th><th>Hash</th></tr></thead>
          <tbody>{data?.events?.map((e: any) => <tr key={e.seq} className="border-t border-line align-top"><td className="p-3 text-mute">{e.seq}</td><td className="whitespace-nowrap">{fmt(e.createdAt)}</td><td><Chip>{e.actorRole}</Chip></td><td className="max-w-[160px] truncate">{e.actorName}</td><td className="font-medium">{e.action}</td><td className="font-mono text-xs text-mute">{e.entityType}<br />{e.entityId}</td><td className="max-w-[220px] text-mute">{e.reason || ''}</td><td className="font-mono text-[10px] text-mute" title={`prev ${e.prev}`}><Link2 size={10} className="inline" /> {e.hash.slice(0, 10)}…</td></tr>)}</tbody></table>
        <div className="p-3 text-xs text-mute">{data?.total ?? 0} eventos</div>
      </div>
    </>
  );
}
