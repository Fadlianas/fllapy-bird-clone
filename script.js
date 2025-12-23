const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.25;
const JUMP = -4.5;
const PIPE_SPEED = 2;
const PIPE_SPAWN_RATE = 120; // Frames
const PIPE_GAP = 140;

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (bird) bird.x = window.innerWidth * 0.3; // Update bird position on resize
}
// Game State
let frames = 0;
let score = 0;
let gameState = 'START'; // START, PLAYING, GAMEOVER
let animationId;

// Elements
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const bestScoreValElement = document.getElementById('best-score-val');
const finalBestScoreElement = document.getElementById('final-best-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Avatar Selection
const avatarOptions = document.querySelectorAll('.avatar-option');

avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Remove selected class from all
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        // Add to clicked
        option.classList.add('selected');
        // Update bird color
        bird.color = option.getAttribute('data-color');
    });
});
const themeToggle = document.getElementById('theme-toggle');

// Background Gradients
const bgGradients = [
    'linear-gradient(135deg, #74b9ff, #a29bfe)', // Default
    'linear-gradient(135deg, #55efc4, #81ecec)', // Mint
    'linear-gradient(135deg, #ff7675, #fab1a0)', // Peach/Red
    'linear-gradient(135deg, #fdcb6e, #ffeaa7)', // Yellow
    'linear-gradient(135deg, #a29bfe, #6c5ce7)', // Purple
];

const bgGradientsDark = [
    'linear-gradient(135deg, #2d3436, #000000)', // Default Dark
    'linear-gradient(135deg, #0f3443, #004e2eff)', // Dark Greenish
    'linear-gradient(135deg, #232526, #414345)', // Grayish
    'linear-gradient(135deg, #4b134f, #6e1e1eff)', // Dark Red/Purple
    'linear-gradient(135deg, #141E30, #243B55)', // Deep Blue
];

// Background System
const bgSystem = {
    stars: [],
    clouds: [],

    init: function () {
        // Init stars
        for (let i = 0; i < 50; i++) {
            this.stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2 + 1,
                blink: Math.random()
            });
        }
        // Init clouds
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * (window.innerHeight / 2),
                speed: Math.random() * 0.5 + 0.2,
                size: Math.random() * 40 + 40
            });
        }
    },

    draw: function () {
        const isDark = document.body.classList.contains('dark-mode');

        if (isDark) {
            // Stars
            ctx.fillStyle = '#fff';
            this.stars.forEach(star => {
                ctx.globalAlpha = Math.abs(Math.sin(frames * 0.05 + star.blink));
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        } else {
            // Clouds
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.clouds.forEach(cloud => {
                cloud.x -= cloud.speed;
                if (cloud.x + cloud.size * 2 < 0) cloud.x = window.innerWidth + cloud.size;

                // Simple cloud shape (3 circles)
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
                ctx.arc(cloud.x - cloud.size * 0.5, cloud.y + cloud.size * 0.2, cloud.size * 0.7, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloud.size * 0.5, cloud.y + cloud.size * 0.2, cloud.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            });
        }
    }
};
bgSystem.init();

// Load Best Score
let bestScore = localStorage.getItem('flappyBestScore') || 0;
bestScoreValElement.innerText = bestScore;

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.innerText = isDark ? '☀️' : '🌙';

    // Update background immediately if mid-game
    if (score > 0) {
        changeBackground();
    } else {
        // Reset to default for the mode if at start
        document.body.style.background = '';
    }
});

// Bird Object
const bird = {
    x: 50, // Initial, overridden by reset/resize
    y: 150,
    w: 30,
    h: 30,
    radius: 12,
    velocity: 0, // Keep this one
    color: '#fab1a0', // Default color

    draw: function () {
        ctx.save();

        // Soft glow in dark mode
        if (document.body.classList.contains('dark-mode')) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        }

        // Beak (Draw FIRST so it looks connected/behind the front curve)
        const eyeX = this.x + this.w / 2 + 6;
        const eyeY = this.y + this.h / 2 - 4;

        ctx.fillStyle = '#fdcb6e';
        ctx.beginPath();
        // Start from inside the body
        ctx.moveTo(this.x + this.w / 2 + 5, eyeY + 4);
        ctx.lineTo(this.x + this.w / 2 + 20, eyeY + 8); // Tip
        ctx.lineTo(this.x + this.w / 2 + 5, eyeY + 12);
        ctx.fill();

        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        ctx.restore();

        // Eye White
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pupil (moves slightly with velocity)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        let pupilY = eyeY;
        if (this.velocity < 0) pupilY -= 1; // Look up when jumping
        if (this.velocity > 0) pupilY += 1; // Look down when falling
        ctx.arc(eyeX + 2, pupilY, 2, 0, Math.PI * 2);
        ctx.fill();

        // Expressions (Eyebrows) based on color
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        if (this.color === '#fab1a0' || this.color === '#ff7675') {
            // Angry/Determined (Red/Peach)
            ctx.moveTo(eyeX - 4, eyeY - 6);
            ctx.lineTo(eyeX + 4, eyeY - 3);
        } else if (this.color === '#74b9ff' || this.color === '#a29bfe') {
            // Calm/Chill (Blue/Purple) - Flat brow
            ctx.moveTo(eyeX - 4, eyeY - 5);
            ctx.lineTo(eyeX + 4, eyeY - 5);
        } else if (this.color === '#55efc4') {
            // Happy (Mint) - Arched high
            ctx.arc(eyeX, eyeY - 6, 4, Math.PI, 0);
        } else {
            // Neutral/Surprised (Yellow) - Small arch
            ctx.moveTo(eyeX - 2, eyeY - 6);
            ctx.lineTo(eyeX + 2, eyeY - 6);
        }
        ctx.stroke();
    },

    update: function () {
        this.velocity += GRAVITY;
        this.y += this.velocity;

        // Floor collision
        if (this.y + this.h >= canvas.height) {
            this.y = canvas.height - this.h;
            gameOver();
        }

        // Ceiling collision
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },

    jump: function () {
        this.velocity = JUMP;
    },

    reset: function () {
        this.y = window.innerHeight / 2; // Start in middle of height
        this.x = window.innerWidth * 0.3; // Start 30% across
        this.velocity = 0;
    }
}

// Initial Canvas Resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Pipes
const pipes = {
    items: [],

    draw: function () {
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];

            ctx.fillStyle = '#a29bfe'; // Pipe color

            // Top pipe body
            ctx.fillRect(p.x, 0, p.w, p.top);
            // Bottom pipe body
            ctx.fillRect(p.x, canvas.height - p.bottom, p.w, p.bottom);

            // Pipe Lips
            ctx.fillStyle = '#8e87e0';
            ctx.fillRect(p.x - 2, p.top - 20, p.w + 4, 20); // Top lip
            ctx.fillRect(p.x - 2, canvas.height - p.bottom, p.w + 4, 20); // Bottom lip

            // Grass/Moss on ledges
            ctx.fillStyle = '#55efc4'; // Minty grass
            // Top pipe grass (hanging down)
            ctx.beginPath();
            ctx.moveTo(p.x - 2, p.top);
            for (let j = 0; j < p.w + 4; j += 5) {
                ctx.lineTo(p.x - 2 + j, p.top + 5 + Math.random() * 5);
                ctx.lineTo(p.x - 2 + j + 2.5, p.top);
            }
            ctx.fill();

            // Bottom pipe grass (growing up)
            ctx.beginPath();
            ctx.moveTo(p.x - 2, canvas.height - p.bottom);
            for (let j = 0; j < p.w + 4; j += 5) {
                ctx.lineTo(p.x - 2 + j, canvas.height - p.bottom - 5 - Math.random() * 5);
                ctx.lineTo(p.x - 2 + j + 2.5, canvas.height - p.bottom);
            }
            ctx.fill();

            // Simple decorations (flowers)
            if (i % 2 === 0) {
                ctx.fillStyle = '#ff7675';
                ctx.beginPath();
                ctx.arc(p.x + p.w / 2, p.top - 30, 4, 0, Math.PI * 2); // Top flower
                ctx.fill();
            } else {
                ctx.fillStyle = '#ffeaa7';
                ctx.beginPath();
                ctx.arc(p.x + p.w / 2, canvas.height - p.bottom + 30, 4, 0, Math.PI * 2); // Bottom flower
                ctx.fill();
            }
        }
    },

    update: function () {
        // Add new pipe
        if (frames % PIPE_SPAWN_RATE === 0) {
            // Calculate random positions
            // Min pipe height
            const minHeight = 50;
            // Available space for top pipe
            const maxTop = canvas.height - PIPE_GAP - minHeight;
            const topHeight = Math.floor(Math.random() * (maxTop - minHeight + 1) + minHeight);

            this.items.push({
                x: canvas.width,
                w: 50,
                top: topHeight,
                bottom: canvas.height - PIPE_GAP - topHeight,
                passed: false
            });
        }

        // Move pipes
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            p.x -= PIPE_SPEED;

            // Collision detection
            if (
                bird.x + bird.w > p.x &&
                bird.x < p.x + p.w &&
                (bird.y < p.top || bird.y + bird.h > canvas.height - p.bottom)
            ) {
                gameOver();
            }

            // Score update
            if (p.x + p.w < bird.x && !p.passed) {
                score++;
                scoreElement.innerText = score;
                p.passed = true;

                // Change background every 5 points
                if (score > 0 && score % 5 === 0) {
                    changeBackground();
                }
            }

            // Remove off-screen pipes
            if (p.x + p.w < 0) {
                this.items.shift();
                i--;
            }
        }
    },

    reset: function () {
        this.items = [];
    }
}

// Game Loop
function loop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw and update
    bgSystem.draw();
    pipes.draw();
    if (gameState === 'PLAYING') pipes.update();

    bird.draw();
    if (gameState === 'PLAYING') bird.update();

    // Ground effect (simple line for now)
    ctx.fillStyle = '#6c5ce7';
    ctx.fillRect(0, canvas.height - 10, canvas.width, 10);

    frames++;
    if (gameState === 'PLAYING') {
        animationId = requestAnimationFrame(loop);
    } else {
        // If not playing, still render but don't update physics continuously
        // actually we want to stop loop on game over, but keep drawing.
        // For 'START' we can just draw once or keep looping idle.
        // Let's keep looping for idle animations if we add them later.
        animationId = requestAnimationFrame(loop);
    }
}

function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    bird.reset();
    pipes.reset();
    score = 0;
    frames = 0;
    scoreElement.innerText = score;
    // Reset background to default if needed, or keep current.
    // Let's reset to default for consistency or let it stay?
    // Usually games reset the environment.
    document.body.style.background = ''; // Resets to CSS var
}

function gameOver() {
    gameState = 'GAMEOVER';
    finalScoreElement.innerText = score;

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappyBestScore', bestScore);
        bestScoreValElement.innerText = bestScore;
    }
    finalBestScoreElement.innerText = bestScore;

    gameOverScreen.classList.add('active');
}

function changeBackground() {
    const isDark = document.body.classList.contains('dark-mode');

    // Pick a random gradient from the list or cycle through
    const level = Math.floor(score / 5);

    // Use modulo with correct array length
    const gradientList = isDark ? bgGradientsDark : bgGradients;
    const index = level % gradientList.length;

    // Change background
    document.body.style.background = gradientList[index];
}

// Controls
window.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent scrolling
        if (gameState === 'PLAYING') {
            bird.jump();
        } else if (gameState === 'START') {
            startGame();
        } else if (gameState === 'GAMEOVER') {
            startGame();
        }
    }
});

canvas.addEventListener('click', function () {
    if (gameState === 'PLAYING') bird.jump();
});

// Button Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial Draw
loop();
