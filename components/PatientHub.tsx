'use client';
import { useEffect, useState } from 'react';
import { FlaskConical, Bell, Eye, Settings2, HeartHandshake, Check, Loader2, MessageSquare, Mail, MessageCircle } from 'lucide-react';
import { apiFetch, dmy } from '@/lib/client';
import { Note, Chip } from './ui';

const STEPS = ['Muestra tomada', 'En laboratorio', 'Revisión de EIRA', 'Revisión profesional', 'Disponible'];
const TABS = [['exams', 'Mis exámenes', FlaskConical], ['notices', 'Avisos', Bell], ['access', 'Accesos', Eye], ['prefs', 'Contacto', Settings2]] as const;
const CH: Record<string, string> = { sms: 'SMS', email: 'Correo', whatsapp: 'WhatsApp', assisted: 'Atención asistida' };

/** Panel de la paciente: estado de sus exámenes, avisos, transparencia de accesos y preferencias. Nunca muestra contenido clínico. */
export function PatientHub() {
  const [d, setD] = useState<any>(null), [tab, setTab] = useState<string>('exams'), [saving, setSaving] = useState(false), [msg, setMsg] = useState('');
  const [pref, setPref] = useState<any>(null);
  const load = () => apiFetch('/api/portal/overview').then((x) => { setD(x); setPref({ ...x.prefs, preferred: x.prefs.order?.[0] || 'sms' }); }).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!d) return null;
  const save = async () => { setSaving(true); try { await apiFetch('/api/portal/preferences', { body: { sms: pref.sms, email: pref.email, whatsapp: pref.whatsapp, preferred: pref.preferred } }); setMsg('Preferencias guardadas.'); load(); } catch (e: any) { setMsg(e.message); } finally { setSaving(false); } };
  const ask = async () => { try { await apiFetch('/api/luminy', { body: { action: 'request_contact' } }); setMsg('Listo: una profesional de EIRA te contactará.'); load(); } catch (e: any) { setMsg(e.message); } };
  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="tablist">{TABS.map(([k, l, I]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setMsg(''); }} className={`chip shrink-0 px-3 py-1.5 ${tab === k ? 'border-vio/50 bg-vio/20 text-white' : 'border-white/10 text-mute'}`}><I size={13} />{l}</button>)}</div>

      {tab === 'exams' && <div className="space-y-3">{d.exams.map((e: any) => (
        <div key={e.id} className="card-2 p-4">
          <div className="flex items-center justify-between gap-2"><div><div className="font-semibold">{e.type}</div><div className="text-xs text-mute">{`Toma: ${dmy(e.collectedAt)}`}</div></div><Chip tone={e.available ? (e.opened ? 'safe' : 'sky') : 'warn'}>{e.available ? (e.opened ? 'Consultado' : 'Disponible') : 'En proceso'}</Chip></div>
          <ol className="mt-3 grid grid-cols-5 gap-1" aria-label="Etapas">{STEPS.map((st, i) => <li key={st} className="text-center"><div className={`mx-auto h-1.5 rounded-full ${i <= e.stage ? 'bg-gradient-to-r from-vio to-sky' : 'bg-white/10'}`} /><div className={`mt-1 text-[10px] leading-tight ${i <= e.stage ? 'text-ink' : 'text-mute/60'}`}>{st}</div></li>)}</ol>
          {!e.available && <p className="mt-2 text-xs text-mute">{'Te avisaremos cuando esté disponible. El aviso nunca incluye información médica.'}</p>}
        </div>))}</div>}

      {tab === 'notices' && (d.notices.length ? <ul className="space-y-2">{d.notices.map((n: any) => (
        <li key={n.id} className="card-2 p-3 text-sm"><div className="flex items-center justify-between text-xs text-mute"><span>{`${CH[n.channel] || n.channel || '—'} · ${new Date(n.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`}</span><Chip tone="safe">{n.status === 'asistida' ? 'Asistida' : 'Entregado'}</Chip></div><p className="mt-1.5 leading-relaxed">{n.message}</p></li>))}</ul> : <Note>Aún no tienes avisos.</Note>)}

      {tab === 'access' && <div className="space-y-2"><Note>{'Transparencia: aquí ves cada vez que alguien abrió tus documentos.'}</Note>
        {d.access.length ? <ul className="space-y-1.5">{d.access.map((a: any, i: number) => <li key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"><span>{a.who}</span><span className="text-xs text-mute">{`${a.action === 'download' ? 'Descarga' : 'Consulta'} · ${new Date(a.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`}</span></li>)}</ul> : <p className="text-sm text-mute">Nadie ha abierto tus documentos todavía.</p>}</div>}

      {tab === 'prefs' && pref && <div className="space-y-3">
        <p className="text-sm text-mute">¿Por dónde prefieres recibir avisos? Nunca incluyen información médica.</p>
        {([['sms', 'SMS', MessageSquare, d.prefs.hasPhone], ['email', 'Correo', Mail, d.prefs.hasEmail], ['whatsapp', 'WhatsApp', MessageCircle, d.prefs.hasPhone]] as const).map(([k, l, I, ok]) => (
          <div key={k} className={`flex items-center gap-3 rounded-xl2 border p-3 ${pref[k] ? 'border-vio/40 bg-vio/10' : 'border-white/10'} ${ok ? '' : 'opacity-40'}`}>
            <I size={18} className="text-lila" /><span className="flex-1 text-sm font-medium">{l}</span>
            <label className="flex items-center gap-1.5 text-xs"><input type="radio" name="pref" disabled={!ok || !pref[k]} checked={pref.preferred === k} onChange={() => setPref({ ...pref, preferred: k })} />Preferido</label>
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" disabled={!ok} checked={!!pref[k]} onChange={(e) => setPref({ ...pref, [k]: e.target.checked })} />Acepto</label>
          </div>))}
        <button className="btn-primary w-full" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}Guardar preferencias</button>
      </div>}

      <div className="card-2 flex items-center gap-3 p-4"><HeartHandshake className="shrink-0 text-safe" /><div className="flex-1 text-sm"><div className="font-semibold">¿Tienes dudas sobre tu documento?</div><div className="text-xs text-mute">Una profesional de salud de EIRA puede acompañarte.</div></div>
        {d.openRequest ? <Chip tone="safe">Solicitud enviada</Chip> : <button className="btn-ghost text-xs" onClick={ask}>Quiero que me contacten</button>}</div>
      {msg && <Note tone="safe">{msg}</Note>}
    </div>
  );
}
