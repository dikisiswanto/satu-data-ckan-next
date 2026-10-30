import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const topicPalettes = [
  "home-tone-blue",
  "home-tone-green",
  "home-tone-rose",
  "home-tone-violet",
  "home-tone-amber",
  "home-tone-cyan",
  "home-tone-orange",
  "home-tone-pink",
];

export function HomeTopicCard({ topic, index = 0 }) {
  const Icon = topic.icon;
  const palette = topicPalettes[index % topicPalettes.length];
  return (
    <Link href={topic.href} className="home-topic-card group">
      <span
        className={`home-topic-icon ${palette} mb-4 flex size-11 items-center justify-center rounded-xl`}
      >
        <Icon size={23} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="mr-[.15rem] pr-4 text-xs font-bold leading-5 text-[#263f52] sm:text-sm">
        {topic.label}
      </span>
      <span className="home-topic-arrow">
        <ArrowUpRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}
