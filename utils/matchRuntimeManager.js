const matchStates = {};
let io = null; // Simpan instance socket.io

function setIO(socketIOInstance) {
  io = socketIOInstance;
}

function startMatch(matchId, durasiMenit = 20, babak = 1, waktuAwal = 0, mode = 'countup') {
  if (matchStates[matchId]?.timer) clearInterval(matchStates[matchId].timer);

  const durasiDetik = durasiMenit * 60;
  let waktu = waktuAwal;

  matchStates[matchId] = {
    waktu,
    babak,
    durasi: durasiDetik,
    status: 'berlangsung',
    mode,
    timer: setInterval(() => {
      waktu++; // count up mode
      matchStates[matchId].waktu = waktu;

      // ✅ Emit hanya ke room match yang sesuai
      if (io) {
        io.to(`match-${matchId}`).emit(`match:${matchId}:tick`, {
          waktu,
          babak
        });
      }

      if (waktu >= durasiDetik) {
        clearInterval(matchStates[matchId].timer);
        matchStates[matchId].status = 'selesai_babak';

        if (io) {
          io.to(`match-${matchId}`).emit(`match:${matchId}:end-babak`, {
            babak
          });
        }
      }
    }, 1000)
  };
}

function stopMatch(matchId) {
  if (matchStates[matchId]?.timer) {
    clearInterval(matchStates[matchId].timer);
    matchStates[matchId].status = 'pause';
  }
}

function resetMatch(matchId) {
  if (matchStates[matchId]?.timer) clearInterval(matchStates[matchId].timer);
  delete matchStates[matchId];

  if (io) {
    io.to(`match-${matchId}`).emit(`match:${matchId}:reset`);
  }
}

function getMatchState(matchId) {
  return matchStates[matchId] || null;
}

function setMatchState(matchId, state) {
  matchStates[matchId] = {
    ...matchStates[matchId],
    ...state
  };
}

module.exports = {
  setIO,
  startMatch,
  stopMatch,
  resetMatch,
  getMatchState,
  setMatchState
};
