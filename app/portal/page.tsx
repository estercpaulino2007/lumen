'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Volume2, FileText, Eye, Download, Loader2, KeyRound, HandHeart, ShieldCheck, LogOut, Clock } from 'lucide-react';
import { apiFetch, dmy } from '@/lib/client';
import { Logo, Note, Chip } from '@/components/ui';
import { CameraIntro, PresenceCheck } from '@/components/Camera';
import { HeroSculpture } from '@/components/three';
import { Luminy } from '@/components/Luminy';
import { LangToggle } from '@/components/I18n';
import { PatientHub } from '@/components/PatientHub';

type Step = 'contact' | 'otp' | 'assisted' | 'camera-intro' | 'camera' | 'camera-failed' | 'docs';
const SPEECH: Record<string, string> = {
  contact: 'Escribe tu número de celular o tu correo. Te enviaremos un código de seis números para entrar.',
  otp: 'Escribe el código de seis números que te enviamos. Vence en cinco minutos.',
  'camera-intro': 'La cámara es opcional. Ayuda a confirmar que estás presente. No analiza tu examen. Puedes continuar sin cámara.',
  docs: 'Tienes documentos disponibles. Presiona ver o descargar. Si tienes dudas, EIRA puede acompañarte.',
  assisted: 'Escribe el código que te dio el personal de EIRA y tu fecha de nacimiento.',
};
function speak(t: string) { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'es-MX'; u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {} }

export default function Portal() {
  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState(''), [code, setCode] = useState(''), [aCode, setACode] = useState(''), [dob, setDob] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [info, setInfo] = useState(''), [demoCode, setDemoCode] = useState('');
  const [docs, setDocs] = useState<any>(null), [cameraOk, setCameraOk] = useState(false), [links, setLinks] = useState<Record<string, any>>({});

  const loadDocs = useCallback(async () => { const d = await apiFetch('/api/portal/documents'); setDocs(d); setStep('docs'); }, []);
  useEffect(() => { apiFetch('/api/portal/documents').then((d) => { setDocs(d); setStep('docs'); }).catch(() => {}); }, []);
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(''); try { await f(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };

  const start = () => run(async () => { const r = await apiFetch('/api/portal/start', { body: { contact } }); setInfo(r.message + (r.demo && !r.demoCode ? ' ' + r.demo : '')); setDemoCode(r.demoCode || ''); setStep('otp'); });
  const verify = () => run(async () => { const r = await apiFetch('/api/portal/verify', { body: { contact, code } }); setStep(r.cameraConsent ? 'camera-intro' : 'camera-intro'); });
  const assisted = () => run(async () => { await apiFetch('/api/portal/assisted', { body: { code: aCode, dateOfBirth: dob } }); await loadDocs(); });
  const camDone = useCallback(async (o: any) => { await apiFetch('/api/portal/camera', { body: o }).catch(() => {}); if (o.outcome === 'passed') { setCameraOk(true); await loadDocs(); } else setStep('camera-failed'); }, [loadDocs]);
  const skipCam = () => run(async () => { await apiFetch('/api/portal/camera', { body: { outcome: 'skipped', method: 'none' } }); await loadDocs(); });
  const open = (id: string, mode: 'view' | 'download') => run(async () => {
    const l = await apiFetch('/api/portal/link', { body: { resultId: id, mode } });
    setLinks((x) => ({ ...x, [id]: l }));
    if (mode === 'view') window.open(l.url, '_blank', 'noopener'); else { const a = document.createElement('a'); a.href = l.url; a.click(); }
  });
  const logout = async () => { await apiFetch('/api/auth/logout', { method: 'POST' }); setDocs(null); setStep('contact'); setCode(''); };

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-5 md:p-8">
      <header className="flex items-center justify-between"><Link href="/" className="text-mute hover:text-ink" aria-label="Inicio"><ArrowLeft size={18} /></Link><Logo small /><div className="flex items-center gap-2"><LangToggle /><button className="btn-ghost px-3" onClick={() => speak(SPEECH[step] || SPEECH.contact)} aria-label="Escuchar instrucciones"><Volume2 size={16} /></button></div></header>
      {(step === 'contact' || step === 'docs') && <div className="relative -mb-10 h-44"><div className="absolute inset-x-10 inset-y-6 rounded-full bg-vio/30 blur-3xl" /><HeroSculpture model="infinity" className="relative h-full" size={3.8} sparkles={false} /></div>}
      <div className="card fade-in space-y-5 p-6">
        {step === 'contact' && (<>
          <div><h1 className="text-2xl font-semibold">Portal seguro</h1><p className="text-mute">Consulta tus documentos con un código de seguridad.</p></div>
          <div><label className="label" htmlFor="c">Celular o correo electrónico</label><input id="c" className="input text-lg" inputMode="email" placeholder="55 5123 1234" value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="tel" /></div>
          <button className="btn-primary w-full text-base" disabled={busy || contact.length < 5} onClick={start}>{busy ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}Recibir código</button>
          <div className="space-y-2 rounded-xl2 border border-vio/30 bg-vio/10 p-3 text-sm">
            <div className="font-semibold text-lila">Pacientes de demostración (ficticias)</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="btn-ghost justify-start text-left text-xs" onClick={() => setContact('55 5123 1234')}>María López · 55 5123 1234</button>
              <button className="btn-ghost justify-start text-left text-xs" onClick={() => setContact('anakaren.ruiz@ejemplo.test')}>Ana Karen · correo</button>
            </div>
          </div>
          <button className="card-2 w-full p-4 text-left" onClick={() => setStep('assisted')}>
            <div className="flex items-center gap-2 font-semibold"><HandHeart size={18} className="text-vio" />No tengo celular o acceso a internet</div>
            <p className="mt-1 text-sm text-mute">EIRA puede generar un código de acceso asistido. Un profesional autorizado podrá validar tu identidad presencialmente.</p>
          </button>
        </>)}
        {step === 'otp' && (<>
          <div><h1 className="text-2xl font-semibold">Escribe tu código</h1><p className="text-sm text-mute">{info}</p></div>
          {demoCode && <div className="flex items-center justify-between gap-3 rounded-xl2 border border-warn/40 bg-warn/10 p-3 text-sm"><span><span className="block text-xs text-warn">Modo demo · SMS simulado</span>Tu código: <b className="font-display text-lg tracking-widest">{demoCode}</b></span><button className="btn-ghost text-xs" onClick={() => setCode(demoCode)}>Usar código</button></div>}
          <input className="input text-center font-display text-3xl tracking-[0.5em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Código de 6 dígitos" autoComplete="one-time-code" />
          <button className="btn-primary w-full text-base" disabled={busy || code.length !== 6} onClick={verify}>{busy ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}Verificar</button>
          <p className="flex items-center gap-1 text-xs text-mute"><Clock size={12} />Vence en 5 minutos · máximo 5 intentos</p>
          <button className="text-sm text-sky" onClick={() => setStep('contact')}>Cambiar número o pedir otro código</button>
        </>)}
        {step === 'assisted' && (<>
          <div><h1 className="text-2xl font-semibold">Acceso asistido</h1><p className="text-sm text-mute">Con el código impreso que te entregó EIRA.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="btn-ghost" onClick={() => setInfo('Pide en tu jornada o al personal de EIRA que genere tu código asistido.')}>Generar código asistido</button>
            <a className="btn-ghost" href="#" onClick={(e) => { e.preventDefault(); setInfo('Solicitud registrada (simulada): EIRA te contactará para atención presencial.'); }}>Solicitar atención presencial</a>
          </div>
          {info && <Note>{info}</Note>}
          <div><label className="label" htmlFor="ac">Código asistido</label><input id="ac" className="input font-display text-xl tracking-widest" placeholder="ABCD-EFGH" value={aCode} onChange={(e) => setACode(e.target.value.toUpperCase())} /></div>
          <div><label className="label" htmlFor="dob">Fecha de nacimiento</label><input id="dob" type="date" className="input" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
          <button className="btn-primary w-full" disabled={busy || aCode.length < 8 || !dob} onClick={assisted}>Entrar</button>
          <button className="text-sm text-sky" onClick={() => { setInfo(''); setStep('contact'); }}>Volver</button>
        </>)}
        {step === 'camera-intro' && (<><h1 className="text-2xl font-semibold">Verificación de presencia</h1><CameraIntro onUse={() => setStep('camera')} onSkip={skipCam} /></>)}
        {step === 'camera' && (<><h1 className="text-2xl font-semibold">Verificación de presencia</h1><PresenceCheck onDone={camDone} /></>)}
        {step === 'camera-failed' && (<>
          <h1 className="text-2xl font-semibold">Verificación de presencia</h1>
          <Note tone="warn">No pudimos completar la verificación por cámara. Puedes continuar con el código de seguridad o solicitar atención asistida.</Note>
          <div className="grid gap-2 sm:grid-cols-2"><button className="btn-primary" onClick={loadDocs}>Continuar con mi código</button><button className="btn-ghost" onClick={() => setStep('camera')}>Intentar de nuevo</button></div>
        </>)}
        {step === 'docs' && docs && (<>
          <div className="flex items-start justify-between gap-2"><div><h1 className="text-2xl font-semibold">Hola, {docs.firstName}</h1><p className="text-mute">{docs.documents.length === 1 ? 'Tienes 1 documento disponible' : `Tienes ${docs.documents.length} documentos disponibles`}</p></div><button className="btn-ghost px-3" onClick={logout} aria-label="Salir"><LogOut size={16} /></button></div>
          <div className="flex flex-wrap gap-2"><Chip tone="safe">{docs.method === 'assisted' ? 'Identidad: código asistido' : 'Identidad: código de seguridad'}</Chip>{(cameraOk || docs.cameraVerified) && <Chip tone="sky">Presencia verificada</Chip>}</div>
          {docs.documents.map((d: any) => (
            <div key={d.id} className="card-2 space-y-3 p-4">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-vio/20"><FileText className="text-lila" /></span><div><div className="font-semibold">Papanicolaou</div><div className="text-sm text-mute">{`Colecta: ${dmy(d.collectedAt)} · Laboratorio: ${d.labName}`}</div></div></div>
              <div className="grid grid-cols-2 gap-2"><button className="btn-primary" disabled={busy} onClick={() => open(d.id, 'view')}><Eye size={16} />Ver</button><button className="btn-ghost" disabled={busy} onClick={() => open(d.id, 'download')}><Download size={16} />Descargar</button></div>
              {links[d.id] && <p className="text-xs text-mute">Enlace seguro de un solo propósito: vence {new Date(links[d.id].expiresAt).toLocaleTimeString('es-MX', { timeStyle: 'short' })} · máx. {links[d.id].maxUses} usos · solo funciona en este dispositivo.</p>}
            </div>))}
          <PatientHub />
          <Note>Este portal no interpreta resultados. Si tienes dudas sobre tu documento, EIRA puede acompañarte con una profesional de salud.</Note>
        </>)}
        {err && <p role="alert" className="rounded-xl border border-err/40 bg-err/10 p-3 text-sm text-err">{err}</p>}
      </div>
      <p className="text-center text-xs text-mute">Prototipo con datos ficticios · EIRA Movimiento Rosa A.C.</p>
      <Luminy audience="patient" />
    </main>
  );
}
