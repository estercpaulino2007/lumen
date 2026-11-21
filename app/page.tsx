'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { FlaskConical, Building2, ClipboardCheck, Stethoscope, ShieldCheck, HeartHandshake, Database, Loader2, ArrowRight, Lock, Fingerprint, Radio } from 'lucide-react';
import { apiFetch, fetcher } from '@/lib/client';
import { Logo, Chip, Note } from '@/components/ui';
import { HeroSculpture } from '@/components/three';
import { LangToggle } from '@/components/I18n';

const ROLES = [
  { email: 'lab@lumen.demo', role: 'Laboratorio', desc: 'Envía PDFs de resultados y atiende correcciones.', icon: Building2, to: '/laboratorio' },
  { email: 'captura@lumen.demo', role: 'EIRA · Captura', desc: 'Revisa documentos y confirma la asociación.', icon: ClipboardCheck, to: '/panel' },
  { email: 'clinica@lumen.demo', role: 'EIRA · Profesional de salud', desc: 'Autoriza, devuelve o bloquea la entrega.', icon: Stethoscope, to: '/resultados?stage=clinical' },
  { email: 'admin@lumen.demo', role: 'Administración', desc: 'Usuarios, auditoría, revocación de accesos.', icon: ShieldCheck, to: '/panel' },
];
const PASS = 'Lumen-2026!';

export default function Home() {
  const router = useRouter();
  const { data, mutate } = useSWR('/api/auth/me', fetcher);
  const [sel, setSel] = useState(ROLES[1]);
  const [email, setEmail] = useState(ROLES[1].email), [pw, setPw] = useState(PASS);
  const [busy, setBusy] = useState(''), [err, setErr] = useState(''), [ok, setOk] = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy('login');
    try { const r = await apiFetch('/api/auth/login', { body: { email, password: pw } }); await mutate(); router.push(ROLES.find((x) => x.email === r.user.email)?.to || '/panel'); }
    catch (x: any) { setErr(x.message); } finally { setBusy(''); }
  };
  const seed = async () => {
    setBusy('seed'); setErr(''); setOk('');
    try { const r = await apiFetch('/api/demo/seed', { method: 'POST' }); setOk(`Listo: ${r.patients} pacientes ficticias, ${r.labs} laboratorios y ${r.results} resultados sintéticos.`); mutate(); }
    catch (x: any) { setErr(x.message); } finally { setBusy(''); }
  };

  return (
    <main id="main" className="mx-auto grid min-h-screen max-w-7xl gap-10 p-6 md:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <section className="fade-in relative space-y-6">
        <div className="flex items-center justify-between gap-3"><Logo /><LangToggle /></div>
        <div className="relative -my-4 h-72 md:h-96"><div className="absolute inset-0 rounded-full bg-vio/25 blur-3xl" /><HeroSculpture model="torus" className="relative h-full w-full" size={3.6} /></div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Resultados con claridad,<br /><span className="glow-text">seguridad y acompañamiento.</span></h1>
          <p className="mt-4 max-w-xl text-lg text-mute">Plataforma segura de entrega y verificación de resultados de Papanicolaou para EIRA Movimiento Rosa A.C. Reemplaza el envío por WhatsApp por un flujo auditable con doble revisión humana.</p>
        </div>
        <div className="grid max-w-xl gap-3 sm:grid-cols-3">
          {[[Lock, 'Doble control humano', 'Nada se libera solo'], [Radio, 'Multicanal con failover', 'Si WhatsApp cae, se entrega igual'], [Fingerprint, 'Bitácora encadenada', 'Imposible alterar sin detectarlo']].map(([I, t, d]: any) => (
            <div key={t} className="card-2 p-4"><I size={18} className="text-lila" /><div className="mt-2 text-sm font-semibold">{t}</div><div className="text-xs text-mute">{d}</div></div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2"><Chip tone="warn" icon={<FlaskConical size={12} />}>Prototipo · todos los datos son ficticios</Chip><Chip tone="mute">La IA no diagnostica ni interpreta resultados</Chip></div>
      </section>

      <section className="card fade-in space-y-5 p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Entrar al prototipo</h2>
          <button onClick={seed} className="btn-ghost text-xs" disabled={!!busy}>{busy === 'seed' ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}Cargar datos de demostración</button>
        </div>
        {data && !data.system?.seeded && <Note tone="warn">Primero carga los datos de demostración (pacientes, laboratorios y PDFs sintéticos).</Note>}
        {ok && <Note tone="safe">{ok}</Note>}
        <fieldset>
          <legend className="label">Selecciona un papel</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button type="button" key={r.email} onClick={() => { setSel(r); setEmail(r.email); setPw(PASS); }} aria-pressed={sel.email === r.email}
                className={`rounded-xl2 border p-4 text-left transition ${sel.email === r.email ? 'border-vio bg-vio/15 shadow-glow' : 'border-white/10 bg-white/[0.03] hover:border-vio/50'}`}>
                <r.icon size={18} className="text-lila" /><div className="mt-2 text-sm font-semibold">{r.role}</div><div className="text-xs text-mute">{r.desc}</div>
              </button>
            ))}
          </div>
        </fieldset>
        <form onSubmit={login} className="space-y-3">
          <div><label className="label" htmlFor="em">Correo</label><input id="em" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></div>
          <div><label className="label" htmlFor="pw">Contraseña (demo: {PASS})</label><input id="pw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></div>
          {err && <p role="alert" className="text-sm text-err">{err}</p>}
          <button className="btn-primary w-full" disabled={!!busy}>{busy === 'login' ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}Entrar como {sel.role}</button>
        </form>
        <Link href="/portal" className="card-2 flex items-center gap-3 p-4 hover:border-safe/50"><HeartHandshake className="text-safe" /><div className="flex-1"><div className="font-semibold">Soy paciente</div><div className="text-xs text-mute">Consultar mi documento en el portal seguro</div></div><ArrowRight size={16} /></Link>
      </section>
    </main>
  );
}
