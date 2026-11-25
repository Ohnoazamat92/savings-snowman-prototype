import { ARENA } from './game.js';
import { createHeroAnimator } from './hero-animation.js';

export function makeRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const hero = new Image(), items = new Image(), ground = new Image(), shield = new Image();
  const base = `${import.meta.env.BASE_URL}assets/sphere-game/`;
  hero.src = `${base}snowman.webp`; items.src = `${base}items.png`; ground.src = `${base}ground-snow.png`;
  shield.src = `${base}t-shield.png`;
  const heroAnimation = createHeroAnimator();
  let width = 0, height = 0;
  // Половинное разрешение даёт общую пиксельную сетку спрайтам и эффектам.
  const ratio = 0.5;
  function resize() {
    const box = canvas.getBoundingClientRect(); width = box.width; height = box.height;
    canvas.width = Math.ceil(width * ratio); canvas.height = Math.ceil(height * ratio);
    ctx.imageSmoothingEnabled = false;
  }
  function sprite(index, x, y, w, h = w) {
    if (index === 0) {
      if (shield.complete && shield.naturalWidth) ctx.drawImage(shield, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
      return;
    }
    if (!items.complete || !items.naturalWidth) return;
    const sw = items.naturalWidth / 4, sh = items.naturalHeight / 4;
    ctx.drawImage(items, index % 4 * sw, Math.floor(index / 4) * sh, sw, sh, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  }
  function circle(x, y, r, color, line = 2) {
    ctx.strokeStyle = color; ctx.lineWidth = line;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }
  function draw(game, { home = false, reduceMotion = false, joystick = null } = {}) {
    if (!width || !height) resize();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#819aaa'; ctx.fillRect(0, 0, width, height);
    const p = game.player;
    const zoom = Math.max(0.8, Math.min(1.5, width / 640, height / 500));
    const halfW = width / zoom / 2, halfH = height / zoom / 2;
    const cameraX = home ? 0 : p.x, cameraY = home ? 0 : p.y;
    const minX = cameraX - halfW, minY = cameraY - halfH;
    ctx.save(); ctx.translate(width / 2, height / 2); ctx.scale(zoom, zoom); ctx.translate(-cameraX, -cameraY);
    if (ground.complete && ground.naturalWidth) {
      for (let x = Math.floor(minX / 256) * 256; x < minX + halfW * 2; x += 256) {
        for (let y = Math.floor(minY / 256) * 256; y < minY + halfH * 2; y += 256) ctx.drawImage(ground, x, y, 256, 256);
      }
    }
    // Неподвижные декорации не влияют на столкновения.
    const scenery = [[-220,-160,14,110],[245,-190,14,125],[-260,140,14,130],[275,170,14,130],[-180,-45,13,60],[180,-45,13,60],[-180,140,12,58],[180,140,12,58],[-470,390,13,70],[430,370,14,140],[-420,-380,14,120],[410,-390,13,65]];
    for (const [x,y,id,size] of scenery) sprite(id,x,y,size);
    if (home) { ctx.restore(); ctx.fillStyle = '#05080873'; ctx.fillRect(0,0,width,height); return; }
    circle(0,0,ARENA,'#d5e5ee',5); circle(0,0,ARENA-10,'#5c738b',4);
    for (const spark of game.sparks) {
      if (Math.abs(spark.x - p.x) > halfW + 20 || Math.abs(spark.y - p.y) > halfH + 20) continue;
      sprite(spark.value > 1 ? 7 : 6,spark.x,spark.y,spark.value > 1 ? 22 : 16);
    }
    for (const e of game.enemies) {
      const size = e.kind === 3 ? 106 : e.kind === 2 ? 63 : 49;
      const bob = reduceMotion ? 0 : Math.round(Math.sin(game.time * (e.kind === 1 ? 12 : 6) + e.id) * 2);
      ctx.globalAlpha = e.hit ? 0.65 : 1;
      sprite(8+e.kind,e.x,e.y+bob,size);
      ctx.globalAlpha = 1;
      if (e.kind === 3 || e.hp < e.maxHp) {
        ctx.fillStyle='#17100d';ctx.fillRect(e.x-e.radius-1,e.y-e.radius-13,e.radius*2+2,5);
        ctx.fillStyle='#b94b47';ctx.fillRect(e.x-e.radius,e.y-e.radius-12,Math.ceil(e.radius*2*Math.max(0,e.hp/e.maxHp)),3);
      }
    }
    const orbit = game.upgrades.orbit;
    if (orbit) {
      circle(p.x,p.y,70,'#90ca9d60');
      for (let i=0;i<orbit;i++) {
        const a=game.time*2.4+i*Math.PI*2/orbit;
        sprite(0,p.x+Math.cos(a)*70,p.y+Math.sin(a)*70,28);
      }
    }
    for (const s of game.shots) {
      ctx.strokeStyle='#f4d36d';ctx.lineWidth=4;ctx.lineCap='square';
      ctx.beginPath();ctx.moveTo(s.x-s.vx*.025,s.y-s.vy*.025);ctx.lineTo(s.x,s.y);ctx.stroke();
      ctx.fillStyle='#fff4c0';ctx.fillRect(Math.round(s.x)-2,Math.round(s.y)-2,4,4);
    }
    for (const e of game.effects) {
      ctx.globalAlpha=e.life/e.total;
      if (e.kind==='chain') {
        ctx.strokeStyle='#b8eaff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo((e.x+e.tx)/2+8,(e.y+e.ty)/2-8);ctx.lineTo(e.tx,e.ty);ctx.stroke();
      } else if (!reduceMotion) {
        const radius=8+(1-e.life/e.total)*20;
        ctx.fillStyle=e.kind==='hurt'?'#f77762':'#f6e5a3';
        for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.fillRect(Math.round(e.x+Math.cos(a)*radius),Math.round(e.y+Math.sin(a)*radius),4,4);}
      }
    }
    ctx.globalAlpha=1;
    if(game.upgrades.cushion)circle(p.x,p.y,27,'#d99baea0');
    const { row, frame } = heroAnimation(game, reduceMotion);
    ctx.globalAlpha=p.invulnerable>0?.65:1;
    if(hero.complete&&hero.naturalWidth)ctx.drawImage(hero,frame*192,row*208,192,208,Math.round(p.x-36),Math.round(p.y-48),72,78);
    ctx.globalAlpha=1;
    ctx.fillStyle='#100d10';ctx.fillRect(Math.round(p.x-25),Math.round(p.y+34),50,9);
    ctx.fillStyle='#50312e';ctx.fillRect(Math.round(p.x-23),Math.round(p.y+36),46,5);
    ctx.fillStyle='#d83f40';ctx.fillRect(Math.round(p.x-23),Math.round(p.y+36),Math.ceil(46*p.hp/100),5);
    ctx.fillStyle='#fc7c65';ctx.fillRect(Math.round(p.x-23),Math.round(p.y+36),Math.ceil(46*p.hp/100),2);
    ctx.restore();
    if(joystick){circle(joystick.x,joystick.y,40,'#e3d7ad60',2);circle(joystick.x+joystick.dx*30,joystick.y+joystick.dy*30,15,'#f4df8bba',3);}
  }
  resize();return { draw, resize };
}
