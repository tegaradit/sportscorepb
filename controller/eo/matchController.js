const pool = require('../../config/db');
const matchController = require('./matchController'); // atau sesuai path
const { getMatchState } = require('../../utils/matchRuntimeManager');


// exports.addMatchEvent = async (req, res) => {
//   try {
//     const id_match = parseInt(req.body.id_match);
//     const {
//       id_kategori,
//       id_team,
//       id_pemain,
//       jenis,
//       menit
//     } = req.body;

//     const io = req.app.get('io');

//     const validJenis = ['GOL', 'BUNUH_DIRI', 'KUNING', 'MERAH'];
//     if (!validJenis.includes(jenis)) {
//       return res.status(400).json({ message: 'Jenis aksi tidak valid' });
//     }

//     if (isNaN(id_match)) {
//       return res.status(400).json({ message: 'id_match harus berupa angka' });
//     }

//     const menitInt = parseInt(menit);
//     if (isNaN(menitInt)) {
//       return res.status(400).json({ message: 'Menit harus berupa angka' });
//     }

//     await pool.query(`
//       INSERT INTO match_events (id_match, id_kategori, id_team, id_pemain, jenis, menit)
//       VALUES (?, ?, ?, ?, ?, ?)
//     `, [id_match, id_kategori, id_team, id_pemain, jenis, menitInt]);

//     const [[match]] = await pool.query(`SELECT * FROM matches WHERE id = ?`, [id_match]);
//     let team_1_score = match.skor_1;
//     let team_2_score = match.skor_2;

//     if (jenis === 'GOL') {
//       if (id_team === match.team_1) team_1_score++;
//       else if (id_team === match.team_2) team_2_score++;
//     } else if (jenis === 'BUNUH_DIRI') {
//       if (id_team === match.team_1) team_2_score++;
//       else if (id_team === match.team_2) team_1_score++;
//     }

//     await pool.query(`
//       UPDATE matches
//       SET skor_1 = ?, skor_2 = ?
//       WHERE id = ?
//     `, [team_1_score, team_2_score, id_match]);

//     if (jenis === 'GOL') {
//       const [cek] = await pool.query(`
//         SELECT * FROM pemain_event
//         WHERE id_pemain = ? AND id_kategori = ?
//       `, [id_pemain, id_kategori]);

//       if (cek.length > 0) {
//         await pool.query(`
//           UPDATE pemain_event
//           SET jumlah_gol = jumlah_gol + 1
//           WHERE id_pemain = ? AND id_kategori = ?
//         `, [id_pemain, id_kategori]);
//       } else {
//         const [lineup] = await pool.query(`
//           SELECT no_punggung FROM match_lineup
//           WHERE id_match = ? AND id_pemain_event IN (
//             SELECT id FROM pemain_event
//             WHERE id_pemain = ? AND id_team = ? AND id_kategori = ?
//           ) LIMIT 1
//         `, [id_match, id_pemain, id_team, id_kategori]);

//         if (lineup.length === 0) {
//           return res.status(400).json({ message: 'Gagal menemukan nomor punggung pemain' });
//         }

//         const no_punggung = lineup[0].no_punggung;

//         await pool.query(`
//           INSERT INTO pemain_event (id_pemain, id_team, id_kategori, jumlah_gol, no_punggung)
//           VALUES (?, ?, ?, 1, ?)
//         `, [id_pemain, id_team, id_kategori, no_punggung]);
//       }
//     }

//     // Emit event realtime ke client di room match
//     io.to(`match_${id_match}`).emit(`match:${id_match}:event_added`, {
//       jenis,
//       menit: menitInt,
//       id_team,
//       id_pemain,
//       skor_1: team_1_score,
//       skor_2: team_2_score
//     });

//     // Ambil ulang detail match dan emit sebagai update full
//     const runtimeState = getMatchState(id_match);
//     const [[updatedMatch]] = await pool.query(`
//       SELECT m.*, 
//              t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
//              t2.nama_club AS team2_name, t2.logo_club AS team2_logo
//       FROM matches m
//       JOIN teams t1 ON m.team_1 = t1.id
//       JOIN teams t2 ON m.team_2 = t2.id
//       WHERE m.id = ?
//     `, [id_match]);

//     const [lineupRows] = await pool.query(`
//       SELECT ml.*, p.nama_pemain, p.foto_pemain, pe.id_team, t.nama_club
//       FROM match_lineup ml
//       JOIN pemain_event pe ON ml.id_pemain_event = pe.id
//       JOIN pemain p ON pe.id_pemain = p.id
//       JOIN teams t ON pe.id_team = t.id
//       WHERE ml.id_match = ?
//     `, [id_match]);

//     const lineup = { team_1: [], team_2: [] };
//     for (const row of lineupRows) {
//       const pemain = {
//         nama: row.nama_pemain,
//         no_punggung: row.no_punggung,
//         foto: row.foto_pemain,
//         starting: !!row.is_starting
//       };
//       if (row.id_team === updatedMatch.team_1) lineup.team_1.push(pemain);
//       if (row.id_team === updatedMatch.team_2) lineup.team_2.push(pemain);
//     }

//     const [staffRows] = await pool.query(`
//       SELECT s.*, st.id_team
//       FROM staff_teams st
//       JOIN staff s ON st.id_staff = s.id
//       WHERE st.id_team IN (?, ?)
//     `, [updatedMatch.team_1, updatedMatch.team_2]);

//     const staff = { team_1: [], team_2: [] };
//     for (const s of staffRows) {
//       const staf = {
//         nama: s.nama_staff,
//         role: s.jabatan || "Official",
//         foto: s.foto
//       };
//       if (s.id_team === updatedMatch.team_1) staff.team_1.push(staf);
//       if (s.id_team === updatedMatch.team_2) staff.team_2.push(staf);
//     }

//     const [eventRows] = await pool.query(`
//       SELECT me.*, p.nama_pemain, pe.no_punggung, t.nama_club AS tim
//       FROM match_events me
//       JOIN pemain p ON me.id_pemain = p.id
//       LEFT JOIN pemain_event pe ON pe.id_pemain = p.id AND pe.id_team = me.id_team AND pe.id_kategori = me.id_kategori
//       JOIN teams t ON me.id_team = t.id
//       WHERE me.id_match = ?
//       ORDER BY me.menit ASC
//     `, [id_match]);

//     const events = eventRows.map(e => ({
//       tim: e.tim,
//       nama_pemain: e.nama_pemain,
//       no_punggung: e.no_punggung || null,
//       menit: e.menit,
//       tipe: e.jenis
//     }));

//     io.to(`match_${id_match}`).emit(`match:${id_match}:detail_updated`, {
//       id: updatedMatch.id,
//       id_kategori: updatedMatch.id_kategori,
//       waktu: runtimeState?.waktu ?? 0,
//       babak: runtimeState?.babak ?? updatedMatch.babak,
//       status: runtimeState?.status ?? updatedMatch.status,
//       skor: {
//         team_1: updatedMatch.skor_1,
//         team_2: updatedMatch.skor_2
//       },
//       teams: {
//         team_1: {
//           id: updatedMatch.team_1,
//           name: updatedMatch.team1_name,
//           logo: updatedMatch.team1_logo
//         },
//         team_2: {
//           id: updatedMatch.team_2,
//           name: updatedMatch.team2_name,
//           logo: updatedMatch.team2_logo
//         }
//       },
//       lineup,
//       staff,
//       events
//     });

//     res.status(201).json({ message: 'Aksi berhasil disimpan dan skor diperbarui' });

//   } catch (error) {
//     console.error('❌ Error addMatchEvent:', error);
//     res.status(500).json({ message: 'Gagal menyimpan aksi pertandingan' });
//   }
// };









exports.createManualMatch = async (req, res) => {
  try {
    const {
      id_kategori,
      grup,
      match_day,
      waktu,
      team_1,
      team_2
    } = req.body;

    if (!id_kategori || !grup || !match_day || !waktu || !team_1 || !team_2) {
      return res.status(400).json({ message: 'Semua data wajib diisi' });
    }

    if (team_1 === team_2) {
      return res.status(400).json({ message: 'Team 1 dan Team 2 tidak boleh sama' });
    }

    const waktuFull = `${match_day} ${waktu}`;

    const [conflict] = await pool.query(`
      SELECT * FROM matches
      WHERE waktu = ?
      AND (team_1 = ? OR team_2 = ? OR team_1 = ? OR team_2 = ?)
    `, [waktuFull, team_1, team_1, team_2, team_2]);

    if (conflict.length > 0) {
      return res.status(400).json({ message: 'Salah satu tim sudah bermain di waktu itu' });
    }

    const [insert] = await pool.query(`
      INSERT INTO matches (
        id_kategori, waktu, team_1, team_2, grup, status, skor_1, skor_2, adu_pinalti
      ) VALUES (?, ?, ?, ?, ?, 'belum_main', 0, 0, 0)
    `, [id_kategori, waktuFull, team_1, team_2, grup]);

    res.status(201).json({
      message: 'Pertandingan berhasil dibuat',
      id: insert.insertId
    });

  } catch (error) {
    console.error('❌ Error createManualMatch:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat input manual match' });
  }
};



exports.generateMatchGrup = async (req, res) => {
  try {
    const { id_kategori, grup, match_day_start, jam_awal = '13:00:00', jeda_menit = 90 } = req.body;

    if (!id_kategori || !grup || !match_day_start) {
      return res.status(400).json({ message: 'id_kategori, grup, dan match_day_start wajib diisi' });
    }

    // Ambil semua tim di grup dan kategori ini
    const [teams] = await pool.query(`
      SELECT DISTINCT t.id FROM team_event te
      JOIN teams t ON te.id_team = t.id
      WHERE te.id_kategori = ? AND te.grup = ?
    `, [id_kategori, grup]);

    if (teams.length < 2) {
      return res.status(400).json({ message: 'Tim dalam grup kurang dari 2' });
    }

    // Generate semua kombinasi pertandingan (round robin)
    const matches = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          team_1: teams[i].id,
          team_2: teams[j].id
        });
      }
    }

    // Simpan pertandingan dengan waktu terjadwal otomatis
    const insertedMatches = [];
    const startDate = new Date(match_day_start);
    let currentTime = new Date(`${match_day_start}T${jam_awal}`);

    for (const match of matches) {
      const match_day = startDate.toISOString().split('T')[0];
      const waktu = currentTime.toTimeString().split(' ')[0];

      const [insert] = await pool.query(`
        INSERT INTO match (
          id_kategori, match_day, waktu, team_1, team_2, grup, status, skor_1, skor_2, adu_pinalti
        ) VALUES (?, ?, ?, ?, ?, ?, 'belum_main', 0, 0, 0)
      `, [id_kategori, match_day, waktu, match.team_1, match.team_2, grup]);

      insertedMatches.push(insert.insertId);

      // Tambah waktu untuk match berikutnya
      currentTime.setMinutes(currentTime.getMinutes() + jeda_menit);
    }

    res.status(201).json({
      message: 'Match grup berhasil digenerate',
      total: insertedMatches.length,
      match_ids: insertedMatches
    });

  } catch (error) {
    console.error('❌ Error generateMatchGrup:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat generate match grup' });
  }
};

exports.generateFullFinalFour = async (req, res) => {
  try {
    const { id_kategori, match_day_start = null, jam_awal = '13:00:00', jeda_menit = 90 } = req.body;

    const [[kategori]] = await pool.query(`
      SELECT model_klasemen, tipe_result, tipe_final FROM event_categories WHERE id = ?
    `, [id_kategori]);

    if (!kategori || kategori.tipe_result !== 'grub' || kategori.tipe_final !== 'final_four') {
      return res.status(400).json({ message: 'Kategori ini tidak pakai grub + final_four' });
    }

    const viewName = kategori.model_klasemen === 'head_to_head'
      ? 'klasemen_headtohead_view'
      : 'klasemen_default_view';

    const [klasemenRows] = await pool.query(`
      SELECT * FROM ${viewName}
      WHERE id_kategori = ?
      ORDER BY grup, ranking
    `, [id_kategori]);

    const grupMap = {};
    for (const row of klasemenRows) {
      if (!grupMap[row.grup]) grupMap[row.grup] = [];
      grupMap[row.grup].push(row);
    }

    const juara = [], runner = [];
    for (const grup in grupMap) {
      if (grupMap[grup][0]) juara.push(grupMap[grup][0]);
      if (grupMap[grup][1]) runner.push(grupMap[grup][1]);
    }

    let semifinalis = [];
    if (juara.length === 4) {
      semifinalis = juara;
    } else if (juara.length === 3 && runner.length >= 1) {
      const terbaik = runner.sort((a, b) =>
        b.point - a.point ||
        b.selisih - a.selisih ||
        b.goal_masuk - a.goal_masuk
      )[0];
      semifinalis = [...juara, terbaik];
    } else if (juara.length === 2 && runner.length === 2) {
      semifinalis = [...juara, ...runner];
    } else {
      return res.status(400).json({ message: 'Jumlah grup tidak valid untuk final four' });
    }

    semifinalis.sort((a, b) =>
      b.point - a.point ||
      b.selisih - a.selisih ||
      b.goal_masuk - a.goal_masuk ||
      a.kartu_kuning - b.kartu_kuning ||
      a.kartu_merah - b.kartu_merah
    );

    const pairing = [
      { kode: 'A1', team_1: semifinalis[0].id_team, team_2: semifinalis[3].id_team },
      { kode: 'A2', team_1: semifinalis[1].id_team, team_2: semifinalis[2].id_team }
    ];

    const tanggal = match_day_start ? new Date(match_day_start) : new Date();
    let waktu = new Date(`${tanggal.toISOString().split('T')[0]}T${jam_awal}`);
    const matchIds = [];

    for (const p of pairing) {
      const [match] = await pool.query(`
        INSERT INTO matches (
          id_kategori, match_day, waktu, team_1, team_2, grup, status,
          skor_1, skor_2, adu_pinalti
        ) VALUES (?, ?, ?, ?, ?, 'semifinal', 'belum_main', 0, 0, 0)
      `, [
        id_kategori,
        waktu.toISOString().split('T')[0],
        waktu.toTimeString().split(' ')[0],
        p.team_1,
        p.team_2
      ]);

      await pool.query(`
        INSERT INTO brackets (id_kategori, round, kode, team_1, team_2, match_id)
        VALUES (?, 'semifinal', ?, ?, ?, ?)
      `, [id_kategori, p.kode, p.team_1, p.team_2, match.insertId]);

      matchIds.push(match.insertId);
      waktu.setMinutes(waktu.getMinutes() + jeda_menit);
    }

    await pool.query(`
      INSERT INTO brackets (id_kategori, round, kode) VALUES (?, 'final', 'F1')
    `, [id_kategori]);

    await pool.query(`
      INSERT INTO brackets (id_kategori, round, kode) VALUES (?, 'juara_3', 'J3')
    `, [id_kategori]);

    res.status(201).json({
      message: 'Final four berhasil digenerate otomatis',
      semifinal_match_ids: matchIds
    });

  } catch (err) {
    console.error('❌ Error generateFullFinalFour:', err);
    res.status(500).json({ message: 'Terjadi kesalahan saat generate final four' });
  }
};

exports.advanceFinalFour = async (req, res) => {
  try {
    const { id_kategori, match_day, jam_final = '16:00:00', jeda_menit = 90 } = req.body;

    // Ambil 2 semifinal yang sudah selesai
    const [semis] = await pool.query(`
      SELECT b.*, m.skor_1, m.skor_2, m.adu_pinalti, m.pinalti_1, m.pinalti_2
      FROM brackets b
      JOIN matches m ON b.match_id = m.id
      WHERE b.id_kategori = ? AND b.round = 'semifinal' AND m.status = 'selesai'
      ORDER BY b.kode
    `, [id_kategori]);

    if (semis.length < 2) {
      return res.status(400).json({ message: 'Semifinal belum lengkap atau belum selesai' });
    }

    const hasil = semis.map(s => {
      const skor1 = s.skor_1;
      const skor2 = s.skor_2;
      let pemenang, kalah;

      if (skor1 > skor2) {
        pemenang = s.team_1;
        kalah = s.team_2;
      } else if (skor2 > skor1) {
        pemenang = s.team_2;
        kalah = s.team_1;
      } else {
        // Jika seri, cek adu penalti
        const p1 = s.pinalti_1 ?? 0;
        const p2 = s.pinalti_2 ?? 0;
        pemenang = p1 > p2 ? s.team_1 : s.team_2;
        kalah = p1 > p2 ? s.team_2 : s.team_1;
      }

      return { pemenang, kalah };
    });

    const [fBracket] = await pool.query(`SELECT id FROM brackets WHERE id_kategori = ? AND round = 'final' LIMIT 1`, [id_kategori]);
    const [j3Bracket] = await pool.query(`SELECT id FROM brackets WHERE id_kategori = ? AND round = 'juara_3' LIMIT 1`, [id_kategori]);

    if (!fBracket.length || !j3Bracket.length) {
      return res.status(400).json({ message: 'Bracket final atau juara_3 belum tersedia' });
    }

    const finalTeam1 = hasil[0].pemenang;
    const finalTeam2 = hasil[1].pemenang;
    const j3Team1 = hasil[0].kalah;
    const j3Team2 = hasil[1].kalah;

    // Buat final
    const [finalMatch] = await pool.query(`
      INSERT INTO matches (
        id_kategori, match_day, waktu, team_1, team_2, grup, status,
        skor_1, skor_2, adu_pinalti
      ) VALUES (?, ?, ?, ?, ?, 'final', 'belum_main', 0, 0, 0)
    `, [id_kategori, match_day, jam_final, finalTeam1, finalTeam2]);

    await pool.query(`
      UPDATE brackets SET team_1 = ?, team_2 = ?, match_id = ? WHERE id = ?
    `, [finalTeam1, finalTeam2, finalMatch.insertId, fBracket[0].id]);

    // Buat juara 3
    const jam_j3 = new Date(`${match_day}T${jam_final}`);
    jam_j3.setMinutes(jam_j3.getMinutes() + jeda_menit);
    const waktu_j3 = jam_j3.toTimeString().split(' ')[0];

    const [j3Match] = await pool.query(`
      INSERT INTO matches (
        id_kategori, match_day, waktu, team_1, team_2, grup, status,
        skor_1, skor_2, adu_pinalti
      ) VALUES (?, ?, ?, ?, ?, 'juara_3', 'belum_main', 0, 0, 0)
    `, [id_kategori, match_day, waktu_j3, j3Team1, j3Team2]);

    await pool.query(`
      UPDATE brackets SET team_1 = ?, team_2 = ?, match_id = ? WHERE id = ?
    `, [j3Team1, j3Team2, j3Match.insertId, j3Bracket[0].id]);

    res.status(201).json({
      message: 'Final dan perebutan juara 3 berhasil digenerate otomatis',
      final_match_id: finalMatch.insertId,
      juara_3_match_id: j3Match.insertId
    });

  } catch (error) {
    console.error('❌ Error advanceFinalFour:', error);
    res.status(500).json({ message: 'Gagal membuat match final dan juara 3' });
  }
};

exports.updateBracketWinner = async (req, res) => {
  try {
    const { match_id } = req.body;

    // 1. Ambil data pertandingan
    const [[match]] = await pool.query(`
      SELECT * FROM matches WHERE id = ? AND status = 'selesai'
    `, [match_id]);

    if (!match) {
      return res.status(404).json({ message: 'Match belum selesai atau tidak ditemukan' });
    }

    let pemenang;

    if (match.skor_1 > match.skor_2) {
      pemenang = match.team_1;
    } else if (match.skor_2 > match.skor_1) {
      pemenang = match.team_2;
    } else if (match.adu_pinalti) {
      const p1 = match.pinalti_1 ?? 0;
      const p2 = match.pinalti_2 ?? 0;
      pemenang = p1 > p2 ? match.team_1 : match.team_2;
    } else {
      return res.status(400).json({ message: 'Match seri dan tidak ada adu pinalti' });
    }

    // 2. Update pemenang di brackets
    const [update] = await pool.query(`
      UPDATE brackets
      SET pemenang = ?
      WHERE match_id = ?
    `, [pemenang, match_id]);

    if (update.affectedRows === 0) {
      return res.status(404).json({ message: 'Bracket tidak ditemukan untuk match ini' });
    }

    res.status(200).json({ message: 'Pemenang berhasil diupdate di bracket', pemenang });

  } catch (error) {
    console.error('❌ Error updateBracketWinner:', error);
    res.status(500).json({ message: 'Gagal update pemenang bracket' });
  }
};

exports.getHasilJuara = async (req, res) => {
  try {
    const { id_kategori } = req.params;

    // Ambil pemenang final
    const [[final]] = await pool.query(`
      SELECT b.pemenang, t.nama_club AS nama_juara
      FROM brackets b
      LEFT JOIN teams t ON b.pemenang = t.id
      WHERE b.id_kategori = ? AND b.round = 'final'
      LIMIT 1
    `, [id_kategori]);

    // Ambil pemenang juara 3
    const [[juara3]] = await pool.query(`
      SELECT b.pemenang, t.nama_club AS nama_juara_3
      FROM brackets b
      LEFT JOIN teams t ON b.pemenang = t.id
      WHERE b.id_kategori = ? AND b.round = 'juara_3'
      LIMIT 1
    `, [id_kategori]);

    if (!final?.pemenang || !juara3?.pemenang) {
      return res.status(404).json({ message: 'Final atau perebutan juara 3 belum selesai' });
    }

    res.json({
      juara_1: {
        id: final.pemenang,
        nama: final.nama_juara
      },
      juara_3: {
        id: juara3.pemenang,
        nama: juara3.nama_juara_3
      }
    });

  } catch (err) {
    console.error('❌ Error getHasilJuara:', err);
    res.status(500).json({ message: 'Gagal mengambil hasil juara' });
  }
};


exports.manualCreateBracket = async (req, res) => {
  try {
    const {
      id_kategori,
      team_1,
      team_2,
      match_day, // opsional
      waktu,     // opsional
      kode       // opsional — disimpan ke tabel brackets
    } = req.body;

    // Validasi dasar
    if (!id_kategori || !team_1 || !team_2) {
      return res.status(400).json({ message: 'id_kategori dan team wajib diisi' });
    }

    if (team_1 === team_2) {
      return res.status(400).json({ message: 'Team 1 dan Team 2 tidak boleh sama' });
    }

    // Gabungkan waktu jika tersedia
    const waktu_full = (match_day && waktu)
      ? `${match_day} ${waktu}` // format DATETIME
      : null;

    // 1️⃣ Buat match terlebih dahulu
    const [matchInsert] = await pool.query(`
      INSERT INTO matches (
        id_kategori, team_1, team_2, waktu, status, skor_1, skor_2, adu_pinalti
      ) VALUES (?, ?, ?, ?, 'belum_main', 0, 0, 0)
    `, [id_kategori, team_1, team_2, waktu_full]);

    const match_id = matchInsert.insertId;

    // 2️⃣ Buat bracket dan sambungkan ke match_id
    const [bracketInsert] = await pool.query(`
      INSERT INTO brackets (
        id_kategori, team_1, team_2, waktu, status, skor_1, skor_2, adu_pinalti, match_id, kode
      ) VALUES (?, ?, ?, ?, 'belum_main', 0, 0, 0, ?, ?)
    `, [id_kategori, team_1, team_2, waktu_full, match_id, kode]);

    // ✅ Kirim response sukses
    res.status(201).json({
      message: 'Bracket dan Match berhasil dibuat',
      match_id,
      bracket_id: bracketInsert.insertId
    });

  } catch (error) {
    console.error('❌ Error manualCreateBracket:', error);
    res.status(500).json({ message: 'Gagal membuat bracket manual' });
  }
};




// exports.startBabak = async (req, res) => {
//   const { matchId, babak } = req.body;

//   try {
//     // Update babak dan status pertandingan di database
//     await pool.query(
//       `UPDATE matches SET babak = ?, status = 'sedang_main' WHERE id = ?`,
//       [babak, matchId]
//     );

//     // Emit ke room khusus pertandingan ini
//     const io = req.app.get('io');
//     const room = `match-${matchId}`;
//     io.to(room).emit('start_babak', { matchId, babak });

//     res.status(200).json({ message: 'Babak dimulai', matchId, babak });
//   } catch (error) {
//     console.error('❌ Error startBabak:', error);
//     res.status(500).json({ message: 'Gagal memulai babak' });
//   }
// };



exports.addMatchEvent = async (req, res) => {
  try {
    const id_match = parseInt(req.body.id_match);
    const {
      id_kategori,
      id_team,
      id_pemain,
      jenis,
      menit
    } = req.body;

    const io = req.app.get('io');

    const validJenis = ['GOL', 'BUNUH_DIRI', 'KUNING', 'MERAH'];
    if (!validJenis.includes(jenis)) {
      return res.status(400).json({ message: 'Jenis aksi tidak valid' });
    }

    if (isNaN(id_match)) {
      return res.status(400).json({ message: 'id_match harus berupa angka' });
    }

    const menitInt = parseInt(menit);
    if (isNaN(menitInt)) {
      return res.status(400).json({ message: 'Menit harus berupa angka' });
    }

    await pool.query(`
      INSERT INTO match_events (id_match, id_kategori, id_team, id_pemain, jenis, menit)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id_match, id_kategori, id_team, id_pemain, jenis, menitInt]);

    const [[match]] = await pool.query(`SELECT * FROM matches WHERE id = ?`, [id_match]);
    let team_1_score = match.skor_1;
    let team_2_score = match.skor_2;

    if (jenis === 'GOL') {
      if (id_team === match.team_1) team_1_score++;
      else if (id_team === match.team_2) team_2_score++;
    } else if (jenis === 'BUNUH_DIRI') {
      if (id_team === match.team_1) team_2_score++;
      else if (id_team === match.team_2) team_1_score++;
    }

    await pool.query(`
      UPDATE matches
      SET skor_1 = ?, skor_2 = ?
      WHERE id = ?
    `, [team_1_score, team_2_score, id_match]);

    if (jenis === 'GOL') {
      const [cek] = await pool.query(`
        SELECT * FROM pemain_event
        WHERE id_pemain = ? AND id_kategori = ?
      `, [id_pemain, id_kategori]);

      if (cek.length > 0) {
        await pool.query(`
          UPDATE pemain_event
          SET jumlah_gol = jumlah_gol + 1
          WHERE id_pemain = ? AND id_kategori = ?
        `, [id_pemain, id_kategori]);
      } else {
        const [lineup] = await pool.query(`
          SELECT no_punggung FROM match_lineup
          WHERE id_match = ? AND id_pemain_event IN (
            SELECT id FROM pemain_event
            WHERE id_pemain = ? AND id_team = ? AND id_kategori = ?
          ) LIMIT 1
        `, [id_match, id_pemain, id_team, id_kategori]);

        if (lineup.length === 0) {
          return res.status(400).json({ message: 'Gagal menemukan nomor punggung pemain' });
        }

        const no_punggung = lineup[0].no_punggung;

        await pool.query(`
          INSERT INTO pemain_event (id_pemain, id_team, id_kategori, jumlah_gol, no_punggung)
          VALUES (?, ?, ?, 1, ?)
        `, [id_pemain, id_team, id_kategori, no_punggung]);
      }
    }

    // Emit event realtime ke client di room match
    io.to(`match_${id_match}`).emit(`match:${id_match}:event_added`, {
      jenis,
      menit: menitInt,
      id_team,
      id_pemain,
      skor_1: team_1_score,
      skor_2: team_2_score
    });

    // Ambil ulang detail match dan emit sebagai update full
    const runtimeState = getMatchState(id_match);
    const [[updatedMatch]] = await pool.query(`
      SELECT m.*, 
             t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
             t2.nama_club AS team2_name, t2.logo_club AS team2_logo
      FROM matches m
      JOIN teams t1 ON m.team_1 = t1.id
      JOIN teams t2 ON m.team_2 = t2.id
      WHERE m.id = ?
    `, [id_match]);

    const [lineupRows] = await pool.query(`
      SELECT ml.*, p.nama_pemain, p.foto_pemain, pe.id_team, t.nama_club
      FROM match_lineup ml
      JOIN pemain_event pe ON ml.id_pemain_event = pe.id
      JOIN pemain p ON pe.id_pemain = p.id
      JOIN teams t ON pe.id_team = t.id
      WHERE ml.id_match = ?
    `, [id_match]);

    const lineup = { team_1: [], team_2: [] };
    for (const row of lineupRows) {
      const pemain = {
        nama: row.nama_pemain,
        no_punggung: row.no_punggung,
        foto: row.foto_pemain,
        starting: !!row.is_starting
      };
      if (row.id_team === updatedMatch.team_1) lineup.team_1.push(pemain);
      if (row.id_team === updatedMatch.team_2) lineup.team_2.push(pemain);
    }

    const [staffRows] = await pool.query(`
      SELECT s.*, st.id_team
      FROM staff_teams st
      JOIN staff s ON st.id_staff = s.id
      WHERE st.id_team IN (?, ?)
    `, [updatedMatch.team_1, updatedMatch.team_2]);

    const staff = { team_1: [], team_2: [] };
    for (const s of staffRows) {
      const staf = {
        nama: s.nama_staff,
        role: s.jabatan || "Official",
        foto: s.foto
      };
      if (s.id_team === updatedMatch.team_1) staff.team_1.push(staf);
      if (s.id_team === updatedMatch.team_2) staff.team_2.push(staf);
    }

    const [eventRows] = await pool.query(`
      SELECT me.*, p.nama_pemain, pe.no_punggung, t.nama_club AS tim
      FROM match_events me
      JOIN pemain p ON me.id_pemain = p.id
      LEFT JOIN pemain_event pe ON pe.id_pemain = p.id AND pe.id_team = me.id_team AND pe.id_kategori = me.id_kategori
      JOIN teams t ON me.id_team = t.id
      WHERE me.id_match = ?
      ORDER BY me.menit ASC
    `, [id_match]);

    const events = eventRows.map(e => ({
      tim: e.tim,
      nama_pemain: e.nama_pemain,
      no_punggung: e.no_punggung || null,
      menit: e.menit,
      tipe: e.jenis
    }));

    io.to(`match_${id_match}`).emit(`match:${id_match}:detail_updated`, {
      id: updatedMatch.id,
      id_kategori: updatedMatch.id_kategori,
      waktu: runtimeState?.waktu ?? 0,
      babak: runtimeState?.babak ?? updatedMatch.babak,
      status: runtimeState?.status ?? updatedMatch.status,
      skor: {
        team_1: updatedMatch.skor_1,
        team_2: updatedMatch.skor_2
      },
      teams: {
        team_1: {
          id: updatedMatch.team_1,
          name: updatedMatch.team1_name,
          logo: updatedMatch.team1_logo
        },
        team_2: {
          id: updatedMatch.team_2,
          name: updatedMatch.team2_name,
          logo: updatedMatch.team2_logo
        }
      },
      lineup,
      staff,
      events
    });

    res.status(201).json({ message: 'Aksi berhasil disimpan dan skor diperbarui' });

  } catch (error) {
    console.error('❌ Error addMatchEvent:', error);
    res.status(500).json({ message: 'Gagal menyimpan aksi pertandingan' });
  }
};





exports.updateKlasemenFromMatch = async (req, res) => {
  try {
    const { match_id } = req.body;

    const [[match]] = await pool.query(`SELECT * FROM matches WHERE id = ? AND status = 'selesai'`, [match_id]);
    if (!match) return res.status(404).json({ message: 'Match belum selesai atau tidak ditemukan' });

    const team1 = match.team_1;
    const team2 = match.team_2;
    const skor1 = match.skor_1;
    const skor2 = match.skor_2;
    const id_kategori = match.id_kategori;

    const updateTeam = async (id_team, isTeam1) => {
      const isMenang = (isTeam1 && skor1 > skor2) || (!isTeam1 && skor2 > skor1);
      const isSeri = skor1 === skor2;
      const isKalah = !isMenang && !isSeri;
      const goal_masuk = isTeam1 ? skor1 : skor2;
      const goal_kebobolan = isTeam1 ? skor2 : skor1;
      const poin = isMenang ? 3 : isSeri ? 1 : 0;

      const [cek] = await pool.query(`
        SELECT * FROM klasemen WHERE id_kategori = ? AND id_team = ?
      `, [id_kategori, id_team]);

      if (cek.length > 0) {
        await pool.query(`
          UPDATE klasemen
          SET main = main + 1,
              menang = menang + ?,
              seri = seri + ?,
              kalah = kalah + ?,
              point = point + ?,
              goal_masuk = goal_masuk + ?,
              goal_kebobolan = goal_kebobolan + ?
          WHERE id_kategori = ? AND id_team = ?
        `, [
          isMenang ? 1 : 0,
          isSeri ? 1 : 0,
          isKalah ? 1 : 0,
          poin,
          goal_masuk,
          goal_kebobolan,
          id_kategori,
          id_team
        ]);
      } else {
        await pool.query(`
          INSERT INTO klasemen (id_kategori, id_team, main, menang, seri, kalah, point, goal_masuk, goal_kebobolan)
          VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
        `, [
          id_kategori,
          id_team,
          isMenang ? 1 : 0,
          isSeri ? 1 : 0,
          isKalah ? 1 : 0,
          poin,
          goal_masuk,
          goal_kebobolan
        ]);
      }
    };

    await updateTeam(team1, true);
    await updateTeam(team2, false);

    res.json({ message: 'Klasemen berhasil diperbarui dari hasil match' });

  } catch (err) {
    console.error('❌ Error updateKlasemenFromMatch:', err);
    res.status(500).json({ message: 'Gagal update klasemen' });
  }
};

exports.getKlasemenByKategori = async (req, res) => {
  const { id_kategori } = req.body;

  const [[kategori]] = await pool.query(`
    SELECT model_klasemen FROM event_categories WHERE id = ?
  `, [id_kategori]);

  const viewName = kategori.model_klasemen === 'head_to_head'
    ? 'klasemen_headtohead_view'
    : 'klasemen_default_view';

  const [rows] = await pool.query(`
    SELECT * FROM ${viewName}
    WHERE id_kategori = ?
    ORDER BY grup, ranking
  `, [id_kategori]);

  res.json(rows);
};

exports.selesaiMatch = async (req, res) => {
  const { match_id } = req.body;

  if (!match_id) return res.status(400).json({ message: 'match_id wajib diisi' });

  try {
    const [cek] = await pool.query(`SELECT * FROM matches WHERE id = ?`, [match_id]);
    if (cek.length === 0) {
      return res.status(404).json({ message: 'Match tidak ditemukan' });
    }

    await pool.query(`UPDATE matches SET status = 'selesai' WHERE id = ?`, [match_id]);

    res.json({ message: 'Match berhasil diselesaikan' });
  } catch (err) {
    console.error('❌ Error selesaiMatch:', err);
    res.status(500).json({ message: 'Gagal menyelesaikan match' });
  }
};

exports.selesaikanMatchDanUpdateKlasemen = async (req, res) => {
  const { match_id } = req.body;

  if (!match_id) {
    return res.status(400).json({ message: 'match_id wajib diisi' });
  }

  try {
    const [[match]] = await pool.query(`SELECT * FROM matches WHERE id = ?`, [match_id]);
    if (!match) return res.status(404).json({ message: 'Match tidak ditemukan' });

    await pool.query(`UPDATE matches SET status = 'selesai' WHERE id = ?`, [match_id]);

    const team1 = match.team_1;
    const team2 = match.team_2;
    const skor1 = match.skor_1;
    const skor2 = match.skor_2;
    const id_kategori = match.id_kategori;

    const updateTeam = async (id_team, isTeam1) => {
      const isMenang = (isTeam1 && skor1 > skor2) || (!isTeam1 && skor2 > skor1);
      const isSeri = skor1 === skor2;
      const goal_masuk = isTeam1 ? skor1 : skor2;
      const goal_kebobolan = isTeam1 ? skor2 : skor1;
      const poin = isMenang ? 3 : isSeri ? 1 : 0;

      const [cek] = await pool.query(`
        SELECT * FROM klasemen WHERE id_kategori = ? AND id_team = ?
      `, [id_kategori, id_team]);

      if (cek.length > 0) {
        await pool.query(`
          UPDATE klasemen
          SET main = main + 1,
              menang = menang + ?,
              seri = seri + ?,
              kalah = kalah + ?,
              point = point + ?,
              goal_masuk = goal_masuk + ?,
              goal_kebobolan = goal_kebobolan + ?
          WHERE id_kategori = ? AND id_team = ?
        `, [
          isMenang ? 1 : 0,
          isSeri ? 1 : 0,
          !isMenang && !isSeri ? 1 : 0,
          poin,
          goal_masuk,
          goal_kebobolan,
          id_kategori,
          id_team
        ]);
      } else {
        await pool.query(`
          INSERT INTO klasemen (id_kategori, id_team, main, menang, seri, kalah, point, goal_masuk, goal_kebobolan)
          VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)
        `, [
          id_kategori,
          id_team,
          isMenang ? 1 : 0,
          isSeri ? 1 : 0,
          !isMenang && !isSeri ? 1 : 0,
          poin,
          goal_masuk,
          goal_kebobolan
        ]);
      }
    };

    await updateTeam(team1, true);
    await updateTeam(team2, false);

    // 🔁 Tambahan: update jumlah gol pemain dari match_events
    const [events] = await pool.query(`
      SELECT id_pemain, id_team, COUNT(*) AS total
      FROM match_events
      WHERE id_match = ? AND jenis = 'GOL'
      GROUP BY id_pemain, id_team
    `, [match_id]);

    for (const e of events) {
      await pool.query(`
        UPDATE pemain_event
        SET jumlah_gol = jumlah_gol + ?
        WHERE id_pemain = ? AND id_team = ? AND id_kategori = ?
      `, [e.total, e.id_pemain, e.id_team, id_kategori]);
    }

    res.json({ message: 'Match diselesaikan dan klasemen & top skor diperbarui' });

  } catch (err) {
    console.error('❌ Error selesaikanMatchDanUpdateKlasemen:', err);
    res.status(500).json({ message: 'Gagal menyelesaikan match & update klasemen' });
  }
};


exports.getMatchesByKategori = async (req, res) => {
  const id_kategori = req.query.id_kategori || req.query.kategori;
  const id_event = req.query.id_event || req.query.event;

  try {
    let kategoriIds = [];

    if (id_kategori) {
      kategoriIds = [id_kategori];
    } else if (id_event) {
      const [kategoriRows] = await pool.query(
        `SELECT id FROM event_categories WHERE id_event = ?`,
        [id_event]
      );
      kategoriIds = kategoriRows.map(k => k.id);
    } else {
      return res.status(400).json({ message: 'id_event atau id_kategori harus disertakan' });
    }

    if (kategoriIds.length === 0) {
      return res.status(404).json({ message: 'Kategori tidak ditemukan' });
    }

    // Ambil match grup
    const [matchGrup] = await pool.query(`
      SELECT 
        m.id AS match_id,
        m.*, 
        t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
        t2.nama_club AS team2_name, t2.logo_club AS team2_logo
      FROM matches m
      JOIN teams t1 ON m.team_1 = t1.id
      JOIN teams t2 ON m.team_2 = t2.id
      WHERE m.id_kategori IN (?)
      ORDER BY m.waktu
    `, [kategoriIds]);

    // Ambil match bracket
    const [matchBracket] = await pool.query(`
      SELECT 
        b.id AS bracket_id,
        b.match_id,
        b.team_1, b.team_2,
        b.skor_1, b.skor_2,
        b.kode, b.waktu,
        b.status,
        t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
        t2.nama_club AS team2_name, t2.logo_club AS team2_logo,
        t3.nama_club AS pemenang_name
      FROM brackets b
      LEFT JOIN teams t1 ON b.team_1 = t1.id
      LEFT JOIN teams t2 ON b.team_2 = t2.id
      LEFT JOIN teams t3 ON b.pemenang = t3.id
      WHERE b.id_kategori IN (?)
      ORDER BY b.waktu
    `, [kategoriIds]);

    res.status(200).json({
      grup: matchGrup,
      bracket: matchBracket
    });

  } catch (error) {
    console.error("❌ Error getMatchesByKategori:", error);
    res.status(500).json({ message: "Gagal mengambil data pertandingan" });
  }
};






exports.getMatchDetail = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Ambil info match
    const [matchRows] = await pool.query(`
      SELECT m.*, 
             t1.nama_club AS team1_name, t1.logo_club AS team1_logo,
             t2.nama_club AS team2_name, t2.logo_club AS team2_logo
      FROM matches m
      JOIN teams t1 ON m.team_1 = t1.id
      JOIN teams t2 ON m.team_2 = t2.id
      WHERE m.id = ?
    `, [id]);

    if (matchRows.length === 0) {
      return res.status(404).json({ message: 'Match tidak ditemukan' });
    }

    const match = matchRows[0];

    const runtimeState = getMatchState(id);
    const runtime = {
      waktu: runtimeState?.waktu ?? 0,
      babak: runtimeState?.babak ?? match.babak,
      status: runtimeState?.status ?? match.status
    };


    // 3. Ambil lineup per tim
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

    // 4. Ambil staff
    const [staffRows] = await pool.query(`
      SELECT s.*, st.id_team
      FROM staff_teams st
      JOIN staff s ON st.id_staff = s.id
      WHERE st.id_team IN (?, ?)
    `, [match.team_1, match.team_2]);

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

    // 5. Ambil events (pakai id_pemain bukan id_pemain_event)
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

    // ✅ Kirim hasilnya
    res.status(200).json({
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
      events
    });

  } catch (error) {
    console.error('❌ Error getMatchDetail:', error.message);
    res.status(500).json({ message: 'Gagal mengambil detail match' });
  }
};


exports.updateKlasemenSemuaByKategori = async (req, res) => {
  try {
    const [kategoriIds] = await pool.query(`
      SELECT DISTINCT id_kategori 
      FROM matches 
      WHERE status = 'selesai'
    `);

    if (kategoriIds.length === 0) {
      return res.status(404).json({ message: 'Tidak ada kategori dengan match selesai' });
    }

    const hasil = [];

    for (const k of kategoriIds) {
      const id_kategori = k.id_kategori;

      const [matches] = await pool.query(`
        SELECT id FROM matches 
        WHERE status = 'selesai' AND id_kategori = ?
      `, [id_kategori]);

      let sukses = 0;
      let gagal = 0;
      const gagalIds = [];

      for (const match of matches) {
        try {
          await matchController.selesaikanMatchDanUpdateKlasemen(
            { body: { match_id: match.id }, app: req.app },
            {
              status: () => ({ json: () => { } }),
              json: () => { }
            }
          );

          sukses++;
        } catch (err) {
          console.error(`❌ Gagal update klasemen untuk match ID ${match.id}:`, err.message);
          gagal++;
          gagalIds.push(match.id);
        }
      }


      hasil.push({
        id_kategori,
        total_match: matches.length,
        sukses,
        gagal,
        gagal_ids: gagalIds
      });
    }

    res.json({
      message: 'Update klasemen berdasarkan kategori selesai',
      hasil
    });

  } catch (error) {
    console.error('❌ Error updateKlasemenSemuaByKategori:', error);
    res.status(500).json({ message: 'Gagal update klasemen berdasarkan kategori' });
  }
};
