# 🎯 Root Cause Analysis: 422 Error Fix

## ❌ What We Found

The 422 error is being caused by **mismatches between the payload being sent and what your backend expects**.

---

## 🔴 Issue #1: Extra Fields Being Sent

Your **buildTaskPayload** function in `OnboardingTask.jsx` is sending **EXTRA fields** that the backend might not expect:

### Current payload includes:

```json
{
  "assigned_to": "string",
  "assigned_to_name": "string", // ❌ EXTRA FIELD
  "assigned_to_uuid": "string", // ❌ EXTRA FIELD
  "employee_uuid": "string", // ❌ EXTRA FIELD
  "employee_name": "string", // ❌ EXTRA FIELD
  "employee": "string" // ❌ EXTRA FIELD
}
```

### Backend expects (based on your response):

```json
{
  "assigned_to": "string"
  // No extra fields mentioned
}
```

---

## 🔴 Issue #2: Data Type Transformation

The `normalizeAssigneeKey` function might be converting values incorrectly:

```javascript
const normalizeAssigneeKey = (value) => {
  if (/^\d+$/.test(normalized)) {
    return Number(normalized); // ❌ CONVERTS TO NUMBER
  }
  return normalized; // ✅ OR KEEPS AS STRING
};
```

**Problem:** If backend expects a string like "user@email.com" or "UUID-123" but receives a number, it will return 422.

---

## 🔴 Issue #3: Missing Required Fields

The buildTaskPayload might be setting these to null or empty when they're required:

- `user_uuid` - must not be null
- `assigned_to` - must not be null
- `task_title` - must not be empty

---

## ✅ Solutions

### Solution #1: Simplify buildTaskPayload (RECOMMENDED)

Update the buildTaskPayload function to send **ONLY** what the backend expects:

```javascript
const buildTaskPayload = (task, currentTask = null) => {
  return {
    user_uuid: task.user_uuid,
    task_title: task.task_title || task.title,
    task_type: task.task_type || task.taskType || "Onboarding",
    description: task.description || "",
    assigned_to: task.assigned_to,
    assigned_team: task.assigned_team || "IT Team",
    priority: task.priority || "medium",
    status: task.status,
    progress: task.progress || 0,
    due_date: task.due_date,
    reminder_date: task.reminder_date,
    send_notification: true,
    escalation_owner: task.escalation_owner || "Manager",
    internal_notes: task.internal_notes || "",
    comments: task.comments || "",
    created_by: task.created_by || "Admin",
    ...(currentTask?.task_uuid && { task_uuid: currentTask.task_uuid }),
  };
};
```

### Solution #2: Remove Extra Fields in buildTaskPayload

If you want to keep the current logic, remove these lines from the return statement:

```javascript
// DELETE THESE LINES:
assigned_to_name: resolvedAssigneeName,
assigned_to_uuid: resolvedAssigneeKey,
employee_uuid: resolvedEmployeeUuid,
employee_name: resolvedEmployeeName,
employee: resolvedEmployeeName,
```

### Solution #3: Fix normalizeAssigneeKey

Change it to always return a string:

```javascript
const normalizeAssigneeKey = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value).trim(); // Always return as string, never convert to number
};
```

---

## 🧪 Step-by-Step Debugging

1. **Add console.log to buildTaskPayload:**

```javascript
return {
  // ... payload
};
console.log(
  "📤 FINAL PAYLOAD BEING SENT:",
  JSON.stringify(returnValue, null, 2),
);
return returnValue;
```

2. **Check Network Tab:**
   - Open DevTools → Network
   - Create/Edit a task
   - Look for the POST/PUT request
   - Compare "Request Payload" with backend expectation

3. **Check Backend Logs:**
   - Your backend will log which field validation failed
   - Look for "422" or "validation error" in logs

---

## 📋 Quick Checklist

Before deployment:

- [ ] `assigned_to` field format matches backend expectation
- [ ] No extra `assigned_to_name`, `assigned_to_uuid` fields being sent
- [ ] `priority` is lowercase: "high", "medium", or "low"
- [ ] `status` is exactly one of: "To Do", "In Progress", "Completed"
- [ ] `user_uuid` is not null or empty string
- [ ] `task_title` is not null or empty string
- [ ] Date fields are in YYYY-MM-DD format

---

## 🚀 Next Steps

1. **Try Solution #1** - Simplify buildTaskPayload first
2. **Test with Create Task** - Should not get 422 anymore
3. **Check browser console** - Verify the payload format
4. **Check network tab** - Confirm the data being sent
5. **Share backend error message** - If 422 still occurs

---

## 💡 Pro Tips

- The backend error message in the 422 response often tells you exactly which field failed
- Look for: `err?.response?.data?.detail` in your error handler
- The AddTaskModal now logs `📤 SENDING PAYLOAD:` - compare this with what buildTaskPayload returns
