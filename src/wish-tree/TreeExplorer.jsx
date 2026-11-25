import React, { useEffect, useRef } from 'react';
import { colors } from './wishes.js';
import { zones, BRANCHES_PER_ZONE, BRANCH_COUNT, demoWishes, branchPoint, branchPositions, personalWishes, wishNoun } from './tree-scale.js';

const asset = name => `${import.meta.env.BASE_URL}assets/wish-tree/${name}.png`;
const number = n => new Intl.NumberFormat('ru-RU').format(n);

export function Ball({ color = 'gold', className = '' }) {
  return <img className={`ball ${className}`} src={asset('ornament')} style={{ filter: colors.find(c => c.id === color)?.filter }} alt="" draggable="false" />;
}

function Lights({ saved, shared }) {
  const canvas = useRef(null);
  useEffect(() => {
    const element = canvas.current;
    const draw = () => {
      const size = element.clientWidth;
      if (!size) return;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      element.width = size * ratio; element.height = size * ratio;
      const ctx = element.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      for (const wish of [...demoWishes, ...personalWishes(saved, shared)]) {
        const [x, y] = branchPoint(wish.branch ?? 0);
        const angle = wish.slot * 2.39996;
        const radius = Math.sqrt((wish.slot + 1) / 24) * .8;
        const px = (x + Math.cos(angle) * radius) * size / 100;
        const py = (y + Math.sin(angle) * radius) * size / 100;
        ctx.fillStyle = wish.color === 'blue' ? '#c1e0f292' : wish.color === 'pink' ? '#f5b5c57a' : '#ffe4a795';
        ctx.beginPath(); ctx.arc(px, py, Math.max(.36, size / 1250), 0, Math.PI * 2); ctx.fill();
      }
    };
    const observer = new ResizeObserver(draw); observer.observe(element); draw();
    return () => observer.disconnect();
  }, [saved, shared]);
  return <canvas className="wish-lights" ref={canvas} aria-hidden="true" />;
}

export function TreeExplorer({ view, branch, step, saved, shared, wishes, available, slot, draft, mine, onExplore, onOverview, onWish, onSlot, onPlace, onStart }) {
  const zoneIndex = Math.floor(branch / BRANCHES_PER_ZONE);
  const zone = zones[zoneIndex];
  const zoomed = view === 'branch';
  const added = personalWishes(saved, shared);
  const total = demoWishes.length + added.length;
  const heading = useRef(null);
  const previousView = useRef(view);
  useEffect(() => {
    if (previousView.current !== view) heading.current?.focus({preventScroll: true});
    previousView.current = view;
  }, [view]);
  const point = branchPoint(branch);
  return <section className={`tree-section explorer ${zoomed ? 'zoomed' : ''} ${step === 'place' ? 'placing' : ''}`} aria-label="Общая ёлка желаний">
    <nav className="tree-breadcrumb" aria-label="Масштаб ёлки">
      <button onClick={onOverview} aria-current={!zoomed ? 'page' : undefined}>Вся ёлка</button>
      <span aria-hidden="true">/</span>
      <span ref={heading} tabIndex="-1">{zoomed ? `Ветка ${branch + 1}` : `${number(total)} ${wishNoun(total)}`}</span>
      <span className="level-label">{zoomed ? 'Крупный план' : 'Общий вид'}</span>
    </nav>
    <div className="explorer-window">
      <div className="overview-plane" inert={zoomed} style={{transformOrigin:`${zone.x}% ${zone.y}%`}}>
        <img className="whole-tree" src={asset('tree')} alt="Общая ёлка с тысячами огоньков желаний" />
        <Lights saved={saved} shared={shared} />
        {zones.map((z, i) => <button key={z.name} className={`zone-marker zone-${i}`} style={{left:`${z.x}%`,top:`${z.y}%`}} onClick={() => onExplore(i * BRANCHES_PER_ZONE)} aria-label={`Приблизить: ${z.name}`}><span className="zone-spark" aria-hidden="true" /><span className="zone-count">{number(1280 + added.filter(w => Math.floor((w.branch ?? 0) / BRANCHES_PER_ZONE) === i).length)}</span><span className="zone-name">{z.name}</span></button>)}
        {mine && <button className="my-tree-pin" style={{left:`${branchPoint(mine.branch ?? 0)[0]}%`,top:`${branchPoint(mine.branch ?? 0)[1]}%`}} onClick={() => onExplore(mine.branch ?? 0)}>Моя ветка</button>}
        <div className="overview-hint">Выберите светящийся участок,<br />чтобы увидеть желания ближе</div>
      </div>
      <div className="branch-plane" inert={!zoomed} aria-hidden={!zoomed}>
        <img className="branch-photo" src={asset('branch')} alt="Еловые ветви крупным планом" style={{objectPosition:`${42 + branch % 8 * 2}% center`}} />
        <div className="branch-shade" />
        {zoomed && <>
          <div className="branch-scene-heading"><span>{zone.name}</span><strong>Ветка {branch + 1}</strong><span>{wishes.length} {wishNoun(wishes.length)} · {available.length ? 'есть место для вашего' : 'эта ветка заполнена'}</span></div>
          <div className="branch-toys" key={branch}>
            {wishes.filter(w => w.displaySlot !== null).map(wish => <button key={wish.id} className={`branch-toy ${mine?.id === wish.id ? 'own-toy' : ''}`} style={{left:`${branchPositions[wish.displaySlot][0]}%`,top:`${branchPositions[wish.displaySlot][1]}%`}} onClick={() => onWish(wish)} aria-label={`${wish.name}: ${wish.wish}`}><Ball color={wish.color} /><span className="toy-author">{mine?.id === wish.id ? 'Ваше желание' : wish.name}</span><span className="toy-tooltip">{wish.wish}</span></button>)}
            {step === 'place' && available.map(i => <button key={i} className={`branch-place ${slot === i ? 'selected' : ''}`} style={{left:`${branchPositions[i][0]}%`,top:`${branchPositions[i][1]}%`}} onClick={() => onSlot(i)} aria-label={`Выбрать место ${i + 1}`} aria-pressed={slot === i}>{slot === i ? <Ball color={draft.color} /> : <span aria-hidden="true">+</span>}</button>)}
          </div>
          <button className="tree-minimap" onClick={onOverview} aria-label="Отдалить и показать всю ёлку"><img src={asset('tree')} alt="" /><span className="map-location" style={{left:`${point[0]}%`,top:`${point[1]}%`}} /><span className="map-caption">Вы здесь</span></button>
          <div className="branch-nav"><button aria-label="Предыдущая ветка" disabled={branch === 0} onClick={() => onExplore(branch - 1)}>‹</button><span>{branch + 1} <span>из {BRANCH_COUNT} веток</span></span><button aria-label="Следующая ветка" disabled={branch === BRANCH_COUNT - 1} onClick={() => onExplore(branch + 1)}>›</button></div>
        </>}
      </div>
      <div className="zoom-control" aria-label="Приближение"><button disabled={zoomed} onClick={() => onExplore(branch)} aria-label="Приблизить к ветке">+</button><button disabled={!zoomed} onClick={onOverview} aria-label="Показать всю ёлку">−</button></div>
    </div>
    {zoomed ? <div className="branch-toolbar"><label htmlFor="branch-jump">Перейти к ветке</label><input id="branch-jump" type="range" min="0" max={BRANCH_COUNT - 1} value={branch} onChange={e => onExplore(Number(e.target.value))} /><span>{branch + 1}</span></div> : <p className="scale-footnote">Каждый огонёк — желание. Приблизьте ёлку, чтобы прочитать его.</p>}
    {zoomed && step === 'intro' && <button className="primary full branch-mobile-action" onClick={onStart}>Повесить желание на этой ветке</button>}
    {zoomed && step === 'place' && <button className="primary full mobile-place" onClick={onPlace}>Повесить сюда</button>}
  </section>;
}
