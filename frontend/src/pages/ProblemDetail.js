// src/pages/ProblemDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { STATUS_CONFIG, PRIORITY_CONFIG, formatDate, timeAgo } from '../utils/locations';
import toast from 'react-hot-toast';
import { ThumbsUp, MapPin, Clock, Eye, Send, Sparkles, ArrowLeft, Shield, Cpu, Loader } from 'lucide-react';

export default function ProblemDetail() {
  const { id }   = useParams();
  const { user, isAdmin } = useAuth();
  const [problem,  setProblem]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [comment,  setComment]  = useState('');
  const [posting,  setPosting]  = useState(false);
  const [upvoted,  setUpvoted]  = useState(false);
  const [selImg,   setSelImg]   = useState(null);
  const [insight,  setInsight]  = useState(null);
  const [insLoading, setInsLoading] = useState(false);

  useEffect(() => {
    api.get(`/problems/${id}`)
      .then((r) => { setProblem(r.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={s.center}>Loading…</div>;
  if (!problem) return <div style={s.center}>Problem not found.</div>;

  const status   = STATUS_CONFIG[problem.status]    || STATUS_CONFIG.pending;
  const priority = PRIORITY_CONFIG[problem.priority] || PRIORITY_CONFIG.medium;
  const tags     = problem.ai_tags ? problem.ai_tags.split(',').filter(Boolean) : [];

  const handleUpvote = async () => {
    if (!user) { toast.error('Please login to upvote'); return; }
    try {
      const { data } = await api.post(`/problems/${id}/upvote`);
      setProblem((p) => ({ ...p, upvotes: data.upvotes }));
      setUpvoted(true);
      toast.success('Upvoted!');
    } catch { toast.error('Could not upvote'); }
  };

  const handleComment = async () => {
    if (!comment.trim()) { toast.error('Comment cannot be empty'); return; }
    setPosting(true);
    try {
      await api.post(`/problems/${id}/comment`, { content: comment });
      toast.success('Comment added');
      setComment('');
      const { data } = await api.get(`/problems/${id}`);
      setProblem(data.data);
    } catch { toast.error('Failed to post comment'); }
    finally { setPosting(false); }
  };

  const fetchInsight = async () => {
    setInsLoading(true);
    try {
      const { data } = await api.get(`/admin/problems/${id}/insight`);
      setInsight(data.insight);
    } catch { toast.error('Could not load AI insight'); }
    finally { setInsLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <Link to="/problems" style={s.back}><ArrowLeft size={15}/> Back to Problems</Link>

        <div style={s.layout}>
          {/* ── Main ───────────────────────────────────── */}
          <div style={s.main}>
            {/* Header card */}
            <div style={s.card}>
              <div style={s.metaRow}>
                <span style={{ ...s.statusBadge, color:status.color, background:status.bg }}>{status.label}</span>
                <span style={{ ...s.priorityBadge, color:priority.color }}>● {priority.label}</span>
                <span style={s.catBadge}>{problem.category}</span>
              </div>
              <h1 style={s.title}>{problem.title}</h1>

              <div style={s.infoRow}>
                <span style={s.infoItem}><MapPin size={13}/> {problem.village}, {problem.district}, {problem.state}</span>
                <span style={s.infoItem}><Clock size={13}/> {timeAgo(problem.created_at)}</span>
                <span style={s.infoItem}><Eye size={13}/> {problem.views} views</span>
              </div>

              {/* Groq AI Summary */}
              {problem.ai_summary && (
                <div style={s.aiBox}>
                  <div style={s.aiHeader}><Sparkles size={14} color="#8B5CF6"/> AI Summary — Groq llama3-8b</div>
                  <p style={s.aiText}>{problem.ai_summary}</p>
                  {tags.length > 0 && (
                    <div style={s.tagsRow}>
                      {tags.map((t) => <span key={t} style={s.tag}>{t.trim()}</span>)}
                    </div>
                  )}
                </div>
              )}

              {/* Full description */}
              <div style={s.descBox}>
                <h3 style={s.descTitle}>Full Description</h3>
                <p style={s.descText}>{problem.description}</p>
              </div>

              {/* Admin official notes */}
              {problem.admin_notes && (
                <div style={s.adminBox}>
                  <div style={s.adminHeader}><Shield size={14} color="#2563EB"/> Official Response</div>
                  <p style={s.adminText}>{problem.admin_notes}</p>
                </div>
              )}

              {/* Admin Groq Insight button */}
              {isAdmin && (
                <div style={s.insightBox}>
                  <div style={s.insightHeader}><Cpu size={14} color="#D97706"/> Groq AI — Admin Action Insight</div>
                  {insight
                    ? <p style={s.insightText}>{insight}</p>
                    : <button style={s.insightBtn} onClick={fetchInsight} disabled={insLoading}>
                        {insLoading
                          ? <><Loader size={14} style={{ animation:'spin 0.8s linear infinite' }}/> Asking Groq…</>
                          : <><Sparkles size={14}/> Get AI Action Suggestion</>
                        }
                      </button>
                  }
                </div>
              )}
            </div>

            {/* Photos */}
            {problem.photos?.length > 0 && (
              <div style={s.card}>
                <h3 style={s.sectionTitle}>Photos ({problem.photos.length})</h3>
                <div style={s.photoGrid}>
                  {problem.photos.map((ph) => (
                    <img key={ph.id} src={ph.s3_url} alt={ph.filename}
                      style={s.photo} onClick={() => setSelImg(ph.s3_url)}/>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div style={s.card}>
              <h3 style={s.sectionTitle}>Comments ({problem.comments?.length || 0})</h3>
              {user && (
                <div style={s.commentForm}>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment…" style={s.commentInput} rows={3}/>
                  <button style={s.commentBtn} onClick={handleComment} disabled={posting}>
                    <Send size={14}/>{posting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              )}
              <div style={s.commentList}>
                {problem.comments?.map((cm) => (
                  <div key={cm.id} style={{ ...s.commentItem, ...(cm.is_official ? s.commentOfficial : {}) }}>
                    <div style={s.commentMeta}>
                      <div style={{ ...s.cmAvatar, ...(cm.is_official ? s.cmAvatarOfficial : {}) }}>
                        {cm.is_official ? <Shield size={11} color="#fff"/> : cm.author[0]}
                      </div>
                      <span style={s.cmAuthor}>{cm.is_official ? '🏛️ Official' : cm.author}</span>
                      <span style={s.cmTime}>{timeAgo(cm.created_at)}</span>
                    </div>
                    <p style={s.cmText}>{cm.content}</p>
                  </div>
                ))}
                {!problem.comments?.length && (
                  <p style={s.noComments}>No comments yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Sidebar ────────────────────────────────── */}
          <aside style={s.sidebar}>
            <div style={s.sideCard}>
              <button style={{ ...s.upvoteBtn, ...(upvoted ? s.upvotedBtn : {}) }} onClick={handleUpvote}>
                <ThumbsUp size={18}/><span>{problem.upvotes} Upvotes</span>
              </button>
              <p style={s.upvoteHint}>Upvote to raise priority</p>
            </div>

            <div style={s.sideCard}>
              <h4 style={s.sideTitle}>Reported By</h4>
              <div style={s.rAvatar}>{problem.reporter_name?.[0]||'U'}</div>
              <p style={s.rName}>{problem.reporter_name}</p>
              <p style={s.rLoc}>{problem.reporter_village}, {problem.reporter_district}</p>
              <p style={s.rDate}>{formatDate(problem.created_at)}</p>
            </div>

            <div style={s.sideCard}>
              <h4 style={s.sideTitle}>Status Timeline</h4>
              {['pending','in_review','in_progress','resolved'].map((st, i) => {
                const cfg     = STATUS_CONFIG[st];
                const reached = ['pending','in_review','in_progress','resolved'].indexOf(problem.status) >= i;
                return (
                  <div key={st} style={s.tlItem}>
                    <div style={{ ...s.tlDot, background: reached ? cfg.color : '#E5E7EB' }}/>
                    <span style={{ fontSize:12, color: reached ? cfg.color : '#9CA3AF', fontWeight: reached ? 700 : 400 }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      {/* Lightbox */}
      {selImg && (
        <div style={s.lightbox} onClick={() => setSelImg(null)}>
          <img src={selImg} alt="full" style={s.lbImg}/>
        </div>
      )}
    </div>
  );
}

const s = {
  page:         { minHeight:'100vh', background:'#F9FAFB', padding:'24px 16px 60px' },
  inner:        { maxWidth:1100, margin:'0 auto' },
  center:       { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#6B7280' },
  back:         { display:'inline-flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#6B7280', textDecoration:'none', marginBottom:20 },
  layout:       { display:'flex', gap:22, alignItems:'flex-start', flexWrap:'wrap' },
  main:         { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:16 },
  sidebar:      { width:250, flexShrink:0, display:'flex', flexDirection:'column', gap:14, position:'sticky', top:80 },
  card:         { background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', padding:'22px 24px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' },
  sideCard:     { background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', padding:'18px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', textAlign:'center' },
  metaRow:      { display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 },
  statusBadge:  { fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20 },
  priorityBadge:{ fontSize:12, fontWeight:600, padding:'4px 10px' },
  catBadge:     { fontSize:12, fontWeight:600, padding:'4px 12px', background:'#F3F4F6', borderRadius:20, color:'#374151' },
  title:        { fontSize:22, fontWeight:800, color:'#111827', margin:'0 0 14px', lineHeight:1.35 },
  infoRow:      { display:'flex', flexWrap:'wrap', gap:16, marginBottom:18 },
  infoItem:     { display:'flex', alignItems:'center', gap:5, fontSize:13, color:'#6B7280' },
  aiBox:        { background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:12, padding:'16px', marginBottom:18 },
  aiHeader:     { display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:800, color:'#5B21B6', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 },
  aiText:       { fontSize:14, color:'#4C1D95', lineHeight:1.65, margin:'0 0 10px', fontStyle:'italic' },
  tagsRow:      { display:'flex', gap:6, flexWrap:'wrap' },
  tag:          { fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:10, background:'#EDE9FE', color:'#5B21B6' },
  descBox:      { marginBottom:4 },
  descTitle:    { fontSize:15, fontWeight:700, color:'#374151', margin:'0 0 10px' },
  descText:     { fontSize:14, color:'#4B5563', lineHeight:1.7, margin:0 },
  adminBox:     { background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:12, padding:'16px', marginTop:18 },
  adminHeader:  { display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:800, color:'#1D4ED8', marginBottom:8, textTransform:'uppercase' },
  adminText:    { fontSize:14, color:'#1E3A5F', lineHeight:1.6, margin:0 },
  insightBox:   { background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:12, padding:'16px', marginTop:18 },
  insightHeader:{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:800, color:'#92400E', marginBottom:10, textTransform:'uppercase' },
  insightText:  { fontSize:14, color:'#78350F', lineHeight:1.6, margin:0 },
  insightBtn:   { display:'inline-flex', alignItems:'center', gap:7, padding:'9px 16px', background:'#F59E0B', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' },
  sectionTitle: { fontSize:16, fontWeight:700, color:'#111827', margin:'0 0 16px' },
  photoGrid:    { display:'flex', gap:10, flexWrap:'wrap' },
  photo:        { width:110, height:110, objectFit:'cover', borderRadius:10, border:'2px solid #E5E7EB', cursor:'pointer' },
  commentForm:  { marginBottom:18, background:'#F9FAFB', borderRadius:12, padding:14 },
  commentInput: { width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #D1D5DB', fontSize:14, resize:'vertical', outline:'none', marginBottom:10, boxSizing:'border-box', fontFamily:'inherit' },
  commentBtn:   { display:'flex', alignItems:'center', gap:6, padding:'9px 18px', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' },
  commentList:  { display:'flex', flexDirection:'column', gap:12 },
  commentItem:  { padding:'12px 14px', borderRadius:10, background:'#F9FAFB' },
  commentOfficial: { background:'#EFF6FF', border:'1px solid #BFDBFE' },
  commentMeta:  { display:'flex', alignItems:'center', gap:8, marginBottom:8 },
  cmAvatar:     { width:26, height:26, borderRadius:'50%', background:'#E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 },
  cmAvatarOfficial: { background:'#2563EB', color:'#fff' },
  cmAuthor:     { fontSize:13, fontWeight:600, color:'#374151' },
  cmTime:       { fontSize:11, color:'#9CA3AF', marginLeft:'auto' },
  cmText:       { fontSize:13, color:'#4B5563', margin:0, lineHeight:1.55 },
  noComments:   { textAlign:'center', color:'#9CA3AF', fontSize:14, padding:'20px 0' },
  upvoteBtn:    { display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'12px', background:'#F0FDF4', border:'2px solid #16a34a', borderRadius:10, color:'#16a34a', fontWeight:700, fontSize:15, cursor:'pointer' },
  upvotedBtn:   { background:'#16a34a', color:'#fff' },
  upvoteHint:   { fontSize:11, color:'#9CA3AF', margin:'8px 0 0' },
  sideTitle:    { fontSize:13, fontWeight:700, color:'#374151', margin:'0 0 14px', textAlign:'left' },
  rAvatar:      { width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, margin:'0 auto 10px' },
  rName:        { fontSize:15, fontWeight:700, color:'#111827', margin:'0 0 4px' },
  rLoc:         { fontSize:12, color:'#6B7280', margin:'0 0 4px' },
  rDate:        { fontSize:11, color:'#9CA3AF', margin:0 },
  tlItem:       { display:'flex', alignItems:'center', gap:10, marginBottom:10 },
  tlDot:        { width:10, height:10, borderRadius:'50%', flexShrink:0 },
  lightbox:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, cursor:'zoom-out' },
  lbImg:        { maxWidth:'90vw', maxHeight:'90vh', borderRadius:12 },
};
