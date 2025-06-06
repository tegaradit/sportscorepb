const { startMatch, stopMatch, resetMatch, getMatchState, setMatchState } = require('../../utils/matchRuntimeManager');
const pool = require('../../config/db');
const { getDurasiDanJumlahBabakByMatchId } = require('../../helpers/kategoriHelper');


// Helper emit
const emitToMatch = (io, matchId, event, payload = {}) => {
  io.to(`match-${matchId}`).emit(event, { matchId, ...payload });
};


exports.startBabak = async (req, res) => {
  const { matchId, babak } = req.body;

  try {
    const setting = await getDurasiDanJumlahBabakByMatchId(matchId);
    if (!setting) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    await pool.query(`UPDATE matches SET babak = ?, status = 'sedang_main' WHERE id = ?`, [babak, matchId]);

    startMatch(matchId, setting.durasi_babak, babak, 0, 'countup');

    emitToMatch(req.app.get('io'), matchId, 'start_babak', {
      babak,
      durasi: setting.durasi_babak * 60,
      countdown: false
    });

    res.status(200).json({ message: 'Babak dimulai' });
  } catch (error) {
    console.error('❌ Error startBabak:', error);
    res.status(500).json({ message: 'Gagal memulai babak' });
  }
};  

exports.stopBabak = async (req, res) => {
  const { matchId } = req.body;

  try {
    stopMatch(matchId);
    emitToMatch(req.app.get('io'), matchId, 'babak_dihentikan');
    res.status(200).json({ message: 'Babak dihentikan sementara' });
  } catch (error) {
    console.error('❌ Error stopBabak:', error);
    res.status(500).json({ message: 'Gagal menghentikan babak' });
  }
};

exports.resumeBabak = async (req, res) => {
  const { matchId } = req.body;

  try {
    const runtime = getMatchState(matchId);
    if (!runtime || runtime.status !== 'pause') {
      return res.status(400).json({ message: 'Pertandingan belum di-pause atau tidak valid' });
    }

    startMatch(matchId, runtime.durasi / 60, runtime.babak, runtime.waktu, 'countup');


    emitToMatch(req.app.get('io'), matchId, 'babak_dilanjutkan', {
      babak: runtime.babak,
      waktu: runtime.waktu,
      countdown: true
    });

    res.status(200).json({ message: 'Babak dilanjutkan kembali' });
  } catch (error) {
    console.error('❌ Error resumeBabak:', error);
    res.status(500).json({ message: 'Gagal melanjutkan babak' });
  }
};

exports.lanjutBabak = async (req, res) => {
  const { matchId } = req.body;

  try {
    const [rows] = await pool.query(`SELECT babak FROM matches WHERE id = ?`, [matchId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Match tidak ditemukan' });

    const kategori = await getDurasiDanJumlahBabakByMatchId(matchId);
    if (!kategori) return res.status(404).json({ message: 'Kategori tidak ditemukan' });

    const babakSaatIni = rows[0].babak;
    const babakBaru = babakSaatIni + 1;

    if (babakSaatIni >= kategori.jumlah_babak) {
      return res.status(400).json({ message: `Jumlah babak sudah maksimal (${kategori.jumlah_babak})` });
    }

    await pool.query(`UPDATE matches SET babak = ?, status = 'menunggu' WHERE id = ?`, [babakBaru, matchId]);

    // Siapkan runtime (tidak start dulu)
    setMatchState(matchId, {
      status: 'ready',
      durasi: kategori.durasi_babak * 60,
      babak: babakBaru,
      waktu: 0,
      mode: 'countup'
    });

    emitToMatch(req.app.get('io'), matchId, 'babak_diset', {
      babak: babakBaru,
      durasi: kategori.durasi_babak * 60,
      waktu: 0,
      countdown: false
    });

    res.status(200).json({ message: `Babak ${babakBaru} siap dimulai oleh EO` });
  } catch (error) {
    console.error('❌ Error lanjutBabak:', error);
    res.status(500).json({ message: 'Gagal lanjut babak' });
  }
};

exports.resetMatchManual = async (req, res) => {
  const { matchId } = req.body;

  try {
    const [rows] = await pool.query(`SELECT babak FROM matches WHERE id = ?`, [matchId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Pertandingan tidak ditemukan' });

    const babakSekarang = rows[0].babak;

    await pool.query(`UPDATE matches SET status = 'belum_main' WHERE id = ?`, [matchId]);
    resetMatch(matchId);

    emitToMatch(req.app.get('io'), matchId, 'match_direset', {
      babak: babakSekarang,
      message: `Pertandingan direset ke awal babak ${babakSekarang}`
    });

    res.status(200).json({ message: `Pertandingan direset ke awal babak ${babakSekarang}` });
  } catch (error) {
    console.error('❌ Error resetMatchManual:', error);
    res.status(500).json({ message: 'Gagal reset pertandingan' });
  }
};

exports.resetFullMatch = async (req, res) => {
  const { matchId } = req.body;

  try {
    await pool.query(`UPDATE matches SET babak = 1, status = 'belum_main' WHERE id = ?`, [matchId]);
    resetMatch(matchId);

    emitToMatch(req.app.get('io'), matchId, 'match_direset', {
      babak: 1,
      message: 'Pertandingan direset total ke babak 1'
    });

    res.status(200).json({ message: 'Pertandingan direset ke awal babak 1' });
  } catch (error) {
    console.error('❌ Error resetFullMatch:', error);
    res.status(500).json({ message: 'Gagal reset pertandingan ke awal' });
  }
};

exports.selesaikanMatch = async (req, res) => {
  const { matchId } = req.body;

  if (!matchId) {
    return res.status(400).json({ message: 'matchId wajib diisi' });
  }

  try {
    console.log(`✅ Endpoint selesaikanMatch di-hit untuk matchId: ${matchId}`);
    const [[match]] = await pool.query(`SELECT * FROM matches WHERE id = ?`, [matchId]);
    if (!match) return res.status(404).json({ message: 'Match tidak ditemukan' });

    const team1 = match.team_1;
    const team2 = match.team_2;
    const skor1 = match.skor_1;
    const skor2 = match.skor_2;
    const id_kategori = match.id_kategori;

    // Update status
    await pool.query(`UPDATE matches SET status = 'selesai' WHERE id = ?`, [matchId]);

    // Reset runtime
    resetMatch(matchId);

    // Emit ke frontend
    emitToMatch(req.app.get('io'), matchId, 'match_selesai');

    // Update klasemen
    const updateTeam = async (id_team, isTeam1) => {
      const isMenang = (isTeam1 && skor1 > skor2) || (!isTeam1 && skor2 > skor1);
      const isSeri = skor1 === skor2;
      const poin = isMenang ? 3 : isSeri ? 1 : 0;
      const goal_masuk = isTeam1 ? skor1 : skor2;
      const goal_kebobolan = isTeam1 ? skor2 : skor1;

      const [cek] = await pool.query(`SELECT * FROM klasemen WHERE id_kategori = ? AND id_team = ?`, [id_kategori, id_team]);
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

    // Update jumlah gol pemain dari match_events
    const [events] = await pool.query(`
      SELECT id_pemain, id_team, COUNT(*) AS total
      FROM match_events
      WHERE id_match = ? AND jenis = 'GOL'
      GROUP BY id_pemain, id_team
    `, [matchId]);

    for (const e of events) {
      await pool.query(`
        UPDATE pemain_event
        SET jumlah_gol = jumlah_gol + ?
        WHERE id_pemain = ? AND id_team = ? AND id_kategori = ?
      `, [e.total, e.id_pemain, e.id_team, id_kategori]);
    }

    // Ambil klasemen terbaru
    const [[kategori]] = await pool.query(`
      SELECT model_klasemen FROM event_categories WHERE id = ?
    `, [id_kategori]);

    const viewName = kategori.model_klasemen === 'head_to_head'
      ? 'klasemen_headtohead_view'
      : 'klasemen_default_view';

    const [klasemenRows] = await pool.query(`
      SELECT * FROM ${viewName}
      WHERE id_kategori = ?
      ORDER BY grup, ranking
    `, [id_kategori]);

    // Ambil 10 besar top skor
    const [topScoreRows] = await pool.query(`
      SELECT 
        pe.id_pemain, pe.jumlah_gol, p.nama_pemain, t.nama_club
      FROM pemain_event pe
      JOIN pemain p ON pe.id_pemain = p.id
      JOIN teams t ON pe.id_team = t.id
      WHERE pe.id_kategori = ?
      ORDER BY pe.jumlah_gol DESC, p.nama_pemain ASC
      LIMIT 10
    `, [id_kategori]);

    res.status(200).json({
      message: 'Pertandingan selesai, klasemen & top skor diperbarui',
      klasemen: klasemenRows,
      top_skor: topScoreRows
    });

  } catch (error) {
    console.error('❌ Error selesaikanMatch:', error);
    res.status(500).json({ message: 'Gagal menyelesaikan pertandingan & update klasemen/top skor' });
  }
};
