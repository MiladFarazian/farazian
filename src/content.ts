// Content for the portfolio. Placeholders seeded with real details where known.
// Swap freely — the layout adapts.

export const NAME = "Milad Farazian";

export interface Project {
  no: string;
  title: string;
  desc: string;
  tags: string[];
  href: string;
}

export const PROJECTS: Project[] = [
  {
    no: "01",
    title: "Parkzy",
    desc: "A marketplace turning empty driveways into bookable parking — payments, maps, search, hosts, and a mobile app, all in production.",
    tags: ["React Native", "Supabase", "Stripe", "Maps", "i18n"],
    href: "https://useparkzy.com",
  },
  {
    no: "02",
    title: "Realtime Engine",
    desc: "A low-latency presence + sync layer powering live collaboration — conflict resolution, optimistic UI, and 60fps under load.",
    tags: ["WebSockets", "CRDT", "Edge", "TypeScript"],
    href: "#",
  },
  {
    no: "03",
    title: "Shaderlab",
    desc: "An experiment playground for GPU graphics — GPGPU particles, raymarched scenes, and audio-reactive visuals on the web.",
    tags: ["WebGL", "GLSL", "Three.js", "WebGPU"],
    href: "#",
  },
  {
    no: "04",
    title: "Pipeline",
    desc: "Internal data tooling — ingest, transform, and surface analytics with sub-second queries and zero-downtime deploys.",
    tags: ["Postgres", "Node", "ETL", "Observability"],
    href: "#",
  },
];

export const STACK: string[] = [
  "TypeScript",
  "React",
  "React Native",
  "Three.js",
  "GLSL",
  "WebGL / WebGPU",
  "GSAP",
  "Node.js",
  "Python",
  "Postgres",
  "Supabase",
  "Stripe",
  "Redis",
  "Docker",
  "AWS",
  "Vite",
  "PostHog",
  "Figma",
];

export interface Link {
  label: string;
  href: string;
}

export const LINKS: Link[] = [
  { label: "GitHub", href: "https://github.com/MiladFarazian" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/" },
  { label: "Parkzy", href: "https://useparkzy.com" },
  { label: "Email", href: "mailto:miladfarazian@gmail.com" },
];
