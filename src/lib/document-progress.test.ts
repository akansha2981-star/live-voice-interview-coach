import { describe, expect, it } from "vitest";
import { z } from "zod";
import { evidenceFacts, exactQuoteRange, validatedSections } from "./document-progress";
describe("genuine review evidence", () => {
  const schema = z.object({ is_resume: z.boolean(), score: z.number().min(0).max(100), facts: z.array(z.string()) });
  it("does not show data before the document is confirmed valid", () => {
    expect(validatedSections(schema, { score: 50 }, "is_resume")).toEqual({});
  });
  it("rejects unfinished or invalid fields", () => {
    expect(validatedSections(schema, { is_resume: true, score: 101, facts: ["Acme"], next_field: "started" }, "is_resume")).toEqual({ is_resume: true, facts: ["Acme"] });
  });
  it("holds a still-growing last field until the next field starts", () => {
    expect(validatedSections(schema, {is_resume:true, facts:["Ac"]}, "is_resume")).toEqual({is_resume:true});
  });
  it("keeps facts only with exact source evidence", () => {
    expect(evidenceFacts({ source_text: "Worked at Acme", facts: [{label:"Company",value:"Acme",quote:"Acme"},{label:"Company",value:"Invented",quote:"Invented"}] })?.facts).toHaveLength(1);
  });
  it("never approximates a source highlight", () => {
    expect(exactQuoteRange("MBA at Acme", "MBA at Another")).toBeNull();
    expect(exactQuoteRange("MBA at Acme", "Acme")).toEqual({start:7,end:11});
  });
});