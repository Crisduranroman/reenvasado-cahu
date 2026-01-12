'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // 1️⃣ Si ya hay sesión, redirigir directamente a /reenvasado
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/reenvasado');
      }
    };

    checkSession();
  }, [router]);

  // 2️⃣ Registro
  const signUp = async () => {
    setLoading(true);
    setMsg('');

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    setLoading(false);

    if (error) {
      setMsg(`❌ Error registro: ${error.message}`);
    } else {
      setMsg(
        '✅ Registro OK. Si Supabase pide confirmación por email, revisa tu correo.'
      );
    }
  };

  // 3️⃣ Login + redirección automática
  const signIn = async () => {
    setLoading(true);
    setMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    setLoading(false);

    if (error) {
      setMsg(`❌ Error login: ${error.message}`);
    } else {
      // 🔁 REDIRECCIÓN CLAVE
      router.replace('/reenvasado');
    }
  };

  // 4️⃣ Logout (útil para pruebas)
  const signOut = async () => {
    setLoading(true);
    setMsg('');

    const { error } = await supabase.auth.signOut();

    setLoading(false);

    if (error) {
      setMsg(`❌ Error logout: ${error.message}`);
    } else {
      setMsg('👋 Sesión cerrada');
    }
  };

  return (
    <main
      style={{
        padding: '2rem',
        fontFamily: 'system-ui',
        maxWidth: 520,
      }}
    >
      <h1 style={{ marginBottom: 12 }}>Login</h1>

      <label style={{ display: 'block', marginBottom: 6 }}>Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #ccc',
          borderRadius: 8,
          marginBottom: 12,
        }}
      />

      <label style={{ display: 'block', marginBottom: 6 }}>Contraseña</label>
      <input
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        type="password"
        placeholder="mínimo 6 caracteres"
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #ccc',
          borderRadius: 8,
          marginBottom: 16,
        }}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={signUp}
          disabled={loading}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
        >
          Registrarme
        </button>

        <button
          onClick={signIn}
          disabled={loading}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
        >
          Entrar
        </button>

        <button
          onClick={signOut}
          disabled={loading}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
        >
          Salir
        </button>
      </div>

      {msg && (
        <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{msg}</pre>
      )}
    </main>
  );
}
