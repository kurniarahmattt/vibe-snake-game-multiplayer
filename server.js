const http = require('http');
const socketIO = require('socket.io');
const { createExpressApp, initializeGame } = require('./gameServer');

const PORT = process.env.PORT || 33337;
const SOCKET_PATH = process.env.SOCKET_PATH || (process.env.VERCEL ? '/api/socket' : '/socket.io');

const app = createExpressApp();
const server = http.createServer(app);
const io = new socketIO.Server(server, {
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

initializeGame(io);

if (require.main === module) {
    server.listen(PORT, '0.0.0.0', () => {
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        let localIP = 'localhost';

        Object.keys(networkInterfaces).forEach((interfaceName) => {
            networkInterfaces[interfaceName].forEach((iface) => {
                if (iface.family === 'IPv4' && !iface.internal) {
                    localIP = iface.address;
                }
            });
        });

        console.log('\n===========================================');
        console.log('🐍 Multiplayer Snake Game Server Running!');
        console.log('===========================================\n');
        console.log('Access from this machine:');
        console.log(`  http://localhost:${PORT}\n`);
        console.log('Access from other devices on the network:');
        console.log(`  http://${localIP}:${PORT}\n`);
        console.log('===========================================\n');
        console.log('Press Ctrl+C to stop the server\n');
    });
}

module.exports = {
    app,
    io,
    server,
    port: PORT,
    socketPath: SOCKET_PATH,
};
