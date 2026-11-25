import React, { useEffect, useRef, useState } from 'react';
import { chooseUpgrade, createGame, DURATION, leaderboard, pauseGame, readRecord, resumeGame, saveRecord, snapshot, step, UPGRADES, weekKey } from './game.js';
import { makeRenderer } from './renderer.js';
import { createGameAudio, readAudioSettings, saveAudioSettings } from './audio.js';
import { challengeUrl, readChallenge, shareChallenge, shareIsPrimary } from './challenge.js';

const format = value => Math.round(value).toLocaleString('ru-RU');
const clock = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
const getStorage = () => { try { return window.localStorage; } catch { return null; } };
const ICONS = { orbit: 0, bolt: 1, magnet: 2, chain: 3, cushion: 4, speed: 5, gem: 6, coin: 7 };
function ItemIcon({ id, className = '' }) {
  const index = ICONS[id] ?? 0;
  return <span aria-hidden="true" className={`item-icon ${id === 'orbit' ? 'shield-icon' : ''} ${className}`} style={{ backgroundPosition: `${index % 4 / 3 * 100}% ${Math.floor(index / 4) / 3 * 100}%` }} />;
}
function navigateMenu(event) {
  if (!['ArrowDown', 'ArrowUp'].includes(event.code) || event.target.tagName === 'INPUT') return;
  const buttons = [...event.currentTarget.querySelectorAll('button, a[href]')].filter(button => !button.disabled && button.getClientRects().length);
  if (!buttons.length) return;
  event.preventDefault();
  const index = buttons.indexOf(document.activeElement);
  buttons[(index + (event.code === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
}

function GameDialog({ state, title, children, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    if (!ref.current.open) ref.current.showModal();
    const initial = ref.current.querySelector('.primary, .upgrade-card');
    initial?.focus({ preventScroll: true });
    return () => { if (opener?.isConnected && opener.tagName === 'BUTTON') opener.focus({ preventScroll: true }); };
  }, [state]);
  return <dialog ref={ref} className={`game-dialog dialog-${state}`} aria-label={title} onKeyDown={navigateMenu} onCancel={e => { e.preventDefault(); onCancel?.(); }}>
    {children}
  </dialog>;
}

export function App() {
  const game = useRef(null);
  const audio = useRef(null);
  const foreground = useRef(!document.hidden);
  const [challenge, setChallenge] = useState(() => readChallenge(window.location.hash));
  const [audioSettings, setAudioSettings] = useState(() => readAudioSettings(getStorage()));
  const [audioError, setAudioError] = useState('');
  if (!game.current) game.current = createGame();
  const [view, setView] = useState('home');
  const [hud, setHud] = useState(() => snapshot(game.current));
  const [week, setWeek] = useState(weekKey);
  const [record, setRecord] = useState(() => readRecord(getStorage(), weekKey()));
  const [name, setName] = useState(() => readRecord(getStorage(), weekKey())?.name || 'Ты');
  const [notice, setNotice] = useState(() => window.location.hash.includes('challenge=') && !challenge ? 'Ссылка вызова повреждена или устарела. Можно начать обычную игру.' : '');
  const [menu, setMenu] = useState(challenge ? 'challenge' : null);
  const [manualShare, setManualShare] = useState('');
  const [sharing, setSharing] = useState(false);
  const previousBest = useRef(record?.score || 0);
  const [reduceMotion, setReduceMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const canvas = useRef(null), saved = useRef(false), move = useRef({ x: 0, y: 0 });
  const inputKeys = useRef(new Set()), stick = useRef(null);
  const board = leaderboard(record);
  const ownRow = board.find(r => r.me);
  const sharePrimary = shareIsPrimary(hud, previousBest.current, challenge);
  const bestUpgrades = UPGRADES.filter(u => hud.upgrades[u.id]).sort((a, b) => hud.upgrades[b.id] - hud.upgrades[a.id]).slice(0, 3);
  const startDate = new Date(`${week}T12:00:00+03:00`);
  const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 6);
  const period = `${startDate.getDate()}–${endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
  const sync = () => setHud(snapshot(game.current));
  const clearInput = () => { inputKeys.current.clear(); stick.current = null; move.current = { x: 0, y: 0 }; };

  function begin() {
    setNotice(''); setManualShare(''); setMenu(null);
    const currentWeek = challenge?.seed || weekKey();
    const currentRecord = readRecord(getStorage(), currentWeek);
    setWeek(currentWeek); setRecord(currentRecord); previousBest.current = currentRecord?.score || 0;
    game.current = createGame(currentWeek); saved.current = false; clearInput();
    audio.current?.begin(game.current);
    setView('game'); sync();
    requestAnimationFrame(() => canvas.current?.focus({ preventScroll: true }));
  }
  function pause() { pauseGame(game.current); audio.current?.update(game.current, foreground.current && view === 'game'); clearInput(); sync(); }
  function resume() { resumeGame(game.current); audio.current?.prepare(); audio.current?.update(game.current); clearInput(); sync(); requestAnimationFrame(() => canvas.current?.focus({ preventScroll: true })); }
  function home() { audio.current?.silence(); clearInput(); setView('home'); setMenu(challenge ? 'challenge' : null); game.current = createGame(); sync(); setNotice(''); setManualShare(''); }
  function dismissChallenge() {
    setChallenge(null); setMenu(null); setNotice('');
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  function upgrade(id) { chooseUpgrade(game.current, id); audio.current?.prepare(); audio.current?.update(game.current); audio.current?.effect('select'); clearInput(); sync(); requestAnimationFrame(() => canvas.current?.focus({ preventScroll: true })); }

  useEffect(() => {
    audio.current = createGameAudio(import.meta.env.BASE_URL, readAudioSettings(getStorage()), setAudioError);
    return () => { audio.current?.dispose(); audio.current = null; };
  }, []);

  useEffect(() => {
    const openChallenge = () => {
      const next = readChallenge(window.location.hash);
      audio.current?.silence(); clearInput(); game.current = createGame(); sync();
      setChallenge(next); setView('home'); setMenu(next ? 'challenge' : null); setManualShare('');
      setNotice(window.location.hash.includes('challenge=') && !next ? 'Ссылка вызова повреждена или устарела. Можно начать обычную игру.' : '');
    };
    window.addEventListener('hashchange', openChallenge);
    return () => window.removeEventListener('hashchange', openChallenge);
  }, []);

  function changeAudio(key, value) {
    const next = { ...audioSettings, [key]: value };
    setAudioSettings(next); saveAudioSettings(getStorage(), next);
    audio.current?.settings(next); audio.current?.prepare();
  }
  const audioControls = <fieldset className="audio-controls"><legend>ЗВУК</legend>
    <label>Музыка <input aria-label="Громкость музыки" type="range" min="0" max="100" value={Math.round(audioSettings.music * 100)} onChange={e => changeAudio('music', Number(e.target.value) / 100)} /></label>
    <label>Эффекты <input aria-label="Громкость эффектов" type="range" min="0" max="100" value={Math.round(audioSettings.effects * 100)} onChange={e => changeAudio('effects', Number(e.target.value) / 100)} onPointerUp={() => audio.current?.effect('collect')} onKeyUp={() => audio.current?.effect('collect')} /></label>
    <button className="small-action" aria-pressed={audioSettings.muted} onClick={() => changeAudio('muted', !audioSettings.muted)}>{audioSettings.muted ? 'ВКЛЮЧИТЬ ЗВУК' : 'ВЫКЛЮЧИТЬ ЗВУК'}</button>
    {audioError && <p className="notice" role="status">{audioError}</p>}
  </fieldset>;

  useEffect(() => {
    const renderer = makeRenderer(canvas.current);
    const observer = new ResizeObserver(() => renderer.resize()); observer.observe(canvas.current);
    let raf, last = performance.now(), accumulator = 0, lastHud = 0;
    function frame(now) {
      const elapsed = Math.min((now - last) / 1000, 0.1); last = now;
      if (view === 'game' && game.current.status === 'playing') {
        const keys = inputKeys.current;
        const x = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
        const y = Number(keys.has('ArrowDown') || keys.has('KeyS')) - Number(keys.has('ArrowUp') || keys.has('KeyW'));
        const input = x || y ? { x, y } : move.current;
        accumulator += elapsed;
        const previous = game.current.status;
        while (accumulator >= 1 / 60) { step(game.current, 1 / 60, input); audio.current?.update(game.current, foreground.current && !document.hidden); accumulator -= 1 / 60; }
        if (previous !== game.current.status || now - lastHud > 100) { setHud(snapshot(game.current)); lastHud = now; }
      } else accumulator = 0;
      audio.current?.update(game.current, view === 'game' && foreground.current && !document.hidden);
      renderer.draw(game.current, { home: view === 'home', reduceMotion, joystick: stick.current });
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [view, reduceMotion]);

  useEffect(() => {
    const movement = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
    const keydown = e => {
      if (view !== 'game' || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (movement.includes(e.code) && game.current.status === 'playing') { e.preventDefault(); inputKeys.current.add(e.code); }
      if ((e.code === 'Escape' || e.code === 'KeyP') && game.current.status === 'playing') { e.preventDefault(); pause(); }
    };
    const keyup = e => inputKeys.current.delete(e.code);
    const leave = () => { foreground.current = false; audio.current?.silence(); clearInput(); if (view === 'game') pause(); };
    const focus = () => { foreground.current = !document.hidden; };
    const visibility = () => { if (document.hidden) leave(); else focus(); };
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup);
    window.addEventListener('blur', leave); window.addEventListener('focus', focus); document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', leave); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', visibility);
    };
  }, [view]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = e => setReduceMotion(e.matches); media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    if (!['won', 'lost'].includes(hud.status) || saved.current) return;
    saved.current = true;
    const next = saveRecord(getStorage(), week, hud.score, name);
    if (next) setRecord(next); else setNotice('Не удалось сохранить рекорд в браузере. Результат доступен до закрытия страницы.');
  }, [hud.status, hud.score, week, name]);

  function pointerDown(e) {
    if (view !== 'game' || game.current.status !== 'playing' || stick.current) return;
    e.currentTarget.focus({ preventScroll: true }); e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    stick.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, dx: 0, dy: 0, pointerId: e.pointerId };
  }
  function pointerMove(e) {
    if (!stick.current || stick.current.pointerId !== e.pointerId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - rect.left - stick.current.x) / 40, dy = (e.clientY - rect.top - stick.current.y) / 40;
    const d = Math.max(1, Math.hypot(dx, dy));
    move.current = { x: dx / d, y: dy / d }; stick.current.dx = dx / d; stick.current.dy = dy / d;
  }
  function pointerEnd(e) { if (stick.current?.pointerId === e.pointerId) clearInput(); }
  async function sendChallenge(event, copyOnly = false) {
    if (sharing) return;
    setSharing(true); setNotice(''); setManualShare('');
    try {
      const url = challengeUrl(window.location.href, { seed: game.current.seed, name, score: hud.score, time: hud.time });
      const data = { title: 'Saving Survivors — вызов другу', text: `Нашёл снежный рогалик в накоплениях ❄️\nМой результат — ${format(hud.score)} искр за ${clock(hud.time)}. Побьёшь?`, url };
      const outcome = await shareChallenge(copyOnly ? { clipboard: navigator.clipboard } : navigator, data);
      if (outcome === 'copied') { setManualShare(url); setNotice('Вызов со ссылкой скопирован. Отправь его другу.'); }
      if (outcome === 'manual') { setManualShare(url); setNotice('Не удалось скопировать. Выдели ссылку и отправь её другу.'); }
    } catch { setNotice('Не удалось создать вызов. Попробуй ещё раз.'); }
    finally { setSharing(false); }
  }
  function updateName(e) {
    e.preventDefault();
    const next = saveRecord(getStorage(), week, hud.score, name);
    if (next) { setRecord(next); setName(next.name); setNotice('Имя сохранено'); }
    else setNotice('Не удалось сохранить имя в браузере.');
  }

  return <main className={`game-screen view-${view}`} aria-label="Saving Survivors">
    <canvas ref={canvas} tabIndex={view === 'game' ? 0 : -1} aria-label="Игровое поле. Управление: WASD, стрелки или движение пальцем. Пауза: Escape."
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
      Для игры нужен браузер с поддержкой Canvas.
    </canvas>
    {view === 'home' ? <section className="title-screen" aria-label="Главное меню">
      <div className="game-title"><h1><span>Saving</span>Survivors</h1></div>
      <nav className="main-menu" aria-label="Меню игры" onKeyDown={navigateMenu}>
        <button className="pixel-button primary" autoFocus onClick={begin}>ИГРАТЬ</button>
        <button className="pixel-button" onClick={() => setMenu('records')}>РЕКОРДЫ</button>
        <button className="pixel-button" onClick={() => setMenu('controls')}>УПРАВЛЕНИЕ</button>
        <a className="pixel-button" href={`${import.meta.env.BASE_URL}index.html`}>НА САЙТ</a>
      </nav>
      {record && <p className="menu-best">РЕКОРД <span>{format(record.score)}</span></p>}
      {notice && <p className="home-notice" role="status">{notice}</p>}
    </section> : <>
      <div className="xp-bar"><progress value={hud.xp} max={hud.nextXp} aria-label="Опыт до следующего уровня" /><span>УР. {hud.level}</span></div>
      <div className="game-hud">
        <div className="inventory" aria-label="Твои усиления">{UPGRADES.map(u => <div className={`inventory-slot ${hud.upgrades[u.id] ? 'equipped' : ''}`} key={u.id} title={`${u.name}: ${hud.upgrades[u.id]}`} aria-label={`${u.name}: уровень ${hud.upgrades[u.id]}`}>
          {hud.upgrades[u.id] > 0 && <><ItemIcon id={u.id} /><span>{hud.upgrades[u.id]}</span></>}
        </div>)}</div>
        <time className={`run-timer ${hud.time >= 150 ? 'danger' : ''}`} aria-label="Осталось времени">{clock(Math.ceil(DURATION - hud.time))}</time>
        <div className="hud-right"><span className="spark-score" aria-label={`${hud.score} искр`}><ItemIcon id="gem" />{format(hud.score)}</span><button className="pixel-button pause-button" onClick={pause} aria-label="Пауза"><span aria-hidden="true">Ⅱ</span></button></div>
      </div>
      <meter className="sr-only" min="0" max="100" value={hud.hp} aria-label="Здоровье" />
      {hud.time < 5 && <p className="start-hint"><span className="keyboard-hint">WASD / СТРЕЛКИ</span><span className="touch-hint">ДВИГАЙ ПАЛЬЦЕМ ПО ПОЛЮ</span></p>}
      {hud.time >= 150 && hud.time < 154 && <p className="wave-warning">ПОСЛЕДНЯЯ ВОЛНА</p>}
    </>}
    {menu === 'challenge' && challenge && <GameDialog state="challenge" title="Вызов друга" onCancel={dismissChallenge}>
      <h2>ТЕБЕ БРОСИЛИ ВЫЗОВ</h2>
      <p className="challenge-name">{challenge.name}</p>
      <div className="result-score"><ItemIcon id="gem" />{format(challenge.score)}</div>
      <p className="challenge-caption">Результат за {clock(challenge.time)}.<br />Собери больше искр в том же сценарии.</p>
      <button className="pixel-button primary" onClick={begin}>ПОБИТЬ РЕЗУЛЬТАТ</button>
      <button className="small-action" onClick={dismissChallenge}>ОБЫЧНАЯ ИГРА</button>
    </GameDialog>}
    {menu === 'records' && <GameDialog state="records" title="Рекорды недели" onCancel={() => setMenu(null)}>
      <h2>РЕКОРДЫ</h2><p className="menu-period">{period}</p>
      <ol className="ranking">{board.map(row => <li key={row.me ? 'me' : row.name} className={row.me ? 'my-row' : ''}><span className="rank">{String(row.rank).padStart(2, '0')}</span><span className="rank-name">{row.name}{row.me && <small>ТЫ</small>}</span><strong>{format(row.score)}</strong></li>)}</ol>
      <p className="demo-note">Демо: соперники вымышлены.<br />Твой рекорд — в этом браузере.</p>
      <button className="pixel-button primary" onClick={() => setMenu(null)}>НАЗАД</button>
    </GameDialog>}
    {menu === 'controls' && <GameDialog state="controls" title="Управление" onCancel={() => setMenu(null)}>
      <h2>УПРАВЛЕНИЕ</h2><dl className="controls-list"><div><dt>WASD / ← ↑ ↓ →</dt><dd>Движение</dd></div><div><dt>ПАЛЕЦ / МЫШЬ</dt><dd>Зажми и двигай</dd></div><div><dt>ESC / P</dt><dd>Пауза</dd></div></dl><p className="controls-rule">Атака — автоматически.<br />Собирай искры и выживи 3 минуты.</p>{audioControls}<button className="pixel-button primary" onClick={() => setMenu(null)}>НАЗАД</button>
    </GameDialog>}
    {view === 'game' && hud.status === 'upgrade' && <GameDialog state="upgrade" title="Новый уровень">
      <h2>НОВЫЙ УРОВЕНЬ!</h2>
      <div className="upgrade-options">{hud.choices.map((id, index) => { const u = UPGRADES.find(item => item.id === id); return <button autoFocus={index === 0} key={id} className="upgrade-card" onClick={() => upgrade(id)}>
        <ItemIcon id={id} /><span className="upgrade-copy"><strong>{u.name}</strong><span>{u.description}</span></span><span className="upgrade-level">{hud.upgrades[id] ? `УР. ${hud.upgrades[id] + 1}` : 'НОВОЕ'}</span>
      </button>; })}</div>
    </GameDialog>}
    {view === 'game' && hud.status === 'paused' && <GameDialog state="paused" title="Пауза" onCancel={resume}>
      <h2>ПАУЗА</h2><button className="pixel-button primary" autoFocus onClick={resume}>ПРОДОЛЖИТЬ</button><button className="pixel-button" onClick={begin}>ЗАНОВО</button><button className="pixel-button" onClick={home}>В МЕНЮ</button>{audioControls}
    </GameDialog>}
    {view === 'game' && ['won', 'lost'].includes(hud.status) && <GameDialog state="result" title="Результат забега">
      <h2 className={hud.status === 'won' ? 'victory' : 'game-over'}>{hud.status === 'won' ? 'ПОБЕДА!' : 'КОНЕЦ ИГРЫ'}</h2>
      <div className="result-trophy"><span className="result-snowman" aria-hidden="true" /><div className="result-score"><ItemIcon id="gem" />{format(hud.score)}</div></div>
      <p className="result-summary">{clock(hud.time)}<span>·</span>УРОВЕНЬ {hud.level}<span>·</span>ВРАГИ: {hud.kills}</p>
      {bestUpgrades.length > 0 && <div className="result-build" aria-label="Сильнейшие улучшения">{bestUpgrades.map(u => <span key={u.id} title={u.name} aria-label={`${u.name}: уровень ${hud.upgrades[u.id]}`}><ItemIcon id={u.id} /><b>{hud.upgrades[u.id]}</b></span>)}</div>}
      {challenge ? <p className="result-comparison"><span>{challenge.name}: {format(challenge.score)}</span><strong>{hud.score > challenge.score ? `Больше на ${format(hud.score - challenge.score)}!` : hud.score === challenge.score ? 'Ничья!' : `До победы: ${format(challenge.score - hud.score + 1)}`}</strong></p>
        : ownRow && <p className="result-ranking">{hud.score > previousBest.current ? 'НОВЫЙ РЕКОРД!' : `РЕКОРД ${format(record.score)}`}</p>}
      {sharePrimary && <button className="pixel-button primary" disabled={sharing} onClick={sendChallenge}>{challenge && hud.score > challenge.score ? 'ПОЗВАТЬ НА РЕВАНШ' : 'БРОСИТЬ ВЫЗОВ'}</button>}
      <button className={`pixel-button ${sharePrimary ? '' : 'primary'}`} onClick={begin}>ЕЩЁ РАЗ</button>
      {!sharePrimary && <button className="pixel-button" disabled={sharing} onClick={sendChallenge}>БРОСИТЬ ВЫЗОВ</button>}
      <button className="pixel-button" onClick={home}>В МЕНЮ</button>
      <details className="result-details"><summary>ИМЯ И ССЫЛКА</summary><form className="name-form" onSubmit={updateName}><label className="sr-only" htmlFor="player-name">Имя в вызове и таблице</label><input id="player-name" value={name} maxLength={20} onChange={e => setName(e.target.value)} autoComplete="nickname" /><button className="pixel-button" type="submit">ОК</button></form><button className="small-action" disabled={sharing} onClick={event => sendChallenge(event, true)}>СКОПИРОВАТЬ ВЫЗОВ</button></details>
      <p className="notice" role="status">{notice}</p>
      {manualShare && <label className="manual-share">Ссылка вызова<textarea readOnly value={manualShare} onFocus={e => e.target.select()} /></label>}
    </GameDialog>}
  </main>;
}
