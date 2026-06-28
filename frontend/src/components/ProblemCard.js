// src/components/ProblemCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp, Eye, Clock, ImageIcon, Sparkles } from 'lucide-react';
import { STATUS_CONFIG, PRIORITY_CONFIG, timeAgo } from '../utils/locations';

export default function ProblemCard({ problem }) {
  const status   = STATUS_CONFIG[problem.status]    || STATUS_CONFIG.pending;
  const priority = PRIORITY_CONFIG[problem.priority] || PRIORITY_CONFIG.medium;

  return (
    <Link to={`/problems/${problem.id}`} style={s.card}>
      <div style={s.imgWrap}>
        {problem.thumbnail
          ? <img src={problem.thumbnail} alt={problem.title} style={s.img}/>
          : <div style={{ ...s.placeholder, background: (problem.category_color||'#9CA3AF')+'22' }}>
              <ImageIcon size={28} color={problem.category_color||'#9CA3AF'}/>
            </div>
        }
        <span style={{ ...s.catBadge, background: problem.category_color||'#6B7280' }}>
          {problem.category}
        </span>
      </div>

      <div style={s.body}>
        <div style={s.metaRow}>
          <span style={{ ...s.statusBadge, color:status.color, background:status.bg }}>{status.label}</span>
          <span style={{ ...s.priority, color:priority.color }}>● {priority.label}</span>
        </div>

        <h3 style={s.title}>{problem.title}</h3>

        {/* Groq AI summary badge */}
        {problem.ai_summary && (
          <div style={s.aiRow}>
            <Sparkles size={11} color="#8B5CF6"/>
            <span style={s.aiText}>{problem.ai_summary.slice(0, 90)}…</span>
          </div>
        )}

        {!problem.ai_summary && (
          <p style={s.desc}>{problem.description?.slice(0, 100)}…</p>
        )}

        {/* Tags */}
        {problem.ai_tags && (
          <div style={s.tagsRow}>
            {problem.ai_tags.split(',').slice(0,3).map((t) => (
              <span key={t} style={s.tag}>{t.trim()}</span>
            ))}
          </div>
        )}

        <div style={s.location}><MapPin size={12} color="#6B7280"/>{problem.village}, {problem.district}</div>

        <div style={s.footer}>
          <span style={s.reporter}>by {problem.reporter_name}</span>
          <div style={s.stats}>
            <span style={s.stat}><ThumbsUp size={12}/>{problem.upvotes}</span>
            <span style={s.stat}><Eye size={12}/>{problem.views}</span>
            <span style={s.stat}><Clock size={12}/>{timeAgo(problem.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

const s = {
  card:       { display:'block', background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', textDecoration:'none', overflow:'hidden', transition:'box-shadow 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' },
  imgWrap:    { position:'relative', height:155, overflow:'hidden', background:'#F9FAFB' },
  img:        { width:'100%', height:'100%', objectFit:'cover' },
  placeholder:{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' },
  catBadge:   { position:'absolute', top:10, left:10, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, color:'#fff' },
  body:       { padding:'14px 16px 16px' },
  metaRow:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  statusBadge:{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20 },
  priority:   { fontSize:11, fontWeight:600 },
  title:      { margin:'0 0 6px', fontSize:15, fontWeight:700, color:'#111827', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' },
  aiRow:      { display:'flex', alignItems:'flex-start', gap:5, background:'#F5F3FF', borderRadius:8, padding:'6px 8px', marginBottom:8 },
  aiText:     { fontSize:12, color:'#5B21B6', lineHeight:1.5, fontStyle:'italic' },
  desc:       { margin:'0 0 8px', fontSize:13, color:'#6B7280', lineHeight:1.55, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' },
  tagsRow:    { display:'flex', gap:5, marginBottom:8, flexWrap:'wrap' },
  tag:        { fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:10, background:'#F3F4F6', color:'#6B7280' },
  location:   { display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#6B7280', marginBottom:10 },
  footer:     { display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid #F3F4F6', paddingTop:10 },
  reporter:   { fontSize:12, color:'#9CA3AF', fontStyle:'italic' },
  stats:      { display:'flex', gap:10 },
  stat:       { display:'flex', alignItems:'center', gap:3, fontSize:12, color:'#9CA3AF' },
};
