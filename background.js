/* Photo-coloured particles, independently implemented for this portfolio.
   Scroll morphs: image plane → globe → helix → torus → image plane → globe.
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
  const shapes = Array.from({length: 6}, () => new Float32Array(count * 3));
  let width = innerWidth, height = innerHeight, pixelRatio = 1;
  let paused = reduced.matches, hidden = document.hidden, videoOpen = false;
  let anchors = [], target = 0, progress = 0, time = 0, last = 0, raf = 0;
  let draw, ready = false;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = x => x * x * (3 - 2 * x);

  // Deterministic point correspondence makes forward and reverse scrolling continuous.
  for (let i = 0; i < count; i++) {
    const o = i * 3, u = (i % columns) / (columns - 1), v = Math.floor(i / columns) / (rows - 1);
    const longitude = i * 2.3999632297;
    const y = 1 - 2 * (i + .5) / count, ring = Math.sqrt(1 - y * y);
    shapes[0].set([(u - .5) * 2.55, (.5 - v) * 1.7, .08 * Math.sin(u * 10)], o);
    shapes[1].set([Math.cos(longitude) * ring, y, Math.sin(longitude) * ring], o);
    const angle = v * Math.PI * 7 + u * Math.PI * 2;
    const radius = .54 + .14 * Math.cos(u * Math.PI * 6);
    shapes[2].set([Math.cos(angle) * radius, (v - .5) * 2.4, Math.sin(angle) * radius], o);
    const a = u * Math.PI * 2, b = v * Math.PI * 2;
    const r = .73 + .29 * Math.cos(b);
    shapes[3].set([r * Math.cos(a), .29 * Math.sin(b), r * Math.sin(a)], o);
    shapes[4].set([(u - .5) * 2.55, (.5 - v) * 1.7, .12 * Math.cos(u * 8 + v * 5)], o);
    shapes[5].set([Math.cos(longitude) * ring, y, Math.sin(longitude) * ring], o);
    colours.set([.49 + u * .19, .72 + v * .15, .83 - u * .15], o);
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
      uniform float aspect; uniform float size; uniform float rotation; uniform float stage;
      varying vec3 tint; varying float depth;
      void main() {
        float turn = rotation + sin(stage * 1.5) * .22;
        float c = cos(turn), s = sin(turn);
        vec3 p = vec3(point.x * c + point.z * s, point.y, -point.x * s + point.z * c);
        float tilt = -.24 + sin(stage) * .25;
        p = vec3(p.x, p.y * cos(tilt) - p.z * sin(tilt), p.y * sin(tilt) + p.z * cos(tilt));
        float perspective = 3.8 / (3.8 - p.z);
        float scale = min(1.32, aspect * 1.12);
        float offset = aspect > 1.1 ? .42 * cos(stage * 1.3) : .15;
        gl_Position = vec4((p.x * scale * perspective + offset) / aspect, p.y * scale * perspective, 0., 1.);
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
    const uniforms = Object.fromEntries(['aspect','size','rotation','stage'].map(name => [name, gl.getUniformLocation(program,name)]));
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0,0,0,0);
    canvas.addEventListener('webglcontextlost', event => {event.preventDefault(); cancelAnimationFrame(raf); raf = 0; ready = false;});
    canvas.addEventListener('webglcontextrestored', () => { draw=webglRenderer()||canvasRenderer(); ready=true; renderStill(); start(); }, {once:true});
    canvas.dataset.renderer = 'webgl';
    return () => {
      gl.viewport(0,0,canvas.width,canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer); gl.bufferSubData(gl.ARRAY_BUFFER,0,positions);
      gl.bindBuffer(gl.ARRAY_BUFFER,colourBuffer); gl.bufferSubData(gl.ARRAY_BUFFER,0,colours);
      gl.uniform1f(uniforms.aspect,width/height); gl.uniform1f(uniforms.size,(small.matches ? 3.4 : 3.3)*pixelRatio);
      gl.uniform1f(uniforms.rotation,paused ? .18 : time*.045); gl.uniform1f(uniforms.stage,progress);
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
      const rotation = paused ? .18 : time*.045, c = Math.cos(rotation), s = Math.sin(rotation);
      const scale = Math.min(height*.6,width*.58);
      for (let i=0;i<count;i+=3) {
        const o=i*3, x=positions[o]*c+positions[o+2]*s, z=-positions[o]*s+positions[o+2]*c;
        const perspective=3.8/(3.8-z), px=width*.56+x*scale*perspective, py=height*.5-positions[o+1]*scale*perspective;
        context.fillStyle=`rgba(${Math.round(colours[o]*255)},${Math.round(colours[o+1]*255)},${Math.round(colours[o+2]*255)},${.2+(z+1)*.13})`;
        context.fillRect(px,py,2*perspective,2*perspective);
      }
    };
  }

  function sampleImage() {
    const image = new Image(); image.src = 'assets/lab.jpg';
    image.onload = () => {
      const sample = document.createElement('canvas'); sample.width=columns; sample.height=rows;
      const context=sample.getContext('2d',{willReadFrequently:true});
      if (!context) return;
      context.drawImage(image,0,0,columns,rows);
      const pixels=context.getImageData(0,0,columns,rows).data;
      for (let i=0;i<count;i++) {
        // A restrained cyan/mint tint keeps the sampled laboratory image cohesive.
        colours[i*3]=.24+pixels[i*4]/255*.57;
        colours[i*3+1]=.39+pixels[i*4+1]/255*.55;
        colours[i*3+2]=.46+pixels[i*4+2]/255*.49;
      }
      renderStill();
    };
  }

  function measure() {
    width=innerWidth; height=innerHeight; pixelRatio=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*pixelRatio); canvas.height=Math.round(height*pixelRatio);
    anchors=[0,...['#research','#projects','#videos','#about','.contact'].map(selector => {
      const node=document.querySelector(selector);
      return Math.max(1,node.getBoundingClientRect().top+scrollY-height*.22);
    })];
    onScroll(); renderStill();
  }
  function onScroll() {
    let index=0;
    while(index<anchors.length-2 && scrollY>anchors[index+1]) index++;
    const fraction=clamp((scrollY-anchors[index])/Math.max(1,anchors[index+1]-anchors[index]),0,1);
    target=index+ease(fraction);
    if (!paused) start();
  }
  function interpolate() {
    const stage=paused ? 1 : progress, from=Math.min(4,Math.floor(stage)), amount=stage-from;
    const blend=ease(amount), a=shapes[from], b=shapes[from+1];
    for(let i=0;i<positions.length;i++) positions[i]=a[i]+(b[i]-a[i])*blend;
    canvas.dataset.stage=stage.toFixed(2);
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
  ready=true;updateToggle();measure();sampleImage();start();
})();
