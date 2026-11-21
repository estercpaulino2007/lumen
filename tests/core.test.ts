import { describe, it, expect } from 'vitest';
import { validateCurp, syntheticCurp, checkDigit } from '@/lib/curp';
import { scoreCandidate, suggest, nameSim } from '@/lib/match';
import { dlpCheck, TEMPLATES } from '@/lib/dlp';
import { sign, verifySigned, encrypt, decrypt, otpHash, pseudonym } from '@/lib/crypto';

const maria = { id: 'p1', fullName: 'María López Hernández', dateOfBirth: '1985-03-14', phone: '+525551231234', municipality: 'Nezahualcóyotl', visits: [{ sampleFolio: 'EIRA-M-0457', collectedAt: '2026-11-12' }] };
const guadalupe = { id: 'p2', fullName: 'María Guadalupe López Hernández', dateOfBirth: '1979-07-02', phone: '+525559879871', municipality: 'Nezahualcóyotl', visits: [] };

describe('CURP (algoritmo real RENAPO)', () => {
  it('genera CURP sintética válida y recupera la fecha', () => {
    const c = syntheticCurp('María', 'López', 'Hernández', '1985-03-14', 'MC');
    const v = validateCurp(c);
    expect(v.ok).toBe(true); expect((v as any).birth).toBe('1985-03-14');
  });
  it('detecta dígito verificador alterado', () => {
    const c = syntheticCurp('Ana', 'Ruiz', 'Sánchez', '1992-10-21');
    const bad = c.slice(0, 17) + ((checkDigit(c.slice(0, 17)) + 1) % 10);
    expect(validateCurp(bad).ok).toBe(false);
  });
});

describe('Asociación explicable (40/25/15/10/10)', () => {
  it('reproduce el caso de la guía: nombre sin acentos + teléfono parcial ≈ 93%', () => {
    const c = scoreCandidate({ nombre: 'Maria Lopez Hernandez', fechaNac: '1985-03-14', telefono: '55 1098 1234', municipio: 'Nezahualcoyotl', folioMuestra: 'EIRA-M-0457' }, maria);
    expect(c.score).toBeGreaterThanOrEqual(90);
    expect(c.factors.find((f) => f.key === 'telefono')!.value).toBe(0.5);
  });
  it('sube el riesgo ante homónimas aunque el puntaje sea alto', () => {
    const s = suggest({ nombre: 'Ma. Guadalupe Lopez Hernandez', municipio: 'Nezahualcóyotl' }, [maria, guadalupe]);
    expect(s.candidates.length).toBe(2);
    expect(s.risk).not.toBe('bajo');
  });
  it('es tolerante a acentos y orden', () => { expect(nameSim('LOPEZ HERNANDEZ MARIA', 'María López Hernández')).toBeGreaterThan(0.95); });
});

describe('Guardia clínica (DLP)', () => {
  it('permite la plantilla oficial', () => { expect(dlpCheck(TEMPLATES.aviso).ok).toBe(true); });
  it.each(['Tu resultado salió anormal', 'Resultado negativo', 'Posible VPH', 'Lesión de bajo grado LSIL', 'sospecha de cáncer'])('bloquea: %s', (t) => { expect(dlpCheck(t).ok).toBe(false); });
});

describe('Criptografía', () => {
  it('cifra y descifra AES-256-GCM; detecta manipulación', () => {
    const blob = encrypt(Buffer.from('%PDF-1.7 demo'));
    expect(decrypt(blob).toString()).toBe('%PDF-1.7 demo');
    blob[blob.length - 1] ^= 1; expect(() => decrypt(blob)).toThrow();
  });
  it('rechaza enlaces firmados vencidos o alterados', () => {
    const t = sign({ jti: 'x', exp: Date.now() + 1000 });
    expect(verifySigned(t)?.jti).toBe('x');
    expect(verifySigned(t.slice(0, -2) + 'aa')).toBeNull();
    expect(verifySigned(sign({ jti: 'y', exp: Date.now() - 1 }))).toBeNull();
  });
  it('OTP se guarda como HMAC con sal; seudónimos estables', () => {
    expect(otpHash('s1', '123456')).not.toBe(otpHash('s2', '123456'));
    expect(pseudonym('abc')).toBe(pseudonym('abc'));
  });
});
