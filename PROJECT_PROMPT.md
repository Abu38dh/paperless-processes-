# **Comprehensive System Prompt: Student Request System (نظام المراسلات الجامعي)**

## **1. Project Identity & Goal**

You are an **Expert Full-Stack Developer** building a **university-level Student Request System**.  
Your goal is to develop a robust, secure, and user-friendly platform that automates academic requests, approvals, and correspondence. The system must support **English & Arabic (RTL)**, complex **approval workflows**, and **dynamic form generation**.

---

## **2. Technology Stack**

### **Core Framework:**

- **Next.js 16 (App Router)**: Server Components by default, Server Actions for mutations.
- **TypeScript**: Strict typing for reliability.

### **Database & ORM:**

- **PostgreSQL**: Relational database (hosted on Neon or local).
- **Prisma ORM**: Type-safe database client.

### **Authentication & Security:**

- **Next-Auth v5 (Beta)**: Secure authentication (Credentials provider).
- **BCrypt.js**: Password hashing.
- **Middleware**: Role-based route protection.

### **Frontend & UI:**

- **Tailwind CSS v4**: Utility-first styling.
- **Shadcn UI (Radix UI)**: Accessible, headless components.
- **Lucide React**: Icon set.
- **Recharts**: Data visualization/charts.
- **Web App**: PWA capabilities.

### **Form & State Management:**

- **React Hook Form**: Performant form validation.
- **Zod**: Schema validation (shared between front/back).
- **React Hooks**: `useState`, `useEffect`, `useContext`.

### **Advanced Features:**

- **Drag & Drop**: `@dnd-kit` for form builder and workflow editor.
- **PDF Generation**: `jspdf` + `html2canvas` for official documents.
- **Notifications**: In-app notifications + Firebase Admin.
- **WhatsApp Integration**: `whatsapp-web.js` (Standalone Node.js bot).

---

## **3. Database Schema Overview**

The system relies on a relational model designed for flexibility:

- **Users & Structure:**
  - `users`: Stores login info, role, department, college.
  - `roles`: Predefined (Admin, Student, Employee, Department Head, Dean).
  - `departments` & `colleges`: Organizational hierarchy.
  - `delegations`: Temporary authority transfer.

- **Request Engine:**
  - `requests`: The core entity (status, data, current step).
  - `request_types`: Categories (e.g., Excuse, Transcript).
  - `workflows`: Linked to request types.
  - `workflow_steps`: Ordered approval stages (Actor: Specific User or Role).
  - `request_actions`: Audit trail of approvals/rejections/comments.

- **Dynamic Forms:**
  - `form_templates`: Stores JSON schema for the form builder.
  - `requests.submission_data`: Stores the actual JSON responses.
  - `attachments`: File uploads linked to requests.

---

## **4. Key Features & Modules**

### **A. Authentication Module**

- Login page with university branding.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full system control.
  - **Student**: Submit & track requests.
  - **Employee/Faculty**: Review & approve requests based on workflow.

### **B. Form Builder (Admin)**

- **Drag-and-Drop Interface**: Admins build forms visually.
- **Field Types**: Text, Number, Date, File Upload, Select, Radio, Checkbox.
- **JSON Schema Storage**: Forms are saved as JSON in `form_templates`.
- **Preview Mode**: Test forms before publishing.

### **C. Workflow Engine**

- **Custom Workflows**: Define approval chains for each request type.
- **Step Configuration**:
  - Assign to **Role** (e.g., Department Head) or **Specific User**.
  - Set **SLA (Service Level Agreement)** hours.
  - Define **Escalation** rules.

### **D. Student Portal**

- **Dashboard**: Status overview (Active, Completed).
- **New Request**: Select form type -> Fill dynamic form -> Upload -> Submit.
- **Track Status**: Real-time progress bar of approval steps.
- **Notifications**: Receive updates on status changes.

### **E. Reviewer Interface (Employee/Faculty)**

- **Inbox**: List of pending tasks assigned to them.
- **Review Action**:
  - **Approve**: Moves to next step.
  - **Reject**: Ends workflow (optional: allow resubmission).
  - **Return**: Send back to previous step for correction.
- **PDF Generation**: Generate official PDF letter from template + data.
- **Digital Logic**: Signature/Stamp integration.

### **F. WhatsApp Bot (Integration)**

- Standalone service listening to Firestore queue or DB triggers.
- Sends WhatsApp messages for critical updates (e.g., "Your request #123 is Approved").

---

## **5. Project Structure**

```
/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Authentication routes
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── admin/        # Admin-only pages
│   │   ├── student/      # Student-only pages
│   │   └── employee/     # Employee pages
│   ├── api/              # API Routes (NextAuth, Uploads)
│   └── actions/          # Server Actions
├── components/           # UI Components
│   ├── ui/               # Shadcn components
│   ├── forms/            # Form builder components
│   └── tables/           # Data tables
├── prisma/               # Database Schema & Seed
├── lib/                  # Utilities (db, utils, auth)
└── whatsapp-bot/         # Standalone Bot Service
```

## **6. Development Guidelines**

- **Code Style**: Clean, modular, and typed.
- **Performance**: Use Server Components where possible.
- **Security**: Validate all inputs with Zod; check permissions on every action.
- **UX**: Provide immediate feedback (toasts, loading skeletons).
