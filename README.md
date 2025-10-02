# 🐍 Multiplayer Snake Game

A real-time multiplayer snake game with power-ups and a larger playing field!

## Features

### Game Board
- **30x30 grid** (900x900 pixels) - Much bigger playing space
- Clean, modern UI with gradient background
- Smooth animations and effects
- **Mobile-friendly** - Fully responsive with touch controls

### Multiplayer
- **Real-time multiplayer** - Play with friends on the same network
- Up to 8 players with different colors
- Live leaderboard showing all players' scores
- See other players' snakes in real-time

### Gameplay
- **8-directional movement** - Move in all directions including diagonals
- **Regular food** - Red circles worth 10 points
- **Special food** - Golden stars worth 50 points
- **Power-up system** - Invincibility for 10 seconds!

### Power-Up Effects (Golden Star)
- 🛡️ **Invincibility** - Can't die for 10 seconds
- 🌀 **Wall wrapping** - Pass through walls to the other side
- 👻 **Phase through** - Pass through yourself and other players
- 🔴 **Red blinking** - Visual indicator of invincibility
- ⭐ **Bonus points** - +50 points

### Player Colors
Each player gets a unique color:
- Green, Blue, Orange, Yellow, Cyan, Pink, Purple, Mint

## Controls

### Desktop (Keyboard)
- **Arrow Keys** or **WASD** - Move in 4 directions (up, down, left, right)
- **Q** - Move diagonally up-left ↖️
- **E** - Move diagonally up-right ↗️
- **Z** - Move diagonally down-left ↙️
- **C** - Move diagonally down-right ↘️

### Mobile (Touch)
- **D-Pad Controls** - Touch directional buttons to control snake (8 directions)
- **Swipe Gestures** - Swipe on the game canvas in any of 8 directions
- **Responsive Design** - Automatically adapts to your screen size

## How to Start

### Quick Start
```bash
cd /home/kurniarahmat/Workspace/single_page_snake_game
./start-multiplayer.sh
```

The server will automatically:
1. Install dependencies if needed
2. Start the multiplayer server
3. Display access URLs

### Access the Game

**From this machine:**
- http://localhost:8000

**From other devices on the network (including mobile):**
- http://192.168.1.187:8000
- http://10.8.0.95:8000
  (Use the IP address shown when server starts)

### Stop the Server
Press `Ctrl+C` in the terminal

## Game Files

- `multiplayer.html` - Multiplayer game client
- `server.js` - Node.js WebSocket server
- `index.html` - Single-player version (classic)
- `start-multiplayer.sh` - Start multiplayer server
- `start.sh` - Start single-player version

## Requirements

- Node.js (for multiplayer)
- Modern web browser
- All devices must be on the same network

## Technical Details

- **Backend**: Node.js with Express and Socket.IO
- **Frontend**: Vanilla JavaScript with HTML5 Canvas
- **Real-time communication**: WebSocket (Socket.IO)
- **Game loop**: Server-side at 10 FPS (100ms intervals)
- **Rendering**: Client-side at 20 FPS (50ms intervals)

## Game Rules

1. Eat red food to grow and score 10 points
2. Eat golden stars to get invincibility and score 50 points
3. Avoid walls and other snakes (unless invincible)
4. Golden stars appear randomly (15% chance after eating food)
5. Golden stars disappear after 10 seconds if not eaten
6. Invincibility lasts 10 seconds after eating a golden star
7. When you die, you can refresh to rejoin
8. Compete for the highest score on the leaderboard!

## Tips & Strategy

- Use diagonal movement to navigate faster
- Collect golden stars for safe exploration
- During invincibility, you can pass through everything
- Use wall wrapping during power-ups to surprise opponents
- Watch the leaderboard to see who's winning
- Your snake has a yellow border so you can identify it easily

## Troubleshooting

**Server won't start:**
- Make sure Node.js is installed: `node --version`
- Check if port 8000 is available
- Try: `npm install` to reinstall dependencies

**Can't connect from other devices:**
- Make sure all devices are on the same WiFi network
- Check firewall settings
- Use the IP address shown when server starts

**Game feels laggy:**
- Server updates at 100ms intervals (normal)
- Check your network connection
- Fewer players = smoother gameplay

## Single Player Mode

To play the original single-player version:
```bash
./start.sh
```

This runs a simple HTTP server without multiplayer features.

## Mobile Tips

- **Portrait or Landscape** - Works in any orientation
- **Add to Home Screen** - On iOS/Android, add to home screen for full-screen experience
- **Touch Controls** - Use the on-screen D-pad or swipe gestures
- **Network Requirements** - Make sure your mobile device is on the same WiFi as the server

## How to Connect Mobile Device

1. Start the server on your computer: `./start-multiplayer.sh`
2. Note the network IP address (e.g., http://192.168.1.187:8000)
3. On your phone/tablet, connect to the same WiFi network
4. Open the browser and enter the IP address
5. Start playing with touch controls!

Enjoy the game! 🐍🎮📱
