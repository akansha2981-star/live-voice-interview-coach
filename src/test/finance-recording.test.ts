import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn()}));
vi.mock("@/integrations/supabase/client.server",()=>({supabaseAdmin:mocks}));
import {recordUsage} from "@/lib/finance.server";
const input={eventKey:"provider-request-1",occurredAt:"2026-10-27T00:00:00Z",model:"test",attribution:{product:"resume" as const,userId:"student-1",transactionId:"resume-1",service:"analysis"},status:"completed" as const,finalized:true,inputTokens:100,outputTokens:10};
describe("finance usage recording",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue({error:null});});
 it("records provider quantities, attribution and stable event key through the atomic function",async()=>{
  mocks.from.mockImplementation((table:string)=> table==="finance_usage"?{select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}:{select:()=>({eq:()=>({eq:()=>({eq:()=>({lte:()=>({order:()=>({limit:async()=>({data:[],error:null})})})})})})})});
  await recordUsage(input);
  expect(mocks.rpc).toHaveBeenCalledWith("finance_record_usage",{_row:expect.objectContaining({event_key:"provider-request-1",input_tokens:100,output_tokens:10,user_id:"student-1",transaction_id:"resume-1",product:"resume",estimates:{}})});
 });
 it("does not overwrite a finalized duplicate",async()=>{
  mocks.from.mockReturnValue({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:"existing",finalized:true},error:null})})})});
  await recordUsage(input);expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it("does not interrupt an interview when the accounting store is unavailable",async()=>{
  mocks.from.mockImplementation(()=>{throw new Error("unavailable");}); const log=vi.spyOn(console,"error").mockImplementation(()=>{});
  await expect(recordUsage(input)).resolves.toBeUndefined();expect(mocks.rpc).not.toHaveBeenCalled();log.mockRestore();
 });
});