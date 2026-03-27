"use client";

import { useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGradientBackgroundProps {
    className?: string;
    children?: React.ReactNode;
    intensity?: "subtle" | "medium" | "strong";
}

interface Beam {
    x: number;
    y: number;
    width: number;
    length: number;
    angle: number;
    speed: number;
    opacity: number;
    hue: number;
    pulse: number;
    pulseSpeed: number;
}

function createBeam(width: number, height: number): Beam {
    return {
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 1.5 - height * 0.25,
        width: 30 + Math.random() * 60,
        length: height * 2.5,
        angle: -35 + Math.random() * 10,
        speed: 0.15 + Math.random() * 0.3,
        opacity: 0.08 + Math.random() * 0.1,
        hue: 190 + Math.random() * 70,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.003 + Math.random() * 0.007,
    };
}

// Detect low-power devices
function isLowPowerDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    const cores = navigator.hardwareConcurrency || 4;
    return cores <= 4;
}

export function BeamsBackground({
    className,
    children,
    intensity = "strong",
}: AnimatedGradientBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const beamsRef = useRef<Beam[]>([]);
    const animationFrameRef = useRef<number>(0);
    const frameCountRef = useRef(0);

    // Reduce beam count significantly (was 30, now 8-12)
    const BEAM_COUNT = useMemo(() => isLowPowerDevice() ? 6 : 10, []);

    // Throttle to ~30fps instead of 60fps
    const FRAME_SKIP = useMemo(() => isLowPowerDevice() ? 3 : 2, []);

    const opacityMap = {
        subtle: 0.5,
        medium: 0.65,
        strong: 0.8,
    };

    useEffect(() => {
        // Respect user's reduced motion preference
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        const updateCanvasSize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR at 2
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);

            beamsRef.current = Array.from({ length: BEAM_COUNT }, () =>
                createBeam(canvas.width, canvas.height)
            );
        };

        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);

        function resetBeam(beam: Beam, index: number) {
            if (!canvas) return beam;
            const column = index % 3;
            const spacing = canvas.width / 3;
            beam.y = canvas.height + 100;
            beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
            beam.width = 80 + Math.random() * 80;
            beam.speed = 0.3 + Math.random() * 0.3;
            beam.hue = 190 + (index * 70) / BEAM_COUNT;
            beam.opacity = 0.12 + Math.random() * 0.08;
            return beam;
        }

        function drawBeam(ctx: CanvasRenderingContext2D, beam: Beam) {
            ctx.save();
            ctx.translate(beam.x, beam.y);
            ctx.rotate((beam.angle * Math.PI) / 180);

            const pulsingOpacity =
                beam.opacity * (0.85 + Math.sin(beam.pulse) * 0.15) * opacityMap[intensity];

            // Simpler gradient with fewer stops
            const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
            gradient.addColorStop(0, `hsla(${beam.hue}, 80%, 60%, 0)`);
            gradient.addColorStop(0.3, `hsla(${beam.hue}, 80%, 60%, ${pulsingOpacity})`);
            gradient.addColorStop(0.7, `hsla(${beam.hue}, 80%, 60%, ${pulsingOpacity})`);
            gradient.addColorStop(1, `hsla(${beam.hue}, 80%, 60%, 0)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
            ctx.restore();
        }

        function animate() {
            if (!canvas || !ctx) return;

            frameCountRef.current++;

            // Skip frames for performance (render every Nth frame)
            if (frameCountRef.current % FRAME_SKIP !== 0) {
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // REMOVED: ctx.filter = "blur(35px)" — this was the #1 perf killer
            // The CSS filter on the canvas element handles blur much more efficiently

            beamsRef.current.forEach((beam, index) => {
                beam.y -= beam.speed;
                beam.pulse += beam.pulseSpeed;

                if (beam.y + beam.length < -100) {
                    resetBeam(beam, index);
                }
                drawBeam(ctx, beam);
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        }

        animate();

        return () => {
            window.removeEventListener("resize", updateCanvasSize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [intensity, BEAM_COUNT, FRAME_SKIP]);

    return (
        <div
            className={cn(
                "relative min-h-screen w-full overflow-hidden bg-neutral-950",
                className
            )}
        >
            {/* Canvas with a lighter CSS blur (was 15px, now 25px via CSS only — GPU accelerated) */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{
                    filter: "blur(25px)",
                    willChange: "transform",
                    transform: "translateZ(0)", // Force GPU layer
                }}
            />

            {/* REMOVED: framer-motion overlay with backdropFilter: blur(50px) — was the #2 perf killer */}
            {/* Replaced with a simple static overlay */}
            <div
                className="absolute inset-0 bg-neutral-950/10 pointer-events-none"
                style={{ willChange: "auto" }}
            />

            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
}
