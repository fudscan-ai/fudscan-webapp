import React, { useEffect, useRef, useState } from "react";

const ColorRevealImage = ({
  src,
  alt = "",
  width = 800,
  height = 500,
  brush = 40,
  className = "",
}) => {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const [ready, setReady] = useState(false);
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  // 在 canvas 上绘制“灰度版图片”
  const paintGray = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const cw = Math.round(img.clientWidth * dpr);
    const ch = Math.round(img.clientHeight * dpr);

    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = `${img.clientWidth}px`;
    canvas.style.height = `${img.clientHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 灰度 + 微调亮度/饱和度，让灰度更好看
    ctx.filter = "grayscale(100%) brightness(0.95) saturate(90%)";
    ctx.drawImage(img, 0, 0, cw, ch);
    ctx.filter = "none";
  };

  // 在两点之间画“软边刷子”，避免快速移动时断点
  const drawStroke = (x0, y0, x1, y1) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out"; // 擦除灰层
    const r = brush * dpr;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(dist / (r * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + dx * t;
      const y = y0 + dy * t;

      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");

      ctx.beginPath();
      ctx.fillStyle = g;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  };

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (img.complete) {
      setReady(true);
      paintGray();
    } else {
      img.onload = () => {
        setReady(true);
        paintGray();
      };
      img.onerror = () => setReady(false);
    }

    const onResize = () => {
      // 尺寸变化时重绘灰层
      paintGray();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, dpr, brush]);

  useEffect(() => {
    if (!ready) return;

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    let lastX = 0;
    let lastY = 0;
    let drawing = false;

    const getXY = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr,
      };
    };

    const onPointerDown = (e) => {
      wrap.setPointerCapture(e.pointerId);
      const { x, y } = getXY(e);
      drawing = true;
      lastX = x;
      lastY = y;
      drawStroke(x, y, x, y);
    };
    const onPointerMove = (e) => {
      if (!drawing) return;
      const { x, y } = getXY(e);
      drawStroke(lastX, lastY, x, y);
      lastX = x;
      lastY = y;
    };
    const onPointerUp = (e) => {
      drawing = false;
      wrap.releasePointerCapture(e.pointerId);
    };
    const onLeave = () => (drawing = false);

    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointercancel", onLeave);
    wrap.addEventListener("pointerleave", onLeave);

    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("pointercancel", onLeave);
      wrap.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, dpr, brush]);

  const reset = () => paintGray();

  return (
    <div className={`relative select-none ${className}`} ref={wrapRef}>
      {/* 底层：彩色原图 */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="block w-full h-auto"
        draggable={false}
      />
      {/* 顶层：灰度画布（被“擦除”后露出下层彩色） */}
      <canvas
        ref={canvasRef}
        className="pointer-events-auto absolute inset-0"
        aria-hidden
      />
      {/* 可选：重置按钮 */}
      <button
        onClick={reset}
        className="absolute right-3 top-3 rounded-full bg-black/60 text-white text-xs px-3 py-1 backdrop-blur hover:bg-black/70"
      >
        Reset
      </button>
    </div>
  );
};

export default ColorRevealImage;