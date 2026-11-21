'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, ScanFace, ShieldCheck, FlaskConical } from 'lucide-react';

// Verificación de PRESENCIA (liveness) hecha 100% en el dispositivo con face-api.js.
// La imagen y el vector facial nunca se envían al servidor; solo se reporta aprobado/no aprobado y un puntaje.
// No analiza el examen, no diagnostica y no decide la liberación del resultado.
const CDN = '/faceapi'; // face-api.js (MIT) servido localmente: funciona sin CDN
type Outcome = { outcome: 'passed' | 'failed'; score: number; method: 'face-api-liveness' | 'simulacion-rotulada'; challenge: string };

function loadScript(src: string) {
  return new Promise<void>((res, rej) => { if ((window as any).faceapi) return res(); const s = document.createElement('script'); s.src = src; s.async = true; s.onload = () => res(); s.onerror = () => rej(new Error('no se pudo cargar')); document.head.appendChild(s); });
}
const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
const ear = (e: any[]) => (dist(e[1], e[5]) + dist(e[2], e[4])) / (2 * dist(e[0], e[3]));

export function PresenceCheck({ onDone }: { onDone: (o: Outcome) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'running' | 'error'>('loading');
  const [msg, setMsg] = useState('Preparando la cámara…'), [progress, setProgress] = useState(0);
  const challenge = useRef(Math.random() < 0.5 ? 'parpadear' : 'girar');
  useEffect(() => {
    let stream: MediaStream | null = null, stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 360 }, audio: false });
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        setMsg('Cargando el detector de rostro (se ejecuta en tu dispositivo)…');
        await Promise.race([loadScript(CDN + '/face-api.js'), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 12000))]);
        const fa = (window as any).faceapi;
        await fa.nets.tinyFaceDetector.loadFromUri(CDN + '/model');
        await fa.nets.faceLandmark68TinyNet.loadFromUri(CDN + '/model');
        if (stop) return;
        setPhase('running');
        setMsg(challenge.current === 'parpadear' ? 'Mira a la cámara y parpadea dos veces.' : 'Mira a la cámara y gira la cabeza suavemente hacia un lado.');
        let blinks = 0, closed = false, baseNose: number | null = null, turned = false, scores: number[] = [];
        const t0 = Date.now();
        while (!stop && Date.now() - t0 < 20000) {
          const d = await fa.detectSingleFace(video.current, new fa.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })).withFaceLandmarks(true);
          if (d) {
            scores.push(d.detection.score);
            const lm = d.landmarks, box = d.detection.box;
            if (challenge.current === 'parpadear') {
              const e = (ear(lm.getLeftEye()) + ear(lm.getRightEye())) / 2;
              if (e < 0.23) closed = true; else if (closed && e > 0.27) { closed = false; blinks++; }
              setProgress(Math.min(1, blinks / 2));
              if (blinks >= 2) break;
            } else {
              const nx = (lm.getNose()[3].x - box.x) / box.width;
              if (baseNose == null) baseNose = nx;
              const delta = Math.abs(nx - baseNose); setProgress(Math.min(1, delta / 0.12));
              if (delta > 0.12) { turned = true; break; }
            }
          } else setMsg('No vemos tu rostro. Acércate y busca buena luz.');
          await new Promise((r) => setTimeout(r, 120));
        }
        const passed = challenge.current === 'parpadear' ? blinks >= 2 : turned;
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        stream?.getTracks().forEach((t) => t.stop());
        if (!stop) onDone({ outcome: passed && avg > 0.5 ? 'passed' : 'failed', score: Math.round(avg * 100) / 100, method: 'face-api-liveness', challenge: challenge.current });
      } catch (e: any) {
        console.error('[camera]', e?.name, e?.message || e);
        stream?.getTracks().forEach((t) => t.stop());
        if (!stop) { setPhase('error'); setMsg(e?.name === 'NotAllowedError' ? 'No diste permiso para usar la cámara.' : 'No se pudo iniciar el detector en este dispositivo o sin conexión.'); }
      }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [onDone]);

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl3 border border-line bg-black">
        <video ref={video} className="h-full w-full -scale-x-100 object-cover" muted playsInline aria-label="Vista previa de la cámara" />
        <div className="pointer-events-none absolute inset-8 rounded-[50%] border-2 border-sky/60" />
        {phase === 'loading' && <div className="absolute inset-0 grid place-items-center bg-black/50"><Loader2 className="animate-spin text-sky" /></div>}
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-s2"><div className="h-full bg-safe transition-all" style={{ width: `${progress * 100}%` }} /></div>
      </div>
      <p className="text-center text-sm" aria-live="polite">{phase === 'running' && <ScanFace size={16} className="mr-1 inline text-sky" />}{msg}</p>
      {phase === 'running' && <div className="text-center"><button className="btn-ghost text-xs" onClick={() => onDone({ outcome: 'failed', score: 0, method: 'face-api-liveness', challenge: 'omitido' })}>Continuar sin cámara</button></div>}
      {phase === 'error' && (
        <div className="space-y-2 text-center">
          <button className="btn-warn" onClick={() => onDone({ outcome: 'passed', score: 0.9, method: 'simulacion-rotulada', challenge: 'simulado' })}><FlaskConical size={16} />Simular verificación (modo demo, rotulado)</button>
          <button className="btn-ghost ml-2" onClick={() => onDone({ outcome: 'failed', score: 0, method: 'simulacion-rotulada', challenge: 'error' })}>Continuar sin cámara</button>
        </div>
      )}
    </div>
  );
}
export const CameraIntro = ({ onUse, onSkip }: { onUse: () => void; onSkip: () => void }) => (
  <div className="space-y-4">
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-sky/10"><Camera className="text-sky" /></div>
    <div className="space-y-1 rounded-xl2 border border-line bg-s2 p-4 text-sm leading-relaxed">
      <p className="font-semibold">La cámara es opcional.</p>
      <p>Ayuda a confirmar que estás presente y protege el acceso a tu resultado.</p>
      <p>No analiza tu examen y no realiza diagnósticos.</p>
      <p>Puedes continuar usando un código de seguridad.</p>
      <p className="flex items-center gap-1 pt-1 text-xs text-safe"><ShieldCheck size={14} />Tu imagen no sale de este dispositivo.</p>
    </div>
    <div className="grid gap-2 sm:grid-cols-2"><button className="btn-primary" onClick={onUse}><Camera size={16} />Usar cámara</button><button className="btn-ghost" onClick={onSkip}>Continuar sin cámara</button></div>
  </div>
);
