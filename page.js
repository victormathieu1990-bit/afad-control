"use client";

import { useState } from "react";

const options = [
  {
    id: "donacion",
    icon: "♥",
    title: "Donación",
    text: "Ayúdanos con alimento, medicinas y los gastos del refugio.",
    color: "pink",
    details: ["Puedes apoyarnos con alimento, medicamentos o una aportación económica.", "Próximamente aquí colocaremos los datos de transferencia y nuestro QR de donación."]
  },
  {
    id: "adopcion",
    icon: "🐾",
    title: "Adopción",
    text: "Conoce a los perros y gatos que buscan una familia.",
    color: "blue",
    details: ["Aquí podrás conocer a nuestros animales disponibles para adopción.", "La galería se conectará con el registro de AFAD para mostrar información actualizada."]
  },
  {
    id: "ingreso",
    icon: "🏠",
    title: "Ingreso de perro / gato",
    text: "Conoce el proceso y solicita el ingreso de un animal.",
    color: "orange",
    details: ["Antes de solicitar un ingreso revisaremos la información del caso y la disponibilidad del refugio.", "Próximamente aquí estará el formulario para enviar la solicitud directamente a AFAD."]
  },
  {
    id: "esterilizaciones",
    icon: "✚",
    title: "Esterilizaciones",
    text: "Información sobre campañas, requisitos y solicitudes.",
    color: "purple",
    details: ["Consulta aquí las campañas de esterilización, requisitos y fechas disponibles.", "También podremos habilitar un formulario para solicitar una cita."]
  }
];

export default function Home() {
  const [selected, setSelected] = useState(null);

  return (
    <main className="welcome-page">
      <div className="welcome-glow glow-one" />
      <div className="welcome-glow glow-two" />

      <section className="welcome-content">
        <div className="welcome-brand">
          <div className="brand-mark">🐾</div>
          <div>
            <div className="welcome-logo">AFAD</div>
            <div className="welcome-subtitle">Refugio de perros y gatos</div>
          </div>
        </div>

        <div className="welcome-intro">
          <span className="welcome-kicker">BIENVENIDO</span>
          <h1>¿Qué quieres hacer?</h1>
          <p>Estamos aquí para ayudarte a cambiar una vida.</p>
        </div>

        <div className="welcome-grid">
          {options.map((item) => (
            <button key={item.id} className={`welcome-card ${item.color}`} onClick={() => item.id === "adopcion" ? (window.location.href = "/adopcion") : setSelected(item)}>
              <span className="welcome-icon">{item.icon}</span>
              <span className="welcome-card-title">{item.title}</span>
              <span className="welcome-card-text">{item.text}</span>
              <span className="welcome-arrow">→</span>
            </button>
          ))}
        </div>

        <a className="staff-link" href="/control">Acceso equipo AFAD</a>
      </section>

      {selected && (
        <div className="welcome-modal" onClick={() => setSelected(null)}>
          <section className={`welcome-modal-card ${selected.color}`} onClick={(e) => e.stopPropagation()}>
            <button className="welcome-close" onClick={() => setSelected(null)} aria-label="Cerrar">×</button>
            <span className="modal-icon">{selected.icon}</span>
            <span className="welcome-kicker">AFAD</span>
            <h2>{selected.title}</h2>
            {selected.details.map((detail, index) => <p key={index}>{detail}</p>)}
            <button className="welcome-modal-button" onClick={() => setSelected(null)}>Entendido</button>
          </section>
        </div>
      )}
    </main>
  );
}
