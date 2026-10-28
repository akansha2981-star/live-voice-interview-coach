import { useState } from "react";
import { Button } from "@/components/ui/button";
import ahmedabad from "@/assets/colleges/iim_ahmedabad.png.asset.json";
import bangalore from "@/assets/colleges/iim_bangalore.png.asset.json";
import calcutta from "@/assets/colleges/iim_calcutta.png.asset.json";
import indore from "@/assets/colleges/iim_indore.png.asset.json";
import lucknow from "@/assets/colleges/iim_lucknow.png.asset.json";
import kozhikode from "@/assets/colleges/iim_kozhikode.png.asset.json";

const colleges = [
  { name: "IIM Ahmedabad", asset: ahmedabad },
  { name: "IIM Bangalore", asset: bangalore },
  { name: "IIM Calcutta", asset: calcutta },
  { name: "IIM Indore", asset: indore },
  { name: "IIM Lucknow", asset: lucknow },
  { name: "IIM Kozhikode", asset: kozhikode },
];

export function CourseCollegeLogos() {
  const [paused, setPaused] = useState(false);
  return <section className="course-colleges" aria-labelledby="college-heading">
    <div className="course-container">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0"><p className="course-eyebrow">YOUR AMBITION. YOUR NEXT CHAPTER.</p><h2 id="college-heading" className="mt-2 text-2xl font-bold sm:text-3xl">Big aspirations start with better preparation.</h2></div>
        <Button variant="outline" size="sm" className="shrink-0" aria-controls="college-logo-window" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume logos" : "Pause logos"}</Button>
      </div>
      <div id="college-logo-window" className={`course-college-window ${paused ? "is-paused" : ""}`} tabIndex={0} role="region" aria-label="College logos">
        <div className="course-college-track">{[0, 1].map(copy => <ul className="course-college-set" key={copy} aria-hidden={copy === 1 ? true : undefined}>{colleges.map(({ name, asset }) => <li className="course-college-item" key={name}><img src={asset.url} alt={copy === 0 ? `${name} logo` : ""} width={160} height={104} loading="lazy" decoding="async" /><span>{name}</span></li>)}</ul>)}</div>
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">College logos identify institutions only. MBA Compass is not affiliated with or endorsed by these institutions.</p>
    </div>
  </section>;
}