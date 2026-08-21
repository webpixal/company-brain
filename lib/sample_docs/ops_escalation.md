# Human-in-the-Loop Operations SOP

## Escalation Queue
When the AI call agent cannot confidently resolve a patient request (e.g. complex insurance question, complaint, emergency), the call is flagged and routed to the live ops queue.

- **Target response time:** 90 seconds during business hours (8am-6pm local), 5 minutes after hours.
- **Ops agents** work in shifts covering 3 time zones to maintain 90-second SLA across all US customers.
- Escalations are logged in the internal dashboard with call transcript, flagged reason, and patient PMS record link.

## Common Escalation Reasons (last 30 days, illustrative)
1. Insurance verification complexity — 34%
2. Patient requesting to speak to a human — 28%
3. Emergency/urgent symptom reported — 19%
4. Scheduling conflict AI couldn't resolve — 12%
5. Other — 7%

## Quality Review Process
A sample of 5% of all AI-handled calls (both resolved and escalated) is reviewed weekly by the Ops Quality team to identify patterns for AI model improvement. Findings are shared with the Engineering team in the weekly sync.

## Escalation Agent Training
New ops agents shadow for 1 week before taking live escalations. Training covers PMS systems (Dentrix, Eaglesoft, Open Dental), HIPAA basics, and de-escalation scripts.
