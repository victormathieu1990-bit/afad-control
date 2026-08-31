import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const speciesLabel = { perro: "Perro", gato: "Gato", otro: "Animal" };
const sexLabel = { macho: "Macho", hembra: "Hembra", desconocido: "Sexo no registrado" };

export default async function AdoptionPage() {
  const supabase = await createClient();
  const { data: animals, error } = await supabase.rpc("get_public_adoption_animals");
  const list = animals || [];

  return (
    <main className="adoption-page">
      <div className="adoption-glow adoption-glow-one" />
      <div className="adoption-glow adoption-glow-two" />
      <section className="adoption-content">
  <Link href="/control" className="adoption-back">
  ← Volver al inicio
</Link>
        <header className="adoption-header">
          <span className="welcome-kicker">ADOPCIÓN AFAD</span>
          <h1>Encuentra a tu nuevo compañero 🐾</h1>
          <p>Estos perros y gatos están esperando una familia.</p>
        </header>

        {error ? (
          <section className="adoption-empty"><div className="empty-paw">🐾</div><h2>No pudimos cargar los animales</h2><p>Intenta nuevamente en unos momentos.</p></section>
        ) : list.length === 0 ? (
          <section className="adoption-empty"><div className="empty-paw">🐶🐱</div><h2>Por ahora no hay animales publicados</h2><p>Cuando un animal esté disponible para adopción aparecerá aquí automáticamente.</p></section>
        ) : (
          <div className="adoption-grid">
            {list.map((animal) => (
              <article className="adoption-card" key={animal.id}>
                <div className={`adoption-photo ${animal.species === "gato" ? "cat" : "dog"}`}><span>{animal.species === "gato" ? "🐱" : "🐶"}</span><small>Foto próximamente</small></div>
                <div className="adoption-card-body">
                  <div className="adoption-card-top"><h2>{animal.name}</h2><span className="adoption-species">{speciesLabel[animal.species] || "Animal"}</span></div>
                  <div className="adoption-facts"><span>⚥ {sexLabel[animal.sex] || animal.sex}</span><span>🎂 {animal.estimated_age ? `${animal.estimated_age} años` : "Edad no registrada"}</span></div>
                  <div className="adoption-health"><span className={animal.sterilized ? "ok" : "pending"}>{animal.sterilized ? "✓ Esterilizado" : "○ No esterilizado"}</span><span className={animal.vaccinated ? "ok" : "pending"}>{animal.vaccinated ? "✓ Vacunado" : "○ Vacunación pendiente"}</span></div>
                  <button className="adoption-interest" type="button">Quiero conocer a {animal.name} →</button>
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="adoption-note"><strong>¿Te enamoraste de alguno?</strong><span>Acércate con el equipo de AFAD para conocer el proceso de adopción.</span></div>
      </section>
    </main>
  );
}
