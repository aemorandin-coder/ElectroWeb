#!/usr/bin/env bash
# Inventario de solo lectura de los paneles admin y cliente (G-20). No modifica archivos.
# Uso (desde la raíz del repo): bash docs/plan/scripts/inventario-paneles.sh > /tmp/inventario.md
cd "$(git rev-parse --show-toplevel)" || exit 1
RUTAS=(app/admin components/admin app/customer components/customer)

echo "## 1. Rutas rotas (fetch a APIs y enlaces a páginas que no existen)"
node docs/plan/scripts/rutas-rotas.js "${RUTAS[@]}"

echo
echo "## 2. Patrones prohibidos (total y archivos con más casos)"
check() {
  local name="$1" re="$2"
  echo "### $name: $(grep -rnE "$re" "${RUTAS[@]}" | wc -l)"
  grep -rcE "$re" "${RUTAS[@]}" | grep -v ':0$' | sort -t: -k2 -rn | head -10 | sed 's/^/- /'
}
check 'alert/confirm/prompt nativos' '(^|[^.a-zA-Z])(alert|confirm|prompt)\('
check 'console.log' 'console\.log'
check 'any' ': any\b|as any\b|<any>'
check '<img> sin next/image' '<img\b'
check 'window.innerWidth' 'innerWidth'
check 'z-index gigante' 'z-\[[0-9]{3,}\]|zIndex: ?[0-9]{3,}'
check 'hex en className' '\-\[#[0-9a-fA-F]{3,8}\]'
check 'style jsx' '<style jsx'
check 'font-black / text-[9px-10px]' 'font-black|text-\[(8|9|10)px\]'
check 'onClick en div/span' '<(div|span|li|tr|td)\b[^>]*onClick'
check 'TODO / mock / datos falsos' 'TODO|FIXME|[Pp]róximamente|[Cc]oming soon|mock[A-Z_]|[Dd]ummy|[Ll]orem'
check 'setTimeout (posible espera falsa)' 'setTimeout\('

echo
echo "## 3. Semántica por página"
echo "| Página | Líneas | <h1> | <button> | con type= | <input>/<select>/<textarea> | <label> / aria-label |"
echo "|---|---|---|---|---|---|---|"
find app/admin app/customer -name 'page.tsx' | sort | while read -r f; do
  printf '| %s | %s | %s | %s | %s | %s | %s |\n' "${f#app/}" "$(wc -l < "$f")" \
    "$(grep -c '<h1' "$f")" "$(grep -oE '<button\b' "$f" | wc -l)" "$(grep -oE '<button\b[^>]*type=' "$f" | wc -l)" \
    "$(grep -oE '<(input|select|textarea)\b' "$f" | wc -l)" "$(( $(grep -oE '<label\b' "$f" | wc -l) + $(grep -oE 'aria-label=' "$f" | wc -l) ))"
done

echo
echo "## 4. ESLint (por regla)"
npx eslint "${RUTAS[@]}" -f json 2>/dev/null | node -e '
let d = ""; process.stdin.on("data", (c) => (d += c)).on("end", () => {
  const byRule = {}, byFile = {}; let e = 0, w = 0;
  for (const f of JSON.parse(d)) for (const m of f.messages) {
    byRule[m.ruleId] = (byRule[m.ruleId] || 0) + 1; m.severity === 2 ? e++ : w++;
    const k = f.filePath.replace(process.cwd() + "/", ""); byFile[k] = (byFile[k] || 0) + 1;
  }
  console.log(`Errores: ${e} · Avisos: ${w}`);
  Object.entries(byRule).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`- ${k}: ${v}`));
  console.log("\nArchivos con más problemas:");
  Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(`- ${k}: ${v}`));
});'

echo
echo "## 5. TypeScript (errores en los paneles)"
npx tsc --noEmit 2>&1 | grep -E '^(app/admin|components/admin|app/customer|components/customer)' | head -40
echo "(fin)"
