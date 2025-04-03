// Space Shooter Game
// A polished side-scrolling space shooter with custom sprites

let player;
let enemies = [];
let bullets = [];
let stars = [];
let explosions = [];
let powerUps = [];
let score = 0;
let lives = 3;
let level = 1;
let gameState = "START"; // START, PLAYING, GAME_OVER
let spawnRate = 60; // Frames between enemy spawns
let frameCounter = 0;
let bossMode = false;
let boss = null;
let bgColor;
let gameFont;
let highScore = 0;

// Game sounds
let shootSound;
let explosionSound;
let powerUpSound;
let backgroundMusic;
let gameOverSound;
let bossAlertSound;

// Ship customization
let shipColor = {
  r: 30,
  g: 150,
  b: 255
}

class Bullet {
  constructor(x, y, type, angleOffset = 0) {
    this.pos = createVector(x, y);
    this.type = type; // "player" or "enemy"
    
    if (type === "player") {
      this.vel = createVector(10, 0);
      this.vel.rotate(angleOffset);
      this.size = 8;
      this.color = color(30, 200, 255);
    } else {
      this.vel = createVector(-6, 0);
      this.vel.rotate(angleOffset);
      this.size = 6;
      this.color = color(255, 100, 100);
    }
  }
  
  update() {
    this.pos.add(this.vel);
  }
  
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    
    if (this.type === "player") {
      // Player bullet - energy bolt
      noStroke();
      fill(this.color);
      ellipse(0, 0, this.size * 2, this.size);
      
      // Glow
      fill(255, 255, 255, 150);
      ellipse(0, 0, this.size, this.size/2);
      
      // Trail
      for (let i = 1; i <= 3; i++) {
        let alpha = map(i, 1, 3, 150, 0);
        fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], alpha);
        ellipse(-i * 5, 0, this.size * 1.5 - i, this.size/2);
      }
    } else {
      // Enemy bullet - red energy ball
      noStroke();
      fill(this.color);
      ellipse(0, 0, this.size, this.size);
      
      // Core
      fill(255, 255, 200);
      ellipse(0, 0, this.size/2, this.size/2);
    }
    
    pop();
  }
  
  isOffScreen() {
    return this.pos.x > width + this.size || this.pos.x < -this.size ||
           this.pos.y > height + this.size || this.pos.y < -this.size;
  }
  
  hits(obj) {
    let d = dist(this.pos.x, this.pos.y, obj.pos.x, obj.pos.y);
    return d < (this.size/2 + obj.size/2);
  }
}

class Explosion {
  constructor(x, y, size = 40) {
    this.pos = createVector(x, y);
    this.size = size;
    this.particles = [];
    this.lifespan = 30;
    
    // Create explosion particles
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        pos: createVector(0, 0),
        vel: p5.Vector.random2D().mult(random(1, 3)),
        size: random(3, 8),
        alpha: 255,
        color: color(
          random(200, 255),
          random(100, 200),
          random(0, 100)
        )
      });
    }
  }
  
  update() {
    this.lifespan--;
    
    // Update particles
    for (let particle of this.particles) {
      particle.pos.add(particle.vel);
      particle.vel.mult(0.95);
      particle.alpha = map(this.lifespan, 30, 0, 255, 0);
    }
  }
  
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Draw particles
    noStroke();
    for (let particle of this.particles) {
      let c = particle.color;
      fill(c.levels[0], c.levels[1], c.levels[2], particle.alpha);
      ellipse(particle.pos.x, particle.pos.y, particle.size, particle.size);
    }
    
    // Draw shockwave
    noFill();
    strokeWeight(2);
    let waveSize = map(this.lifespan, 30, 0, 0, this.size);
    let waveAlpha = map(this.lifespan, 30, 0, 255, 0);
    stroke(255, 255, 200, waveAlpha);
    ellipse(0, 0, waveSize, waveSize);
    
    pop();
  }
  
  isComplete() {
    return this.lifespan <= 0;
  }
}

class PowerUp {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-2, -1), random(-0.5, 0.5));
    this.size = 20;
    this.rotation = 0;
    this.rotationSpeed = random(-0.1, 0.1);
    
    // Random power-up type
    const types = ["HEALTH", "RAPID_FIRE", "TRIPLE_SHOT"];
    this.type = random(types);
    
    // Color based on type
    if (this.type === "HEALTH") {
      this.color = color(100, 255, 100);
      this.symbol = "+";
    } else if (this.type === "RAPID_FIRE") {
      this.color = color(255, 200, 0);
      this.symbol = "R";
    } else {
      this.color = color(100, 200, 255);
      this.symbol = "3";
    }
  }
  
  update() {
    this.pos.add(this.vel);
    this.rotation += this.rotationSpeed;
  }
  
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rotation);
    
    // Power-up body
    fill(this.color);
    stroke(255);
    strokeWeight(2);
    rect(-this.size/2, -this.size/2, this.size, this.size, 5);
    
    // Symbol
    fill(255);
    noStroke();
    textSize(16);
    textAlign(CENTER, CENTER);
    text(this.symbol, 0, 0);
    
    // Glow
    noFill();
    stroke(this.color);
    strokeWeight(1);
    let glowSize = this.size + sin(frameCount * 0.1) * 5;
    rect(-glowSize/2, -glowSize/2, glowSize, glowSize, 10);
    
    pop();
  }
  
  isOffScreen() {
    return this.pos.x < -this.size;
  }
}

class Star {
  constructor() {
    this.reset();
    this.pos.x = random(width);
  }
  
  reset() {
    this.pos = createVector(width + random(20), random(height));
    this.size = random(1, 3);
    this.brightness = random(100, 255);
    this.speed = map(this.size, 1, 3, 1, 3);
  }
  
  update() {
    this.pos.x -= this.speed;
    
    // Twinkle effect
    this.brightness = 150 + sin(frameCount * 0.1 + this.pos.y) * 50;
  }
  
  draw() {
    noStroke();
    fill(this.brightness);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
  }
  
  isOffScreen() {
    return this.pos.x < -this.size;
  }
};

function preload() {
  // We'll create all assets programmatically
  // Load font (can be replaced with custom font if needed)
  gameFont = loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceCodePro-Bold.otf');
  
  // Setup sounds (could be replaced with actual sound files)
  // For now we'll create placeholder functions
  setupSounds();
}

function setupSounds() {
  // Placeholder for sound setup - in a real game, you'd load sound files
  shootSound = {
    play: function() {
      // Play shoot sound
    }
  };
  
  explosionSound = {
    play: function() {
      // Play explosion sound
    }
  };
  
  powerUpSound = {
    play: function() {
      // Play power-up sound
    }
  };
  
  backgroundMusic = {
    loop: function() {
      // Loop background music
    },
    stop: function() {
      // Stop background music
    }
  };
  
  gameOverSound = {
    play: function() {
      // Play game over sound
    }
  };
  
  bossAlertSound = {
    play: function() {
      // Play boss alert sound
    }
  };
}

// Detect mobile devices
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.innerWidth <= 800);
}

function setup() {
  // Check if mobile and adjust canvas size accordingly
  mobileControls = isMobileDevice();
  
  // Create canvas and make it responsive
  let cnv;
  if (mobileControls) {
    // On mobile, make the canvas fit the screen width
    let screenWidth = min(windowWidth, 800);
    canvasScaleFactor = screenWidth / 800;
    cnv = createCanvas(screenWidth, 600 * canvasScaleFactor);
  } else {
    cnv = createCanvas(800, 600);
  }
  
  // Center canvas
  let gameContainer = document.getElementById('game-container');
  cnv.parent(gameContainer);
  
  textFont(gameFont);
  bgColor = color(10, 5, 20);
  
  player = new Player();
  
  // Create initial stars
  for (let i = 0; i < 100; i++) {
    stars.push(new Star());
  }
  
  // Initialize highscore from localStorage if available
  if (localStorage.getItem('highScore')) {
    highScore = parseInt(localStorage.getItem('highScore'));
  }
  
  // Set up mobile controls
  setupMobileControls();
}

function setupMobileControls() {
  if (!mobileControls) return;
  
  // Get all mobile control buttons
  const upBtn = document.getElementById('up-btn');
  const downBtn = document.getElementById('down-btn');
  const leftBtn = document.getElementById('left-btn');
  const rightBtn = document.getElementById('right-btn');
  const fireBtn = document.getElementById('fire-btn');
  
  // Touch event handlers - using both mouse and touch events for wider compatibility
  
  // Movement buttons - start
  upBtn.addEventListener('touchstart', () => player.controls.up = true);
  downBtn.addEventListener('touchstart', () => player.controls.down = true);
  leftBtn.addEventListener('touchstart', () => player.controls.left = true);
  rightBtn.addEventListener('touchstart', () => player.controls.right = true);
  
  upBtn.addEventListener('mousedown', () => player.controls.up = true);
  downBtn.addEventListener('mousedown', () => player.controls.down = true);
  leftBtn.addEventListener('mousedown', () => player.controls.left = true);
  rightBtn.addEventListener('mousedown', () => player.controls.right = true);
  
  // Movement buttons - end
  upBtn.addEventListener('touchend', () => player.controls.up = false);
  downBtn.addEventListener('touchend', () => player.controls.down = false);
  leftBtn.addEventListener('touchend', () => player.controls.left = false);
  rightBtn.addEventListener('touchend', () => player.controls.right = false);
  
  upBtn.addEventListener('mouseup', () => player.controls.up = false);
  downBtn.addEventListener('mouseup', () => player.controls.down = false);
  leftBtn.addEventListener('mouseup', () => player.controls.left = false);
  rightBtn.addEventListener('mouseup', () => player.controls.right = false);
  
  // Fire button
  fireBtn.addEventListener('touchstart', () => player.controls.fire = true);
  fireBtn.addEventListener('touchend', () => player.controls.fire = false);
  
  fireBtn.addEventListener('mousedown', () => player.controls.fire = true);
  fireBtn.addEventListener('mouseup', () => player.controls.fire = false);
  
  // Prevent default touch behavior to avoid scrolling while playing
  document.addEventListener('touchmove', function(e) {
    if (gameState === "PLAYING") {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Add start button for mobile
  const startButton = document.createElement('button');
  startButton.id = 'start-btn';
  startButton.textContent = 'START GAME';
  startButton.style.position = 'absolute';
  startButton.style.top = '50%';
  startButton.style.left = '50%';
  startButton.style.transform = 'translate(-50%, -50%)';
  startButton.style.padding = '15px 30px';
  startButton.style.fontSize = '24px';
  startButton.style.backgroundColor = 'rgba(0, 150, 255, 0.7)';
  startButton.style.border = '3px solid rgba(100, 200, 255, 0.9)';
  startButton.style.borderRadius = '10px';
  startButton.style.color = 'white';
  startButton.style.fontWeight = 'bold';
  startButton.style.display = 'none';
  document.body.appendChild(startButton);
  
  // Start button functionality
  startButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === "START") {
      gameState = "PLAYING";
      backgroundMusic.loop();
    } else if (gameState === "GAME_OVER") {
      resetGame();
      gameState = "PLAYING";
      backgroundMusic.loop();
    }
    startButton.style.display = 'none';
  });
  
  startButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (gameState === "START") {
      gameState = "PLAYING";
      backgroundMusic.loop();
    } else if (gameState === "GAME_OVER") {
      resetGame();
      gameState = "PLAYING";
      backgroundMusic.loop();
    }
    startButton.style.display = 'none';
  });
  
  // Show/hide start button based on game state
  setInterval(() => {
    if ((gameState === "START" || gameState === "GAME_OVER") && mobileControls) {
      startButton.style.display = 'block';
    } else {
      startButton.style.display = 'none';
    }
  }, 100);
}

function draw() {
  background(bgColor);
  
  switch (gameState) {
    case "START":
      drawStartScreen();
      break;
    case "PLAYING":
      updateGame();
      drawGame();
      break;
    case "GAME_OVER":
      drawGameOverScreen();
      break;
  }
}

// Handle touch events for starting/restarting the game
function mousePressed() {
  if (mobileControls) {
    if (gameState === "START") {
      gameState = "PLAYING";
      backgroundMusic.loop();
    } else if (gameState === "GAME_OVER") {
      resetGame();
      gameState = "PLAYING";
      backgroundMusic.loop();
    }
  }
}

function drawStartScreen() {
  // Update stars for parallax background effect
  updateStars();
  drawStars();
  
  fill(255);
  textAlign(CENTER, CENTER);
  
  // Adjust text size for mobile
  let titleSize = mobileControls ? 40 * canvasScaleFactor : 50;
  let normalTextSize = mobileControls ? 18 * canvasScaleFactor : 20;
  let instructionsSize = mobileControls ? 20 * canvasScaleFactor : 24;
  
  textSize(titleSize);
  text("SPACE SHOOTER", width/2, height/3);
  
  textSize(normalTextSize);
  text("High Score: " + highScore, width/2, height/2);
  
  textSize(instructionsSize);
  if (frameCount % 60 < 30) {
    if (mobileControls) {
      text("TAP SCREEN TO START", width/2, height * 2/3);
    } else {
      text("PRESS ENTER TO START", width/2, height * 2/3);
    }
  }
  
  // Draw player ship preview
  push();
  translate(width/2, height * 5/6);
  let shipScale = mobileControls ? canvasScaleFactor : 1;
  scale(shipScale);
  player.drawShip();
  pop();
}

function drawGameOverScreen() {
  // Update stars for parallax background effect
  updateStars();
  drawStars();
  
  fill(255);
  textAlign(CENTER, CENTER);
  
  // Adjust text size for mobile
  let titleSize = mobileControls ? 40 * canvasScaleFactor : 50;
  let scoreSize = mobileControls ? 24 * canvasScaleFactor : 30;
  let instructionsSize = mobileControls ? 20 * canvasScaleFactor : 24;
  
  textSize(titleSize);
  text("GAME OVER", width/2, height/3);
  
  textSize(scoreSize);
  text("Score: " + score, width/2, height/2);
  
  if (score > highScore) {
    fill(255, 255, 0);
    text("NEW HIGH SCORE!", width/2, height/2 + (mobileControls ? 40 * canvasScaleFactor : 50));
  } else {
    text("High Score: " + highScore, width/2, height/2 + (mobileControls ? 40 * canvasScaleFactor : 50));
  }
  
  fill(255);
  textSize(instructionsSize);
  if (frameCount % 60 < 30) {
    if (mobileControls) {
      text("TAP SCREEN TO RESTART", width/2, height * 2/3);
    } else {
      text("PRESS ENTER TO RESTART", width/2, height * 2/3);
    }
  }
}

function updateGame() {
  frameCounter++;
  
  // Update stars
  updateStars();
  
  // Update player
  player.update();
  
  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    
    // Remove bullets that are off-screen
    if (bullets[i].isOffScreen()) {
      bullets.splice(i, 1);
      continue;
    }
    
    // Check collision with boss if in boss mode
    if (bossMode && boss && bullets[i].type === "player") {
      if (dist(bullets[i].pos.x, bullets[i].pos.y, boss.pos.x, boss.pos.y) < (bullets[i].size/2 + boss.size/2)) {
        boss.health -= 1;
        explosions.push(new Explosion(bullets[i].pos.x, bullets[i].pos.y, 20));
        bullets.splice(i, 1);
      }
    }
  }
  
  // Boss mode check
  if (!bossMode && score > 0 && score % 500 === 0) {
    startBossMode();
  }
  
  // Update boss if in boss mode
  if (bossMode && boss) {
    boss.update();
    
    // Check for boss defeat
    if (boss.health <= 0) {
      explosions.push(new Explosion(boss.pos.x, boss.pos.y, 150));
      explosionSound.play();
      score += 100;
      bossMode = false;
      boss = null;
      level++;
      spawnRate = max(20, 60 - level * 5); // Increase difficulty
    }
    
    // Check for boss bullets hitting player
    for (let i = boss.bullets.length - 1; i >= 0; i--) {
      let b = boss.bullets[i];
      b.update();
      
      // Remove bullets that are off-screen
      if (b.isOffScreen()) {
        boss.bullets.splice(i, 1);
        continue;
      }
      
      // Check collision with player
      if (player.hits(b)) {
        boss.bullets.splice(i, 1);
        player.takeDamage();
      }
    }
  } 
  // Spawn enemies in regular mode
  else if (frameCounter % spawnRate === 0) {
    enemies.push(new Enemy());
  }
  
  // Update enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    
    // Remove enemies that are off-screen
    if (enemies[i].isOffScreen()) {
      enemies.splice(i, 1);
      continue;
    }
    
    // Check collision with player
    if (player.hits(enemies[i])) {
      explosions.push(new Explosion(enemies[i].pos.x, enemies[i].pos.y));
      explosionSound.play();
      enemies.splice(i, 1);
      player.takeDamage();
      continue;
    }
    
    // Check collision with bullets
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (enemies[i] && bullets[j].hits(enemies[i])) {
        score += 10;
        explosions.push(new Explosion(enemies[i].pos.x, enemies[i].pos.y));
        explosionSound.play();
        
        // Chance to spawn power-up
        if (random() < 0.1) {
          powerUps.push(new PowerUp(enemies[i].pos.x, enemies[i].pos.y));
        }
        
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        break;
      }
    }
  }
  
  // Update power-ups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    powerUps[i].update();
    
    // Remove power-ups that are off-screen
    if (powerUps[i].isOffScreen()) {
      powerUps.splice(i, 1);
      continue;
    }
    
    // Check collision with player
    if (player.hits(powerUps[i])) {
      powerUpSound.play();
      let type = powerUps[i].type;
      
      switch (type) {
        case "HEALTH":
          player.health = min(player.health + 1, player.maxHealth);
          break;
        case "RAPID_FIRE":
          player.powerUpTimer = 300; // 5 seconds at 60fps
          player.fireRate = 5;
          break;
        case "TRIPLE_SHOT":
          player.powerUpTimer = 300; // 5 seconds at 60fps
          player.fireMode = "TRIPLE";
          break;
      }
      
      powerUps.splice(i, 1);
    }
  }
  
  // Update explosions
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].update();
    
    // Remove completed explosions
    if (explosions[i].isComplete()) {
      explosions.splice(i, 1);
    }
  }
  
  // Check for game over
  if (player.health <= 0) {
    gameOver();
  }
}

function drawGame() {
  // Draw stars
  drawStars();
  
  // Draw bullets
  for (let bullet of bullets) {
    bullet.draw();
  }
  
  // Draw power-ups
  for (let powerUp of powerUps) {
    powerUp.draw();
  }
  
  // Draw enemies
  for (let enemy of enemies) {
    enemy.draw();
  }
  
  // Draw boss
  if (bossMode && boss) {
    boss.draw();
  }
  
  // Draw player
  player.draw();
  
  // Draw explosions
  for (let explosion of explosions) {
    explosion.draw();
  }
  
  // Draw UI
  drawUI();
}

function drawUI() {
  // Score
  fill(255);
  textAlign(LEFT, TOP);
  textSize(20);
  text("SCORE: " + score, 20, 20);
  
  // Level
  textAlign(CENTER, TOP);
  text("LEVEL " + level, width/2, 20);
  
  // Lives/health
  textAlign(RIGHT, TOP);
  text("HEALTH: ", width - 120, 20);
  
  // Health bar
  let healthBarWidth = 100;
  let healthBarHeight = 15;
  noFill();
  stroke(255);
  rect(width - 110, 22, healthBarWidth, healthBarHeight);
  
  noStroke();
  fill(255, 50, 50);
  let currentHealthWidth = map(player.health, 0, player.maxHealth, 0, healthBarWidth);
  rect(width - 110, 22, currentHealthWidth, healthBarHeight);
  
  // Power-up indicator
  if (player.powerUpTimer > 0) {
    let powerUpType = player.fireMode === "TRIPLE" ? "TRIPLE SHOT" : "RAPID FIRE";
    let timerWidth = map(player.powerUpTimer, 0, 300, 0, 150);
    
    textAlign(CENTER, BOTTOM);
    fill(255, 255, 0);
    text(powerUpType, width/2, height - 20);
    
    // Power-up timer bar
    noFill();
    stroke(255, 255, 0);
    rect(width/2 - 75, height - 15, 150, 10);
    
    noStroke();
    fill(255, 255, 0);
    rect(width/2 - 75, height - 15, timerWidth, 10);
  }
  
  // Boss health bar (if in boss mode)
  if (bossMode && boss) {
    textAlign(CENTER, TOP);
    fill(255, 0, 0);
    text("BOSS", width/2, 50);
    
    // Boss health bar
    let bossHealthBarWidth = 300;
    let bossHealthBarHeight = 15;
    noFill();
    stroke(255, 0, 0);
    rect(width/2 - bossHealthBarWidth/2, 80, bossHealthBarWidth, bossHealthBarHeight);
    
    noStroke();
    fill(255, 0, 0);
    let currentBossHealthWidth = map(boss.health, 0, boss.maxHealth, 0, bossHealthBarWidth);
    rect(width/2 - bossHealthBarWidth/2, 80, currentBossHealthWidth, bossHealthBarHeight);
  }
}

function updateStars() {
  for (let star of stars) {
    star.update();
    if (star.isOffScreen()) {
      star.reset();
    }
  }
}

function drawStars() {
  for (let star of stars) {
    star.draw();
  }
}

function startBossMode() {
  bossMode = true;
  bossAlertSound.play();
  
  // Clear all enemies
  enemies = [];
  
  // Create boss
  boss = new Boss();
}

function gameOver() {
  gameState = "GAME_OVER";
  gameOverSound.play();
  backgroundMusic.stop();
  
  // Update high score if needed
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore.toString());
  }
}

function keyPressed() {
  if (keyCode === ENTER || keyCode === RETURN) {
    if (gameState === "START") {
      // Start game
      gameState = "PLAYING";
      backgroundMusic.loop();
    } else if (gameState === "GAME_OVER") {
      // Restart game
      resetGame();
      gameState = "PLAYING";
      backgroundMusic.loop();
    }
  }
  
  if (gameState === "PLAYING") {
    // Player controls
    player.handleKeyPress(keyCode);
  }
}

function keyReleased() {
  if (gameState === "PLAYING") {
    // Player controls
    player.handleKeyRelease(keyCode);
  }
}

function resetGame() {
  player = new Player();
  enemies = [];
  bullets = [];
  explosions = [];
  powerUps = [];
  score = 0;
  level = 1;
  bossMode = false;
  boss = null;
  frameCounter = 0;
  spawnRate = 60;
}

// Classes

class Player {
  constructor() {
    this.pos = createVector(100, height/2);
    this.vel = createVector(0, 0);
    this.size = 40;
    this.color = color(shipColor.r, shipColor.g, shipColor.b);
    this.maxSpeed = 5;
    this.friction = 0.9;
    this.maxHealth = 3;
    this.health = this.maxHealth;
    this.cooldown = 0;
    this.fireRate = 15; // Frames between shots
    this.fireMode = "SINGLE"; // SINGLE, TRIPLE
    this.powerUpTimer = 0;
    this.invulnerable = 0; // Invulnerability frames
    this.controls = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false
    };
  }
  
  update() {
    // Handle movement
    let acceleration = createVector(0, 0);
    
    if (this.controls.up) acceleration.y -= 0.5;
    if (this.controls.down) acceleration.y += 0.5;
    if (this.controls.left) acceleration.x -= 0.5;
    if (this.controls.right) acceleration.x += 0.5;
    
    // Apply acceleration
    this.vel.add(acceleration);
    
    // Apply friction
    this.vel.mult(this.friction);
    
    // Limit speed
    this.vel.limit(this.maxSpeed);
    
    // Update position
    this.pos.add(this.vel);
    
    // Keep player on screen
    this.pos.x = constrain(this.pos.x, this.size/2, width/3);
    this.pos.y = constrain(this.pos.y, this.size/2, height - this.size/2);
    
    // Auto-fire on mobile if the fire button is held
    if (mobileControls && this.controls.fire && this.cooldown <= 0) {
      this.shoot();
      this.cooldown = this.fireRate;
    }
    
    // Handle shooting
    if (this.controls.fire && this.cooldown <= 0) {
      this.shoot();
      this.cooldown = this.fireRate;
    }
    
    // Decrease cooldown
    if (this.cooldown > 0) {
      this.cooldown--;
    }
    
    // Decrease power-up timer
    if (this.powerUpTimer > 0) {
      this.powerUpTimer--;
      if (this.powerUpTimer <= 0) {
        // Reset power-ups
        this.fireRate = 15;
        this.fireMode = "SINGLE";
      }
    }
    
    // Decrease invulnerability frames
    if (this.invulnerable > 0) {
      this.invulnerable--;
    }
  }
  
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Flash when invulnerable
    if (this.invulnerable === 0 || frameCount % 5 < 3) {
      this.drawShip();
      
      // Engine flame
      if (gameState === "PLAYING") {
        this.drawEngine();
      }
    }
    
    pop();
  }
  
  drawShip() {
    // Ship body
    fill(this.color);
    stroke(255);
    strokeWeight(2);
    beginShape();
    vertex(this.size/2, 0);
    vertex(-this.size/2, -this.size/3);
    vertex(-this.size/3, 0);
    vertex(-this.size/2, this.size/3);
    endShape(CLOSE);
    
    // Cockpit
    fill(200, 255, 255);
    noStroke();
    ellipse(this.size/8, 0, this.size/4, this.size/5);
    
    // Wing details
    stroke(255);
    strokeWeight(1);
    line(-this.size/3, 0, -this.size/2, -this.size/3);
    line(-this.size/3, 0, -this.size/2, this.size/3);
  }
  
  drawEngine() {
    // Flickering engine flame
    let flameSize = random(10, 20);
    noStroke();
    
    // Outer flame
    fill(255, 150, 50, 200);
    triangle(
      -this.size/2, 0,
      -this.size/2 - flameSize, -flameSize/2,
      -this.size/2 - flameSize, flameSize/2
    );
    
    // Inner flame
    fill(255, 255, 200, 230);
    triangle(
      -this.size/2, 0,
      -this.size/2 - flameSize * 0.7, -flameSize/3,
      -this.size/2 - flameSize * 0.7, flameSize/3
    );
  }
  
  shoot() {
    shootSound.play();
    
    switch (this.fireMode) {
      case "SINGLE":
        bullets.push(new Bullet(this.pos.x + this.size/2, this.pos.y, "player"));
        break;
      case "TRIPLE":
        bullets.push(new Bullet(this.pos.x + this.size/2, this.pos.y, "player"));
        bullets.push(new Bullet(this.pos.x + this.size/2, this.pos.y - 10, "player", -0.1));
        bullets.push(new Bullet(this.pos.x + this.size/2, this.pos.y + 10, "player", 0.1));
        break;
    }
  }
  
  takeDamage() {
    if (this.invulnerable <= 0) {
      this.health--;
      this.invulnerable = 90; // 1.5 seconds invulnerability
      explosions.push(new Explosion(this.pos.x, this.pos.y, 30));
    }
  }
  
  hits(obj) {
    if (this.invulnerable > 0) return false;
    
    let d = dist(this.pos.x, this.pos.y, obj.pos.x, obj.pos.y);
    return d < (this.size/2 + obj.size/2);
  }
  
  handleKeyPress(keyCode) {
    if (keyCode === UP_ARROW || keyCode === 87) this.controls.up = true;
    if (keyCode === DOWN_ARROW || keyCode === 83) this.controls.down = true;
    if (keyCode === LEFT_ARROW || keyCode === 65) this.controls.left = true;
    if (keyCode === RIGHT_ARROW || keyCode === 68) this.controls.right = true;
    if (keyCode === 32) this.controls.fire = true; // Space bar
  }
  
  handleKeyRelease(keyCode) {
    if (keyCode === UP_ARROW || keyCode === 87) this.controls.up = false;
    if (keyCode === DOWN_ARROW || keyCode === 83) this.controls.down = false;
    if (keyCode === LEFT_ARROW || keyCode === 65) this.controls.left = false;
    if (keyCode === RIGHT_ARROW || keyCode === 68) this.controls.right = false;
    if (keyCode === 32) this.controls.fire = false; // Space bar
  }
}

class Enemy {
  constructor() {
    this.pos = createVector(width + 20, random(50, height - 50));
    this.vel = createVector(random(-3, -1.5), random(-1, 1));
    this.size = random(20, 35);
    this.color = color(random(150, 255), random(50, 150), random(50, 150));
    this.rotation = 0;
    this.rotationSpeed = random(-0.05, 0.05);
  }
  
  update() {
    this.pos.add(this.vel);
    this.rotation += this.rotationSpeed;
  }
  
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rotation);
    
    // Enemy ship body
    fill(this.color);
    stroke(255);
    strokeWeight(1);
    
    // Draw different enemy types based on size
    if (this.size < 25) {
      // Small drone
      ellipse(0, 0, this.size, this.size);
      line(-this.size/2, 0, this.size/2, 0);
      line(0, -this.size/2, 0, this.size/2);
    } else if (this.size < 30) {
      // Medium fighter
      beginShape();
      vertex(this.size/2, 0);
      vertex(0, -this.size/2);
      vertex(-this.size/2, 0);
      vertex(0, this.size/2);
      endShape(CLOSE);
      
      // Center
      fill(100, 100, 255);
      noStroke();
      ellipse(0, 0, this.size/3, this.size/3);
    } else {
      // Large enforcer
      beginShape();
      vertex(this.size/2, 0);
      vertex(this.size/4, -this.size/3);
      vertex(-this.size/2, -this.size/4);
      vertex(-this.size/3, 0);
      vertex(-this.size/2, this.size/4);
      vertex(this.size/4, this.size/3);
      endShape(CLOSE);
      
      // Details
      fill(255, 100, 100);
      noStroke();
      ellipse(this.size/4, 0, this.size/4, this.size/4);
    }
    
    pop();
  }
  
  isOffScreen() {
    return this.pos.x < -this.size;
  }
}

class Boss {
  constructor() {
    this.pos = createVector(width + 100, height/2);
    this.targetY = height/2;
    this.vel = createVector(-1, 0);
    this.size = 100;
    this.color = color(255, 50, 50);
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.bullets = [];
    this.attackCooldown = 0;
    this.attackPattern = 0;
    this.entryComplete = false;
  }
  
  update() {
    // Entry animation
    if (!this.entryComplete) {
      this.pos.x += this.vel.x * 2;
      if (this.pos.x <= width * 0.75) {
        this.entryComplete = true;
      }
      return;
    }
    
    // Movement pattern
    this.targetY = height/2 + sin(frameCount * 0.02) * (height/3);
    this.pos.y = lerp(this.pos.y, this.targetY, 0.03);
    
    // Small horizontal movement
    this.pos.x = width * 0.75 + sin(frameCount * 0.01) * 30;
    
    // Attack patterns
    if (this.attackCooldown <= 0) {
      this.attack();
      this.attackPattern = (this.attackPattern + 1) % 3;
      this.attackCooldown = 60; // 1 second between attacks
    } else {
      this.attackCooldown--;
    }
    
    // Update boss bullets
    for (let bullet of this.bullets) {
      bullet.update();
    }
  }
  
  attack() {
    switch (this.attackPattern) {
      case 0:
        // Spread shot
        for (let i = -3; i <= 3; i++) {
          this.bullets.push(new Bullet(this.pos.x - this.size/2, this.pos.y, "enemy", i * 0.15));
        }
        break;
      case 1:
        // Aimed shot
        let dir = p5.Vector.sub(player.pos, this.pos).normalize();
        for (let i = 0; i < 3; i++) {
          let b = new Bullet(this.pos.x - this.size/2, this.pos.y, "enemy");
          b.vel = p5.Vector.mult(dir, -6);
          this.bullets.push(b);
        }
        break;
      case 2:
        // Circle shot
        for (let i = 0; i < 8; i++) {
          let angle = i * TWO_PI / 8;
          let b = new Bullet(this.pos.x, this.pos.y, "enemy");
          b.vel = createVector(cos(angle), sin(angle)).mult(3);
          this.bullets.push(b);
        }
        break;
    }
  }
  
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Boss body
    fill(this.color);
    stroke(255);
    strokeWeight(2);
    
    // Main hull
    ellipse(0, 0, this.size, this.size * 0.7);
    
    // Front cannon
    fill(100, 100, 100);
    rect(-this.size/2, -this.size/8, -this.size/4, this.size/4);
    
    // Top wing
    fill(this.color);
    beginShape();
    vertex(this.size/4, -this.size/3);
    vertex(-this.size/4, -this.size/3);
    vertex(-this.size/8, -this.size/1.5);
    vertex(this.size/3, -this.size/1.5);
    endShape(CLOSE);
    
    // Bottom wing
    beginShape();
    vertex(this.size/4, this.size/3);
    vertex(-this.size/4, this.size/3);
    vertex(-this.size/8, this.size/1.5);
    vertex(this.size/3, this.size/1.5);
    endShape(CLOSE);
    
    // Engine glow
    for (let i = 0; i < 3; i++) {
      let yPos = map(i, 0, 2, -this.size/4, this.size/4);
      let glowSize = sin(frameCount * 0.1 + i) * 5 + 15;
      
      fill(255, 150, 50, 150);
      ellipse(this.size/2, yPos, glowSize, glowSize);
      
      fill(255, 255, 200, 200);
      ellipse(this.size/2, yPos, glowSize/2, glowSize/2);
    }
    
    // Cockpit
    fill(150, 255, 255, 200);
    ellipse(this.size/4, 0, this.size/3, this.size/4);
    
    pop();
    
    // Draw boss bullets
    for (let bullet of this.bullets) {
      bullet.draw();
    }
  }
}
