import React, { useState } from 'react';
import { FileUp, Download, Trash2, Upload, FileCode, Crown } from 'lucide-react';
import { BreadcrumbBar } from '../components/BreadcrumbBar';
import { useApp } from '../context/AppContext';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  downloads: number;
  uploadedAt: string;
}

export const Files: React.FC = () => {
  const { currentApp } = useApp();
  const [files, setFiles] = useState<UploadedFile[]>([
    {
      id: 'f-1',
      name: 'Loader.exe',
      size: '2.4 MB',
      downloads: 48,
      uploadedAt: '2026-10-18',
    },
    {
      id: 'f-2',
      name: 'cheat_module.dll',
      size: '1.1 MB',
      downloads: 124,
      uploadedAt: '2026-10-19',
    },
  ]);
  const [fileName, setFileName] = useState('');

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;
    setFiles([
      ...files,
      {
        id: `f-${Date.now()}`,
        name: fileName.trim(),
        size: '1.8 MB',
        downloads: 0,
        uploadedAt: new Date().toISOString().split('T')[0],
      },
    ]);
    setFileName('');
  };

  const handleDelete = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-6">
      <BreadcrumbBar pageTitle="Secure Files" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <span>Secure File Storage</span>
            <Crown className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Store encrypted payloads, DLLs, and binaries downloaded exclusively through authorized client sessions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#16171c] border border-[#22242b] rounded-xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-orange-400" />
            Upload File Binary
          </h2>
          <form onSubmit={handleUpload} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">File Name</label>
              <input
                type="text"
                required
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                placeholder="e.g. ProtectedBinary.exe"
                className="w-full bg-[#111216] border border-[#282a35] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="border-2 border-dashed border-[#2b2d3d] rounded-xl p-6 text-center text-xs text-zinc-400 hover:border-orange-500/50 transition-colors cursor-pointer">
              <FileUp className="w-6 h-6 mx-auto mb-2 text-orange-400" />
              <span>Click or drag executable here to upload</span>
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition-all"
            >
              Register File
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-3">
          {files.map(f => (
            <div
              key={f.id}
              className="bg-[#16171c] border border-[#22242b] rounded-xl p-4 flex items-center justify-between hover:border-[#2f313c] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-white">{f.name}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Size: {f.size} &bull; Downloads: {f.downloads} &bull; Uploaded: {f.uploadedAt}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Downloading secure payload for ${f.name}`)}
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-white bg-[#22242f] hover:bg-orange-600 transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
                  title="Delete File"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
