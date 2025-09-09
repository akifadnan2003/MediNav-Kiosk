// frontend/src/AvatarScreen.js
import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-converter';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/handpose';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

const DWELL_TIME_MS = 1200;
const INITIAL_DELAY_MS = 2000;

const AvatarScreen = ({ onActivate, onStreamReady }) => {
    const videoRef = useRef(null);
    const [status, setStatus] = useState('Initializing...');
    const handDetectorRef = useRef(null);
    const faceDetectorRef = useRef(null);
    const dwellTimerRef = useRef(null);
    const streamRef = useRef(null);
    const detectionActive = useRef(false);

    useEffect(() => {
        let detectionInterval;

        const setupCamera = async () => {
            try {
                setStatus('Requesting camera...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (onStreamReady) onStreamReady(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    return new Promise((resolve) => {
                        videoRef.current.onloadedmetadata = () => resolve(videoRef.current);
                    });
                }
            } catch (err) {
                setStatus("Camera access denied.");
                return null;
            }
        };

        const detectGesture = async () => {
            if (!handDetectorRef.current || !faceDetectorRef.current || !videoRef.current || videoRef.current.readyState !== 4 || !detectionActive.current) {
                return;
            }
            const video = videoRef.current;
            
            // Run both detectors
            const faces = await faceDetectorRef.current.estimateFaces(video);
            const hands = await handDetectorRef.current.estimateHands(video);
            
            let facePresent = faces.length > 0;
            let handWaving = false;

            if (hands.length > 0) {
                const hand = hands[0];
                // Check if a key landmark (like the wrist or palm) is in the middle
                const palmBase = hand.landmarks[0]; 
                const videoWidth = video.videoWidth;
                if (palmBase[0] > videoWidth / 4 && palmBase[0] < (videoWidth / 4) * 3) {
                    handWaving = true;
                }
            }
            
            // Activate if either a face OR a hand is detected
            if (facePresent || handWaving) {
                setStatus('Face or Hand Detected!');
                if (!dwellTimerRef.current) {
                    dwellTimerRef.current = setTimeout(() => {
                        detectionActive.current = false;
                        onActivate();
                    }, DWELL_TIME_MS);
                }
            } else {
                setStatus('Please show your face or wave at the camera to begin');
                clearTimeout(dwellTimerRef.current);
                dwellTimerRef.current = null;
            }
        };

        const loadModels = async () => {
            try {
                setStatus('Loading AI models...');
                await tf.setBackend('webgl');
                await tf.ready();
                
                // Load both models in parallel for speed
                const [handModel, faceModel] = await Promise.all([
                    handpose.load(),
                    faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
                        runtime: 'tfjs',
                        maxFaces: 1,
                    })
                ]);

                handDetectorRef.current = handModel;
                faceDetectorRef.current = faceModel;
                console.log("✅ Both face and hand models loaded.");

                const video = await setupCamera();
                if (video) {
                    setTimeout(() => {
                        if (streamRef.current) {
                            detectionActive.current = true;
                            detectionInterval = setInterval(detectGesture, 100);
                        }
                    }, INITIAL_DELAY_MS);
                }
            } catch (error) {
                console.error("❌ Error loading models:", error);
                setStatus("Failed to load AI models.");
            }
        };

        loadModels();

        return () => {
            clearInterval(detectionInterval);
            clearTimeout(dwellTimerRef.current);
        };
    }, [onActivate, onStreamReady]);

    return (
        <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline muted className="camera-view"></video>
            <div className="status-box">{status}</div>
        </div>
    );
};

export default AvatarScreen;