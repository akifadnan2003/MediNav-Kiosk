// frontend/src/AvatarScreen.js
import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-converter';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/handpose';

const CONFIDENCE_THRESHOLD = 0.9;
const DWELL_TIME_MS = 1200;
const INITIAL_DELAY_MS = 2000;

const AvatarScreen = ({ onActivate, onStreamReady }) => {
    const videoRef = useRef(null);
    const [status, setStatus] = useState('Initializing...');
    const modelRef = useRef(null);
    const dwellTimerRef = useRef(null);
    const streamRef = useRef(null);
    const detectionActive = useRef(false);

    useEffect(() => {
        let detectionInterval;

        const setupCamera = async () => {
            try {
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

        const detectHand = async () => {
            if (!modelRef.current || !videoRef.current || videoRef.current.readyState !== 4 || !detectionActive.current) {
                return;
            }
            const video = videoRef.current;
            const predictions = await modelRef.current.estimateHands(video);
            let handInZone = false;

            if (predictions.length > 0) {
                const prediction = predictions[0];
                if (prediction.handInViewConfidence > CONFIDENCE_THRESHOLD) {
                    const palmBase = prediction.landmarks[0];
                    const videoWidth = video.videoWidth;
                    if (palmBase[0] > videoWidth / 3 && palmBase[0] < (videoWidth / 3) * 2) {
                        handInZone = true;
                    }
                }
            }

            if (handInZone) {
                setStatus('Hand Detected!');
                if (!dwellTimerRef.current) {
                    dwellTimerRef.current = setTimeout(() => {
                        detectionActive.current = false;
                        onActivate();
                    }, DWELL_TIME_MS);
                }
            } else {
                setStatus('Scanning for hand...');
                clearTimeout(dwellTimerRef.current);
                dwellTimerRef.current = null;
            }
        };

        const loadHandpose = async () => {
            setStatus('Loading Handpose model...');
            await tf.setBackend('webgl');
            await tf.ready();
            modelRef.current = await handpose.load();
            setStatus('Requesting camera access...');
            const video = await setupCamera();
            if (video) {
                setTimeout(() => {
                    if (streamRef.current) {
                        detectionActive.current = true;
                        detectionInterval = setInterval(detectHand, 100);
                    }
                }, INITIAL_DELAY_MS);
            }
        };

        loadHandpose();

        return () => {
            clearInterval(detectionInterval);
            clearTimeout(dwellTimerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
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