import { useEffect, useState } from "react";

export function DocumentAnalysisActivity({ stage, detail, facts, sections, fixes }: {
  stage: string; detail: string; facts: number; sections: number; fixes: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div className="analysis-activity">
    <div className="analysis-activity-top"><span className="analysis-live-label"><i aria-hidden /> Analysis active</span><span className="tabular-nums">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed</span></div>
    <div className="analysis-current" key={stage}>
      <div className="analysis-wave" aria-hidden>{Array.from({ length: 16 }, (_, i) => <i key={i} />)}</div>
      <p className="text-xs font-semibold text-muted-foreground">CURRENT STEP</p>
      <h3 className="mt-1 text-xl font-bold">{stage}<span className="analysis-dots" aria-hidden><i>·</i><i>·</i><i>·</i></span></h3>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
    <dl className="analysis-live-counts">{[["Facts extracted", facts], ["Sections received", sections], ["Suggested edits", fixes]].map(([label, value]) => <div key={label}><dd key={value} className="animate-reveal">{value}</dd><dt>{label}</dt></div>)}</dl>
    <p className="analysis-live-foot">Results appear as they’re received. Your full report is still being prepared.</p>
  </div>;
}