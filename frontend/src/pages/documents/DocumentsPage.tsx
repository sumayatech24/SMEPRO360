import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Doc { id: number; title: string; document_type: string; department: string; version: string; description: string; is_public: boolean; created_at: string; }

const typeColor: Record<string, string> = { policy: 'blue', procedure: 'indigo', template: 'green', legal: 'red', marketing: 'yellow', technical: 'gray' };
const DEPARTMENTS = ["HR","IT","Finance","Sales","Procurement","Marketing","Legal","Operations","Engineering","Admin"];
const DOC_TYPES = ["policy","procedure","template","legal","marketing","technical","report","other"];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({ title: '', document_type: '', department: '', version: '1.0', description: '', is_public: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/documents/', { params: { limit: 100 } });
      setDocs(r.data.items || r.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.title || !form.document_type) return toast.error('Fill required fields');
    try {
      await api.post('/documents/', { ...form });
      toast.success('Document created!'); setModalOpen(false); load();
      setForm({ title: '', document_type: '', department: '', version: '1.0', description: '', is_public: false });
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const filtered = docs.filter(d =>
    (!filterType || d.document_type === filterType) &&
    (!filter || d.title?.toLowerCase().includes(filter.toLowerCase()) || d.department?.toLowerCase().includes(filter.toLowerCase()))
  );

  const columns = [
    { key: 'title', title: 'Title', render: (r: Doc) => <span className="font-medium text-slate-800">{r.title}</span> },
    { key: 'document_type', title: 'Type', render: (r: Doc) => <Badge label={r.document_type} color={typeColor[r.document_type] as any || 'gray'} /> },
    { key: 'department', title: 'Department', render: (r: Doc) => r.department || '-' },
    { key: 'version', title: 'Version', render: (r: Doc) => <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">v{r.version}</span> },
    { key: 'description', title: 'Description', render: (r: Doc) => <span className="text-slate-500 text-sm truncate max-w-xs block">{r.description || '-'}</span> },
    { key: 'is_public', title: 'Access', render: (r: Doc) => <Badge label={r.is_public ? 'Public' : 'Private'} color={r.is_public ? 'green' : 'gray'} /> },
    { key: 'created_at', title: 'Created', render: (r: Doc) => r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '-' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Documents</h1><p className="text-slate-500 text-sm mt-1">Document management and knowledge repository</p></div>
        <button onClick={() => setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ New Document</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {DOC_TYPES.slice(0,4).map(type => (
          <div key={type} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterType(filterType === type ? '' : type)}>
            <div className="text-xs text-slate-500 capitalize">{type}</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{docs.filter(d => d.document_type === type).length}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">All Types</option>
          {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title="Document Library"
        onSearch={setFilter} searchPlaceholder="Search documents..."
        onAdd={() => setModalOpen(true)} addLabel="New Document"
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Document" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Document title"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
              <select value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Type</option>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_public" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
            <label htmlFor="is_public" className="text-sm text-slate-700">Make this document publicly accessible</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create Document</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
