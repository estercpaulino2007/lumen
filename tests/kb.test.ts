import { describe, it, expect } from 'vitest';
import { kbSearch } from '@/lib/luminy-kb';
describe('Luminy KB', () => {
  it.each([['¿cómo agrego un usuario?', 'add_user'], ['how can i add a user', 'add_user'], ['como funciona o whatsapp', 'whatsapp'], ['how do I export a report', 'export'], ['¿cómo desactivo a alguien? desactivar usuario', 'deactivate_user'], ['como cambio el idioma a inglés', 'language'], ['dónde subo el pdf', 'upload'], ['qué es lumen', 'what']])('%s → %s', (q, id) => { expect(kbSearch(q)?.id).toBe(id); });
});
