// src/pages/Admin.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { STATUS_CONFIG, PRIORITY_CONFIG, formatDate } from '../utils/locations';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, FileText, Users, Shield,
  CheckCircle, Clock, TrendingUp, AlertTriangle,
  ChevronDown, Sparkles, Loader, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const TABS    = ['Dashboard', 'Problems', 'Users'];
const COLORS  = ['#16a34a','#3B82F6','#F59E0B','#EF4444','#8B5CF6','#10B981','#EC4899','#F97316'];

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const navigate           = useNavigate();
  const [tab,      setTab]      = useState('Dashboard');
  const [data,     setData]     = useState(null);
  const [problems, setProblems] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Status-update modal
  const [modal,    setModal]    = useState(null);
  const [mForm,    setMForm]    = useState({ status:'', priority:'', admin_notes:'' });

  // Groq insight per problem row
  const [insight,      setInsight]      = useState({});   // { [id]: text }
  const [insightLoad,  setInsightLoad]  = useState({});   // { [id]: bool }

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    loadDashboard();
  }, [isAdmin]); // eslint-disable-line

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/admin/dashboard');
      setData(d.data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  const loadProblems = async () => {
    setLoading(true);
    try { const { data: d } = await api.get('/admin/problems?limit=50'); setProblems(d.data); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try { const { data: d } = await api.get('/admin/users?limit=50'); setUsers(d.data); }
    finally { setLoading(false); }
  };

  const switchTab = (t) => {
    setTab(t);
    if (t === 'Problems') loadProblems();
    if (t === 'Users')    loadUsers();
  };

  const openModal = (p) => {
    setMForm({ status: p.status, priority: p.priority, admin_notes: '' });
    setModal(p);
  };

  const saveStatus = async () => {
    try {
      await api.patch(`/admin/problems/${modal.id}/status`, mForm);
      toast.success('Problem updated');
      setModal(null);
      loadProblems();
    } catch { toast.error('Update failed'); }
  };

  const toggleUser = async (id) => {
    await api.patch(`/admin/users/${id}/toggle`);
    toast.success('User status changed');
    loadUsers();
  };

  const fetchInsight = async (problemId) => {
    setInsightLoad((prev) => ({ ...prev, [problemId]: true }));
    try {
      const { data } = await api.get(`/admin/problems/${problemId}/insight`);
      setInsight((prev) => ({ ...prev, [problemId]: data.insight }));
    } catch { toast.error('Could not load AI insight'); }
    finally { setInsightLoad((prev) => ({ ...prev, [problemId]: false })); }
  };

  return (
    <div style={s.page}>
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <Shield size={20} color="#fff"/>
          <span style={s.sideTitle}>Admin Panel</span>
        </div>
        <div style={s.adminInfo}>
          <div style={s.adminAvatar}>{user?.name?.[0]}</div>
          <div>
            <div style={s.adminName}>{user?.name}</div>
            <div style={s.adminRole}>Administrator</div>
          </div>
        </div>
        <nav style={s.nav}>
          {TABS.map((t) => (
            <button key={t} style={{ ...s.navBtn, ...(tab === t ? s.navActive : {}) }}
              onClick={() => switchTab(t)}>
              {t === 'Dashboard' && <LayoutDashboard size={15}/>}
              {t === 'Problems'  && <FileText size={15}/>}
              {t === 'Users'     && <Users size={15}/>}
              {t}
            </button>
          ))}
        </nav>

        {/* Groq badge in sidebar */}
        <div style={s.groqBadge}>
          <Sparkles size={13} color="#A78BFA"/>
          <div>
            <div style={s.groqLabel}>Groq AI Active</div>
            <div style={s.groqModel}>llama3-8b-8192</div>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────── */}
      <main style={s.main}>

        {/* DASHBOARD */}
        {tab === 'Dashboard' && !loading && data && (
          <>
            <h1 style={s.pageTitle}>Dashboard Overview</h1>

            {/* Stat cards */}
            <div style={s.statGrid}>
              {[
                { label:'Total Reports',   val:data.summary.total_problems, icon:<FileText size={20}/>,      color:'#3B82F6' },
                { label:'Pending',         val:data.summary.pending,         icon:<Clock size={20}/>,         color:'#F59E0B' },
                { label:'In Progress',     val:data.summary.in_progress,     icon:<TrendingUp size={20}/>,    color:'#8B5CF6' },
                { label:'Resolved',        val:data.summary.resolved,        icon:<CheckCircle size={20}/>,   color:'#10B981' },
                { label:'Total Citizens',  val:data.summary.total_users,     icon:<Users size={20}/>,         color:'#EC4899' },
                { label:"Today's Reports", val:data.summary.today_reports,   icon:<AlertTriangle size={20}/>, color:'#EF4444' },
              ].map((c) => (
                <div key={c.label} style={s.statCard}>
                  <div style={{ color:c.color, marginBottom:8 }}>{c.icon}</div>
                  <div style={s.statVal}>{c.val}</div>
                  <div style={s.statLabel}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={s.chartsRow}>
              <div style={s.chartCard}>
                <h3 style={s.chartTitle}>Problems by Category</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byCategory}>
                    <XAxis dataKey="name" tick={{ fontSize:10 }} interval={0} angle={-18} textAnchor="end" height={52}/>
                    <YAxis tick={{ fontSize:11 }}/>
                    <Tooltip/>
                    <Bar dataKey="count" fill="#16a34a" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={s.chartCard}>
                <h3 style={s.chartTitle}>Top States</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.byState} dataKey="count" nameKey="state" cx="50%" cy="50%" outerRadius={80} label>
                      {data.byState.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent problems table */}
            <div style={s.tableCard}>
              <div style={s.tableHead}>Recent Reports</div>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {['Title','Category','Reporter','Status','Priority','Date'].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentProblems?.map((p) => {
                    const st = STATUS_CONFIG[p.status];
                    const pr = PRIORITY_CONFIG[p.priority];
                    return (
                      <tr key={p.id} style={s.tr}>
                        <td style={s.td}><span style={s.titleCell}>{p.title}</span></td>
                        <td style={s.td}>{p.category}</td>
                        <td style={s.td}>{p.reporter}</td>
                        <td style={s.td}><span style={{ ...s.badge, color:st.color, background:st.bg }}>{st.label}</span></td>
                        <td style={s.td}><span style={{ color:pr.color, fontWeight:700, fontSize:12 }}>{pr.label}</span></td>
                        <td style={s.td}>{formatDate(p.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* PROBLEMS TAB */}
        {tab === 'Problems' && (
          <>
            <h1 style={s.pageTitle}>Manage Problems</h1>
            <div style={s.tableCard}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {['#','Title','Location','Status','Priority','Upvotes','AI Summary','Insight','Action'].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {problems.map((p) => {
                    const st = STATUS_CONFIG[p.status];
                    const pr = PRIORITY_CONFIG[p.priority];
                    return (
                      <tr key={p.id} style={s.tr}>
                        <td style={s.td}>{p.id}</td>
                        <td style={s.td}><span style={s.titleCell}>{p.title}</span></td>
                        <td style={s.td}>{p.district}, {p.state}</td>
                        <td style={s.td}><span style={{ ...s.badge, color:st.color, background:st.bg }}>{st.label}</span></td>
                        <td style={s.td}><span style={{ color:pr.color, fontWeight:700, fontSize:12 }}>{pr.label}</span></td>
                        <td style={s.td}>{p.upvotes}</td>
                        {/* Groq AI Summary snippet */}
                        <td style={s.td}>
                          {p.ai_summary
                            ? <span style={s.aiSnippet} title={p.ai_summary}>
                                <Sparkles size={11} color="#8B5CF6"/> {p.ai_summary.slice(0,60)}…
                              </span>
                            : <span style={{ color:'#D1D5DB', fontSize:12 }}>—</span>
                          }
                        </td>
                        {/* Groq Admin Insight */}
                        <td style={s.td}>
                          {insight[p.id]
                            ? <span style={s.insightSnippet} title={insight[p.id]}>
                                💡 {insight[p.id].slice(0,50)}…
                              </span>
                            : <button style={s.insightMiniBtn}
                                onClick={() => fetchInsight(p.id)}
                                disabled={insightLoad[p.id]}>
                                {insightLoad[p.id]
                                  ? <Loader size={12} style={{ animation:'spin 0.8s linear infinite' }}/>
                                  : <><Sparkles size={12}/> Ask Groq</>
                                }
                              </button>
                          }
                        </td>
                        <td style={s.td}>
                          <button style={s.editBtn} onClick={() => openModal(p)}>
                            Update <ChevronDown size={12}/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* USERS TAB */}
        {tab === 'Users' && (
          <>
            <h1 style={s.pageTitle}>Registered Citizens</h1>
            <div style={s.tableCard}>
              <table style={s.table}>
                <thead>
                  <tr style={s.thead}>
                    {['Name','Email','Location','Problems','Joined','Status'].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={s.tr}>
                      <td style={s.td}>{u.name}</td>
                      <td style={s.td}>{u.email}</td>
                      <td style={s.td}>{u.district}, {u.state}</td>
                      <td style={s.td}>{u.problems_count}</td>
                      <td style={s.td}>{formatDate(u.created_at)}</td>
                      <td style={s.td}>
                        <button
                          style={{ ...s.editBtn,
                            background: u.is_active ? '#FEE2E2' : '#D1FAE5',
                            color:      u.is_active ? '#DC2626'  : '#059669' }}
                          onClick={() => toggleUser(u.id)}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* ── Status Update Modal ───────────────────────────────── */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitle}>Update Problem</h3>
                <p style={s.modalSub}>{modal.title}</p>
              </div>
              <button style={s.modalClose} onClick={() => setModal(null)}><X size={18}/></button>
            </div>

            <label style={s.mLabel}>Status</label>
            <select value={mForm.status}
              onChange={(e) => setMForm({ ...mForm, status: e.target.value })}
              style={s.mInput}>
              {Object.entries(STATUS_CONFIG).map(([k,v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <label style={s.mLabel}>Priority</label>
            <select value={mForm.priority}
              onChange={(e) => setMForm({ ...mForm, priority: e.target.value })}
              style={s.mInput}>
              {Object.entries(PRIORITY_CONFIG).map(([k,v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <label style={s.mLabel}>Official Response / Admin Notes</label>
            <textarea value={mForm.admin_notes}
              onChange={(e) => setMForm({ ...mForm, admin_notes: e.target.value })}
              style={{ ...s.mInput, minHeight:80, resize:'vertical' }}
              placeholder="Visible to all users on the problem page…"/>

            {/* Groq insight shortcut inside modal */}
            {insight[modal.id] && (
              <div style={s.modalInsight}>
                <Sparkles size={13} color="#8B5CF6"/>
                <span style={{ fontSize:12, color:'#5B21B6' }}><strong>Groq suggests:</strong> {insight[modal.id]}</span>
              </div>
            )}
            {!insight[modal.id] && (
              <button style={s.modalInsightBtn}
                onClick={() => fetchInsight(modal.id)}
                disabled={insightLoad[modal.id]}>
                {insightLoad[modal.id]
                  ? <><Loader size={12}/> Asking Groq…</>
                  : <><Sparkles size={12}/> Get Groq AI action suggestion</>
                }
              </button>
            )}

            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setModal(null)}>Cancel</button>
              <button style={s.saveBtn}   onClick={saveStatus}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const s = {
  page:          { display:'flex', minHeight:'100vh', background:'#F1F5F9' },
  sidebar:       { width:240, background:'linear-gradient(180deg,#111827,#1F2937)', flexShrink:0, display:'flex', flexDirection:'column' },
  sideTop:       { display:'flex', alignItems:'center', gap:10, padding:'20px 16px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' },
  sideTitle:     { color:'#fff', fontWeight:800, fontSize:16 },
  adminInfo:     { display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)' },
  adminAvatar:   { width:36, height:36, borderRadius:'50%', background:'#16a34a', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:16 },
  adminName:     { color:'#fff', fontSize:13, fontWeight:600 },
  adminRole:     { color:'#9CA3AF', fontSize:11 },
  nav:           { padding:'12px 8px', display:'flex', flexDirection:'column', gap:2, flex:1 },
  navBtn:        { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, background:'none', border:'none', color:'#9CA3AF', fontSize:14, fontWeight:500, cursor:'pointer', textAlign:'left', width:'100%' },
  navActive:     { background:'rgba(22,163,74,0.18)', color:'#4ADE80' },
  groqBadge:     { margin:'auto 12px 16px', background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:8 },
  groqLabel:     { color:'#C4B5FD', fontSize:11, fontWeight:700 },
  groqModel:     { color:'#7C3AED', fontSize:10 },
  main:          { flex:1, padding:'28px 24px', overflow:'auto' },
  pageTitle:     { fontSize:22, fontWeight:800, color:'#111827', margin:'0 0 22px' },
  statGrid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:14, marginBottom:24 },
  statCard:      { background:'#fff', borderRadius:12, padding:'18px 16px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:'1px solid #F3F4F6' },
  statVal:       { fontSize:26, fontWeight:900, color:'#111827', marginBottom:4 },
  statLabel:     { fontSize:12, color:'#6B7280' },
  chartsRow:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 },
  chartCard:     { background:'#fff', borderRadius:14, padding:'18px 16px', border:'1px solid #E5E7EB', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' },
  chartTitle:    { fontSize:14, fontWeight:700, color:'#374151', margin:'0 0 14px' },
  tableCard:     { background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', overflow:'auto', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' },
  tableHead:     { fontSize:15, fontWeight:700, color:'#111827', padding:'16px 20px', borderBottom:'1px solid #E5E7EB' },
  table:         { width:'100%', borderCollapse:'collapse', fontSize:13 },
  thead:         { background:'#F9FAFB' },
  th:            { padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#374151', fontSize:11, textTransform:'uppercase', letterSpacing:0.4, whiteSpace:'nowrap' },
  tr:            { borderTop:'1px solid #F3F4F6' },
  td:            { padding:'10px 14px', color:'#374151', verticalAlign:'middle' },
  titleCell:     { fontWeight:600, display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden', maxWidth:180 },
  badge:         { fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 },
  aiSnippet:     { display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#5B21B6', fontStyle:'italic', maxWidth:200 },
  insightSnippet:{ fontSize:11, color:'#92400E', maxWidth:160, display:'block' },
  insightMiniBtn:{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 9px', background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:6, fontSize:11, fontWeight:600, color:'#92400E', cursor:'pointer' },
  editBtn:       { display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', background:'#F3F4F6', border:'none', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', color:'#374151' },
  overlay:       { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 },
  modalCard:     { background:'#fff', borderRadius:16, padding:'28px', width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader:   { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 },
  modalTitle:    { fontSize:16, fontWeight:700, margin:'0 0 4px', color:'#111827' },
  modalSub:      { fontSize:13, color:'#6B7280', margin:0 },
  modalClose:    { background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:4 },
  mLabel:        { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6, marginTop:14 },
  mInput:        { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #D1D5DB', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  modalInsight:  { display:'flex', alignItems:'flex-start', gap:8, background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:8, padding:'10px 12px', marginTop:14 },
  modalInsightBtn:{ display:'inline-flex', alignItems:'center', gap:6, marginTop:14, padding:'8px 14px', background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:8, fontSize:12, fontWeight:700, color:'#5B21B6', cursor:'pointer' },
  modalBtns:     { display:'flex', gap:10, marginTop:20 },
  cancelBtn:     { flex:1, padding:'10px', background:'#F3F4F6', border:'none', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer', color:'#374151' },
  saveBtn:       { flex:1, padding:'10px', background:'#16a34a', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', color:'#fff' },
};
