import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ModuleLanding from './pages/ModuleLanding';
import LeadsPage from './pages/leads/LeadsPage';
import CustomersPage from './pages/crm/CustomersPage';
import OpportunitiesPage from './pages/crm/OpportunitiesPage';
import SalesOrdersPage from './pages/sales/SalesOrdersPage';
import InvoicesPage from './pages/sales/InvoicesPage';
import PaymentsPage from './pages/sales/PaymentsPage';
import VendorsPage from './pages/procurement/VendorsPage';
import PurchaseOrdersPage from './pages/procurement/PurchaseOrdersPage';
import ProductsPage from './pages/inventory/ProductsPage';
import StockPage from './pages/inventory/StockPage';
import BOMsPage from './pages/manufacturing/BOMsPage';
import WorkOrdersPage from './pages/manufacturing/WorkOrdersPage';
import QualityPage from './pages/quality/QualityPage';
import AccountsPage from './pages/finance/AccountsPage';
import JournalsPage from './pages/finance/JournalsPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import EmployeesPage from './pages/hr/EmployeesPage';
import AttendancePage from './pages/hr/AttendancePage';
import LeavesPage from './pages/hr/LeavesPage';
import PayrollPage from './pages/hr/PayrollPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import TasksPage from './pages/projects/TasksPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import TimesheetsPage from './pages/projects/TimesheetsPage';
import TicketsPage from './pages/helpdesk/TicketsPage';
import KnowledgeBasePage from './pages/helpdesk/KnowledgeBasePage';
import AssetsPage from './pages/assets/AssetsPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import ApprovalsPage from './pages/approvals/ApprovalsPage';
import CompanySettingsPage from './pages/admin/CompanySettingsPage';
import ClientsPage from './pages/admin/ClientsPage';
import PrintInvoicePage from './pages/sales/PrintInvoicePage';
import GlobalPayrollPage from './pages/hr/GlobalPayrollPage';
import EmployeeDetailPage from './pages/hr/EmployeeDetailPage';
import MySpacePage from './pages/myspace/MySpacePage';
import ResourcePlanningPage from './pages/hr/ResourcePlanningPage';
import LeaveModulePage from './pages/hr/LeaveModulePage';
import TaxPage from './pages/tax/TaxPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ResourcePage from './pages/resource/ResourcePage';
import { useAuthStore } from './store/authStore';
import api from './api/client';

// Generic placeholder for any remaining unbuilt pages
interface SimplePageProps { title: string; icon: string; apiPath: string; }
const SimplePage: React.FC<SimplePageProps> = ({ title, icon, apiPath }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(apiPath, { params: { limit: 50 } })
      .then((r: any) => setItems(Array.isArray(r.data) ? r.data : (r.data.items || [])))
      .catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPath]);
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{icon}</span>
        <div><h1 className="text-2xl font-bold text-slate-800">{title}</h1><p className="text-slate-500 text-sm">{items.length} records</p></div>
      </div>
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        {loading ? <div className="text-center text-slate-400 py-8">Loading...</div>
          : items.length === 0 ? <div className="text-center py-12 text-slate-400"><div className="text-5xl mb-3">{icon}</div><div>No records yet</div></div>
          : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-100">{Object.keys(items[0]||{}).slice(0,8).map(k=><th key={k} className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{k.replace(/_/g,' ')}</th>)}</tr></thead><tbody>{items.map((item:any,i:number)=><tr key={item.id||i} className="border-b border-slate-50 hover:bg-slate-50">{Object.entries(item).slice(0,8).map(([k,v]:any)=><td key={k} className="px-4 py-3 text-slate-700 max-w-xs truncate">{String(v??'')}</td>)}</tr>)}</tbody></table></div>
        }
      </div>
    </div>
  );
};

const WarehousesPage = () => <SimplePage title="Warehouses" icon="🏪" apiPath="/inventory/warehouses" />;

// Protected route
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Printable pages — outside Layout, full screen */}
        <Route path="/print/:type/:id" element={<ProtectedRoute><PrintInvoicePage /></ProtectedRoute>} />
        {/* Module landing page */}
        <Route path="/modules" element={<ProtectedRoute><ModuleLanding /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* Default: redirect to module selector */}
          <Route index element={<Navigate to="/modules" replace />} />

          {/* Core */}
          <Route path="dashboard"                element={<Dashboard />} />

          {/* Sales & CRM */}
          <Route path="leads"                    element={<LeadsPage />} />
          <Route path="crm/customers"            element={<CustomersPage />} />
          <Route path="crm/opportunities"        element={<OpportunitiesPage />} />
          <Route path="sales/orders"             element={<SalesOrdersPage />} />
          <Route path="sales/invoices"           element={<InvoicesPage />} />
          <Route path="sales/payments"           element={<PaymentsPage />} />

          {/* Supply Chain */}
          <Route path="procurement/vendors"      element={<VendorsPage />} />
          <Route path="procurement/orders"       element={<PurchaseOrdersPage />} />
          <Route path="inventory/products"       element={<ProductsPage />} />
          <Route path="inventory/stock"          element={<StockPage />} />
          <Route path="inventory/warehouses"     element={<WarehousesPage />} />

          {/* Manufacturing */}
          <Route path="manufacturing/boms"       element={<BOMsPage />} />
          <Route path="manufacturing/workorders" element={<WorkOrdersPage />} />
          <Route path="quality/checks"           element={<QualityPage />} />

          {/* Finance */}
          <Route path="finance/accounts"         element={<AccountsPage />} />
          <Route path="finance/journals"         element={<JournalsPage />} />
          <Route path="finance/expenses"         element={<ExpensesPage />} />

          {/* HR */}
          <Route path="hr/employees"             element={<EmployeesPage />} />
          <Route path="hr/attendance"            element={<AttendancePage />} />
          <Route path="hr/leaves"                element={<LeavesPage />} />
          <Route path="hr/payroll"               element={<PayrollPage />} />
          <Route path="hr/payroll-global"       element={<GlobalPayrollPage />} />
          <Route path="hr/employees/:id"        element={<EmployeeDetailPage />} />
          <Route path="hr/resource-planning"    element={<ResourcePlanningPage />} />
          <Route path="my-space"               element={<MySpacePage />} />
          <Route path="hr/leave-module"          element={<LeaveModulePage />} />

          {/* Projects */}
          <Route path="projects"                 element={<ProjectsPage />} />
          <Route path="projects/:id"             element={<ProjectDetailPage />} />
          <Route path="projects/tasks"           element={<TasksPage />} />
          <Route path="projects/timesheets"      element={<TimesheetsPage />} />

          {/* Support */}
          <Route path="helpdesk/tickets"         element={<TicketsPage />} />
          <Route path="helpdesk/knowledge"       element={<KnowledgeBasePage />} />

          {/* Assets & Docs */}
          <Route path="assets"                   element={<AssetsPage />} />
          <Route path="documents"               element={<DocumentsPage />} />

          {/* Analytics */}
          <Route path="reports"                  element={<ReportsPage />} />

          {/* Admin */}
          <Route path="admin/users"              element={<UsersPage />} />
          <Route path="admin/roles"              element={<RolesPage />} />
          <Route path="admin/company"            element={<CompanySettingsPage />} />
          <Route path="admin/clients"            element={<ClientsPage />} />
          <Route path="approvals"                element={<ApprovalsPage />} />
          <Route path="tax"                      element={<TaxPage />} />
          <Route path="inventory/manage"         element={<InventoryPage />} />
          <Route path="resource"                 element={<ResourcePage />} />
          <Route path="admin/settings"           element={<div className="p-8 text-center text-slate-400 text-lg">Settings — Coming Soon</div>} />

          <Route path="*"                        element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
