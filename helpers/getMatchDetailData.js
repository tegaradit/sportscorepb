const pool = require('../config/db');
const { getMatchState } = require('../utils/matchRuntimeManager');

async function getMatchDetailData(id) {
  console.log(`[Helper] Mengambil detail data untuk Match ID: ${id}`); // Log
  const [[match]] = await pool.query(`
    SELECT m.*, 
           t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
           t2.nama_club AS team2_name, t2.logo_club AS team2_logo,
           ec.durasi_babak, ec.jumlah_babak -- Tambahkan ini untuk durasi_babak kategori
    FROM matches m
    JOIN teams t1 ON m.team_1 = t1.id
    JOIN teams t2 ON m.team_2 = t2.id
    LEFT JOIN event_categories ec ON m.id_kategori = ec.id -- Join kategori untuk durasi
    WHERE m.id = ?
  `, [id]);

  if (!match) {
    console.log(`[Helper] Match ID ${id} tidak ditemukan.`); // Log
    throw new Error('Match tidak ditemukan');
  }

  const runtimeState = getMatchState(id);
  console.log(`[Helper] Runtime state untuk Match ID ${id}:`, runtimeState); // Log runtimeState

  const runtime = {
    waktu: runtimeState?.waktu ?? 0,
    babak: runtimeState?.babak ?? match.babak,
    status: runtimeState?.status ?? match.status
  };

  // Tambahkan durasi_babak dari kategori jika tidak ada di match
  const durasiBabakFinal = match.durasi_babak ?? match.kategori_durasi ?? 20; // Default 20 menit
  const jumlahBabakFinal = match.jumlah_babak ?? match.kategori_jumlah ?? 2; // Default 2 babak

  // ... (kode untuk lineup, staff, events tetap sama) ...

  const [lineupRows] = await pool.query(`
    SELECT ml.*, p.nama_pemain, p.foto_pemain, pe.id_team, t.nama_club
    FROM match_lineup ml
    JOIN pemain_event pe ON ml.id_pemain_event = pe.id
    JOIN pemain p ON pe.id_pemain = p.id
    JOIN teams t ON pe.id_team = t.id
    WHERE ml.id_match = ?
  `, [id]);

  const lineup = { team_1: [], team_2: [] };
  for (const row of lineupRows) {
    const pemain = {
      nama: row.nama_pemain,
      no_punggung: row.no_punggung,
      foto: row.foto_pemain,
      starting: !!row.is_starting
    };
    if (row.id_team === match.team_1) lineup.team_1.push(pemain);
    if (row.id_team === match.team_2) lineup.team_2.push(pemain);
  }

  const [staffRows] = await pool.query(`
    SELECT s.*, st.id_team
    FROM match_staff_lineup msl
    JOIN staff_event se ON msl.id_staff_event = se.id
    JOIN staff s ON se.id_staff = s.id
    WHERE msl.id_match = ?
  `, [id]);


  const staff = { team_1: [], team_2: [] };
  for (const s of staffRows) {
    const staf = {
      nama: s.nama_staff,
      role: s.jabatan || "Official",
      foto: s.foto
    };
    if (s.id_team === match.team_1) staff.team_1.push(staf);
    if (s.id_team === match.team_2) staff.team_2.push(staf);
  }

  const [eventRows] = await pool.query(`
    SELECT me.*, p.nama_pemain, pe.no_punggung, t.nama_club AS tim
    FROM match_events me
    JOIN pemain p ON me.id_pemain = p.id
    LEFT JOIN pemain_event pe ON pe.id_pemain = p.id AND pe.id_team = me.id_team AND pe.id_kategori = me.id_kategori
    JOIN teams t ON me.id_team = t.id
    WHERE me.id_match = ?
    ORDER BY me.menit ASC
  `, [id]);

  const events = eventRows.map(e => ({
    tim: e.tim,
    nama_pemain: e.nama_pemain,
    no_punggung: e.no_punggung || null,
    menit: e.menit,
    tipe: e.jenis
  }));

  return {
    id: match.id,
    id_kategori: match.id_kategori,
    waktu: runtime.waktu,
    babak: runtime.babak,
    status: runtime.status,
    skor: {
      team_1: match.skor_1,
      team_2: match.skor_2
    },
    teams: {
      team_1: {
        id: match.team_1,
        name: match.team1_name,
        logo: match.team1_logo
      },
      team_2: {
        id: match.team_2,
        name: match.team2_name,
        logo: match.team2_logo
      }
    },
    lineup,
    staff,
    events,
    durasi_babak: durasiBabakFinal, // Pastikan ini dikirim
    jumlah_babak: jumlahBabakFinal // Pastikan ini dikirim
  };
}

module.exports = {
  getMatchDetailData
};