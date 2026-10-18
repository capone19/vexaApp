import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos de Servicio | VEXA",
  description: "Condiciones de uso de la plataforma VEXA y su Content Studio.",
};

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos de Servicio"
      updatedAt="18 de octubre de 2026"
      intro={
        <p>
          Estos términos regulan el uso de VEXA, su plataforma de chatbots con IA, automatizaciones y el Content Studio
          para gestionar cuentas de YouTube, Instagram y TikTok (el &quot;Servicio&quot;). Al usar el Servicio aceptas
          estos términos y nuestra <a className="text-primary underline" href="/privacidad">Política de Privacidad</a>.
        </p>
      }
      sections={[
        {
          title: "Cuenta y acceso",
          body: (
            <p>
              Debes entregar información veraz y mantener la confidencialidad de tu acceso. Eres responsable de la
              actividad que ocurra en tu cuenta y en el negocio al que perteneces dentro de VEXA.
            </p>
          ),
        },
        {
          title: "Cuentas sociales conectadas",
          body: (
            <>
              <p>
                Solo puedes conectar cuentas que te pertenecen o que estás autorizado a administrar. Al conectarlas
                autorizas a VEXA a leer su información y a publicar, programar o editar contenido en tu nombre según las
                acciones que solicites o las automatizaciones que actives.
              </p>
              <p>
                El uso de cada plataforma sigue sujeto a sus propias condiciones, incluidos los{" "}
                <a className="text-primary underline" href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
                  Términos de Servicio de YouTube
                </a>
                , las Condiciones de uso de Instagram y los Términos de servicio de TikTok. Puedes desconectar una cuenta en
                cualquier momento desde el Studio.
              </p>
            </>
          ),
        },
        {
          title: "Contenido",
          body: (
            <p>
              Conservas todos los derechos sobre el contenido que subes o publicas. Nos otorgas una licencia limitada para
              almacenarlo, procesarlo y publicarlo únicamente para prestar el Servicio. Eres responsable de contar con los
              derechos sobre ese contenido (música, imágenes, marcas) y de que cumpla la ley y las normas de cada
              plataforma.
            </p>
          ),
        },
        {
          title: "Contenido generado con IA",
          body: (
            <p>
              El Servicio puede sugerir títulos, descripciones, etiquetas, respuestas y ediciones generadas con
              inteligencia artificial. Revisa ese contenido antes de publicarlo: puede contener errores y la decisión de
              publicarlo es tuya.
            </p>
          ),
        },
        {
          title: "Uso aceptable",
          body: (
            <ul>
              <li>No usar el Servicio para spam, engaños, suplantación o contenido ilegal.</li>
              <li>No intentar acceder a cuentas o datos de otros negocios.</li>
              <li>No eludir los límites o las medidas de seguridad del Servicio ni de las plataformas conectadas.</li>
            </ul>
          ),
        },
        {
          title: "Disponibilidad",
          body: (
            <p>
              Trabajamos para que el Servicio esté siempre disponible, pero puede haber interrupciones, y las funciones
              que dependen de YouTube, Instagram o TikTok pueden cambiar o dejar de funcionar si esas plataformas modifican
              sus API o condiciones.
            </p>
          ),
        },
        {
          title: "Responsabilidad",
          body: (
            <p>
              En la medida que lo permita la ley, VEXA no responde por daños indirectos, pérdida de ingresos, de
              seguidores o de datos derivados del uso del Servicio o de decisiones de las plataformas conectadas.
            </p>
          ),
        },
        {
          title: "Término",
          body: (
            <p>
              Puedes dejar de usar el Servicio cuando quieras y pedir la eliminación de tus datos. Podemos suspender cuentas
              que incumplan estos términos.
            </p>
          ),
        },
        {
          title: "Ley aplicable y contacto",
          body: (
            <p>
              Estos términos se rigen por las leyes de Chile. Si los modificamos publicaremos la nueva versión en esta
              página. Consultas: contacto@vexalatam.com.
            </p>
          ),
        },
      ]}
    />
  );
}
