import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/UI/Toast';
import usePageTitle from '../hooks/usePageTitle';
import './LandingPage.css';

// Card list for the top row
const SIGHTS_DATA = [
  {
    ariaLabel: 'Open Main Wallet card',
    kicker: 'Primary Account',
    h3: 'Main Wallet',
    p: 'High-yield savings, checking, and cash balances aggregated automatically.',
    pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png'
  },
  {
    ariaLabel: 'Open Category Limits card',
    kicker: 'Smart Categorization',
    h3: 'Category Limits',
    p: 'Track grocery runs, subscription cycles, dining out, and shopping trends.',
    pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png'
  },
  {
    ariaLabel: 'Open Savings Goals card',
    kicker: 'Savings Goals',
    h3: 'Goa Vacation',
    p: 'High-fidelity savings goals, milestone contributions, and automated deposits.',
    pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230448_825949c9-ccdb-4857-b4a6-e349eccc9010.png'
  },
  {
    ariaLabel: 'Open Credit Cards card',
    kicker: 'Credit Cards',
    h3: 'Billing Cycles',
    p: 'Avoid interest premiums with automated statement parsing and due date reminders.',
    pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png'
  },
  {
    ariaLabel: 'Open Audit Logs card',
    kicker: 'Audit Logs',
    h3: 'Enterprise Audit',
    p: 'Immutable traces for every wallet transaction, budget change, and member action.',
    pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png'
  }
];

// Card list for the bottom row (scrolling in opposite direction)
const SIGHTS_DATA_2 = [
  {
    ariaLabel: 'Open Subscriptions card',
    kicker: 'Recurring Obligation',
    h3: 'Subscriptions',
    p: 'Track auto-billing updates and identify unused or double-charged services.',
    pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png'
  },
  {
    ariaLabel: 'Open Visual Reports card',
    kicker: 'Flexible Exports',
    h3: 'Visual Audit',
    p: 'Generate detailed sheets and export transaction logs as CSV, Excel, or PDF.',
    pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png'
  },
  {
    ariaLabel: 'Open Offline Mode card',
    kicker: 'Native Sandbox',
    h3: 'Offline Mock',
    p: 'Experiment with transactions, charts, and limits immediately without databases.',
    pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230448_825949c9-ccdb-4857-b4a6-e349eccc9010.png'
  },
  {
    ariaLabel: 'Open Financial Coach card',
    kicker: 'AI Insights',
    h3: 'Active Advisory',
    p: 'Get personalized insights on monthly budget overflows and saving priorities.',
    pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230438_d526b8b6-8a2e-4e3b-9993-3908acae03a7.png'
  },
  {
    ariaLabel: 'Open Shared Groups card',
    kicker: 'Group Splits',
    h3: 'Shared Ledgers',
    p: 'Settle shared debts or split collaborative group expenses with zero overhead.',
    pin: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260730_230442_140bc25b-b165-4249-904a-f708bff6970e.png'
  }
];

export default function LandingPage() {
  usePageTitle('Unified Financial Ledger');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const containerRef = useRef<HTMLDivElement>(null);
  const sightsControlsRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const track2Ref = useRef<HTMLDivElement>(null);

  // States
  const [activeSight, setActiveSight] = useState(SIGHTS_DATA.length); // Start in middle set
  const [isJumping, setIsJumping] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCta(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animation Refs
  const targetMouseX = useRef(0);
  const targetMouseY = useRef(0);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const targetScroll = useRef(0);
  const smoothScroll = useRef(0);
  const initialized = useRef(false);
  const rafPending = useRef(false);
  const reduceMotionRef = useRef(false);

  // Card cloning for infinite loop (3 identical sets for loop)
  const clonedSights = [...SIGHTS_DATA, ...SIGHTS_DATA, ...SIGHTS_DATA];
  const clonedSights2 = [...SIGHTS_DATA_2, ...SIGHTS_DATA_2, ...SIGHTS_DATA_2];

  // Helpers
  const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const smoothstep = (e0: number, e1: number, v: number) => {
    const x = clamp((v - e0) / (e1 - e0));
    return x * x * (3 - 2 * x);
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const segmentInOut = (s: number, a: number, b: number, c: number, d: number) => {
    const enter = smoothstep(a, b, s);
    const exit = smoothstep(c, d, s);
    return { enter, exit, active: enter * (1 - exit) };
  };

  const requestTick = () => {
    if (!rafPending.current) {
      rafPending.current = true;
      requestAnimationFrame(update);
    }
  };

  const update = () => {
    rafPending.current = false;
    const container = containerRef.current;
    if (!container) return;

    const section = container.querySelector('.cinema-scroll') as HTMLElement;
    if (!section) return;

    const reduceMotion = reduceMotionRef.current;

    // Target scroll height clamped
    const rect = section.getBoundingClientRect();
    targetScroll.current = clamp(-rect.top, 0, section.offsetHeight - window.innerHeight);

    // Synchronized precisely with Lenis scroll position (no double-lerp for scroll)
    smoothScroll.current = targetScroll.current;
    initialized.current = true;

    mouseX.current = lerp(mouseX.current, targetMouseX.current, 0.12);
    mouseY.current = lerp(mouseY.current, targetMouseY.current, 0.12);

    const s = smoothScroll.current;
    const frame2 = segmentInOut(s, 560, 900, 1300, 1620);
    const frame3 = segmentInOut(s, 1580, 1900, 2150, 2355);
    const progress = clamp(s / 2700);
    const introExit = smoothstep(90, 650, s);
    const sightsEnterRaw = smoothstep(2360, 2750, s);
    const sightsEnter = Math.pow(sightsEnterRaw, 1.2);
    const sightsControlsEnter = smoothstep(2550, 2750, s);
    const blurActive = clamp(frame2.active + frame3.active);
    const frame2Opacity = frame2.active * (1 - frame3.enter);
    const splitDrift = Math.pow(frame2.enter, 1.5);
    const panel2Opacity = frame2.active * (1 - frame2.exit);
    const panel3Opacity = frame3.active * (1 - frame3.exit);
    const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
    const sharedHeroY = progress * -74;
    const sharedHeroScale = progress * 0.23;
    const sightsScreenTop = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
    const sightsParentTop = window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale;

    // Apply values to container style properties
    container.style.setProperty('--mx', (reduceMotion ? 0 : mouseX.current).toFixed(4));
    container.style.setProperty('--my', (reduceMotion ? 0 : mouseY.current).toFixed(4));

    container.style.setProperty('--back-opacity', (1 - frame2.active * 0.06).toFixed(4));
    container.style.setProperty('--back-x', `${(mouseX.current * -12).toFixed(4)}px`);
    container.style.setProperty('--back-y', `${(mouseY.current * -4).toFixed(4)}px`);
    container.style.setProperty('--back-scale', backScale.toFixed(4));
    container.style.setProperty('--four-y', `${(10 + progress * 10).toFixed(4)}vh`);
    container.style.setProperty('--four-scale', (0.78 + progress * 0.16).toFixed(4));
    container.style.setProperty('--bazaar-y', `${(20 - progress * 8).toFixed(4)}vh`);
    container.style.setProperty('--blur-px', `${(blurActive * 14).toFixed(4)}px`);
    container.style.setProperty('--back-brightness', (1 - blurActive * 0.255).toFixed(4));
    container.style.setProperty('--bazaar-blur-px', `${(frame2.active * 14).toFixed(4)}px`);
    container.style.setProperty('--bazaar-brightness', (1 - frame2.active * 0.255 - frame3.active * 0.06).toFixed(4));
    container.style.setProperty('--bazaar-saturation', (1 + frame3.active * 0.18).toFixed(4));
    container.style.setProperty('--shade-opacity', "1");
    container.style.setProperty('--shade-z', frame2.active > 0.02 ? "2" : "0");
    container.style.setProperty('--shade-top-alpha', (blurActive * 0.465).toFixed(4));
    container.style.setProperty('--shade-mid-alpha', (blurActive * 0.42).toFixed(4));
    container.style.setProperty('--shade-bottom-alpha', (blurActive * 0.51).toFixed(4));

    container.style.setProperty('--title-y', `${(introExit * -210).toFixed(4)}px`);
    container.style.setProperty('--title-scale', (1 - introExit * 0.08).toFixed(4));
    container.style.setProperty('--title-opacity', (1 - introExit).toFixed(4));

    container.style.setProperty('--bridge-x', `calc(-50% + ${(mouseX.current * 18).toFixed(4)}px)`);
    container.style.setProperty('--bridge-y', `${(mouseY.current * 8 + sharedHeroY - frame2.exit * 760).toFixed(4)}px`);
    container.style.setProperty('--bridge-bottom', `${(5 - frame2.enter * 13).toFixed(4)}vh`);
    container.style.setProperty('--bridge-width', `${(67.2 + frame2.enter * 37.8).toFixed(4)}vw`);
    container.style.setProperty('--bridge-scale', (1.02 + sharedHeroScale + frame2.exit * 0.46).toFixed(4));

    container.style.setProperty('--split-left-x', `calc(-50% + ${(-splitDrift * 46).toFixed(4)}vw + ${(mouseX.current * 22).toFixed(4)}px)`);
    container.style.setProperty('--split-left-y', `${(mouseY.current * 10 + sharedHeroY - splitDrift * 180).toFixed(4)}px`);
    container.style.setProperty('--split-left-scale', (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));
    container.style.setProperty('--split-right-x', `calc(-50% + ${(splitDrift * 46).toFixed(4)}vw + ${(mouseX.current * 22).toFixed(4)}px)`);
    container.style.setProperty('--split-right-y', `${(mouseY.current * 10 + sharedHeroY - splitDrift * 180).toFixed(4)}px`);
    container.style.setProperty('--split-right-scale', (1 + sharedHeroScale + frame2.enter * 0.74).toFixed(4));

    container.style.setProperty('--frame2-opacity', frame2Opacity.toFixed(4));
    container.style.setProperty('--frame2-x', `calc(-50% + ${(mouseX.current * 10).toFixed(4)}px)`);
    container.style.setProperty('--frame2-y', `calc(-50% + ${(mouseY.current * 8 - frame2.exit * 150).toFixed(4)}px)`);
    container.style.setProperty('--frame2-scale', (1.06 + frame2.enter * 0.08 + frame2.exit * 0.08).toFixed(4));

    container.style.setProperty('--intro-copy-y', `${(introExit * 90).toFixed(4)}px`);
    container.style.setProperty('--intro-copy-opacity', (1 - introExit).toFixed(4));
    container.style.setProperty('--panel2-opacity', panel2Opacity.toFixed(4));
    container.style.setProperty('--panel2-y', `calc(-50% + ${(-frame2.exit * 86 + (1 - frame2.enter) * 58).toFixed(4)}px)`);
    container.style.setProperty('--panel3-opacity', panel3Opacity.toFixed(4));
    container.style.setProperty('--panel3-y', `calc(-50% + ${(-frame3.exit * 86 + (1 - frame3.enter) * 58).toFixed(4)}px)`);

    container.style.setProperty('--sights-opacity', sightsEnter.toFixed(4));
    container.style.setProperty('--sights-controls-opacity', sightsControlsEnter.toFixed(4));

    const sightsControlsEl = sightsControlsRef.current;
    if (sightsControlsEl) {
      sightsControlsEl.classList.toggle("is-ready", sightsControlsEnter > 0.98);
    }

    container.style.setProperty('--sights-visibility', sightsEnter > 0.01 ? "visible" : "hidden");
    container.style.setProperty('--sights-y', `${((1 - sightsEnter) * 60).toFixed(4)}px`);
    container.style.setProperty('--sights-enter-x', "0px");
    container.style.setProperty('--sights-scale', (1 / backScale).toFixed(4));
    container.style.setProperty('--sights-top', `${sightsParentTop.toFixed(4)}px`);
    container.style.setProperty('--sights-screen-top', `${sightsScreenTop.toFixed(4)}px`);

    const track = trackRef.current;
    const track2 = track2Ref.current;
    if (track && track2 && track.children[0]) {
      const cardWidth = track.children[0].getBoundingClientRect().width;
      const gap = parseFloat(window.getComputedStyle(track).columnGap || '0');
      const baseIndex = 5;
      const baseShift = -(cardWidth + gap) * baseIndex;
      const scrollShift = s * 0.35;

      track.style.setProperty('--sights-shift', `${baseShift - scrollShift}px`);
      track2.style.setProperty('--sights-shift', `${baseShift + scrollShift}px`);
    }

    const scrollDelta = Math.abs(smoothScroll.current - targetScroll.current);
    const mouseXDelta = Math.abs(mouseX.current - targetMouseX.current);
    const mouseYDelta = Math.abs(mouseY.current - targetMouseY.current);

    if (scrollDelta > 0.08 || mouseXDelta > 0.001 || mouseYDelta > 0.001) {
      requestTick();
    }
  };

  // Event Listeners for Parallax + Scroll Story
  useEffect(() => {
    const md = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotionRef.current = md.matches;
    const list = (e: MediaQueryListEvent) => {
      reduceMotionRef.current = e.matches;
    };
    md.addEventListener('change', list);

    const onScroll = () => {
      requestTick();
    };

    const onPointer = (e: PointerEvent) => {
      targetMouseX.current = e.clientX / window.innerWidth - 0.5;
      targetMouseY.current = e.clientY / window.innerHeight - 0.5;
      requestTick();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });

    // Initial tick
    requestTick();

    return () => {
      md.removeEventListener('change', list);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  // Update slider shift responsive position of relative cards for both rows
  useEffect(() => {
    const updateLayout = () => {
      const track = trackRef.current;
      const track2 = track2Ref.current;

      if (track && track.children[0]) {
        const cardWidth = track.children[0].getBoundingClientRect().width;
        const gap = parseFloat(window.getComputedStyle(track).columnGap || '0');
        const baseIndex = 5;
        const baseShift = -(cardWidth + gap) * baseIndex;
        const scrollShift = smoothScroll.current * 0.35;

        track.style.setProperty('--sights-shift', `${baseShift - scrollShift}px`);
        if (track2) {
          track2.style.setProperty('--sights-shift', `${baseShift + scrollShift}px`);
        }
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [clonedSights.length]);

  // Jump logic for infinite loop slider
  const jumpSightSlider = (targetIndex: number) => {
    setIsJumping(true);
    setActiveSight(targetIndex);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsJumping(false);
      });
    });
  };

  const handleTransitionEnd = () => {
    const origCount = SIGHTS_DATA.length;
    if (activeSight >= origCount * 2) {
      jumpSightSlider(activeSight - origCount);
    } else if (activeSight < origCount) {
      jumpSightSlider(activeSight + origCount);
    }
  };

  const handlePrev = () => {
    setActiveSight(prev => prev - 1);
  };

  const handleNext = () => {
    setActiveSight(prev => prev + 1);
  };

  const handleNavClick = (e: React.MouseEvent, scrollPos: number) => {
    e.preventDefault();
    window.scrollTo(0, scrollPos);
  };

  return (
    <div ref={containerRef} className="site-shell-cinematic">
      <main className="site-shell">
        <section className="cinema-scroll" id="cinema" aria-label="Finova cinematic scroll story">
          <div className="stage">
            <div className="world">
              {/* Sky Background */}
              <img
                className="scene-img sky-img"
                src="https://raft-blast-61784561.figma.site/_assets/v11/16b5007d9c93971e26ffe4e0e3e37946f6bd538c.png"
                alt="Vibrant gradient sky canvas depicting financial transparency and clarity"
              />

              {/* Site Header */}
              <header className="site-header" aria-label="Primary navigation">
                <a className="site-logo" href="#cinema" onClick={(e) => handleNavClick(e, 0)}>
                  finova
                </a>
                <nav className="site-nav" aria-label="Main menu">
                  <a href="#cinema" onClick={(e) => handleNavClick(e, 0)}>Intro</a>
                  <a href="#bridge" onClick={(e) => handleNavClick(e, 900)}>Ledger</a>
                  <a href="#bazaar" onClick={(e) => handleNavClick(e, 1900)}>Dashboard</a>
                  <a href="#routes" onClick={(e) => handleNavClick(e, 2900)}>Features</a>
                </nav>
                <button
                  className="language-switcher"
                  aria-label="Enter app"
                  onClick={() => navigate('/auth')}
                >
                  <span>SIGN IN</span>
                </button>
              </header>

              {/* Background Stack */}
              <div className="back-stack">
                <img
                  className="scene-img back-img back-four"
                  src="https://raft-blast-61784561.figma.site/_assets/v11/8a7f8af50e0ce92ec2e228e7b0b4112178c51cf1.png"
                  alt="Aesthetic skyline landscape backdrop visual for budget section"
                />

                <img
                  className="scene-img back-img back-bazaar"
                  src="https://raft-blast-61784561.figma.site/_assets/v11/864afe00e41e2fa20a5aa546e15cb807e0f81384.png"
                  alt="Financial analytics chart visualization preview"
                />
              </div>

              {/* Sights Slider - Dual Row Opposing Scroll */}
              <section className="sights-slider" aria-label="Finova features slider">
                {/* Row 1 (scrolls standard direction) */}
                <div
                  ref={trackRef}
                  className={`sights-track track-1 ${isJumping ? 'is-jumping' : ''}`}
                  onTransitionEnd={handleTransitionEnd}
                >
                  {clonedSights.map((sight, idx) => {
                    const isActive = idx === activeSight;
                    return (
                      <article
                        key={idx}
                        className={`sight-card ${isActive ? 'is-active' : ''}`}
                        tabIndex={0}
                        role="button"
                        aria-label={sight.ariaLabel}
                        onClick={() => setActiveSight(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setActiveSight(idx);
                          }
                        }}
                      >
                        <span className="sight-kicker">{sight.kicker}</span>
                        <img className="sight-pin" src={sight.pin} alt={`Visual badge for ${sight.h3}`} />
                        <h3>{sight.h3}</h3>
                        <p>{sight.p}</p>
                      </article>
                    );
                  })}
                </div>

                {/* Row 2 (scrolls opposite direction) */}
                <div
                  ref={track2Ref}
                  className={`sights-track track-2 ${isJumping ? 'is-jumping' : ''}`}
                >
                  {clonedSights2.map((sight, idx) => {
                    // Row 2 active index mirrors activeSight
                    const activeSight2 = clonedSights2.length - 1 - activeSight;
                    const isActive = idx === activeSight2;
                    return (
                      <article
                        key={idx}
                        className={`sight-card ${isActive ? 'is-active' : ''}`}
                        tabIndex={0}
                        role="button"
                        aria-label={sight.ariaLabel}
                        onClick={() => setActiveSight(clonedSights2.length - 1 - idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setActiveSight(clonedSights2.length - 1 - idx);
                          }
                        }}
                      >
                        <span className="sight-kicker">{sight.kicker}</span>
                        <img className="sight-pin" src={sight.pin} alt={`Visual badge for ${sight.h3}`} />
                        <h3>{sight.h3}</h3>
                        <p>{sight.p}</p>
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* Hero Title */}
              <h1 className="hero-title">Finova</h1>

              {/* Split Frame Midground */}
              <img
                className="scene-img splitframe-img splitframe-left"
                src="https://raft-blast-61784561.figma.site/_assets/v11/7536d7b60a1fce482cf6edf3f0bffd3bad5d0f8a.png"
                alt="Left ambient structural outline framing the landing canvas"
              />
              <img
                className="scene-img splitframe-img splitframe-right"
                src="https://raft-blast-61784561.figma.site/_assets/v11/392db6a6a6b98e868bd7f8d3f55bb719d51e5028.png"
                alt="Right ambient structural outline framing the landing canvas"
              />

              {/* Foreground Layers */}
              <img
                className="scene-img bridge-img"
                src="https://raft-blast-61784561.figma.site/_assets/v11/c6a6d8ef49bca43f708aa852692942c45ec950d4.png"
                alt="Core ledger view illustrating balance tracking"
              />
              <img
                className="scene-img frame-two-img"
                src="https://raft-blast-61784561.figma.site/_assets/v11/ba75252bab2b1c510987b74837770f7bc8a6b2d4.png"
                alt="Interactive credit card visual elements representing statement sync"
              />

              {/* Dynamic Color Overlay Mask */}
              <div className="shade" />
            </div>

            {/* Cinematic Scroll Overlays */}
            <section className="intro-copy" aria-label="Finova overview">
              <p>
                A simple ledger, smart categories, and a secure vault made for clean accounting, quick scanning, and one complete financial view.
              </p>
              <div className="hero-tags" aria-label="Mostar highlights">
                <span>AI-Scanning</span>
                <span>Double Entry</span>
                <span>Secure Database</span>
              </div>
              <div className="mt-8 flex items-center justify-center pointer-events-auto" style={{ pointerEvents: 'auto' }}>
                <button
                  onClick={() => navigate('/auth')}
                  className="px-8 py-3 bg-[#006a61] hover:bg-[#00524a] text-[#fdf1e1] font-bold rounded-full transition-all duration-200 active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
                  style={{ minHeight: '44px', background: '#006a61', color: '#fdf1e1', border: '1px solid rgba(253,241,225,0.42)' }}
                >
                  Get Started Free
                </button>
              </div>
            </section>

            {/* Split Story panel 1 */}
            <section className="story-panel story-panel-bridge" aria-label="Ledger details">
              <h2>The ledger is your compass.</h2>
              <p>
                Finova links all your credit cards, banks, and cash accounts into a single database shaped by double-entry precision and compliance.
              </p>
              <dl className="facts">
                <div>
                  <dt>2026</dt>
                  <dd>Platform version 1.0</dd>
                </div>
                <div>
                  <dt>99.9%</dt>
                  <dd>Financial data isolation and uptime</dd>
                </div>
              </dl>
            </section>

            {/* Split Story panel 2 */}
            <section className="story-panel story-panel-bazaar" aria-label="Dashboard details">
              <h2>The dashboard keeps everything close.</h2>
              <p>
                Real-time charts, category limits, pending bills, and active subscriptions stay within a single glance of your ledger.
              </p>
              <button className="note-button" onClick={() => navigate('/auth')}>
                <span>Open Finova</span>
              </button>
            </section>
          </div>
        </section>

        {/* Brand New: Corporate Trust & Support Sections */}
        <section className="bg-[#0b1c30] text-slate-100 py-20 px-6 border-t border-white/10 relative z-20">
          <div className="max-w-6xl mx-auto space-y-24">

            {/* 1. Case Studies Section */}
            <div className="space-y-8">
              <div className="text-center">
                <span className="text-[10px] tracking-[0.2em] font-extrabold text-[#fdf1e1] bg-[#006a61] px-3 py-1 rounded-full uppercase">Success Metrics</span>
                <h2 className="text-3xl sm:text-4xl font-normal font-serif text-white tracking-wide uppercase mt-4" style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}>Case Studies</h2>
                <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto mt-2">See how workspaces optimized workflows and cut overhead with our double-entry sandbox.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#006a61]/40 transition-colors">
                  <h4 className="text-emerald-400 text-2xl font-bold font-mono">28% Saved</h4>
                  <h3 className="font-bold text-white text-base mt-2">Scale AI Inc.</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">Integrated automatic subscription statements auditing. Decoupled billing overlaps in less than 3 weeks, isolating double-charged databases.</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#006a61]/40 transition-colors">
                  <h4 className="text-emerald-400 text-2xl font-bold font-mono">14 hrs / mo</h4>
                  <h3 className="font-bold text-white text-base mt-2">Decent Labs</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">Leveraged multi-member workspaces allocation for group accounts. Shaved accounting latency, exporting financial sheets directly via API.</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#006a61]/40 transition-colors">
                  <h4 className="text-emerald-400 text-2xl font-bold font-mono">$0 Late Fees</h4>
                  <h3 className="font-bold text-white text-base mt-2">Acme Corp</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">Configured statement due alerts and automatic billing tracker schedules, optimizing liquidity pools and statement interest premiums.</p>
                </div>
              </div>
            </div>

            {/* 2. Customer Testimonials */}
            <div className="space-y-8">
              <div className="text-center">
                <span className="text-[10px] tracking-[0.2em] font-extrabold text-[#fdf1e1] bg-[#006a61] px-3 py-1 rounded-full uppercase">Community Voice</span>
                <h2 className="text-3xl sm:text-4xl font-normal font-serif text-white tracking-wide uppercase mt-4" style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}>Customer Reviews</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <p className="text-xs text-slate-300 leading-relaxed italic">"Double-entry bookkeeping is usually a headache, but the offline setup here is incredible. We prototype ledger entries before pushing to prod."</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">MK</div>
                    <div>
                      <div className="text-xs font-bold text-white">Marc Kube</div>
                      <div className="text-[10px] text-slate-400">Founder, FinAI</div>
                    </div>
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <p className="text-xs text-slate-300 leading-relaxed italic">"The AI statement scanning saved us hours. We just feed it invoices and it maps categories perfectly. Uptime has been solid."</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">SL</div>
                    <div>
                      <div className="text-xs font-bold text-white">Sarah Lim</div>
                      <div className="text-[10px] text-slate-400">CFO, WebThree</div>
                    </div>
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <p className="text-xs text-slate-300 leading-relaxed italic">"Shared ledgers split expenses effortlessly. No arguments about billing cycles anymore - the tracking histories are immutable."</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">DB</div>
                    <div>
                      <div className="text-xs font-bold text-white">Dan Baker</div>
                      <div className="text-[10px] text-slate-400">Operations, Apex</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. FAQ Accordion Section */}
            <div className="space-y-8">
              <div className="text-center">
                <span className="text-[10px] tracking-[0.2em] font-extrabold text-[#fdf1e1] bg-[#006a61] px-3 py-1 rounded-full uppercase">Got Questions?</span>
                <h2 className="text-3xl sm:text-4xl font-normal font-serif text-white tracking-wide uppercase mt-4" style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}>Frequently Asked Questions</h2>
              </div>
              <div className="max-w-3xl mx-auto space-y-4">
                {[
                  {
                    q: "How does the AI receipt scanning work?",
                    a: "Our AI processes receipt images to extract vendor names, dates, amounts, and category suggestions to simplify ledger entry."
                  },
                  {
                    q: "How is my financial data protected?",
                    a: "We implement standard HTTPS transport encryption, user authentication, and database tenant isolation to safeguard user accounts."
                  },
                  {
                    q: "Does Finova support multiple currencies?",
                    a: "We support over 150 currencies with automated live mid-market exchange rate conversions."
                  },
                  {
                    q: "How does shared ledgers expense splitting work?",
                    a: "You can create shared groups for flatshares, trips, or projects, add transactions, and settle balances instantly with zero accounting overhead."
                  }
                ].map((faq, idx) => {
                  const isOpen = faqOpen === idx;
                  return (
                    <div key={idx} className="border border-white/10 rounded-xl overflow-hidden bg-white/5 transition-colors">
                      <button
                        onClick={() => setFaqOpen(isOpen ? null : idx)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none cursor-pointer text-white"
                        style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none' }}
                      >
                        <span className="text-xs sm:text-sm font-semibold text-white">{faq.q}</span>
                        <span className="text-slate-400 text-sm font-mono">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4 text-xs sm:text-sm text-slate-300 border-t border-white/5 pt-3 leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Meet The Team Section */}
            <div className="space-y-8">
              <div className="text-center">
                <span className="text-[10px] tracking-[0.2em] font-extrabold text-[#fdf1e1] bg-[#006a61] px-3 py-1 rounded-full uppercase">The Builders</span>
                <h2 className="text-3xl sm:text-4xl font-normal font-serif text-white tracking-wide uppercase mt-4" style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}>Meet The Team</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#006a61]/30 border border-[#006a61]/50 flex items-center justify-center font-bold text-lg text-white mx-auto mb-4">SS</div>
                  <h3 className="font-bold text-white text-sm">Supriyo Sen</h3>
                  <p className="text-[10px] text-[#fdf1e1] font-bold uppercase tracking-wider mt-1">Lead Architect</p>
                  <p className="text-[11px] text-slate-400 mt-2">Former Core Infrastructure engineer building ledger integrations.</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#006a61]/30 border border-[#006a61]/50 flex items-center justify-center font-bold text-lg text-white mx-auto mb-4">AS</div>
                  <h3 className="font-bold text-white text-sm">Alex Smith</h3>
                  <p className="text-[10px] text-[#fdf1e1] font-bold uppercase tracking-wider mt-1">Head of AI</p>
                  <p className="text-[11px] text-slate-400 mt-2">Former OpenAI researcher scaling LLM statement categorization models.</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#006a61]/30 border border-[#006a61]/50 flex items-center justify-center font-bold text-lg text-white mx-auto mb-4">JN</div>
                  <h3 className="font-bold text-white text-sm">Jess Ngo</h3>
                  <p className="text-[10px] text-[#fdf1e1] font-bold uppercase tracking-wider mt-1">Lead Frontend</p>
                  <p className="text-[11px] text-slate-400 mt-2">Design system coordinator specialized in high-performance WebGL interfaces.</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#006a61]/30 border border-[#006a61]/50 flex items-center justify-center font-bold text-lg text-white mx-auto mb-4">TR</div>
                  <h3 className="font-bold text-white text-sm">Tim Ross</h3>
                  <p className="text-[10px] text-[#fdf1e1] font-bold uppercase tracking-wider mt-1">Security Dev</p>
                  <p className="text-[11px] text-slate-400 mt-2">Ex-Cloudflare SecOps guarding multi-wallet database boundaries.</p>
                </div>
              </div>
            </div>


          </div>
        </section>

        {/* 6. Unified Footer Section */}
        <footer className="footer-cinematic bg-[#0a121d] text-slate-400 py-16 px-6 relative z-20 border-t border-white/5">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 flex flex-col justify-between">
              <div>
                <a className="font-serif text-2xl font-normal text-white uppercase tracking-wider" style={{ fontFamily: "'Ogg Medium', Georgia, serif" }} href="#cinema" onClick={(e) => handleNavClick(e, 0)}>
                  Finova Ltd
                </a>
                <p className="text-xs text-slate-500 mt-2 max-w-sm">Secure SaaS accounting ledgers designed with absolute logical isolation.</p>
              </div>
              <div className="text-[10px] text-slate-655 mt-6 md:mt-24 font-mono">
                &copy; 2026 [LEGAL_ENTITY_NAME_REQUIRED]. All rights reserved.
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-white text-xs font-bold uppercase tracking-wider">Product</h4>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/dashboard">Dashboard</Link>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/expenses">Transactions</Link>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/budgets">Budgets</Link>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/goals">Savings Goals</Link>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-white text-xs font-bold uppercase tracking-wider">Resources</h4>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/copilot">AI Copilot</Link>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/assistant">AI Assistant</Link>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/thank-you">Help Desk</Link>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-white text-xs font-bold uppercase tracking-wider">Legal</h4>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/terms">Terms of Service</Link>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/privacy">Privacy Policy</Link>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/ai-disclaimer">AI Disclaimer</Link>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/acceptable-use">Acceptable Use</Link>
              <Link className="text-xs text-slate-400 hover:text-white transition-colors" to="/cookies">Cookie Policy</Link>
            </div>
          </div>
        </footer>

      </main>

      {/* Brand New: Viewport sticky Mobile bottom CTA bar */}
      {showStickyCta && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0b1c30]/95 border-t border-white/10 px-5 py-3 flex items-center justify-between backdrop-blur-md">
          <span className="text-white text-xs font-bold uppercase tracking-wider">Start Tracking</span>
          <button
            onClick={() => navigate('/auth')}
            className="px-4 py-2 bg-[#fdf1e1] hover:bg-white text-[#0b1c30] font-bold text-[10px] rounded-full uppercase tracking-wider active:scale-95 transition-transform cursor-pointer"
          >
            Get Started
          </button>
        </div>
      )}
    </div>
  );
}
