import { Navigation } from './Navigation.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { colors, readSaved, readShared, shareUrl, monthlyAmount } from './wishes.js';
import { TreeExplorer, Ball } from './TreeExplorer.jsx';
import { demoWishes, branchPositions, wishesOnBranch, freePlaces, findFreeBranch, personalWishes, wishNoun } from './tree-scale.js';

const money = value => new Intl.NumberFormat('ru-RU').format(value);
const empty = { name: '', wish: '', color: 'gold' };

export function App() {
  const [saved, setSaved] = useState(() => { try { return readSaved(window.localStorage); } catch { return []; } });
  const [shared, setShared] = useState(() => readShared(location.hash));
  const [step, setStep] = useState('intro');
  const [view, setView] = useState(() => readShared(location.hash) ? 'branch' : 'overview');
  const [branch, setBranch] = useState(() => readShared(location.hash)?.branch ?? 0);
  const [draft, setDraft] = useState(empty);
  const [active, setActive] = useState(() => readShared(location.hash));
  const [slot, setSlot] = useState(12);
  const [modal, setModal] = useState(() => readShared(location.hash) ? 'wish' : null);
  const [notice, setNotice] = useState(() => location.hash && !readShared(location.hash) ? 'Не удалось открыть желание по этой ссылке. Вы можете создать своё.' : '');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState([]);
  const [amount, setAmount] = useState('120000');
  const [months, setMonths] = useState('12');
  const dialog = useRef(null);
  const title = useRef(null);
  const shareInput = useRef(null);
  const initialized = useRef(false);
  const all = wishesOnBranch(branch, saved, shared);
  const available = freePlaces(branch, saved, shared);
  const total = demoWishes.length + personalWishes(saved, shared).length;
  const mine = saved.at(-1);
  const link = active ? shareUrl(active, location.href) : '';

  useEffect(() => {
    if (modal && !dialog.current.open) dialog.current.showModal();
    if (!modal && dialog.current.open) dialog.current.close();
  }, [modal]);

  useEffect(() => {
    if (initialized.current) title.current?.focus();
    initialized.current = true;
  }, [step]);

  useEffect(() => {
    const handleHash = () => {
      const wish = readShared(location.hash);
      setNotice('');
      setShared(wish);
      if (wish) { setBranch(wish.branch ?? 0); setView('branch'); setActive(wish); setModal('wish'); }
      else setModal(null);
    };
    addEventListener('hashchange', handleHash);
    return () => removeEventListener('hashchange', handleHash);
  }, []);

  function explore(nextBranch) {
    setBranch(nextBranch); setView('branch');
    if (step === 'done') setStep('intro');
    const free = freePlaces(nextBranch, saved, shared);
    setSlot(free[0] ?? 16);
  }

  function overview() {
    setView('overview');
    if (step === 'done') setStep('intro');
  }

  function start(near) {
    setModal(null); setError(''); setNotice('');
    const requestedBranch = near?.branch ?? branch;
    const nextBranch = findFreeBranch(requestedBranch, saved, shared);
    if (nextBranch === null) { setNotice('На этой ёлке пока нет свободных мест.'); return; }
    const free = freePlaces(nextBranch, saved, shared);
    const nearSlot = near?.displaySlot ?? near?.slot;
    const nextSlot = nearSlot == null ? free[0] : [...free].sort((a, b) =>
      Math.hypot(...branchPositions[a].map((v, i) => v - branchPositions[nearSlot][i])) - Math.hypot(...branchPositions[b].map((v, i) => v - branchPositions[nearSlot][i])))[0];
    if (nextBranch !== requestedBranch) setNotice('Эта ветка заполнена. Нашли место на соседней.');
    setBranch(nextBranch); setView('branch'); setSlot(nextSlot); setDraft(empty); setStep('create');
  }

  function next(event) {
    event.preventDefault();
    if (!draft.wish.trim()) { setError('Напишите, на что хотите накопить.'); return; }
    if (!draft.name.trim()) { setError('Укажите имя или псевдоним.'); return; }
    setDraft({ ...draft, wish: draft.wish.trim(), name: draft.name.trim() });
    setError(''); setView('branch'); setStep('place');
  }

  function place() {
    if (!available.includes(slot)) { setNotice('Выберите свободное место или соседнюю ветку.'); return; }
    const wish = { ...draft, id: crypto.randomUUID(), slot, branch };
    const nextSaved = [...saved, wish];
    try { localStorage.setItem('wish-tree-v1', JSON.stringify(nextSaved)); }
    catch { setNotice('Игрушка появилась, но браузер не смог её сохранить. Скопируйте ссылку, чтобы не потерять желание.'); }
    setSaved(nextSaved); setActive(wish); setView('branch'); setStep('done');
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); setNotice('Ссылка скопирована'); }
    catch { shareInput.current?.focus(); shareInput.current?.select(); setNotice('Выделили ссылку. Скопируйте её вручную.'); }
  }

  function showWish(wish) { setActive(wish); setNotice(''); setModal('wish'); }

  return <div className="wish-app">
    <Navigation />
    <main id="skip-link-anchor" className={`main step-${step} ${view === 'branch' ? 'branch-layout' : ''}`}>
      <section className="story" aria-labelledby="main-title">
        {step === 'intro' && view === 'overview' && <>
          <h1 id="main-title" ref={title} tabIndex="-1">У каждого <br />желания есть <br /><span>своё место</span></h1>
          <p className="lead">Пусть то, на что вы мечтаете накопить,<br className="desktop-break" /> станет игрушкой на нашей общей ёлке.</p>
          <button className="primary large" onClick={() => start()}>Повесить желание</button>
        </>}
        {step === 'intro' && view === 'branch' && <>
          <h1 id="main-title" ref={title} tabIndex="-1" className="form-heading">Большие планы. <br />Совсем рядом.</h1>
          <p className="lead">Откройте игрушку и прочитайте чьё-то желание. Или найдите место для своего.</p>
          <button className="primary full desktop-branch-action" onClick={() => start()}>Повесить своё рядом</button>
          <div className="branch-context"><strong>{money(total)}</strong><span>{wishNoun(total)} на всей ёлке</span><p>Сейчас вы видите ветку {branch + 1}.<br />Соседние — совсем близко.</p></div>
        </>}
        {step === 'create' && <>
          <button className="back" onClick={() => setStep('intro')}>К ёлке</button>
          <p className="step-label">Шаг 1 из 2 · Ваше желание</p>
          <h1 id="main-title" ref={title} tabIndex="-1" className="form-heading">О чём вы мечтаете?</h1>
          <form onSubmit={next} noValidate>
            <label className="field-label" htmlFor="wish">Хочу накопить на</label>
            <textarea id="wish" maxLength="80" rows="2" placeholder="Например, путешествие к океану" value={draft.wish} aria-describedby={error ? 'form-error' : undefined} onChange={e => setDraft({ ...draft, wish: e.target.value })} />
            <div className="suggestions">{['Путешествие', 'Свой дом', 'Любимое дело'].map(text => <button type="button" key={text} onClick={() => setDraft({ ...draft, wish: text })}>{text}</button>)}</div>
            <label className="field-label" htmlFor="name">Как вас подписать</label>
            <input id="name" maxLength="24" autoComplete="nickname" placeholder="Имя или псевдоним" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            <fieldset className="colors"><legend>Цвет игрушки</legend>{colors.map(c => <label key={c.id} title={c.label}><input type="radio" name="color" value={c.id} checked={draft.color === c.id} onChange={() => setDraft({ ...draft, color: c.id })} /><span style={{ background: c.hex }} /><span className="sr-only">{c.label}</span></label>)}</fieldset>
            <p className="privacy">Имя и желание будут видны тем, кому вы отправите ссылку. Не добавляйте личные данные.</p>
            {error && <p className="error" id="form-error" role="alert">{error}</p>}
            <button className="primary full" type="submit">Выбрать место на ёлке</button>
          </form>
        </>}
        {step === 'place' && <>
          <button className="back" onClick={() => setStep('create')}>Изменить желание</button>
          <p className="step-label">Шаг 2 из 2 · Место на ёлке</p>
          <h1 id="main-title" ref={title} tabIndex="-1" className="form-heading">Какая ветка <br />будет вашей?</h1>
          <p className="lead">Выберите место с плюсом.<br />Можно перейти на соседнюю ветку.</p>
          <div className="wish-preview"><Ball color={draft.color} /><div><span>{draft.name}</span><p>{draft.wish}</p></div></div>
          <label className="field-label" htmlFor="branch">Место на ветке {branch + 1}</label>
          <select id="branch" value={slot} onChange={e => setSlot(Number(e.target.value))}>{available.map(i => <option key={i} value={i}>Место {i + 1}</option>)}</select>
          <button className="primary full" onClick={place} disabled={!available.includes(slot)}>Повесить сюда</button>
        </>}
        {step === 'done' && mine && <>
          <p className="step-label">Теперь это и ваша ёлка</p>
          <h1 id="main-title" ref={title} tabIndex="-1" className="form-heading">Уже на шаг <br />ближе к мечте</h1>
          <p className="lead">Ваше желание — на ёлке.<br />Позовите близкого повесить своё рядом.</p>
          <div className="wish-preview"><Ball color={mine.color} /><div><span>{mine.name}</span><p>{mine.wish}</p></div></div>
          <button className="primary full" onClick={() => { setActive(mine); setNotice(''); setModal('share'); }}>Пригласить на свою ветку</button>
          <button className="secondary full" onClick={() => { setActive(mine); setModal('plan'); }}>Прикинуть, как накопить</button>
          <button className="back" onClick={() => setStep('intro')}>Посмотреть другие желания</button>
        </>}
        {notice && !modal && <p className="notice" role="status">{notice}</p>}
      </section>
      <TreeExplorer view={view} branch={branch} step={step} saved={saved} shared={shared}
        wishes={all} available={available} slot={slot} draft={draft} mine={mine}
        onExplore={explore} onOverview={overview} onWish={showWish} onSlot={setSlot}
        onPlace={place} onStart={() => start()} />
    </main>
    <dialog ref={dialog} onCancel={() => setModal(null)} onClick={e => { if (e.target === dialog.current) setModal(null); }} aria-labelledby="dialog-title">
      <div className="dialog-content">
        <button className="close" aria-label="Закрыть" onClick={() => setModal(null)}>×</button>
        {modal === 'wish' && active && <>
          <Ball color={active.color} className="modal-ball" />
          <p className="step-label">{active.name} мечтает · ветка {(active.branch ?? 0) + 1}</p>
          <h2 id="dialog-title">{active.wish}</h2>
          <p className="modal-description">У каждого желания есть начало.<br />Пусть у этого всё получится.</p>
          <button className="secondary full" aria-pressed={supported.includes(active.id)} onClick={() => setSupported(supported.includes(active.id) ? supported.filter(id => id !== active.id) : [...supported, active.id])}>{supported.includes(active.id) ? 'Вы поддержали это желание' : 'Пусть сбудется'}</button>
          <button className="primary full" onClick={() => start(active)}>Повесить своё рядом</button>
          {saved.some(w => w.id === active.id) && <button className="back" onClick={() => { setNotice(''); setModal('share'); }}>Поделиться своей игрушкой</button>}
        </>}
        {modal === 'share' && <>
          <Ball color={active?.color} className="modal-ball" />
          <h2 id="dialog-title">На вашей ветке<br />есть место для близких</h2>
          <p className="modal-description">Ссылка откроет вашу игрушку. Друг сможет прочитать желание и повесить своё рядом.</p>
          <label className="field-label" htmlFor="share-link">Ссылка на желание</label>
          <input id="share-link" ref={shareInput} readOnly value={link} onFocus={e => e.target.select()} />
          <button className="primary full" onClick={copy}>Скопировать ссылку</button>
          <p className="privacy">В локальном прототипе ссылка работает на этом компьютере. Для отправки друзьям нужна публикация сайта.</p>
        </>}
        {modal === 'plan' && <>
          <p className="step-label">От желания к плану</p>
          <h2 id="dialog-title">Мечта начинается<br />с небольшой суммы</h2>
          <p className="modal-description">{active?.wish}</p>
          <label className="field-label" htmlFor="amount">Сколько нужно накопить, ₽</label>
          <input id="amount" type="number" min="1" max="100000000" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
          <label className="field-label" htmlFor="months">За сколько месяцев</label>
          <select id="months" value={months} onChange={e => setMonths(e.target.value)}>{[3, 6, 12, 18, 24, 36].map(n => <option key={n} value={n}>{n}</option>)}</select>
          <div className="plan-result" aria-live="polite">{Number(amount) > 0 && Number(amount) <= 100000000 ? <><strong>{money(monthlyAmount(Number(amount), Number(months)))} ₽</strong><span>откладывать каждый месяц</span></> : <span>Укажите сумму от 1 до 100 000 000 ₽</span>}</div>
          <p className="privacy">Простой расчёт без учёта процентов. Счёт не открывается, деньги не списываются.</p>
          <a className="primary full" href={`${import.meta.env.BASE_URL}#choose-product`}>Посмотреть накопления</a>
        </>}
        {notice && <p className="notice" role="status">{notice}</p>}
      </div>
    </dialog>
  </div>;
}

