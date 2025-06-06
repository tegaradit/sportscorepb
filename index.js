require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const cron = require('node-cron');
const { setIO } = require('./utils/matchRuntimeManager');


const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://sportscore.id',
      'http://sportscore.id',
      'https://4e16-125-160-108-50.ngrok-free.app'
    ],
    credentials: true
  }
});



setIO(io);
app.set('io', io);
global.io = io;

// ================== Middlewares ==================
app.use(express.json());
app.use(cookieParser());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://sportscore.id',
      'http://sportscore.id',
      'https://8860-114-10-151-245.ngrok-free.app',
      'http://127.0.0.1:5500'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));

// ================== Cron ==================
const hapusTimExpired = require('./jobs/hapusTimExpired');
cron.schedule('0 1 * * *', () => {
  console.log('⏰ Menjalankan penghapusan tim expired...');
  hapusTimExpired();
});

// ================== Static Files ==================
app.use('/uploads', express.static('uploads'));

// ================== Routes ==================
app.use('/admin', require('./router/admin/adminRouter'));
app.use('/team', require('./router/tim/teamsRouter'));
app.use('/pemain', require('./router/tim/pemainRouter'));
app.use('/keranjang_pemain', require('./router/tim/keranjangRouter'));
app.use('/midtrans', require('./router/midtransRouter'));
app.use('/event', require('./router/eo/eventRouter'));
app.use('/eventkategory', require('./router/eo/eventKategoryRouter'));
app.use('/eo', require('./router/eo/eventOrganizerRouter'));
app.use('/match-tim', require('./router/tim/matchTimRouter'));
app.use('/match', require('./router/eo/macthRouter'));
app.use('/staff', require('./router/tim/staffRouter'));
app.use('/pemainEvent', require('./router/tim/pemainEventRouter'));
app.use('/lineup', require('./router/tim/lineupRouter'));
app.use('/matchEvent', require('./router/eo/matchEventRouter'));
app.use('/tim-event', require('./router/tim/eventTimRouter'));
app.use('/matchrun', require('./router/eo/matchRuntimeRouter'));


// ================== Socket IO ==================
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // ⛔ Saat client disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });

  // 📡 Join ke room umum (misal untuk match realtime, dll)
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`📶 Socket ${socket.id} join room: ${room}`);
  });

  // 🟢 Debounce Join Kategori
  const kategoriJoinCooldown = new Map(); // socket.id -> timestamp

  socket.on("join_kategori", (kategoriId) => {
    const now = Date.now();
    const lastJoin = kategoriJoinCooldown.get(socket.id) || 0;

    // ⏳ Jika join terlalu cepat (dalam 2 detik), abaikan
    if (now - lastJoin < 2000) {
      console.log(`⚠️ Debounce join_kategori untuk ${socket.id} (kategori ${kategoriId})`);
      return;
    }

    kategoriJoinCooldown.set(socket.id, now);

    // ✅ Join ke room kategori
    socket.join(`kategori_${kategoriId}`);
    console.log(`📊 Socket ${socket.id} join kategori_${kategoriId}`);
  });

  socket.on("leave_kategori", (kategoriId) => {
    socket.leave(`kategori_${kategoriId}`);
    console.log(`↩️ Socket ${socket.id} leave kategori_${kategoriId}`);
  });
});



// ================== Test Endpoint ==================
app.get('/', (req, res) => {
  res.send('🚀 SportScore Server Aktif');
});

// ================== Start Server ==================
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server jalan di port ${port}`);
});
