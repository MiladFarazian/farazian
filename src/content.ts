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
    href: "/work/parkzy/",
    category: "Software",
  },
  {
    no: "02",
    title: "Gosan",
    desc: "A native macOS DAW with an AI taste engine — Suno generates musical ideas, Moises dissects and finishes audio, and you stay the producer.",
    tags: ["Swift", "macOS", "CoreAudio", "AI"],
    href: "/work/gosan/",
    category: "Software",
  },
  {
    no: "03",
    title: "Mehdi",
    desc: "A personal financial-intelligence assistant that links your accounts, models your spending, and flags runaway subscriptions and lifestyle creep in plain language.",
    tags: ["TypeScript", "Plaid", "LLM"],
    href: "/work/mehdi/",
    category: "AI / ML",
  },
  {
    no: "04",
    title: "Lincoln",
    desc: "Tinder for jobs — swipe through postings and a recommender retrains on your taste every 20 swipes. Swipe right, and it drafts you a tailored resume.",
    tags: ["Next.js", "FastAPI", "scikit-learn", "Claude"],
    href: "/work/lincoln/",
    category: "AI / ML",
  },
  {
    no: "05",
    title: "Wax",
    desc: "Instagram without the Reels rabbit hole — a calm, fast client that keeps the feed, stories, and DMs you love while silencing the algorithmic pull.",
    tags: ["TypeScript", "Mobile", "API"],
    href: "/work/wax/",
    category: "Software",
  },
  {
    no: "06",
    title: "C++ Ray Tracer",
    desc: "A from-scratch ray tracer in pure C++17, no external libraries — recursive ray tracing, Blinn-Phong lighting, shadows, mirror reflections, and 4× anti-aliasing.",
    tags: ["C++17", "Graphics"],
    href: "/work/raytracer/",
    category: "Software",
  },
  {
    no: "07",
    title: "LMBiS-Net",
    desc: "The first public implementation of Abbasi et al.'s LMBiS-Net — a lightweight bidirectional-skip-connection CNN for retinal blood-vessel segmentation.",
    tags: ["Python", "PyTorch", "CNN"],
    href: "/work/lmbis-net/",
    category: "AI / ML",
  },
  {
    no: "08",
    title: "LLM Distillation for Financial Reports",
    desc: "Distilling large language models into compact, specialized models tuned for analyzing financial reports.",
    tags: ["Python", "LLMs", "Distillation"],
    href: "/work/llm-distillation/",
    category: "AI / ML",
  },
  {
    no: "09",
    title: "Emotion Translation with Transformers",
    desc: "A transformer model that rewrites the emotion of a sentence while preserving its underlying meaning.",
    tags: ["Python", "Transformers", "NLP"],
    href: "/work/emotion-translation/",
    category: "AI / ML",
  },
  {
    no: "10",
    title: "StudyBuddy",
    desc: "A USC-based tutoring and mentoring app that matches students to the help they need.",
    tags: ["React", "Next.js", "Tailwind", "Prisma"],
    href: "/work/studybuddy/",
    category: "Web",
  },
  {
    no: "11",
    title: "Innsæi",
    desc: "A Twitter-esque social app reclaiming the original mission — share ideas instantly, without barriers. Innsæi is Icelandic for the sea within.",
    tags: ["React", "JavaScript"],
    href: "/work/innsaei/",
    category: "Web",
  },
  {
    no: "12",
    title: "Canvas Year in Review",
    desc: "A Spotify-Wrapped for school — a browser extension that turns your Canvas account into a semester recap. CruzHacks 2021 Secret Prize winner.",
    tags: ["JavaScript", "Chrome Extension"],
    href: "/work/canvas-year-in-review/",
    category: "Web",
  },
  {
    no: "13",
    title: "Katsuya's Revenge",
    desc: "A 2D samurai-turned-ninja revenge platformer — restored, re-presented, and playable in the browser.",
    tags: ["Java", "Canvas"],
    href: "/work/katsuya/",
    category: "Games",
  },
  {
    no: "14",
    title: "Bound",
    desc: "The first game I built solo — a Java/Processing platformer, with a playable p5.js web port.",
    tags: ["Java", "Processing"],
    href: "/work/bound/",
    category: "Games",
  },
  {
    no: "15",
    title: "Snake",
    desc: "The arcade classic, rebuilt and playable right in the browser.",
    tags: ["JavaScript", "Canvas"],
    href: "/work/snake/",
    category: "Games",
  },
  {
    no: "16",
    title: "How Machines Learn to Discriminate",
    desc: "A talk on how algorithms trained on real-world data automate existing bias along race and sex — even absent any ill intent.",
    tags: ["Ethics", "ML"],
    href: "/work/how-machines-learn/",
    category: "Writing",
  },
];

export interface StackGroup {
  label: string;
  accent: string;
  items: string[];
}

export const STACK_GROUPS: StackGroup[] = [
  { label: "Languages", accent: "cyan", items: ["TypeScript", "Swift", "Python", "C++"] },
  {
    label: "Web & Frameworks",
    accent: "violet",
    items: ["React", "React Native", "Next.js", "Node.js"],
  },
  { label: "Graphics", accent: "lime", items: ["Three.js", "WebGL / WebGPU", "GLSL", "GSAP"] },
  {
    label: "Data & Infra",
    accent: "blue",
    items: ["Postgres", "Supabase", "Stripe", "PyTorch", "Docker", "AWS"],
  },
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
