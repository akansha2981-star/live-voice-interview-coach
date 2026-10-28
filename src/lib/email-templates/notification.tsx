import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  subject?: string
  heading?: string
  body?: string
  buttonLabel?: string
  buttonUrl?: string
}

const NotificationEmail = ({ heading, body, buttonLabel, buttonUrl }: Props) => {
  const paragraphs = (body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{heading || 'Update from MBA Compass'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>MBA COMPASS</Text>
          <Hr style={rule} />
          <Heading style={h1}>{heading || 'Update from MBA Compass'}</Heading>
          {paragraphs.map((p, i) => <Text key={i} style={text}>{p}</Text>)}
          {buttonLabel && buttonUrl ? (
            <Section style={{ margin: '28px 0' }}>
              <Button href={buttonUrl} style={button}>{buttonLabel}</Button>
            </Section>
          ) : null}
          <Hr style={rule} />
          <Text style={footer}>This is an automated message from MBA Compass. Please do not reply to this email.</Text>
        </Container>
      </Body>
    </Html>
  )
}

const entry = (displayName: string, previewData: Props): TemplateEntry => ({
  component: NotificationEmail,
  subject: (d) => (typeof d.subject === 'string' && d.subject) || 'Update from MBA Compass',
  displayName,
  previewData,
})

export const notificationTemplates = {
  'slot-reminder-10': entry('Slot reminder (10 min)', { subject: 'Your interview starts in 10 minutes', heading: 'Your interview starts in 10 minutes', body: 'Hi Asha,\n\nYour mock interview begins at 4:30 pm (IST).', buttonLabel: 'Open my slots', buttonUrl: 'https://mbacompass.online/my-slots' }),
  'slot-reminder-5': entry('Slot reminder (5 min)', { subject: 'Starting in 5 minutes', heading: 'Your interview starts in 5 minutes', body: 'Hi Asha,\n\nJoin now to complete your checks.', buttonLabel: 'Join interview', buttonUrl: 'https://mbacompass.online/my-slots' }),
  'interview-feedback': entry('Interview feedback', { subject: 'Your interview feedback is ready', heading: 'Your detailed interview feedback', body: 'Hi Asha,\n\nYour overall score is 78/100.', buttonLabel: 'View report and download PDF', buttonUrl: 'https://mbacompass.online/dashboard' }),
  'resume-report': entry('Resume report', { subject: 'Your resume report is ready', heading: 'Your resume review is complete', body: 'Hi Asha,\n\nYour ATS score is 81/100.', buttonLabel: 'View report', buttonUrl: 'https://mbacompass.online/resume-builder' }),
  'sop-review': entry('SOP review', { subject: 'Your SOP review is ready', heading: 'Your SOP has been reviewed', body: 'Hi Asha,\n\nYour overall score is 74/100.', buttonLabel: 'View SOP review', buttonUrl: 'https://mbacompass.online/sop-review' }),
  'course-confirmation': entry('Course confirmation', { subject: 'Purchase confirmed', heading: 'Thank you for your purchase', body: 'Hi Asha,\n\nYour payment was successful.', buttonLabel: 'Go to dashboard', buttonUrl: 'https://mbacompass.online/dashboard' }),
  'prebook-confirmation': entry('₹1 prebooking confirmation', { subject: 'Your prebooking is confirmed', heading: 'Your early-bird spot is reserved', body: 'Hi Asha,\n\nYour ₹1 payment is confirmed. Your early-bird spot is reserved for the launch on 29th November 2026.', buttonLabel: 'Visit MBA Compass', buttonUrl: 'https://mbacompass.online/' }),
} satisfies Record<string, TemplateEntry>

const main = { backgroundColor: '#ffffff', fontFamily: 'Calibri, Carlito, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontSize: '13px', letterSpacing: '3px', fontWeight: 700, color: '#14284b', margin: '0 0 12px' }
const rule = { borderColor: '#dbe5f3', margin: '16px 0' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#14284b', margin: '20px 0 12px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 14px' }
const button = { backgroundColor: '#1f5fbf', color: '#ffffff', borderRadius: '8px', padding: '12px 22px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#64748b', lineHeight: '18px' }
