/* =========================================================
   SBS YT Guard - Sistem Lisensi Offline (1 lisensi = 1 device)
   ---------------------------------------------------------
   - Setiap HP punya Device ID unik (tersimpan di HP).
   - Lisensi = tanda tangan digital (ECDSA P-256) atas Device ID.
     Hanya pemilik PRIVATE KEY (penjual) yang bisa membuatnya.
   - Aplikasi cuma menyimpan PUBLIC KEY untuk memverifikasi.
   - Logout: lisensi dihapus, Device ID diganti baru, dan
     aplikasi memberi "Kode Logout" sebagai bukti ke penjual.
   ========================================================= */
(function () {
  'use strict';

  // Public key penjual (aman untuk dipublikasikan).
  const PUBLIC_KEY_SPKI = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE42y03YIsXLbLmbUQAmOMlhieKPMuZ/w4bp/TtpzjG7W9suIi828bZV8LPG47MwFS4ejQAlFPUZkH3ZymUvMHXQ==';
  // Garam untuk kode logout (jangan diubah setelah aplikasi dijual).
  const LOGOUT_SALT = '918b1bae500d8e22f0fd7671';

  const K_DEVICE = 'cm_device_id';
  const K_LICENSE = 'cm_license';
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function store(key, val) {
    try {
      if (val === null) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch (e) { /* storage tidak tersedia */ }
  }
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function randomCode(n) {
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    let s = '';
    for (let i = 0; i < n; i++) s += ALPHA[bytes[i] % ALPHA.length];
    return s;
  }

  function newDeviceId() {
    const r = randomCode(12);
    return 'DEV-' + r.slice(0, 4) + '-' + r.slice(4, 8) + '-' + r.slice(8, 12);
  }

  function getDeviceId() {
    let id = load(K_DEVICE);
    if (!id || !/^DEV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id)) {
      id = newDeviceId();
      store(K_DEVICE, id);
    }
    return id;
  }

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function b64urlToBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return b64ToBytes(s);
  }

  function message(deviceId) {
    return new TextEncoder().encode('CEKMONET:v1:' + deviceId);
  }

  function cleanLicense(text) {
    return String(text || '').replace(/\s+/g, '').trim();
  }

  let pubKeyPromise = null;
  function getPublicKey() {
    if (!pubKeyPromise) {
      pubKeyPromise = crypto.subtle.importKey(
        'spki', b64ToBytes(PUBLIC_KEY_SPKI),
        { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
      );
    }
    return pubKeyPromise;
  }

  async function verify(licenseText, deviceId) {
    const lic = cleanLicense(licenseText);
    if (!/^CM1-[A-Za-z0-9_-]{80,90}$/.test(lic)) return false;
    try {
      const sig = b64urlToBytes(lic.slice(4));
      if (sig.length !== 64) return false;
      const key = await getPublicKey();
      return await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' }, key, sig, message(deviceId)
      );
    } catch (e) {
      return false;
    }
  }

  async function logoutCodeFor(deviceId) {
    const data = new TextEncoder().encode('CEKMONET-LOGOUT|' + deviceId + '|' + LOGOUT_SALT);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    let s = '';
    for (let i = 0; i < 8; i++) s += ALPHA[hash[i] % ALPHA.length];
    return 'OUT-' + s.slice(0, 4) + '-' + s.slice(4, 8);
  }

  window.CMLicense = {
    getDeviceId,
    getSavedLicense: () => load(K_LICENSE),
    isSupported: () => !!(window.crypto && crypto.subtle),

    /** Cek lisensi tersimpan masih cocok dengan device ini. */
    async checkSaved() {
      const lic = load(K_LICENSE);
      if (!lic) return false;
      const ok = await verify(lic, getDeviceId());
      if (!ok) store(K_LICENSE, null);
      return ok;
    },

    /** Aktivasi: simpan lisensi kalau cocok dengan device ini. */
    async activate(licenseText) {
      const lic = cleanLicense(licenseText);
      const ok = await verify(lic, getDeviceId());
      if (ok) store(K_LICENSE, lic);
      return ok;
    },

    /** Logout: hapus lisensi, ganti Device ID, kembalikan bukti logout. */
    async logout() {
      const oldId = getDeviceId();
      const code = await logoutCodeFor(oldId);
      store(K_LICENSE, null);
      store(K_DEVICE, newDeviceId());
      return { oldDeviceId: oldId, logoutCode: code };
    }
  };
})();
