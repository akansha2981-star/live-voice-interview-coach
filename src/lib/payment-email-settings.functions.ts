import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const savePaymentEmailTemplate = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ key: z.enum(['prebook-confirmation', 'course-confirmation']), subject: z.string().trim().min(1).max(200), heading: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(4000), button_label: z.string().trim().max(60), enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed, error: roleError } = await context.supabase.rpc('can_operate', { _user_id: context.userId });
    if (roleError || !allowed) throw new Error('Not allowed');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('email_templates').upsert({ ...data, name: data.key === 'prebook-confirmation' ? '₹1 prebooking confirmation' : 'Course confirmation', updated_at: new Date().toISOString(), updated_by: context.userId }, { onConflict: 'key' });
    if (error) throw new Error('Could not save email');
    await context.supabase.rpc('log_audit', { _action: 'payment_email_template_saved', _target: context.userId, _details: { key: data.key } });
    return { ok: true };
  });