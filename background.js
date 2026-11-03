/* SITL photograph pixels morph into section-linked silhouettes.
   Section-specific silhouettes hold their form while the reader explores each topic.
   Visual reference: https://motion.dev/examples/js-three-tsl */
(() => {
  'use strict';
  let canvas = document.querySelector('#particle-background');
  const toggle = document.querySelector('#motion-toggle');
  const photo = document.querySelector('#sitl-background');
  if (!canvas || !toggle) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 700px)');
  const columns = small.matches ? 64 : 140;
  const rows = small.matches ? 96 : 88;
  const count = columns * rows;
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const photoPositions = new Float32Array(count * 3);
  let photoAmount = 1, imageOpacity = 1;
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
      attribute vec3 point; attribute vec3 colour; attribute vec3 photoPoint;
      uniform float aspect; uniform float size; uniform float rotation; uniform float center;
      uniform float photoAmount; uniform float pixelSize;
      varying vec3 tint; varying float depth; varying float imageMix;
      void main() {
        float turn = sin(rotation) * .09 * (1. - photoAmount);
        float c = cos(turn), s = sin(turn);
        vec3 p = vec3(point.x * c + point.z * s, point.y, -point.x * s + point.z * c);
        float tilt = .04;
        p = vec3(p.x, p.y * cos(tilt) - p.z * sin(tilt), p.y * sin(tilt) + p.z * cos(tilt));
        float perspective = 3.8 / (3.8 - p.z);
        float scale = min(.85, aspect * 1.06);
        float offset = aspect > 1.1 ? center * 2. - 1. : 0.;
        vec2 silhouette = vec2(p.x * scale * perspective / aspect + offset, p.y * scale * perspective + .02);
        float morph = 1. - photoAmount;
        vec2 flow = vec2(sin(photoPoint.y * 13. + photoPoint.x * 7.), cos(photoPoint.x * 11. - photoPoint.y * 5.));
        vec2 position = mix(photoPoint.xy, silhouette, morph) + flow * sin(morph * 3.14159265) * .09;
        gl_Position = vec4(position, 0., 1.);
        gl_PointSize = mix(size * perspective, pixelSize, photoAmount);
        tint = colour * mix(2.8, 1., photoAmount);
        depth = clamp((p.z + 1.2) / 2.4, 0., 1.); imageMix = photoAmount;
      }`));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
      precision mediump float; varying vec3 tint; varying float depth; varying float imageMix;
      void main() {
        float radius = length(gl_PointCoord - vec2(.5));
        float edge = mix(1. - smoothstep(.12, .5, radius), 1., imageMix);
        gl_FragColor = vec4(tint, edge * mix(.67 + depth * .25, 1., imageMix));
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
    const photoBuffer = buffer('photoPoint', photoPositions, gl.DYNAMIC_DRAW);
    const uniforms = Object.fromEntries(['aspect','size','rotation','center','photoAmount','pixelSize'].map(name => [name, gl.getUniformLocation(program,name)]));
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0,0,0,0);
    canvas.addEventListener('webglcontextlost', event => {event.preventDefault(); cancelAnimationFrame(raf); raf = 0; ready = false;});
    canvas.addEventListener('webglcontextrestored', () => { draw=webglRenderer()||canvasRenderer(); ready=true; renderStill(); start(); }, {once:true});
    canvas.dataset.renderer = 'webgl';
    return () => {
      gl.viewport(0,0,canvas.width,canvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer); gl.bufferSubData(gl.ARRAY_BUFFER,0,positions);
      gl.bindBuffer(gl.ARRAY_BUFFER,colourBuffer); gl.bufferSubData(gl.ARRAY_BUFFER,0,colours);
      gl.bindBuffer(gl.ARRAY_BUFFER,photoBuffer); gl.bufferSubData(gl.ARRAY_BUFFER,0,photoPositions);
      gl.uniform1f(uniforms.photoAmount,photoAmount); gl.uniform1f(uniforms.pixelSize,Math.max(width/columns,height/rows)*pixelRatio*1.05);
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
      const rotation = Math.sin(time*.22)*.09*(1-photoAmount), c = Math.cos(rotation), s = Math.sin(rotation);
      const scale = Math.min(height*.425,width*.53);
      for (let i=0;i<count;i+=(photoAmount>.05 ? 1 : 2)) {
        const o=i*3, x=positions[o]*c+positions[o+2]*s, z=-positions[o]*s+positions[o+2]*c;
        const perspective=3.8/(3.8-z), shapeX=width*(width/height>1.1 ? center : .5)+x*scale*perspective, shapeY=height*.49-positions[o+1]*scale*perspective;
        const imageX=(photoPositions[o]+1)*width*.5, imageY=(1-photoPositions[o+1])*height*.5;
        const px=shapeX*(1-photoAmount)+imageX*photoAmount, py=shapeY*(1-photoAmount)+imageY*photoAmount;
        const size=2.7*perspective*(1-photoAmount)+Math.max(width/columns,height/rows)*1.05*photoAmount;
        const brightness=2.8-1.8*photoAmount;
        context.fillStyle=`rgba(${Math.round(Math.min(1,colours[o]*brightness)*255)},${Math.round(Math.min(1,colours[o+1]*brightness)*255)},${Math.round(Math.min(1,colours[o+2]*brightness)*255)},${.65+.35*photoAmount})`;
        context.fillRect(px-size/2,py-size/2,size,size);
      }
    };
  }

  function samplePhoto() {
    if(!photo || !photo.complete || !photo.naturalWidth) return;
    const sample=document.createElement('canvas');sample.width=columns;sample.height=rows;
    const context=sample.getContext('2d',{willReadFrequently:true});if(!context) return;
    // Match the cover crop of the full-resolution background exactly at every viewport.
    const cover=Math.max(width/photo.naturalWidth,height/photo.naturalHeight);
    const cropWidth=width/cover,cropHeight=height/cover;
    context.drawImage(photo,(photo.naturalWidth-cropWidth)/2,(photo.naturalHeight-cropHeight)/2,cropWidth,cropHeight,0,0,columns,rows);
    const pixels=context.getImageData(0,0,columns,rows).data;
    for(let i=0;i<count;i++) {
      colours.set([pixels[i*4]/255,pixels[i*4+1]/255,pixels[i*4+2]/255],i*3);
      photoPositions.set([((i%columns)+.5)/columns*2-1,1-(Math.floor(i/columns)+.5)/rows*2,0],i*3);
    }
    canvas.dataset.source='sitl-photo';canvas.dataset.pixelCount=String(count);renderStill();
  }

  function measure() {
    width=innerWidth; height=innerHeight; pixelRatio=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*pixelRatio); canvas.height=Math.round(height*pixelRatio);
    anchors=topics.map((topic,index) => index===0 ? 0 : Math.max(1,document.querySelector(topic.selector).getBoundingClientRect().top+scrollY-height*.42));
    samplePhoto(); onScroll(); renderStill();
  }
  function onScroll() {
    let index=0;
    while(index<anchors.length-1 && scrollY>=anchors[index+1]) index++;
    // Hold each complete silhouette; transition only near the next topic boundary.
    if(index===0) target=ease(clamp(scrollY/Math.max(1,anchors[1]),0,1));
    else if(index===anchors.length-1) target=index;
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
    photoAmount=1-ease(clamp(stage,0,1));
    imageOpacity=1-ease(clamp(stage/.2,0,1));
    for(let i=0;i<positions.length;i++) positions[i]=stage<1 ? shapes[1][i] : a[i]+(b[i]-a[i])*blend;
    center=stage<1 ? topics[1].center : topics[from].center+(topics[from+1].center-topics[from].center)*blend;
    if(photo) photo.style.opacity=imageOpacity.toFixed(3);
    canvas.style.opacity=(.9*(1-imageOpacity)).toFixed(3);
    canvas.dataset.photoAmount=photoAmount.toFixed(3);
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
  if(photo) photo.addEventListener("load",samplePhoto);
  ready=true;updateToggle();measure();start();
  document.fonts.ready.then(()=>{topics=window.createPortfolioShapes(count);shapes=topics.map(topic=>topic.points);renderStill();});
})();
