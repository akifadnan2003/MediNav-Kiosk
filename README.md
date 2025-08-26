MediNav KioskAn offline, AI-powered kiosk designed to assist hospital visitors with interactive navigation and information. This project was developed as part of an internship at KSOFT in Islamabad.🌟 Core FeaturesGesture-Activated Avatar: The kiosk waits in an idle state. A user can activate it simply by waving their hand at the camera.Animated Video Avatar: A high-quality, pre-rendered video avatar creates an engaging and lifelike user experience, greeting the user and guiding them through the interaction.Offline Speech Recognition: Utilizes OpenAI's powerful Whisper model to transcribe user speech with high accuracy, running entirely on the kiosk's local hardware.Intelligent Intent Recognition: A robust backend processes the user's query to understand their goal (e.g., finding a department, asking for visiting hours).Real-time & Responsive: Built with a modern full-stack architecture for a smooth, seamless user experience without lag.100% Offline: All AI models (Hand Detection, Speech Recognition) are run locally, making the kiosk completely independent of any internet connection.🛠️ Tech StackThis project is a decoupled full-stack application, combining a powerful Python backend with a modern React frontend.BackendFramework: Flask & Flask-SocketIOSpeech Recognition: OpenAI Whisper (via Hugging Face Transformers)Audio Processing: PyDub & FFmpegCore AI Library: PyTorch (with CUDA support for GPU acceleration)FrontendFramework: React.jsGesture Recognition: TensorFlow.js (Handpose Model)Real-time Communication: Socket.IO ClientStyling: CSS3 with responsive design🚀 Getting StartedFollow these instructions to get the project running on your local machine for development and testing.PrerequisitesPython 3.9+Node.js and npmGitFFmpeg: Must be installed on your system and accessible from the command line.(Optional but Recommended) An NVIDIA GPU with CUDA installed for fast transcription.Installation & SetupClone the repository:git clone https://github.com/akifadnan2003/MediNav-Kiosk.git
cd MediNav-Kiosk
Setup the Backend:# Navigate to the backend folder
cd backend

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install Python dependencies
# For GPU support (NVIDIA):
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
# For CPU-only:
# pip install torch

pip install Flask Flask-SocketIO eventlet transformers pydub
Setup the Frontend:# Navigate to the frontend folder
cd ../frontend

# Install Node.js dependencies
npm install

# Install TensorFlow.js packages for hand detection
npm install @tensorflow/tfjs-core @tensorflow/tfjs-converter @tensorflow/tfjs-backend-webgl @tensorflow-models/handpose
Download AI Models:Download the Whisper-base.en model from Hugging Face.Create a folder backend/models/whisper-base-en/.Place all the downloaded model files into this folder.Add Video Assets:Create a folder frontend/public/videos/.Place three .mp4 files inside, named exactly: idle_loop.mp4, stand_up_and_walk.mp4, and greeting_loop.mp4.Running the ApplicationYou need to run the backend and frontend servers simultaneously in two separate terminals.Start the Backend Server:Open a terminal, navigate to the backend folder, and activate the virtual environment.Run the server:python app.py
Start the Frontend Server:Open a second terminal and navigate to the frontend folder.Run the React development server:npm start
Your browser should automatically open to http://localhost:3000, where the application will be running.
