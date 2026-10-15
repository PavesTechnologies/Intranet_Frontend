# AR Post-Invoice API Contract

**For:** AR backend (`Account_Receivable`) developers
**Status:** Frontend built against this contract; endpoints not yet implemented
**Frontend services:** `src/pages/account_receivable/services/` — `paymentService.js`, `adjustmentNoteService.js`, `customerLedgerService.js`, `collectionsService.js`

This covers everything after **Send to Client** in the AR flow: payments, credit/debit notes, the customer ledger, reminders and collections. It builds on what already exists — `InvoiceDelivery`, `Receivable`, `GET /api/v1/receivables/outstanding` and `GET /api/v1/receivables/{id}` — and does not change those.

Until an endpoint exists, the matching screen shows "waiting for backend" (it detects the `No static resource …` error). Once an endpoint matches this contract, the screen works with no frontend change.

## Conventions

Same as the existing controllers:

- Every response is the `ApiResponse<T>` envelope: `{ success, message, data, timestamp }`. Lists return `data: [...]`.
- IDs are UUIDs, except `projectId` (Long). Amounts are `BigDecimal` (scale 2) serialized as numbers. Dates are `yyyy-MM-dd`; timestamps are ISO `LocalDateTime`.
- Validation failures return 400 via `ValidationException` with a user-readable `message` — the frontend shows it as-is.
- Not-found returns 404 via `ResourceNotFoundException` with a domain message (e.g. "Payment could not be found.").
- Money never crosses currencies: a payment, note or allocation must use the receivable's `currencyCode`.

## How these actions change a Receivable

`Receivable.outstandingBalance` is the single balance every action moves. Its current comment already anticipates this ("may only be lowered by the future payment/adjustment functionality").

| Action | Effect on `outstandingBalance` | Resulting `status` |
|---|---|---|
| Payment allocation | − allocated amount | `PARTIALLY_PAID` if > 0, `SETTLED` if 0 |
| Credit note | − note amount (never below 0) | same rule |
| Debit note | + note amount | `OUTSTANDING` if nothing received yet, else `PARTIALLY_PAID` |

- Keep the existing guards: the balance may never go negative (`@Check` + `requireNonNegativeBalance`), and the `@Version` field handles concurrent updates.
- Reaching `SETTLED` is the flow's "Mark invoice paid → Close invoice → Archive receivable". Settled receivables already drop out of `/outstanding` and stay readable via `/receivables/{id}`. No separate close or archive endpoint is needed unless Finance wants a manual action.

---

## 1. Payments

### `GET /api/v1/payments`
Query (all optional): `clientId` (UUID), `fromDate`, `toDate` (on `paymentDate`). Newest first.

**Response `data`:** `PaymentResponseDto[]`

```json
{
  "paymentId": "uuid",
  "paymentNumber": "PAY-2026-00012",
  "clientId": "uuid",
  "clientName": "Acme Corp",
  "paymentDate": "2026-10-15",
  "amount": 118000.00,
  "currencyCode": "INR",
  "paymentMethod": "BANK_TRANSFER",
  "referenceNumber": "UTR123456",
  "allocatedAmount": 100000.00,
  "unallocatedAmount": 18000.00,
  "allocationStatus": "PARTIALLY_ALLOCATED",
  "reconciliationStatus": "UNRECONCILED",
  "reconciledAt": null,
  "bankReference": null,
  "remarks": "Part payment for Sept",
  "allocations": [
    { "allocationId": "uuid", "receivableId": "uuid", "invoiceId": "uuid", "invoiceNumber": "INV-2026-0041", "amount": 100000.00 }
  ],
  "createdAt": "2026-10-15T10:21:00",
  "createdBy": "finance.exec@paves.com"
}
```

**Enums**
- `paymentMethod`: `BANK_TRANSFER | UPI | CARD | CHEQUE | CASH | WIRE_TRANSFER | PAYMENT_GATEWAY`
- `allocationStatus`: `UNALLOCATED | PARTIALLY_ALLOCATED | FULLY_ALLOCATED`
- `reconciliationStatus`: `UNRECONCILED | RECONCILED`

### `GET /api/v1/payments/{paymentId}`
**Response:** one `PaymentResponseDto`.

### `POST /api/v1/payments` — record a payment
```json
{
  "clientId": "uuid",
  "paymentDate": "2026-10-15",
  "amount": 118000.00,
  "currencyCode": "INR",
  "paymentMethod": "BANK_TRANSFER",
  "referenceNumber": "UTR123456",
  "remarks": "optional",
  "allocations": [ { "receivableId": "uuid", "amount": 100000.00 } ]
}
```

**Rules (400 on violation):**
- `amount` > 0. `paymentDate` is not in the future.
- `allocations` may be empty, which records an unallocated payment.
- Each allocation targets a receivable of the same client and currency, with `0 < amount ≤ outstandingBalance`.
- The sum of allocations must be ≤ `amount`.
- `referenceNumber` is required for every method except `CASH`.
- Lock each receivable (`SELECT … FOR UPDATE`) before reducing its balance, as `ReceivableServiceImpl` already does for invoices.

**Response:** the created `PaymentResponseDto`.

### `POST /api/v1/payments/{paymentId}/allocations` — allocate the remainder
**Body:** `{ "allocations": [ { "receivableId": "uuid", "amount": 18000.00 } ] }`
Same rules as above. The sum must be ≤ the payment's current `unallocatedAmount`.
**Response:** the updated `PaymentResponseDto`.

### `POST /api/v1/payments/{paymentId}/reconcile` — match the payment to the bank statement
**Body:** `{ "bankReference": "STMT-REF-889", "reconciledDate": "2026-10-16", "remarks": "optional" }`
- Sets `reconciliationStatus = RECONCILED`, `reconciledAt` and `bankReference`.
- Reconciling an already-reconciled payment returns 400.

**Response:** the updated `PaymentResponseDto`.

---

## 2. Credit & debit notes

### `GET /api/v1/adjustment-notes`
Query (all optional): `noteType` (`CREDIT | DEBIT`), `clientId`, `receivableId`. Newest first.

**Response `data`:** `AdjustmentNoteResponseDto[]`

```json
{
  "noteId": "uuid",
  "noteNumber": "CN-2026-0003",
  "noteType": "CREDIT",
  "receivableId": "uuid",
  "invoiceId": "uuid",
  "invoiceNumber": "INV-2026-0041",
  "clientId": "uuid",
  "clientName": "Acme Corp",
  "currencyCode": "INR",
  "amount": 5000.00,
  "reason": "BILLING_ERROR",
  "remarks": "Rate applied twice for 2 days",
  "noteDate": "2026-10-15",
  "status": "ISSUED",
  "balanceBefore": 118000.00,
  "balanceAfter": 113000.00,
  "createdAt": "2026-10-15T11:02:00",
  "createdBy": "finance.exec@paves.com"
}
```

**`reason` values (from the AR flow):**
- CREDIT: `RETURNED_GOODS | BILLING_ERROR | DISCOUNT_ADJUSTMENT | PROJECT_CANCELLATION | OVERBILLING`
- DEBIT: `ADDITIONAL_CHARGES | BILLING_CORRECTION | PRICE_ADJUSTMENT | PENALTY_CHARGES | TAX_ADJUSTMENT`

### `POST /api/v1/adjustment-notes` — issue a note
```json
{ "noteType": "CREDIT", "receivableId": "uuid", "reason": "BILLING_ERROR", "amount": 5000.00, "noteDate": "2026-10-15", "remarks": "required" }
```

**Rules:**
- `amount` > 0. `reason` must belong to `noteType`. `remarks` is required.
- CREDIT `amount` must be ≤ `outstandingBalance`.
- The receivable must not be `SETTLED` for a CREDIT note.
- Apply the balance change and record `balanceBefore` / `balanceAfter` in the same transaction.

**Response:** the created note.

---

## 3. Customer ledger

### `GET /api/v1/customers/{clientId}/ledger`
Query: `currencyCode` (required when the client is billed in more than one currency), `fromDate`, `toDate` (optional).

**Response `data`:**
```json
{
  "clientId": "uuid",
  "clientName": "Acme Corp",
  "currencyCode": "INR",
  "openingBalance": 0.00,
  "closingBalance": 113000.00,
  "totals": { "invoiced": 236000.00, "received": 118000.00, "credited": 5000.00, "debited": 0.00 },
  "entries": [
    { "entryId": "uuid", "entryDate": "2026-09-30", "entryType": "INVOICE", "reference": "INV-2026-0041", "description": "Invoice sent", "debit": 118000.00, "credit": 0.00, "runningBalance": 118000.00, "invoiceId": "uuid" },
    { "entryId": "uuid", "entryDate": "2026-10-15", "entryType": "PAYMENT", "reference": "PAY-2026-00012", "description": "Bank transfer UTR123456", "debit": 0.00, "credit": 100000.00, "runningBalance": 18000.00, "invoiceId": null }
  ]
}
```

- `entryType`: `INVOICE | PAYMENT | CREDIT_NOTE | DEBIT_NOTE`
- Invoices and debit notes are debits; payments and credit notes are credits.
- Entries are in date order, oldest first, with `runningBalance` after each entry.
- Only invoices that have a receivable (i.e. were sent) appear.

**Aging needs no new endpoint.** The frontend computes per-client aging buckets (Current, 1–30, 31–60, 61–90, 90+) from the existing `GET /api/v1/receivables/outstanding`, using `daysOverdue`.

---

## 4. Reminders

### `GET /api/v1/reminders`
Query (optional): `receivableId`, `status`. Newest first.

**Response `data`:** `ReminderResponseDto[]`
```json
{
  "reminderId": "uuid",
  "receivableId": "uuid",
  "invoiceId": "uuid",
  "invoiceNumber": "INV-2026-0041",
  "clientName": "Acme Corp",
  "reminderType": "OVERDUE",
  "channel": "EMAIL",
  "status": "SENT",
  "triggeredBy": "MANUAL",
  "recipient": "ap@acme.com",
  "scheduledAt": null,
  "sentAt": "2026-10-15T12:00:00",
  "failureReason": null
}
```

**Enums**
- `reminderType`: `UPCOMING_DUE | DUE_TODAY | OVERDUE | ESCALATION`
- `channel`: `EMAIL | SMS | WHATSAPP | PORTAL`
- `status`: `SCHEDULED | SENT | FAILED | CANCELLED`
- `triggeredBy`: `AUTO | MANUAL`

### `POST /api/v1/reminders` — send a manual reminder now
**Body:** `{ "receivableId": "uuid", "reminderType": "OVERDUE", "channel": "EMAIL", "message": "optional custom note" }`

**Rules:**
- The receivable must have `outstandingBalance > 0`.
- Like `POST /invoices/{id}/send`, **always answer 200 with the outcome in `status`** (`SENT` / `FAILED` + `failureReason`). The frontend treats `FAILED` as an error.
- `EMAIL` can reuse `EmailService`. Other channels may return `FAILED` with "Channel not configured" until they are integrated.

### `POST /api/v1/reminders/{reminderId}/cancel`
Cancels a `SCHEDULED` reminder. Returns 400 for any other status.

*Automatic schedules (the flow's "Reminder Configuration" setting) are out of scope for this contract. Automatic sends should still appear in `GET /reminders` with `triggeredBy: AUTO`.*

---

## 5. Collection cases

### `GET /api/v1/collection-cases`
Query (optional): `status`, `clientId`.

### `GET /api/v1/collection-cases/{caseId}`
Same DTO. **Must** include `activities` (the list endpoint may omit them).

**`CollectionCaseResponseDto`:**
```json
{
  "caseId": "uuid",
  "caseNumber": "COL-2026-0007",
  "clientId": "uuid",
  "clientName": "Acme Corp",
  "receivableIds": ["uuid"],
  "invoiceNumbers": ["INV-2026-0041"],
  "totalOverdue": 18000.00,
  "currencyCode": "INR",
  "priority": "HIGH",
  "status": "PROMISE_TO_PAY",
  "assigneeName": "Ravi K",
  "nextFollowUpDate": "2026-10-20",
  "promiseToPay": { "promisedDate": "2026-10-25", "promisedAmount": 18000.00 },
  "openedAt": "2026-10-15T09:00:00",
  "lastActivityAt": "2026-10-15T15:30:00",
  "activities": [
    { "activityId": "uuid", "activityType": "CALL", "outcome": "Client confirmed payment next week", "notes": "", "createdAt": "2026-10-15T15:30:00", "createdBy": "Ravi K" }
  ]
}
```

**Enums**
- `priority`: `LOW | MEDIUM | HIGH | CRITICAL`
- `status`: `OPEN | IN_PROGRESS | PROMISE_TO_PAY | ESCALATED | RESOLVED`
- `activityType`: `CALL | EMAIL | MEETING | NOTE`

`totalOverdue` is the current sum of the case's receivables' `outstandingBalance`. It is always computed, never stored.

### Write endpoints
Each one returns the updated case, with `activities` included.

| Endpoint | Body | Rules |
|---|---|---|
| `POST /api/v1/collection-cases` | `{ clientId, receivableIds[], priority, assigneeName?, notes? }` | Receivables belong to the client, share one currency, and are overdue (`daysOverdue > 0`). At most one non-`RESOLVED` case per receivable. |
| `POST /{caseId}/assign` | `{ assigneeName }` | Not allowed on `RESOLVED` cases. |
| `POST /{caseId}/activities` | `{ activityType, outcome, notes?, nextFollowUpDate? }` | Moves `OPEN` → `IN_PROGRESS`. Updates `lastActivityAt` and `nextFollowUpDate`. |
| `POST /{caseId}/promise-to-pay` | `{ promisedDate, promisedAmount, notes? }` | `promisedDate` ≥ today. Sets status `PROMISE_TO_PAY`. Logs an activity. |
| `POST /{caseId}/escalate` | `{ reason }` | Sets status `ESCALATED`. Logs an activity. This is the flow's "Legal Escalation". |
| `POST /{caseId}/resolve` | `{ resolution }` | Sets status `RESOLVED`. The backend should also resolve a case automatically when all its receivables reach `SETTLED`. |

`assigneeName` is free text for now. Swap it for a user id once the collector list comes from user management.

---

## Open questions for Finance

1. **Approval for notes and payments.** Should credit and debit notes (or large payments) go through the Finance Manager like invoices do? If yes, add `PENDING_APPROVAL` to note and payment status, plus approve/reject endpoints like `InvoiceApprovalController`.
2. **Overpayments.** Does unallocated money stay on the payment, as specified above, or become a client credit balance that can be applied to future invoices?
3. **Reports and settings in the flow diagram** (cash-flow forecast, collection efficiency, credit limits, reminder rules, invoice numbering) are not covered here. They are a second phase.
