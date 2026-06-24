import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NoScreenshotWrapper } from "@/components/NoScreenshotWrapper";
import { toast } from "sonner";
import { 
  FileText, 
  FolderOpen, 
  Video, 
  Music, 
  FileCode, 
  Download, 
  Lock, 
  EyeOff, 
  FileDown, 
  Check, 
  ArrowRight,
  FolderTree,
  Code
} from "lucide-react";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl?: string;
  fileName: string;
  fileType: string;
  jobTitle?: string;
  budget?: number;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
  jobTitle = "Project Work",
  budget = 0,
}) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [activeFolderTab, setActiveFolderTab] = useState<string>("src/index.js");

  const fileExt = fileName.split(".").pop()?.toLowerCase() || "";

  // 1. Detect category of the file
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(fileExt) || fileType.startsWith("image/");
  const isPdf = fileExt === "pdf" || fileType === "application/pdf";
  const isText = ["txt", "csv", "log", "md"].includes(fileExt) || fileType.startsWith("text/");
  const isCode = ["js", "ts", "tsx", "jsx", "html", "css", "py", "java", "cpp", "c", "cs", "json", "sh", "sql"].includes(fileExt);
  const isWordDoc = ["docx", "doc"].includes(fileExt);
  const isExcelDoc = ["xlsx", "xls"].includes(fileExt);
  const isPptDoc = ["pptx", "ppt"].includes(fileExt);
  const isZip = ["zip", "rar", "7z", "tar", "gz"].includes(fileExt);
  const isVideo = ["mp4", "webm", "ogg"].includes(fileExt) || fileType.startsWith("video/");
  const isAudio = ["mp3", "wav", "ogg"].includes(fileExt) || fileType.startsWith("audio/");

  // 2. Fetch text content if applicable
  useEffect(() => {
    if (isOpen && (isText || isCode) && fileUrl) {
      setTextLoading(true);
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch content");
          return res.text();
        })
        .then((text) => {
          setTextContent(text.substring(0, 10000)); // cap at 10k chars
          setTextLoading(false);
        })
        .catch((err) => {
          console.error("Error loading preview content:", err);
          setTextContent("Unable to load full text preview. Work remains locked and secure.");
          setTextLoading(false);
        });
    } else {
      setTextContent(null);
    }
  }, [isOpen, fileUrl, isText, isCode]);

  // 3. Security: Print Screen block and Window focus/blur tracking
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        setIsBlurred(true);
        toast.error("⚠️ Screenshots are disabled on Tasskly to protect the worker's intellectual property!");
        setTimeout(() => setIsBlurred(false), 3000);
      }
    };

    const handleBlur = () => {
      setIsBlurred(true);
    };

    const handleFocus = () => {
      setIsBlurred(false);
    };

    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isOpen]);

  // 4. Stylized repeating SVG Watermark
  const svgWatermark = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <g fill="rgba(124, 58, 237, 0.09)" font-size="10" font-family="'Inter', sans-serif" font-weight="900" letter-spacing="1">
        <text x="10" y="40" transform="rotate(-30, 10, 40)">Tasskly Security</text>
        <text x="90" y="120" transform="rotate(-30, 90, 120)">Tasskly Security</text>
      </g>
      <g fill="rgba(16, 185, 129, 0.06)" font-size="7" font-family="'Inter', sans-serif" font-weight="700">
        <text x="20" y="60" transform="rotate(-30, 20, 60)">LOCKED PREVIEW</text>
        <text x="100" y="140" transform="rotate(-30, 100, 140)">LOCKED PREVIEW</text>
      </g>
      <path d="M10,80 L25,80" stroke="rgba(124, 58, 237, 0.04)" stroke-width="1" />
      <path d="M90,160 L105,160" stroke="rgba(124, 58, 237, 0.04)" stroke-width="1" />
    </svg>
  `;

  const watermarkStyle: React.CSSProperties = {
    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svgWatermark)}")`,
    backgroundRepeat: "repeat",
    position: "absolute",
    inset: 0,
    zIndex: 40,
    pointerEvents: "none",
  };

  // Mock files explorer data for ZIP/Code Projects
  const mockZipStructure = [
    { name: "src/index.js", size: "2.4 KB", type: "code", content: "import React from 'react';\nimport ReactDOM from 'react-dom';\nimport App from './App';\n\nReactDOM.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n  document.getElementById('root')\n);" },
    { name: "src/App.js", size: "4.8 KB", type: "code", content: "import React from 'react';\nimport Navbar from './components/Navbar';\n\nfunction App() {\n  return (\n    <div className='App'>\n      <Navbar />\n      <main className='p-6'>\n        <h1 className='text-2xl font-bold'>Project Complete!</h1>\n      </main>\n    </div>\n  );\n}" },
    { name: "src/components/Navbar.js", size: "1.9 KB", type: "code", content: "export default function Navbar() {\n  return (\n    <nav className='bg-primary text-white p-4 flex justify-between'>\n      <span className='font-bold'>Logo</span>\n    </nav>\n  );\n}" },
    { name: "package.json", size: "1.2 KB", type: "code", content: "{\n  \"name\": \"completed-project\",\n  \"version\": \"1.0.0\",\n  \"dependencies\": {\n    \"react\": \"^18.2.0\",\n    \"react-dom\": \"^18.2.0\"\n  }\n}" },
    { name: "README.md", size: "850 B", type: "text", content: "# Project Readme\n\nAll tasks completed according to the original brief requirements. \nVerified and tested successfully." }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden border-primary/20 shadow-2xl">
        <NoScreenshotWrapper>
          <div className="relative flex flex-col h-full bg-slate-950 text-white select-none">
            {/* Security Top Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/5 z-50">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Secured Live Preview</span>
                  <span className="text-sm font-semibold text-white truncate max-w-[200px] md:max-w-md block leading-tight">{fileName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] md:text-xs bg-violet-600/40 text-violet-300 font-bold px-2 py-0.5 rounded border border-violet-500/30">
                  🔒 Screenshots Blocked
                </span>
                <span className="hidden sm:inline-block text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Watermark Protected
                </span>
              </div>
            </div>

            {/* Main Preview Work Area */}
            <div className="relative flex-1 bg-slate-950 overflow-auto p-4 flex items-center justify-center min-h-0">
              {/* Blur Security Shield Overlay */}
              {isBlurred && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex flex-col items-center justify-center text-center p-6 transition-all duration-300">
                  <EyeOff className="h-16 w-16 text-violet-500 mb-4 animate-bounce" />
                  <h3 className="text-xl font-bold text-white">Preview Security Shield Active</h3>
                  <p className="text-sm text-slate-400 mt-2 max-w-sm">
                    Content is hidden when screen captures, printing, or multitasking are detected to protect worker deliverables.
                  </p>
                </div>
              )}

              {/* Watermark Pattern Overlay (Pointer Events None) */}
              <div style={watermarkStyle} className="no-print" />

              {/* Category-Specific Preview Renderer */}
              <div className="w-full h-full flex items-center justify-center p-2 relative z-10 select-none">
                
                {/* 1. IMAGE PREVIEW */}
                {isImage && fileUrl && (
                  <div className="max-w-full max-h-full flex items-center justify-center rounded-xl overflow-hidden bg-slate-900 border border-white/5 p-2 shadow-inner">
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="max-w-full max-h-[65vh] object-contain pointer-events-none select-none select-none rounded"
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </div>
                )}

                {/* 2. PDF PREVIEW */}
                {isPdf && fileUrl && (
                  <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl relative">
                    <iframe
                      src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full border-0 select-none pointer-events-none"
                      style={{ filter: "contrast(1.05) brightness(0.95)" }}
                      title="Secured PDF Preview"
                    />
                    {/* Floating Lock indicator inside PDF view to reinforce security */}
                    <div className="absolute bottom-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 text-xs font-bold text-slate-300 shadow-lg pointer-events-none">
                      <Lock className="h-3.5 w-3.5 text-violet-400" />
                      Locked for Download
                    </div>
                  </div>
                )}

                {/* 3. TEXT / CODE PREVIEW */}
                {(isText || isCode) && (
                  <div className="w-full h-full flex flex-col bg-slate-900 border border-white/5 rounded-xl overflow-hidden text-left shadow-2xl">
                    <div className="px-4 py-2 bg-slate-800/80 border-b border-white/5 text-xs font-mono text-slate-400 flex items-center justify-between">
                      <span>⌨️ Code Editor Viewer</span>
                      <span>{fileExt.toUpperCase()} Mode</span>
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap select-none">
                      {textLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-400 gap-2">
                          <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          Loading secure code preview...
                        </div>
                      ) : (
                        textContent || "Unable to display source code details. Project deliverables are safe."
                      )}
                    </div>
                  </div>
                )}

                {/* 4. WORD DOCUMENT PREVIEW */}
                {isWordDoc && (
                  <div className="max-w-2xl w-full bg-white text-slate-800 rounded-xl shadow-2xl overflow-hidden border border-white/10 flex flex-col min-h-[500px]">
                    {/* Header */}
                    <div className="px-6 py-4 bg-blue-50 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600 shrink-0" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{fileName}</h4>
                          <p className="text-xs text-slate-500">Microsoft Word Document</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-600 text-white shrink-0 hover:bg-blue-600 select-none">Word Doc</Badge>
                    </div>
                    {/* Blurred Mock Content with clear watermarks */}
                    <div className="flex-1 p-8 space-y-6 relative overflow-hidden bg-slate-50">
                      <div style={watermarkStyle} className="no-print" />
                      <div className="space-y-2 opacity-50 blur-[3px]">
                        <div className="h-6 bg-slate-400 rounded w-1/3" />
                        <div className="h-4 bg-slate-300 rounded w-full" />
                        <div className="h-4 bg-slate-300 rounded w-full" />
                        <div className="h-4 bg-slate-300 rounded w-5/6" />
                      </div>
                      <div className="space-y-2 opacity-40 blur-[4px]">
                        <div className="h-4 bg-slate-300 rounded w-full" />
                        <div className="h-4 bg-slate-300 rounded w-full" />
                        <div className="h-4 bg-slate-300 rounded w-4/5" />
                      </div>
                      
                      {/* Interactive Security Banner */}
                      <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/45 backdrop-blur-[2px] z-30">
                        <div className="bg-white/95 text-slate-900 border border-slate-200 p-6 rounded-2xl max-w-sm text-center shadow-2xl space-y-4">
                          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow">
                            <Lock className="h-6 w-6" />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 text-base">Deliverable Securely Locked</h5>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                              Word documents are watermarked and compiled securely. Review the details above, then click <b>Accept & Release Payment</b> on your dashboard to unlock downloading.
                            </p>
                          </div>
                          <div className="pt-2 border-t text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Tasskly Security Shield v1.4
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. EXCEL DOCUMENT PREVIEW */}
                {isExcelDoc && (
                  <div className="max-w-3xl w-full bg-slate-900 text-slate-100 rounded-xl shadow-2xl overflow-hidden border border-white/5 flex flex-col min-h-[450px]">
                    <div className="px-6 py-4 bg-emerald-950/60 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-emerald-400 shrink-0" />
                        <div>
                          <h4 className="font-bold text-white text-base">{fileName}</h4>
                          <p className="text-xs text-emerald-400/70">Microsoft Excel Spreadsheet</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white shrink-0 hover:bg-emerald-600">Spreadsheet</Badge>
                    </div>
                    {/* Mock Blurred Sheet Cells */}
                    <div className="flex-1 p-6 relative overflow-hidden bg-slate-950 flex flex-col">
                      <div className="grid grid-cols-5 gap-2 opacity-35 blur-[2.5px] mb-2 font-mono text-[10px]">
                        {["A", "B", "C", "D", "E"].map(l => <div key={l} className="bg-slate-800 p-1.5 text-center font-bold">{l}</div>)}
                        {Array.from({ length: 25 }).map((_, idx) => (
                          <div key={idx} className="bg-slate-900/50 p-2 border border-white/5 text-center rounded">
                            {idx % 5 === 0 ? idx / 5 + 1 : `val_${idx}`}
                          </div>
                        ))}
                      </div>
                      
                      {/* Security Banner */}
                      <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-[2px] z-30">
                        <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-sm text-center shadow-2xl space-y-4">
                          <div className="h-12 w-12 bg-emerald-950/80 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                            <Lock className="h-6 w-6" />
                          </div>
                          <div>
                            <h5 className="font-bold text-white text-base">Spreadsheet Content Locked</h5>
                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                              Formula logs and tables are locked until project acceptance to avoid data duplication. Click <b>Accept & Release Payment</b> on your dashboard to unlock download.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. PRESENTATION PREVIEW */}
                {isPptDoc && (
                  <div className="max-w-2xl w-full bg-slate-900 text-slate-100 rounded-xl shadow-2xl overflow-hidden border border-white/5 flex flex-col min-h-[450px]">
                    <div className="px-6 py-4 bg-orange-950/50 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-orange-400 shrink-0" />
                        <div>
                          <h4 className="font-bold text-white text-base">{fileName}</h4>
                          <p className="text-xs text-orange-400/70">Microsoft PowerPoint Slide</p>
                        </div>
                      </div>
                      <Badge className="bg-orange-600 text-white shrink-0">Presentation</Badge>
                    </div>
                    {/* Mock Blurred Slide View */}
                    <div className="flex-1 p-6 relative overflow-hidden bg-slate-950 flex flex-col items-center justify-center">
                      <div className="w-11/12 h-44 bg-slate-900 border border-white/10 rounded-lg flex flex-col items-center justify-center p-4 opacity-30 blur-[3px]">
                        <div className="h-6 bg-slate-700 rounded w-1/2 mb-4" />
                        <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-slate-800 rounded w-2/3" />
                      </div>
                      
                      {/* Security Banner */}
                      <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-[2px] z-30">
                        <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl max-w-sm text-center shadow-2xl space-y-4">
                          <div className="h-12 w-12 bg-orange-950/80 text-orange-400 rounded-full flex items-center justify-center mx-auto border border-orange-500/20">
                            <Lock className="h-6 w-6" />
                          </div>
                          <div>
                            <h5 className="font-bold text-white text-base">Slide Presentation Locked</h5>
                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                              Slides are compiled securely and watermarked. Review slides or outline, then click <b>Accept & Release Payment</b> to release full files.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. ZIP ARCHIVE EXPLORER PREVIEW */}
                {isZip && (
                  <div className="max-w-2xl w-full bg-slate-900 text-slate-100 border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-[480px]">
                    <div className="px-6 py-4 bg-slate-800 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-8 w-8 text-yellow-500 shrink-0" />
                        <div>
                          <h4 className="font-bold text-white text-base">{fileName}</h4>
                          <p className="text-xs text-slate-400">Compressed Archive Project (ZIP)</p>
                        </div>
                      </div>
                      <Badge className="bg-yellow-600 text-slate-900 hover:bg-yellow-600 shrink-0 font-bold">Project ZIP</Badge>
                    </div>

                    <div className="flex-1 flex min-h-0 bg-slate-950">
                      {/* Left: Files Tree */}
                      <div className="w-1/3 border-r border-white/5 p-3 overflow-auto text-left space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-3 uppercase">
                          <FolderTree className="h-3.5 w-3.5 text-yellow-500" /> File Directory
                        </div>
                        {mockZipStructure.map((item) => {
                          const isActive = activeFolderTab === item.name;
                          return (
                            <button
                              key={item.name}
                              onClick={() => setActiveFolderTab(item.name)}
                              className={`w-full text-left px-2 py-1.5 rounded text-xs truncate flex items-center gap-2 transition-all ${
                                isActive ? "bg-primary/20 text-primary-hover font-semibold border-l-2 border-primary" : "text-slate-400 hover:bg-slate-900"
                              }`}
                            >
                              <FileCode className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{item.name.split("/").pop()}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right: Code Preview Container */}
                      <div className="flex-1 p-4 flex flex-col text-left min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2 uppercase font-mono">
                          <Code className="h-3.5 w-3.5 text-primary" /> file: {activeFolderTab}
                        </div>
                        <div className="flex-1 bg-slate-900 border border-white/5 rounded-lg p-3 font-mono text-[10px] text-emerald-400 overflow-auto whitespace-pre leading-relaxed select-none relative">
                          <div style={watermarkStyle} className="no-print" />
                          {mockZipStructure.find(item => item.name === activeFolderTab)?.content || "Select a file to review"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. VIDEO PREVIEW */}
                {isVideo && fileUrl && (
                  <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl relative flex flex-col items-center">
                    <video
                      src={fileUrl}
                      className="w-full h-auto max-h-[50vh] object-cover pointer-events-none"
                      controls={false} // Disable controls to prevent capture easily
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                    
                    {/* Watermark protected video banner */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/60 z-30">
                      <div className="bg-slate-900/90 border border-white/10 p-5 rounded-xl max-w-sm text-center shadow-xl space-y-3">
                        <Video className="h-8 w-8 text-primary mx-auto animate-pulse" />
                        <h5 className="font-bold text-white text-sm">Video Stream Securing</h5>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Video playback is protected under live watermarks. Tap <b>Accept & Release Payment</b> at the dashboard to download original high-resolution media.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. AUDIO PREVIEW */}
                {isAudio && fileUrl && (
                  <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-xl p-6 shadow-2xl text-center space-y-4 relative overflow-hidden">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto animate-pulse">
                      <Music className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base truncate">{fileName}</h4>
                      <p className="text-xs text-slate-400 mt-1">Audio Deliverable (Watermarked Demo)</p>
                    </div>
                    
                    <audio
                      src={fileUrl}
                      className="w-full mx-auto"
                      controls
                      controlsList="nodownload" // prevents download via controls
                    />
                    
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      * Original studio high fidelity audio will unlock for direct download once payment has been released.
                    </p>
                  </div>
                )}

                {/* 10. GENERIC / FALLBACK PREVIEW */}
                {!isImage && !isPdf && !isText && !isCode && !isWordDoc && !isExcelDoc && !isPptDoc && !isZip && !isVideo && !isAudio && (
                  <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-xl p-6 shadow-2xl text-center space-y-4">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
                      <FileDown className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base truncate">{fileName}</h4>
                      <p className="text-xs text-slate-400 mt-1">Binary File Deliverable ({fileExt.toUpperCase()})</p>
                    </div>
                    <div className="bg-slate-950 border border-white/5 p-4 rounded-lg flex items-center gap-3 text-left">
                      <Lock className="h-5 w-5 text-violet-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">Preview unavailable for {fileExt.toUpperCase()} format</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">To inspect and work with this deliverable, approve the project using the Accept button.</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Bottom Footer Actions Panel */}
            <div className="px-4 py-3.5 bg-slate-900 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 z-50">
              <div className="text-center sm:text-left">
                <span className="text-[10px] text-slate-400 uppercase font-black block tracking-wider">Reviewing work for</span>
                <span className="text-xs text-white font-bold block">{jobTitle} (₹{budget})</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onClose} 
                  className="flex-1 sm:flex-initial text-slate-300 border-white/10 bg-slate-800 hover:bg-slate-700 hover:text-white"
                >
                  Close Preview
                </Button>
              </div>
            </div>

          </div>
        </NoScreenshotWrapper>
      </DialogContent>
    </Dialog>
  );
};
