from app.models.user import User, Role, Permission
from app.models.tenant import Tenant, Branch
from app.models.lead import Lead, LeadActivity, Campaign
from app.models.crm import Customer, Contact, Opportunity, Activity
from app.models.sales import SalesOrder, SalesOrderItem, Invoice, InvoiceItem, Payment
from app.models.procurement import Vendor, PurchaseOrder, PurchaseOrderItem, GoodsReceipt
from app.models.inventory import Product, Category, Warehouse, StockMovement, StockLevel
from app.models.manufacturing import BOM, BOMItem, WorkOrder, WorkOrderOperation, ProductionEntry
from app.models.finance import Account, JournalEntry, JournalLine, Expense, Budget
from app.models.hr import Employee, Department, Designation, Attendance, Leave, Payroll, PayrollItem
from app.models.project import Project, ProjectTask, Milestone, Timesheet
from app.models.helpdesk import Ticket, TicketComment, SLA, KnowledgeBase
from app.models.asset import Asset, AssetMaintenance, AssetDepreciation
from app.models.quality import QualityCheck, QualityParameter, NonConformance
from app.models.document import Document, DocumentVersion, DocumentFolder
from app.models.tax import TaxType, TaxSlab, HSNCode, SalesOrderTemplate, SalesOrderTemplateItem
from app.models.resource import ResourceAllocation, ItemAllocation, StockReturn, StockAlert
from app.models.attendance import BiometricDevice, AttendanceLog, AttendanceRegularization, LeaveType, LeavePolicy, LeaveBalance, HolidayType, Holiday
from app.models.approval import ApprovalWorkflow, ApprovalStep, ApprovalAuthority, ApprovalRequest, ApprovalAction, ManagerHierarchy, DocumentCategory
from app.models.project_mgmt import ProjectPhase, WBSItem, ProjectMilestone, ProjectRisk, ProjectIssue, ProjectBudget, ProjectDocument, ProjectActivity
from app.models.travel import TravelRequest, TravelLeg, TravelExpenseItem, TravelPolicy
from app.models.company import CompanyProfile, SalaryStructure, EmployeeSalaryDetail, PayrollRun, Payslip, Form16
from app.models.hr_extended import OnboardingTemplate, OnboardingRecord, TrainingCourse, TrainingEnrollment, BenefitPlan, EmployeeBenefit, EmployeeDocument, PerformanceReview, ExitRecord
from app.models.skills import SkillCategory, Skill, EmployeeSkill, EducationDetail, AppraisalCycle, KRATemplate, EmployeeAppraisal
