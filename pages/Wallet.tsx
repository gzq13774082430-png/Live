import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, ChevronRight } from 'lucide-react';

const RECHARGE_OPTIONS = [
  { coins: 300, price: '$6.99' },
  { coins: 500, price: '$9.99' },
  { coins: 1000, price: '$18.98' },
  { coins: 3000, price: '$54.99' },
  { coins: 5000, price: '$89.99' },
  { coins: 10000, price: '$179.99' },
];

export const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<number | null>(1); // Default selection like screenshot

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-dark-800 text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium">XCoin中心</h1>
        <button className="text-sm text-gray-400 hover:text-white transition-colors">明细</button>
      </div>

      {/* Balance Section */}
      <div className="flex flex-col items-center mt-8 mb-12">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(234,179,8,0.4)] border-2 border-yellow-200">
          <span className="text-3xl font-black text-yellow-900 italic pr-0.5">X</span>
        </div>
        <div className="text-5xl font-bold mb-2 tracking-tight">37</div>
        <button className="flex items-center text-gray-400 text-sm hover:text-white transition-colors">
          <span>XCoin余额</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Recharge Grid */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-10">
        {RECHARGE_OPTIONS.map((opt, idx) => (
          <button 
            key={idx}
            onClick={() => setSelectedOption(idx)}
            className={`relative rounded-xl p-4 flex flex-col items-center justify-center gap-1 border-2 transition-all ${
              selectedOption === idx 
                ? 'bg-dark-800 border-yellow-500/50' 
                : 'bg-dark-800 border-dark-700 hover:bg-dark-700'
            }`}
          >
            <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-lg">
              <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] text-yellow-900 font-black">X</div>
              <span>{opt.coins}</span>
            </div>
            <span className="text-white font-medium text-sm">{opt.price}</span>
          </button>
        ))}
      </div>

      {/* Action Button */}
      <div className="px-6 mb-6">
        <button className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 py-3.5 rounded-full text-white font-bold text-lg shadow-lg shadow-purple-500/20 active:scale-95 transition-transform hover:brightness-110">
          充值
        </button>
        <p className="text-center text-xs text-gray-500 mt-4">
          充值即代表阅读并同意<span className="text-gray-400">《XCoin充值协议》</span>
        </p>
      </div>

      {/* Footer Item (Mock History) */}
      <div className="mt-auto pb-safe">
        <div className="mx-4 py-4 border-t border-dark-800 flex justify-between items-center text-sm text-gray-300">
          <span>故事聊天h5</span>
          <div className="flex items-center gap-1">
             <span>2</span>
             <div className="w-3 h-3 rounded-full bg-gray-600 flex items-center justify-center text-[8px] text-dark-900 font-bold">X</div>
          </div>
        </div>
      </div>
    </div>
  );
};