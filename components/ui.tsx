'use client';
import { ReactNode } from 'react';
import { FlaskConical, Info } from 'lucide-react';

const TONES: Record<string, string> = {
  sky: 'border-sky/30 bg-sky/10 text-sky', vio: 'border-vio/30 bg-vio/10 text-vio', safe: 'border-safe/30 bg-safe/10 text-safe',
  warn: 'border-warn/30 bg-warn/10 text-warn', err: 'border-err/30 bg-err/10 text-err', mute: 'border-line bg-s2 text-mute',
};
export const Chip = ({ tone = 'mute', children, icon }: { tone?: string; children: ReactNode; icon?: ReactNode }) => <span className={`chip ${TONES[tone]}`}>{icon}{children}</span>;

const STATUS: Record<string, [string, string]> = {
  pending: ['Pendiente', 'mute'], processing: ['Procesando', 'sky'], done: ['Concluido', 'safe'], failed: ['Falló', 'err'], needs_ocr: ['Requiere OCR', 'warn'],
  suggested: ['Sugerida', 'sky'], confirmed: ['Confirmada', 'safe'], confirmed_manual: ['Confirmada (manual)', 'safe'], rejected: ['Rechazada', 'err'], manual_review: ['Revisión manual', 'warn'], correction_requested: ['Corrección solicitada', 'warn'],
  approved: ['Aprobada', 'safe'], authorized: ['Autorizado', 'safe'], returned: ['Devuelto', 'warn'], blocked: ['Bloqueado', 'err'],
  not_sent: ['Sin enviar', 'mute'], notified: ['Notificada', 'sky'], accessed: ['Consultado', 'safe'], downloaded: ['Descargado', 'safe'], assisted_pending: ['Entrega asistida', 'vio'],
  review: ['En revisión', 'warn'], clinical: ['Autorización clínica', 'vio'], delivery: ['Entrega', 'safe'],
  bajo: ['Riesgo bajo', 'safe'], medio: ['Riesgo medio', 'warn'], alto: ['Riesgo alto', 'err'], buena: ['Calidad buena', 'safe'], regular: ['Calidad regular', 'warn'], mala: ['Calidad mala', 'err'],
  open: ['Abierto', 'warn'], closed: ['Cerrado', 'safe'], entregado: ['Entregado (simulado)', 'safe'], asistida: ['Asistida', 'vio'], bloqueado_dlp: ['Bloqueado por guardia', 'err'],
  synced: ['Sincronizado', 'safe'], conflict: ['Conflicto', 'err'], resolved: ['Resuelto', 'safe'], duplicate: ['Duplicado', 'mute'],
};
export const Status = ({ s }: { s?: string | null }) => { const [l, t] = STATUS[s || ''] || [s || '—', 'mute']; return <Chip tone={t}>{l}</Chip>; };

export function Stat({ label, value, tone = 'ink', hint, icon }: { label: string; value: ReactNode; tone?: string; hint?: string; icon?: ReactNode }) {
  const c: Record<string, string> = { ink: 'text-ink', sky: 'text-sky', safe: 'text-safe', warn: 'text-warn', err: 'text-err', vio: 'text-vio' };
  return (
    <div className="card p-4 fade-in">
      <div className="flex items-center justify-between text-xs text-mute">{label}{icon}</div>
      <div className={`mt-2 font-display text-3xl font-semibold ${c[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-mute">{hint}</div>}
    </div>
  );
}
export const Section = ({ title, children, right, sub }: { title: string; children: ReactNode; right?: ReactNode; sub?: string }) => (
  <section className="card p-5 fade-in">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{title}</h2>{sub && <p className="text-sm text-mute">{sub}</p>}</div>{right}</div>
    {children}
  </section>
);
export const Empty = ({ children }: { children: ReactNode }) => <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-mute">{children}</div>;
export const Simulated = ({ children }: { children: ReactNode }) => <Chip tone="warn" icon={<FlaskConical size={12} />}>{children}</Chip>;
export const Note = ({ children, tone = 'sky' }: { children: ReactNode; tone?: string }) => <div className={`flex gap-2 rounded-xl border p-3 text-sm ${TONES[tone]}`}><Info size={16} className="mt-0.5 shrink-0" /><div>{children}</div></div>;
export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>{sub && <p className="mt-1 text-mute">{sub}</p>}</div>{right}</div>;
}
export const Logo = ({ small, vertical }: { small?: boolean; vertical?: boolean }) => (
  <div className={`flex items-center gap-2.5 ${vertical ? 'flex-col' : ''}`}>
    <svg viewBox="0 0 64 40" className={small ? 'h-7 w-11' : vertical ? 'h-12 w-20' : 'h-10 w-16'} aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stopColor="#38BDF8" /><stop offset=".5" stopColor="#8B5CF6" /><stop offset="1" stopColor="#C084FC" /></linearGradient></defs>
      <path d="M32 20c-6-8-11-13-18-13C7 7 3 13 3 20s4 13 11 13c7 0 12-5 18-13zm0 0c6 8 11 13 18 13 7 0 11-6 11-13S57 7 50 7c-7 0-12 5-18 13z" fill="none" stroke="url(#lg)" strokeWidth="4.5" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,.8))' }} />
    </svg>
    <span className={`font-display font-semibold tracking-[0.28em] ${small ? 'text-base' : 'text-2xl'}`}>LUMEN</span>
  </div>
);
