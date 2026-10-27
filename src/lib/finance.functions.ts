import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Usage, Expense, Balance, Rate, Activity } from "./finance";

export const getFinance = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i:unknown) => z.object({from:z.string().datetime(),to:z.string().datetime()}).refine(v=>v.from<=v.to,"Choose a valid date range").parse(i))
  .handler(async ({data,context}) => {
    const {data:allowed,error:permissionError}=await context.supabase.rpc("can_read_finance",{_user_id:context.userId});
    if(permissionError || !allowed) throw new Error("Finance access is restricted to authorised staff.");
    type Table = "finance_usage" | "finance_expenses" | "finance_rates" | "finance_balances" | "interviews" | "resume_analyses" | "sop_reviews" | "college_training_docs" | "course_purchases";
    let partial=false;
    async function read(table:Table,dateColumn:string,select:string,filtered=true) {
      const out:Record<string,unknown>[]=[];
      for(let offset=0;offset<50000;offset+=500) {
        let query=context.supabase.from(table).select(select).order(dateColumn,{ascending:false}).order("id").range(offset,offset+499);
        if(filtered) query=query.gte(dateColumn,data.from).lt(dateColumn,data.to);
        const {data:rows,error}=await query;
        if(error) throw new Error("Could not load finance records.");
        const batch=(rows ?? []) as unknown as Record<string,unknown>[]; out.push(...batch);
        if(batch.length<500) return out;
      }
      partial=true; return out;
    }
    const [usage,expenses,rates,balances,interviews,resumes,sops,training,sales]=await Promise.all([
      read("finance_usage","occurred_at","*"),read("finance_expenses","occurred_at","*"),read("finance_rates","effective_at","*",false),read("finance_balances","as_of","*",false),
      read("interviews","started_at","id,user_id,status,started_at,duration_s"),read("resume_analyses","created_at","id,user_id,status,created_at"),read("sop_reviews","created_at","id,user_id,status,created_at"),read("college_training_docs","created_at","id,created_by,status,created_at"),read("course_purchases","purchased_at","id,amount,currency,payment_status,purchased_at,source")
    ]);
    const activity=[...interviews.map(r=>({...r,product:"interview",occurred_at:r.started_at})),...resumes.map(r=>({...r,product:"resume",occurred_at:r.created_at,duration_s:null})),...sops.map(r=>({...r,product:"sop",occurred_at:r.created_at,duration_s:null})),...training.map(r=>({...r,product:"training",user_id:r.created_by,occurred_at:r.created_at,duration_s:null}))] as Activity[];
    const saleRows=sales.map(r=>({id:String(r.id),amount:r.amount==null?null:Number(r.amount),currency:r.currency==null?null:String(r.currency),payment_status:r.payment_status==null?null:String(r.payment_status),purchased_at:String(r.purchased_at),source:String(r.source)}));
    return {usage:usage as unknown as Usage[],expenses:expenses as unknown as Expense[],rates:rates as unknown as Rate[],balances:balances as unknown as Balance[],activity,sales:saleRows,partial:Boolean(partial)};
  });

const currency=z.enum(["INR","USD","credits"]);
const product=z.enum(["interview","resume","sop","training","profile_resume","shared"]);
const text=z.string().trim().min(1).max(200);
export const saveFinance = createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
  .inputValidator((i:unknown)=>z.discriminatedUnion("kind",[
    z.object({kind:z.literal("expense"),data:z.object({occurred_at:z.string().datetime(),category:z.enum(["api","developer","personal_api","hosting","other"]),product,provider:text,amount:z.number().finite().min(0),currency,reference:text,notes:z.string().max(1000),usage_ids:z.array(z.string().uuid()).max(500)})}),
    z.object({kind:z.literal("rate"),data:z.object({provider:text,model:text,service:text,unit:z.enum(["input_tokens","cached_input_tokens","output_tokens","seconds"]),currency,unit_price:z.number().finite().min(0),per_quantity:z.number().finite().positive(),effective_at:z.string().datetime()})}),
    z.object({kind:z.literal("balance"),data:z.object({provider:text,balance:z.number().finite().min(0),currency,spending_limit:z.number().finite().min(0).nullable(),as_of:z.string().datetime(),notes:z.string().max(1000)})}),
    z.object({kind:z.literal("void"),data:z.object({id:z.string().uuid()})})
  ]).parse(i))
  .handler(async({data,context})=>{
    const {data:allowed}=await context.supabase.rpc("can_operate",{_user_id:context.userId});
    if(!allowed) throw new Error("Only administrators and operations staff can edit finances.");
    const {data:id,error}=await context.supabase.rpc("finance_save",{_kind:data.kind,_data:data.data});
    if(error) throw new Error(error.code==="23505"?"That reference or effective rate already exists.":error.message);
    return {id};
  });