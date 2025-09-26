'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface IntroAnimationProps {
  onComplete: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const starfieldRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLElement[]>([]);
  const hGlyphRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);

  const letters = ['H', 'E', 'I', 'J', 'Ō'];

  useEffect(() => {
    const container = containerRef.current;
    if (!container || hasAnimated) return;

    // Check if intro has already been played
    if (localStorage.getItem('heijoIntroPlayed')) {
      console.log('Intro already played, skipping...');
      onComplete();
      return;
    }

    console.log('Starting intro animation...');
    
    // Prevent multiple animations from running
    setHasAnimated(true);

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
        console.log('Animation completed, transitioning to login...');
        localStorage.setItem('heijoIntroPlayed', 'true');
        setHasAnimated(true);
        
        // Add a small delay to ensure smooth transition
        setTimeout(() => {
          onComplete();
        }, 200);
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
    );

    if (starfieldRef.current) {
      tl.fromTo(
        starfieldRef.current.children,
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
    }

    // 2. Letter constellations with improved stagger (2.5s)
    const letterElements = lettersRef.current;
    
    // Set initial positions with z-depth and y offset
    letterElements.forEach((letter, index) => {
      if (letter) {
        gsap.set(letter, {
          x: (Math.random() - 0.5) * 800,
          y: -150,
          z: Math.random() * 600 - 300, // -300 to 300 z-depth
          rotation: Math.random() * 360,
          scale: 0.3 + Math.random() * 0.4,
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

    // 5. Hide H glyph and show welcome state (1.5s hold)
    tl.to(hGlyphRef.current, {
      opacity: 0,
      scale: 0,
      duration: 0.5,
      ease: 'power2.in'
    })
    .fromTo(welcomeRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
      '-=0.3'
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

    // Animation complete - login card will be shown by parent component

    // Parallax effect on letters (only during letter animation phase)
    const updateParallax = () => {
      letterElements.forEach((letter, index) => {
        if (letter && letter.style.opacity !== '0') {
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
      // Clean up any remaining animations
      gsap.killTweensOf(letterElements);
      if (hGlyphRef.current) gsap.killTweensOf(hGlyphRef.current);
      if (welcomeRef.current) gsap.killTweensOf(welcomeRef.current);
    };
  }, [mousePosition.x, mousePosition.y, onComplete, hasAnimated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('IntroAnimation unmounting...');
    };
  }, []);

  // Debug logging
  console.log('IntroAnimation render:', { hasAnimated });

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black overflow-hidden"
      style={{ 
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        perspectiveOrigin: 'center center',
        isolation: 'isolate' // Ensure no other elements bleed through
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
        <div className="flex items-center justify-center">
          {letters.map((letter, index) => (
            <span
              key={letter}
              ref={(el) => {
                if (el) lettersRef.current[index] = el;
              }}
              className="text-8xl font-bold text-white opacity-0 inline-block"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                textShadow: '0 0 20px rgba(255,255,255,0.5)',
                transformStyle: 'preserve-3d',
                marginRight: index < letters.length - 1 ? '1rem' : '0'
              }}
            >
              {letter}
            </span>
          ))}
        </div>
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

    </div>
  );
}
