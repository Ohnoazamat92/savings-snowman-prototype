import fragmentSource from './snow.frag?raw';

import { snowTimeline } from './snowfall-timeline.js';

export function startSnowfall(canvas, origin, reduced, complete, started = () => {}) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) { complete(); return () => {}; }
  const shaders = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  let frame = 0;
  let stopped = false;
  function stop() {
    stopped = true;
    cancelAnimationFrame(frame);
    canvas.removeEventListener('webglcontextlost', lost);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
  }
  function lost(event) { event.preventDefault(); stop(); complete(); }
  canvas.addEventListener('webglcontextlost', lost);
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, 'attribute vec2 position; varying vec2 v_tex_coord; void main(){v_tex_coord=position*0.5+0.5;gl_Position=vec4(position,0.,1.);}'],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ]) {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(['resolution','origin','elapsed','reduced','opacity'].map(name =>
      [name, gl.getUniformLocation(program, `u_${name}`)]));
    gl.uniform2f(uniforms.origin, origin.x, 1 - origin.y);
    gl.uniform1f(uniforms.reduced, reduced ? 1 : 0);
    let start;
    function draw(now) {
      if (stopped) return;
      if (start === undefined) { start = now; started(); }
      const elapsed = (now - start) / 1000;
      const timeline = snowTimeline(elapsed, reduced);
      if (timeline.finished) { stop(); complete(); return; }
      // Снег мягкий: разрешения CSS достаточно, без дорогого Retina-буфера.
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(uniforms.resolution, width, height);
      gl.uniform1f(uniforms.elapsed, elapsed);
      gl.uniform1f(uniforms.opacity, timeline.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.dataset.elapsed = elapsed.toFixed(2);
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
  } catch (error) {
    console.error('Не удалось запустить снегопад', error);
    stop(); complete();
  }
  return stop;
}
