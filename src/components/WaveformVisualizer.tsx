import React, { useRef, useEffect } from 'react';

export function WaveformVisualizer({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      try {
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        ctx.clearRect(0, 0, rect.width, rect.height);

        const halfH = rect.height / 2;

        // --- Draw Frequency Spectrum (Partials) ---
        // Draw the partials as distinct vertical bars in the background
        ctx.fillStyle = 'rgba(139, 92, 246, 0.5)'; // violet-500
        
        // Focus on the lower/mid frequencies where musical notes reside
        const visibleBins = Math.floor(bufferLength * 0.25); 
        const barWidth = rect.width / visibleBins;
        
        for (let i = 0; i < visibleBins; i++) {
          const value = freqData[i];
          if (value > 0) {
            const percent = value / 255;
            const barHeight = percent * rect.height;
            // Draw distinct bars with a 1px gap
            ctx.fillRect(i * barWidth, rect.height - barHeight, Math.max(1, barWidth - 1), barHeight);
          }
        }

        // --- Draw Waveform (Oscilloscope) ---
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#34d399'; // emerald-400
        ctx.beginPath();

        const sliceWidth = rect.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = v * halfH;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        
        // Draw center line for waveform
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, halfH);
        ctx.lineTo(rect.width, halfH);
        ctx.stroke();
      } catch (e) {
        console.error("WaveformVisualizer draw error:", e);
      }
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [analyser]);

  return (
    <div className="relative w-full h-48 bg-[#0a0c10] overflow-hidden">
      <div className="absolute top-2 left-3 text-[10px] font-mono text-violet-400 uppercase tracking-widest opacity-70">Frequency Partials</div>
      <div className="absolute bottom-2 left-3 text-[10px] font-mono text-emerald-400 uppercase tracking-widest opacity-70">Time Domain</div>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block relative z-10"
      />
    </div>
  );
}
