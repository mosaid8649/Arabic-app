#!/bin/bash
# Arabic Learning Studio - Start Script

echo ""
echo "🌙 Arabic Learning Studio"
echo "========================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -e "console.log(parseInt(process.version.slice(1)))")
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js 16+ required. Current: $(node --version)"
    exit 1
fi

# Install backend deps if needed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Install frontend deps if needed  
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Build frontend if not built
if [ ! -d "frontend/dist" ]; then
    echo "🔨 Building frontend..."
    cd frontend && npm run build && cd ..
fi

echo "🚀 Starting backend server on http://localhost:5000"
echo "🌐 Open http://localhost:5000 in your browser"
echo "   (Press Ctrl+C to stop)"
echo ""

cd backend && node src/server.js
