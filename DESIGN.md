# ابتدائية الحبيل — UI contract
## Research
Official Ministry site https://www.moe.gov.sa fetched; use its current /assets/logos/moe-logo-white.svg unmodified. Local omh reference CLI unavailable. No student data in UI/repository.
## Identity
Operational, calm, legible Arabic educational workspace. Single evergreen identity strip with official logo; no decorative hero cards. Audience teachers on phones and desktops. Credit exactly: صمم بواسطة أ. أفراح عسيري.
## Tokens
Background #f3f6f5/on #172e2a; card #ffffff/on #172e2a; primary #075c49/on #ffffff; muted #526863; border #dce5e1; focus #a56d13; warning #fff3d6/on #705114. Radius 12px; spacing 4/8/12/16/24/32/48. Borders 1px, no glass or gradients. Typeface Tahoma, Arial, sans-serif, body 16px/1.8; headings 24/32/40, 700 weight.
## Layout & components
RTL; max content 1400px. Desktop navigation 240px sidebar; below 960px horizontal scroll navigation; phone filters stack, editable table owns horizontal scroll. Inputs/buttons at least 44px, clear keyboard focus. Login, teacher workspace, roster empty state, reports and account placeholders. No fabricated student records or metrics. Preview button is explicitly not authentication; real login disabled until backend is connected. All data operations disabled, no pretend saves. Loading/error/unconnected states explicitly messaged.
## Motion & surfaces
120ms color transition only; reduced motion disables transitions. Borders provide hierarchy; one soft shadow on login only.
## QA
Check 320/375/768/1280/1440/1920 widths, no document overflow, logo loaded, navigation and preview login tested, exact credit and absent prohibited terminology. Performance budget target LCP <=2.5s on mid-range mobile/4G; no measurement claimed before audit. No CJK requirement. Native form semantics and keyboard navigation. Authentication and Sheets connection are not implemented in this UI phase.
