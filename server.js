const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const compression = require('compression');

const app = express();

// Add compression middleware for better network performance
app.use(compression());

const server = http.createServer(app);
const io = socketIO(server, {
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 33337;

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
let attackFood = null;
let attackFoodTimer = 0;

const GRID_SIZE = 30;
const TILE_COUNT = 30; // 30x30 grid = 900x900 pixels
const SPECIAL_FOOD_SPAWN_CHANCE = 0.15;
const SPECIAL_FOOD_DURATION = 10000;
const ATTACK_FOOD_SPAWN_CHANCE = 0.10; // 10% chance
const ATTACK_FOOD_DURATION = 15000; // 15 seconds
const ATTACK_ABILITY_DURATION = 15000; // 15 seconds of shooting ability

// Snake Skins
const SNAKE_SKINS = {
    classic: {
        name: 'Classic Green',
        bodyColor: '#4ecca3',
        headColor: '#45b393',
        powerUpBodyColor: '#ff3333',
        powerUpHeadColor: '#ff0000',
        pattern: 'solid'
    },
    fire: {
        name: 'Fire Snake',
        bodyColor: '#ff6b35',
        headColor: '#ff4500',
        powerUpBodyColor: '#ff3333',
        powerUpHeadColor: '#ff0000',
        pattern: 'gradient'
    },
    ice: {
        name: 'Ice Snake',
        bodyColor: '#87ceeb',
        headColor: '#4682b4',
        powerUpBodyColor: '#ff3333',
        powerUpHeadColor: '#ff0000',
        pattern: 'solid'
    },
    rainbow: {
        name: 'Rainbow Snake',
        bodyColor: '#ff69b4',
        headColor: '#9370db',
        powerUpBodyColor: '#ff3333',
        powerUpHeadColor: '#ff0000',
        pattern: 'rainbow'
    },
    neon: {
        name: 'Neon Snake',
        bodyColor: '#00ff41',
        headColor: '#00cc33',
        powerUpBodyColor: '#ff3333',
        powerUpHeadColor: '#ff0000',
        pattern: 'neon'
    },
    gold: {
        name: 'Golden Snake',
        bodyColor: '#ffd700',
        headColor: '#ffb347',
        powerUpBodyColor: '#ff3333',
        powerUpHeadColor: '#ff0000',
        pattern: 'metallic'
    },
    dark: {
        name: 'Shadow Snake',
        bodyColor: '#2c2c54',
        headColor: '#40407a',
        powerUpBodyColor: '#ff3333',
        powerUpHeadColor: '#ff0000',
        pattern: 'solid'
    },
    ocean: {
        name: 'Ocean Snake',
        bodyColor: '#006994',
        headColor: '#004d6b',
        powerUpBodyColor: '#ff3333',
        powerUpHeadColor: '#ff0000',
        pattern: 'waves'
    }
};

// Player colors (fallback for old system)
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

function generateAttackFood() {
    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!validPosition && attempts < maxAttempts) {
        attackFood = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        
        validPosition = true;
        
        // Check if not on any snake
        for (let playerId in players) {
            const player = players[playerId];
            for (let segment of player.snake) {
                if (segment.x === attackFood.x && segment.y === attackFood.y) {
                    validPosition = false;
                    break;
                }
            }
            if (!validPosition) break;
        }
        
        // Check if not on regular food or special food
        if (food && attackFood.x === food.x && attackFood.y === food.y) {
            validPosition = false;
        }
        if (specialFood && attackFood.x === specialFood.x && attackFood.y === specialFood.y) {
            validPosition = false;
        }
        
        attempts++;
    }
    
    attackFoodTimer = Date.now() + ATTACK_FOOD_DURATION;
}

// Initialize first food
generateFood();

// Handle player connections
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Assign color to player (fallback)
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
        skin: 'classic', // Default skin
        skinData: SNAKE_SKINS['classic'],
        alive: true,
        powerUpActive: false,
        powerUpEndTime: 0,
        attackAbility: false,
        attackEndTime: 0,
        bullets: []
    };
    
    // Send initial state to the new player
    socket.emit('init', {
        playerId: socket.id,
        players: players,
        food: food,
        specialFood: specialFood,
        attackFood: attackFood,
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
    
    // Handle skin changes
    socket.on('changeSkin', (data) => {
        if (players[socket.id] && SNAKE_SKINS[data.skin]) {
            players[socket.id].skin = data.skin;
            players[socket.id].skinData = SNAKE_SKINS[data.skin];
            
            // Update color for backward compatibility
            players[socket.id].color = {
                normal: SNAKE_SKINS[data.skin].bodyColor,
                head: SNAKE_SKINS[data.skin].headColor,
                name: SNAKE_SKINS[data.skin].name
            };
            
            // Broadcast skin change to all players
            io.emit('playerSkinChanged', {
                playerId: socket.id,
                skin: data.skin,
                skinData: SNAKE_SKINS[data.skin]
            });
        }
    });
    
    // Handle shooting
    socket.on('shoot', () => {
        const player = players[socket.id];
        if (player && player.alive && player.attackAbility && Date.now() < player.attackEndTime) {
            // Create bullet in the direction the snake is moving
            const head = player.snake[0];
            const bullet = {
                id: Date.now() + Math.random(), // Unique ID
                x: head.x,
                y: head.y,
                dx: player.direction.dx,
                dy: player.direction.dy,
                owner: socket.id,
                timestamp: Date.now()
            };
            
            player.bullets.push(bullet);
            
            // Broadcast bullet creation
            io.emit('bulletShot', {
                playerId: socket.id,
                bullet: bullet
            });
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
    
    // Check attack food timer
    if (attackFood && Date.now() >= attackFoodTimer) {
        attackFood = null;
        io.emit('attackFoodExpired');
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
        
        // Check attack ability expiration
        if (player.attackAbility && Date.now() >= player.attackEndTime) {
            player.attackAbility = false;
            io.emit('attackAbilityExpired', playerId);
        }
        
        // Update bullets
        for (let i = player.bullets.length - 1; i >= 0; i--) {
            const bullet = player.bullets[i];
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
            
            // Remove bullet if it goes off screen or is too old
            if (bullet.x < 0 || bullet.x >= TILE_COUNT || 
                bullet.y < 0 || bullet.y >= TILE_COUNT ||
                Date.now() - bullet.timestamp > 5000) { // 5 second max lifetime
                player.bullets.splice(i, 1);
                continue;
            }
            
            // Check bullet collision with other players
            for (let otherPlayerId in players) {
                if (otherPlayerId === playerId || otherPlayerId === bullet.owner) continue;
                const otherPlayer = players[otherPlayerId];
                if (!otherPlayer.alive) continue;
                
                // Check collision with other player's snake
                for (let j = 0; j < otherPlayer.snake.length; j++) {
                    const segment = otherPlayer.snake[j];
                    if (bullet.x === segment.x && bullet.y === segment.y) {
                        // Hit! Remove bullet and damage snake
                        player.bullets.splice(i, 1);
                        
                        // Reduce snake length by 1
                        if (otherPlayer.snake.length > 1) {
                            otherPlayer.snake.pop();
                            io.emit('playerHit', {
                                shooterId: playerId,
                                targetId: otherPlayerId,
                                newLength: otherPlayer.snake.length
                            });
                        } else {
                            // Snake dies if only 1 segment
                            otherPlayer.alive = false;
                            io.emit('playerKilled', {
                                shooterId: playerId,
                                targetId: otherPlayerId,
                                score: otherPlayer.score
                            });
                        }
                        break;
                    }
                }
            }
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
        
        // Check attack food collision
        if (attackFood && newHead.x === attackFood.x && newHead.y === attackFood.y) {
            player.score += 30;
            attackFood = null;
            
            // Activate attack ability
            player.attackAbility = true;
            player.attackEndTime = Date.now() + ATTACK_ABILITY_DURATION;
            
            io.emit('attackFoodEaten', { 
                playerId: playerId, 
                score: player.score 
            });
        }
        // Check special food collision
        else if (specialFood && newHead.x === specialFood.x && newHead.y === specialFood.y) {
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
            
            // Chance to spawn attack food
            if (!attackFood && Math.random() < ATTACK_FOOD_SPAWN_CHANCE) {
                generateAttackFood();
                io.emit('attackFoodSpawned', attackFood);
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
    
    // Broadcast game state (optimized - only send if there are changes)
    const currentState = {
        players: players,
        food: food,
        specialFood: specialFood,
        attackFood: attackFood
    };
    
    // Only broadcast if there are active players
    const activePlayers = Object.values(players).filter(p => p.alive);
    if (activePlayers.length > 0) {
        io.emit('gameState', currentState);
    }
    
}, 100); // 100ms = 10 FPS (normal speed) but with optimizations

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
