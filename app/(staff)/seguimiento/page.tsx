'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { Phone, CalendarCheck, HandHeart, X } from 'lucide-react';
import { fetcher, apiFetch, fmt } from '@/lib/client';
import { PageHead, Status, Chip, Empty } from '@/components/ui';

const REASON: Record<string, string> = { paciente_solicita_orientacion: 'La paciente pidió orientación de una profesional', no_acceso_48h: 'No consultó su documento en 48 h', entrega_asistida: 'Requiere entrega asistida (sin canal digital)', contacto_indicado_por_profesional: 'La profesional indicó contactarla' };
export default function Seguimiento() {
  const { data, mutate } = useSWR('/api/followups', fetcher, { refreshInterval: 5000 });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const log = async (id: string, outcome: string) => { await apiFetch(`/api/followups/${id}`, { body: { outcome, notes: notes[id] } }); mutate(); };
  return (
    <>
      <PageHead title="Seguimiento" sub="Ninguna paciente se queda sin respuesta. Tareas creadas automáticamente o por indicación humana." />
      {!data?.followUps?.length ? <Empty>Sin tareas.</Empty> : (
        <div className="grid gap-3 lg:grid-cols-2">{data.followUps.map((f: any) => (
          <article key={f.id} className={`card fade-in space-y-3 p-5 ${f.status === 'closed' ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2"><div><div className="font-semibold">{f.patient?.fullName}</div><div className="text-xs text-mute">{f.patient?.internalCode} · {f.patient?.municipality} · Tel {f.patient?.phoneMasked || '—'}</div></div><div className="flex gap-1">{f.priority === 'alta' && <Chip tone="err">Prioridad alta</Chip>}<Status s={f.status} /></div></div>
            <div className="text-sm">{REASON[f.reason] || f.reason}</div>
            <p className="text-xs text-mute">{f.notes}</p>
            <div className="text-xs text-mute">Intentos: {f.contactAttempts} · Último: {fmt(f.lastContactAt)} · Vence: {fmt(f.dueAt)}</div>
            {f.status === 'open' && (<>
              <input className="input" placeholder="Nota del contacto (sin información clínica)" value={notes[f.id] || ''} onChange={(e) => setNotes({ ...notes, [f.id]: e.target.value })} aria-label="Nota" />
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost text-xs" onClick={() => log(f.id, 'no_contesto')}><Phone size={14} />No contestó</button>
                <button className="btn-safe text-xs" onClick={() => log(f.id, 'cita_agendada')}><CalendarCheck size={14} />Cita agendada</button>
                <button className="btn-ghost text-xs" onClick={() => log(f.id, 'entrega_presencial')}><HandHeart size={14} />Entrega presencial</button>
                <button className="btn-ghost text-xs" onClick={() => log(f.id, 'cerrar')}><X size={14} />Cerrar</button>
              </div></>)}
          </article>))}</div>
      )}
    </>
  );
}
