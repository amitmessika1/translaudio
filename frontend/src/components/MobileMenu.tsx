import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/app', label: 'App' },
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/api', label: 'API' },
  { href: '/about', label: 'About' },
];

export default function MobileMenu({ currentPath }: { currentPath: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden relative z-50 w-10 h-10 flex flex-col items-center justify-center gap-1.5"
        aria-label="Toggle menu"
      >
        <span
          className={`block w-6 h-[2px] bg-ink transition-all duration-300 ${
            open ? 'rotate-45 translate-y-[5px]' : ''
          }`}
        />
        <span
          className={`block w-6 h-[2px] bg-ink transition-all duration-300 ${
            open ? 'opacity-0 scale-x-0' : ''
          }`}
        />
        <span
          className={`block w-6 h-[2px] bg-ink transition-all duration-300 ${
            open ? '-rotate-45 -translate-y-[5px]' : ''
          }`}
        />
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-cream z-40 transition-all duration-500 lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <nav className="flex flex-col items-center justify-center h-full gap-8">
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`heading-editorial text-4xl transition-all duration-500 ${
                open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              } ${currentPath === link.href ? 'text-copper' : 'text-ink hover:text-copper'}`}
              style={{ transitionDelay: open ? `${i * 80}ms` : '0ms' }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
