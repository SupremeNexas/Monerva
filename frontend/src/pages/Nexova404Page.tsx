import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function DribbbleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.49-11.05 1-11.6 8.56" />
    </svg>
  );
}

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export default function Nexova404Page() {
  usePageTitle('Page Not Found');
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleMenu = () => {
    if (mobileMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const openMenu = () => {
    setMobileMenuOpen(true);
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      const t = setTimeout(() => setMenuVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [mobileMenuOpen]);

  const closeMenu = () => {
    setMenuVisible(false);
    const t = setTimeout(() => {
      setMobileMenuOpen(false);
    }, 500);
    return () => clearTimeout(t);
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Expenses', path: '/expenses' },
    { label: 'Budgets', path: '/budgets' },
    { label: 'Analytics', path: '/analytics' },
    { label: 'Goals', path: '/goals' },
    { label: 'Bills', path: '/bills' }
  ];

  const footerColumns = [
    {
      title: 'TRACK',
      links: [
        { label: 'Expenses', path: '/expenses' },
        { label: 'Wallets', path: '/expenses' },
        { label: 'Credit Cards', path: '/credit-cards' },
        { label: 'Categories', path: '/categories' },
        { label: 'Transactions', path: '/expenses' }
      ]
    },
    {
      title: 'PLAN',
      links: [
        { label: 'Budgets', path: '/budgets' },
        { label: 'Savings Goals', path: '/goals' },
        { label: 'Bills', path: '/bills' },
        { label: 'Subscriptions', path: '/subscriptions' }
      ]
    },
    {
      title: 'INSIGHTS',
      links: [
        { label: 'Analytics', path: '/analytics' },
        { label: 'Reports', path: '/analytics' },
        { label: 'Spend Trends', path: '/analytics' },
        { label: 'AI Copilot', path: '/copilot' },
        { label: 'Assistant', path: '/assistant' }
      ]
    },
    {
      title: 'ACCOUNT',
      links: [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Workspace Settings', path: '/workspace-settings' },
        { label: 'Groups', path: '/groups' },
        { label: 'Security', path: '/workspace-settings' },
        { label: 'Help', path: '/thank-you' }
      ]
    }
  ];

  return (
    <div 
      className="relative min-h-screen flex flex-col overflow-x-hidden"
      style={{
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
        backgroundColor: '#0A0A0B'
      }}
    >
      {/* Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .four-oh-four {
          text-shadow: 0 0 80px rgba(255,255,255,0.3), 0 0 160px rgba(255,255,255,0.1);
        }
        .liquid-glass {
          background: rgba(255, 255, 255, 0.01);
          background-blend-mode: luminosity;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: none;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }
        .liquid-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.4px;
          background: linear-gradient(180deg,
            rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
            rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
            rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}} />

      {/* Looping Background Video */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-[#0A0A0B]/30 z-0 pointer-events-none" />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between px-6 md:px-12 lg:px-16 py-5">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Monerva" className="w-8 h-8" />
            <span className="text-white text-xl font-bold tracking-wider font-sans">Monerva</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map(link => (
              <Link
                key={link.label}
                to={link.path}
                className="text-white/80 hover:text-white text-sm tracking-wide transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:block">
            <Link to="/dashboard" className="bg-[#10B981] hover:bg-[#059669] transition-all duration-300 text-white text-sm font-semibold px-6 py-2.5 rounded-full flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10">
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button 
            onClick={toggleMenu} 
            className="lg:hidden relative z-[60] w-8 h-8 text-white focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${menuVisible ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'}`}>
              <X className="w-6 h-6" />
            </span>
            <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${!menuVisible ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`}>
              <Menu className="w-6 h-6" />
            </span>
          </button>
        </header>

        {/* Mobile Menu Panels */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-md transition-opacity duration-500
                ${menuVisible ? 'opacity-100' : 'opacity-0'}
              `}
              onClick={closeMenu}
            />

            {/* Menu Panel */}
            <div 
              className={`absolute left-0 right-0 top-[72px] z-50 transition-all duration-500 ease-out overflow-hidden
                ${menuVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
              `}
            >
              {/* Blur backdrop layer */}
              <div className="absolute inset-0 backdrop-blur-xl bg-black/20 rounded-b-2xl" />

              {/* Panel content */}
              <div className="relative z-10 px-6 py-8 flex flex-col items-center gap-4">
                {navLinks.map((link, index) => {
                  const delay = menuVisible ? `${350 + (index * 50)}ms` : '0ms';
                  return (
                    <Link
                      key={link.label}
                      to={link.path}
                      onClick={closeMenu}
                      style={{ transitionDelay: delay }}
                      className={`text-lg sm:text-xl font-light tracking-[0.08em] text-white/80 hover:text-white transition-all duration-400 ease-out py-2 block
                        ${menuVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
                      `}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                  <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  style={{ transitionDelay: menuVisible ? `${350 + (navLinks.length * 50)}ms` : '0ms' }}
                  className={`bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold px-8 py-3 rounded-full flex items-center gap-2 mt-4 transition-all duration-400 ease-out shadow-lg shadow-emerald-500/20 cursor-pointer
                    ${menuVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
                  `}
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Hero / 404 Section */}
        <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 md:py-0">
          <h1 className="text-white/80 text-lg xs:text-2xl sm:text-3xl md:text-5xl font-light leading-snug tracking-tight mb-1 sm:mb-2 text-white">
            This page seems to have
          </h1>
          <h1 className="text-white/80 text-lg xs:text-2xl sm:text-3xl md:text-5xl font-light leading-snug tracking-tight mb-8 sm:mb-12 text-white">
            slipped beyond our reach :/
          </h1>

          <div className="relative mb-8 sm:mb-12 w-full flex justify-center overflow-visible">
            <span className="four-oh-four text-[80px] xs:text-[100px] sm:text-[140px] md:text-[200px] lg:text-[260px] font-black text-white leading-none tracking-tighter select-none">
              404
            </span>
          </div>

          <Link
            to="/dashboard"
            className="liquid-glass text-white text-[10px] xs:text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] font-medium px-6 sm:px-8 py-3 sm:py-3.5 rounded-full uppercase hover:text-white/90 active:scale-95 transition-transform cursor-pointer"
          >
            Return to Dashboard
          </Link>
        </main>

        {/* Footer */}
        <footer className="relative z-10 px-6 md:px-12 lg:px-16 pb-8 sm:pb-10 pt-10 sm:pt-16 border-t border-white/5 bg-black/10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-start">
            {footerColumns.map(col => (
              <div key={col.title} className="flex flex-col">
                <h4 className="text-white text-[10px] sm:text-xs font-bold tracking-[0.15em] mb-3 sm:mb-4">
                  {col.title}
                </h4>
                <ul className="space-y-2 sm:space-y-2.5">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <Link to={link.path} className="text-white/50 hover:text-white/80 text-[10px] sm:text-xs transition-colors duration-200">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Newsletter + Social Column */}
            <div className="col-span-2 flex flex-col">
              <h4 className="text-white text-[10px] sm:text-xs font-bold tracking-[0.15em] mb-3 sm:mb-4 uppercase">
                JOIN FOR EXCLUSIVE DEALS
              </h4>
              <div className="flex w-full max-w-sm">
                <input 
                  type="email" 
                  placeholder="Type your email to sign up" 
                  className="flex-1 bg-white text-black px-4 py-2.5 rounded-l-md text-xs sm:text-sm focus:outline-none placeholder-gray-400"
                />
                <button className="bg-[#10B981] hover:bg-[#059669] text-white font-bold px-4 sm:px-6 py-2.5 rounded-r-md text-[10px] sm:text-xs tracking-wider cursor-pointer hover:opacity-90 transition-opacity">
                  SEND IT
                </button>
              </div>

              <h4 className="text-white text-[10px] sm:text-xs font-bold tracking-[0.15em] mt-6 mb-3 uppercase">
                CONNECT
              </h4>
              <div className="flex items-center gap-3">
                <a href="#" className="text-white/50 hover:text-white transition-colors duration-200">
                  <FacebookIcon className="w-4 h-4" />
                </a>
                <a href="#" className="text-white/50 hover:text-white transition-colors duration-200">
                  <TwitterIcon className="w-4 h-4" />
                </a>
                <a href="#" className="text-white/50 hover:text-white transition-colors duration-200">
                  <DribbbleIcon className="w-4 h-4" />
                </a>
                <a href="#" className="text-white/50 hover:text-white transition-colors duration-200">
                  <YoutubeIcon className="w-4 h-4" />
                </a>
                <a href="#" className="text-white/50 hover:text-white transition-colors duration-200">
                  <LinkedinIcon className="w-4 h-4" />
                </a>
                <a href="#" className="text-white/50 hover:text-white transition-colors duration-200">
                  <InstagramIcon className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
