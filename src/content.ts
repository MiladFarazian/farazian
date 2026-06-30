// Content for the portfolio. Real projects — current work plus everything
// carried over from miladfarazian.com.

export const NAME = "Milad Farazian";

export interface Project {
  no: string;
  title: string;
  desc: string;
  tags: string[];
  href: string; // "#" = no public link
  category: string;
}

export const CATEGORIES = ["All", "AI / ML", "Software", "Games", "Web", "Writing"];

export const PROJECTS: Project[] = [
  {
    no: "01",
    title: "Parkzy",
    desc: "Airbnb for parking — a marketplace turning empty driveways into bookable spots. Payments, maps, hosts, and a mobile app, all in production.",
    tags: ["React Native", "Supabase", "Stripe", "Maps"],
    href: "https://useparkzy.com",
    category: "Software",
  },
  {
    no: "02",
    title: "Gosan",
    desc: "A native macOS DAW with an AI taste engine — Suno generates musical ideas, Moises dissects and finishes audio, and you stay the producer.",
    tags: ["Swift", "macOS", "CoreAudio", "AI"],
    href: "https://github.com/MiladFarazian/daw",
    category: "Software",
  },
  {
    no: "03",
    title: "Mehdi",
    desc: "A personal financial-intelligence assistant that links your accounts, models your spending, and flags runaway subscriptions and lifestyle creep in plain language.",
    tags: ["TypeScript", "Plaid", "LLM"],
    href: "#",
    category: "AI / ML",
  },
  {
    no: "04",
    title: "Wax",
    desc: "Instagram without the Reels rabbit hole — a calm, fast client that keeps the feed, stories, and DMs you love while silencing the algorithmic pull.",
    tags: ["TypeScript", "Mobile", "API"],
    href: "https://github.com/MiladFarazian/wax",
    category: "Software",
  },
  {
    no: "05",
    title: "C++ Ray Tracer",
    desc: "A from-scratch ray tracer in pure C++17, no external libraries — recursive ray tracing, Blinn-Phong lighting, shadows, mirror reflections, and 4× anti-aliasing.",
    tags: ["C++17", "Graphics"],
    href: "https://miladfarazian.com/raytracer",
    category: "Software",
  },
  {
    no: "06",
    title: "LMBiS-Net",
    desc: "The first public implementation of Abbasi et al.'s LMBiS-Net — a lightweight bidirectional-skip-connection CNN for retinal blood-vessel segmentation.",
    tags: ["Python", "PyTorch", "CNN"],
    href: "https://miladfarazian.com/lmbis-net",
    category: "AI / ML",
  },
  {
    no: "07",
    title: "LLM Distillation for Financial Reports",
    desc: "Distilling large language models into compact, specialized models tuned for analyzing financial reports.",
    tags: ["Python", "LLMs", "Distillation"],
    href: "https://miladfarazian.com/llm-distillation",
    category: "AI / ML",
  },
  {
    no: "08",
    title: "Emotion Translation with Transformers",
    desc: "A transformer model that rewrites the emotion of a sentence while preserving its underlying meaning.",
    tags: ["Python", "Transformers", "NLP"],
    href: "#",
    category: "AI / ML",
  },
  {
    no: "09",
    title: "StudyBuddy",
    desc: "A USC-based tutoring and mentoring app that matches students to the help they need.",
    tags: ["React", "Next.js", "Tailwind", "Prisma"],
    href: "#",
    category: "Web",
  },
  {
    no: "10",
    title: "Innsæi",
    desc: "A Twitter-esque social app reclaiming the original mission — share ideas instantly, without barriers. Innsæi is Icelandic for the sea within.",
    tags: ["React", "JavaScript"],
    href: "https://innsaei.lovable.app",
    category: "Web",
  },
  {
    no: "11",
    title: "Canvas Year in Review",
    desc: "A Spotify-Wrapped for school — a Chrome extension that scrapes your Canvas account into a semester stats recap.",
    tags: ["JavaScript", "Chrome Extension"],
    href: "https://devpost.com/software/canvas-year-in-review",
    category: "Web",
  },
  {
    no: "12",
    title: "Usurper",
    desc: "Promo site for the debut short film USURPER by Edward Avalos.",
    tags: ["HTML", "CSS", "JavaScript"],
    href: "https://miladfarazian.com/Usurper",
    category: "Web",
  },
  {
    no: "13",
    title: "Katsuya's Revenge",
    desc: "A 2D samurai-turned-ninja revenge platformer — restored and re-presented from an AP Computer Science team project.",
    tags: ["Java"],
    href: "https://miladfarazian.com/katsuya",
    category: "Games",
  },
  {
    no: "14",
    title: "Bound",
    desc: "The first game I built solo — a Java/PApplet platformer, later ported to p5.js so it plays right in the browser.",
    tags: ["Java", "p5.js"],
    href: "https://miladfarazian.com/bound",
    category: "Games",
  },
  {
    no: "15",
    title: "Snake",
    desc: "The arcade classic, rebuilt. Not really much else to say.",
    tags: ["Python"],
    href: "#",
    category: "Games",
  },
  {
    no: "16",
    title: "How Machines Learn to Discriminate",
    desc: "A talk on how algorithms trained on real-world data automate existing bias along race and sex — even absent any ill intent.",
    tags: ["Ethics", "ML"],
    href: "#",
    category: "Writing",
  },
];

export const STACK: string[] = [
  "TypeScript",
  "React",
  "React Native",
  "Next.js",
  "Swift",
  "Python",
  "C++",
  "Three.js",
  "GLSL",
  "WebGL / WebGPU",
  "GSAP",
  "Node.js",
  "Postgres",
  "Supabase",
  "Stripe",
  "PyTorch",
  "Docker",
  "AWS",
];

export interface Link {
  label: string;
  href: string;
}

export const LINKS: Link[] = [
  { label: "GitHub", href: "https://github.com/MiladFarazian" },
  { label: "miladfarazian.com", href: "https://miladfarazian.com" },
  { label: "Parkzy", href: "https://useparkzy.com" },
  { label: "Email", href: "mailto:miladfarazian@gmail.com" },
];
