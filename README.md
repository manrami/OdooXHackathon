# DayFlow 🚀

**DayFlow** is a premium, enterprise-grade Human Resource Management System (HRMS) designed for modern organizations. Built with a focus on high-fidelity user experience and robust functionality, DayFlow streamlines employee onboarding, attendance tracking, and monthly payroll processing within a stunning, glassmorphic dark-mode interface.

## ✨ Core Features

### 🎨 Premium User Experience
- **Enterprise Dark Theme**: A deep-navy, high-contrast interface designed for professional environments.
- **Glassmorphic UI**: Modern aesthetic with subtle translucency and neon accents.
- **Responsive Layout**: Optimized for both high-end desktop workstations and administrative tablets.

### 👤 Identity & Onboarding
- **Corporate ID Login**: Sophisticated identity mapping allows employees to log in using corporate IDs.
- **Seamless Onboarding**: Effortless employee creation with automatic system initialization.
- **Role-Based Access**: Secure differentiation between Administrator and Employee environments.

### 📊 Administrative Suite
- **Interactive Dashboard**: Real-time insights into organization-wide attendance and payroll status.
- **Employee Directory**: Centralized management of staff records and department assignments.
- **Attendance Intelligence**: Automated tracking of daily check-ins and check-outs.

### 💸 Financial Management
- **Automated Payroll**: One-click monthly salary generation with support for INR (₹) formatting.
- **Structured Salary Tiers**: Customizable salary structures for different seniority levels.
- **Financial History**: Persistent record-keeping of all historical payroll transactions.

## 🛠️ Technical Foundation

DayFlow is powered by a modern, high-performance tech stack:

- **Frontend**: React 18 with Vite for ultra-fast development and optimized bundles.
- **Language**: TypeScript for enterprise-level type safety and reliability.
- **Styling**: Tailwind CSS for high-performance, utility-first UI development.
- **Components**: shadcn/ui for accessible, premium-feel interface elements.
- **Backend**: Supabase for real-time database capabilities and secure authentication.
- **Automation**: EmailJS for automated credential transmission and notifications.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```sh
   git clone https://github.com/manrami/OdooXHackathon.git
   cd OdooXHackathon
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and add your Supabase and EmailJS credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
   VITE_EMAILJS_SERVICE_ID=your_id
   VITE_EMAILJS_TEMPLATE_ID=your_template
   VITE_EMAILJS_PUBLIC_KEY=your_key
   ```

4. **Start Development Server**:
   ```sh
   npm run dev
   ```

---

## 🛰️ Architecture Highlights

DayFlow utilizes a secure, server-side identity architecture. Employee login is handled via specialized database functions that map corporate IDs to internal authentication secrets, ensuring that end-users enjoy a simplified login experience without compromising organization security.
