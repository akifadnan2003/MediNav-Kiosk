// frontend/src/App.js
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css'; 
import AvatarScreen from './AvatarScreen';

const SERVER_URL = 'http://localhost:5001';
const RECORDING_DURATION = 5000;

// Video Sources
const idleVideoURL = "/Videos/idle_loop.mp4";
const activateVideoURL = "/Videos/stand_up_and_walk.mp4";
const greetingVideoURL = "/Videos/greeting_loop.mp4";
const processingVideoURL = "/Videos/processing_loop.mp4";

// --- Components ---
const LanguageScreen = ({ onSelectLanguage }) => (
    <div className="screen">
        <div className="language-options">
            <div className="language-choice">
                <div className="language-bubble">?</div>
                <button onClick={() => onSelectLanguage('en')} className="language-btn">English &gt;</button>
            </div>
            <div className="language-choice">
                <div className="language-bubble">?</div>
                <button onClick={() => onSelectLanguage('ur')} className="language-btn urdu-font">اردو &gt;</button>
            </div>
        </div>
    </div>
);
const ListeningScreen = () => ( <div className="screen"><div className="listening-animation"></div><p className="status-text">Listening...</p></div> );
const ResponseScreen = ({ response, onReset, lang }) => {
    const responseText = lang === 'ur' ? response.response_ur : response.response_en;
    const isUrdu = lang === 'ur';
    return (
        <div className="screen">
            <div className="response-box">
                <div className="response-check">✓</div>
                <p className={`response-text ${isUrdu ? 'urdu-font' : ''}`} dir={isUrdu ? 'rtl' : 'ltr'}>{responseText}</p>
            </div>
            <button onClick={onReset} className="ask-another-btn">Ask Another Question</button>
        </div> 
    );
};
const FallbackScreen = ({ response, onReset, lang }) => {
    const responseText = lang === 'ur' ? response.response_ur : response.response_en;
    const isUrdu = lang === 'ur';
    return (
        <div className="screen">
            <div className="response-box error">
                <div className="response-check">!</div>
                <p className={`response-text ${isUrdu ? 'urdu-font' : ''}`} dir={isUrdu ? 'rtl' : 'ltr'}>{responseText}</p>
            </div>
            <button onClick={onReset} className="ask-another-btn">Try Again</button>
        </div> 
    );
};

// --- Main App Component ---
function App() {
  const [appState, setAppState] = useState('welcome');
  const [welcomeKey, setWelcomeKey] = useState(0);
  const [socket, setSocket] = useState(null);
  const [response, setResponse] = useState(null);
  const language = 'en'; // Always English

  const idleVideoRef = useRef(null);
  const activateVideoRef = useRef(null);
  const greetingVideoRef = useRef(null);
  const processingVideoRef = useRef(null);
  const activationTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const cameraStreamRef = useRef(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    newSocket.on('connect', () => console.log('Connected to backend'));
    newSocket.on('response', (data) => {
        setResponse(data);
        setAppState('response');
    });
    newSocket.on('fallback_response', (data) => {
        setResponse(data);
        setAppState('fallback');
    });
    return () => newSocket.close();
  }, []);
  
  const handleActivation = () => {
      console.log("Avatar Activated by face and hand detection!");
      if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
      // Play stand up and walk video, then greeting video, then show greeting UI
      setAppState('activate');
      if (activateVideoRef.current) {
        activateVideoRef.current.currentTime = 0;
        activateVideoRef.current.play();
        activateVideoRef.current.onended = () => {
          setAppState('greeting');
          if (greetingVideoRef.current) greetingVideoRef.current.play();
        };
      } else {
        // Fallback: go straight to greeting
        setAppState('greeting');
        if (greetingVideoRef.current) greetingVideoRef.current.play();
      }
  };

  // Removed handleLanguageSelect


 const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        
        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result;
                socket.emit('process_audio', { audio_data: arrayBuffer, lang: language });
            };
            reader.readAsArrayBuffer(audioBlob);

            audioChunksRef.current = [];
            stream.getTracks().forEach(track => track.stop());
        };

        audioChunksRef.current = [];
        mediaRecorderRef.current.start();
        setAppState('listening');

        setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
                setAppState('processing');
                if (processingVideoRef.current) processingVideoRef.current.play();
            }
        }, RECORDING_DURATION);

    } catch (error) {
        console.error("Error accessing microphone:", error);
        setAppState('welcome');
    }
  };

  const handleStartSpeaking = () => {
      clearTimeout(activationTimeoutRef.current);
      if (!socket) return;
      startRecording();
  };

  const handleReset = () => {
      clearTimeout(activationTimeoutRef.current);
      setAppState('welcome');
      setWelcomeKey(prevKey => prevKey + 1); 
      if (idleVideoRef.current) {
          idleVideoRef.current.play();
      }
  };

  const handleFileUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && socket) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        socket.emit('process_audio', { 
            audio_data: arrayBuffer, 
            lang: language 
        });
        setAppState('processing');
        if (processingVideoRef.current) processingVideoRef.current.play();
      };
      reader.readAsArrayBuffer(file);
    }
    event.target.value = null;
  };

  const renderContent = () => {
    switch (appState) {
      case 'listening': return <ListeningScreen />;
      case 'response': return <ResponseScreen response={response} onReset={handleReset} lang={language} />;
      case 'fallback': return <FallbackScreen response={response} onReset={handleReset} lang={language} />;
      default: return null;
    }
  };

  return (
    <div className="kiosk-container">
      <div className="avatar-video-container">
        <video ref={idleVideoRef} src={idleVideoURL} autoPlay muted loop className={`avatar-video ${appState === 'welcome' ? 'visible' : ''}`}></video>
        <video ref={activateVideoRef} src={activateVideoURL} muted className={`avatar-video ${appState === 'activate' ? 'visible' : ''}`}></video>
        <video ref={greetingVideoRef} src={greetingVideoURL} muted loop className={`avatar-video ${appState === 'greeting' ? 'visible' : ''}`}></video>
        <video ref={processingVideoRef} src={processingVideoURL} autoPlay muted loop className={`avatar-video ${appState === 'processing' ? 'visible' : ''}`}></video>
      </div>

      {appState === 'welcome' && (
        <div key={welcomeKey}>
          <AvatarScreen 
            onActivate={handleActivation} 
            onStreamReady={(stream) => { cameraStreamRef.current = stream; }}
          />
          <div className={`ui-overlay welcome-text visible`}>
            <h2>Wave at the camera to begin</h2>
          </div>
        </div>
      )}

      <div className={`ui-overlay greeting-box ${appState === 'greeting' ? 'visible' : ''}`}>
        <p className="greeting-en">Hello! How can I help you?</p>
        <button onClick={handleStartSpeaking} className="mic-button">Tap to Speak</button>
      </div>
      {appState === 'greeting' && (
           <button onClick={handleFileUploadClick} className="upload-button">
              Test Audio File
           </button>
      )}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        accept="audio/*"
      />

      {renderContent()}
    </div>
  );
}

export default App;