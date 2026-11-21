'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { fetcher, fmt, dmy } from '@/lib/client';
import { PageHead, Status, Empty, Chip } from '@/components/ui';

const TABS = [['review', 'Aguardando revisión'], ['clinical', 'Aguardando autorización clínica'], ['delivery', 'Entrega'], ['', 'Todos']];

function Queue() {
  const sp = useSearchParams(); const router = useRouter();
  const stage = sp.get('stage') ?? 'review';
  const { data } = useSWR('/api/results' + (stage ? '?stage=' + stage : ''), fetcher, { refreshInterval: 4000 });
  const me = useSWR('/api/auth/me', fetcher).data;
  const tabs = me?.user?.role === 'clinico' ? TABS.filter(([k]) => k !== 'review') : TABS;
  return (
    <>
      <PageHead title={stage === 'clinical' ? 'Aguardando autorización clínica' : 'Resultados recibidos'} sub="Ningún resultado se libera automáticamente: revisión administrativa + autorización clínica humana." />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={stage === k} onClick={() => router.push('/resultados' + (k ? '?stage=' + k : '?stage='))} className={stage === k ? 'btn-primary' : 'btn-ghost'}>{l}</button>)}</div>
      {!data ? <div className="text-mute">Cargando…</div> : !data.results.length ? <Empty>No hay resultados en esta etapa.</Empty> : (
        <div className="grid gap-3">
          {data.results.map((r: any) => (
            <Link key={r.id} href={`/resultados/${r.id}`} className="card fade-in flex flex-wrap items-center gap-4 p-4 transition hover:border-sky/40">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-s2"><FileText size={20} className="text-sky" /></div>
              <div className="min-w-[220px] flex-1">
                <div className="font-semibold">{r.patient?.fullName || r.extracted?.nombre || <span className="text-mute">Sin nombre legible</span>}{r.patient && <span className="ml-2 text-xs text-mute">{r.patient.internalCode}</span>}</div>
                <div className="text-sm text-mute">Papanicolaou — {r.labName} · Recibido {fmt(r.receivedAt)}{r.collectedAt && ` · Toma ${dmy(r.collectedAt)}`}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Status s={r.ocrStatus} />{r.quality && <Status s={r.quality} />}{r.risk && r.stage === 'review' && <Status s={r.risk} />}
                {r.associationScore != null && r.stage === 'review' && <Chip tone="sky">Score {r.associationScore}%</Chip>}
                <Status s={r.stage === 'delivery' ? r.deliveryStatus : r.stage === 'review' ? r.associationStatus : r.stage} />
              </div>
              <ChevronRight className="text-mute" size={18} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
export default function P() { return <Suspense><Queue /></Suspense>; }
