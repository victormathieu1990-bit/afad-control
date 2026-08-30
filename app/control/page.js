"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const labels = {
  en_refugio: "En refugio",
  hogar_temporal: "Hogar temporal",
  adoptado: "Adoptado",
  trasladado: "Trasladado",
  fallecido: "Fallecido",
  reintegrado: "Reintegrado",
  otro: "Otro",
};

const eventLabels = {
  ingreso: "Ingreso",
  salida: "Salida",
};

export default function Control() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [animals, setAnimals] = useState([]);
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("animals");
  const [loading, setLoading] = useState(true);
  const [showIngreso, setShowIngreso] = useState(false);

  const [form, setForm] = useState({
    name: "",
    species: "perro",
    gender: "desconocido",
    status: "en_refugio",
  });

  const [eventForm, setEventForm] = useState({
    event_type: "ingreso",
    event_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  async function load() {
    setLoading(true);

    const [{ data: a, error: animalError }, { data: e, error: eventError }] =
      await Promise.all([
        supabase
          .from("animals")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("animal_events")
          .select("*, animals(name, record_number)")
          .order("event_date", { ascending: false }),
      ]);

    if (!animalError) setAnimals(a || []);
    if (!eventError) setEvents(e || []);

    const code = searchParams.get("animal");

    if (code && a?.length) {
      const found = a.find(
        (x) => x.record_number === code
      );

      if (found) {
        setSelected(found);
        setTab("animals");
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function selectAnimal(animal) {
    setSelected(animal);

    setForm({
      name: animal.name || "",
      species: animal.species || "perro",
      gender: animal.gender || "desconocido",
      status: animal.status || "en_refugio",
    });

    setTab("animals");
  }

  async function saveAnimal(e) {
    e.preventDefault();

    if (!selected) return;

    const { data, error } = await supabase
      .from("animals")
      .update({
        name: form.name,
        species: form.species,
        gender: form.gender,
        status: form.status,
      })
      .eq("id", selected.id)
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setSelected(data);
    setAnimals((prev) =>
      prev.map((a) => (a.id === data.id ? data : a))
    );

    alert("Animal actualizado.");
  }

  async function addEvent(e) {
    e.preventDefault();

    if (!selected) return;

    const { error } = await supabase
      .from("animal_events")
      .insert({
        animal_id: selected.id,
        event_type: eventForm.event_type,
        event_date: eventForm.event_date,
        notes: eventForm.notes,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setShowIngreso(false);

    setEventForm({
      event_type: "ingreso",
      event_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });

    await load();

    alert("Movimiento registrado.");
  }

  const active = animals.filter(
    (a) =>
      a.status === "en_refugio" ||
      a.status === "hogar_temporal"
  );

  const adopted = animals.filter(
    (a) => a.status === "adoptado"
  );

  return (
    <main className="control-page">
      <header className="topbar">
        <div>
          <h1>Panel del equipo</h1>
          <p>AFAD · Control de animales</p>
        </div>

        <button
          className="logout"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          Cerrar sesión
        </button>
      </header>

      <section className="stats">
        <div className="stat">
          <strong>{animals.length}</strong>
          <span>Animales</span>
        </div>

        <div className="stat">
          <strong>{active.length}</strong>
          <span>Actualmente en refugio</span>
        </div>

        <div className="stat">
          <strong>{adopted.length}</strong>
          <span>Adoptados</span>
        </div>
      </section>

      <nav className="tabs">
        <button
          className={tab === "animals" ? "active" : ""}
          onClick={() => setTab("animals")}
        >
          Animales
        </button>

        <button
          className={tab === "events" ? "active" : ""}
          onClick={() => setTab("events")}
        >
          Ingresos / salidas
        </button>
      </nav>

      {tab === "animals" && (
        <section className="panel">
          <h2>Animales</h2>

          <div className="animal-list">
            {loading && <p>Cargando...</p>}

            {!loading && animals.length === 0 && (
              <p>No hay animales registrados.</p>
            )}

            {animals.map((animal) => (
              <button
                key={animal.id}
                className={`animal-row ${
                  selected?.id === animal.id ? "selected" : ""
                }`}
                onClick={() => selectAnimal(animal)}
              >
                <div className="animal-icon">
                  {animal.species === "gato" ? "🐱" : "🐶"}
                </div>

                <div className="animal-info">
                  <strong>{animal.name || "Sin nombre"}</strong>

                  <span>
                    {animal.record_number} ·{" "}
                    {animal.species} ·{" "}
                    {animal.gender}
                  </span>

                  <small>
                    {labels[animal.status] || animal.status}
                  </small>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === "events" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Ingresos y salidas</h2>
              <p>Historial de movimientos de los animales.</p>
            </div>

            <button
              className="primary"
              disabled={!selected}
              onClick={() => setShowIngreso(true)}
            >
              + Registrar movimiento
            </button>
          </div>

          {!selected && (
            <div className="notice">
              Selecciona primero un animal en la pestaña
              "Animales".
            </div>
          )}

          {events
            .filter((event) =>
              selected ? event.animal_id === selected.id : true
            )
            .map((event) => (
              <div className="event-row" key={event.id}>
                <div className="event-icon">
                  {event.event_type === "ingreso" ? "↓" : "↑"}
                </div>

                <div>
                  <strong>
                    {eventLabels[event.event_type] ||
                      event.event_type}
                  </strong>

                  <span>
                    {event.animals?.name ||
                      selected?.name ||
                      "Animal"}
                  </span>

                  <small>
                    {event.event_date}
                    {event.notes
                      ? ` · ${event.notes}`
                      : ""}
                  </small>
                </div>
              </div>
            ))}
        </section>
      )}

      {selected && tab === "animals" && (
        <section className="panel detail">
          <div className="panel-header">
            <div>
              <h2>{selected.name}</h2>
              <p>{selected.record_number}</p>
            </div>

            <button
              className="primary"
              onClick={() => setShowIngreso(true)}
            >
              Registrar ingreso / salida
            </button>
          </div>

          <form onSubmit={saveAnimal}>
            <label>
              Nombre
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </label>

            <label>
              Especie
              <select
                value={form.species}
                onChange={(e) =>
                  setForm({
                    ...form,
                    species: e.target.value,
                  })
                }
              >
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="otro">Otro</option>
              </select>
            </label>

            <label>
              Sexo
              <select
                value={form.gender}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gender: e.target.value,
                  })
                }
              >
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
                <option value="desconocido">
                  Desconocido
                </option>
              </select>
            </label>

            <label>
              Estado
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value,
                  })
                }
              >
                {Object.entries(labels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <button className="save" type="submit">
              Guardar cambios
            </button>
          </form>
        </section>
      )}

      {showIngreso && selected && (
        <div className="modal">
          <div className="modal-card">
            <h2>Registrar movimiento</h2>

            <p>
              Animal: <strong>{selected.name}</strong>
            </p>

            <form onSubmit={addEvent}>
              <label>
                Tipo
                <select
                  value={eventForm.event_type}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      event_type: e.target.value,
                    })
                  }
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="salida">Salida</option>
                </select>
              </label>

              <label>
                Fecha
                <input
                  type="date"
                  value={eventForm.event_date}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      event_date: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Notas
                <textarea
                  value={eventForm.notes}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Motivo, destino, observaciones..."
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowIngreso(false)}
                >
                  Cancelar
                </button>

                <button className="primary" type="submit">
                  Guardar movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .control-page {
          min-height: 100vh;
          background: #f5f7f3;
          color: #202620;
          padding: 24px;
          font-family: system-ui, sans-serif;
        }

        .topbar,
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        h1,
        h2,
        p {
          margin-top: 0;
        }

        .topbar p {
          color: #777;
        }

        .logout {
          border: 1px solid #ddd;
          background: white;
          padding: 10px 16px;
          border-radius: 10px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin: 25px 0;
        }

        .stat {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e5e8e2;
        }

        .stat strong {
          display: block;
          font-size: 30px;
        }

        .stat span {
          color: #777;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .tabs button {
          border: 0;
          background: #e8ebe6;
          padding: 12px 18px;
          border-radius: 10px;
          cursor: pointer;
        }

        .tabs button.active {
          background: #263b28;
          color: white;
        }

        .panel {
          background: white;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 18px;
          border: 1px solid #e5e8e2;
        }

        .animal-list {
          display: grid;
          gap: 2px;
        }

        .animal-row {
          display: flex;
          width: 100%;
          text-align: left;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border: 0;
          border-bottom: 1px solid #eee;
          background: white;
          cursor: pointer;
        }

        .animal-row:hover,
        .animal-row.selected {
          background: #f1f5ee;
        }

        .animal-icon {
          font-size: 40px;
        }

        .animal-info strong,
        .animal-info span,
        .animal-info small {
          display: block;
        }

        .animal-info span {
          color: #777;
          margin-top: 3px;
        }

        .animal-info small {
          margin-top: 6px;
          font-weight: 600;
        }

        form {
          display: grid;
          gap: 15px;
        }

        label {
          display: grid;
          gap: 7px;
          font-weight: 600;
        }

        input,
        select,
        textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d5d9d2;
          border-radius: 10px;
          background: white;
          font: inherit;
        }

        textarea {
          min-height: 100px;
          resize: vertical;
        }

        .primary,
        .save {
          border: 0;
          background: #263b28;
          color: white;
          padding: 12px 18px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
        }

        .primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .save {
          margin-top: 5px;
        }

        .event-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 15px 0;
          border-bottom: 1px solid #eee;
        }

        .event-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #eef2eb;
          display: grid;
          place-items: center;
          font-size: 22px;
        }

        .event-row strong,
        .event-row span,
        .event-row small {
          display: block;
        }

        .event-row span {
          color: #555;
        }

        .event-row small {
          color: #888;
          margin-top: 4px;
        }

        .notice {
          padding: 15px;
          background: #fff8df;
          border-radius: 10px;
          margin: 15px 0;
        }

        .modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: grid;
          place-items: center;
          padding: 20px;
          z-index: 20;
        }

        .modal-card {
          background: white;
          width: min(500px, 100%);
          border-radius: 18px;
          padding: 24px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .modal-actions button {
          border: 0;
          padding: 11px 16px;
          border-radius: 9px;
          cursor: pointer;
        }

        @media (max-width: 700px) {
          .control-page {
            padding: 15px;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .topbar,
          .panel-header {
            align-items: stretch;
            flex-direction: column;
          }

          .primary,
          .logout {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
            }
