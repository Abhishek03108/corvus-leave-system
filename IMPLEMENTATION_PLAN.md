# Offer Letter Module Migration — Implementation Plan

This running document tracks progress of migrating the Offer Letter module from the floating modal to a dedicated admin page.

## Progress Checklist

### Phase 1 — Backend (Completed)
- [x] Expand `buildPlaceholders()` to support option overrides (issueDate, joiningDate, endDate, durationValue, durationUnit, jobRole, workLocation).
- [x] Update `selectTemplate()` to prioritize `options.employmentType` over the database field.
- [x] Replace hardcoded "four (4) months" duration inside template functions (`intern3d`, `internGeneric`) with dynamic `${p.DURATION}` placeholders.
- [x] Update `wrap()`'s acceptance note to render duration dynamically.
- [x] Write new `parttime(p)` template function.
- [x] Update switch cases in `generateOfferLetterHtml()` to render `parttime` template.
- [x] Update email sending block in `worker.js` with professional body template.
- [x] Route emails to candidate Personal Email (TO), Corvus Official Email (CC, if assigned), and BCC careers@thecorvusstudio.com.

### Phase 2 — Frontend Page (Completed)
- [x] Create `src/pages/OfferLetterPage.jsx`
  - [x] Searchable employee autocomplete dropdown
  - [x] Calendar date picker for Joining Date
  - [x] Employment Type dropdown (5 options)
  - [x] Numeric input + unit selector for Internship, Contract, and Part-time durations
  - [x] Auto-computed End Date display (updated in real-time)
  - [x] Job Role autocomplete search (AVCG role list + Custom override input)
  - [x] Work Location dropdown (WFO, WFH, Hybrid)
  - [x] Email routing display (Personal email TO, Corvus CC, Careers BCC)
  - [x] Front-end validation rules for required fields
  - [x] Dynamic HTML iframe preview rendering
  - [x] PDF download button (using html2pdf.js)
  - [x] E-mail send button (using html2pdf.js for attachment)

### Phase 3 — Navigation & Routing (Completed)
- [x] Import `OfferLetterPage` in `App.jsx` and add `/offer-letter` protected admin-only route.
- [x] Add sidebar item for "Offer Letter" in `DashboardLayout.jsx` positioned between *Approval Center* and *Calendar*.
- [x] Map `/offer-letter` title in `DashboardLayout.jsx` helper `getPageTitle()`.

### Phase 4 — Cleanup (Completed)
- [x] Remove old "Offer Letter" and "Generate Offer Letter" buttons from the admin list and details inside `AdminDashboard.jsx`.
- [x] Delete `showOfferLetterModal` state and `OfferLetterModal` import.

---

## Technical Details

### End Date Calculation Formula
- End Date is computed in real-time: `Joining Date + (durationValue * durationUnit)`.
- If duration is 3 Months: `Joining Date + 3 months`.

### Email Routing Matrix
- **TO**: Candidate's Personal Email (always primary, checked/required)
- **CC**: Candidate's Corvus Work Email (if exists)
- **BCC**: `careers@thecorvusstudio.com` (always)
