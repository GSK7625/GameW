const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const watchAdButton = document.getElementById('watchAdButton');
const pauseButton = document.getElementById('pauseButton');
const scoreBoard = document.getElementById('scoreBoard');
const scoreElement = document.getElementById('score');
const healthBar = document.getElementById('healthBar');
const taskBar = document.getElementById('taskBar');

const backgroundMusic = document.getElementById('backgroundMusic');
const jumpSound = document.getElementById('jumpSound');
const collisionSound = document.getElementById('collisionSound');
const gameOverSound = document.getElementById('gameOverSound');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let speedMultiplier = 1;
let gameOver = false;
let paused = false;
let bossSpawned = false;
let health = 100;
let playerBullets = [];
let bossBullets = [];
let playerPower = 1;
let spacePressed = false; // Track space key state
let achievements = [];
let buffs = {
    speed: 0,
    jump: 0
};

let player = {
    x: 50,
    y: canvas.height / 2,
    width: 50,
    height: 50,
    hitbox: { x: 10, y: 10, width: 30, height: 30 },
    speed: 5,
    dx: 0,
    dy: 0,
    direction: 0 // Angle in radians
};

let obstacles = [];
let collectibles = [];
let boss = null;
let frame = 0;
let keys = {};

// Load player image
const playerImage = new Image();
playerImage.src = 'images/player.png'; // Path to your player image

// Load background image
const background = new Image();
background.src = 'images/background.png'; // Path to your background image

// Load boss image
const bossImage = new Image();
bossImage.src = 'images/boss.png'; // Path to your boss image

const bulletWidth = 10;
const bulletHeight = 10;

// Increment score based on time
setInterval(() => {
    if (!paused && !gameOver) {
        score++;
        scoreElement.textContent = score;
    }
}, 1000); // Increase score every second

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.direction);
    ctx.drawImage(playerImage, -player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();
}

function updatePlayer() {
    let movingHorizontally = false;
    let movingVertically = false;

    if (keys['ArrowUp'] || keys['KeyW']) {
        player.dy = -player.speed;
        movingVertically = true;
    } else if (keys['ArrowDown'] || keys['KeyS']) {
        player.dy = player.speed;
        movingVertically = true;
    } else {
        player.dy = 0;
    }

    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.dx = -player.speed;
        movingHorizontally = true;
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        player.dx = player.speed;
        movingHorizontally = true;
    } else {
        player.dx = 0;
    }

    // Adjust speed when moving diagonally
    if (movingHorizontally && movingVertically) {
        player.dx *= Math.SQRT1_2; // 1 / sqrt(2)
        player.dy *= Math.SQRT1_2; // 1 / sqrt(2)
    }

    // Update direction based on movement
    if (keys['ArrowUp'] || keys['KeyW']) {
        player.direction = -Math.PI / 2;
    }
    if (keys['ArrowDown'] || keys['KeyS']) {
        player.direction = Math.PI / 2;
    }
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.direction = Math.PI;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.direction = 0;
    }

    if ((keys['ArrowUp'] || keys['KeyW']) && (keys['ArrowRight'] || keys['KeyD'])) {
        player.direction = -Math.PI / 4;
    }
    if ((keys['ArrowUp'] || keys['KeyW']) && (keys['ArrowLeft'] || keys['KeyA'])) {
        player.direction = -3 * Math.PI / 4;
    }
    if ((keys['ArrowDown'] || keys['KeyS']) && (keys['ArrowRight'] || keys['KeyD'])) {
        player.direction = Math.PI / 4;
    }
    if ((keys['ArrowDown'] || keys['KeyS']) && (keys['ArrowLeft'] || keys['KeyA'])) {
        player.direction = 3 * Math.PI / 4;
    }

    player.x += player.dx;
    player.y += player.dy;

    // Prevent player from moving out of canvas bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
}

function handleObstacles() {
    const obstacleWidth = 20;
    const obstacleHeight = 100;

    if (frame % 150 === 0) {
        const y = Math.random() * (canvas.height - obstacleHeight);
        obstacles.push({
            x: canvas.width,
            y: y,
            width: obstacleWidth,
            height: obstacleHeight,
            hitbox: { x: 0, y: 0, width: obstacleWidth, height: obstacleHeight }
        });
    }

    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].x -= (player.speed + buffs.speed) * speedMultiplier;
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            i--;
            score += 5;  // Increase score when passing an obstacle
            scoreElement.textContent = score;
        } else if (checkCollision(player, obstacles[i])) {
            health -= 10;
            updateHealthBar();
            collisionSound.play();
            if (health <= 0) {
                endGame();
            }
            obstacles.splice(i, 1);
            i--;
        }
    }
}

function handleBoss() {
    if (!bossSpawned && score >= 50) {
        bossSpawned = true;
        boss = {
            x: canvas.width - 150,
            y: Math.random() * (canvas.height - 200) + 100,
            width: 100,
            height: 100,
            hitbox: { x: 10, y: 10, width: 80, height: 80 },
            health: 200,
            maxHealth: 200,
            speed: 2,
            direction: Math.random() * 2 * Math.PI // Random initial direction
        };
    }

    if (boss) {
        // Move boss only in the right half of the screen
        let halfWidth = canvas.width / 2;
        let bossSpeed = boss.speed * (boss.health / boss.maxHealth); // Adjust speed based on health

        boss.x += bossSpeed * Math.cos(boss.direction);
        boss.y += bossSpeed * Math.sin(boss.direction);

        // Keep boss in the right half of the screen
        if (boss.x < halfWidth) {
            boss.x = halfWidth;
            boss.direction = Math.PI - boss.direction;
        }
        if (boss.x + boss.width > canvas.width) {
            boss.x = canvas.width - boss.width;
            boss.direction = Math.PI - boss.direction;
        }
        if (boss.y < 0 || boss.y + boss.height > canvas.height) {
            boss.direction = -boss.direction;
        }

        // Boss shooting
        if (frame % 100 === 0) {
            bossBullets.push({
                x: boss.x + boss.width / 2,
                y: boss.y + boss.height / 2,
                width: bulletWidth,
                height: bulletHeight,
                speed: 5,
                direction: boss.direction // Shoot in the direction boss is moving
            });
        }

        // Check collision with player
        if (checkCollision(player, boss)) {
            health -= 25;
            updateHealthBar();
            collisionSound.play();
            if (health <= 0) {
                endGame();
            }
        }
    }
}

function drawBoss() {
    if (boss) {
        ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
        ctx.fillStyle = 'red';
        ctx.fillRect(boss.x, boss.y - 10, (boss.health / boss.maxHealth) * boss.width, 5);
    }
}

function updateBullets() {
    for (let i = 0; i < playerBullets.length; i++) {
        playerBullets[i].x += playerBullets[i].speed * Math.cos(playerBullets[i].direction);
        playerBullets[i].y += playerBullets[i].speed * Math.sin(playerBullets[i].direction);
        // Check for bullet collision with obstacles
        let bulletHit = false;
        for (let j = 0; j < obstacles.length; j++) {
            if (checkCollision(playerBullets[i], obstacles[j])) {
                playerBullets.splice(i, 1);
                i--;
                bulletHit = true;
                break;
            }
        }
        if (bulletHit) continue;
        if (playerBullets[i].x > canvas.width || playerBullets[i].x < 0 || playerBullets[i].y > canvas.height || playerBullets[i].y < 0) {
            playerBullets.splice(i, 1);
            i--;
        } else if (boss && checkCollision(playerBullets[i], boss)) {
            boss.health -= 10 * playerPower;
            playerBullets.splice(i, 1);
            i--;
            if (boss.health <= 0) {
                boss = null;
                bossSpawned = false;
                score += 50;
                scoreElement.textContent = score;
            }
        }
    }

    for (let i = 0; i < bossBullets.length; i++) {
        bossBullets[i].x += bossBullets[i].speed * Math.cos(bossBullets[i].direction);
        bossBullets[i].y += bossBullets[i].speed * Math.sin(bossBullets[i].direction);
        if (bossBullets[i].x < 0 || bossBullets[i].x > canvas.width || bossBullets[i].y < 0 || bossBullets[i].y > canvas.height) {
            bossBullets.splice(i, 1);
            i--;
        } else if (checkCollision(player, bossBullets[i])) {
            health -= 10;
            updateHealthBar();
            collisionSound.play();
            if (health <= 0) {
                endGame();
            }
            bossBullets.splice(i, 1);
            i--;
        }
    }
}

function drawBullets() {
    ctx.fillStyle = 'yellow';
    for (let bullet of playerBullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }

    ctx.fillStyle = 'blue';
    for (let bullet of bossBullets) {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
}

function handleCollectibles() {
    // Collectibles logic (if needed)
}

function drawObstacles() {
    ctx.fillStyle = 'green';
    for (let obstacle of obstacles) {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
}

function drawCollectibles() {
    // Draw collectibles (if needed)
}

function drawBackground() {
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
}

function gameLoop() {
    if (gameOver || paused) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawPlayer();
    drawObstacles();
    drawCollectibles();
    drawBoss();
    drawBullets();
    updatePlayer();
    updateBullets();
    handleObstacles();
    handleBoss();
    handleCollectibles();
    frame++;
    if (frame % 500 === 0) {
        speedMultiplier += 0.1; // Increase speed every 500 frames
    }
    requestAnimationFrame(gameLoop);
}

function startGame() {
    startButton.style.display = 'none';
    watchAdButton.style.display = 'none';
    pauseButton.style.display = 'block';
    canvas.style.display = 'block';
    scoreBoard.style.display = 'block';
    healthBar.style.display = 'block';
    taskBar.style.display = 'flex';
    health = 100;
    updateHealthBar();
    frame = 0;
    score = 0;
    speedMultiplier = 1;
    gameOver = false;
    paused = false;
    bossSpawned = false;
    playerBullets = [];
    bossBullets = [];
    playerPower = 1;
    spacePressed = false; // Reset space key state
    achievements = [];
    buffs = {
        speed: 0,
        jump: 0
    };
    scoreElement.textContent = score;
    player = {
        x: 50,
        y: canvas.height / 2,
        width: 50,
        height: 50,
        hitbox: { x: 10, y: 10, width: 30, height: 30 },
        speed: 5,
        dx: 0,
        dy: 0,
        direction: 0
    };
    obstacles = [];
    collectibles = [];
    boss = null;
    gameLoop();
    backgroundMusic.play();
}

function endGame() {
    gameOver = true;
    startButton.style.display = 'block';
    watchAdButton.style.display = 'block';
    pauseButton.style.display = 'none';
    canvas.style.display = 'none';
    scoreBoard.style.display = 'none';
    healthBar.style.display = 'none';
    taskBar.style.display = 'none';
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    gameOverSound.play();
    alert('Game Over! Your score: ' + score);
}

function checkCollision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function moveLeft(isPressed) {
    keys['ArrowLeft'] = isPressed;
    keys['KeyA'] = isPressed;
}

function moveRight(isPressed) {
    keys['ArrowRight'] = isPressed;
    keys['KeyD'] = isPressed;
}

function moveUp(isPressed) {
    keys['ArrowUp'] = isPressed;
    keys['KeyW'] = isPressed;
}

function moveDown(isPressed) {
    keys['ArrowDown'] = isPressed;
    keys['KeyS'] = isPressed;
}

function shoot() {
    if (!spacePressed) {
        playerBullets.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            width: bulletWidth,
            height: bulletHeight,
            speed: 10,
            direction: player.direction
        });
        spacePressed = true; // Set space key state to pressed
    }
}

function updateHealthBar() {
    healthBar.style.width = health * 2 + 'px'; // Assuming health is out of 100
}

function watchAd() {
    alert('Watching Ad...');
    setTimeout(() => {
        alert('Ad Finished! Reviving...');
        revivePlayer();
    }, 3000); // Simulate a 3-second ad
}

function revivePlayer() {
    gameOver = false;
    startButton.style.display = 'none';
    watchAdButton.style.display = 'none';
    pauseButton.style.display = 'block';
    canvas.style.display = 'block';
    scoreBoard.style.display = 'block';
    healthBar.style.display = 'block';
    taskBar.style.display = 'flex';
    health = 100;
    updateHealthBar();
    playerBullets = [];
    bossBullets = [];
    playerPower = 1;
    player = {
        x: 50,
        y: canvas.height / 2,
        width: 50,
        height: 50,
        hitbox: { x: 10, y: 10, width: 30, height: 30 },
        speed: 5,
        dx: 0,
        dy: 0,
        direction: 0
    };
    boss = null;
    gameLoop();
    backgroundMusic.play();
}

function togglePause() {
    paused = !paused;
    if (paused) {
        backgroundMusic.pause();
    } else {
        backgroundMusic.play();
        gameLoop();
    }
}

window.addEventListener('keydown', function(e) {
    switch (e.code) {
        case 'ArrowRight':
        case 'KeyD':
            moveRight(true);
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft(true);
            break;
        case 'ArrowUp':
        case 'KeyW':
            moveUp(true);
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveDown(true);
            break;
        case 'KeyQ':
            useBuff('speed');
            break;
        case 'KeyE':
            useBuff('jump');
            break;
        case 'KeyP':
            togglePause();
            break;
        case 'Space':
            shoot();
            break;
    }
});

window.addEventListener('keyup', function(e) {
    switch (e.code) {
        case 'ArrowRight':
        case 'KeyD':
            moveRight(false);
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft(false);
            break;
        case 'ArrowUp':
        case 'KeyW':
            moveUp(false);
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveDown(false);
            break;
        case 'Space':
            spacePressed = false; // Reset space key state when released
            break;
    }