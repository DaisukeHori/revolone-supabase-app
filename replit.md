# Revol One Management System

## Overview

This is a comprehensive subscription management system for Revol One, built as a full-stack TypeScript application. The system handles authentication, device tracking, subscription management via Stripe, and multi-factor authentication (MFA) capabilities. It integrates with external services including Kintone for device records, SendGrid for email communications, and Twilio for SMS services.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with modern green color scheme inspired by revol-one.com
- **Animations**: Framer Motion for smooth transitions

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Authentication**: Passport.js with local strategy and session management
- **Database**: PostgreSQL with Drizzle ORM
- **Build System**: Vite for frontend bundling, ESBuild for server bundling
- **Development**: TSX for TypeScript execution in development

### Key Architectural Decisions
1. **Full-stack TypeScript**: Ensures type safety across the entire application
2. **Monorepo Structure**: Client and server code in same repository for easier development
3. **Database-First Design**: Uses Drizzle ORM for type-safe database operations
4. **Session-Based Authentication**: Uses memory store for session management with planned PostgreSQL upgrade

## Key Components

### Authentication System
- Local authentication with username/password
- Multi-factor authentication (MFA) support via SMS and TOTP
- Password reset functionality via email
- Session management with express-session

### Device Management
- Integration with Kintone API for device record synchronization
- Device status tracking (出荷/返却)
- Store-based device grouping
- Real-time device status updates

### Subscription Management
- Full Stripe integration for payment processing
- Subscription lifecycle management
- Quantity-based pricing for Revonizer products
- Payment history and billing management

### Store Management
- Multi-store support per user
- Store information management
- Device assignment to stores
- Stripe customer integration

## Data Flow

### Authentication Flow
1. User submits credentials → Server validates → Session created
2. MFA verification if enabled → Additional security layer
3. Protected routes check authentication status

### Device Management Flow
1. Kintone API sync → Device records updated in local database
2. Status changes tracked with timestamps
3. Real-time updates reflected in UI

### Subscription Flow
1. Stripe webhook events → Database updates
2. Quantity changes → Automatic price calculations
3. Payment processing → Subscription status updates

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database (configured via DATABASE_URL)
- **Stripe**: Payment processing (requires secret and publishable keys)
- **SendGrid**: Email delivery service
- **Twilio**: SMS service for MFA
- **Kintone**: Device record management API

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `SENDGRID_API_KEY`: SendGrid API key
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Twilio authentication token
- `KINTONE_API_TOKEN_ALL`: Kintone API access token (requires access to App 21, App 22, App 23, and App 40)

## Deployment Strategy

### Production Build
- Frontend: Vite builds static assets to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Database: Drizzle migrations handle schema updates

### Replit Configuration
- **Platform**: Cloud Run deployment target
- **Port**: 5000 (mapped to external port 80)
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

### Database Migrations
- Uses Drizzle Kit for schema management
- Migration files stored in `/migrations` directory
- Push command: `npm run db:push`

## Changelog

```
Changelog:
- June 24, 2025. Initial setup
- January 03, 2025. Added Kintone App 21 integration for device subscription rental availability data
  - Extended Kintone service to query App 21 (https://e18p5.cybozu.com/k/21/)
  - Added "サブスク貸出の可不可" field to device data structure
  - Updated device API endpoints to include subscription rental availability
  - Added UI display for "販売済" (sold/bought outright) vs subscription devices
  - API token configuration needed: Current token requires App 21 access permissions
  - COMPLETED: Fixed field name mapping from "レボナイザー製造番号" to "文字列__1行__1" for App 21 queries
  - COMPLETED: Successfully retrieving device rental availability data ("可", "販売済", "不可" etc.)
  - COMPLETED: App 21 integration fully functional with correct API permissions and data display
- January 04, 2025. Added Kintone App 22 integration for repair history data
  - Integrated with App 22 (https://e18p5.cybozu.com/k/22/) for comprehensive repair history tracking
  - Added schema discovery functionality to identify field mappings dynamically
  - Key fields mapped: 製造番号, 修理ステータス, 修理項目, 確定修理金額, メインユニット交換故障項目
  - Created PurchasedDeviceModal for purchased devices with repair request and history tabs
  - Implemented real-time data fetching from Kintone App 22 instead of dummy data
  - Added repair request submission functionality with proper API endpoints
  - COMPLETED: App 22 schema successfully retrieved and mapped to UI components
  - COMPLETED: Real repair history data now displays in purchased device modal
- January 10, 2025. Enhanced repair request flow with duplicate prevention
  - Added App 23 integration for detailed work records linked to App 22 via "ルックアップ" field
  - Implemented timeline UI for work records with chronological sorting
  - Added duplicate repair request prevention: blocks new requests when repair is in progress
  - Created interactive pending repair display that navigates to repair history details
  - Work records now display using "ドロップダウン" field for work items
  - COMPLETED: Timeline visualization shows repair process progression chronologically
- January 11, 2025. Implemented comprehensive email address change system
  - Added ProfilePage (/profile) with email change functionality
  - Integrated SendGrid for verification email delivery with 6-digit codes
  - Implemented pre-verification Stripe customer checking to prevent orphaned updates
  - Added rollback mechanism for partial Stripe update failures
  - Email change process: Request → Verification → Database Update → Stripe Sync
  - Enhanced error handling: distinguishes between "no customers" vs "API failure"
  - COMPLETED: Full email change flow with Stripe synchronization and rollback protection
- January 11, 2025. Store addition system enhancements and legal compliance
  - Fixed JPY currency handling in pricing calculations (removed incorrect USD conversion)
  - Set free trial period to fixed 35 days for all new subscriptions
  - Created comprehensive Terms of Service and Privacy Policy pages
  - Implemented scroll-to-bottom confirmation requirement for legal documents
  - Added legal document acceptance flow integrated with store creation process
  - Enhanced form data persistence during legal document acceptance flow
  - Updated subscription creation to always use 35-day trial period
  - COMPLETED: Legal compliance framework with user-friendly document acceptance flow
- January 16, 2025. Multiple payment methods integration for subscription billing
  - Replaced CardElement with PaymentElement for expanded payment options
  - Added support for: card, Apple Pay, Google Pay, PayPal, bank transfer
  - Enhanced SetupIntent creation with automatic payment method detection
  - Updated subscription payment_settings to support multiple methods
  - Modified AddStorePage and BillingSettingsPage for unified payment UI
  - Implemented Stripe-compliant payment flow with proper authentication
  - Payment method priority: card → digital wallets → bank transfers
  - COMPLETED: Full multi-payment method support for subscription billing
- January 17, 2025. Master password authentication system
  - Added master password authentication for admin access to any user account
  - Implemented environment variable MASTER_PASSWORD (default: "RevonizerMaster2025!")
  - Created admin-only API endpoint /api/master-password/status for password management
  - Added AdminPage (/admin) with master password display and management interface
  - Enhanced authentication flow to support master password bypass for MFA
  - Admin access restricted to specific email addresses (hori@revol.co.jp)
  - COMPLETED: Master password system for administrative user access
- January 18, 2025. Email verification system implementation
  - Added email verification requirement for new user registrations
  - Added emailVerified, emailVerificationToken, and emailVerificationExpiry fields to users table
  - Implemented email verification flow with 24-hour token expiry
  - Created /verify-email page for email confirmation process
  - Added API endpoints for email verification and resend functionality
  - Updated authentication to require email verification before login
  - Integrated SendGrid for verification email delivery
  - Added registration success message with email verification instructions
  - COMPLETED: New users must verify email address before accessing the system
- January 18, 2025. Unified 6-digit verification code system implementation
  - Replaced email link verification with 6-digit code system for new user registration
  - Created new registration_verifications table for temporary registration data storage
  - Implemented 3-step registration flow: register → verify → success
  - Added dedicated RegisterPage with step-by-step user interface
  - Unified verification code system: both registration and email changes use 6-digit codes
  - Set consistent 30-minute expiry for all verification codes
  - Added resend functionality for registration verification codes
  - Updated authentication system to support new registration flow
  - Removed old registration form from login page, replaced with redirect to RegisterPage
  - COMPLETED: Consistent 6-digit code verification system across all features
- January 18, 2025. Automatic database initialization system
  - Implemented safe database schema auto-creation on application startup
  - Added database-init.ts module with idempotent schema creation
  - Database schema automatically created if tables don't exist
  - Guaranteed safety for Replit rebuilds - never destroys existing data
  - Uses Drizzle Kit push command for safe schema updates
  - Comprehensive error handling with graceful application shutdown on database errors
  - Updated README.md to reflect automatic database initialization
  - COMPLETED: Zero-maintenance database setup with absolute safety guarantees
- January 21, 2025. Fixed Salt error for user authentication
  - Resolved password format inconsistency between registration and login
  - Registration was using "salt:hash" format while login expected "hash.salt" format
  - Updated registration.ts to use consistent "hash.salt" format
  - Modified auth.ts to handle both formats for backward compatibility
  - Existing users with old format (2 users) can still login
  - New registrations will use the correct format
  - COMPLETED: Salt error fixed, both new and existing users can login successfully
- August 07, 2025. Enhanced deployment readiness for Cloud Run
  - Added comprehensive health check endpoints: /health (basic) and /health/detailed (with database connectivity)
  - Enhanced startup logging with detailed environment variable verification
  - Improved database initialization logging with performance metrics
  - Server already configured correctly for Cloud Run (0.0.0.0 host, PORT environment variable support)
  - Added production secret validation during startup to catch missing configurations early
  - Enhanced error reporting and diagnostic information for deployment troubleshooting
  - COMPLETED: All deployment fixes applied, server ready for Cloud Run production deployment
- August 07, 2025. Updated design system to match revol-one.com branding
  - Implemented actual color palette from revol-one.com website
  - Primary accent color: Orange (#ED8F0B) for main CTAs and active states
  - Secondary accent color: Yellow-green (#B6D01C / rgb(182, 208, 28)) for secondary actions
  - Added brown (#8B4513) for sophisticated accents and depth
  - Made input fields lighter with light gray backgrounds (bg-slate-50) and white on focus
  - Generated and integrated modern Revonizer favicon logo with orange theme
  - Added comprehensive meta tags for SEO and social sharing
  - Updated site title and description for beauty salon management focus
  - COMPLETED: Design system successfully aligned with revol-one.com actual branding colors
- August 19, 2025. SendGrid API key configuration updates
  - Updated API key name from SENDGRID_API_KEY to SENDGRID_REVOLONE_API_KEY for better service identification
  - Added backward compatibility fallback to existing SENDGRID_API_KEY
  - Fixed email sending functionality after previous API key reached credit limits
  - Updated config.ts to prioritize new SENDGRID_REVOLONE_API_KEY over legacy key
  - COMPLETED: Email verification system now functional with new API key configuration
- August 19, 2025. First-time login wizard with one-time execution
  - Added hasCompletedSetup field to users table for tracking setup status
  - Implemented automatic wizard display for first-time users only
  - Wizard displays once and never again, even if cancelled or closed
  - Added /api/mark-setup-complete endpoint to update setup flag
  - Wizard is skipped for users with existing Stripe customer data
  - After first display, users must manually click store registration button
  - COMPLETED: One-time wizard system prevents repeated automatic redirects
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```