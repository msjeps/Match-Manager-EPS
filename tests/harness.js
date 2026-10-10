// Charge le <script> de l'application (index.html par défaut, ou HTML=chemin) dans un contexte
// `vm` avec un DOM factice, sans navigateur. Les fonctions de calcul (classements, tableau, XLSX,
// sauvegarde, palmarès) s'exécutent telles quelles : aucun code de l'app n'est dupliqué.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = process.env.HTML || path.join(__dirname, '..', 'index.html');

function makeEl() {
  const store = {
    value: '', innerHTML: '', textContent: '', innerText: '', checked: false, disabled: false,
    style: {}, children: [], dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  };
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'symbol') return undefined;
      return () => makeEl();
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function createApp() {
  const els = new Map();
  const toasts = [];
  const downloads = [];
  const ls = new Map();
  const documentStub = {
    hidden: false,
    getElementById(id) { if (!els.has(id)) els.set(id, makeEl()); return els.get(id); },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    createElement() { return makeEl(); },
    addEventListener() {},
    body: makeEl(),
    documentElement: makeEl(),
  };
  const sandbox = {
    console,
    document: documentStub,
    navigator: { },
    localStorage: {
      getItem: k => (ls.has(k) ? ls.get(k) : null),
      setItem: (k, v) => { ls.set(k, String(v)); },
      removeItem: k => { ls.delete(k); },
    },
    setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
    TextEncoder, TextDecoder, btoa, atob,
    Blob: class { constructor(parts, opts) { this.parts = parts; this.type = opts && opts.type; } },
    URL: { createObjectURL(b) { downloads.push(b); return 'blob:test'; }, revokeObjectURL() {} },
    requestAnimationFrame: () => 0,
    scrollTo() {},
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = () => {};
  vm.createContext(sandbox);

  const html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  if (!m) throw new Error('Aucun <script> dans ' + HTML);
  vm.runInContext(m[1], sandbox, { filename: path.basename(HTML) });

  // `T` et `state` sont des let de premier niveau : on les expose par un pont.
  vm.runInContext(`globalThis.__bridge={
    getT:()=>T,setT:v=>{T=v},getState:()=>state,setState:v=>{state=v},version:APP_VERSION,
    toast:(()=>{const o=toast;toast=function(m){__toasts.push(String(m));};return o;})()
  };`, Object.assign(sandbox, { __toasts: toasts }));

  const b = sandbox.__bridge;
  return {
    ctx: sandbox,
    fn: name => sandbox[name],
    get T() { return b.getT(); },
    set T(v) { b.setT(v); },
    get state() { return b.getState(); },
    set state(v) { b.setState(v); },
    version: b.version, toasts, downloads, localStorage: sandbox.localStorage,
    // objets créés dans le contexte : copie simple pour deepStrictEqual (prototypes différents)
    plain: x => JSON.parse(JSON.stringify(x)),
  };
}

// ----- Lecture d'un ZIP « stocké » (méthode 0), tel que produit par makeZip() -----
function readStoredZip(buf) {
  buf = Buffer.from(buf);
  const eocd = buf.length - 22;
  if (buf.readUInt32LE(eocd) !== 0x06054b50) throw new Error('EOCD introuvable');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('entrée centrale invalide');
    const crc = buf.readUInt32LE(p + 16);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    const dataStart = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    files[name] = { data: buf.slice(dataStart, dataStart + size), crc };
    p += 46 + nameLen;
  }
  return files;
}

// Lignes d'une feuille OOXML : tableau de { 'A': valeur, 'B': valeur, ... }
function sheetRows(xml) {
  const rows = [];
  for (const r of xml.matchAll(/<row r="\d+"(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row = {};
    for (const c of (r[1] || '').matchAll(/<c r="([A-Z]+)\d+"[^>]*>(?:<is><t>([\s\S]*?)<\/t><\/is>|<v>([\s\S]*?)<\/v>)<\/c>/g)) {
      row[c[1]] = c[2] !== undefined ? c[2].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : Number(c[3]);
    }
    rows.push(row);
  }
  return rows;
}

module.exports = { createApp, readStoredZip, sheetRows };
