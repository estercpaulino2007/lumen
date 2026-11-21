'use client';
import { useEffect, useState } from 'react';
import { Contrast, Minus, Plus } from 'lucide-react';

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

/** Barra de accesibilidad: tamaño de fuente y alto contraste (se recuerdan en este navegador). */
export function A11yBar() {
  const [fs, setFs] = useState(16), [hc, setHc] = useState(false);
  useEffect(() => { setFs(+(get('lumen-fs') || 16)); setHc(get('lumen-hc') === '1'); }, []);
  useEffect(() => { document.documentElement.style.setProperty('--fs', fs + 'px'); set('lumen-fs', String(fs)); }, [fs]);
  useEffect(() => { document.body.classList.toggle('hc', hc); set('lumen-hc', hc ? '1' : '0'); }, [hc]);
  return (
    <div className="no-print fixed bottom-4 left-4 z-40 flex items-center gap-1 rounded-full border border-line bg-s1/90 p-1 shadow-soft backdrop-blur" role="toolbar" aria-label="Accesibilidad">
      <button className="rounded-full p-2 hover:bg-s2" onClick={() => setFs(Math.max(14, fs - 2))} aria-label="Reducir tamaño de letra"><Minus size={16} /></button>
      <span className="px-1 text-xs text-mute" aria-live="polite">{fs}px</span>
      <button className="rounded-full p-2 hover:bg-s2" onClick={() => setFs(Math.min(24, fs + 2))} aria-label="Aumentar tamaño de letra"><Plus size={16} /></button>
      <button className={`rounded-full p-2 hover:bg-s2 ${hc ? 'text-sky' : ''}`} onClick={() => setHc(!hc)} aria-pressed={hc} aria-label="Alto contraste"><Contrast size={16} /></button>
    </div>
  );
}
