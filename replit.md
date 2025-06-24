# Revonizer Management System

## Overview

This is a full-stack web application for managing Revonizer device rentals and subscriptions. The application handles customer management, device tracking, subscription billing through Stripe, and multi-factor authentication. It's built with modern web technologies and follows a monorepo structure.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom Japanese-inspired design patterns
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Animation**: Framer Motion for smooth UI transitions

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Authentication**: Passport.js with local strategy and session management
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Payment Processing**: Stripe integration for subscription management
- **Email Service**: SendGrid for transactional emails
- **Two-Factor Authentication**: SMS via Twilio, TOTP with Speakeasy

### Key Components

#### Authentication & Security
- Session-based authentication with memory store
- Multi-factor authentication (MFA) support with SMS and TOTP
- Password reset functionality with secure token generation
- Role-based access control for store management

#### Database Schema
- **Users**: Authentication, profile, and MFA settings
- **Stores**: Customer business information linked to Stripe customers
- **Devices**: Hardware tracking with serial numbers and status
- **Email Mappings**: History of email address changes for stores

#### External Integrations
- **Stripe**: Subscription management, payment processing, customer data
- **Kintone**: Device inventory and shipping status tracking
- **SendGrid**: Email notifications and password reset emails
- **Twilio**: SMS for two-factor authentication

## Data Flow

1. **User Authentication**: Users log in with username/password, optionally completing MFA
2. **Store Management**: Users can create and manage multiple store profiles
3. **Device Tracking**: System syncs device status from Kintone API
4. **Subscription Management**: Stripe handles billing, with custom logic for Revonizer pricing tiers
5. **Email Management**: Track and manage email address changes for store communications

## External Dependencies

### Production Services
- **PostgreSQL**: Primary database for application data
- **Stripe**: Payment processing and subscription management
- **SendGrid**: Email delivery service
- **Twilio**: SMS service for authentication
- **Kintone**: External system for device inventory management

### Development Tools
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Fast JavaScript bundler for production builds
- **TypeScript**: Type safety across frontend and backend

## Deployment Strategy

- **Platform**: Replit with Google Cloud Run deployment target
- **Build Process**: Vite builds frontend assets, ESBuild bundles server code
- **Environment**: Multi-environment configuration (development/production)
- **Database**: PostgreSQL provisioned through Replit
- **Static Assets**: Served through Express with Vite integration in development

## Changelog

- June 24, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.