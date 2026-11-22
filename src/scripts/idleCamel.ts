// Idle camel: after 10s of no activity, the visible camel logo (the pinned
// header's on work pages, otherwise the nav's) walks left and right along a
// random route in stop-motion steps, then returns home. Any activity sends it
// straight back. Runs on every page via BaseLayout.
export function initIdleCamel() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const IDLE_MS = 10000;
  let idleTimer: number | undefined;
  let trip: { walker: HTMLImageElement; home: HTMLImageElement; anim: Animation } | null = null;

  const visibleCamel = () => {
    const candidates = [
      document.querySelector("#stickyHeader.visible .stickyBrand img"),
      document.querySelector("nav img"),
    ] as (HTMLImageElement | null)[];
    return candidates.find((img) => {
      if (!img) return false;
      const r = img.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
    });
  };

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  const startTrip = () => {
    const home = visibleCamel();
    if (!home || trip) return;
    const r = home.getBoundingClientRect();
    const walker = home.cloneNode(true) as HTMLImageElement;
    Object.assign(walker.style, {
      position: "fixed",
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
      margin: "0",
      zIndex: "9998",
      pointerEvents: "none",
      border: "none",
      outline: "none",
      background: "transparent",
    });
    walker.removeAttribute("id");
    walker.alt = "";
    document.body.appendChild(walker);
    home.style.visibility = "hidden";

    // Random route along the x-axis only: 2-8 turns left/right of home,
    // each at least 120px from the last, then back home
    const minX = -r.left;
    const maxX = window.innerWidth - r.width - r.left;
    const points: [number, number][] = [[0, 0]];
    const stops = Math.floor(rand(2, 9)); // random trip length before heading home
    for (let i = 0; i < stops; i++) {
      const prev = points[points.length - 1][0];
      let x = rand(minX, maxX);
      for (let tries = 0; tries < 10 && Math.abs(x - prev) < 120; tries++) {
        x = rand(minX, maxX);
      }
      points.push([x, 0]);
    }
    points.push([0, 0]);

    // Continuous walk, stop-motion style: stepped at the gif's cadence
    // (7 frames x 250ms = 4fps), one hop per leg frame, each hop roughly a
    // quarter of the camel's body length. It never pauses; at each turning
    // point it flips instantly and keeps walking.
    const FPS = 4;
    const speed = rand(40, 60); // px per second
    const frames: { t: number; x: number; y: number; f: number; easing: string }[] = [];
    let t = 0;
    let facing = 1;
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const newFacing = x1 < x0 ? -1 : 1;
      if (newFacing !== facing) {
        // Snap the flip (no squash): old and new facing at the same instant
        frames.push({ t, x: x0, y: y0, f: facing, easing: "linear" });
        facing = newFacing;
      }
      const ms = (Math.abs(x1 - x0) / speed) * 1000;
      frames.push({
        t,
        x: x0,
        y: y0,
        f: facing,
        easing: `steps(${Math.max(1, Math.round((ms / 1000) * FPS))}, jump-end)`,
      });
      t += ms;
    }
    // Arrive home and snap back to facing forward
    const [hx, hy] = points[points.length - 1];
    frames.push({ t, x: hx, y: hy, f: facing, easing: "linear" });
    if (facing !== 1) frames.push({ t, x: hx, y: hy, f: 1, easing: "linear" });

    const keyframes: Keyframe[] = frames.map((fr) => ({
      offset: t ? fr.t / t : 0,
      easing: fr.easing,
      transform: `translate(${fr.x}px, ${fr.y}px) scaleX(${fr.f})`,
    }));

    const anim = walker.animate(keyframes, {
      duration: t,
      fill: "forwards",
    });
    trip = { walker, home, anim };
    anim.onfinish = () => endTrip();
  };

  const endTrip = () => {
    if (!trip) return;
    trip.walker.remove();
    trip.home.style.visibility = "";
    trip = null;
    armIdle();
  };

  // Activity mid-trip: walk quickly back from wherever the camel is
  const recall = () => {
    if (!trip || trip.anim.playState !== "running") return;
    const { walker, anim } = trip;
    const current = getComputedStyle(walker).transform;
    anim.cancel();
    const m = new DOMMatrix(current);
    const facing = m.e > 0 ? -1 : 1; // heading home: left if we're to the right
    const back = walker.animate(
      [
        { transform: `translate(${m.e}px, ${m.f}px) scaleX(${facing})` },
        { transform: `translate(0px, 0px) scaleX(${facing})` },
      ],
      { duration: Math.min(600, Math.hypot(m.e, m.f) * 1.5), easing: "steps(5, jump-end)", fill: "forwards" }
    );
    trip.anim = back;
    back.onfinish = () => endTrip();
  };

  const armIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(startTrip, IDLE_MS);
  };

  const onActivity = () => {
    recall();
    if (!trip) armIdle();
  };

  ["scroll", "mousemove", "mousedown", "keydown", "wheel", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, onActivity, { passive: true })
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearTimeout(idleTimer);
    else onActivity();
  });
  armIdle();
}
