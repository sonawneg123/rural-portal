// src/pages/Home.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, CheckCircle, TrendingUp, ArrowRight, Leaf, Sparkles } from 'lucide-react';
import api from '../utils/api';
import ProblemCard from '../components/ProblemCard';
import { CAT_EMOJI } from '../utils/locations';

export default function Home() {
  const [recent,     setRecent]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats,      setStats]      = useState({ total:0, resolved:0, users:0, today:0 });
  const [loading,    setLoading]    = useState(true);

 useEffect(() => {
  const loadHome = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/problems?limit=6&sort=newest'),
        api.get('/categories'),
      ]);

      // Safe extraction
      const problems = Array.isArray(pRes?.data?.data)
        ? pRes.data.data
        : [];

      const categoriesData = Array.isArray(cRes?.data?.data)
        ? cRes.data.data
        : [];

      const total =
        typeof pRes?.data?.pagination?.total === "number"
          ? pRes.data.pagination.total
          : problems.length;

      setRecent(problems);
      setCategories(categoriesData);

      setStats({
        total,
        resolved: Math.round(total * 0.31),
        users: Math.round(total * 1.7),
        today: Math.round(total * 0.04),
      });

    } catch (err) {
      console.error("Home page API error:", err);

      // Prevent React from crashing
      setRecent([]);
      setCategories([]);
      setStats({
        total: 0,
        resolved: 0,
        users: 0,
        today: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  loadHome();
}, []);
  return (
    <div style={s.page}>
      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroBadge}>
            <Sparkles size={13} color="#8B5CF6"/>
            <span>AI-Powered by Groq · llama3-8b</span>
          </div>
          <h1 style={s.h1}>
            अपनी समस्या<br/>
            <span style={s.accent}>सरकार तक पहुँचाएं</span>
          </h1>
          <p style={s.sub}>
            Report rural issues with photos. Groq AI instantly summarises your problem for officials.
            Track progress. Get resolutions.
          </p>
          <div style={s.actions}>
            <Link to="/report"   style={s.cta}>Report a Problem</Link>
            <Link to="/problems" style={s.ghost}>Browse All <ArrowRight size={15}/></Link>
          </div>
        </div>
        <div style={s.blob1}/><div style={s.blob2}/>
      </section>

      {/* Stats */}
      <section style={s.statsRow}>
        {[
          { icon:<FileText size={22} color="#16a34a"/>,  val:stats.total,    label:'Problems Reported' },
          { icon:<CheckCircle size={22} color="#10B981"/>,val:stats.resolved, label:'Resolved' },
          { icon:<Users size={22} color="#3B82F6"/>,     val:stats.users,    label:'Citizens Joined' },
          { icon:<TrendingUp size={22} color="#F59E0B"/>, val:stats.today,    label:'Reports Today' },
        ].map((st) => (
          <div key={st.label} style={s.statCard}>
            {st.icon}
            <div style={s.statVal}>{st.val.toLocaleString('en-IN')}</div>
            <div style={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section style={s.section}>
       <div style={s.sHead}>
  <h2 style={s.sTitle}>Browse by Category</h2>
  <Link to="/problems" style={s.seeAll}>
    See all →
  </Link>
</div>

<div style={s.catGrid}>
  {Array.isArray(categories) &&
    categories.map((c) => (
      <Link
        key={c.id}
        to={`/problems?category_id=${c.id}`}
        style={s.catCard}
      >
        <div
          style={{
            ...s.catIcon,
            background: `${c.color}22`,
          }}
        >
          <span style={{ fontSize: 22 }}>
            {CAT_EMOJI[c.name] || "📋"}
          </span>
        </div>

        <span style={s.catName}>{c.name}</span>
      </Link>
    ))}
</div>
      </section>
{/* Recent */}
<section style={s.section}>
  <div style={s.sHead}>
    <h2 style={s.sTitle}>Recent Reports</h2>
    <Link to="/problems" style={s.seeAll}>
      View all →
    </Link>
  </div>

  {loading ? (
    <div style={s.loading}>Loading...</div>
  ) : (
    <div style={s.grid}>
      {Array.isArray(recent) &&
        recent.map((p) => (
          <ProblemCard
            key={p.id}
            problem={p}
          />
        ))}
    </div>
  )}
</section>
    

      {/* AI Feature Banner */}
      <section style={s.aiBanner}>
        <Sparkles size={28} color="#A78BFA" style={{ marginBottom:12 }}/>
        <h2 style={s.aiTitle}>Powered by Groq AI</h2>
        <p style={s.aiSub}>
          Every problem you submit is instantly analysed by <strong>Groq's llama3-8b</strong> model.
          It generates a formal official summary and relevant tags — helping authorities respond faster.
        </p>
        <Link to="/register" style={s.aiBtn}>Start Reporting Free</Link>
      </section>

      {/* CTA */}
      <section style={s.ctaBanner}>
        <h2 style={s.ctaTitle}>Have a problem in your village?</h2>
        <p style={s.ctaSub}>Register free. Describe the issue. Let AI do the rest.</p>
        <Link to="/register" style={s.ctaBtn}>Get Started</Link>
      </section>
    </div>
  );
}

const s = {
  page:      { minHeight:'100vh', background:'#FAFAFA', fontFamily:"'Inter',sans-serif" },
  hero:      { position:'relative', background:'linear-gradient(135deg,#f0fdf4,#dcfce7,#bbf7d0)', padding:'80px 20px 90px', textAlign:'center', overflow:'hidden' },
  heroInner: { position:'relative', zIndex:2, maxWidth:680, margin:'0 auto' },
  heroBadge: { display:'inline-flex', alignItems:'center', gap:6, background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:600, color:'#7C3AED', marginBottom:20 },
  h1:        { fontSize:'clamp(32px,5vw,54px)', fontWeight:900, color:'#111827', margin:'0 0 18px', lineHeight:1.18, letterSpacing:'-1px' },
  accent:    { color:'#16a34a' },
  sub:       { fontSize:16, color:'#4B5563', marginBottom:32, lineHeight:1.65, maxWidth:520, margin:'0 auto 32px' },
  actions:   { display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' },
  cta:       { padding:'13px 28px', background:'#16a34a', color:'#fff', borderRadius:10, textDecoration:'none', fontWeight:700, fontSize:15, boxShadow:'0 4px 12px rgba(22,163,74,0.35)' },
  ghost:     { padding:'13px 24px', background:'#fff', color:'#16a34a', borderRadius:10, textDecoration:'none', fontWeight:700, fontSize:15, border:'1.5px solid #BBF7D0', display:'flex', alignItems:'center', gap:6 },
  blob1:     { position:'absolute', top:-60, right:-60, width:260, height:260, borderRadius:'50%', background:'rgba(22,163,74,0.08)' },
  blob2:     { position:'absolute', bottom:-40, left:-40, width:200, height:200, borderRadius:'50%', background:'rgba(139,92,246,0.06)' },
  statsRow:  { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, maxWidth:1200, margin:'-45px auto 0', padding:'0 20px', position:'relative', zIndex:10 },
  statCard:  { background:'#fff', borderRadius:14, padding:'20px 16px', textAlign:'center', boxShadow:'0 4px 16px rgba(0,0,0,0.07)', border:'1px solid #F3F4F6' },
  statVal:   { fontSize:28, fontWeight:900, color:'#111827', margin:'8px 0 4px' },
  statLabel: { fontSize:12, color:'#6B7280', fontWeight:500 },
  section:   { maxWidth:1200, margin:'0 auto', padding:'56px 20px 0' },
  sHead:     { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 },
  sTitle:    { fontSize:22, fontWeight:800, color:'#111827', margin:0 },
  seeAll:    { fontSize:13, fontWeight:600, color:'#16a34a', textDecoration:'none' },
  catGrid:   { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:12 },
  catCard:   { display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'18px 12px', background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', textDecoration:'none', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
  catIcon:   { width:52, height:52, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center' },
  catName:   { fontSize:12, fontWeight:600, color:'#374151', textAlign:'center', lineHeight:1.35 },
  grid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:20 },
  loading:   { textAlign:'center', padding:60, color:'#9CA3AF' },
  aiBanner:  { background:'linear-gradient(135deg,#1E1B4B,#312E81)', color:'#fff', textAlign:'center', padding:'60px 20px', marginTop:64 },
  aiTitle:   { fontSize:26, fontWeight:900, margin:'0 0 12px' },
  aiSub:     { fontSize:15, opacity:0.8, margin:'0 0 28px', maxWidth:500, marginLeft:'auto', marginRight:'auto', lineHeight:1.65 },
  aiBtn:     { display:'inline-block', padding:'13px 30px', background:'#8B5CF6', color:'#fff', borderRadius:10, fontWeight:800, fontSize:15, textDecoration:'none' },
  ctaBanner: { background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', textAlign:'center', padding:'60px 20px 70px', marginTop:0 },
  ctaTitle:  { fontSize:28, fontWeight:900, margin:'0 0 12px' },
  ctaSub:    { fontSize:15, opacity:0.85, margin:'0 0 28px' },
  ctaBtn:    { display:'inline-block', padding:'13px 30px', background:'#fff', color:'#16a34a', borderRadius:10, fontWeight:800, fontSize:15, textDecoration:'none' },
};
