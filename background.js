/* Section-linked particle silhouettes, independently implemented for this portfolio.
   Section-specific silhouettes hold their form while the reader explores each topic.
   Visual reference: https://motion.dev/examples/js-three-tsl */
(() => {
  'use strict';
  let canvas = document.querySelector('#particle-background');
  const toggle = document.querySelector('#motion-toggle');
  if (!canvas || !toggle) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 700px)');
  const columns = small.matches ? 64 : 100;
  const rows = Math.round(columns * .66);
  const count = columns * rows;
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  let topics = window.createPortfolioShapes(count);
  if (!topics.length) return;
  let shapes = topics.map(topic => topic.points);
  let width = innerWidth, height = innerHeight, pixelRatio = 1;
  let paused = reduced.matches, hidden = document.hidden, videoOpen = false;
  let anchors = [], target = 0, progress = 0, time = 0, last = 0, raf = 0;
  let draw, ready = false, positioned = false, center = topics[0].center;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = x => x * x * (3 - 2 * x);
  for (let i=0;i<count;i++) {
    const t=(i*.61803398875)%1;
    colours.set([.48+t*.22,.76+t*.18,.78+t*.17],i*3);
  }

  function webglRenderer() {
    const gl = canvas.getContext('webgl', {alpha:true, antialias:false, depth:false, powerPreference:'low-power'});
    if (!gl) return null;
    function shader(type, source) {
      const value = gl.createShader(type); gl.shaderSource(value, source); gl.compileShader(value);
      if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error('Particle shader unavailable');
      return value;
    }
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `
      attribute vec3 point; attribute vec3 colour;
      uniform float aspect; uniform float size; uniform float rotation; uniform float center;
      varying vec3 tint; varying float depth;
      void main() {
        float turn = sin(rotation) * .09;
        float c = cos(turn), s = sin(turn);
        vec3 p = vec3(point.x * c + point.z * s, point.y, -point.x * s + point.z * c);
        float tilt = .04;
        p = vec3(p.x, p.y * cos(tilt) - p.z * sin(tilt), p.y * sin(tilt) + p.z * cos(tilt));
        float perspective = 3.8 / (3.8 - p.z);
        float scale = min(.85, aspect * 1.06);
        float offset = aspect > 1.1 ? center * 2. - 1. : 0.;
        gl_Position = vec4(p.x * scale * perspective / aspect + offset, p.y * scale * perspective + .02, 0., 1.);
        gl_PointSize = size * perspective;
        tint = colour; depth = clamp((p.z + 1.2) / 2.4, 0., 1.);
      }`));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
      precision mediump float; varying vec3 tint; varying float depth;
      void main() {
        float radius = length(gl_PointCoord - vec2(.5));
        float edge = 1. - smoothstep(.12, .5, radius);
        gl_FragColor = vec4(tint, edge * (.25 + depth * .48));
      }`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Particle program unavailable');
    gl.useProgram(program);
    function buffer(name, data, usage) {
      const value = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, value); gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      const attribute = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 0, 0);
      return value;
    }
    const pointBuffer = buffer('point', positions, gl.DYNAMIC_DRAW);
    const colourBuffer = buffer('colour', colours, gl.DYNAMIC_DRAW);
    const uniforms = Object.fromEntries(['aspect','size','rotation','center'].map(name => [name, gl.getUniformLocation(program,name)]));
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0,0,0,0);
    canvas.addEventListener('webglcontextlost', event => {event.preventDefault(); cancelAnimationFrame(raf); raf = 0; ready = false;});
    canvas.addEventListener('webglcontextrestored', () => { draw=webglRenderer()||canvasRenderer(); ready=true; renderStill(); start(); }, {once:true});
    canvas.dataset.renderer = 'webgl';
    return () => {
      gl.viewport(0,0,canvas.width,canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer); gl.bufferSubData(gl.ARRAY_BUFFER,0,positions);
      gl.bindBuffer(gl.ARRAY_BUFFER,colourBuffer); gl.bufferSubData(gl.ARRAY_BUFFER,0,colours);
      gl.uniform1f(uniforms.aspect,width/height); gl.uniform1f(uniforms.size,(small.matches ? 3.4 : 3.3)*pixelRatio);
      gl.uniform1f(uniforms.rotation,time*.22); gl.uniform1f(uniforms.center,center);
      gl.drawArrays(gl.POINTS,0,count);
    };
  }

  function canvasRenderer() {
    // Use a fresh canvas if a browser created a GPU context but could not compile it.
    let surface = canvas;
    let context = surface.getContext('2d');
    if (!context) {
      surface = canvas.cloneNode(); canvas.replaceWith(surface); canvas = surface; context = surface.getContext('2d');
    }
    if (!context) return () => {};
    surface.dataset.renderer = 'canvas';
    return () => {
      surface.width = canvas.width; surface.height = canvas.height;
      context.setTransform(pixelRatio,0,0,pixelRatio,0,0); context.clearRect(0,0,width,height);
      const rotation = Math.sin(time*.22)*.09, c = Math.cos(rotation), s = Math.sin(rotation);
      const scale = Math.min(height*.425,width*.53);
      for (let i=0;i<count;i+=3) {
        const o=i*3, x=positions[o]*c+positions[o+2]*s, z=-positions[o]*s+positions[o+2]*c;
        const perspective=3.8/(3.8-z), px=width*(width/height>1.1 ? center : .5)+x*scale*perspective, py=height*.5-positions[o+1]*scale*perspective;
        context.fillStyle=`rgba(${Math.round(colours[o]*255)},${Math.round(colours[o+1]*255)},${Math.round(colours[o+2]*255)},${.2+(z+1)*.13})`;
        context.fillRect(px,py,2*perspective,2*perspective);
      }
    };
  }

  function measure() {
    width=innerWidth; height=innerHeight; pixelRatio=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*pixelRatio); canvas.height=Math.round(height*pixelRatio);
    anchors=topics.map((topic,index) => index===0 ? 0 : Math.max(1,document.querySelector(topic.selector).getBoundingClientRect().top+scrollY-height*.42));
    onScroll(); renderStill();
  }
  function onScroll() {
    let index=0;
    while(index<anchors.length-1 && scrollY>=anchors[index+1]) index++;
    // Hold each complete silhouette; transition only near the next topic boundary.
    if(index===anchors.length-1) target=index;
    else {
      const distance=anchors[index+1]-anchors[index];
      const transition=Math.min(height*.32,distance*.35);
      target=index+ease(clamp((scrollY-(anchors[index+1]-transition))/Math.max(1,transition),0,1));
    }
    if(!positioned){progress=target;positioned=true;}
    if (!paused) start();
  }
  function interpolate() {
    const stage=clamp(progress,0,topics.length-1), from=Math.min(topics.length-2,Math.floor(stage));
    const blend=ease(stage-from), a=shapes[from], b=shapes[from+1];
    for(let i=0;i<positions.length;i++) positions[i]=a[i]+(b[i]-a[i])*blend;
    center=topics[from].center+(topics[from+1].center-topics[from].center)*blend;
    canvas.dataset.stage=stage.toFixed(2);
    canvas.dataset.shape=topics[Math.round(stage)].name;
  }
  function renderStill() {if(ready){interpolate();draw();}}
  function tick(now) {
    raf=0;
    if (hidden || videoOpen || paused || !ready) return;
    const elapsed=now-last;
    if(elapsed>=1000/30){
      const dt=Math.min(elapsed/1000,.06);last=now;time+=dt;
      progress+=(target-progress)*(1-Math.exp(-dt*7));
      interpolate();draw();
    }
    raf=requestAnimationFrame(tick);
  }
  function start() {if(ready && !paused && !hidden && !videoOpen && !raf){last=performance.now();raf=requestAnimationFrame(tick);}}
  function updateToggle() {
    toggle.textContent=paused?'Enable background motion':'Pause background motion';
    toggle.setAttribute('aria-pressed',String(paused));
    canvas.dataset.motion=paused?'paused':'playing';
  }
  toggle.addEventListener('click',()=>{paused=!paused;updateToggle();if(paused){cancelAnimationFrame(raf);raf=0;renderStill();}else start();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;updateToggle();if(paused){cancelAnimationFrame(raf);raf=0;renderStill();}else start();});
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){cancelAnimationFrame(raf);raf=0;}else start();});
  const dialog=document.querySelector('#video-dialog');
  new MutationObserver(()=>{videoOpen=dialog.open;if(videoOpen){cancelAnimationFrame(raf);raf=0;}else start();}).observe(dialog,{attributes:true,attributeFilter:['open']});
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',measure,{passive:true});
  new ResizeObserver(measure).observe(document.querySelector('main'));
  try {draw=webglRenderer()||canvasRenderer();} catch {draw=canvasRenderer();}
  ready=true;updateToggle();measure();start();
  document.fonts.ready.then(()=>{topics=window.createPortfolioShapes(count);shapes=topics.map(topic=>topic.points);renderStill();});
})();
