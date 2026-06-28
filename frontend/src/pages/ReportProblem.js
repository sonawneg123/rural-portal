// src/pages/ReportProblem.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { INDIA_STATES, CAT_EMOJI } from '../utils/locations';
import toast from 'react-hot-toast';
import { Upload, X, CheckCircle, MapPin, Sparkles, Cpu } from 'lucide-react';

export default function ReportProblem() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [categories, setCategories] = useState([]);
  const [photos,   setPhotos]   = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState(1);
  const [form, setForm] = useState({
    title:'', description:'', category_id:'',
    state: user?.state||'', district: user?.district||'',
    village: user?.village||'', pincode:'',
  });

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.data));
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onDrop = useCallback((accepted) => {
    const rem   = 5 - photos.length;
    const files = accepted.slice(0, rem);
    setPhotos((p) => [...p, ...files]);
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = (e) => setPreviews((p) => [...p, e.target.result]);
      r.readAsDataURL(f);
    });
  }, [photos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] },
    maxSize: 5 * 1024 * 1024,
    disabled: photos.length >= 5,
    onDropRejected: () => toast.error('Max 5 MB per image. JPG/PNG/WEBP only.'),
  });

  const removePhoto = (i) => {
    setPhotos((p)   => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const validate = () => {
    if (form.title.trim().length < 10)        { toast.error('Title needs at least 10 chars');       return false; }
    if (form.description.trim().length < 20)  { toast.error('Description needs at least 20 chars'); return false; }
    if (!form.category_id)                    { toast.error('Please select a category');             return false; }
    if (!form.state||!form.district||!form.village) { toast.error('Fill all location fields');      return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      photos.forEach((f) => fd.append('photos', f));
      const { data } = await api.post('/problems', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Problem reported! Groq AI has summarised it.');
      navigate(`/problems/${data.problemId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  const selCat = categories.find((c) => String(c.id) === String(form.category_id));

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.header}>
          <h1 style={s.h1}>Report a Problem</h1>
          <div style={s.groqBadge}>
            <Cpu size={13} color="#8B5CF6"/>
            <span>Groq AI will auto-summarise your report using <strong>llama3-8b-8192</strong></span>
          </div>
          {/* Steps */}
          <div style={s.steps}>
            {['Details','Photos & Location','Review'].map((lbl, i) => (
              <div key={i} style={s.stepWrap}>
                <div style={{ ...s.dot, ...(step > i+1 ? s.dotDone : step===i+1 ? s.dotActive : {}) }}>
                  {step > i+1 ? <CheckCircle size={13} color="#fff"/> : i+1}
                </div>
                <span style={{ ...s.dotLbl, ...(step===i+1 ? { color:'#16a34a', fontWeight:700 } : {}) }}>{lbl}</span>
                {i < 2 && <div style={{ ...s.line, ...(step > i+1 ? { background:'#10B981' } : {}) }}/>}
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          {/* ── Step 1 ─────────────────────────────────────── */}
          {step === 1 && (
            <div style={s.body}>
              <h2 style={s.secTitle}>Problem Details</h2>

              <div style={s.field}>
                <label style={s.label}>Category *</label>
                <div style={s.catGrid}>
                  {categories.map((cat) => (
                    <button key={cat.id} type="button"
                      style={{ ...s.catBtn, ...(String(form.category_id)===String(cat.id)
                        ? { background:cat.color+'15', borderColor:cat.color, borderWidth:2 } : {}) }}
                      onClick={() => setForm({ ...form, category_id:cat.id })}>
                      <span style={{ fontSize:20 }}>{CAT_EMOJI[cat.name]||'📋'}</span>
                      <span style={s.catLabel}>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Problem Title *</label>
                <input name="title" value={form.title} onChange={onChange} style={s.input}
                  placeholder="e.g. No drinking water supply for 3 days in our village" maxLength={255}/>
                <span style={s.hint}>{form.title.length}/255</span>
              </div>

              <div style={s.field}>
                <label style={s.label}>Detailed Description *</label>
                <textarea name="description" value={form.description} onChange={onChange}
                  style={{ ...s.input, minHeight:130, resize:'vertical' }}
                  placeholder="When did it start? Who is affected? What have you tried?…" maxLength={3000}/>
                <span style={s.hint}>{form.description.length}/3000</span>
              </div>

              {form.description.length >= 20 && (
                <div style={s.aiNote}>
                  <Sparkles size={14} color="#8B5CF6"/>
                  <span>Groq AI (llama3-8b) will generate an official summary and tags on submission</span>
                </div>
              )}

              <button style={s.nextBtn} onClick={() => validate() && setStep(2)}>
                Next: Photos & Location →
              </button>
            </div>
          )}

          {/* ── Step 2 ─────────────────────────────────────── */}
          {step === 2 && (
            <div style={s.body}>
              <h2 style={s.secTitle}>Photos & Location</h2>

              <div style={s.field}>
                <label style={s.label}>Photos (up to 5) — Recommended</label>
                <div {...getRootProps()} style={{ ...s.dropzone, ...(isDragActive ? { borderColor:'#16a34a', background:'#F0FDF4' } : {}) }}>
                  <input {...getInputProps()}/>
                  <Upload size={28} color="#9CA3AF"/>
                  <p style={s.dropText}>{isDragActive ? 'Drop here…' : 'Drag & drop or click to browse'}</p>
                  <p style={s.dropHint}>JPG · PNG · WEBP · Max 5 MB · {5-photos.length} remaining</p>
                </div>
                {previews.length > 0 && (
                  <div style={s.previews}>
                    {previews.map((src, i) => (
                      <div key={i} style={s.previewWrap}>
                        <img src={src} alt="" style={s.previewImg}/>
                        <button style={s.rmBtn} onClick={() => removePhoto(i)}><X size={11} color="#fff"/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <h3 style={s.locTitle}><MapPin size={15}/> Location</h3>
              <div style={s.grid2}>
                <div style={s.field}>
                  <label style={s.label}>State *</label>
                  <select name="state" value={form.state} onChange={onChange} style={s.input}>
                    <option value="">Select state</option>
                    {INDIA_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>District *</label>
                  <input name="district" value={form.district} onChange={onChange} style={s.input} placeholder="Varanasi"/>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Village / Town *</label>
                  <input name="village" value={form.village} onChange={onChange} style={s.input} placeholder="Rampur"/>
                </div>
                <div style={s.field}>
                  <label style={s.label}>PIN Code</label>
                  <input name="pincode" value={form.pincode} onChange={onChange} style={s.input} placeholder="221001" maxLength={6}/>
                </div>
              </div>

              <div style={s.btnRow}>
                <button style={s.backBtn} onClick={() => setStep(1)}>← Back</button>
                <button style={s.nextBtn} onClick={() => setStep(3)}>Review →</button>
              </div>
            </div>
          )}

          {/* ── Step 3 ─────────────────────────────────────── */}
          {step === 3 && (
            <div style={s.body}>
              <h2 style={s.secTitle}>Review & Submit</h2>
              <div style={s.review}>
                {selCat && (
                  <span style={{ ...s.reviewCat, background:selCat.color+'20', color:selCat.color }}>
                    {CAT_EMOJI[selCat.name]} {selCat.name}
                  </span>
                )}
                <h3 style={s.reviewTitle}>{form.title}</h3>
                <p style={s.reviewDesc}>{form.description}</p>
                <div style={s.reviewLoc}><MapPin size={13} color="#6B7280"/> {form.village}, {form.district}, {form.state} {form.pincode}</div>
                {previews.length > 0 && (
                  <div style={s.previews}>
                    {previews.map((src,i) => <img key={i} src={src} alt="" style={s.previewImg}/>)}
                  </div>
                )}
                <div style={s.aiNote}>
                  <Sparkles size={14} color="#8B5CF6"/>
                  <span><strong>Groq AI</strong> (llama3-8b-8192) will generate official summary + tags after submission</span>
                </div>
              </div>

              <div style={s.btnRow}>
                <button style={s.backBtn} onClick={() => setStep(2)}>← Back</button>
                <button style={s.submitBtn} onClick={handleSubmit} disabled={loading}>
                  {loading
                    ? <><Cpu size={16} style={{ animation:'spin 0.8s linear infinite' }}/> Groq is analysing…</>
                    : '🚀 Submit Report'
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page:       { minHeight:'100vh', background:'#F9FAFB', padding:'32px 16px 60px' },
  wrap:       { maxWidth:780, margin:'0 auto' },
  header:     { marginBottom:28, textAlign:'center' },
  h1:         { fontSize:26, fontWeight:900, color:'#111827', margin:'0 0 10px' },
  groqBadge:  { display:'inline-flex', alignItems:'center', gap:7, background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:20, padding:'5px 14px', fontSize:12, color:'#5B21B6', marginBottom:20 },
  steps:      { display:'flex', alignItems:'center', justifyContent:'center', gap:0 },
  stepWrap:   { display:'flex', alignItems:'center', gap:6 },
  dot:        { width:28, height:28, borderRadius:'50%', background:'#E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#9CA3AF' },
  dotActive:  { background:'#16a34a', color:'#fff' },
  dotDone:    { background:'#10B981', color:'#fff' },
  dotLbl:     { fontSize:11, color:'#9CA3AF' },
  line:       { width:40, height:2, background:'#E5E7EB', borderRadius:2 },
  card:       { background:'#fff', borderRadius:18, border:'1px solid #E5E7EB', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' },
  body:       { padding:'32px 28px' },
  secTitle:   { fontSize:19, fontWeight:800, color:'#111827', margin:'0 0 22px' },
  field:      { marginBottom:18 },
  label:      { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 },
  input:      { width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #D1D5DB', fontSize:14, color:'#111827', outline:'none', boxSizing:'border-box', fontFamily:'inherit' },
  hint:       { fontSize:11, color:'#9CA3AF', marginTop:4, display:'block' },
  catGrid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(118px,1fr))', gap:10 },
  catBtn:     { display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px', borderRadius:12, border:'1.5px solid #E5E7EB', background:'#fff', cursor:'pointer' },
  catLabel:   { fontSize:11, fontWeight:600, color:'#374151', textAlign:'center', lineHeight:1.3 },
  aiNote:     { display:'flex', alignItems:'center', gap:8, background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#5B21B6', marginBottom:20 },
  nextBtn:    { display:'block', width:'100%', padding:'13px', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer' },
  backBtn:    { padding:'13px 20px', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer' },
  submitBtn:  { flex:1, padding:'13px', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  btnRow:     { display:'flex', gap:12, marginTop:8 },
  grid2:      { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  locTitle:   { display:'flex', alignItems:'center', gap:6, fontSize:16, fontWeight:700, color:'#374151', margin:'24px 0 16px' },
  dropzone:   { border:'2px dashed #D1D5DB', borderRadius:12, padding:'32px 20px', textAlign:'center', cursor:'pointer', background:'#FAFAFA' },
  dropText:   { fontSize:14, color:'#6B7280', margin:'10px 0 4px', fontWeight:500 },
  dropHint:   { fontSize:12, color:'#9CA3AF', margin:0 },
  previews:   { display:'flex', gap:10, flexWrap:'wrap', marginTop:14 },
  previewWrap:{ position:'relative' },
  previewImg: { width:80, height:80, objectFit:'cover', borderRadius:10, border:'2px solid #E5E7EB' },
  rmBtn:      { position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:'50%', background:'#EF4444', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  review:     { background:'#F9FAFB', borderRadius:12, padding:'20px', border:'1px solid #E5E7EB', marginBottom:24 },
  reviewCat:  { display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, marginBottom:12 },
  reviewTitle:{ fontSize:18, fontWeight:700, color:'#111827', margin:'0 0 10px' },
  reviewDesc: { fontSize:14, color:'#4B5563', lineHeight:1.6, margin:'0 0 12px' },
  reviewLoc:  { display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#6B7280', marginBottom:14 },
};
