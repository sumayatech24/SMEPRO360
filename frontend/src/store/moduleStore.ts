/**
 * Module Store — tracks which ERP module is currently active
 * Controls sidebar content and dashboard context
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ErpModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;         // gradient class
  bg: string;            // card background
  roles: string[];       // which roles can access (empty = all)
  defaultPath: string;   // where to navigate on enter
}

export const ERP_MODULES: ErpModule[] = [
  {
    id: 'myspace',
    name: 'My Space',
    description: 'Your personal workspace — attendance, leaves, tasks, payslips & more',
    icon: '🏠',
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
    roles: [],   // all employees can access
    defaultPath: '/my-space',
  },
  {
    id: 'crm',
    name: 'CRM & Sales',
    description: 'Leads, customers, opportunities, orders & invoices',
    icon: '🎯',
    color: 'from-violet-600 to-purple-700',
    bg: 'bg-violet-50',
    roles: ['super_admin','admin','sales_manager','sales_executive','management','auditor'],
    defaultPath: '/leads',
  },
  {
    id: 'procurement',
    name: 'Procurement',
    description: 'Vendors, purchase orders and goods receipt',
    icon: '📦',
    color: 'from-cyan-600 to-sky-700',
    bg: 'bg-cyan-50',
    roles: ['super_admin','admin','purchase_manager','purchase_executive','management','auditor'],
    defaultPath: '/procurement/vendors',
  },
  {
    id: 'inventory',
    name: 'Inventory & Stock',
    description: 'Products, stock levels, warehouses and alerts',
    icon: '🗃️',
    color: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-50',
    roles: ['super_admin','admin','inventory_manager','warehouse_keeper','management','auditor'],
    defaultPath: '/inventory/manage',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Bill of materials, work orders and quality checks',
    icon: '⚙️',
    color: 'from-orange-500 to-amber-600',
    bg: 'bg-orange-50',
    roles: ['super_admin','admin','inventory_manager','management','auditor'],
    defaultPath: '/manufacturing/boms',
  },
  {
    id: 'finance',
    name: 'Finance & Accounting',
    description: 'Accounts, journals, expenses, tax and reports',
    icon: '💰',
    color: 'from-green-600 to-emerald-700',
    bg: 'bg-green-50',
    roles: ['super_admin','admin','finance_manager','accountant','management','auditor'],
    defaultPath: '/finance/accounts',
  },
  {
    id: 'hr',
    name: 'Human Resources',
    description: 'Employees, attendance, leaves, payroll and biometrics',
    icon: '👥',
    color: 'from-pink-600 to-rose-700',
    bg: 'bg-pink-50',
    roles: ['super_admin','admin','hr_manager','hr_executive','management','auditor'],
    defaultPath: '/hr/employees',
  },
  {
    id: 'projects',
    name: 'Project Management',
    description: 'Projects, tasks, timesheets and resource allocation',
    icon: '🚀',
    color: 'from-purple-600 to-indigo-700',
    bg: 'bg-purple-50',
    roles: ['super_admin','admin','project_manager','team_member','management','auditor'],
    defaultPath: '/projects',
  },
  {
    id: 'helpdesk',
    name: 'Helpdesk & Support',
    description: 'Support tickets, knowledge base and SLAs',
    icon: '🎫',
    color: 'from-yellow-500 to-orange-600',
    bg: 'bg-yellow-50',
    roles: ['super_admin','admin','support_agent','management','auditor'],
    defaultPath: '/helpdesk/tickets',
  },
  {
    id: 'assets',
    name: 'Assets & Documents',
    description: 'Asset register, documents and document categories',
    icon: '🖥️',
    color: 'from-teal-600 to-emerald-700',
    bg: 'bg-teal-50',
    roles: ['super_admin','admin','management','auditor'],
    defaultPath: '/assets',
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Business intelligence across all modules',
    icon: '📊',
    color: 'from-indigo-600 to-blue-700',
    bg: 'bg-indigo-50',
    roles: ['super_admin','admin','finance_manager','management','auditor'],
    defaultPath: '/reports',
  },
  {
    id: 'approvals',
    name: 'Approvals',
    description: 'Workflows, authorities and pending approvals',
    icon: '✅',
    color: 'from-lime-600 to-green-700',
    bg: 'bg-lime-50',
    roles: ['super_admin','admin','management'],
    defaultPath: '/approvals',
  },
  {
    id: 'admin',
    name: 'Administration',
    description: 'Users, roles, permissions and system settings',
    icon: '⚙️',
    color: 'from-slate-600 to-gray-700',
    bg: 'bg-slate-50',
    roles: ['super_admin','admin'],
    defaultPath: '/admin/users',
  },
];

// Module → sidebar nav items mapping
export const MODULE_NAV: Record<string, {path:string;icon:string;label:string}[]> = {
  myspace: [
    {path:'/my-space',icon:'🏠',label:'My Overview'},
    {path:'/my-space',icon:'📅',label:'Attendance & Check-in'},
    {path:'/my-space',icon:'🌴',label:'Apply Leave'},
    {path:'/my-space',icon:'✔️',label:'My Tasks'},
    {path:'/my-space',icon:'🚀',label:'My Projects'},
    {path:'/my-space',icon:'⏱️',label:'Log Timesheets'},
    {path:'/my-space',icon:'💰',label:'My Payslips'},
    {path:'/my-space',icon:'📚',label:'My Training'},
    {path:'/my-space',icon:'✅',label:'My Approvals'},
  ],
  crm: [
    {path:'/leads',           icon:'🎯', label:'Lead Management'},
    {path:'/crm/customers',   icon:'🤝', label:'Customers'},
    {path:'/crm/opportunities',icon:'💡',label:'Opportunities'},
    {path:'/sales/orders',    icon:'🛒', label:'Sales Orders'},
    {path:'/sales/invoices',  icon:'📄', label:'Invoices'},
    {path:'/sales/payments',  icon:'💳', label:'Payments'},
  ],
  procurement: [
    {path:'/procurement/vendors', icon:'🏭', label:'Vendors'},
    {path:'/procurement/orders',  icon:'📦', label:'Purchase Orders'},
  ],
  inventory: [
    {path:'/inventory/products', icon:'🏷️', label:'Product Catalog'},
    {path:'/inventory/manage',   icon:'📊', label:'Stock & Alerts'},
    {path:'/inventory/stock',    icon:'🗃️', label:'Stock Levels'},
    {path:'/inventory/warehouses',icon:'🏪',label:'Warehouses'},
    {path:'/resource',           icon:'🔗', label:'Resource Allocation'},
  ],
  manufacturing: [
    {path:'/manufacturing/boms',       icon:'⚙️', label:'Bill of Materials'},
    {path:'/manufacturing/workorders', icon:'🔧', label:'Work Orders'},
    {path:'/quality/checks',           icon:'✅', label:'Quality Checks'},
  ],
  finance: [
    {path:'/finance/accounts', icon:'📒', label:'Chart of Accounts'},
    {path:'/finance/journals', icon:'📋', label:'Journal Entries'},
    {path:'/finance/expenses', icon:'💸', label:'Expenses'},
    {path:'/tax',              icon:'🧾', label:'Tax Module'},
  ],
  hr: [
    {path:'/hr/employees',          icon:'👤', label:'Employees'},
    {path:'/hr/resource-planning',  icon:'🎯', label:'Resource Planning'},
    {path:'/hr/attendance',         icon:'📅', label:'Attendance'},
    {path:'/hr/leaves',             icon:'🌴', label:'Leave Management'},
    {path:'/hr/leave-module',       icon:'🗓️', label:'Leave & Holidays'},
    {path:'/hr/payroll',            icon:'💰', label:'Payroll'},
    {path:'/hr/payroll-global',     icon:'🌍', label:'Global Payroll & Payslips'},
  ],
  projects: [
    {path:'/projects',            icon:'🚀', label:'Projects'},
    {path:'/projects/tasks',      icon:'✔️', label:'Tasks'},
    {path:'/projects/timesheets', icon:'⏱️', label:'Timesheets'},
    {path:'/resource',            icon:'🔗', label:'Resource Allocation'},
  ],
  helpdesk: [
    {path:'/helpdesk/tickets',   icon:'🎫', label:'Support Tickets'},
    {path:'/helpdesk/knowledge', icon:'📚', label:'Knowledge Base'},
  ],
  assets: [
    {path:'/assets',    icon:'🖥️', label:'Asset Register'},
    {path:'/documents', icon:'📁', label:'Documents'},
  ],
  reports: [
    {path:'/reports', icon:'📈', label:'Reports & Analytics'},
  ],
  approvals: [
    {path:'/approvals', icon:'📬', label:'Approval Inbox'},
  ],
  admin: [
    {path:'/admin/clients',  icon:'🏢', label:'Client Management'},
    {path:'/admin/users',    icon:'👥', label:'Users'},
    {path:'/admin/roles',    icon:'🔐', label:'Roles & Permissions'},
    {path:'/admin/company',  icon:'⚙️', label:'Company Settings'},
    {path:'/admin/settings', icon:'🔧', label:'Settings'},
  ],
};

interface ModuleStore {
  activeModuleId: string | null;
  setModule: (id: string | null) => void;
}

export const useModuleStore = create<ModuleStore>()(
  persist(
    (set) => ({
      activeModuleId: null,
      setModule: (id) => set({ activeModuleId: id }),
    }),
    { name: 'smepro360-module' }
  )
);
