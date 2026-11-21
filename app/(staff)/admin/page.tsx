'use client';
import useSWR from 'swr';
import { UserX, UserCheck, Unlink, UserPlus, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { fetcher, apiFetch, fmt } from '@/lib/client';
import { PageHead, Section, Chip, Status, Empty, Note } from '@/components/ui';

export default function Admin() {
  const users = useSWR('/api/admin/users', fetcher);
  const links = useSWR('/api/links', fetcher, { refreshInterval: 4000 });
  const [f, setF] = useState({ name: '', email: '', role: 'captura', labId: 'lab_salud_mujer' }), [created, setCreated] = useState<any>(null), [err, setErr] = useState('');
  const create = async (e: React.FormEvent) => { e.preventDefault(); setErr(''); setCreated(null); try { const r = await apiFetch('/api/admin/users', { method: 'PUT', body: { ...f, labId: f.role === 'lab' ? f.labId : undefined } }); setCreated(r); setF({ ...f, name: '', email: '' }); users.mutate(); } catch (x: any) { setErr(x.message); } };
  const toggle = async (u: any) => { await apiFetch('/api/admin/users', { body: { userId: u.id, active: !u.active, reason: u.active ? 'Desactivación desde panel (demo)' : 'Reactivación (demo)' } }); users.mutate(); };
  const revoke = async (b: any) => { await apiFetch('/api/links/revoke', { body: { ...b, reason: 'Revocación inmediata desde administración' } }); links.mutate(); };
  return (
    <>
      <PageHead title="Usuarios y accesos" sub="Gestión de cuentas ficticias, sesiones activas y revocación inmediata de enlaces." />
      <div className="mb-6"><Section title="Agregar usuario" sub="Se genera una contraseña temporal que se muestra una sola vez. Queda en la auditoría.">
        <form onSubmit={create} className="grid gap-2 md:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto]">
          <input className="input" placeholder="Nombre completo" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required aria-label="Nombre completo" />
          <input className="input" type="email" placeholder="correo@ejemplo.org" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required aria-label="Correo" />
          <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} aria-label="Papel"><option value="captura">EIRA · Captura</option><option value="clinico">EIRA · Profesional de salud</option><option value="lab">Laboratorio</option><option value="admin">Administración</option></select>
          <select className="input" value={f.labId} onChange={(e) => setF({ ...f, labId: e.target.value })} disabled={f.role !== 'lab'} aria-label="Laboratorio"><option value="lab_salud_mujer">Lab Salud Mujer</option><option value="lab_citonorte">Citológico del Norte</option><option value="lab_rosa">Diagnóstica Integral Rosa</option></select>
          <button className="btn-primary"><UserPlus size={16} />Crear</button>
        </form>
        {err && <div className="mt-3"><Note tone="err">{err}</Note></div>}
        {created && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl2 border border-safe/40 bg-safe/10 p-4 text-sm"><KeyRound size={18} className="text-safe" /><span>Usuario <b>{created.user.email}</b> creado. Contraseña temporal (se muestra una sola vez):</span><code className="rounded-lg bg-black/40 px-3 py-1.5 font-mono text-base text-safe" data-no-i18n>{created.tempPassword}</code></div>}
      </Section></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Usuarios">{users.data?.users?.map((u: any) => (
          <div key={u.id} className="card-2 mb-2 flex items-center gap-3 p-3 text-sm"><div className="flex-1"><div className="font-medium">{u.name}</div><div className="text-xs text-mute">{u.email} · {u.role} · {u.sessions} sesión(es)</div></div><Chip tone={u.active ? 'safe' : 'err'}>{u.active ? 'Activa' : 'Desactivada'}</Chip>{u.role !== 'admin' && <button className="btn-ghost text-xs" onClick={() => toggle(u)}>{u.active ? <UserX size={14} /> : <UserCheck size={14} />}{u.active ? 'Desactivar' : 'Activar'}</button>}</div>))}</Section>
        <Section title="Sesiones activas">{!links.data?.sessions?.length ? <Empty>Sin sesiones.</Empty> : links.data.sessions.map((s: any) => (
          <div key={s.id} className="card-2 mb-2 flex items-center gap-3 p-3 text-sm"><div className="flex-1">{s.who}<div className="text-xs text-mute">{s.role} · {s.method} · desde {fmt(s.createdAt)}</div></div><button className="btn-err text-xs" onClick={() => revoke({ sessionId: s.id })}>Revocar</button></div>))}</Section>
      </div>
      <div className="mt-6"><Section title="Enlaces firmados" sub="Duran minutos, tienen usos limitados y pueden revocarse al instante.">
        {!links.data?.links?.length ? <Empty>Aún no hay enlaces.</Empty> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-mute"><tr><th className="py-2">Enlace</th><th>Paciente</th><th>Modo</th><th>Usos</th><th>Vence</th><th>Estado</th><th /></tr></thead>
          <tbody>{links.data.links.map((l: any) => <tr key={l.jti} className="border-t border-line"><td className="py-2 font-mono text-xs">{l.jti}</td><td>{l.patientCode}</td><td>{l.mode}</td><td>{l.uses}/{l.maxUses}</td><td>{fmt(l.expiresAt)}</td><td>{l.revokedAt ? <Chip tone="err">Revocado</Chip> : l.active ? <Chip tone="safe">Activo</Chip> : <Status s="closed" />}</td><td>{l.active && <button className="btn-err text-xs" onClick={() => revoke({ jti: l.jti })}><Unlink size={14} />Revocar</button>}</td></tr>)}</tbody></table></div>}
      </Section></div>
    </>
  );
}
