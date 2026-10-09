// Chispa, la mascota de Electro Shop: ilustración en tinta (SVG) con poses y bocas intercambiables.
// chispa({ pose, boca, ojos, cejas }) devuelve el <svg> como texto. viewBox 0 0 400 420.
(function () {
  const INK = '#111317', SKIN = '#fff8ee', SHIRT = '#16213a', BLUE = '#2a63cd', CREAM = '#f4efe4';
  const S = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
  const s4 = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

  // Pelo: mechones en punta con brillo; se dibuja detrás y delante de la frente
  const peloAtras = `<path d="M110 168 C96 120 118 74 166 58 C192 40 236 40 262 56 C304 70 320 112 300 168 Z" fill="${INK}"/>`;
  const peloDelante = `
    <path d="M118 150 C114 104 140 72 180 64 C214 56 252 62 276 84 C296 102 302 128 296 152
             C284 136 272 128 262 126 L268 146 C252 128 236 120 222 118 L226 140 C210 122 192 116 176 118 L178 140
             C164 124 150 120 140 124 C132 132 126 142 118 150 Z" fill="${INK}"/>
    <path d="M178 62 C186 40 206 34 222 40 C210 44 202 52 200 62 Z" fill="${INK}"/>
    <path d="M226 60 C240 44 262 44 274 54 C258 54 248 58 240 66 Z" fill="${INK}"/>
    <path d="M136 110 C150 96 160 92 172 92 M248 96 C262 102 272 112 278 124 M160 82 C170 76 182 74 192 74" fill="none" stroke="#3a3f4a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M150 92 C162 78 180 72 196 72" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    <path d="M236 76 C252 78 266 86 274 98" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45"/>`;

  const cara = `
    <path d="M128 140 C124 196 140 248 200 262 C260 248 276 196 272 140 C262 120 240 112 200 112 C160 112 138 120 128 140 Z" fill="${SKIN}" ${S}/>
    <path d="M128 176 C112 170 106 188 114 200 C120 210 130 210 134 204" fill="${SKIN}" ${S}/>
    <path d="M272 176 C288 170 294 188 286 200 C280 210 270 210 266 204" fill="${SKIN}" ${S}/>
    <path d="M196 196 C192 206 194 212 204 212" fill="none" ${s4}/>
    <path d="M150 214 C156 218 162 218 166 214 M234 214 C238 218 244 218 250 214" fill="none" stroke="#f2b8a8" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;

  const OJOS = {
    abiertos: `<ellipse cx="166" cy="176" rx="11" ry="15" fill="${INK}"/><ellipse cx="234" cy="176" rx="11" ry="15" fill="${INK}"/>
               <circle cx="170" cy="170" r="4" fill="#fff"/><circle cx="238" cy="170" r="4" fill="#fff"/>`,
    cerrados: `<path d="M154 178 C160 186 172 186 178 178 M222 178 C228 186 240 186 246 178" fill="none" ${S}/>`,
    sorpresa: `<ellipse cx="166" cy="174" rx="12" ry="17" fill="${INK}"/><ellipse cx="234" cy="174" rx="12" ry="17" fill="${INK}"/>
               <circle cx="171" cy="167" r="4.5" fill="#fff"/><circle cx="239" cy="167" r="4.5" fill="#fff"/>`,
    guino: `<ellipse cx="166" cy="176" rx="11" ry="15" fill="${INK}"/><circle cx="170" cy="170" r="4" fill="#fff"/>
            <path d="M222 180 C228 172 240 172 246 180" fill="none" ${S}/>`,
  };
  const CEJAS = {
    normal: `<path d="M150 150 C158 144 172 144 180 148 M220 148 C228 144 242 144 250 150" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
    arriba: `<path d="M150 142 C158 134 172 134 180 138 M220 138 C228 134 242 134 250 142" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
    duda: `<path d="M150 146 C158 140 172 142 180 148 M220 140 C228 134 242 136 250 140" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
  };
  const BOCAS = {
    sonrisa: `<path d="M180 230 C192 240 210 240 222 230" fill="none" ${S}/>`,
    a: `<path d="M180 226 C186 250 216 250 222 226 Z" fill="${INK}" ${s4}/><path d="M190 240 C196 246 208 246 212 240" fill="#e86a5c"/>`,
    e: `<path d="M178 228 C190 240 212 240 224 228 C212 234 190 234 178 228 Z" fill="${INK}" ${s4}/>`,
    o: `<ellipse cx="201" cy="234" rx="10" ry="12" fill="${INK}"/>`,
    feliz: `<path d="M174 224 C182 252 220 252 228 224 Z" fill="${INK}" ${s4}/><path d="M178 226 L224 226 L222 232 L180 232 Z" fill="#fff"/><path d="M188 242 C196 248 206 248 214 242" fill="#e86a5c"/>`,
    seria: `<path d="M186 234 L216 234" fill="none" ${S}/>`,
  };

  // Torso: cuello, hombros redondeados y pecho; los brazos salen de los hombros (ver ARMS)
  const HOMBRO = { L: [136, 306], R: [264, 306] };
  const torso = `
    <path d="M186 256 L186 290 L214 290 L214 256" fill="${SKIN}" ${S}/>
    <path d="M104 420 L108 340 C110 310 128 292 160 284 L240 284 C272 292 290 310 292 340 L296 420 Z" fill="${SHIRT}" ${S}/>
    <path d="M176 282 L200 312 L224 282 Z" fill="${SKIN}" ${s4}/>
    <path d="M168 280 L200 316 L188 330 L158 290 Z M232 280 L200 316 L212 330 L242 290 Z" fill="${BLUE}" ${s4}/>
    <path d="M200 330 L200 420" stroke="#2b3a5c" stroke-width="3" stroke-linecap="round"/>
    <g transform="translate(220 344)"><rect x="0" y="0" width="38" height="28" rx="6" fill="#fff" ${s4}/>
      <text x="19" y="20" text-anchor="middle" font-family="Tektrron, Poppins" font-size="14" font-weight="700" fill="${BLUE}">ES</text></g>`;

  // Brazos: tubo con contorno de tinta (dos trazos superpuestos) y manos grandes
  const brazo = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="50" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${SHIRT}" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>`;
  const puño = (x, y, r = 0) => `<rect x="${x - 24}" y="${y - 20}" width="48" height="40" rx="17" transform="rotate(${r} ${x} ${y})" fill="${SKIN}" ${S}/>`;
  const dedo = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${SKIN}" stroke-width="11" stroke-linecap="round"/>`;
  const palmaAbierta = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})">
      ${dedo(-15, -14, -22, -46)}${dedo(-4, -18, -6, -54)}${dedo(8, -18, 10, -54)}${dedo(18, -12, 24, -44)}${dedo(-20, 6, -40, -10)}
      <path d="M-26 -6 C-28 -22 -16 -24 0 -24 C16 -24 28 -22 26 -6 L24 14 C20 30 -20 30 -24 14 Z" fill="${SKIN}" ${S}/>
      <path d="M-8 4 C-2 8 6 8 10 4" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".5"/></g>`;
  const señalando = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})">
      ${dedo(0, -16, 0, -66)}
      <rect x="-24" y="-20" width="48" height="42" rx="17" fill="${SKIN}" ${S}/>
      <path d="M-14 -4 L14 -4 M-14 8 L14 8" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      ${dedo(-22, 0, -34, -16)}</g>`;
  const pulgarArriba = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})">
      ${dedo(-12, -16, -14, -60)}
      <rect x="-26" y="-20" width="52" height="46" rx="17" fill="${SKIN}" ${S}/>
      <path d="M-10 -6 L22 -6 M-10 6 L22 6 M-10 17 L22 17" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/></g>`;
  // Cada brazo: hombro → codo → muñeca, con su mano orientada según el antebrazo. null en mano = la mano queda fuera del cuadro.
  const ang = (e, w) => Math.atan2(w[0] - e[0], -(w[1] - e[1])) * 180 / Math.PI;
  const MANOS = { palma: palmaAbierta, indice: señalando, pulgar: pulgarArriba,
    puño: (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-24" y="-22" width="48" height="44" rx="18" fill="${SKIN}" ${S}/><path d="M-12 -6 L12 -6 M-12 6 L12 6" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/></g>` };
  const arm = (lado, codo, muñeca, mano, giro = 0) => {
    const [hx, hy] = HOMBRO[lado];
    const d = `M${hx} ${hy} Q${codo[0]} ${codo[1]} ${muñeca[0]} ${muñeca[1]}`;
    const extremo = mano ? MANOS[mano](muñeca[0], muñeca[1], ang(codo, muñeca) + giro) : '';
    const puñoManga = mano ? `<path d="M${muñeca[0]} ${muñeca[1]} L${muñeca[0]} ${muñeca[1]}" stroke="${INK}" stroke-width="50" stroke-linecap="round"/>` : '';
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="${d}" fill="none" stroke="${SHIRT}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="${d}" fill="none" stroke="#2b3a5c" stroke-width="3" stroke-linecap="round" stroke-dasharray="0 999" />${extremo}`;
  };
  const reposoL = arm('L', [116, 370], [112, 446], null), reposoR = arm('R', [284, 370], [288, 446], null);
  const POSES = {
    habla: `${reposoL}${reposoR}`,
    señala: `${reposoL}${arm('R', [318, 330], [318, 250], 'indice')}`,
    explica: `${arm('L', [104, 384], [150, 334], 'palma', -20)}${arm('R', [296, 384], [250, 334], 'palma', 20)}`,
    pulgar: `${reposoL}${arm('R', [306, 392], [300, 318], 'pulgar')}`,
    brazos: `${arm('R', [292, 396], [124, 356], 'puño', -90)}${arm('L', [108, 404], [276, 372], 'puño', 90)}`,
    hombros: `${arm('L', [94, 372], [84, 290], 'palma', -10)}${arm('R', [306, 372], [316, 290], 'palma', 10)}`,
  };

  // ---------- Vista de espalda: nuca con corte en V, camisa con la placa ES grande ----------
  const cabezaEspalda = `
    <path d="M128 176 C112 170 106 188 114 200 C120 210 130 210 134 204" fill="${SKIN}" ${S}/>
    <path d="M272 176 C288 170 294 188 286 200 C280 210 270 210 266 204" fill="${SKIN}" ${S}/>
    <path d="M128 140 C124 196 140 248 200 262 C260 248 276 196 272 140 C262 120 240 112 200 112 C160 112 138 120 128 140 Z" fill="${SKIN}" ${S}/>
    <path d="M116 168 C104 114 128 70 170 58 C192 40 236 40 262 56 C300 72 298 116 284 168
             C280 184 272 194 262 198 L244 204 L200 240 L156 204 L138 198 C128 194 120 184 116 168 Z" fill="${INK}"/>
    <path d="M178 62 C186 40 206 34 222 40 C210 44 202 52 200 62 Z M226 60 C240 44 262 44 274 54 C258 54 248 58 240 66 Z" fill="${INK}"/>
    <path d="M156 204 L200 240 L244 204" fill="none" stroke="#3a3f4a" stroke-width="3" stroke-linecap="round"/>
    <path d="M164 192 L200 222 L236 192 M172 178 L200 202 L228 178" fill="none" stroke="#2c3038" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M150 226 C160 238 170 246 184 252 M250 226 C240 238 230 246 216 252" fill="none" stroke="#e9d9c4" stroke-width="4" stroke-linecap="round"/>
    <path d="M150 96 C166 82 186 76 204 76 M232 82 C250 88 264 100 270 116 M140 130 C150 116 162 108 176 104" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".4"/>`;
  const torsoEspalda = `
    <path d="M186 256 L186 290 L214 290 L214 256" fill="${SKIN}" ${S}/>
    <path d="M104 420 L108 340 C110 310 128 292 160 284 L240 284 C272 292 290 310 292 340 L296 420 Z" fill="${SHIRT}" ${S}/>
    <path d="M164 284 C176 296 224 296 236 284 L240 276 C222 288 178 288 160 276 Z" fill="${BLUE}" ${s4}/>
    <g transform="translate(166 326)"><rect x="0" y="0" width="68" height="48" rx="10" fill="#fff" ${s4}/>
      <text x="34" y="34" text-anchor="middle" font-family="Tektrron, Poppins" font-size="24" font-weight="700" fill="${BLUE}">ES</text></g>
    <path d="M200 380 L200 420" stroke="#2b3a5c" stroke-width="3" stroke-linecap="round"/>`;
  const libre = () => { const r = window.CHISPA_R || { codo: [284, 370], muñeca: [288, 446] }; return `${reposoL}${arm('R', r.codo, r.muñeca, r.muñeca[1] < 420 ? 'indice' : null)}`; };
  const POSES_ESPALDA = {
    'espalda-libre': '',
    espalda: `${reposoL}${reposoR}`,
    'espalda-señala': `${reposoL}${arm('R', [326, 300], [332, 214], 'indice')}`,
    'espalda-señala-alto': `${reposoL}${arm('R', [300, 250], [312, 166], 'indice')}`,
    'espalda-dos': `${arm('L', [76, 300], [70, 220], 'palma', -10)}${arm('R', [324, 300], [330, 220], 'palma', 10)}`,
  };

  window.chispa = ({ pose = 'habla', boca = 'sonrisa', ojos = 'abiertos', cejas = 'normal', fondo = true } = {}) => `
<svg viewBox="0 0 400 420" xmlns="http://www.w3.org/2000/svg">
  ${fondo ? `<circle cx="200" cy="232" r="150" fill="${BLUE}"/><circle cx="200" cy="232" r="166" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round" opacity=".5"/>` : ''}
  ${pose === 'espalda-libre' ? `<g>${torsoEspalda}${cabezaEspalda}${libre()}</g>` : POSES_ESPALDA[pose] !== undefined ? `<g>${torsoEspalda}${cabezaEspalda}${POSES_ESPALDA[pose]}</g>` : `<g>${peloAtras}${torso}${cara}${peloDelante}${OJOS[ojos]}${CEJAS[cejas]}${BOCAS[boca]}${POSES[pose]}</g>`}
</svg>`;
  window.CHISPA = { POSES: Object.keys(POSES).concat(Object.keys(POSES_ESPALDA)), BOCAS: Object.keys(BOCAS), OJOS: Object.keys(OJOS), CEJAS: Object.keys(CEJAS), CREAM, BLUE };
})();
