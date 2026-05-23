import React, { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useGraph } from '@react-three/fiber';
import { useGLTF, Environment, Float, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { logger } from "@/lib/logger";

const AvatarModel = ({ url, volume = 0 }) => {
    const { scene } = useGLTF(url);
    const { nodes } = useGraph(scene);

    // Store refs to all relevant meshes matching facial features
    const facialMeshesRef = useRef([]);

    // Blink State
    const blinkRef = useRef(0);
    const nextBlinkTime = useRef(Date.now() + 3000);

    // Viseme State
    const visemeTargetRef = useRef('viseme_aa');
    const lastVisemeUpdateRef = useRef(0);

    // Standard ARKit/RPM Viseme mapping priority
    const VISEMES = useMemo(() => [
        ['viseme_aa', 'jawOpen', 'mouthOpen'], // 0: Big Open
        ['viseme_E', 'mouthSmile'],             // 1: Wide/Flat
        ['viseme_I', 'mouthUpperUp_Left'],      // 2: Teeth
        ['viseme_O', 'mouthFunnel'],            // 3: Round Open
        ['viseme_U', 'mouthPucker'],            // 4: Tight Round
        ['viseme_FF', 'mouthRollLower'],        // 5: Lip Bite
        ['viseme_TH', 'tongueOut'],             // 6: Tongue
        ['viseme_PP', 'mouthPressLeft'],        // 7: Closed/Press
    ], []);

    // Inspect nodes to find ALL meshes that need animation (Head, Beard, Teeth)
    useEffect(() => {
        const foundMeshes = [];
        Object.values(nodes).forEach((node) => {
            // Check if node has morph targets
            if (node.morphTargetDictionary) {
                const name = node.name.toLowerCase();
                // We want to drive Head, Beard, Teeth, Mustache
                if (name.includes('head') ||
                    name.includes('beard') ||
                    name.includes('mustache') ||
                    name.includes('teeth') ||
                    name.includes('tooth')) {

                    foundMeshes.push(node);
                }
            }
        });
        facialMeshesRef.current = foundMeshes;
        logger.debug("Facial meshes found:", foundMeshes.map(m => m.name));
    }, [nodes, url]); // Re-run if model changes

    useFrame((state, delta) => {
        if (!facialMeshesRef.current.length) return;

        const time = Date.now();

        // --- 1. STOCHASTIC VISEME LIP SYNC ---
        const talkingThreshold = 0.05;
        const isTalking = volume > talkingThreshold;
        const talkingIntensity = THREE.MathUtils.clamp(volume * 4.0, 0, 1.2);

        // Update target viseme every 50-120ms if talking
        if (isTalking && (time - lastVisemeUpdateRef.current > 80)) {
            // Pick a random viseme logic...
            const rand = Math.random();
            let index = 0;

            if (volume > 0.3) {
                index = Math.floor(Math.random() * 4); // 0-3 (Open shapes)
            } else {
                index = Math.floor(Math.random() * 4) + 4; // 4-7 (Closed shapes)
            }
            if (index >= VISEMES.length) index = 0;

            // For the global target, we just store the preferred names
            // We'll resolve them per-mesh later
            visemeTargetRef.current = VISEMES[index];
            lastVisemeUpdateRef.current = time - (Math.random() * 20);
        } else if (!isTalking) {
            visemeTargetRef.current = null;
        }

        // Apply morphs to ALL tracked meshes
        facialMeshesRef.current.forEach(mesh => {
            if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) return;

            const dict = mesh.morphTargetDictionary;

            // Resolve the current target viseme name for THIS specific mesh
            let currentTargetName = null;
            if (isTalking && visemeTargetRef.current) {
                // visemeTargetRef.current is an array of candidates e.g. ['viseme_aa', 'jawOpen']
                for (let candidate of visemeTargetRef.current) {
                    if (dict.hasOwnProperty(candidate)) {
                        currentTargetName = candidate;
                        break;
                    }
                }
                // Fallback for generic meshes (beard might only have jawOpen)
                if (!currentTargetName && (dict.hasOwnProperty('jawOpen') || dict.hasOwnProperty('mouthOpen'))) {
                    currentTargetName = dict.hasOwnProperty('jawOpen') ? 'jawOpen' : 'mouthOpen';
                }
            }

            // Iterate all morphs on this mesh to animate or reset them
            Object.keys(dict).forEach(key => {
                // Skip blink morphs here, handled separately
                if (key.includes('blink') || key.includes('eye')) return;

                let targetInfluence = 0;

                // If this key matches our current target, set intensity
                if (key === currentTargetName) {
                    targetInfluence = talkingIntensity;
                }

                // Lerp
                const idx = dict[key];
                const current = mesh.morphTargetInfluences[idx];
                const speed = targetInfluence > current ? 0.6 : 0.2; // Attack vs Decay
                mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(current, targetInfluence, speed);
            });

            // --- 2. EYE BLINKING (Only for Head mesh usually) ---
            // Only apply if the mesh actually has blink targets
            if (dict['eyesClosed'] || dict['blink'] || dict['eyeBlinkLeft']) {
                if (time > nextBlinkTime.current) {
                    blinkRef.current = 1;
                    nextBlinkTime.current = time + 2000 + Math.random() * 4000;
                }

                const blinkTarget = dict['eyesClosed'] ?? dict['blink'] ?? dict['eyeBlinkLeft'];
                const blinkTargetR = dict['eyeBlinkRight'];

                if (blinkTarget !== undefined) {
                    let blinkVal = mesh.morphTargetInfluences[blinkTarget];
                    if (blinkRef.current === 1) { // Closing
                        blinkVal = THREE.MathUtils.lerp(blinkVal, 1, 0.4);
                        if (blinkVal > 0.9) blinkRef.current = -1;
                    } else if (blinkRef.current === -1) { // Opening
                        blinkVal = THREE.MathUtils.lerp(blinkVal, 0, 0.3);
                        if (blinkVal < 0.1) blinkRef.current = 0;
                    }
                    mesh.morphTargetInfluences[blinkTarget] = blinkVal;
                    if (blinkTargetR !== undefined) mesh.morphTargetInfluences[blinkTargetR] = blinkVal;
                }
            }
        });

        // --- 3. HEAD MOTION (Global Scene Rotation) ---
        if (talkingIntensity > 0.1) {
            scene.rotation.x = THREE.MathUtils.lerp(scene.rotation.x, Math.sin(time / 100) * 0.05 * talkingIntensity, 0.1);
            scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, Math.sin(time / 230) * 0.03 * talkingIntensity, 0.1);
        } else {
            scene.rotation.x = THREE.MathUtils.lerp(scene.rotation.x, 0, 0.05);
            scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, 0, 0.05);
        }
    });

    return (
        <primitive
            object={scene}
            position={[0, -2.5, 0]}
            scale={1.55}
            rotation={[0, 0, 0]}
        />
    );
};

export default function RealisticAvatar({ modelUrl, volume }) {
    return (
        <div className="w-full h-full relative">
            <Canvas camera={{ position: [0, 0.25, 1.2], fov: 40 }}>
                <ambientLight intensity={0.6} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                <Environment preset="city" />

                <Float
                    speed={2}
                    rotationIntensity={0.2}
                    floatIntensity={0.2}
                    floatingRange={[-0.05, 0.05]}
                >
                    <AvatarModel key={modelUrl} url={modelUrl} volume={volume} />
                </Float>

                <ContactShadows resolution={1024} scale={10} blur={2.5} opacity={0.5} far={10} color="#000000" />
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    minPolarAngle={Math.PI / 2.5}
                    maxPolarAngle={Math.PI / 1.8}
                    minAzimuthAngle={-Math.PI / 6}
                    maxAzimuthAngle={Math.PI / 6}
                />
            </Canvas>
        </div>
    );
}

// Preload models
useGLTF.preload('/avtars/david.glb');
useGLTF.preload('/avtars/julia.glb');
