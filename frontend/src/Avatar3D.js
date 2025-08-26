// frontend/src/Avatar3D.js
import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';

// Simple 3D Character Component
const Character = ({ isIdle, isWalking, isGreeting, position }) => {
  const meshRef = useRef();
  const bookRef = useRef();
  const [time, setTime] = useState(0);

  useFrame((state, delta) => {
    setTime(time + delta);
    
    if (meshRef.current) {
      if (isIdle) {
        // Idle animation - slight breathing movement
        meshRef.current.position.y = Math.sin(time * 2) * 0.05;
        meshRef.current.rotation.x = Math.sin(time * 1.5) * 0.02;
      } else if (isWalking) {
        // Walking animation - move to center
        const targetX = 0;
        const currentX = meshRef.current.position.x;
        const step = delta * 2; // Speed of walking
        
        if (Math.abs(currentX - targetX) > 0.1) {
          meshRef.current.position.x += (targetX - currentX) * step;
          // Add walking bob
          meshRef.current.position.y = Math.sin(time * 8) * 0.1;
          meshRef.current.rotation.z = Math.sin(time * 8) * 0.05;
        }
      } else if (isGreeting) {
        // Greeting animation - wave hand
        meshRef.current.rotation.z = Math.sin(time * 4) * 0.2;
      }
    }

    // Animate book if reading
    if (bookRef.current && isIdle) {
      bookRef.current.rotation.x = Math.sin(time * 1.2) * 0.05;
    }
  });

  return (
    <group ref={meshRef} position={position || [-3, 0, 0]}>
      {/* Character Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.3, 1.2, 4, 8]} />
        <meshStandardMaterial color="#4a90e2" />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.08, 0.95, 0.2]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.08, 0.95, 0.2]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#000" />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.4, 0.2, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.1, 0.6, 4, 8]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
      <mesh position={[0.4, 0.2, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.1, 0.6, 4, 8]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.15, -0.8, 0]}>
        <capsuleGeometry args={[0.12, 0.6, 4, 8]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0.15, -0.8, 0]}>
        <capsuleGeometry args={[0.12, 0.6, 4, 8]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>

      {/* Book (only visible when idle/reading) */}
      {isIdle && (
        <group ref={bookRef} position={[0, 0.1, 0.3]} rotation={[-0.3, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.3, 0.4, 0.05]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          {/* Book pages */}
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.28, 0.38, 0.02]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Environment setup
const Scene = ({ avatarState, onAnimationComplete }) => {
  const [characterPosition, setCharacterPosition] = useState([-3, 0, 0]);
  const [currentState, setCurrentState] = useState('idle');

  useEffect(() => {
    if (avatarState === 'activated') {
      setCurrentState('walking');
      // Simulate walking animation duration
      setTimeout(() => {
        setCurrentState('greeting');
        setCharacterPosition([0, 0, 0]);
        onAnimationComplete();
      }, 2000);
    }
  }, [avatarState, onAnimationComplete]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 5, 0]} intensity={0.3} />

      {/* Character */}
      <Character 
        isIdle={currentState === 'idle'}
        isWalking={currentState === 'walking'}
        isGreeting={currentState === 'greeting'}
        position={characterPosition}
      />

      {/* Environment elements */}
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#e8f4f8" />
      </mesh>

      {/* Reading chair/bench (only visible in idle state) */}
      {currentState === 'idle' && (
        <group position={[-3, -0.8, -0.5]}>
          <mesh>
            <boxGeometry args={[1, 0.2, 0.8]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          <mesh position={[0, 0.3, -0.2]}>
            <boxGeometry args={[1, 0.6, 0.2]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
        </group>
      )}

      {/* Background elements */}
      <Environment preset="studio" />
    </>
  );
};

// Main Avatar3D Component
const Avatar3D = ({ isActivated, onAnimationComplete }) => {
  const [avatarState, setAvatarState] = useState('idle');

  useEffect(() => {
    if (isActivated) {
      setAvatarState('activated');
    }
  }, [isActivated]);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      zIndex: 1 
    }}>
      <Canvas
        camera={{ position: [0, 2, 5], fov: 75 }}
        shadows
        style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #e8f4f8 100%)' }}
      >
        <Scene 
          avatarState={avatarState} 
          onAnimationComplete={onAnimationComplete}
        />
      </Canvas>
    </div>
  );
};

export default Avatar3D;
