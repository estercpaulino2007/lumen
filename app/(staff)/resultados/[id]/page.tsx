'use client';
import useSWR from 'swr';
import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileLock2, CheckCircle2, XCircle, Search, Wrench, ShieldCheck, Undo2, Ban, Loader2, EyeOff, AlertTriangle, Fingerprint, Send } from 'lucide-react';
import { fetcher, apiFetch, fmt, dmy } from '@/lib/client';
import { Status, Chip, Section, Note } from '@/components/ui';

const STEPS: [string, string][] = [['received', 'Recibido'], ['processed', 'Lectura'], ['reviewed', 'Revisión'], ['authorized', 'Autorización'], ['notified', 'Aviso'], ['accessed', 'Acceso']];
const PRESETS = ['Documento revisado y paciente confirmada.', 'Nombre divergente; solicitar corrección.', 'Documento ilegible; solicitar nuevo envío.'];
const FIELD: Record<string, string> = { nombre: 'Nombre', fechaNac: 'Fecha de nacimiento', curp: 'CURP', telefono: 'Teléfono', municipio: 'Municipio', folioMuestra: 'Folio de muestra', folioLaudo: 'Folio de laudo', fechaToma: 'Fecha de toma', fechaResultado: 'Fecha de resultado', laboratorio: 'Laboratorio', tipoEstudio: 'Tipo de estudio' };

export default function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, mutate } = useSWR(`/api/results/${id}`, fetcher, { refreshInterval: (d: any) => (d?.result?.ocrStatus === 'processing' ? 1200 : 0) });
  const me = useSWR('/api/auth/me', fetcher).data;
  const [pdf, setPdf] = useState(false), [note, setNote] = useState(''), [reason, setReason] = useState(PRESETS[0]), [pw, setPw] = useState(''), [fu, setFu] = useState(false);
  const [pick, setPick] = useState<string>(''), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [ok, setOk] = useState('');
  if (!data) return <div className="text-mute">Cargando…</div>;
  const r = data.result, role = me?.user?.role;
  const top = r.candidates?.[0];
  const act = async (kind: string, b: any) => {
    setBusy(kind); setErr(''); setOk('');
    try { await apiFetch(`/api/results/${id}/${kind === 'clinical' ? 'clinical' : 'associate'}`, { body: b }); setOk('Acción registrada en la bitácora.'); setNote(''); setPw(''); mutate(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  };
  const resend = async () => { setBusy('n'); try { await apiFetch(`/api/results/${id}/notify`, { method: 'POST' }); setOk('Recordatorio neutro enviado (simulado).'); mutate(); } catch (e: any) { setErr(e.message); } finally { setBusy(''); } };

  return (
    <div className="space-y-6">
      <Link href={r.stage === 'clinical' ? '/resultados?stage=clinical' : '/resultados'} className="inline-flex items-center gap-2 text-sm text-mute hover:text-ink"><ArrowLeft size={16} />Volver a la fila</Link>
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h1 className="text-2xl font-semibold">{r.patient?.fullName || r.extracted?.nombre || 'Documento sin nombre legible'}</h1>
          <p className="text-sm text-mute">Papanicolaou — {r.labName} · Recibido {fmt(r.receivedAt)} · {r.originalFileName}</p>
          <p className="mt-1 font-mono text-[11px] text-mute/70">SHA-256 {r.fileHash}</p>
        </div>
        <div className="flex flex-wrap gap-2"><Status s={r.stage} /><Status s={r.ocrStatus} />{r.quality && <Status s={r.quality} />}<Status s={r.deliveryStatus} /></div>
      </div>
      <ol className="grid grid-cols-3 gap-2 md:grid-cols-6" aria-label="Etapas">{STEPS.map(([k, l], i) => { const done = !!r.timeline?.[k]; return <li key={k} className={`rounded-xl border p-3 text-xs ${done ? 'border-safe/40 bg-safe/10 text-safe' : 'border-line bg-s2 text-mute'}`}><div className="font-semibold">{i + 1}. {l}</div><div>{done ? fmt(r.timeline[k]) : '—'}</div></li>; })}</ol>
      {err && <Note tone="err">{err}</Note>}{ok && <Note tone="safe">{ok}</Note>}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <Section title="Documento protegido" sub="Se abre con marca de agua personal y queda registrado." right={<button className="btn-ghost" onClick={() => setPdf(!pdf)}><FileLock2 size={16} />{pdf ? 'Cerrar' : 'Abrir PDF protegido'}</button>}>
            {pdf ? <iframe title="PDF protegido" src={`/api/results/${id}/file`} className="h-[640px] w-full rounded-xl border border-line bg-white" /> : <div className="grid h-40 place-items-center rounded-xl border border-dashed border-line text-sm text-mute"><span className="flex items-center gap-2"><EyeOff size={16} />Vista cerrada por defecto (minimización de exposición)</span></div>}
          </Section>
          <Section title="Lectura del documento" sub="Extracción solo de identificadores: la sección clínica nunca se lee ni se guarda." right={<Chip tone="sky">Confianza {Math.round((r.ocrConfidence || 0) * 100)}%</Chip>}>
            {r.ocrStatus === 'processing' ? <p className="flex items-center gap-2 text-mute"><Loader2 className="animate-spin" size={16} />Procesando en la fila…</p> : (
              <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{Object.entries(FIELD).map(([k, l]) => <div key={k} className="flex justify-between gap-3 border-b border-line/60 py-1.5 text-sm"><dt className="text-mute">{l}</dt><dd className={r.extracted?.[k] ? '' : 'text-mute/50'}>{r.extracted?.[k] ? (k.startsWith('fecha') ? dmy(r.extracted[k]) : r.extracted[k]) : 'no encontrado'}</dd></div>)}</dl>
            )}
            {!!r.qualityIssues?.length && <ul className="mt-4 space-y-2">{r.qualityIssues.map((i: any) => <li key={i.code} className={`flex gap-2 rounded-xl border p-3 text-sm ${i.level === 'error' ? 'border-err/40 bg-err/10 text-err' : 'border-warn/40 bg-warn/10 text-warn'}`}><AlertTriangle size={16} className="mt-0.5 shrink-0" />{i.msg}</li>)}</ul>}
            {r.correctionNote && <Note tone="warn">Corrección solicitada al laboratorio: {r.correctionNote}</Note>}
          </Section>
        </div>

        <div className="space-y-6">
          {role !== 'lab' && (
            <Section title="Asociación sugerida" sub="Puntaje explicable. Nunca se asocia automáticamente." right={r.risk && <Status s={r.risk} />}>
              {top ? (
                <>
                  <pre className="whitespace-pre-wrap rounded-xl border border-line bg-bg/60 p-4 font-mono text-[13px] leading-6 text-ink">{(r.associationExplanation?.lines || []).join('\n')}</pre>
                  {r.associationExplanation?.notes?.map((n: string) => <div key={n} className="mt-2"><Note tone="warn">{n}</Note></div>)}
                  <div className="mt-4 space-y-2">{r.candidates.map((c: any) => (
                    <label key={c.patientId} className={`block cursor-pointer rounded-xl border p-3 ${(pick || top.patientId) === c.patientId ? 'border-sky bg-sky/5' : 'border-line'}`}>
                      <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><input type="radio" name="cand" checked={(pick || top.patientId) === c.patientId} onChange={() => setPick(c.patientId)} disabled={r.stage !== 'review'} /><span className="font-medium">{c.fullName}</span><span className="text-xs text-mute">{c.internalCode}</span></span><Chip tone={c.score >= 85 ? 'safe' : c.score >= 65 ? 'warn' : 'err'}>{c.score}%</Chip></div>
                      <div className="mt-2 grid grid-cols-5 gap-1">{c.factors.map((f: any) => <div key={f.key} title={`${f.label}: ${f.detail}`}><div className="h-1.5 overflow-hidden rounded-full bg-s2"><div className="h-full bg-gradient-to-r from-sky to-safe" style={{ width: `${f.value * 100}%` }} /></div><div className="mt-1 truncate text-[10px] text-mute">{f.label.split(' ')[0]} ·{Math.round(f.weight * 100)}%</div></div>)}</div>
                      <div className="mt-1 text-xs text-mute">Nac. {dmy(c.patient?.dateOfBirth)} · {c.patient?.municipality} · Visitas: {c.patient?.visits?.map((v: any) => v.sampleFolio).join(', ')}</div>
                    </label>))}</div>
                </>
              ) : <Note tone="warn">{r.associationExplanation?.notes?.[0] || 'Sin candidatas.'}</Note>}
              {r.stage === 'review' && ['captura', 'admin'].includes(role) && (
                <div className="mt-4 space-y-3">
                  <textarea className="input min-h-[72px]" placeholder="Nota (obligatoria para corrección o documentos de mala calidad)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Nota" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button className="btn-safe" disabled={!!busy || !top} onClick={() => act('confirm', { action: 'confirm', patientId: pick || top?.patientId, note: note || undefined })}><CheckCircle2 size={16} />Confirmar asociación</button>
                    <button className="btn-ghost" disabled={!!busy} onClick={() => act('manual', { action: 'manual', note: note || undefined })}><Search size={16} />Revisar manualmente</button>
                    <button className="btn-err" disabled={!!busy} onClick={() => act('reject', { action: 'reject', note: note || undefined })}><XCircle size={16} />Rechazar asociación</button>
                    <button className="btn-warn" disabled={!!busy} onClick={() => act('correction', { action: 'correction', note })}><Wrench size={16} />Solicitar corrección al laboratorio</button>
                  </div>
                </div>
              )}
            </Section>
          )}

          {r.stage === 'clinical' && role === 'clinico' && (
            <Section title="Autorización clínica" sub="Decisión humana con motivo. Doble control y reautenticación.">
              <div className="mb-3 flex flex-wrap gap-2">{PRESETS.map((p) => <button key={p} className={reason === p ? 'chip border-sky/40 bg-sky/10 text-sky' : 'chip border-line text-mute'} onClick={() => setReason(p)}>{p}</button>)}</div>
              <textarea className="input min-h-[72px]" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Motivo de la decisión" />
              <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={fu} onChange={(e) => setFu(e.target.checked)} className="mt-1" /><span>Crear tarea para contactar a la paciente (cita de seguimiento). <span className="text-mute">Solo se registra la indicación, nunca el motivo clínico.</span></span></label>
              <div className="mt-3"><label className="label" htmlFor="pw">Confirma tu contraseña para autorizar</label><input id="pw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button className="btn-safe" disabled={!!busy} onClick={() => act('clinical', { decision: 'authorize', reason, followUp: fu, password: pw })}><ShieldCheck size={16} />Autorizar entrega</button>
                <button className="btn-warn" disabled={!!busy} onClick={() => act('clinical', { decision: 'return', reason })}><Undo2 size={16} />Devolver</button>
                <button className="btn-err" disabled={!!busy} onClick={() => act('clinical', { decision: 'block', reason })}><Ban size={16} />Bloquear</button>
              </div>
            </Section>
          )}

          {r.stage === 'delivery' && (
            <Section title="Entrega" right={['captura', 'admin'].includes(role) && <button className="btn-ghost" onClick={resend} disabled={!!busy}><Send size={16} />Enviar recordatorio neutro</button>}>
              <div className="flex flex-wrap gap-2 text-sm"><Status s={r.deliveryStatus} /><Chip>Vistas: {r.accessCount}</Chip><Chip>Descargas: {r.downloadCount}</Chip>{r.followUpRequired && <Chip tone="vio">Contacto de seguimiento indicado</Chip>}</div>
              <ul className="mt-3 space-y-2">{data.notifications.map((n: any) => <li key={n.id} className="card-2 p-3 text-sm"><div className="flex justify-between"><span>{n.kind} → {n.to}</span><Status s={n.status} /></div>{n.attempts.map((a: any, i: number) => <div key={i} className={`text-xs ${a.ok ? 'text-safe' : 'text-err'}`}>{a.channel}: {a.note}</div>)}</li>)}</ul>
            </Section>
          )}

          {!!data.history.length && (
            <Section title="Historial auditado" right={<Chip tone="safe" icon={<Fingerprint size={12} />}>encadenado</Chip>}>
              <ol className="relative space-y-3 border-l border-line pl-4">{data.history.map((h: any) => <li key={h.seq} className="text-sm"><span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-sky" /><div className="font-medium">{h.action}</div><div className="text-xs text-mute">#{h.seq} · {fmt(h.createdAt)} · {h.actorRole}{h.reason ? ` · “${h.reason}”` : ''}</div></li>)}</ol>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
