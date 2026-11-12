/* =========================================================
   SBS YT Guard - Logika Aplikasi
   ========================================================= */
(function () {
  'use strict';

  const CFG = window.CM_CONFIG || {};
  const L = window.CMLicense;
  const $ = (id) => document.getElementById(id);
  const K_KEY = 'cm_gemini_key';
  const K_MODEL = 'cm_gemini_model';
  const K_DRAFT = 'cm_draft';
  const DEFAULT_MODEL = 'gemini-2.5-flash';

  let lastInput = null;
  let lastResult = null;

  // ---------- util ----------
  function ls(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  let toastTimer;
  function toast(text) {
    const t = $('toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Tersalin ✓'); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Tersalin ✓'); } catch (_) { toast('Gagal menyalin'); }
      ta.remove();
    }
  }
  function waLink(text) {
    const num = String(CFG.sellerWhatsApp || '').replace(/\D/g, '');
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
  }

  function modal(title, bodyHtml, actions) {
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = bodyHtml;
    const box = $('modal-actions');
    box.innerHTML = '';
    (actions || [{ label: 'Tutup', cls: 'primary grow' }]).forEach(a => {
      const b = document.createElement(a.href ? 'a' : 'button');
      b.className = 'btn ' + (a.cls || 'ghost');
      b.textContent = a.label;
      if (a.href) { b.href = a.href; b.target = '_blank'; b.rel = 'noopener'; }
      b.addEventListener('click', async () => {
        if (a.onClick) { const keep = await a.onClick(); if (keep === true) return; }
        if (!a.keepOpen) $('modal').hidden = true;
      });
      box.appendChild(b);
    });
    $('modal').hidden = false;
  }

  function show(screen) {
    $('screen-license').hidden = screen !== 'license';
    $('screen-main').hidden = screen !== 'main';
    $('screen-settings').hidden = true;
    window.scrollTo(0, 0);
  }

  // ---------- LISENSI ----------
  function renderDeviceId() {
    const id = L.getDeviceId();
    $('device-id').textContent = id;
    $('settings-device').textContent = id;
    $('btn-wa-device').href = waLink(
      'Halo, saya mau aktivasi ' + (CFG.appName || 'SBS YT Guard') + '.\nDevice ID: ' + id
    );
  }

  async function onActivate() {
    const msg = $('license-msg');
    const val = $('license-input').value;
    msg.className = 'msg';
    if (!val.trim()) { msg.textContent = 'Tempel kode lisensi dulu.'; msg.classList.add('err'); return; }
    $('btn-activate').disabled = true;
    const ok = await L.activate(val);
    $('btn-activate').disabled = false;
    if (ok) {
      msg.textContent = 'Lisensi aktif ✓';
      msg.classList.add('good');
      $('license-input').value = '';
      setTimeout(() => show('main'), 500);
    } else {
      msg.textContent = 'Lisensi tidak cocok dengan HP ini. Pastikan penjual membuat lisensi untuk Device ID di atas, dan kodenya tersalin lengkap.';
      msg.classList.add('err');
    }
  }

  function onLogout() {
    const key = ls(K_KEY);
    const keyInfo = key
      ? '<p class="small">API key kamu bisa dipakai lagi di HP baru. Salin dulu sebelum logout:</p>' +
        '<button class="btn ghost block" id="m-copy-key">📋 Salin API key</button>'
      : '';
    modal('Logout & Pindah HP?',
      '<p class="small">Lisensi di HP ini akan <b>dihapus permanen</b> dan HP ini mendapat Device ID baru. Kamu akan menerima <b>Kode Logout</b> untuk dikirim ke penjual.</p>' +
      keyInfo +
      '<label class="check"><input type="checkbox" id="m-del-key" ' + (key ? '' : 'disabled') + '> Hapus juga API key dari HP ini</label>',
      [
        { label: 'Batal', cls: 'ghost grow' },
        { label: 'Ya, Logout', cls: 'danger grow', onClick: doLogout }
      ]);
    const cb = $('m-copy-key');
    if (cb) cb.addEventListener('click', () => copy(key));
  }

  async function doLogout() {
    const delKey = $('m-del-key') && $('m-del-key').checked;
    const res = await L.logout();
    if (delKey) ls(K_KEY, null);
    renderDeviceId();
    show('license');
    const text = 'Halo, saya sudah logout dari HP lama dan mau pindah HP.\n' +
      'Device ID lama: ' + res.oldDeviceId + '\n' +
      'Kode Logout: ' + res.logoutCode + '\n' +
      'Device ID HP baru: (isi dari aplikasi di HP baru)';
    setTimeout(() => {
      modal('Logout berhasil ✓',
        '<p class="small">Simpan dan kirim data ini ke penjual bersama <b>Device ID HP baru</b> kamu:</p>' +
        '<p class="small">Device ID lama:</p><div class="device-box">' + esc(res.oldDeviceId) + '</div>' +
        '<p class="small">Kode Logout:</p><div class="device-box">' + esc(res.logoutCode) + '</div>',
        [
          { label: '📋 Salin', cls: 'ghost grow', keepOpen: true, onClick: () => { copy(text); return true; } },
          { label: '💬 WhatsApp', cls: 'wa grow', href: waLink(text) },
          { label: 'Tutup', cls: 'primary block' }
        ]);
    }, 50);
  }

  // ---------- FORM & ATURAN ----------
  function readForm() {
    const musik = $('c-musik').value;
    const footage = $('c-footage').value;
    return {
      title: $('f-title').value,
      desc: $('f-desc').value,
      tags: $('f-tags').value,
      script: $('f-script').value,
      checks: {
        musik: musik === 'none' ? undefined : musik === 'ya',
        footage: footage === 'ya',
        reupload: $('c-reupload').checked,
        mirip: $('c-mirip').checked,
        ai: $('c-ai').checked,
        realistis: $('c-realistis').checked,
        suaraSendiri: $('c-suara').checked
      }
    };
  }

  function saveDraft() {
    const d = {};
    ['f-title', 'f-desc', 'f-tags', 'f-script', 'c-musik', 'c-footage'].forEach(id => { d[id] = $(id).value; });
    ['c-reupload', 'c-mirip', 'c-ai', 'c-realistis', 'c-suara'].forEach(id => { d[id] = $(id).checked; });
    ls(K_DRAFT, JSON.stringify(d));
  }
  function loadDraft() {
    try {
      const d = JSON.parse(ls(K_DRAFT) || '{}');
      Object.keys(d).forEach(id => {
        const el = $(id); if (!el) return;
        if (el.type === 'checkbox') el.checked = !!d[id]; else el.value = d[id];
      });
    } catch (e) { /* abaikan */ }
    updateCounter();
    $('ai-sub').hidden = !$('c-ai').checked;
  }
  function updateCounter() {
    const n = $('f-title').value.length;
    const c = $('title-count');
    c.textContent = n + '/100';
    c.classList.toggle('over', n > 100);
  }

  function renderResult(res) {
    const color = res.level === 'hijau' ? 'var(--green)' : res.level === 'kuning' ? 'var(--yellow)' : 'var(--red)';
    const ring = $('score-ring');
    ring.style.setProperty('--p', res.score);
    ring.style.setProperty('--c', color);
    $('score-num').textContent = res.score;
    const lv = $('score-level');
    lv.textContent = res.levelText;
    lv.className = 'level ' + res.level;

    const box = $('findings');
    const real = res.findings.filter(f => f.points > 0 || f.title === 'Judul kosong');
    if (!real.length) {
      box.innerHTML = '<div class="empty-good">✅ Tidak ditemukan masalah dari pengecekan dasar.<br><span class="small muted">Coba Analisis AI untuk pengecekan konteks yang lebih dalam.</span></div>';
    } else {
      box.innerHTML = real.map(f =>
        '<div class="finding ' + f.sev + '">' +
          '<div class="f-head"><span>' + esc(f.title) + '</span><span class="badge ' + f.sev + '">' + esc(f.sev) + '</span></div>' +
          '<div class="f-detail">' + esc(f.detail) + '</div>' +
          '<div class="f-saran">💡 ' + esc(f.saran) + '</div>' +
        '</div>').join('');
    }
    $('result').hidden = false;
    $('ai-result').hidden = true;
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resultText(res) {
    let s = 'HASIL CEK MONETISASI (' + (CFG.appName || 'SBS YT Guard') + ')\n';
    s += 'Skor: ' + res.score + '/100 - ' + res.levelText + '\n\n';
    res.findings.filter(f => f.points > 0).forEach((f, i) => {
      s += (i + 1) + '. [' + f.sev.toUpperCase() + '] ' + f.title + '\n   ' + f.detail + '\n   Saran: ' + f.saran + '\n';
    });
    return s;
  }

  // ---------- GEMINI ----------
  const API = 'https://generativelanguage.googleapis.com/v1beta';

  function versionOf(name) {
    const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  }
  function pickModel(models) {
    const cands = models
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''))
      .filter(n => /^gemini-/.test(n) && /flash/.test(n) &&
        !/(image|tts|audio|live|embedding|thinking|exp|lite|8b|vision)/.test(n));
    if (!cands.length) return null;
    cands.sort((a, b) => {
      const v = versionOf(b) - versionOf(a);
      if (v) return v;
      const pa = /preview/.test(a) ? 1 : 0, pb = /preview/.test(b) ? 1 : 0;
      if (pa !== pb) return pa - pb;
      return a.length - b.length;
    });
    return cands[0];
  }

  async function testKey(key) {
    const r = await fetch(API + '/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.json()).error.message; } catch (e) { /* abaikan */ }
      throw new Error(r.status === 400 || r.status === 403 ? 'API key tidak valid.' : ('Error ' + r.status + ' ' + detail));
    }
    const j = await r.json();
    return pickModel(j.models || []);
  }

  async function onSaveKey() {
    const key = $('api-key').value.trim();
    const msg = $('key-msg');
    msg.className = 'msg';
    if (!key) { msg.textContent = 'Tempel API key dulu.'; msg.classList.add('err'); return; }
    msg.innerHTML = '<span class="spinner"></span> Mengetes koneksi...';
    $('btn-save-key').disabled = true;
    try {
      const model = await testKey(key);
      ls(K_KEY, key);
      const chosen = $('api-model').value.trim() || model || DEFAULT_MODEL;
      ls(K_MODEL, chosen);
      $('api-model').value = chosen;
      msg.textContent = 'Terhubung ✓ Model: ' + chosen;
      msg.classList.add('good');
    } catch (e) {
      msg.textContent = (e.message === 'Failed to fetch') ? 'Tidak ada koneksi internet.' : e.message;
      msg.classList.add('err');
    }
    $('btn-save-key').disabled = false;
  }

  function buildPrompt(input, rule) {
    const c = input.checks;
    const yn = v => v === undefined ? 'tidak relevan' : (v ? 'ya' : 'tidak');
    return [
      'Kamu adalah reviewer kebijakan monetisasi YouTube (YouTube Partner Program) yang berpengalaman dan memahami pedoman konten ramah pengiklan serta kebijakan konten berulang/diproduksi massal.',
      'Nilai risiko monetisasi video berikut. Pahami KONTEKS (contoh: kata "tembak" di video sepak bola itu aman). Jawab dalam Bahasa Indonesia yang santai dan jelas.',
      '',
      'JUDUL: ' + (input.title || '-'),
      'DESKRIPSI: ' + (input.desc || '-'),
      'TAG: ' + (input.tags || '-'),
      'NASKAH/TRANSKRIP: ' + (input.script ? input.script.slice(0, 12000) : '-'),
      '',
      'INFO TAMBAHAN: musik berlisensi=' + yn(c.musik) + ', footage milik sendiri/berlisensi=' + yn(c.footage) +
        ', reupload=' + yn(c.reupload) + ', format mirip video lain=' + yn(c.mirip) +
        ', pakai AI=' + yn(c.ai) + ', AI terlihat nyata=' + yn(c.realistis) + ', narasi suara sendiri=' + yn(c.suaraSendiri),
      'HASIL CEK OTOMATIS: skor ' + rule.score + '/100. Temuan: ' + (rule.findings.filter(f => f.points > 0).map(f => f.title).join('; ') || 'tidak ada'),
      '',
      'Balas HANYA JSON valid dengan format:',
      '{"skor": angka 0-100 (100 = sangat aman), "level": "aman" | "waspada" | "berisiko", "ringkasan": "2-3 kalimat",',
      ' "temuan": [{"bagian": "judul/deskripsi/tag/naskah/umum", "masalah": "...", "tingkat": "rendah|sedang|tinggi", "saran": "..."}],',
      ' "judul_alternatif": ["3 judul lebih aman tapi tetap menarik"], "tips_nilai_tambah": "cara membuat video terlihat lebih orisinal"}',
      'Jika hasil cek otomatis keliru karena konteks, sebutkan di ringkasan. Jangan menjanjikan video pasti lolos monetisasi.'
    ].join('\n');
  }

  function parseJson(text) {
    try { return JSON.parse(text); } catch (e) { /* coba ekstrak */ }
    const m = String(text).match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (e) { /* abaikan */ } }
    return null;
  }

  async function onAi() {
    const key = ls(K_KEY);
    if (!key) {
      modal('API key belum diisi',
        '<p class="small">Analisis AI butuh API key Gemini (gratis). Isi dulu di Pengaturan.</p>',
        [{ label: 'Nanti', cls: 'ghost grow' }, { label: '⚙️ Buka Pengaturan', cls: 'primary grow', onClick: openSettings }]);
      return;
    }
    if (!lastInput || !lastResult) return;
    const box = $('ai-result');
    box.hidden = false;
    box.innerHTML = '<p><span class="spinner"></span> AI sedang menganalisis...</p>';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('btn-ai').disabled = true;
    const model = ls(K_MODEL) || DEFAULT_MODEL;
    try {
      const r = await fetch(API + '/models/' + encodeURIComponent(model) + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(lastInput, lastResult) }] }],
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const m = (j.error && j.error.message) || ('Error ' + r.status);
        if (r.status === 429) throw new Error('Kuota API gratis sedang habis. Coba lagi beberapa saat lagi.');
        if (r.status === 404) throw new Error('Model "' + model + '" tidak tersedia. Buka Pengaturan lalu tekan Simpan & Tes Koneksi lagi.');
        throw new Error(m);
      }
      const text = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('') || '';
      const data = parseJson(text);
      if (!data) throw new Error('Jawaban AI tidak bisa dibaca. Coba lagi.');
      renderAi(data);
    } catch (e) {
      box.innerHTML = '<p class="msg err">❌ ' + esc(e.message === 'Failed to fetch' ? 'Tidak ada koneksi internet.' : e.message) + '</p>';
    }
    $('btn-ai').disabled = false;
  }

  function renderAi(d) {
    const skor = Math.max(0, Math.min(100, Number(d.skor) || 0));
    const lvMap = { aman: 'hijau', waspada: 'kuning', berisiko: 'merah' };
    const lv = lvMap[d.level] || (skor >= 75 ? 'hijau' : skor >= 45 ? 'kuning' : 'merah');
    const color = lv === 'hijau' ? 'var(--green)' : lv === 'kuning' ? 'var(--yellow)' : 'var(--red)';
    const temuan = Array.isArray(d.temuan) ? d.temuan : [];
    const alt = Array.isArray(d.judul_alternatif) ? d.judul_alternatif : [];
    const sevOf = t => (['tinggi', 'sedang', 'rendah'].includes(t) ? t : 'rendah');
    let html = '<h2 class="ai-title">✨ Analisis AI</h2>' +
      '<div class="score-head"><div class="ring" style="--p:' + skor + ';--c:' + color + '"><span>' + skor + '</span></div>' +
      '<div><div class="level ' + lv + '">' + esc((d.level || '').toUpperCase() || '-') + '</div></div></div>' +
      '<p>' + esc(d.ringkasan || '') + '</p>';
    temuan.forEach(t => {
      html += '<div class="finding ' + sevOf(t.tingkat) + '"><div class="f-head"><span>' + esc(t.masalah) + '</span>' +
        '<span class="badge ' + sevOf(t.tingkat) + '">' + esc(sevOf(t.tingkat)) + '</span></div>' +
        '<div class="f-detail">' + esc(t.bagian || '') + '</div><div class="f-saran">💡 ' + esc(t.saran || '') + '</div></div>';
    });
    if (alt.length) {
      html += '<h3>Judul alternatif</h3><ol class="ai-alt">' +
        alt.map((a, i) => '<li>' + esc(a) + ' <button class="btn ghost small" data-alt="' + i + '" style="min-height:32px;padding:4px 10px">Pakai</button></li>').join('') + '</ol>';
    }
    if (d.tips_nilai_tambah) html += '<h3>Tips nilai tambah</h3><p class="small">' + esc(d.tips_nilai_tambah) + '</p>';
    html += '<p class="disclaimer">Analisis AI bisa keliru. Gunakan sebagai bahan pertimbangan, bukan jaminan.</p>';
    const box = $('ai-result');
    box.innerHTML = html;
    box.querySelectorAll('[data-alt]').forEach(b => b.addEventListener('click', () => {
      $('f-title').value = alt[Number(b.dataset.alt)];
      updateCounter(); saveDraft();
      toast('Judul diganti ✓');
      $('f-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  }

  // ---------- PENGATURAN ----------
  function openSettings() {
    $('api-key').value = ls(K_KEY) || '';
    $('api-model').value = ls(K_MODEL) || '';
    $('key-msg').textContent = ls(K_KEY) ? 'API key tersimpan ✓' : '';
    $('key-msg').className = 'msg' + (ls(K_KEY) ? ' good' : '');
    renderDeviceId();
    $('screen-settings').hidden = false;
  }

  // ---------- INIT ----------
  async function init() {
    if (!L.isSupported()) {
      document.body.innerHTML = '<div class="license-wrap"><div class="card"><h2>Browser tidak didukung</h2><p class="small">Buka aplikasi ini lewat link https di Google Chrome versi terbaru.</p></div></div>';
      return;
    }
    renderDeviceId();

    $('btn-copy-device').addEventListener('click', () => copy(L.getDeviceId()));
    $('btn-activate').addEventListener('click', onActivate);
    $('btn-open-settings').addEventListener('click', openSettings);
    $('btn-close-settings').addEventListener('click', () => { $('screen-settings').hidden = true; });
    $('btn-logout').addEventListener('click', onLogout);
    $('btn-save-key').addEventListener('click', onSaveKey);
    $('btn-delete-key').addEventListener('click', () => {
      ls(K_KEY, null); ls(K_MODEL, null);
      $('api-key').value = ''; $('api-model').value = '';
      $('key-msg').textContent = 'API key dihapus.'; $('key-msg').className = 'msg';
    });
    $('btn-toggle-key').addEventListener('click', () => {
      const i = $('api-key'); i.type = i.type === 'password' ? 'text' : 'password';
    });

    $('f-title').addEventListener('input', updateCounter);
    $('check-form').addEventListener('input', saveDraft);
    $('check-form').addEventListener('change', saveDraft);
    $('c-ai').addEventListener('change', () => { $('ai-sub').hidden = !$('c-ai').checked; });
    $('check-form').addEventListener('submit', (e) => {
      e.preventDefault();
      lastInput = readForm();
      if (!lastInput.title.trim() && !lastInput.desc.trim() && !lastInput.script.trim()) {
        toast('Isi judul, deskripsi, atau naskah dulu');
        return;
      }
      lastResult = window.CMRules.analyze(lastInput);
      renderResult(lastResult);
    });
    $('btn-reset').addEventListener('click', () => {
      $('check-form').reset();
      $('ai-sub').hidden = true;
      $('result').hidden = true; $('ai-result').hidden = true;
      ls(K_DRAFT, null); updateCounter();
    });
    $('btn-copy-result').addEventListener('click', () => lastResult && copy(resultText(lastResult)));
    $('btn-ai').addEventListener('click', onAi);
    $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('modal').hidden = true; });

    loadDraft();
    const ok = await L.checkSaved();
    show(ok ? 'main' : 'license');

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
