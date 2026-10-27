// ===== KATSUYA'S REVENGE — HTML5 Canvas Port =====
// Port of the Java Swing game; gameplay logic mirrors GamePanel.java / Enemy.java.

// ==================== CONSTANTS ====================
const W = 1600, H = 800, TICK = 20;
const GRAVITY = 1, MAX_FALL = 20;
const PLAYER_MAX_SPEED = 5, JUMP_FORCE = -18;
// Death screen: the fall plays, the overlay fades in, then a Restart Level button appears
const DEATH_FADE_START = 30, DEATH_SCREEN_AT = 80;

const State = {
  TITLE:'TITLE', BETWEEN_1_1:'BETWEEN_1_1', BETWEEN_1_2:'BETWEEN_1_2',
  LEVEL_1:'LEVEL_1', BETWEEN_2:'BETWEEN_2', LEVEL_2:'LEVEL_2',
  BETWEEN_3:'BETWEEN_3', LEVEL_3:'LEVEL_3', BETWEEN_4:'BETWEEN_4',
  LEVEL_4:'LEVEL_4', END:'END', PAUSE:'PAUSE'
};
// Rows of images/pcNewAttempt2.png (see GenerateGameArt.generatePlayerSprite / PlayerMotionState.java)
const Motion = { RUN_RIGHT:0, THROW:1, IDLE:2, DIE:3, RUN_LEFT:4, IDLE_LEFT:5, THROW_LEFT:6, DIE_LEFT:7, JUMP_RIGHT:8, JUMP_LEFT:9 };
const FRAME_COUNTS = [5,2,8,2,5,8,2,2,2,2];
// Katana slash (S key): 18-tick swing that cuts on ticks 13..6 for 2 damage; swings chain back to back
const SLASH_TICKS = 18, SLASH_COOLDOWN = 18, SLASH_REACH = 100, SLASH_DAMAGE = 2;

// Dojo arena (see GamePanel.java)
const ARENA_TRIGGER_X = 4560, ARENA_GATE_X = 4380, ARENA_GATE_REST_Y = 300;
const DOJO_CAM0 = 1441; // camera x at the dojo's left wall, where parallax layers start

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
    loadImg('player',I+'pcNewAttempt2.png'), loadImg('slash',I+'pcSlash.png'),
    loadImg('enemyRanger',I+'enemyRanger.png'), loadImg('boss',I+'boss.png'), loadImg('boss2',I+'boss2.png'),
    loadImg('knifeR',I+'throwingKnifeRight.png'), loadImg('knifeL',I+'throwingKnifeLeft.png'),
    loadImg('knifeAmmo',I+'throwingKnifeAmmo.png'), loadImg('health',I+'health.png'),
    loadImg('shuriken',I+'shuriken.png'), loadImg('seal',I+'seal.png'),
    loadImg('dojoGate',I+'dojoGate.png'), loadImg('dojoFloor',I+'dojoFloor.png'),
    loadImg('checkpoint',I+'checkpoint.png'), loadImg('checkpointLit',I+'checkpointLit.png'),
    loadImg('base1',I+'base1.png'), loadImg('base2',I+'base2.png'),
    loadImg('base3',I+'base3.png'), loadImg('base4',I+'base4.png'),
    loadImg('rock',I+'rock.png'), loadImg('stone',I+'stone.png'), loadImg('stoneColumn',I+'stoneColumn.png'),
    loadImg('pipeTall',I+'pipeTall.png'), loadImg('sewerCeiling',I+'sewerCeiling.png'), loadImg('sewerPillar',I+'sewerPillar.png'),
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
    loadImg('bgTokyo',B+'city2.jpg'),
    loadImg('dojoSky',B+'dojo_sky.jpg'), loadImg('dojoClouds',B+'dojo_clouds.png'),
    loadImg('dojoTemple',B+'dojo_temple.png'), loadImg('dojoFore',B+'dojo_fore.png'),
    loadImg('dojoSkySunset',B+'dojo_sky_sunset.jpg'), loadImg('dojoCloudsSunset',B+'dojo_clouds_sunset.png'),
    loadImg('dojoTempleSunset',B+'dojo_temple_sunset.png'),
    loadImg('page1',I+'Page1-2.PNG'), loadImg('page2',I+'Page2.PNG'), loadImg('page3',I+'Page3.PNG'),
    loadImg('page4',I+'Page4.PNG'), loadImg('page5',I+'PAGE5.PNG'),
    loadImg('page6',I+'PAGE6.PNG'), loadImg('page7',I+'Page7.PNG'),
    ...['cut_home','cut_raid','cut_ashes','cut_banner','cut_vow','cut_sewer','cut_storm',
        'cut_gate','cut_warlord','cut_victory','cut_dawn','cut_duel','cut_pyre','cut_journey'].map(k => loadImg(k, I+'Cutscenes/'+k+'.jpg')),
    ...CUT_LAYERS.map(k => loadImg('cut_'+k, I+'Cutscenes/'+k+'.png')),
    loadImg('title_bg', I+'Cutscenes/title_bg.jpg'),
  ]);
}

// White silhouettes of enemy sprites for the hit flash
const flashCache = {};
function flashImg(key) {
  if (flashCache[key] !== undefined) return flashCache[key];
  const im = imgs[key];
  if (!im) return (flashCache[key] = null);
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  return (flashCache[key] = c);
}

// ==================== AUDIO ====================
let currentSong = null;
let currentSongLevel = 0;
function playSong(n) {
  if (currentSong) { currentSong.pause(); currentSong.currentTime = 0; }
  try {
    currentSong = new Audio('songs/Level '+n+'.mp3');
    currentSong.loop = true; currentSong.play().catch(()=>{});
    currentSongLevel = n;
  } catch(e) { currentSong = null; }
}
/** Credits music: the soundtrack from the original Kamikaze Studios trailer. */
function playCredits() {
  if (currentSong) { currentSong.pause(); currentSong.currentTime = 0; }
  try {
    currentSong = new Audio('songs/Credits.mp3');
    currentSong.loop = true; currentSong.play().catch(()=>{});
    currentSongLevel = 5;
  } catch(e) { currentSong = null; }
}
function stopSong() { if (currentSong) { currentSong.pause(); currentSong.currentTime = 0; } currentSongLevel = 0; }

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
    // Untagged platforms are invisible walls and floors
    if (!this.visible || !this.imgKey) return;
    const im = imgs[this.imgKey];
    // Floor pieces show only as much brick as they are wide (lets short filler pieces work)
    if (im && this.tag === 'sewer1') { const w = Math.min(this.w, im.width); ctx.drawImage(im, 0, 0, w, im.height, this.x, this.y, w, im.height); }
    else if (im) ctx.drawImage(im, this.x, this.y);
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
  move() {
    this.x += this.speed * this.dir;
    this.deathTime -= 0.1;
    return this.deathTime <= 0; // should remove
  }
  draw(ctx) {
    if (!this.visible) return;
    const k = this.dir>0 ? 'knifeR' : 'knifeL';
    if (imgs[k]) ctx.drawImage(imgs[k], this.x, this.y);
    else { ctx.fillStyle='#ccc'; ctx.fillRect(this.x,this.y,55,15); }
  }
}

/** Throwing star the Red Clan ninjas fling at the player. */
class Shuriken {
  constructor(x,y,dir) {
    this.x=x-12; this.y=y; this.w=24; this.h=24; this.dir=dir; this.life=80; this.spin=0;
    this.cols=[{t:'b',ox:4,oy:4,w:16,h:16}];
  }
  /** Moves the star; returns true once it should be removed (hit a wall or expired). */
  update(platforms) {
    this.x += this.dir*9; this.spin += 0.6; this.life--;
    for (const p of platforms) if (goHit(this,p)) return true;
    return this.life <= 0;
  }
  draw(ctx) {
    ctx.save(); ctx.translate(this.x+12, this.y+12); ctx.rotate(this.spin);
    if (imgs.shuriken) ctx.drawImage(imgs.shuriken, -12, -12);
    else { ctx.fillStyle='#bbb'; ctx.fillRect(-8,-8,16,16); }
    ctx.restore();
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
    this.count=1; this.cycle=0; this.hold=new Set(); // clips that stop on their last frame (death)
  }
  setMotion(st) { if (st!==this.clip) { this.clip=st; this.frame=0; } }
  draw(ctx, x, y, visible) {
    const img = imgs[this.imgKey];
    if (visible) {
      if (img) {
        const sx=this.frame*this.fw, sy=this.clip*this.fh;
        ctx.drawImage(img, sx,sy,this.fw,this.fh, x,y,this.fw,this.fh);
      } else {
        ctx.fillStyle='#3c78c8'; ctx.fillRect(x,y,this.fw,this.fh);
        ctx.strokeStyle='#fff'; ctx.strokeRect(x,y,this.fw,this.fh);
      }
    }
    this.count++;
    if (this.count % 7 === 0) {
      const last = this.frameCounts[this.clip]-1;
      if (!(this.hold.has(this.clip) && this.frame >= last)) this.frame++;
      if (this.frame > last) { this.frame=0; this.cycle++; }
      this.count=1;
    }
  }
}

// ==================== PHYSICS (shared by player and enemies) ====================
function fallBody(b, platforms) {
  let movement=0; const unit = b.fallSpeed<0 ? -1 : 1;
  if (b.fallSpeed > GRAVITY) b.inAir = true;
  while (movement < Math.abs(b.fallSpeed)) {
    movement++; b.y += unit;
    for (const p of platforms) {
      if (goHit(b, p)) {
        b.y -= unit;
        if (b.fallSpeed > 0) b.inAir = false;
        b.fallSpeed = 0; return;
      }
    }
  }
  b.fallSpeed = Math.min(b.fallSpeed + GRAVITY, MAX_FALL);
}
function moveBody(b, platforms) {
  let movement=0; const unit = b.speed<0 ? -1 : 1;
  while (movement < Math.abs(b.speed)) {
    movement++; b.x += unit;
    for (const p of platforms) {
      if (goHit(b, p)) { b.x -= unit; b.speed=0; return; }
    }
  }
}

// ==================== PLAYER ====================
class Player {
  constructor() {
    this.x=30; this.y=500; this.w=82; this.h=82;
    this.speed=0; this.fallSpeed=0; this.inAir=true;
    this.life=10; this.ammo=10;
    this.facing=1; this.throwTimer=0; this.invulnerable=0;
    this.slashTimer=0; this.slashCooldown=0; this.slashVictims=new Set();
    // A counter needs a deliberate, timed slash: one started after a short pause, not chained from spamming
    this.slashIdle=0; this.focusedSlash=false;
    this.cols=[{t:'b',ox:0,oy:0,w:82,h:82}];
    this.anim = new Animation('player',82,82,FRAME_COUNTS);
    this.anim.hold.add(Motion.DIE); this.anim.hold.add(Motion.DIE_LEFT);
    this.anim.setMotion(Motion.IDLE);
  }
  /** Clears per-life state when a level (re)starts. */
  reset() {
    this.speed=0; this.fallSpeed=0; this.inAir=true;
    this.facing=1; this.throwTimer=0; this.invulnerable=0;
    this.slashTimer=0; this.slashCooldown=0;
  }
  /** Starts a katana swing in the facing direction if the last one has finished. */
  slash() {
    if (this.slashCooldown > 0 || this.life <= 0) return;
    this.focusedSlash = this.slashIdle >= 8; this.slashIdle = 0;
    this.slashTimer = SLASH_TICKS; this.slashCooldown = SLASH_COOLDOWN;
    this.throwTimer = 0; this.slashVictims.clear();
  }
  /** True during the part of the swing where the blade can cut. */
  slashActive() { return this.slashTimer >= 6 && this.slashTimer <= 13; }
  /** True while a deliberate (not spammed) slash is cutting: only these can counter an attack. */
  counterSlash() { return this.slashActive() && this.focusedSlash; }
  /** Area in front of the ninja the blade sweeps. */
  slashBox() {
    const cx = this.x + this.w/2;
    return { x: this.facing>0 ? cx : cx-SLASH_REACH, y: this.y-10, w: SLASH_REACH, h: this.h+10 };
  }
  /** Each swing hits a given target once. */
  cutOnce(t) { if (this.slashVictims.has(t)) return false; this.slashVictims.add(t); return true; }
  jump() {
    if (this.inAir) return;
    this.fallSpeed = JUMP_FORCE; this.inAir = true;
  }
  speedLeft() { if (this.speed >= -PLAYER_MAX_SPEED) this.speed--; this.facing=-1; }
  speedRight() { if (this.speed <= PLAYER_MAX_SPEED) this.speed++; this.facing=1; }
  slowDown() {
    if (this.speed>0) this.speed--;
    else if (this.speed<0) this.speed++;
  }
  stopRun() { this.speed=0; }
  reduceLife(amt) {
    this.life -= amt;
    if (this.life < 0) this.life += amt;
  }
  /** Enemy hit with knockback and a short mercy window. Returns false if ignored. */
  takeHit(dmg, dir) {
    if (this.invulnerable > 0 || this.life <= 0) return false;
    if (this.life <= dmg) this.life = 0;
    this.reduceLife(dmg);
    this.speed = dir*8; this.fallSpeed = -7; this.inAir = true;
    this.invulnerable = 50;
    return true;
  }
  throwAt(dir) { this.facing = dir; this.throwTimer = 12; }
  /** Per-tick timers and picking the animation row from what the ninja is doing. */
  tick() {
    if (this.invulnerable > 0) this.invulnerable--;
    if (this.throwTimer > 0) this.throwTimer--;
    if (this.slashTimer > 0) this.slashTimer--;
    if (this.slashCooldown > 0) this.slashCooldown--; else this.slashIdle++;
    const left = this.facing < 0;
    let st;
    if (this.life <= 0) st = left ? Motion.DIE_LEFT : Motion.DIE;
    else if (this.throwTimer > 0) st = left ? Motion.THROW_LEFT : Motion.THROW;
    else if (this.inAir) st = left ? Motion.JUMP_LEFT : Motion.JUMP_RIGHT;
    else if (this.speed !== 0) st = this.speed > 0 ? Motion.RUN_RIGHT : Motion.RUN_LEFT;
    else st = left ? Motion.IDLE_LEFT : Motion.IDLE;
    this.anim.setMotion(st);
  }
  fall(platforms) { fallBody(this, platforms); }
  move(platforms) { moveBody(this, platforms); }
  draw(ctx) {
    // Blink while invulnerable after a hit
    const shown = this.invulnerable === 0 || Math.floor(this.invulnerable/3) % 2 === 0;
    if (this.slashTimer > 0 && this.life > 0 && imgs.slash) {
      // Slash frames are 164x96 with the body centred, so they sit 41px left and 14px up
      const frame = this.slashTimer > 12 ? 0 : this.slashTimer > 6 ? 1 : 2;
      const row = this.facing > 0 ? 0 : 1;
      if (shown) ctx.drawImage(imgs.slash, frame*164, row*96, 164, 96, this.x-41, this.y-14, 164, 96);
    } else this.anim.draw(ctx, this.x, this.y, shown);
    ctx.fillStyle='red';   ctx.fillRect(this.x, this.y-this.h/2, 80, 10);
    ctx.fillStyle='#0f0';  ctx.fillRect(this.x, this.y-this.h/2, this.life*8, 10);
    ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=2; ctx.strokeRect(this.x, this.y-this.h/2, 80, 10);
  }
}

// ==================== ENEMY ====================
// Behaviour per kind (picked from the sprite):
//  - Red Clan grunt: patrols, chases, jumps walls/gaps, drops off ledges after you, throws shuriken
//    at range, sometimes jumps over kunai, slashes after a telegraphed wind-up.
//  - Shadow ninja: faster, dodges more, lunges with a telegraphed dash.
//  - Samurai warlord: never staggers. While guarding he parries most hits from the front and
//    answers a parried sword strike with a fast counter-slash; mid-attack his armor halves sword
//    damage. The opening is his short recovery after a swing, or his back. Slashes, dashes and
//    shockwave leaps; faster at half health (phase 2) and again at a quarter (phase 3).
const ES = { PATROL:0, CHASE:1, WINDUP:2, RECOVER:3, DASH_WINDUP:4, DASH:5, LEAP:6, STAGGER:7 };
// Counters: just before a wind-up strike lands (the "!" turns white) a deliberate katana slash clashes
// with it, cancelling the attack and leaving the enemy staggered: dazed, unable to parry, hurt more.
const COUNTER_WINDOW = 16;
const KIND = { GRUNT:0, SHADOW:1, SAMURAI:2 };

class Enemy {
  constructor(x,y,w,h,imgKey,aDmg,hp,maxSpd,detectRadius) {
    this.x=x; this.y=y; this.w=w||72; this.h=h||81;
    this.imgKey=imgKey; this.attackDamage=aDmg||1; this.health=hp||2;
    this.maxHealth=this.health; this.maxSpeed=maxSpd||4;
    this.speed=0; this.fallSpeed=0; this.inAir=true;
    this.visible=true; this.hitBullets=[];
    this.cols=[
      {t:'b', ox:0, oy:Math.floor(this.h/2), w:this.w, h:Math.floor(this.h/2)-5},
      {t:'c', ox:0, oy:0, r:Math.floor(this.w/2)}
    ];
    this.detectRadius = detectRadius;
    this.kind = imgKey==='boss2' ? KIND.SAMURAI : imgKey==='boss' ? KIND.SHADOW : KIND.GRUNT;
    this.guardian=false; this.active=true;
    this.state=ES.PATROL; this.stateTimer=0; this.facing=-1; this.spawnX=x; this.aggro=0;
    this.attackCooldown=30; this.rangedCooldown=60; this.dashCooldown=60; this.leapCooldown=120;
    this.hurtTimer=0; this.flashTimer=0; this.slashTimer=0; this.shockTimer=0; this.shockX=0; this.shockY=0; this.parryTimer=0;
    this.dashHit=false; this.walkPhase=0; this.dodged=new Set();
  }
  setActive(a) { this.active=a; if (a) this.aggro=400; }
  fall(platforms) { fallBody(this, platforms); }
  jump() { if (this.inAir) return; this.fallSpeed=JUMP_FORCE; this.inAir=true; }
  slowDown() { if (this.speed>0) this.speed--; else if (this.speed<0) this.speed++; }
  enter(s, t) { this.state=s; this.stateTimer=t; }
  moveBlocked(platforms) { const before=this.speed; moveBody(this, platforms); return before!==0 && this.speed===0; }
  solidAt(platforms, px, top, depth) {
    for (const p of platforms)
      if (px>=p.x && px<=p.x+p.w && p.y<=top+depth && p.y+p.h>=top-2) return true;
    return false;
  }
  /** No floor just past the leading foot. */
  ledgeAhead(platforms) {
    const px = this.facing>0 ? this.x+this.w+6 : this.x-6;
    return !this.solidAt(platforms, px, this.y+this.h-5, 48);
  }
  /** Somewhere to land within jumping distance ahead. */
  landingAhead(platforms) {
    const feet=this.y+this.h-5;
    for (let d=60; d<=240; d+=20) {
      const px = this.facing>0 ? this.x+this.w+d : this.x-d;
      if (this.solidAt(platforms, px, feet-120, 220)) return true;
    }
    return false;
  }
  /** Dropping off the ledge ahead lands on something rather than out of the level. */
  floorBelowAhead(platforms) {
    const px = this.facing>0 ? this.x+this.w+30 : this.x-30;
    return this.solidAt(platforms, px, this.y+this.h, 450);
  }
  windupTicks(enraged) {
    if (this.kind===KIND.SAMURAI) return this.phase()>=3 ? 10 : enraged ? 14 : 22;
    return this.kind===KIND.SHADOW ? 12 : 18;
  }

  update(pc, platforms, bullets, shots) {
    if (this.slashTimer>0) this.slashTimer--;
    if (this.shockTimer>0) this.shockTimer--;
    if (this.flashTimer>0) this.flashTimer--;
    if (this.parryTimer>0) this.parryTimer--;
    if (!this.active) { this.speed=0; return; }
    if (this.attackCooldown>0) this.attackCooldown--;
    if (this.rangedCooldown>0) this.rangedCooldown--;
    if (this.dashCooldown>0) this.dashCooldown--;
    if (this.leapCooldown>0) this.leapCooldown--;

    const myCx=this.x+this.w/2, myFeet=this.y+this.h;
    const dx=(pc.x+pc.w/2)-myCx, dy=(pc.y+pc.h)-myFeet;
    const toward = dx>=0 ? 1 : -1;

    // Spot the player in range; keep chasing for a while after losing them
    if (pc.life<=0) this.aggro=0;
    else if (Math.abs(dx)<=this.detectRadius && Math.abs(dy)<260) this.aggro = this.guardian?400:150;
    else if (this.aggro>0) this.aggro--;

    const phase = this.phase(), enraged = phase >= 2;
    const reach = this.w/2 + pc.w/2 + (this.kind===KIND.SAMURAI ? 34 : 12);
    const inReach = Math.abs(dx)<=reach && Math.abs(dy)<70;

    this.dodge(bullets, myCx);

    if (this.hurtTimer>0) { this.hurtTimer--; moveBody(this, platforms); this.slowDown(); return; }

    switch (this.state) {
      case ES.WINDUP:
        this.speed=0;
        if (--this.stateTimer<=0) {
          this.slashTimer=10;
          if (inReach) pc.takeHit(this.attackDamage + (phase>=3 ? 1 : 0), toward);
          // The warlord's short recovery is the opening; afterwards he returns to guard
          this.enter(ES.RECOVER, this.kind===KIND.SAMURAI ? (phase>=3 ? 8 : enraged?12:16) : 22);
        }
        break;
      case ES.RECOVER:
        this.slowDown(); moveBody(this, platforms);
        if (--this.stateTimer<=0) this.state=ES.CHASE;
        break;
      case ES.DASH_WINDUP:
        this.speed=0;
        if (--this.stateTimer<=0) { this.dashHit=false; this.enter(ES.DASH, this.kind===KIND.SAMURAI?24:20); }
        break;
      case ES.DASH: {
        this.speed = this.facing*(this.kind===KIND.SAMURAI?15:13);
        if (!this.dashHit && goHit(this, pc)) this.dashHit = pc.takeHit(this.attackDamage, this.facing);
        if (!this.inAir && this.ledgeAhead(platforms)) { this.speed=0; this.enter(ES.RECOVER,20); break; }
        const blocked = this.moveBlocked(platforms);
        if (--this.stateTimer<=0 || blocked) this.enter(ES.RECOVER,26);
        break;
      }
      case ES.STAGGER:
        this.speed=0;
        if (--this.stateTimer<=0) { this.state=ES.CHASE; this.attackCooldown=40; }
        break;
      case ES.LEAP:
        this.speed = this.facing*7;
        this.moveBlocked(platforms);
        if (!this.inAir) {
          this.shockTimer=20; this.shockX=myCx; this.shockY=myFeet;
          if (Math.abs(dx)<190 && Math.abs(dy)<40 && !pc.inAir) pc.takeHit(Math.max(1,this.attackDamage-1), toward);
          this.enter(ES.RECOVER,30);
        }
        break;
      default:
        this.think(pc, platforms, shots, dx, dy, toward, inReach, enraged, myCx);
    }
    if (this.speed!==0 && !this.inAir) this.walkPhase += 0.35;
  }

  think(pc, platforms, shots, dx, dy, toward, inReach, enraged, myCx) {
    if (this.aggro<=0) { this.patrol(platforms); return; }
    this.state=ES.CHASE; this.facing=toward;
    const adx=Math.abs(dx);
    if (inReach) {
      this.speed=0;
      if (this.attackCooldown<=0) {
        this.enter(ES.WINDUP, this.windupTicks(enraged));
        this.attackCooldown = this.kind===KIND.SAMURAI ? (this.phase()>=3 ? 45 : enraged?65:90) : 50;
      }
      return;
    }
    if (this.kind===KIND.GRUNT && this.rangedCooldown<=0 && adx>170 && adx<560 && Math.abs(dy)<50) {
      shots.push(new Shuriken(myCx+this.facing*24, this.y+this.h/2-12, this.facing));
      this.rangedCooldown = 110 + Math.floor(Math.random()*80);
      this.enter(ES.RECOVER,14);
      return;
    }
    if (this.kind!==KIND.GRUNT && this.dashCooldown<=0 && adx>140 && adx<420 && Math.abs(dy)<50) {
      this.enter(ES.DASH_WINDUP, this.kind===KIND.SAMURAI?26:18);
      this.dashCooldown = this.kind===KIND.SAMURAI ? (this.phase()>=3 ? 60 : enraged?90:150) : 120;
      return;
    }
    if (this.kind===KIND.SAMURAI && this.leapCooldown<=0 && !this.inAir && adx>180 && adx<650) {
      this.fallSpeed=-20; this.inAir=true; this.leapCooldown = this.phase()>=3 ? 90 : enraged ? 140 : 220;
      this.enter(ES.LEAP,0);
      return;
    }
    // Chase: run at the player, hop walls, jump gaps, drop off ledges after them
    const top = this.maxSpeed + (this.phase()>=3 ? 3 : enraged ? 2 : 0);
    if (toward>0) { if (this.speed<top) this.speed++; } else { if (this.speed>-top) this.speed--; }
    let wantJump = dy<-70 && adx<220;
    if (!this.inAir && this.ledgeAhead(platforms)) {
      if (dy<=40 && this.landingAhead(platforms)) wantJump=true;
      else if (dy>40 && adx<400 && this.floorBelowAhead(platforms)) { /* step off after the player */ }
      else this.speed=0;
    }
    if (this.moveBlocked(platforms)) wantJump=true;
    if (wantJump) this.jump();
  }

  patrol(platforms) {
    this.state=ES.PATROL;
    if (this.kind===KIND.SAMURAI) { this.speed=0; return; }
    if (Math.abs(this.x-this.spawnX)>140) this.facing = this.x>this.spawnX ? -1 : 1;
    if (!this.inAir && this.ledgeAhead(platforms)) this.facing=-this.facing;
    this.speed = this.facing*(this.kind===KIND.GRUNT?2:1);
    if (this.moveBlocked(platforms)) this.facing=-this.facing;
  }

  /** Sometimes jumps a kunai that is about to hit. */
  dodge(bullets, myCx) {
    if (this.dodged.size>20) this.dodged.clear();
    const chance = this.kind===KIND.GRUNT ? 30 : this.kind===KIND.SHADOW ? 55 : 0;
    if (!chance || this.inAir) return;
    for (const b of bullets) {
      if (!b.usable || this.dodged.has(b)) continue;
      const ahead = (myCx-(b.x+b.w/2))*b.dir;
      if (ahead>0 && ahead<170 && Math.abs(b.y-(this.y+this.h/2))<60) {
        this.dodged.add(b);
        if (Math.random()*100 < chance) this.jump();
      }
    }
  }

  /** Warlord fight phase: 1 above half health, 2 at half, 3 at a quarter (0 for other enemies). */
  phase() {
    if (this.kind!==KIND.SAMURAI) return 0;
    if (this.health*4 <= this.maxHealth) return 3;
    if (this.health*2 <= this.maxHealth) return 2;
    return 1;
  }

  /** Kunai (melee=false) or sword hit: flash, knockback (the warlord never staggers), face the attacker. Returns false if parried. */
  takeHit(dir, dmg = 1, melee = false) {
    this.aggro = this.guardian?400:150;
    if (this.state===ES.STAGGER) {
      // Dazed: no parry, no armor, and sword blows land harder
      this.health -= melee ? dmg + Math.floor(dmg/2) : dmg; this.flashTimer=12;
      return true;
    }
    if (this.kind===KIND.SAMURAI && this.tryParry(dir, melee)) return false;
    // Armor soaks sword blows traded mid-swing from the front
    if (this.kind===KIND.SAMURAI && melee && this.facing !== dir && this.isAttacking()) dmg = Math.max(1, Math.floor(dmg/2));
    this.health -= dmg; this.flashTimer=12; this.facing=-dir;
    if (this.kind!==KIND.SAMURAI) {
      this.hurtTimer=10;
      this.speed = dir*(this.kind===KIND.GRUNT?6:3);
      if ([ES.WINDUP,ES.DASH_WINDUP,ES.DASH].includes(this.state)) this.enter(ES.RECOVER,8);
    }
    return true;
  }

  isAttacking() { return [ES.WINDUP,ES.DASH,ES.LEAP,ES.DASH_WINDUP].includes(this.state); }
  /** True in the last moments of a wind-up (or mid-dash), when a slash can counter the attack. */
  inCounterWindow() { return ((this.state===ES.WINDUP || this.state===ES.DASH_WINDUP) && this.stateTimer <= COUNTER_WINDOW) || this.state===ES.DASH; }
  /** A countered attack: cancel it and leave the enemy dazed for a moment. */
  stagger() { this.enter(ES.STAGGER, this.kind===KIND.SAMURAI ? 95 : 60); this.speed=0; this.slashTimer=0; this.parryTimer=14; this.flashTimer=8; }
  isStaggered() { return this.state===ES.STAGGER; }

  /** While guarding (not attacking or recovering) the warlord blocks hits from in front; a parried sword strike earns a fast counter-slash. */
  tryParry(dir, melee) {
    if (!this.active || this.facing !== -dir || this.isAttacking() || this.state === ES.RECOVER || this.state === ES.STAGGER) return false;
    const chance = melee ? (this.phase()>=2 ? 85 : 75) : (this.phase()>=2 ? 95 : 90);
    if (Math.random()*100 >= chance) return false;
    this.parryTimer = 14;
    if (melee) { this.enter(ES.WINDUP, 7); this.attackCooldown = 30; }
    return true;
  }

  draw(ctx) {
    if (!this.visible) return;
    const flash = this.flashTimer>0 && Math.floor(this.flashTimer/2)%2===0;
    const im = flash ? flashImg(this.imgKey) : imgs[this.imgKey];
    if (im) {
      const iw=im.width, ih=im.height;
      const bob = (!this.inAir && this.speed!==0) ? Math.round(-Math.abs(Math.sin(this.walkPhase))*3) : 0;
      const lean = (this.state===ES.WINDUP || this.state===ES.DASH_WINDUP) ? -this.facing*4 : 0;
      // Feet on the collider's floor, centred; art faces left so mirror it to face right
      const dx = this.x + Math.floor((this.w-iw)/2) + lean, dy = this.y + this.h - ih + bob;
      ctx.save();
      if (this.state===ES.STAGGER) {
        // Rocked back on his heels
        ctx.translate(this.x + this.w/2, this.y + this.h); ctx.rotate(-this.facing*10*Math.PI/180); ctx.translate(-(this.x + this.w/2), -(this.y + this.h) + 4);
      }
      if (this.facing>0) { ctx.translate(dx+iw, dy); ctx.scale(-1,1); ctx.drawImage(im,0,0); }
      else ctx.drawImage(im, dx, dy);
      ctx.restore();
    } else { ctx.fillStyle='#b42828'; ctx.fillRect(this.x,this.y,this.w,this.h); }
    this.drawAttackEffects(ctx);
    if (this.kind===KIND.SAMURAI) return; // the warlord's health shows in the boss bar
    ctx.fillStyle='red';  ctx.fillRect(this.x, this.y-this.h/2, this.maxHealth*12, 10);
    ctx.fillStyle='#0f0'; ctx.fillRect(this.x, this.y-this.h/2, this.health*12, 10);
    ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=2; ctx.strokeRect(this.x, this.y-this.h/2, this.maxHealth*12, 10);
  }

  /** Wind-up "!", slash arc, and the warlord's landing shockwave. */
  drawAttackEffects(ctx) {
    const cx = this.x+this.w/2;
    if (this.parryTimer>0) {
      // Sparks where the blade met the hit
      const px = cx + this.facing*(this.w/2+6), py = this.y + this.h/3, len = 8 + (14-this.parryTimer)*2;
      ctx.strokeStyle = `rgba(255,236,140,${Math.min(1, this.parryTimer*0.086)})`; ctx.lineWidth=3; ctx.lineCap='round';
      ctx.beginPath();
      for (let k=0; k<8; k++) {
        const a = k*Math.PI/4;
        ctx.moveTo(px+Math.cos(a)*6, py+Math.sin(a)*6); ctx.lineTo(px+Math.cos(a)*len, py+Math.sin(a)*len);
      }
      ctx.stroke();
    }
    if (this.state===ES.WINDUP || this.state===ES.DASH_WINDUP) {
      // The "!" turns white and grows when the strike is about to land: that's the moment to counter
      const cue = this.inCounterWindow();
      ctx.font = cue ? 'bold 40px sans-serif' : 'bold 30px sans-serif';
      ctx.fillStyle='#000'; ctx.fillText('!', cx-4, this.y-6);
      ctx.fillStyle = cue ? '#fff' : this.state===ES.DASH_WINDUP ? 'rgb(255,80,60)' : 'rgb(255,220,60)';
      ctx.fillText('!', cx-6, this.y-8);
    }
    if (this.state===ES.STAGGER) {
      // Dazed stars circling his head
      ctx.fillStyle = 'rgb(255,230,90)';
      for (let k=0; k<3; k++) {
        const a = this.stateTimer*0.2 + k*Math.PI*2/3, sx = cx + Math.cos(a)*this.w*0.4, sy = this.y - 10 + Math.sin(a)*6;
        ctx.beginPath();
        for (let i=0; i<10; i++) { const r = i%2===0 ? 9 : 4, ang = -Math.PI/2 + i*Math.PI/5; ctx.lineTo(sx + Math.cos(ang)*r, sy + Math.sin(ang)*r); }
        ctx.fill();
      }
    }
    if (this.slashTimer>0) {
      const r = this.kind===KIND.SAMURAI ? 90 : 50;
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, this.slashTimer*0.12)})`;
      ctx.lineWidth = this.kind===KIND.SAMURAI ? 8 : 5; ctx.lineCap='round';
      ctx.beginPath();
      const cy = this.y+this.h/2;
      if (this.facing>0) ctx.arc(cx+r, cy, r, Math.PI+0.35*Math.PI, Math.PI-0.35*Math.PI, true);
      else ctx.arc(cx-r, cy, r, -0.35*Math.PI, 0.35*Math.PI);
      ctx.stroke();
    }
    if (this.shockTimer>0) {
      const r=(20-this.shockTimer)*11;
      ctx.strokeStyle=`rgba(255,210,140,${this.shockTimer*0.047})`; ctx.lineWidth=5;
      ctx.beginPath(); ctx.ellipse(this.shockX, this.shockY, r, r/5, 0, 0, Math.PI*2); ctx.stroke();
    }
  }
}

// Enemy factory helpers matching the Java constructors
function makeEnemy(x,y,img) { return new Enemy(x,y,72,81,img,1,2,4,200); }
function makeBoss(x,y,img,aDmg,hp,boss,spd) { return new Enemy(x,y,72,81,img,aDmg,hp,spd,boss?600:200); }
function makeBossR(x,y,img,aDmg,hp,boss,spd,rad) { return new Enemy(x,y,72,81,img,aDmg,hp,spd,rad); }
function makeBossWH(x,y,w,h,img,aDmg,hp,boss,spd) { return new Enemy(x,y,w,h,img,aDmg,hp,spd,boss?600:200); }

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
  smallStone:'rock', stone:'stone', stoneColumn:'stoneColumn', enemyPlatform:'enemyPlatform',
  smallEnemyPlatform:'smallEnemyPlatform', moving1:'movingPlatform1',
  largeStilt:'largeStilt', mediumStilt:'mediumStilt', smallStilt:'smallStilt',
  miniStilt:'miniStilt', miniBase:'miniBase', sign:'sign1', pipe:'pipeTall', pipeTall:'pipeTall',
  // Level 2
  sewer1:'sewer1', sewerCeiling:'sewerCeiling', sewer2:'sewer2img', sewer3:'sewer3', sewer4:'sewer4',
  pipe1:'pipe1', pipe2:'pipe2', extraPipe:'extraPipe',
  downArrow:'downArrow', upArrow:'upArrow',
  // Level 3
  pagota1:'pagota1', ledge:'ledge',
  // Level 4
  dojoFloor:'dojoFloor', dojoGate:'dojoGate',
  // Shared
  'evil door':'evilDoor', seal:'seal',
};
const signImgs = { 1:'sign1', 2:'sign2', 3:'sign3' };


// ==================== CUTSCENES ====================
// Story between levels: painted shots (2000x1000 logical units, stored at higher resolution) the
// camera pans/zooms across, framed inside letterbox bars, with moving layers (people, smoke, banner),
// a typewriter caption and particle effects. Shots advance on their own; Next skips to the following
// shot; the last shot (usually a chapter card) waits for Next. Mirrors Cutscene.java. Layer positions
// come from images/Cutscenes/actors.js (window.CUT_ACTORS), written by GenerateGameArt.
const CUT_FADE = 18, CUT_BAR = 86;
const CUT_LAYERS = ['home_dad','home_kid','home_mom','home_sis','raid_back','raid_mid','raid_front','ashes_smoke1','ashes_smoke2','ashes_kid',
  'banner_cloth','banner_kunai','vow_kid','sewer_clan','sewer_kid','storm_shadows','storm_kid','gate_kid','warlord',
  'victory_kid','dawn_incense','dawn_kid','title_kid','title_clouds','title_logo','title_seal',
  'duel_warlord','duel_kid','pyre_fire','journey_kid'];
class Cutscene {
  constructor() { this.shots = []; this.index = 0; this.t = 0; }
  shot(key, seconds, cx0, cy0, w0, cx1, cy1, w1, caption, effects) {
    this.shots.push({ key, ticks: Math.floor(seconds*50), cx0, cy0, w0, cx1, cy1, w1, caption, effects: effects||'', actors: [] });
    return this;
  }
  /** Moving layer on the last shot: bob, breathe, swing, swing2, sway, drift, wisp, run:speed, slide:vx:vy, still. */
  actor(name, motion) { this.shots[this.shots.length-1].actors.push({ name, motion }); return this; }
  card(key) { this.shots.push({ key, card: true, ticks: 1, actors: [] }); return this; }
  reset() { this.index = 0; this.t = 0; }
  tick() {
    this.t++;
    if (this.t >= this.shots[this.index].ticks + CUT_FADE && this.index < this.shots.length-1) { this.index++; this.t = 0; }
  }
  /** Skips to the next shot; returns true when already on the last shot (done). */
  next() {
    if (this.index >= this.shots.length-1) return true;
    this.index++; this.t = 0; return false;
  }
  draw(ctx) {
    const s = this.shots[this.index], img = imgs[s.key], t = this.t;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (!img) return;
    if (s.card) {
      ctx.drawImage(img, 0, 0, W, H);
      this.fade(ctx, Math.max(0, 1 - t/CUT_FADE));
      return;
    }
    // Eased camera move, framed to the band between the letterbox bars
    const bandH = H - 2*CUT_BAR, p = Math.min(1, t/s.ticks), e = p*p*(3-2*p);
    const vw = s.w0 + (s.w1-s.w0)*e, vh = vw*bandH/W;
    const cx = s.cx0 + (s.cx1-s.cx0)*e, cy = s.cy0 + (s.cy1-s.cy0)*e;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, CUT_BAR, W, bandH); ctx.clip();
    ctx.translate(0, CUT_BAR); ctx.scale(W/vw, W/vw); ctx.translate(-(cx - vw/2), -(cy - vh/2));
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, 2000, 1000);
    for (const a of s.actors) this.drawActor(ctx, a, t);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(0, CUT_BAR, W, bandH); ctx.clip();
    this.effects(ctx, s.effects, t);
    ctx.restore();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, CUT_BAR); ctx.fillRect(0, H-CUT_BAR, W, CUT_BAR);
    if (s.caption) {
      const shown = Math.max(0, Math.min(s.caption.length, Math.floor((t-12)*1.1)));
      ctx.font = 'italic 32px Baskerville, serif';
      const tx = W/2 - ctx.measureText(s.caption).width/2;
      ctx.fillStyle = 'rgb(240,234,222)';
      ctx.fillText(s.caption.substring(0, shown), tx, H - CUT_BAR/2 + 11);
    }
    const fadeIn = Math.max(0, 1 - t/CUT_FADE);
    const fadeOut = this.index < this.shots.length-1 ? Math.max(0, (t - s.ticks)/CUT_FADE) : 0;
    this.fade(ctx, Math.max(fadeIn, fadeOut));
  }
  /** Places a layer at its painted position (painting units) and applies its little motion. */
  drawActor(ctx, a, t) {
    const r = (window.CUT_ACTORS || {})[a.name], img = imgs['cut_' + a.name];
    if (!r || !img) return;
    const [x, y, aw, ah] = r, fx = aw/2, fy = ah*0.926, m = a.motion, kind = m.split(':')[0];
    ctx.save();
    if (kind === 'run') ctx.translate(parseFloat(m.split(':')[1])*t, -Math.abs(Math.sin(t*0.35))*6);
    if (kind === 'slide') { const v = m.split(':'); ctx.translate(parseFloat(v[1])*t, parseFloat(v[2])*t - Math.abs(Math.sin(t*0.3))*4); }
    ctx.translate(x, y);
    if (kind === 'bob') ctx.translate(0, -Math.abs(Math.sin(t*0.13))*4);
    else if (kind === 'breathe') { ctx.translate(fx, fy); ctx.scale(1, 1 + Math.sin(t*0.07)*0.02); ctx.translate(-fx, -fy); }
    else if (kind === 'swing' || kind === 'swing2') {
      ctx.translate(fx, fy); ctx.rotate((Math.sin(t*0.12 + (kind === 'swing2' ? Math.PI : 0))*5)*Math.PI/180); ctx.translate(-fx, -fy);
    }
    else if (kind === 'sway') { ctx.translate(aw/2, 0); ctx.rotate(Math.sin(t*0.05)*2.5*Math.PI/180); ctx.translate(-aw/2, 0); }
    else if (kind === 'drift') { ctx.translate(t*0.25, -t*0.12); ctx.globalAlpha = 0.85 + 0.15*Math.sin(t*0.05); }
    else if (kind === 'wisp') ctx.transform(1, 0, Math.sin(t*0.06)*0.06, 1, 0, 0);
    else if (kind === 'flicker') {
      // Fire: stretches and breathes from its base, brightness wavering
      ctx.translate(aw/2, ah*0.97);
      ctx.scale(1 + 0.05*Math.sin(t*0.45), 1 + 0.08*Math.sin(t*0.6) + 0.04*Math.sin(t*1.7));
      ctx.translate(-aw/2, -ah*0.97);
      ctx.globalAlpha = 0.88 + 0.12*Math.sin(t*0.9);
    }
    ctx.drawImage(img, 0, 0, aw, ah);
    ctx.restore();
  }
  fade(ctx, a) { if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1,a)})`; ctx.fillRect(0, 0, W, H); } }
  /** Stateless particles computed from the shot clock. */
  effects(ctx, fx, t) {
    if (fx.includes('embers')) for (let i=0; i<70; i++) {
      const speed = 0.6 + (i%5)*0.35, y = H - ((t*speed*2 + i*53) % (H+60));
      const x = (i*137 + Math.sin((t+i*20)*0.03)*30) % W;
      const a = Math.max(0, Math.min(1, (140 + 100*Math.sin(t*0.1+i))/255));
      ctx.fillStyle = `rgba(255,${140+(i%4)*25},50,${a})`; ctx.fillRect(x, y, 3+i%3, 3+i%3);
    }
    if (fx.includes('rain')) {
      ctx.strokeStyle = 'rgba(190,200,230,0.47)'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i=0; i<200; i++) {
        const x = (i*97 + t*9) % (W+200) - 100, y = (i*61 + t*26) % (H+100) - 50;
        ctx.moveTo(x, y); ctx.lineTo(x-8, y+26);
      }
      ctx.stroke();
    }
    if (fx.includes('fireflies')) for (let i=0; i<40; i++) {
      const x = (i*191) % W + Math.sin(t*0.02+i)*40, y = 380 + (i*83) % 330 + Math.cos(t*0.025+i*2)*25;
      const a = Math.max(0, (110 + 110*Math.sin(t*0.08+i*1.7))/255);
      ctx.fillStyle = `rgba(255,240,140,${a/4})`; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(255,240,140,${a})`; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
    }
    if (fx.includes('petals')) for (let i=0; i<45; i++) {
      const x = (((i*211 - t*(0.8+(i%3)*0.4)) % W) + W) % W, y = (i*97 + t*(1+(i%4)*0.5)) % (H+20) - 10;
      ctx.fillStyle = i%3===0 ? 'rgba(255,236,244,0.86)' : 'rgba(246,182,210,0.86)';
      ctx.beginPath(); ctx.ellipse(x, y, (3+5*Math.abs(Math.cos(t*0.08+i)))/2, 2.5, 0, 0, Math.PI*2); ctx.fill();
    }
    if (fx.includes('lightning')) {
      const c = t % 170;
      if (c < 4 || (c > 8 && c < 11)) { ctx.fillStyle = 'rgba(235,240,255,0.59)'; ctx.fillRect(0, 0, W, H); }
    }
  }
}

/** Katsuya's story, told between levels. Views are centre x/y and width on the 2000x1000 paintings. */
function buildCutscenes() {
  return {
    [State.BETWEEN_1_1]: new Cutscene()
      .shot('cut_home', 6.5, 1000, 600, 1900, 1330, 720, 1150, 'Osaka, long ago. Every evening, Katsuya trained with his father.', 'fireflies')
        .actor('home_mom', 'breathe').actor('home_sis', 'bob').actor('home_dad', 'swing').actor('home_kid', 'swing2')
      .shot('cut_raid', 5.5, 1000, 560, 1950, 1050, 600, 1550, 'One night, the Red Clan came.', 'embers')
        .actor('raid_back', 'slide:-0.3:0.06').actor('raid_mid', 'slide:-0.45:0.1').actor('raid_front', 'slide:-0.6:0.135')
      .shot('cut_ashes', 5.5, 1000, 600, 1950, 1300, 770, 1150, 'By morning, his home was ash. Only Katsuya survived.', 'embers')
        .actor('ashes_smoke1', 'drift').actor('ashes_smoke2', 'drift').actor('ashes_kid', 'breathe')
      .shot('cut_banner', 4.5, 1000, 500, 1700, 1000, 470, 1050, 'They left a banner behind: the crest of the Warlord.', 'embers')
        .actor('banner_cloth', 'sway').actor('banner_kunai', 'still')
      .shot('cut_vow', 6, 1000, 560, 1950, 1000, 690, 1200, "Katsuya swore on his father's sword to avenge his family.", 'petals')
        .actor('vow_kid', 'breathe'),
    [State.BETWEEN_2]: new Cutscene()
      .shot('cut_sewer', 6, 900, 620, 1900, 1000, 650, 1600, 'The Red Clan fled beneath the city. Katsuya followed them into the dark.', 'rain')
        .actor('sewer_clan', 'run:1.6').actor('sewer_kid', 'run:2.2')
      .card('page4'),
    [State.BETWEEN_3]: new Cutscene()
      .shot('cut_storm', 6, 1000, 560, 1950, 950, 585, 1650, 'Rain fell on Tokyo. On the rooftops, the shadow ninjas were waiting.', 'rain,lightning')
        .actor('storm_shadows', 'bob').actor('storm_kid', 'breathe')
      .card('page5'),
    [State.BETWEEN_4]: new Cutscene()
      .shot('cut_gate', 5, 1000, 560, 1950, 1000, 660, 1300, "At last: the Warlord's dojo.", 'petals')
        .actor('gate_kid', 'run:0.3')
      .shot('cut_warlord', 5, 1000, 600, 1900, 1000, 640, 1150, 'He had been waiting for Katsuya.', 'embers')
        .actor('warlord', 'breathe')
      .card('page6'),
    // The epilogue answers the intro: the duel's end, the banner burned, the road home, the
    // father's sword returned, and Katsuya training alone where he once trained with his father
    [State.END]: new Cutscene()
      .shot('cut_duel', 6, 1000, 560, 1950, 1050, 640, 1400, 'The Warlord fell to his knees, his blade broken.', 'embers')
        .actor('duel_warlord', 'breathe').actor('duel_kid', 'breathe')
      .shot('cut_victory', 5, 1000, 600, 1950, 980, 750, 1250, 'The Red Clan scattered into the night.', 'petals')
        .actor('victory_kid', 'breathe')
      .shot('cut_pyre', 5, 1000, 560, 1800, 900, 580, 1150, "Katsuya burned the Warlord's banner.", 'embers')
        .actor('pyre_fire', 'flicker')
      .shot('cut_journey', 6, 1000, 600, 1950, 900, 680, 1500, 'At dawn he walked home, through the hills above Osaka.', 'petals')
        .actor('journey_kid', 'run:0.7')
      .shot('cut_dawn', 6, 1000, 560, 1950, 820, 660, 1300, "He returned his father's sword to his family.", 'petals')
        .actor('dawn_incense', 'wisp').actor('dawn_kid', 'breathe')
      .shot('cut_home', 7, 1000, 600, 1900, 1250, 700, 1300, 'And every evening, as his father taught him, Katsuya still trains.', 'fireflies')
        .actor('home_kid', 'swing2')
      .card('page7'),
  };
}


// ==================== TITLE SCREEN ====================
// The animated title (mirrors TitleScreen.java): a slow push-in on the blood moon, clouds drifting
// across it, Katsuya breathing on his torii, embers and petals. The studio credit fades in, the
// brush logo is slashed into view, the hanko seal stamps down, and "PRESS BEGIN TO START" pulses.
class TitleScreen {
  constructor() { this.t = 0; }
  reset() { this.t = 0; }
  tick() { this.t++; }
  draw(ctx) {
    const t = this.t, pos = window.CUT_ACTORS || {}, clamp = v => Math.max(0, Math.min(1, v));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (!imgs.title_bg) return;
    const layer = (key, x, y, w, h, alpha = 1) => {
      const im = imgs['cut_' + key]; if (!im) return;
      ctx.globalAlpha = alpha; ctx.drawImage(im, x, y, w, h); ctx.globalAlpha = 1;
    };
    // Slow breathing push-in toward the moon
    const zoom = 1.02 + 0.03*(0.5 - 0.5*Math.cos(t*0.004));
    ctx.save();
    ctx.translate(1150, 360); ctx.scale(zoom, zoom); ctx.translate(-1150, -360);
    ctx.drawImage(imgs.title_bg, 0, 0, W, H);
    const c = pos.title_clouds;
    if (c) { const off = (t*0.35) % c[2]; for (const k of [-1, 0]) layer('title_clouds', c[0] + off + k*c[2], c[1], c[2], c[3], 0.9); }
    const kid = pos.title_kid;
    if (kid) {
      const fx = kid[0] + kid[2]/2, fy = kid[1] + kid[3]*0.926;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(1, 1 + Math.sin(t*0.06)*0.02); ctx.translate(-fx, -fy);
      layer('title_kid', kid[0], kid[1], kid[2], kid[3]); ctx.restore();
    }
    ctx.restore();
    // Embers rising and a few petals drifting down
    for (let i=0; i<60; i++) {
      const y = H - ((t*(0.5+(i%5)*0.3) + i*61) % (H+40)), x = (i*151 + Math.sin((t+i*30)*0.02)*40) % W;
      ctx.fillStyle = `rgba(255,${110+(i%4)*30},50,${clamp((120 + 110*Math.sin(t*0.09+i))/255)})`;
      ctx.fillRect(x, y, 2+i%3, 2+i%3);
    }
    for (let i=0; i<18; i++) {
      const x = (((i*233 - t*(0.6+(i%3)*0.3)) % W) + W) % W, y = (i*97 + t*(0.8+(i%4)*0.3)) % (H+20) - 10;
      ctx.fillStyle = 'rgba(250,190,210,0.78)';
      ctx.beginPath(); ctx.ellipse(x, y, (3+5*Math.abs(Math.cos(t*0.07+i)))/2, 2.5, 0, 0, Math.PI*2); ctx.fill();
    }
    // KAMIKAZE STUDIOS PRESENTS
    const studio = clamp((t - 10)/40);
    if (studio > 0) {
      ctx.font = "bold 22px 'Gill Sans', sans-serif"; ctx.letterSpacing = '7px';
      ctx.fillStyle = `rgba(240,220,210,${0.86*studio})`; ctx.fillText('KAMIKAZE STUDIOS PRESENTS', 118, 160);
      ctx.letterSpacing = '0px';
    }
    // Logo slashed into view, a white blade flash riding the cut
    const l = pos.title_logo;
    if (l && t >= 60) {
      const p = Math.min(1, (t - 60)/32), edge = l[0] + (1 - Math.pow(1 - p, 3))*l[2];
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, edge, H); ctx.clip();
      layer('title_logo', l[0], l[1], l[2], l[3]); ctx.restore();
      if (p < 1) {
        ctx.strokeStyle = 'rgba(255,250,240,0.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(edge + 30, l[1] + 10); ctx.lineTo(edge - 30, l[1] + l[3] - 10); ctx.stroke();
      }
    }
    if (t >= 92 && t < 104) { ctx.fillStyle = `rgba(255,240,230,${0.27*(1 - (t - 92)/12)})`; ctx.fillRect(0, 0, W, H); }
    // Hanko seal stamps down
    const s = pos.title_seal;
    if (s && t >= 108) {
      const p = Math.min(1, (t - 108)/8), sc = 1.7 - 0.7*p, cx = s[0] + s[2]/2, cy = s[1] + s[3]/2;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
      layer('title_seal', s[0], s[1], s[2], s[3], p); ctx.restore();
    }
    // PRESS BEGIN TO START
    if (t >= 140) {
      const pulse = 0.55 + 0.45*Math.sin((t - 140)*0.07);
      ctx.font = "22px 'Gill Sans', sans-serif"; ctx.letterSpacing = '6px'; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(245,225,210,${0.9*pulse*clamp((t - 140)/30)})`; ctx.fillText('PRESS BEGIN TO START', W/2, 748);
      ctx.textAlign = 'start'; ctx.letterSpacing = '0px';
    }
  }
}

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
    this.shurikens = [];
    this.puffs = [];        // death puffs {x, y, t, size}
    this.floats = [];       // rising words over the action ("COUNTER!")
    this.arenaTicks = 0;
    this.offset = 200;
    this.deathTimer = 0;
    this.bgKey = null;
    this.prevLevel = 0;
    this.resetLevelState();
    // Checkpoint lantern: touching it lights it; restarts and deaths then return the player here
    this.checkpoint = null;          // {x, baseY, rx, ry, lit}
    this.savedCheckpointLevel = -1;
    // End of Level 1: a Red Clan ninja bolts and drops down the pipe (0 waiting, 1 running, 2 falling, 3 gone)
    this.flee = { state: 3, x: 0, y: 0, vy: 0 };
    this.props = [];
    this.cutscenes = buildCutscenes();
    this.titleScreen = new TitleScreen();
    this.playingCutscene = null;
    this.petals = Array.from({length:50}, () => ({x:0,y:0,speed:0,spin:0}));
    this.keys = {};
    this.setupInput();
    this.setupButtons();
  }

  resetLevelState() {
    this.seal = null; this.sealHintShown = false;
    this.arenaGate = null; this.warlord = null; this.arenaClosing = false; this.arenaClosed = false;
    this.warlordPhaseSeen = 1; // highest phase whose reinforcements have arrived
    this.banner = ''; this.bannerSub = ''; this.bannerTimer = 0;
    this.ammoRegen = 0; this.levelTicks = 0;
  }

  // -------------------- INPUT --------------------
  setupInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.code]=true;
      if (e.code==='KeyR' && this.deathBtn.style.display==='block') this.restartFromDeath();
      if (e.code==='Escape' || e.code==='KeyP') this.togglePause();
    });
    window.addEventListener('keyup', e => { this.keys[e.code]=false; });
    this.cv.addEventListener('mousedown', e => this.onShoot(e));
  }
  onShoot(e) {
    if (!this.isLevel() || this.pc.life <= 0 || this.pc.ammo < 1) return;
    const rect = this.cv.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const dir = (mx + this.cam.x) >= this.pc.x + this.pc.w/2 ? 1 : -1;
    this.bullets.push(new Bullet(this.pc.x+this.pc.w/2, this.pc.y+this.pc.h/2, dir));
    this.pc.ammo--;
    this.pc.throwAt(dir);
  }

  // -------------------- BUTTONS --------------------
  setupButtons() {
    const $ = id => document.getElementById(id);
    this.nextBtn = $('nextBtn');
    this.pauseBtn = $('pauseBtn');
    this.resumeBtn = $('resumeBtn');
    this.restartBtn = $('restartBtn');
    this.quitBtn = $('quitBtn');
    this.deathBtn = $('deathBtn');
    this.deathBtn.onclick = () => this.restartFromDeath();

    this.nextBtn.onclick = () => this.onNext();
    this.pauseBtn.onclick = () => this.openPause();
    this.resumeBtn.onclick = () => this.closePause();
    this.restartBtn.onclick = () => { this.closePause(); this.setLevel(this.level); };
    this.quitBtn.onclick = () => this.goToMainMenu();
  }

  isLevel() { return [State.LEVEL_1,State.LEVEL_2,State.LEVEL_3,State.LEVEL_4].includes(this.state); }

  openPause() {
    if (!this.isLevel() || this.pc.life <= 0) return;
    this.state = State.PAUSE;
    this.pauseBtn.style.display = 'none';
    this.restartBtn.textContent = this.savedCheckpointLevel === this.level ? 'Restart from Checkpoint' : 'Restart Level';
    this.quitBtn.style.cssText = '';
    for (const b of [this.resumeBtn, this.restartBtn, this.quitBtn]) b.style.display = 'block';
  }

  closePause() {
    for (const b of [this.resumeBtn, this.restartBtn, this.quitBtn]) b.style.display = 'none';
    if (this.state !== State.PAUSE) return;
    this.pauseBtn.style.display = 'block';
    this.state = [null, State.LEVEL_1, State.LEVEL_2, State.LEVEL_3, State.LEVEL_4][this.level];
  }

  /** Esc / P: pause during a level, resume from the pause menu. */
  togglePause() { if (this.state === State.PAUSE) this.closePause(); else this.openPause(); }

  /** Back to the title screen: stop the music and reset the story to the beginning. */
  goToMainMenu() {
    this.closePause();
    for (const b of [this.pauseBtn, this.deathBtn, this.quitBtn]) b.style.display = 'none';
    stopSong();
    this.savedCheckpointLevel = -1; this.level = 0;
    this.state = State.TITLE;
    this.nextBtn.style.display = 'block';
  }

  /** Next says what it will do: Begin on the title, Skip during a cutscene, Continue on a card. */
  updateNextLabel() {
    const scene = this.cutscenes[this.state];
    let label = 'Next';
    if (this.state === State.TITLE) label = 'Begin';
    else if (scene) label = scene.index >= scene.shots.length-1 ? 'Continue \u203A' : 'Skip \u203A';
    else if (this.state === State.BETWEEN_1_2) label = 'Continue \u203A';
    if (this.nextBtn.textContent !== label) this.nextBtn.textContent = label;
  }

  onNext() {
    // In a cutscene, Next skips to the next shot until the final card
    const scene = this.cutscenes[this.state];
    if (scene && !scene.next()) return;
    switch(this.state) {
      case State.TITLE:
        this.state = State.BETWEEN_1_1; break;
      case State.BETWEEN_1_1:   // the intro cutscene leads straight into Level 1
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
    if (s !== this.savedCheckpointLevel) this.savedCheckpointLevel = -1;
    this.flee = { state: 3, x: 0, y: 0, vy: 0 };
    this.checkpoint = null;
    this.props = [];   // background decorations with no collision, e.g. pillars under ledges
    this.platforms=[]; this.enemies=[]; this.collectables=[]; this.bullets=[];
    this.shurikens=[]; this.puffs=[]; this.floats=[]; this.arenaTicks=0;
    this.resetLevelState();
    this.pc.reset();
    this.pc.life=10; this.pc.ammo=10;
    this.deathTimer=0;
    if (this.deathBtn) this.deathBtn.style.display='none';
    this.level = s;
    const songChanged = (s !== currentSongLevel);
    if (songChanged) stopSong();

    if (s===1) this.setupLevel1();
    else if (s===2) this.setupLevel2();
    else if (s===3) this.setupLevel3();
    else if (s===4) this.setupLevel4();

    // Assign images to platforms by tag
    for (const p of this.platforms) {
      if (s<=2 && p.tag==='sign') p.imgKey = signImgs[s] || 'sign1';
      else if (s===3 && p.tag==='sign') p.imgKey = 'sign3';
      else if (tagImg[p.tag]) p.imgKey = tagImg[p.tag];
    }

    // Each sewer stone ledge sits on a brick pillar that runs down into the floor
    if (s===2) for (const p of this.platforms) if (p.tag==='sewer4') this.props.push({ key:'sewerPillar', x:p.x+p.w/2-22, y:p.y+25 });

    // A reached checkpoint becomes the starting point
    if (this.checkpoint && this.savedCheckpointLevel === s) {
      this.checkpoint.lit = true;
      this.pc.x = this.checkpoint.rx; this.pc.y = this.checkpoint.ry;
      // Enemies placed before the checkpoint don't come back
      this.enemies = this.enemies.filter(e => e.x >= this.checkpoint.x);
    }

    const ls = [null, State.LEVEL_1, State.LEVEL_2, State.LEVEL_3, State.LEVEL_4];
    if (s>=1 && s<=4) { this.state = ls[s]; if (songChanged) playSong(s); }
  }

  placeCheckpoint(x, baseY, rx, ry) { this.checkpoint = { x, baseY, rx, ry, lit: false }; }


  /** Spirit barrier over the dojo exit; it breaks once the warlord is defeated. */
  addSeal(x, y) {
    this.seal = new Platform(x, y, 120, 300, 'seal');
    this.platforms.push(this.seal);
  }
  guard(e) { e.guardian = true; return e; }

  setupLevel1() {
    this.bgKey='bgOsaka'; this.offset=200;
    this.pc.x=30; this.pc.y=500;
    const P=(x,y,w,h,t)=>this.platforms.push(new Platform(x,y,w,h,t));
    this.collectables.push(new Collectable('health',3400,370), new Collectable('ammo',3500,370),
      new Collectable('ammo',8600,370), new Collectable('health',5900,370), new Collectable('ammo',6000,370));
    this.enemies.push(makeBoss(9100,370,'boss',3,8,true,6));
    P(-1000,700,2200,300,'base1'); P(1600,700,800,300,'base2');
    P(-500,525,200,200,'sign'); P(1350,750,100,250,'miniBase');
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
    P(6300,475,100,800,'stoneColumn'); P(6400,500,100,800,'stoneColumn'); P(6500,525,100,800,'stoneColumn');
    P(6600,550,100,800,'stoneColumn'); P(6700,575,100,800,'stoneColumn'); P(6800,600,100,800,'stoneColumn');
    P(6900,625,100,800,'stoneColumn'); P(7000,650,100,800,'stoneColumn');
    P(6350,487,100,800,'stoneColumn'); P(6450,512,100,800,'stoneColumn'); P(6550,537,100,800,'stoneColumn');
    P(6650,562,100,800,'stoneColumn'); P(6750,587,100,800,'stoneColumn'); P(6850,612,100,800,'stoneColumn');
    P(6950,637,100,800,'stoneColumn'); P(7050,662,100,800,'stoneColumn');
    P(7350,575,400,50,'enemyPlatform'); P(7350,575,10,425,'mediumStilt'); P(7740,575,10,425,'mediumStilt');
    P(7650,525,10,50,'miniStilt');
    P(7650,475,400,50,'enemyPlatform'); P(8040,475,10,525,'largeStilt'); P(7950,425,10,50,'miniStilt');
    P(7950,375,400,50,'enemyPlatform'); P(8340,425,10,575,'largeStilt');
    P(8500,475,400,525,'base3'); P(8900,475,400,525,'base3');
    P(9250,475,20,525,'pipe'); P(9400,0,20,1000,'');
    this.placeCheckpoint(3450, 475, 3300, 380);
    this.flee = { state: 0, x: 9190, y: 394, vy: 0 };
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
    P(-1000,700,2200,300,'sewer1');
    // Brick behind the pipe junctions so no gap shows between the floor and the pipe body
    P(1190,700,170,300,'sewer1'); P(3540,700,26,300,'sewer1');
    P(1350,700,2200,300,'sewer1');
    P(0,525,200,200,'sign');
    P(-600,-400,2200,300,'sewerCeiling');
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
    P(6050,1150,195,460,'pipeTall');
    P(6600,560,195,375,'pipe1'); P(6600,560,10,575,'pipe1'); P(6600,300,10,575,'extraPipe');
    P(6800,560,10,800,'');
    P(6650,1350,1,1,'upArrow');
    this.enemies.push(makeEnemy(1900,300,'enemyRanger'), makeEnemy(2600,300,'enemyRanger'),
      makeEnemy(1700,100,'enemyRanger'), makeEnemy(2800,100,'enemyRanger'),
      makeEnemy(4750,1220,'enemyRanger'), makeEnemy(2260,620,'enemyRanger'));
    this.placeCheckpoint(3300, 1300, 3200, 1200);
  }

  setupLevel3() {
    this.bgKey='bgTokyo'; this.offset=-100;
    this.pc.x=50; this.pc.y=200;
    const P=(x,y,w,h,t)=>this.platforms.push(new Platform(x,y,w,h,t));
    this.enemies.push(makeBoss(2280,410,'boss',3,4,true,6),
      makeBoss(4070,470,'boss',3,4,true,6), makeBoss(8010,510,'boss',3,4,true,6));
    this.enemies.push(makeEnemy(7900,510,'enemyRanger'), makeEnemy(760,390,'enemyRanger'),
      makeEnemy(1060,515,'enemyRanger'), makeEnemy(1500,515,'enemyRanger'),
      makeEnemy(3570,315,'enemyRanger'), makeEnemy(5030,510,'enemyRanger'), makeEnemy(6430,510,'enemyRanger'));
    this.collectables.push(new Collectable('health',2770,290), new Collectable('health',4600,410),
      new Collectable('health',6790,410), new Collectable('ammo',1771,392),
      new Collectable('ammo',3750,322), new Collectable('ammo',4630,410), new Collectable('ammo',5730,360));
    P(-300,500,200,1000,'sign');
    P(-25,560,560,800,'ledge'); P(700,475,225,800,'pagota1');
    P(1050,600,560,800,'ledge'); P(1710,475,225,800,'pagota1');
    P(2040,500,560,800,'ledge'); P(2700,375,225,800,'pagota1');
    P(3100,400,560,800,'ledge'); P(3825,560,560,800,'ledge');
    P(4500,500,225,800,'pagota1');
    P(4800,600,560,800,'ledge'); P(5500,450,560,800,'ledge'); P(6200,600,560,800,'ledge');
    P(6900,500,225,800,'pagota1');
    P(7300,600,560,800,'ledge'); P(7800,600,560,800,'ledge'); P(8300,600,560,800,'ledge');
    P(8677,370,1,1,'evil door');
    this.placeCheckpoint(5200, 600, 4880, 500);
  }

  // Courtyard (2200-4380): Red Clan guards and the shadow ninja.
  // Arena (4440-6390): the gate slams behind you and the warlord wakes.
  // The exit arch at the far wall stays sealed until he falls.
  setupLevel4() {
    this.bgKey=null; this.offset=250;
    this.pc.x=2530; this.pc.y=500;
    const P=(x,y,w,h,t)=>this.platforms.push(new Platform(x,y,w,h,t));
    this.collectables.push(new Collectable('health',2230,610), new Collectable('ammo',2290,610),
      new Collectable('ammo',3350,610), new Collectable('health',3400,610), new Collectable('ammo',3660,610),
      new Collectable('health',4660,610), new Collectable('ammo',4730,610));
    P(2200,700,2100,120,'dojoFloor'); P(4300,700,2100,120,'dojoFloor');
    P(2200,-500,10,2000,''); P(6390,-500,10,2000,'');
    P(6000,470,1,1,'evil door');
    this.placeCheckpoint(4200, 700, 4100, 600);
    this.arenaGate = new Platform(ARENA_GATE_X,-500,60,400,'dojoGate');
    this.platforms.push(this.arenaGate);
    this.addSeal(5950, 400);
    this.enemies.push(
      makeBossR(3060,600,'enemyRanger',2,3,true,6,500),
      makeBossR(2960,600,'enemyRanger',2,3,true,6,500),
      makeBossR(4100,600,'enemyRanger',2,3,true,6,500),
      makeBossR(3700,500,'boss',3,6,true,6,800)
    );
    this.warlord = this.guard(makeBossWH(5600,500,144,162,'boss2',4,30,true,6));
    this.warlord.setActive(false);
    this.enemies.push(this.warlord);
    for (const p of this.petals) {
      p.x=Math.random()*1600; p.y=Math.random()*800; p.speed=0.6+Math.random()*1.2; p.spin=Math.random()*Math.PI*2;
    }
    this.lastCamX = this.pc.x - 759;
  }

  // -------------------- GAME LOOP --------------------
  tick() {
    const isLevel = this.isLevel();
    if (isLevel && this.pc.life > 0) {
      this.deathTimer = 0;
      if (this.keys['Space']) this.pc.jump();
      if (this.keys['KeyS']) this.pc.slash();
      if (this.keys['KeyA']) this.pc.speedLeft();
      if (this.keys['KeyD']) this.pc.speedRight();
      if ((!this.keys['KeyA']&&!this.keys['KeyD'])||(this.keys['KeyA']&&this.keys['KeyD'])) this.pc.slowDown();
      this.checkLevelTransitions();
      this.physicsUpdate();
    } else if (isLevel && this.pc.life <= 0) {
      // Play the fall, then hold on the death screen until the player restarts
      this.deathTimer++;
      this.pc.tick();
      if (this.deathTimer >= DEATH_SCREEN_AT && this.deathBtn.style.display!=='block') {
        this.deathBtn.textContent = this.savedCheckpointLevel === this.level ? 'Restart from Checkpoint' : 'Restart Level';
        this.deathBtn.style.display='block';
        this.pauseBtn.style.display='none';
      }
    } else if (this.state === State.TITLE) {
      if (this.playingCutscene !== State.TITLE) { this.playingCutscene = State.TITLE; this.titleScreen.reset(); }
      this.titleScreen.tick();
    } else if (this.state !== State.PAUSE) {
      // Story screens animate: restart the cutscene when its state is entered, then advance it
      const scene = this.cutscenes[this.state];
      if (scene) {
        if (this.playingCutscene !== this.state) { this.playingCutscene = this.state; scene.reset(); }
        scene.tick();
      } else this.playingCutscene = null;
    }
    this.render();
  }

  checkLevelTransitions() {
    const pc = this.pc;
    if (this.state===State.LEVEL_1) {
      if (pc.x>9000 && pc.y>800) {
        pc.stopRun(); this.state=State.BETWEEN_2; this.level=2;
        this.nextBtn.style.display='block'; this.pauseBtn.style.display='none';
      } else if (pc.x<=8999 && pc.y>800) pc.life = 0; // a fall is a death: the death screen offers the restart
    } else if (this.state===State.LEVEL_2) {
      if (pc.x>6600 && pc.y<1120) {
        pc.stopRun(); this.state=State.BETWEEN_3; this.level=3;
        this.nextBtn.style.display='block'; this.pauseBtn.style.display='none';
      } else if (pc.x<=6600 && pc.y>1400) pc.life = 0; // a fall is a death: the death screen offers the restart
    } else if (this.state===State.LEVEL_3) {
      if (pc.x>8680 && pc.y<8860) {
        pc.stopRun(); this.state=State.BETWEEN_4; this.level=4;
        this.nextBtn.style.display='block'; this.pauseBtn.style.display='none';
      } else if (pc.x<=8679 && pc.y>700) pc.life = 0; // a fall is a death: the death screen offers the restart
    } else if (this.state===State.LEVEL_4) {
      // The arch only counts once the warlord is beaten and the seal is gone
      if (pc.x>6000 && !this.seal) {
        pc.stopRun(); this.state=State.END; this.level=5;
        playCredits();
        this.nextBtn.style.display='none'; this.pauseBtn.style.display='none';
        // The ending: a single Main Menu button where Next usually sits
        this.quitBtn.style.cssText = 'display:block; left:auto; right:40px; top:auto; bottom:15px; width:320px; height:64px;';
      }
    }
  }

  physicsUpdate() {
    const pc = this.pc;
    const deathY = [0, 900, 1700, 1500, 1100][this.level] || 900;
    this.levelTicks++;
    if (this.bannerTimer > 0) this.bannerTimer--;
    pc.move(this.platforms);
    // Kunai
    for (let i=this.bullets.length-1; i>=0; i--) {
      const b = this.bullets[i];
      if (b.move()) { this.bullets.splice(i,1); continue; }
      for (const p of this.platforms) {
        if (goHit(b,p)) { b.speed=0; break; }
      }
      for (let j=this.enemies.length-1; j>=0; j--) {
        const en = this.enemies[j];
        if (goHit(en,b) && !en.hitBullets.includes(b) && b.usable) {
          b.usable=false; en.hitBullets.push(b);
          en.takeHit(b.dir);
          if (en.health<=0) this.killEnemy(j);
          b.visible=false;
        }
      }
    }
    // Katana: cut enemies in front once per swing, and knock shuriken out of the air
    if (pc.slashActive()) {
      const box = pc.slashBox();
      const overlaps = o => box.x < o.x+o.w && box.x+box.w > o.x && box.y < o.y+o.h && box.y+box.h > o.y;
      for (let j=this.enemies.length-1; j>=0; j--) {
        const en = this.enemies[j];
        if (overlaps(en) && pc.counterSlash() && en.inCounterWindow() && pc.cutOnce(en)) {
          en.stagger(); pc.invulnerable = Math.max(pc.invulnerable, 30);
          this.floats.push({ text: 'COUNTER!', x: en.x + en.w/2, y: en.y - 20, t: 45 });
          continue;
        }
        if (overlaps(en) && pc.cutOnce(en)) {
          en.takeHit(pc.facing, SLASH_DAMAGE, true);
          if (en.health<=0) this.killEnemy(j);
        }
      }
      this.shurikens = this.shurikens.filter(s => !overlaps(s));
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
      en.update(pc, this.platforms, this.bullets, this.shurikens);
      if (en.y >= deathY) this.enemies.splice(i,1);
    }
    // Shuriken
    for (let i=this.shurikens.length-1; i>=0; i--) {
      const s = this.shurikens[i];
      if (s.update(this.platforms)) this.shurikens.splice(i,1);
      else if (goHit(s, pc) && pc.takeHit(1, s.dir)) this.shurikens.splice(i,1);
    }
    for (let i=this.puffs.length-1; i>=0; i--) if (--this.puffs[i].t <= 0) this.puffs.splice(i,1);
    for (let i=this.floats.length-1; i>=0; i--) { this.floats[i].y -= 1; if (--this.floats[i].t <= 0) this.floats.splice(i,1); }
    // Out of kunai: a slow trickle so a guardian fight can never become unwinnable
    if (pc.ammo < 3) { if (++this.ammoRegen >= 75) { pc.ammo++; this.ammoRegen=0; } }
    else this.ammoRegen = 0;
    this.updateSeal();
    this.updateCheckpoint();
    if (this.level===1) this.updateFleeingNinja();
    if (this.level===4) this.updateArena();
    pc.fall(this.platforms);
    pc.tick();
    this.cam.follow(pc, 0, this.offset);
    if (this.level===4) this.updatePetals();
  }

  /** The ninja waits by the pipe, runs when Katsuya reaches the last hill, and drops down behind it. */
  updateFleeingNinja() {
    const f = this.flee;
    if (f.state === 0 && this.pc.x > 8420) { f.state = 1; this.showBanner('THE RED CLAN FLEES', 'Follow him down the pipe'); }
    else if (f.state === 1) { f.x += 7; if (f.x > 9300) f.state = 2; }
    else if (f.state === 2) { f.vy = Math.min(f.vy + 1, 20); f.y += f.vy; f.x += 1; if (f.y > 900) f.state = 3; }
  }

  /** Lights the checkpoint lantern when the player reaches it. */
  updateCheckpoint() {
    const cp = this.checkpoint;
    if (!cp || cp.lit) return;
    if (Math.abs(this.pc.x + this.pc.w/2 - (cp.x+40)) < 80 && Math.abs(this.pc.y + this.pc.h - cp.baseY) < 120) {
      cp.lit = true;
      this.savedCheckpointLevel = this.level;
      this.showBanner('CHECKPOINT', 'Katsuya will return here if he falls');
    }
  }

  killEnemy(j) {
    const e = this.enemies[j];
    this.enemies.splice(j,1);
    const size = e.kind===KIND.SAMURAI ? 24 : 14;
    this.puffs.push({x:e.x+e.w/2, y:e.y+e.h/2, t:size, size});
  }

  restartFromDeath() {
    this.deathBtn.style.display='none';
    this.pauseBtn.style.display='block';
    this.setLevel(this.level);
  }

  /** Darkening red overlay with the "fallen" message, drawn over the frozen level. */
  drawDeathScreen(ctx) {
    if (this.pc.life > 0 || this.deathTimer < DEATH_FADE_START) return;
    const t = Math.min(1, (this.deathTimer-DEATH_FADE_START)/(DEATH_SCREEN_AT-DEATH_FADE_START));
    const cx = W/2;
    ctx.fillStyle=`rgba(10,0,0,${0.75*t})`; ctx.fillRect(0,0,W,H);
    const vg = ctx.createRadialGradient(cx,400,270,cx,400,900);
    vg.addColorStop(0,'rgba(120,0,0,0)'); vg.addColorStop(1,`rgba(120,0,0,${0.63*t})`);
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.font='bold 300px "Hiragino Mincho ProN", serif';
    ctx.fillStyle=`rgba(150,10,16,${0.43*t})`; ctx.fillText('\u6B7B', cx, 470);
    ctx.font='bold 76px "Gill Sans", sans-serif';
    ctx.fillStyle=`rgba(0,0,0,${t})`; ctx.fillText('YOU HAVE FALLEN', cx+4, 334);
    ctx.fillStyle=`rgba(255,255,255,${t})`; ctx.fillText('YOU HAVE FALLEN', cx, 330);
    ctx.font='italic 28px Baskerville, serif';
    ctx.fillStyle=`rgba(225,210,210,${t})`; ctx.fillText('For the honor of his family, Katsuya rises again.', cx, 390);
    ctx.font='20px "Gill Sans", sans-serif';
    ctx.fillStyle=`rgba(190,170,170,${t})`; ctx.fillText(this.savedCheckpointLevel === this.level ? 'Press R or click Restart from Checkpoint' : 'Press R or click Restart Level', cx, 610);
    ctx.textAlign='start';
  }

  showBanner(title, sub) { this.banner=title; this.bannerSub=sub; this.bannerTimer=170; }

  /** Breaks the exit seal once every guardian is gone; nudges the player if they reach it early. */
  updateSeal() {
    if (!this.seal) return;
    if (!this.enemies.some(e => e.guardian)) {
      this.platforms.splice(this.platforms.indexOf(this.seal), 1);
      this.puffs.push({x:this.seal.x+60, y:this.seal.y+150, t:30, size:30});
      this.seal = null;
      this.showBanner('THE SEAL IS BROKEN', 'The way forward is open');
    } else if (!this.sealHintShown && Math.abs(this.pc.x-this.seal.x)<500 && Math.abs(this.pc.y-this.seal.y)<500) {
      this.sealHintShown = true;
      this.showBanner('SEALED', 'Defeat the Warlord');
    }
  }

  /** Bowser-style arena: once the player is in, the gate drops and the warlord wakes. */
  updateArena() {
    const gate = this.arenaGate;
    if (!gate) return;
    if (!this.arenaClosing && this.pc.x > ARENA_TRIGGER_X) this.arenaClosing = true;
    if (this.arenaClosing && !this.arenaClosed) {
      gate.y = Math.min(ARENA_GATE_REST_Y, gate.y+22);
      if (gate.y >= ARENA_GATE_REST_Y) {
        this.arenaClosed = true;
        // Anyone caught under the gate gets pushed back to the courtyard side
        for (const e of this.enemies) if (e!==this.warlord && goHit(e, gate)) e.x = ARENA_GATE_X - e.w - 4;
        if (this.warlord) this.warlord.setActive(true);
        this.sealHintShown = true;
        this.showBanner('THE WARLORD', 'He ordered the attack on your family. End this.');
      }
    }
    // Early in the fight, teach the counter
    const w = this.warlord;
    if (this.arenaClosed && w && this.enemies.includes(w) && ++this.arenaTicks === 260)
      this.showBanner('COUNTER HIS STRIKES', 'Slash (S) the moment his "!" turns white to stagger him');
    // Reinforcements as the warlord weakens
    if (this.arenaClosed && w && this.enemies.includes(w) && w.phase() > this.warlordPhaseSeen) {
      this.warlordPhaseSeen = w.phase();
      if (this.warlordPhaseSeen === 2) {
        this.enemies.push(makeBossR(4520,560,'enemyRanger',2,3,true,6,1200), makeBossR(6240,560,'enemyRanger',2,3,true,6,1200));
        this.collectables.push(new Collectable('health',5150,610));
        this.showBanner('THE WARLORD CALLS HIS GUARD', 'Red Clan ninjas leap into the arena');
      } else if (this.warlordPhaseSeen === 3) {
        this.enemies.push(makeBossR(4520,540,'boss',3,4,true,6,1200));
        this.showBanner('THE WARLORD IS ENRAGED', 'He strikes faster and harder');
      }
    }
  }

  updatePetals() {
    const drift = this.cam.x - this.lastCamX;
    this.lastCamX = this.cam.x;
    this.petals.forEach((p, i) => {
      p.spin += 0.08; p.y += p.speed;
      p.x += Math.sin(p.spin*0.7 + i)*0.8 - 0.5 - drift*0.9;
      if (p.y > 810) { p.y = -10; p.x = Math.random()*1700; }
      if (p.x < -20) p.x += 1640;
      if (p.x > 1620) p.x -= 1640;
    });
  }

  // -------------------- RENDERING --------------------
  render() {
    const ctx = this.ctx;
    this.updateNextLabel();
    ctx.clearRect(0,0,W,H);

    const scene = this.cutscenes[this.state];
    if (scene) { scene.draw(ctx); return; }
    switch(this.state) {
      case State.TITLE: this.titleScreen.draw(ctx); break;
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
    if (n===4) { this.drawDojo(ctx); this.drawHUD(ctx); return; }
    ctx.save();
    ctx.translate(-this.cam.x, -this.cam.y);
    const bg = imgs[this.bgKey];
    if (bg) {
      let bx, by;
      if (n===1) { bx=-800+Math.floor(this.pc.x*53/57); by=-400-Math.floor(this.pc.y/7); }
      else if (n===2) { bx=-800+Math.floor(this.pc.x*53/57); by=-600+Math.floor(this.pc.y*40/57); }
      else { bx=-800+Math.floor(this.pc.x*53/57); by=-100-Math.floor(this.pc.y*5/57); }
      ctx.drawImage(bg, bx, by);
    } else {
      const colors = [null,'rgb(135,170,210)','rgb(60,70,60)','rgb(80,80,100)'];
      ctx.fillStyle=colors[n]; ctx.fillRect(this.cam.x,this.cam.y,W,H);
    }
    this.drawActors(ctx);
    ctx.restore();
    if (n===3) this.drawRain(ctx);
    this.drawHUD(ctx);
  }

  /** Tokyo is under a storm: slanted rain over the whole view and the odd lightning flash. */
  drawRain(ctx) {
    const t = this.levelTicks, mod = (a, m) => ((a % m) + m) % m;
    ctx.strokeStyle = 'rgba(186,200,236,0.43)'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i=0; i<220; i++) {
      const x = mod(i*97 + t*9, W+200) - 100, y = mod(i*61 + t*26, H+100) - 50;
      ctx.moveTo(x, y); ctx.lineTo(x-8, y+26);
    }
    ctx.stroke();
    const c = t % 460;
    if (c < 4 || (c > 8 && c < 12)) { ctx.fillStyle = 'rgba(225,232,255,0.27)'; ctx.fillRect(0, 0, W, H); }
  }

  /**
   * The dojo in parallax layers: a slow sky, clouds drifting on their own, the temple compound at
   * about half speed, the level, then petals and lanterns in front. Each background layer has a
   * sunset and a night version; night fades in as the player goes deeper (see nightFactor).
   */
  drawDojo(ctx) {
    const camX = this.cam.x, camY = this.cam.y, scroll = camX - DOJO_CAM0, night = this.nightFactor();
    const mod = (a, m) => ((a % m) + m) % m;
    const layer = (key, x, y, alpha) => {
      if (alpha <= 0.01 || !imgs[key]) return;
      ctx.globalAlpha = alpha; ctx.drawImage(imgs[key], x, y); ctx.globalAlpha = 1;
    };
    ctx.fillStyle = 'rgb(40,30,60)'; ctx.fillRect(0, 0, W, H);
    const skyX = -Math.floor(scroll*0.06), skyY = -60 - Math.floor((camY-9)*0.2);
    layer('dojoSkySunset', skyX, skyY, 1); layer('dojoSky', skyX, skyY, night);
    if (imgs.dojoClouds) {
      const cw = imgs.dojoClouds.width, cx = -mod(Math.floor(scroll*0.15 + this.levelTicks*0.5), cw);
      const cy = 20 - Math.floor((camY-9)*0.3);
      for (const k of [0, 1]) { layer('dojoCloudsSunset', cx + k*cw, cy, 1 - night); layer('dojoClouds', cx + k*cw, cy, night); }
    }
    ctx.save();
    ctx.translate(-camX, -camY);
    const templeX = camX - Math.floor(scroll*0.55);
    layer('dojoTempleSunset', templeX, 0, 1); layer('dojoTemple', templeX, 0, night);
    this.drawActors(ctx);
    ctx.restore();
    for (let i=0; i<this.petals.length; i++) {
      const p = this.petals[i];
      ctx.fillStyle = i%3===0 ? 'rgba(255,236,244,0.86)' : 'rgba(246,182,210,0.86)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, (3+5*Math.abs(Math.cos(p.spin)))/2, 2.5, 0, 0, Math.PI*2);
      ctx.fill();
    }
    const fore = imgs.dojoFore;
    if (fore) {
      const fw = fore.width, fx = -mod(Math.floor(scroll*1.3), fw), fy = -Math.floor((camY-9)*1.3);
      ctx.drawImage(fore, fx, fy); ctx.drawImage(fore, fx+fw, fy);
    }
  }

  /** 0 at sunset (the courtyard entrance) rising smoothly to 1 at full night (the arena gate). */
  nightFactor() {
    const t = Math.max(0, Math.min(1, (this.pc.x - 2700) / 1800));
    return t*t*(3 - 2*t);
  }

  /** World-space actors: player, platforms, pickups, kunai, enemies, shuriken, puffs. */
  drawActors(ctx) {
    for (const pr of this.props) if (imgs[pr.key]) ctx.drawImage(imgs[pr.key], pr.x, pr.y);
    const cp = this.checkpoint;
    if (cp) { const im = imgs[cp.lit ? 'checkpointLit' : 'checkpoint']; if (im) ctx.drawImage(im, cp.x, cp.baseY-170); }
    const isForeground = p => ['pipe','pipe1','pipe2','pipeTall','extraPipe'].includes(p.tag);
    for (const p of this.platforms) if (!isForeground(p)) p.draw(ctx);
    // The courtyard floor darkens with the night (over the floor, under everyone standing on it)
    if (this.level === 4) { ctx.fillStyle = `rgba(10,14,40,${this.nightFactor()*0.59})`; ctx.fillRect(2200, 700, 4200, 400); }
    for (const c of this.collectables) c.draw(ctx);
    // The player goes over the level art (doorways, pagodas, pipes) so they're never hidden behind it
    this.pc.draw(ctx);
    for (const b of this.bullets) b.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    for (const s of this.shurikens) s.draw(ctx);
    ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
    for (const f of this.floats) {
      const a = Math.min(1, f.t*8/255);
      ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillText(f.text, f.x+2, f.y+2);
      ctx.fillStyle = `rgba(255,240,160,${a})`; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.textAlign = 'start';
    const f = this.flee, ninja = imgs.enemyRanger;
    if (this.level === 1 && f.state < 3 && ninja) {
      // The sprite faces left; mirror it so he runs right toward the pipe
      const bob = f.state === 1 ? Math.round(-Math.abs(Math.sin(this.levelTicks*0.4))*4) : 0;
      ctx.save(); ctx.translate(f.x + ninja.width, f.y + bob); ctx.scale(-1, 1); ctx.drawImage(ninja, 0, 0); ctx.restore();
    }
    // Pipes go in front of everyone, so ninjas disappear into them
    for (const p of this.platforms) if (isForeground(p)) p.draw(ctx);
    for (const p of this.puffs) {
      const r = (p.size - p.t)*3 + 10;
      ctx.fillStyle = `rgba(230,230,236,${Math.min(1, p.t*0.047)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(120,120,130,${Math.min(1, p.t*0.03)})`; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r+6, 0, Math.PI*2); ctx.stroke();
    }
  }

  /** Screen-space HUD: ammo, pause bars, warlord bar, banner. */
  drawHUD(ctx) {
    ctx.fillStyle='cyan';
    ctx.fillRect(W-50, H-60, 25, this.pc.ammo*4);
    ctx.font='20px serif';
    ctx.fillText(this.pc.ammo+'', W-50, H-65);
    const cx = W/2;
    if (this.arenaClosed && this.warlord && this.enemies.includes(this.warlord)) {
      const bw=600, bx=cx-bw/2, by=46;
      ctx.fillStyle='rgba(0,0,0,0.67)'; ctx.fillRect(bx-6, by-30, bw+12, 52);
      ctx.fillStyle='#fff'; ctx.font='bold 18px "Gill Sans", sans-serif';
      ctx.fillText(this.warlord.phase()>=3 ? 'THE WARLORD \u2014 ENRAGED' : 'THE WARLORD', bx, by-8);
      ctx.fillStyle='rgb(90,10,14)'; ctx.fillRect(bx, by, bw, 14);
      ctx.fillStyle='rgb(220,40,40)'; ctx.fillRect(bx, by, bw*this.warlord.health/this.warlord.maxHealth, 14);
      ctx.strokeStyle='rgb(240,200,90)'; ctx.lineWidth=1; ctx.strokeRect(bx, by, bw, 14);
    }
    if (this.bannerTimer > 0 && this.pc.life > 0) {
      const a = Math.min(1, this.bannerTimer*6/255);
      ctx.textAlign='center';
      ctx.font='bold 54px "Gill Sans", sans-serif';
      ctx.fillStyle=`rgba(0,0,0,${a*0.67})`; ctx.fillText(this.banner, cx+3, 233);
      ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.fillText(this.banner, cx, 230);
      ctx.font='italic 26px Baskerville, serif';
      ctx.fillStyle=`rgba(0,0,0,${a*0.67})`; ctx.fillText(this.bannerSub, cx+2, 274);
      ctx.fillStyle=`rgba(235,235,235,${a})`; ctx.fillText(this.bannerSub, cx, 272);
      ctx.textAlign='start';
    }
    this.drawDeathScreen(ctx);
  }

  /** The frozen level, dimmed, under a lacquered pause panel with the chapter, status and controls. */
  drawPause(ctx) {
    ctx.fillStyle = 'rgba(6,4,10,0.67)'; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W/2, H/2, W*0.28, W/2, H/2, W*0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.63)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const px = 520, py = 70, pw = 560, ph = 600, cx = px + pw/2;
    const round = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
    ctx.fillStyle = 'rgba(0,0,0,0.47)'; round(px+6, py+10, pw, ph, 22); ctx.fill();
    const pg = ctx.createLinearGradient(0, py, 0, py+ph); pg.addColorStop(0, '#241a1e'); pg.addColorStop(1, '#0e0a0c');
    ctx.fillStyle = pg; round(px, py, pw, ph, 22); ctx.fill();
    ctx.strokeStyle = '#d4ac48'; ctx.lineWidth = 2.5; round(px, py, pw, ph, 22); ctx.stroke();
    ctx.strokeStyle = 'rgba(212,172,72,0.35)'; ctx.lineWidth = 1; round(px+9, py+9, pw-18, ph-18, 16); ctx.stroke();
    const sun = ctx.createRadialGradient(cx, py+96, 0, cx, py+96, 70);
    sun.addColorStop(0, '#c81e24'); sun.addColorStop(0.75, '#96121a'); sun.addColorStop(1, 'rgba(150,18,26,0)');
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(cx, py+96, 70, 0, Math.PI*2); ctx.fill();
    const text = (t, x, y, font, color) => {
      ctx.font = font; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(t, x+2, y+2);
      ctx.fillStyle = color; ctx.fillText(t, x, y);
      ctx.textAlign = 'start';
    };
    text('PAUSED', cx, py+116, "bold 56px 'Gill Sans', sans-serif", '#faf0dc');
    const chapters = ['', 'Chapter I \u00B7 Osaka', 'Chapter II \u00B7 The Sewers', 'Chapter III \u00B7 Rooftops of Tokyo', 'Chapter IV \u00B7 The Dojo'];
    text(chapters[this.level] || '', cx, py+172, "italic 24px Baskerville, serif", '#d4be96');
    // Status: health and kunai
    const sy = py + 206;
    ctx.font = "18px 'Gill Sans', sans-serif"; ctx.fillStyle = '#beb4aa';
    ctx.fillText('HEALTH', px+70, sy);
    ctx.textAlign = 'right'; ctx.fillText('KUNAI', px+pw-70, sy); ctx.textAlign = 'start';
    ctx.fillStyle = '#5a0c10'; ctx.fillRect(px+150, sy-14, 150, 14);
    ctx.fillStyle = '#3cdc5a'; ctx.fillRect(px+150, sy-14, 15*Math.max(0, this.pc.life), 14);
    ctx.font = "bold 20px 'Gill Sans', sans-serif"; ctx.fillStyle = '#00e6ff'; ctx.textAlign = 'right';
    ctx.fillText(this.pc.ammo + ' / 10', px+pw-140, sy); ctx.textAlign = 'start';
    // Controls reminder under the buttons
    ctx.strokeStyle = 'rgba(212,172,72,0.47)'; ctx.beginPath(); ctx.moveTo(px+60, py+478); ctx.lineTo(px+pw-60, py+478); ctx.stroke();
    text('A / D  move     SPACE  jump     S  slash', cx, py+514, "17px 'Gill Sans', sans-serif", '#c8beaf');
    text('CLICK  throw kunai     ESC / P  pause', cx, py+542, "17px 'Gill Sans', sans-serif", '#c8beaf');
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
