# Event Assessment Concepts

This document outlines the core pharmacovigilance (PV) concepts used in the Event Assessment module of our application, and explains how they are technically implemented within our system (specifically in `CaseDetailPage.jsx` and the Prisma backend).

## Core Concepts

### 1. Seriousness (Severity / Duration)
This column indicates whether an adverse event meets the regulatory criteria to be considered a **Serious Adverse Event (SAE)**. Seriousness is a strict regulatory definition. An event is "Serious" if it results in death, is life-threatening, requires hospitalization, causes significant disability, or represents a Medically Significant (MS) hazard.

### 2. Data Sheet
A Data Sheet is the official safety reference document provided by the drug manufacturer. Common examples include:
- **Core Data Sheet (CCDS):** The company's global baseline safety document.
- **USPI (United States Prescribing Information):** The official label approved by the US FDA.
- **SmPC (Summary of Product Characteristics):** The official label approved by the European EMA.
- **IB (Investigator's Brochure):** Used for drugs that are still in clinical trials.

### 3. License
Because a drug might be approved for different indications or have different safety warnings in different countries, the system ties a Data Sheet to a specific regional **License** (e.g., Global, US, EU). This allows the system to check the safety rules against the exact region where the event occurred.

### 4. As Determined Listedness (Listed vs. Unlisted)
This is the final safety conclusion where the Event is compared against the Data Sheet for a specific License:
- **Listed (Expected):** The adverse event is already known and documented in that Data Sheet.
- **Unlisted (Unexpected):** The adverse event is **NOT** documented in that Data Sheet.

*Note: If an event is marked as both **Serious** and **Unlisted** (Unexpected), it is typically classified as a SUSAR (Suspected Unexpected Serious Adverse Reaction). These are critical alarms in Pharmacovigilance that often legally require expedited reporting (e.g., a 15-day alert) directly to health authorities.*

---

## Technical Implementation

### Seriousness
- **Frontend (`CaseDetailPage.jsx`):** The assessment grid displays the seriousness value pulled from the `eventAssessments` state. This is mapped from the main Events tab where the user marks seriousness criteria. If no data is present, the UI falls back to displaying `'MS'` (Medically Significant) as a placeholder.
- **Backend:** Upon saving, this value is stored in the `seriousness` column of the `spt_org_event_causality` table.

### Data Sheet and License Generation
- **Frontend (`CaseDetailPage.jsx`):** To mimic dynamic PV software (like Oracle Argus), the application attaches an array of mock `datasheets` to every Suspect product upon loading:
  ```javascript
  datasheets: [
    { name: 'Core Data Sheet', licenses: [{ name: 'Global' }] },
    { name: 'USPI', licenses: [{ name: 'US (Inv: 48,811)' }] },
    { name: 'SmPC', licenses: [{ name: 'EU (Inv: )' }] }
  ]
  ```
  The React component uses `.map()` to loop through this array and dynamically generate a row in the grid for every Data Sheet and License combination. *(In a production environment, this array would be fetched dynamically from a Company Product Dictionary database based on the selected drug).*

### Listedness Dropdowns
- **Frontend (`CaseDetailPage.jsx`):** Because the number of Data Sheets and Licenses varies, the Listedness dropdowns are completely dynamic. When a user selects "Listed" or "Unlisted", the code uses a dynamic key—such as `listedness-0-0` (Datasheet index 0, License index 0)—and updates the React state.
- **Backend:** When the user clicks **Save**, the frontend collects these dynamic listedness keys, packages them into a JSON object, and sends them to the server. The backend securely saves this JSON string directly into the `listedness_data` column in the `spt_org_event_causality` table.
- **Hydration:** Upon page reload, the software parses the JSON string back out of the database and maps it perfectly back to the dynamic dropdowns, ensuring no data is lost.
