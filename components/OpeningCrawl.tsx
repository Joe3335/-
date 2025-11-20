import React, { useEffect } from 'react';

interface OpeningCrawlProps {
  onComplete: () => void;
}

export const OpeningCrawl: React.FC<OpeningCrawlProps> = ({ onComplete }) => {
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 12000);

    const handleKeyDown = (e: KeyboardEvent) => {
        if(e.key === "Escape" || e.key === "Enter" || e.key === " ") {
            onComplete();
        }
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden flex justify-center items-center cursor-pointer" onClick={onComplete}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50"></div>
      
      <div className="crawl-container w-full max-w-3xl px-4 text-yellow-400 font-bold text-center text-4xl leading-relaxed font-sans tracking-wider">
        <div className="crawl-content">
          <p className="mb-16">第 X 章</p>
          <p className="uppercase text-6xl mb-16">最后的决斗</p>
          <p className="mb-8">银河系陷入了黑暗。</p>
          <p className="mb-8">绝地武士团已经陨落，唯有你是最后的希望。</p>
          <p className="mb-8">在偏远的外环星域，一名强大的西斯尊主正在猎杀幸存的原力敏感者。</p>
          <p className="mb-8">你手持光剑，必须面对这无尽的黑暗。这不是为了胜利，而是为了生存，为了原力的平衡....</p>
          <p className="text-sm text-gray-500 mt-32">(按空格键或点击跳过)</p>
        </div>
      </div>
    </div>
  );
};