import React, { useState, createContext, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { CreateStory } from './pages/CreateStory';
import { StoryManagement } from './pages/StoryManagement';
import { EditStory } from './pages/EditStory';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Wallet } from './pages/Wallet';
import { Feedback } from './pages/Feedback';
import { Navbar } from './components/Navbar';
import { Story, StoryStatus, StoryContextType } from './types';
import { generateCharacterProfile } from './services/geminiService';

// Create Context
export const StoryContext = createContext<StoryContextType>({
  stories: [],
  addStory: () => {},
  updateStory: () => {},
  deleteStory: () => {},
  currentUser: null,
  login: () => {},
  showNotification: () => {},
});

// Wrapper to conditionally render Navbar
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  // Hide Navbar on Login, Home, Create, Manage, Wallet and Feedback pages
  const hideNavRoutes = ['/', '/login', '/home', '/create', '/manage', '/wallet', '/feedback'];
  const isEditRoute = location.pathname.startsWith('/edit/');
  
  const showNav = !hideNavRoutes.includes(location.pathname) && !isEditRoute;

  return (
    <>
      {children}
      {showNav && <Navbar />}
    </>
  );
};

// Notification Component
const NotificationToast: React.FC<{ 
  message: string; 
  type: 'success' | 'error'; 
  visible: boolean; 
  onClose: () => void; 
}> = ({ message, type, visible, onClose }) => {
  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[100] flex justify-center px-4 transition-all duration-500 ease-in-out transform ${
        visible ? 'translate-y-4 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl max-w-md w-full backdrop-blur-md border
        ${type === 'success' 
          ? 'bg-brand-900/90 border-brand-500/50 text-white' 
          : 'bg-red-900/90 border-red-500/50 text-white'}
      `}>
        {type === 'success' ? <CheckCircle2 className="text-brand-400" size={24} /> : <AlertCircle className="text-red-400" size={24} />}
        <span className="flex-1 text-sm font-medium">{message}</span>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={16} className="opacity-70" />
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  
  // Notification State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isNotifVisible, setIsNotifVisible] = useState(false);

  // Mock login
  const login = () => {
    setCurrentUser({ id: 'user_123', name: 'Demo User' });
  };

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setIsNotifVisible(true);
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setIsNotifVisible(false);
      // Clear content after animation
      setTimeout(() => setNotification(null), 500);
    }, 4000);
  }, []);

  // Add Story (triggers AI process)
  const addStory = useCallback((newStoryData: Omit<Story, 'id' | 'createdAt' | 'status'>) => {
    const newId = `story_${Date.now()}`;
    
    const story: Story = {
      id: newId,
      createdAt: Date.now(),
      status: StoryStatus.PROCESSING,
      characterName: newStoryData.characterName, // User input
      idea: newStoryData.idea,
      videoUrl: newStoryData.videoUrl,
      synopsis: '',
      openingLine: '',
    };

    setStories(prev => [story, ...prev]);
    
    // Show global notification
    showNotification('Story created! AI is generating content...', 'success');

    // Trigger Background AI Processing
    processStoryAI(story.id, newStoryData.characterName, newStoryData.idea);
  }, [showNotification]);

  // AI Processing Function
  const processStoryAI = async (storyId: string, name: string, idea: string) => {
    console.log(`Starting AI generation for ${name}...`);
    
    try {
      // Simulate some backend queue time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await generateCharacterProfile(name, idea);
      
      setStories(prev => prev.map(s => {
        if (s.id === storyId) {
          return {
            ...s,
            status: StoryStatus.DRAFT, // Set to DRAFT initially, requiring manual publish
            synopsis: result.synopsis,
            openingLine: result.openingLine,
            generatedName: result.generatedName, // Can be used to show "True Name"
          };
        }
        return s;
      }));
      
    } catch (error) {
      console.error("AI Processing Failed", error);
      showNotification(`Failed to generate profile for ${name}`, 'error');
    }
  };

  const updateStory = (id: string, updates: Partial<Story>) => {
    setStories(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStory = (id: string) => {
    setStories(prev => prev.filter(s => s.id !== id));
  };

  return (
    <StoryContext.Provider value={{ stories, addStory, updateStory, deleteStory, currentUser, login, showNotification }}>
      <HashRouter>
        <NotificationToast 
          message={notification?.message || ''} 
          type={notification?.type || 'success'} 
          visible={isNotifVisible} 
          onClose={() => setIsNotifVisible(false)} 
        />
        <Layout>
          <Routes>
            <Route path="/" element={<Login onLogin={login} />} />
            <Route path="/home" element={<Home />} />
            <Route path="/create" element={<CreateStory />} />
            <Route path="/manage" element={<StoryManagement />} />
            <Route path="/edit/:id" element={<EditStory />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/feedback" element={<Feedback />} />
          </Routes>
        </Layout>
      </HashRouter>
    </StoryContext.Provider>
  );
};

export default App;