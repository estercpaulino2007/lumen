'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { Search, Printer, UserPlus, Ticket } from 'lucide-react';
import { fetcher, apiFetch, dmy } from '@/lib/client';
import { PageHead, Section, Chip, Note } from '@/components/ui';

export default function Pacientes() {
  const [q, setQ] = useState('');
  const { data, mutate } = useSWR('/api/patients' + (q ? '?q=' + encodeURIComponent(q) : ''), fetcher);
  const [ticket, setTicket] = useState<any>(null), [err, setErr] = useState(''), [ok, setOk] = useState('');
  const [f, setF] = useState({ fullName: '', dateOfBirth: '', phone: '', email: '', municipality: '', curp: '', digitalAccess: 'completo', consent: { sms: true, email: false, whatsapp: false, camera: false, research_anon: true } });
  const assisted = async (id: string) => { setErr(''); try { setTicket(await apiFetch(`/api/patients/${id}/assisted`, { method: 'POST' })); } catch (e: any) { setErr(e.message); } };
  const create = async (e: React.FormEvent) => { e.preventDefault(); setErr(''); setOk(''); try { const r = await apiFetch('/api/patients', { body: { ...f, email: f.email || null, curp: f.curp || null, phone: f.phone || null } }); setOk('Paciente ficticia registrada: ' + r.patient.internalCode); mutate(); } catch (x: any) { setErr(x.message); } };
  return (
    <>
      <PageHead title="Pacientes" sub="Búsqueda tolerante a acentos y errores. Todas las personas son ficticias." />
      {err && <Note tone="err">{err}</Note>}
      {ticket && (
        <div className="card mb-6 p-6 print:border-black">
          <div className="flex items-center gap-2 text-sm text-mute"><Ticket size={16} />Código de acceso asistido</div>
          <div className="mt-2 font-display text-4xl tracking-[0.3em] text-safe">{ticket.code}</div>
          <p className="mt-2 text-sm">Para: {ticket.patient.fullName} ({ticket.patient.internalCode}) · Válido 24 h · un solo uso</p>
          <p className="text-sm text-mute">La paciente lo usa en el portal junto con su fecha de nacimiento, acompañada por personal de EIRA.</p>
          <button className="btn-ghost no-print mt-3" onClick={() => window.print()}><Printer size={16} />Imprimir ticket</button>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Section title="Buscar" right={<div className="relative w-64"><Search size={16} className="absolute left-3 top-3.5 text-mute" /><input className="input pl-9" placeholder="Nombre, código o CURP" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar paciente" /></div>}>
          <div className="space-y-2">{data?.patients?.map((p: any) => (
            <div key={p.id} className="card-2 flex flex-wrap items-center gap-3 p-3">
              <div className="flex-1"><div className="font-medium">{p.fullName} <span className="text-xs text-mute">{p.internalCode}</span></div><div className="text-xs text-mute">Nac. {dmy(p.dateOfBirth)} · {p.municipality} · Tel {p.phoneMasked || '—'} · {p.results} resultado(s)</div></div>
              {p.digitalAccess !== 'completo' && <Chip tone="vio">{p.digitalAccess === 'sin_internet' ? 'Sin celular/internet' : 'Sin teléfono'}</Chip>}
              <Chip tone="warn">Ficticia</Chip>
              <button className="btn-ghost text-xs" onClick={() => assisted(p.id)}><Ticket size={14} />Código asistido</button>
            </div>))}</div>
        </Section>
        <Section title="Registrar paciente" sub="Datos mínimos + consentimiento por canal.">
          <form className="space-y-3" onSubmit={create}>
            <input className="input" placeholder="Nombre completo" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required aria-label="Nombre completo" />
            <div className="grid grid-cols-2 gap-2"><input type="date" className="input" value={f.dateOfBirth} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} required aria-label="Fecha de nacimiento" /><input className="input" placeholder="Municipio" value={f.municipality} onChange={(e) => setF({ ...f, municipality: e.target.value })} required aria-label="Municipio" /></div>
            <div className="grid grid-cols-2 gap-2"><input className="input" placeholder="Teléfono (10 dígitos)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} aria-label="Teléfono" /><input className="input" placeholder="Correo (opcional)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-label="Correo" /></div>
            <input className="input" placeholder="CURP (opcional, se valida dígito verificador)" value={f.curp} onChange={(e) => setF({ ...f, curp: e.target.value.toUpperCase() })} aria-label="CURP" />
            <select className="input" value={f.digitalAccess} onChange={(e) => setF({ ...f, digitalAccess: e.target.value })} aria-label="Acceso digital"><option value="completo">Tiene celular e internet</option><option value="sin_telefono">Sin teléfono propio</option><option value="sin_internet">Sin celular ni internet</option></select>
            <fieldset className="grid grid-cols-2 gap-1 text-sm"><legend className="label">Consentimiento</legend>{(['sms', 'email', 'whatsapp', 'camera', 'research_anon'] as const).map((k) => <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={f.consent[k]} onChange={(e) => setF({ ...f, consent: { ...f.consent, [k]: e.target.checked } })} />{{ sms: 'Avisos por SMS', email: 'Avisos por correo', whatsapp: 'WhatsApp (plantilla neutra)', camera: 'Verificación por cámara', research_anon: 'Estadística anonimizada' }[k]}</label>)}</fieldset>
            {ok && <Note tone="safe">{ok}</Note>}
            <button className="btn-primary w-full"><UserPlus size={16} />Registrar</button>
          </form>
        </Section>
      </div>
    </>
  );
}
