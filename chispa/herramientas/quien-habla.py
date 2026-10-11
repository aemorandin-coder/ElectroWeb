# Quién habla en un clip: tono (Hz) cada 0,1 s. Andrés va de 120 a 190 Hz y Chispa de 270 a 360 Hz; "-" es silencio.
# Sirve para encontrar las frases de Chispa que Google Flow dijo con otra voz y reemplazarlas (ver conocimiento/05-videos-reales-con-flow.md).
# Uso: python3 herramientas/quien-habla.py clips/e1.mp4 [clips/e2.mp4 ...]   (necesita numpy)
import sys, subprocess, numpy as np
SR=16000
for f in sys.argv[1:]:
    a=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','s16le','-'],capture_output=True).stdout,np.int16).astype(float)/32768
    W=int(.04*SR); out=[]
    for i in range(0,len(a)-W,int(.1*SR)):
        x=a[i:i+W]; e=20*np.log10(np.sqrt((x*x).mean())+1e-9)
        if e<-38: out.append(f'{i/SR:4.1f}  -'); continue
        x=x-x.mean(); c=np.correlate(x,x,'full')[W-1:]; lo,hi=int(SR/500),int(SR/70)
        k=lo+np.argmax(c[lo:hi]); f0=SR/k if c[k]>.3*c[0] else 0
        out.append(f'{i/SR:4.1f} {int(f0):4d}')
    print('==',f); print('  '.join(out))
