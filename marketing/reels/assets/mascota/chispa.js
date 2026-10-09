// Chispa, la mascota de Electro Shop: ilustración en tinta (SVG), armada como un muñeco articulado.
// Todo es numérico (brazos, ojos, cejas, boca, cabeza), así que cualquier cambio se puede interpolar y animar suave.
//   chispa({ pose, boca, ojos, cejas, fondo })  -> <svg> (API de siempre, con nombres)
//   chispa.rig(estado)                          -> <svg> desde un estado numérico (ver ESTADO)
//   chispa.linea(claves)                        -> función t -> estado, con transiciones suaves entre claves
//   chispa.labios(voz)                          -> función t -> boca, siguiendo las vocales de cada palabra
// viewBox 0 0 400 420; la cabeza gira sobre el cuello (200, 258).
(function () {
  const INK = '#111317', SKIN = '#fff8ee', SKIN_SOMBRA = '#f1dfc8', SHIRT = '#16213a', SHIRT_SOMBRA = '#0d1528', BLUE = '#2a63cd', CREAM = '#f4efe4';
  const S = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
  const s4 = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
  const f = (n) => Math.round(n * 10) / 10;
  let uid = 0;

  // ---------- Cabeza ----------
  const CARA = 'M128 140 C124 196 140 248 200 262 C260 248 276 196 272 140 C262 120 240 112 200 112 C160 112 138 120 128 140 Z';
  const FLEQUILLO = `M118 150 C114 104 140 72 180 64 C214 56 252 62 276 84 C296 102 302 128 296 152
             C284 136 272 128 262 126 L268 146 C252 128 236 120 222 118 L226 140 C210 122 192 116 176 118 L178 140
             C164 124 150 120 140 124 C132 132 126 142 118 150 Z`;
  const peloAtras = `<path d="M110 168 C96 120 118 74 166 58 C192 40 236 40 262 56 C304 70 320 112 300 168 Z" fill="${INK}"/>`;
  const peloDelante = `
    <path d="${FLEQUILLO}" fill="${INK}"/>
    <path d="M178 62 C186 40 206 34 222 40 C210 44 202 52 200 62 Z" fill="${INK}"/>
    <path d="M226 60 C240 44 262 44 274 54 C258 54 248 58 240 66 Z" fill="${INK}"/>
    <path d="M136 110 C150 96 160 92 172 92 M248 96 C262 102 272 112 278 124 M160 82 C170 76 182 74 192 74" fill="none" stroke="#343a46" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M150 92 C162 78 180 72 196 72" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".6"/>
    <path d="M236 76 C252 78 266 86 274 98" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45"/>
    <path d="M204 70 C212 68 220 69 226 72" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>`;
  const orejas = `
    <path d="M128 176 C112 170 106 188 114 200 C120 210 130 210 134 204" fill="${SKIN}" ${S}/>
    <path d="M272 176 C288 170 294 188 286 200 C280 210 270 210 266 204" fill="${SKIN}" ${S}/>
    <path d="M124 184 C118 188 119 196 125 199 M276 184 C282 188 281 196 275 199" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
  const nariz = `<path d="M196 196 C192 206 194 212 204 212" fill="none" ${s4}/>`;
  const rubor = (o) => `<ellipse cx="156" cy="214" rx="13" ry="6.5" fill="#f4a493" opacity="${f(o)}"/><ellipse cx="244" cy="214" rx="13" ry="6.5" fill="#f4a493" opacity="${f(o)}"/>`;

  // Ojos: abre (0 cerrado .. 1 normal .. 1.15 sorpresa), mirada (mx, my en -1..1), forma: normal | feliz | guino
  const ojo = (cx, cy, abre, mx, my, forma) => {
    if (forma === 'feliz') return `<path d="M${cx - 12} ${cy + 4} C${cx - 6} ${cy - 7} ${cx + 6} ${cy - 7} ${cx + 12} ${cy + 4}" fill="none" ${S}/>`;
    if (abre < .22) return `<path d="M${cx - 12} ${cy + 2} Q${cx} ${cy + 7} ${cx + 12} ${cy + 2}" fill="none" ${S}/>`;
    const x = cx + mx * 3.5, y = cy + my * 2.5, ry = 15 * abre, rx = 11 + (abre > 1 ? (abre - 1) * 6 : 0);
    const k = Math.min(1, abre);
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${INK}"/>
      <circle cx="${f(x + 4)}" cy="${f(y - 6 * k)}" r="${f(4.2 * k)}" fill="#fff"/><circle cx="${f(x - 3.5)}" cy="${f(y + 5 * k)}" r="${f(1.8 * k)}" fill="#fff" opacity=".85"/>`;
  };
  const ojos = (o) => `${ojo(166, 176, o.abre, o.mx, o.my, o.forma === 'guino' ? 'normal' : o.forma)}${ojo(234, 176, o.abre, o.mx, o.my, o.forma === 'guino' ? 'feliz' : o.forma)}`;

  // Cejas: alto (sube las dos), duda (una arriba, otra abajo), enojo (puntas de adentro abajo)
  const cejas = (c) => {
    const a = c.alto * 8, dL = c.duda * 2, dR = -c.duda * 7, e = c.enojo * 6;
    return `<path d="M150 ${f(150 - a + dL)} C158 ${f(144 - a + dL)} 172 ${f(144 - a + dL)} 180 ${f(148 - a + dL + e)} M220 ${f(148 - a + dR + e)} C228 ${f(144 - a + dR)} 242 ${f(144 - a + dR)} 250 ${f(150 - a + dR)}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
  };

  // Boca: abre 0..1, ancho 0..1, sonrisa -1..1, dientes
  const boca = (b, id) => {
    const cx = 201, cy = 231, w = 13 + 13 * b.ancho, sub = b.sonrisa * 6, h = 24 * b.abre;
    if (h < 2.5) return `<path d="M${f(cx - w)} ${f(cy - sub)} Q${cx} ${f(cy + 4 + sub * 1.6)} ${f(cx + w)} ${f(cy - sub)}" fill="none" ${S}/>`;
    const d = `M${f(cx - w)} ${f(cy - sub)} Q${cx} ${f(cy - 3 + sub * .6)} ${f(cx + w)} ${f(cy - sub)} Q${f(cx + w * .9)} ${f(cy + h * .9)} ${cx} ${f(cy + h + sub)} Q${f(cx - w * .9)} ${f(cy + h * .9)} ${f(cx - w)} ${f(cy - sub)} Z`;
    const lengua = h > 9 ? `<ellipse cx="${cx}" cy="${f(cy + h + sub - 3)}" rx="${f(w * .6)}" ry="${f(h * .32)}" fill="#e86a5c"/>` : '';
    const dientes = b.dientes && h > 6 ? `<rect x="${f(cx - w)}" y="${f(cy - 8)}" width="${f(w * 2)}" height="${f(8 + Math.min(6, h * .25))}" fill="#fff"/>` : '';
    return `<clipPath id="boca${id}"><path d="${d}"/></clipPath><path d="${d}" fill="${INK}"/><g clip-path="url(#boca${id})">${lengua}${dientes}</g><path d="${d}" fill="none" ${s4}/>`;
  };

  // ---------- Cuerpo ----------
  const HOMBRO = { L: [136, 306], R: [264, 306] };
  const TORSO = 'M104 420 L108 340 C110 310 128 292 160 284 L240 284 C272 292 290 310 292 340 L296 420 Z';
  const cuello = `<path d="M186 250 L186 290 L214 290 L214 250" fill="${SKIN}" ${S}/><path d="M188 258 L212 258 L212 274 C204 279 196 279 188 274 Z" fill="${SKIN_SOMBRA}"/>`;
  const torso = (id) => `
    <clipPath id="torso${id}"><path d="${TORSO}"/></clipPath>
    <path d="${TORSO}" fill="${SHIRT}"/>
    <g clip-path="url(#torso${id})"><path d="M246 284 C276 296 292 318 292 350 L300 420 L258 420 C264 376 262 330 246 300 Z" fill="${SHIRT_SOMBRA}"/>
      <path d="M128 300 C118 318 114 340 114 370" fill="none" stroke="#27365a" stroke-width="5" stroke-linecap="round"/></g>
    <path d="${TORSO}" fill="none" ${S}/>
    ${cuello}
    <path d="M176 282 L200 312 L224 282 Z" fill="${SKIN}" ${s4}/>
    <path d="M168 280 L200 316 L188 330 L158 290 Z M232 280 L200 316 L212 330 L242 290 Z" fill="${BLUE}" ${s4}/>
    <path d="M200 330 L200 420" stroke="#2b3a5c" stroke-width="3" stroke-linecap="round"/>
    <circle cx="200" cy="350" r="3" fill="#2b3a5c"/><circle cx="200" cy="386" r="3" fill="#2b3a5c"/>
    <g transform="translate(220 344)"><rect x="0" y="0" width="38" height="28" rx="6" fill="#fff" ${s4}/>
      <text x="19" y="20" text-anchor="middle" font-family="Tektrron, Poppins" font-size="14" font-weight="700" fill="${BLUE}">ES</text></g>`;

  // ---------- Manos (coordenadas locales: muñeca en 0,0 y los dedos hacia -y) ----------
  const dedo = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="25" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${SKIN}" stroke-width="14" stroke-linecap="round"/>`;
  const PALMA = 'M-25 -10 C-27 -26 -14 -30 0 -30 C14 -30 27 -26 25 -10 L23 10 C19 24 -19 24 -23 10 Z';
  const PUÑO = 'M-24 -16 C-24 -26 24 -26 24 -16 L24 10 C24 22 -24 22 -24 10 Z';
  const g = (x, y, r, cuerpo) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)})">${cuerpo}</g>`;
  const MANOS = {
    palma: (x, y, r) => g(x, y, r, `${dedo(-15, -24, -21, -52)}${dedo(-5, -27, -6, -60)}${dedo(6, -27, 8, -60)}${dedo(16, -22, 22, -50)}${dedo(-20, -4, -38, -20)}
      <path d="${PALMA}" fill="${SKIN}" ${S}/><path d="M-9 -2 C-3 3 5 3 10 -2" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".45"/>`),
    indice: (x, y, r) => g(x, y, r, `${dedo(2, -20, 2, -70)}<path d="${PUÑO}" fill="${SKIN}" ${S}/>
      <path d="M-14 -6 L12 -6 M-14 5 L12 5" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>${dedo(-21, 0, -32, -15)}`),
    pulgar: (x, y, r) => g(x, y, r, `${dedo(-12, -18, -14, -62)}<path d="M-26 -18 C-26 -28 26 -28 26 -18 L26 14 C26 26 -26 26 -26 14 Z" fill="${SKIN}" ${S}/>
      <path d="M-8 -7 L22 -7 M-8 4 L22 4 M-8 15 L22 15" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`),
    puño: (x, y, r) => g(x, y, r, `<path d="${PUÑO}" fill="${SKIN}" ${S}/><path d="M-12 -7 L12 -7 M-12 4 L12 4" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`),
    // vistas por detrás: dorso del puño con nudillos; índice arriba con la uña
    puñoAtras: (x, y, r) => g(x, y, r, `<path d="${PUÑO}" fill="${SKIN}" ${S}/>
      <path d="M-20 -14 C-20 -21 -12 -21 -11 -14 M-10 -14 C-10 -22 -1 -22 0 -14 M1 -14 C1 -22 10 -22 11 -14 M12 -14 C12 -21 20 -21 20 -14" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M-14 2 L-12 12 M0 2 L0 13 M14 2 L12 12" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity=".45"/>`),
    indiceAtras: (x, y, r) => g(x, y, r, `${dedo(-12, -14, -12, -64)}
      <path d="M-18 -68 C-18 -76 -6 -76 -6 -68 L-6 -60 C-9 -57 -15 -57 -18 -60 Z" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
      <path d="${PUÑO}" fill="${SKIN}" ${S}/>
      <path d="M-4 -14 C-4 -21 4 -21 5 -14 M6 -14 C6 -21 14 -21 15 -14 M16 -14 C16 -20 22 -20 22 -14" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M-14 2 L-12 12 M0 2 L0 13 M14 2 L12 12" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity=".45"/>`),
  };
  const ang = (e, w) => Math.atan2(w[0] - e[0], -(w[1] - e[1])) * 180 / Math.PI;
  // Brazo: hombro -> codo -> muñeca (tubo de tinta con camisa adentro) y la mano según el antebrazo.
  const brazo = (lado, b) => {
    const [hx, hy] = HOMBRO[lado], c = b.codo, m = b.muñeca, a = ang(c, m);
    const d = `M${hx} ${hy} Q${f(c[0])} ${f(c[1])} ${f(m[0])} ${f(m[1])}`;
    const mano = b.mano && MANOS[b.mano] ? MANOS[b.mano](m[0], m[1], a + (b.giro || 0)) : '';
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="${d}" fill="none" stroke="${SHIRT}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>${mano}`;
  };

  // ---------- Vista de espalda: nuca con corte en V, camisa con la placa ES grande ----------
  const cabezaEspalda = `
    ${orejas}
    <path d="${CARA}" fill="${SKIN}" ${S}/>
    <path d="M116 168 C104 114 128 70 170 58 C192 40 236 40 262 56 C300 72 298 116 284 168
             C280 184 272 194 262 198 L244 204 L200 240 L156 204 L138 198 C128 194 120 184 116 168 Z" fill="${INK}"/>
    <path d="M178 62 C186 40 206 34 222 40 C210 44 202 52 200 62 Z M226 60 C240 44 262 44 274 54 C258 54 248 58 240 66 Z" fill="${INK}"/>
    <path d="M156 204 L200 240 L244 204" fill="none" stroke="#3a3f4a" stroke-width="3" stroke-linecap="round"/>
    <path d="M164 192 L200 222 L236 192 M172 178 L200 202 L228 178" fill="none" stroke="#2c3038" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M150 226 C160 238 170 246 184 252 M250 226 C240 238 230 246 216 252" fill="none" stroke="${SKIN_SOMBRA}" stroke-width="5" stroke-linecap="round"/>
    <path d="M150 96 C166 82 186 76 204 76 M232 82 C250 88 264 100 270 116 M140 130 C150 116 162 108 176 104" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".4"/>`;
  const torsoEspalda = (id) => `
    <clipPath id="torsoE${id}"><path d="${TORSO}"/></clipPath>
    <path d="${TORSO}" fill="${SHIRT}"/>
    <g clip-path="url(#torsoE${id})"><path d="M154 284 C124 296 108 318 108 350 L100 420 L142 420 C136 376 138 330 154 300 Z" fill="${SHIRT_SOMBRA}"/></g>
    <path d="${TORSO}" fill="none" ${S}/>
    ${cuello}
    <path d="M164 284 C176 296 224 296 236 284 L240 276 C222 288 178 288 160 276 Z" fill="${BLUE}" ${s4}/>
    <g transform="translate(166 326)"><rect x="0" y="0" width="68" height="48" rx="10" fill="#fff" ${s4}/>
      <text x="34" y="34" text-anchor="middle" font-family="Tektrron, Poppins" font-size="24" font-weight="700" fill="${BLUE}">ES</text></g>
    <path d="M200 380 L200 420" stroke="#2b3a5c" stroke-width="3" stroke-linecap="round"/>`;

  // ---------- Poses (solo brazos) ----------
  const REPOSO_L = { codo: [116, 370], muñeca: [112, 446], mano: 'palma', giro: 0 };
  const REPOSO_R = { codo: [284, 370], muñeca: [288, 446], mano: 'palma', giro: 0 };
  const POSES = {
    habla: { L: REPOSO_L, R: REPOSO_R },
    señala: { L: REPOSO_L, R: { codo: [318, 330], muñeca: [318, 250], mano: 'indice', giro: 0 } },
    explica: { L: { codo: [104, 384], muñeca: [150, 334], mano: 'palma', giro: -20 }, R: { codo: [296, 384], muñeca: [250, 334], mano: 'palma', giro: 20 } },
    pulgar: { L: REPOSO_L, R: { codo: [306, 392], muñeca: [300, 318], mano: 'pulgar', giro: 0 } },
    brazos: { L: { codo: [108, 404], muñeca: [276, 372], mano: 'puño', giro: 90 }, R: { codo: [292, 396], muñeca: [124, 356], mano: 'puño', giro: -90 }, orden: 'RL' },
    hombros: { L: { codo: [94, 372], muñeca: [84, 290], mano: 'palma', giro: -10 }, R: { codo: [306, 372], muñeca: [316, 290], mano: 'palma', giro: 10 } },
    saluda: { L: REPOSO_L, R: { codo: [334, 318], muñeca: [330, 232], mano: 'palma', giro: 8 } },
    celebra: { L: { codo: [84, 300], muñeca: [100, 214], mano: 'puño', giro: 0 }, R: { codo: [316, 300], muñeca: [300, 214], mano: 'puño', giro: 0 } },
    piensa: { L: REPOSO_L, R: { codo: [306, 392], muñeca: [212, 288], mano: 'puño', giro: 44 } },
  };
  const R_ATRAS = { codo: [284, 370], muñeca: [288, 446], mano: 'indiceAtras', giro: 0 }, L_ATRAS = { codo: [116, 370], muñeca: [112, 446], mano: 'puñoAtras', giro: 0 };
  const POSES_ESPALDA = {
    espalda: { L: L_ATRAS, R: R_ATRAS },
    'espalda-señala': { L: L_ATRAS, R: { codo: [326, 300], muñeca: [332, 214], mano: 'indiceAtras', giro: 0 } },
    'espalda-señala-alto': { L: L_ATRAS, R: { codo: [300, 250], muñeca: [312, 166], mano: 'indiceAtras', giro: 0 } },
    'espalda-dos': { L: { codo: [76, 300], muñeca: [70, 220], mano: 'puñoAtras', giro: -10 }, R: { codo: [324, 300], muñeca: [330, 220], mano: 'puñoAtras', giro: 10 } },
  };

  // ---------- Estado completo ----------
  const ESTADO = () => ({
    vista: 'frente', pose: 'habla', L: REPOSO_L, R: REPOSO_R, orden: 'LR',
    cabeza: { inc: 0, dx: 0, dy: 0 }, pelo: 0, cuerpo: 1,
    ojos: { abre: 1, mx: 0, my: 0, forma: 'normal' },
    cejas: { alto: 0, duda: 0, enojo: 0 },
    boca: { abre: 0, ancho: .5, sonrisa: .5, dientes: false },
    rubor: .5, fondo: true,
  });
  const CEJAS = { normal: { alto: 0, duda: 0, enojo: 0 }, arriba: { alto: 1, duda: 0, enojo: 0 }, duda: { alto: .2, duda: 1, enojo: 0 }, enojo: { alto: -.3, duda: 0, enojo: 1 } };
  const OJOS = { abiertos: { abre: 1, forma: 'normal' }, cerrados: { abre: 0, forma: 'normal' }, sorpresa: { abre: 1.15, forma: 'normal' }, guino: { abre: 1, forma: 'guino' }, feliz: { abre: 1, forma: 'feliz' } };
  const BOCAS = {
    sonrisa: { abre: 0, ancho: .5, sonrisa: .6, dientes: false }, seria: { abre: 0, ancho: .45, sonrisa: 0, dientes: false },
    a: { abre: .85, ancho: .55, sonrisa: .2, dientes: true }, e: { abre: .45, ancho: .85, sonrisa: .3, dientes: true },
    i: { abre: .28, ancho: .95, sonrisa: .5, dientes: true }, o: { abre: .7, ancho: .25, sonrisa: 0, dientes: false },
    u: { abre: .42, ancho: .12, sonrisa: 0, dientes: false }, feliz: { abre: .55, ancho: .8, sonrisa: 1, dientes: true },
  };
  const brazosDe = (vista, pose) => (vista === 'espalda' ? POSES_ESPALDA[pose] || POSES_ESPALDA.espalda : POSES[pose] || POSES.habla);

  const rig = (e) => {
    const brazos = () => e.orden === 'RL' ? brazo('R', e.R) + brazo('L', e.L) : brazo('L', e.L) + brazo('R', e.R);
    const id = ++uid, cab = e.cabeza, sy = e.cuerpo, sx = 1 + (1 - sy) * .6;
    const cuerpo = `translate(200 420) scale(${f(sx * 1000) / 1000} ${f(sy * 1000) / 1000}) translate(-200 -420)`;
    const cabeza = `rotate(${f(cab.inc)} 200 258) translate(${f(cab.dx)} ${f(cab.dy)})`;
    let dentro;
    if (e.vista === 'espalda') {
      dentro = `${torsoEspalda(id)}<g transform="${cabeza}">${cabezaEspalda}</g>${brazos()}`;
    } else {
      dentro = `${torso(id)}<g transform="${cabeza}">${peloAtras}${orejas}
        <clipPath id="cara${id}"><path d="${CARA}"/></clipPath>
        <path d="${CARA}" fill="${SKIN}"/>
        <g clip-path="url(#cara${id})"><path d="${FLEQUILLO}" fill="${SKIN_SOMBRA}" transform="translate(0 9)"/><path d="M128 236 C150 258 250 258 272 236 L272 270 L128 270 Z" fill="${SKIN_SOMBRA}" opacity=".7"/></g>
        <path d="${CARA}" fill="none" ${S}/>
        ${rubor(e.rubor)}${nariz}
        <g transform="rotate(${f(e.pelo)} 200 110)">${peloDelante}</g>
        ${ojos(e.ojos)}${cejas(e.cejas)}${boca(e.boca, id)}</g>${brazos()}`;
    }
    return `<svg viewBox="0 0 400 420" xmlns="http://www.w3.org/2000/svg">
  ${e.fondo ? `<circle cx="200" cy="232" r="150" fill="${BLUE}"/><circle cx="200" cy="232" r="166" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round" opacity=".5"/>` : ''}
  <g transform="${cuerpo}">${dentro}</g>
</svg>`;
  };

  // API de siempre: chispa({ pose, boca, ojos, cejas, fondo }); 'espalda-libre' usa window.CHISPA_L / CHISPA_R
  const chispa = ({ pose = 'habla', boca = 'sonrisa', ojos = 'abiertos', cejas = 'normal', fondo = true } = {}) => {
    const e = ESTADO(), espalda = pose.startsWith('espalda');
    e.vista = espalda ? 'espalda' : 'frente'; e.fondo = fondo;
    let b = brazosDe(e.vista, pose);
    if (pose === 'espalda-libre') {
      const l = window.CHISPA_L || {}, r = window.CHISPA_R || {};
      b = { L: { ...L_ATRAS, giro: 0, ...l }, R: { ...R_ATRAS, giro: 0, ...r } };
    }
    e.L = b.L; e.R = b.R; e.orden = b.orden || 'LR';
    Object.assign(e.ojos, OJOS[ojos] || OJOS.abiertos); Object.assign(e.cejas, CEJAS[cejas] || CEJAS.normal); Object.assign(e.boca, BOCAS[boca] || BOCAS.sonrisa);
    return rig(e);
  };

  // ---------- Animación ----------
  const lerp = (a, b, t) => a + (b - a) * t;
  const mezcla = (a, b, t) => {
    if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t);
    if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerp(v, b[i], t));
    if (a && b && typeof a === 'object' && typeof b === 'object') { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = k in a && k in b ? mezcla(a[k], b[k], t) : (k in b ? b[k] : a[k]); return o; }
    return t < .5 ? a : b;
  };
  const backOut = (x, s = 1.5) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  const easeInOut = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

  // linea(claves): claves = [{ t, pose?, vista?, ojos?, cejas?, boca?, mirar?:[mx,my], inc?, feliz? }]. Cada campo pasa suave de su valor anterior al nuevo.
  const linea = (claves) => {
    const ks = [...claves].sort((a, b) => a.t - b.t);
    const valor = (campo, def, t) => {
      let prev = def, cur = def, tc = -1e9;
      for (const k of ks) { if (k.t > t) break; if (campo in k) { prev = cur; cur = k[campo]; tc = k.t; } }
      return { prev, cur, x: t - tc };
    };
    return (t) => {
      const e = ESTADO();
      const v = valor('vista', 'frente', t); e.vista = v.cur;
      const p = valor('pose', 'habla', t);
      // si cambió la vista, la pose nueva arranca sin transición desde la anterior (el giro la tapa)
      const bA = brazosDe(e.vista, p.prev), bB = brazosDe(e.vista, p.cur), k = backOut(clamp(p.x / .32));
      const mano = (a, b) => ({ ...mezcla(a, b, k), mano: k < .35 ? (a.mano || b.mano) : (b.mano || a.mano) });
      e.L = mano(bA.L, bB.L); e.R = mano(bA.R, bB.R); e.orden = (k < .5 ? bA.orden : bB.orden) || 'LR';
      const o = valor('ojos', 'abiertos', t), oj = mezcla(OJOS[o.prev] || OJOS.abiertos, OJOS[o.cur] || OJOS.abiertos, easeInOut(clamp(o.x / .12)));
      Object.assign(e.ojos, oj);
      const c = valor('cejas', 'normal', t); Object.assign(e.cejas, mezcla(CEJAS[c.prev] || CEJAS.normal, CEJAS[c.cur] || CEJAS.normal, backOut(clamp(c.x / .25), 1.2)));
      const m = valor('mirar', [0, 0], t), mm = mezcla(m.prev, m.cur, easeInOut(clamp(m.x / .18))); e.ojos.mx = mm[0]; e.ojos.my = mm[1];
      const i = valor('inc', 0, t); e.cabeza.inc = mezcla(i.prev, i.cur, easeInOut(clamp(i.x / .4)));
      const fz = valor('feliz', false, t); e.boca.sonrisa = mezcla(fz.prev ? 1 : .5, fz.cur ? 1 : .5, clamp(fz.x / .2)); e.rubor = .45 + (fz.cur ? .25 : 0);
      const bo = valor('boca', 'sonrisa', t); Object.assign(e.boca, mezcla(BOCAS[bo.prev] || BOCAS.sonrisa, BOCAS[bo.cur] || BOCAS.sonrisa, easeInOut(clamp(bo.x / .1))));
      e.cambioPose = p.x;
      return e;
    };
  };

  // labios(voz): boca por vocal (a, e, i, o, u) de la palabra que suena, con la apertura que da el volumen de ese cuadro.
  const VOCAL = { a: 'a', á: 'a', e: 'e', é: 'e', i: 'i', í: 'i', o: 'o', ó: 'o', u: 'u', ú: 'u', ü: 'u' };
  const labios = (voz) => {
    const ps = voz.palabras.map((p) => ({ ...p, v: (p.w.toLowerCase().match(/[aáeéiíoóuúü]/g) || ['e']).map((c) => VOCAL[c]) }));
    const forma = (t) => {
      const i = Math.floor(t * 30), r = voz.rms[i] ?? -60, env = clamp((r + 44) / 26);
      const p = ps.find((q) => t >= q.t0 && t < q.t1);
      if (!p || env < .08) return { abre: 0, ancho: .5, sonrisa: .5, dientes: false };
      const voc = p.v[Math.min(p.v.length - 1, Math.floor((t - p.t0) / (p.t1 - p.t0) * p.v.length))];
      const b = BOCAS[voc];
      return { abre: b.abre * (.35 + .65 * env), ancho: b.ancho, sonrisa: b.sonrisa, dientes: b.dientes };
    };
    // promedio de 3 cuadros: la boca no salta de una forma a otra
    return (t) => { const a = forma(t), b = forma(t - 1 / 30), c = forma(t - 2 / 30); return { ...mezcla(mezcla(c, b, .5), a, .55), dientes: a.dientes }; };
  };

  // vida(e, t, opciones): parpadeo, respiración, cabeza que acompaña al habla y pelo que se queda un poco atrás
  const parpadeo = (t) => {
    const T = 3.3, n = Math.floor(t / T), off = ((n * 7919) % 13) / 13 * 1.2, x = t - n * T - off;
    return x >= 0 && x < .16 ? 1 - Math.sin(x / .16 * Math.PI) : 1;
  };
  const vida = (e, t, { rms = null } = {}) => {
    if (e.ojos.forma === 'normal' && e.ojos.abre > .5) e.ojos.abre *= parpadeo(t);
    e.cuerpo = 1 + Math.sin(t * 2.1) * .006;
    const habla = rms ? clamp((rms + 40) / 22) : 0;
    e.cabeza.inc += Math.sin(t * 1.3) * 1.2 + Math.sin(t * 7.1) * habla * 1.6;
    e.cabeza.dy += -habla * 1.5;
    // al cambiar de pose, el cuerpo hace un pequeño rebote
    if (e.cambioPose !== undefined && e.cambioPose < .3) e.cuerpo *= 1 - Math.sin(e.cambioPose / .3 * Math.PI) * .025;
    e.pelo = -Math.cos(t * 1.3) * 1.1 - Math.cos(t * 7.1) * habla * 1.2;
    return e;
  };

  chispa.rig = rig; chispa.estado = ESTADO; chispa.linea = linea; chispa.labios = labios; chispa.vida = vida; chispa.mezcla = mezcla;
  window.chispa = chispa;
  window.CHISPA = { POSES: Object.keys(POSES).concat(Object.keys(POSES_ESPALDA)), BOCAS: Object.keys(BOCAS), OJOS: Object.keys(OJOS), CEJAS: Object.keys(CEJAS), CREAM, BLUE };
})();
