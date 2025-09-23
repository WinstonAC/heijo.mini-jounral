'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface IntroAnimationProps {
  onComplete: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const starfieldRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLDivElement[]>([]);
  const hGlyphRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);

  const letters = ['H', 'E', 'I', 'J', 'Ō'];

  useEffect(() => {
    const container = containerRef.current;
    if (!container || hasAnimated) return;

    // Check if intro has already been played
    if (localStorage.getItem('heijoIntroPlayed')) {
      onComplete();
      return;
    }

    // Create starfield particles
    const createStarfield = () => {
      const starfield = starfieldRef.current;
      if (!starfield) return;

      for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.className = 'absolute w-0.5 h-0.5 bg-white rounded-full';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.opacity = Math.random() * 0.2 + '0.1';
        starfield.appendChild(star);
      }
    };

    createStarfield();

    // Mouse parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Main animation timeline - Total duration: ~8s
    const tl = gsap.timeline({
      onComplete: () => {
        localStorage.setItem('heijoIntroPlayed', 'true');
        setHasAnimated(true);
        onComplete();
      }
    });

    // 1. Black starfield entry (1.5s)
    tl.fromTo(container, 
      { backgroundColor: '#000000' },
      { backgroundColor: '#000000', duration: 0.1 }
    )
    .fromTo(starfieldRef.current, 
      { opacity: 0 },
      { opacity: 1, duration: 1.5, ease: 'power2.out' }
    )
    .fromTo(starfieldRef.current?.children, 
      { 
        scale: 0,
        rotation: Math.random() * 360
      },
      { 
        scale: 1,
        rotation: 0,
        duration: 1.5,
        stagger: 0.01,
        ease: 'back.out(1.7)'
      },
      '-=1.2'
    );

    // 2. Letter constellations with improved stagger (2.5s)
    const letterElements = lettersRef.current;
    
    // Set initial positions with z-depth and y offset
    letterElements.forEach((letter, index) => {
      if (letter) {
        gsap.set(letter, {
          x: (Math.random() - 0.5) * 400,
          y: -50,
          z: Math.random() * 400 - 200, // -200 to 200 z-depth
          rotation: Math.random() * 360,
          scale: 0.8 + Math.random() * 0.4,
          opacity: 0
        });
      }
    });

    // Animate letters with stagger
    tl.to(letterElements, {
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      scale: 1,
      opacity: 1,
      duration: 1.5,
      stagger: 0.3, // 0.3s stagger between each letter
      ease: 'power2.out'
    }, '-=0.5')
    .to(letterElements, {
      y: '+=8',
      duration: 1.5,
      yoyo: true,
      repeat: -1,
      ease: 'power2.inOut',
      stagger: 0.2
    }, '-=1')
    .to(letterElements, {
      scale: 1.05,
      duration: 1.2,
      yoyo: true,
      repeat: -1,
      ease: 'power2.inOut',
      stagger: 0.15
    }, '-=1');

    // Tagline fade in
    tl.fromTo('.tagline', 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
      '-=0.5'
    );

    // 3. 3D H glyph emergence (1.5s)
    tl.to(letterElements, {
      scale: 0,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.in'
    })
    .fromTo(hGlyphRef.current,
      { 
        scale: 0,
        rotationY: 0,
        opacity: 0
      },
      { 
        scale: 1,
        rotationY: 360,
        opacity: 1,
        duration: 1.2,
        ease: 'power2.inOut'
      },
      '-=0.3'
    )
    .to(hGlyphRef.current, {
      boxShadow: '0 0 40px rgba(192, 192, 192, 0.9), 0 0 80px rgba(192, 192, 192, 0.5)',
      duration: 0.8,
      ease: 'power2.inOut'
    }, '-=0.6')
    .to(hGlyphRef.current, {
      boxShadow: '0 0 0px rgba(192, 192, 192, 0)',
      duration: 0.7,
      ease: 'power2.out'
    });

    // 4. Portal transition (1.5s)
    tl.to(container, {
      backgroundColor: '#FAFAFA',
      duration: 1.5,
      ease: 'power2.inOut'
    }, '-=0.3')
    .fromTo(portalRef.current,
      { 
        scale: 0,
        opacity: 0,
        background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 70%)'
      },
      { 
        scale: 3,
        opacity: 1,
        duration: 1.2,
        ease: 'power2.inOut'
      },
      '-=1.2'
    )
    .to(portalRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out'
    }, '-=0.3');

    // 5. Welcome state (1.5s hold)
    tl.fromTo(welcomeRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
      '-=0.5'
    )
    .to(welcomeRef.current, {
      scale: 1.02,
      duration: 0.4,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut'
    })
    .to(welcomeRef.current, {
      scale: 1,
      duration: 0.4,
      ease: 'power2.out'
    })
    .to({}, { duration: 1.5 }); // Hold for 1.5s

    // 6. Login reveal (1.5s)
    tl.fromTo(loginRef.current,
      { 
        opacity: 0,
        y: 50,
        scale: 0.95
      },
      { 
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.2,
        ease: 'power2.out'
      }
    )
    .fromTo(loginRef.current?.querySelectorAll('input, button'),
      { opacity: 0, y: 20 },
      { 
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out'
      },
      '-=0.8'
    )
    .to(loginRef.current?.querySelector('button'), {
      scale: 1.05,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut'
    }, '-=0.3');

    // Parallax effect on letters
    const updateParallax = () => {
      letterElements.forEach((letter, index) => {
        if (letter) {
          gsap.to(letter, {
            x: mousePosition.x * (8 + index * 1.5),
            y: mousePosition.y * (8 + index * 1.5),
            duration: 0.3,
            ease: 'power2.out'
          });
        }
      });
    };

    const parallaxInterval = setInterval(updateParallax, 16);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(parallaxInterval);
      tl.kill();
    };
  }, [mousePosition.x, mousePosition.y, onComplete, hasAnimated]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black overflow-hidden"
      style={{ 
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        perspectiveOrigin: 'center center'
      }}
    >
      {/* Starfield Background */}
      <div 
        ref={starfieldRef}
        className="absolute inset-0 opacity-0"
        style={{ 
          background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)'
        }}
      />

      {/* Letter Constellations */}
      <div className="absolute inset-0 flex items-center justify-center">
        {letters.map((letter, index) => (
          <div
            key={letter}
            ref={(el) => {
              if (el) lettersRef.current[index] = el;
            }}
            className="absolute text-8xl font-bold text-white opacity-0"
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              textShadow: '0 0 20px rgba(255,255,255,0.5)',
              transformStyle: 'preserve-3d'
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Tagline */}
      <div 
        className="tagline absolute bottom-1/4 left-1/2 transform -translate-x-1/2 text-white text-center opacity-0"
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 300,
          fontSize: '1.2rem',
          letterSpacing: '0.1em'
        }}
      >
        micro-moments. macro-clarity.
      </div>

      {/* 3D H Glyph */}
      <div 
        ref={hGlyphRef}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0"
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px'
        }}
      >
        <div 
          className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%)',
            boxShadow: '0 0 0px rgba(192, 192, 192, 0)',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}
        >
          <span 
            className="text-6xl font-bold text-gray-800"
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              transformStyle: 'preserve-3d'
            }}
          >
            H
          </span>
        </div>
      </div>

      {/* Portal Transition */}
      <div 
        ref={portalRef}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-0"
        style={{
          background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 70%)',
          transformStyle: 'preserve-3d'
        }}
      />

      {/* Welcome State */}
      <div 
        ref={welcomeRef}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center opacity-0"
        style={{
          transformStyle: 'preserve-3d'
        }}
      >
        <h1 
          className="text-6xl font-bold text-gray-800 mb-4"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          Welcome to{' '}
          <span className="text-7xl">Heijō</span>
          <span className="text-3xl font-normal ml-2">mini-journal</span>
        </h1>
        <p 
          className="text-xl text-gray-600"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 300
          }}
        >
          micro-moments for macro-clarity.
        </p>
      </div>

      {/* Login Card */}
      <div 
        ref={loginRef}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-auto p-4 opacity-0"
        style={{
          transformStyle: 'preserve-3d'
        }}
      >
        <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-lg">
          <div className="text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-800">H</span>
              </div>
            </div>
            
            {/* Title */}
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                <span className="text-5xl">Heijō</span>
                <span className="text-2xl font-normal ml-2">mini-journal</span>
              </h1>
              <p className="text-lg text-gray-600">
                micro-moments for macro-clarity.
              </p>
            </div>

            {/* Login Form */}
            <div className="space-y-6">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-6 py-4 text-base border border-gray-200 rounded-lg bg-gray-50 focus:border-gray-300 focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500"
              />
              
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full px-6 py-4 text-base border border-gray-200 rounded-lg bg-gray-50 focus:border-gray-300 focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500"
              />

              <button className="w-full px-8 py-5 text-lg font-medium bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 rounded-lg hover:from-gray-300 hover:to-gray-400 transition-all duration-300">
                Start Journaling
              </button>
            </div>

            {/* Privacy note */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Private by design. Stored on your device. Yours alone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
