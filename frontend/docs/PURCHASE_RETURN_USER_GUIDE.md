# Purchase Return – User Guide

This guide explains how the **Purchase Return** process works in the system, step by step. No technical knowledge is required.

---

## What is Purchase Return?

Purchase Return is the process of sending goods back to suppliers (e.g. damaged, excess, or wrong items). The system tracks:

1. **What** is being returned (which items, from which outlets)
2. **Who** is involved (driver, buyers, suppliers, who received the receipt)
3. **How many boxes** per supplier
4. **When** items were actually returned to the distributor (pick-up)

---

## Where to find it

In the main menu, go to **Purchase Return**. You will see four sections:

| Menu item             | What it does                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Issue Entry**       | Create and edit purchase returns (what is being sent back).                                           |
| **Receipt Entry**     | Record that a purchase return has been received / handled.                                            |
| **Distributor Issue** | Record that items were returned to the distributor (pick-up details).                                 |
| **Stock Details**     | View all purchase return data grouped by buyer or supplier, and see what is returned vs not returned. |

---

## The flow (in order)

The process follows this order. Each step unlocks the next.

```
Issue Entry  →  Receipt Entry  →  Distributor Issue
     (1)              (2)                  (3)
```

---

### Step 1: Issue Entry

**Purpose:** Create a purchase return – i.e. define _what_ is being returned and _how many boxes_ per supplier.

**How to use:**

1. Go to **Purchase Return → Issue Entry**.
2. Click **Add** to create a new purchase return.
3. Fill in:
   - **Driver** – The person responsible for the return.
   - Optionally **attach an Excel file** (with columns like Buyer, Supplier, Outlet, PR No, Item, Qty, etc.) to load data in one go.
4. Add **Buyers**. Under each buyer, add **Suppliers**. For each supplier:
   - Enter **Number of boxes**.
   - Add **Items** (products) being returned (with outlet, PR no, qty, amount, etc.).
5. Save. You can **Edit** or **View** the same purchase return later from the Issue Entry list.

**Result:** The purchase return appears in the Issue Entry list with ID, Driver, total boxes, and boxes pending/returned. Until Receipt Entry is done, it will not appear in the Distributor Issue form.

#### Status and box counts on the Issue Entry list

On the **Issue Entry** list page, each purchase return row shows:

| Column                   | Meaning                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                   | Purchase return ID.                                                                                                            |
| **Driver**               | The driver assigned to this return.                                                                                            |
| **Total No of Boxes**    | Sum of all “number of boxes” entered for every supplier under every buyer in this PR.                                          |
| **No of Boxes Returned** | Number of boxes that have already been recorded as returned (via **Distributor Issue**). See “How status is calculated” below. |
| **No of Boxes Pending**  | Number of boxes that are not yet recorded as returned.                                                                         |
| **Status**               | Overall status of the purchase return (see below).                                                                             |
| **Action**               | View / Edit / Delete (depending on status).                                                                                    |

**Status values (and how they are calculated)**

The **Status** column shows one of four values. The system decides which one using:

1. Whether **Receipt Entry** has been done for this PR (i.e. “Handled by” is set).
2. How many boxes are **returned** vs **pending**:
   - **Boxes returned** = For each buyer–supplier pair in this PR, if that supplier has at least one “returned” record in **Distributor Issue**, the full “number of boxes” for that supplier is counted as returned.
   - **Boxes pending** = For each buyer–supplier pair, if that supplier has **no** “returned” record yet, the “number of boxes” for that supplier is counted as pending.

The four statuses are:

| Status                          | When it is shown                                                                | Meaning                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Pending** (gray)              | Receipt Entry is **not** done (no “Handled by”), and no boxes are returned yet. | The PR is created but not yet received; nothing has been returned to the distributor.                       |
| **Receipt Entry Done** (blue)   | Receipt Entry **is** done (“Handled by” is set), but no boxes are returned yet. | The return has been received and can be used in Distributor Issue; no pick-up/return has been recorded yet. |
| **Return In Progress** (purple) | At least one box is returned, but some boxes are still pending.                 | Some (but not all) boxes have been recorded as returned via Distributor Issue.                              |
| **Done** (green)                | No boxes are pending (all boxes are returned).                                  | Every supplier in this PR has been recorded as returned in Distributor Issue.                               |

**Summary:** Status moves from **Pending** → **Receipt Entry Done** (after Receipt Entry) → **Return In Progress** (after at least one Distributor Issue) → **Done** (when all boxes are returned).

---

### Step 2: Receipt Entry

**Purpose:** Record that a purchase return has been **received / handled** – i.e. someone has acknowledged receipt of the return.

**Important:**

- Only purchase returns that have **Receipt Entry** completed will show up later in **Distributor Issue** when you create a new return record.
- If a purchase return does not have “Handled by” set, it will **not** be listed in the Distributor Issue form.

**How to use:**

1. Go to **Purchase Return → Receipt Entry**.
2. Click **Add** to create a new receipt entry.
3. Select:
   - **Purchase Return** – The PR you want to mark as received (only PRs that do not yet have receipt entry appear in create mode).
   - **Handled By** – The employee who received / handled the return.
4. In the **Suppliers** table, you must **select all** suppliers (use the checkboxes). The table shows Supplier, No of boxes, Buyer, and Status.
5. Click **Submit**.

**Result:** That purchase return is now “handled”. It will appear in the Receipt Entry list (View/Edit) and, from now on, its lines can be used when you create a **Distributor Issue** record.

---

### Step 3: Distributor Issue

**Purpose:** Record that items have actually been **returned to the distributor** – i.e. pick-up has happened. You capture who came to pick up and which purchase return lines are part of this return.

**Important:**

- Only purchase returns that have **Receipt Entry** completed (Handled by set) are used here. If a PR has no receipt entry, it will **not** appear in the supplier list or in the grid.

**How to use:**

1. Go to **Purchase Return → Distributor Issue**.
2. Click **Add** to create a new record.
3. Select **Supplier** (only suppliers from purchase returns that have receipt entry done will appear).
4. The table below shows purchase return lines for that supplier that are **not yet returned**. Select the rows (checkboxes) that are being returned in this pick-up.
5. Enter **Pick up name** and **Pick up Phone Number** (who collected the goods).
6. Click **Create** (or **Update** when editing).

**Result:** A “returned” record is created. Those selected lines are now marked as returned. You can see the list of all such records on the Distributor Issue page (View / Edit / Delete).

---

### Step 4: Stock Details (view only)

**Purpose:** See all purchase return data in one place – by buyer or by supplier – and whether each part is **Returned** or **Not Returned**.

**How to use:**

1. Go to **Purchase Return → Stock Details**.
2. Use **Show Returned** to include or hide items that are already returned.
3. Switch between **Grouped By Buyer** and **Grouped By Supplier**.
4. Expand a buyer or supplier to see products, quantities, outlets, and **Status** (Returned / Not Returned).

No data is created or changed here; it is for reporting and checking status only.

---

## Quick reference

| Step | Screen                | You do this                                                                                                                                                  |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | **Issue Entry**       | Create/edit PR: driver, buyers, suppliers, no. of boxes, items. List shows Status (Pending / Receipt Entry Done / Return In Progress / Done) and box counts. |
| 2    | **Receipt Entry**     | Select PR + Handled by, select all suppliers, Submit.                                                                                                        |
| 3    | **Distributor Issue** | Select supplier, select which lines, enter pick-up name & number, Create.                                                                                    |
| 4    | **Stock Details**     | View data by buyer/supplier and returned vs not returned.                                                                                                    |

---

## Important notes

- **Receipt Entry is required** before a purchase return can be used in Distributor Issue. If **Handled by** is not set on a PR, it will **not** be listed in the Distributor Issue form.
- In **Receipt Entry**, you must select **all** suppliers for that purchase return before submitting.
- In **Distributor Issue**, you choose which purchase return lines (for the selected supplier) are part of this specific return/pick-up.
- The system uses **Returned** (and “Not Returned”) to show whether items have been recorded as returned to the distributor in Distributor Issue.

If you need help with a specific screen or permission, contact your system administrator.
