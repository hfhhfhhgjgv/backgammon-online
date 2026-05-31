const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

function initBoard() {
    let b = new Array(24).fill(0);
    b[0] = 2; b[5] = 5; b[7] = 3; b[11] = -5; b[12] = -2; b[16] = -3; b[18] = -5; b[23] = 2;
    return b;
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', (roomCode) => {
        socket.join(roomCode);
        rooms[roomCode] = {
            players: [socket.id],
            board: initBoard(),
            currentPlayer: 1,
            whiteOff: 0, redOff: 0,
            whiteEaten: 0, redEaten: 0,
            dice: [1,1], rolled: false, gameOver: false, winner: null
        };
        socket.emit('roomCreated', { roomCode, playerId: socket.id });
        io.to(roomCode).emit('updateGame', rooms[roomCode]);
    });

    socket.on('joinRoom', (roomCode) => {
        if (rooms[roomCode] && rooms[roomCode].players.length < 2) {
            socket.join(roomCode);
            rooms[roomCode].players.push(socket.id);
            io.to(roomCode).emit('gameReady', 'بازی شروع شد! نوبت سفید');
            io.to(roomCode).emit('updateGame', rooms[roomCode]);
        } else {
            socket.emit('errorMessage', 'اتاق پر یا نامعتبر');
        }
    });

    socket.on('rollDice', (roomCode) => {
        let room = rooms[roomCode];
        if (!room || room.rolled || room.gameOver) return;
        let d1 = Math.floor(Math.random()*6)+1;
        let d2 = Math.floor(Math.random()*6)+1;
        room.dice = [d1, d2];
        room.rolled = true;
        io.to(roomCode).emit('updateGame', room);
    });

    socket.on('move', (roomCode, move) => {
        let room = rooms[roomCode];
        if (!room || !room.rolled) return;
        room.rolled = false;
        room.currentPlayer *= -1;
        io.to(roomCode).emit('updateGame', room);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));
