import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function HolographicHead({ isSpeaking, volumeLevel }) {
    const meshRef = useRef();
    const materialRef = useRef();

    // Create a complex geometry that simulates a "digital brain/head"
    // We use a distorted sphere that pulses and deforms with voice

    useFrame((state) => {
        if (!meshRef.current) return;

        // Idle Animation: continuous gentle rotation and distortion
        const time = state.clock.getElapsedTime();

        // Voice Reaction Logic
        // Amplify volume for visual impact
        const intensity = isSpeaking ? Math.max(0.1, volumeLevel * 3) : 0;
        const targetDistort = 0.3 + intensity * 0.5;
        const targetSpeed = 1.5 + intensity * 5;

        // Smoothly interpolate current values to target
        materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, targetDistort, 0.1);
        materialRef.current.speed = THREE.MathUtils.lerp(materialRef.current.speed, targetSpeed, 0.1);

        // Rotate faster when speaking
        meshRef.current.rotation.y += 0.005 + (intensity * 0.02);
        meshRef.current.rotation.x = Math.sin(time * 0.5) * 0.1;

        // Pulse color when speaking
        if (isSpeaking && volumeLevel > 0.05) {
            const hue = (time * 0.1) % 1;
            const color = new THREE.Color().setHSL(0.6 + intensity * 0.1, 0.8, 0.5 + intensity * 0.3);
            materialRef.current.color.lerp(color, 0.2);
        } else {
            // Return to base color
            materialRef.current.color.lerp(new THREE.Color("#6366f1"), 0.05);
        }
    });

    return (
        <Sphere ref={meshRef} args={[1, 64, 64]} scale={2}>
            <MeshDistortMaterial
                ref={materialRef}
                color="#6366f1"
                envMapIntensity={1}
                clearcoat={1}
                clearcoatRoughness={0.1}
                metalness={0.5}
            />
        </Sphere>
    );
}

function Scene({ isSpeaking, volumeLevel }) {
    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#818cf8" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c084fc" />

            {/* Holographic "Particles" Aura */}
            <Sparkles
                count={200}
                scale={6}
                size={2}
                speed={0.4}
                opacity={0.5}
                color="#a5b4fc"
            />

            {/* The "Entity" */}
            <HolographicHead isSpeaking={isSpeaking} volumeLevel={volumeLevel} />

            {/* Dynamic Rings/Grid reacting to voice */}
            <mesh rotation-x={-Math.PI / 2} position={[0, -2.5, 0]}>
                <ringGeometry args={[1.5, 3.5, 64]} />
                <meshStandardMaterial
                    color="#4f46e5"
                    transparent
                    opacity={0.1}
                    wireframe
                    side={THREE.DoubleSide}
                />
            </mesh>

            <Environment preset="city" />
            <OrbitControls enableZoom={false} enablePan={false} autoRotate={!isSpeaking} autoRotateSpeed={0.5} />
        </>
    );
}

export default function Avatar3D({ isSpeaking, volumeLevel }) {
    return (
        <div className="w-full h-full min-h-[400px]">
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
                <Scene isSpeaking={isSpeaking} volumeLevel={volumeLevel} />
            </Canvas>
        </div>
    );
}
