import Link from "next/link";

interface LegalSection {
  title: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  updatedAt: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}

/** Página legal pública (sin sesión): privacidad y términos */
export function LegalPage({ title, updatedAt, intro, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link href="/" className="text-sm font-semibold tracking-wide text-primary">
          VEXA
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: {updatedAt}</p>
        <div className="mt-8 space-y-4 leading-relaxed text-muted-foreground">{intro}</div>

        <div className="mt-10 space-y-10">
          {sections.map((section, i) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">
                {i + 1}. {section.title}
              </h2>
              <div className="space-y-3 leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-16 flex flex-wrap gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link href="/privacidad" className="hover:text-foreground">
            Política de Privacidad
          </Link>
          <Link href="/terminos" className="hover:text-foreground">
            Términos de Servicio
          </Link>
          <a href="mailto:contacto@vexalatam.com" className="hover:text-foreground">
            contacto@vexalatam.com
          </a>
        </footer>
      </div>
    </main>
  );
}
