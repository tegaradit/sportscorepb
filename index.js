require('dotenv').config();
const express = require('express')
const app = express()
const cookieParser = require('cookie-parser');
const port = process.env.PORT
const teamRoutes = require('./router/teamsRouter');
const pemainRoutes = require('./router/pemainRouter')
const keranjangPemain = require('./router/keranjangRouter')
const admin = require("./router/adminRouter")

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: 'http://localhost:5173', // ganti dengan alamat frontend kamu
  credentials: true
}));

app.use('/uploads', express.static('uploads'));

app.use('/admin', admin)
app.use('/team', teamRoutes);
app.use('/pemain', pemainRoutes)
app.use("/keranjang_pemain", keranjangPemain)

app.get('/', (req, res) => {
    res.send('Hello World!')
  })
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })