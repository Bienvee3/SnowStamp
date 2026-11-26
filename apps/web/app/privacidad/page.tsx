export const metadata = { title: "Privacidad - SnowStamp" };

// The controller's name and contact come from the environment (public repository: no personal data in git).
const CONTACT = process.env["NEXT_PUBLIC_PRIVACY_CONTACT"]?.trim() || "[Responsable y correo de contacto: pendiente de configurar]";

export default function Privacy() {
  return (
    <main style={{ padding: "32px 16px" }}>
      <h1>Política de privacidad</h1>
      <h2>Qué datos recogemos</h2>
      <p>
        Solo lo que escribes en el formulario de la lista de espera: tu correo electrónico y las respuestas
        opcionales (por ejemplo, qué app usas hoy o cuánto pagarías). Esta web no usa cookies de seguimiento.
      </p>
      <h2>Para qué los usamos</h2>
      <p>Para avisarte del lanzamiento de la app y entender qué necesitan quienes esquían o hacen snowboard.</p>
      <h2>Responsable y contacto</h2>
      <p>{CONTACT}</p>
      <h2>Tus derechos</h2>
      <p>
        Puedes pedir acceso, rectificación o borrado de tus datos, y darte de baja de la lista en cualquier momento,
        escribiendo al contacto indicado arriba.
      </p>
      <p>
        <a href="/">Volver al inicio</a>
      </p>
    </main>
  );
}
