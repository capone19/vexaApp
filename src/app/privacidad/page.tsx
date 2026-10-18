import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de Privacidad | VEXA",
  description: "Cómo VEXA trata los datos de sus usuarios y de las cuentas sociales conectadas.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de Privacidad"
      updatedAt="18 de octubre de 2026"
      intro={
        <>
          <p>
            VEXA (&quot;VEXA&quot;, &quot;nosotros&quot;) ofrece una plataforma de chatbots con inteligencia artificial,
            automatización y gestión de contenido para redes sociales (&quot;Content Studio&quot;) disponible en
            whatsai.cl. Esta política explica qué datos recopilamos, para qué los usamos y qué control tienes sobre ellos.
          </p>
        </>
      }
      sections={[
        {
          title: "Datos que recopilamos",
          body: (
            <ul>
              <li>Datos de tu cuenta de VEXA: nombre, correo electrónico y negocio al que perteneces.</li>
              <li>
                Datos de las cuentas que conectas (YouTube, Instagram y TikTok): identificador de la cuenta, nombre de
                usuario, nombre visible, foto de perfil, número de seguidores, lista de publicaciones y sus estadísticas.
              </li>
              <li>
                Tokens de acceso que entrega cada plataforma al autorizar la conexión. Se guardan cifrados en tránsito y
                solo los usa el servidor de VEXA; nunca se muestran en el navegador.
              </li>
              <li>El contenido que subes o creas en el Studio: videos, imágenes, títulos, descripciones y programaciones.</li>
            </ul>
          ),
        },
        {
          title: "Para qué usamos los datos",
          body: (
            <ul>
              <li>Mostrar tus cuentas conectadas y sus estadísticas dentro del Studio.</li>
              <li>Publicar, programar o editar contenido en tus cuentas, solo cuando tú o una automatización que activaste lo solicita.</li>
              <li>Generar con IA títulos, descripciones, etiquetas y versiones cortas de tus videos.</li>
              <li>Responder comentarios y preparar reportes de rendimiento cuando activas esas funciones.</li>
            </ul>
          ),
        },
        {
          title: "Datos de Google y YouTube",
          body: (
            <>
              <p>
                VEXA usa los servicios de API de YouTube. Al conectar un canal aceptas también los{" "}
                <a className="text-primary underline" href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
                  Términos de Servicio de YouTube
                </a>{" "}
                y la{" "}
                <a className="text-primary underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                  Política de Privacidad de Google
                </a>
                .
              </p>
              <p>
                El uso y la transferencia de la información recibida de las API de Google cumple con la{" "}
                <a
                  className="text-primary underline"
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Política de datos de usuario de los servicios de API de Google
                </a>
                , incluidos los requisitos de uso limitado. Puedes revocar el acceso de VEXA en cualquier momento desde{" "}
                <a className="text-primary underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
                  la configuración de seguridad de tu cuenta de Google
                </a>
                .
              </p>
            </>
          ),
        },
        {
          title: "Datos de Instagram y TikTok",
          body: (
            <p>
              Los datos obtenidos mediante la API de Instagram (Meta) y las API de TikTok se usan solo para las funciones
              descritas en esta política y de acuerdo con las condiciones de cada plataforma. Puedes quitar el acceso de
              VEXA desde la configuración de &quot;Apps y sitios web&quot; de Instagram o desde &quot;Seguridad → Apps
              conectadas&quot; en TikTok.
            </p>
          ),
        },
        {
          title: "Con quién compartimos los datos",
          body: (
            <>
              <p>No vendemos ni alquilamos tus datos. Solo los compartimos con:</p>
              <ul>
                <li>Las plataformas que conectas, para ejecutar las acciones que pides (por ejemplo, publicar un video).</li>
                <li>
                  Proveedores que operan el servicio por cuenta nuestra: alojamiento y base de datos (Supabase, Vercel),
                  automatizaciones (n8n) y modelos de IA para generar textos y edición de contenido.
                </li>
                <li>Autoridades, cuando la ley lo exige.</li>
              </ul>
            </>
          ),
        },
        {
          title: "Conservación y eliminación",
          body: (
            <p>
              Conservamos los datos mientras tu cuenta esté activa. Al desconectar una cuenta social desde el Studio se
              eliminan de inmediato sus tokens y datos asociados. Puedes pedir la eliminación total de tus datos escribiendo
              a contacto@vexalatam.com; respondemos en un plazo máximo de 30 días.
            </p>
          ),
        },
        {
          title: "Seguridad",
          body: (
            <p>
              Usamos conexiones cifradas (HTTPS), control de acceso por negocio y almacenamiento de tokens accesible solo
              desde el servidor. Ningún sistema es 100% seguro, pero aplicamos medidas razonables para proteger tu
              información.
            </p>
          ),
        },
        {
          title: "Tus derechos",
          body: (
            <p>
              Puedes acceder, corregir, exportar o eliminar tus datos, y oponerte a su tratamiento, conforme a la Ley
              N° 19.628 de Chile y la normativa aplicable en tu país. Escríbenos a contacto@vexalatam.com.
            </p>
          ),
        },
        {
          title: "Cambios y contacto",
          body: (
            <p>
              Si cambiamos esta política publicaremos la nueva versión en esta página con su fecha de actualización. Para
              cualquier consulta: contacto@vexalatam.com.
            </p>
          ),
        },
      ]}
    />
  );
}
