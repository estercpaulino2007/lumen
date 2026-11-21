'use client';
import dynamic from 'next/dynamic';
const ph = (cls?: string) => () => <div className={`grid place-items-center ${cls || ''}`}><div className="orb-fallback h-24 w-24 rounded-full opacity-60" /></div>;
export const HeroSculpture = dynamic(() => import('./Scenes').then((m) => m.HeroSculpture), { ssr: false, loading: ph() });
export const LuminyAvatar = dynamic(() => import('./Scenes').then((m) => m.LuminyAvatar), { ssr: false, loading: ph() });
