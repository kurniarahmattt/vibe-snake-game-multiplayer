const { Server } = require('socket.io');
const { initializeGame } = require('../gameServer');

const SOCKET_PATH = '/api/socket';

module.exports = (req, res) => {
    const netSocket = res.socket || req.socket;

    if (!netSocket || !netSocket.server) {
        res.statusCode = 500;
        res.end('Socket server is not ready.');
        return;
    }

    if (!netSocket.server.io) {
        const io = new Server(netSocket.server, {
            path: SOCKET_PATH,
            pingTimeout: 60000,
            pingInterval: 25000,
            transports: ['websocket', 'polling'],
            allowEIO3: true,
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
        });

        netSocket.server.io = io;
        initializeGame(io);
    }

    res.end();
};
