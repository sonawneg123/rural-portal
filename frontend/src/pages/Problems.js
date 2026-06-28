// src/pages/Problems.js
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import ProblemCard from '../components/ProblemCard';
import { INDIA_STATES, STATUS_CONFIG } from '../utils/locations';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Problems() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [problems,   setProblems]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading,    setLoading]    = useState(true);

  const f = (key) => searchParams.get(key) || '';
  const set = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    if (key !== 'page') p.set('page', '1');
    setSearchParams(p);
  };

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        state:       f('state'),
        district:    f('district'),
        category_id: f('category_id'),
        status:      f('status'),
        search:      f('search'),
        sort:        f('sort') || 'newest',
        page:        f('page') || '1',
        limit:       12,
      };
      const { data } = await api.get('/problems', { params });
      setProblems(data.data);
      setPagination(data.pagination);
    } catch { /* silent */ }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);
  useEffect(() => { api.get('/categories').then((r) => setCategories(r.data.data)); }, []);

  const page = parseInt(f('page') || '1');

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <div style={s.pageHead}>
          <h1 style={s.h1}>Browse Problems</h1>
          <p style={s.sub}>{pagination.total || 0} problems reported across India</p>
        </div>

        {/* Search + sort */}
        <div style={s.bar}>
          <div style={s.searchWrap}>
            <Search size={16} color="#9CA3AF" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}/>
            <input placeholder="Search problems…" value={f('search')}
              onChange={(e) => set('search', e.target.value)} style={s.searchInput}/>
          </div>
          <select value={f('sort')||'newest'} onChange={(e) => set('sort', e.target.value)} style={s.sel}>
            <option value="newest">Newest First</option>
            <option value="popular">Most Upvoted</option>
            <option value="views">Most Viewed</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <div style={s.layout}>
          {/* Sidebar */}
          <aside style={s.sidebar}>
            <div style={s.filterHead}><SlidersHorizontal size={14}/> Filters</div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>State</label>
              <select value={f('state')} onChange={(e) => set('state', e.target.value)} style={s.fSel}>
                <option value="">All States</option>
                {INDIA_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Category</label>
              <select value={f('category_id')} onChange={(e) => set('category_id', e.target.value)} style={s.fSel}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={s.filterGroup}>
              <label style={s.filterLabel}>Status</label>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <label key={key} style={s.radioLabel}>
                  <input type="radio" name="status" value={key}
                    checked={f('status') === key}
                    onChange={() => set('status', key)}
                    style={{ accentColor: cfg.color }}/>
                  <span style={{ color:cfg.color, fontWeight:600, fontSize:13 }}>{cfg.label}</span>
                </label>
              ))}
              {f('status') && (
                <button style={s.clearBtn} onClick={() => set('status', '')}>Clear ×</button>
              )}
            </div>
          </aside>

          {/* Grid */}
          <main style={s.main}>
            {loading ? (
              <div style={s.empty}>Loading problems…</div>
            ) : problems.length ? (
              <>
                <div style={s.grid}>{problems.map((p) => <ProblemCard key={p.id} problem={p}/>)}</div>
                {pagination.totalPages > 1 && (
                  <div style={s.pager}>
                    <button style={s.pageBtn} disabled={page === 1}
                      onClick={() => set('page', String(page - 1))}><ChevronLeft size={16}/></button>
                    <span style={s.pageInfo}>Page {pagination.page} of {pagination.totalPages}</span>
                    <button style={s.pageBtn} disabled={page === pagination.totalPages}
                      onClick={() => set('page', String(page + 1))}><ChevronRight size={16}/></button>
                  </div>
                )}
              </>
            ) : (
              <div style={s.empty}>
                <p style={{ fontSize:36, margin:'0 0 12px' }}>🔍</p>
                <p style={{ color:'#6B7280' }}>No problems found for these filters</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:       { minHeight:'100vh', background:'#F9FAFB', padding:'28px 16px 60px' },
  inner:      { maxWidth:1200, margin:'0 auto' },
  pageHead:   { marginBottom:22 },
  h1:         { fontSize:24, fontWeight:800, color:'#111827', margin:'0 0 4px' },
  sub:        { fontSize:14, color:'#6B7280', margin:0 },
  bar:        { display:'flex', gap:12, marginBottom:22, flexWrap:'wrap' },
  searchWrap: { flex:1, position:'relative', minWidth:220 },
  searchInput:{ width:'100%', padding:'10px 14px 10px 38px', borderRadius:10, border:'1.5px solid #D1D5DB', fontSize:14, outline:'none', boxSizing:'border-box' },
  sel:        { padding:'10px 14px', borderRadius:10, border:'1.5px solid #D1D5DB', fontSize:14, outline:'none', background:'#fff' },
  layout:     { display:'flex', gap:22, alignItems:'flex-start' },
  sidebar:    { width:210, flexShrink:0, background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', padding:'16px' },
  filterHead: { display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:800, color:'#374151', marginBottom:16, textTransform:'uppercase', letterSpacing:0.5 },
  filterGroup:{ marginBottom:16 },
  filterLabel:{ display:'block', fontSize:11, fontWeight:700, color:'#6B7280', marginBottom:8, textTransform:'uppercase', letterSpacing:0.4 },
  fSel:       { width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #D1D5DB', fontSize:13, outline:'none', background:'#fff' },
  radioLabel: { display:'flex', alignItems:'center', gap:7, fontSize:13, marginBottom:6, cursor:'pointer' },
  clearBtn:   { fontSize:11, color:'#EF4444', background:'none', border:'none', cursor:'pointer', padding:'2px 0', marginTop:4 },
  main:       { flex:1 },
  grid:       { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:18 },
  empty:      { textAlign:'center', padding:80, color:'#9CA3AF' },
  pager:      { display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginTop:32 },
  pageBtn:    { width:36, height:36, borderRadius:8, border:'1.5px solid #D1D5DB', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  pageInfo:   { fontSize:14, color:'#374151', fontWeight:600 },
};
