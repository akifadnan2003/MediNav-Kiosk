# MediNav Kiosk


**An offline, AI-powered kiosk designed to assist hospital visitors with interactive navigation and information. This project was developed as part of an internship at KSOFT in Islamabad.**

---

## 🌟 Core Features

* **Gesture-Activated Avatar:** The kiosk waits in an idle state. A user can activate it simply by waving their hand at the camera.
* **Animated Video Avatar:** A high-quality, pre-rendered video avatar creates an engaging and lifelike user experience, greeting the user and guiding them through the interaction.
* **Offline Speech Recognition:** Utilizes OpenAI's powerful Whisper model to transcribe user speech with high accuracy, running entirely on the kiosk's local hardware.
* **Intelligent Intent Recognition:** A robust backend processes the user's query to understand their goal (e.g., finding a department, asking for visiting hours).
* **Real-time & Responsive:** Built with a modern full-stack architecture for a smooth, seamless user experience without lag.
* **100% Offline:** All AI models (Hand Detection, Speech Recognition) are run locally, making the kiosk completely independent of any internet connection.

---

## 🛠️ Tech Stack

This project is a decoupled full-stack application, combining a powerful Python backend with a modern React frontend.

### Backend

* **Framework:** Flask & Flask-SocketIO
* **Speech Recognition:** OpenAI Whisper (via Hugging Face Transformers)
* **Audio Processing:** PyDub & FFmpeg
* **Core AI Library:** PyTorch (with CUDA support for GPU acceleration)

### Frontend

* **Framework:** React.js
* **Gesture Recognition:** TensorFlow.js (Handpose Model)
* **Real-time Communication:** Socket.IO Client
* **Styling:** CSS3 with responsive design

---

## 🚀 Getting Started

Follow these instructions to get the project running on your local machine for development and testing.

### Prerequisites

* Python 3.9+
* Node.js and npm
* Git
* **FFmpeg:** Must be installed on your system and accessible from the command line.
* **(Optional but Recommended)** An NVIDIA GPU with CUDA installed for fast transcription.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/akifadnan2003/MediNav-Kiosk.git](https://github.com/akifadnan2003/MediNav-Kiosk.git)
    cd MediNav-Kiosk
    ```

2.  **Setup the Backend:**
    ```bash
    # Navigate to the backend folder
    cd backend

    # Create and activate a virtual environment
    python -m venv venv
    .\venv\Scripts\activate

    # Install Python dependencies
    # For GPU support (NVIDIA):
    pip install torch torchvision torchaudio --index-url [https://download.pytorch.org/whl/cu121](https://download.pytorch.org/whl/cu121)
    # For CPU-only:
    # pip install torch
    
    pip install Flask Flask-SocketIO eventlet transformers pydub
    ```

3.  **Setup the Frontend:**
    ```bash
    # Navigate to the frontend folder
    cd ../frontend

    # Install Node.js dependencies
    npm install

    # Install TensorFlow.js packages for hand detection
    npm install @tensorflow/tfjs-core @tensorflow/tfjs-converter @tensorflow/tfjs-backend-webgl @tensorflow-models/handpose
    ```

4.  **Download AI Models:**
    * Download the **Whisper-base.en** model from [Hugging Face](https://huggingface.co/openai/whisper-base.en/tree/main).
    * Create a folder `backend/models/whisper-base-en/`.
    * Place all the downloaded model files into this folder.

5.  **Add Video Assets:**
    * Create a folder `frontend/public/videos/`.
    * Place three `.mp4` files inside, named exactly: `idle_loop.mp4`, `stand_up_and_walk.mp4`, and `greeting_loop.mp4`.

### Running the Application

You need to run the backend and frontend servers simultaneously in two separate terminals.

1.  **Start the Backend Server:**
    * Open a terminal, navigate to the `backend` folder, and activate the virtual environment.
    * Run the server:
        ```bash
        python app.py
        ```

2.  **Start the Frontend Server:**
    * Open a **second** terminal and navigate to the `frontend` folder.
    * Run the React development server:
        ```bash
        npm start
        ```

Your browser should automatically open to `http://localhost:3000`, where the application will be running.
