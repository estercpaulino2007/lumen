'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { MessageSquare, Mail, MessageCircle, HandHeart, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import { fetcher, apiFetch, fmt } from '@/lib/client';
import { PageHead, Section, Status, Note, Simulated, Chip, Empty } from '@/components/ui';

const CH = [['sms', 'SMS', MessageSquare], ['email', 'Correo', Mail], ['whatsapp', 'WhatsApp Business', MessageCircle], ['assisted', 'Atención asistida', HandHeart]] as const;

export default function Central() {
  const { data, mutate } = useSWR('/api/notifications', fetcher, { refreshInterval: 2500 });
  const [text, setText] = useState('Hola María, tu resultado salió anormal, acude pronto.');
  const [dlp, setDlp] = useState<any>(null);
  const toggle = async (k: string, v: boolean) => { await apiFetch('/api/settings', { body: { channels: { [k]: v } } }); mutate(); };
  const test = async () => setDlp(await apiFetch('/api/notifications/dlp', { body: { text } }));
  return (
    <>
      <PageHead title="Central de Notificaciones" sub="Todos los envíos son simulados. El aviso nunca contiene información clínica." right={<Simulated>Proveedores SMS/correo/WhatsApp simulados</Simulated>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Canales y conmutación automática" sub="Apaga un canal para simular un bloqueo: la entrega continúa por el siguiente.">
          <div className="grid gap-2 sm:grid-cols-2">{CH.map(([k, l, I]) => { const on = data?.channels?.[k]; return (
            <button key={k} onClick={() => toggle(k, !on)} aria-pressed={!!on} className={`flex items-center gap-3 rounded-xl2 border p-4 text-left ${on ? 'border-safe/40 bg-safe/5' : 'border-err/40 bg-err/5'}`}>
              <I size={18} className={on ? 'text-safe' : 'text-err'} /><div className="flex-1"><div className="text-sm font-semibold">{l}</div><div className="text-xs text-mute">{on ? 'Operando' : 'Caído / bloqueado (simulado)'}</div></div><Chip tone={on ? 'safe' : 'err'}>{on ? 'ON' : 'OFF'}</Chip>
            </button>); })}</div>
          <div className="mt-3"><Note>Orden por paciente: SMS → correo → WhatsApp (solo con consentimiento) → atención asistida. Hoy, con WhatsApp bloqueado, las entregas siguen funcionando.</Note></div>
        </Section>
        <Section title="Guardia clínica de mensajes (DLP)" sub="Prueba escribir un aviso con información clínica.">
          <textarea className="input min-h-[90px]" value={text} onChange={(e) => setText(e.target.value)} aria-label="Texto a revisar" />
          <button className="btn-primary mt-3" onClick={test}>Revisar mensaje</button>
          {dlp && (dlp.ok ? <div className="mt-3"><Note tone="safe"><span className="inline-flex items-center gap-1"><ShieldCheck size={14} />Mensaje permitido: no contiene información clínica.</span></Note></div>
            : <div className="mt-3"><Note tone="err"><span className="inline-flex items-center gap-1 font-semibold"><ShieldAlert size={14} />Bloqueado.</span> Términos detectados: {dlp.hits.join(', ')}. El evento quedó en la auditoría.</Note></div>)}
        </Section>
      </div>
      <div className="mt-6"><Section title="Mensajes enviados">
        {!data?.notifications?.length ? <Empty>Sin mensajes todavía.</Empty> : (
          <div className="grid gap-3 md:grid-cols-2">{data.notifications.map((n: any) => (
            <article key={n.id} className="card-2 fade-in p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-mute"><span className="flex items-center gap-1.5"><Smartphone size={14} />{n.kind === 'otp' ? 'Código de seguridad' : n.kind === 'recordatorio' ? 'Recordatorio' : 'Aviso'} simulado · {n.channel || '—'}</span><span>{fmt(n.createdAt)}</span></div>
              <div className="mt-2 text-sm"><span className="text-mute">Para:</span> {n.to || '—'} <span className="text-mute">({n.patientName})</span></div>
              <p className="mt-2 rounded-xl bg-bg/60 p-3 text-sm leading-relaxed">{n.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><Status s={n.status} />{n.attempts?.filter((a: any) => !a.ok).map((a: any) => <Chip key={a.channel} tone="err">{a.channel} falló → conmutado</Chip>)}{n.dlpHits && <Chip tone="err">{n.dlpHits.join(', ')}</Chip>}</div>
            </article>))}</div>
        )}
      </Section></div>
    </>
  );
}
