const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));

let players = {};
let currentTurn = "X";
let board = Array(9).fill(null);
let restartVotes = new Set();

// Check win function
function checkWin(board, symbol) {
  const winCombos = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6],
  ];
  return winCombos.some(combo => combo.every(i => board[i] === symbol));
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Assign player
  if (Object.keys(players).length < 2) {
    const symbol = Object.values(players).includes("X") ? "O" : "X";
    players[socket.id] = symbol;
    socket.emit("player-assigned", symbol);
  } else {
    socket.emit("room-full");
    return;
  }

  // Handle move
  socket.on("make-move", (index) => {
    if (board[index] || players[socket.id] !== currentTurn) return;

    const symbol = players[socket.id];
    board[index] = symbol;

    if (checkWin(board, symbol)) {
      io.to(socket.id).emit("you-win");
      const opponentId = Object.keys(players).find(id => id !== socket.id);
      if (opponentId) io.to(opponentId).emit("you-lose");

      board = Array(9).fill(null);
      currentTurn = "X";
      return;
    }

    if (board.every(cell => cell !== null)) {
      io.emit("game-draw");
      board = Array(9).fill(null);
      currentTurn = "X";
      return;
    }

    currentTurn = currentTurn === "X" ? "O" : "X";
    io.emit("board-update", { board, currentTurn });
  });

  // Handle restart
  socket.on("restart-request", () => {
    restartVotes.add(socket.id);

    if (restartVotes.size === 2) {
      board = Array(9).fill(null);
      currentTurn = "X";
      restartVotes.clear();

      io.emit("game-restart", { board, currentTurn });
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    delete players[socket.id];
    restartVotes.clear();
    board = Array(9).fill(null);
    currentTurn = "X";
    io.emit("player-left");
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
