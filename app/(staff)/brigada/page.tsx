'use client';
import { useEffect, useState, useCallback } from 'react';
import Dexie from 'dexie';
import useSWR from 'swr';
import { Wifi, WifiOff, CloudUpload, UserPlus, Pencil, AlertOctagon, FlaskConical, CheckCircle2 } from 'lucide-react';
import { apiFetch, fetcher, fmt } from '@/lib/client';
import { PageHead, Section, Status, Note, Chip, Empty } from '@/components/ui';

// Fila offline local (IndexedDB vía Dexie). Las operaciones se guardan aquí primero y se sincronizan al volver la conexión.
class OfflineDB extends Dexie { outbox!: Dexie.Table<any, string>; cache!: Dexie.Table<any, string>;
  constructor() { super('lumen-brigada'); this.version(1).stores({ outbox: 'opId,status,createdAt', cache: 'id' }); } }
let db: OfflineDB | null = null;
const getDb = () => (db ||= new OfflineDB());
const uid = () => 'op_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function Brigada() {
  const [online, setOnline] = useState(true), [forced, setForced] = useState(false);
  const [outbox, setOutbox] = useState<any[]>([]), [cache, setCache] = useState<any[]>([]), [msg, setMsg] = useState('');
  const conflicts = useSWR('/api/sync/conflicts', fetcher, { refreshInterval: 4000 });
  const [f, setF] = useState({ fullName: '', dateOfBirth: '', phone: '', municipality: '', sampleFolio: '', digitalAccess: 'completo' });
  const [edit, setEdit] = useState({ id: '', phone: '' });
  const isOnline = online && !forced;

  const refresh = useCallback(async () => { setOutbox(await getDb().outbox.orderBy('createdAt').toArray()); setCache(await getDb().cache.toArray()); }, []);
  useEffect(() => {
    setOnline(navigator.onLine); const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener('online', on); addEventListener('offline', off); refresh();
    if ('serviceWorker' in navigator && location.hostname !== 'localhost') navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => { removeEventListener('online', on); removeEventListener('offline', off); };
  }, [refresh]);
  const pull = useCallback(async () => {
    try { const r = await apiFetch('/api/patients'); const now = new Date().toISOString(); await getDb().cache.clear(); await getDb().cache.bulkPut(r.patients.map((p: any) => ({ ...p, cachedAt: now }))); refresh(); } catch {}
  }, [refresh]);
  useEffect(() => { if (isOnline) pull(); }, [isOnline, pull]);

  const sync = useCallback(async () => {
    const pending = await getDb().outbox.where('status').equals('pending').toArray();
    if (!pending.length) return;
    try {
      const r = await apiFetch('/api/sync', { body: { ops: pending.map(({ status, createdAt, label, ...op }) => op) } });
      for (const x of r.results) await getDb().outbox.update(x.opId, { status: x.status, conflictId: x.conflictId });
      setMsg(`Sincronizado: ${r.results.filter((x: any) => x.status === 'synced').length} ok · ${r.results.filter((x: any) => x.status === 'conflict').length} con conflicto`);
      refresh(); conflicts.mutate(); pull();
    } catch (e: any) { setMsg('No se pudo sincronizar: ' + e.message); }
  }, [refresh, conflicts, pull]);
  useEffect(() => { if (isOnline) sync(); }, [isOnline, sync]);

  const queue = async (op: any, label: string) => { await getDb().outbox.put({ ...op, opId: uid(), clientUpdatedAt: new Date().toISOString(), status: 'pending', createdAt: Date.now(), label }); refresh(); if (isOnline) sync(); };
  const add = (e: React.FormEvent) => { e.preventDefault(); queue({ type: 'createPatient', fields: { ...f, collectedAt: new Date().toISOString().slice(0, 10) } }, 'Alta: ' + f.fullName); setF({ ...f, fullName: '', phone: '', sampleFolio: '' }); };
  const upd = () => { const p = cache.find((x) => x.id === edit.id); if (!p) return; queue({ type: 'updatePatient', entityId: p.id, baseVersion: p.version, baseTime: p.cachedAt, fields: { phone: '+52' + edit.phone.replace(/\D/g, '').slice(-10) } }, 'Cambio de teléfono: ' + p.fullName); };
  const remote = async () => { if (!edit.id) return setMsg('Elige primero una paciente en "Editar".'); await apiFetch('/api/sync/simulate-remote', { body: { patientId: edit.id, field: 'phone', value: '+525550000999' } }); setMsg('Brigada B (simulada) cambió el teléfono de la misma paciente en el servidor.'); };
  const resolve = async (c: any, choice: 'server' | 'client') => { const choices: any = {}; c.conflictData.conflicts.forEach((x: any) => (choices[x.field] = choice)); await apiFetch('/api/sync/resolve', { body: { id: c.id, choices } }); conflicts.mutate(); pull(); setMsg('Conflicto resuelto y registrado en la auditoría.'); };

  return (
    <>
      <PageHead title="Brigada sin conexión" sub="Captura en campo aunque no haya internet. Nada se sobrescribe en silencio."
        right={<button onClick={() => setForced(!forced)} className={isOnline ? 'btn-safe' : 'btn-err'} aria-pressed={forced}>{isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}{isOnline ? 'En línea' : forced ? 'Sin conexión (simulada)' : 'Sin conexión'}</button>} />
      <div className="mb-5 flex flex-wrap gap-2"><Chip tone={isOnline ? 'safe' : 'err'}>{outbox.filter((o) => o.status === 'pending').length} cambios pendientes</Chip><Chip tone="mute">{cache.length} pacientes en caché local</Chip><Chip tone="warn" icon={<FlaskConical size={12} />}>El botón de conexión simula la pérdida de red; también detecta la real</Chip></div>
      {msg && <div className="mb-4"><Note>{msg}</Note></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Registrar paciente y toma">
          <form onSubmit={add} className="space-y-2">
            <input className="input" placeholder="Nombre completo (ficticio)" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required aria-label="Nombre" />
            <div className="grid grid-cols-2 gap-2"><input type="date" className="input" value={f.dateOfBirth} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} required aria-label="Fecha de nacimiento" /><input className="input" placeholder="Municipio" value={f.municipality} onChange={(e) => setF({ ...f, municipality: e.target.value })} required aria-label="Municipio" /></div>
            <div className="grid grid-cols-2 gap-2"><input className="input" placeholder="Teléfono" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} aria-label="Teléfono" /><input className="input" placeholder="Folio de muestra" value={f.sampleFolio} onChange={(e) => setF({ ...f, sampleFolio: e.target.value })} aria-label="Folio de muestra" /></div>
            <button className="btn-primary w-full"><UserPlus size={16} />Guardar {isOnline ? 'y sincronizar' : 'en el dispositivo'}</button>
          </form>
        </Section>
        <Section title="Editar teléfono (demo de conflicto)" sub="1) Desconecta · 2) edita · 3) simula la otra brigada · 4) reconecta">
          <select className="input" value={edit.id} onChange={(e) => setEdit({ ...edit, id: e.target.value })} aria-label="Paciente"><option value="">Elegir paciente (desde caché local)</option>{cache.filter((p) => !['pac_001', 'pac_003'].includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.fullName} · {p.phoneMasked || 'sin tel.'}</option>)}</select>
          <div className="mt-2 flex gap-2"><input className="input" placeholder="Nuevo teléfono" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} aria-label="Nuevo teléfono" /><button className="btn-ghost" onClick={upd} disabled={!edit.id || edit.phone.length < 8}><Pencil size={16} />Guardar</button></div>
          <button className="btn-warn mt-3 w-full" onClick={remote}><FlaskConical size={16} />Simular edición desde otra brigada</button>
        </Section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Fila local" right={<button className="btn-ghost" onClick={sync} disabled={!isOnline}><CloudUpload size={16} />Sincronizar</button>}>
          {!outbox.length ? <Empty>Sin operaciones.</Empty> : <ul className="space-y-2">{[...outbox].reverse().map((o) => <li key={o.opId} className="card-2 flex items-center justify-between p-3 text-sm"><span>{o.label}<span className="block text-xs text-mute">{fmt(o.clientUpdatedAt)}</span></span><Status s={o.status === 'pending' ? 'pending' : o.status} /></li>)}</ul>}
        </Section>
        <Section title="Conflictos por resolver" sub="Una persona decide; la decisión queda auditada.">
          {!conflicts.data?.conflicts?.length ? <Empty><CheckCircle2 className="mx-auto mb-2 text-safe" />Sin conflictos.</Empty> : conflicts.data.conflicts.map((c: any) => (
            <div key={c.id} className="card-2 mb-2 space-y-2 border-err/40 p-4">
              <div className="flex items-center gap-2 font-semibold text-err"><AlertOctagon size={16} />{c.conflictData.patientName}</div>
              {c.conflictData.conflicts.map((x: any) => <div key={x.field} className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-bg/60 p-2"><div className="text-xs text-mute">Servidor ({fmt(x.serverChangedAt)})</div>{x.serverValue}</div><div className="rounded-lg bg-bg/60 p-2"><div className="text-xs text-mute">Este dispositivo</div>{x.clientValue}</div></div>)}
              <div className="grid grid-cols-2 gap-2"><button className="btn-ghost" onClick={() => resolve(c, 'server')}>Mantener servidor</button><button className="btn-primary" onClick={() => resolve(c, 'client')}>Usar este dispositivo</button></div>
            </div>))}
        </Section>
      </div>
    </>
  );
}
