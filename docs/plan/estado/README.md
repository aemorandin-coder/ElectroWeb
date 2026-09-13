# Estado de tareas

Un archivo por tarea, creado por el agente dueño **en el mismo commit** que termina la tarea.

- `C-XX.md` → solo los crea Claude.
- `G-XX.md` → solo los crea Gemini.

Una dependencia está cumplida únicamente si su archivo existe **en `main`** y dice `Estado: HECHO`.

Plantilla:
```
# <ID>
Estado: HECHO            (o: Estado: BLOQUEADO — motivo)
Rama: <claude|gemini>/<ID>
- Archivos: N
- Verificación: <comandos y salida>
- tsc/lint/build: <resultado o "no verificado en ejecución">
- Notas / pedidos al otro agente:
```
