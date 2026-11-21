'use client';
import useSWR from 'swr';
import { UserX, UserCheck, Unlink } from 'lucide-react';
import { fetcher, apiFetch, fmt } from '@/lib/client';
import { PageHead, Section, Chip, Status, Empty } from '@/components/ui';

export default function Admin() {
  const users = useSWR('/api/admin/users', fetcher);
  const links = useSWR('/api/links', fetcher, { refreshInterval: 4000 });
  const toggle = async (u: any) => { await apiFetch('/api/admin/users', { body: { userId: u.id, active: !u.active, reason: u.active ? 'Desactivación desde panel (demo)' : 'Reactivación (demo)' } }); users.mutate(); };
  const revoke = async (b: any) => { await apiFetch('/api/links/revoke', { body: { ...b, reason: 'Revocación inmediata desde administración' } }); links.mutate(); };
  return (
    <>
      <PageHead title="Usuarios y accesos" sub="Gestión de cuentas ficticias, sesiones activas y revocación inmediata de enlaces." />
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
