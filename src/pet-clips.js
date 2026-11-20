export function createPetClips(baseURL) {
  const requests = new Map();
  const controller = new AbortController();
  function load(name) {
    if (controller.signal.aborted) return Promise.reject(new DOMException('Disposed', 'AbortError'));
    if (!requests.has(name)) {
      const request = fetch(`${baseURL}assets/pet/${name}.webp?v=2`, { signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.blob();
        })
        .catch(error => { requests.delete(name); throw error; });
      requests.set(name, request);
    }
    return requests.get(name);
  }
  return {
    load,
    preload: name => load(name).catch(() => {}),
    dispose() { controller.abort(); requests.clear(); },
  };
}
