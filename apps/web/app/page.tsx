import { waitlistUrl } from "../lib/waitlist";

// The form address is configured per environment (NEXT_PUBLIC_WAITLIST_URL), not stored in the repository.
const WAITLIST = waitlistUrl(process.env["NEXT_PUBLIC_WAITLIST_URL"]);

export default function Home() {
  return (
    <>
      <main>
        <div className="hero">
          <h1>Cada estación que visitas es un sello en tu mapa</h1>
          <p>
            SnowStamp es el pasaporte de quienes esquían y hacen snowboard: marca las estaciones donde has estado,
            mira tu porcentaje por país, continente y mundo, y compáralo con tus amigos.
          </p>
          {WAITLIST === null ? (
            <span className="cta" aria-disabled="true">
              Lista de espera próximamente
            </span>
          ) : (
            <a className="cta" href={WAITLIST} rel="noopener noreferrer">
              Unirme a la lista de espera
            </a>
          )}
          <p style={{ marginTop: 16, fontSize: "0.95rem" }}>
            La app está en desarrollo y todavía no está disponible en las tiendas.
          </p>
        </div>

        <section aria-labelledby="como">
          <h2 id="como">Cómo funciona</h2>
          <ol className="steps">
            <li>
              <strong>1. Marca tus estaciones</strong>
              Elige un país en el mapa y marca las estaciones que has visitado: se iluminan.
            </li>
            <li>
              <strong>2. Mira tu progreso</strong>
              Calculamos automáticamente el porcentaje de estaciones visitadas por país, continente y mundo.
            </li>
            <li>
              <strong>3. Compara con amigos</strong>
              Comparte tu pasaporte y descubre qué estaciones tenéis en común y cuáles os faltan.
            </li>
          </ol>
        </section>

        <section aria-labelledby="ejemplo">
          <h2 id="ejemplo">Un vistazo</h2>
          <div className="example">
            <small>DATOS DE EJEMPLO</small>
            <p style={{ margin: "12px 0 4px" }}>Tú: España 50 %</p>
            <div className="bar" role="img" aria-label="Ejemplo: 50 por ciento de España">
              <span style={{ width: "50%" }} />
            </div>
            <p style={{ margin: "0 0 4px" }}>Amigo/a: España 30 %</p>
            <div className="bar friend" role="img" aria-label="Ejemplo: 30 por ciento de España">
              <span style={{ width: "30%" }} />
            </div>
          </div>
        </section>
      </main>
      <footer>
        <p>
          Datos de estaciones: © colaboradores de{" "}
          <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">
            OpenStreetMap
          </a>{" "}
          (licencia ODbL).
        </p>
        <p>
          <a href="/privacidad">Privacidad</a>
        </p>
      </footer>
    </>
  );
}
