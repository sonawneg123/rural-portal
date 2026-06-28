// src/pages/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { INDIA_STATES } from '../utils/locations';

/* ── LOGIN ─────────────────────────────────────────────────────────────── */
export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]       = useState({ email:'', password:'' });
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={a.page}>
      <div style={a.card}>
        <Logo />
        <h1 style={a.title}>Welcome Back</h1>
        <p style={a.sub}>Sign in to report and track rural problems</p>
        <form onSubmit={onSubmit} style={a.form}>
          <Field label="Email" name="email" type="email" value={form.email} onChange={onChange} placeholder="you@example.com" />
          <div style={a.field}>
            <label style={a.label}>Password</label>
            <div style={{ position:'relative' }}>
              <input name="password" type={show?'text':'password'} value={form.password}
                onChange={onChange} placeholder="Your password"
                style={{ ...a.input, paddingRight:42 }} required />
              <button type="button" onClick={() => setShow(!show)} style={a.eyeBtn}>
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <button type="submit" style={a.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={a.foot}>Don't have an account? <Link to="/register" style={a.lnk}>Register free</Link></p>
      </div>
    </div>
  );
}

/* ── REGISTER ───────────────────────────────────────────────────────────── */
export function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]       = useState({ name:'', email:'', password:'', phone:'', state:'', district:'', village:'' });
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(form);
      toast.success('Registration successful! Welcome.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={a.page}>
      <div style={{ ...a.card, maxWidth:500 }}>
        <Logo />
        <h1 style={a.title}>Create Account</h1>
        <p style={a.sub}>Join thousands making their villages better</p>
        <form onSubmit={onSubmit} style={a.form}>
          <Field label="Full Name"        name="name"     type="text"     value={form.name}     onChange={onChange} placeholder="Ravi Kumar" />
          <Field label="Email"            name="email"    type="email"    value={form.email}    onChange={onChange} placeholder="ravi@email.com" />
          <Field label="Password (min 8)" name="password" type="password" value={form.password} onChange={onChange} placeholder="Min 8 characters" />
          <Field label="Phone (optional)" name="phone"    type="tel"      value={form.phone}    onChange={onChange} placeholder="+91 9876543210" required={false} />
          <Field label="Village / Town"   name="village"  type="text"     value={form.village}  onChange={onChange} placeholder="Rampur" />
          <Field label="District"         name="district" type="text"     value={form.district} onChange={onChange} placeholder="Varanasi" />
          <div style={a.field}>
            <label style={a.label}>State *</label>
            <select name="state" value={form.state} onChange={onChange} style={a.input} required>
              <option value="">Select state…</option>
              {INDIA_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <button type="submit" style={a.btn} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p style={a.foot}>Already registered? <Link to="/login" style={a.lnk}>Sign in</Link></p>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={a.logo}>
      <div style={a.logoIcon}><Leaf size={22} color="#fff"/></div>
      <span style={a.logoText}>ग्रामीण पोर्टल</span>
    </div>
  );
}

function Field({ label, name, type, value, onChange, placeholder, required=true }) {
  return (
    <div style={a.field}>
      <label style={a.label}>{label}{required ? ' *' : ''}</label>
      <input name={name} type={type} value={value} onChange={onChange}
        placeholder={placeholder} style={a.input} required={required} />
    </div>
  );
}

const a = {
  page:     { minHeight:'100vh', background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 16px' },
  card:     { background:'#fff', borderRadius:20, padding:'36px 32px', width:'100%', maxWidth:420, boxShadow:'0 8px 40px rgba(0,0,0,0.09)', border:'1px solid #E5E7EB' },
  logo:     { display:'flex', alignItems:'center', gap:10, marginBottom:24, justifyContent:'center' },
  logoIcon: { width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#16a34a,#15803d)', display:'flex', alignItems:'center', justifyContent:'center' },
  logoText: { fontSize:20, fontWeight:800, color:'#111827' },
  title:    { fontSize:24, fontWeight:800, color:'#111827', margin:'0 0 6px', textAlign:'center' },
  sub:      { fontSize:13, color:'#6B7280', textAlign:'center', margin:'0 0 28px' },
  form:     { display:'flex', flexDirection:'column', gap:14 },
  field:    { display:'flex', flexDirection:'column', gap:6 },
  label:    { fontSize:13, fontWeight:600, color:'#374151' },
  input:    { padding:'10px 14px', borderRadius:10, border:'1.5px solid #D1D5DB', fontSize:14, outline:'none', color:'#111827', width:'100%', boxSizing:'border-box', fontFamily:'inherit' },
  eyeBtn:   { position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', display:'flex', alignItems:'center' },
  btn:      { display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer', marginTop:4 },
  foot:     { textAlign:'center', fontSize:13, color:'#6B7280', marginTop:22 },
  lnk:      { color:'#16a34a', fontWeight:600, textDecoration:'none' },
};
