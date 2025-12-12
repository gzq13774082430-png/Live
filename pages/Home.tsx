import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Volume2, VolumeX, MoreHorizontal, Plus, Send, 
  Share2, Flag, MessageSquare, Coins, 
  ChevronRight, Edit3, List, Phone, PhoneOff, Mic, MicOff
} from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { StoryContext } from '../App';
import { StoryStatus } from '../types';

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4"; 
const DEMO_IMAGE = "https://images.unsplash.com/photo-1518826778770-a729fb53327c?q=80&w=1920&auto=format&fit=crop";

// --- Audio Helper Functions for Gemini Live API ---
function encodeAudio(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encodeAudio(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, stories } = useContext(StoryContext);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Call State
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [transcripts, setTranscripts] = useState<Array<{role: 'user' | 'ai', text: string}>>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  // Audio Context Refs
  const audioContextsRef = useRef<{ input?: AudioContext; output?: AudioContext } | null>(null);
  const streamsRef = useRef<{ input?: MediaStream } | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  // Touch handling state
  const touchStartRef = useRef<{x: number, y: number} | null>(null);

  // Flatten Stories into a single feed
  const feedItems = useMemo(() => {
    const published = stories.filter(s => s.status === StoryStatus.PUBLISHED);
    
    if (published.length === 0) {
      // Fallback Demo Story
      return [{
        id: 'demo_char',
        characterName: 'Kizuna',
        avatar: DEMO_IMAGE,
        url: DEMO_VIDEO,
        poster: DEMO_IMAGE,
        lines: [
          "The moment the water splashed, Kizuna's laughter echoed above the pool.",
          "You just sat down by the pool, but she was already in the water..."
        ],
        concept: "A cheerful girl enjoying a summer day at the pool."
      }];
    }

    // Map all published stories to feed items
    return published.map(s => ({
      id: s.id,
      characterName: s.characterName,
      avatar: s.videoUrl || DEMO_IMAGE, 
      url: s.videoUrl || DEMO_VIDEO,
      poster: s.videoUrl ? undefined : DEMO_IMAGE,
      lines: [s.synopsis || s.idea, s.openingLine || "..."],
      concept: s.idea
    }));
  }, [stories]);

  const currentItem = feedItems[currentIndex];

  // 1. Handle Slide Change (Reset state)
  useEffect(() => {
    setProgress(0);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
    // Stop call if switching characters
    if (isCalling) {
      endCall();
    }
  }, [currentIndex]);

  // 2. Handle Play/Pause Logic
  useEffect(() => {
    if (!videoRef.current) return;

    // Pause video background if calling or menu open
    const shouldPlay = isPlaying && !isMenuOpen && !isCalling;

    if (shouldPlay) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.debug("Video play interrupted:", error);
        });
      }
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, isMenuOpen, isCalling, currentIndex]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptsEndRef.current) {
      transcriptsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts]);

  const handleTimeUpdate = () => {
    if (videoRef.current && !isMenuOpen) {
      const duration = videoRef.current.duration || 1;
      const current = videoRef.current.currentTime;
      setProgress((current / duration) * 100);
    }
  };

  // --- Gemini Live Call Logic ---
  const startCall = async () => {
    setIsCalling(true);
    setCallStatus('connecting');
    setTranscripts([]); // Clear previous chat
    setIsAiSpeaking(false);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });

      // Init Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };
      
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination); // Ensure output connects to speakers

      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamsRef.current = { input: stream };

      const systemInstruction = `You are ${currentItem.characterName}. 
      Character Concept: ${currentItem.concept}.
      Opening lines: ${currentItem.lines.join(' ')}.
      Roleplay this character naturally in a voice conversation. Be concise and conversational.`;

      // Connect to Gemini
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: systemInstruction,
          // Enable transcription
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log("Session connected");
            setCallStatus('connected');

            // Setup Input Processing
            const source = inputCtx.createMediaStreamSource(stream);
            // Low buffer size (512) for ultra-low latency detection
            const scriptProcessor = inputCtx.createScriptProcessor(512, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMicMuted) return; // Don't send if muted
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
             const { serverContent } = msg;

             // 1. Handle Interruption (PRIORITY)
            if (serverContent?.interrupted) {
               console.log("Interruption detected - Stopping Audio");
               audioSourcesRef.current.forEach(s => {
                   try { s.stop(); } catch(e) {}
               });
               audioSourcesRef.current.clear();
               nextStartTimeRef.current = 0;
               setIsAiSpeaking(false);
            }

            // 2. Handle Transcription (Real-time updates)
            let newText = '';
            let role: 'user' | 'ai' | null = null;

            if (serverContent?.outputTranscription) {
               newText = serverContent.outputTranscription.text;
               role = 'ai';
            } else if (serverContent?.inputTranscription) {
               newText = serverContent.inputTranscription.text;
               role = 'user';
            }

            if (role && newText) {
               setTranscripts(prev => {
                  const last = prev[prev.length - 1];
                  // If the last message is from the same role, append text (streaming effect)
                  if (last && last.role === role) {
                     return [...prev.slice(0, -1), { ...last, text: last.text + newText }];
                  } else {
                     // Otherwise, start a new bubble
                     return [...prev, { role: role, text: newText }];
                  }
               });
            }

            // 3. Handle Audio Output (Skip if interrupted in this message)
            if (serverContent?.interrupted) return;

            const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
               setIsAiSpeaking(true);
               const ctx = audioContextsRef.current?.output;
               if (!ctx) return;

               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               
               const audioBuffer = await decodeAudioData(
                 decodeAudio(base64Audio),
                 ctx,
                 24000,
                 1
               );

               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNode); // Connect to output node
               source.start(nextStartTimeRef.current);
               
               nextStartTimeRef.current += audioBuffer.duration;
               
               const sources = audioSourcesRef.current;
               sources.add(source);
               source.onended = () => {
                  sources.delete(source);
                  if (sources.size === 0) setIsAiSpeaking(false);
               };
            }
          },
          onclose: () => {
            console.log("Session closed");
            endCall();
          },
          onerror: (err) => {
            console.error("Session error", err);
            endCall();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to start call:", error);
      alert("Failed to connect call. Please check permissions and try again.");
      endCall();
    }
  };

  const endCall = async () => {
    // Cleanup AI Session
    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) { console.error("Error closing session", e); }
      sessionPromiseRef.current = null;
    }

    // Stop Audio Sources
    audioSourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e){}
    });
    audioSourcesRef.current.clear();

    // Close Contexts
    if (audioContextsRef.current?.input) audioContextsRef.current.input.close();
    if (audioContextsRef.current?.output) audioContextsRef.current.output.close();
    
    // Stop Streams
    if (streamsRef.current?.input) {
      streamsRef.current.input.getTracks().forEach(t => t.stop());
    }

    setCallStatus('idle');
    setIsCalling(false);
    setIsAiSpeaking(false);
    nextStartTimeRef.current = 0;
  };

  // Swipe Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMenuOpen || isCalling) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isMenuOpen || isCalling || !touchStartRef.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchStartRef.current.x - touchEndX;
    const dy = touchStartRef.current.y - touchEndY;
    
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const minSwipeDistance = 50;

    if (absDx < 10 && absDy < 10) {
      setIsPlaying(!isPlaying);
    } 
    else if (absDy > absDx && absDy > minSwipeDistance) {
      if (dy > 0) {
        if (currentIndex < feedItems.length - 1) setCurrentIndex(c => c + 1);
        else setCurrentIndex(0);
      } else {
        if (currentIndex > 0) setCurrentIndex(c => c - 1);
        else setCurrentIndex(feedItems.length - 1);
      }
    }
    touchStartRef.current = null;
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handleCreateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) navigate('/');
    else navigate('/create');
  };

  return (
    <div className="relative w-full h-screen bg-dark-900 overflow-hidden select-none font-sans">
      
      {/* Video Player Layer */}
      <div 
        className="absolute inset-0 bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
         <video 
            ref={videoRef}
            key={currentItem?.id}
            src={currentItem?.url}
            poster={currentItem?.poster}
            className="w-full h-full object-cover"
            playsInline
            loop
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
         />
         <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
      </div>

      {/* Progress Bar */}
      {!isMenuOpen && !isCalling && (
        <div className="absolute top-2 left-2 right-2 z-30 h-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Header Layer */}
      <div className={`absolute top-6 left-0 right-0 p-4 flex justify-between items-start z-30 transition-opacity duration-300 ${isMenuOpen || isCalling ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-2 pointer-events-auto">
            <span className="text-xl font-serif font-bold text-white tracking-widest drop-shadow-lg">KIZUNA</span>
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
            <button 
                onClick={toggleMute}
                className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/30 transition-colors"
            >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            <button 
                onClick={handleCreateClick}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-500 to-brand-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/40 hover:scale-105 active:scale-95 transition-all"
            >
                <Plus size={24} strokeWidth={2.5} />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }}
              className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/30 transition-colors"
            >
                <MoreHorizontal size={20} />
            </button>
        </div>
      </div>

      {/* Character Info & Chat Layer */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 pb-8 z-30 transition-opacity duration-300 ${isMenuOpen || isCalling ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="mb-6 space-y-3">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm overflow-hidden border border-white/40">
                   <img src={currentItem.avatar} className="w-full h-full object-cover" alt="Avatar" />
                </div>
                <span className="text-white font-bold text-sm drop-shadow-md">{currentItem.characterName}</span>
             </div>

             {currentItem?.lines.map((line, i) => (
                <p 
                  key={i}
                  className="text-white text-sm leading-relaxed font-medium drop-shadow-md max-w-[90%]"
                  style={{
                      animation: `fadeInMoveUp 0.8s ease-out forwards ${i * 1.5}s`,
                      opacity: 0 
                  }}
                >
                  {line}
                </p>
             ))}
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
            <div className="flex-1 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center px-4 transition-colors hover:bg-white/15 focus-within:bg-white/20 focus-within:border-white/40">
                <input 
                    type="text" 
                    placeholder={`Reply to ${currentItem.characterName}...`} 
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/60 text-sm"
                    onKeyDown={(e) => e.stopPropagation()} 
                />
            </div>

            {/* Phone Call Button */}
            <button 
                onClick={startCall}
                className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30 hover:bg-green-400 transition-colors transform active:scale-95"
            >
                <Phone size={20} />
            </button>

            <button className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-colors transform active:scale-95">
                <Send size={20} className="ml-1" />
            </button>
        </div>
      </div>

      {/* --- CALL OVERLAY --- */}
      {isCalling && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
           
           {/* Top Info */}
           <div className="flex flex-col items-center mt-12 mb-4">
              <h2 className="text-xl font-bold text-white mb-1">{currentItem.characterName}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${callStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-300'}`}>
                 {callStatus === 'connecting' ? 'Connecting...' : 'Live Call'}
              </span>
           </div>

           {/* Visualization / Avatar */}
           <div className="flex-shrink-0 flex justify-center relative mb-6">
               {/* Pulse Animation Only when AI is speaking */}
               {callStatus === 'connected' && isAiSpeaking && (
                  <div className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-brand-500/50 animate-ping"></div>
               )}
               
               {/* Passive ring when connected but silent (Listening) */}
               {callStatus === 'connected' && !isAiSpeaking && (
                  <div className="absolute inset-0 m-auto w-24 h-24 rounded-full border border-green-500/30 animate-pulse"></div>
               )}

               <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 relative z-10 shadow-xl bg-black">
                  <img src={currentItem.avatar} alt="Avatar" className="w-full h-full object-cover" />
               </div>
           </div>

           {/* Transcript / Chat Area (Scrollable) */}
           <div className="flex-1 overflow-y-auto px-6 space-y-4 mb-4 mask-image-gradient">
              {transcripts.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div 
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                         msg.role === 'user' 
                           ? 'bg-brand-600/80 text-white rounded-tr-sm' 
                           : 'bg-white/10 backdrop-blur-md text-gray-100 rounded-tl-sm'
                      }`}
                   >
                      {msg.text}
                   </div>
                </div>
              ))}
              <div ref={transcriptsEndRef} />
           </div>

           {/* Controls */}
           <div className="flex items-center justify-center gap-10 pb-12 pt-4 bg-gradient-to-t from-black/90 to-transparent">
              <button 
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={`p-4 rounded-full transition-colors ${isMicMuted ? 'bg-white text-dark-900' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button 
                onClick={endCall}
                className="p-5 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/40 hover:bg-red-400 hover:scale-105 transition-all"
              >
                <PhoneOff size={28} />
              </button>
           </div>
        </div>
      )}

      {/* Menu Overlay */}
      {isMenuOpen && (
        <div className="absolute inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="relative w-[85%] max-w-xs h-full bg-[#1a1a1a] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col text-white p-6 border-l border-white/10">
            {/* ... Menu Content (Same as before) ... */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-full border-2 border-brand-500 overflow-hidden">
                 <img 
                   src={currentUser ? "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" : "https://api.dicebear.com/7.x/avataaars/svg?seed=Guest"} 
                   alt="User" 
                   className="w-full h-full object-cover bg-gray-800"
                 />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{currentUser?.name || "Guest User"}</h2>
                  <Edit3 size={14} className="text-gray-400 cursor-pointer" />
                </div>
                <p className="text-xs text-gray-500">ID: {currentUser?.id || "000000"}</p>
              </div>
            </div>

            <div 
              onClick={() => navigate('/wallet')}
              className="bg-[#252525] rounded-2xl p-4 mb-6 flex flex-col justify-between h-24 border border-white/5 relative overflow-hidden group cursor-pointer hover:border-brand-500/50 transition-all"
            >
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-brand-500/10 rounded-full blur-xl group-hover:bg-brand-500/20 transition-colors"></div>
              <span className="text-sm font-medium text-gray-400">Wallet</span>
              <div className="flex items-center gap-2 text-2xl font-bold text-yellow-400">
                <Coins size={24} fill="currentColor" className="text-yellow-500" />
                <span>37</span>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <button 
                onClick={() => navigate('/manage')}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <List size={20} className="text-gray-400 group-hover:text-white" />
                  <span className="text-sm font-medium">Manage Stories</span>
                </div>
                <ChevronRight size={16} className="text-gray-600 group-hover:text-white" />
              </button>

              <button 
                onClick={() => navigate('/feedback')}
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={20} className="text-gray-400 group-hover:text-white" />
                  <span className="text-sm font-medium">Give Feedback</span>
                </div>
                <ChevronRight size={16} className="text-gray-600 group-hover:text-white" />
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <Share2 size={20} className="text-gray-400 group-hover:text-white" />
                  <span className="text-sm font-medium">Share</span>
                </div>
                <ChevronRight size={16} className="text-gray-600 group-hover:text-white" />
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <Flag size={20} className="text-gray-400 group-hover:text-white" />
                  <span className="text-sm font-medium">Report</span>
                </div>
                <ChevronRight size={16} className="text-gray-600 group-hover:text-white" />
              </button>
            </div>

            <div className="mt-auto pt-6 border-t border-white/10">
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-3 rounded-xl border border-white/20 text-sm font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                Exit
              </button>
            </div>

          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeInMoveUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mask-image-gradient {
           mask-image: linear-gradient(to bottom, transparent, black 10%, black 100%);
           -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 100%);
        }
      `}</style>
    </div>
  );
}