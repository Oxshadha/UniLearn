# UniLearn Dashboard 🎓

UniLearn is a comprehensive academic management dashboard built to streamline the administration of university modules, student batches, past papers, and coursework assignments.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://uni-dashboard-kappa.vercel.app)

## 🚀 Tech Stack

This project is built with a modern, high-performance web stack:

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library:** [React 19](https://react.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Components:** [Radix UI](https://www.radix-ui.com/) / shadcn/ui
- **Language:** TypeScript

## ✨ Key Features

- **Module Management:** Create, clone, and organize academic modules across different semesters.
- **Batch System:** Seamlessly assign and manage students by batches and academic years.
- **Content Hub:** Upload, edit, and organize past papers and module content.
- **Rich Text Editing:** Integrated rich-text editor (with DOMPurify) for creating assignments and formatted academic content.
- **Role-based Access:** Secure Admin and Student dashboards with Supabase Row Level Security (RLS).
- **Notifications:** Real-time system notifications and history tracking.

## 🛠️ Getting Started

### Prerequisites
Make sure you have Node.js (v20+) and npm installed on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/Oxshadha/UniLearn.git
cd UniLearn
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup
The required SQL schema and bootstrap tables can be found in the `database/` folder. Run these scripts in your Supabase SQL Editor to initialize the database:
- `database/supabase_schema.sql`
- `database/BOOTSTRAP_MISSING_TABLES.sql`

### 5. Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🚀 Deployment

This project is configured for seamless deployment on [Vercel](https://vercel.com).
Make sure to configure the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables in your Vercel project settings before deploying.

---
*Developed for modern university administration.*
