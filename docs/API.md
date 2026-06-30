# PharmaVigil – REST API Reference

> **Base URL:** `http://localhost:3000/api`
>
> All endpoints return JSON. Protected endpoints require a valid JWT in the
> `Authorization: Bearer <token>` header.

---

## Table of Contents

- [Authentication](#authentication)
- [Cases](#cases)
- [Patients](#patients)
- [Products (Drugs)](#products-drugs)
- [Adverse Events](#adverse-events)
- [MedDRA Terms](#meddra-terms)
- [Workflow](#workflow)
- [Instructor Feedback](#instructor-feedback)
- [Admin / Users](#admin--users)
- [Audit Log](#audit-log)
- [Error Responses](#error-responses)

---

## Authentication

### POST `/auth/register`

Register a new user account.

| Field        | Type   | Required | Notes                          |
| ------------ | ------ | -------- | ------------------------------ |
| `username`   | string | ✅       | 3-100 characters, unique       |
| `password`   | string | ✅       | Minimum 8 characters           |
| `full_name`  | string | ✅       |                                |
| `email`      | string | ✅       | Valid email                    |
| `org_id`     | int    | ✅       | Organisation ID                |
| `role`       | string | ❌       | `STUDENT` (default), `INSTRUCTOR`, `ADMIN` |

**Response** `201 Created`

```json
{
  "user": {
    "user_id": 1,
    "username": "jdoe",
    "role": "STUDENT",
    "full_name": "Jane Doe",
    "email": "jane@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"jdoe","password":"secret123","full_name":"Jane Doe","email":"jane@example.com","org_id":1}'
```

---

### POST `/auth/login`

Authenticate and receive a JWT token.

| Field      | Type   | Required |
| ---------- | ------ | -------- |
| `username` | string | ✅       |
| `password` | string | ✅       |

**Response** `200 OK`

```json
{
  "user": {
    "user_id": 1,
    "username": "jdoe",
    "role": "STUDENT",
    "full_name": "Jane Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"jdoe","password":"secret123"}'
```

---

### GET `/auth/me`

Return the currently authenticated user's profile.

🔒 **Auth required**

**Response** `200 OK`

```json
{
  "user_id": 1,
  "username": "jdoe",
  "role": "STUDENT",
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "org_id": 1,
  "status": "ACTIVE",
  "created_at": "2024-01-15T10:00:00.000Z"
}
```

---

## Cases

### GET `/cases`

List cases visible to the authenticated user.  Students see their own cases;
instructors see all cases in their org; admins see everything.

🔒 **Auth required**

| Query Param       | Type   | Notes                                |
| ------------------ | ------ | ------------------------------------ |
| `page`             | int    | Page number (default: 1)             |
| `limit`            | int    | Per page (default: 20, max: 100)     |
| `workflow_state`   | string | Filter by state                      |
| `serious_flag`     | string | `Y` or `N`                           |
| `search`           | string | Case number / patient code search    |

**Response** `200 OK`

```json
{
  "data": [
    {
      "case_id": 1,
      "case_number": "PV-2024-000001",
      "workflow_state": "DRAFT",
      "receipt_date": "2024-01-15",
      "serious_flag": "N",
      "student": { "user_id": 1, "full_name": "Jane Doe" },
      "created_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

```bash
curl http://localhost:3000/api/cases?page=1&limit=10 \
  -H "Authorization: Bearer <token>"
```

---

### GET `/cases/:id`

Retrieve a single case with all nested data (patient, products, events,
reporters).

🔒 **Auth required**

**Response** `200 OK`

```json
{
  "case_id": 1,
  "case_number": "PV-2024-000001",
  "workflow_state": "DRAFT",
  "receipt_date": "2024-01-15",
  "aware_date": "2024-01-14",
  "case_type": "SPONTANEOUS",
  "serious_flag": "N",
  "patient": { "patient_id": 1, "sex": "F", "age_value": 45 },
  "products": [],
  "events": [],
  "reporters": []
}
```

---

### POST `/cases`

Create a new case.  Automatically generates the case number.

🔒 **Auth required** — `STUDENT`, `INSTRUCTOR`, `ADMIN`

| Field          | Type   | Required | Notes                     |
| -------------- | ------ | -------- | ------------------------- |
| `receipt_date` | string | ❌       | ISO date (YYYY-MM-DD)     |
| `aware_date`   | string | ❌       | ISO date                  |
| `case_type`    | string | ❌       | Report type code           |
| `serious_flag` | string | ❌       | `Y` or `N` (default `N`)  |

**Response** `201 Created`

```json
{
  "case_id": 2,
  "case_number": "PV-2024-000002",
  "workflow_state": "DRAFT"
}
```

```bash
curl -X POST http://localhost:3000/api/cases \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"receipt_date":"2024-01-15","case_type":"SPONTANEOUS"}'
```

---

### PUT `/cases/:id`

Update case fields.  Only allowed when case is in `DRAFT` or `DATA_ENTRY` state.

🔒 **Auth required**

**Response** `200 OK`

---

### DELETE `/cases/:id`

Soft-delete (or hard-delete for DRAFT).  Only the case owner or an ADMIN can delete.

🔒 **Auth required**

**Response** `204 No Content`

---

## Patients

### GET `/cases/:caseId/patient`

Get the patient record for a case.

🔒 **Auth required**

**Response** `200 OK`

```json
{
  "patient_id": 1,
  "case_id": 1,
  "patient_code": "PT-001",
  "dob": "1979-06-15",
  "age_value": 45,
  "age_unit": "YEAR",
  "sex": "F",
  "weight_kg": 68,
  "height_cm": 165,
  "medical_history": "Hypertension",
  "concomitant_meds": "Lisinopril 10mg daily"
}
```

---

### PUT `/cases/:caseId/patient`

Create or update the patient record for a case (upsert).

🔒 **Auth required**

| Field              | Type   | Required | Notes              |
| ------------------ | ------ | -------- | ------------------ |
| `patient_code`     | string | ❌       |                    |
| `dob`              | string | ❌       | ISO date           |
| `age_value`        | int    | ❌       |                    |
| `age_unit`         | string | ❌       | YEAR, MONTH, DAY   |
| `sex`              | string | ❌       | M, F, UNKNOWN      |
| `weight_kg`        | int    | ❌       |                    |
| `height_cm`        | int    | ❌       |                    |
| `ethnicity`        | string | ❌       |                    |
| `medical_history`  | string | ❌       |                    |
| `concomitant_meds` | string | ❌       |                    |

**Response** `200 OK`

```bash
curl -X PUT http://localhost:3000/api/cases/1/patient \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sex":"F","age_value":45,"age_unit":"YEAR","weight_kg":68}'
```

---

## Products (Drugs)

### GET `/cases/:caseId/products`

List all products/drugs associated with a case.

🔒 **Auth required**

**Response** `200 OK` — Array of product objects

---

### POST `/cases/:caseId/products`

Add a drug product to a case.

🔒 **Auth required**

| Field          | Type   | Required | Notes                                          |
| -------------- | ------ | -------- | ---------------------------------------------- |
| `drug_name`    | string | ✅       |                                                |
| `dose`         | string | ❌       | e.g. "500"                                     |
| `dose_unit`    | string | ❌       | e.g. "mg"                                      |
| `route`        | string | ❌       | ORAL, IV, IM, SC, etc.                         |
| `frequency`    | string | ❌       | QD, BID, TID, PRN, etc.                        |
| `start_date`   | string | ❌       | ISO date                                       |
| `stop_date`    | string | ❌       | ISO date                                       |
| `suspect_flag` | string | ❌       | `SUSPECT` (default), `CONCOMITANT`, `INTERACTING` |
| `batch_number` | string | ❌       |                                                |
| `indication`   | string | ❌       |                                                |
| `action_taken` | string | ❌       | WITHDRAWN, REDUCED, CONTINUED, UNKNOWN         |
| `dechallenge`  | string | ❌       | POSITIVE, NEGATIVE, NOT_DONE, UNKNOWN          |
| `rechallenge`  | string | ❌       | POSITIVE, NEGATIVE, NOT_DONE, UNKNOWN          |

**Response** `201 Created`

```bash
curl -X POST http://localhost:3000/api/cases/1/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"drug_name":"Ibuprofen","dose":"400","dose_unit":"mg","route":"ORAL","frequency":"TID","suspect_flag":"SUSPECT"}'
```

---

### PUT `/cases/:caseId/products/:productId`

Update a product record.

🔒 **Auth required**

**Response** `200 OK`

---

### DELETE `/cases/:caseId/products/:productId`

Remove a product from the case.

🔒 **Auth required**

**Response** `204 No Content`

---

## Adverse Events

### GET `/cases/:caseId/events`

List all adverse events for a case.

🔒 **Auth required**

**Response** `200 OK` — Array of event objects with causality data

---

### POST `/cases/:caseId/events`

Add an adverse event to a case.

🔒 **Auth required**

| Field              | Type   | Required | Notes                                 |
| ------------------ | ------ | -------- | ------------------------------------- |
| `pt_code`          | string | ❌       | MedDRA Preferred Term code            |
| `pt_name`          | string | ❌       | Preferred Term name                   |
| `llt_code`         | string | ❌       | MedDRA Lowest Level Term code         |
| `llt_name`         | string | ❌       | Lowest Level Term name                |
| `soc_code`         | string | ❌       | System Organ Class code               |
| `soc_name`         | string | ❌       | System Organ Class name               |
| `onset_date`       | string | ❌       | ISO date                              |
| `end_date`         | string | ❌       | ISO date                              |
| `severity`         | string | ❌       | MILD, MODERATE, SEVERE                |
| `outcome`          | string | ❌       | RECOVERED, RECOVERING, NOT_RECOVERED, FATAL, UNKNOWN |
| `serious_criteria` | string | ❌       | Comma-separated criteria codes        |
| `narrative`        | string | ❌       | Free-text event narrative             |

**Response** `201 Created`

---

### PUT `/cases/:caseId/events/:eventId`

Update an event record.

🔒 **Auth required**

**Response** `200 OK`

---

### DELETE `/cases/:caseId/events/:eventId`

Remove an event from the case.

🔒 **Auth required**

**Response** `204 No Content`

---

### PUT `/cases/:caseId/events/:eventId/causality`

Set or update the causality assessment for an event–product pair.

🔒 **Auth required**

| Field            | Type   | Required | Notes                               |
| ---------------- | ------ | -------- | ----------------------------------- |
| `product_id`     | int    | ✅       | The suspect drug                    |
| `causality_who`  | string | ❌       | WHO-UMC category                    |
| `naranjo_score`  | int    | ❌       | 0-13 Naranjo score                  |
| `naranjo_detail` | object | ❌       | Individual Naranjo question answers  |

**Response** `200 OK`

---

## MedDRA Terms

### GET `/meddra/search`

Search MedDRA terms by preferred term or lowest-level term name.

🔒 **Auth required**

| Query Param | Type   | Required | Notes                    |
| ----------- | ------ | -------- | ------------------------ |
| `q`         | string | ✅       | Search query (min 2 chars) |
| `limit`     | int    | ❌       | Max results (default: 20)  |

**Response** `200 OK`

```json
{
  "data": [
    {
      "term_id": 1,
      "pt_code": "10019211",
      "pt_name": "Headache",
      "soc_name": "Nervous system disorders"
    }
  ]
}
```

```bash
curl "http://localhost:3000/api/meddra/search?q=headache&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

### GET `/meddra/:ptCode`

Get full MedDRA hierarchy for a given PT code.

🔒 **Auth required**

**Response** `200 OK`

---

## Workflow

### POST `/cases/:caseId/workflow/transition`

Transition a case to a new workflow state.

🔒 **Auth required** — role-based restrictions apply

| Field      | Type   | Required | Notes                            |
| ---------- | ------ | -------- | -------------------------------- |
| `action`   | string | ✅       | Transition action name           |
| `comments` | string | ❌       | Reason / notes for the transition |

**Valid actions:**

| Action            | From State       | To State         | Required Role          |
| ----------------- | ---------------- | ---------------- | ---------------------- |
| `start_entry`     | `DRAFT`          | `DATA_ENTRY`     | STUDENT                |
| `submit`          | `DATA_ENTRY`     | `SUBMITTED`      | STUDENT                |
| `review`          | `SUBMITTED`      | `UNDER_REVIEW`   | INSTRUCTOR             |
| `request_changes` | `UNDER_REVIEW`   | `DATA_ENTRY`     | INSTRUCTOR             |
| `approve`         | `UNDER_REVIEW`   | `APPROVED`       | INSTRUCTOR             |
| `reject`          | `UNDER_REVIEW`   | `REJECTED`       | INSTRUCTOR             |
| `archive`         | `APPROVED`       | `ARCHIVED`       | ADMIN                  |
| `reopen`          | `REJECTED`       | `DATA_ENTRY`     | STUDENT                |

**Response** `200 OK`

```json
{
  "case_id": 1,
  "workflow_state": "SUBMITTED",
  "transition": {
    "from": "DATA_ENTRY",
    "to": "SUBMITTED",
    "action": "submit",
    "actioned_by": 1,
    "action_time": "2024-01-15T14:30:00.000Z"
  }
}
```

```bash
curl -X POST http://localhost:3000/api/cases/1/workflow/transition \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action":"submit","comments":"Ready for review"}'
```

---

### GET `/cases/:caseId/workflow/history`

View the full workflow history for a case.

🔒 **Auth required**

**Response** `200 OK`

```json
{
  "data": [
    {
      "log_id": 1,
      "from_state": null,
      "to_state": "DRAFT",
      "action_time": "2024-01-15T10:00:00.000Z",
      "user": { "user_id": 1, "full_name": "Jane Doe" },
      "comments": null
    }
  ]
}
```

---

## Instructor Feedback

### GET `/cases/:caseId/feedback`

Get all feedback for a case.

🔒 **Auth required**

**Response** `200 OK` — Array of feedback objects

---

### POST `/cases/:caseId/feedback`

Submit feedback on a case.

🔒 **Auth required** — `INSTRUCTOR` only

| Field      | Type   | Required | Notes                                       |
| ---------- | ------ | -------- | ------------------------------------------- |
| `score`    | int    | ❌       | 0-100 score                                 |
| `comments` | string | ❌       | Detailed feedback                           |
| `decision` | string | ❌       | `APPROVE`, `REJECT`, `REQUEST_CHANGES`      |

**Response** `201 Created`

```bash
curl -X POST http://localhost:3000/api/cases/1/feedback \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"score":85,"comments":"Good case analysis. Minor improvements needed in causality section.","decision":"APPROVE"}'
```

---

## Admin / Users

### GET `/admin/users`

List all users (paginated).

🔒 **Auth required** — `ADMIN` only

| Query Param | Type   | Notes                    |
| ----------- | ------ | ------------------------ |
| `page`      | int    | Default: 1               |
| `limit`     | int    | Default: 20              |
| `role`      | string | Filter by role           |
| `status`    | string | Filter by status         |

**Response** `200 OK`

---

### GET `/admin/users/:id`

Get a single user's details.

🔒 **Auth required** — `ADMIN` only

**Response** `200 OK`

---

### PUT `/admin/users/:id`

Update a user's profile or role.

🔒 **Auth required** — `ADMIN` only

| Field       | Type   | Required | Notes              |
| ----------- | ------ | -------- | ------------------ |
| `full_name` | string | ❌       |                    |
| `email`     | string | ❌       |                    |
| `role`      | string | ❌       | STUDENT, INSTRUCTOR, ADMIN |
| `status`    | string | ❌       | ACTIVE, INACTIVE   |

**Response** `200 OK`

---

### PUT `/admin/users/:id/password`

Reset a user's password.

🔒 **Auth required** — `ADMIN` only

| Field         | Type   | Required |
| ------------- | ------ | -------- |
| `newPassword` | string | ✅       |

**Response** `200 OK`

---

### GET `/admin/organisations`

List all organisations.

🔒 **Auth required** — `ADMIN` only

**Response** `200 OK`

---

### POST `/admin/organisations`

Create a new organisation.

🔒 **Auth required** — `ADMIN` only

| Field  | Type   | Required |
| ------ | ------ | -------- |
| `name` | string | ✅       |
| `type` | string | ❌       |

**Response** `201 Created`

---

## Audit Log

### GET `/audit`

Query the audit log.

🔒 **Auth required** — `ADMIN`, `INSTRUCTOR`

| Query Param  | Type   | Notes                         |
| ------------ | ------ | ----------------------------- |
| `case_id`    | int    | Filter by case                |
| `table_name` | string | Filter by table               |
| `changed_by` | int    | Filter by user                |
| `from`       | string | ISO datetime (start)          |
| `to`         | string | ISO datetime (end)            |
| `page`       | int    | Default: 1                    |
| `limit`      | int    | Default: 50                   |

**Response** `200 OK`

```json
{
  "data": [
    {
      "audit_id": 1,
      "case_id": 1,
      "table_name": "spt_org_cases",
      "column_name": "workflow_state",
      "old_value": "DRAFT",
      "new_value": "DATA_ENTRY",
      "changed_by": 1,
      "changed_at": "2024-01-15T10:05:00.000Z",
      "action": "UPDATE",
      "user": { "full_name": "Jane Doe" }
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 120 }
}
```

---

## Lookup Endpoints

### GET `/lookups/report-types`

List all report types.

**Response** `200 OK`

```json
{
  "data": [
    { "report_type_id": 1, "code": "EXPEDITED_15DAY", "label": "15-day Expedited Report (serious unexpected)", "deadline_days": 15, "agency": "FDA/EMA" }
  ]
}
```

---

### GET `/lookups/countries`

List all countries.

| Query Param | Type   | Notes               |
| ----------- | ------ | ------------------- |
| `region`    | string | Filter by region    |
| `search`    | string | Name search         |

**Response** `200 OK`

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error description",
    "details": [
      { "field": "username", "message": "Username is required" }
    ]
  }
}
```

### Standard Error Codes

| HTTP Status | Code                 | Description                      |
| ----------- | -------------------- | -------------------------------- |
| 400         | `VALIDATION_ERROR`   | Invalid request body             |
| 401         | `UNAUTHORIZED`       | Missing or invalid token         |
| 403         | `FORBIDDEN`          | Insufficient permissions         |
| 404         | `NOT_FOUND`          | Resource not found               |
| 409         | `CONFLICT`           | Duplicate or state conflict      |
| 422         | `INVALID_TRANSITION` | Invalid workflow transition      |
| 500         | `INTERNAL_ERROR`     | Unexpected server error          |
