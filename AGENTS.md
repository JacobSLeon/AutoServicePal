# AGENTS.md - Development & AI Agent Instructions

## Project Overview
AutoServicePal is a cross-platform (iOS, Android, Web) vehicle service history tracking application. It centralizes both Dealer and Private (Self-performed) maintenance records into a single, verified digital ledger.

### Tech Stack & Architecture
* **Frontend:** React Native (iOS, Android, React Native Web) with Redux Toolkit for state management.
* **Backend:** Node.js with Express (RESTful JSON API).
* **Database:** PostgreSQL (relational storage for users, vehicles, service logs, work items) + Redis (caching).
* **Storage:** Cloud Object Storage (AWS S3 or GCP Cloud Storage) for compressed proof receipts/invoices and V5 logbook images[cite: 1, 2].
* **Authentication:** Firebase Auth / JWT-based custom auth with Role-Based Access Control (`Guest`, `VehicleOwner`, `Admin`).
* **Notifications:** Firebase Cloud Messaging (FCM).
* **External APIs:** UK DVLA Vehicle Enquiry Service API for vehicle specification auto-population.

---

## Agent Guidelines & System Rules

1. **Strict Fidelity to SOW Scope:**
   * Implement only features outlined in the MVP scope. Do not build automated OCR invoice readers, real-time GPS recommendations, or automated VIN lookups during this phase[cite: 1, 2].
2. **Offline-First Guest Handling:**
   * Unauthenticated guests can add vehicles locally to view details and check DVLA MOT/Tax dates.
   * Unauthenticated local data is not persisted across app reinstalls.
   * Prompt login when users try to add service records or upload V5 proof documents.
3. **Verification Workflows:**
   * Vehicles are marked as "Verified" (displaying a green tick) only after an Admin manually validates the uploaded front page of the V5 logbook.
   * Service record work items are verified individually by Admins based on attached proof images (up to 10 images per service record).
4. **Security & Authentication Protocol:**
   * Enforce password rules: Minimum 8 characters, at least 1 uppercase letter, and at least 1 number.
   * Account Lockout: Lock account for 24 hours after 10 failed login attempts and send an email alert.
   * MVP Forgot Password: Generate a secure random password, update the DB, and email it to the user.
5. **Asset Processing:**
   * Compress all user-uploaded images client-side prior to transfer and storage.

---

## Repository Directory Structure
autoservicepal/
├── apps/
│   ├── mobile-web/                  # React Native / Expo cross-platform app
│   │   ├── src/
│   │   │   ├── components/          # Reusable UI components
│   │   │   ├── screens/             # Screen views (Home, VehicleDetails, AddService, Admin)
│   │   │   ├── navigation/          # React Navigation stacks & tabs
│   │   │   ├── store/               # Redux Toolkit slices & RTK Query
│   │   │   └── utils/               # Image compression & helpers
│   └── backend/                     # Node.js Express REST API
│       ├── src/
│       │   ├── controllers/         # Auth, Vehicle, Service, Admin, Report controllers
│       │   ├── models/              # PostgreSQL models & schemas
│       │   ├── routes/              # Versioned REST endpoints (/api/v1/...)
│       │   ├── middlewares/          # Auth, RBAC, Rate-limiting, Image Uploads
│       │   └── jobs/                # Daily and Weekly scheduled report cron jobs
└── AGENTS.md

---

## Development Roadmap & Execution Phases

* **Phase 1: Database Schemas & Auth System**
  * Build PostgreSQL tables (`users`, `vehicles`, `v5_verifications`, `service_records`, `work_items`, `service_proofs`).
  * Build JWT/Firebase auth endpoints and 10-failed-attempt account lockout middleware[cite: 1, 2].
* **Phase 2: DVLA API & Vehicle Management**
  * Integrate DVLA Vehicle Enquiry Service API for registration lookup.
  * Build guest local mode, cloud vehicle sync, drag-and-drop vehicle reordering, and search (for $>10$ cars).
  * Implement V5 document upload and Admin V5 review queue.
* **Phase 3: Service Logging & Work Item Verification**
  * Implement service record creation defaulting to `Service-<YYYY-MM-DD>`.
  * Build multiselect work items dropdown with standard categories (*Oil & Filter, Brakes, Spark Plugs, Timing Belt, Tyres, etc.*).
  * Implement multi-image proof upload (up to 10 images per record).
* **Phase 4: Admin Dashboard**
  * Create review interfaces for V5 ownership approval/rejection and granular work-item verification (toggling green tick badges).
* **Phase 5: Automated Operational Reports**
  * Implement daily cron jobs (multi-account registrations, account deletions) and weekly cron jobs (login logs, inactive user tracking, activity summary).