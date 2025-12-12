import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react';
import { StoryContext } from '../App';
import { StoryStatus } from '../types';

export const EditStory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { stories, updateStory, currentUser } = useContext(StoryContext);
  
  const [story, setStory] = useState(stories.find(s => s.id === id));
  const [synopsis, setSynopsis] = useState('');
  const [openingLine, setOpeningLine] = useState('');
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Load
  useEffect(() => {
    const found = stories.find(s => s.id === id);
    if (found) {
      setStory(found);
      setSynopsis(found.synopsis || '');
      setOpeningLine(found.openingLine || '');
      setVideoPreview(found.videoUrl);
    } else {
      navigate('/manage');
    }
  }, [id, stories, navigate]);

  // Auth Check
  useEffect(() => {
    if (!currentUser) navigate('/');
  }, [currentUser, navigate]);

  if (!story) return null;

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       if (file.size > 50 * 1024 * 1024) {
        alert("Video too large");
        return;
      }
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 500)); // Fake network delay
    
    updateStory(story.id, {
      synopsis,
      openingLine,
      videoUrl: videoPreview,
    });
    
    setIsSaving(false);
    navigate('/manage');
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-dark-900/95 backdrop-blur-sm border-b border-dark-700 p-4 flex items-center justify-between z-10">
        <button onClick={() => navigate('/manage')} className="p-2 hover:bg-dark-800 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">Edit Story</h1>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="p-2 text-brand-500 font-bold text-sm disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20}/> : 'Save'}
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Read Only Fields */}
        <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Character Name (Immutable)</label>
           <div className="text-lg font-medium text-gray-300">{story.characterName}</div>
        </div>

        {/* Video Edit */}
        <div className="space-y-2">
           <label className="block text-sm font-medium text-gray-300">Character Video</label>
           <div className="relative rounded-xl overflow-hidden border border-dark-700 bg-black aspect-video group">
             {videoPreview ? (
               <video src={videoPreview} className="w-full h-full object-contain" muted playsInline loop autoPlay />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-500">No video</div>
             )}
             
             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-brand-600 p-3 rounded-full text-white hover:bg-brand-500"
                >
                  <Upload size={20} />
                </button>
             </div>
           </div>
           <input type="file" ref={fileInputRef} onChange={handleVideoChange} accept="video/*" className="hidden" />
        </div>

        {/* AI Content Edits */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Story Synopsis</label>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-white min-h-[120px] focus:border-brand-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Opening Line</label>
            <textarea
              value={openingLine}
              onChange={(e) => setOpeningLine(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-white min-h-[80px] focus:border-brand-500 outline-none"
            />
          </div>
        </div>
        
        <p className="text-xs text-gray-500 text-center pt-4">
          Editing these fields will update the character's public profile immediately.
        </p>
      </div>
    </div>
  );
};