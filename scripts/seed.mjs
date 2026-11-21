// Carga los datos de demostración en un servidor LUMEN en ejecución (npm run dev / npm start).
const base = process.env.LUMEN_URL || 'http://localhost:3000';
const r = await fetch(base + '/api/demo/seed', { method: 'POST', headers: { 'x-lumen-csrf': '1' } });
console.log(r.status, await r.text());
