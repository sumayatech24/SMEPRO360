import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Article { id: number; title: string; category: string; content: string; tags: string[]; is_published: boolean; views: number; created_at: string; }

const CATEGORIES = ['General','Technical','HR Policy','Finance','Sales Process','IT Support','Security','Operations'];

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewArticle, setViewArticle] = useState<Article|null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [form, setForm] = useState({ title:'', category:'General', content:'', tags:'', is_published:true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/helpdesk/knowledge', {params:{limit:100}});
      setArticles(r.data.items || r.data || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.title || !form.content) return toast.error('Fill required fields');
    try {
      await api.post('/helpdesk/knowledge', { ...form, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) });
      toast.success('Article created!'); setModalOpen(false); load();
      setForm({ title:'', category:'General', content:'', tags:'', is_published:true });
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const filtered = articles.filter(a =>
    (!catFilter || a.category === catFilter) &&
    (!search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Knowledge Base</h1><p className="text-slate-500 text-sm mt-1">Company documentation and help articles</p></div>
        <button onClick={()=>setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Write Article</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{label:'Total Articles',value:articles.length},{label:'Published',value:articles.filter(a=>a.is_published!==false).length},{label:'Categories',value:new Set(articles.map(a=>a.category)).size}].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search articles..."
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 flex-1 max-w-xs" />
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
          <option value="">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i=><div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-100">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-slate-500 font-medium">No articles found</div>
          <button onClick={()=>setModalOpen(true)} className="mt-4 gradient-bg text-white px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90">Write First Article</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(article=>(
            <div key={article.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={()=>setViewArticle(article)}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{article.category}</span>
                <Badge label={article.is_published!==false?'Published':'Draft'} color={article.is_published!==false?'green':'gray'} />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2">{article.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-3 mb-3">{article.content?.replace(/<[^>]*>/g,'')||''}</p>
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(article.tags||[]).slice(0,3).map((tag:string,i:number)=>(
                    <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
              <div className="text-xs text-slate-400 mt-3">{article.created_at?new Date(article.created_at).toLocaleDateString('en-IN'):''}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create Article Modal */}
      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title="Write Knowledge Base Article" size="xl">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Article title"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
              <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="e.g. login, password, setup"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
            <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} rows={8} placeholder="Write your article content here..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono" /></div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="pub" checked={form.is_published} onChange={e=>setForm(f=>({...f,is_published:e.target.checked}))} className="w-4 h-4 rounded text-indigo-600" />
            <label htmlFor="pub" className="text-sm text-slate-700">Publish immediately</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Publish Article</button>
          </div>
        </div>
      </Modal>

      {/* View Article Modal */}
      {viewArticle && (
        <Modal isOpen={!!viewArticle} onClose={()=>setViewArticle(null)} title={viewArticle.title} size="xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-medium">{viewArticle.category}</span>
              {(viewArticle.tags||[]).map((tag:string,i:number)=><span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">{tag}</span>)}
            </div>
            <div className="prose prose-sm max-w-none border border-slate-100 rounded-xl p-4 bg-slate-50 text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
              {viewArticle.content}
            </div>
            <div className="text-xs text-slate-400 flex justify-between">
              <span>Published: {viewArticle.created_at?new Date(viewArticle.created_at).toLocaleDateString('en-IN'):'-'}</span>
              <span>{viewArticle.views||0} views</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
