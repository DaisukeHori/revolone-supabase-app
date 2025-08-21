# Revol One Management System

## Overview
This is a comprehensive subscription management system for Revol One, designed as a full-stack TypeScript application. Its primary purpose is to manage subscriptions via Stripe, track devices through Kintone integration, and handle user authentication with MFA. The system aims to streamline the management of Revonizer products and associated services, providing a robust platform for business operations in the beauty salon management sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Progress Update (Aug 21, 2025)
- ✓ Capacitor導入（iOS/Androidアプリ対応）
- ✓ 共有機能（Share API）の実装
- ✓ QRコード読み取り機能の実装
- ✓ ActionBarコンポーネントの作成（全ページ対応）
- ✓ iOS/Androidプラットフォーム権限設定の追加

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with a modern design system aligned with revol-one.com branding (Orange, Yellow-green, Brown color scheme).
- **Animations**: Framer Motion

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Authentication**: Passport.js (local strategy, session-based, MFA support)
- **Database**: PostgreSQL with Drizzle ORM
- **Build System**: Vite (frontend), ESBuild (server)
- **Development**: TSX for TypeScript execution

### Key Architectural Decisions
- **Full-stack TypeScript**: Ensures type safety across the entire application.
- **Monorepo Structure**: Client and server code in the same repository for simplified development.
- **Database-First Design**: Utilizes Drizzle ORM for type-safe database operations and schema management with automatic initialization.
- **Session-Based Authentication**: Manages user sessions securely.
- **Unified 6-digit Verification Codes**: For consistent user verification across registration and email changes.
- **Multi-payment Method Integration**: Supports various payment options via Stripe PaymentElement.
- **Master Password Authentication**: For administrative access.
- **First-time Login Wizard**: Guides new users through initial setup.
- **Auto-Database Migration**: Automatic schema initialization ensures GitHubデプロイメント互換性.
- **Environment-Agnostic Design**: Works seamlessly across development, staging, and production environments.

### Key Features
- **Authentication System**: Local login, MFA (SMS/TOTP), password reset, email verification, and master password for admin access.
- **Device Management**: Integration with Kintone API for device record synchronization, status tracking, and repair history.
- **Subscription Management**: Full Stripe integration for payment processing, subscription lifecycle management, quantity-based pricing, and billing.
- **Store Management**: Multi-store support, store information management, and device assignment.
- **Email Change System**: Secure email updates with Stripe synchronization and rollback.
- **Legal Compliance**: Integration of Terms of Service and Privacy Policy acceptance.
- **Mobile App Support**: Capacitor integration for iOS/Android apps with Share API and QR code scanning capabilities.

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database.
- **Stripe**: Payment processing for subscriptions.
- **SendGrid**: Email delivery service (for verification, password resets).
- **Twilio**: SMS service for MFA.
- **Kintone**: Device record management API (integrates with App 21, App 22, App 23, and App 40).

### Environment Variables (Key examples)
- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `SENDGRID_REVOLONE_API_KEY` (with fallback to `SENDGRID_API_KEY`)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `KINTONE_API_TOKEN_ALL`