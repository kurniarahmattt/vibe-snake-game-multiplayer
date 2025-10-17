const compression = require('compression');
const express = require('express');

function createExpressApp() {
    const app = express();
    app.use(compression());
    app.get('/', (req, res) => {
        res.sendFile(require('path').join(__dirname, 'multiplayer.html'));
    });
    app.use(express.static(__dirname));
    return app;
}

function initializeGame(io) {
    const players = {};
    let food = null;
    let specialFood = null;
    let specialFoodTimer = 0;
    let attackFood = null;
    let attackFoodTimer = 0;
    let speedFood = null;
    let speedFoodTimer = 0;

    const GRID_SIZE = 30;
    const TILE_COUNT = 30; // 30x30 grid = 900x900 pixels
    const SPECIAL_FOOD_SPAWN_CHANCE = 0.15;
    const SPECIAL_FOOD_DURATION = 10000;
    const ATTACK_FOOD_SPAWN_CHANCE = 0.10; // 10% chance
    const ATTACK_FOOD_DURATION = 15000; // 15 seconds
    const ATTACK_ABILITY_DURATION = 15000; // 15 seconds of shooting ability
    const SPEED_FOOD_SPAWN_CHANCE = 0.12; // 12% chance
    const SPEED_FOOD_DURATION = 12000; // 12 seconds
    const SPEED_BOOST_DURATION = 10000; // 10 seconds of speed boost

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

            attempts++;
        }

        if (!validPosition) {
            food = {
                x: Math.floor(Math.random() * TILE_COUNT),
                y: Math.floor(Math.random() * TILE_COUNT)
            };
        }

        io.emit('food', food);
    }

    function generateSpecialFood() {
        specialFood = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT),
            type: 'special'
        };
        specialFoodTimer = Date.now();
        io.emit('specialFoodSpawned', specialFood);
    }

    function generateAttackFood() {
        attackFood = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT),
            type: 'attack'
        };
        attackFoodTimer = Date.now();
        io.emit('attackFoodSpawned', attackFood);
    }

    function generateSpeedFood() {
        speedFood = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT),
            type: 'speed'
        };
        speedFoodTimer = Date.now();
        io.emit('speedFoodSpawned', speedFood);
    }

    function checkSpecialFoodTimers() {
        const now = Date.now();

        if (specialFood && now - specialFoodTimer > SPECIAL_FOOD_DURATION) {
            specialFood = null;
            io.emit('specialFoodExpired');
        }

        if (attackFood && now - attackFoodTimer > ATTACK_FOOD_DURATION) {
            attackFood = null;
            io.emit('attackFoodExpired');
        }

        if (speedFood && now - speedFoodTimer > SPEED_FOOD_DURATION) {
            speedFood = null;
            io.emit('speedFoodExpired');
        }
    }

    function getSpawnPosition() {
        const spawnAreas = [
            { x: 5, y: 5 },
            { x: TILE_COUNT - 5, y: 5 },
            { x: 5, y: TILE_COUNT - 5 },
            { x: TILE_COUNT - 5, y: TILE_COUNT - 5 }
        ];

        for (let area of spawnAreas) {
            let isClear = true;

            for (let i = 0; i < Object.keys(players).length; i++) {
                const checkX = area.x + i;
                const checkY = area.y + i;
                for (let playerId in players) {
                    const player = players[playerId];
                    for (let segment of player.snake) {
                        if (segment.x === checkX && segment.y === checkY) {
                            isClear = false;
                            break;
                        }
                    }
                    if (!isClear) break;
                }
                if (!isClear) break;
            }

            if (isClear) {
                return area;
            }
        }

        return {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
    }

    function createPlayer(playerId, skinId) {
        const playerColor = PLAYER_COLORS[Object.keys(players).length % PLAYER_COLORS.length];
        const spawnPosition = getSpawnPosition();

        return {
            id: playerId,
            name: `Player ${Object.keys(players).length + 1}`,
            color: playerColor,
            direction: 'right',
            snake: [
                { x: spawnPosition.x - 2, y: spawnPosition.y },
                { x: spawnPosition.x - 1, y: spawnPosition.y },
                { x: spawnPosition.x, y: spawnPosition.y }
            ],
            alive: true,
            score: 0,
            skin: skinId && SNAKE_SKINS[skinId] ? skinId : 'classic',
            bullets: [],
            lastShotTime: 0,
            powerUpActive: false,
            powerUpEndTime: 0,
            attackAbility: false,
            attackEndTime: 0,
            speedBoost: false,
            speedEndTime: 0,
            baseSpeed: 120,
            currentSpeed: 120,
            lastUpdateTime: Date.now()
        };
    }

    function resetGame() {
        for (let playerId in players) {
            const player = players[playerId];
            const spawnPosition = getSpawnPosition();
            player.snake = [
                { x: spawnPosition.x - 2, y: spawnPosition.y },
                { x: spawnPosition.x - 1, y: spawnPosition.y },
                { x: spawnPosition.x, y: spawnPosition.y }
            ];
            player.direction = 'right';
            player.alive = true;
            player.score = 0;
            player.powerUpActive = false;
            player.powerUpEndTime = 0;
            player.attackAbility = false;
            player.attackEndTime = 0;
            player.speedBoost = false;
            player.speedEndTime = 0;
            player.currentSpeed = player.baseSpeed;
            player.lastUpdateTime = Date.now();
        }

        food = null;
        specialFood = null;
        specialFoodTimer = 0;
        attackFood = null;
        attackFoodTimer = 0;
        speedFood = null;
        speedFoodTimer = 0;

        generateFood();

        io.emit('gameReset');
    }

    function handlePlayerDeath(playerId, killerId = null) {
        const player = players[playerId];
        if (!player) return;

        player.alive = false;
        player.deathTime = Date.now();

        if (killerId && players[killerId]) {
            players[killerId].score += 20;
            io.emit('playerKilled', {
                killerId,
                victimId: playerId,
                score: players[killerId].score
            });
        }

        io.emit('playerDied', { playerId });

        const alivePlayers = Object.values(players).filter(p => p.alive);
        if (alivePlayers.length <= 1) {
            const winner = alivePlayers[0];
            if (winner) {
                winner.score += 100;
            }
            io.emit('gameOver', {
                winnerId: winner ? winner.id : null,
                winnerName: winner ? winner.name : null,
                score: winner ? winner.score : 0
            });

            setTimeout(() => {
                resetGame();
            }, 5000);
        }
    }

    function updateBullets(player, currentTime) {
        player.bullets = player.bullets.filter((bullet) => currentTime - bullet.createdAt < 5000);

        for (let bullet of player.bullets) {
            const speed = bullet.speed;
            for (let i = 0; i < speed; i++) {
                switch (bullet.direction) {
                    case 'left':
                        bullet.x -= 1;
                        break;
                    case 'right':
                        bullet.x += 1;
                        break;
                    case 'up':
                        bullet.y -= 1;
                        break;
                    case 'down':
                        bullet.y += 1;
                        break;
                }

                if (bullet.x < 0 || bullet.x >= TILE_COUNT || bullet.y < 0 || bullet.y >= TILE_COUNT) {
                    bullet.destroyed = true;
                    break;
                }

                for (let otherPlayerId in players) {
                    if (otherPlayerId === player.id) continue;
                    const otherPlayer = players[otherPlayerId];
                    if (!otherPlayer.alive) continue;

                    for (let segmentIndex = 0; segmentIndex < otherPlayer.snake.length; segmentIndex++) {
                        const segment = otherPlayer.snake[segmentIndex];
                        if (segment.x === bullet.x && segment.y === bullet.y) {
                            if (segmentIndex === 0) {
                                handlePlayerDeath(otherPlayerId, player.id);
                            } else {
                                otherPlayer.snake = otherPlayer.snake.slice(0, segmentIndex);
                                otherPlayer.score = Math.max(0, otherPlayer.score - 20);
                            }

                            bullet.destroyed = true;
                            io.emit('bulletHit', {
                                shooterId: player.id,
                                victimId: otherPlayerId,
                                segmentIndex
                            });
                            break;
                        }
                    }
                    if (bullet.destroyed) break;
                }
                if (bullet.destroyed) break;
            }
        }

        player.bullets = player.bullets.filter((bullet) => !bullet.destroyed);
    }

    function updateGame() {
        const now = Date.now();

        checkSpecialFoodTimers();

        for (let playerId in players) {
            const player = players[playerId];
            if (!player.alive) continue;

            if (player.attackAbility && now > player.attackEndTime) {
                player.attackAbility = false;
            }

            if (player.speedBoost && now > player.speedEndTime) {
                player.speedBoost = false;
                player.currentSpeed = player.baseSpeed;
            }

            if (player.powerUpActive && now > player.powerUpEndTime) {
                player.powerUpActive = false;
            }

            updateBullets(player, now);

            const timeSinceLastUpdate = now - player.lastUpdateTime;
            const updateInterval = player.speedBoost ? 50 : 100;

            if (timeSinceLastUpdate < updateInterval) {
                continue;
            }

            player.lastUpdateTime = now;

            let head = { ...player.snake[0] };

            switch (player.direction) {
                case 'left':
                    head.x--;
                    break;
                case 'right':
                    head.x++;
                    break;
                case 'up':
                    head.y--;
                    break;
                case 'down':
                    head.y++;
                    break;
            }

            if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
                handlePlayerDeath(playerId);
                continue;
            }

            let collidedWithSelf = false;
            for (let segment of player.snake) {
                if (segment.x === head.x && segment.y === head.y) {
                    collidedWithSelf = true;
                    break;
                }
            }

            if (collidedWithSelf) {
                handlePlayerDeath(playerId);
                continue;
            }

            let collidedWithAnother = false;
            for (let otherPlayerId in players) {
                if (otherPlayerId === playerId) continue;
                const otherPlayer = players[otherPlayerId];
                if (!otherPlayer.alive) continue;

                for (let segment of otherPlayer.snake) {
                    if (segment.x === head.x && segment.y === head.y) {
                        handlePlayerDeath(playerId, otherPlayerId);
                        collidedWithAnother = true;
                        break;
                    }
                }
                if (collidedWithAnother) break;
            }

            if (collidedWithAnother) continue;

            player.snake.unshift(head);

            if (attackFood && head.x === attackFood.x && head.y === attackFood.y) {
                player.score += 30;
                attackFood = null;

                player.attackAbility = true;
                player.attackEndTime = Date.now() + ATTACK_ABILITY_DURATION;

                io.emit('attackFoodEaten', {
                    playerId,
                    score: player.score
                });
            }

            if (speedFood && head.x === speedFood.x && head.y === speedFood.y) {
                player.score += 25;
                speedFood = null;

                player.speedBoost = true;
                player.speedEndTime = Date.now() + SPEED_BOOST_DURATION;

                io.emit('speedFoodEaten', {
                    playerId,
                    score: player.score
                });
            } else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
                player.score += 50;
                specialFood = null;

                player.powerUpActive = true;
                player.powerUpEndTime = Date.now() + 10000;

                io.emit('specialFoodEaten', {
                    playerId,
                    score: player.score
                });
            } else if (food && head.x === food.x && head.y === food.y) {
                player.score += 10;
                generateFood();

                if (!specialFood && Math.random() < SPECIAL_FOOD_SPAWN_CHANCE) {
                    generateSpecialFood();
                }

                if (!attackFood && Math.random() < ATTACK_FOOD_SPAWN_CHANCE) {
                    generateAttackFood();
                }

                if (!speedFood && Math.random() < SPEED_FOOD_SPAWN_CHANCE) {
                    generateSpeedFood();
                }

                io.emit('foodEaten', {
                    playerId,
                    score: player.score,
                    newFood: food
                });
            } else {
                player.snake.pop();
            }
        }

        const activePlayers = Object.values(players).filter(p => p.alive);
        if (activePlayers.length > 0) {
            io.emit('gameState', {
                players,
                food,
                specialFood,
                attackFood,
                speedFood
            });
        }
    }

    io.on('connection', (socket) => {
        let skinSelection = 'classic';

        socket.on('selectSkin', (skinId) => {
            if (SNAKE_SKINS[skinId]) {
                skinSelection = skinId;
            }
        });

        socket.on('joinGame', (playerName) => {
            if (players[socket.id] && players[socket.id].alive) {
                return;
            }

            const player = createPlayer(socket.id, skinSelection);
            player.name = playerName || `Player ${Object.keys(players).length + 1}`;
            players[socket.id] = player;

            if (!food) {
                generateFood();
            }

            socket.emit('gameState', {
                players,
                food,
                specialFood,
                attackFood,
                speedFood,
                skins: SNAKE_SKINS,
                gridSize: GRID_SIZE,
                tileCount: TILE_COUNT
            });

            socket.broadcast.emit('playerJoined', {
                playerId: socket.id,
                player,
                skinSelection
            });
        });

        socket.on('setDirection', (direction) => {
            const player = players[socket.id];
            if (!player || !player.alive) return;

            const current = player.direction;
            const oppositeDirections = {
                left: 'right',
                right: 'left',
                up: 'down',
                down: 'up'
            };

            if (direction !== oppositeDirections[current]) {
                player.direction = direction;
            }
        });

        socket.on('shoot', () => {
            const player = players[socket.id];
            if (!player || !player.alive || !player.attackAbility) return;

            const now = Date.now();
            const shootingCooldown = 500;

            if (now - player.lastShotTime < shootingCooldown) return;
            player.lastShotTime = now;

            const head = player.snake[0];
            const bulletSpeed = player.speedBoost ? 2 : 1;

            player.bullets.push({
                x: head.x,
                y: head.y,
                direction: player.direction,
                speed: bulletSpeed,
                ownerId: socket.id,
                createdAt: now
            });
        });

        socket.on('disconnect', () => {
            const player = players[socket.id];
            if (player) {
                delete players[socket.id];
                io.emit('playerDisconnected', socket.id);
            }
        });
    });

    const gameLoop = setInterval(updateGame, 100);

    return {
        shutdown: () => clearInterval(gameLoop),
        getPlayers: () => players,
    };
}

module.exports = {
    createExpressApp,
    initializeGame,
};

