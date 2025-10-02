#!/bin/bash

# Clear Python environment variables that might interfere
unset PYTHONHOME
unset PYTHONPATH

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Snake Game Server...${NC}\n"

# Get local IP address
IP=$(hostname -I | awk '{print $1}')

# Port to use
PORT=33337

echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}Snake Game is now running!${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""
echo -e "Access from this machine:"
echo -e "  ${YELLOW}http://localhost:${PORT}${NC}"
echo ""
echo -e "Access from other devices on the same network:"
echo -e "  ${YELLOW}http://${IP}:${PORT}${NC}"
echo ""
echo -e "${BLUE}===========================================${NC}"
echo ""
echo -e "Press ${YELLOW}Ctrl+C${NC} to stop the server"
echo ""

# Start Python HTTP server
/usr/bin/python3 -m http.server $PORT --bind 0.0.0.0
