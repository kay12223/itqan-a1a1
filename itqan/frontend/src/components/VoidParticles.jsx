import { useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function VoidParticles() {
  const { isVoid } = useTheme();
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const mouse     = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    if (!isVoid) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h;

    const COUNT  = 130;
    const colors = ["#ffffff", "#93c5fd", "#c4b5fd", "#67e8f9", "#a5f3fc"];
    const stars  = [];

    const resize = () => {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();

    for (let i = 0; i < COUNT; i++) {
      const neutron = Math.random() < 0.07;
      const speed   = neutron ? 0.08 : 0.14;
      stars.push({
        x:       Math.random() * w,
        y:       Math.random() * h,
        r:       neutron ? Math.random() * 2 + 1.5 : Math.random() * 1.5 + 0.3,
        vx:      (Math.random() - 0.5) * speed,
        vy:      (Math.random() - 0.5) * speed,
        c:       colors[(Math.random() * colors.length) | 0],
        neutron,
        phase:   Math.random() * Math.PI * 2,
      });
    }

    const onMove  = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = ()  => { mouse.current = { x: -9999, y: -9999 }; };
    window.addEventListener("resize",    resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = w;
        if (s.x > w) s.x = 0;
        if (s.y < 0) s.y = h;
        if (s.y > h) s.y = 0;

        const dx   = s.x - mouse.current.x;
        const dy   = s.y - mouse.current.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 140) {
          s.x += (dx / dist) * 1.8;
          s.y += (dy / dist) * 1.8;
        }

        let alpha  = 0.75;
        let radius = s.r;
        if (s.neutron) {
          const flash = (Math.sin(t * 1.8 + s.phase) + 1) / 2;
          alpha  = 0.35 + flash * 0.65;
          radius = s.r * (1 + flash * 0.9);
          ctx.shadowBlur  = 14 * flash;
          ctx.shadowColor = s.c;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = s.c;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
      rafRef.current  = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize",     resize);
      window.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [isVoid]);

  if (!isVoid) return null;
  return (
    <canvas
      ref={canvasRef}
      data-testid="void-particles"
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: -10,
        background: [
          "radial-gradient(1600px circle at 75% -8%,  rgba(59,130,246,0.22), transparent 52%)",
          "radial-gradient(1100px circle at 8%  18%,  rgba(139,92,246,0.18), transparent 48%)",
          "radial-gradient(900px  circle at 55% 105%, rgba(6,182,212,0.10),  transparent 45%)",
          "#070b17",
        ].join(","),
      }}
    />
  );
}
