import ahmedabad from "@/assets/colleges/iim_ahmedabad.png.asset.json";
import bangalore from "@/assets/colleges/iim_bangalore.png.asset.json";
import calcutta from "@/assets/colleges/iim_calcutta.png.asset.json";
import indore from "@/assets/colleges/iim_indore.png.asset.json";
import lucknow from "@/assets/colleges/iim_lucknow.png.asset.json";
import kozhikode from "@/assets/colleges/iim_kozhikode.png.asset.json";
import rohtak from "@/assets/colleges/iim_rohtak.png.asset.json";
import jammu from "@/assets/colleges/iim_jammu.png.asset.json";
import raipur from "@/assets/colleges/iim_raipur.png.asset.json";
import xlri from "@/assets/colleges/xlri.png.asset.json";
import fms from "@/assets/colleges/fms_delhi.png.asset.json";
import iitd from "@/assets/colleges/iit_delhi.png.asset.json";

const colleges = [
  { name: "IIM Ahmedabad", asset: ahmedabad },
  { name: "IIM Bangalore", asset: bangalore },
  { name: "IIM Calcutta", asset: calcutta },
  { name: "IIM Indore", asset: indore },
  { name: "IIM Lucknow", asset: lucknow },
  { name: "IIM Kozhikode", asset: kozhikode },
  { name: "IIM Rohtak", asset: rohtak },
  { name: "IIM Jammu", asset: jammu },
  { name: "IIM Raipur", asset: raipur },
  { name: "XLRI Jamshedpur", asset: xlri },
  { name: "FMS Delhi", asset: fms },
  { name: "IIT Delhi", asset: iitd },
];

export function CourseCollegeLogos() {
  return <section className="course-colleges" aria-labelledby="college-heading">
    <div className="course-container">
      <div>
        <div className="min-w-0"><p className="course-eyebrow">YOUR AMBITION. YOUR NEXT CHAPTER.</p><h2 id="college-heading" className="mt-2 text-2xl font-bold sm:text-3xl">Big aspirations start with better preparation.</h2></div>
      </div>
      <div id="college-logo-window" className="course-college-window" tabIndex={0} role="region" aria-label="College logos">
        <div className="course-college-track">{[0, 1].map(copy => <ul className="course-college-set" key={copy} aria-hidden={copy === 1 ? true : undefined}>{colleges.map(({ name, asset }) => <li className="course-college-item" key={name}><img src={asset.url} alt={copy === 0 ? `${name} logo` : ""} width={160} height={104} loading="lazy" decoding="async" /><span>{name}</span></li>)}</ul>)}</div>
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">College logos identify institutions only. MBA Compass is not affiliated with or endorsed by these institutions.</p>
    </div>
  </section>;
}