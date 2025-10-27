"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type Props = {
  images: string[];
  accent: string;
};

export default function Carousel({ images, accent }: Props) {
  const validImages = images.filter((img): img is string => typeof img === "string" && img.length > 0);
  const [index, setIndex] = useState(0);
  const total = validImages.length;

  useEffect(() => {
    setIndex(0);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [total]);

  if (!total) {
    return <p className={styles.carouselEmpty}>Sin imagenes disponibles.</p>;
  }

  const goPrev = () => setIndex((current) => (current === 0 ? total - 1 : current - 1));
  const goNext = () => setIndex((current) => (current + 1) % total);

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.carouselViewport}>
        <img src={validImages[index]} alt="" className={styles.carouselImage} />
        {total > 1 ? (
          <>
            <button className={`${styles.carouselControl} ${styles.carouselControlLeft}`} type="button" onClick={goPrev} aria-label="Imagen anterior">
              {"\u2039"}
            </button>
            <button className={`${styles.carouselControl} ${styles.carouselControlRight}`} type="button" onClick={goNext} aria-label="Imagen siguiente">
              {"\u203A"}
            </button>
          </>
        ) : null}
      </div>
      {total > 1 ? (
        <div className={styles.carouselDots}>
          {validImages.map((_, dotIndex) => (
            <button
              key={`dot-${dotIndex}`}
              type="button"
              className={`${styles.carouselDot} ${dotIndex === index ? styles.carouselDotActive : ""}`.trim()}
              onClick={() => setIndex(dotIndex)}
              style={dotIndex === index ? { backgroundColor: accent, borderColor: accent } : undefined}
              aria-label={`Ir a la imagen ${dotIndex + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
