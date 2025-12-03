'use client';

import React, { useEffect, useRef } from 'react';

const ShaderWave = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true });
    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }

    // Vertex shader - simple passthrough
    const vertexShaderSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment shader - epic wave effect
    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 resolution;
      uniform float time;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution;
        
        // Create flowing waves
        float wave1 = sin(uv.x * 6.0 + time * 0.5) * 0.5;
        float wave2 = sin(uv.x * 4.0 - time * 0.3) * 0.3;
        float wave3 = sin(uv.x * 8.0 + time * 0.7) * 0.2;
        
        float combinedWave = wave1 + wave2 + wave3;
        
        // Create wave zone (only bottom part)
        float waveHeight = 0.5 + combinedWave * 0.15;
        float waveMask = smoothstep(waveHeight - 0.1, waveHeight, uv.y);
        
        // Blue gradient colors
        vec3 color1 = vec3(0.16, 0.39, 0.8);  // #2a63cd
        vec3 color2 = vec3(0.12, 0.29, 0.64); // #1e4ba3
        vec3 white = vec3(1.0, 1.0, 1.0);
        
        // Mix colors based on position and wave
        vec3 waveColor = mix(color2, color1, uv.x + combinedWave * 0.2);
        vec3 finalColor = mix(waveColor, white, waveMask);
        
        // Add subtle glow on wave edge
        float edgeGlow = smoothstep(0.05, 0.0, abs(uv.y - waveHeight)) * 0.3;
        finalColor += vec3(edgeGlow);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Compile shader
    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return;

    // Create program
    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Set up geometry (full screen quad)
    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const resolutionLocation = gl.getUniformLocation(program, 'resolution');
    const timeLocation = gl.getUniformLocation(program, 'time');

    // Resize handler
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.offsetWidth;
      canvas.height = 80; // Fixed height for wave
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    // Animation loop
    let startTime = Date.now();
    let animationId: number;

    const render = () => {
      const time = (Date.now() - startTime) / 1000;

      gl.uniform1f(timeLocation, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 w-full h-[80px] overflow-hidden pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
};

export default ShaderWave;
