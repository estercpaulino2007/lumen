'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send, X, ShieldAlert, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/client';
import { LuminyAvatar } from './three';

type Msg = { from: 'me' | 'ai'; text: string; source?: string; links?: any[]; actions?: any[]; guardrail?: boolean };

export function Luminy({ audience = 'staff' }: { audience?: 'staff' | 'patient' }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [text, setText] = useState('');
  const [chips, setChips] = useState<string[]>([]), [mode, setMode] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'ai', text: audience === 'staff' ? 'Hola, soy Luminy. Puedo priorizar tu fila, explicar puntajes y revisar canales y bitácora. No interpreto resultados clínicos.' : 'Hola, soy Luminy. Te acompaño a usar tu portal seguro. No interpreto resultados, pero puedo conectarte con una profesional de EIRA.', source: 'Luminy' }]);
  const path = usePathname();
  const resultId = path?.match(/\/resultados\/(res_[\w-]+)/)?.[1];
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) apiFetch('/api/luminy').then((d) => { setChips(d.chips); setMode(d.ai); }).catch(() => {}); }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  const ask = async (q?: string, action?: string) => {
    const m = (q ?? text).trim(); if (!m && !action) return;
    if (m) setMsgs((x) => [...x, { from: 'me', text: m }]); setText(''); setBusy(true);
    try { const r = await apiFetch('/api/luminy', { body: { message: m || undefined, action, resultId, lang: (document.documentElement.lang || 'es').slice(0, 2) } }); setMsgs((x) => [...x, { from: 'ai', ...r }]); if (r.chips) setChips(r.chips); }
    catch (e: any) { setMsgs((x) => [...x, { from: 'ai', text: e.message, source: 'Error' }]); } finally { setBusy(false); }
  };
  return (
    <>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Abrir asistente Luminy" className="no-print group fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-vio/40 bg-s1/80 p-1.5 pr-4 shadow-glow backdrop-blur-xl transition hover:border-vio">
        <span className="relative h-12 w-12 overflow-hidden rounded-full bg-black/40"><LuminyAvatar className="h-12 w-12" active={busy} /></span>
        <span className="text-left"><span className="block text-sm font-semibold">Luminy</span><span className="block text-[11px] text-mute">Asistente IA</span></span>
      </button>
      {open && (
        <section role="dialog" aria-label="Luminy" className="no-print fade-in fixed bottom-20 right-4 z-50 flex h-[min(640px,80vh)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl3 border border-vio/30 bg-s1/95 shadow-soft backdrop-blur-2xl">
          <header className="relative flex items-center gap-3 border-b border-white/10 p-3" style={{ background: 'radial-gradient(400px 160px at 20% 0%, rgba(139,92,246,.35), transparent)' }}>
            <LuminyAvatar className="h-20 w-20 shrink-0 cursor-grab" active={busy} interactive />
            <div className="flex-1"><div className="font-display text-lg font-semibold">Luminy</div><div className="text-xs text-mute">{mode || 'Asistente de LUMEN'} · sin acceso a contenido clínico · no diagnostica</div></div>
            <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar"><X size={18} /></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === 'me' ? 'ml-10 rounded-2xl rounded-br-md bg-gradient-to-r from-vio to-indi p-3 text-sm' : `mr-6 rounded-2xl rounded-bl-md border p-3 text-sm ${m.guardrail ? 'border-warn/40 bg-warn/10' : 'border-white/10 bg-white/[0.04]'}`}>
                {m.guardrail && <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-warn"><ShieldAlert size={14} />Límite clínico</div>}
                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                {!!m.links?.length && <div className="mt-2 flex flex-wrap gap-1.5">{m.links.map((l) => <Link key={l.href + l.label} href={l.href} className="chip border-vio/40 bg-vio/10 text-lila hover:bg-vio/20" onClick={() => setOpen(false)}>{l.label}</Link>)}</div>}
                {!!m.actions?.length && <div className="mt-2">{m.actions.map((a) => <button key={a.action} className="btn-primary w-full text-xs" onClick={() => ask('', a.action)}>{a.label}</button>)}</div>}
                {m.from === 'ai' && m.source && <div className="mt-2 text-[10px] uppercase tracking-wide text-mute/70">Fuente: {m.source}</div>}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs text-mute"><Sparkles size={14} className="animate-pulse text-vio" />Luminy está pensando…</div>}
            <div ref={end} />
          </div>
          <div className="border-t border-white/10 p-3">
            <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-1">{chips.map((c) => <button key={c} onClick={() => ask(c)} className="chip shrink-0 border-white/10 bg-white/[0.04] text-mute hover:border-vio/50 hover:text-ink">{c}</button>)}</div>
            <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="flex gap-2"><input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Pregúntale a Luminy…" aria-label="Mensaje para Luminy" /><button className="btn-primary px-3" disabled={busy} aria-label="Enviar"><Send size={16} /></button></form>
          </div>
        </section>
      )}
    </>
  );
}
