import React, { useState, useRef, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Video, Sparkles, Loader2 } from 'lucide-react';
import { StoryContext } from '../App';

export const CreateStory: React.FC = () => {
  const navigate = useNavigate();
  const { addStory, currentUser, showNotification } = useContext(StoryContext);
  
  const [name, setName] = useState('');
  const [idea, setIdea] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth check
  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Cleanup preview URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate size (e.g., 50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        showNotification("Video is too large. Please upload under 50MB.", 'error');
        return;
      }
      // Validate format
      if (!file.type.startsWith('video/')) {
        showNotification("Please upload a valid video file.", 'error');
        return;
      }

      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null); // Effect will handle revocation
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !idea) return;

    setIsSubmitting(true);

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 800));

    addStory({
      characterName: name,
      idea: idea,
      videoUrl: videoPreview, // In a real app, this would be the S3/CDN URL after upload
      // Synopsis/OpeningLine will be generated in background by App context logic
    });

    setIsSubmitting(false);
    // Navigation happens immediately, notification is handled by App context
    navigate('/manage');
  };

  return (
    <div className="min-h-screen pb-20 bg-dark-900 text-white px-4 pt-6">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">
          Create Character
        </h1>
        <button 
          onClick={() => navigate('/home')}
          className="p-2 rounded-full bg-dark-800 hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Character Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tifa, Shadow"
            maxLength={50}
            className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        {/* Idea Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">One-sentence Concept</label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. A cyberpunk hacker searching for her lost memory in a neon city."
            rows={3}
            className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all resize-none"
          />
        </div>

        {/* Video Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Character Video</label>
          
          {!videoPreview ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-dark-700 bg-dark-800 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-dark-700 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="text-gray-400 group-hover:text-brand-400" size={20} />
              </div>
              <span className="text-sm text-gray-400 font-medium">Upload Video</span>
              <span className="text-xs text-gray-500 mt-1">Max 50MB. MP4, MOV</span>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-dark-700 bg-black aspect-video">
              <video 
                src={videoPreview} 
                className="w-full h-full object-contain" 
                autoPlay 
                muted 
                loop 
                playsInline 
              />
              <button
                type="button"
                onClick={removeVideo}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleVideoChange}
            accept="video/*"
            className="hidden"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={!name || !idea || !videoFile || isSubmitting}
            className={`w-full py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              (!name || !idea || !videoFile || isSubmitting)
                ? 'bg-dark-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-lg hover:shadow-brand-500/20 hover:scale-[1.02]'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Publishing...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Create & Generate
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-500 mt-3">
            AI will generate the profile details automatically.
          </p>
        </div>
      </form>
    </div>
  );
};