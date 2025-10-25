import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";

const AiLogoBackground = () => {
  const pathRef = useRef(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);

  // 简单的形状切换函数
  const changePath = useMemo(() => {
    const paths = [
      "M113.681 0.405432C140.791 -3.61542 160.464 23.2193 181.59 38.9367C201.162 53.4982 228.319 65.6645 231.728 88.2299C235.11 110.615 205.981 125.609 197.917 147.016C190.002 168.028 203.149 195.378 185.5 210.948C167.802 226.561 138.392 218.909 113.681 221.331C85.0062 224.141 53.4846 240.496 29.4373 226.245C5.43627 212.021 -4.40523 180.183 1.82604 155.042C7.65038 131.543 46.4045 127.901 59.0751 106.666C68.0264 91.6647 52.4372 72.3657 60.3771 56.9151C72.1732 33.9606 85.8165 4.53841 113.681 0.405432Z",
      "M96.4471 0.00485847C112.78 0.353955 120.743 23.3279 136.438 28.208C167.018 37.7165 211.516 12.3999 228.811 41.1618C244.16 66.6863 199.506 91.5715 192.201 120.942C184.183 153.181 206.944 194.97 184.759 218.286C163.155 240.991 125.431 230.683 96.4471 221.576C72.4011 214.02 51.329 195.995 39.0405 172.5C29.0207 153.343 43.8906 128.944 37.1449 108.193C30.1072 86.544 -4.46888 76.2006 0.483266 53.8921C5.28215 32.2741 36.9775 36.7542 55.2855 26.4735C69.8111 18.3169 80.0668 -0.345241 96.4471 0.00485847Z",
    ];
    
    return (index) => {
      if (!pathRef.current) return;
      pathRef.current.setAttribute("d", paths[index]);
    };
  }, []);

  const handleMouseOver = useMemo(() => {
    changePath(1);
    setCurrentPathIndex(1);
  }, [changePath]);

  const handleMouseLeave = useMemo(() => {
    changePath(0);
    setCurrentPathIndex(0);
  }, [changePath]);
  
  // 组件挂载时初始化
  useEffect(() => {
    if (pathRef.current) {
      changePath(0);
    }
  }, [changePath]);

  return (
    <div className="absolute inset-0 z-0">
      <svg
        onMouseOver={handleMouseOver} onMouseLeave={handleMouseLeave}
        width="100%"
        height="100%"
        viewBox="0 0 256 256"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ cursor: "pointer" }}
      >
        <path
            ref={pathRef}
            style={{
              transition: "d 0.75s ease-in-out"
            }}
            fillRule="evenodd"
            clipRule="evenodd"
            d="M113.681 0.405432C140.791 -3.61542 160.464 23.2193 181.59 38.9367C201.162 53.4982 228.319 65.6645 231.728 88.2299C235.11 110.615 205.981 125.609 197.917 147.016C190.002 168.028 203.149 195.378 185.5 210.948C167.802 226.561 138.392 218.909 113.681 221.331C85.0062 224.141 53.4846 240.496 29.4373 226.245C5.43627 212.021 -4.40523 180.183 1.82604 155.042C7.65038 131.543 46.4045 127.901 59.0751 106.666C68.0264 91.6647 52.4372 72.3657 60.3771 56.9151C72.1732 33.9606 85.8165 4.53841 113.681 0.405432Z"
            fill="#00D483"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="white"
          fontSize="128"
          fontWeight="bold"
          style={{ pointerEvents: "none" }}
        >
          AI
        </text>

      </svg>
    </div>
  );
};

export default AiLogoBackground;