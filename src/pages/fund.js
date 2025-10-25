import { Geist, Geist_Mono } from "next/font/google";
// import { useState, useEffect } from "react";
import Header from '../components/Header2';
// import { INITIAL_PRICES } from '../utils/tokenUtils.js';
import Spline from '@splinetool/react-spline';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Fund() {
    // console.log(data)
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-transparent text-gray-500`}>
      {/* Header */}
      <Header />

      {/* Center */}
      <main
        className="flex flex-col items-center justify-center"
        style={{
          margin: "0 auto",
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: '100%',
          height: '100vh',
        }}
      >
        <div className="w-full flex flex-col items-start justify-center gap-10 md:gap-16">
          {/* 左侧：Logo + 标题 */}
          {/* <div className="flex flex-row justify-start items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center overflow-hidden">
              <img
                src="/pixel_face_cropped_v2.png" 
                alt="COINTEXT Logo" 
                width={48} 
                height={48} 
                className="object-cover"
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">COINTEXT</h1>
          </div> */}

          {/* 右侧：进度条区 */}
          <div className="flex flex-row justify-center items-center w-full min-h-[600px]">
            <Spline
              style={{width: '100%', height: '100vh'}}
              scene="https://prod.spline.design/9vq4PX4LVnmH5Nef/scene.splinecode" 
            />
          </div>

        </div>
      </main>

      {/* Spacer for footer reveal */}
      <div className="h-[100vh] w-full bg-transparent" style={{ zIndex: -1 }}></div>

      {/* Footer */}
      {/* <footer className="fixed bottom-0 left-0 right-0 py-4 px-6 bg-transparent z-10">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="text-sm">
            COINTEXT FUND ADDRESS: <span className="underline decoration-dotted">0cointext-fund.base.eth</span>
          </div>
          <div className="flex space-x-4">
            © 2025 COINTEXT
          </div>
        </div>
      </footer> */}
    </div>
  );
}

// This gets called on every request
// export async function getServerSideProps() {
//     try {
//         // 从API获取代币数据
//         const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/tokens`);
//         const result = await response.json();

//         // 从API获取MAMO APY数据
//         const response2 = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/staking-apy`);
//         const result2 = await response2.json();
        
//         // Pass data to the page via props
//         return { props: { data: result.data, apy: result2.rewardsApy } };
//     } catch (error) {
//         console.error('Error fetching prices from API:', error);
        
//         // 出错时使用初始价格
//         const data = [
//             {
//                 name: "MAMO", 
//                 initialPrice: INITIAL_PRICES.MAMO,
//                 currentPrice: INITIAL_PRICES.MAMO * 1.10,
//                 change: "+10%", 
//                 changeClass: "text-green-600", 
//                 weight: 3 
//             },
//             {
//                 name: "BYTE", 
//                 initialPrice: INITIAL_PRICES.BYTE,
//                 currentPrice: INITIAL_PRICES.BYTE * 1.50,
//                 change: "+50%", 
//                 changeClass: "text-green-600", 
//                 weight: 3 
//             },
//             {
//                 name: "COINTEXT", 
//                 initialPrice: INITIAL_PRICES.COINTEXT,
//                 currentPrice: INITIAL_PRICES.COINTEXT * 4.00,
//                 change: "+300%", 
//                 changeClass: "text-green-600", 
//                 weight: 3 
//             },
//             {
//                 name: "VIRTUAL", 
//                 initialPrice: INITIAL_PRICES.VIRTUAL,
//                 currentPrice: INITIAL_PRICES.VIRTUAL * 0.90,
//                 change: "-10%", 
//                 changeClass: "text-red-600", 
//                 weight: 1 
//             },
//         ];
//         const apy = {
//             totalApy: 24.9,
//             baseApy: 24.9,
//             rewardsApy: 24.9,
//             rewards: []
//         };
        
//         return { props: { data, apy } };
//     }
// }








