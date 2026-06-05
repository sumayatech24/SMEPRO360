-- SMEPRO360 initial schema generated from SQLAlchemy models
-- Apply with Supabase SQL Editor or `supabase db push` after linking the project.


CREATE TABLE accounts (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	account_code VARCHAR(50) NOT NULL, 
	account_name VARCHAR(255) NOT NULL, 
	account_type VARCHAR(50), 
	account_group VARCHAR(100), 
	parent_id INTEGER, 
	description TEXT, 
	is_group BOOLEAN, 
	opening_balance NUMERIC(15, 2), 
	current_balance NUMERIC(15, 2), 
	currency VARCHAR(10), 
	tax_applicable BOOLEAN, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(parent_id) REFERENCES accounts (id)
);


CREATE TABLE appraisal_cycles (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	cycle_type VARCHAR(20), 
	financial_year VARCHAR(10), 
	period_label VARCHAR(50), 
	start_date DATE, 
	end_date DATE, 
	kra_setting_deadline DATE, 
	self_review_deadline DATE, 
	manager_review_deadline DATE, 
	calibration_date DATE, 
	status VARCHAR(20), 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE INDEX ix_appraisal_cycles_id ON appraisal_cycles (id);


CREATE TABLE approval_workflows (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	workflow_type VARCHAR(50) NOT NULL, 
	description TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (workflow_type)
);

CREATE INDEX ix_approval_workflows_id ON approval_workflows (id);


CREATE TABLE benefit_plans (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	benefit_type VARCHAR(50), 
	description TEXT, 
	coverage_amount NUMERIC(12, 2), 
	employer_contribution NUMERIC(10, 2), 
	employee_contribution NUMERIC(10, 2), 
	provider VARCHAR(200), 
	is_taxable BOOLEAN, 
	eligibility VARCHAR(50), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE INDEX ix_benefit_plans_id ON benefit_plans (id);


CREATE TABLE biometric_devices (
	id SERIAL NOT NULL, 
	device_name VARCHAR(100) NOT NULL, 
	device_code VARCHAR(50), 
	device_type VARCHAR(30), 
	location VARCHAR(200), 
	branch_id INTEGER, 
	ip_address VARCHAR(50), 
	is_active BOOLEAN, 
	last_sync TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (device_code)
);

CREATE INDEX ix_biometric_devices_id ON biometric_devices (id);


CREATE TABLE campaigns (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	name VARCHAR(255) NOT NULL, 
	campaign_type VARCHAR(50), 
	status VARCHAR(50), 
	start_date TIMESTAMP WITH TIME ZONE, 
	end_date TIMESTAMP WITH TIME ZONE, 
	budget FLOAT, 
	actual_spend FLOAT, 
	target_leads INTEGER, 
	description TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);


CREATE TABLE departments (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	name VARCHAR(255) NOT NULL, 
	code VARCHAR(50), 
	parent_id INTEGER, 
	head_id INTEGER, 
	description TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(parent_id) REFERENCES departments (id), 
	FOREIGN KEY(head_id) REFERENCES employees (id)
);


CREATE TABLE designations (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	name VARCHAR(255) NOT NULL, 
	code VARCHAR(50), 
	department_id INTEGER, 
	grade VARCHAR(50), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id)
);


CREATE TABLE document_categories (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(20), 
	description TEXT, 
	parent_id INTEGER, 
	department VARCHAR(100), 
	requires_approval BOOLEAN, 
	retention_years INTEGER, 
	is_confidential BOOLEAN, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (code), 
	FOREIGN KEY(parent_id) REFERENCES document_categories (id)
);

CREATE INDEX ix_document_categories_id ON document_categories (id);


CREATE TABLE employees (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	employee_number VARCHAR(50), 
	user_id INTEGER, 
	first_name VARCHAR(100) NOT NULL, 
	last_name VARCHAR(100), 
	email VARCHAR(255), 
	phone VARCHAR(20), 
	date_of_birth DATE, 
	gender VARCHAR(20), 
	blood_group VARCHAR(10), 
	marital_status VARCHAR(20), 
	nationality VARCHAR(50), 
	pan_number VARCHAR(15), 
	aadhaar_number VARCHAR(20), 
	uan_number VARCHAR(20), 
	esic_number VARCHAR(20), 
	department_id INTEGER, 
	designation_id INTEGER, 
	reporting_manager_id INTEGER, 
	branch_id INTEGER, 
	employment_type VARCHAR(50), 
	date_of_joining DATE, 
	date_of_leaving DATE, 
	status VARCHAR(50), 
	address TEXT, 
	city VARCHAR(100), 
	state VARCHAR(100), 
	pincode VARCHAR(10), 
	bank_name VARCHAR(100), 
	bank_account VARCHAR(50), 
	bank_ifsc VARCHAR(20), 
	basic_salary NUMERIC(15, 2), 
	hra NUMERIC(15, 2), 
	other_allowances NUMERIC(15, 2), 
	photo_url VARCHAR(500), 
	documents JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (employee_number), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id), 
	FOREIGN KEY(designation_id) REFERENCES designations (id), 
	FOREIGN KEY(reporting_manager_id) REFERENCES employees (id)
);


CREATE TABLE holiday_types (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	description TEXT, 
	is_mandatory BOOLEAN, 
	country VARCHAR(50), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE INDEX ix_holiday_types_id ON holiday_types (id);


CREATE TABLE leave_types (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	description TEXT, 
	leave_category VARCHAR(30), 
	country VARCHAR(50), 
	applicable_states TEXT, 
	gender_specific VARCHAR(10), 
	default_days_per_year FLOAT, 
	is_paid BOOLEAN, 
	is_carry_forward BOOLEAN, 
	max_carry_forward FLOAT, 
	is_encashable BOOLEAN, 
	requires_medical_certificate BOOLEAN, 
	min_days FLOAT, 
	max_days_per_application FLOAT, 
	notice_days INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE INDEX ix_leave_types_id ON leave_types (id);


CREATE TABLE onboarding_templates (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	department VARCHAR(100), 
	description TEXT, 
	tasks JSON, 
	is_default BOOLEAN, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE INDEX ix_onboarding_templates_id ON onboarding_templates (id);


CREATE TABLE payroll_runs (
	id SERIAL NOT NULL, 
	run_number VARCHAR(30), 
	tenant_id INTEGER, 
	month INTEGER, 
	year INTEGER, 
	period_label VARCHAR(20), 
	status VARCHAR(20), 
	total_employees INTEGER, 
	total_gross NUMERIC(15, 2), 
	total_deductions NUMERIC(15, 2), 
	total_net NUMERIC(15, 2), 
	total_employer_contrib NUMERIC(15, 2), 
	processed_at TIMESTAMP WITH TIME ZONE, 
	approved_by INTEGER, 
	approved_at TIMESTAMP WITH TIME ZONE, 
	paid_at TIMESTAMP WITH TIME ZONE, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (run_number)
);

CREATE INDEX ix_payroll_runs_id ON payroll_runs (id);


CREATE TABLE permissions (
	id SERIAL NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	module VARCHAR(60) NOT NULL, 
	action VARCHAR(60) NOT NULL, 
	description VARCHAR(255), 
	confidentiality VARCHAR(20), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE INDEX ix_permissions_id ON permissions (id);


CREATE TABLE product_categories (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	name VARCHAR(255) NOT NULL, 
	code VARCHAR(50), 
	parent_id INTEGER, 
	description TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(parent_id) REFERENCES product_categories (id)
);


CREATE TABLE roles (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	display_name VARCHAR(150), 
	description TEXT, 
	is_system BOOLEAN, 
	is_active BOOLEAN, 
	color VARCHAR(20), 
	tenant_id INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE INDEX ix_roles_id ON roles (id);


CREATE TABLE salary_structures (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	name VARCHAR(100) NOT NULL, 
	country VARCHAR(50), 
	currency VARCHAR(10), 
	earnings JSON, 
	deductions JSON, 
	employer_contributions JSON, 
	tax_config JSON, 
	is_default BOOLEAN, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE INDEX ix_salary_structures_id ON salary_structures (id);


CREATE TABLE skill_categories (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	industry VARCHAR(100), 
	description TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE INDEX ix_skill_categories_id ON skill_categories (id);


CREATE TABLE slas (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	name VARCHAR(255) NOT NULL, 
	priority VARCHAR(20), 
	response_hours FLOAT, 
	resolution_hours FLOAT, 
	business_hours_only BOOLEAN, 
	escalation_levels JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);


CREATE TABLE tax_types (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	tax_category VARCHAR(50), 
	description TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (name), 
	UNIQUE (code)
);

CREATE INDEX ix_tax_types_id ON tax_types (id);


CREATE TABLE tenants (
	id SERIAL NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	slug VARCHAR(100) NOT NULL, 
	domain VARCHAR(255), 
	logo_url VARCHAR(500), 
	primary_color VARCHAR(20), 
	secondary_color VARCHAR(20), 
	gstin VARCHAR(20), 
	pan VARCHAR(15), 
	address TEXT, 
	city VARCHAR(100), 
	state VARCHAR(100), 
	country VARCHAR(100), 
	pincode VARCHAR(10), 
	phone VARCHAR(20), 
	email VARCHAR(255), 
	currency VARCHAR(10), 
	fiscal_year_start VARCHAR(10), 
	plan VARCHAR(50), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	settings JSON, 
	PRIMARY KEY (id), 
	UNIQUE (slug), 
	UNIQUE (domain)
);


CREATE TABLE training_courses (
	id SERIAL NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	code VARCHAR(30), 
	category VARCHAR(50), 
	description TEXT, 
	duration_hours FLOAT, 
	delivery_mode VARCHAR(20), 
	provider VARCHAR(200), 
	cost_per_person NUMERIC(10, 2), 
	is_mandatory BOOLEAN, 
	certification VARCHAR(200), 
	validity_months INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (code)
);

CREATE INDEX ix_training_courses_id ON training_courses (id);


CREATE TABLE travel_policies (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	employee_grade VARCHAR(50), 
	trip_type VARCHAR(20), 
	hotel_limit_per_night NUMERIC(10, 2), 
	food_limit_per_day NUMERIC(10, 2), 
	taxi_limit_per_day NUMERIC(10, 2), 
	misc_limit_per_day NUMERIC(10, 2), 
	flight_class VARCHAR(20), 
	train_class VARCHAR(20), 
	l2_approval_threshold NUMERIC(10, 2), 
	weekend_requires_l2 BOOLEAN, 
	advance_max_percent FLOAT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE INDEX ix_travel_policies_id ON travel_policies (id);


CREATE TABLE vendors (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	vendor_number VARCHAR(50), 
	company_name VARCHAR(255) NOT NULL, 
	vendor_type VARCHAR(50), 
	gstin VARCHAR(20), 
	pan VARCHAR(15), 
	msme_number VARCHAR(50), 
	msme_category VARCHAR(20), 
	credit_days INTEGER, 
	payment_terms VARCHAR(100), 
	currency VARCHAR(10), 
	billing_address TEXT, 
	city VARCHAR(100), 
	state VARCHAR(100), 
	country VARCHAR(100), 
	phone VARCHAR(20), 
	email VARCHAR(255), 
	website VARCHAR(255), 
	bank_name VARCHAR(100), 
	bank_account VARCHAR(50), 
	bank_ifsc VARCHAR(20), 
	rating FLOAT, 
	status VARCHAR(50), 
	tags JSON, 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (vendor_number)
);


CREATE TABLE assets (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	asset_number VARCHAR(50), 
	name VARCHAR(255) NOT NULL, 
	asset_type VARCHAR(100), 
	category VARCHAR(100), 
	make VARCHAR(100), 
	model VARCHAR(100), 
	serial_number VARCHAR(100), 
	purchase_date DATE, 
	purchase_price NUMERIC(15, 2), 
	vendor_id INTEGER, 
	warranty_expiry DATE, 
	location VARCHAR(255), 
	assigned_to INTEGER, 
	department_id INTEGER, 
	condition VARCHAR(50), 
	status VARCHAR(50), 
	depreciation_method VARCHAR(50), 
	useful_life_years INTEGER, 
	salvage_value NUMERIC(15, 2), 
	book_value NUMERIC(15, 2), 
	image_url VARCHAR(500), 
	barcode VARCHAR(100), 
	qr_code VARCHAR(500), 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (asset_number), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id), 
	FOREIGN KEY(assigned_to) REFERENCES employees (id), 
	FOREIGN KEY(department_id) REFERENCES departments (id)
);


CREATE TABLE attendance_logs (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	device_id INTEGER, 
	punch_time TIMESTAMP WITH TIME ZONE NOT NULL, 
	punch_type VARCHAR(20), 
	source VARCHAR(30), 
	raw_data TEXT, 
	is_processed BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(device_id) REFERENCES biometric_devices (id)
);

CREATE INDEX ix_attendance_logs_id ON attendance_logs (id);


CREATE TABLE attendances (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	employee_id INTEGER NOT NULL, 
	date DATE NOT NULL, 
	check_in TIMESTAMP WITH TIME ZONE, 
	check_out TIMESTAMP WITH TIME ZONE, 
	hours_worked FLOAT, 
	overtime_hours FLOAT, 
	status VARCHAR(50), 
	attendance_type VARCHAR(50), 
	notes VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id)
);


CREATE TABLE branches (
	id SERIAL NOT NULL, 
	tenant_id INTEGER NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	code VARCHAR(20), 
	gstin VARCHAR(20), 
	address TEXT, 
	city VARCHAR(100), 
	state VARCHAR(100), 
	phone VARCHAR(20), 
	email VARCHAR(255), 
	is_active BOOLEAN, 
	is_head_office BOOLEAN, 
	parent_branch_id INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	FOREIGN KEY(parent_branch_id) REFERENCES branches (id)
);


CREATE TABLE budgets (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	name VARCHAR(255) NOT NULL, 
	fiscal_year VARCHAR(20), 
	period_type VARCHAR(20), 
	account_id INTEGER, 
	department VARCHAR(100), 
	january NUMERIC(15, 2), 
	february NUMERIC(15, 2), 
	march NUMERIC(15, 2), 
	april NUMERIC(15, 2), 
	may NUMERIC(15, 2), 
	june NUMERIC(15, 2), 
	july NUMERIC(15, 2), 
	august NUMERIC(15, 2), 
	september NUMERIC(15, 2), 
	october NUMERIC(15, 2), 
	november NUMERIC(15, 2), 
	december NUMERIC(15, 2), 
	total_budget NUMERIC(15, 2), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(account_id) REFERENCES accounts (id)
);


CREATE TABLE company_profiles (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	legal_name VARCHAR(300) NOT NULL, 
	trade_name VARCHAR(300), 
	company_type VARCHAR(50), 
	industry VARCHAR(100), 
	founded_year INTEGER, 
	logo_url VARCHAR(500), 
	favicon_url VARCHAR(500), 
	brand_color VARCHAR(20), 
	address_line1 VARCHAR(300), 
	address_line2 VARCHAR(300), 
	city VARCHAR(100), 
	state VARCHAR(100), 
	postal_code VARCHAR(20), 
	country VARCHAR(50), 
	country_code VARCHAR(5), 
	phone VARCHAR(30), 
	fax VARCHAR(30), 
	email VARCHAR(200), 
	website VARCHAR(300), 
	tax_registrations JSON, 
	currency VARCHAR(10), 
	currency_symbol VARCHAR(5), 
	locale VARCHAR(10), 
	timezone VARCHAR(50), 
	date_format VARCHAR(20), 
	fiscal_year_start VARCHAR(5), 
	bank_name VARCHAR(200), 
	bank_account VARCHAR(50), 
	bank_ifsc VARCHAR(20), 
	bank_branch VARCHAR(200), 
	swift_code VARCHAR(20), 
	iban VARCHAR(50), 
	invoice_prefix VARCHAR(10), 
	po_prefix VARCHAR(10), 
	so_prefix VARCHAR(10), 
	quotation_prefix VARCHAR(10), 
	default_payment_terms VARCHAR(100), 
	invoice_footer TEXT, 
	terms_conditions TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (tenant_id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id)
);

CREATE INDEX ix_company_profiles_id ON company_profiles (id);


CREATE TABLE education_details (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	degree VARCHAR(150) NOT NULL, 
	specialization VARCHAR(200), 
	institution VARCHAR(300), 
	university VARCHAR(300), 
	year_from INTEGER, 
	year_to INTEGER, 
	grade VARCHAR(20), 
	grade_value FLOAT, 
	grade_type VARCHAR(10), 
	country VARCHAR(50), 
	is_highest BOOLEAN, 
	is_verified BOOLEAN, 
	certificate_url VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id)
);

CREATE INDEX ix_education_details_id ON education_details (id);


CREATE TABLE employee_appraisals (
	id SERIAL NOT NULL, 
	cycle_id INTEGER NOT NULL, 
	employee_id INTEGER NOT NULL, 
	reviewer_id INTEGER, 
	hr_reviewer_id INTEGER, 
	status VARCHAR(30), 
	kras JSON, 
	self_score FLOAT, 
	manager_score FLOAT, 
	final_score FLOAT, 
	rating_label VARCHAR(30), 
	goals_next_period JSON, 
	development_plan TEXT, 
	training_needs TEXT, 
	employee_comments TEXT, 
	manager_comments TEXT, 
	hr_comments TEXT, 
	outcome VARCHAR(30), 
	increment_percent FLOAT, 
	bonus_amount NUMERIC(12, 2), 
	promotion_to VARCHAR(100), 
	kra_set_date TIMESTAMP WITH TIME ZONE, 
	self_review_date TIMESTAMP WITH TIME ZONE, 
	manager_review_date TIMESTAMP WITH TIME ZONE, 
	closed_date TIMESTAMP WITH TIME ZONE, 
	employee_acknowledged BOOLEAN, 
	employee_acknowledged_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(cycle_id) REFERENCES appraisal_cycles (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(reviewer_id) REFERENCES employees (id)
);

CREATE INDEX ix_employee_appraisals_id ON employee_appraisals (id);


CREATE TABLE employee_benefits (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	plan_id INTEGER NOT NULL, 
	enrollment_date DATE, 
	end_date DATE, 
	policy_number VARCHAR(100), 
	nominee_name VARCHAR(200), 
	nominee_relation VARCHAR(50), 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(plan_id) REFERENCES benefit_plans (id)
);

CREATE INDEX ix_employee_benefits_id ON employee_benefits (id);


CREATE TABLE employee_documents (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	document_type VARCHAR(50) NOT NULL, 
	document_name VARCHAR(200), 
	document_number VARCHAR(100), 
	issue_date DATE, 
	expiry_date DATE, 
	file_url VARCHAR(500), 
	file_size INTEGER, 
	is_verified BOOLEAN, 
	verified_by INTEGER, 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id)
);

CREATE INDEX ix_employee_documents_id ON employee_documents (id);


CREATE TABLE employee_salary_details (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	structure_id INTEGER, 
	ctc_annual NUMERIC(15, 2), 
	ctc_monthly NUMERIC(15, 2), 
	component_values JSON, 
	pf_account VARCHAR(30), 
	uan_number VARCHAR(20), 
	esi_number VARCHAR(20), 
	pan_number VARCHAR(20), 
	tax_regime VARCHAR(20), 
	effective_from TIMESTAMP WITH TIME ZONE, 
	is_active BOOLEAN, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (employee_id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(structure_id) REFERENCES salary_structures (id)
);

CREATE INDEX ix_employee_salary_details_id ON employee_salary_details (id);


CREATE TABLE exit_records (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	resignation_date DATE, 
	notice_period_days INTEGER, 
	last_working_date DATE, 
	exit_reason VARCHAR(50), 
	exit_reason_detail TEXT, 
	is_eligible_rehire BOOLEAN, 
	noc_issued BOOLEAN, 
	experience_letter BOOLEAN, 
	equipment_returned BOOLEAN, 
	access_revoked BOOLEAN, 
	final_settlement BOOLEAN, 
	exit_interview_done BOOLEAN, 
	exit_feedback TEXT, 
	interviewer_id INTEGER, 
	status VARCHAR(20), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (employee_id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id)
);

CREATE INDEX ix_exit_records_id ON exit_records (id);


CREATE TABLE form_16 (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	financial_year VARCHAR(10) NOT NULL, 
	assessment_year VARCHAR(10) NOT NULL, 
	tan_of_employer VARCHAR(20), 
	pan_of_employee VARCHAR(20), 
	total_tax_deducted NUMERIC(12, 2), 
	gross_salary NUMERIC(15, 2), 
	exemptions JSON, 
	deductions_80c NUMERIC(12, 2), 
	deductions_80d NUMERIC(12, 2), 
	deductions_other JSON, 
	standard_deduction NUMERIC(10, 2), 
	taxable_income NUMERIC(15, 2), 
	tax_on_income NUMERIC(12, 2), 
	surcharge NUMERIC(10, 2), 
	health_education_cess NUMERIC(10, 2), 
	total_tax_payable NUMERIC(12, 2), 
	tax_regime VARCHAR(10), 
	is_generated BOOLEAN, 
	generated_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id)
);

CREATE INDEX ix_form_16_id ON form_16 (id);


CREATE TABLE holidays (
	id SERIAL NOT NULL, 
	holiday_type_id INTEGER NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	date DATE NOT NULL, 
	year INTEGER NOT NULL, 
	day_of_week VARCHAR(10), 
	country VARCHAR(50), 
	applicable_states TEXT, 
	applicable_regions TEXT, 
	applicable_religions TEXT, 
	is_optional BOOLEAN, 
	is_paid BOOLEAN, 
	description TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(holiday_type_id) REFERENCES holiday_types (id)
);

CREATE INDEX ix_holidays_id ON holidays (id);


CREATE TABLE kra_templates (
	id SERIAL NOT NULL, 
	cycle_id INTEGER NOT NULL, 
	department_id INTEGER, 
	designation VARCHAR(100), 
	kra_name VARCHAR(200) NOT NULL, 
	kra_description TEXT, 
	weightage FLOAT, 
	measurement_criteria TEXT, 
	target_value VARCHAR(100), 
	kpi_type VARCHAR(20), 
	is_mandatory BOOLEAN, 
	sort_order INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(cycle_id) REFERENCES appraisal_cycles (id)
);

CREATE INDEX ix_kra_templates_id ON kra_templates (id);


CREATE TABLE leave_balances (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	leave_type_id INTEGER NOT NULL, 
	year INTEGER NOT NULL, 
	opening_balance FLOAT, 
	accrued FLOAT, 
	availed FLOAT, 
	pending FLOAT, 
	closing_balance FLOAT, 
	carried_forward FLOAT, 
	encashed FLOAT, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(leave_type_id) REFERENCES leave_types (id)
);

CREATE INDEX ix_leave_balances_id ON leave_balances (id);


CREATE TABLE leave_policies (
	id SERIAL NOT NULL, 
	leave_type_id INTEGER NOT NULL, 
	policy_name VARCHAR(100), 
	employment_type VARCHAR(30), 
	department_id INTEGER, 
	days_per_year FLOAT NOT NULL, 
	carry_forward_max FLOAT, 
	encashment_max FLOAT, 
	probation_allowed BOOLEAN, 
	effective_from DATE, 
	effective_to DATE, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(leave_type_id) REFERENCES leave_types (id)
);

CREATE INDEX ix_leave_policies_id ON leave_policies (id);


CREATE TABLE manager_hierarchy (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	reporting_manager_id INTEGER, 
	dotted_manager_id INTEGER, 
	is_department_head BOOLEAN, 
	is_hr_manager BOOLEAN, 
	is_finance_approver BOOLEAN, 
	approval_limit INTEGER, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (employee_id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(reporting_manager_id) REFERENCES employees (id), 
	FOREIGN KEY(dotted_manager_id) REFERENCES employees (id)
);

CREATE INDEX ix_manager_hierarchy_id ON manager_hierarchy (id);


CREATE TABLE onboarding_records (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	template_id INTEGER, 
	start_date DATE, 
	target_completion DATE, 
	status VARCHAR(30), 
	progress_percent FLOAT, 
	task_statuses JSON, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (employee_id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(template_id) REFERENCES onboarding_templates (id)
);

CREATE INDEX ix_onboarding_records_id ON onboarding_records (id);


CREATE TABLE payrolls (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	employee_id INTEGER NOT NULL, 
	payroll_period VARCHAR(20), 
	month INTEGER, 
	year INTEGER, 
	working_days INTEGER, 
	present_days FLOAT, 
	leave_days FLOAT, 
	basic_salary NUMERIC(15, 2), 
	hra NUMERIC(15, 2), 
	other_allowances NUMERIC(15, 2), 
	gross_salary NUMERIC(15, 2), 
	pf_employee NUMERIC(15, 2), 
	pf_employer NUMERIC(15, 2), 
	esic_employee NUMERIC(15, 2), 
	esic_employer NUMERIC(15, 2), 
	professional_tax NUMERIC(15, 2), 
	tds NUMERIC(15, 2), 
	other_deductions NUMERIC(15, 2), 
	total_deductions NUMERIC(15, 2), 
	net_salary NUMERIC(15, 2), 
	status VARCHAR(50), 
	payment_date TIMESTAMP WITH TIME ZONE, 
	payment_mode VARCHAR(50), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id)
);


CREATE TABLE payslips (
	id SERIAL NOT NULL, 
	run_id INTEGER NOT NULL, 
	employee_id INTEGER NOT NULL, 
	month INTEGER, 
	year INTEGER, 
	total_days INTEGER, 
	working_days INTEGER, 
	paid_days NUMERIC(5, 2), 
	lop_days NUMERIC(5, 2), 
	earnings JSON, 
	gross_salary NUMERIC(12, 2), 
	deductions JSON, 
	total_deductions NUMERIC(12, 2), 
	tax_deducted NUMERIC(12, 2), 
	professional_tax NUMERIC(8, 2), 
	net_salary NUMERIC(12, 2), 
	employer_pf NUMERIC(10, 2), 
	employer_esi NUMERIC(10, 2), 
	employer_gratuity NUMERIC(10, 2), 
	reimbursements NUMERIC(10, 2), 
	arrears NUMERIC(10, 2), 
	bonus NUMERIC(10, 2), 
	ytd_gross NUMERIC(15, 2), 
	ytd_tax NUMERIC(15, 2), 
	ytd_net NUMERIC(15, 2), 
	status VARCHAR(20), 
	payment_date TIMESTAMP WITH TIME ZONE, 
	payment_ref VARCHAR(100), 
	bank_account VARCHAR(50), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(run_id) REFERENCES payroll_runs (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id)
);

CREATE INDEX ix_payslips_id ON payslips (id);


CREATE TABLE performance_reviews (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	reviewer_id INTEGER, 
	review_period VARCHAR(30), 
	review_type VARCHAR(20), 
	review_date DATE, 
	overall_rating FLOAT, 
	goal_achievement FLOAT, 
	skill_rating FLOAT, 
	behavior_rating FLOAT, 
	strengths TEXT, 
	areas_for_improvement TEXT, 
	goals_next_period TEXT, 
	employee_comments TEXT, 
	rating_label VARCHAR(20), 
	outcome VARCHAR(30), 
	increment_percent FLOAT, 
	status VARCHAR(20), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(reviewer_id) REFERENCES employees (id)
);

CREATE INDEX ix_performance_reviews_id ON performance_reviews (id);


CREATE TABLE products (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	sku VARCHAR(100) NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	description TEXT, 
	category_id INTEGER, 
	product_type VARCHAR(50), 
	unit VARCHAR(50), 
	hsn_code VARCHAR(20), 
	barcode VARCHAR(100), 
	image_url VARCHAR(500), 
	cost_price NUMERIC(15, 2), 
	selling_price NUMERIC(15, 2), 
	mrp NUMERIC(15, 2), 
	tax_percent FLOAT, 
	reorder_level FLOAT, 
	reorder_quantity FLOAT, 
	lead_time_days INTEGER, 
	is_serialized BOOLEAN, 
	is_batch_tracked BOOLEAN, 
	weight FLOAT, 
	dimensions JSON, 
	custom_fields JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (sku), 
	FOREIGN KEY(category_id) REFERENCES product_categories (id)
);


CREATE TABLE role_permissions (
	role_id INTEGER, 
	permission_id INTEGER, 
	FOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE, 
	FOREIGN KEY(permission_id) REFERENCES permissions (id) ON DELETE CASCADE
);


CREATE TABLE skills (
	id SERIAL NOT NULL, 
	category_id INTEGER, 
	name VARCHAR(150) NOT NULL, 
	description TEXT, 
	skill_type VARCHAR(30), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(category_id) REFERENCES skill_categories (id)
);

CREATE INDEX ix_skills_id ON skills (id);


CREATE TABLE tax_slabs (
	id SERIAL NOT NULL, 
	tax_type_id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	rate FLOAT NOT NULL, 
	cgst_rate FLOAT, 
	sgst_rate FLOAT, 
	igst_rate FLOAT, 
	cess_rate FLOAT, 
	is_inclusive BOOLEAN, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tax_type_id) REFERENCES tax_types (id)
);

CREATE INDEX ix_tax_slabs_id ON tax_slabs (id);


CREATE TABLE training_enrollments (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	course_id INTEGER NOT NULL, 
	enrolled_date DATE, 
	scheduled_date DATE, 
	completion_date DATE, 
	status VARCHAR(20), 
	score FLOAT, 
	grade VARCHAR(10), 
	certificate_url VARCHAR(500), 
	expiry_date DATE, 
	feedback TEXT, 
	trainer_name VARCHAR(200), 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(course_id) REFERENCES training_courses (id)
);

CREATE INDEX ix_training_enrollments_id ON training_enrollments (id);


CREATE TABLE users (
	id SERIAL NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	username VARCHAR(100), 
	full_name VARCHAR(255), 
	hashed_password VARCHAR(255) NOT NULL, 
	is_active BOOLEAN, 
	is_superuser BOOLEAN, 
	tenant_id INTEGER, 
	branch_id INTEGER, 
	phone VARCHAR(20), 
	avatar_url VARCHAR(500), 
	department VARCHAR(100), 
	job_title VARCHAR(150), 
	employee_id INTEGER, 
	last_login TIMESTAMP WITH TIME ZONE, 
	password_changed_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE INDEX ix_users_id ON users (id);

CREATE UNIQUE INDEX ix_users_username ON users (username);


CREATE TABLE approval_authorities (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	workflow_type VARCHAR(50) NOT NULL, 
	scope VARCHAR(20), 
	department_id INTEGER, 
	max_amount INTEGER, 
	can_approve BOOLEAN, 
	can_reject BOOLEAN, 
	can_delegate BOOLEAN, 
	is_active BOOLEAN, 
	granted_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(granted_by) REFERENCES users (id)
);

CREATE INDEX ix_approval_authorities_id ON approval_authorities (id);


CREATE TABLE approval_requests (
	id SERIAL NOT NULL, 
	request_number VARCHAR(50), 
	workflow_type VARCHAR(50) NOT NULL, 
	reference_id INTEGER NOT NULL, 
	reference_number VARCHAR(100), 
	title VARCHAR(300) NOT NULL, 
	description TEXT, 
	requested_by INTEGER NOT NULL, 
	employee_id INTEGER, 
	department_id INTEGER, 
	amount INTEGER, 
	status VARCHAR(30), 
	current_step INTEGER, 
	total_steps INTEGER, 
	priority VARCHAR(20), 
	due_date TIMESTAMP WITH TIME ZONE, 
	meta_data JSON, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (request_number), 
	FOREIGN KEY(requested_by) REFERENCES users (id)
);

CREATE INDEX ix_approval_requests_id ON approval_requests (id);


CREATE TABLE approval_steps (
	id SERIAL NOT NULL, 
	workflow_id INTEGER NOT NULL, 
	step_order INTEGER NOT NULL, 
	step_name VARCHAR(100) NOT NULL, 
	approver_type VARCHAR(50) NOT NULL, 
	approver_role VARCHAR(100), 
	approver_user_id INTEGER, 
	is_mandatory BOOLEAN, 
	auto_approve_days INTEGER, 
	can_skip BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(workflow_id) REFERENCES approval_workflows (id), 
	FOREIGN KEY(approver_user_id) REFERENCES users (id)
);

CREATE INDEX ix_approval_steps_id ON approval_steps (id);


CREATE TABLE asset_depreciations (
	id SERIAL NOT NULL, 
	asset_id INTEGER NOT NULL, 
	period VARCHAR(20), 
	depreciation_amount NUMERIC(15, 2), 
	accumulated_depreciation NUMERIC(15, 2), 
	book_value NUMERIC(15, 2), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(asset_id) REFERENCES assets (id)
);


CREATE TABLE asset_maintenances (
	id SERIAL NOT NULL, 
	asset_id INTEGER NOT NULL, 
	maintenance_type VARCHAR(50), 
	scheduled_date DATE, 
	completed_date DATE, 
	cost NUMERIC(15, 2), 
	vendor_id INTEGER, 
	technician VARCHAR(100), 
	description TEXT, 
	next_maintenance_date DATE, 
	status VARCHAR(50), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(asset_id) REFERENCES assets (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id)
);


CREATE TABLE attendance_regularizations (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	attendance_date DATE NOT NULL, 
	requested_in TIME WITHOUT TIME ZONE, 
	requested_out TIME WITHOUT TIME ZONE, 
	reason TEXT NOT NULL, 
	regularization_type VARCHAR(30), 
	on_duty_location VARCHAR(200), 
	status VARCHAR(20), 
	approved_by INTEGER, 
	approved_at TIMESTAMP WITH TIME ZONE, 
	rejection_reason TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(approved_by) REFERENCES users (id)
);

CREATE INDEX ix_attendance_regularizations_id ON attendance_regularizations (id);


CREATE TABLE boms (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	bom_number VARCHAR(50), 
	name VARCHAR(255) NOT NULL, 
	product_id INTEGER NOT NULL, 
	quantity FLOAT, 
	unit VARCHAR(50), 
	version VARCHAR(20), 
	status VARCHAR(50), 
	routing_id INTEGER, 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (bom_number), 
	FOREIGN KEY(product_id) REFERENCES products (id)
);


CREATE TABLE crm_activities (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	entity_type VARCHAR(50), 
	entity_id INTEGER, 
	activity_type VARCHAR(50), 
	subject VARCHAR(255), 
	description TEXT, 
	scheduled_at TIMESTAMP WITH TIME ZONE, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	outcome VARCHAR(255), 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);


CREATE TABLE customers (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	customer_number VARCHAR(50), 
	company_name VARCHAR(255) NOT NULL, 
	customer_type VARCHAR(50), 
	industry VARCHAR(100), 
	gstin VARCHAR(20), 
	pan VARCHAR(15), 
	credit_limit FLOAT, 
	credit_days INTEGER, 
	payment_terms VARCHAR(100), 
	currency VARCHAR(10), 
	billing_address TEXT, 
	shipping_address TEXT, 
	city VARCHAR(100), 
	state VARCHAR(100), 
	country VARCHAR(100), 
	pincode VARCHAR(10), 
	phone VARCHAR(20), 
	email VARCHAR(255), 
	website VARCHAR(255), 
	account_manager_id INTEGER, 
	segment VARCHAR(100), 
	tags JSON, 
	annual_revenue FLOAT, 
	employee_count INTEGER, 
	status VARCHAR(50), 
	source VARCHAR(100), 
	lead_id INTEGER, 
	custom_fields JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (customer_number), 
	FOREIGN KEY(account_manager_id) REFERENCES users (id)
);


CREATE TABLE document_folders (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	name VARCHAR(255) NOT NULL, 
	parent_id INTEGER, 
	description TEXT, 
	is_public BOOLEAN, 
	access_roles JSON, 
	created_by INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(parent_id) REFERENCES document_folders (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);


CREATE TABLE employee_skills (
	id SERIAL NOT NULL, 
	employee_id INTEGER NOT NULL, 
	skill_id INTEGER, 
	skill_name VARCHAR(150), 
	proficiency VARCHAR(20), 
	proficiency_score INTEGER, 
	years_experience FLOAT, 
	last_used_year INTEGER, 
	is_primary BOOLEAN, 
	certification VARCHAR(200), 
	cert_date DATE, 
	verified_by INTEGER, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(skill_id) REFERENCES skills (id)
);

CREATE INDEX ix_employee_skills_id ON employee_skills (id);


CREATE TABLE expenses (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	expense_number VARCHAR(50), 
	employee_id INTEGER, 
	expense_date TIMESTAMP WITH TIME ZONE, 
	category VARCHAR(100), 
	description TEXT, 
	amount NUMERIC(15, 2) NOT NULL, 
	tax_amount NUMERIC(15, 2), 
	total_amount NUMERIC(15, 2), 
	currency VARCHAR(10), 
	payment_mode VARCHAR(50), 
	vendor_name VARCHAR(255), 
	receipt_url VARCHAR(500), 
	status VARCHAR(50), 
	approved_by INTEGER, 
	project_id INTEGER, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (expense_number), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(approved_by) REFERENCES users (id)
);


CREATE TABLE hsn_codes (
	id SERIAL NOT NULL, 
	code VARCHAR(20) NOT NULL, 
	description VARCHAR(500), 
	code_type VARCHAR(10), 
	default_slab_id INTEGER, 
	chapter VARCHAR(10), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (code), 
	FOREIGN KEY(default_slab_id) REFERENCES tax_slabs (id)
);

CREATE INDEX ix_hsn_codes_id ON hsn_codes (id);


CREATE TABLE journal_entries (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	entry_number VARCHAR(50), 
	entry_date TIMESTAMP WITH TIME ZONE, 
	reference VARCHAR(100), 
	description TEXT, 
	total_debit NUMERIC(15, 2), 
	total_credit NUMERIC(15, 2), 
	status VARCHAR(50), 
	entry_type VARCHAR(50), 
	created_by INTEGER, 
	approved_by INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (entry_number), 
	FOREIGN KEY(created_by) REFERENCES users (id), 
	FOREIGN KEY(approved_by) REFERENCES users (id)
);


CREATE TABLE knowledge_base (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	title VARCHAR(500) NOT NULL, 
	content TEXT, 
	category VARCHAR(100), 
	tags JSON, 
	views INTEGER, 
	helpful_count INTEGER, 
	status VARCHAR(50), 
	created_by INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);


CREATE TABLE leads (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	lead_number VARCHAR(50), 
	first_name VARCHAR(100) NOT NULL, 
	last_name VARCHAR(100), 
	email VARCHAR(255), 
	phone VARCHAR(20), 
	company VARCHAR(255), 
	designation VARCHAR(100), 
	industry VARCHAR(100), 
	source VARCHAR(100), 
	utm_source VARCHAR(100), 
	utm_medium VARCHAR(100), 
	utm_campaign VARCHAR(100), 
	status VARCHAR(50), 
	priority VARCHAR(20), 
	annual_revenue FLOAT, 
	employee_count INTEGER, 
	city VARCHAR(100), 
	state VARCHAR(100), 
	country VARCHAR(100), 
	description TEXT, 
	assigned_to INTEGER, 
	campaign_id INTEGER, 
	converted_at TIMESTAMP WITH TIME ZONE, 
	converted_to_customer_id INTEGER, 
	rfp_document_url VARCHAR(500), 
	parsed_data JSON, 
	custom_fields JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (lead_number), 
	FOREIGN KEY(assigned_to) REFERENCES users (id), 
	FOREIGN KEY(campaign_id) REFERENCES campaigns (id)
);


CREATE TABLE leaves (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	employee_id INTEGER NOT NULL, 
	leave_type VARCHAR(50), 
	from_date DATE NOT NULL, 
	to_date DATE NOT NULL, 
	days FLOAT, 
	reason TEXT, 
	status VARCHAR(50), 
	approved_by INTEGER, 
	approved_at TIMESTAMP WITH TIME ZONE, 
	rejection_reason VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(approved_by) REFERENCES users (id)
);


CREATE TABLE payroll_items (
	id SERIAL NOT NULL, 
	payroll_id INTEGER NOT NULL, 
	item_type VARCHAR(50), 
	name VARCHAR(100), 
	amount NUMERIC(15, 2), 
	PRIMARY KEY (id), 
	FOREIGN KEY(payroll_id) REFERENCES payrolls (id)
);


CREATE TABLE purchase_orders (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	po_number VARCHAR(50) NOT NULL, 
	vendor_id INTEGER NOT NULL, 
	status VARCHAR(50), 
	order_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	expected_delivery TIMESTAMP WITH TIME ZONE, 
	delivery_address TEXT, 
	subtotal NUMERIC(15, 2), 
	tax_amount NUMERIC(15, 2), 
	total_amount NUMERIC(15, 2), 
	currency VARCHAR(10), 
	payment_terms VARCHAR(100), 
	notes TEXT, 
	approved_by INTEGER, 
	approved_at TIMESTAMP WITH TIME ZONE, 
	created_by INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (po_number), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id), 
	FOREIGN KEY(approved_by) REFERENCES users (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);


CREATE TABLE quality_checks (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	check_number VARCHAR(50), 
	check_type VARCHAR(50), 
	reference_type VARCHAR(50), 
	reference_id INTEGER, 
	product_id INTEGER, 
	batch_number VARCHAR(100), 
	quantity_checked FLOAT, 
	quantity_passed FLOAT, 
	quantity_failed FLOAT, 
	status VARCHAR(50), 
	inspector_id INTEGER, 
	check_date TIMESTAMP WITH TIME ZONE, 
	notes TEXT, 
	results JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (check_number), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(inspector_id) REFERENCES users (id)
);


CREATE TABLE quality_parameters (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	name VARCHAR(255) NOT NULL, 
	parameter_type VARCHAR(50), 
	unit VARCHAR(50), 
	min_value FLOAT, 
	max_value FLOAT, 
	target_value FLOAT, 
	product_id INTEGER, 
	is_critical BOOLEAN, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(product_id) REFERENCES products (id)
);


CREATE TABLE sales_order_templates (
	id SERIAL NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	category VARCHAR(100), 
	payment_terms VARCHAR(100), 
	notes TEXT, 
	is_active BOOLEAN, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);

CREATE INDEX ix_sales_order_templates_id ON sales_order_templates (id);


CREATE TABLE user_roles (
	user_id INTEGER, 
	role_id INTEGER, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE
);


CREATE TABLE warehouses (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	name VARCHAR(255) NOT NULL, 
	code VARCHAR(50), 
	warehouse_type VARCHAR(50), 
	address TEXT, 
	city VARCHAR(100), 
	state VARCHAR(100), 
	capacity FLOAT, 
	manager_id INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(manager_id) REFERENCES users (id)
);


CREATE TABLE approval_actions (
	id SERIAL NOT NULL, 
	request_id INTEGER NOT NULL, 
	step_number INTEGER NOT NULL, 
	step_name VARCHAR(100), 
	actioned_by INTEGER NOT NULL, 
	action VARCHAR(30) NOT NULL, 
	comment TEXT, 
	delegated_to INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(request_id) REFERENCES approval_requests (id), 
	FOREIGN KEY(actioned_by) REFERENCES users (id), 
	FOREIGN KEY(delegated_to) REFERENCES users (id)
);

CREATE INDEX ix_approval_actions_id ON approval_actions (id);


CREATE TABLE bom_items (
	id SERIAL NOT NULL, 
	bom_id INTEGER NOT NULL, 
	product_id INTEGER NOT NULL, 
	quantity FLOAT NOT NULL, 
	unit VARCHAR(50), 
	scrap_percent FLOAT, 
	notes TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(bom_id) REFERENCES boms (id), 
	FOREIGN KEY(product_id) REFERENCES products (id)
);


CREATE TABLE contacts (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	customer_id INTEGER NOT NULL, 
	first_name VARCHAR(100) NOT NULL, 
	last_name VARCHAR(100), 
	designation VARCHAR(100), 
	department VARCHAR(100), 
	email VARCHAR(255), 
	phone VARCHAR(20), 
	mobile VARCHAR(20), 
	is_primary BOOLEAN, 
	is_decision_maker BOOLEAN, 
	linkedin_url VARCHAR(500), 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(customer_id) REFERENCES customers (id)
);


CREATE TABLE documents (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	doc_number VARCHAR(50), 
	title VARCHAR(500) NOT NULL, 
	description TEXT, 
	folder_id INTEGER, 
	document_type VARCHAR(100), 
	file_url VARCHAR(500), 
	file_name VARCHAR(255), 
	file_size FLOAT, 
	mime_type VARCHAR(100), 
	tags JSON, 
	entity_type VARCHAR(50), 
	entity_id INTEGER, 
	expiry_date TIMESTAMP WITH TIME ZONE, 
	is_confidential BOOLEAN, 
	access_roles JSON, 
	version VARCHAR(20), 
	status VARCHAR(50), 
	created_by INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (doc_number), 
	FOREIGN KEY(folder_id) REFERENCES document_folders (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);


CREATE TABLE goods_receipts (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	grn_number VARCHAR(50), 
	purchase_order_id INTEGER, 
	vendor_id INTEGER, 
	warehouse_id INTEGER, 
	receipt_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	vendor_invoice_number VARCHAR(100), 
	status VARCHAR(50), 
	notes TEXT, 
	received_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (grn_number), 
	FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id), 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id), 
	FOREIGN KEY(received_by) REFERENCES users (id)
);


CREATE TABLE journal_lines (
	id SERIAL NOT NULL, 
	journal_entry_id INTEGER NOT NULL, 
	account_id INTEGER NOT NULL, 
	description VARCHAR(500), 
	debit_amount NUMERIC(15, 2), 
	credit_amount NUMERIC(15, 2), 
	cost_center VARCHAR(100), 
	project_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(journal_entry_id) REFERENCES journal_entries (id), 
	FOREIGN KEY(account_id) REFERENCES accounts (id)
);


CREATE TABLE lead_activities (
	id SERIAL NOT NULL, 
	lead_id INTEGER NOT NULL, 
	tenant_id INTEGER, 
	activity_type VARCHAR(50), 
	subject VARCHAR(255), 
	description TEXT, 
	scheduled_at TIMESTAMP WITH TIME ZONE, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	outcome VARCHAR(255), 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(lead_id) REFERENCES leads (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);


CREATE TABLE non_conformances (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	nc_number VARCHAR(50), 
	quality_check_id INTEGER, 
	product_id INTEGER, 
	defect_type VARCHAR(100), 
	severity VARCHAR(50), 
	description TEXT, 
	root_cause TEXT, 
	corrective_action TEXT, 
	preventive_action TEXT, 
	status VARCHAR(50), 
	raised_by INTEGER, 
	assigned_to INTEGER, 
	target_closure_date TIMESTAMP WITH TIME ZONE, 
	closed_at TIMESTAMP WITH TIME ZONE, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (nc_number), 
	FOREIGN KEY(quality_check_id) REFERENCES quality_checks (id), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(raised_by) REFERENCES users (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id)
);


CREATE TABLE projects (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	project_number VARCHAR(50), 
	name VARCHAR(255) NOT NULL, 
	description TEXT, 
	project_type VARCHAR(50), 
	customer_id INTEGER, 
	status VARCHAR(50), 
	priority VARCHAR(20), 
	start_date DATE, 
	end_date DATE, 
	actual_start DATE, 
	actual_end DATE, 
	budget NUMERIC(15, 2), 
	actual_cost NUMERIC(15, 2), 
	progress_percent FLOAT, 
	project_manager_id INTEGER, 
	members JSON, 
	tags JSON, 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (project_number), 
	FOREIGN KEY(customer_id) REFERENCES customers (id), 
	FOREIGN KEY(project_manager_id) REFERENCES users (id)
);


CREATE TABLE purchase_order_items (
	id SERIAL NOT NULL, 
	po_id INTEGER NOT NULL, 
	product_id INTEGER, 
	description VARCHAR(500), 
	quantity FLOAT NOT NULL, 
	received_quantity FLOAT, 
	unit VARCHAR(50), 
	unit_price NUMERIC(15, 2), 
	tax_percent FLOAT, 
	tax_amount NUMERIC(15, 2), 
	line_total NUMERIC(15, 2), 
	hsn_code VARCHAR(20), 
	PRIMARY KEY (id), 
	FOREIGN KEY(po_id) REFERENCES purchase_orders (id), 
	FOREIGN KEY(product_id) REFERENCES products (id)
);


CREATE TABLE sales_order_template_items (
	id SERIAL NOT NULL, 
	template_id INTEGER NOT NULL, 
	product_id INTEGER, 
	description VARCHAR(500) NOT NULL, 
	item_type VARCHAR(20), 
	quantity FLOAT, 
	unit VARCHAR(50), 
	unit_price NUMERIC(15, 2), 
	discount_percent FLOAT, 
	tax_slab_id INTEGER, 
	tax_percent FLOAT, 
	hsn_code VARCHAR(20), 
	sort_order INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(template_id) REFERENCES sales_order_templates (id), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(tax_slab_id) REFERENCES tax_slabs (id)
);

CREATE INDEX ix_sales_order_template_items_id ON sales_order_template_items (id);


CREATE TABLE sales_orders (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	order_number VARCHAR(50) NOT NULL, 
	customer_id INTEGER NOT NULL, 
	branch_id INTEGER, 
	status VARCHAR(50), 
	order_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	delivery_date TIMESTAMP WITH TIME ZONE, 
	payment_terms VARCHAR(100), 
	payment_status VARCHAR(50), 
	shipping_address TEXT, 
	billing_address TEXT, 
	subtotal NUMERIC(15, 2), 
	discount_amount NUMERIC(15, 2), 
	tax_amount NUMERIC(15, 2), 
	total_amount NUMERIC(15, 2), 
	currency VARCHAR(10), 
	notes TEXT, 
	assigned_to INTEGER, 
	opportunity_id INTEGER, 
	purchase_order_number VARCHAR(100), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (order_number), 
	FOREIGN KEY(customer_id) REFERENCES customers (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id)
);


CREATE TABLE stock_alerts (
	id SERIAL NOT NULL, 
	product_id INTEGER NOT NULL, 
	warehouse_id INTEGER, 
	alert_type VARCHAR(50), 
	threshold FLOAT, 
	is_active BOOLEAN, 
	last_triggered TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id)
);

CREATE INDEX ix_stock_alerts_id ON stock_alerts (id);


CREATE TABLE stock_levels (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	product_id INTEGER NOT NULL, 
	warehouse_id INTEGER NOT NULL, 
	quantity_on_hand FLOAT, 
	quantity_reserved FLOAT, 
	quantity_available FLOAT, 
	quantity_on_order FLOAT, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id)
);


CREATE TABLE stock_movements (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	movement_number VARCHAR(50), 
	product_id INTEGER NOT NULL, 
	warehouse_id INTEGER NOT NULL, 
	movement_type VARCHAR(50), 
	reference_type VARCHAR(50), 
	reference_id INTEGER, 
	quantity FLOAT NOT NULL, 
	unit_cost NUMERIC(15, 2), 
	total_cost NUMERIC(15, 2), 
	batch_number VARCHAR(100), 
	serial_number VARCHAR(100), 
	expiry_date TIMESTAMP WITH TIME ZONE, 
	notes TEXT, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (movement_number), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);


CREATE TABLE tickets (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	ticket_number VARCHAR(50), 
	subject VARCHAR(500) NOT NULL, 
	description TEXT, 
	ticket_type VARCHAR(50), 
	category VARCHAR(100), 
	sub_category VARCHAR(100), 
	priority VARCHAR(20), 
	status VARCHAR(50), 
	customer_id INTEGER, 
	contact_name VARCHAR(255), 
	contact_email VARCHAR(255), 
	contact_phone VARCHAR(20), 
	assigned_to INTEGER, 
	team VARCHAR(100), 
	sla_id INTEGER, 
	first_response_at TIMESTAMP WITH TIME ZONE, 
	resolved_at TIMESTAMP WITH TIME ZONE, 
	closed_at TIMESTAMP WITH TIME ZONE, 
	due_at TIMESTAMP WITH TIME ZONE, 
	sla_breached BOOLEAN, 
	satisfaction_rating INTEGER, 
	tags JSON, 
	attachments JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (ticket_number), 
	FOREIGN KEY(customer_id) REFERENCES customers (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id), 
	FOREIGN KEY(sla_id) REFERENCES slas (id)
);


CREATE TABLE work_orders (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	wo_number VARCHAR(50) NOT NULL, 
	product_id INTEGER NOT NULL, 
	bom_id INTEGER, 
	planned_quantity FLOAT NOT NULL, 
	produced_quantity FLOAT, 
	rejected_quantity FLOAT, 
	status VARCHAR(50), 
	priority VARCHAR(20), 
	planned_start TIMESTAMP WITH TIME ZONE, 
	planned_end TIMESTAMP WITH TIME ZONE, 
	actual_start TIMESTAMP WITH TIME ZONE, 
	actual_end TIMESTAMP WITH TIME ZONE, 
	warehouse_id INTEGER, 
	sales_order_id INTEGER, 
	notes TEXT, 
	created_by INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (wo_number), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(bom_id) REFERENCES boms (id), 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);


CREATE TABLE document_versions (
	id SERIAL NOT NULL, 
	document_id INTEGER NOT NULL, 
	version VARCHAR(20), 
	file_url VARCHAR(500), 
	file_size FLOAT, 
	change_notes TEXT, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(document_id) REFERENCES documents (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);


CREATE TABLE invoices (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	invoice_number VARCHAR(50) NOT NULL, 
	customer_id INTEGER NOT NULL, 
	sales_order_id INTEGER, 
	status VARCHAR(50), 
	invoice_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	due_date TIMESTAMP WITH TIME ZONE, 
	subtotal NUMERIC(15, 2), 
	discount_amount NUMERIC(15, 2), 
	cgst_amount NUMERIC(15, 2), 
	sgst_amount NUMERIC(15, 2), 
	igst_amount NUMERIC(15, 2), 
	total_amount NUMERIC(15, 2), 
	amount_paid NUMERIC(15, 2), 
	balance_due NUMERIC(15, 2), 
	currency VARCHAR(10), 
	notes TEXT, 
	terms TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (invoice_number), 
	FOREIGN KEY(customer_id) REFERENCES customers (id), 
	FOREIGN KEY(sales_order_id) REFERENCES sales_orders (id)
);


CREATE TABLE item_allocations (
	id SERIAL NOT NULL, 
	allocation_number VARCHAR(50), 
	product_id INTEGER NOT NULL, 
	warehouse_id INTEGER, 
	project_id INTEGER, 
	employee_id INTEGER, 
	item_type VARCHAR(20), 
	quantity_allocated FLOAT NOT NULL, 
	quantity_returned FLOAT, 
	quantity_consumed FLOAT, 
	unit VARCHAR(50), 
	allocation_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	expected_return_date TIMESTAMP WITH TIME ZONE, 
	actual_return_date TIMESTAMP WITH TIME ZONE, 
	status VARCHAR(50), 
	purpose TEXT, 
	notes TEXT, 
	condition_out VARCHAR(50), 
	condition_in VARCHAR(50), 
	unit_cost NUMERIC(15, 2), 
	total_cost NUMERIC(15, 2), 
	issued_by INTEGER, 
	approved_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (allocation_number), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(issued_by) REFERENCES users (id), 
	FOREIGN KEY(approved_by) REFERENCES users (id)
);

CREATE INDEX ix_item_allocations_id ON item_allocations (id);


CREATE TABLE milestones (
	id SERIAL NOT NULL, 
	project_id INTEGER NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	description TEXT, 
	due_date DATE, 
	status VARCHAR(50), 
	deliverables JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id)
);


CREATE TABLE opportunities (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	opportunity_number VARCHAR(50), 
	name VARCHAR(255) NOT NULL, 
	customer_id INTEGER NOT NULL, 
	contact_id INTEGER, 
	stage VARCHAR(100), 
	probability FLOAT, 
	expected_revenue FLOAT, 
	expected_close_date TIMESTAMP WITH TIME ZONE, 
	actual_close_date TIMESTAMP WITH TIME ZONE, 
	lost_reason VARCHAR(255), 
	description TEXT, 
	assigned_to INTEGER, 
	lead_source VARCHAR(100), 
	product_interest JSON, 
	next_action VARCHAR(255), 
	next_action_date TIMESTAMP WITH TIME ZONE, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (opportunity_number), 
	FOREIGN KEY(customer_id) REFERENCES customers (id), 
	FOREIGN KEY(contact_id) REFERENCES contacts (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id)
);


CREATE TABLE production_entries (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	work_order_id INTEGER NOT NULL, 
	entry_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	quantity_produced FLOAT, 
	quantity_rejected FLOAT, 
	rejection_reason VARCHAR(255), 
	operator_id INTEGER, 
	shift VARCHAR(50), 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(work_order_id) REFERENCES work_orders (id), 
	FOREIGN KEY(operator_id) REFERENCES users (id)
);


CREATE TABLE project_activities (
	id SERIAL NOT NULL, 
	project_id INTEGER NOT NULL, 
	activity_type VARCHAR(50), 
	title VARCHAR(300), 
	description TEXT, 
	old_value VARCHAR(300), 
	new_value VARCHAR(300), 
	performed_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(performed_by) REFERENCES users (id)
);

CREATE INDEX ix_project_activities_id ON project_activities (id);


CREATE TABLE project_budgets (
	id SERIAL NOT NULL, 
	project_id INTEGER NOT NULL, 
	approved_budget NUMERIC(15, 2), 
	contingency NUMERIC(15, 2), 
	total_budget NUMERIC(15, 2), 
	labour_cost_planned NUMERIC(15, 2), 
	material_cost_planned NUMERIC(15, 2), 
	equipment_cost_planned NUMERIC(15, 2), 
	travel_cost_planned NUMERIC(15, 2), 
	overhead_planned NUMERIC(15, 2), 
	labour_cost_actual NUMERIC(15, 2), 
	material_cost_actual NUMERIC(15, 2), 
	equipment_cost_actual NUMERIC(15, 2), 
	travel_cost_actual NUMERIC(15, 2), 
	overhead_actual NUMERIC(15, 2), 
	total_actual NUMERIC(15, 2), 
	pv NUMERIC(15, 2), 
	ev NUMERIC(15, 2), 
	ac NUMERIC(15, 2), 
	spi FLOAT, 
	cpi FLOAT, 
	currency VARCHAR(10), 
	notes TEXT, 
	last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (project_id), 
	FOREIGN KEY(project_id) REFERENCES projects (id)
);

CREATE INDEX ix_project_budgets_id ON project_budgets (id);


CREATE TABLE project_documents (
	id SERIAL NOT NULL, 
	project_id INTEGER NOT NULL, 
	phase_id INTEGER, 
	title VARCHAR(300) NOT NULL, 
	document_type VARCHAR(50), 
	category VARCHAR(100), 
	version VARCHAR(20), 
	file_path VARCHAR(500), 
	file_size INTEGER, 
	description TEXT, 
	status VARCHAR(30), 
	uploaded_by INTEGER, 
	tags JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(uploaded_by) REFERENCES users (id)
);

CREATE INDEX ix_project_documents_id ON project_documents (id);


CREATE TABLE project_issues (
	id SERIAL NOT NULL, 
	project_id INTEGER NOT NULL, 
	issue_number VARCHAR(20), 
	title VARCHAR(300) NOT NULL, 
	description TEXT, 
	issue_type VARCHAR(30), 
	priority VARCHAR(20), 
	severity VARCHAR(20), 
	status VARCHAR(30), 
	raised_by INTEGER, 
	assigned_to INTEGER, 
	raised_date DATE, 
	target_date DATE, 
	resolved_date DATE, 
	resolution TEXT, 
	impact_on_schedule VARCHAR(20), 
	impact_on_budget VARCHAR(20), 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	UNIQUE (issue_number), 
	FOREIGN KEY(raised_by) REFERENCES employees (id), 
	FOREIGN KEY(assigned_to) REFERENCES employees (id)
);

CREATE INDEX ix_project_issues_id ON project_issues (id);


CREATE TABLE project_phases (
	id SERIAL NOT NULL, 
	project_id INTEGER NOT NULL, 
	phase_name VARCHAR(100) NOT NULL, 
	phase_code VARCHAR(20), 
	phase_order INTEGER, 
	description TEXT, 
	start_date DATE, 
	end_date DATE, 
	planned_start DATE, 
	planned_end DATE, 
	status VARCHAR(30), 
	progress_percent FLOAT, 
	color VARCHAR(20), 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id)
);

CREATE INDEX ix_project_phases_id ON project_phases (id);


CREATE TABLE project_risks (
	id SERIAL NOT NULL, 
	project_id INTEGER NOT NULL, 
	risk_id_code VARCHAR(20), 
	title VARCHAR(300) NOT NULL, 
	description TEXT, 
	category VARCHAR(50), 
	probability VARCHAR(20), 
	impact VARCHAR(20), 
	risk_score INTEGER, 
	risk_level VARCHAR(20), 
	status VARCHAR(30), 
	mitigation_plan TEXT, 
	contingency_plan TEXT, 
	owner_id INTEGER, 
	identified_date DATE, 
	review_date DATE, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(owner_id) REFERENCES employees (id)
);

CREATE INDEX ix_project_risks_id ON project_risks (id);


CREATE TABLE resource_allocations (
	id SERIAL NOT NULL, 
	project_id INTEGER NOT NULL, 
	employee_id INTEGER NOT NULL, 
	role VARCHAR(100), 
	allocation_percent FLOAT, 
	start_date TIMESTAMP WITH TIME ZONE, 
	end_date TIMESTAMP WITH TIME ZONE, 
	hourly_rate NUMERIC(10, 2), 
	status VARCHAR(50), 
	notes TEXT, 
	allocated_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(allocated_by) REFERENCES users (id)
);

CREATE INDEX ix_resource_allocations_id ON resource_allocations (id);


CREATE TABLE sales_order_items (
	id SERIAL NOT NULL, 
	order_id INTEGER NOT NULL, 
	product_id INTEGER, 
	description VARCHAR(500), 
	quantity FLOAT NOT NULL, 
	unit VARCHAR(50), 
	unit_price NUMERIC(15, 2) NOT NULL, 
	discount_percent FLOAT, 
	tax_percent FLOAT, 
	tax_amount NUMERIC(15, 2), 
	line_total NUMERIC(15, 2), 
	hsn_code VARCHAR(20), 
	PRIMARY KEY (id), 
	FOREIGN KEY(order_id) REFERENCES sales_orders (id), 
	FOREIGN KEY(product_id) REFERENCES products (id)
);


CREATE TABLE ticket_comments (
	id SERIAL NOT NULL, 
	ticket_id INTEGER NOT NULL, 
	comment TEXT NOT NULL, 
	is_internal BOOLEAN, 
	created_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(ticket_id) REFERENCES tickets (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);


CREATE TABLE travel_requests (
	id SERIAL NOT NULL, 
	request_number VARCHAR(30) NOT NULL, 
	employee_id INTEGER NOT NULL, 
	project_id INTEGER, 
	trip_purpose VARCHAR(300) NOT NULL, 
	trip_type VARCHAR(30), 
	from_city VARCHAR(100), 
	to_city VARCHAR(100), 
	departure_date DATE NOT NULL, 
	return_date DATE NOT NULL, 
	total_days INTEGER, 
	has_weekend BOOLEAN, 
	advance_requested NUMERIC(12, 2), 
	advance_paid NUMERIC(12, 2), 
	total_claimed NUMERIC(12, 2), 
	total_approved NUMERIC(12, 2), 
	balance_payable NUMERIC(12, 2), 
	status VARCHAR(30), 
	requires_l2_approval BOOLEAN, 
	l2_reason VARCHAR(200), 
	l1_approver_id INTEGER, 
	l2_approver_id INTEGER, 
	l1_approved_at TIMESTAMP WITH TIME ZONE, 
	l2_approved_at TIMESTAMP WITH TIME ZONE, 
	l1_comments TEXT, 
	l2_comments TEXT, 
	finance_approved_at TIMESTAMP WITH TIME ZONE, 
	finance_comments TEXT, 
	paid_at TIMESTAMP WITH TIME ZONE, 
	paid_by INTEGER, 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (request_number), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id)
);

CREATE INDEX ix_travel_requests_id ON travel_requests (id);


CREATE TABLE work_order_operations (
	id SERIAL NOT NULL, 
	work_order_id INTEGER NOT NULL, 
	operation_name VARCHAR(255), 
	work_center VARCHAR(100), 
	sequence INTEGER, 
	planned_hours FLOAT, 
	actual_hours FLOAT, 
	status VARCHAR(50), 
	assigned_to INTEGER, 
	notes TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(work_order_id) REFERENCES work_orders (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id)
);


CREATE TABLE invoice_items (
	id SERIAL NOT NULL, 
	invoice_id INTEGER NOT NULL, 
	product_id INTEGER, 
	description VARCHAR(500), 
	quantity FLOAT, 
	unit VARCHAR(50), 
	unit_price NUMERIC(15, 2), 
	discount_percent FLOAT, 
	cgst_percent FLOAT, 
	sgst_percent FLOAT, 
	igst_percent FLOAT, 
	line_total NUMERIC(15, 2), 
	hsn_code VARCHAR(20), 
	PRIMARY KEY (id), 
	FOREIGN KEY(invoice_id) REFERENCES invoices (id), 
	FOREIGN KEY(product_id) REFERENCES products (id)
);


CREATE TABLE payments (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	payment_number VARCHAR(50), 
	invoice_id INTEGER, 
	customer_id INTEGER, 
	amount NUMERIC(15, 2) NOT NULL, 
	payment_date TIMESTAMP WITH TIME ZONE, 
	payment_mode VARCHAR(50), 
	reference_number VARCHAR(100), 
	bank_name VARCHAR(100), 
	notes TEXT, 
	status VARCHAR(50), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (payment_number), 
	FOREIGN KEY(invoice_id) REFERENCES invoices (id), 
	FOREIGN KEY(customer_id) REFERENCES customers (id)
);


CREATE TABLE project_milestones (
	id SERIAL NOT NULL, 
	project_id INTEGER NOT NULL, 
	phase_id INTEGER, 
	milestone_name VARCHAR(200) NOT NULL, 
	description TEXT, 
	milestone_type VARCHAR(30), 
	planned_date DATE NOT NULL, 
	actual_date DATE, 
	status VARCHAR(30), 
	owner_id INTEGER, 
	deliverable VARCHAR(300), 
	acceptance_criteria TEXT, 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(phase_id) REFERENCES project_phases (id), 
	FOREIGN KEY(owner_id) REFERENCES employees (id)
);

CREATE INDEX ix_project_milestones_id ON project_milestones (id);


CREATE TABLE project_tasks (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	project_id INTEGER NOT NULL, 
	parent_task_id INTEGER, 
	title VARCHAR(500) NOT NULL, 
	description TEXT, 
	task_type VARCHAR(50), 
	status VARCHAR(50), 
	priority VARCHAR(20), 
	assigned_to INTEGER, 
	milestone_id INTEGER, 
	start_date DATE, 
	due_date DATE, 
	estimated_hours FLOAT, 
	actual_hours FLOAT, 
	progress_percent FLOAT, 
	tags JSON, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(parent_task_id) REFERENCES project_tasks (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id), 
	FOREIGN KEY(milestone_id) REFERENCES milestones (id)
);


CREATE TABLE stock_returns (
	id SERIAL NOT NULL, 
	return_number VARCHAR(50), 
	allocation_id INTEGER NOT NULL, 
	product_id INTEGER NOT NULL, 
	warehouse_id INTEGER, 
	quantity_returned FLOAT NOT NULL, 
	condition VARCHAR(50), 
	return_date TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	notes TEXT, 
	received_by INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (return_number), 
	FOREIGN KEY(allocation_id) REFERENCES item_allocations (id), 
	FOREIGN KEY(product_id) REFERENCES products (id), 
	FOREIGN KEY(warehouse_id) REFERENCES warehouses (id), 
	FOREIGN KEY(received_by) REFERENCES users (id)
);

CREATE INDEX ix_stock_returns_id ON stock_returns (id);


CREATE TABLE travel_legs (
	id SERIAL NOT NULL, 
	request_id INTEGER NOT NULL, 
	leg_order INTEGER, 
	from_city VARCHAR(100) NOT NULL, 
	to_city VARCHAR(100) NOT NULL, 
	travel_date DATE NOT NULL, 
	travel_mode VARCHAR(30), 
	class_type VARCHAR(20), 
	booking_ref VARCHAR(100), 
	ticket_amount NUMERIC(10, 2), 
	has_hotel_stay BOOLEAN, 
	hotel_name VARCHAR(200), 
	check_in_date DATE, 
	check_out_date DATE, 
	hotel_nights INTEGER, 
	hotel_per_night NUMERIC(10, 2), 
	hotel_total NUMERIC(10, 2), 
	is_weekend_stay BOOLEAN, 
	weekend_reason TEXT, 
	notes VARCHAR(300), 
	PRIMARY KEY (id), 
	FOREIGN KEY(request_id) REFERENCES travel_requests (id)
);

CREATE INDEX ix_travel_legs_id ON travel_legs (id);


CREATE TABLE wbs_items (
	id SERIAL NOT NULL, 
	project_id INTEGER NOT NULL, 
	phase_id INTEGER, 
	parent_id INTEGER, 
	wbs_code VARCHAR(30), 
	task_name VARCHAR(300) NOT NULL, 
	description TEXT, 
	task_type VARCHAR(30), 
	planned_start DATE, 
	planned_end DATE, 
	actual_start DATE, 
	actual_end DATE, 
	duration_days FLOAT, 
	assigned_to INTEGER, 
	assigned_team JSON, 
	percent_complete FLOAT, 
	status VARCHAR(30), 
	priority VARCHAR(20), 
	estimated_hours FLOAT, 
	actual_hours FLOAT, 
	estimated_cost NUMERIC(15, 2), 
	actual_cost NUMERIC(15, 2), 
	predecessors VARCHAR(200), 
	dependency_type VARCHAR(10), 
	lag_days FLOAT, 
	sort_order INTEGER, 
	level INTEGER, 
	is_critical BOOLEAN, 
	is_collapsed BOOLEAN, 
	notes TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(phase_id) REFERENCES project_phases (id), 
	FOREIGN KEY(parent_id) REFERENCES wbs_items (id), 
	FOREIGN KEY(assigned_to) REFERENCES employees (id)
);

CREATE INDEX ix_wbs_items_id ON wbs_items (id);


CREATE TABLE timesheets (
	id SERIAL NOT NULL, 
	tenant_id INTEGER, 
	project_id INTEGER NOT NULL, 
	task_id INTEGER, 
	employee_id INTEGER, 
	user_id INTEGER, 
	date DATE NOT NULL, 
	hours FLOAT NOT NULL, 
	billable BOOLEAN, 
	hourly_rate NUMERIC(10, 2), 
	description TEXT, 
	status VARCHAR(50), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id), 
	FOREIGN KEY(task_id) REFERENCES project_tasks (id), 
	FOREIGN KEY(employee_id) REFERENCES employees (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);


CREATE TABLE travel_expense_items (
	id SERIAL NOT NULL, 
	request_id INTEGER NOT NULL, 
	leg_id INTEGER, 
	expense_date DATE NOT NULL, 
	city VARCHAR(100), 
	expense_type VARCHAR(40) NOT NULL, 
	description VARCHAR(300), 
	amount NUMERIC(10, 2) NOT NULL, 
	approved_amount NUMERIC(10, 2), 
	currency VARCHAR(10), 
	receipt_number VARCHAR(100), 
	receipt_url VARCHAR(500), 
	is_reimbursable BOOLEAN, 
	notes VARCHAR(200), 
	PRIMARY KEY (id), 
	FOREIGN KEY(request_id) REFERENCES travel_requests (id), 
	FOREIGN KEY(leg_id) REFERENCES travel_legs (id)
);

CREATE INDEX ix_travel_expense_items_id ON travel_expense_items (id);
