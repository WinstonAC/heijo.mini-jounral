'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { trace } from '@/lib/diagnostics/routeTrace';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const spaceBgRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(false);

  useEffect(() => {
    trace('IntroAnimation mounted');
    return () => trace('IntroAnimation unmounted');
  }, []);

  // [Heijo Video Diag] Video playback diagnostics and autoplay logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      if (process.env.NEXT_PUBLIC_DEBUG === '1') {
        console.warn('[Heijo][Diag] No video element found');
      }
      return;
    }

    // Add event listeners for diagnostics
    if (process.env.NEXT_PUBLIC_DEBUG === '1') {
      ['canplay', 'loadeddata', 'play', 'error', 'pause', 'ended'].forEach(ev => {
        video.addEventListener(ev, () => console.log(`[Heijo][Diag] Video event: ${ev}`));
      });
    }

    // Robust autoplay logic
    const tryPlay = async () => {
      try {
        await video.play();
        if (process.env.NEXT_PUBLIC_DEBUG === '1') {
          console.log('[Heijo] Video started successfully');
        }
      } catch (err) {
        if (process.env.NEXT_PUBLIC_DEBUG === '1') {
          console.warn('[Heijo] Autoplay failed, attempting muted replay:', err);
        }
        video.muted = true;
        try {
          await video.play();
          if (process.env.NEXT_PUBLIC_DEBUG === '1') {
            console.log('[Heijo] Video started with muted autoplay');
          }
        } catch (e) {
          if (process.env.NEXT_PUBLIC_DEBUG === '1') {
            console.error('[Heijo] Video still failed:', e);
          }
        }
      }
    };

    // Try to play when video is ready
    if (video.readyState >= 3) { // HAVE_FUTURE_DATA
      tryPlay();
    } else {
      video.addEventListener('canplay', tryPlay, { once: true });
    }

    // Handle video load errors (fallback to starfield only)
    video.addEventListener('error', (e) => {
      if (process.env.NEXT_PUBLIC_DEBUG === '1') {
        console.warn('[Heijo] Video failed to load, falling back to starfield animation:', e);
        console.log('[Heijo] Video sources:', video.querySelectorAll('source').length);
        console.log('[Heijo] Video src:', video.src);
      }
      // Hide video and show starfield only
      video.style.display = 'none';
    });

    // Check if video sources exist
    if (process.env.NEXT_PUBLIC_DEBUG === '1') {
      video.addEventListener('loadstart', () => {
        console.log('[Heijo] Video load started');
      });
      video.addEventListener('loadeddata', () => {
        console.log('[Heijo] Video data loaded');
      });
    }

    return () => {
      video.removeEventListener('canplay', tryPlay);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    trace('IntroAnimation handleLogin called');
    setIsLoading(true);
    
    try {
      // Mark intro as shown before completing
      localStorage.setItem('heijoIntroPlayed', 'true');
      trace('IntroAnimation marked intro as shown');
      
      // Complete the intro and go to login
      setTimeout(() => {
        trace('IntroAnimation calling onComplete');
        onComplete();
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipToLogin = () => {
    trace('IntroAnimation handleSkipToLogin called');
    // Kill any running animations
    if (containerRef.current) {
      gsap.killTweensOf(containerRef.current);
      gsap.killTweensOf(hGlyphRef.current);
      gsap.killTweensOf(starfieldRef.current);
      gsap.killTweensOf(portalRef.current);
      gsap.killTweensOf(welcomeRef.current);
      gsap.killTweensOf(loginRef.current);
    }
    
    // Mark as animated to prevent restart
    setHasAnimated(true);
    localStorage.setItem('heijoIntroPlayed', 'true');
    
    // Complete the intro
    trace('IntroAnimation calling onComplete from skip');
    onComplete();
  };


  useEffect(() => {
    // [Heijo Remediation 2025-01-06] Prevent double-mount (StrictMode Safe)
    if ((window as any).__HEIJO_INTRO_ACTIVE__) return;
    (window as any).__HEIJO_INTRO_ACTIVE__ = true;

    const container = containerRef.current;
    if (!container || hasAnimated) {
      (window as any).__HEIJO_INTRO_ACTIVE__ = false;
      return;
    }

    // Check if intro has already been played
    if (localStorage.getItem('heijoIntroPlayed')) {
      (window as any).__HEIJO_INTRO_ACTIVE__ = false;
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

    // Simplified animation timeline - Total duration: ~4s
    const tl = gsap.timeline({
      onComplete: () => {
        // Check if component is still mounted before completing
        if (containerRef.current) {
          localStorage.setItem('heijoIntroPlayed', 'true');
          setHasAnimated(true);
          onComplete();
        }
      }
    });

    // 1. Video and starfield entry (1s)
    tl.fromTo(container, 
      { backgroundColor: '#000000' },
      { backgroundColor: '#000000', duration: 0.1 }
    )
    .fromTo(videoRef.current, 
      { opacity: 0 },
      { opacity: 1, duration: 1, ease: 'power2.out' }
    )
    .fromTo(starfieldRef.current, 
      { opacity: 0 },
      { opacity: 1, duration: 1, ease: 'power2.out' }
    )
    // Show CSS space background as fallback if video fails
    .fromTo(spaceBgRef.current, 
      { opacity: 0 },
      { opacity: 1, duration: 1, ease: 'power2.out' },
      '-=1'
    )
    .fromTo(starfieldRef.current?.children || [], 
      { 
        scale: 0,
        rotation: Math.random() * 360
      },
      { 
        scale: 1,
        rotation: 0,
        duration: 1,
        stagger: 0.01,
        ease: 'back.out(1.7)'
      },
      '-=0.8'
    );

    // 2. H glyph emergence (1.5s) - Only the H with light spinning
    tl.fromTo(hGlyphRef.current,
      { 
        scale: 0,
        rotation: 0,
        opacity: 0
      },
      { 
        scale: 1,
        rotation: 360,
        opacity: 1,
        duration: 1.2,
        ease: 'power2.inOut'
      },
      '-=0.5'
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
    })
    // Add continuous light spinning (only during intro)
    .to(hGlyphRef.current, {
      rotation: '+=180',
      duration: 4,
      ease: 'none',
      repeat: 1
    }, '-=0.3');

    // 3. Portal transition (1s)
    tl.to(container, {
      backgroundColor: '#FAFAFA',
      duration: 1,
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
        duration: 1,
        ease: 'power2.inOut'
      },
      '-=0.8'
    )
    .to(portalRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out'
    }, '-=0.3');

    // 4. Welcome state (1s hold)
    tl.fromTo(welcomeRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
      '-=0.5'
    )
    .to({}, { duration: 1 }); // Hold for 1s

    // 5. Login reveal (1s)
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
        duration: 1,
        ease: 'power2.out'
      }
    )
    .fromTo(loginRef.current?.querySelectorAll('input, button') || [],
      { opacity: 0, y: 20 },
      { 
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out'
      },
      '-=0.8'
    );

    // Show skip button after 2 seconds
    setTimeout(() => {
      setShowSkipButton(true);
    }, 2000);

    // Ensure animation completes and doesn't loop
    tl.call(() => {
      setHasAnimated(true);
    });

    return () => {
      // [Heijo Remediation 2025-01-06] Cleanup with guard reset and overlay removal
      window.removeEventListener('mousemove', handleMouseMove);
      
      // Kill all GSAP animations and clear targets to prevent DOM manipulation
      try {
        if (tl) {
          tl.kill();
        }
        // Clear all GSAP targets to prevent further DOM manipulation
        if (containerRef.current) gsap.killTweensOf(containerRef.current);
        if (hGlyphRef.current) gsap.killTweensOf(hGlyphRef.current);
        if (starfieldRef.current) gsap.killTweensOf(starfieldRef.current);
        if (portalRef.current) gsap.killTweensOf(portalRef.current);
        if (welcomeRef.current) gsap.killTweensOf(welcomeRef.current);
        if (loginRef.current) gsap.killTweensOf(loginRef.current);
      } catch (gsapError) {
        console.warn('[Heijo][Cleanup] GSAP cleanup failed:', gsapError);
      }
      
      (window as any).__HEIJO_INTRO_ACTIVE__ = false;
      
      // Remove any lingering overlay nodes (with safety checks)
      try {
        document.querySelectorAll('[data-overlay="intro"]').forEach(n => {
          // Use Element.remove() which is safer than removeChild
          if (n && typeof (n as any).remove === 'function') {
            try {
              (n as any).remove();
            } catch (removeError) {
              // Node may already be removed, ignore silently
            }
          }
        });
      } catch (error) {
        console.warn('[Heijo][Cleanup] Overlay removal failed:', error);
      }
    };
  }, [onComplete, hasAnimated]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black overflow-hidden"
      data-overlay="intro"
      style={{ 
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        perspectiveOrigin: 'center center'
      }}
    >
      {/* Space Video Background - Fallback to CSS animation if no video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-0"
        autoPlay
        muted
        playsInline
        preload="auto"
        loop
        style={{ zIndex: 1 }}
      >
        <source src="/videos/space.mp4" type="video/mp4" />
        <source src="/videos/space.webm" type="video/webm" />
        Your browser does not support the video tag.
      </video>

      {/* CSS Animated Space Background (fallback) */}
      <div 
        ref={spaceBgRef}
        className="absolute inset-0 opacity-0"
        style={{ 
          zIndex: 1,
          background: `
            radial-gradient(2px 2px at 20px 30px, #eee, transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 90px 40px, #fff, transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent),
            radial-gradient(2px 2px at 160px 30px, #ddd, transparent),
            linear-gradient(45deg, #000 0%, #111 50%, #000 100%)
          `,
          backgroundSize: '200px 200px, 300px 300px, 400px 400px, 500px 500px, 600px 600px, 100% 100%',
          animation: 'spaceMove 20s linear infinite'
        }}
      />

      {/* Starfield Background */}
      <div 
        ref={starfieldRef}
        className="absolute inset-0 opacity-0"
        style={{ 
          background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          zIndex: 2
        }}
      />

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
          perspective: '1000px',
          zIndex: 10
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
            <form onSubmit={handleLogin} className="space-y-6">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-6 py-4 text-base border border-gray-200 rounded-lg bg-gray-50 focus:border-gray-300 focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500"
                required
              />
              
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-6 py-4 text-base border border-gray-200 rounded-lg bg-gray-50 focus:border-gray-300 focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500"
                required
              />

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full px-8 py-5 text-lg font-medium bg-gradient-to-b from-heijo-silver-top to-heijo-silver-bottom text-heijo-text rounded-lg hover:from-[#E2E2E2] hover:to-[#CFCFCF] transition-all duration-300 disabled:opacity-50 shadow-sm border border-heijo-border-light"
              >
                {isLoading ? 'Please wait...' : 'Start Journaling'}
              </button>
            </form>

            {/* Privacy note */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Private by design. Stored on your device. Yours alone.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Skip Button */}
      {showSkipButton && (
        <button
          onClick={handleSkipToLogin}
          className="absolute bottom-6 right-6 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 hover:bg-white"
        >
          Skip to Login
        </button>
      )}

    </div>
  );
}
