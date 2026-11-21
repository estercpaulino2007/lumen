// Interfaz de fila de trabajos. Implementación del prototipo: en memoria (mismo proceso).
// Para piloto: misma interfaz sobre Valkey Streams/BullMQ para reintentos y varios workers.
type Job = { id: number; name: string; run: () => Promise<any>; tries: number };
const g = globalThis as any;
const state = g.__lumenQ || (g.__lumenQ = { seq: 0, running: false, jobs: [] as Job[], done: 0, failed: 0 });
export function enqueue(name: string, run: () => Promise<any>) {
  state.jobs.push({ id: ++state.seq, name, run, tries: 0 });
  if (!state.running) setTimeout(drain, 50);
}
async function drain() {
  state.running = true;
  while (state.jobs.length) {
    const j = state.jobs.shift()!;
    try { await j.run(); state.done++; } catch (e) { j.tries++; if (j.tries < 3) state.jobs.push(j); else { state.failed++; console.error('[queue]', j.name, e); } }
  }
  state.running = false;
}
export const queueStats = () => ({ pending: state.jobs.length, done: state.done, failed: state.failed, kind: 'memoria' });
