import { useEffect, useRef, useState } from 'react';
import { startSnowfall } from './snowfall';
import { createPetAudio } from './pet-audio';

const reactions = [
  { name: 'wave', label: 'Приветствие', duration: 4000 },
  { name: 'idle', label: 'Моргание', duration: 3000 },
  { name: 'jump', label: 'Прыжок', duration: 3000 },
  { name: 'scarf', label: 'Поправляет шарф', duration: 3000 },
  { name: 'dance-v2', label: 'Танец', duration: 4000 },
  { name: 'wave', label: 'Снегопад', duration: 4000, snow: true },
];

function Snow({ scene }) {
  const canvas = useRef(null);
  useEffect(() => startSnowfall(canvas.current, scene.origin, scene.reduced, scene.complete, scene.started), [scene]);
  return <canvas ref={canvas} className="snowfall" aria-hidden="true" />;
}

export function Snowman() {
  const button = useRef(null);
  const audio = useRef(null);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('snowman-muted') === 'true'; } catch { return false; }
  });
  const runtime = useRef({ token: 0, next: 0, mode: null, timer: 0, url: null, blobs: new Map() });
  const [clip, setClip] = useState(null);
  const [snow, setSnow] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  function clear() {
    const r = runtime.current;
    r.token++;
    r.mode = null;
    clearTimeout(r.timer);
    audio.current?.stop();
    if (r.url) URL.revokeObjectURL(r.url);
    r.url = null;
  }

  function finish(token) {
    if (runtime.current.token !== token) return;
    clear();
    setClip(null);
    setSnow(null);
    setBusy(false);
    setStatus('');
  }

  useEffect(() => {
    const sound = createPetAudio(import.meta.env.BASE_URL);
    sound.setMuted(muted);
    audio.current = sound;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const cancel = () => finish(runtime.current.token);
    const hidden = () => { if (document.hidden) cancel(); };
    preference.addEventListener('change', cancel);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      clear();
      sound.dispose();
      preference.removeEventListener('change', cancel);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);

  function beginSnow(token, reduced) {
    const rect = button.current.getBoundingClientRect();
    setSnow({
      origin: { x: (rect.x + rect.width / 2) / innerWidth, y: (rect.y + rect.height / 3) / innerHeight },
      reduced,
      started: () => { if (runtime.current.token === token) audio.current?.snow(reduced); },
      complete: () => finish(token),
    });
  }

  async function play(mode) {
    const r = runtime.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (r.mode === 'tap' || (mode === 'hover' && (r.mode || reduced))) return;
    // Тап прерывает только фоновое моргание. Повторные тапы не создают очередь.
    clear();
    setClip(null);
    const token = r.token;
    r.mode = mode;
    const reaction = mode === 'hover' ? reactions[1] : reactions[r.next];
    setBusy(mode === 'tap');
    if (mode === 'tap') audio.current?.tap();

    if (reduced) {
      r.next = (r.next + 1) % reactions.length;
      setStatus(reaction.label);
      if (reaction.snow) beginSnow(token, true);
      else r.timer = setTimeout(() => finish(token), 300);
      return;
    }

    try {
      let blob = r.blobs.get(reaction.name);
      if (!blob) {
        const response = await fetch(`${import.meta.env.BASE_URL}assets/pet/${reaction.name}.webp`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        blob = await response.blob();
        r.blobs.set(reaction.name, blob);
      }
      if (token !== r.token) return;
      r.url = URL.createObjectURL(blob);
      setClip({ ...reaction, url: r.url, token, mode, ready: false });
    } catch (error) {
      if (token !== r.token) return;
      console.error('Не удалось загрузить эмоцию снеговичка', error);
      finish(token);
      setStatus('Не удалось загрузить эмоцию. Нажмите ещё раз.');
    }
  }

  function loaded() {
    const r = runtime.current;
    if (!clip || clip.ready || clip.token !== r.token) return;
    setClip({ ...clip, ready: true });
    if (clip.mode === 'tap') {
      r.next = (r.next + 1) % reactions.length;
      setStatus(clip.label);
    }
    if (clip.snow) beginSnow(clip.token, false);
    r.timer = setTimeout(() => {
      if (clip.token !== r.token) return;
      if (clip.snow) setClip(null);
      else finish(clip.token);
    }, clip.duration);
  }

  return <>
    {snow && <Snow scene={snow} />}
    <button ref={button} type="button" className="snowman-pet"
      aria-label="Снеговичок: показать следующую эмоцию" aria-busy={busy}
      data-clip={clip?.name ?? 'poster'} data-mode={runtime.current.mode ?? 'rest'}
      onClick={() => play('tap')}
      onPointerEnter={event => {
        if (event.pointerType === 'mouse' && matchMedia('(hover: hover) and (pointer: fine)').matches) play('hover');
      }}>
      <img className="snowman-poster" src={`${import.meta.env.BASE_URL}assets/pet/poster.png`} alt="" draggable="false"
        style={{ visibility: clip?.ready ? 'hidden' : 'visible' }} />
      {clip && <img key={clip.token} className="snowman-clip" src={clip.url} alt="" draggable="false"
        style={{ visibility: clip.ready ? 'visible' : 'hidden' }} onLoad={loaded}
        onError={() => { finish(clip.token); setStatus('Не удалось открыть эмоцию. Нажмите ещё раз.'); }} />}
    </button>
    <button type="button" className="snowman-sound" aria-label="Выключить звук"
      aria-pressed={muted} title={muted ? 'Включить звук' : 'Выключить звук'}
      onClick={() => {
        const next = !muted;
        audio.current?.setMuted(next);
        setMuted(next);
        try { localStorage.setItem('snowman-muted', String(next)); } catch { /* Выбор действует до перезагрузки. */ }
      }}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></>}
      </svg>
    </button>
    <span className="snowman-status" role="status">{status}</span>
  </>;
}
