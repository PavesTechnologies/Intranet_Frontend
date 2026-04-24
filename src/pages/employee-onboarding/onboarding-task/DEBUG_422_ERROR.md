# 🔧 Debugging 422 Error for Task API

## ❌ What is a 422 Error?

**422 Unprocessable Entity** means the server received your request but rejected it because:

- The data format is incorrect
- A required field is missing or invalid
- Field values don't match expected types
- Validation failed on the backend

---

## ✅ Step 1: Check Browser Console for Payload

1. Open your browser **Developer Tools** (F12)
2. Go to **Console** tab
3. Look for the line: `📤 SENDING PAYLOAD:`
4. Copy the entire JSON payload
5. Compare it with the backend response structure

---

## 🔍 Step 2: Validate Payload Against Backend Structure

Your backend expects this structure:

```json
{
  "user_uuid": "string - REQUIRED",
  "task_title": "string - REQUIRED",
  "task_type": "string (e.g., 'Onboarding')",
  "description": "string",
  "assigned_to": "string - REQUIRED",
  "assigned_team": "string (e.g., 'IT Team')",
  "priority": "string (high, medium, low)",
  "status": "string (To Do, In Progress, Completed)",
  "progress": "number (0-100)",
  "due_date": "date string (YYYY-MM-DD)",
  "reminder_date": "date string (YYYY-MM-DD)",
  "send_notification": true,
  "escalation_owner": "string",
  "internal_notes": "string",
  "comments": "string",
  "created_by": "string",
  "task_uuid": "string (ONLY FOR EDIT MODE)"
}
```

---

## 🎯 Common 422 Issues & Solutions

### Issue #1: Empty Required Fields

**Problem:** `user_uuid`, `task_title`, or `assigned_to` are empty strings  
**Solution:**

- Open the modal and ensure you:
  ✅ Enter a Task Title  
  ✅ Select an Employee  
  ✅ Select an Assignee

### Issue #2: Wrong Priority Format

**Problem:** Backend receives "High" but expects "high"  
**Current Fix:** Now sending lowercase: "high", "medium", "low"

### Issue #3: Wrong Status Format

**Problem:** Backend receives "Todo" but expects "To Do"  
**Current Fix:** Status now correctly maps:

- "todo" → "To Do"
- "progress" → "In Progress"
- "completed" → "Completed"

### Issue #4: Null/Undefined Values

**Problem:** Fields like `description` or `escalation_owner` are null  
**Solution:** The code now sends empty strings `""` for optional fields

### Issue #5: Invalid assigned_to Format

**Problem:** `assigned_to` is stored as wrong data type  
**Solution:**

- Now storing the **value** from the dropdown (ID/email)
- Previously stored the label (name) - this was likely wrong

### Issue #6: Date Format Issues

**Problem:** Due date in wrong format like `2026-04-21T00:00:00`  
**Current Fix:** Using YYYY-MM-DD format as expected by backend

---

## 🛠️ Step 3: Network Debugging

1. Open **Developer Tools** (F12)
2. Go to **Network** tab
3. Create/Edit a task
4. Look for the API request (usually `POST /api/tasks`)
5. Click on the request
6. Check **Request Payload** section
7. Check **Response** section for error message details

---

## 📋 Step 4: Validation Checklist

Before submitting, verify:

- [ ] **Task Title** - Not empty, no leading/trailing spaces
- [ ] **Employee** - Selected from dropdown (not empty)
- [ ] **Assigned To** - Selected from dropdown (not empty)
- [ ] **Task Type** - Has a default value "Onboarding"
- [ ] **Priority** - One of: high, medium, low
- [ ] **Status** - One of: To Do, In Progress, Completed
- [ ] **Due Date** - Valid date in YYYY-MM-DD format
- [ ] **Reminder Date** - Valid date or defaults to due date
- [ ] **Description** - Can be empty but not null
- [ ] **Escalation Owner** - Has default value "Manager"
- [ ] **Created By** - Has default value "Admin"

---

## 🚀 Step 5: Quick Test

If you still get 422 after these steps:

1. **Check Backend Logs** - Your backend error logs will show the exact validation error
2. **Share the Network Response** - The error message in the response will tell you which field failed
3. **Verify Field Names** - Make sure backend expects exactly:
   - `user_uuid` (not `userId`, `uuid`, `employee_id`)
   - `task_title` (not `title`, `name`, `taskName`)
   - `assigned_to` (not `assignedTo`, `assignee_id`)
   - `due_date` (not `dueDate`, `deadline`)
   - `reminder_date` (not `reminderDate`, `reminder`)

---

## 💡 Expected Success Response

When 422 is fixed, you should see:

- ✅ HTTP 200 or 201 status
- ✅ Task created/updated successfully
- ✅ Modal closes automatically
- ✅ Task appears in the list

---

## 📞 Need Help?

If you're still getting 422:

1. Check browser console for the `📤 SENDING PAYLOAD` output
2. Compare each field with the backend structure above
3. Check backend logs for the specific validation error message
4. Share the exact error response from the backend
