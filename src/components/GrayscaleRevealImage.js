import React, { useId } from 'react';
import Image from 'next/image';

const GrayscaleRevealImage = ({ 
  src, 
  alt = "Image", 
  width = 300, 
  height = 300,
  revealRadius = 100,
  className = ""
}) => {
  // 使用 useId 生成唯一 ID，避免多个组件实例 ID 冲突
  const uniqueId = useId();
  const containerId = `colorRevealContainer-${uniqueId}`;
  const layerId = `colorLayer-${uniqueId}`;
  
  return (
    <div 
      id={containerId}
      className={`relative transition-all duration-500 hover:scale-105 group ${className}`}
      style={{ width, height }}
      onMouseMove={(e) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left; // x position within the element
        const y = e.clientY - rect.top;  // y position within the element
        
        // Update the radial gradient position
        const colorLayer = document.getElementById(layerId);
        if (colorLayer) {
          colorLayer.style.backgroundImage = `radial-gradient(circle ${revealRadius}px at ${x}px ${y}px, transparent 0%, transparent 10%, black 70%)`;
        }
      }}
      onMouseLeave={() => {
        const colorLayer = document.getElementById(layerId);
        if (colorLayer) {
          colorLayer.style.backgroundImage = 'none';
        }
      }}
    >
      <div className="absolute inset-0 shadow-lg group-hover:shadow-xl group-hover:shadow-blue-300/50 transition-shadow duration-500 rounded-lg -z-10"></div>
      
      {/* Original colored image */}
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <Image 
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="transition-all duration-500"
        />
      </div>
      
      {/* Grayscale layer with mask */}
      <div 
        id={layerId}
        className="absolute inset-0 overflow-hidden rounded-lg mix-blend-multiply"
        style={{
          backgroundImage: 'none',
          WebkitMaskImage: 'linear-gradient(black, black)'
        }}
      >
        <Image 
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="transition-all duration-500 filter grayscale contrast-125 brightness-90"
        />
      </div>
    </div>
  );
};

export default GrayscaleRevealImage;
