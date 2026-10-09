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

  // Torso: camisa oscura con cuello azul y la placa ES
  const torso = `
    <path d="M200 262 L200 290" ${S}/>
    <path d="M86 420 C84 340 120 292 176 280 L224 280 C280 292 316 340 314 420 Z" fill="${SHIRT}" ${S}/>
    <path d="M176 280 L200 312 L224 280 Z" fill="${SKIN}" ${s4}/>
    <path d="M168 278 L200 316 L188 330 L158 290 Z M232 278 L200 316 L212 330 L242 290 Z" fill="${BLUE}" ${s4}/>
    <g transform="translate(236 334)"><rect x="0" y="0" width="40" height="30" rx="6" fill="#fff" ${s4}/>
      <text x="20" y="21" text-anchor="middle" font-family="Tektrron, Poppins" font-size="15" font-weight="700" fill="${BLUE}">ES</text></g>
    <path d="M120 360 C126 380 128 400 128 420 M280 360 C274 380 272 400 272 420" fill="none" stroke="#2b3a5c" stroke-width="4" stroke-linecap="round"/>
    <path d="M150 300 L140 312 M162 296 L150 312 M246 296 L258 312 M258 300 L268 312" stroke="#2b3a5c" stroke-width="3" stroke-linecap="round"/>`;

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
  const POSES = {
    habla: ``,
    señala: `${brazo('M262 330 C306 318 324 278 320 236')}${señalando(320, 214, 6)}`,
    explica: `${brazo('M140 340 C108 330 100 300 108 276')}${palmaAbierta(108, 258, -14)}
              ${brazo('M262 344 C246 352 228 352 214 344')}${palmaAbierta(208, 330, 64)}`,
    pulgar: `${brazo('M262 340 C304 330 320 300 318 276')}${pulgarArriba(318, 254, 0)}`,
    brazos: `${brazo('M120 360 C150 380 226 376 270 352')}${brazo('M280 360 C250 380 174 376 130 352')}
             ${puño(126, 352, -30)}${puño(274, 352, 30)}`,
    hombros: `${brazo('M118 344 C86 330 76 302 84 274')}${palmaAbierta(84, 256, -30)}
              ${brazo('M282 344 C314 330 324 302 316 274')}${palmaAbierta(316, 256, 30)}`,
  };

  window.chispa = ({ pose = 'habla', boca = 'sonrisa', ojos = 'abiertos', cejas = 'normal', fondo = true } = {}) => `
<svg viewBox="0 0 400 420" xmlns="http://www.w3.org/2000/svg">
  ${fondo ? `<circle cx="200" cy="232" r="150" fill="${BLUE}"/><circle cx="200" cy="232" r="166" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round" opacity=".5"/>` : ''}
  <g>${peloAtras}${torso}${cara}${peloDelante}${OJOS[ojos]}${CEJAS[cejas]}${BOCAS[boca]}${POSES[pose]}</g>
</svg>`;
  window.CHISPA = { POSES: Object.keys(POSES), BOCAS: Object.keys(BOCAS), OJOS: Object.keys(OJOS), CEJAS: Object.keys(CEJAS), CREAM, BLUE };
})();
