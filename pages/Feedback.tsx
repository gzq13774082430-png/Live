import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';

const FEEDBACK_TYPES = [
  "产品建议",
  "功能故障",
  "内容反馈（角色/作品）",
  "其他问题"
];

export const Feedback: React.FC = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    setIsSubmitting(true);
    // Simulate network request delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    alert("感谢您的反馈！我们会尽快处理。");
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pt-6 border-b border-dark-800 bg-dark-900 sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 rounded-full hover:bg-dark-800 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">意见反馈</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-8 pb-10">
          
          {/* Type Section (Required) */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-200">
              问题类型 <span className="text-brand-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-3">
              {FEEDBACK_TYPES.map((type) => (
                <label 
                  key={type}
                  className={`relative flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedType === type 
                      ? 'bg-brand-900/20 border-brand-500' 
                      : 'bg-dark-800 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="feedbackType" 
                    value={type}
                    checked={selectedType === type}
                    onChange={() => setSelectedType(type)}
                    className="w-4 h-4 text-brand-600 focus:ring-brand-500 bg-dark-700 border-gray-600 accent-brand-500"
                  />
                  <span className={`ml-3 text-sm font-medium ${selectedType === type ? 'text-brand-400' : 'text-gray-300'}`}>
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Description Section (Optional) */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-200">
              问题描述 <span className="text-gray-500 font-normal text-xs ml-1">(选填)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请详细描述您遇到的问题，您的建议对我们非常重要..."
              className="w-full h-32 bg-dark-800 border border-dark-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none text-sm leading-relaxed"
            />
          </div>

          {/* Contact Section (Optional) */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-200">
              联系方式 <span className="text-gray-500 font-normal text-xs ml-1">(选填)</span>
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="留下邮箱或手机号，方便我们联系您"
              className="w-full bg-dark-800 border border-dark-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!selectedType || isSubmitting}
              className={`w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                (!selectedType || isSubmitting)
                  ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:brightness-110'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  提交中...
                </>
              ) : (
                <>
                  提交反馈
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};