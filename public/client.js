const socket = io();

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");
const historyEl = document.getElementById("history");

let symbol = "";
let myTurn = false;
let gameOver = false;
let history = [];

function createBoard() {
  boardEl.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.index = i;
    cell.addEventListener("click", () => {
      if (!gameOver && myTurn && cell.textContent === "") {
        socket.emit("make-move", i);
      }
    });
    boardEl.appendChild(cell);
  }
}

function addToHistory(result) {
  history.push(result);
  historyEl.innerHTML = "<h3>Match History:</h3><ul>" +
    history.map(item => `<li>${item}</li>`).join("") + "</ul>";
}

socket.on("player-assigned", (s) => {
  symbol = s;
  myTurn = (symbol === "X");
  statusEl.textContent = `You are ${symbol}. ${myTurn ? "Your turn" : "Waiting..."}`;
  createBoard();
});

socket.on("board-update", ({ board, currentTurn }) => {
  const cells = document.querySelectorAll(".cell");
  board.forEach((val, i) => {
    cells[i].textContent = val || "";
  });
  myTurn = (symbol === currentTurn);
  if (!gameOver) {
    statusEl.textContent = myTurn ? "Your turn" : "Opponent's turn";
  }
});

socket.on("you-win", () => {
  statusEl.textContent = "🎉 You Win!";
  addToHistory("You Won");
  gameOver = true;
  restartBtn.style.display = "inline-block";
});

socket.on("you-lose", () => {
  statusEl.textContent = "😞 You Lose.";
  addToHistory("You Lost");
  gameOver = true;
  restartBtn.style.display = "inline-block";
});

socket.on("game-draw", () => {
  statusEl.textContent = "🤝 It's a draw!";
  addToHistory("Draw");
  gameOver = true;
  restartBtn.style.display = "inline-block";
});

socket.on("game-restart", ({ board, currentTurn: turn }) => {
  const cells = document.querySelectorAll(".cell");
  board.forEach((val, i) => {
    cells[i].textContent = val || "";
  });
  gameOver = false;
  restartBtn.style.display = "none";
  restartBtn.disabled = false;
  myTurn = (symbol === turn);
  statusEl.textContent = myTurn ? "Your turn" : "Opponent's turn";
});

socket.on("player-left", () => {
  statusEl.textContent = "Opponent left. Refresh to restart.";
  boardEl.innerHTML = "";
  gameOver = true;
});

socket.on("room-full", () => {
  statusEl.textContent = "Room full. Try again later.";
});

restartBtn.addEventListener("click", () => {
  socket.emit("restart-request");
  statusEl.textContent = "Waiting for opponent to restart...";
  restartBtn.disabled = true;
});
