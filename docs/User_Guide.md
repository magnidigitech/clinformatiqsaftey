# PharmaVigi: Comprehensive User Guide

Welcome to the PharmaVigi User Guide. This manual provides detailed, step-by-step instructions for navigating the system, managing pharmacovigilance cases, utilizing built-in medical coding tools, and completing rigorous event assessments.

---

## 1. Introduction
PharmaVigi is a state-of-the-art Pharmacovigilance (PV) application designed to capture, track, and assess adverse drug reactions (ADRs). The platform mirrors industry standards (such as Oracle Argus) and provides intuitive interfaces to streamline case intake, medical coding, and causality assessment.

---

## 2. Getting Started

### Accessing the System
1. Open your web browser and navigate to the PharmaVigi URL provided by your administrator (typically `http://localhost:5173` for local development).
2. The system currently boots directly to the **Case List** or dashboard depending on your user role.

### Basic Navigation Layout
- **Top Navigation Bar:** Contains quick links to Home, Case Lists, Reports, Settings, and User Profile.
- **Left Sidebar (in Case Detail):** Your primary workspace for an open case. It allows you to rapidly jump between different sections of the case (General, Patient, Products, Events, Activities, Regulatory Reports).
- **Status Bar:** At the very top/bottom of a case, displays critical case status such as "Open", "Locked", or "Submitted".

---

## 3. Case Management

### Viewing the Case List
The Case List is your primary inbox for adverse events.
- **Filtering:** Use the column headers to filter cases by Case ID, Date Received, Patient Initials, or Status.
- **Opening a Case:** Click on the **Case ID** (highlighted in blue) to open the Case Detail view.

### Creating a New Case
1. Click the **"New Case"** button on the dashboard.
2. A blank Case Detail record will open. The system will automatically assign a provisional Case ID.
3. You must fill out the **General** tab first (Initial Receipt Date, Country of Occurrence, Report Type).
4. Click **Save** in the top right corner. The system will persist the case and generate a permanent backend ID.

### The Case Detail View
The Case Detail interface is broken into several tabs:
1. **General:** Administrative details, study information, and reporter details.
2. **Patient:** Demographics (Initials, Age, Gender, Weight, Height), medical history, and relevant lab tests.
3. **Products:** Suspect, Concomitant, and Past drugs taken by the patient.
4. **Events:** The adverse reactions experienced by the patient. Includes medical coding and event assessment.
5. **Activities / Action Items:** Workflow routing, action items, and audit trails.

---

## 4. Data Entry & Coding

### Using the Drug Autocomplete
When entering a suspect or concomitant drug in the **Products** tab:
1. Begin typing the drug name in the **Product Name** field.
2. An autocomplete dropdown will appear with matching results from the product dictionary.
3. Select the correct drug from the list. 
4. *Important:* Selecting the drug automatically auto-fills all related properties (Generic Name, Formulation, Active Ingredients, Administration Route, etc.) instantly.

### Using the ICD/MedDRA Browser for Disease Coding
To maintain global regulatory compliance, all events must be coded using standard medical dictionaries.
1. Go to the **Events** tab.
2. Next to the "Reported Term" field, click the magnifying glass icon **(🔍)** to open the ICD Browser.
3. Use the search bar in the modal to find the exact medical term (e.g., "Cholera").
4. Select the matching row. 
5. The system will automatically populate the full hierarchy into the event record:
   - **Chapter** -> **SOC** (System Organ Class) -> **HLGT** (High-Level Group Term) -> **LLT** (Lowest Level Term).

---

## 5. Event Assessment & Causality

The **Event Assessment** grid is the most critical workflow for safety reporting. This grid allows safety physicians to determine if a drug caused an event and if that event was "expected" (Listed) or "unexpected" (Unlisted).

### Accessing the Grid
Navigate to **Events -> Event Assessment**.

### Understanding the Columns
- **Product Column:** Lists all products marked as `Suspect` (S) or `Drug Interaction` (DR). Each product has an interactive link and icon.
- **Event Column (Causality):**
  - **As Reported Causality:** The causality determined by the initial reporter (e.g., Doctor, Patient).
  - **As Determined Causality:** The causality determined by your internal Safety Physician. Options include *Certain, Probable, Possible, Unlikely, Not Related*.
  - Underneath these dropdowns, you will see the full medical hierarchy (Chapter, SOC, HLGT, LLT) for the event you coded in the previous step.
- **Seriousness:** Indicates if the event meets regulatory criteria for being a Serious Adverse Event (SAE), such as resulting in death, hospitalization, or being Medically Significant (MS).
- **Data Sheet & License:** Lists the official manufacturer safety documents (Core Data Sheet, USPI, SmPC) and the respective geographic licenses (Global, US, EU) where the product is marketed.
- **As Determined Listedness:**
  - **Listed:** The adverse event is already documented in the Data Sheet for that specific License.
  - **Unlisted:** The adverse event is NOT documented. 

### Completing the Assessment
1. For every Suspect Product and Event combination, select the **Causality** dropdowns.
2. Review the Data Sheet and License rows for that combination.
3. For each Data Sheet, select either **Listed** or **Unlisted** in the rightmost column.
4. Click **Save** in the top right of the application. Your listedness decisions and causality determinations are securely saved to the database.

*Note: If an event is both Serious and Unlisted, it may require expedited reporting (e.g., a 15-day SUSAR).*

---

## 6. Troubleshooting & FAQs

**Q: I selected a drug, but the formulation and ingredients didn't fill out.**
A: Ensure you are clicking the drug name directly from the autocomplete dropdown menu. Do not just type the name and press Enter, as the system needs to link the backend dictionary ID to fetch the extended properties.

**Q: My Event Assessment grid is empty.**
A: The grid only displays combinations of products and events. You must have at least one Product marked as "Suspect" or "Interacting", and at least one Event added to the case.

**Q: I clicked save, but the page shows a network error.**
A: Ensure your local backend server is running. If you are developing locally, verify that the `npm run dev` process has not crashed in your terminal. Check the browser console for specific API error messages.

**Q: The "Unknown Entity" placeholder is showing up.**
A: We have removed the placeholder text in the latest update. If an event has no name, the field will correctly remain blank until you enter a reported term or encode the event via the ICD browser.
