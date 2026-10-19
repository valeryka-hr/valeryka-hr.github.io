/* Plum mesh — animated WebGL gradient for the hero.
   Written for this site after Scrolltide's "Plum Mesh" / "Indigo Mesh" look (deep plum → rose,
   grain/dither, dark enough to carry white type). Their shader prompt is paywalled, so this is
   an original domain-warped noise shader in the same spirit.
   Renders at reduced resolution, pauses offscreen / in background tabs, one static frame for
   prefers-reduced-motion, and silently falls back to the CSS gradient if WebGL is unavailable. */
(function () {
  const canvas = document.getElementById('mesh');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `
precision mediump float;
uniform vec2 r; uniform float t; uniform vec2 m;
vec3 hash3(vec2 p){vec3 q=vec3(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)),dot(p,vec2(419.2,371.9)));return fract(sin(q)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  float a=hash3(i).x,b=hash3(i+vec2(1,0)).x,c=hash3(i+vec2(0,1)).x,d=hash3(i+vec2(1,1)).x;
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r; vec2 p=uv; p.x*=r.x/r.y;
  float T=t*.035;
  vec2 q=vec2(fbm(p*1.4+T),fbm(p*1.4+vec2(5.2,1.3)-T));
  vec2 w=vec2(fbm(p*1.2+2.2*q+vec2(1.7,9.2)+T*1.3),fbm(p*1.2+2.2*q+vec2(8.3,2.8)-T));
  float f=fbm(p*1.1+2.6*w+(m-.5)*.25);
  vec3 c0=vec3(.071,.051,.094);  /* ground  #120d18 */
  vec3 c1=vec3(.227,.129,.282);  /* plum    #3a2148 */
  vec3 c2=vec3(.545,.376,.690);  /* violet  */
  vec3 c3=vec3(.725,.541,.663);  /* rose    #b98aa9 */
  vec3 c4=vec3(.616,.690,1.0);   /* blue, pointwise */
  vec3 col=mix(c0,c1,smoothstep(.15,.65,f));
  col=mix(col,c2,smoothstep(.55,.95,f*length(q))*.75);
  col=mix(col,c3,smoothstep(.62,.9,w.x)*.35);
  col=mix(col,c4,smoothstep(.78,.98,w.y*f)*.18);
  /* keep the copy side dark, let colour live behind the portrait */
  col*=mix(.55,1.15,smoothstep(.05,.85,uv.x));
  col*=mix(.6,1.,smoothstep(0.,.5,uv.y));
  /* grain / dither */
  float g=hash3(gl_FragCoord.xy+fract(t)*100.).x-.5;
  col+=g*.035;
  gl_FragColor=vec4(col,1.);
}`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return;
  const prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't'), uM = gl.getUniformLocation(prog, 'm');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCALE = 0.5; // render at half resolution — it's a soft gradient anyway
  let w = 0, h = 0, visible = true, raf = 0, start = performance.now();
  const mouse = [0.5, 0.5], target = [0.5, 0.5];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width * SCALE)); h = Math.max(1, Math.round(rect.height * SCALE));
    canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
    if (reduce) draw(12000);
  }
  function draw(ms) {
    mouse[0] += (target[0] - mouse[0]) * 0.03; mouse[1] += (target[1] - mouse[1]) * 0.03;
    gl.uniform2f(uR, w, h); gl.uniform1f(uT, ms / 1000); gl.uniform2f(uM, mouse[0], mouse[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function loop(now) { draw(now - start + 12000); raf = requestAnimationFrame(loop); }
  function play() { if (!raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(loop); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (e) => { target[0] = e.clientX / innerWidth; target[1] = 1 - e.clientY / innerHeight; }, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : play()));
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? play() : stop(); }).observe(canvas);

  resize(); draw(12000);
  canvas.classList.add('is-ready');
  play();
})();
