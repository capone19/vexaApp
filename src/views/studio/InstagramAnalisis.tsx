import { ComingSoon } from "./StudioProximamente";

export default function InstagramAnalisis() {
  return (
    <ComingSoon
      platform="instagram"
      section="Análisis"
      description="Cómo va tu cuenta de Instagram y qué Reels están ganando."
      features={[
        "Si tu cuenta va en alza o en baja",
        "Alcance, reproducciones y guardados de cada Reel",
        "Comparación de cada Reel con su Short gemelo de YouTube",
        "Qué hacer para crecer, con IA",
      ]}
    />
  );
}
