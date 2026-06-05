"""Setup attendance tables and seed data"""
from app.db.base import engine, Base, SessionLocal
from app.models import *
from app.models.attendance import (
    BiometricDevice, AttendanceLog, AttendanceRegularization,
    LeaveType, LeavePolicy, LeaveBalance, HolidayType, Holiday
)
from datetime import date

Base.metadata.create_all(bind=engine)
print("Tables created")

db = SessionLocal()

# ── Leave Types ───────────────────────────────────────────────────────────────
leave_types = [
    # (name, code, category, states, gender, days, paid, cf, max_cf, enc, med, min_d, max_d, notice)
    ("Annual Leave",          "AL",  "general",     "ALL",                      "all",    21,  True,  True,  30,  True,  False, 1.0, 30,  7),
    ("Sick Leave",            "SL",  "medical",     "ALL",                      "all",    12,  True,  False,  0, False,  True,  0.5, 12,  0),
    ("Casual Leave",          "CL",  "general",     "ALL",                      "all",     8,  True,  False,  0, False, False,  0.5,  3,  1),
    ("Earned Leave",          "EL",  "general",     "ALL",                      "all",    18,  True,  True,  45,  True, False,  1.0, 30, 15),
    ("Maternity Leave",       "ML",  "maternity",   "ALL",                    "female",  182,  True,  False,  0, False, False,  1.0,182, 90),
    ("Paternity Leave",       "PL",  "paternity",   "ALL",                      "male",   15,  True,  False,  0, False, False,  1.0, 15, 15),
    ("Bereavement Leave",     "BL",  "bereavement", "ALL",                      "all",     3,  True,  False,  0, False, False,  1.0,  3,  0),
    ("Compensatory Off",      "CO",  "comp_off",    "ALL",                      "all",     0,  True,  False,  0, False, False,  0.5,  3,  0),
    ("Work From Home",        "WFH", "wfh",         "ALL",                      "all",     0,  True,  False,  0, False, False,  0.5,  5,  1),
    ("Loss of Pay",           "LOP", "general",     "ALL",                      "all",     0, False,  False,  0, False, False,  0.5,  0,  0),
    ("Optional Holiday",      "OHL", "general",     "ALL",                      "all",     2,  True,  False,  0, False, False,  1.0,  1,  1),
    ("Privilege Leave",       "PVL", "general",     "ALL",                      "all",    12,  True,  True,  24, False, False,  1.0, 30,  7),
    # Regional
    ("Pongal Leave",          "PNG", "general",     "Tamil Nadu",               "all",     1,  True,  False,  0, False, False,  1.0,  1,  0),
    ("Onam Leave",            "ONM", "general",     "Kerala",                   "all",     1,  True,  False,  0, False, False,  1.0,  1,  0),
    ("Bihu Leave",            "BHU", "general",     "Assam",                    "all",     1,  True,  False,  0, False, False,  1.0,  1,  0),
    ("Chhath Puja Leave",     "CPL", "general",     "Bihar,Jharkhand",          "all",     2,  True,  False,  0, False, False,  1.0,  2,  0),
    ("Study Leave",           "STL", "general",     "ALL",                      "all",     0,  True,  False,  0, False, False,  1.0, 30, 30),
    ("Sabbatical Leave",      "SAB", "general",     "ALL",                      "all",     0,  True,  False,  0, False, False,  1.0, 90, 90),
]

n = 0
for (name, code, cat, states, gender, days, paid, cf, max_cf, enc, med, min_d, max_d, notice) in leave_types:
    if not db.query(LeaveType).filter(LeaveType.code == code).first():
        lt = LeaveType(
            name=name, code=code, leave_category=cat, applicable_states=states,
            gender_specific=gender, default_days_per_year=days, is_paid=paid,
            is_carry_forward=cf, max_carry_forward=max_cf, is_encashable=enc,
            requires_medical_certificate=med, min_days=min_d,
            max_days_per_application=max_d, notice_days=notice, country="India"
        )
        db.add(lt); n += 1
db.flush()
print(f"Leave Types: {n} created ({db.query(LeaveType).count()} total)")

# ── Holiday Types ─────────────────────────────────────────────────────────────
ht_data = [
    ("National Holiday",             "NATIONAL", True),
    ("State Holiday",                "STATE",    True),
    ("Regional/Festival Holiday",    "REGIONAL", False),
    ("Optional/Restricted Holiday",  "OPTIONAL", False),
    ("Company Holiday",              "COMPANY",  True),
]
ht_ids = {}
for (name, code, mandatory) in ht_data:
    ht = db.query(HolidayType).filter(HolidayType.code == code).first()
    if not ht:
        ht = HolidayType(name=name, code=code, is_mandatory=mandatory, country="India")
        db.add(ht)
    db.flush()
    ht_ids[code] = ht.id
print(f"Holiday Types: {len(ht_ids)} ready")

# ── 2026 Holidays ─────────────────────────────────────────────────────────────
def add_holiday(ht_code, name, hdate_str, states, religion, optional, desc=""):
    hdate = date.fromisoformat(hdate_str)
    if not db.query(Holiday).filter(Holiday.name == name, Holiday.date == hdate).first():
        db.add(Holiday(
            holiday_type_id=ht_ids[ht_code], name=name, date=hdate, year=hdate.year,
            day_of_week=hdate.strftime("%A"), country="India",
            applicable_states=states, applicable_religions=religion,
            is_optional=optional, is_paid=True, description=desc
        ))
        return 1
    return 0

hn = 0
# National Holidays
hn += add_holiday("NATIONAL", "New Year Day",        "2026-01-01", "ALL", None,        False, "Start of new year")
hn += add_holiday("NATIONAL", "Republic Day",        "2026-01-26", "ALL", None,        False, "India's 77th Republic Day")
hn += add_holiday("NATIONAL", "Independence Day",    "2026-08-15", "ALL", None,        False, "India's Independence Day")
hn += add_holiday("NATIONAL", "Gandhi Jayanti",      "2026-10-02", "ALL", None,        False, "Mahatma Gandhi's Birthday")
hn += add_holiday("NATIONAL", "Good Friday",         "2026-04-03", "ALL", "Christian", False, "Christian holiday")
hn += add_holiday("NATIONAL", "Christmas Day",       "2026-12-25", "ALL", "Christian", False, "Christmas")
hn += add_holiday("NATIONAL", "Ambedkar Jayanti",    "2026-04-14", "ALL", None,        False, "Dr. B.R. Ambedkar's Birthday")
hn += add_holiday("NATIONAL", "Eid ul-Fitr",         "2026-03-20", "ALL", "Muslim",    False, "End of Ramadan")
hn += add_holiday("NATIONAL", "Eid ul-Adha",         "2026-05-27", "ALL", "Muslim",    False, "Festival of Sacrifice")
hn += add_holiday("NATIONAL", "Diwali",              "2026-10-20", "ALL", "Hindu",     False, "Festival of Lights")
hn += add_holiday("NATIONAL", "Dussehra",            "2026-10-02", "ALL", "Hindu",     False, "Victory of good over evil")
hn += add_holiday("NATIONAL", "Holi",                "2026-03-03", "ALL", "Hindu",     False, "Festival of Colors")
hn += add_holiday("NATIONAL", "Guru Nanak Jayanti",  "2026-11-15", "ALL", "Sikh",      False, "Guru Nanak Dev Ji's Birthday")
hn += add_holiday("NATIONAL", "Muharram",            "2026-07-17", "ALL", "Muslim",    False, "Islamic New Year")
hn += add_holiday("NATIONAL", "Maha Shivratri",      "2026-02-17", "ALL", "Hindu",     False, "Great Night of Shiva")
hn += add_holiday("NATIONAL", "Buddha Purnima",      "2026-05-12", "ALL", "Buddhist",  False, "Birth of Lord Buddha")
hn += add_holiday("NATIONAL", "Janmashtami",         "2026-08-14", "ALL", "Hindu",     False, "Birthday of Lord Krishna")
hn += add_holiday("NATIONAL", "Ram Navami",          "2026-03-30", "ALL", "Hindu",     False, "Birthday of Lord Rama")

# State Holidays
hn += add_holiday("STATE", "Maharashtra Day",         "2026-05-01", "Maharashtra",                      None,    False, "Foundation Day of Maharashtra")
hn += add_holiday("STATE", "Gudi Padwa",              "2026-03-20", "Maharashtra,Goa",                  "Hindu", False, "Maharashtra New Year")
hn += add_holiday("STATE", "Ganesh Chaturthi",        "2026-08-24", "Maharashtra,Goa,Karnataka",        "Hindu", False, "Birth of Lord Ganesha")
hn += add_holiday("STATE", "Tamil New Year (Puthandu)","2026-04-14","Tamil Nadu",                       "Hindu", False, "Tamil New Year")
hn += add_holiday("STATE", "Pongal",                  "2026-01-14", "Tamil Nadu,Andhra Pradesh",        "Hindu", False, "Harvest Festival")
hn += add_holiday("STATE", "Onam",                    "2026-08-26", "Kerala",                           "Hindu", False, "Harvest Festival of Kerala")
hn += add_holiday("STATE", "Kerala Piravi",           "2026-11-01", "Kerala",                           None,    False, "Kerala Formation Day")
hn += add_holiday("STATE", "Ugadi",                   "2026-03-20", "Karnataka,Andhra Pradesh,Telangana","Hindu",False, "Telugu/Kannada New Year")
hn += add_holiday("STATE", "Kannad Rajyotsava",       "2026-11-01", "Karnataka",                        None,    False, "Karnataka Formation Day")
hn += add_holiday("STATE", "Bihu",                    "2026-04-15", "Assam",                            "Hindu", False, "Assamese New Year")
hn += add_holiday("STATE", "Chhath Puja",             "2026-10-28", "Bihar,Jharkhand,Uttar Pradesh",    "Hindu", True,  "Sun Worship Festival")
hn += add_holiday("STATE", "Rath Yatra",              "2026-06-24", "Odisha",                           "Hindu", False, "Lord Jagannath's Chariot Festival")
hn += add_holiday("STATE", "Durga Puja",              "2026-09-28", "West Bengal,Assam",                "Hindu", False, "Worship of Goddess Durga")
hn += add_holiday("STATE", "Baisakhi",                "2026-04-14", "Punjab,Haryana",                   "Sikh",  False, "Punjabi New Year")
hn += add_holiday("STATE", "Makar Sankranti",         "2026-01-14", "Gujarat,Rajasthan,Maharashtra",    "Hindu", False, "Harvest Festival")
hn += add_holiday("STATE", "Navratri",                "2026-09-22", "Gujarat",                          "Hindu", False, "Nine Nights Festival")

# Optional Holidays
hn += add_holiday("OPTIONAL", "Lohri",               "2026-01-13", "Punjab,Haryana,Delhi",   "Sikh",     True,  "Winter Harvest Festival")
hn += add_holiday("OPTIONAL", "Bhai Dooj",           "2026-10-22", "ALL",                    "Hindu",    True,  "Brother-Sister Bond Festival")
hn += add_holiday("OPTIONAL", "Diwali (Laxmi Puja)", "2026-10-20", "ALL",                    "Hindu",    True,  "Main day of Diwali")
hn += add_holiday("OPTIONAL", "Govardhan Puja",      "2026-10-21", "ALL",                    "Hindu",    True,  "Day after Diwali")
hn += add_holiday("OPTIONAL", "Karva Chauth",        "2026-10-07", "ALL",                    "Hindu",    True,  "Fast for husband's long life")
hn += add_holiday("OPTIONAL", "Eid-e-Milad",         "2026-09-10", "ALL",                    "Muslim",   True,  "Prophet Muhammad's Birthday")
hn += add_holiday("OPTIONAL", "Good Saturday",       "2026-04-04", "ALL",                    "Christian",True,  "Day before Easter")

db.flush()
print(f"Holidays: {hn} created for 2025-2026")

# ── Biometric Devices ─────────────────────────────────────────────────────────
devices = [
    ("Main Entrance - Fingerprint", "DEV001", "fingerprint", "Head Office - Main Gate",  "192.168.1.201"),
    ("HR Dept - Card Swipe",        "DEV002", "card_swipe",  "Head Office - HR Floor",   "192.168.1.202"),
    ("Server Room - Card Swipe",    "DEV003", "card_swipe",  "Head Office - Server Room","192.168.1.203"),
    ("Cafeteria - Facial",          "DEV004", "facial",      "Head Office - Cafeteria",  "192.168.1.204"),
    ("Branch Office - Fingerprint", "DEV005", "fingerprint", "Branch Office - Entrance", "192.168.1.205"),
    ("Mobile App",                  "DEV006", "manual",      "Mobile Application",       None),
    ("Reception - Card Swipe",      "DEV007", "card_swipe",  "Head Office - Reception",  "192.168.1.207"),
]
dn = 0
for (dname, dcode, dtype, dloc, dip) in devices:
    if not db.query(BiometricDevice).filter(BiometricDevice.device_code == dcode).first():
        db.add(BiometricDevice(device_name=dname, device_code=dcode, device_type=dtype,
                               location=dloc, ip_address=dip, is_active=True))
        dn += 1
db.commit()
print(f"Biometric Devices: {dn} created")
print("Setup complete!")
db.close()
