import React, { useContext, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreVertical, Edit2, Trash2, EyeOff, RefreshCw, Play, AlertCircle, CheckCircle2, Clock, ArrowLeft, UploadCloud, FileText } from 'lucide-react';
import { StoryContext } from '../App';
import { Story, StoryStatus, StoryContextType } from '../types';

export const StoryManagement: React.FC = () => {
  const { stories, updateStory, deleteStory, currentUser } = useContext(StoryContext);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StoryStatus | 'ALL'>('ALL');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!currentUser) navigate('/');
  }, [currentUser, navigate]);

  const filteredStories = useMemo(() => {
    if (filter === 'ALL') return stories;
    return stories.filter(s => s.status === filter);
  }, [stories, filter]);

  const handleAction = (e: React.MouseEvent, action: string, story: Story) => {
    e.stopPropagation(); // Prevent event bubbling to the container which closes the menu
    setActiveMenuId(null);
    
    // Use setTimeout to allow the menu to close visually before the alert blocks the thread
    setTimeout(() => {
      switch (action) {
        case 'edit':
          navigate(`/edit/${story.id}`);
          break;
        case 'delete':
          if (window.confirm(`Delete ${story.characterName}?`)) {
            deleteStory(story.id);
          }
          break;
        case 'takedown':
          if (window.confirm(`Take down ${story.characterName}? It will be hidden from users.`)) {
            updateStory(story.id, { status: StoryStatus.TAKEN_DOWN });
          }
          break;
        case 'republish':
        case 'publish':
          updateStory(story.id, { status: StoryStatus.PUBLISHED });
          break;
      }
    }, 0);
  };

  const StatusBadge = ({ status }: { status: StoryStatus }) => {
    switch (status) {
      case StoryStatus.PROCESSING:
        return <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full"><Clock size={12}/> Processing</span>;
      case StoryStatus.PUBLISHED:
        return <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full"><CheckCircle2 size={12}/> Published</span>;
      case StoryStatus.TAKEN_DOWN:
        return <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded-full"><EyeOff size={12}/> Taken Down</span>;
      case StoryStatus.DRAFT:
        return <span className="flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full"><FileText size={12}/> Draft</span>;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-20 text-white px-4 pt-6" onClick={() => setActiveMenuId(null)}>
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={(e) => { e.stopPropagation(); navigate('/home'); }}
            className="p-2 -ml-2 rounded-full hover:bg-dark-800 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">My Stories</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-2" onClick={(e) => e.stopPropagation()}>
          {['ALL', StoryStatus.PUBLISHED, StoryStatus.DRAFT, StoryStatus.PROCESSING, StoryStatus.TAKEN_DOWN].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === status 
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                  : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
              }`}
            >
              {status === 'ALL' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </header>

      {/* List */}
      <div className="space-y-4">
        {filteredStories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <p>No stories found.</p>
            {filter === 'ALL' && (
              <Link to="/create" className="mt-4 text-brand-400 hover:underline">Create your first story</Link>
            )}
          </div>
        ) : (
          filteredStories.map(story => (
            <div key={story.id} className="bg-dark-800 rounded-2xl p-4 flex gap-4 relative group border border-dark-700 hover:border-dark-600 transition-all">
              {/* Thumbnail */}
              <div className="w-20 h-24 bg-black rounded-lg overflow-hidden flex-shrink-0 relative">
                {story.videoUrl ? (
                  <video src={story.videoUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-dark-700">
                    <Play size={20} className="text-gray-500" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg truncate pr-6">{story.characterName}</h3>
                  
                  {/* Menu Trigger */}
                  <button 
                    className="p-1.5 text-gray-400 hover:bg-dark-700 rounded-full transition-colors absolute top-3 right-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === story.id ? null : story.id);
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenuId === story.id && (
                    <div className="absolute right-4 top-10 bg-dark-700 rounded-xl shadow-2xl border border-dark-600 z-20 min-w-[160px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      
                      {story.status === StoryStatus.DRAFT && (
                        <button onClick={(e) => handleAction(e, 'publish', story)} className="w-full px-4 py-3 text-left text-sm hover:bg-dark-600 text-green-400 flex items-center gap-2">
                          <UploadCloud size={14} /> Publish
                        </button>
                      )}

                      {(story.status === StoryStatus.PUBLISHED || story.status === StoryStatus.TAKEN_DOWN || story.status === StoryStatus.DRAFT) && (
                        <button onClick={(e) => handleAction(e, 'edit', story)} className="w-full px-4 py-3 text-left text-sm hover:bg-dark-600 flex items-center gap-2">
                          <Edit2 size={14} /> Edit Content
                        </button>
                      )}
                      
                      {story.status === StoryStatus.PUBLISHED && (
                        <button onClick={(e) => handleAction(e, 'takedown', story)} className="w-full px-4 py-3 text-left text-sm hover:bg-dark-600 text-yellow-500 flex items-center gap-2">
                          <EyeOff size={14} /> Take Down
                        </button>
                      )}
                      
                      {story.status === StoryStatus.TAKEN_DOWN && (
                        <button onClick={(e) => handleAction(e, 'republish', story)} className="w-full px-4 py-3 text-left text-sm hover:bg-dark-600 text-brand-400 flex items-center gap-2">
                          <RefreshCw size={14} /> Republish
                        </button>
                      )}

                      <div className="h-px bg-dark-600 my-0"></div>
                      
                      <button onClick={(e) => handleAction(e, 'delete', story)} className="w-full px-4 py-3 text-left text-sm hover:bg-dark-600 text-red-500 flex items-center gap-2">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-2">
                   <StatusBadge status={story.status} />
                </div>

                <p className="text-xs text-gray-400 line-clamp-2">
                  {story.status === StoryStatus.PROCESSING 
                    ? "AI is crafting the personality..." 
                    : (story.synopsis || story.idea)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};