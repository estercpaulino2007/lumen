'use client';
import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { fetcher, apiFetch } from '@/lib/client';
import { PageHead, Section, Note, Chip } from '@/components/ui';

export default function Privacidad() {
  const { data, mutate } = useSWR('/api/settings', fetcher);
  const pats = useSWR('/api/patients', fetcher).data;
  const me = useSWR('/api/auth/me', fetcher).data;
  const [s, setS] = useState<any>(null), [msg, setMsg] = useState('');
  useEffect(() => { if (data) setS(data.settings); }, [data]);
  const save = async () => { try { await apiFetch('/api/settings', { body: { linkTtlMinutes: +s.linkTtlMinutes, linkMaxUses: +s.linkMaxUses, retentionDays: +s.retentionDays, followUpHours: +s.followUpHours } }); setMsg('Políticas actualizadas (auditado).'); mutate(); } catch (e: any) { setMsg(e.message); } };
  const admin = me?.user?.role === 'admin';
  return (
    <>
      <PageHead title="Privacidad y consentimiento" sub="Datos mínimos, permisos por rol, cifrado y registro de accesos." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Políticas" sub={admin ? 'Solo administración puede cambiarlas.' : 'Solo lectura para tu rol.'}>
          {s && <div className="grid gap-3 sm:grid-cols-2">
            {[['linkTtlMinutes', 'Duración del enlace (min)'], ['linkMaxUses', 'Usos máximos por enlace'], ['retentionDays', 'Retención de PDFs (días)'], ['followUpHours', 'Alerta sin acceso (horas)']].map(([k, l]) => <div key={k}><label className="label" htmlFor={k}>{l}</label><input id={k} type="number" className="input" disabled={!admin} value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>)}
          </div>}
          {admin && <button className="btn-primary mt-4" onClick={save}><Save size={16} />Guardar</button>}
          {msg && <div className="mt-3"><Note>{msg}</Note></div>}
        </Section>
        <Section title="Controles activos">
          <ul className="space-y-2 text-sm">{[
            'PDFs cifrados en reposo con AES-256-GCM; la clave nunca está en el navegador',
            'Enlaces firmados de 5 minutos, con límite de usos y ligados a la sesión de la paciente',
            'Marca de agua dinámica con fecha, hora e identificador parcial en cada acceso',
            'OTP guardado solo como HMAC, 5 intentos, bloqueo temporal de 15 minutos',
            'Avisos revisados por la guardia clínica (DLP) antes de salir por cualquier canal',
            'Lectura de documentos "ciega a lo clínico": solo identificadores',
            'Doble control: quien asocia no puede autorizar',
            'IP y navegador guardados como hash en la bitácora',
            'Verificación por cámara 100% en el dispositivo; la imagen no se envía',
          ].map((t) => <li key={t} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-safe" />{t}</li>)}</ul>
        </Section>
      </div>
      <div className="mt-6"><Section title="Consentimiento por paciente" sub="Cada canal requiere consentimiento explícito. Derechos ARCO (acceso, rectificación, cancelación y oposición) como flujo del piloto.">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-mute"><tr><th className="py-2">Paciente</th><th>SMS</th><th>Correo</th><th>WhatsApp</th><th>Cámara</th><th>Estadística anónima</th><th>Acceso digital</th></tr></thead>
          <tbody>{pats?.patients?.map((p: any) => <tr key={p.id} className="border-t border-line"><td className="py-2">{p.fullName}</td>{['sms', 'email', 'whatsapp', 'camera', 'research_anon'].map((k) => <td key={k}><Chip tone={p.consentFlags?.[k] ? 'safe' : 'mute'}>{p.consentFlags?.[k] ? 'sí' : 'no'}</Chip></td>)}<td className="text-mute">{p.digitalAccess}</td></tr>)}</tbody></table></div>
      </Section></div>
    </>
  );
}
