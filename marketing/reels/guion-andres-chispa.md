# Guion: "El nuevo del equipo" (Andrés + Chispa) para Google Flow

Video vertical 9:16, 30 s en 3 escenas de 10 s. Andrés de verdad, en su escritorio (la foto de referencia), y Chispa en dibujo 2D que se asoma por detrás del monitor (como en la tienda web). Chispa no tiene piernas: siempre aparece de la cintura para arriba, detrás del monitor.

## Imágenes de referencia
- `Andres_referencia.jpg`: la foto de Andrés, derecha (9:16). **Frame inicial de la escena 1.**
- `Frame_inicial_Chispa.jpg`: la misma foto con Chispa asomado detrás del monitor. **Frame inicial de la escena 2**, si la extensión desde la escena 1 cambia a Chispa.
- `Chispa_hoja_referencia.png` y `Chispa_*.png` (fondo transparente): cómo es Chispa de frente, saludando, señalando, con el pulgar arriba y de espalda. Van como "ingredientes" para que Flow no lo redibuje distinto.

## Escena 1 (0 a 10 s): "Les presento al nuevo"
**Qué pasa:** Andrés en su escritorio mira a cámara y presenta al nuevo del equipo. Detrás del monitor se asoma Chispa y saluda.
- **Andrés:** "Les presento al nuevo del equipo de Electro Shop…"
- **Chispa:** "¡Epa, Venezuela! ¡Soy Chispa!"

**Prompt para Flow (frame inicial: `Andres_referencia.jpg`):**
> Vertical 9:16 live-action video with a 2D cartoon character composited in, mixed-media style. A Latino man in his 30s with short dark hair and a short beard, wearing a plain black t-shirt and a white smartwatch on his left wrist, sits at a dark gray desk in a modern office with black-framed glass walls, a white-and-blue mechanical keyboard and a monitor on the left. He smiles, looks at the camera and says in Venezuelan Spanish, warm and confident: "Les presento al nuevo del equipo de Electro Shop…". He gestures toward the monitor. From behind the monitor, a flat 2D cartoon mascot pops up from the waist up: thick black ink outlines, flat colors, spiky black hair, cream skin, big black oval eyes with white highlights, rosy cheeks, navy shirt with a blue V collar and a small white badge with blue letters "ES". The mascot stays 2D, never 3D, and his lower body stays hidden behind the monitor. He waves happily and says in an energetic young cartoon voice, Venezuelan Spanish: "¡Epa, Venezuela! ¡Soy Chispa!". Natural office light, handheld camera, no on-screen text, no subtitles, no music.

## Escena 2 (10 a 20 s): "Lo que hacemos"
**Qué pasa:** Chispa, apoyado en el borde del monitor, cuenta lo que vende la tienda; Andrés completa con el taller.
- **Chispa:** "Vendemos tecnología, gaming, gift cards y energía… ¡y lo enviamos a toda Venezuela!"
- **Andrés:** "Y si se te daña, nuestro taller lo repara."

**Prompt para Flow (extender la escena 1, o frame inicial `Frame_inicial_Chispa.jpg`):**
> Same scene and same characters. The flat 2D cartoon mascot Chispa leans on the top edge of the monitor, lower body hidden behind it, and counts on his fingers while saying excitedly in Venezuelan Spanish: "Vendemos tecnología, gaming, gift cards y energía… ¡y lo enviamos a toda Venezuela!". The man nods, smiles, then looks at the camera and says: "Y si se te daña, nuestro taller lo repara.", pointing his thumb over his shoulder. Chispa keeps the same 2D design: thick black outlines, flat colors, navy shirt with blue V collar and white "ES" badge. No on-screen text, no subtitles, no music.

## Escena 3 (20 a 30 s): "Cierre"
**Qué pasa:** Andrés y Chispa chocan los puños (Chispa con su puño de dibujo) y los dos terminan con el pulgar arriba a cámara, como en la foto.
- **Andrés:** "Entra a electroshopve.com…"
- **Chispa:** "¡…o escríbenos por WhatsApp! ¡Te esperamos!"

**Prompt para Flow (extender la escena 2):**
> Same scene and same characters. The man turns toward the monitor and bumps fists with the flat 2D cartoon mascot Chispa, who stays behind the monitor from the waist up. The man looks at the camera and says in Venezuelan Spanish: "Entra a electroshopve.com…". Chispa finishes, cheerful: "¡…o escríbenos por WhatsApp! ¡Te esperamos!". Both give a thumbs up to the camera and smile; Chispa winks. Chispa keeps the same 2D cartoon design. No on-screen text, no subtitles, no music.

## Después de Flow (edición)
- **Los textos se ponen en la edición, no en Flow** (Flow escribe mal las letras): el logo, "electroshopve.com" y "WhatsApp +58 257 251 1282".
- **Al final, el cierre de la serie** (el de "¿Y si es estafa?", aprobado el 02/10). Se puede pegar después de los 30 s.
- **La voz de Chispa:** Flow inventa una voz distinta en cada escena. Para que suene siempre igual, se sacan las frases de Chispa con la voz "Diego" de ElevenLabs (la de "La ficha") y se reemplazan en la edición, o se pasa el audio de Flow por el cambiador de voz de ElevenLabs con Diego.
- **Música:** la de Instagram, al publicar.

## Consejos para Flow
- Si Chispa sale en 3D o cambia de cara, regenerar y repetir en el prompt "flat 2D cartoon, thick black outlines, stays 2D".
- Si Flow le inventa piernas o lo saca de detrás del monitor, agregar "his lower body stays hidden behind the monitor at all times".
- Generar 2 o 3 versiones de cada escena y quedarse con la mejor antes de extender a la siguiente.
- Cada escena dura 10 s: las frases ya están medidas para entrar con calma (unas 20 palabras por escena).
