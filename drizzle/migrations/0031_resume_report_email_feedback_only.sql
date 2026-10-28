UPDATE public.email_templates
SET subject = 'Your resume review and feedback are ready',
    heading = 'Your resume review is complete',
    body = E'Hi {{name}},\n\nWe have finished reviewing {{file_name}}. Your ATS score is {{ats_score}}/100.\n\nOpen your report for category scores, the exact lines to rewrite, keywords to add and a step-by-step action plan.',
    button_label = 'View my resume report',
    updated_at = now()
WHERE key = 'resume-report';