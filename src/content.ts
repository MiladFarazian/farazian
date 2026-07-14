// Content for the portfolio. Real projects — current work plus everything
// carried over from miladfarazian.com.

export const NAME = "Milad Farazian";

export interface Project {
  no: string;
  title: string;
  desc: string;
  tags: string[];
  /** Optional chip advertising what's on the page: interactive demo, video, playable game, award. */
  extra?: "interactive" | "video" | "playable" | "winner";
  href: string; // "#" = no public link
  category: string;
}

export const CATEGORIES = ["All", "AI / ML", "Software", "Games", "Web", "Writing"];

export const PROJECTS: Project[] = [
  {
    no: "01",
    title: "Parkzy",
    extra: "interactive",
    desc: "Airbnb for parking — live on the App Store (5.0★, 1,000+ downloads). Payments, maps, real-time matching, and a production AI suite: semantic search, LLM-explained pricing, AI-graded photos.",
    tags: ["React Native", "Supabase", "Stripe", "LLMs"],
    href: "/work/parkzy/",
    category: "Software",
  },
  {
    no: "02",
    title: "Gosan",
    extra: "video",
    desc: "A native macOS DAW with an AI taste engine — Suno generates musical ideas, Moises dissects and finishes audio, and you stay the producer.",
    tags: ["Swift", "macOS", "CoreAudio", "AI"],
    href: "/work/gosan/",
    category: "Software",
  },
  {
    no: "03",
    title: "Mehdi",
    extra: "video",
    desc: "A personal financial-intelligence assistant that links your accounts, models your spending, and flags runaway subscriptions and lifestyle creep in plain language.",
    tags: ["TypeScript", "Plaid", "LLM"],
    href: "/work/mehdi/",
    category: "AI / ML",
  },
  {
    no: "04",
    title: "Lincoln",
    extra: "video",
    desc: "Tinder for jobs — swipe through postings and a recommender retrains on your taste every 20 swipes. Swipe right, and it drafts you a tailored resume.",
    tags: ["Next.js", "FastAPI", "scikit-learn", "Claude"],
    href: "/work/lincoln/",
    category: "AI / ML",
  },
  {
    no: "05",
    title: "Honest",
    extra: "interactive",
    desc: "A working LLM evaluation harness — grades every model answer for hallucination, ungrounded claims, and broken guardrails before a user sees it. The eval layer production AI features need.",
    tags: ["LLM Evals", "Guardrails", "TypeScript"],
    href: "/work/honest/",
    category: "AI / ML",
  },
  {
    no: "06",
    title: "Wax",
    desc: "Instagram without the Reels rabbit hole — a calm, fast client that keeps the feed, stories, and DMs you love while silencing the algorithmic pull.",
    tags: ["TypeScript", "Mobile", "API"],
    href: "/work/wax/",
    category: "Software",
  },
  {
    no: "07",
    title: "C++ Ray Tracer",
    extra: "interactive",
    desc: "A from-scratch ray tracer in pure C++17, no external libraries — recursive ray tracing, Blinn-Phong lighting, shadows, mirror reflections, and 4× anti-aliasing.",
    tags: ["C++17", "Graphics"],
    href: "/work/raytracer/",
    category: "Software",
  },
  {
    no: "08",
    title: "LMBiS-Net",
    extra: "interactive",
    desc: "The first public implementation of Abbasi et al.'s LMBiS-Net — a lightweight bidirectional-skip-connection CNN for retinal blood-vessel segmentation.",
    tags: ["Python", "PyTorch", "CNN"],
    href: "/work/lmbis-net/",
    category: "AI / ML",
  },
  {
    no: "09",
    title: "LLM Distillation for Financial Reports",
    extra: "interactive",
    desc: "Distilling large language models into compact, specialized models tuned for analyzing financial reports.",
    tags: ["Python", "LLMs", "Distillation"],
    href: "/work/llm-distillation/",
    category: "AI / ML",
  },
  {
    no: "10",
    title: "Emotion Translation with Transformers",
    desc: "A transformer model that rewrites the emotion of a sentence while preserving its underlying meaning.",
    tags: ["Python", "Transformers", "NLP"],
    href: "/work/emotion-translation/",
    category: "AI / ML",
  },
  {
    no: "11",
    title: "StudyBuddy",
    desc: "A USC-based tutoring and mentoring app that matches students to the help they need.",
    tags: ["React", "Next.js", "Tailwind", "Supabase"],
    href: "/work/studybuddy/",
    category: "Web",
  },
  {
    no: "12",
    title: "Innsæi",
    desc: "A Twitter-esque social app reclaiming the original mission — share ideas instantly, without barriers. Innsæi is Icelandic for the sea within.",
    tags: ["React", "JavaScript"],
    href: "/work/innsaei/",
    category: "Web",
  },
  {
    no: "13",
    title: "Canvas Year in Review",
    extra: "winner",
    desc: "A Spotify-Wrapped for school — a browser extension that turns your Canvas account into a semester recap. CruzHacks 2021 Secret Prize winner.",
    tags: ["JavaScript", "Chrome Extension"],
    href: "/work/canvas-year-in-review/",
    category: "Web",
  },
  {
    no: "14",
    title: "Katsuya's Revenge",
    extra: "playable",
    desc: "A 2D samurai-turned-ninja revenge platformer — restored, re-presented, and playable in the browser.",
    tags: ["Java", "Canvas"],
    href: "/work/katsuya/",
    category: "Games",
  },
  {
    no: "15",
    title: "Bound",
    extra: "playable",
    desc: "The first game I built solo — a Java/Processing platformer, with a playable p5.js web port.",
    tags: ["Java", "Processing"],
    href: "/work/bound/",
    category: "Games",
  },
  {
    no: "16",
    title: "Snake",
    extra: "playable",
    desc: "The arcade classic, rebuilt and playable right in the browser.",
    tags: ["JavaScript", "Canvas"],
    href: "/work/snake/",
    category: "Games",
  },
  {
    no: "17",
    title: "How Machines Learn to Discriminate",
    extra: "interactive",
    desc: "A talk on how algorithms trained on real-world data automate existing bias along race and sex — even absent any ill intent.",
    tags: ["Ethics", "ML"],
    href: "/work/how-machines-learn/",
    category: "Writing",
  },
  {
    no: "18",
    title: "How I Build With AI",
    desc: "How I actually ship production software with AI — the plan → generate → verify loop, what I delegate vs. own, and the test suite that makes the speed safe.",
    tags: ["AI-Paired Dev", "Verification", "Essay"],
    href: "/work/how-i-build-with-ai/",
    category: "Writing",
  },
];

export interface StackGroup {
  label: string;
  accent: string;
  items: string[];
}

export const STACK_GROUPS: StackGroup[] = [
  { label: "Languages", accent: "cyan", items: ["TypeScript", "Python", "Swift / SwiftUI", "C++", "Java", "SQL"] },
  {
    label: "AI / ML",
    accent: "magenta",
    items: [
      "LLM APIs (Anthropic · OpenAI)",
      "RAG · pgvector · embeddings",
      "LLM evals · guardrails",
      "MCP · agentic tooling",
      "PyTorch · Hugging Face",
      "scikit-learn",
    ],
  },
  {
    label: "Web & Mobile",
    accent: "violet",
    items: ["React", "React Native · Expo", "Next.js", "Node.js · FastAPI", "Capacitor (iOS · Android)", "Tailwind"],
  },
  {
    label: "Cloud & Data",
    accent: "blue",
    items: ["Postgres · Supabase", "AWS (RDS · Lambda)", "Terraform", "Docker", "Stripe Connect · Identity", "Mapbox GL"],
  },
  {
    label: "Reliability",
    accent: "amber",
    items: ["GitHub Actions CI", "Playwright · Vitest", "Sentry", "PostHog"],
  },
  { label: "Graphics & Media", accent: "lime", items: ["Three.js", "WebGL · WebGPU", "GLSL · Metal", "CoreAudio"] },
];

export interface Link {
  label: string;
  href: string;
}

export const LINKS: Link[] = [
  { label: "Resume", href: "/resume/" },
  { label: "GitHub", href: "https://github.com/MiladFarazian" },
  { label: "miladfarazian.com", href: "https://miladfarazian.com" },
  { label: "Parkzy", href: "https://useparkzy.com" },
  { label: "Email", href: "mailto:miladfarazian@gmail.com" },
];
