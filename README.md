# Cyber Sentinel 2K26 — National Technical Symposium Portal

Modern, high-performance Single Page Application (SPA) built with **React 18**, **Vite**, and **Supabase** for managing end-to-end registrations, payments, team matchmaking, coordinator workflows, food token distribution, and live event gate attendance.

---

## 🚀 Key Features

### 🌐 1. Public Portals
- **Portal Hub (`/`)**: Central visual directory for participants, team leaders, and event staff with live quick-links.
- **Participant Registration (`/register`)**:
  - Live dynamic fee calculator based on selected symposium day (`DAY_1`, `DAY_2`, `BOTH`) and special events.
  - Payment QR display with instant UPI intent generation.
  - Secure screenshot proof upload directly to Supabase Storage bucket (`payment-screenshots`).
  - Calls `public-register` Supabase Edge Function to safely bypass RLS while validating fees.
- **Registration & Pass Check (`/check`)**:
  - Lookup registration status using registered email and phone number.
  - Digital Cyber Pass Badge rendering with live QR code generation (1000x1400 high-res PNG download & print).
  - Status progression tracking (`PENDING_VERIFICATION` → `VERIFIED` → `REJECTED`).
- **Team Creation & Matchmaking (`/team/create` & `/team/join`)**:
  - Event team packaging and team leader verification.
  - Generates secure alphanumeric team join codes.
  - Open team search directory and member roster join flow.
- **Public Pass Verification (`/verify/qr/:token`)**:
  - Instant mobile-friendly pass validation screen for symposium marshals.

---

### 🛡️ 2. Admin Workspace (`/admin`)
- **Admin Authentication (`/admin/login`)**: Protected Supabase Auth login verifying active admin status in `profiles`.
- **Admin Dashboard (`/admin/dashboard`)**:
  - Real-time symposium statistics (total registrations, verified payments, total revenue, gate check-in counts).
  - Day base registration fee configuration (`DAY_1`, `DAY_2`).
  - Special events catalog management and fee adjustment.
- **Registrations Directory (`/admin/registrations`)**:
  - Multi-parameter search and status/day filters.
  - Full registration record detail inspector modal.
- **Payment Verification Hub (`/admin/payments`)**:
  - Audit UPI UTR transactions with lightbox image proof preview.
  - One-click verify (`confirm_registration`) or reject with audited reason (`reject_payment`).
  - Direct Gmail confirmation email launcher.
- **Events Management (`/admin/events`)**: Create, inspect, and toggle technical & non-technical events.
- **Coordinators Management (`/admin/coordinators`)**:
  - Create coordinator accounts with dedicated login credentials.
  - Assign and revoke event and special event responsibilities.
- **Teams Directory (`/admin/teams`)**: Form, inspect, and monitor team rosters and member capacities.
- **Attendance & Audit (`/admin/attendance`)**: Unified timeline of all event scans across symposium sessions.
- **Gate Entry / Main Attendance (`/admin/main-attendance`)**:
  - Integrated camera QR scanner with automatic environment-facing camera support.
  - Manual CS-ID lookup fallback with inspection dialog.
  - Calls `inspect_main_attendance` and `record_main_attendance`.
- **Food Token Desk (`/admin/food-tokens`)**:
  - Inspect meal token availability via badge QR scan or CS-ID.
  - One-click token issuance via `issue_food_token` RPC.
- **Broadcast Announcements (`/admin/announcements`)**:
  - Target announcements to specific groups (All, Verified, Checked-in).
  - Stores in database and triggers Gmail broadcast with pre-filled BCC list.
- **Symposium Reports (`/admin/reports`)**:
  - 1-click CSV export of: Registrations, Payments, Attendance & Food Tokens, Team Members, and Event Attendance Matrix.

---

### 🎯 3. Coordinator Workspace (`/coordinator`)
- **Coordinator Authentication (`/coordinator/login`)**:
  - Authenticates via custom Supabase RPC `coordinator_login(p_email, p_password)`.
  - Injects `x-coordinator-token` into custom Supabase client headers to satisfy database RLS policies.
- **Coordinator Dashboard (`/coordinator/dashboard`)**: Overview of events assigned specifically to the logged-in coordinator.
- **Assigned Participants (`/coordinator/participants`)**: Scoped attendee list for assigned events.
- **Assigned Payments (`/coordinator/payments`)**: Payment verification and proof inspection for event registrants.
- **Assigned Teams (`/coordinator/teams`)**: Roster breakdown for teams competing in assigned tracks.
- **Event Attendance Scanner (`/coordinator/attendance`)**:
  - Select active assigned event track.
  - Camera QR scanner & manual registration code lookup.
  - Calls `inspect_coordinator_event_attendance` and `record_coordinator_event_attendance`.
  - Displays live recent attendance audit table.
- **Event Announcements & Emails (`/coordinator/announcements` & `/coordinator/emails`)**:
  - Send direct notices to participants enrolled in assigned events.
  - Interactive recipient checklist and 1-click Gmail broadcast.
- **Coordinator CSV Reports (`/coordinator/reports`)**:
  - Export Assigned Participants CSV.
  - Export Event Attendance Sheet CSV.

---

## 📁 Clean Directory Structure

```
CS-backend copy/
├── _redirects                     # SPA client-side routing fallback
├── index.html                     # Vite HTML entry with Cyber aesthetic fonts
├── package.json                   # Dependencies & scripts
├── vite.config.js                 # Rollup chunking & dev server config
├── legacy_static_backup/          # Safe backup of legacy static HTML/JS files
├── supabase/                      # Supabase Database & Edge Functions
│   ├── migrations/                # Consolidated SQL schema & RPC migrations
│   └── functions/                 # Supabase Edge Functions (Deno/TypeScript)
│       ├── check-registration/
│       ├── get-registration-fees/
│       ├── public-register/
│       ├── record-main-attendance/
│       ├── send-email/
│       └── team-management/
└── src/
    ├── main.jsx                   # React root entry point
    ├── App.jsx                    # Central client-side routing & legacy aliases
    ├── index.css                  # Custom cyber aesthetic design system
    ├── config/
    │   └── supabase.js            # Supabase base client & coordinator client factory
    ├── context/
    │   ├── AuthContext.jsx        # Admin & Coordinator dual-auth state provider
    │   └── ToastContext.jsx       # Floating notification toast provider
    ├── services/
    │   ├── registrationService.js # Public Edge Functions & RPC service
    │   ├── adminService.js        # Admin table queries & RPC service
    │   ├── coordinatorService.js  # Coordinator event-scoped RPC service
    │   └── reportService.js       # CSV exporters for all 5 symposium datasets
    ├── utils/
    │   ├── helpers.js             # Currency formatting, dates, QR token parsing, Gmail helper
    │   └── qrBadge.js             # High-resolution digital pass badge generator
    ├── components/
    │   ├── common/
    │   │   ├── Navbar.jsx         # Cyber portal navigation bar
    │   │   ├── Footer.jsx         # Symposium footer
    │   │   ├── Modal.jsx          # Accessible dialog modal
    │   │   ├── DetailsModal.jsx   # Generic key-value record inspector modal
    │   │   ├── ImagePreviewModal.jsx # Payment proof lightbox viewer
    │   │   ├── QrScannerModal.jsx # Camera QR code scanner & manual ID lookup
    │   │   └── ToastContainer.jsx # Cyber-styled toast popups
    │   └── ui/
    │       ├── StatCard.jsx       # Glowing metric dashboard card
    │       └── StatusBadge.jsx    # Standardized color-coded status badge
    └── pages/
        ├── public/                # Public participant pages
        │   ├── PortalHub.jsx
        │   ├── Register.jsx
        │   ├── CheckStatus.jsx
        │   ├── TeamCreate.jsx
        │   ├── TeamJoin.jsx
        │   └── QrPassVerify.jsx
        ├── admin/                 # Administrator portal pages
        │   ├── AdminLayout.jsx
        │   ├── AdminLogin.jsx
        │   ├── AdminDashboard.jsx
        │   ├── AdminRegistrations.jsx
        │   ├── AdminPayments.jsx
        │   ├── AdminEvents.jsx
        │   ├── AdminCoordinators.jsx
        │   ├── AdminTeams.jsx
        │   ├── AdminAttendance.jsx
        │   ├── AdminMainAttendance.jsx
        │   ├── AdminFoodTokens.jsx
        │   ├── AdminAnnouncements.jsx
        │   ├── AdminEmails.jsx
        │   └── AdminReports.jsx
        └── coordinator/           # Coordinator portal pages
            ├── CoordinatorLayout.jsx
            ├── CoordinatorLogin.jsx
            ├── CoordinatorDashboard.jsx
            ├── CoordinatorParticipants.jsx
            ├── CoordinatorPayments.jsx
            ├── CoordinatorTeams.jsx
            ├── CoordinatorAttendance.jsx
            ├── CoordinatorAnnouncements.jsx
            ├── CoordinatorEmails.jsx
            └── CoordinatorReports.jsx
```

---

## 🛠️ Development & Deployment

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
The application will start at `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
```
Optimized bundle assets are output to `dist/`.

### 4. Deploying
The `dist/` directory includes `_redirects` and is ready for instant one-click deployment on Netlify, Vercel, Cloudflare Pages, or Firebase Hosting.
