const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let snake = [{x: 150, y: 150}, {x: 140, y: 150}, {x: 130, y: 150}, {x: 120, y: 150}, {x: 110, y: 150}];
let dx = 10;
let dy = 0;
let foodX;
let foodY;
let score = 0;
let changingDirection = false;
let gameSpeed = 100;
let highScore = localStorage.getItem('highScore');

function clearCanvas() {
 ctx.fillStyle = 'black';
 ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnakePart(snakePart) {
 ctx.fillStyle = 'lightgreen';
 ctx.strokeStyle = 'darkgreen';
 ctx.fillRect(snakePart.x, snakePart.y, 10, 10);
 ctx.strokeRect(snakePart.x, snakePart.y, 10, 10);
}

function drawSnake() {
 snake.forEach(drawSnakePart);
}

function advanceSnake() {
 const head = {x: snake[0].x + dx, y: snake[0].y + dy};
 snake.unshift(head);
 const didEatFood = snake[0].x === foodX && snake[0].y === foodY;
 if (didEatFood) {
   score += 10;
   document.getElementById('score').innerHTML =  score;
   if (score > highScore) {
     highScore = score;
     localStorage.setItem('highScore', highScore);
     document.getElementById('highScore').innerHTML = highScore;
   }
   createFood();
 } else {
   snake.pop();
 }
}

// Apply a direction change (from keyboard, swipe, or on-screen buttons) and
// make sure the game is running so the first input also starts play.
function setDirection(dir) {
 if (!changingDirection) {
   const goingUp = dy === -10;
   const goingDown = dy === 10;
   const goingRight = dx === 10;
   const goingLeft = dx === -10;
   if (dir === 'left' && !goingRight) { dx = -10; dy = 0; changingDirection = true; }
   else if (dir === 'up' && !goingDown) { dx = 0; dy = -10; changingDirection = true; }
   else if (dir === 'right' && !goingLeft) { dx = 10; dy = 0; changingDirection = true; }
   else if (dir === 'down' && !goingUp) { dx = 0; dy = 10; changingDirection = true; }
 }
 startGame();
}

const KEYMAP = {
 ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down',
 a: 'left', w: 'up', d: 'right', s: 'down',
 A: 'left', W: 'up', D: 'right', S: 'down',
};

function onKeyDown(event) {
 const dir = KEYMAP[event.key];
 if (dir) {
   event.preventDefault(); // don't let arrow keys scroll the parent page
   setDirection(dir);
 } else if (event.key === ' ' || event.key === 'Spacebar') {
   event.preventDefault();
   togglePause();
 }
}

function randomTen(min, max) {
 return Math.round((Math.random() * (max-min) + min) / 10) * 10;
}

function createFood() {
 foodX = randomTen(0, canvas.width - 10);
 foodY = randomTen(0, canvas.height - 10);
 snake.forEach(function isFoodOnSnake(part) {
   const foodIsOnSnake = part.x == foodX && part.y == foodY;
   if (foodIsOnSnake)
     createFood();
 });
}

function drawFood() {
 ctx.fillStyle = 'red';
 ctx.fillRect(foodX, foodY, 10, 10);
}

let timeout;
let running = false;

function drawFrame() {
 clearCanvas();
 drawFood();
 drawSnake();
}

function main() {
 if (didGameEnd()) {
   running = false;
   showGameOver();
   return;
 }
 changingDirection = false;
 timeout = setTimeout(function onTick() {
   clearCanvas();
   drawFood();
   advanceSnake();
   drawSnake();
   main();
 }, gameSpeed);
}

// Begin play (idempotent — safe to call from any first input or the button).
function startGame() {
 if (running || didGameEnd()) return;
 running = true;
 main();
}

function togglePause() {
 if (didGameEnd()) return;
 if (running) {
   running = false;
   clearTimeout(timeout);
 } else {
   running = true;
   main();
 }
}

function showGameOver() {
 if (didGameEnd()) {
   ctx.fillStyle = 'white';
   ctx.font = '24px Arial';
   ctx.fillText('Game Over', canvas.width / 4, canvas.height / 2);
   ctx.fillText('Press Restart to play again', canvas.width / 4 - 30, canvas.height / 2 + 30);
 }
}

function didGameEnd() {
 for (let i = 4; i < snake.length; i++) {
   const didCollide = snake[i].x === snake[0].x && snake[i].y === snake[0].y
   if (didCollide) return true
 }
 const hitLeftWall = snake[0].x < 0;
 const hitRightWall = snake[0].x > canvas.width - 10;
 const hitToTopWall = snake[0].y < 0;
 const hitToBottomWall = snake[0].y > canvas.height - 10;
 return hitLeftWall || hitRightWall || hitToTopWall || hitToBottomWall
}

// ---- input wiring ----
window.addEventListener('keydown', onKeyDown);
// Clicking anywhere in the game gives this iframe keyboard focus (arrow keys
// otherwise go to the parent page).
window.addEventListener('pointerdown', function () { window.focus(); });

document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('pauseButton').addEventListener('click', togglePause);
document.getElementById('restartButton').addEventListener('click', function () { location.reload(); });

// On-screen d-pad (touch, and a fallback if keyboard focus is finicky).
document.querySelectorAll('[data-dir]').forEach(function (btn) {
 btn.addEventListener('click', function () { setDirection(btn.dataset.dir); });
});

// Swipe to steer on touch.
let touchStart = null;
canvas.addEventListener('touchstart', function (e) {
 const t = e.touches[0];
 touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', function (e) {
 if (!touchStart) return;
 const t = e.changedTouches[0];
 const ddx = t.clientX - touchStart.x;
 const ddy = t.clientY - touchStart.y;
 touchStart = null;
 if (Math.abs(ddx) < 18 && Math.abs(ddy) < 18) return;
 if (Math.abs(ddx) > Math.abs(ddy)) setDirection(ddx > 0 ? 'right' : 'left');
 else setDirection(ddy > 0 ? 'down' : 'up');
}, { passive: true });

// ---- init: draw a ready frame; play begins on the first input / Start ----
document.getElementById('highScore').innerHTML = highScore || 0;
createFood();
drawFrame();