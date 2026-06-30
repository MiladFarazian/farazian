// ===== KATSUYA'S REVENGE — HTML5 Canvas Port =====
// Faithful port of the Java Swing original

// ==================== CONSTANTS ====================
const W = 1600, H = 800, TICK = 20;
const GRAVITY = 1, MAX_FALL = 20;
const PLAYER_MAX_SPEED = 5, JUMP_FORCE = -18;
const DEATH_DELAY = 80;

const State = {
  TITLE:'TITLE', BETWEEN_1_1:'BETWEEN_1_1', BETWEEN_1_2:'BETWEEN_1_2',
  LEVEL_1:'LEVEL_1', BETWEEN_2:'BETWEEN_2', LEVEL_2:'LEVEL_2',
  BETWEEN_3:'BETWEEN_3', LEVEL_3:'LEVEL_3', BETWEEN_4:'BETWEEN_4',
  LEVEL_4:'LEVEL_4', END:'END', PAUSE:'PAUSE'
};
const Motion = { RUN_RIGHT:0, THROW:1, IDLE:2, DIE:3, RUN_LEFT:4 };

// ==================== ASSET LOADING ====================
const imgs = {};
function loadImg(k, src) {
  return new Promise(r => {
    const i = new Image(); i.onload = () => { imgs[k] = i; r(); };
    i.onerror = () => { imgs[k] = null; r(); }; i.src = src;
  });
}
async function loadAssets() {
  const I = 'images/', B = I+'Backgrounds/';
  await Promise.all([
    loadImg('player',I+'pcNewAttempt2.png'),
    loadImg('enemyRanger',I+'enemyRanger.png'), loadImg('boss',I+'boss.png'), loadImg('boss2',I+'boss2.png'),
    loadImg('knifeR',I+'throwingKnifeRight.png'), loadImg('knifeL',I+'throwingKnifeLeft.png'),
    loadImg('knifeAmmo',I+'throwingKnifeAmmo.png'), loadImg('health',I+'health.png'),
    loadImg('base1',I+'base1.png'), loadImg('base2',I+'base2.png'),
    loadImg('base3',I+'base3.png'), loadImg('base4',I+'base4.png'),
    loadImg('rock',I+'rock.png'), loadImg('stone',I+'stone.png'),
    loadImg('enemyPlatform',I+'enemyPlatform.png'), loadImg('smallEnemyPlatform',I+'smallEnemyPlatform.png'),
    loadImg('movingPlatform1',I+'moving platform1.png'),
    loadImg('largeStilt',I+'largeStilt.png'), loadImg('mediumStilt',I+'mediumStilt.png'),
    loadImg('smallStilt',I+'smallStilt.png'), loadImg('miniStilt',I+'miniStilt.png'),
    loadImg('miniBase',I+'miniBase.png'), loadImg('sign1',I+'sign1.png'), loadImg('pipe2',I+'pipe2.png'),
    loadImg('sewer1',I+'sewer1.png'), loadImg('sewer2img',I+'sewer2.png'),
    loadImg('sewer3',I+'sewer3.png'), loadImg('sewer4',I+'sewer4.png'),
    loadImg('pipe1',I+'pipe1.png'), loadImg('extraPipe',I+'extraPipe.png'),
    loadImg('sign2',I+'sign2.png'), loadImg('downArrow',I+'downArrow.png'), loadImg('upArrow',I+'upArrow.png'),
    loadImg('sign3',I+'sign3.png'), loadImg('pagota1',I+'pagota1.png'),
    loadImg('ledge',I+'ledge.png'), loadImg('evilDoor',I+'evil door.png'),
    loadImg('bgOsaka',B+'mountain_background1-2.jpg'), loadImg('bgSewer',B+'sewer2.jpg'),
    loadImg('bgTokyo',B+'city2.jpg'), loadImg('bgDojo',B+'Dojo_Background2.jpg'),
    loadImg('page1',I+'Page1-2.PNG'), loadImg('page2',I+'Page2.PNG'), loadImg('page3',I+'Page3.PNG'),
    loadImg('page4',I+'Page4.PNG'), loadImg('page5',I+'PAGE5.PNG'),
    loadImg('page6',I+'PAGE6.PNG'), loadImg('page7',I+'Page7.PNG'),
  ]);
}

// ==================== AUDIO ====================
let currentSong = null;
let currentSongLevel = 0;
function playSong(n) {
  // Don't restart if already playing the same level's music
  if (currentSongLevel === n && currentSong && !currentSong.paused) return;
  if (currentSong) { currentSong.pause(); currentSong.currentTime = 0; }
  try {
    currentSong = new Audio('songs/Level '+n+'.mp3');
    currentSong.loop = true; currentSong.play().catch(()=>{});
    currentSongLevel = n;
  } catch(e) { currentSong = null; currentSongLevel = 0; }
}
function stopSong() {
  if (currentSong) { currentSong.pause(); currentSong.currentTime = 0; }
  currentSongLevel = 0;
}

// ==================== COLLISION ====================
function boxBox(ax,ay,aw,ah, bx,by,bw,bh) {
  return !(ax+aw < bx || ax > bx+bw || ay+ah < by || ay > by+bh);
}
function circleBox(cx,cy,cr, bx,by,bw,bh) {
  const ccX=cx+cr, ccY=cy+cr;
  const clX=Math.max(bx, Math.min(ccX, bx+bw));
  const clY=Math.max(by, Math.min(ccY, by+bh));
  return (ccX-clX)*(ccX-clX)+(ccY-clY)*(ccY-clY) <= cr*cr;
}
function colliderHit(c1,o1, c2,o2) {
  const x1=o1.x+c1.ox, y1=o1.y+c1.oy, x2=o2.x+c2.ox, y2=o2.y+c2.oy;
  if (c1.t==='b' && c2.t==='b') return boxBox(x1,y1,c1.w,c1.h, x2,y2,c2.w,c2.h);
  if (c1.t==='c' && c2.t==='c') {
    const dx=(x2+c2.r)-(x1+c1.r), dy=(y2+c2.r)-(y1+c1.r);
    return Math.hypot(dx,dy) <= c1.r+c2.r;
  }
  let ci,co,bi,bo;
  if (c1.t==='c') { ci=c1;co=o1;bi=c2;bo=o2; } else { ci=c2;co=o2;bi=c1;bo=o1; }
  return circleBox(co.x+ci.ox, co.y+ci.oy, ci.r, bo.x+bi.ox, bo.y+bi.oy, bi.w, bi.h);
}
function goHit(a,b) {
  for (const ca of a.cols) for (const cb of b.cols)
    if (colliderHit(ca,a, cb,b)) return true;
  return false;
}

// ==================== GAME OBJECTS ====================
class Platform {
  constructor(x,y,w,h,tag) {
    this.x=x; this.y=y; this.w=w; this.h=h; this.tag=tag||'';
    this.cols=[{t:'b',ox:0,oy:0,w,h}]; this.imgKey=null; this.visible=true;
  }
  draw(ctx) {
    if (!this.visible) return;
    const im = this.imgKey ? imgs[this.imgKey] : null;
    if (im) ctx.drawImage(im, this.x, this.y);
    else { ctx.fillStyle='rgba(112,72,43,0.4)'; ctx.fillRect(this.x,this.y,this.w,this.h); }
  }
}

class Bullet {
  constructor(x,y,dir) {
    this.dir=dir; this.speed=15; this.deathTime=5; this.usable=true; this.visible=true;
    this.w=55; this.h=15;
    if (dir>0) { this.x=x+25; this.y=y; } else { this.x=x-70; this.y=y; }
    this.cols=[{t:'b',ox:0,oy:0,w:55,h:15}];
  }
  move(platforms) {
    this.x += this.speed * this.dir;
    this.deathTime -= 0.1;
    if (this.deathTime <= 0) return true; // should remove
    return false;
  }
  draw(ctx) {
    if (!this.visible) return;
    const k = this.dir>0 ? 'knifeR' : 'knifeL';
    if (imgs[k]) ctx.drawImage(imgs[k], this.x, this.y);
    else { ctx.fillStyle='#ccc'; ctx.fillRect(this.x,this.y,55,15); }
  }
}

class Collectable {
  constructor(type,x,y) {
    this.type=type; this.x=x; this.y=y; this.w=50; this.h=50; this.visible=true;
    this.cols=[{t:'c',ox:0,oy:0,r:25}];
  }
  draw(ctx) {
    if (!this.visible) return;
    const k = this.type==='health' ? 'health' : 'knifeAmmo';
    if (imgs[k]) ctx.drawImage(imgs[k], this.x, this.y);
    else {
      ctx.fillStyle = this.type==='health' ? '#3c3' : '#69f';
      ctx.beginPath(); ctx.arc(this.x+25,this.y+25,25,0,Math.PI*2); ctx.fill();
    }
  }
}

// ==================== ANIMATION ====================
class Animation {
  constructor(imgKey, frameW, frameH, frameCounts) {
    this.imgKey=imgKey; this.fw=frameW; this.fh=frameH;
    this.frameCounts=frameCounts; this.clip=0; this.frame=0;
    this.count=1; this.cycle=0;
  }
  setMotion(st) { if (st!==this.clip) { this.clip=st; this.frame=0; } }
  draw(ctx, x, y) {
    const img = imgs[this.imgKey];
    if (img) {
      const sx=this.frame*this.fw, sy=this.clip*this.fh;
      ctx.drawImage(img, sx,sy,this.fw,this.fh, x,y,this.fw,this.fh);
    } else {
      ctx.fillStyle='#3c78c8'; ctx.fillRect(x,y,this.fw,this.fh);
      ctx.strokeStyle='#fff'; ctx.strokeRect(x,y,this.fw,this.fh);
    }
    this.count++;
    if (this.count % 7 === 0) {
      this.frame++;
      if (this.frame >= this.frameCounts[this.clip]) { this.frame=0; this.cycle++; }
      this.count=1;
    }
  }
}

// ==================== PLAYER ====================
class Player {
  constructor() {
    this.x=30; this.y=500; this.w=82; this.h=82;
    this.speed=0; this.fallSpeed=0; this.inAir=true;
    this.life=10; this.ammo=10;
    this.cols=[{t:'b',ox:0,oy:0,w:82,h:82}];
    this.anim = new Animation('player',82,82,[5,2,8,2,5]);
    this.anim.setMotion(Motion.IDLE);
  }
  jump() {
    if (this.inAir) return;
    this.fallSpeed = JUMP_FORCE; this.inAir = true;
  }
  speedLeft() {
    if (this.speed >= -PLAYER_MAX_SPEED) this.speed--;
    this.anim.setMotion(Motion.RUN_LEFT);
  }
  speedRight() {
    if (this.speed <= PLAYER_MAX_SPEED) this.speed++;
    this.anim.setMotion(Motion.RUN_RIGHT);
  }
  slowDown() {
    if (this.speed>0) this.speed--;
    else if (this.speed<0) this.speed++;
    else if (this.life>0) this.anim.setMotion(Motion.IDLE);
  }
  stopRun() { this.speed=0; }
  reduceLife(amt) {
    this.life -= amt;
    if (this.life < 0) { this.life += amt; this.anim.setMotion(Motion.DIE); }
  }
  fall(platforms) {
    let movement=0, unit = this.fallSpeed<0 ? -1 : 1;
    if (this.fallSpeed > GRAVITY) this.inAir = true;
    while (movement < Math.abs(this.fallSpeed)) {
      movement++; this.y += unit;
      for (const p of platforms) {
        if (goHit(this, p)) {
          this.y -= unit;
          if (this.fallSpeed > 0) this.inAir = false;
          this.fallSpeed = 0; return;
        }
      }
    }
    this.fallSpeed = Math.min(this.fallSpeed + GRAVITY, MAX_FALL);
  }
  move(platforms) {
    let movement=0, unit = this.speed<0 ? -1 : 1;
    while (movement < Math.abs(this.speed)) {
      movement++; this.x += unit;
      for (const p of platforms) {
        if (goHit(this, p)) { this.x -= unit; this.speed=0; return; }
      }
    }
  }
  draw(ctx) {
    this.anim.draw(ctx, this.x, this.y);
    // Lifebar
    ctx.fillStyle='red';   ctx.fillRect(this.x, this.y-this.h/2, 80, 10);
    ctx.fillStyle='#0f0';  ctx.fillRect(this.x, this.y-this.h/2, this.life*8, 10);
  }
}

// ==================== ENEMY ====================
class Enemy {
  constructor(x,y,w,h,imgKey,aDmg,hp,boss,maxSpd,detectRadius) {
    this.x=x; this.y=y; this.w=w||72; this.h=h||81;
    this.imgKey=imgKey; this.attackDamage=aDmg||1; this.health=hp||2;
    this.maxHealth=this.health; this.maxSpeed=maxSpd||4;
    this.speed=0; this.fallSpeed=0; this.inAir=true;
    this.attackDelay=5; this.visible=true; this.hitBullets=[];
    // Colliders: bottom-half box + full circle
    this.cols=[
      {t:'b', ox:0, oy:Math.floor(this.h/2), w:this.w, h:Math.floor(this.h/2)-5},
      {t:'c', ox:0, oy:0, r:Math.floor(this.w/2)}
    ];
    // Detection circle
    const dr = detectRadius || (boss ? 600 : 200);
    this.detect = {t:'c', ox: -dr+Math.floor(this.w/2), oy:-200+Math.floor(this.h/2), r:dr};
  }
  fall(platforms) {
    let movement=0, unit=this.fallSpeed<0?-1:1;
    if (this.fallSpeed>GRAVITY) this.inAir=true;
    while (movement<Math.abs(this.fallSpeed)) {
      movement++; this.y+=unit;
      for (const p of platforms) {
        if (goHit(this,p)) {
          this.y-=unit; if (this.fallSpeed>0) this.inAir=false;
          this.fallSpeed=0; return;
        }
      }
    }
    this.fallSpeed=Math.min(this.fallSpeed+GRAVITY, MAX_FALL);
  }
  doDetect(pc, platforms) {
    this.attackDelay -= 0.1;
    // Check if player is in detection range
    const dx = this.x+this.detect.ox, dy = this.y+this.detect.oy, dr = this.detect.r;
    const inRange = circleBox(dx,dy,dr, pc.x,pc.y,pc.w,pc.h);
    if (!inRange) return;
    const touching = goHit(pc, this);
    if (!touching && (this.x+this.w < pc.x || this.x > pc.x+pc.w)) {
      if (pc.x > this.x) { if (this.speed<=this.maxSpeed) this.speed++; }
      else { if (this.speed>=-this.maxSpeed) this.speed--; }
    } else if (touching && this.attackDelay<=0) {
      if (pc.life <= this.attackDamage) pc.life = 0;
      pc.reduceLife(this.attackDamage);
      this.attackDelay=5;
    } else { this.speed=0; }
    // Move
    let mv=0, u=this.speed<0?-1:1;
    while (mv<Math.abs(this.speed)) {
      mv++; this.x+=u;
      for (const p of platforms) {
        if (goHit(this,p)) { this.x-=u; this.speed=0; return; }
      }
    }
  }
  draw(ctx) {
    if (!this.visible) return;
    const im = imgs[this.imgKey];
    if (im) ctx.drawImage(im, this.x, this.y);
    else { ctx.fillStyle='#b42828'; ctx.fillRect(this.x,this.y,this.w,this.h); }
    // Health bar
    ctx.fillStyle='red';  ctx.fillRect(this.x, this.y-this.h/2, this.maxHealth*12, 10);
    ctx.fillStyle='#0f0'; ctx.fillRect(this.x, this.y-this.h/2, this.health*12, 10);
  }
}

// Enemy factory helpers matching Java constructors
function makeEnemy(x,y,img) { return new Enemy(x,y,72,81,img,1,2,false,4); }
function makeBoss(x,y,img,aDmg,hp,boss,spd) { return new Enemy(x,y,72,81,img,aDmg,hp,boss,spd); }
function makeBossR(x,y,img,aDmg,hp,boss,spd,rad) { return new Enemy(x,y,72,81,img,aDmg,hp,boss,spd,rad); }
function makeBossWH(x,y,w,h,img,aDmg,hp,boss,spd) { return new Enemy(x,y,w,h,img,aDmg,hp,boss,spd); }

// ==================== CAMERA ====================
class Camera {
  constructor() { this.x=0; this.y=0; }
  follow(pc, offX, offY) {
    this.x = pc.x - W/2 + pc.w/2 - offX;
    this.y = pc.y - H/2 + pc.w/2 - offY;  // note: pc.w/2 for Y too (matches Java)
  }
}

// ==================== TAG → IMAGE KEY MAP ====================
const tagImg = {
  base1:'base1', base2:'base2', base3:'base3', base4:'base4',
  smallStone:'rock', stone:'stone', enemyPlatform:'enemyPlatform',
  smallEnemyPlatform:'smallEnemyPlatform', moving1:'movingPlatform1',
  largeStilt:'largeStilt', mediumStilt:'mediumStilt', smallStilt:'smallStilt',
  miniStilt:'miniStilt', miniBase:'miniBase', sign:'sign1', pipe:'pipe2',
  // Level 2
  sewer1:'sewer1', sewer2:'sewer2img', sewer3:'sewer3', sewer4:'sewer4',
  pipe1:'pipe1', pipe2:'pipe2', extraPipe:'extraPipe',
  downArrow:'downArrow', upArrow:'upArrow',
  // Level 3
  pagota1:'pagota1', ledge:'ledge',
  // Shared
  'evil door':'evilDoor',
};
const signImgs = { 1:'sign1', 2:'sign2', 3:'sign3' };

// ==================== GAME ====================
class Game {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = State.TITLE;
    this.level = 0;
    this.pc = new Player();
    this.cam = new Camera();
    this.platforms = [];
    this.enemies = [];
    this.collectables = [];
    this.bullets = [];
    this.offset = 200;
    this.deathTimer = 0;
    this.bgKey = null;
    this.prevLevel = 0; // for pause
    // Input
    this.keys = {};
    this.setupInput();
    this.setupButtons();
  }

  // -------------------- INPUT --------------------
  setupInput() {
    window.addEventListener('keydown', e => { this.keys[e.code]=true; });
    window.addEventListener('keyup', e => { this.keys[e.code]=false; });
    this.cv.addEventListener('mousedown', e => this.onShoot(e));
  }
  onShoot(e) {
    if (this.pc.ammo < 1) return;
    const rect = this.cv.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const dir = (mx + this.cam.x) > this.pc.x + this.pc.w/2 ? 1 : -1;
    this.bullets.push(new Bullet(this.pc.x+this.pc.w/2, this.pc.y+this.pc.h/2, dir));
    this.pc.ammo--;
  }

  // -------------------- BUTTONS --------------------
  setupButtons() {
    const $ = id => document.getElementById(id);
    this.nextBtn = $('nextBtn');
    this.pauseBtn = $('pauseBtn');
    this.resumeBtn = $('resumeBtn');
    this.restartBtn = $('restartBtn');
    this.quitBtn = $('quitBtn');

    this.nextBtn.onclick = () => this.onNext();
    this.pauseBtn.onclick = () => {
      this.prevLevel = this.level;
      this.pauseBtn.style.display='none';
      this.resumeBtn.style.display='block';
      this.restartBtn.style.display='block';
      this.quitBtn.style.display='block';
      this.state = State.PAUSE;
    };
    this.resumeBtn.onclick = () => {
      this.pauseBtn.style.display='block';
      this.resumeBtn.style.display='none';
      this.restartBtn.style.display='none';
      this.quitBtn.style.display='none';
      const ls = [null,'LEVEL_1','LEVEL_2','LEVEL_3','LEVEL_4'];
      this.state = State[ls[this.level]];
    };
    this.restartBtn.onclick = () => {
      this.pauseBtn.style.display='block';
      this.resumeBtn.style.display='none';
      this.restartBtn.style.display='none';
      this.quitBtn.style.display='none';
      this.setLevel(this.level);
    };
    this.quitBtn.onclick = () => {
      this.resumeBtn.style.display='none';
      this.restartBtn.style.display='none';
      this.quitBtn.style.display='none';
      this.state = State.TITLE;
      this.nextBtn.style.display='block';
      stopSong();
    };
  }

  onNext() {
    switch(this.state) {
      case State.TITLE:
        this.state = State.BETWEEN_1_1; break;
      case State.BETWEEN_1_1:
        this.state = State.BETWEEN_1_2; break;
      case State.BETWEEN_1_2:
        this.level=1; this.setLevel(1); this.state=State.LEVEL_1;
        this.nextBtn.style.display='none'; this.pauseBtn.style.display='block'; break;
      case State.BETWEEN_2:
        this.level=2; this.setLevel(2); this.state=State.LEVEL_2;
        this.nextBtn.style.display='none'; this.pauseBtn.style.display='block'; break;
      case State.BETWEEN_3:
        this.level=3; this.setLevel(3); this.state=State.LEVEL_3;
        this.nextBtn.style.display='none'; this.pauseBtn.style.display='block'; break;
      case State.BETWEEN_4:
        this.level=4; this.setLevel(4); this.state=State.LEVEL_4;
        this.nextBtn.style.display='none'; this.pauseBtn.style.display='block'; break;
    }
  }

  // -------------------- LEVEL SETUP --------------------
  setLevel(s) {
    this.platforms=[]; this.enemies=[]; this.collectables=[]; this.bullets=[];
    this.pc.life=10; this.pc.ammo=10; this.pc.speed=0; this.pc.fallSpeed=0; this.pc.inAir=true;
    this.deathTimer=0;
    this.pc.anim.setMotion(Motion.IDLE);
    this.level = s;

    if (s===1) this.setupLevel1();
    else if (s===2) this.setupLevel2();
    else if (s===3) this.setupLevel3();
    else if (s===4) this.setupLevel4();
    else if (s===5) { /* end */ }

    // Assign images to platforms by tag
    for (const p of this.platforms) {
      if (s<=2 && p.tag==='sign') p.imgKey = signImgs[s] || 'sign1';
      else if (s===3 && p.tag==='sign') p.imgKey = 'sign3';
      else if (tagImg[p.tag]) p.imgKey = tagImg[p.tag];
    }

    const ls = [null, State.LEVEL_1, State.LEVEL_2, State.LEVEL_3, State.LEVEL_4];
    if (s>=1 && s<=4) { this.state = ls[s]; playSong(s); }
  }

  setupLevel1() {
    this.bgKey='bgOsaka'; this.offset=200;
    this.pc.x=30; this.pc.y=500;
    const P=(x,y,w,h,t)=>this.platforms.push(new Platform(x,y,w,h,t));
    // Collectables
    this.collectables.push(new Collectable('health',3400,370), new Collectable('ammo',3500,370),
      new Collectable('ammo',8600,370), new Collectable('health',5900,370), new Collectable('ammo',6000,370));
    // Boss
    this.enemies.push(makeBoss(9100,370,'boss',3,8,true,6));
    // Ground & platforms
    P(-1000,700,2200,300,'base1'); P(1600,700,800,300,'base2');
    P(-500,525,200,200,'sign'); P(1350,750,100,250,'miniBase');
    P(1200,400,400,50,'moving1');
    P(550,655,90,40,'smallStone'); P(800,550,150,50,'smallEnemyPlatform');
    P(800,600,10,100,'smallStilt'); P(940,600,10,100,'smallStilt');
    P(1850,550,150,50,'smallEnemyPlatform'); P(1850,600,10,100,'smallStilt'); P(1990,600,10,100,'smallStilt');
    P(2600,700,200,300,'base2'); P(2800,625,400,375,'base2'); P(3000,550,200,450,'base4');
    P(3200,475,400,525,'base3');
    P(3700,525,400,50,'enemyPlatform'); P(3700,575,10,425,'mediumStilt'); P(4090,575,10,425,'mediumStilt');
    P(4200,375,400,50,'enemyPlatform'); P(4200,425,10,575,'largeStilt'); P(4590,425,10,575,'largeStilt');
    P(4700,525,400,50,'enemyPlatform'); P(4700,575,10,425,'mediumStilt'); P(5090,575,10,425,'mediumStilt');
    P(5200,375,400,50,'enemyPlatform'); P(5200,425,10,575,'largeStilt'); P(5590,425,10,575,'largeStilt');
    P(5800,475,400,525,'base3');
    P(6300,475,100,50,'stone'); P(6400,500,100,50,'stone'); P(6500,525,100,50,'stone');
    P(6600,550,100,50,'stone'); P(6700,575,100,50,'stone'); P(6800,600,100,50,'stone');
    P(6900,625,100,50,'stone'); P(7000,650,100,50,'stone');
    P(6350,487,100,50,'stone'); P(6450,512,100,50,'stone'); P(6550,537,100,50,'stone');
    P(6650,562,100,50,'stone'); P(6750,587,100,50,'stone'); P(6850,612,100,50,'stone');
    P(6950,637,100,50,'stone'); P(7050,662,100,50,'stone');
    P(7350,575,400,50,'enemyPlatform'); P(7350,575,10,425,'mediumStilt'); P(7740,575,10,425,'mediumStilt');
    P(7650,525,10,50,'miniStilt');
    P(7650,475,400,50,'enemyPlatform'); P(8040,475,10,525,'largeStilt'); P(7950,425,10,50,'miniStilt');
    P(7950,375,400,50,'enemyPlatform'); P(8340,425,10,575,'largeStilt');
    P(8500,475,400,525,'base3'); P(8900,475,400,525,'base3');
    P(9250,475,20,525,'pipe'); P(9400,0,20,1000,'');
    // Enemies
    this.enemies.push(makeEnemy(825,400,'enemyRanger'), makeEnemy(1875,400,'enemyRanger'),
      makeEnemy(4000,400,'enemyRanger'), makeEnemy(4500,200,'enemyRanger'),
      makeEnemy(5000,400,'enemyRanger'), makeEnemy(5500,200,'enemyRanger'),
      makeEnemy(7200,200,'enemyRanger'), makeEnemy(7700,200,'enemyRanger'), makeEnemy(8250,200,'enemyRanger'));
  }

  setupLevel2() {
    this.bgKey='bgSewer'; this.offset=200;
    this.pc.x=600; this.pc.y=550;
    const P=(x,y,w,h,t)=>this.platforms.push(new Platform(x,y,w,h,t));
    this.collectables.push(new Collectable('health',1600,320), new Collectable('ammo',1450,190),
      new Collectable('health',2900,320), new Collectable('ammo',3150,190),
      new Collectable('health',4500,820), new Collectable('ammo',4400,820), new Collectable('ammo',4700,1220));
    this.enemies.push(makeBossWH(4900,370,80,100,'boss',3,4,true,6));
    P(-1000,700,2200,300,'sewer1'); P(1350,700,2200,300,'sewer1');
    P(0,525,200,200,'sign');
    P(-600,-400,2200,300,'sewer1');
    P(600,-100,195,575,'pipe1'); P(1200,540,195,460,'pipe2');
    P(1600,400,300,25,'sewer4'); P(1900,400,300,25,'sewer4');
    P(2400,400,300,25,'sewer4'); P(2700,400,300,25,'sewer4');
    P(2150,550,300,25,'sewer4');
    P(1400,250,300,25,'sewer4'); P(1700,250,300,25,'sewer4');
    P(2600,250,300,25,'sewer4'); P(2900,250,300,25,'sewer4');
    P(3550,540,50,460,'pipe2');
    P(3615,350,1,1,'downArrow'); P(3700,200,50,700,'');
    P(2600,1300,2250,300,'sewer1'); P(5050,1300,2250,300,'sewer1');
    P(4000,1150,300,25,'sewer4'); P(4200,1025,300,25,'sewer4');
    P(4400,900,300,25,'sewer4'); P(4600,775,300,25,'sewer4');
    P(4800,650,300,25,'sewer4'); P(5000,775,300,25,'sewer4');
    P(5200,900,300,25,'sewer4'); P(5400,1025,300,25,'sewer4'); P(5600,1150,300,25,'sewer4');
    P(6050,1150,195,460,'pipe2');
    P(6600,560,195,375,'pipe1'); P(6600,560,10,575,'pipe1'); P(6600,300,10,575,'extraPipe');
    P(6800,560,10,800,'');
    P(6650,1350,1,1,'upArrow');
    this.enemies.push(makeEnemy(1900,300,'enemyRanger'), makeEnemy(2600,300,'enemyRanger'),
      makeEnemy(1700,100,'enemyRanger'), makeEnemy(2800,100,'enemyRanger'),
      makeEnemy(4750,1220,'enemyRanger'), makeEnemy(2260,620,'enemyRanger'));
  }

  setupLevel3() {
    this.bgKey='bgTokyo'; this.offset=-100;
    this.pc.x=50; this.pc.y=200;
    const P=(x,y,w,h,t)=>this.platforms.push(new Platform(x,y,w,h,t));
    // Bosses
    this.enemies.push(makeBoss(2280,410,'boss',3,4,true,6),
      makeBoss(4070,470,'boss',3,4,true,6), makeBoss(8010,510,'boss',3,4,true,6));
    // Normal
    this.enemies.push(makeEnemy(7900,510,'enemyRanger'), makeEnemy(760,390,'enemyRanger'),
      makeEnemy(1060,515,'enemyRanger'), makeEnemy(1500,515,'enemyRanger'),
      makeEnemy(3570,315,'enemyRanger'), makeEnemy(5030,510,'enemyRanger'), makeEnemy(6430,510,'enemyRanger'));
    this.collectables.push(new Collectable('health',2770,290), new Collectable('health',4600,410),
      new Collectable('health',6790,410), new Collectable('ammo',1771,392),
      new Collectable('ammo',3750,322), new Collectable('ammo',4630,410), new Collectable('ammo',5730,360));
    P(-300,500,200,1000,'sign');
    // Skyscrapers
    P(-25,560,560,800,'ledge'); P(700,475,225,800,'pagota1');
    P(1050,600,560,800,'ledge'); P(1710,475,225,800,'pagota1');
    P(2040,500,560,800,'ledge'); P(2700,375,225,800,'pagota1');
    P(3100,400,560,800,'ledge'); P(3825,560,560,800,'ledge');
    P(4500,500,225,800,'pagota1');
    P(4800,600,560,800,'ledge'); P(5500,450,560,800,'ledge'); P(6200,600,560,800,'ledge');
    P(6900,500,225,800,'pagota1');
    P(7300,600,560,800,'ledge'); P(7800,600,560,800,'ledge'); P(8300,600,560,800,'ledge');
    P(8677,370,1,1,'evil door');
  }

  setupLevel4() {
    this.bgKey='bgDojo'; this.offset=250;
    this.pc.x=2530; this.pc.y=500;
    const P=(x,y,w,h,t)=>this.platforms.push(new Platform(x,y,w,h,t));
    this.collectables.push(new Collectable('health',2230,610), new Collectable('ammo',2290,610),
      new Collectable('ammo',3350,610), new Collectable('health',3400,610), new Collectable('ammo',3660,610));
    P(4000,500,1,1,'evil door');
    P(2200,700,2300,25,''); P(2200,-500,10,2000,''); P(4200,-500,10,2000,'');
    this.enemies.push(
      makeBossR(3060,600,'enemyRanger',2,3,true,6,500),
      makeBossR(2960,600,'enemyRanger',2,3,true,6,500),
      makeBossWH(4100,500,144,162,'boss2',4,8,true,6),
      makeBossR(3700,500,'boss',3,6,true,6,800)
    );
  }

  // -------------------- GAME LOOP --------------------
  tick() {
    const isLevel = [State.LEVEL_1,State.LEVEL_2,State.LEVEL_3,State.LEVEL_4].includes(this.state);
    if (isLevel && this.pc.life > 0) {
      this.deathTimer = 0;
      if (this.keys['Space']) this.pc.jump();
      if (this.keys['KeyA']) this.pc.speedLeft();
      if (this.keys['KeyD']) this.pc.speedRight();
      if ((!this.keys['KeyA']&&!this.keys['KeyD'])||(this.keys['KeyA']&&this.keys['KeyD'])) this.pc.slowDown();
      this.checkLevelTransitions();
      this.physicsUpdate();
    } else if (isLevel && this.pc.life <= 0) {
      this.deathTimer++;
      if (this.deathTimer >= DEATH_DELAY) { this.deathTimer=0; this.setLevel(this.level); }
    }
    this.render();
  }

  checkLevelTransitions() {
    const pc = this.pc;
    if (this.state===State.LEVEL_1) {
      if (pc.x>9000 && pc.y>800) {
        pc.stopRun(); this.state=State.BETWEEN_2; this.level=2;
        this.nextBtn.style.display='block'; this.pauseBtn.style.display='none';
      } else if (pc.x<=8999 && pc.y>800) this.setLevel(1);
    } else if (this.state===State.LEVEL_2) {
      if (pc.x>6600 && pc.y<1120) {
        pc.stopRun(); this.state=State.BETWEEN_3; this.level=3;
        this.nextBtn.style.display='block'; this.pauseBtn.style.display='none';
      } else if (pc.x<=6600 && pc.y>1400) this.setLevel(2);
    } else if (this.state===State.LEVEL_3) {
      if (pc.x>8680 && pc.y<8860) {
        pc.stopRun(); this.state=State.BETWEEN_4; this.level=4;
        this.nextBtn.style.display='block'; this.pauseBtn.style.display='none';
      } else if (pc.x<=8679 && pc.y>700) this.setLevel(3);
    } else if (this.state===State.LEVEL_4) {
      if (pc.x>4000) {
        pc.stopRun(); this.state=State.END; this.level=5;
        this.nextBtn.style.display='none'; this.pauseBtn.style.display='none';
        this.quitBtn.style.display='block';
      }
    }
  }

  physicsUpdate() {
    const pc = this.pc;
    pc.move(this.platforms);
    // Bullets
    for (let i=this.bullets.length-1; i>=0; i--) {
      const b = this.bullets[i];
      if (b.move(this.platforms)) { this.bullets.splice(i,1); continue; }
      // Bullet hit platform → stop
      for (const p of this.platforms) {
        if (goHit(b,p)) { b.speed=0; break; }
      }
      // Bullet hit enemy
      for (let j=this.enemies.length-1; j>=0; j--) {
        const en = this.enemies[j];
        if (goHit(en,b) && !en.hitBullets.includes(b) && b.usable) {
          b.usable=false; en.hitBullets.push(b);
          if (en.health<=1) this.enemies.splice(j,1);
          else en.health--;
          b.visible=false;
        }
      }
    }
    // Collectables
    for (let i=this.collectables.length-1; i>=0; i--) {
      const c = this.collectables[i];
      if (goHit(c, pc)) {
        if (c.type==='ammo' && pc.ammo<10) {
          pc.ammo = pc.ammo>=5 ? 10 : pc.ammo+5;
          this.collectables.splice(i,1);
        } else if (c.type==='health' && pc.life<10) {
          pc.life = pc.life>=6 ? 10 : pc.life+4;
          this.collectables.splice(i,1);
        }
      }
    }
    // Enemies
    for (let i=this.enemies.length-1; i>=0; i--) {
      const en = this.enemies[i];
      en.fall(this.platforms);
      en.doDetect(pc, this.platforms);
      if (this.state===State.LEVEL_1 && en.y>=900) this.enemies.splice(i,1);
    }
    pc.fall(this.platforms);
    this.cam.follow(pc, 0, this.offset);
  }

  // -------------------- RENDERING --------------------
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0,0,W,H);

    switch(this.state) {
      case State.TITLE: this.drawPage(ctx,'page1'); break;
      case State.BETWEEN_1_1: this.drawPage(ctx,'page2'); break;
      case State.BETWEEN_1_2: this.drawPage(ctx,'page3'); break;
      case State.BETWEEN_2: this.drawPage(ctx,'page4'); break;
      case State.BETWEEN_3: this.drawPage(ctx,'page5'); break;
      case State.BETWEEN_4: this.drawPage(ctx,'page6'); break;
      case State.END: this.drawPage(ctx,'page7'); break;
      case State.LEVEL_1: this.drawLevel(ctx,1); break;
      case State.LEVEL_2: this.drawLevel(ctx,2); break;
      case State.LEVEL_3: this.drawLevel(ctx,3); break;
      case State.LEVEL_4: this.drawLevel(ctx,4); break;
      case State.PAUSE: this.drawLevel(ctx,this.level); this.drawPause(ctx); break;
    }
  }

  drawPage(ctx, key) {
    const im = imgs[key];
    if (im) ctx.drawImage(im, 0, 0, W, H);
    else { ctx.fillStyle='#141420'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#c8b48c'; ctx.font='48px serif';
      ctx.fillText('Loading...', W/2-100, H/2); }
  }

  drawLevel(ctx, n) {
    ctx.save();
    ctx.translate(-this.cam.x, -this.cam.y);
    // Background with parallax
    const bg = imgs[this.bgKey];
    if (bg) {
      let bx, by;
      if (n===1) { bx=-800+Math.floor(this.pc.x*53/57); by=-400-Math.floor(this.pc.y/7); }
      else if (n===2) { bx=-800+Math.floor(this.pc.x*53/57); by=-600+Math.floor(this.pc.y*40/57); }
      else if (n===3) { bx=-800+Math.floor(this.pc.x*53/57); by=-100-Math.floor(this.pc.y*5/57); }
      else { bx=this.cam.x+this.pc.w/2-Math.floor(this.pc.x/23); by=this.cam.y; }
      ctx.drawImage(bg, bx, by);
    } else {
      const colors = [null,'rgb(135,170,210)','rgb(60,70,60)','rgb(80,80,100)','rgb(120,60,40)'];
      ctx.fillStyle=colors[n]; ctx.fillRect(this.cam.x,this.cam.y,W,H);
    }
    // Game objects
    this.pc.draw(ctx);
    for (const p of this.platforms) p.draw(ctx);
    for (const c of this.collectables) c.draw(ctx);
    for (const b of this.bullets) b.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    // HUD
    this.drawHUD(ctx);
    ctx.restore();
  }

  drawHUD(ctx) {
    // Ammo bar (right side)
    ctx.fillStyle='cyan';
    ctx.fillRect(W+this.cam.x-50, H+this.cam.y-60, 25, this.pc.ammo*4);
    ctx.font='20px serif'; ctx.fillStyle='cyan';
    ctx.fillText(this.pc.ammo+'', W+this.cam.x-50, H+this.cam.y-65);
    // Pause bars
    ctx.fillStyle='black';
    ctx.fillRect(this.cam.x+10, this.cam.y+700, 20, 60);
    ctx.fillRect(this.cam.x+40, this.cam.y+700, 20, 60);
  }

  drawPause(ctx) {
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgb(93,159,183)'; ctx.fillRect(0,0,600,H);
    ctx.fillStyle='rgb(61,106,122)'; ctx.fillRect(585,0,15,H);
    ctx.fillStyle='white'; ctx.font='20px serif';
    ctx.fillText('PAUSE', 30, 30);
    ctx.font='15px serif';
    ctx.fillText('Level '+this.level, 30, 60);
  }

  // -------------------- START --------------------
  start() {
    document.getElementById('loading').style.display='none';
    this.nextBtn.style.display='block';
    setInterval(() => this.tick(), TICK);
  }
}

// ==================== SCALING ====================
function fitCanvas() {
  const container = document.getElementById('container');
  const scale = Math.min(window.innerWidth/W, window.innerHeight/H);
  container.style.transform = `scale(${scale})`;
}

// ==================== INIT ====================
window.onload = async () => {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  await loadAssets();
  const game = new Game(document.getElementById('c'));
  game.start();
};
