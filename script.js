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
    if (typeof birds !== 'undefined') {
        birds.forEach(bird => {
            bird.x = window.innerWidth * 0.3;
        });
    }
}
// Game State
let frames = 0;
let score = 0;
let gameState = 'START'; // START, PLAYING, GAMEOVER
let visualMode = 'MINIMALIST'; // MINIMALIST, REALISTIC
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

// Mode Selection
const modeBtns = document.querySelectorAll('.mode-btn');

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        visualMode = btn.getAttribute('data-mode');
        btn.blur(); // Remove focus so Space doesn't trigger it
    });
});

// Avatar Selection
// Avatar Selection
const p1Options = document.querySelectorAll('#p1-selection .avatar-option');
const p2Options = document.querySelectorAll('#p2-selection .avatar-option');

function setupAvatarSelection(options) {
    options.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from siblings only
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
}

setupAvatarSelection(p1Options);
setupAvatarSelection(p2Options);
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

// Particle System
class Particle {
    constructor(x, y, color, type) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type; // 'TRAIL', 'SPARKLE'
        this.size = Math.random() * 3 + 2;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.life = 1.0; // Alpha/Life
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let particles = [];

// Background System
const bgSystem = {
    stars: [],
    clouds: [],
    mountains: [],

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
        // Init clouds - Better shapes
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * (window.innerHeight * 0.6),
                speed: Math.random() * 0.3 + 0.1,
                size: Math.random() * 60 + 50,
                opacity: Math.random() * 0.3 + 0.4
            });
        }
        // Init Mountains (Parallax)
        for (let i = 0; i < 3; i++) {
            this.mountains.push({
                x: i * window.innerWidth * 0.5,
                height: 100 + Math.random() * 150,
                width: window.innerWidth * 0.6
            });
        }
    },

    draw: function () {
        if (visualMode === 'MINIMALIST') return;

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
            // Clouds - Fluffier
            this.clouds.forEach(cloud => {
                cloud.x -= cloud.speed;
                if (cloud.x + cloud.size * 2 < 0) cloud.x = window.innerWidth + cloud.size;

                ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
                ctx.arc(cloud.x - cloud.size * 0.6, cloud.y + cloud.size * 0.3, cloud.size * 0.7, 0, Math.PI * 2);
                ctx.arc(cloud.x + cloud.size * 0.6, cloud.y + cloud.size * 0.3, cloud.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
            });

            // Parallax Mountains (Only in Realistic Mode)
            if (visualMode === 'REALISTIC') {
                ctx.fillStyle = 'rgba(100, 100, 150, 0.2)';
                this.mountains.forEach((mtn, index) => {
                    // Move slowly
                    mtn.x -= 0.5;
                    if (mtn.x + mtn.width < 0) mtn.x = window.innerWidth;

                    ctx.beginPath();
                    ctx.moveTo(mtn.x, canvas.height);
                    ctx.lineTo(mtn.x + mtn.width / 2, canvas.height - mtn.height);
                    ctx.lineTo(mtn.x + mtn.width, canvas.height);
                    ctx.fill();
                });
            }
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

    // Update background immediately if mid-game and Minimalist
    if (score > 0 && visualMode === 'MINIMALIST') {
        changeBackground();
    } else if (visualMode === 'MINIMALIST') {
        // Reset to default for the mode if at start
        document.body.style.background = '';
    }
});

// Bird Class
class Bird {
    constructor(x, y, color, controls) {
        this.x = x;
        this.y = y;
        this.w = 24; // Matched to radius 12 * 2
        this.h = 24;
        this.radius = 12;
        this.velocity = 0;
        this.color = color;
        this.controls = controls; // 'SPACE', 'ZERO', etc.
        this.alive = true;
        this.score = 0;
    }

    draw() {
        if (!this.alive && this.y > canvas.height - 20) return;

        ctx.save();

        // Translate to bird center for rotation
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);

        // Rotate based on velocity
        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(rotation);

        // Soft glow in dark mode
        if (document.body.classList.contains('dark-mode')) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
        }

        // Body Gradient (3D Effect)
        let bodyGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, this.radius);
        bodyGrad.addColorStop(0, '#fff'); // Highlight
        bodyGrad.addColorStop(0.3, this.color);
        bodyGrad.addColorStop(1, this.color); // Darken edge if needed, or simple color

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Wing (Simple Flap)
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        if (this.velocity < 0) {
            // Flap down (flying up)
            ctx.ellipse(-5, 5, 8, 5, Math.PI / 4, 0, Math.PI * 2);
        } else {
            // Flap up (falling)
            ctx.ellipse(-5, -2, 8, 5, -Math.PI / 4, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.globalAlpha = 1;

        // Beak
        ctx.fillStyle = '#fdcb6e';
        ctx.beginPath();
        ctx.moveTo(8, -4);
        ctx.lineTo(22, 0); // Tip
        ctx.lineTo(8, 4);
        ctx.fill();

        // Eye White
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(8, -6, 7, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        let pupilY = -6;
        // Pupil follow physics slightly
        pupilY += this.velocity * 0.5;
        ctx.arc(10, pupilY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrow Expression
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Determine offset based on color (simplified logic from before)
        // Just generic determined look for now
        ctx.moveTo(6, -10);
        ctx.lineTo(14, -7);
        ctx.stroke();

        ctx.restore();
    }

    update() {
        if (!this.alive) {
            // If dead, maybe fall to ground and stay there?
            if (this.y + this.h < canvas.height - 10) { // -10 for ground
                this.velocity += GRAVITY;
                this.y += this.velocity;
            }
            return;
        }

        this.velocity += GRAVITY;
        this.y += this.velocity;

        // Floor collision
        if (this.y + this.h >= canvas.height) {
            this.y = canvas.height - this.h;
            this.die();
        }

        // Ceiling collision
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }

    jump() {
        if (this.alive) {
            this.velocity = JUMP;
            // Spawn particles
            for (let i = 0; i < 5; i++) {
                particles.push(new Particle(this.x, this.y + this.h / 2, 'rgba(255,255,255,0.6)', 'TRAIL'));
            }
        }
    }

    die() {
        if (this.alive) {
            this.alive = false;
            checkGameOver();
        }
    }

    reset(x, y) {
        this.x = x || window.innerWidth * 0.3;
        this.y = y || window.innerHeight / 2;
        this.velocity = 0;
        this.alive = true;
        this.score = 0;
    }
}

// Game State Management
let birds = [];
let gameMode = 'SINGLE'; // SINGLE, MULTI

// Init Birds
function initBirds() {
    birds = [];
    // P1
    const p1Color = document.querySelector('.avatar-option.selected')?.getAttribute('data-color') || '#fab1a0';
    birds.push(new Bird(window.innerWidth * 0.3, window.innerHeight / 2, p1Color, 'SPACE'));

    if (gameMode === 'MULTI') {
        // P2 - Use a contrasting color or default
        // Let's give P2 a distinct color for now, maybe allowing selection later?
        // Defaulting P2 to Mint if P1 isn't Mint, else Purple
        let p2Color = '#55efc4';
        if (p1Color === '#55efc4') p2Color = '#a29bfe';

        birds.push(new Bird(window.innerWidth * 0.3, window.innerHeight / 2, p2Color, 'ZERO'));
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

            // Pipe Body Gradient (Cylindrical look for ALL modes)
            const gradient = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
            gradient.addColorStop(0, '#2ecc71');
            gradient.addColorStop(0.5, '#55efc4'); // Highlight middle
            gradient.addColorStop(1, '#27ae60'); // Shadow edge

            ctx.fillStyle = gradient;

            // Top pipe body
            ctx.fillRect(p.x, 0, p.w, p.top);
            // Bottom pipe body
            ctx.fillRect(p.x, canvas.height - p.bottom, p.w, p.bottom);

            // Pipe Caps (Darker gradient)
            const capGradient = ctx.createLinearGradient(p.x - 2, 0, p.x + p.w + 4, 0);
            capGradient.addColorStop(0, '#27ae60');
            capGradient.addColorStop(0.5, '#2ecc71');
            capGradient.addColorStop(1, '#1e8449');

            ctx.fillStyle = capGradient;
            ctx.fillRect(p.x - 2, p.top - 24, p.w + 4, 24); // Top Cap
            ctx.fillRect(p.x - 2, canvas.height - p.bottom, p.w + 4, 24); // Bottom Cap

            // Details only for REALISTIC mode
            if (visualMode === 'REALISTIC') {
                // Grass/Moss on ledges
                ctx.fillStyle = '#55efc4'; // Minty grass
                // Top pipe grass (hanging down)
                ctx.beginPath();
                ctx.moveTo(p.x - 2, p.top);
                for (let j = 0; j < p.w + 4; j += 6) {
                    ctx.lineTo(p.x - 2 + j, p.top + 8 + Math.random() * 6);
                    ctx.lineTo(p.x - 2 + j + 3, p.top);
                }
                ctx.fill();

                // Bottom pipe grass (growing up)
                ctx.beginPath();
                ctx.moveTo(p.x - 2, canvas.height - p.bottom);
                for (let j = 0; j < p.w + 4; j += 6) {
                    ctx.lineTo(p.x - 2 + j, canvas.height - p.bottom - 8 - Math.random() * 6);
                    ctx.lineTo(p.x - 2 + j + 3, canvas.height - p.bottom);
                }
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
                passed: [] // Array of bird indices that passed this pipe
            });
        }

        // Move pipes
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            p.x -= PIPE_SPEED;

            // Collision & Score for EACH bird
            birds.forEach((bird, birdIndex) => {
                if (!bird.alive) return;

                // Collision detection
                if (
                    bird.x + bird.w > p.x &&
                    bird.x < p.x + p.w &&
                    (bird.y < p.top || bird.y + bird.h > canvas.height - p.bottom)
                ) {
                    bird.die();
                }

                // Score update
                if (p.x + p.w < bird.x && !p.passed.includes(birdIndex)) {
                    bird.score++;
                    p.passed.push(birdIndex);

                    // Update UI Score (Use best/highest current score or generic)
                    updateScoreDisplay();

                    // Change background logic (based on highest score or specific bird?)
                    // Let's use the max score for background changes
                    const maxScore = Math.max(...birds.map(b => b.score));
                    if (visualMode === 'MINIMALIST' && maxScore > 0 && maxScore % 5 === 0) {
                        changeBackground(maxScore);
                    }
                }
            });

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

function updateScoreDisplay() {
    if (gameMode === 'SINGLE') {
        score = birds[0] ? birds[0].score : 0;
        scoreElement.innerText = score;
        // Hide P2 score if exists?
        // We will layout score better later.
    } else {
        // Multi mode score display
        // Example: "10 | 5"
        const scores = birds.map(b => b.score).join(' | ');
        scoreElement.innerText = scores;
    }
}

// Game Loop
function loop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw and update
    bgSystem.draw();

    // Update Particles
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }

    pipes.draw();
    if (gameState === 'PLAYING') pipes.update();

    birds.forEach(bird => {
        bird.draw();
        if (gameState === 'PLAYING') bird.update();
    });

    // Ground effect
    // Gradient ground
    const grd = ctx.createLinearGradient(0, canvas.height - 15, 0, canvas.height);
    grd.addColorStop(0, '#6c5ce7');
    grd.addColorStop(1, '#a29bfe');
    ctx.fillStyle = grd;
    ctx.fillRect(0, canvas.height - 15, canvas.width, 15);

    frames++;
    if (gameState === 'PLAYING' || gameState === 'GAMEOVER') {
        animationId = requestAnimationFrame(loop);
    } else {
        animationId = requestAnimationFrame(loop);
    }
}

function startGame() {
    // Determine mode from UI (to be added) or default
    // For now, let's trust the global gameMode variable is set by UI

    initBirds(); // Re-init birds based on mode

    gameState = 'PLAYING';
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');

    pipes.reset();
    frames = 0;

    updateScoreDisplay();

    // Reset background to default if needed
    document.body.style.background = ''; // Resets to CSS var (default)
}

function checkGameOver() {
    // Game over if ALL birds are dead
    const allDead = birds.every(b => !b.alive);
    if (allDead) {
        gameOver();
    }
}

function gameOver() {
    gameState = 'GAMEOVER';

    // Determine stats
    let scores = birds.map(b => b.score);
    let maxScore = Math.max(...scores);

    finalScoreElement.innerText = gameMode === 'MULTI' ? scores.join(' - ') : maxScore;

    if (maxScore > bestScore) {
        bestScore = maxScore;
        localStorage.setItem('flappyBestScore', bestScore);
        bestScoreValElement.innerText = bestScore;
    }
    finalBestScoreElement.innerText = bestScore;

    gameOverScreen.classList.add('active');
}

function changeBackground(currentScore) {
    const isDark = document.body.classList.contains('dark-mode');

    // Pick a random gradient from the list or cycle through
    const level = Math.floor(currentScore / 5);

    // Use modulo with correct array length
    const gradientList = isDark ? bgGradientsDark : bgGradients;
    const index = level % gradientList.length;

    // Change background
    document.body.style.background = gradientList[index];
}

// Controls
window.addEventListener('keydown', function (e) {
    // Prevent default for used keys
    if (e.code === 'Space' || e.code === 'Numpad0' || e.key === '0') {
        // Only prevent default if we seek to use it, to avoid blocking browser shortcuts unnecessarily?
        // e.preventDefault(); 
        // Actually, space scrolls, so yes. 0 might type, so maybe?
    }

    if (gameState === 'PLAYING') {
        birds.forEach(bird => {
            if (bird.controls === 'SPACE' && e.code === 'Space') {
                e.preventDefault();
                bird.jump();
            }
            if (bird.controls === 'ZERO' && (e.key === '0' || e.code === 'Numpad0' || e.code === 'Digit0')) {
                bird.jump();
            }
        });
    } else if (gameState === 'START' || gameState === 'GAMEOVER') {
        if (e.code === 'Space') {
            startGame();
        }
    }
});

canvas.addEventListener('click', function () {
    if (gameState === 'PLAYING') {
        // Click only controls P1 (Space eq)
        const p1 = birds.find(b => b.controls === 'SPACE');
        if (p1) p1.jump();
    }
});

// Button Listeners
startBtn.addEventListener('click', () => {
    startGame();
    startBtn.blur();
});
restartBtn.addEventListener('click', () => {
    startGame();
    restartBtn.blur();
});

// New UI Listeners (To be added in HTML, handled here protectively)
document.querySelectorAll('.player-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.player-mode-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        gameMode = btn.getAttribute('data-mode');

        // Toggle P2 Selection visibility
        const p2Selection = document.getElementById('p2-selection');
        if (gameMode === 'MULTI') {
            p2Selection.style.display = 'block';
        } else {
            p2Selection.style.display = 'none';
        }
    });
});


// Initial Draw
initBirds(); // Init a default bird for start screen
loop();
