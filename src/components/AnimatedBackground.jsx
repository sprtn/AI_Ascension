import { useEffect, useRef } from 'react';

export function AnimatedBackground({ gameState }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);
  
  const stage = gameState.state.stage || 0;
  const achievements = gameState.state.achievements || [];
  const achievementCount = achievements.length;
  
  // Calculate intensity based on stage and achievements
  const intensity = Math.min(1, (stage * 0.1) + (achievementCount * 0.05));
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const updateCanvasSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      return { width, height };
    };
    
    // Initialize canvas size immediately
    let { width, height } = updateCanvasSize();
    const ctx = canvas.getContext('2d');
    
    // Initialize particles
    const particleCount = Math.floor(20 + (intensity * 30));
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
    }));
    
    // Matrix rain characters
    const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const matrixDrops = Array.from({ length: Math.floor(width / 20) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: Math.random() * 3 + 1,
    }));
    
    // Neural network nodes (light up with achievements)
    const nodeCount = Math.floor(10 + (achievementCount * 2));
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      active: Math.random() < (achievementCount / 20),
      pulse: Math.random() * Math.PI * 2,
    }));
    
    let time = 0;
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.01;
      
      // Draw floating particles
      particlesRef.current.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;
        
        ctx.fillStyle = `rgba(0, 255, 255, ${particle.opacity * intensity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw matrix rain
      if (intensity > 0.3) {
        ctx.fillStyle = `rgba(0, 255, 136, ${0.1 * intensity})`;
        ctx.font = '12px monospace';
        matrixDrops.forEach(drop => {
          const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          ctx.fillText(char, drop.x, drop.y);
          drop.y += drop.speed;
          if (drop.y > height) {
            drop.y = 0;
            drop.x = Math.random() * width;
          }
        });
      }
      
      // Draw neural network nodes and connections
      if (intensity > 0.2) {
        nodes.forEach((node, i) => {
          node.pulse += 0.02;
          const glow = node.active ? (Math.sin(node.pulse) * 0.3 + 0.7) : 0.2;
          
          ctx.fillStyle = `rgba(157, 78, 221, ${glow * intensity})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw connections to nearby nodes
          nodes.slice(i + 1).forEach(otherNode => {
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 150) {
              ctx.strokeStyle = `rgba(157, 78, 221, ${(1 - dist / 150) * 0.2 * intensity})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(otherNode.x, otherNode.y);
              ctx.stroke();
            }
          });
        });
      }
      
      // Draw binary streams
      if (intensity > 0.4) {
        ctx.fillStyle = `rgba(0, 255, 255, ${0.15 * intensity})`;
        ctx.font = '10px monospace';
        for (let i = 0; i < 5; i++) {
          const x = (width / 6) * (i + 1);
          const y = (time * 50 + i * 100) % height;
          ctx.fillText('01010101', x, y);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      updateCanvasSize();
    };
    
    // Ensure proper initialization after render
    const initTimeout = setTimeout(() => {
      updateCanvasSize();
    }, 0);
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(initTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [stage, achievementCount, intensity]);
  
  return (
    <div 
      className="fixed pointer-events-none" 
      style={{ 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        width: '100vw',
        zIndex: 0,
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ 
          opacity: 0.3, 
          display: 'block', 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
    </div>
  );
}
