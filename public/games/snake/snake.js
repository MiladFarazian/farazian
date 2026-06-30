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

function changeDirection(event) {
 const LEFT_KEY = 37;
 const RIGHT_KEY = 39;
 const UP_KEY = 38;
 const DOWN_KEY = 40;
 
 if (changingDirection) return;
 changingDirection = true;
 
 const keyPressed = event.keyCode;
 const goingUp = dy === -10;
 const goingDown = dy === 10;
 const goingRight = dx === 10;
 const goingLeft = dx === -10;
 
 if (keyPressed === LEFT_KEY && !goingRight) {
   dx = -10;
   dy = 0;
 }
 if (keyPressed === UP_KEY && !goingDown) {
   dx = 0;
   dy = -10;
 }
 if (keyPressed === RIGHT_KEY && !goingLeft) {
   dx = 10;
   dy = 0;
 }
 if (keyPressed === DOWN_KEY && !goingUp) {
   dx = 0;
   dy = 10;
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

let timeout; // Define timeout variable globally
function main() {
 if (didGameEnd()) return;
 
 changingDirection = false;
 timeout = setTimeout(function onTick() { // Assign the timeout to the global variable
   clearCanvas();
   drawFood();
   advanceSnake();
   drawSnake();
   main();
 }, gameSpeed);
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

document.addEventListener("keydown", changeDirection);
document.getElementById('startButton').addEventListener('click', main);
document.getElementById('pauseButton').addEventListener('click', function() { clearTimeout(timeout); changingDirection = false; }); // Now using the defined timeout variable
document.getElementById('restartButton').addEventListener('click', function() { location.reload(); });

createFood();
main();

createFood();
main();