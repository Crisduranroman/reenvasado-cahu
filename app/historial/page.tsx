'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Actividad = {
  id: number;
  fecha: string;
  codigo_sap: number;
  cantidad: number;
  cantidad_final: number;
  lote_original: string;
  caducidad_original: string;
  caducidad_reenvasado: string;
  incidencias: string | null;

  medicamentos: {
    nombre_medicamento: string;
    principio_activo: string | null;
  } | null;

  metodo_reenvasado: {
    tipo_reenvasado: string;
  } | null;
};

export default function HistorialPage() {
  const router = useRouter();

  const [items, setItems] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const cargar = async () => {
    setLoading(true);
    setErrorMsg('');

    // 1) Proteger ruta: si no hay sesión -> /login
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.replace('/login');
      return;
    }

    // 2) Traer historial (RLS ya filtra por user_id = auth.uid())
    const { data, error } = await supabase
      .from('actividad_reenvasado')
      .select(
        `
        id,
        fecha,
        codigo_sap,
        cantidad,
        cantidad_final,
        lote_original,
        caducidad_original,
        caducidad_reenvasado,
        incidencias,
        medicamentos (
          nombre_medicamento,
          principio_activo
        ),
        metodo_reenvasado (
          tipo_reenvasado
        )
      `
      )
      .order('fecha', { ascending: false })
      .limit(200);

    if (error) {
      setErrorMsg(error.message);
      setItems([]);
    } else {
      setItems((data as any) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatearFecha = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: 1100 }}>
      <h1 style={{ marginBottom: 12 }}>Historial de reenvasados</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => router.push('/reenvasado')}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
        >
          ← Volver a reenvasado
        </button>

        <button
          onClick={cargar}
          disabled={loading}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
        >
          ↻ Recargar
        </button>
      </div>

      {loading && <p>Cargando…</p>}

      {errorMsg && (
        <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>
          Error: {errorMsg}
        </pre>
      )}

      {!loading && !errorMsg && items.length === 0 && (
        <p style={{ opacity: 0.7 }}>No hay actividades registradas.</p>
      )}

      {!loading && !errorMsg && items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 900,
            }}
          >
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={th}>Fecha</th>
                <th style={th}>Medicamento</th>
                <th style={th}>Método</th>
                <th style={th}>Cant.</th>
                <th style={th}>Final</th>
                <th style={th}>Lote</th>
                <th style={th}>Cad. orig</th>
                <th style={th}>Cad. reenvas</th>
                <th style={th}>Incidencias</th>
              </tr>
            </thead>

            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td style={td}>{formatearFecha(a.fecha)}</td>

                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>
                      {a.medicamentos?.nombre_medicamento ??
                        `SAP ${a.codigo_sap}`}
                    </div>
                    <div style={{ opacity: 0.7 }}>
                      {a.medicamentos?.principio_activo ?? '—'} · SAP{' '}
                      {a.codigo_sap}
                    </div>
                  </td>

                  <td style={td}>
                    {a.metodo_reenvasado?.tipo_reenvasado ?? '—'}
                  </td>

                  <td style={td}>{a.cantidad}</td>
                  <td style={td}>{a.cantidad_final}</td>
                  <td style={td}>{a.lote_original}</td>
                  <td style={td}>{a.caducidad_original}</td>
                  <td style={td}>{a.caducidad_reenvasado}</td>
                  <td style={td}>{a.incidencias ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const th: React.CSSProperties = {
  borderBottom: '1px solid #ddd',
  padding: '10px 8px',
  background: '#fafafa',
  position: 'sticky',
  top: 0,
};

const td: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: '10px 8px',
  verticalAlign: 'top',
};
