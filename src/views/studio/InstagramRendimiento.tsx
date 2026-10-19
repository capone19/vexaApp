import { ComingSoon } from "./StudioProximamente";

export default function InstagramRendimiento() {
  return (
    <ComingSoon
      platform="instagram"
      section="Rendimiento"
      description="Qué horarios, ganchos y temas te traen más alcance en Instagram."
      features={[
        "Mejores días y horas para publicar Reels",
        "Ganchos y textos que retienen más",
        "Ficha de cada Reel con su nivel de rendimiento",
        "Recomendaciones para tu próxima semana",
      ]}
    />
  );
}
