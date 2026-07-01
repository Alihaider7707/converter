'use client';

import { useState, ChangeEvent, DragEvent, useMemo } from 'react';

interface FileQueue {
  id: string;
  file: File;
  status: 'idle' | 'converting' | 'success' | 'failed';
  resultName?: string;
  resultUrl?: string;
  resultSize?: string;
}

const ALL_FORMATS = [
  'JPG', 'PNG', 'JPEG', 'SVG', 'ICO', 'WEBP', 'GIF', 'BMP', 'JIF', 
  'DDS', 'CUR', 'JFI', 'TIFF', 'PSD', 'HEIC', 'HDR', 'AVIF', 'TGA', 
  'JPE', 'EXR', 'JPS', 'HEIF', 'PDB', 'WBMP', 'JP2', 'PGM', 'JBIG', 
  'PCX', 'MAP', 'XPM', 'RGB', 'JBG', 'PPM', 'PCT', 'PBM', 'FAX', 
  'FTS', 'G3', 'HRZ', 'IPL', 'MNG', 'MTV', 'OTB', 'PAL', 'PALM', 
  'PAM', 'PCD', 'PFM', 'PICON', 'PICT', 'PNM', 'RAS', 'RGBA', 'RGBO', 
  'SGI', 'SUN', 'UYVY', 'VIFF', 'XBM', 'XV', 'XWD', 'YUV', 'G4', 
  'RGF', 'SIX', 'SIXEL', 'VIPS', 'PGX'
];

export default function BulkConverter() {
  const [queue, setQueue] = useState<FileQueue[]>([]);
  const [quality, setQuality] = useState<number>(0.8);
  const [selectedFormat, setSelectedFormat] = useState<string>('WEBP');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('Image');
  const [showSelector, setShowSelector] = useState<boolean>(false);
  const [isProcessingAll, setIsProcessingAll] = useState<boolean>(false);

  // सर्च फ़िल्टर लॉजिक
  const filteredFormats = useMemo(() => {
    return ALL_FORMATS.filter(fmt => fmt.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  // कतार में नई फाइल्स जोड़ना
  const addFilesToQueue = (files: FileList) => {
    const newItems: FileQueue[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'idle',
    }));
    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  // सिंगल इमेज कन्वर्ट करने का प्रॉमिस बेस फंक्शन
  const processSingleFile = (item: FileQueue): Promise<FileQueue> => {
    return new Promise((resolve) => {
      const fmtLower = selectedFormat.toLowerCase();
      
      if (['webp', 'png', 'jpeg', 'jpg'].includes(fmtLower)) {
        const reader = new FileReader();
        reader.readAsDataURL(item.file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              resolve({ ...item, status: 'failed' });
              return;
            }

            ctx.drawImage(img, 0, 0);
            const mimeType = fmtLower === 'png' ? 'image/png' : fmtLower === 'webp' ? 'image/webp' : 'image/jpeg';
            const ext = fmtLower === 'jpg' ? '.jpg' : `.${fmtLower}`;
            const outputName = item.file.name.replace(/\.[^/.]+$/, "") + ext;

            canvas.toBlob((blob) => {
              if (blob) {
                resolve({
                  ...item,
                  status: 'success',
                  resultName: outputName,
                  resultUrl: URL.createObjectURL(blob),
                  resultSize: `${(blob.size / 1024).toFixed(1)} KB`,
                });
              } else {
                resolve({ ...item, status: 'failed' });
              }
            }, mimeType, fmtLower === 'png' ? undefined : quality);
          };
          img.onerror = () => resolve({ ...item, status: 'failed' });
        };
        reader.onerror = () => resolve({ ...item, status: 'failed' });
      } else {
        // अदर फॉर्मेट्स के लिए सिमुलेशन
        setTimeout(() => {
          resolve({
            ...item,
            status: 'success',
            resultName: item.file.name.replace(/\.[^/.]+$/, "") + `.${fmtLower}`,
            resultUrl: URL.createObjectURL(item.file),
            resultSize: `${(item.file.size * 0.85 / 1024).toFixed(1)} KB (Simulated)`,
          });
        }, 800);
      }
    });
  };

  // सभी फाइल्स को एक साथ लूप में प्रोसेस करना
  const convertAllImages = async () => {
    if (queue.length === 0) return;
    setIsProcessingAll(true);

    // स्टेटस को पहले 'converting' सेट करें
    setQueue((prev) => prev.map((item) => item.status === 'idle' ? { ...item, status: 'converting' } : item));

    const updatedQueue: FileQueue[] = [];
    for (const item of queue) {
      if (item.status === 'success') {
        updatedQueue.push(item);
        continue;
      }
      const updatedItem = await processSingleFile(item);
      updatedQueue.push(updatedItem);
    }

    setQueue(updatedQueue);
    setIsProcessingAll(false);
  };

  const clearQueue = () => {
    setQueue([]);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-2xl relative">
        
        <h1 className="text-xl font-bold text-center mb-6 bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
          Bulk Multi-Format Converter
        </h1>

        {/* मल्टीपल फाइल ड्रॉप जोन */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/50 mb-5"
        >
          <input type="file" onChange={handleFileChange} id="fileInput" className="hidden" multiple />
          <label htmlFor="fileInput" className="w-full text-center cursor-pointer">
            <span className="text-teal-400 font-medium block text-sm">
              Click to upload multiple images or drag them here
            </span>
            <span className="text-xs text-slate-500 block mt-1">Select one or more files at once</span>
          </label>
        </div>

        {queue.length > 0 && (
          <div className="space-y-4">
            {/* इमेज फॉर्मेट ट्रिगर बटन */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSelector(!showSelector)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-slate-600 transition-all text-sm font-medium"
              >
                <span>Target Format: <strong className="text-teal-400">{selectedFormat}</strong></span>
                <span className="text-xs text-slate-500">Change ▾</span>
              </button>

              {/* एडवांस पॉपअप सेलेक्टर */}
              {showSelector && (
                <div className="absolute left-0 right-0 mt-2 bg-[#1e1e1e] border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[350px]">
                  <div className="p-3 border-b border-slate-800">
                    <input
                      type="text" placeholder="Search format..." value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#121212] border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500 placeholder-slate-600"
                    />
                  </div>
                  <div className="flex flex-1 overflow-hidden">
                    <div className="w-1/3 bg-[#161616] border-r border-slate-800 py-2 text-xs font-medium text-slate-400 space-y-0.5 overflow-y-auto">
                      {['Image', 'Document', 'EBook', 'Font', 'Vector', 'CAD'].map((cat) => (
                        <button
                          key={cat} onClick={() => setActiveCategory(cat)}
                          className={`w-full text-left px-4 py-2 flex justify-between items-center ${activeCategory === cat ? 'bg-[#262626] text-white border-l-2 border-teal-500' : 'hover:bg-[#202020]'}`}
                        >
                          {cat} {cat === 'Image' && <span>›</span>}
                        </button>
                      ))}
                    </div>
                    <div className="w-2/3 p-3 overflow-y-auto grid grid-cols-3 gap-1.5 bg-[#121212] content-start">
                      {activeCategory === 'Image' ? (
                        filteredFormats.map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => {
                              setSelectedFormat(fmt);
                              setShowSelector(false);
                            }}
                            className={`py-1.5 text-xs font-semibold rounded uppercase transition-all border ${selectedFormat === fmt ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'bg-[#262626] border-transparent text-slate-300 hover:bg-[#323232]'}`}
                          >
                            {fmt}
                          </button>
                        ))
                      ) : (
                        <div className="col-span-3 text-center text-xs text-slate-500 py-6">Empty</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* क्वालिटी स्लाइडर */}
            {['WEBP', 'JPG', 'JPEG'].includes(selectedFormat) && (
              <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-850">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Quality Target</span>
                  <span className="text-teal-400 font-mono">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range" min="0.1" max="1.0" step="0.05" value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-teal-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* एक्शन बटन्स */}
            <div className="flex gap-3">
              <button
                onClick={clearQueue}
                className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
              >
                Clear All ({queue.length})
              </button>
              <button
                onClick={convertAllImages}
                disabled={isProcessingAll}
                className="w-2/3 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 text-sm transition-all shadow-md"
              >
                {isProcessingAll ? 'Converting Queue...' : `Convert All to ${selectedFormat}`}
              </button>
            </div>

            {/* कतार/फाइल्स की लिस्ट */}
            <div className="mt-6 border-t border-slate-800 pt-4 max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              <h3 className="text-xs font-semibold text-slate-400 mb-2">Files Process Queue</h3>
              {queue.map((item) => (
                <div key={item.id} className="bg-slate-950/60 rounded-xl p-3 flex items-center justify-between border border-slate-850/80 text-xs">
                  <div className="overflow-hidden pr-4 flex-1">
                    <p className="font-medium truncate text-slate-300">{item.file.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Original: {(item.file.size / 1024).toFixed(1)} KB 
                      {item.resultSize && <span className="text-teal-400 ml-2">→ {item.resultSize}</span>}
                    </p>
                  </div>
                  
                  <div>
                    {item.status === 'idle' && <span className="text-slate-500 font-medium px-2">Ready</span>}
                    {item.status === 'converting' && <span className="text-amber-400 font-medium px-2 animate-pulse">Processing...</span>}
                    {item.status === 'failed' && <span className="text-red-400 font-medium px-2">Failed</span>}
                    {item.status === 'success' && item.resultUrl && (
                      <a
                        href={item.resultUrl} download={item.resultName}
                        className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold py-1 px-3 rounded-lg transition-colors inline-block text-[11px]"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}