'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Medicamento = {
  codigo_sap: number;
  nombre_medicamento: string;
  principio_activo: string | null;
  medicamento_metodo: {
    metodo_id: number;
    metodo_reenvasado: { tipo_reenvasado: string } | null;
  }[];
};

export default function ReenvasadoPage() {
  const router = useRouter();

  // Auth guard
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Buscador
  const [q, setQ] = useState('');
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [seleccionado, setSeleccionado] = useState<Medicamento | null>(null);
  const [metodoId, setMetodoId] = useState<number | null>(null);

  // Formulario actividad
  const [cantidad, setCantidad] = useState<number>(0);
  const [cantidadFinal, setCantidadFinal] = useState<number>(0);
  const [loteOriginal, setLoteOriginal] = useState('');
  const [cadOrig, setCadOrig] = useState(''); // YYYY-MM-DD
  const [cadReenv, setCadReenv] = useState(''); // YYYY-MM-DD
  const [incidencias, setIncidencias] = useState('');

  const queryText = useMemo(() => q.trim(), [q]);

  // 1) Proteger ruta: si no hay sesión, /login
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setCheckingAuth(false);
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  // 2) Buscar medicamentos (solo si hay sesión)
  useEffect(() => {
    const buscar = async () => {
      if (checkingAuth) return;

      if (queryText.length < 2) {
        setMedicamentos([]);
        return;
      }

      setLoading(true);
      setErrorMsg('');

      const { data, error } = await supabase
        .from('medicamentos')
        .select(
          `
          codigo_sap,
          nombre_medicamento,
          principio_activo,
          medicamento_metodo (
            metodo_id,
            metodo_reenvasado ( tipo_reenvasado )
          )
        `
        )
        .or(
          `nombre_medicamento.ilike.%${queryText}%,principio_activo.ilike.%${queryText}%`
        )
        .order('nombre_medicamento', { ascending: true })
        .limit(20);

      if (error) {
        setErrorMsg(error.message);
        setMedicamentos([]);
      } else {
        setMedicamentos(data ?? []);
      }

      setLoading(false);
    };

    buscar();
  }, [queryText, checkingAuth]);

  const resetForm = () => {
    setMetodoId(null);
    setCantidad(0);
    setCantidadFinal(0);
    setLoteOriginal('');
    setCadOrig('');
    setCadReenv('');
    setIncidencias('');
  };

  const onSelectMedicamento = (m: Medicamento) => {
    setSeleccionado(m);
    resetForm();

    // si solo tiene 1 método, lo preseleccionamos
    if ((m.medicamento_metodo ?? []).length === 1) {
      setMetodoId(m.medicamento_metodo[0].metodo_id);
    }
  };

  const guardar = async () => {
    setErrorMsg('');

    if (!seleccionado) {
      setErrorMsg('Selecciona un medicamento.');
      return;
    }
    if (!metodoId) {
      setErrorMsg('Selecciona un método de reenvasado.');
      return;
    }
    if (cantidad <= 0) {
      setErrorMsg('La cantidad debe ser > 0.');
      return;
    }
    if (cantidadFinal < 0 || cantidadFinal > cantidad) {
      setErrorMsg('La cantidad final debe ser >= 0 y <= cantidad.');
      return;
    }
    if (!loteOriginal.trim()) {
      setErrorMsg('Indica el lote original.');
      return;
    }
    if (!cadOrig || !cadReenv) {
      setErrorMsg('Indica las caducidades.');
      return;
    }
    if (cadReenv < cadOrig) {
      setErrorMsg(
        'La caducidad reenvasado no puede ser anterior a la original.'
      );
      return;
    }

    const { error } = await supabase.from('actividad_reenvasado').insert({
      codigo_sap: seleccionado.codigo_sap,
      metodo_id: metodoId, // ✅ guardamos el método seleccionado
      cantidad,
      cantidad_final: cantidadFinal,
      lote_original: loteOriginal,
      caducidad_original: cadOrig,
      caducidad_reenvasado: cadReenv,
      incidencias: incidencias || null,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    alert('✅ Actividad guardada');
    resetForm();
  };

  const salir = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (checkingAuth) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        Comprobando sesión…
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: 900 }}>
      <h1>Registrar reenvasado</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button
          onClick={() => router.push('/historial')}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            cursor: 'pointer',
            background: 'white',
          }}
        >
          📋 Ver historial
        </button>

        <button
          onClick={salir}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
            cursor: 'pointer',
            background: 'white',
          }}
        >
          Salir
        </button>
      </div>

      <p style={{ opacity: 0.7 }}>
        Escribe al menos 2 caracteres para buscar un medicamento.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar medicamento o principio activo…"
        style={{
          padding: '10px 12px',
          width: '100%',
          border: '1px solid #ccc',
          borderRadius: 8,
          marginBottom: 12,
        }}
      />

      {loading && <p>Cargando…</p>}
      {errorMsg && (
        <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>
          {errorMsg}
        </pre>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Lista resultados */}
        <div>
          <h3>Resultados</h3>
          <ul style={{ paddingLeft: 16 }}>
            {medicamentos.map((m) => (
              <li key={m.codigo_sap} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => onSelectMedicamento(m)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    background:
                      seleccionado?.codigo_sap === m.codigo_sap
                        ? '#f2f2f2'
                        : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <strong>{m.nombre_medicamento}</strong>
                  <div style={{ opacity: 0.7 }}>
                    {m.principio_activo ?? '—'} · SAP {m.codigo_sap}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Formulario */}
        <div>
          <h3>Actividad</h3>

          {!seleccionado ? (
            <p style={{ opacity: 0.7 }}>
              Selecciona un medicamento a la izquierda.
            </p>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <strong>{seleccionado.nombre_medicamento}</strong>
                <div style={{ opacity: 0.7 }}>
                  {seleccionado.principio_activo ?? '—'} · SAP{' '}
                  {seleccionado.codigo_sap}
                </div>
              </div>

              <label>Método de reenvasado</label>
              <select
                value={metodoId ?? ''}
                onChange={(e) =>
                  setMetodoId(e.target.value ? Number(e.target.value) : null)
                }
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  marginBottom: 12,
                }}
              >
                <option value="">-- Selecciona --</option>
                {(seleccionado.medicamento_metodo ?? []).map((rel) => (
                  <option key={rel.metodo_id} value={rel.metodo_id}>
                    {rel.metodo_reenvasado?.tipo_reenvasado ?? 'Método'}
                  </option>
                ))}
              </select>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <label>Cantidad</label>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #ccc',
                    }}
                  />
                </div>

                <div>
                  <label>Cantidad final</label>
                  <input
                    type="number"
                    value={cantidadFinal}
                    onChange={(e) => setCantidadFinal(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #ccc',
                    }}
                  />
                </div>

                <div>
                  <label>Lote original</label>
                  <input
                    value={loteOriginal}
                    onChange={(e) => setLoteOriginal(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #ccc',
                    }}
                  />
                </div>

                <div>
                  <label>Caducidad original</label>
                  <input
                    type="date"
                    value={cadOrig}
                    onChange={(e) => setCadOrig(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #ccc',
                    }}
                  />
                </div>

                <div>
                  <label>Caducidad reenvasado</label>
                  <input
                    type="date"
                    value={cadReenv}
                    onChange={(e) => setCadReenv(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #ccc',
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Incidencias (opcional)</label>
                  <input
                    value={incidencias}
                    onChange={(e) => setIncidencias(e.target.value)}
                    maxLength={255}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #ccc',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={guardar}
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  cursor: 'pointer',
                  background: 'white',
                }}
              >
                Guardar actividad
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
