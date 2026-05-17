import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type SidebarImageRevealProps = {
  image: string;
};

type TileStyle = CSSProperties & {
  "--tile-height": string;
  "--tile-width": string;
  "--tile-x": string;
  "--tile-y": string;
};

const COLUMNS = 9;
const ROWS = 16;
const TILE_DURATION = 0.62;

export default function SidebarImageReveal({ image: _image }: SidebarImageRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isComplete, setIsComplete] = useState(Boolean(prefersReducedMotion));

  const tiles = useMemo(() => {
    return Array.from({ length: COLUMNS * ROWS }, (_, index) => {
      const x = index % COLUMNS;
      const y = Math.floor(index / COLUMNS);
      const diagonal = (x / COLUMNS) * 0.24 + (y / ROWS) * 0.74;
      const interference = Math.sin(x * 1.7 + y * 0.54) * 0.035;
      const delay = diagonal + interference;

      return { delay: Math.max(0, delay), index, x, y };
    });
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsComplete(true);
      return undefined;
    }

    const maxDelay = Math.max(...tiles.map((tile) => tile.delay));
    const timeout = window.setTimeout(() => {
      setIsComplete(true);
    }, (maxDelay + TILE_DURATION + 0.08) * 1000);

    return () => window.clearTimeout(timeout);
  }, [prefersReducedMotion, tiles]);

  if (isComplete) {
    return null;
  }

  return (
    <motion.div
      aria-hidden="true"
      className="sidebar-reveal"
      initial={{ opacity: 1 }}
      style={{ "--grid-cols": COLUMNS, "--grid-rows": ROWS } as CSSProperties}
    >
      {tiles.map((tile) => (
        <motion.div
          animate={{
            opacity: 0,
            scale: 1,
          }}
          className="sidebar-reveal-tile"
          initial={{
            opacity: 1,
            scale: 1,
          }}
          key={tile.index}
          style={{
            "--tile-height": `${100 / ROWS}%`,
            "--tile-width": `${100 / COLUMNS}%`,
            "--tile-x": `${(tile.x * 100) / COLUMNS}%`,
            "--tile-y": `${(tile.y * 100) / ROWS}%`,
            gridColumn: tile.x + 1,
            gridRow: tile.y + 1,
          } as TileStyle}
          transition={{
            delay: tile.delay,
            duration: TILE_DURATION * 0.72,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
        </motion.div>
      ))}
    </motion.div>
  );
}
