// 器物解剖 · fx.js —— 本项目自己写：画在器物里的 WebGL 光效（发热、火焰、蒸汽、灯光、水面、火花）
// 相机、射线、噪声这些 GLSL 来自 gl.js（改自 wheresryan22/anatomy 的 kit/gl-shared.mjs，MIT）；做法照上游 references/webgl.md 的规矩：
//   世界坐标、和零件同一个相机（光效贴在零件的平面上，推拉镜头时跟着走）；强度都骑在包络上（不突然出现或消失）；
//   每一项在任何边界之前就降到 0（画布四边读出来是 0）；tonemap 加抖动；深色主题发光用 screen 叠加，浅色主题按“纸上要看到的颜色”反解墨。
//
// 用法：在分场里，画完被光效盖住的零件之后、画盖住光效的零件之前调用：
//   fx('flame', t, P, {base:[x,y,z], r:6, len:60, power: env(t, t0, t1)})
// 每个光效自己按世界尺寸算出屏幕上的范围，只在那一块画（离屏 WebGL 画布），画完贴回主画布。没有 WebGL 时画一个简化的二维替身。
(() => {
const A = PACK.anatomy, K = A.K, GL = A.GL;
const COMMON = `
uniform float uLight;
float edgeFade(){vec2 f=gl_FragCoord.xy;float d=min(min(f.x,f.y),min(uCanvas.x-f.x,uCanvas.y-f.y));return smoothstep(1.,6.,d);}
vec3 heatCol(float e){e=clamp(e,0.,1.);vec3 a=vec3(.42,.05,.02),b=vec3(.92,.30,.04),c=vec3(1.,.70,.12),d=vec3(1.,.95,.80);
  return e<.34?mix(a,b,e/.34):e<.68?mix(b,c,(e-.34)/.34):mix(c,d,(e-.68)/.32);}
vec4 glowDark(vec3 c){c=tonemap(c,1.15);float a=max(c.r,max(c.g,c.b));return vec4(c,a);}
vec4 inkFor(vec3 seen,float cover){vec3 ab=1.-clamp(seen,0.,1.);float a=max(max(ab.r,max(ab.g,ab.b)),cover);return vec4(vec3(a)-ab,a);}
vec4 heatInk(float e){e=clamp(e,0.,1.3);vec3 seen=mix(vec3(1.),vec3(.95,.42,.08),smoothstep(.02,.32,e));
  seen=mix(seen,vec3(1.,.74,.16),smoothstep(.35,.62,e));seen=mix(seen,vec3(1.,.94,.80),smoothstep(.7,.98,e));
  return inkFor(seen,.9*smoothstep(.65,.98,e));}
vec4 over(vec4 top,vec4 under){return top+under*(1.-top.a);}
vec4 dith(vec4 c){float n=(hash12(gl_FragCoord.xy+fract(uTime*.61)*91.)+hash12(gl_FragCoord.yx*1.37+fract(uTime*.37)*57.)-1.)/255.;
  c+=vec4(n)*smoothstep(0.,1.5/255.,c.a);c=max(c,0.);c.rgb=min(c.rgb,vec3(c.a));return c;}
float sdRound(vec2 p,vec4 plan,float r){vec2 c=plan.xy+plan.zw*.5;vec2 q=abs(p-c)-plan.zw*.5+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
`;

/* ---------- 六种光效：每种给 GLSL、要传的 uniform、世界里的范围、发光还是遮盖（决定深色主题怎么叠） ---------- */
const EFFECTS = {
  // 发热的面：一块圆盘（加热片、烙铁头、炉口）在高度 z 的水平面上发光，外圈一层光晕；plan 限制光晕只落在台面上
  glow: { emissive: true, uniforms: ['uC', 'uR', 'uHeat', 'uPlan', 'uPlanR'],
    bounds: o => { const r = o.r * 2.6; return [[o.at[0] - r, o.at[1] - r, o.at[2]], [o.at[0] + r, o.at[1] + r, o.at[2]]] },
    values: o => ({ uC: o.at, uR: o.r, uHeat: o.heat ?? 1, uPlan: o.plan ? [o.plan.x, o.plan.y, o.plan.w, o.plan.d] : [0, 0, 0, 0], uPlanR: o.plan ? o.plan.r || 0 : 0 }),
    glsl: `uniform vec3 uC;uniform float uR,uHeat,uPlanR;uniform vec4 uPlan;
void main(){vec2 vb=viewOf(gl_FragCoord.xy);float px=pixelOf()/uCam.z;vec3 p=onFloor(vb,uC.z);float r=length(p.xy-uC.xy);
  float disc=1.-smoothstep(uR-.7*px,uR+.7*px,r);float on=uPlan.z>0.?1.-smoothstep(-.7*px,.7*px,sdRound(p.xy,uPlan,uPlanR)):1.;
  float grain=.88+.24*noise2(p.xy/uR*3.+uTime*.3);
  float halo=exp(-pow(r/(uR*1.7),2.))*on*(1.-smoothstep(uR*2.,uR*2.55,r));
  if(uPlan.z<=0.)halo*=mix(1.,1.-smoothstep(uR*1.05,uR*1.35,r),uLight);   // 浅色主题：没给台面就不让光晕飘到半空（纸上的光晕像污渍）
  float e=uHeat*(disc*grain*.95+halo*.38);
  vec4 c=mix(glowDark(heatCol(e)*e*1.7),heatInk(e),uLight);gl_FragColor=dith(c*edgeFade());}` },
  // 火焰或喷流：从 base 沿竖直方向（dir 1 向上，-1 向下）的一团体积，半径 r 往外张开，长 len；power 0..1
  flame: { emissive: true, uniforms: ['uBase', 'uDir', 'uR', 'uLen', 'uPow'],
    bounds: o => { const d = o.dir ?? 1, r = o.r * 2.6, z1 = o.base[2] + d * o.len; return [[o.base[0] - r, o.base[1] - r, Math.min(o.base[2], z1)], [o.base[0] + r, o.base[1] + r, Math.max(o.base[2], z1)]] },
    values: o => ({ uBase: o.base, uDir: o.dir ?? 1, uR: o.r, uLen: o.len, uPow: o.power ?? 1 }),
    glsl: `uniform vec3 uBase;uniform float uDir,uR,uLen,uPow;
void main(){vec2 vb=viewOf(gl_FragCoord.xy);vec3 V=towardViewer();vec3 p0=rayOf(vb);vec3 Ax=vec3(0.,0.,uDir);
  vec3 C=uBase+Ax*uLen*.5;float tc=dot(C-p0,V);float hl=sqrt(uLen*uLen*.25+uR*uR*7.);
  float e=0.;const int N=28;float dt=2.*hl/float(N);float j=hash12(gl_FragCoord.xy+fract(uTime*.37)*41.);
  for(int i=0;i<N;i++){float t=tc-hl+(float(i)+j)*dt;vec3 p=p0+t*V;float s=dot(p-uBase,Ax)/uLen;vec2 q=(p-uBase).xy;
    float sc=clamp(s,0.,1.);float R=uR*(.55+1.35*pow(sc,.7));
    float turb=fbm3(vec3(q/uR*1.3,s*3.2-uTime*2.4));
    float w=smoothstep(-.04,.06,s)*(1.-smoothstep(.62,1.,s));
    float d=exp(-dot(q,q)/(R*R)*2.2*(.75+.5*turb))*w;
    e+=d*(.3+.95*pow(1.-sc,1.3))*(.8+.4*turb);}
  e*=dt/(uR*1.772)*uCam.w*uPow*1.7;
  vec4 c=mix(glowDark(heatCol(e*.8)*e*1.8),heatInk(e*1.05),uLight);gl_FragColor=dith(c*edgeFade());}` },
  // 蒸汽、烟：从 base 往上冒的一柱，越高越散、越淡；drift 是顶上被吹偏多少（世界单位）；density 0..1
  steam: { emissive: false, uniforms: ['uBase', 'uR', 'uRise', 'uDens', 'uDrift'],
    bounds: o => { const r = o.r * 3.6, dr = o.drift || [0, 0]; return [[o.base[0] - r + Math.min(0, dr[0]), o.base[1] - r + Math.min(0, dr[1]), o.base[2]], [o.base[0] + r + Math.max(0, dr[0]), o.base[1] + r + Math.max(0, dr[1]), o.base[2] + o.rise]] },
    values: o => ({ uBase: o.base, uR: o.r, uRise: o.rise, uDens: o.density ?? 1, uDrift: o.drift || [0, 0] }),
    glsl: `uniform vec3 uBase;uniform float uR,uRise,uDens;uniform vec2 uDrift;
void main(){vec2 vb=viewOf(gl_FragCoord.xy);vec3 V=towardViewer();vec3 p0=rayOf(vb);
  vec3 C=uBase+vec3(uDrift*.5,uRise*.5);float tc=dot(C-p0,V);float hl=sqrt(uRise*uRise*.25+uR*uR*12.)+length(uDrift)*.5;
  float dens=0.,crown=0.;const int N=24;float dt=2.*hl/float(N);float j=hash12(gl_FragCoord.xy+fract(uTime*.29)*37.);
  for(int i=0;i<N;i++){float t=tc-hl+(float(i)+j)*dt;vec3 p=p0+t*V;float s=(p.z-uBase.z)/uRise;float sc=clamp(s,0.,1.);
    vec2 q=p.xy-uBase.xy-uDrift*sc;float R=uR*(1.+2.3*sc);
    float n=fbm3(vec3(q/uR*.8,s*2.4-uTime*.7));
    float d=exp(-dot(q,q)/(R*R)*1.5)*smoothstep(-.03,.08,s)*(1.-smoothstep(.45,1.,s))*(.25+n)/(1.+1.6*sc);
    dens+=d;crown+=d*sc;}
  float g=dt/(uR*1.772)*uDens*mix(2.6,4.2,uLight);float hi=crown/max(dens,1e-4);dens*=g;float a=1.-exp(-dens);
  vec3 lightCol=mix(vec3(.66,.70,.76),vec3(.95,.955,.965),clamp(hi*1.6,0.,1.));vec3 darkCol=mix(vec3(.55,.58,.62),vec3(.86,.88,.9),clamp(hi*1.6,0.,1.));
  vec3 col=mix(darkCol,lightCol,uLight);gl_FragColor=dith(vec4(col*a,a)*edgeFade());}` },
  // 灯光落在台面上：灯在 at（世界坐标），照到高度 z 的平面上，一圈光斑（半径 r）；warm 0 冷白、1 暖黄；深色主题另有一道淡淡的光柱
  lamp: { emissive: true, uniforms: ['uLamp', 'uZ', 'uR', 'uPow', 'uWarm', 'uPlan', 'uPlanR'],
    bounds: o => { const r = o.r * 2.4; return [[o.at[0] - r, o.at[1] - r, o.z], [o.at[0] + r, o.at[1] + r, o.at[2]]] },
    values: o => ({ uLamp: o.at, uZ: o.z, uR: o.r, uPow: o.power ?? 1, uWarm: o.warm ?? .6, uPlan: o.plan ? [o.plan.x, o.plan.y, o.plan.w, o.plan.d] : [0, 0, 0, 0], uPlanR: o.plan ? o.plan.r || 0 : 0 }),
    glsl: `uniform vec3 uLamp;uniform float uZ,uR,uPow,uWarm,uPlanR;uniform vec4 uPlan;
void main(){vec2 vb=viewOf(gl_FragCoord.xy);float px=pixelOf()/uCam.z;vec3 p=onFloor(vb,uZ);float d=length(p.xy-uLamp.xy);float h=max(uLamp.z-uZ,1.);
  float on=uPlan.z>0.?1.-smoothstep(-.7*px,.7*px,sdRound(p.xy,uPlan,uPlanR)):1.;
  float pool=uPow*exp(-d*d/(uR*uR))*(h*h/(h*h+d*d))*on*(1.-smoothstep(uR*1.9,uR*2.3,d));
  vec3 warm=mix(vec3(1.,.97,.92),vec3(1.,.80,.50),uWarm);
  vec2 a=project(uLamp),b=project(vec3(uLamp.xy,uZ));vec2 ab=b-a;float k=clamp(dot(vb-a,ab)/dot(ab,ab),0.,1.);
  float rad=mix(uR*.12,uR*.9,k)*uK;float beam=uPow*.1*exp(-pow(length(vb-a-ab*k)/rad,2.))*smoothstep(0.,.15,k)*(1.-smoothstep(.85,1.,k));
  vec4 dark=glowDark(warm*(pool*.85+beam));
  vec4 light=inkFor(mix(vec3(1.),mix(vec3(1.),warm,.55)*vec3(1.,.97,.88),min(pool,1.)*.6),0.);
  gl_FragColor=dith(mix(dark,light,uLight)*edgeFade());}` },
  // 水面：plan 里、高度 z 的一池水，src 里每个点（最多 4 个）是一个振源，一圈圈波纹；freq 每秒几次、wave 波长（世界单位）、amp 波高
  water: { emissive: false, uniforms: ['uPlan', 'uPlanR', 'uZ', 'uAmp', 'uKw', 'uW', 'uDamp', 'uPow', 'uSrc', 'uNS'],
    bounds: o => [[o.plan.x, o.plan.y, o.z], [o.plan.x + o.plan.w, o.plan.y + o.plan.d, o.z]],
    values: o => { const src = (o.src || []).slice(0, 4), arr = new Float32Array(16); src.forEach((s, i) => arr.set([s[0], s[1], s[2] || 0, 1], i * 4));
      return { uPlan: [o.plan.x, o.plan.y, o.plan.w, o.plan.d], uPlanR: o.plan.r || 0, uZ: o.z, uAmp: o.amp ?? 1, uKw: 2 * Math.PI / (o.wave || 12), uW: 2 * Math.PI * (o.freq ?? 1.2), uDamp: o.damp ?? .012, uPow: o.power ?? 1, uSrc: arr, uNS: src.length } },
    glsl: `uniform vec4 uPlan;uniform float uPlanR,uZ,uAmp,uKw,uW,uDamp,uPow,uNS;uniform vec4 uSrc[4];
void main(){vec2 vb=viewOf(gl_FragCoord.xy);float px=pixelOf()/uCam.z;vec3 p=onFloor(vb,uZ);
  float sd=sdRound(p.xy,uPlan,uPlanR);float inside=1.-smoothstep(-px*1.2,-px*.2,sd);
  float h=0.;vec2 gr=vec2(0.);float fine=smoothstep(3.,6.,(6.2832/uKw)/px);
  for(int i=0;i<4;i++){if(float(i)>=uNS)break;vec4 s=uSrc[i];vec2 dv=p.xy-s.xy;float r=max(length(dv),1e-3);
    float a=uAmp*exp(-r*uDamp)/sqrt(1.+r*.15)*fine;float ph=uKw*r-uW*uTime+s.z;
    h+=a*sin(ph);gr+=a*uKw*cos(ph)*dv/r;}
  vec3 n=normalize(vec3(-gr,1.));vec3 L=lightDir();vec3 Vv=towardViewer();
  float lam=dot(n,L)-dot(vec3(0.,0.,1.),L);float spec=pow(max(dot(reflect(-L,n),Vv),0.),48.);float foc=max(-h*uKw*uKw*.6,0.);
  vec3 darkC=vec3(.10,.26,.42)*(.7+lam*3.)+vec3(.85,.93,1.)*(spec*1.4+foc*.5);float da=clamp(.42+spec+foc*.4+abs(lam)*.8,0.,.95);
  vec4 dark=vec4(darkC*da,da);
  vec3 seen=mix(vec3(.88,.92,.95),vec3(.99,.995,1.),clamp(lam*4.+spec,0.,1.));seen=mix(seen,vec3(.60,.70,.80),clamp(-lam*4.,0.,1.));
  vec4 light=inkFor(seen,.18);
  gl_FragColor=dith(mix(dark,light,uLight)*inside*uPow*edgeFade());}` },
  // 火花：从 at 喷出的一串小亮点，按真实的抛物线飞、拖一小截尾巴、越老越暗越红；算在 JS 里，每帧最多 24 颗
  sparks: { emissive: true, uniforms: ['uS', 'uA', 'uNS'],
    bounds: o => { const r = (o.speed ?? 120) * (o.life ?? .8) * 1.1; return [[o.at[0] - r, o.at[1] - r, o.at[2] - r], [o.at[0] + r, o.at[1] + r, o.at[2] + r * .8]] },
    values: () => ({}),
    glsl: `uniform vec4 uS[24];uniform float uA[24];uniform float uNS;
void main(){vec2 vb=viewOf(gl_FragCoord.xy);float pw=uView.x/uCanvas.x;vec3 dark=vec3(0.);vec4 ink=vec4(0.);
  for(int i=0;i<24;i++){if(float(i)>=uNS)break;vec4 s=uS[i];vec2 a=s.zw,b=s.xy,ab=b-a;float L2=max(dot(ab,ab),1e-6);float k=clamp(dot(vb-a,ab)/L2,0.,1.);
    float d=length(vb-a-ab*k);float w=max(1.6*pw,1.2);float core=1.-smoothstep(w*.5,w*1.3,d);float u=uA[i];float heat=1.-u;float e=core*mix(.35,1.,k)*heat;
    dark+=heatCol(.4+.6*heat*k)*e*1.8;
    vec3 seen=mix(vec3(.42,.07,.02),vec3(1.,.55,.10),k*heat);ink=over(inkFor(mix(vec3(1.),seen,min(e*1.6,1.)),0.)*min(1.,e*1.8),ink);}
  gl_FragColor=dith(mix(glowDark(dark),ink,uLight)*edgeFade());}` },
};
// 火花的位置：确定的抛物线（同一个 t 画两遍一样）。at 喷口，t0..t1 喷的时间，rate 每秒几颗，life 每颗活多久，speed 初速，dir 主方向，spread 散开（0..1），gravity 重力（世界单位/秒²），floor 落地就灭
function sparkList(t, P, o) {
  const { at, t0 = 0, t1 = Infinity, rate = 30, life = .8, speed = 120, dir = [0, 0, 1], spread = .6, gravity = -360, seed = 1, floor = 0 } = o;   // floor：落到这个高度就灭（缺省 0，底座顶面）
  const out = [], first = Math.max(0, Math.floor((t - life - t0) * rate)), last = Math.floor((Math.min(t, t1) - t0) * rate);
  const h = (i, k) => { const x = Math.sin((i + seed * 31.7) * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x) };
  for (let i = Math.max(first, last - 23); i <= last; i++) {
    const tb = t0 + i / rate, age = t - tb, lf = life * (.7 + .5 * h(i, 3)); if (age < 0 || age > lf) continue;
    const v = [dir[0] + spread * (h(i, 0) * 2 - 1), dir[1] + spread * (h(i, 1) * 2 - 1), dir[2] + spread * (h(i, 2) * 2 - 1)], n = Math.hypot(...v) || 1, sp = speed * (.6 + .6 * h(i, 4));
    const pos = (s) => [at[0] + v[0] / n * sp * s, at[1] + v[1] / n * sp * s, at[2] + v[2] / n * sp * s + .5 * gravity * s * s];
    const ph = pos(age); if (ph[2] < floor) continue;
    const pt = pos(Math.max(0, age - .045)); if (pt[2] < floor) pt[2] = floor;
    out.push({ head: K.iso(ph, P), tail: K.iso(pt, P), u: age / lf });
  }
  return out;
}

/* ---------- 离屏画布：每种光效一张，按这一帧在屏幕上的范围定大小 ---------- */
const LAYERS = new Map();
let NOGL = false;
function layerOf(name) {
  if (LAYERS.has(name)) return LAYERS.get(name);
  const fx = EFFECTS[name], canvas = document.createElement('canvas');
  const layer = NOGL ? null : GL.glLayer({ canvas, fragment: COMMON + fx.glsl, view: [1, 1], camera: { origin: [0, 0], k: 1, cam: [0, 1, .5, .87] }, uniforms: [...fx.uniforms, 'uLight'], extensions: ['GL_OES_standard_derivatives'], sized: true, preserve: true });
  if (!layer) NOGL = true;
  const L = { canvas, layer }; LAYERS.set(name, L); return L;
}
// 世界范围 → 屏幕上的框（再和当前的画框求交）
function screenBox(P, b, pad, X) {
  const pts = [];
  for (const x of [b[0][0], b[1][0]]) for (const y of [b[0][1], b[1][1]]) for (const z of [b[0][2], b[1][2]]) pts.push(K.iso([x, y, z], P));
  let x0 = Math.min(...pts.map(p => p[0])) - pad, y0 = Math.min(...pts.map(p => p[1])) - pad, x1 = Math.max(...pts.map(p => p[0])) + pad, y1 = Math.max(...pts.map(p => p[1])) + pad;
  const c = A.box || [0, 0, W, H];
  x0 = Math.max(x0, c[0]); y0 = Math.max(y0, c[1]); x1 = Math.min(x1, c[0] + c[2]); y1 = Math.min(y1, c[1] + c[3]);
  return x1 - x0 < 2 || y1 - y0 < 2 ? null : [Math.floor(x0), Math.floor(y0), Math.ceil(x1 - x0), Math.ceil(y1 - y0)];
}
/* fx(名字, t, P, 参数, {blend, ctx})：画一个光效。blend 不给时：发光的在深色主题用 screen（只加亮），其余正常叠加；浅色主题一律正常叠加 */
function fx(name, t, P, o = {}, { blend } = {}) {
  const def = EFFECTS[name]; if (!def) { console.error('anatomy.fx：没有这个光效', name, Object.keys(EFFECTS)); return }
  const X = A.brush(), m = X.getTransform(), ratio = Math.min(4, Math.max(1, Math.sqrt(Math.abs(m.a * m.d - m.b * m.c))));
  const box = screenBox(P, def.bounds(o), 24, X); if (!box) return;
  const light = TH && TH.light ? 1 : 0, mode = blend || (def.emissive && !light ? 'screen' : 'source-over');
  const L = layerOf(name);
  if (!L.layer) return fallback(name, t, P, o, X, mode);
  const cw = Math.max(1, Math.round(box[2] * ratio)), ch = Math.max(1, Math.round(box[3] * ratio));
  if (L.canvas.width !== cw) L.canvas.width = cw; if (L.canvas.height !== ch) L.canvas.height = ch;
  const cam = GL.glCamera(P), vals = { ...def.values(o), uView: [box[2], box[3]], uOrigin: [cam.origin[0] - box[0], cam.origin[1] - box[1]], uK: cam.k, uCam: cam.cam, uLight: light };
  if (name === 'sparks') { const S = sparkList(t, P, o), s = new Float32Array(96), a = new Float32Array(24); S.forEach((p, i) => { s.set([p.head[0] - box[0], p.head[1] - box[1], p.tail[0] - box[0], p.tail[1] - box[1]], i * 4); a[i] = p.u }); Object.assign(vals, { uS: s, uA: a, uNS: S.length }); if (!S.length) return }
  L.layer.draw(vals, t);
  X.save(); X.globalCompositeOperation = mode; X.drawImage(L.canvas, box[0], box[1], box[2], box[3]); X.restore();
}
// 没有 WebGL 时的二维替身：只求“这里有光/有汽/有水”，不求像
function fallback(name, t, P, o, X, mode) {
  const light = TH && TH.light;
  X.save(); X.globalCompositeOperation = mode;
  const blob = (c, r, col, a) => { const g2 = X.createRadialGradient(c[0], c[1], 0, c[0], c[1], r); g2.addColorStop(0, col.replace('A', a)); g2.addColorStop(1, col.replace('A', 0)); X.fillStyle = g2; X.beginPath(); X.arc(c[0], c[1], r, 0, 7); X.fill() };
  const k = K.cameraOf(P).k;
  if (name === 'glow') blob(K.iso(o.at, P), o.r * 1.8 * k, light ? 'rgba(240,120,30,A)' : 'rgba(255,150,50,A)', .8 * (o.heat ?? 1));
  else if (name === 'flame') blob(K.iso([o.base[0], o.base[1], o.base[2] + (o.dir ?? 1) * o.len * .35], P), o.len * .5 * k, light ? 'rgba(240,120,30,A)' : 'rgba(255,170,60,A)', .8 * (o.power ?? 1));
  else if (name === 'steam') blob(K.iso([o.base[0], o.base[1], o.base[2] + o.rise * .4], P), o.rise * .45 * k, light ? 'rgba(150,160,170,A)' : 'rgba(210,215,220,A)', .45 * (o.density ?? 1));
  else if (name === 'lamp') blob(K.iso([o.at[0], o.at[1], o.z], P), o.r * k, light ? 'rgba(250,210,120,A)' : 'rgba(255,230,170,A)', .5 * (o.power ?? 1));
  else if (name === 'water') { X.globalAlpha *= .35 * (o.power ?? 1); X.fillStyle = light ? '#9fb8cf' : '#2b5a80'; X.fill(A.P2(K.planOutline(o.plan, o.z, P))) }
  else if (name === 'sparks') for (const s of sparkList(t, P, o)) { X.strokeStyle = light ? '#d2601a' : '#ffb347'; X.globalAlpha = 1 - s.u; X.lineWidth = 2; X.beginPath(); X.moveTo(...s.tail); X.lineTo(...s.head); X.stroke() }
  X.restore();
}
// 起落包络（和上游 gl.mjs 同名同义，改成按时间算的确定版本）：burst(age, rise, fall) 一次性事件；settle(t, keys, 秒) 临界阻尼地跟到每个目标
const settle = (t, keys, seconds = .35) => A.spring(t, keys, { f: 1 / (2 * Math.PI * seconds), z: 1 });
fx.list = Object.keys(EFFECTS);
fx.noGL = () => NOGL;
Object.assign(A, { fx, burst: GL.burst, smooth: GL.smooth, settle, sparkList, FX: EFFECTS });
})();
