const SETTINGS_KEY = 'sphere-audio';
export function readAudioSettings(storage) {
  let value;
  try { value = JSON.parse(storage?.getItem(SETTINGS_KEY)); } catch { /* Настройки необязательны. */ }
  const volume = (key, fallback) => Number.isFinite(value?.[key]) ? Math.max(0, Math.min(1, value[key])) : fallback;
  return { music: volume('music', 0.45), effects: volume('effects', 0.6), muted: value?.muted === true };
}

// Наблюдаем за существующей моделью, не вмешиваясь в физику и её генератор случайности.
export function createSoundObserver() {
  let previous, collected = 0, status, boss = false, seen = new WeakSet();
  return game => {
    if (game !== previous) {
      previous = game; collected = game.collected; status = game.status; boss = game.bossSpawned; seen = new WeakSet();
      for (const item of [...game.shots, ...game.effects]) seen.add(item);
      return [];
    }
    const events = new Set();
    for (const shot of game.shots) if (!seen.has(shot)) { seen.add(shot); events.add('shot'); }
    for (const effect of game.effects) if (!seen.has(effect)) { seen.add(effect); events.add(effect.kind); }
    if (game.collected > collected) events.add('collect');
    if (game.bossSpawned && !boss) events.add('boss');
    if (game.status !== status && ['upgrade', 'won', 'lost'].includes(game.status)) events.add(game.status);
    collected = game.collected; status = game.status; boss = game.bossSpawned;
    return [...events];
  };
}

export function createGameAudio(baseURL, settings, onError = () => {}) {
  // В файле конец сведён с началом; нативный loop повторяет его весь забег.
  const music = new Audio(`${baseURL}assets/sphere-game/audio/frost-battle-loop.mp3`);
  music.preload = 'auto'; music.loop = true;
  music.onerror = () => onError('Музыка не загрузилась. Обнови страницу, чтобы попробовать снова.');
  const observe = createSoundObserver(), voices = new Set(), lastSound = new Map();
  let context, bus, disposed = false, playing = false, mode, unlocked = false;

  function stopEffects() {
    for (const voice of voices) { voice.stop(); voice.disconnect(); }
    voices.clear(); lastSound.clear();
  }
  function applySettings(next) {
    settings = next;
    music.volume = next.music;
    music.muted = next.muted;
    if (bus) bus.gain.value = next.muted ? 0 : next.effects * 0.22;
    if (next.muted || next.effects === 0) stopEffects();
  }
  function prepare() {
    if (disposed) return;
    unlocked = true;
    try {
      if (!context) {
        context = new AudioContext(); bus = context.createGain(); bus.connect(context.destination); applySettings(settings);
      }
      void context.resume().catch(() => {});
    } catch { /* Музыка работает и без синтезатора эффектов. */ }
    if (playing) playMusic();
  }
  function playMusic() {
    if (!unlocked || disposed || !playing) return;
    void music.play().catch(error => {
      if (playing && error.name !== 'AbortError') onError('Музыка не запустилась. Нажми «Продолжить» ещё раз.');
    });
  }
  function tone(frequency, duration, type = 'sine', delay = 0, end = frequency, volume = 1) {
    if (voices.size >= 24) return;
    const oscillator = context.createOscillator(), gain = context.createGain(), at = context.currentTime + delay;
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(end, at + duration);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    oscillator.connect(gain).connect(bus); voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at); oscillator.stop(at + duration + 0.01);
  }
  function effect(name) {
    if (disposed || settings.muted || !settings.effects || context?.state !== 'running') return;
    const now = context.currentTime, interval = name === 'pop' || name === 'chain' ? 0.12 : 0.065;
    if (now - (lastSound.get(name) ?? -Infinity) < interval) return;
    lastSound.set(name, now);
    if (name === 'shot') tone(720, 0.075, 'triangle', 0, 210, 0.38);
    if (name === 'pop') tone(180, 0.09, 'triangle', 0, 55, 0.5);
    if (name === 'chain') { tone(1500, 0.12, 'sawtooth', 0, 130, 0.12); tone(950, 0.1, 'triangle', 0.025, 220, 0.25); }
    if (name === 'collect') { tone(1175, 0.1, 'sine', 0, 1175, 0.45); tone(1760, 0.13, 'sine', 0.045, 1760, 0.25); }
    if (name === 'hurt') { tone(110, 0.22, 'sawtooth', 0, 38, 0.32); tone(66, 0.2, 'sine', 0, 33, 0.6); }
    const melody = {
      upgrade: [587, 740, 880, 1175], select: [880, 1175],
      won: [587, 740, 880, 1175, 1109, 1175], lost: [294, 277, 220, 147], boss: [147, 147, 139, 139],
    }[name];
    melody?.forEach((note, i) => tone(note, name === 'select' ? 0.12 : 0.35, 'triangle', i * 0.115, note, 0.6));
  }
  function update(game, active = true) {
    const nextMode = active ? game.status : 'home';
    if (mode !== nextMode) {
      mode = nextMode; playing = mode === 'playing' || mode === 'upgrade';
      if (playing) playMusic(); else { music.pause(); stopEffects(); }
    }
    const events = observe(game);
    if (active) for (const name of events) effect(name);
  }
  applySettings(settings);
  return {
    prepare, update, effect,
    begin(game) { music.pause(); music.currentTime = 0; mode = null; stopEffects(); prepare(); update(game); },
    settings: applySettings,
    silence() { playing = false; mode = null; music.pause(); stopEffects(); },
    dispose() {
      disposed = true; playing = false; music.onerror = null; music.pause(); music.removeAttribute('src'); music.load();
      stopEffects(); void context?.close().catch(() => {});
    },
  };
}

export function saveAudioSettings(storage, settings) {
  try { storage?.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Без хранилища настройки действуют до закрытия. */ }
}
