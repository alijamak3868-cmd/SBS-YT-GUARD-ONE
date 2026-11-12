/* =========================================================
   SBS YT Guard - Mesin Aturan (tanpa API, jalan di HP)
   Memberi PERKIRAAN risiko monetisasi, bukan jaminan.
   ========================================================= */
(function (root) {
  'use strict';

  // Kata kunci per kategori. Tambah/kurangi sesuai kebutuhan.
  const CATEGORIES = [
    {
      id: 'judi', label: 'Judi / judol', sev: 'tinggi', weight: 32,
      words: ['judi', 'judol', 'slot gacor', 'gacor', 'maxwin', 'togel', 'toto macau', 'casino', 'kasino',
        'taruhan', 'bandar judi', 'scatter', 'rtp live', 'situs slot', 'depo', 'deposit pulsa', 'bet88', 'slot online'],
      saran: 'Konten judi online hampir pasti tidak bisa dimonetisasi dan berisiko melanggar pedoman komunitas. Hapus semua rujukan judi/slot.'
    },
    {
      id: 'dewasa', label: 'Konten dewasa / seksual', sev: 'tinggi', weight: 32,
      words: ['bokep', 'porno', 'porn', 'sange', 'telanjang', 'bugil', 'mesum', 'nude', 'xxx', '18+', 'hot video',
        'ngewe', 'colmek', 'tante girang', 'video panas', 'adegan ranjang', 'seksi banget'],
      saran: 'Hindari kata dan thumbnail bernuansa seksual. Ini salah satu penyebab utama iklan dibatasi (ikon kuning).'
    },
    {
      id: 'narkoba', label: 'Narkoba / obat terlarang', sev: 'tinggi', weight: 26,
      words: ['narkoba', 'sabu', 'ganja', 'kokain', 'ekstasi', 'pil koplo', 'tembakau gorila', 'meth', 'weed', 'nyabu', 'pakai narkoba'],
      saran: 'Pembahasan narkoba hanya aman dalam konteks edukasi/berita yang jelas. Jangan tampilkan cara pakai atau kesan mempromosikan.'
    },
    {
      id: 'kekerasan', label: 'Kekerasan / sadis', sev: 'sedang', weight: 18,
      words: ['pembunuhan', 'dibunuh', 'mutilasi', 'sadis', 'berdarah', 'penyiksaan', 'disiksa', 'tawuran', 'begal',
        'bacok', 'dibacok', 'tembak mati', 'gore', 'teroris', 'kecelakaan maut', 'mayat', 'jasad', 'bunuh diri'],
      saran: 'Kurangi detail grafis di judul dan thumbnail. Untuk berita/edukasi, beri konteks yang jelas dan hindari visual sadis.'
    },
    {
      id: 'kasar', label: 'Kata kasar / makian', sev: 'sedang', weight: 15,
      words: ['anjing', 'anjir', 'anjay', 'bangsat', 'bajingan', 'kontol', 'memek', 'goblok', 'tolol', 'asu',
        'jancok', 'jancuk', 'kampret', 'tai', 'fuck', 'shit', 'bitch', 'ngentot', 'brengsek'],
      saran: 'Makian, terutama di judul, thumbnail, dan 30 detik pertama, bisa membuat iklan dibatasi. Sensor atau ganti katanya.'
    },
    {
      id: 'sara', label: 'SARA / ujaran kebencian', sev: 'tinggi', weight: 26,
      words: ['kafir', 'antek asing', 'ras rendah', 'usir mereka', 'agama sesat', 'kaum laknat', 'basmi'],
      saran: 'Hindari merendahkan suku, agama, ras, atau golongan. Ujaran kebencian bisa berujung teguran (strike), bukan cuma demonetisasi.'
    },
    {
      id: 'medis', label: 'Klaim kesehatan menyesatkan', sev: 'sedang', weight: 16,
      words: ['obat kanker', 'sembuh total', '100% sembuh', 'tanpa ke dokter', 'vaksin berbahaya', 'obat ampuh',
        'sembuh dalam', 'pasti sembuh', 'obat segala penyakit', 'diabetes sembuh'],
      saran: 'Klaim kesehatan harus didukung sumber medis. Hindari janji "pasti sembuh" dan sarankan konsultasi ke dokter.'
    },
    {
      id: 'uang', label: 'Janji uang / cepat kaya', sev: 'sedang', weight: 15,
      words: ['cepat kaya', 'pasti cuan', 'uang gratis', 'saldo dana gratis', 'saldo gratis', 'investasi bodong',
        'modal receh', 'auto kaya', 'money game', 'tanpa modal langsung cair', 'apk penghasil uang', 'aplikasi penghasil uang'],
      saran: 'Janji penghasilan pasti sering dianggap menyesatkan/spam. Tunjukkan bukti nyata dan hindari kata "pasti".'
    },
    {
      id: 'hakcipta', label: 'Potensi pelanggaran hak cipta', sev: 'tinggi', weight: 22,
      words: ['full movie', 'film lengkap', 'nonton film', 'full episode', 'reupload', 're-upload', 'lagu full',
        'full album', 'sub indo', 'no copyright intended', 'credit to', 'bukan milik saya', 'all rights to', 'mentahan', 'cuplikan film'],
      saran: 'Konten milik orang lain (film, lagu, klip) berisiko Content ID atau klaim hak cipta. Pakai materi sendiri atau yang berlisensi.'
    },
    {
      id: 'berulang', label: 'Indikasi konten berulang / reupload', sev: 'sedang', weight: 12,
      words: ['kompilasi', 'compilation', 'tiktok viral', 'video tiktok', 'dari tiktok', 'video viral hari ini', 'kumpulan video'],
      saran: 'Kompilasi dan reupload tanpa nilai tambah sering ditolak monetisasi. Tambahkan komentar, analisis, atau sudut pandang orisinal.'
    },
    {
      id: 'clickbait', label: 'Clickbait berlebihan', sev: 'rendah', weight: 9,
      words: ['pasti kaget', 'bikin syok', 'tidak percaya', 'dijamin', 'rahasia terbongkar', 'gak nyangka',
        'wajib tonton', 'jangan skip', 'terbongkar', 'mengejutkan', 'bikin merinding'],
      saran: 'Judul boleh menarik, tapi harus sesuai isi video. Judul yang menipu bisa dianggap spam/menyesatkan.'
    }
  ];

  const FIELD = {
    title: { label: 'Judul', mult: 1.5 },
    tags: { label: 'Tag', mult: 1.2 },
    desc: { label: 'Deskripsi', mult: 1.0 },
    script: { label: 'Naskah', mult: 0.8 }
  };

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[0]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e')
      .replace(/4|@/g, 'a').replace(/5|\$/g, 's').replace(/7/g, 't')
      .replace(/([a-z])\1{2,}/g, '$1');
  }
  // Normalisasi tanpa ganti angka (untuk kata seperti "18+", "100%", "bet88").
  function lower(text) { return String(text || '').toLowerCase(); }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function findWords(text, words) {
    const found = new Set();
    const norm = ' ' + normalize(text) + ' ';
    const raw = ' ' + lower(text) + ' ';
    for (const w of words) {
      const re = new RegExp('(^|[^a-z0-9])' + escapeRe(w) + '([^a-z0-9]|$)', 'i');
      const hasDigitOrSymbol = /[^a-z ]/.test(w);
      if (re.test(hasDigitOrSymbol ? raw : norm) || re.test(raw)) found.add(w);
    }
    return [...found];
  }

  function countEmoji(s) {
    const m = String(s || '').match(/\p{Extended_Pictographic}/gu);
    return m ? m.length : 0;
  }

  function analyze(input) {
    const data = {
      title: (input.title || '').trim(),
      desc: (input.desc || '').trim(),
      tags: (input.tags || '').trim(),
      script: (input.script || '').trim()
    };
    const chk = input.checks || {};
    const findings = [];
    let risk = 0;

    function add(f) { findings.push(f); risk += f.points; }

    // 1) Kata kunci per kategori
    for (const cat of CATEGORIES) {
      let catPoints = 0;
      const hits = [];
      for (const key of Object.keys(FIELD)) {
        const words = findWords(data[key], cat.words);
        if (words.length) {
          hits.push({ field: FIELD[key].label, words });
          catPoints += cat.weight * FIELD[key].mult * Math.min(1 + (words.length - 1) * 0.25, 1.75);
        }
      }
      if (hits.length) {
        catPoints = Math.round(Math.min(catPoints, cat.weight * 2));
        add({
          sev: cat.sev, title: cat.label, points: catPoints,
          detail: hits.map(h => h.field + ': "' + h.words.join('", "') + '"').join(' · '),
          saran: cat.saran + ' (Cek konteksnya: kata yang sama bisa aman di topik tertentu.)'
        });
      }
    }

    // 2) Struktur judul
    const t = data.title;
    if (!t) {
      add({ sev: 'rendah', title: 'Judul kosong', points: 0, detail: 'Isi judul agar bisa dicek.', saran: 'Tulis judul yang jelas dan sesuai isi video.' });
    } else {
      if (t.length > 100) add({ sev: 'sedang', title: 'Judul terlalu panjang', points: 6, detail: t.length + ' karakter (batas YouTube 100).', saran: 'Persingkat judul, maksimal 100 karakter. Idealnya 40–70 karakter.' });
      const letters = t.replace(/[^A-Za-z]/g, '');
      const caps = t.replace(/[^A-Z]/g, '').length;
      if (letters.length >= 10 && caps / letters.length > 0.6) add({ sev: 'rendah', title: 'Judul terlalu banyak huruf kapital', points: 6, detail: Math.round(caps / letters.length * 100) + '% huruf kapital.', saran: 'Pakai huruf kapital hanya untuk 1–2 kata penting.' });
      if (/[!?]{3,}/.test(t)) add({ sev: 'rendah', title: 'Tanda baca berlebihan', points: 4, detail: 'Ada "!!!" atau "???" di judul.', saran: 'Cukup satu tanda seru atau tanya.' });
      const em = countEmoji(t);
      if (em > 3) add({ sev: 'rendah', title: 'Emoji berlebihan di judul', points: 4, detail: em + ' emoji.', saran: 'Maksimal 1–2 emoji di judul.' });
    }

    // 3) Deskripsi
    const allText = data.title + ' ' + data.desc;
    const hashtags = (allText.match(/#[\p{L}\p{N}_]+/gu) || []);
    if (hashtags.length > 15) add({ sev: 'sedang', title: 'Hashtag terlalu banyak', points: 8, detail: hashtags.length + ' hashtag.', saran: 'Gunakan 3–5 hashtag yang relevan. Terlalu banyak bisa dianggap spam.' });
    if (/\b(bit\.ly|s\.id|tinyurl\.com|cutt\.ly|shorturl\.at|is\.gd)\//i.test(data.desc)) add({ sev: 'rendah', title: 'Link pemendek di deskripsi', points: 5, detail: 'Ditemukan link pemendek (bit.ly, s.id, dll).', saran: 'Pakai link asli agar tidak dicurigai spam/penipuan.' });
    if (data.desc && data.desc.length < 100) add({ sev: 'rendah', title: 'Deskripsi terlalu pendek', points: 2, detail: data.desc.length + ' karakter.', saran: 'Tulis 2–3 kalimat yang menjelaskan isi video. Membantu SEO dan kesan konten berkualitas.' });
    if (!data.desc) add({ sev: 'rendah', title: 'Deskripsi kosong', points: 3, detail: 'Belum ada deskripsi.', saran: 'Tambahkan deskripsi singkat tentang isi video.' });

    // 4) Tag
    if (data.tags) {
      const tags = data.tags.split(',').map(s => s.trim()).filter(Boolean);
      const totalChars = tags.join(',').length;
      if (totalChars > 500) add({ sev: 'sedang', title: 'Tag melebihi batas', points: 6, detail: totalChars + ' karakter (batas YouTube 500).', saran: 'Kurangi tag. Pilih 5–15 tag paling relevan.' });
      const lowerTags = tags.map(s => s.toLowerCase());
      const dup = lowerTags.length - new Set(lowerTags).size;
      if (dup > 0) add({ sev: 'rendah', title: 'Tag dobel', points: 2, detail: dup + ' tag berulang.', saran: 'Hapus tag yang sama.' });
      if (tags.length > 30) add({ sev: 'rendah', title: 'Tag terlalu banyak', points: 4, detail: tags.length + ' tag.', saran: 'Tag yang terlalu banyak tidak membantu dan bisa terlihat spam.' });
      const ctx = normalize(data.title + ' ' + data.desc + ' ' + data.script);
      const unrelated = tags.filter(tag => {
        const parts = normalize(tag).split(/[^a-z0-9]+/).filter(p => p.length > 2);
        return parts.length && !parts.some(p => ctx.includes(p));
      });
      if (tags.length >= 4 && unrelated.length / tags.length > 0.5) add({ sev: 'sedang', title: 'Banyak tag tidak relevan', points: 7, detail: 'Contoh: ' + unrelated.slice(0, 5).join(', '), saran: 'Tag yang tidak berhubungan dengan isi video melanggar aturan spam/metadata menyesatkan.' });
    }

    // 5) Daftar cek manual
    if (chk.reupload) add({ sev: 'tinggi', title: 'Video hasil reupload', points: 30, detail: 'Kamu menandai video ini diambil dari platform/orang lain.', saran: 'Reupload hampir pasti ditolak monetisasi. Buat konten sendiri atau beri nilai tambah besar (ulasan, analisis).' });
    if (chk.mirip) add({ sev: 'sedang', title: 'Format sangat mirip video lain', points: 15, detail: 'Video dibuat dari template yang sama berulang-ulang.', saran: 'Variasikan format, naskah, visual, dan narasi supaya tidak dianggap konten massal.' });
    if (chk.musik === false) add({ sev: 'tinggi', title: 'Musik belum pasti berlisensi', points: 18, detail: 'Musik tidak dari sumber bebas lisensi.', saran: 'Pakai YouTube Audio Library atau musik berlisensi untuk menghindari klaim hak cipta.' });
    if (chk.footage === false) add({ sev: 'sedang', title: 'Footage belum pasti milik sendiri', points: 14, detail: 'Ada gambar/video dari sumber lain.', saran: 'Gunakan footage sendiri, stok berlisensi (Pexels, Pixabay), atau buat dengan AI.' });
    if (chk.ai && chk.realistis) add({ sev: 'rendah', title: 'Konten AI realistis', points: 4, detail: 'Video memakai AI yang terlihat nyata.', saran: 'Saat upload, aktifkan label "konten sintetis/diubah" di YouTube Studio bila kontennya terlihat realistis.' });
    if (chk.ai && !chk.suaraSendiri && chk.mirip) add({ sev: 'sedang', title: 'Konten AI massal', points: 8, detail: 'Konten AI + format berulang.', saran: 'Tambahkan sentuhan manusia: narasi suara sendiri, opini, atau riset yang unik.' });

    risk = Math.min(100, Math.round(risk));
    const score = Math.max(0, 100 - risk);
    let level, levelText;
    if (score >= 75) { level = 'hijau'; levelText = 'Risiko Rendah'; }
    else if (score >= 45) { level = 'kuning'; levelText = 'Perlu Diperbaiki'; }
    else { level = 'merah'; levelText = 'Risiko Tinggi'; }

    const order = { tinggi: 0, sedang: 1, rendah: 2 };
    findings.sort((a, b) => order[a.sev] - order[b.sev] || b.points - a.points);

    return { score, level, levelText, findings };
  }

  const api = { analyze, CATEGORIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CMRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
