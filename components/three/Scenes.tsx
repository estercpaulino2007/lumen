'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, Lightformer, Float, Sparkles, OrbitControls } from '@react-three/drei';
import { Component, ReactNode, Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Modelos 3D (CC-BY / CC-BY-SA, créditos en CREDITS.md). Optimizados con gltf-transform (meshopt).
// Todo el 3D es decorativo: si WebGL falla o la persona prefiere menos movimiento, se muestra un respaldo en CSS.
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

class Safe extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

function fit(scene: THREE.Object3D, size: number) {
  const box = new THREE.Box3().setFromObject(scene);
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const k = size / Math.max(s.x, s.y, s.z);
  return { k, c };
}

function Studio() {
  // Iluminación tipo estudio sin descargar HDR (funciona sin internet).
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer intensity={3} color="#c4b5fd" position={[0, 4, -6]} scale={[12, 3, 1]} />
      <Lightformer intensity={2.2} color="#38bdf8" position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
      <Lightformer intensity={2.5} color="#8b5cf6" position={[6, -1, 2]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
      <Lightformer intensity={1.2} color="#ffffff" form="ring" position={[0, 0, 6]} scale={4} />
    </Environment>
  );
}

const glass = () => new THREE.MeshPhysicalMaterial({
  color: '#a78bfa', metalness: 0.55, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05,
  iridescence: 1, iridescenceIOR: 1.35, transmission: 0.15, thickness: 1.2, ior: 1.4,
  emissive: new THREE.Color('#5b21b6'), emissiveIntensity: 0.22, envMapIntensity: 2.2,
});

function Sculpture({ model, size }: { model: 'torus' | 'infinity'; size: number }) {
  const { scene } = useGLTF(`/models/${model}.glb`);
  const obj = useMemo(() => {
    const s = scene.clone(true); const m = glass();
    s.traverse((o: any) => { if (o.isMesh) { o.material = m; o.castShadow = false; } });
    const { k, c } = fit(s, size); s.position.set(-c.x * k, -c.y * k, -c.z * k); s.scale.setScalar(k);
    const g = new THREE.Group(); g.add(s); return g;
  }, [scene, size]);
  const ref = useRef<THREE.Group>(null);
  useFrame((st, dt) => { if (!ref.current || reduced()) return; ref.current.rotation.y += dt * 0.25; ref.current.rotation.x = Math.sin(st.clock.elapsedTime * 0.3) * 0.25 + (model === 'infinity' ? 0.35 : 0.5); });
  return <group ref={ref}><primitive object={obj} /></group>;
}

export function HeroSculpture({ model = 'torus', className = '', size = 3.2, sparkles = true }: { model?: 'torus' | 'infinity'; className?: string; size?: number; sparkles?: boolean }) {
  const fb = <div className={`grid place-items-center ${className}`}><div className="orb-fallback h-40 w-40 rounded-full" /></div>;
  return (
    <div className={`${className} cursor-grab active:cursor-grabbing`} aria-hidden="true" title="Arrastra para girar">
      <Safe fallback={fb}>
        <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0, 6], fov: 38 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
          <ambientLight intensity={0.4} />
          <Suspense fallback={null}>
            <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}><Sculpture model={model} size={size} /></Float>
            {sparkles && <Sparkles count={40} scale={[6, 4, 3]} size={2.2} speed={0.35} color="#c4b5fd" opacity={0.7} />}
            <OrbitControls enableZoom={false} enablePan={false} enableDamping rotateSpeed={0.7} />
            <Studio />
          </Suspense>
        </Canvas>
      </Safe>
    </div>
  );
}

/** Luminy: el orbe alquímico dentro de la estructura del Technotron. */
function LuminyModel({ active }: { active?: boolean }) {
  const orb = useGLTF('/models/orb.glb'), tech = useGLTF('/models/technotron.glb');
  const outer = useMemo(() => {
    const s = tech.scene.clone(true);
    const m = new THREE.MeshStandardMaterial({ color: '#7c3aed', emissive: new THREE.Color('#38bdf8'), emissiveIntensity: 0.55, metalness: 0.7, roughness: 0.25, wireframe: true, transparent: true, opacity: 0.75 });
    s.traverse((o: any) => { if (o.isMesh) o.material = m; });
    const { k, c } = fit(s, 3.1); s.position.set(-c.x * k, -c.y * k, -c.z * k); s.scale.setScalar(k);
    const g = new THREE.Group(); g.add(s); return { g, m };
  }, [tech.scene]);
  const inner = useMemo(() => { const s = orb.scene; const { k, c } = fit(s, 1.75); const g = new THREE.Group(); s.position.set(-c.x * k, -c.y * k, -c.z * k); s.scale.setScalar(k); g.add(s); return g; }, [orb.scene]);
  const a1 = useAnimations(orb.animations, inner), a2 = useAnimations(tech.animations, outer.g);
  useEffect(() => { if (reduced()) return; [a1, a2].forEach((a) => Object.values(a.actions).forEach((x) => x?.reset().play())); }, [a1, a2]);
  const ref = useRef<THREE.Group>(null);
  useFrame((st, dt) => {
    if (!ref.current || reduced()) return;
    ref.current.rotation.y += dt * (active ? 0.9 : 0.3);
    outer.m.emissiveIntensity = 0.45 + Math.sin(st.clock.elapsedTime * (active ? 6 : 2)) * 0.2;
  });
  return <group ref={ref}><primitive object={outer.g} /><primitive object={inner} /></group>;
}

export function LuminyAvatar({ className = '', active = false, interactive = false }: { className?: string; active?: boolean; interactive?: boolean }) {
  const fb = <div className={`grid place-items-center ${className}`}><div className="orb-fallback h-3/4 w-3/4 rounded-full" /></div>;
  return (
    <div className={className} aria-hidden="true">
      <Safe fallback={fb}>
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 40 }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.6} /><pointLight position={[2, 3, 4]} intensity={30} color="#c4b5fd" />
          <Suspense fallback={null}><LuminyModel active={active} /><Studio /></Suspense>
          {interactive && <OrbitControls enableZoom={false} enablePan={false} enableDamping rotateSpeed={0.8} />}
        </Canvas>
      </Safe>
    </div>
  );
}
useGLTF.preload('/models/torus.glb');
