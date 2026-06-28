// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar         from './components/Navbar';
import Home           from './pages/Home';
import Login, { Register } from './pages/Login';
import Problems       from './pages/Problems';
import ProblemDetail  from './pages/ProblemDetail';
import ReportProblem  from './pages/ReportProblem';
import Admin          from './pages/Admin';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner/>;
  return user ? children : <Navigate to="/login" replace/>;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading)  return <Spinner/>;
  if (!user)    return <Navigate to="/login" replace/>;
  if (!isAdmin) return <Navigate to="/"     replace/>;
  return children;
}

function Spinner() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0FDF4' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:44, height:44, borderRadius:'50%', border:'4px solid #BBF7D0', borderTopColor:'#16a34a', animation:'spin 0.8s linear infinite', margin:'0 auto 14px' }}/>
        <p style={{ color:'#6B7280', fontSize:14, margin:0 }}>Loading…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Admin has its own sidebar layout — skip global Navbar
function Layout({ children }) {
  const noNav = window.location.pathname.startsWith('/admin');
  return <>{!noNav && <Navbar/>}{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{ duration:3500, style:{ fontSize:14, fontWeight:500 } }}
        />
        <Layout>
          <Routes>
            <Route path="/"           element={<Home/>}/>
            <Route path="/login"      element={<Login/>}/>
            <Route path="/register"   element={<Register/>}/>
            <Route path="/problems"   element={<Problems/>}/>
            <Route path="/problems/:id" element={<ProblemDetail/>}/>
            <Route path="/report"     element={<PrivateRoute><ReportProblem/></PrivateRoute>}/>
            <Route path="/admin/*"    element={<AdminRoute><Admin/></AdminRoute>}/>
            <Route path="*"           element={<Navigate to="/" replace/>}/>
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
