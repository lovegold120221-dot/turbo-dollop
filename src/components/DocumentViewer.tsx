import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, FileDown, ChevronDown, Loader2, Monitor } from 'lucide-react';

interface DocumentViewerProps {
  title: string;
  content: string;
  fileType?: string;
  onClose: () => void;
  personaName: string;
}

type DownloadFormat = 'html' | 'pdf' | 'doc' | 'png';

export function DocumentViewer({
  title,
  content,
  fileType = 'html',
  onClose,
  personaName,
}: DocumentViewerProps) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloading, setDownloading] = useState<DownloadFormat | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const handleDownloadBlob = useCallback((blob: Blob, ext: string, mime: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [title]);

  const downloadAs = useCallback(async (format: DownloadFormat) => {
    setDownloading(format);
    setDownloadOpen(false);
    try {
      if (format === 'html') {
        const blob = new Blob([content], { type: 'text/html' });
        handleDownloadBlob(blob, '.html', 'text/html');
        setDownloading(null);
        return;
      }
      // PDF and PNG can be added back if needed, but for now focus on the UI
      setDownloading(null);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloading(null);
    }
  }, [content, handleDownloadBlob]);

  const downloadOptions: { format: DownloadFormat; label: string; icon: typeof FileText }[] = [
    { format: 'html', label: 'HTML File', icon: FileText },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 sm:p-0 backdrop-blur-xl"
    >
      {/* Rigid Device Viewport Wrapper (Eburon PC Engine style) */}
      <div className="w-full max-w-[480px] h-[92vh] max-h-[900px] bg-black border-[10px] border-[#16161a] rounded-[44px] shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden">
        
        {/* Fixed Header Area */}
        <header className="bg-black z-[1000] flex items-center justify-between p-5 pb-4 border-b border-[#1f2025] shrink-0">
          <button 
            className="bg-none border-none text-white cursor-pointer flex items-center opacity-80 hover:opacity-100 transition-opacity" 
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight text-white font-sans">Eburon PC</h1>
          <div className="bg-black border border-[#27272a] rounded-xl px-2 py-1 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-white" />
            <ChevronDown className="w-3 h-3 text-white" />
          </div>
        </header>

        {/* Main Body Wrapper */}
        <div className="flex-grow flex flex-col p-4 gap-4 overflow-hidden bg-black">
          
          {/* Dominant Workspace Card */}
          <div className="bg-gradient-to-b from-[#121316] to-[#16171b] border border-[#1f2025] rounded-2xl flex flex-col relative overflow-hidden flex-grow shadow-inner">
            
            {/* Viewport for Artifact */}
            <div className="absolute inset-0 flex flex-col">
              {/* Internal View Header */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-[#1f2025] shrink-0">
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  payload_executed
                </div>
                <div className="flex items-center gap-2">
                   {/* Minimal zoom or utility icons could go here */}
                </div>
              </div>

              {/* Artifact Container */}
              <div className="flex-grow bg-white relative overflow-hidden">
                <iframe
                  ref={previewRef}
                  srcDoc={fileType === 'html' ? content : `<pre style="font-family:monospace;white-space:pre-wrap;padding:20px;font-size:14px;color:#000;background:#fff">${content.replace(/</g, '&lt;')}</pre>`}
                  className="absolute inset-0 w-full h-full border-0"
                  sandbox="allow-scripts"
                  title="Live Document Preview"
                />
              </div>
            </div>

          </div>

          {/* Command Bar / Bottom Navigation */}
          <div className="bg-[#0d0e11] border border-[#1a1b1f] rounded-2xl p-4 flex items-center justify-between gap-4 shrink-0 font-mono">
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="text-[9px] uppercase tracking-[0.15em] text-[#64748b] font-bold">Worker Assignment</div>
              <div className="text-[13px] text-white font-medium truncate opacity-90">{title}</div>
            </div>
            
            <div className="relative shrink-0">
              <button
                onClick={() => setDownloadOpen(!downloadOpen)}
                disabled={!!downloading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d0a78b] text-black text-[11px] font-bold hover:brightness-110 transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-[#d0a78b]/10"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                Export
              </button>

              <AnimatePresence>
                {downloadOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40" 
                      onClick={() => setDownloadOpen(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 bottom-full mb-3 z-50 bg-[#0d0e11] border border-zinc-700/60 rounded-xl overflow-hidden shadow-2xl min-w-[150px]"
                    >
                      {downloadOptions.map((opt) => (
                        <button
                          key={opt.format}
                          onClick={() => downloadAs(opt.format)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-left border-b border-white/5 last:border-0"
                        >
                          <opt.icon className="w-3.5 h-3.5 text-[#d0a78b]" />
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
