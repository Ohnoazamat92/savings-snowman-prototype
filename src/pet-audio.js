// Один контекст создаётся только внутри пользовательского нажатия.
export function createPetAudio(baseURL) {
  const sources = new Set();
  const buffers = new Map();
  const controller = new AbortController();
  let context;
  let muted = false;
  let generation = 0;
  let disposed = false;
  const files = Object.fromEntries(['tap', 'sleigh-bells'].map(name => [name,
    fetch(`${baseURL}assets/audio/${name}.wav`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Audio unavailable'); return response.arrayBuffer(); })
      .catch(() => null),
  ]));

  function stop() {
    generation++;
    for (const source of sources) { source.stop(); source.disconnect(); }
    sources.clear();
  }

  function unlock() {
    if (disposed || muted) return Promise.resolve(false);
    try {
      context ??= new AudioContext();
      return context.resume().then(() => context.state === 'running').catch(() => false);
    } catch { return Promise.resolve(false); }
  }

  async function play(name, delay, volume, ready) {
    const token = generation;
    const requested = performance.now();
    if (disposed || muted || !await ready || token !== generation) return;
    try {
      if (!buffers.has(name)) {
        const data = await files[name];
        if (!data || disposed || token !== generation) return;
        buffers.set(name, await context.decodeAudioData(data.slice(0)));
      }
      // Не проигрывать запоздалый звук после отмены, ухода в фон или загрузки.
      const elapsed = (performance.now() - requested) / 1000;
      if (disposed || muted || token !== generation || context.state !== 'running' || elapsed > delay + 0.3) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffers.get(name);
      gain.gain.value = volume;
      source.connect(gain).connect(context.destination);
      source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); };
      sources.add(source);
      source.start(context.currentTime + Math.max(0, delay - elapsed));
    } catch { /* Ошибка звука не должна останавливать эмоцию. */ }
  }

  return {
    tap() { const ready = unlock(); void play('tap', 0, 0.416, ready); },
    snow(reduced) { void play('sleigh-bells', reduced ? 0 : 0.7, 0.52, Promise.resolve(context?.state === 'running')); },
    setMuted(value) { muted = value; if (muted) stop(); },
    stop,
    dispose() { disposed = true; stop(); controller.abort(); void context?.close().catch(() => {}); },
  };
}
