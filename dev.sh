#!/bin/bash
# Development mode - starts backend + frontend dev server with hot reload

echo ""
echo "🌙 Arabic Learning Studio — Dev Mode"
echo "====================================="
echo ""
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000  (with hot reload)"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Function to kill child processes on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill 0
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
cd backend && node src/server.js &
BACKEND_PID=$!
echo "✅ Backend started (pid $BACKEND_PID)"

# Wait for backend to be ready
sleep 2

# Start frontend dev server
cd ../frontend && npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (pid $FRONTEND_PID)"

# Wait for both
wait
