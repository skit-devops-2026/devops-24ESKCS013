# Student Hub — Attendance Intelligence Implementation Plan
## Real ERP Attendance Format & Intelligent Policy Architecture

**Document Version:** 1.0.0  
**Status:** Approved Specification & Implementation Roadmap  
**Date:** October 26, 2026  
**Module:** Attendance Intelligence (Flagship Academic Productivity Module)  

---

## 1. Executive Summary & Objective

The objective of this module is to transform Student Hub's attendance tracking from a static percentage into an **Attendance Intelligence Platform**.

Students will be able to copy-paste tab-separated rows from their University ERP portal or upload an ERP CSV export. The system parses the real ERP columns, validates class counts, highlights immediate shortage subjects (specifically **CSUL501 — DAA at 71.05%**), allows interactive recovery simulations, and makes attendance counting policies (OD, Makeup) transparent, configurable, and verifiable.

---

## 2. Mathematical Investigation of Real ERP Attendance Data

We analyzed the four representative ERP sample rows provided:

| # | Subject Code | Subject Name | Type | Present ($P$) | OD | Makeup ($M$) | Absent ($A$) | ERP % |
|---|---|---|---|---|---|---|---|---|
| 1 | `CSUL501` | Design and Analysis of Algorithms | Lecture | 26 | 1 | 0 | 11 | **71.05%** |
| 2 | `CSUL502` | Machine Learning | Lecture | 26 | 2 | 0 | 8 | **77.78%** |
| 3 | `CSUL504` | Full Stack Development | Lecture | 17 | 2 | 0 | 5 | **79.17%** |
| 4 | `CSUT530` | Industrial Training | Training | 14 | 0 | 2 | 1 | **100.00%** |

### Mathematical Discovery & Proofs

#### Row 1: CSUL501 (Design and Analysis of Algorithms)
- Total Conducted $C = P + \text{OD} + M + A = 26 + 1 + 0 + 11 = 38$
- If Attended $A_{\text{att}} = P + \text{OD} = 26 + 1 = 27$:
  $$\frac{27}{38} \times 100 = 71.0526\% \longrightarrow \mathbf{71.05\%} \quad (\text{Exact Match})$$
- Note: If OD was ignored ($26/37 = 70.27\%$), the calculation would fail.

#### Row 2: CSUL502 (Machine Learning)
- Total Conducted $C = 26 + 2 + 0 + 8 = 36$
- Attended $A_{\text{att}} = P + \text{OD} = 26 + 2 = 28$:
  $$\frac{28}{36} \times 100 = \frac{7}{9} \times 100 = 77.777\dots\% \longrightarrow \mathbf{77.78\%} \quad (\text{Exact Match})$$

#### Row 3: CSUL504 (Full Stack Development)
- Total Conducted $C = 17 + 2 + 0 + 5 = 24$
- Attended $A_{\text{att}} = P + \text{OD} = 17 + 2 = 19$:
  $$\frac{19}{24} \times 100 = 79.166\dots\% \longrightarrow \mathbf{79.17\%} \quad (\text{Exact Match})$$

#### Row 4: CSUT530 (Industrial Training)
- $P = 14, \text{OD} = 0, M = 2, A = 1$, reported ERP: $\mathbf{100.00\%}$.
- Standard Lecture formula gives: $(14 + 0) / (14 + 0 + 2 + 1) = 14 / 17 = 82.35\%$.
- Even counting Makeup as attended: $(14 + 2) / 17 = 16 / 17 = 94.12\%$.
- **Compensatory Makeup Interpretation:** In technical institutes (e.g. RTU / Autonomous ERPs), a "Makeup" class compensates for a previously missed session ($\text{Net Absent} = \max(0, A - M) = \max(0, 1 - 2) = 0$). Hence:
  $$\frac{14}{14 + 0} \times 100 = \mathbf{100.00\%} \quad (\text{Exact Match})$$
  *Alternative ERP Institutional Rule:* "Industrial Training" (Type: `Training`) evaluates completion credit upon project report submission rather than hourly roll-call attendance.

### Critical Engineering Decision
1. **Never hardcode or guess a universal policy.** 
2. **Preserve `erpPercentage` as an immutable reference benchmark.**
3. Support selectable, transparent Counting Policies with clear explanation.
4. If a subject's ERP percentage differs from the calculated formula (like CSUT530), flag it for student confirmation rather than silently overwriting.

---

## 3. Explicit Attendance Counting Policies

The platform will support three distinct, user-selectable policies:

| Policy Identifier | Policy Name | Attended Formula ($A$) | Conducted Formula ($C$) | Best Fit For |
|---|---|---|---|---|
| `policy_standard_od` *(Default)* | **Standard (Present + OD)** | $P + \text{OD}$ | $P + \text{OD} + M + A$ | Standard college lecture courses (`CSUL501`, `CSUL502`, `CSUL504`). |
| `policy_makeup_compensatory` | **Compensatory Makeup** | $P + \text{OD}$ | $P + \text{OD} + \max(0, A - M)$ | Courses where Makeup classes cancel out Absences (`CSUT530`). |
| `policy_strict_present` | **Strict (Present Only)** | $P$ | $P + A$ | Institutes that do not recognize OD for final exams. |
| `policy_erp_direct` | **Official ERP Direct** | ERP Reference | Derived | Non-standard courses or training evaluations. |

The UI will clearly display:
> *"Current Calculation Policy: **Standard (Present + OD counted)**. [Change Policy ⚙️]"*

---

## 4. Priority Shortage Analysis: CSUL501 (DAA at 71.05%)

CSUL501 is currently **below the 75% university eligibility threshold**:
- **Subject:** CSUL501 — Design and Analysis of Algorithms
- **Current State:** 26 Present, 1 OD, 0 Makeup, 11 Absent
- **Effective Attended:** $27$
- **Total Conducted:** $38$
- **Current Percentage:** $71.05\%$
- **Threshold Target ($T$):** $75\%$ ($0.75$)

### Consecutive Classes Needed Calculation
Using exact integer arithmetic:
$$\text{needed} = \left\lceil \frac{T \cdot C - A}{1 - T} \right\rceil = \left\lceil \frac{0.75 \times 38 - 27}{1 - 0.75} \right\rceil = \left\lceil \frac{28.5 - 27}{0.25} \right\rceil = \left\lceil \frac{1.5}{0.25} \right\rceil = \mathbf{6 \text{ classes}}$$

**Proof Verification:**
- After attending 6 consecutive classes:
  - New Attended = $27 + 6 = 33$
  - New Conducted = $38 + 6 = 44$
  - New Attendance % = $\frac{33}{44} \times 100 = \mathbf{75.00\%}$
- If the student attends only 5 classes:
  - Attended = $27 + 5 = 32$, Conducted = $38 + 5 = 43 \implies 32/43 = 74.42\%$ (Still Shortage).

The UI will feature a prominent alert banner:
> ⚠️ **Urgent Attendance Shortage in CSUL501 (DAA):** Current attendance is **71.05%** (Threshold: 75%). You must attend the **next 6 consecutive classes** without absence to reach **75.00%**.

---

## 5. Parser Specification (CSV & Tab-Separated Text)

### Supported Columns
The parser recognizes columns by header aliases (case-insensitive, trimming spaces):
1. `#` or `S.No` or `Index`
2. `Subject Code` or `Code`
3. `Subject` or `Subject Name` or `Course`
4. `Subject Type` or `Type`
5. `Present` or `P`
6. `OD` or `On Duty`
7. `Makeup` or `Make-up`
8. `Absent` or `A`
9. `Percentage` or `ERP Percentage` or `%`

### Parsing Pipeline
```
[Raw User Input (Pasted Tab-Text or CSV)]
                 │
                 ▼
[Header Sanitizer & Column Index Resolver]
                 │
                 ▼
[Row-by-Row Tokenizer & Number Coercion]
                 │
                 ▼
[Validation: P >= 0, OD >= 0, M >= 0, A >= 0, ERP% between 0-100]
                 │
                 ▼
[Policy Engine: Calculate Expected % vs ERP %]
                 │
                 ▼
[Interactive Preview Modal with Inline Corrections]
```

---

## 6. Data Model & Persistent Schema

### New Persistent Collection: `AttendanceRecord`
Located in `server/src/models/AttendanceRecord.ts`:

```typescript
export interface IAttendanceRecord extends Document {
  userId: Types.ObjectId;
  subjectCode: string;          // e.g. "CSUL501"
  subjectName: string;          // e.g. "Design and Analysis of Algorithms"
  subjectType: string;          // e.g. "Lecture", "Training", "Lab"
  subjectId?: Types.ObjectId | null; // Optional link to existing Subject model
  present: number;              // Non-negative integer
  od: number;                   // Non-negative integer
  makeup: number;               // Non-negative integer
  absent: number;               // Non-negative integer
  totalConducted: number;       // Calculated based on confirmed policy
  totalAttended: number;        // Calculated based on confirmed policy
  erpPercentage: number;        // Immutable reference value from ERP
  calculatedPercentage: number; // Computed percentage
  policyUsed: 'standard_od' | 'makeup_compensatory' | 'strict_present' | 'erp_direct';
  threshold: number;            // Default 75
  lastImportedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Indexes
- `{ userId: 1, subjectCode: 1 }` (Unique compound index per student)
- `{ userId: 1, calculatedPercentage: 1 }` (For fast defaulter sorting)

---

## 7. REST API Endpoints Specification

All endpoints enforce `requireAuth` and strict server-side multi-tenancy (`userId = req.user._id`):

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/attendance/parse-preview` | Browser/client submits raw text/CSV; returns parsed preview with matched existing subjects and discrepancy flags without saving. |
| `POST` | `/api/attendance/import` | Saves confirmed rows to database with user-selected policy. Automatically matches with `Subject` catalog if codes match. |
| `GET` | `/api/attendance` | Returns student's attendance records, overall aggregate attendance, and list of subjects below threshold. |
| `PATCH` | `/api/attendance/:id` | Update manual record counts or adjust subject threshold override. |
| `DELETE` | `/api/attendance/:id` | Deletes an attendance record. |
| `POST` | `/api/attendance/simulate` | Evaluates hypothetical scenarios (attend $+N$, miss $+N$) based on authoritative counts. |

---

## 8. Frontend UI/UX Architecture

### 1. Attendance Intelligence Hub (`/student/attendance`)
- **Top Summary Cards:**
  - Overall Aggregate Attendance (e.g. `75.96%`).
  - Shortage Alert Counter (`1 Subject Below 75%`).
  - Total Classes Conducted & Total Attended across semester.
- **Urgent Action Callout:**
  - Prominent red/amber card for **CSUL501 — DAA**:
    - Progress Bar at `71.05%` with threshold marker at `75%`.
    - Clear recovery formula: **"Attend next 6 classes to recover."**
- **Subject-Wise Table:**
  - Columns: Subject Code, Name, Type, Present, OD, Makeup, Absent, ERP %, Calculated %, Status Badge, Quick Actions.
  - Status Badges:
    - `Safe (>= 75%)` (Emerald Green)
    - `Shortage (< 75%)` (Crimson Red)
    - `Discrepancy (ERP != Calc)` (Amber Warning with Tooltip)
- **Interactive Scenario Simulator:**
  - Sliders/Buttons: "Attend next 1, 2, 3, 5, 10 classes" or "Miss next 1, 2, 3 classes".
  - Instant live re-calculation showing projected percentage without altering real records.
- **Import / Update Modal:**
  - Direct paste box for tab-separated ERP tables.
  - Drag-and-drop CSV upload.
  - Interactive Preview table allowing inline edits of cell values before final database commit.
  - Policy selection dropdown with plain-English explanation.

---

## 9. Automated Testing Strategy (92 + New Suites)

### Test Data Fixture (Exact ERP Rows)
```typescript
export const REAL_ERP_FIXTURES = [
  {
    code: 'CSUL501',
    name: 'Design and Analysis of Algorithms',
    type: 'Lecture',
    present: 26,
    od: 1,
    makeup: 0,
    absent: 11,
    erpPercentage: 71.05,
    expectedStandardPct: 71.05,
    neededFor75: 6,
  },
  {
    code: 'CSUL502',
    name: 'Machine Learning',
    type: 'Lecture',
    present: 26,
    od: 2,
    makeup: 0,
    absent: 8,
    erpPercentage: 77.78,
    expectedStandardPct: 77.78,
    bunkableAt75: 1,
  },
  {
    code: 'CSUL504',
    name: 'Full Stack Development',
    type: 'Lecture',
    present: 17,
    od: 2,
    makeup: 0,
    absent: 5,
    erpPercentage: 79.17,
    expectedStandardPct: 79.17,
    bunkableAt75: 1,
  },
  {
    code: 'CSUT530',
    name: 'Industrial Training',
    type: 'Training',
    present: 14,
    od: 0,
    makeup: 2,
    absent: 1,
    erpPercentage: 100.00,
    expectedCompensatoryPct: 100.00,
  },
];
```

### Automated Test Cases to Implement:
1. **Parser Tests:**
   - Parses tab-separated ERP paste.
   - Parses CSV string with standard and non-standard header orders.
   - Handles trailing spaces and empty lines.
2. **Mathematics Tests:**
   - Exact recovery formula for CSUL501 yields exactly 6 classes.
   - Safe bunk formula for CSUL502 yields 1 class.
   - Zero conducted edge case handled cleanly.
   - Boundary tests for 60%, 70%, 75%, 80%, 85% thresholds.
3. **Data Isolation Tests:**
   - Student B cannot view or overwrite Student A's attendance records.
4. **Discrepancy Detection Tests:**
   - Detects when user edits numbers such that calculated % deviates from ERP reported %.

---

## 10. Implementation Plan & Work Breakdown

- [x] **Step 1:** Mathematical Investigation & Analysis of Real ERP Rows (Completed).
- [ ] **Step 2:** Backend Persistent Model (`AttendanceRecord.ts`) and Validation Schema.
- [ ] **Step 3:** Backend REST API Routes (`attendance.routes.ts`) & Controller Logic.
- [ ] **Step 4:** Automated Integration Test Suite (`server/src/attendance.test.ts`).
- [ ] **Step 5:** Client Attendance Intelligence Service (`attendance.service.ts`).
- [ ] **Step 6:** Client ERP Import & Preview Modal with policy selectors.
- [ ] **Step 7:** Client Attendance Intelligence Page (`/student/attendance`) & Scenario Simulator.
- [ ] **Step 8:** Dashboard Integration (Highlighting CSUL501 DAA shortage on student home).
- [ ] **Step 9:** Verification, Linting, Full Production Builds, and Documentation Update.
