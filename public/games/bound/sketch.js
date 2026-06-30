let font;
let boxes = [];
let demoBoxes = [];
let playerX;
let score = 0;
let MODE = "MENU";
let shake = false;
let screenSlideX = 0;
let overSlideY = -150;
let scoreSlideY = 1000;
let score2SlideY = 7000;
let menuButtonSlideY = 15000;

class BouncingBox {
    constructor() {
        this.boxX = random(0, 500);
        this.boxY = random(0, 200);
        this.velX = random([-5, -1.5, 1.5, 5]);
        this.velY = random(-10, -5);
        this.boxWidth = random(20, 80);
        this.boxHeight = random(20, 80);
        this.gravity = random(0.05, 0.5);
        this.onFloor = false;
    }

    updateBox() {
        this.boxX += this.velX;
        if (this.boxX + this.boxWidth > 500 || this.boxX < 0) {
            this.velX *= -1;
        }

        this.boxY += this.velY;
        this.onFloor = false;
        if (this.boxY + this.boxHeight > 500) {
            this.boxY = 500 - this.boxHeight;
            this.velY *= -1;
            this.onFloor = true;
        }

        if (this.boxY < 0) {
            this.velY *= -0.5;
        }
        this.velY += this.gravity;
    }

    touchingPlayer(playerX) {
        return (playerX + 30 > this.boxX && playerX < this.boxX + this.boxWidth) && (this.boxY + this.boxHeight > 470);
    }

    shouldShake() {
        return this.onFloor;
    }
}

function setup() {
    createCanvas(500, 500);
    textFont("Impact");
    playerX = 250;
    for (let i = 0; i < 6; i++) {
        demoBoxes.push(new BouncingBox());
        boxes.push(new BouncingBox());
    }
}

function draw() {
    if (MODE === "MENU") {
        background(255);
        playerX = mouseX;
        if (playerX + 30 > 500) playerX = 470;
        
        demoBoxes.forEach(box => box.updateBox());
        shake = demoBoxes.some(box => box.shouldShake());
        if (shake) translate(random(-5, 5), random(-5, 5));
        
        fill(0);
        rect(0, 0, width, height);
        fill(255);
        demoBoxes.forEach(box => rect(box.boxX, box.boxY, box.boxWidth, box.boxHeight));
        rect(playerX, 470, 30, 30);
        textAlign(CENTER);
        textSize(150);
        text("BOUND", 250, 150);

        if (mouseX > 200 && mouseX < 300 && mouseY > 355 && mouseY < 405) {
            fill(255);
            rect(200, 355, 100, 50);
            fill(0);
            textSize(50);
            text("PLAY", 250, 400);
            if (mouseIsPressed) {
                MODE = "PLAYING";
                setTimeout(() => {}, 500);
            }
        } else {
            fill(255);
            textSize(50);
            text("PLAY", 250, 400);
        }
    } else if (MODE === "PLAYING") {
        background(255);
        playerX = mouseX;
        if (playerX + 30 > 500) playerX = 470;
        
        boxes.forEach(box => box.updateBox());
        shake = boxes.some(box => box.shouldShake());
        if (shake) translate(random(-5, 5), random(-5, 5));
        
        fill(0);
        rect(0, 0, width, height);
        fill(255);
        rect(playerX, 470, 30, 30);
        boxes.forEach(box => rect(box.boxX, box.boxY, box.boxWidth, box.boxHeight));
        
        score += 0.01;
        textAlign(CENTER);
        textSize(150);
        text(int(score), 250, 150);

        if (score > 5 && !boxes[5]) boxes[5] = new BouncingBox();
        if (score > 10 && !boxes[6]) boxes[6] = new BouncingBox();

        if (boxes.some(box => box.touchingPlayer(playerX))) {
            MODE = "GAME OVER";
        }
    } else if (MODE === "GAME OVER") {
        background(0, 0, 0);
        fill(255);
        textAlign(CENTER);
        textSize(100);
        text("GAME OVER", 250, 150);
        textSize(75);
        text("Score: " + int(score), 250, 250);
        textSize(50);
        text("CLICK TO RESTART", 250, 350);

        if (mouseIsPressed) {
            MODE = "MENU";
            score = 0;
            boxes = [];
            for (let i = 0; i < 6; i++) {
                boxes.push(new BouncingBox());
            }
        }
    }
}
