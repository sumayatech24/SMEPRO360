import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api, { downloadExcel } from '../../api/client';
import toast from 'react-hot-toast';

interface JE { id: number; entry_number: string; entry_date: string; reference: string; description: string; total_debit: number; total_credit: number; status: string; }
interface Account { id: number; account_code: string; account_name: string; account_type: string; }

const statusColor: Record<string, string> = { draft: 'gray', posted: 'green', reversed: 'red' };

export default function JournalsPage() {
  const [journals, setJournals] = useState<JE[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '', reference: '', entry_type: 'manual',
    lines: [
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
    ]
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jRes, aRes] = await Promise.all([
        api.get('/finance/journals', { params: { limit: 100 } }),
        api.get('/finance/accounts'),
      ]);
      setJournals(jRes.data.items || jRes.data);
      setAccounts(aRes.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const totalDebit = form.lines.reduce((s, l) => s + (Number(l.debit_amount) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (Number(l.credit_amount) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { account_id: '', description: '', debit_amount: 0, credit_amount: 0 }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, x) => x !== i) }));
  const updateLine = (i: number, field: string, val: any) => setForm(f => ({ ...f, lines: f.lines.map((l, x) => x === i ? { ...l, [field]: val } : l) }));

  const submit = async () => {
    if (!balanced) return toast.error('Debit and Credit must balance');
    try {
      await api.post('/finance/journals', {
        ...form,
        lines: form.lines.filter(l => l.account_id).map(l => ({ ...l, account_id: Number(l.account_id), debit_amount: Number(l.debit_amount), credit_amount: Number(l.credit_amount) })),
      });
      toast.success('Journal entry created!'); setModalOpen(false); load();
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const postJE = async (id: number) => {
    await api.put(`/finance/journals/${id}/post`, {});
    toast.success('Journal entry posted!'); load();
  };

  const filtered = journals.filter(j => !filter ||
    j.entry_number?.toLowerCase().includes(filter.toLowerCase()) ||
    j.description?.toLowerCase().includes(filter.toLowerCase())
  );

  const columns = [
    { key: 'entry_number', title: 'Entry #', render: (r: JE) => <span className="font-mono font-medium text-indigo-600">{r.entry_number}</span> },
    { key: 'entry_date', title: 'Date', render: (r: JE) => r.entry_date ? new Date(r.entry_date).toLocaleDateString('en-IN') : '-' },
    { key: 'reference', title: 'Reference', render: (r: JE) => r.reference || '-' },
    { key: 'description', title: 'Description', render: (r: JE) => <span className="max-w-xs truncate block text-slate-600">{r.description}</span> },
    { key: 'total_debit', title: 'Debit', render: (r: JE) => <span className="font-medium text-red-600">₹{(r.total_debit || 0).toLocaleString('en-IN')}</span> },
    { key: 'total_credit', title: 'Credit', render: (r: JE) => <span className="font-medium text-green-600">₹{(r.total_credit || 0).toLocaleString('en-IN')}</span> },
    { key: 'status', title: 'Status', render: (r: JE) => <Badge label={r.status} color={statusColor[r.status] as any} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Journal Entries</h1><p className="text-slate-500 text-sm mt-1">Double-entry bookkeeping records</p></div>
        <button onClick={() => setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ New Entry</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Entries', value: journals.length },
          { label: 'Draft', value: journals.filter(j => j.status === 'draft').length },
          { label: 'Posted', value: journals.filter(j => j.status === 'posted').length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title="Journal Entries"
        onSearch={setFilter} searchPlaceholder="Search entries..."
        onExport={() => downloadExcel('/finance/journals/export', 'journals.xlsx')}
        onAdd={() => setModalOpen(true)} addLabel="New Entry"
        actions={(row: JE) => (
          row.status === 'draft'
            ? <button onClick={() => postJE(row.id)} className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">Post</button>
            : null
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Journal Entry" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
              <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="JE-REF-001"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.entry_type} onChange={e => setForm(f => ({ ...f, entry_type: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['manual','sales','purchase','payment','receipt','contra'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Journal entry description"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Lines</label>
              <button onClick={addLine} className="text-xs text-indigo-600 font-medium">+ Add Line</button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                <div className="col-span-4">Account</div><div className="col-span-3">Narration</div>
                <div className="col-span-2">Debit</div><div className="col-span-2">Credit</div><div className="col-span-1"></div>
              </div>
              {form.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-100">
                  <select value={line.account_id} onChange={e => updateLine(idx, 'account_id', e.target.value)}
                    className="col-span-4 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300">
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
                  </select>
                  <input className="col-span-3 border border-slate-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Narration"
                    value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                    value={line.debit_amount} onChange={e => updateLine(idx, 'debit_amount', e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                    value={line.credit_amount} onChange={e => updateLine(idx, 'credit_amount', e.target.value)} />
                  <button onClick={() => removeLine(idx)} className="col-span-1 text-red-400 hover:text-red-600 text-xl">×</button>
                </div>
              ))}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-t border-slate-200 text-sm font-semibold">
                <div className="col-span-7 text-right text-slate-600">Totals:</div>
                <div className={`col-span-2 ${!balanced && totalDebit > 0 ? 'text-red-500' : 'text-slate-800'}`}>₹{totalDebit.toLocaleString('en-IN')}</div>
                <div className={`col-span-2 ${!balanced && totalCredit > 0 ? 'text-red-500' : 'text-slate-800'}`}>₹{totalCredit.toLocaleString('en-IN')}</div>
              </div>
            </div>
            {!balanced && totalDebit > 0 && <p className="text-xs text-red-500 mt-1">Difference: ₹{Math.abs(totalDebit - totalCredit).toLocaleString('en-IN')} — Debit and Credit must balance</p>}
            {balanced && <p className="text-xs text-green-600 mt-1">Entry is balanced</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} disabled={!balanced} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Save as Draft</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
