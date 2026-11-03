/* Original vector silhouettes sampled into stable point clouds for each topic. */
window.createPortfolioShapes = (count) => {
  const surface = document.createElement('canvas');
  surface.width = surface.height = 512;
  const ctx = surface.getContext('2d', {willReadFrequently:true});
  if (!ctx) return [];
  const path = data => ctx.stroke(new Path2D(data));
  const ellipse = (x,y,rx,ry) => {ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.stroke();};
  const line = (x,y,a,b) => {ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.stroke();};
  const rounded = (x,y,w,h,r) => {ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.stroke();};
  const definitions = [
    {name:'brain', selector:'#home', center:.73, draw(){
      // Bilateral cerebral outline, folds, and brain stem.
      const hemisphere=()=>{
        path('M250 362 C229 392 183 383 171 355 C130 364 102 340 108 309 C70 295 65 254 91 230 C67 198 86 160 119 153 C110 121 135 92 166 98 C183 66 225 70 250 98 Z');
        path('M167 99 C155 125 174 149 192 155 M119 154 C141 147 161 164 162 186 M91 231 C121 213 146 231 151 253 M108 308 C138 311 151 294 149 279 M171 355 C162 324 193 303 210 316 M213 111 C197 132 211 151 231 159 M187 203 C217 186 239 209 222 233 M173 264 C190 249 218 264 218 287 M188 350 C211 361 232 342 237 325');
      };
      hemisphere();ctx.save();ctx.translate(512,0);ctx.scale(-1,1);hemisphere();ctx.restore();
      path('M238 378 L238 422 Q256 439 274 422 L274 378');
    }},
    {name:'video-model', selector:'#research', center:.73, draw(){
      // An isometric volume of video tokens, matching the foundation-model theme.
      path('M104 176 L306 176 L408 94 L206 94 Z M104 176 L104 382 L306 382 L408 300 L408 94 M306 176 L306 382');
      for(let n=1;n<5;n++){
        const t=n/5;
        line(104+t*202,176,104+t*202,382);line(104,176+t*206,306,176+t*206);
        line(104+t*202,176,206+t*202,94);line(104+t*102,176-t*82,306+t*102,176-t*82);
        line(306+t*102,176-t*82,306+t*102,382-t*82);line(306,176+t*206,408,94+t*206);
      }
    }},
    {name:'sensory-glove', selector:'#projects', center:.76, draw(){
      path('M188 431 L182 362 C158 340 131 311 109 278 C95 256 104 237 121 237 C134 237 152 261 170 276 L170 140 C170 111 205 111 205 140 L205 239 L211 95 C212 67 246 67 247 97 L247 229 L255 82 C257 55 290 60 289 89 L287 234 L301 117 C305 90 336 95 334 124 L320 269 L337 197 C343 173 373 181 367 206 L341 326 C338 348 324 364 314 379 L311 431 Z');
      rounded(190,392,120,35,6);
      ellipse(248,304,33,30);
      line(205,242,227,283);line(249,233,249,274);line(287,237,268,283);
      ellipse(205,239,8,8);ellipse(248,231,8,8);ellipse(286,236,8,8);
    }},
    {name:'surgical-instruments', selector:'#projects .project-row.reverse', center:.25, draw(){
      // Two opposing laparoscopic shafts with open jaws above a tissue boundary.
      path('M96 83 L126 66 L251 278 L226 293 Z M383 66 L414 82 L288 295 L262 280 Z');
      ellipse(238,292,14,14);ellipse(274,292,14,14);
      path('M230 304 L217 341 L236 365 M246 303 L260 334 L252 356 M266 305 L252 341 L268 367 M283 303 L300 336 L289 359');
      path('M76 417 C119 378 168 395 205 391 C248 386 270 406 309 387 C358 365 400 384 438 412');
      path('M83 443 C142 416 170 433 217 426 C263 420 301 442 349 419 C387 402 416 421 432 434');
      line(105,111,131,97);line(376,96,403,112);
    }},
    {name:'surgical-dataset', selector:'#projects .crcd-row', center:.75, draw(){
      // Database cylinders connect synchronized video and kinematic records.
      ellipse(256,130,139,49);
      path('M117 130 L117 366 C117 432 395 432 395 366 L395 130');
      for(const y of [208,287,366]) path(`M117 ${y} C117 ${y+66} 395 ${y+66} 395 ${y}`);
      for(const y of [203,282,361]) {ellipse(155,y,5,5);line(182,y,227,y);line(248,y,304,y);}
    }},
    {name:'video-library', selector:'#videos', center:.62, draw(){
      rounded(80,124,352,264,20);
      path('M221 188 L221 324 L330 256 Z');
      for(const x of [107,160,213,266,319,372]) {rounded(x,139,23,17,3);rounded(x,356,23,17,3);}
      line(80,170,432,170);line(80,342,432,342);
    }},
    {name:'contact', selector:'.contact', center:.73, draw(){
      rounded(80,145,352,235,18);
      path('M84 156 L256 283 L428 156 M84 372 L211 255 M428 372 L301 255');
      path('M310 100 L394 100 M367 73 L395 100 L367 127');
    }}
  ];
  return definitions.map((definition,stage) => {
    ctx.clearRect(0,0,512,512);ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineWidth=5;
    ctx.lineCap='round';ctx.lineJoin='round';definition.draw();
    const mask=ctx.getImageData(0,0,512,512).data, samples=[];
    for(let y=40;y<472;y+=2) for(let x=40;x<472;x+=2) if(mask[(y*512+x)*4+3]>90) samples.push([x,y]);
    const points=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      // The same low-discrepancy sequence covers each outline without clumping.
      const index=Math.floor(((i*.61803398875)%1)*samples.length), sample=samples[index]||[256,256];
      const jitter=((i*.754877666)%1)-.5;
      points.set([(sample[0]-256+jitter*1.8)/205,(256-sample[1]+jitter*1.8)/205,Math.sin(i*12.9898+stage)*.035],i*3);
    }
    return {...definition,points};
  });
};
