# Finance System

How PFS thinks about money. This is a domain reference — it explains the personal finance methodology, not the implementation.

For entity definitions see `specs/DATA_MODEL.md`. For UI behavior see `specs/CLIENT_ARCHITECTURE.md`.

---

## Budgeting Method

PFS uses **static envelope budgeting** — a simplified form of envelope/zero-based budgeting.

The idea: every spending category gets a fixed monthly allowance (its "envelope"). When you spend, the money comes out of that envelope. At a glance you see how much is left in each envelope for the rest of the month.

What makes it *static*: the envelope sizes (called `assigned` in PFS) are set once and apply to every month equally. There is no per-month assignment, no carrying forward of unspent amounts, and no requirement to assign every dollar of income. This is a deliberate simplification — it fits users who want a consistent spending plan without the overhead of re-budgeting every paycheck.

**What PFS is not:** PFS is not a full zero-based budgeting system like YNAB. In YNAB, every dollar of income must be assigned to a category before the month ends, unspent amounts roll forward, and overspending in one category borrows from another. PFS does none of this. The budget is a fixed template that spending is compared against — a guardrail, not an allocation engine.

---

## The Monthly Budget Cycle

Each month works the same way:

1. **Income arrives** — paychecks, freelance payments, refunds. These are recorded as `income` transactions in the relevant account.
2. **Spending happens** — purchases, bills, subscriptions. These are recorded as `expense` transactions.
3. **The budget screen compares** — for each category, PFS shows how much was assigned (the static target), how much was spent this month, and how much remains available.

At month's end, nothing carries over. The next month starts fresh with the same assigned targets. This means a category that was underspent last month does not have extra budget this month, and a category that was overspent does not start in the red.

---

## Budget Math

For each category in a given month:

```
assigned  = the category's static monthly target (set once, applies every month)
spent     = sum of expense transaction amounts in this category this month (negative number)
available = assigned + spent
```

| Category | Assigned | Spent | Available | Status |
|----------|----------|-------|-----------|--------|
| Groceries | $500 | -$320 | $180 | Under budget |
| Dining Out | $200 | -$200 | $0 | On budget |
| Clothing | $100 | -$150 | -$50 | Over budget |

An **overspent** category (negative available) means spending exceeded the plan. PFS highlights this but does not enforce it — the budget is advisory.

**The Income group is excluded from budget math.** Income categories do not have meaningful `assigned`/`spent`/`available` values. Income feeds into "Available to Budget" directly (see below), not through the per-category budget calculation.

---

## Available to Budget

The budget screen shows an "Available to Budget" figure at the top. This is the user's total liquid cash minus the total amount committed to budget envelopes — how much money is not spoken for by any category.

```
available_to_budget = liquid_balance - total_assigned
```

Where:
- `liquid_balance` = sum of derived balances across all non-hidden **liquid** accounts (`cash`, `checking`, `savings`)
- `total_assigned` = sum of `assigned` values for all non-hidden, non-Income categories

**Excluded from liquid balance:** `loan`, `asset`, and `crypto` accounts. Loans are long-term debt, not spendable cash. Assets and crypto are illiquid — you can't pay rent with a property or a Bitcoin wallet.

This figure answers: "Of all the money I can actually spend, how much isn't earmarked for a budget category?"

- **Positive** — liquid cash exceeds the budget plan. The surplus is unallocated.
- **Zero** — every dollar of liquid cash has a category.
- **Negative** — the budget plan promises more than available liquid cash. Envelopes are underfunded.

This is a **total position**, not a monthly flow. It reflects cumulative savings, not just this month's income. A user with $10,000 in checking and a $3,000 monthly budget has $7,000 available — that's their buffer beyond the plan.

---

## Income Handling

Income enters the system as a transaction with `type: "income"` and a positive amount. Income transactions are categorized under the "Income" category.

Income is **not automatically distributed** to envelopes. It flows into the liquid account balances, which feed the "Available to Budget" figure. There is no per-envelope allocation step — the budget plan is a fixed template, and income simply increases the pool of liquid cash.

This is a key difference from YNAB-style systems where income must be explicitly allocated to categories. In PFS, income and budget assignments are independent — the budget plan exists whether or not the income to fund it has arrived.

---

## Category Groups

Categories are organized into groups that reflect their financial nature:

| Group | Purpose | Examples |
|-------|---------|----------|
| **Income** | Inflow categories | Salary, freelance, refunds |
| **Fixed** | Recurring obligations that rarely change month to month | Housing, bills & utilities, subscriptions |
| **Daily Living** | Regular spending that varies but occurs every month | Groceries, dining out, transportation |
| **Personal** | Discretionary spending on lifestyle and growth | Clothing, hobbies, health & beauty |
| **Irregular** | Infrequent or seasonal expenses | Travel, big purchases, taxes & fees |

Groups serve two purposes:
1. **Visual organization** — the budget screen groups categories so users can see fixed vs. discretionary spending at a glance.
2. **Financial reasoning** — Fixed expenses are commitments (rent, utilities). If you need to cut spending, you look at Personal and Daily Living first. Irregular expenses are the hardest to budget for because they're unpredictable — having them in their own group keeps them visible.

Users can create, rename, and reorder groups. The defaults above are seeded on first run.

---

## Transfers

A transfer moves money between two accounts. It is **not spending** — it does not affect any budget category, and it does not appear in budget calculations.

Mechanically, a transfer creates two linked transactions:
- An **outflow leg** (negative amount) in the source account
- An **inflow leg** (positive amount) in the destination account

Both legs share a `transferPairId` that links them. Deleting either leg deletes both.

Common transfers:
- Checking to Savings (setting aside money)
- Checking to Credit Card (paying off a balance)
- Savings to Checking (accessing reserves)

**Credit card payments** deserve special attention: when you pay your credit card bill (checking to credit card transfer), no budget category is affected because the *spending* was already recorded when the original purchase was made as an expense on the credit card account. The transfer just settles the debt — it moves money from checking to reduce the credit card's negative balance.

---

## Account Types

Each account has a type that determines how it appears in the sidebar and how its balance contributes to net worth.

| Type | Typical examples | Normal balance | Net worth |
|------|-----------------|----------------|-----------|
| `cash` | Wallet, petty cash | Positive | Asset |
| `checking` | Everyday bank account | Positive | Asset |
| `savings` | Savings account, emergency fund | Positive | Asset |
| `credit_card` | Visa, Mastercard | Negative | Liability |
| `loan` | Mortgage, car loan, student loan | Negative | Liability |
| `asset` | Property, vehicle (non-liquid) | Positive | Asset |
| `crypto` | Bitcoin, Ethereum wallet | Positive | Asset |

**Normal balance** is the expected sign direction. A checking account normally has a positive balance (you have money). A credit card normally has a negative balance (you owe money). PFS does not enforce this — an overdrawn checking account will show negative, and a credit card with a refund credit will show positive.

**Sidebar grouping:** The sidebar groups accounts by type for display. `asset` and `crypto` appear under an "Investment" group, `loan` under "Loans". Hidden accounts are collected under a "Closed" group. Each group shows a subtotal.

---

## Net Worth

```
net_worth = sum of derived balances across all non-hidden accounts
```

Asset-type accounts (cash, checking, savings, asset, crypto) contribute positively. Liability-type accounts (credit_card, loan) contribute negatively because their balances are typically negative (representing debt).

Hidden accounts are excluded.

---

## Reconciliation

Reconciliation is a **periodic checkup** — the user looks at their real bank balances and verifies PFS agrees. It is not an always-on state or a workflow that drives other behavior.

### The process

1. **User checks their bank.** They open their banking app and see their actual balances.
2. **User enters reported balance.** For each account they want to verify, they enter the bank's number into the `reportedBalance` field.
3. **PFS shows the discrepancy.** The difference between derived balance (sum of transactions) and reported balance tells the user how much is unaccounted for.
4. **User resolves the gap.** Either by importing missing transactions, or by creating a balancing transaction (see below).

### Auto-reset

When the derived balance matches the reported balance — whether because the user imported the missing transactions or because a balancing transaction closed the gap — `reportedBalance` automatically resets (clears to `null`) and `reconciledAt` updates to the current timestamp.

This prevents stale reported balances from lingering. The reported balance is a temporary checkpoint, not a permanent field. If it's set, it means "I'm in the middle of a checkup." If it's clear, the account was last reconciled at `reconciledAt`.

### Balancing transaction

When the discrepancy is small or the user doesn't want to track down the exact missing transactions, they can create a **balancing transaction** — a one-tap action that generates an uncategorized transaction for the difference amount. This closes the gap immediately.

This is especially useful for minor amounts (rounding differences, small fees, cash spending that wasn't tracked). The transaction is uncategorized so it's visible as "unresolved" but doesn't pollute any budget category.

### What reconciliation is not

- `reportedBalance` does not appear on the main account sidebar or drive any filtering/sorting behavior. It only matters during a checkup.
- There is no "reconciled" vs "unreconciled" transaction state. PFS does not lock transactions before a reconciliation date.
- `reconciledAt` is informational — it tells the user when they last verified this account, nothing more.

---

## Hidden Accounts

Accounts can be hidden when their derived balance is zero. Hidden accounts:
- Do not appear in the main account sidebar
- Are excluded from net worth calculation
- Retain all their transaction history (transactions are not deleted)
- Can be un-hidden at any time

This is designed for accounts that are closed or inactive. The zero-balance requirement prevents accidentally hiding an account with outstanding balance.

There is no `closed` account type — "closed" is represented by hiding an account after its balance reaches zero. A closed credit card, a closed bank account, or an old wallet all end up as hidden accounts. The UI may present hidden accounts under a "Closed" label for clarity, but the underlying mechanism is the `hidden` flag, not a separate type.
