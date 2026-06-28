// src/components/Navbar.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, Menu, X, Bell, LogOut, LayoutDashboard, PlusCircle, Home, FileText } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setOpen(false); };

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        <Link to="/" style={s.logo}>
          <div style={s.logoIcon}><Leaf size={20} color="#fff" /></div>
          <span style={s.logoText}>ग्रामीण पोर्टल</span>
        </Link>

        <div style={s.links}>
          {[
            { to:'/',         icon:<Home size={14}/>,          label:'Home'    },
            { to:'/problems', icon:<FileText size={14}/>,      label:'Problems'},
            ...(user ? [{ to:'/report', icon:<PlusCircle size={14}/>, label:'Report' }] : []),
            ...(isAdmin ? [{ to:'/admin', icon:<LayoutDashboard size={14}/>, label:'Admin' }] : []),
          ].map((l) => (
            <Link key={l.to} to={l.to} style={s.link}>{l.icon}{l.label}</Link>
          ))}
        </div>

        <div style={s.auth}>
          {user ? (
            <>
              <Link to="/notifications" style={s.iconBtn}><Bell size={18} color="#4B5563"/></Link>
              <Link to="/profile" style={s.badge}>
                <div style={s.avatar}>{user.name[0].toUpperCase()}</div>
                <span style={s.userName}>{user.name.split(' ')[0]}</span>
              </Link>
              <button onClick={handleLogout} style={s.iconBtn}><LogOut size={18} color="#EF4444"/></button>
            </>
          ) : (
            <>
              <Link to="/login"    style={s.btnOut}>Login</Link>
              <Link to="/register" style={s.btnFill}>Register</Link>
            </>
          )}
          <button style={s.menuBtn} onClick={() => setOpen(!open)}>
            {open ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
      </div>

      {open && (
        <div style={s.mobile}>
          {[
            { to:'/',         label:'Home'           },
            { to:'/problems', label:'Browse Problems'},
            ...(user ? [{ to:'/report', label:'Report Problem' }] : []),
            ...(isAdmin ? [{ to:'/admin', label:'Admin Dashboard' }] : []),
          ].map((l) => (
            <Link key={l.to} to={l.to} style={s.mLink} onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          {user
            ? <button onClick={handleLogout} style={s.mLogout}>Logout</button>
            : <>
                <Link to="/login"    style={s.mLink}     onClick={() => setOpen(false)}>Login</Link>
                <Link to="/register" style={s.mLinkFill} onClick={() => setOpen(false)}>Register</Link>
              </>
          }
        </div>
      )}
    </nav>
  );
}

const s = {
  nav:      { background:'#fff', borderBottom:'1px solid #E5E7EB', position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  inner:    { maxWidth:1200, margin:'0 auto', padding:'0 20px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' },
  logo:     { display:'flex', alignItems:'center', gap:8, textDecoration:'none' },
  logoIcon: { width:34, height:34, borderRadius:8, background:'linear-gradient(135deg,#16a34a,#15803d)', display:'flex', alignItems:'center', justifyContent:'center' },
  logoText: { fontWeight:700, fontSize:18, color:'#111827' },
  links:    { display:'flex', gap:4 },
  link:     { display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, textDecoration:'none', color:'#374151', fontSize:14, fontWeight:500 },
  auth:     { display:'flex', alignItems:'center', gap:8 },
  iconBtn:  { background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, display:'flex', alignItems:'center', textDecoration:'none' },
  badge:    { display:'flex', alignItems:'center', gap:6, textDecoration:'none', padding:'4px 8px', borderRadius:8, background:'#F3F4F6' },
  avatar:   { width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 },
  userName: { fontSize:13, fontWeight:600, color:'#374151' },
  btnOut:   { padding:'6px 14px', borderRadius:8, border:'1.5px solid #D1D5DB', textDecoration:'none', fontSize:13, fontWeight:600, color:'#374151' },
  btnFill:  { padding:'6px 14px', borderRadius:8, background:'#16a34a', textDecoration:'none', fontSize:13, fontWeight:600, color:'#fff' },
  menuBtn:  { background:'none', border:'none', cursor:'pointer', padding:4 },
  mobile:   { borderTop:'1px solid #E5E7EB', padding:'12px 20px', display:'flex', flexDirection:'column', gap:4 },
  mLink:    { padding:'10px 14px', borderRadius:8, textDecoration:'none', color:'#374151', fontSize:15, fontWeight:500 },
  mLinkFill:{ padding:'10px 14px', borderRadius:8, textDecoration:'none', color:'#fff', fontSize:15, fontWeight:600, background:'#16a34a', textAlign:'center', marginTop:4 },
  mLogout:  { padding:'10px 14px', borderRadius:8, background:'none', border:'none', textAlign:'left', color:'#EF4444', fontSize:15, fontWeight:500, cursor:'pointer' },
};
