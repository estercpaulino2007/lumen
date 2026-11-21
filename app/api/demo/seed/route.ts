import { api, json, HttpError } from '@/lib/http';
import { seedDemo } from '@/lib/seed';

export const POST = api(async () => {
  if (process.env.LUMEN_DEMO_MODE === 'false') throw new HttpError(403, 'Modo demo deshabilitado.');
  return json(await seedDemo());
});
