'use client';
import { useEffect, useState } from 'react';
import { EXACT, FRAG } from '@/lib/i18n-dict';

// Traducción ES ⇄ EN en el navegador: recorre textos y atributos visibles y los reemplaza con el diccionario.
// Guarda el original para volver al español sin recargar. Un MutationObserver mantiene traducido lo que React actualiza.
type Lang = 'es' | 'en';
const ATTRS = ['placeholder', 'aria-label', 'title'];
const orig = new WeakMap<Node, string>(), shown = new WeakMap<Node, string>();
let lang: Lang = 'es';

function tr(s: string) {
  const t = s.trim(); if (!t || !/[A-Za-zÁÉÍÓÚáéíóúñ¿¡]/.test(t)) return s;
  let out = EXACT[t];
  if (!out) { let x = t; for (const [a, b] of FRAG) if (x.includes(a)) x = x.split(a).join(b); if (x !== t) out = x; }
  return out ? s.replace(t, out) : s;
}
function textNode(n: Text) {
  const cur = n.data;
  if (shown.get(n) !== cur) orig.set(n, cur); // React escribió un texto nuevo
  const o = orig.get(n) ?? cur;
  const next = lang === 'en' ? tr(o) : o;
  if (next !== cur) n.data = next;
  shown.set(n, next);
}
function element(el: Element) {
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const key = 'data-i18n-' + a, cur = el.getAttribute(a)!;
    if (el.getAttribute(key + '-shown') !== cur) el.setAttribute(key, cur);
    const o = el.getAttribute(key) ?? cur, next = lang === 'en' ? tr(o) : o;
    if (next !== cur) el.setAttribute(a, next);
    el.setAttribute(key + '-shown', next);
  }
}
function walk(root: Node) {
  if (root.nodeType === 3) return textNode(root as Text);
  if (root.nodeType !== 1) return;
  const el = root as Element;
  if (['SCRIPT', 'STYLE', 'CANVAS', 'TEXTAREA', 'CODE'].includes(el.tagName) || el.closest('[data-no-i18n]')) return;
  element(el);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null = w.nextNode();
  while (n) { if (n.nodeType === 3) { const p = n.parentElement; if (p && !['SCRIPT', 'STYLE', 'TEXTAREA'].includes(p.tagName)) textNode(n as Text); } else element(n as Element); n = w.nextNode(); }
}
const listeners = new Set<(l: Lang) => void>();
export function setLang(l: Lang) {
  lang = l; try { localStorage.setItem('lumen-lang', l); } catch {}
  document.documentElement.lang = l === 'en' ? 'en' : 'es-MX';
  walk(document.body); listeners.forEach((f) => f(l));
}

export function I18nRoot() {
  useEffect(() => {
    let saved: Lang = 'es'; try { saved = (localStorage.getItem('lumen-lang') as Lang) || 'es'; } catch {}
    const mo = new MutationObserver((ms) => { if (lang === 'es') { for (const m of ms) if (m.type === 'characterData') orig.set(m.target, (m.target as Text).data); return; } for (const m of ms) { if (m.type === 'childList') m.addedNodes.forEach(walk); else if (m.type === 'characterData') textNode(m.target as Text); else if (m.target.nodeType === 1) element(m.target as Element); } });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    if (saved === 'en') setLang('en');
    return () => mo.disconnect();
  }, []);
  return null;
}

export function LangToggle({ className = '' }: { className?: string }) {
  const [l, setL] = useState<Lang>('es');
  useEffect(() => { setL(lang); const f = (x: Lang) => setL(x); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  return (
    <div className={`inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-xs font-semibold ${className}`} role="group" aria-label="Idioma / Language" data-no-i18n>
      {(['es', 'en'] as Lang[]).map((x) => <button key={x} onClick={() => setLang(x)} aria-pressed={l === x} className={`rounded-full px-3 py-1.5 transition ${l === x ? 'bg-gradient-to-r from-vio to-indi text-white' : 'text-mute hover:text-ink'}`}>{x.toUpperCase()}</button>)}
    </div>
  );
}
