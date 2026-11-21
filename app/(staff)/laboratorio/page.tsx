'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { UploadCloud, Loader2, FileDown, CheckCircle2 } from 'lucide-react';
import { fetcher, apiFetch, fmt } from '@/lib/client';
import { PageHead, Section, Status, Note, Empty } from '@/components/ui';

const SAMPLES = [
  ['01-maria-lopez-segunda-visita.pdf', 'María López (2.ª visita, sin acentos) — flujo feliz'],
  ['02-homonimas-ma-guadalupe.pdf', 'Nombre parecido: posibles homónimas'],
  ['04-curp-inconsistente.pdf', 'CURP vs fecha de nacimiento no coinciden'],
  ['05-pagina-ausente.pdf', 'Declara 2 páginas y trae 1'],
  ['03-escaneo-sin-texto.pdf', 'Escaneo sin texto legible'],
  ['06-pdf-corrupto.pdf', 'PDF dañado'],
];

export default function Lab() {
  const { data, mutate } = useSWR('/api/results', fetcher, { refreshInterval: 3000 });
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<any>(null), [drag, setDrag] = useState(false);
  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true); setMsg(null);
    try { const fd = new FormData(); fd.append('file', f); const r = await apiFetch('/api/results/upload', { form: fd }); setMsg({ ok: true, text: `Recibido. Huella SHA-256 calculada y lectura en proceso (${r.id}).` }); mutate(); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return (
    <>
      <PageHead title="Envío de resultados" sub="Sube el PDF del laudo. LUMEN valida, calcula su huella, lo cifra y lo pone en revisión. No se libera nada sin revisión humana." />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Section title="Subir PDF">
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files[0]); }}
            className={`grid place-items-center rounded-xl3 border-2 border-dashed p-10 text-center transition ${drag ? 'border-sky bg-sky/10' : 'border-line'}`}>
            {busy ? <Loader2 className="animate-spin text-sky" size={36} /> : <UploadCloud className="text-sky" size={36} />}
            <p className="mt-3 font-semibold">Arrastra el PDF aquí</p><p className="text-sm text-mute">Solo PDF · máx. 10 MB · se rechazan duplicados por hash</p>
            <button className="btn-primary mt-4" onClick={() => input.current?.click()} disabled={busy}>Elegir archivo</button>
            <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} aria-label="Archivo PDF" />
          </div>
          {msg && <div className="mt-3"><Note tone={msg.ok ? 'safe' : 'err'}>{msg.text}</Note></div>}
        </Section>
        <Section title="PDFs sintéticos para la demo" sub="Descárgalos y súbelos. Datos 100% ficticios.">
          <ul className="space-y-2">{SAMPLES.map(([f, d]) => <li key={f}><a className="card-2 flex items-center gap-3 p-3 text-sm hover:border-sky/40" href={`/samples/${f}`} download><FileDown size={16} className="text-sky" /><span className="flex-1">{d}</span></a></li>)}</ul>
        </Section>
      </div>
      <div className="mt-6"><Section title="Mis envíos" sub="Solo ves los documentos de tu laboratorio.">
        {!data ? null : !data.results.length ? <Empty>Sin envíos todavía.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-mute"><tr><th className="py-2">Archivo</th><th>Recibido</th><th>Lectura</th><th>Estado</th><th>Corrección</th></tr></thead>
            <tbody>{data.results.map((r: any) => <tr key={r.id} className="border-t border-line"><td className="py-2.5"><Link className="hover:text-sky" href={`/resultados/${r.id}`}>{r.originalFileName}</Link></td><td>{fmt(r.receivedAt)}</td><td><Status s={r.ocrStatus} /></td><td>{r.associationStatus === 'correction_requested' ? <Status s="correction_requested" /> : r.stage === 'delivery' ? <span className="inline-flex items-center gap-1 text-safe"><CheckCircle2 size={14} />Procesado</span> : <Status s={r.stage} />}</td><td className="max-w-xs text-warn">{r.correctionNote || ''}</td></tr>)}</tbody></table></div>
        )}
      </Section></div>
    </>
  );
}
