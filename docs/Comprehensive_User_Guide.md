# PharmaVigi: Comprehensive User Guide

Welcome to the PharmaVigi Comprehensive User Guide. This manual is designed for Safety Data Entry personnel, Medical Reviewers, and System Administrators. It provides an exhaustive, step-by-step walk-through of every module, feature, and workflow within the PharmaVigi Pharmacovigilance (PV) application.

---

## 1. System Overview & Dashboard

### Logging In
1. Navigate to the PharmaVigi URL.
2. Enter your assigned Username and Password on the Login page. Your user role (e.g., Data Entry, Medical Reviewer) determines which dashboard queues and permissions you have access to.

### The Dashboard
Upon login, you are greeted by the Dashboard, which serves as your daily workspace.
- **Workflow Queues:** The dashboard displays your assigned cases categorized by workflow state (e.g., Initial Triage, Data Entry, Medical Review, Pending Submission).
- **Global Search:** Use the search bar at the top to quickly retrieve cases by their unique Case ID or Patient Initials.
- **New Case:** A prominent button allows you to initiate a brand-new adverse event report.

---

## 2. Case Creation & General Details

### Creating a New Case
1. Click the **"New Case"** button from the Dashboard.
2. The system generates a temporary case shell. 
3. You must fill out the initial receipt metadata (Receipt Date, Country of Occurrence, Report Type).
4. Click **Save** in the top right corner. The database assigns a permanent Case ID, and the full `Case Detail` view is unlocked.

### The General Tab
This is the first tab in the Case Detail view. It captures the administrative foundation of the report:
- **Case Identifiers:** Internal references, regulatory authority report numbers, and sponsor study numbers.
- **Timelines:** Initial Receipt Date, Latest Receipt Date. The system uses these to calculate regulatory due dates (e.g., 15-day or 7-day reporting clocks).
- **Literature Data:** If the case was identified via a literature search, you must enter the publication details, author, and journal reference here.

---

## 3. Patient & Reporter Information

### Patient Tab
Accurate patient data is critical for medical evaluation.
- **Demographics:** Enter Patient Initials, Age at time of onset, Gender, Weight (kg/lbs), and Height (cm/in).
- **Medical History:** Log preexisting conditions, concurrent illnesses, and past surgical procedures. This data is vital for confounding factor analysis during causality assessment.
- **Lab Tests:** If the reporter provided diagnostic results (e.g., Liver Function Tests), log the test name, date, result, and reference ranges here.

### Reporter Information (General Tab)
The reporter is the source of the safety information.
- Capture their Title, First/Last Name, Organization, and Contact details.
- Select the **Reporter Type** (e.g., Physician, Pharmacist, Consumer). *Note: Cases reported by Healthcare Professionals are often treated with higher medical validity.*

---

## 4. Product Management & Coding

Navigate to the **Products** tab to log all drugs the patient consumed. 

### The Product Grid
Products are categorized by their role in the adverse event:
- **Suspect (S):** The primary drug(s) suspected to have caused the event.
- **Interacting (DR):** A drug suspected to have caused the event via a drug-drug interaction.
- **Concomitant (C):** Other medications the patient was taking at the time, which are not suspected.
- **Past (P):** Historical medications.

### Using the Drug Autocomplete
To maintain strict data integrity, free-text drug names are discouraged.
1. Click "Add Product" to create a new row.
2. In the **Product Name** field, begin typing the drug name (e.g., "Paracetamol").
3. A dynamic autocomplete dropdown will appear fetching live data from the internal Product Dictionary.
4. **Action:** Click the correct drug from the dropdown. 
5. The system will instantly auto-fill all related scientific properties, including:
   - Generic Name
   - Active Ingredients
   - Default Formulation (e.g., Tablet)
   - Route of Administration (e.g., Oral)

### Dosages
For each product, navigate to the **Dosages** sub-section to log the daily dose, frequency, and treatment start/stop dates.

---

## 5. Event Management & ICD Coding

Navigate to the **Events** tab to log the actual adverse reactions.

### Capturing Event Details
- **Reported Term:** Type exactly what the reporter said (e.g., "Patient had a very bad stomach bug").
- **Onset Date & Duration:** Log when the event started and how long it lasted.
- **Outcome:** Select the clinical outcome (Recovered, Fatal, Recovering, Not Recovered, Unknown).
- **Seriousness Criteria:** If the event meets regulatory definitions of seriousness, check the corresponding boxes (Death, Life-Threatening, Hospitalization, Disabling, Congenital Anomaly, Medically Significant).

### Using the ICD/MedDRA Browser
Global health authorities require events to be coded into standard terminologies.
1. Next to the "Reported Term", click the magnifying glass icon **(🔍)** to open the ICD Browser.
2. Search for the clinical concept (e.g., "Cholera").
3. Select the matching concept.
4. The system will map the entire hierarchy into the case:
   - **Chapter** (Broad classification)
   - **SOC** (System Organ Class)
   - **HLGT** (High-Level Group Term)
   - **LLT** (Lowest Level Term - the final coded entity)

---

## 6. Event Assessment & Causality

This module (found under **Events -> Event Assessment**) is the analytical core of the system. It generates a matrix of all Suspect/Interacting Products against all Coded Events.

### 1. Causality Determination
For every Product-Event combination, the Safety Physician must determine causality.
- Select the **As Reported Causality** (what the reporter believed).
- Select the **As Determined Causality** (the company's official medical stance: Certain, Probable, Possible, Unlikely, Not Related).

### 2. Listedness (Expectedness)
You must determine if the event is a known side effect.
- The grid dynamically lists the **Data Sheets** (e.g., Core Data Sheet, USPI) and geographic **Licenses** (e.g., Global, US) for the Suspect Product.
- For each Data Sheet, select **Listed** (Expected) or **Unlisted** (Unexpected).
- *Warning: If an event is marked as both Serious and Unlisted, it typically triggers an expedited regulatory reporting requirement (e.g., 15-day SUSAR).*

---

## 7. Workflow, Routing, & Action Items

PharmaVigi includes built-in project management tools to pass cases between teams. These are found in the **Activities / Action Items** tab.

### Routing Cases
When your task (e.g., Data Entry) is complete, you must pass the case to the next workflow state (e.g., Medical Review).
1. Click the **Route...** button.
2. A modal prompts you to select the target **User/Group** (e.g., assigning to the Medical Review queue).
3. Add **Routing Comments** explaining what needs to be reviewed.
4. Click **Route**. The case will disappear from your dashboard and appear in the assignee's queue.

### Action Items
If you need a specific task completed without changing the case owner (e.g., "Follow up with physician for lab results"):
1. Go to the Action Items grid.
2. Click **Add**.
3. Define the Task Code, Description, Assigned User, and Due Date.
4. Once the task is done, the assignee fills in the **Date Completed**.

---

## 8. Case Status, Locking & Archiving

To ensure data integrity before sending a report to the FDA or EMA, the case must be locked.

### Changing Case Status
At the bottom of the Activities tab is the **Case Lock / Archive** section.
1. The **Case Status** dropdown controls the global state of the record.
2. When all data entry, coding, assessment, and medical review is finalized, change the status to **Locked**.
3. **Important:** Locking a case disables the `Save` button for all data fields. The record becomes read-only to prevent tampering prior to regulatory submission.
4. The system records the name of the user who locked the case and the exact timestamp.

---

## 9. Regulatory Reporting (CIOMS / E2B)

PharmaVigi can generate industry-standard, print-ready regulatory forms.
1. Ensure the case is fully coded and assessed.
2. Navigate to the top navigation bar and look for the **Print / CIOMS** icon.
3. The system compiles the General, Patient, Product, Event, and Assessment data into the standard CIOMS I form format.
4. This form can be saved as a PDF or printed directly from the browser for physical submission or archiving.

---

## 10. Troubleshooting & Technical Support

- **"Route Case" button is disabled:** Ensure you have saved all recent changes to the case. You cannot route a case with unsaved, dirty state.
- **Drug Autocomplete not filling properties:** Ensure you click the item from the dropdown list. Do not type the name manually and press 'Tab', as the system requires the internal dictionary ID to fetch formulations and dosages.
- **Missing Event Assessment Rows:** The assessment grid only generates combinations for products marked as `Suspect` or `Interacting`. Concomitant drugs are intentionally excluded from causality assessment.
