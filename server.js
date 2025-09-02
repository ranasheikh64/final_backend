require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth');
const tokenRoutes = require('./src/routes/token');
const messageRoutes = require('./src/routes/messages');
const friendRoutes = require('./src/routes/friend')

const app = express();
const server = http.createServer(app);
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// connect mongodb
connectDB();

app.use(cors());
app.use(express.json());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api', messageRoutes);
app.use('/api/friend',friendRoutes)

// health
app.get('/', (req, res) => res.send({ ok: true, ts: Date.now() }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
