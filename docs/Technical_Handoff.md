# PharmaVigi: Technical Handoff Document

This document serves as the definitive technical reference for the PharmaVigi application. It outlines the architecture, frontend and backend implementations, database schemas, and integration flows required for developers and system administrators to maintain and scale the application.

---

## 1. System Architecture Overview

PharmaVigi is a modern, decoupled web application utilizing a robust JavaScript/TypeScript stack.

- **Frontend:** React 18, Vite, TailwindCSS
- **Backend:** Node.js, Express.js
- **Database / ORM:** Prisma ORM, SQLite (Local Development) / PostgreSQL (Target Production)
- **Deployment:** Packaged for deployment via standard Node.js hosting (e.g., Render, AWS EC2, or Docker).

### High-Level Data Flow
1. The **React Client** maintains complex, deeply-nested component states (Case, Products, Events).
2. Upon user save, the client serializes the data and issues RESTful `POST` and `PUT` requests to the **Express Backend**.
3. The **Express Controllers** validate the payloads and use **Prisma Client** to execute transactional inserts and updates into the SQL database.
4. Data is returned via standardized JSON responses and hydrated back into the frontend React state.

---

## 2. Frontend Architecture

### Technology Stack
- **Framework:** React 18
- **Build Tool:** Vite (for rapid HMR and optimized bundling)
- **Styling:** TailwindCSS (utility-first CSS framework for custom, responsive designs)
- **Routing:** React Router DOM (e.g., `/cases`, `/cases/:id`)

### Folder Structure
- `/src/pages/`: Contains top-level route components (e.g., `CaseDetailPage.jsx`, `CaseList.jsx`).
- `/src/components/ui/`: Contains reusable, highly specific UI components (e.g., `DrugAutocomplete.jsx`, `ICDBrowserModal.jsx`).

### State Management
Due to the immense complexity of a PV case, state is primarily managed via **Lifting State Up** within `CaseDetailPage.jsx`.
- **Form State:** Standard text inputs (Patient Demographics, General Info).
- **Tabbed Arrays:** `productTabs` and `eventTabs` track multiple entities. Each entity has a local ID (`id`) used for frontend rendering and a `backendId` tracking the database primary key.
- **Cross-Entity State:** `eventAssessments` tracks the many-to-many relationship mapping Products to Events (Causality, Listedness).

---

## 3. Backend Architecture

### Technology Stack
- **Server:** Node.js with Express.js framework.
- **ORM:** Prisma Client.
- **Entry Point:** `server/index.js` bootstraps the Express app and registers routers.

### API Design & Controllers
The API follows standard REST conventions under the `/api/cases` prefix.

**Key Endpoints:**
- `GET /api/cases/:id` : Fetches the aggregate root (Case) including nested Products, Events, and Causalities.
- `POST/PUT /api/cases/:id/products` : Upserts a Suspect/Concomitant drug.
- `POST/PUT /api/cases/:id/events` : Upserts an Adverse Event. Crucially, the Event payload accepts a `causalities` array.

**Controllers (`events.controller.js`):**
When an event is created/updated, the controller utilizes Prisma's nested writes or explicitly iterates to upsert the `spt_org_event_causality` mapping table.

---

## 4. Database Schema (Prisma)

The application utilizes a relational data model managed via Prisma (`prisma/schema.prisma`).

### Core Models
- **`spt_org_case`**: The aggregate root representing a single PV case.
- **`spt_org_product`**: Tracks drugs associated with a case (`product_id`, `drug_name`, `indication`).
- **`spt_org_event`**: Tracks adverse events (`event_id`, `entity_title`, `chapter`, `narrative`).
- **`spt_org_event_causality`**: The **Join Table** mapping Products to Events.

### The Event Causality Table
This table is the technical backbone of the Event Assessment module.
```prisma
model spt_org_event_causality {
  causality_id         Int      @id @default(autoincrement())
  event_id             Int
  product_id           Int
  causality_reported   String?
  causality_determined String?
  seriousness          String?
  listedness_data      String?  // JSON string storing dynamic dynamic datasheet/license assessments
  ...
}
```
**Important Design Decision:** `listedness_data` is a stringified JSON blob. Because a drug can have an arbitrary, varying number of Datasheets and Licenses, storing this as JSON allows the frontend to dynamically render `N` dropdowns without requiring strict schema migrations for new license types.

---

## 5. Frontend ↔ Backend Connection

### Hydration Flow (Load)
When `CaseDetailPage.jsx` mounts, the `useEffect` hook calls `GET /api/cases/:id`. 
1. `events` are loaded into `eventTabs`.
2. `products` are loaded into `productTabs`.
3. The frontend manually reconstructs the `eventAssessments` array by parsing `evt.causalities` and un-stringifying `listedness_data`.

### Serialization Flow (Save)
When the user clicks Save in `CaseDetailPage.jsx`, the `handleSave` function executes sequentially:
1. **Upsert Products:** Products *must* be saved first to ensure they have a valid `backendId` generated by the database.
2. **Upsert Events:** For each Event, the frontend filters `eventAssessments` to find associated causalities. It maps the product's new `backendId` into the payload and stringifies the `listednessData` object. The payload is sent to the Express controller, which commits the full relationship to the database.

---

## 6. Environment Setup & Deployment

### Local Development
1. **Install Dependencies:** Run `npm install` in the root directory.
2. **Database Migration:** Run `npx prisma db push` to synchronize the SQLite `dev.db` with the Prisma schema.
3. **Start the App:** Run `npm run dev`. This utilizes concurrently or a similar script to start the Vite frontend and Express backend simultaneously.

### Deployment Configuration
The repository includes a `render.yaml` blueprint for PaaS deployment (e.g., Render.com). It defines:
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start` (Runs the Express server which serves the built static frontend assets).

---

## 7. Known Limitations & Future Work

- **Database Provider:** The current Prisma schema is configured for `provider = "sqlite"` to facilitate rapid local development without Docker. For production, the `provider` in `schema.prisma` should be updated to `postgresql`.
- **Dynamic Dictionaries:** The MedDRA/ICD hierarchy and Product Dictionary are currently utilizing local data stubs or mock data arrays (like the hardcoded Data Sheets). A future milestone is integrating a dedicated dictionary microservice (e.g., WHO Drug Global, MedDRA APIs).
- **Authentication:** Standard JWT-based auth and Role-Based Access Control (RBAC) middleware should be implemented in Express before exposing the API endpoints to a production network.
