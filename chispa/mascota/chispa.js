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

  // Ojos: abre (0 cerrado .. 1 normal .. 1.15 sorpresa), mirada (mx, my en -1..1), forma: normal | feliz | guino | sonrie | entrecerrado.
  // C-195: "sonrie" (abiertos, con el párpado de abajo empujado por la mejilla) y "entrecerrado" (el de arriba bajo: pícaro, pensando)
  const ojo = (cx, cy, abre, mx, my, forma) => {
    if (forma === 'feliz') return `<path d="M${cx - 12} ${cy + 4} C${cx - 6} ${cy - 7} ${cx + 6} ${cy - 7} ${cx + 12} ${cy + 4}" fill="none" ${S}/>`;
    if (abre < .22) return `<path d="M${cx - 12} ${cy + 2} Q${cx} ${cy + 7} ${cx + 12} ${cy + 2}" fill="none" ${S}/>`;
    const x = cx + mx * 3.5, y = cy + my * 2.5, ry = 15 * abre, rx = 11 + (abre > 1 ? (abre - 1) * 6 : 0);
    const k = Math.min(1, abre);
    const abierto = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${INK}"/>
      <circle cx="${f(x + 4)}" cy="${f(y - 6 * k)}" r="${f(4.2 * k)}" fill="#fff"/><circle cx="${f(x - 3.5)}" cy="${f(y + 5 * k)}" r="${f(1.8 * k)}" fill="#fff" opacity=".85"/>`;
    if (forma === 'sonrie') {
      const yb = cy + ry * .36;
      return `${abierto}<path d="M${f(cx - rx - 6)} ${f(yb)} Q${cx} ${f(cy - ry * .12)} ${f(cx + rx + 6)} ${f(yb)} L${f(cx + rx + 6)} ${f(cy + ry + 8)} L${f(cx - rx - 6)} ${f(cy + ry + 8)} Z" fill="${SKIN}"/>
        <path d="M${f(cx - rx - 2)} ${f(yb + 1)} Q${cx} ${f(cy - ry * .1)} ${f(cx + rx + 2)} ${f(yb + 1)}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`;
    }
    if (forma === 'entrecerrado') {
      const yt = cy - ry * .18;
      return `${abierto}<path d="M${f(cx - rx - 6)} ${f(cy - ry - 8)} L${f(cx + rx + 6)} ${f(cy - ry - 8)} L${f(cx + rx + 6)} ${f(yt)} Q${cx} ${f(yt + 3)} ${f(cx - rx - 6)} ${f(yt)} Z" fill="${SKIN}"/>
        <path d="M${f(cx - rx - 2)} ${f(yt + 1)} Q${cx} ${f(yt + 4)} ${f(cx + rx + 2)} ${f(yt + 1)}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    }
    return abierto;
  };
  const ojos = (o) => `${ojo(166, 176, o.abre, o.mx, o.my, o.forma === 'guino' ? 'normal' : o.forma)}${ojo(234, 176, o.abre, o.mx, o.my, o.forma === 'guino' ? 'feliz' : o.forma)}`;

  // Cejas: alto (sube las dos), duda (una arriba, otra abajo), enojo (puntas de adentro abajo)
  const ceja = (pts, gr) => { // pts: 4 puntos de la curva; gr: grosor arriba/abajo en cada punto
    const up = pts.map((p, i) => `${f(p[0])} ${f(p[1] - gr[i])}`), dn = pts.map((p, i) => `${f(p[0])} ${f(p[1] + gr[i] * .7)}`);
    return `<path d="M${up[0]} C${up[1]} ${up[2]} ${up[3]} L${dn[3]} C${dn[2]} ${dn[1]} ${dn[0]} Z" fill="${INK}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  };
  // C-195: triste (las puntas de adentro arriba y las de afuera abajo): apenado, "ups"
  const cejas = (c) => {
    const a = c.alto * 8, dL = c.duda * 2, dR = -c.duda * 7, e = c.enojo * 6, tr = (c.triste || 0) * 7;
    return ceja([[150, 150 - a + dL + tr * .45], [158, 144 - a + dL], [172, 144 - a + dL - tr * .55], [180, 148 - a + dL + e - tr]], [2.2, 3.6, 4.6, 5]) +
           ceja([[220, 148 - a + dR + e - tr], [228, 144 - a + dR - tr * .55], [242, 144 - a + dR], [250, 150 - a + dR + tr * .45]], [5, 4.6, 3.6, 2.2]);
  };

  // Boca: abre 0..1, ancho 0..1, sonrisa -1..1, dientes. C-195: lado -1..1 sube una comisura (la sonrisa de lado)
  const boca = (b, id) => {
    const cx = 201, cy = 231, w = 13 + 13 * b.ancho, sub = b.sonrisa * 6, h = 24 * b.abre, la = (b.lado || 0) * 5.5;
    const yl = cy - sub + la, yr = cy - sub - la;
    if (h < 2.5) return `<path d="M${f(cx - w)} ${f(yl)} Q${cx} ${f(cy + 4 + sub * 1.6)} ${f(cx + w)} ${f(yr)}" fill="none" ${S}/>`;
    const d = `M${f(cx - w)} ${f(yl)} Q${cx} ${f(cy - 3 + sub * .6)} ${f(cx + w)} ${f(yr)} Q${f(cx + w * .9)} ${f(cy + h * .9)} ${cx} ${f(cy + h + sub)} Q${f(cx - w * .9)} ${f(cy + h * .9)} ${f(cx - w)} ${f(yl)} Z`;
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
  // C-195 (Andrés, 06/11: "revisa bien las manos", "los pulgares son muy largos y se perciben como índice"). Cada mano es una
  // SILUETA: la palma y los dedos se dibujan juntos con un solo contorno de tinta alrededor (primero todo en tinta y más grueso,
  // después todo en piel encima), así no quedan cortes ni manchas donde un dedo se junta con la palma. Adentro van las rayas
  // que separan los dedos y los pliegues. Un pulgar que cruza por delante también es parte de la silueta, y encima se le dibuja
  // su borde abierto en la base: se ve delante de los dedos y se funde con la palma. Los pulgares son cortos y gruesos.
  const CONTORNO = 12;
  const p2 = (x, y) => `${f(x)} ${f(y)}`;
  // Una pieza alargada: q = [x1, y1, x2, y2, radio en la base, radio en la punta], redonda en las dos puntas
  const capsula = ([x1, y1, x2, y2, rb, rt]) => {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    return `M${p2(x1 + nx * rb, y1 + ny * rb)} L${p2(x2 + nx * rt, y2 + ny * rt)} A${f(rt)} ${f(rt)} 0 0 0 ${p2(x2 - nx * rt, y2 - ny * rt)} L${p2(x1 - nx * rb, y1 - ny * rb)} A${f(rb)} ${f(rb)} 0 0 0 ${p2(x1 + nx * rb, y1 + ny * rb)} Z`;
  };
  const elipse = (cx, cy, rx, ry) => `M${p2(cx - rx, cy)} A${f(rx)} ${f(ry)} 0 1 0 ${p2(cx + rx, cy)} A${f(rx)} ${f(ry)} 0 1 0 ${p2(cx - rx, cy)} Z`;
  const silueta = (...piezas) =>
    piezas.map((d) => `<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${CONTORNO}" stroke-linejoin="round"/>`).join('') +
    piezas.map((d) => `<path d="${d}" fill="${SKIN}"/>`).join('');
  const trazo = (d, w = 3.5, o = 1) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o < 1 ? ` opacity="${o}"` : ''}/>`;
  const en = (q, t) => [q[0] + (q[2] - q[0]) * t, q[1] + (q[3] - q[1]) * t, q[4] + (q[5] - q[4]) * t];
  // La raya entre dos dedos vecinos: baja desde donde se tocan (o desde las puntas, si van juntos) hacia la palma
  const entre = (a, b, largo = 8) => {
    let t = 1;
    for (; t > 0; t -= .02) { const A = en(a, t), B = en(b, t); if (Math.hypot(A[0] - B[0], A[1] - B[1]) <= A[2] + B[2]) break; }
    if (t <= 0) return '';
    const A = en(a, t), B = en(b, t), A0 = en(a, 0), B0 = en(b, 0), c = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const dx = (A0[0] + B0[0]) / 2 - c[0], dy = (A0[1] + B0[1]) / 2 - c[1], k = Math.min(1, largo / (Math.hypot(dx, dy) || 1));
    return trazo(`M${p2(c[0], c[1])} L${p2(c[0] + dx * k, c[1] + dy * k)}`, 3.2);
  };
  // El borde de una pieza que va por delante de la palma: rodea la punta y se abre antes de la base. El lado de arriba (el que
  // la separa de los dedos) llega más cerca de la base que el de abajo, que se funde con la palma.
  const borde = (q, arriba = .3, abajo = .55, w = 4.5) => {
    const [x1, y1, x2, y2, , rt] = q, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L, d1 = abajo, d2 = arriba;
    if (ny < 0) { d1 = arriba; d2 = abajo; }
    const [ax, ay, ra] = en(q, d1), [bx, by, rb] = en(q, d2), RA = ra + w / 2, RB = rb + w / 2, RT = rt + w / 2;
    return trazo(`M${p2(ax + nx * RA, ay + ny * RA)} L${p2(x2 + nx * RT, y2 + ny * RT)} A${f(RT)} ${f(RT)} 0 0 0 ${p2(x2 - nx * RT, y2 - ny * RT)} L${p2(bx - nx * RB, by - ny * RB)}`, w);
  };
  // La uña del pulgar: un brillo claro adentro de la punta, sin contorno
  const uña = (q) => {
    const [x1, y1, x2, y2, , rt] = q, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, cx = x2 - dx / L * rt * .55, cy = y2 - dy / L * rt * .55;
    return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rt * .55)}" ry="${f(rt * .7)}" transform="rotate(${f(Math.atan2(dy, dx) * 180 / Math.PI + 90)} ${f(cx)} ${f(cy)})" fill="#fff" opacity=".8"/>`;
  };
  // Un pulgar por delante: su piel otra vez (tapa las rayas de los dedos que quedan atrás), su borde y la uña
  const pulgarDelante = (q, arriba = .3, abajo = .55) => `<path d="${capsula(q)}" fill="${SKIN}"/>` + borde(q, arriba, abajo) + uña(q);
  // Medidas: los dedos con 7,4 de radio en la base y 6,2 en la punta; el meñique, más fino; el pulgar, 9,5 y 8,2: más grueso
  // y bastante más corto que el índice.
  const DEDO = [7.4, 6.2], MEÑIQUE = [6.6, 5.6], PULGAR = [9.5, 8.2];
  const PALMA = 'M-25 -10 C-27 -26 -14 -30 0 -30 C14 -30 27 -26 25 -10 L23 10 C19 24 -19 24 -23 10 Z';
  // La línea de la palma rodea la base del pulgar (la curva de antes, al medio, parecía una sonrisa)
  const lineaPalma = trazo('M-16 -14 C-8 -8 -6 3 -8 13', 2.8, .35);
  // El puño de frente con los cuatro nudillos arriba (también se ve así por detrás)
  const PUÑO_NUDILLOS = 'M-24 -14 C-25 -22 -16 -25 -12 -20 C-9 -27 -1 -27 0 -21 C2 -27 10 -27 12 -21 C15 -26 25 -23 24 -14 L24 10 C24 22 -24 22 -24 10 Z';
  // El puño del pulgar arriba, de costado: los dedos doblados hacen olas en el borde derecho
  const PUÑO_PULGAR = 'M-26 -16 C-26 -28 14 -29 20 -24 C28 -22 29 -14 25 -11 C30 -9 30 0 25 2 C30 4 30 12 24 14 C27 18 24 25 16 25 L-14 25 C-24 25 -26 20 -26 14 Z';
  // El mismo puño con el índice arriba: quedan tres dedos doblados (tres olas)
  const PUÑO_INDICE = 'M-26 -14 C-26 -25 10 -26 18 -21 C27 -19 28 -8 24 -5 C29 -2 29 8 24 10 C28 13 27 25 16 25 L-14 25 C-24 25 -26 20 -26 14 Z';
  const g = (x, y, r, cuerpo) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r)})">${cuerpo}</g>`;
  // Una mano abierta con la palma hacia quien mira: los cuatro dedos y el pulgar en una silueta
  const abierta = (dedos, pulgar, juntos = false) =>
    silueta(PALMA, ...dedos.map(capsula), capsula(pulgar)) + dedos.slice(1).map((q, i) => entre(dedos[i], q, juntos ? 99 : 8)).join('') + lineaPalma;
  const dedos = (...qs) => qs.map(([x1, y1, x2, y2, m = DEDO]) => [x1, y1, x2, y2, ...m]);
  const pulgar = (x1, y1, x2, y2) => [x1, y1, x2, y2, ...PULGAR];
  const MANOS = {
    palma: (x, y, r) => g(x, y, r, abierta(dedos([-13, -22, -25, -53], [-3, -25, -6, -62], [6, -24, 7, -58], [15, -18, 26, -44, MEÑIQUE]), pulgar(-17, -2, -33, -16))),
    // Los dedos juntos (presentar algo, "aquí está")
    palmaJunta: (x, y, r) => g(x, y, r, abierta(dedos([-11, -22, -13, -55], [-3, -24, -3, -60], [6, -24, 7, -57], [15, -18, 21, -46, MEÑIQUE]), pulgar(-17, -2, -31, -15), true)),
    // Señalar: el índice arriba, los otros tres dedos doblados y el pulgar cruzado por delante
    indice: (x, y, r) => {
      const ind = dedos([-13, -18, -12, -68])[0], pul = pulgar(-20, -2, 4, -4);
      return g(x, y, r, silueta(PUÑO_INDICE, capsula(ind), capsula(pul)) + trazo('M-4 -5 L24 -5 M-4 10 L24 10') + pulgarDelante(pul));
    },
    // Pulgar arriba: corto y grueso, saliendo del puño (antes medía lo que un índice)
    pulgar: (x, y, r) => {
      const pul = pulgar(-13, -20, -14, -37), punta = [-14, -37, -18, -50, 9.2, 9.4];
      return g(x, y, r, silueta(PUÑO_PULGAR, capsula(pul), capsula(punta)) + uña(punta) + trazo('M-6 -11 L24 -11 M-6 2 L25 2 M-4 14 L23 14') + trazo('M-25 -20 C-19 -15 -11 -15 -5 -20', 2.6, .35));
    },
    // El puño de costado: los cuatro dedos doblados y el pulgar doblado arriba, por delante del índice
    puño: (x, y, r) => {
      const pul = pulgar(-19, -16, 4, -17);
      return g(x, y, r, silueta(PUÑO_PULGAR, capsula(pul)) + trazo('M-6 -11 L24 -11 M-6 2 L25 2 M-4 14 L23 14') + pulgarDelante(pul));
    },
    // OK: el índice y el pulgar hacen un aro chico, pegado a la palma (una sola silueta), y los otros tres dedos se abren
    // arriba. El hueco se recorta con una máscara: se ve el fondo aunque quede cerca de la palma. La raya es donde se tocan
    // las puntas, y la uña dice que la mitad de abajo es el pulgar. (Andrés, 06/11: "el círculo debe ser más pequeño".)
    // id: el de la Chispa que se dibuja (cada máscara necesita el suyo; con uno fijo, una Chispa le pisaba la mano a otra)
    ok: (x, y, r, id = ++uid) => {
      const ds = dedos([4, -25, 7, -61], [12, -24, 18, -55], [18, -17, 27, -43, MEÑIQUE]), [cx, cy, hx, hy] = [-20, -42, 5.6, 4.8];
      return g(x, y, r, `<mask id="chispaOk${id}" maskUnits="userSpaceOnUse" x="-90" y="-130" width="180" height="200"><rect x="-90" y="-130" width="180" height="200" fill="#fff"/><ellipse cx="${cx}" cy="${cy}" rx="${hx}" ry="${hy}" fill="#000"/></mask>` +
        `<g mask="url(#chispaOk${id})">` + silueta(PALMA, ...ds.map(capsula), elipse(cx, cy, 16.5, 15.5)) + entre(ds[0], ds[1]) + entre(ds[1], ds[2]) +
        trazo('M-3.6 -50 L-3.4 -31', 3.2) + `<ellipse cx="${cx}" cy="${cy}" rx="${hx + 1.7}" ry="${hy + 1.7}" fill="none" stroke="${INK}" stroke-width="3.4"/>` +
        trazo('M-36.5 -37 L-27 -40', 3.2) + `<ellipse cx="-29.5" cy="-33.5" rx="2.6" ry="3.6" transform="rotate(-62 -29.5 -33.5)" fill="#fff" opacity=".8"/></g>`);
    },
    // V: el índice y el medio abiertos; el anular y el meñique doblados por delante, y el pulgar encima de ellos
    v: (x, y, r) => {
      const ds = dedos([-8, -24, -20, -60], [3, -25, 13, -61]), dob = [[12, -26, 12, -16, 6.6, 6.2], [19, -21, 19, -12, 6, 5.6]], pul = pulgar(-15, 4, 9, -9);
      return g(x, y, r, silueta(PALMA, ...ds.map(capsula), ...dob.map(capsula), capsula(pul)) + trazo('M5.8 -31 L6.5 -20 M15.6 -26 L15.6 -18', 3.2) + pulgarDelante(pul));
    },
    // El teléfono con la pantalla hacia quien mira: los dedos asoman por detrás a la derecha; la palma lo sostiene abajo,
    // por delante, con el pulgar corto subiendo por el borde izquierdo
    telefono: (x, y, r) => {
      const atras = dedos([8, -68, 30, -69], [8, -51, 32, -51], [8, -34, 29, -34, MEÑIQUE]), pul = pulgar(-15, -8, -21, -32);
      return g(x, y, r, silueta(...atras.map(capsula)) +
        `<rect x="-25" y="-92" width="50" height="88" rx="10" fill="#1b2433" stroke="${INK}" stroke-width="6"/>
        <rect x="-19" y="-84" width="38" height="70" rx="5" fill="${BLUE}"/>
        <rect x="-14" y="-79" width="28" height="7" rx="2.5" fill="#fff" opacity=".95"/>
        <rect x="-14" y="-67" width="12.5" height="16" rx="2.5" fill="#fff" opacity=".85"/><rect x="1.5" y="-67" width="12.5" height="16" rx="2.5" fill="#fff" opacity=".85"/>
        <rect x="-14" y="-46" width="28" height="6" rx="3" fill="${CREAM}"/>
        <rect x="-14" y="-35" width="18" height="5" rx="2.5" fill="#fff" opacity=".6"/>` +
        silueta('M-24 -8 C-24 -16 -12 -18 0 -18 C12 -18 24 -16 24 -8 L22 12 C18 24 -18 24 -22 12 Z', capsula(pul)) + uña(pul));
    },
    // Por detrás: el dorso del puño con los nudillos; el índice arriba con la uña
    puñoAtras: (x, y, r) => g(x, y, r, silueta(PUÑO_NUDILLOS) + trazo('M-12 -19 L-12 -12 M0 -20 L0 -13 M12 -20 L12 -13', 3.2) +
      trazo('M-14 0 L-12 12 M0 0 L0 13 M14 0 L12 12', 2.5, .4)),
    indiceAtras: (x, y, r) => {
      const ind = dedos([-17, -18, -16, -66])[0];
      return g(x, y, r, silueta(PUÑO_NUDILLOS, capsula(ind)) +
        `<path d="M-21 -66 C-21 -73 -11 -73 -11 -66 L-11 -59 C-13 -56 -19 -56 -21 -59 Z" fill="#fff" stroke="${INK}" stroke-width="2.5"/>` +
        trazo('M-9.6 -25 L-9.6 -16 M0 -21 L0 -13 M12 -21 L12 -13', 3.2) + trazo('M-14 0 L-12 12 M0 0 L0 13 M14 0 L12 12', 2.5, .4));
    },
  };
  const ang = (e, w) => Math.atan2(w[0] - e[0], -(w[1] - e[1])) * 180 / Math.PI;
  // Brazo: hombro -> codo -> muñeca (tubo de tinta con camisa adentro) y la mano según el antebrazo.
  // b.espejo: la misma mano al revés (el pulgar del otro lado), para la mano izquierda vista de frente.
  // b.objeto: lo que agarra la mano (una llave, una lupa), en coordenadas de la mano y por debajo de los dedos.
  const brazo = (lado, b, id = 0) => {
    const [hx, hy] = HOMBRO[lado], c = b.codo, m = b.muñeca, r = ang(c, m) + (b.giro || 0);
    const d = `M${hx} ${hy} Q${f(c[0])} ${f(c[1])} ${f(m[0])} ${f(m[1])}`;
    let mano = b.mano && MANOS[b.mano] ? MANOS[b.mano](m[0], m[1], r, `${id}${lado}`) : '';
    if (mano && b.espejo) mano = `<g transform="translate(${f(m[0])} ${f(m[1])}) rotate(${f(r)}) scale(-1 1) rotate(${f(-r)}) translate(${f(-m[0])} ${f(-m[1])})">${mano}</g>`;
    if (b.objeto) mano = g(m[0], m[1], r, b.objeto) + mano;
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="${d}" fill="none" stroke="${SHIRT}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
            <mask id="manga${id}${lado}"><path d="${d}" fill="none" stroke="#fff" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/></mask>
            <g mask="url(#manga${id}${lado})"><path d="${d}" transform="translate(17 11)" fill="none" stroke="${SHIRT_SOMBRA}" stroke-width="40" stroke-linecap="round"/>
              <path d="${d}" transform="translate(-12 -7)" fill="none" stroke="#2a3b63" stroke-width="7" stroke-linecap="round"/></g>${mano}`;
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
  // La mano del lado izquierdo (L) con las dos manos a la vista va en espejo: el pulgar hacia el centro, como la derecha.
  // Antes era la misma mano copiada (lo vio Andrés el 06/11 en "celebra"); corregido en celebra, explica y hombros.
  const REPOSO_L = { codo: [116, 370], muñeca: [112, 446], mano: 'palma', giro: 0 };
  const REPOSO_R = { codo: [284, 370], muñeca: [288, 446], mano: 'palma', giro: 0 };
  const POSES = {
    habla: { L: REPOSO_L, R: REPOSO_R },
    señala: { L: REPOSO_L, R: { codo: [318, 330], muñeca: [318, 250], mano: 'indice', giro: 0 } },
    explica: { L: { codo: [104, 384], muñeca: [150, 334], mano: 'palma', giro: -20, espejo: true }, R: { codo: [296, 384], muñeca: [250, 334], mano: 'palma', giro: 20 } },
    pulgar: { L: REPOSO_L, R: { codo: [306, 392], muñeca: [300, 318], mano: 'pulgar', giro: 0 } },
    brazos: { L: { codo: [108, 404], muñeca: [276, 372], mano: 'puño', giro: 90 }, R: { codo: [292, 396], muñeca: [124, 356], mano: 'puño', giro: -90 }, orden: 'RL' },
    hombros: { L: { codo: [94, 372], muñeca: [84, 290], mano: 'palma', giro: -10, espejo: true }, R: { codo: [306, 372], muñeca: [316, 290], mano: 'palma', giro: 10 } },
    saluda: { L: REPOSO_L, R: { codo: [334, 318], muñeca: [330, 232], mano: 'palma', giro: 8 } },
    celebra: { L: { codo: [94, 392], muñeca: [102, 318], mano: 'pulgar', giro: 0, espejo: true }, R: { codo: [306, 392], muñeca: [298, 318], mano: 'pulgar', giro: 0 } },
    piensa: { L: REPOSO_L, R: { codo: [306, 392], muñeca: [212, 288], mano: 'puño', giro: 44 } },
    // C-195: manos nuevas en poses nuevas
    // El OK junto a la cara, con el aro sobre el fondo azul (sobre la camisa oscura el hueco no se leía)
    ok: { L: REPOSO_L, R: { codo: [318, 380], muñeca: [318, 292], mano: 'ok', giro: -14 } },
    victoria: { L: REPOSO_L, R: { codo: [332, 324], muñeca: [326, 240], mano: 'v', giro: 6 } },
    telefono: { L: REPOSO_L, R: { codo: [302, 398], muñeca: [258, 344], mano: 'telefono', giro: 36 } },
    presenta: { L: REPOSO_L, R: { codo: [326, 370], muñeca: [352, 322], mano: 'palmaJunta', giro: 4 } },
  };
  const INC_POSE = { señala: 3, pulgar: 2, brazos: -2, hombros: -5, saluda: 4, piensa: -7, celebra: 0, explica: 0, ok: 2, victoria: 4, telefono: -4, presenta: 5 };
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
    cabeza: { inc: 0, dx: 0, dy: 0 }, pelo: 0, cuerpo: 1, cuerpoInc: 0,
    ojos: { abre: 1, mx: 0, my: 0, forma: 'normal' },
    cejas: { alto: 0, duda: 0, enojo: 0, triste: 0 },
    boca: { abre: 0, ancho: .5, sonrisa: .5, dientes: false, lado: 0 },
    rubor: .5, fondo: true,
  });
  const CEJAS = {
    normal: { alto: 0, duda: 0, enojo: 0, triste: 0 }, arriba: { alto: 1, duda: 0, enojo: 0, triste: 0 }, duda: { alto: .2, duda: 1, enojo: 0, triste: 0 },
    enojo: { alto: -.3, duda: 0, enojo: 1, triste: 0 }, triste: { alto: .1, duda: 0, enojo: 0, triste: 1 },
  };
  const OJOS = {
    abiertos: { abre: 1, forma: 'normal' }, cerrados: { abre: 0, forma: 'normal' }, sorpresa: { abre: 1.15, forma: 'normal' }, guino: { abre: 1, forma: 'guino' },
    feliz: { abre: 1, forma: 'feliz' }, sonrie: { abre: 1, forma: 'sonrie' }, entrecerrados: { abre: .95, forma: 'entrecerrado' },
  };
  const BOCAS = {
    sonrisa: { abre: 0, ancho: .5, sonrisa: .6, dientes: false, lado: 0 }, seria: { abre: 0, ancho: .45, sonrisa: 0, dientes: false, lado: 0 },
    a: { abre: .85, ancho: .55, sonrisa: .2, dientes: true, lado: 0 }, e: { abre: .45, ancho: .85, sonrisa: .3, dientes: true, lado: 0 },
    i: { abre: .28, ancho: .95, sonrisa: .5, dientes: true, lado: 0 }, o: { abre: .72, ancho: .08, sonrisa: 0, dientes: false, lado: 0 },
    u: { abre: .42, ancho: .12, sonrisa: 0, dientes: false, lado: 0 }, feliz: { abre: .55, ancho: .8, sonrisa: 1, dientes: true, lado: 0 },
    // C-195
    risa: { abre: .95, ancho: .9, sonrisa: 1, dientes: true, lado: 0 }, sorpresa: { abre: .9, ancho: .16, sonrisa: -.1, dientes: false, lado: 0 },
    triste: { abre: 0, ancho: .42, sonrisa: -.75, dientes: false, lado: 0 }, ups: { abre: .32, ancho: .9, sonrisa: -.35, dientes: true, lado: 0 },
    picara: { abre: 0, ancho: .55, sonrisa: .45, dientes: false, lado: .9 }, duda: { abre: 0, ancho: .4, sonrisa: .05, dientes: false, lado: -.8 },
  };
  // C-195: expresiones listas (ojos, cejas, boca, mirada y rubor juntos), para chispa({ expresion }) y las claves de linea()
  const EXPRESIONES = {
    alegre: { ojos: 'sonrie', cejas: 'normal', boca: 'feliz', rubor: .7 },
    risa: { ojos: 'feliz', cejas: 'arriba', boca: 'risa', rubor: .85 },
    sorpresa: { ojos: 'sorpresa', cejas: 'arriba', boca: 'sorpresa', rubor: .4 },
    pensativo: { ojos: 'abiertos', cejas: 'duda', boca: 'duda', mirar: [.7, -.9], rubor: .35 },
    picaro: { ojos: 'guino', cejas: 'duda', boca: 'picara', rubor: .6 },
    apenado: { ojos: 'abiertos', cejas: 'triste', boca: 'ups', mirar: [-.4, .5], rubor: .85 },
    orgulloso: { ojos: 'entrecerrados', cejas: 'normal', boca: 'picara', rubor: .55 },
    triste: { ojos: 'abiertos', cejas: 'triste', boca: 'triste', mirar: [0, .7], rubor: .3 },
  };
  // C-195: miradas con intención, por nombre (linea acepta mirar: 'telefono' además de [mx, my])
  const MIRADAS = { camara: [0, 0], derecha: [1, 0], izquierda: [-1, 0], arriba: [.3, -1], abajo: [0, 1], telefono: [.6, .8], producto: [.9, .2] };
  const miradaDe = (v) => (typeof v === 'string' ? MIRADAS[v] || [0, 0] : v);
  const brazosDe = (vista, pose) => (vista === 'espalda' ? POSES_ESPALDA[pose] || POSES_ESPALDA.espalda : POSES[pose] || POSES.habla);

  const rig = (e) => {
    const id = ++uid;
    // entre: un aparato entre los dos brazos (el primero lo sostiene por detrás, el segundo trabaja por delante)
    const brazos = () => e.orden === 'RL' ? brazo('R', e.R, id) + (e.entre || '') + brazo('L', e.L, id) : brazo('L', e.L, id) + (e.entre || '') + brazo('R', e.R, id);
    const cab = e.cabeza, sy = e.cuerpo, sx = 1 + (1 - sy) * .6;
    const cuerpo = `translate(200 420) rotate(${f(e.cuerpoInc || 0)}) scale(${f(sx * 1000) / 1000} ${f(sy * 1000) / 1000}) translate(-200 -420)`;
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
  const chispa = ({ pose = 'habla', boca, ojos, cejas, fondo = true, expresion } = {}) => {
    // C-195: una expresión pone ojos, cejas, boca, mirada y rubor; lo que se pase aparte manda
    const ex = EXPRESIONES[expresion] || {};
    boca = boca ?? ex.boca ?? 'sonrisa'; ojos = ojos ?? ex.ojos ?? 'abiertos'; cejas = cejas ?? ex.cejas ?? 'normal';
    const e = ESTADO(), espalda = pose.startsWith('espalda');
    if (ex.mirar) [e.ojos.mx, e.ojos.my] = ex.mirar;
    if (ex.rubor !== undefined) e.rubor = ex.rubor;
    e.vista = espalda ? 'espalda' : 'frente'; e.fondo = fondo;
    let b = brazosDe(e.vista, pose);
    if (pose === 'espalda-libre') {
      const l = window.CHISPA_L || {}, r = window.CHISPA_R || {};
      b = { L: { ...L_ATRAS, giro: 0, ...l }, R: { ...R_ATRAS, giro: 0, ...r } };
    }
    e.L = b.L; e.R = b.R; e.orden = b.orden || 'LR'; e.cabeza.inc = INC_POSE[pose] || 0;
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
  // C-195: movimiento natural (pedido de Andrés el 06/11). Un gesto dura un poco más (0,42 s) y tiene tres tiempos:
  // un impulso corto hacia atrás (anticipación), el viaje y un rebote al llegar.
  const DUR_GESTO = .42;
  const anticipa = (x) => (x < .16 ? -.06 * Math.sin((Math.PI * x) / .16) : backOut((x - .16) / .84, 1.4));
  // La mano viaja en curva, abombada hacia afuera del cuerpo, no en línea recta
  const curva = (a, b, x) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < 4) return [0, 0];
    let nx = -dy / L, ny = dx / L;
    if (nx * ((a[0] + b[0]) / 2 - 200) + ny * ((a[1] + b[1]) / 2 - 330) < 0) { nx = -nx; ny = -ny; }
    const s = Math.sin(Math.PI * clamp(x)) * Math.min(L * .2, 26);
    return [nx * s, ny * s];
  };

  // linea(claves): claves = [{ t, pose?, vista?, ojos?, cejas?, boca?, mirar?:[mx,my]|'telefono', inc?, feliz?, expresion?, rubor? }].
  // Cada campo pasa suave de su valor anterior al nuevo. C-195: `expresion` pone ojos, cejas, boca, mirada y rubor (lo que
  // la clave diga aparte manda), y la mirada se puede pedir por nombre (MIRADAS).
  const linea = (claves) => {
    const ks = [...claves].map((k) => {
      const ex = EXPRESIONES[k.expresion];
      return ex ? { ojos: ex.ojos, cejas: ex.cejas, boca: ex.boca, ...(ex.mirar ? { mirar: ex.mirar } : {}), ...(ex.rubor !== undefined ? { rubor: ex.rubor } : {}), ...k } : k;
    }).sort((a, b) => a.t - b.t);
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
      // C-195: anticipación y rebote, la mano en curva, y la muñeca gira un instante después que el brazo
      const bA = brazosDe(e.vista, p.prev), bB = brazosDe(e.vista, p.cur), x = clamp(p.x / DUR_GESTO), k = anticipa(x), kg = anticipa(clamp((p.x - .06) / DUR_GESTO));
      const mano = (a, b) => {
        const m = mezcla(a, b, k);
        m.giro = lerp(a.giro || 0, b.giro || 0, kg);
        const cm = curva(a.muñeca, b.muñeca, x), cc = curva(a.codo, b.codo, x);
        m.muñeca = [m.muñeca[0] + cm[0], m.muñeca[1] + cm[1]];
        m.codo = [m.codo[0] + cc[0] * .5, m.codo[1] + cc[1] * .5];
        const llega = k >= .35;
        m.mano = llega ? (b.mano || a.mano) : (a.mano || b.mano);
        m.espejo = llega ? b.espejo : a.espejo;
        return m;
      };
      e.L = mano(bA.L, bB.L); e.R = mano(bA.R, bB.R); e.orden = (k < .5 ? bA.orden : bB.orden) || 'LR';
      // el cuerpo y la cabeza acompañan el gesto: se inclinan un poco hacia donde va la mano, y la cabeza baja en el impulso
      const haciaX = (bB.R.muñeca[0] - bA.R.muñeca[0]) + (bB.L.muñeca[0] - bA.L.muñeca[0]);
      e.cuerpoInc = Math.sin(Math.PI * x) * clamp(haciaX / 140, -1, 1) * 1.6;
      const o = valor('ojos', 'abiertos', t), oj = mezcla(OJOS[o.prev] || OJOS.abiertos, OJOS[o.cur] || OJOS.abiertos, easeInOut(clamp(o.x / .12)));
      Object.assign(e.ojos, oj);
      const c = valor('cejas', 'normal', t); Object.assign(e.cejas, mezcla(CEJAS[c.prev] || CEJAS.normal, CEJAS[c.cur] || CEJAS.normal, backOut(clamp(c.x / .25), 1.2)));
      const m = valor('mirar', [0, 0], t), mm = mezcla(miradaDe(m.prev), miradaDe(m.cur), easeInOut(clamp(m.x / .18))); e.ojos.mx = mm[0]; e.ojos.my = mm[1];
      const i = valor('inc', 0, t); e.cabeza.inc = mezcla(i.prev, i.cur, easeInOut(clamp(i.x / .4))) + mezcla(INC_POSE[p.prev] || 0, INC_POSE[p.cur] || 0, easeInOut(clamp(p.x / .45)));
      e.cabeza.inc += Math.sin(Math.PI * x) * clamp(haciaX / 140, -1, 1) * 2.4;
      if (x < .16) e.cabeza.dy += Math.sin((Math.PI * x) / .16) * 1.6;
      const fz = valor('feliz', false, t); e.boca.sonrisa = mezcla(fz.prev ? 1 : .5, fz.cur ? 1 : .5, clamp(fz.x / .2)); e.rubor = .45 + (fz.cur ? .25 : 0);
      const ru = valor('rubor', null, t); if (ru.cur !== null) e.rubor = mezcla(ru.prev ?? .45, ru.cur, easeInOut(clamp(ru.x / .3)));
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
  const PARPADEAN = ['normal', 'sonrie', 'entrecerrado'];
  const vida = (e, t, { rms = null } = {}) => {
    if (PARPADEAN.includes(e.ojos.forma) && e.ojos.abre > .5) e.ojos.abre *= parpadeo(t);
    // C-195: parpadea al cambiar de gesto, como una persona
    if (PARPADEAN.includes(e.ojos.forma) && e.cambioPose !== undefined && e.cambioPose > .03 && e.cambioPose < .15) e.ojos.abre *= 1 - Math.sin(((e.cambioPose - .03) / .12) * Math.PI) * .92;
    e.cuerpo = 1 + Math.sin(t * 2.1) * .006;
    const habla = rms ? clamp((rms + 40) / 22) : 0;
    e.cabeza.inc += Math.sin(t * 1.3) * 1.2 + Math.sin(t * 7.1) * habla * 1.6;
    e.cabeza.dy += -habla * 1.5;
    // al cambiar de pose, el cuerpo hace un pequeño rebote
    if (e.cambioPose !== undefined && e.cambioPose < .3) e.cuerpo *= 1 - Math.sin(e.cambioPose / .3 * Math.PI) * .025;
    e.pelo = -Math.cos(t * 1.3) * 1.1 - Math.cos(t * 7.1) * habla * 1.2;
    if (e.cambioPose !== undefined && e.cambioPose < .8) e.pelo += Math.sin(e.cambioPose * 24) * Math.exp(-e.cambioPose * 6) * 4;
    return e;
  };

  // ángulo de la mano (grados): para dibujar un objeto que apunte a un punto del mundo
  chispa.anguloMano = (b) => ang(b.codo, b.muñeca) + (b.giro || 0);
  // C-195: una mano sola (para revisarla de cerca o usarla en una pieza): <g> en (x, y), girada r grados
  chispa.mano = (nombre, x = 0, y = 0, r = 0) => (MANOS[nombre] ? MANOS[nombre](x, y, r) : '');
  chispa.rig = rig; chispa.estado = ESTADO; chispa.linea = linea; chispa.labios = labios; chispa.vida = vida; chispa.mezcla = mezcla;
  window.chispa = chispa;
  window.CHISPA = { POSES: Object.keys(POSES).concat(Object.keys(POSES_ESPALDA)), BOCAS: Object.keys(BOCAS), OJOS: Object.keys(OJOS), CEJAS: Object.keys(CEJAS), EXPRESIONES: Object.keys(EXPRESIONES), MIRADAS: Object.keys(MIRADAS), MANOS: Object.keys(MANOS), CREAM, BLUE };
})();
