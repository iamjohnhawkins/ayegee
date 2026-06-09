import { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Btn } from './Modal';
import { api } from '../../lib/api';
import { useToast } from '../../hooks/useToast.jsx';

export function BulkUploadModal({ open, onClose, uploadPath, samplePath, entityLabel, onSuccess }) {
  const showToast = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const reset = () => { setFile(null); setResult(null); };
  const close = () => { reset(); onClose(); };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); }
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await api.upload(uploadPath, fd);
      setResult({ ok: true, message: data.message ?? `${entityLabel} uploaded successfully.` });
      showToast(data.message ?? `${entityLabel} uploaded.`);
      onSuccess?.();
    } catch (err) {
      setResult({ ok: false, message: err.errors?.[0] ?? err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Bulk Upload ${entityLabel}`}
      footer={
        <>
          <Btn variant="secondary" onClick={close}>Close</Btn>
          {file && !result?.ok && (
            <Btn onClick={upload} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Btn>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Download sample */}
        <a
          href={`/api${samplePath}`}
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
          Download sample template
        </a>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-sm transition-colors ${
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
          }`}
        >
          <svg className="h-8 w-8 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
          </svg>
          {file
            ? <p className="font-medium text-slate-700">{file.name}</p>
            : <><p className="font-medium text-slate-600">Drop an Excel file here</p><p className="text-slate-400">or click to browse</p></>
          }
        </div>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setResult(null); } }} />

        {/* Result */}
        {result && (
          <p className={`rounded-lg border px-4 py-3 text-sm ${result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            {result.message}
          </p>
        )}
      </div>
    </Modal>
  );
}
