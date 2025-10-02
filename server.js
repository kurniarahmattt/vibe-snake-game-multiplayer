const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 8000;

// Main route - serve multiplayer.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'multiplayer.html'));
});

// Serve static files (but not for root path)
app.use(express.static(__dirname));

// Game state
const players = {};
let food = null;
let specialFood = null;
let specialFoodTimer = 0;

const GRID_SIZE = 30;
const TILE_COUNT = 30; // 30x30 grid = 900x900 pixels
const SPECIAL_FOOD_SPAWN_CHANCE = 0.15;
const SPECIAL_FOOD_DURATION = 10000;

// Player colors
const PLAYER_COLORS = [
    { normal: '#4ecca3', head: '#45b393', name: 'Green' },
    { normal: '#54a0ff', head: '#2e86de', name: 'Blue' },
    { normal: '#ff6348', head: '#ff4757', name: 'Orange' },
    { normal: '#feca57', head: '#ff9ff3', name: 'Yellow' },
    { normal: '#48dbfb', head: '#0abde3', name: 'Cyan' },
    { normal: '#ff6b6b', head: '#ee5a6f', name: 'Pink' },
    { normal: '#c44569', head: '#a5395d', name: 'Purple' },
    { normal: '#78e08f', head: '#38ada9', name: 'Mint' }
];

// Initialize food
function generateFood() {
    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!validPosition && attempts < maxAttempts) {
        food = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        
        validPosition = true;
        
        // Check if food is not on any snake
        for (let playerId in players) {
            const player = players[playerId];
            for (let segment of player.snake) {
                if (segment.x === food.x && segment.y === food.y) {
                    validPosition = false;
                    break;
                }
            }
            if (!validPosition) break;
        }
        
        // Check if not on special food
        if (specialFood && food.x === specialFood.x && food.y === specialFood.y) {
            validPosition = false;
        }
        
        attempts++;
    }
}

function generateSpecialFood() {
    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!validPosition && attempts < maxAttempts) {
        specialFood = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        
        validPosition = true;
        
        // Check if not on any snake
        for (let playerId in players) {
            const player = players[playerId];
            for (let segment of player.snake) {
                if (segment.x === specialFood.x && segment.y === specialFood.y) {
                    validPosition = false;
                    break;
                }
            }
            if (!validPosition) break;
        }
        
        // Check if not on regular food
        if (food && specialFood.x === food.x && specialFood.y === food.y) {
            validPosition = false;
        }
        
        attempts++;
    }
    
    specialFoodTimer = Date.now() + SPECIAL_FOOD_DURATION;
}

// Initialize first food
generateFood();

// Handle player connections
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Assign color to player
    const colorIndex = Object.keys(players).length % PLAYER_COLORS.length;
    const playerColor = PLAYER_COLORS[colorIndex];
    
    // Initialize player
    players[socket.id] = {
        id: socket.id,
        snake: [{ 
            x: Math.floor(Math.random() * (TILE_COUNT - 10)) + 5, 
            y: Math.floor(Math.random() * (TILE_COUNT - 10)) + 5 
        }],
        direction: { dx: 0, dy: 0 },
        nextDirection: { dx: 0, dy: 0 },
        score: 0,
        color: playerColor,
        alive: true,
        powerUpActive: false,
        powerUpEndTime: 0
    };
    
    // Send initial state to the new player
    socket.emit('init', {
        playerId: socket.id,
        players: players,
        food: food,
        specialFood: specialFood,
        tileCount: TILE_COUNT,
        gridSize: GRID_SIZE
    });
    
    // Notify all players about the new player
    io.emit('playerJoined', {
        playerId: socket.id,
        player: players[socket.id]
    });
    
    // Handle direction changes
    socket.on('changeDirection', (data) => {
        if (players[socket.id] && players[socket.id].alive) {
            players[socket.id].nextDirection = data;
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

// Game loop
setInterval(() => {
    // Check special food timer
    if (specialFood && Date.now() >= specialFoodTimer) {
        specialFood = null;
        io.emit('specialFoodExpired');
    }
    
    // Update each player
    for (let playerId in players) {
        const player = players[playerId];
        
        if (!player.alive) continue;
        
        // Check power-up expiration
        if (player.powerUpActive && Date.now() >= player.powerUpEndTime) {
            player.powerUpActive = false;
            io.emit('powerUpExpired', playerId);
        }
        
        // Update direction
        player.direction = player.nextDirection;
        
        // Skip if not moving
        if (player.direction.dx === 0 && player.direction.dy === 0) continue;
        
        // Move snake
        let newHead = {
            x: player.snake[0].x + player.direction.dx,
            y: player.snake[0].y + player.direction.dy
        };
        
        // Handle wall collision
        if (player.powerUpActive) {
            // Wrap around walls
            if (newHead.x < 0) newHead.x = TILE_COUNT - 1;
            if (newHead.x >= TILE_COUNT) newHead.x = 0;
            if (newHead.y < 0) newHead.y = TILE_COUNT - 1;
            if (newHead.y >= TILE_COUNT) newHead.y = 0;
        } else {
            // Check wall collision
            if (newHead.x < 0 || newHead.x >= TILE_COUNT || 
                newHead.y < 0 || newHead.y >= TILE_COUNT) {
                player.alive = false;
                io.emit('playerDied', { playerId: playerId, score: player.score });
                continue;
            }
        }
        
        // Check self collision (only if not invincible)
        if (!player.powerUpActive) {
            for (let segment of player.snake) {
                if (newHead.x === segment.x && newHead.y === segment.y) {
                    player.alive = false;
                    io.emit('playerDied', { playerId: playerId, score: player.score });
                    break;
                }
            }
            if (!player.alive) continue;
        }
        
        // Check collision with other players (only if not invincible)
        if (!player.powerUpActive) {
            for (let otherPlayerId in players) {
                if (otherPlayerId === playerId) continue;
                const otherPlayer = players[otherPlayerId];
                if (!otherPlayer.alive) continue;
                
                for (let segment of otherPlayer.snake) {
                    if (newHead.x === segment.x && newHead.y === segment.y) {
                        player.alive = false;
                        io.emit('playerDied', { playerId: playerId, score: player.score });
                        break;
                    }
                }
                if (!player.alive) break;
            }
            if (!player.alive) continue;
        }
        
        player.snake.unshift(newHead);
        
        // Check special food collision
        if (specialFood && newHead.x === specialFood.x && newHead.y === specialFood.y) {
            player.score += 50;
            specialFood = null;
            
            // Activate power-up
            player.powerUpActive = true;
            player.powerUpEndTime = Date.now() + 10000;
            
            io.emit('specialFoodEaten', { 
                playerId: playerId, 
                score: player.score 
            });
        }
        // Check regular food collision
        else if (food && newHead.x === food.x && newHead.y === food.y) {
            player.score += 10;
            generateFood();
            
            // Chance to spawn special food
            if (!specialFood && Math.random() < SPECIAL_FOOD_SPAWN_CHANCE) {
                generateSpecialFood();
                io.emit('specialFoodSpawned', specialFood);
            }
            
            io.emit('foodEaten', { 
                playerId: playerId, 
                score: player.score, 
                newFood: food 
            });
        } else {
            player.snake.pop();
        }
    }
    
    // Broadcast game state
    io.emit('gameState', {
        players: players,
        food: food,
        specialFood: specialFood
    });
    
}, 100); // 100ms = 10 FPS

// Get local IP
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

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n===========================================');
    console.log('🐍 Multiplayer Snake Game Server Running!');
    console.log('===========================================\n');
    console.log(`Access from this machine:`);
    console.log(`  http://localhost:${PORT}\n`);
    console.log(`Access from other devices on the network:`);
    console.log(`  http://${localIP}:${PORT}\n`);
    console.log('===========================================\n');
    console.log('Press Ctrl+C to stop the server\n');
});
