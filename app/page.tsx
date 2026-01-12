'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Medicamento = {
  codigo_sap: number;
  nombre_medicamento: string;
  principio_activo: string | null;
  medicamento_metodo: {
    metodo_id: number;
    metodo_reenvasado: {
      tipo_reenvasado: string;
    } | null;
  }[];
};

const PAGE_SIZE = 50;

export default function Home() {
  const [seleccionadoSap, setSeleccionadoSap] = useState<number | null>(null);
  const [metodoId, setMetodoId] = useState<number | null>(null);

  const [cantidad, setCantidad] = useState<number>(0);
  const [cantidadFinal, setCantidadFinal] = useState<number>(0);

  const [loteOriginal, setLoteOriginal] = useState('');
  const [cadOriginal, setCadOriginal] = useState('');
  const [cadReenv, setCadReenv] = useState('');

  const [incidencias, setIncidencias] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [okMsg, setOkMsg] = useState('');

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const queryText = useMemo(() => q.trim(), [q]);
  const [mostrarReenvasado, setMostrarReenvasado] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setErrorMsg('');

      const base = supabase
        .from('medicamentos')
        .select(
          `
          codigo_sap,
          nombre_medicamento,
          principio_activo,
          medicamento_metodo (
            metodo_id,
            metodo_reenvasado (
              tipo_reenvasado
            )
          )
        `
        )
        .order('nombre_medicamento', { ascending: true })
        .range(from, to);

      const query =
        queryText.length > 0
          ? base.or(
              `nombre_medicamento.ilike.%${queryText}%,principio_activo.ilike.%${queryText}%`
            )
          : base;

      const { data, error } = await query;

      if (error) {
        setErrorMsg(error.message);
        setMedicamentos([]);
      } else {
        setMedicamentos(data ?? []);
      }

      setLoading(false);
    };

    cargar();
  }, [from, to, queryText]);

  useEffect(() => {
    setPage(0);
  }, [queryText]);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 8 }}>Medicamentos para reenvasado</h1>

      <button
        onClick={() => setMostrarReenvasado((v) => !v)}
        style={{
          display: 'inline-block',
          marginBottom: 16,
          padding: '8px 12px',
          border: '1px solid #ccc',
          borderRadius: 8,
          background: 'white',
          cursor: 'pointer',
        }}
      >
        ➕ Registrar reenvasado
      </button>

      {mostrarReenvasado && (
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            background: '#fafafa',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Registrar reenvasado</h2>

          {okMsg && (
            <div
              style={{
                background: '#eaf7ea',
                border: '1px solid #bfe6bf',
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              ✅ {okMsg}
            </div>
          )}

          <div
            style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}
          >
            {/* Medicamento */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label
                style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}
              >
                Medicamento
              </label>
              <select
                value={seleccionadoSap ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setSeleccionadoSap(v);
                  setMetodoId(null);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                }}
              >
                <option value="">— Selecciona un medicamento —</option>
                {medicamentos.map((m) => (
                  <option key={m.codigo_sap} value={m.codigo_sap}>
                    {m.nombre_medicamento} (SAP {m.codigo_sap})
                  </option>
                ))}
              </select>
            </div>

            {/* Método */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label
                style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}
              >
                Método de reenvasado
              </label>

              <select
                value={metodoId ?? ''}
                onChange={(e) =>
                  setMetodoId(e.target.value ? Number(e.target.value) : null)
                }
                disabled={!seleccionadoSap}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                  opacity: !seleccionadoSap ? 0.6 : 1,
                }}
              >
                <option value="">— Selecciona un método —</option>

                {(() => {
                  const med = medicamentos.find(
                    (m) => m.codigo_sap === seleccionadoSap
                  );
                  const rels = med?.medicamento_metodo ?? [];
                  return rels.map((r) => (
                    <option key={r.metodo_id} value={r.metodo_id}>
                      {r.metodo_reenvasado?.tipo_reenvasado ??
                        `Método ${r.metodo_id}`}
                    </option>
                  ));
                })()}
              </select>

              {!seleccionadoSap && (
                <div style={{ marginTop: 6, opacity: 0.7 }}>
                  Selecciona primero un medicamento.
                </div>
              )}
            </div>

            {/* Cantidades */}
            <div>
              <label
                style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}
              >
                Cantidad inicial
              </label>
              <input
                type="number"
                min={0}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                }}
              />
            </div>

            <div>
              <label
                style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}
              >
                Cantidad final
              </label>
              <input
                type="number"
                min={0}
                value={cantidadFinal}
                onChange={(e) => setCantidadFinal(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                }}
              />
            </div>

            {/* Lote + caducidades */}
            <div>
              <label
                style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}
              >
                Lote original
              </label>
              <input
                value={loteOriginal}
                onChange={(e) => setLoteOriginal(e.target.value)}
                placeholder="Ej: L12345"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                }}
              />
            </div>

            <div>
              <label
                style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}
              >
                Caducidad original
              </label>
              <input
                type="date"
                value={cadOriginal}
                onChange={(e) => setCadOriginal(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                }}
              />
            </div>

            <div>
              <label
                style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}
              >
                Caducidad reenvasado
              </label>
              <input
                type="date"
                value={cadReenv}
                onChange={(e) => setCadReenv(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                }}
              />
            </div>

            <div>
              <label
                style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}
              >
                Incidencias (opcional)
              </label>
              <input
                value={incidencias}
                onChange={(e) => setIncidencias(e.target.value)}
                maxLength={255}
                placeholder="Breve (máx. 255)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button
              disabled={guardando}
              onClick={async () => {
                setErrorMsg('');
                setOkMsg('');

                if (!seleccionadoSap)
                  return setErrorMsg('Selecciona un medicamento.');
                if (!metodoId) return setErrorMsg('Selecciona un método.');
                if (!loteOriginal.trim())
                  return setErrorMsg('Indica el lote original.');
                if (!cadOriginal)
                  return setErrorMsg('Indica la caducidad original.');
                if (!cadReenv)
                  return setErrorMsg('Indica la caducidad reenvasado.');
                if (cantidad <= 0)
                  return setErrorMsg('La cantidad inicial debe ser > 0.');
                if (cantidadFinal < 0)
                  return setErrorMsg(
                    'La cantidad final no puede ser negativa.'
                  );
                if (cantidadFinal > cantidad)
                  return setErrorMsg(
                    'La cantidad final no puede ser mayor que la inicial.'
                  );

                setGuardando(true);

                const { error } = await supabase
                  .from('actividad_reenvasado')
                  .insert({
                    codigo_sap: seleccionadoSap,
                    metodo_id: metodoId,
                    cantidad,
                    cantidad_final: cantidadFinal,
                    lote_original: loteOriginal.trim(),
                    caducidad_original: cadOriginal,
                    caducidad_reenvasado: cadReenv,
                    incidencias: incidencias.trim() ? incidencias.trim() : null,
                  });

                setGuardando(false);

                if (error) {
                  setErrorMsg(error.message);
                } else {
                  setOkMsg('Actividad registrada correctamente.');

                  setSeleccionadoSap(null);
                  setMetodoId(null);
                  setCantidad(0);
                  setCantidadFinal(0);
                  setLoteOriginal('');
                  setCadOriginal('');
                  setCadReenv('');
                  setIncidencias('');
                }
              }}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ccc',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              {guardando ? 'Guardando…' : '💾 Guardar actividad'}
            </button>

            <button
              onClick={() => setMostrarReenvasado(false)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ccc',
                background: 'white',
                cursor: 'pointer',
                opacity: 0.8,
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por medicamento o principio activo…"
          style={{
            padding: '10px 12px',
            width: 420,
            maxWidth: '100%',
            border: '1px solid #ccc',
            borderRadius: 8,
          }}
        />

        <button
          onClick={() => setQ('')}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #ccc',
          }}
        >
          Limpiar
        </button>
      </div>

      {/* Paginación */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #ccc',
          }}
        >
          ◀ Anterior
        </button>

        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={loading || medicamentos.length < PAGE_SIZE}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #ccc',
          }}
        >
          Siguiente ▶
        </button>

        <span style={{ opacity: 0.7 }}>
          Página {page + 1} (mostrando {from + 1}–{from + medicamentos.length})
        </span>
      </div>

      {/* Estados */}
      {loading && <p>Cargando…</p>}

      {errorMsg && (
        <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>
          Error: {errorMsg}
        </pre>
      )}

      {/* Listado */}
      {!loading && !errorMsg && (
        <ul style={{ lineHeight: 1.8 }}>
          {medicamentos.map((m) => (
            <li key={m.codigo_sap} style={{ marginBottom: 12 }}>
              <strong>{m.nombre_medicamento}</strong>{' '}
              <em>({m.principio_activo ?? '—'})</em>
              <span style={{ opacity: 0.6 }}> — SAP {m.codigo_sap}</span>
              <ul style={{ marginTop: 6, marginBottom: 0, opacity: 0.9 }}>
                {(m.medicamento_metodo ?? []).length === 0 ? (
                  <li style={{ opacity: 0.6 }}>
                    Sin método de reenvasado asignado
                  </li>
                ) : (
                  m.medicamento_metodo.map((rel) => (
                    <li key={rel.metodo_id}>
                      {rel.metodo_reenvasado?.tipo_reenvasado ??
                        'Método desconocido'}
                    </li>
                  ))
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
