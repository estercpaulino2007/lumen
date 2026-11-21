'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { FileJson, FileSpreadsheet, EyeOff, UserCheck } from 'lucide-react';
import { fetcher } from '@/lib/client';
import { PageHead, Section, Note } from '@/components/ui';

export default function Exportar() {
  const { data } = useSWR('/api/results?stage=', fetcher);
  const [ids, setIds] = useState<string[]>([]), [reason, setReason] = useState('');
  const url = (fmt: string, mode: string) => `/api/export?format=${fmt}&mode=${mode}${mode === 'selected' ? `&ids=${ids.join(',')}&reason=${encodeURIComponent(reason)}` : ''}`;
  return (
    <>
      <PageHead title="Exportación" sub="Formatos abiertos (CSV/JSON) con fecha de corte, fuente y trazabilidad de ajustes manuales. Nunca incluye contenido clínico." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Informe anonimizado" sub="Para aliados y donantes: seudónimos irreversibles, rango de edad, sin nombre ni contacto.">
          <div className="flex flex-wrap gap-2"><a className="btn-primary" href={url('csv', 'anon')}><FileSpreadsheet size={16} />CSV</a><a className="btn-ghost" href={url('json', 'anon')}><FileJson size={16} />JSON</a></div>
          <div className="mt-3"><Note><EyeOff size={14} className="mr-1 inline" />Incluye tiempos por etapa (recepción → autorización → acceso) para medir impacto operativo.</Note></div>
        </Section>
        <Section title="Exportación identificada" sub="Solo registros seleccionados y con motivo. Queda en la auditoría.">
          <div className="max-h-56 space-y-1 overflow-y-auto">{data?.results?.map((r: any) => <label key={r.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ids.includes(r.id)} onChange={(e) => setIds(e.target.checked ? [...ids, r.id] : ids.filter((x) => x !== r.id))} />{r.patient?.fullName || r.extracted?.nombre || r.originalFileName} <span className="text-xs text-mute">· {r.stage}</span></label>)}</div>
          <input className="input mt-3" placeholder="Motivo (obligatorio)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Motivo" />
          <div className="mt-3 flex gap-2"><a aria-disabled={!ids.length || reason.length < 5} className={`btn-primary ${!ids.length || reason.length < 5 ? 'pointer-events-none opacity-40' : ''}`} href={url('csv', 'selected')}><UserCheck size={16} />CSV ({ids.length})</a><a className={`btn-ghost ${!ids.length || reason.length < 5 ? 'pointer-events-none opacity-40' : ''}`} href={url('json', 'selected')}>JSON</a></div>
        </Section>
      </div>
    </>
  );
}
