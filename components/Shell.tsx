'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ReactNode, useEffect, useState } from 'react';
import { Home, Inbox, Upload, Stethoscope, Bell, ShieldCheck, ClipboardList, Download, WifiOff, Lock, Users, LogOut, UserRound, FlaskConical, Menu, X, ChevronDown } from 'lucide-react';
import { fetcher, apiFetch } from '@/lib/client';
import { Logo, Chip } from './ui';
import { Luminy } from './Luminy';
import { LangToggle } from './I18n';

const NAV = [
  { href: '/panel', label: 'Inicio', icon: Home, roles: ['captura', 'clinico', 'admin'] },
  { href: '/laboratorio', label: 'Cargar resultados', icon: Upload, roles: ['lab'] },
  { href: '/resultados', label: 'Resultados', icon: Inbox, roles: ['captura', 'admin'] },
  { href: '/resultados?stage=clinical', label: 'Autorización clínica', icon: Stethoscope, roles: ['clinico'] },
  { href: '/pacientes', label: 'Pacientes', icon: UserRound, roles: ['captura', 'admin'] },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell, roles: ['captura', 'clinico', 'admin'] },
  { href: '/seguimiento', label: 'Seguimiento', icon: ClipboardList, roles: ['captura', 'clinico', 'admin'] },
  { href: '/brigada', label: 'Brigada offline', icon: WifiOff, roles: ['captura', 'admin'] },
  { href: '/auditoria', label: 'Auditoría', icon: ShieldCheck, roles: ['captura', 'clinico', 'admin'] },
  { href: '/exportar', label: 'Reportes', icon: Download, roles: ['captura', 'admin'] },
  { href: '/privacidad', label: 'Privacidad', icon: Lock, roles: ['captura', 'clinico', 'admin'] },
  { href: '/admin', label: 'Usuarios y accesos', icon: Users, roles: ['admin'] },
  { href: '/acerca', label: 'Implementado vs simulado', icon: FlaskConical, roles: ['lab', 'captura', 'clinico', 'admin'] },
];
const ROLE: Record<string, string> = { lab: 'Laboratorio', captura: 'Coordinación EIRA', clinico: 'Profesional de salud', admin: 'Administradora' };
const initials = (n: string) => n.replace(/^(Dra?\.|Recepción ·)\s*/, '').split(' ').slice(0, 2).map((x) => x[0]).join('').toUpperCase();

export function Shell({ children }: { children: ReactNode }) {
  const { data, isLoading, isValidating } = useSWR('/api/auth/me', fetcher, { revalidateOnMount: true });
  const fu = useSWR(data?.user && data.user.role !== 'lab' ? '/api/followups' : null, fetcher, { refreshInterval: 15000 }).data;
  const path = usePathname(); const router = useRouter();
  const [open, setOpen] = useState(false), [menu, setMenu] = useState(false);
  useEffect(() => { if (!isLoading && !isValidating && data && !data.user) router.replace('/'); }, [data, isLoading, isValidating, router]);
  useEffect(() => { setOpen(false); setMenu(false); }, [path]);
  if (!data?.user) return <div className="grid min-h-screen place-items-center text-mute">Cargando…</div>;
  const u = data.user;
  const nav = NAV.filter((n) => n.roles.includes(u.role));
  const pending = fu?.followUps?.filter((f: any) => f.status === 'open').length || 0;
  const logout = async () => { await apiFetch('/api/auth/logout', { method: 'POST' }); router.replace('/'); };
  const side = (
    <nav aria-label="Navegación principal" className="relative flex h-full flex-col gap-0.5 overflow-y-auto p-3">
      <div className="mb-5 mt-2 flex justify-center"><Logo vertical /></div>
      {nav.map((n) => { const active = path === n.href.split('?')[0]; return (
        <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}
          className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? 'border border-vio/40 bg-gradient-to-r from-vio/30 to-indi/10 text-white shadow-glow' : 'border border-transparent text-mute hover:bg-white/5 hover:text-ink'}`}><n.icon size={18} />{n.label}</Link>); })}
      <div className="mt-auto space-y-2 pb-14 pt-4 text-xs">
        <div className="flex flex-wrap gap-1"><Chip tone="warn">Datos ficticios</Chip><Chip tone="mute">KV: {data.system.kv}</Chip></div>
      </div>
      
    </nav>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 overflow-hidden border-r border-white/10 bg-s1/60 backdrop-blur-xl lg:block" style={{ background: 'radial-gradient(300px 260px at 0% 100%, rgba(139,92,246,.25), transparent 70%), rgba(14,14,38,.6)' }}>{side}</aside>
      {open && <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setOpen(false)}><aside className="h-full w-72 border-r border-white/10 bg-s1" onClick={(e) => e.stopPropagation()}>{side}</aside></div>}
      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-bg/60 px-4 py-3 backdrop-blur-xl md:px-8">
          <button className="btn-ghost px-3 lg:hidden" onClick={() => setOpen(!open)} aria-label="Abrir menú">{open ? <X size={18} /> : <Menu size={18} />}</button>
          <div className="lg:hidden"><Logo small /></div>
          <div className="ml-auto flex items-center gap-3">
            <LangToggle />
            <Link href={u.role === 'lab' ? '/laboratorio' : '/seguimiento'} className="relative rounded-full p-2.5 hover:bg-white/5" aria-label={`Notificaciones: ${pending} pendientes`}><Bell size={20} />{pending > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-pink-500 ring-2 ring-bg" />}</Link>
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 hover:border-vio/50" aria-expanded={menu}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-vio to-indi text-sm font-semibold">{initials(u.name)}</span>
                <span className="hidden text-left sm:block"><span className="block text-sm font-medium leading-tight">{u.name}</span><span className="block text-[11px] text-mute">{ROLE[u.role]}</span></span><ChevronDown size={14} className="text-mute" />
              </button>
              {menu && <div className="fade-in absolute right-0 mt-2 w-56 rounded-xl2 border border-white/10 bg-s1/95 p-2 shadow-soft backdrop-blur-xl"><div className="px-3 py-2 text-xs text-mute">{u.email}</div><button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/5"><LogOut size={16} />Cerrar sesión</button></div>}
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-7xl p-4 pb-28 md:p-6">{children}</main>
      </div>
      <Luminy audience="staff" />
    </div>
  );
}
