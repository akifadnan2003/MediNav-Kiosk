// frontend/src/App.js
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css'; 
import AvatarScreen from './AvatarScreen';

const SERVER_URL = 'http://localhost:5001';
const RECORDING_DURATION = 5000;

// Video Sources
const idleVideoURL = "/videos/idle_loop.mp4";
const activateVideoURL = "/videos/stand_up_and_walk.mp4";
const greetingVideoURL = "/videos/greeting_loop.mp4";

// Screen
const ListeningScreen = () => ( <div className="screen"><div className="listening-animation"></div><p className="status-text">Listening...</p></div> );
const ProcessingScreen = () => ( <div className="screen"><div className="processing-animation">+</div><p className="status-text">Processing...</p></div> );
const ResponseScreen = ({ response, onReset }) => ( <div className="screen"><div className="response-box"><div>✓</div><p>{response.response_en}</p></div><button onClick={onReset} className="ask-another-btn">Ask Another Question</button></div> );
const FallbackScreen = ({ response, onReset }) => ( <div className="screen"><div className="response-box error"><div>!</div><p>{response.response_en}</p></div><button onClick={onReset} className="ask-another-btn">Try Again</button></div> );

// Main App
function App() {
  const [appState, setAppState] = useState('welcome');
  const [welcomeKey, setWelcomeKey] = useState(0);
  const [socket, setSocket] = useState(null);
  const [response, setResponse] = useState(null);

  const idleVideoRef = useRef(null);
  const activateVideoRef = useRef(null);
  const greetingVideoRef = useRef(null);
  const activationTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null); // Ref for the hidden file input

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
      console.log("Avatar Activated!");
      setAppState('greeting');
      
      if (activateVideoRef.current) {
        activateVideoRef.current.currentTime = 0;
        activateVideoRef.current.play();
      }
      
      const onActivationEnd = () => {
          if (greetingVideoRef.current) {
              greetingVideoRef.current.play();
          }
          const utterance = new SpeechSynthesisUtterance("Hello! How can I help you?");
          window.speechSynthesis.speak(utterance);
      };
      
      activateVideoRef.current.addEventListener('ended', onActivationEnd, { once: true });
      activationTimeoutRef.current = setTimeout(handleReset, 15000);
  };

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
                socket.emit('process_audio', { audio_data: arrayBuffer });
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
      console.log("Resetting state.");
      setAppState('welcome');
      setWelcomeKey(prevKey => prevKey + 1); 
      if (idleVideoRef.current) {
          idleVideoRef.current.play();
      }
  };

  // --- NEW: File Upload Logic ---
  const handleFileUploadClick = () => {
      fileInputRef.current.click(); // Trigger the hidden file input
  };

  const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (file && socket) {
          console.log(`File selected: ${file.name}`);
          const reader = new FileReader();
          reader.onload = (e) => {
              const arrayBuffer = e.target.result;
              console.log(`Sending file buffer of size ${arrayBuffer.byteLength} to backend.`);
              // We use the same 'process_audio' event
              socket.emit('process_audio', { audio_data: arrayBuffer });
              setAppState('processing'); // Go to processing screen
          };
          reader.readAsArrayBuffer(file);
      }
      // Reset the input value to allow uploading the same file again
      event.target.value = null; 
  };


  const renderContent = () => {
    switch (appState) {
      case 'listening': return <ListeningScreen />;
      case 'processing': return <ProcessingScreen />;
      case 'response': return <ResponseScreen response={response} onReset={handleReset} />;
      case 'fallback': return <FallbackScreen response={response} onReset={handleReset} />;
      default: return null;
    }
  };

  return (
    <div className="kiosk-container">
        <div className="avatar-video-container">
            <video ref={idleVideoRef} src={idleVideoURL} autoPlay muted loop className={`avatar-video ${appState === 'welcome' ? 'visible' : ''}`}></video>
            <video ref={activateVideoRef} src={activateVideoURL} muted className={`avatar-video ${appState === 'greeting' ? 'visible' : ''}`}></video>
            <video ref={greetingVideoRef} src={greetingVideoURL} muted loop className={`avatar-video ${appState === 'greeting' && activateVideoRef.current?.paused ? 'visible' : ''}`}></video>
        </div>

        {appState === 'welcome' && (
            <div key={welcomeKey}>
                <AvatarScreen onActivate={handleActivation} />
                <div className={`ui-overlay welcome-text visible`}>
                    <h2>Wave at the camera to begin</h2>
                </div>
            </div>
        )}

        <div className={`ui-overlay greeting-box ${appState === 'greeting' ? 'visible' : ''}`}>
            <p className="greeting-en">Hello! How can I help you?</p>
            <button onClick={handleStartSpeaking} className="mic-button">Tap to Speak</button>
        </div>
        
        {/* --- NEW: Hidden File Input and Visible Upload Button --- */}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            accept="audio/*"
        />
        <button onClick={handleFileUploadClick} className="upload-button">
            Test Audio File
        </button>

        {renderContent()}
    </div>
  );
}

export default App;