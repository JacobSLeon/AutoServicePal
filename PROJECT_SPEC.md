AutoServicePal — Technical Specification & Statement of Work1. Executive SummaryAutoServicePal is a cross-platform mobile and web application designed to centralize and validate vehicle service history[cite: 1, 2]. The platform allows both Dealer and Private (Self-performed) maintenance records to exist in a single verified digital ledger[cite: 1, 2].Key Value PropositionsCentralized Digital Ledger: Eliminates physical paperwork and lost receipts[cite: 1].Proof-Backed Verification: Users upload image proof (invoices, receipts, dealer stamps) for manual admin validation[cite: 1, 2].Resale Value: Provides a verified maintenance log to increase used vehicle resale value[cite: 1].UK DVLA Integration: Fetches vehicle specs, MOT expiry, and Tax status via official UK government APIs.  2. Scope DefinitionIncluded in MVPCross-platform React Native app (iOS, Android, Web)[cite: 1, 2].Dual user modes: Unauthenticated Guest (local session) and Logged-In User (cloud synced).  UK Registration lookup via DVLA Vehicle Enquiry API (populates Make, Model, Sub-model, Colour, MOT & Tax dates).  V5 logbook photo upload for ownership verification.  Service logging (Dealer or Self) with default naming Service-<YYYY-MM-DD>.  Predefined multiselect work items dropdown (Full Service, Interim Service, Oil & Filter, Brakes, Spark Plugs, Timing Belt, Tyres, etc.).  Attachment of up to 10 proof images per service record.  Admin Dashboard for V5 approvals and granular work-item verification (displaying green ticks).  Security lockout (10 failed login attempts $\rightarrow$ 24-hour lock + notification email).  Scheduled daily and weekly administrative operational reports.  Excluded from MVP (Future Enhancements)Automated OCR/AI invoice reading[cite: 1, 2].Automated VIN lookup APIs (e.g., Smartcar/VinAudit)[cite: 1].Fleet management tools & Garage booking monetization pipelines[cite: 1].3. User Roles & Access ControlFeature / ActionGuest ModeVehicle OwnerPlatform AdminLookup Reg via DVLA APIYes  Yes  Yes  View MOT & Tax Expiry DatesYes  Yes  Yes  Add VehicleYes (Local session only)  Yes (Cloud Persisted)  Yes  Upload V5 Logbook PhotoNo  Yes  N/ALog Service Records & Proof ImagesNo  Yes (Up to 10 photos)  Yes  Verify V5 & Work ItemsNo  No  Yes  Receive Operational ReportsNo  No  Yes  4. Screen-by-Screen Functional SpecificationsScreen 1: Home / Vehicle List ScreenGuest View: Shows input banner for registration search, "SIGN IN / REGISTER" button, and local vehicle cards. Unverified local cards do not display green ticks.  Logged-In View: Verified vehicles display a prominent Green Tick Badge once approved by Admin. Includes a top-right burger menu (Profile, Messages, Contact Us, Manage Vehicles, FAQs, Terms, Privacy Policy, Logout).  Vehicle Search: Activates automatically at the top of the screen when managing $>10$ vehicles.  Reordering & Removal: List supports drag-and-drop reordering. Clicking pencil icon opens slide-up options with "Remove Vehicle" (triggers confirmation modal).  Screen 2: Add / Edit Vehicle ScreenInput: Registration Number.  Auto-Populated Fields: Make, Model, Sub-model, Colour (via DVLA API).  V5 Verification: "Scan V5" button (logged-in users only) to upload front image of logbook. Displays status badge ("Pending Verification - normally checked within 2 hours").  Screen 3: Vehicle Landing / Overview ScreenHeader Card: Displays Registration badge alongside MOT Expiry Date and TAX Expiry Date.  Access Control: If unauthenticated or V5 is unverified, displays warning banner ("Log in to access service record" or "V5 Pending Verification") and disables service addition.  Service Feed: Displays past service entries sorted chronologically (newest first).  Screen 4: Add / Edit Service Record ScreenName: Defaults to Service-<YYYY-MM-DD>.  Type: Selection between Dealer and Self (Private).  Date: Native date picker defaulting to current date.  Work Carried Out: Scrollable summary container showing added work items, verification status, and an 'X' removal button.  Multiselect Dropdown Options: Full Service, Interim Service, Oil, Oil and filter, Air Filter, Antifreeze, Brake Discs Front, Brake Pads Front, Brake Discs Back, Brake Pads Back, Glow Plugs, Spark Plugs, Fuel filter, Pollen filter, Brake fluid, Transmission fluid, Distributor Cap, Rotor Arms, Tensioner, Timing Belt, Bulb (custom text), Wipers Front/Back, Battery, Windscreen, Exhaust, Tyres, Other (custom text).  Proof Upload: "Scan more proof" button allowing up to 10 compressed images per record. Displays confirmation toast: "Thank you for providing evidence, this will be used to validate the work carried out within 24 hours. You can upload up to 10 images per service record."  Screen 5: Auth & SecurityRegistration: Name (as on V5), Email, Password, Password Confirmation. Rules: Minimum 8 characters, at least 1 uppercase letter, at least 1 number.  Login & Lockout: Email, Password, "Remember Me", "Forgot Password?". Lockout rule: 10 failed attempts locks account for 24 hours and dispatches email alert.  Forgot Password: MVP emails user a newly generated random password and updates credentials.  Screen 6: Admin DashboardV5 Verification Queue: Displays account name, registration, uploaded V5 image. Admin approves (grants green tick badge) or rejects (with free-text reason sent to user).  Service Verification Queue: Displays service record, attached images, and work items. Admin toggles individual work items as verified (renders green tick) and attaches notes.  5. Relational Database Schema (PostgreSQL)SQLCREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name_v5 VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE NULL,
    role VARCHAR(50) DEFAULT 'USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(20) NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    sub_model VARCHAR(100),
    colour VARCHAR(50),
    is_v5_verified BOOLEAN DEFAULT FALSE,
    v5_status VARCHAR(50) DEFAULT 'UNVERIFIED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE v5_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    v5_image_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    rejection_reason TEXT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE TABLE service_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    record_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(20) NOT NULL, -- 'Dealer', 'Self'
    service_date DATE NOT NULL,
    admin_note TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_record_id UUID REFERENCES service_records(id) ON DELETE CASCADE,
    item_key VARCHAR(100) NOT NULL,
    custom_description TEXT NULL,
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE service_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_record_id UUID REFERENCES service_records(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL
);
6. REST API Endpoints
- POST /api/v1/auth/register — Register user (enforces 8+ chars, 1 uppercase, 1 number).  
- POST /api/v1/auth/login — Authenticate user (enforces 10-attempt failed lockout)
- POST /api/v1/auth/forgot-password — Generate & email new password
- GET /api/v1/dvla/lookup/:reg — Fetch vehicle details, MOT & Tax dates from DVLA API
- GET /api/v1/vehicles — Fetch user vehicles
- POST /api/v1/vehicles — Add vehicle to account
- POST /api/v1/vehicles/:id/v5 — Upload V5 image for verification
- DELETE /api/v1/vehicles/:id — Delete vehicle and associated records
- GET /api/v1/services/vehicle/:id — Get service history (newest first)
- POST /api/v1/services — Create service record, work items, and proof images
- POST /api/v1/admin/v5-review/:id — Approve or reject V5 verification
- POST /api/v1/admin/work-item-verify — Toggle verified status for specific work items

7. Administrative Operational Reports
### Daily Scheduled Reports
- Multi-Account Registrations: List of vehicle registrations added across multiple accounts in the last 24 hours
- Account Deletion Log: Summary of user account deletions executed in the last 24 hours
### Weekly Scheduled ReportsUser Login Summary: List of all user accounts and their last login timestamps
- Inactive Users Report: List of registered users inactive for 30, 60, or 90 days
- Vehicle Ownership Distribution: Summary of users and associated vehicle counts
- Security Audit Log: Summary of failed login attempts
- Activity Volume Report: Breakdown of users, total service records logged, and total work items added
