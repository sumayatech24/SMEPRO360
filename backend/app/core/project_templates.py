"""
Universal Project Templates — Works for ANY industry.
Phase structures, WBS templates, and milestone patterns
for 15+ industry types.
"""

# ── Project Industry Types ─────────────────────────────────────────────────────
PROJECT_INDUSTRIES = [
    # (id, display_name, icon, description)
    ("it_software",      "IT & Software Development",  "💻", "Apps, websites, software products"),
    ("manufacturing",    "Manufacturing & Production",  "🏭", "Product manufacturing and assembly"),
    ("construction",     "Construction & Civil Works",  "🏗️", "Buildings, infrastructure, civil"),
    ("healthcare",       "Healthcare & Medical",        "🏥", "Hospitals, clinics, medical projects"),
    ("retail",           "Retail & E-Commerce",         "🛍️", "Stores, e-commerce, retail setup"),
    ("finance_banking",  "Finance & Banking",           "🏦", "Financial systems, compliance, banking"),
    ("education",        "Education & Training",        "🎓", "Institutes, curriculum, LMS"),
    ("events",           "Events & Conferences",        "🎪", "Events, exhibitions, conferences"),
    ("marketing",        "Marketing & Campaigns",       "📣", "Brand campaigns, product launches"),
    ("infrastructure",   "IT Infrastructure",           "🖧",  "Networks, data centers, cloud"),
    ("erp_crm",          "ERP / CRM Implementation",   "⚙️", "System rollout and go-live"),
    ("research",         "Research & Development",      "🔬", "R&D, innovation, product research"),
    ("real_estate",      "Real Estate & Property",      "🏢", "Property development, leasing"),
    ("logistics",        "Logistics & Supply Chain",    "🚚", "Warehouse, fleet, distribution"),
    ("energy",           "Energy & Utilities",          "⚡", "Power plants, solar, utilities"),
    ("general",          "General Business",            "📋", "Any other business project"),
]

# ── Phase Templates per Industry ──────────────────────────────────────────────
# (phase_name, phase_code, color, duration_days, description)
PHASE_TEMPLATES = {

    "it_software": [
        ("Initiation",           "INIT",  "#6366f1", 10, "Project charter, stakeholder identification, feasibility"),
        ("Requirements",         "REQ",   "#8b5cf6", 20, "Business & technical requirements gathering"),
        ("Architecture & Design","ARCH",  "#3b82f6", 20, "System design, database schema, API contracts"),
        ("Development",          "DEV",   "#0891b2", 60, "Frontend, backend, integrations development"),
        ("Testing & QA",         "TEST",  "#10b981", 20, "Unit, integration, regression, performance testing"),
        ("UAT",                  "UAT",   "#f59e0b", 15, "User acceptance testing and sign-off"),
        ("Deployment",           "DEPLOY","#ef4444", 7,  "Production release, go-live"),
        ("Hypercare",            "HCARE", "#64748b", 30, "Post go-live support, stabilization"),
    ],

    "manufacturing": [
        ("Product Design",       "DESIGN","#f59e0b", 30, "Engineering drawing, CAD modeling, design approval"),
        ("Prototype & Tooling",  "PROTO", "#ef4444", 25, "Prototype creation, tool and die setup"),
        ("Raw Material Procurement","PROC","#0891b2", 20, "Vendor selection, material PO, delivery"),
        ("Production Setup",     "SETUP", "#8b5cf6", 15, "Machine setup, process line preparation"),
        ("Production Run",       "PROD",  "#3b82f6", 45, "Mass production and assembly"),
        ("Quality Control",      "QC",    "#10b981", 15, "In-process and final quality inspection"),
        ("Packaging & Dispatch", "PACK",  "#64748b", 10, "Labeling, packaging, dispatch to warehouse"),
    ],

    "construction": [
        ("Pre-Construction",     "PRE",   "#6366f1", 20, "Site survey, permits, approvals"),
        ("Foundation & Structure","FOUND","#ef4444", 45, "Excavation, foundation, RCC structure"),
        ("Civil Works",          "CIVIL", "#f59e0b", 60, "Brickwork, plumbing, electrical rough-in"),
        ("Finishing Works",      "FINISH","#3b82f6", 30, "Flooring, painting, woodwork, fixtures"),
        ("MEP Installation",     "MEP",   "#8b5cf6", 25, "Mechanical, electrical, plumbing installation"),
        ("Inspection & Handover","HANDOV","#10b981", 10, "Snag list, inspection, client handover"),
    ],

    "healthcare": [
        ("Planning & Approvals",  "PLAN",  "#6366f1", 20, "Regulatory approvals, NABH/JCI planning"),
        ("Infrastructure Setup",  "INFRA", "#3b82f6", 30, "Building, medical gas, electrical"),
        ("Equipment Procurement", "EQUIP", "#f59e0b", 25, "Medical equipment ordering and installation"),
        ("IT & HMS Setup",        "IT",    "#8b5cf6", 20, "Hospital management system, EMR setup"),
        ("Staff Recruitment",     "HR",    "#ec4899", 20, "Doctor, nurse, admin recruitment & training"),
        ("Compliance & Audit",    "AUDIT", "#ef4444", 15, "Fire safety, bio-medical waste, NABH audit"),
        ("Soft Launch",           "LAUNCH","#10b981", 10, "OPD launch, feedback, corrections"),
        ("Full Operations",       "OPS",   "#64748b", 30, "Full hospital operations, review"),
    ],

    "retail": [
        ("Market Research",       "RESEARCH","#6366f1", 15, "Location scouting, competitor analysis"),
        ("Store Design & Fit-out","FITOUT",  "#f59e0b", 30, "Interior design, signage, furniture"),
        ("Vendor Onboarding",     "VENDOR",  "#3b82f6", 20, "Supplier agreements, initial inventory"),
        ("Technology Setup",      "TECH",    "#8b5cf6", 15, "POS, billing, inventory management system"),
        ("Staff Hiring & Training","HR",      "#ec4899", 20, "Store staff recruitment and training"),
        ("Marketing & Launch",    "LAUNCH",  "#ef4444", 10, "Social media, promotions, inauguration"),
        ("Post-Launch Review",    "REVIEW",  "#10b981", 15, "Sales analysis, stock review, adjustments"),
    ],

    "finance_banking": [
        ("Project Scoping",       "SCOPE",  "#6366f1", 10, "Business case, scope definition"),
        ("Regulatory Compliance", "REGUL",  "#ef4444", 20, "RBI/SEBI/IRDAI compliance analysis"),
        ("System Design",         "DESIGN", "#3b82f6", 20, "Architecture, security design"),
        ("Development & Testing", "DEV",    "#8b5cf6", 40, "Core development, security testing"),
        ("UAT & Parallel Run",    "UAT",    "#f59e0b", 20, "Parallel run, reconciliation checks"),
        ("Audit & Sign-off",      "AUDIT",  "#ef4444", 10, "Internal audit, regulatory sign-off"),
        ("Go-Live",               "LIVE",   "#10b981", 5,  "Production cutover"),
        ("Stabilization",         "STABLE", "#64748b", 30, "Issue resolution, optimization"),
    ],

    "education": [
        ("Needs Assessment",      "NEEDS",  "#6366f1", 15, "Gap analysis, learning objectives"),
        ("Curriculum Design",     "CURRIC", "#8b5cf6", 25, "Course structure, lesson plans, materials"),
        ("Content Development",   "CONTENT","#3b82f6", 30, "Modules, videos, assessments creation"),
        ("Technology Setup",      "TECH",   "#f59e0b", 15, "LMS setup, digital tools integration"),
        ("Trainer Preparation",   "TRAIN",  "#ec4899", 10, "Train the trainer, pilot sessions"),
        ("Pilot Rollout",         "PILOT",  "#ef4444", 15, "Pilot batch, feedback collection"),
        ("Full Rollout",          "ROLLOUT","#10b981", 30, "Full-scale delivery, certifications"),
    ],

    "events": [
        ("Concept & Planning",    "CONCEPT","#6366f1", 20, "Event concept, theme, budget approval"),
        ("Vendor Booking",        "VENDOR", "#8b5cf6", 15, "Venue, catering, AV, decor booking"),
        ("Marketing & Promotion", "MKT",    "#ef4444", 20, "Invitations, social media, promotions"),
        ("Logistics Setup",       "LOGISTIC","#3b82f6",10, "Transport, accommodation, registration"),
        ("Rehearsal & Setup",     "SETUP",  "#f59e0b", 5,  "Venue setup, AV check, rehearsal"),
        ("Event Execution",       "EVENT",  "#10b981", 3,  "D-day execution"),
        ("Post-Event Review",     "REVIEW", "#64748b", 7,  "Feedback, payment settlement, report"),
    ],

    "marketing": [
        ("Strategy & Brief",      "STRATEGY","#6366f1", 10, "Campaign brief, target audience, KPIs"),
        ("Creative Development",  "CREATIVE","#8b5cf6", 20, "Designs, copy, video, content creation"),
        ("Media Planning",        "MEDIA",   "#3b82f6", 10, "Channel selection, media buying"),
        ("Campaign Setup",        "SETUP",   "#f59e0b", 7,  "Platform setup, UTMs, tracking"),
        ("Launch & Execution",    "LAUNCH",  "#ef4444", 30, "Campaign live, daily monitoring"),
        ("Optimization",          "OPTIMIZE","#10b981", 20, "A/B testing, performance optimization"),
        ("Reporting & Wrap-up",   "REPORT",  "#64748b", 7,  "ROI analysis, final report"),
    ],

    "infrastructure": [
        ("Assessment & Design",   "ASSESS", "#6366f1", 15, "Current state audit, target architecture"),
        ("Procurement",           "PROC",   "#3b82f6", 20, "Hardware, software, licenses procurement"),
        ("Installation",          "INSTALL","#f59e0b", 20, "Hardware racking, cabling, installation"),
        ("Configuration",         "CONFIG", "#8b5cf6", 25, "Network config, OS, middleware setup"),
        ("Testing & Validation",  "TEST",   "#ef4444", 15, "Load testing, DR testing, validation"),
        ("Migration",             "MIGRATE","#10b981", 10, "Data and workload migration"),
        ("Go-Live & Monitoring",  "LIVE",   "#64748b", 14, "Cutover, 24x7 monitoring, support"),
    ],

    "erp_crm": [
        ("Business Process Review","BPR",   "#6366f1", 20, "AS-IS/TO-BE process mapping"),
        ("System Configuration",  "CONFIG", "#8b5cf6", 30, "Module setup, master data, workflows"),
        ("Data Migration",        "DATA",   "#3b82f6", 20, "Data extraction, cleansing, migration"),
        ("Integration",           "INTEG",  "#f59e0b", 20, "Third-party integrations, API testing"),
        ("Training",              "TRAIN",  "#ec4899", 15, "Super-user & end-user training"),
        ("UAT & Sign-off",        "UAT",    "#ef4444", 15, "Business sign-off, parallel run"),
        ("Go-Live",               "GOLIVE", "#10b981", 5,  "Production cutover, hypercare"),
        ("Post Go-Live Support",  "SUPPORT","#64748b", 45, "Bug fixes, enhancements, stabilization"),
    ],

    "research": [
        ("Literature Review",     "LIT",    "#6366f1", 20, "Existing research, patents, benchmarks"),
        ("Hypothesis & Design",   "DESIGN", "#8b5cf6", 15, "Research design, methodology"),
        ("Experiment / Development","EXP",  "#3b82f6", 60, "Lab work, prototype, experiments"),
        ("Data Collection",       "DATA",   "#f59e0b", 30, "Primary/secondary data gathering"),
        ("Analysis",              "ANALYSIS","#ef4444", 25, "Statistical analysis, findings"),
        ("Documentation",         "DOCS",   "#10b981", 15, "Research paper, patent, IP filing"),
        ("Review & Publication",  "PUBLISH","#64748b", 20, "Peer review, publication, presentation"),
    ],

    "real_estate": [
        ("Land Acquisition",      "LAND",   "#6366f1", 30, "Site identification, due diligence, registration"),
        ("Approvals & Permits",   "PERMIT", "#ef4444", 45, "RERA, municipal approvals, environment NOC"),
        ("Design & Planning",     "DESIGN", "#8b5cf6", 30, "Architectural design, structural drawings"),
        ("Construction",          "CONST",  "#3b82f6", 180,"Foundation, structure, finishing"),
        ("Sales & Marketing",     "SALES",  "#f59e0b", 90, "Launch, booking, CRM, collections"),
        ("Possession & Handover", "POSSESS","#10b981", 30, "OC certificate, registration, possession"),
    ],

    "logistics": [
        ("Network Design",        "DESIGN", "#6366f1", 15, "Route planning, hub-spoke design"),
        ("Warehouse Setup",       "WH",     "#3b82f6", 20, "Racking, WMS, equipment setup"),
        ("Fleet & Transport",     "FLEET",  "#f59e0b", 15, "Vehicle procurement, GPS, contracts"),
        ("Technology",            "TECH",   "#8b5cf6", 15, "TMS, WMS, tracking integration"),
        ("Staff & Training",      "HR",     "#ec4899", 10, "Drivers, warehouse staff training"),
        ("Trial Run",             "TRIAL",  "#ef4444", 10, "Pilot routes, mock shipments"),
        ("Full Operations",       "OPS",    "#10b981", 30, "Live operations, KPI monitoring"),
    ],

    "energy": [
        ("Feasibility Study",     "FEASIB", "#6366f1", 20, "Resource assessment, ROI analysis"),
        ("Design & Engineering",  "DESIGN", "#f59e0b", 30, "Technical design, single line diagram"),
        ("Approvals & Permits",   "PERMIT", "#ef4444", 30, "Ministry, grid, environment approvals"),
        ("Procurement",           "PROC",   "#3b82f6", 30, "Equipment, cables, inverters, panels"),
        ("Civil & Installation",  "INSTALL","#8b5cf6", 60, "Civil works, mounting, wiring, commissioning"),
        ("Testing & Commissioning","TEST",  "#10b981", 15, "SAT, grid synchronization, metering"),
        ("O&M Handover",          "OAM",    "#64748b", 10, "O&M team handover, documentation"),
    ],

    "general": [
        ("Initiation",            "INIT",   "#6366f1", 10, "Project kick-off and planning"),
        ("Planning",              "PLAN",   "#8b5cf6", 20, "Detailed planning, resource allocation"),
        ("Execution",             "EXEC",   "#3b82f6", 60, "Project execution and delivery"),
        ("Monitoring",            "MONITOR","#f59e0b", 30, "Progress tracking, issue resolution"),
        ("Closure",               "CLOSE",  "#64748b", 10, "Handover, lessons learned, closure"),
    ],
}

# ── WBS Templates per Phase Code ──────────────────────────────────────────────
WBS_TEMPLATES = {
    # IT Software
    "INIT":    ["Project Charter", "Stakeholder Register", "Feasibility Study", "Project Kickoff Meeting", "Risk Assessment"],
    "REQ":     ["Business Requirements Document", "Technical Requirements", "Use Cases / User Stories", "Requirements Sign-off"],
    "ARCH":    ["System Architecture Diagram", "Database Design", "API Contract Design", "Security Architecture", "Tech Stack Decision"],
    "DEV":     ["Dev Environment Setup", "Core Module Development", "UI/UX Implementation", "API Development", "Third-party Integration", "Code Review", "Bug Fixes"],
    "TEST":    ["Test Plan Creation", "Unit Testing", "Integration Testing", "Performance Testing", "Security Testing", "Bug Fixing", "Test Report"],
    "UAT":     ["UAT Environment Setup", "UAT Test Cases", "UAT Execution", "Defect Rectification", "UAT Sign-off"],
    "DEPLOY":  ["Deployment Plan", "Production Setup", "Data Migration", "Go-Live Checklist", "Cutover Execution", "Smoke Testing"],
    "HCARE":   ["Issue Monitoring", "Performance Tuning", "User Feedback Resolution", "Documentation Update", "Knowledge Transfer"],

    # Manufacturing
    "DESIGN":  ["Concept Design", "Engineering Drawing", "CAD Modeling", "Design Review Meeting", "Design Approval from Client", "BOM Preparation"],
    "PROTO":   ["Prototype Material List", "Prototype Fabrication", "Prototype Testing", "Design Modification", "Final Prototype Approval"],
    "PROC":    ["Supplier Identification", "Request for Quotation", "Purchase Order Release", "Material Receipt", "Incoming Quality Check"],
    "SETUP":   ["Machine Calibration", "Tooling Setup", "Process Parameters Setting", "Trial Production Run", "Setup Sign-off"],
    "PROD":    ["Production Scheduling", "Material Issue", "Manufacturing / Assembly", "Work-in-Progress Inspection", "Packaging"],
    "QC":      ["Quality Plan", "In-Process Inspection", "Final Quality Check", "Non-Conformance Report", "Dispatch Clearance"],
    "PACK":    ["Packaging Design", "Labeling", "Packing", "Dispatch Documentation", "Shipment Booking"],

    # Construction
    "PRE":     ["Site Survey", "Soil Testing", "Building Permit", "NOC from Authorities", "Project Team Mobilization"],
    "FOUND":   ["Excavation", "PCC Work", "Reinforcement", "Concrete Pouring", "Curing", "Waterproofing"],
    "CIVIL":   ["Brickwork / Blockwork", "Plastering", "Plumbing Rough-in", "Electrical Conduit", "False Ceiling Framing"],
    "FINISH":  ["Flooring", "Internal Painting", "Doors & Windows", "Tile Work", "Woodwork & Cabinets"],
    "MEP":     ["Electrical Wiring", "Switch & Fitting Installation", "Plumbing Fixtures", "HVAC Installation", "Fire Fighting System"],
    "HANDOV":  ["Snag List Preparation", "Snag Rectification", "Client Walk-through", "Handing Over Certificate", "As-Built Drawings"],

    # Healthcare
    "NEEDS":   ["Gap Analysis", "Patient Load Forecast", "Department Planning", "Equipment Needs Assessment"],
    "INFRA":   ["Civil Layout", "Medical Gas Pipeline", "Electrical Load Design", "IT Infrastructure"],
    "EQUIP":   ["Equipment List Finalization", "Tender Process", "Installation", "Calibration", "Biomedical Certification"],
    "IT":      ["HMS Selection", "Server Setup", "HMS Configuration", "EMR/EHR Setup", "PACS/RIS Integration"],
    "HR":      ["JD Preparation", "Doctor Recruitment", "Nursing Staff", "Admin Staff", "Induction Training"],
    "AUDIT":   ["Fire Safety NOC", "Bio-medical Waste Authorization", "NABH / JCI Documentation", "Mock Audit"],
    "LAUNCH":  ["Soft Launch OPD", "Feedback Collection", "Issue Rectification"],
    "OPS":     ["Full IP Launch", "KPI Dashboard Setup", "Monthly Review"],

    # Events
    "CONCEPT": ["Event Brief", "Theme Finalization", "Budget Approval", "Timeline Planning"],
    "VENDOR":  ["Venue Booking", "Catering Contract", "AV Equipment Booking", "Decorator Finalization", "Security Arrangements"],
    "MKT":     ["Invitation Design", "Social Media Campaign", "Press Release", "Registration Portal Setup"],
    "LOGISTIC":["Transport Arrangement", "Accommodation Booking", "Badge & Kit Preparation", "Volunteer Briefing"],
    "EVENT":   ["Final Rehearsal", "Registration Desk", "Session Management", "Photography & Recording", "Closing Ceremony"],
    "REVIEW":  ["Attendance Report", "Feedback Analysis", "Invoice Settlement", "Event Report", "Lessons Learned"],

    # Generic
    "PLAN":    ["Project Plan Creation", "Resource Allocation", "Budget Planning", "Risk Identification", "Stakeholder Communication Plan"],
    "EXEC":    ["Team Briefing", "Work Package 1", "Work Package 2", "Work Package 3", "Progress Reporting"],
    "MONITOR": ["Weekly Status Review", "KPI Tracking", "Issue Log Update", "Stakeholder Update", "Change Management"],
    "CLOSE":   ["Final Deliverable Review", "Client Sign-off", "Document Archiving", "Lessons Learned", "Project Closure Report"],

    # ERP/CRM
    "BPR":     ["Current Process Mapping", "Pain Point Analysis", "Future State Design", "Process Sign-off"],
    "CONFIG":  ["System Installation", "Module Configuration", "Master Data Setup", "Workflow Setup", "User Role Configuration"],
    "DATA":    ["Data Extraction from Legacy", "Data Cleansing", "Data Mapping", "Migration Trial Run", "Final Migration"],
    "INTEG":   ["Integration Spec", "API Development", "Middleware Configuration", "Integration Testing"],
    "TRAIN":   ["Training Material", "Super User Training", "End User Training", "Train-the-Trainer"],
    "GOLIVE":  ["Pre-cutover Checklist", "Data Freeze", "Production Cutover", "Go-Live Verification"],
    "SUPPORT": ["Hyper-care Support", "Defect Resolution", "Performance Monitoring", "Enhancements"],
}

# ── Milestone Templates ───────────────────────────────────────────────────────
MILESTONE_TEMPLATES = {
    "it_software":   [("Project Kickoff",50),("Requirements Approved",15),("Design Complete",20),("Dev Complete",45),("UAT Approved",15),("Go-Live",5),("Project Closure",10)],
    "manufacturing": [("Design Approved",20),("Tooling Ready",15),("First Article Inspection",5),("Production Start",3),("Quality Cleared",5),("Dispatch",2)],
    "construction":  [("Foundation Complete",30),("Structure Complete",60),("Waterproofing Done",10),("Plumbing Complete",20),("Electrical Complete",15),("Handover",5)],
    "events":        [("Venue Confirmed",30),("Invitations Sent",15),("Event Day",1),("Post-Event Report",5)],
    "general":       [("Project Kickoff",10),("Mid-Point Review",30),("Final Delivery",5),("Project Closure",3)],
}

def get_phase_template(industry: str):
    """Get phase template for an industry, fallback to general"""
    return PHASE_TEMPLATES.get(industry, PHASE_TEMPLATES["general"])

def get_wbs_for_phase(phase_code: str):
    """Get WBS task names for a phase code"""
    return WBS_TEMPLATES.get(phase_code, [f"Task 1", f"Task 2", f"Task 3"])

def get_milestone_template(industry: str):
    return MILESTONE_TEMPLATES.get(industry, MILESTONE_TEMPLATES["general"])
