# Revonizer Management System

## Overview

This is a comprehensive device and subscription management system for Revonizer, built as a full-stack TypeScript application. The system handles authentication, device tracking, subscription management via Stripe, and multi-factor authentication (MFA) capabilities. It integrates with external services including Kintone for device records, SendGrid for email communications, and Twilio for SMS services.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom Japanese-inspired patterns and professional theme
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
- `KINTONE_API_TOKEN`: Kintone API access token (requires access to both App 40 and App 21)

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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```