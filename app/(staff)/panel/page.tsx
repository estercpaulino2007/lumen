'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import { Inbox, Stethoscope, Send, Eye, AlarmClock, WifiOff, ClipboardList, ShieldCheck, ShieldAlert, MessageCircleOff, AlertTriangle, FileText, Clock, CircleCheck, Sparkles, Upload, Users2, ArrowRight, Lock, BarChart3, UserCheck, Mail } from 'lucide-react';
import { HeroSculpture } from '@/components/three';
import { fetcher } from '@/lib/client';
import { Stat, Section, Chip } from '@/components/ui';

const tip = { contentStyle: { background: '#15153A', border: '1px solid #262654', borderRadius: 12, color: '#F8FAFC' } };
const axis = { stroke: '#94A3B8', fontSize: 12, tickLine: false, axisLine: false };

function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data), w = 120, h = 36;
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, h - (v / max) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const id = 'sp' + color.replace('#', '');
  return <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-28" aria-hidden="true"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".45" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs><path d={d + ` L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} /><path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
}
const TAG: Record<string, string> = { Procesando: 'vio', 'En revisión': 'sky', Revisado: 'sky', Autorizado: 'safe', Enviado: 'sky', Entregado: 'safe', Consultado: 'safe', Seguimiento: 'warn', 'Corrección': 'warn', Bloqueado: 'err' };
const ICON: Record<string, any> = { 'resultado.cargado': Upload, 'asociacion.sugerida': Users2, 'asociacion.confirmada': UserCheck, 'autorizacion.clinica': CircleCheck, 'notificacion.enviada': Mail, 'documento.descargado': CircleCheck, 'documento.visualizado': Eye, 'seguimiento.creado': ClipboardList, 'correccion.solicitada': AlertTriangle, 'notificacion.bloqueada_dlp': ShieldAlert };

export default function Panel() {
  const { data } = useSWR('/api/dashboard', fetcher, { refreshInterval: 5000 });
  const me = useSWR('/api/auth/me', fetcher).data;
  if (!data) return <div className="text-mute">Cargando indicadores…</div>;
  const m = data.metrics, c = data.charts;
  const first = (me?.user?.name || '').replace(/^Dra?\.\s*/, '').split(' ')[0];
  const fem = /a$/i.test(first) ? 'Bienvenida' : 'Bienvenido';
  const BIG = [
    { label: 'Resultados recibidos', v: m.receivedToday + m.awaitingReview + m.awaitingAuth + m.authorized, icon: FileText, col: '#8B5CF6', s: data.spark.recibidos, hint: `${m.receivedToday} hoy` },
    { label: 'En revisión', v: m.awaitingReview + m.awaitingAuth, icon: Clock, col: '#38BDF8', s: data.spark.recibidos, hint: `${m.awaitingAuth} en autorización clínica` },
    { label: 'Autorizados', v: m.authorized, icon: ShieldCheck, col: '#2DD4BF', s: data.spark.autorizados, hint: 'con doble control humano' },
    { label: 'Entregados', v: m.accessed, icon: CircleCheck, col: '#C084FC', s: data.spark.consultados, hint: `${m.notAccessed48h} sin abrir > 48 h` },
  ];
  return (
    <>
      <section className="card fade-in relative mb-6 overflow-hidden p-6 md:p-10">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(600px 300px at 80% 50%, rgba(139,92,246,.35), transparent 70%), radial-gradient(400px 200px at 10% 0%, rgba(56,189,248,.12), transparent)' }} />
        <div className="relative grid items-center gap-6 md:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="text-3xl font-semibold md:text-5xl">{fem}, <span className="glow-text">{first}</span></h1>
            <p className="mt-3 max-w-md text-lg text-mute">Resultados con claridad,<br />seguridad y acompañamiento.</p>
            <div className="mt-4 h-0.5 w-24 rounded-full bg-gradient-to-r from-vio to-transparent" />
            <p className="mt-4 text-sm">{me?.user?.role === 'clinico' ? <>Tienes <b className="text-lila">{m.awaitingAuth}</b> resultados esperando tu autorización.</> : me?.user?.role === 'admin' ? <>Bitácora con <b className="text-lila">{data.system.auditCount}</b> eventos verificados y <b className="text-lila">{m.openFollowUps}</b> seguimientos abiertos.</> : <>Hoy tienes <b className="text-lila">{m.awaitingReview}</b> documentos por revisar y <b className="text-lila">{m.openFollowUps}</b> pacientes por contactar.</>}</p>
            {me?.user?.role === 'clinico' && m.awaitingAuth > 0 && <Link href="/resultados?stage=clinical" className="btn-primary mt-3">Ir a mi fila<ArrowRight size={16} /></Link>}
            <div className="mt-5 flex flex-wrap gap-2">{data.system.auditOk ? <Chip tone="safe" icon={<ShieldCheck size={12} />}>Bitácora íntegra · {data.system.auditCount} eventos</Chip> : <Chip tone="err" icon={<ShieldAlert size={12} />}>Bitácora alterada</Chip>}<Chip tone="sky" icon={<MessageCircleOff size={12} />}>0 entregas dependen de WhatsApp</Chip></div>
          </div>
          <HeroSculpture model="torus" className="h-56 md:h-72" size={3.4} />
        </div>
      </section>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{BIG.map((b) => (
        <div key={b.label} className="card fade-in relative overflow-hidden p-5">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10" style={{ background: b.col + '22', boxShadow: `0 0 24px -6px ${b.col}` }}><b.icon size={20} style={{ color: b.col }} /></div><div className="font-display text-3xl font-semibold">{b.v}</div></div>
          <div className="mt-3 text-sm font-medium">{b.label}</div><div className="text-[11px] text-mute">{b.hint}</div>
          <div className="pointer-events-none absolute bottom-3 right-3 opacity-90"><Spark data={b.s} color={b.col} /></div>
        </div>))}</div>
      <div className="mb-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="card fade-in p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles size={18} className="text-lila" />Actividad reciente</h2><Link href="/auditoria" className="flex items-center gap-1 text-sm text-lila hover:underline">Ver todo<ArrowRight size={14} /></Link></div>
          <ol className="relative space-y-1 before:absolute before:bottom-4 before:left-[22px] before:top-4 before:w-px before:bg-gradient-to-b before:from-vio before:to-transparent">
            {data.activity.map((a: any, i: number) => { const I = ICON[a.action] || Sparkles; const row = (
              <div className="relative flex items-center gap-4 rounded-xl p-2 hover:bg-white/[0.03]"><span className="z-10 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-s2"><I size={18} className="text-lila" /></span>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{a.title}{a.who ? ': ' : ''}<span className="text-mute">{a.who}</span></div><div className="text-xs text-mute">{a.score != null ? `Score: ${a.score}% · ` : ''}{new Date(a.at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</div></div><Chip tone={TAG[a.tag] || 'mute'}>{a.tag}</Chip></div>);
              return <li key={i}>{a.href ? <Link href={a.href}>{row}</Link> : row}</li>; })}
          </ol>
        </section>
        <div className="grid gap-6">
          <section className="card fade-in relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-vio/30 blur-3xl" />
            <div className="relative flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-vio/40 bg-vio/15 shadow-glow"><Lock className="text-lila" /></div><div><h2 className="font-semibold">Tu información, siempre protegida</h2><p className="text-sm text-mute">Cifrado AES-256, doble control humano y bitácora encadenada verificada en tiempo real.</p></div></div>
          </section>
          <section className="card fade-in p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Users2 size={18} className="text-lila" />Acceso rápido</h2>
            <div className="grid gap-2"><Link href="/resultados" className="btn-primary"><Inbox size={16} />Revisar resultados ({m.awaitingReview})</Link><Link href="/exportar" className="btn-ghost"><BarChart3 size={16} />Ver reportes</Link><Link href="/seguimiento" className="btn-ghost"><ClipboardList size={16} />Seguimientos ({m.openFollowUps})</Link></div>
          </section>
        </div>
      </div>
      <h2 className="mb-3 text-lg font-semibold">Centro de Entrega Segura</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Recibidos hoy" value={m.receivedToday} tone="sky" icon={<Inbox size={14} />} />
        <Stat label="Aguardando revisión" value={m.awaitingReview} tone="warn" icon={<Inbox size={14} />} />
        <Stat label="Aguardando autorización" value={m.awaitingAuth} tone="vio" icon={<Stethoscope size={14} />} />
        <Stat label="Autorizados" value={m.authorized} tone="safe" />
        <Stat label="Notificados" value={m.notified} icon={<Send size={14} />} />
        <Stat label="Consultados" value={m.accessed} tone="safe" icon={<Eye size={14} />} />
        <Stat label="Sin acceso > 48 h" value={m.notAccessed48h} tone={m.notAccessed48h ? 'warn' : 'ink'} icon={<AlarmClock size={14} />} />
        <Stat label="Fallos de entrega" value={m.deliveryFailures} tone={m.deliveryFailures ? 'err' : 'ink'} />
        <Stat label="Sin canal digital" value={m.noDigital} tone="vio" icon={<WifiOff size={14} />} />
        <Stat label="Seguimientos abiertos" value={m.openFollowUps} tone="warn" icon={<ClipboardList size={14} />} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Resultados por día" sub="Últimos 7 días">
          <div className="h-64"><ResponsiveContainer><AreaChart data={c.perDay}><defs>{[['a', '#38BDF8'], ['b', '#2DD4BF'], ['c', '#8B5CF6']].map(([k, col]) => <linearGradient key={k} id={k} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity={0.35} /><stop offset="100%" stopColor={col} stopOpacity={0} /></linearGradient>)}</defs>
            <CartesianGrid stroke="#262654" vertical={false} /><XAxis dataKey="day" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...tip} /><Legend />
            <Area isAnimationActive={false} dataKey="recibidos" stroke="#38BDF8" fill="url(#a)" strokeWidth={2} /><Area isAnimationActive={false} dataKey="autorizados" stroke="#2DD4BF" fill="url(#b)" strokeWidth={2} /><Area isAnimationActive={false} dataKey="consultados" stroke="#8B5CF6" fill="url(#c)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
        </Section>
        <Section title="Tiempos promedio (horas)" sub="Cuellos de botella del flujo">
          <div className="h-64"><ResponsiveContainer><BarChart data={c.times} layout="vertical" margin={{ left: 30 }}><CartesianGrid stroke="#262654" horizontal={false} /><XAxis type="number" {...axis} /><YAxis type="category" dataKey="etapa" width={150} {...axis} /><Tooltip {...tip} /><Bar isAnimationActive={false} dataKey="horas" fill="#38BDF8" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>
        </Section>
        <Section title="Pendientes por laboratorio" sub="Incluye fallos de lectura del documento">
          <div className="h-64"><ResponsiveContainer><BarChart data={c.byLab}><CartesianGrid stroke="#262654" vertical={false} /><XAxis dataKey="lab" {...axis} interval={0} tick={{ fontSize: 10, fill: '#94A3B8' }} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...tip} /><Legend /><Bar isAnimationActive={false} dataKey="pendientes" fill="#F59E0B" radius={[6, 6, 0, 0]} /><Bar isAnimationActive={false} dataKey="entregados" fill="#2DD4BF" radius={[6, 6, 0, 0]} /><Bar isAnimationActive={false} dataKey="fallosOCR" name="fallos OCR" fill="#F87171" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Section>
        <Section title="Embudo de entrega" sub="Dónde se quedan los resultados en el camino a la paciente">
          <div className="space-y-2.5">{c.funnel.map((f: any, i: number) => { const pct = c.funnel[0].n ? Math.round((f.n / c.funnel[0].n) * 100) : 0; return (
            <div key={f.etapa}><div className="mb-1 flex justify-between text-xs"><span className="text-mute">{f.etapa}</span><span><b>{f.n}</b> <span className="text-mute">· {pct}%</span></span></div>
              <div className="h-3 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: pct + '%', background: `linear-gradient(90deg, #8B5CF6, ${['#8B5CF6', '#7C6CF6', '#6D7CF8', '#38BDF8', '#2DD4BF', '#2DD4BF'][i]})` }} /></div></div>); })}</div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="card-2 p-3"><div className="font-display text-2xl text-safe">{data.delivery.failoverRescues}</div><div className="text-mute">avisos rescatados por failover</div></div>
            <div className="card-2 p-3"><div className="font-display text-2xl text-warn">{data.delivery.whatsappBlocked}</div><div className="text-mute">intentos con WhatsApp bloqueado</div></div>
            <div className="card-2 p-3"><div className="font-display text-2xl text-err">{data.delivery.dlpBlocked}</div><div className="text-mute">mensajes frenados por la guardia</div></div>
          </div>
        </Section>
        <Section title="Municipios atendidos" sub="Resultados consultados vs. pendientes por comunidad">
          <div className="h-64"><ResponsiveContainer><BarChart data={c.byMunicipality} layout="vertical" margin={{ left: 20 }}><CartesianGrid stroke="#262654" horizontal={false} /><XAxis type="number" allowDecimals={false} {...axis} /><YAxis type="category" dataKey="municipio" width={120} {...axis} /><Tooltip {...tip} /><Legend /><Bar isAnimationActive={false} dataKey="atendidas" stackId="a" fill="#2DD4BF" radius={[0, 0, 0, 0]} /><Bar isAnimationActive={false} dataKey="pendientes" stackId="a" fill="#8B5CF6" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>
        </Section>
        <Section title="Seguimientos abiertos y canales usados" sub="La entrega no depende de un solo canal">
          <div className="grid h-64 grid-cols-2 gap-2">
            <ResponsiveContainer><BarChart data={c.followUps}><XAxis dataKey="motivo" {...axis} tick={{ fontSize: 10, fill: '#A1A6C8' }} interval={0} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...tip} /><Bar isAnimationActive={false} dataKey="abiertos" fill="#8B5CF6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
            <ResponsiveContainer><BarChart data={c.channels}><XAxis dataKey="canal" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...tip} /><Bar isAnimationActive={false} dataKey="avisos" fill="#38BDF8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </Section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Por qué importa el seguimiento" sub="Datos públicos reales de México (no son datos de la plataforma)">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card-2 p-4"><div className="font-display text-3xl text-sky">4,646</div><div className="text-sm text-mute">mujeres fallecieron por cáncer cervicouterino en 2024</div><div className="mt-2 text-[11px] text-mute/70">INEGI · Estadísticas de Defunciones Registradas 2024</div></div>
            <div className="card-2 p-4"><div className="font-display text-3xl text-vio">11,919</div><div className="text-sm text-mute">casos nuevos estimados en México en 2024</div><div className="mt-2 text-[11px] text-mute/70">GLOBOCAN (OMS/IARC), estimación 2024</div></div>
            <div className="card-2 p-4"><div className="font-display text-3xl text-safe">2.º</div><div className="text-sm text-mute">cáncer más diagnosticado en mujeres, después del de mama</div><div className="mt-2 text-[11px] text-mute/70">GLOBOCAN 2024</div></div>
          </div>
          <p className="mt-4 text-sm text-mute">Un resultado que no llega, o que llega a la persona equivocada, es una oportunidad de detección perdida. LUMEN mide cada etapa para que ninguna paciente quede sin seguimiento.</p>
        </Section>
        <Section title="Estado del sistema">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-mute">Almacén efímero (OTP, límites)</span><span>{data.system.kv}</span></li>
            <li className="flex justify-between"><span className="text-mute">Fila de trabajos</span><span>{data.system.queue.kind} · {data.system.queue.pending} pendientes</span></li>
            <li className="flex justify-between"><span className="text-mute">Canales activos</span><span className="flex gap-1">{Object.entries(data.system.channels).map(([k, v]) => <Chip key={k} tone={v ? 'safe' : 'err'}>{k}</Chip>)}</span></li>
            <li className="flex justify-between"><span className="text-mute">Errores de lectura de documento</span><span className="flex items-center gap-1">{m.ocrFailures ? <AlertTriangle size={14} className="text-warn" /> : null}{m.ocrFailures}</span></li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2"><Link className="btn-ghost" href="/resultados">Ir a revisión</Link><Link className="btn-ghost" href="/seguimiento">Seguimiento</Link></div>
        </Section>
      </div>
    </>
  );
}
