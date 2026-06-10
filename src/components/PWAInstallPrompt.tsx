import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      console.log('beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Manual check for iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !(window.navigator as any).standalone) {
      // We could show instructions for iOS here, but let's keep it simple for now
      // and only show if the event actually fires for supported browsers.
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: \${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-24 left-4 right-4 z-[200] md:left-auto md:right-8 md:bottom-8 md:w-80"
      >
        <div className="bg-[#111111] border border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 flex flex-col gap-4 backdrop-blur-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#d0a78b] flex items-center justify-center shadow-lg shadow-[#d0a78b]/20">
                <Download className="w-6 h-6 text-black" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[15px] font-bold text-white tracking-tight">Install Beatrice</h3>
                <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">Premium Web App</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPrompt(false)}
              className="p-1.5 rounded-full hover:bg-white/5 text-zinc-500 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-xs text-zinc-300 leading-relaxed font-medium">
            Add Beatrice to your home screen for a seamless, full-screen native experience.
          </p>

          <button
            onClick={handleInstallClick}
            className="w-full bg-[#d0a78b] text-black font-black py-3.5 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#d0a78b]/10 cursor-pointer"
          >
            Install Now
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
