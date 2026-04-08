## SETUP: Answer These Before Using This Skill

This skill requires personal and platform information to operate. Before triggering this skill, provide answers to the following setup questions:

1. **Your full name** (used in transaction entry and email communications) → [YOUR_NAME]
2. **Your team name** → [YOUR_TEAM_NAME]
3. **Your brokerage** → [YOUR_BROKERAGE]
4. **Your business email address** → [YOUR_EMAIL]
5. **Your phone number** → [YOUR_PHONE]
6. **Your transaction platform login email** (for SkySlope/Business Tracker) → [YOUR_PLATFORM_EMAIL]
7. **Your transaction platform password** → [YOUR_PLATFORM_PASSWORD]
8. **Your transaction platform URL** (e.g., agent.skyslope.com) → [YOUR_TRANSACTION_PLATFORM_URL]
9. **Your forms/documents platform URL** (e.g., forms.skyslope.com) → [YOUR_FORMS_PLATFORM_URL]
10. **Your transaction platform name** (e.g., SkySlope Business Tracker) → [YOUR_TRANSACTION_PLATFORM]
11. **Your forms platform name** (e.g., SkySlope Forms) → [YOUR_FORMS_PLATFORM]
12. **Your Google Calendar ID** for administrative events → [YOUR_CALENDAR_ID]
13. **Path to your local Transactions folder** → [YOUR_TRANSACTIONS_PATH]
14. **Path to your Skill Logs folder** → [YOUR_SKILL_LOGS_PATH]
15. **Full path to your TRANSACTION_LOG file** → [YOUR_TRANSACTION_LOG_PATH]

---


---

name: new-transaction-process
description: >
  Complete end-to-end new transaction onboarding workflow for [YOUR_NAME] / [YOUR_TEAM_NAME] at [YOUR_BROKERAGE].
  Triggers when the user uploads real estate transaction documents (purchase contract, compensation agreement,
  prequalification letter, addenda, disclosures, etc.) and asks to process or enter a new transaction.
  Handles the full pipeline - learning-log consultation, document parsing and renaming, Google Drive organization,
  [YOUR_TRANSACTION_PLATFORM] transaction entry, transaction summary email draft in Gmail, and key date entry in Google Calendar.
  Always trigger this skill when uploads transaction docs, mentions a new contract, says "process this transaction",
  "new transaction", "enter this in [YOUR_TRANSACTION_PLATFORM]", or provides a purchase contract alongside any other transaction documents.
---


## SUPERVISOR: Chief of Staff

This skill reports to the Chief of Staff skill, which is the master coordinator.

**What this means:**
- Chief of Staff routes requests to this skill and passes relevant cross-channel context
  (iMessage, email, calendar data) before execution begins. Use that context.
- On completion, report results back clearly so Chief of Staff can close the loop with the user.
- If this skill writes to a log (TRANSACTION_LOG, COACHING_LOG, etc.), each skill reads its own log at start
  and reads it in future sessions for cross-skill awareness.
- A profile document contains the user's full personality and decision-making profile (see setup section for path).
  Read it if you need personality context for tone, communication style, or judgment calls.
- When in doubt about anything outside this skill's scope, defer to Chief of Staff.

---


# New Transaction Process Skill

## Purpose
This skill automates the complete intake and onboarding workflow for a new real estate transaction for [YOUR_NAME] / [YOUR_TEAM_NAME] at [YOUR_BROKERAGE]. It is designed to be accurate above all else — when in doubt, ask.

---


## Handling Partial Runs

The user will sometimes ask you to execute only specific steps of this skill (e.g., "just do the file renaming" or "add the calendar events"). When this happens:

- Execute the requested steps
- Also execute any **supporting steps those steps depend on** — for example, if asked to add calendar dates, you still need to read the contract to get the dates (Step 2) even if you're not doing the full transaction platform entry
- Always do Step 0 (read the Transaction Log) regardless of which steps are requested — it takes seconds and the corrections there apply to everything
- Always do the "After Completion" log update at the end, even on partial runs — the log should reflect every run

The goal is to be smart about dependencies, not mechanical about skipping. If a supporting step is clearly necessary for the requested step to work correctly, do it.

---


## PERMISSIONS & LOG — Read Before Starting

### Step A: Mount and Read the Transaction Log

Use `request_cowork_directory` to mount the folder containing this skill's transaction log file:
```
[YOUR_TRANSACTIONS_PATH]
```

Once mounted, the VM path is returned (e.g. `/sessions/[session-id]/mnt/Transactions`).
**Never hardcode a session path.** Always use the returned path.

Read the TRANSACTION_LOG in full using the `Read` tool:
```
[YOUR_TRANSACTION_LOG_PATH]
```

This is your institutional memory — corrections, preferences, edge cases, and known mistakes from all prior runs. Apply every relevant note to this transaction. If something unusual comes up mid-run, check back. This is the only log. Do not create or reference any other log file.

### Step B: Request Browser Status and Drive Access Upfront

**THIS STEP CANNOT BE SKIPPED.**

Standing corrections in the TRANSACTION_LOG about "pre-authorized permissions" apply to ACTIONS
(navigation, drafting, transaction platform access, log writes). They do NOT override this step. This step
checks CAPABILITY — what tools are actually available for this session. Always run it.

Send ONE message asking the user for both of these upfront. Do not start any work until they respond.

1. **Browser extension:** Is the Claude in Chrome (or appropriate browser) extension running in your browser right now?
   This unlocks transaction platform access and all browser-based steps in this skill. Without it,
   those steps are skipped and flagged as unverified in the output.

2. **Google Drive folder access:** Confirm I have access to the folders needed. The Transactions
   folder is already mounted. Are there any additional Drive locations needed for this run?
   (Check the TRANSACTION_LOG — if specific paths are referenced that are not in the Transactions
   root, name them explicitly so the user can confirm or redirect.)

Wait for the user's response before proceeding.

- Browser confirmed running → proceed with all browser-based steps as normal
- Browser not running → skip browser-dependent steps; flag as unverified in output
- Additional folders needed → mount with request_cowork_directory before proceeding

Goal: zero interruptions once the run begins.

### Step C: Update the Log After Every Run

Append to TRANSACTION_LOG.txt using `cat >>` (never overwrite). The log is the only log.

---


## Step 0: Consult the TRANSACTION_LOG FIRST — and Throughout

Already done in the PERMISSIONS & LOG section above. Apply everything relevant.
TRANSACTION_LOG contains deal data and run notes. Standing corrections and skill behavior fixes are in the Skill Logs folder.
If something unusual comes up mid-run that's not covered, check back before proceeding.

---


## Step 0b: Locate the Google Drive Transaction Folder

This step happens **after parsing the property address in Step 2**, since the folder name is the full property address.

1. Navigate to **[YOUR_DRIVE_ROOT] → Transactions** in Google Drive in the browser
2. Locate the subfolder for this property address (it may already exist, or you may need to create it in Step 4)
3. Once the folder exists, ask the user to select it as the working folder:

   > "I found the transaction folder in Google Drive for [address]. Since you have Drive Desktop, please select that folder on your computer using the folder picker — I'll save the renamed docs directly into it and Drive will sync them automatically."

4. Use `request_cowork_directory` to open the folder picker. The user navigates to their local Google Drive → [YOUR_DRIVE_ROOT] → Transactions → [address folder] and selects it.

Once selected, all renamed files in Step 3 go directly into that folder. Drive Desktop handles the sync — no upload/download needed.

**If the user can't locate it or skips:** Fall back to saving to the VM outputs folder and provide `computer://` links for manual upload.

---


---


## CRITICAL VERIFICATION: Am I In The Right Transaction?

Before touching anything — before renaming a file, before opening the transaction platform, before drafting an email — stop and confirm you are working on the correct transaction.

Verify:
- The property address in the uploaded documents matches what the user described
- The buyer/seller names are consistent across all uploaded files
- If the transaction platform is already open, confirm the transaction shown matches this address before making any changes

This check is non-negotiable. Working in the wrong file is the most consequential mistake possible. Confirm before proceeding.

---


## Step 1: Accept and Catalog Uploaded Documents

When the user uploads documents, identify each one by type:

| Document Type | Notes |
|---|---|
| Purchase / Sale Contract (AS IS, Standard FAR/BAR, etc.) | Primary data source |
| Compensation Agreement / Buyer Broker Agreement | Commission data source |
| Referral Fee Disclosure | Referral agent info |
| Prequalification / Approval Letter | Lender info only — no SkySlope checklist slot |
| Addendum (Inspection, Financing, HOA, etc.) | Upload to SkySlope checklist |
| Seller's Disclosure | Upload to SkySlope checklist |
| HOA Disclosure / Docs | Upload to SkySlope checklist |
| Lead-Based Paint Disclosure | Upload to SkySlope checklist |
| Any other signed documents | Upload to SkySlope checklist |

After cataloging, ask:

> "Is there anything special I should know about this transaction?"

Wait for the user's answer. Note any special circumstances — cash deal, investor buyer, short timeline, unusual contingencies — and factor them into all subsequent steps.

---


## Step 2: Parse Transaction Data

Extract the following from all uploaded documents. The purchase contract is the primary source.

### Visual PDF Reading — Required for Contract Blanks

Text extraction tools (pdfminer, etc.) are unreliable for FAR/BAR contract filled fields. Checkbox selections render as standalone numbers in extracted text and are indistinguishable from filled-in values — a "4" in the extracted text of Section 8 might be a checkbox indicator, not a filled loan approval period.

**Always use the Read tool to visually inspect the actual PDF pages** when confirming what is written in any blank field. The Read tool renders PDFs as images — this is the authoritative source. Text extraction is useful for finding sections quickly, but the visual page read is the source of truth.

Fields that must be visually confirmed before recording:
- Inspection period days (Section 12)
- Loan Approval Period days (Section 8(b))
- Any other filled-in contract blanks

### From the Purchase Contract:
- **Property address** (full: street, city, state, zip)
- **Sales price**
- **Closing date**
- **Effective/acceptance date**
- **Inspection period end date** — visually confirm days in Section 12. Calculate from the **Effective Date (date of last signature)** — NOT the Acceptance Date. These are different dates and using the wrong one is a known error. If the field is blank, the FAR/BAR AS IS default is **15 days**. Do not assume any other number. Note: The user may instruct a different inspection start date (e.g., after a repair completes) — the inspection clock starts from the agreed date, not necessarily the effective date.
- **Financing contingency end date** (if financed; skip if cash) — visually confirm Section 8(b). Calculate from the **Effective Date (date of last signature)** — NOT the Acceptance Date. If blank, FAR/BAR AS IS default is **30 days** from effective date.
- **Any other contingency deadlines** (HOA approval, appraisal, etc.)
- **Buyer name(s)**
- **Seller name(s)**
- **Buyer's agent:** name, brokerage, email, phone (if listed)
- **Listing agent:** name, brokerage, email, phone (if listed)
- **Referral agent:** if a Referral Fee Disclosure was uploaded, extract name, brokerage, email, and referral fee %

### From the Compensation Agreement:
- **Commission percentage or flat fee**
- **Co-broke/co-op split** (if applicable)
- **Any deductions** (e.g., flat fee payable to co-op brokerage)

### From the Prequalification Letter (lender info only):
- **Loan officer name, company, email, phone**

### Transaction Type:
- User is the **Buyer's Agent** → transaction type = **Purchase**
- User is the **Listing Agent** → transaction type = **Listing**

User's info is always:
- Name: [YOUR_NAME] | Brokerage: [YOUR_BROKERAGE]
- Email: [YOUR_EMAIL] | Phone: [YOUR_PHONE]

---


## Step 3: Rename Documents

Rename each uploaded document:
```
[FormType] - [StreetAddress].[ext]
```
Use street address only (no city/state/zip).

**Examples:**
- `AS IS Contract - 1234 Main St.pdf`
- `Compensation Agreement - 1234 Main St.pdf`
- `Referral Fee Disclosure - 1234 Main St.pdf`
- `Prequalification Letter - 1234 Main St.pdf`
- `HOA Community Disclosure - 1234 Main St.pdf`

Save renamed files directly to the folder the user selected in Step 0b. If no folder was selected, fall back to VM outputs folder.

---


## Step 4: Organize in Google Drive

1. Navigate to **[YOUR_DRIVE_ROOT] → Transactions** in Google Drive
2. Create a new subfolder: `[Full Property Address]` (e.g., `1234 Main St, Tampa FL 33611`)
3. Note the folder link — this is also when you trigger Step 0b (ask the user to select the folder locally)
4. Renamed files will land there automatically once the user selects it in the folder picker

### Start the TRANSACTION_LOG Entry

Append a new entry to TRANSACTION_LOG.txt using `cat >>`. The file is at [YOUR_TRANSACTION_LOG_PATH]. Never use a hardcoded session path.

```
--- RUN: [Full Property Address] | Date: [YYYY-MM-DD] ---

[Buyer(s)] | [Seller(s)] | Price: $[amount] | [Cash/Financed] | Close: [MM/DD/YYYY]

Documents received (Transaction Files): [list each renamed transaction file]
Documents received (Listing Files): [list each renamed listing file, if applicable]
Special notes from user: [anything user shared in Step 1, or "None"]

Key dates: Effective [MM/DD/YYYY] | Inspection ends [MM/DD/YYYY] ([N] days[, note if start date differs from effective date and why]) | Finance contingency ends [MM/DD/YYYY] ([N] days[, note if filled or default]) | Closing [MM/DD/YYYY]
Referral: [Name] | [Brokerage] | [%] (omit this line entirely if no referral)
```

---


## Step 5: Enter Transaction in [YOUR_TRANSACTION_PLATFORM]

### CRITICAL: Two Separate Systems

[YOUR_TRANSACTION_PLATFORM] has two platforms — do not mix them up:

- **[YOUR_FORMS_PLATFORM]** (`[YOUR_FORMS_PLATFORM_URL]`) — document signing/storage. **Not** where you enter the transaction.
- **[YOUR_TRANSACTION_PLATFORM]** (`[YOUR_TRANSACTION_PLATFORM_URL]`) — transaction record. **This is where you work.**

If you ever find yourself on `[YOUR_FORMS_PLATFORM_URL]` during transaction entry, you are in the wrong system.

### Pre-Entry: Pull All Contact Info from Forms FIRST

Before opening the transaction platform, go to `[YOUR_FORMS_PLATFORM_URL]`, find the file for this transaction, and open the **File Details** tab. This shows all contacts with names, roles, and emails.

For every contact, click **Edit** on their row to reveal their phone number — it only appears in the edit modal.

Also check the **Signed Documents** tab for a **Referral Fee Disclosure**. If one exists, note the referral agent details.

Record before proceeding:
- Full legal name (first + last) for every contact — the MLS auto-fill sometimes abbreviates names
- Email and phone for every contact

### Login to Transaction Platform
- URL: `[YOUR_TRANSACTION_PLATFORM_URL]`
- Email: `[YOUR_PLATFORM_EMAIL]`
- Password: `[YOUR_PLATFORM_PASSWORD]`

### Create the Transaction
Use **Create New → Transaction** from the dashboard. Searching for the transaction takes you to the forms system — use Create New instead. The MLS lookup during creation auto-populates property data; verify it against the contract before proceeding.

When prompted for representation type, select based on transaction type:
- Purchase (user is buyer's agent): select **Purchase**
- Listing (user is listing agent): select **Listing**

### Work Through Each Tab

#### Transaction Tab
- Property address, sales price, closing date, effective date
- Checklist: select **Purchase and Sale** for purchases; appropriate checklist for listings
- Lead source: if unknown, always select **Prospecting**

#### Contacts Tab
Work through each sub-section in order:

**Buyers and Sellers:** Add all buyers and sellers using contact info from Forms File Details.
- If a buyer has no phone on file, use a co-buyer's phone as a placeholder

**Agents:**
- Listing Agent: full name (verify against Forms — MLS sometimes shortens it), brokerage, email, phone
- Buyer's Agent: User's info auto-populates; verify it's correct

**Escrow / Title / Attorney:**
- Florida uses title companies. Select **Title**.
- Enter company name, officer full name, email, phone
- "Get escrow or title started now?" → **No**

**Loan Officer:**
- Cash deal → **No**
- Financed → enter loan officer details from the prequalification letter

**Transaction Coordinator:** → **No** unless the user specifies otherwise

**Referral Agent:**
- If a Referral Fee Disclosure exists in Forms Signed Documents → **Yes**, enter referral agent details
- If no disclosure → **No**

#### Commission Tab
- Commission percentage or flat fee from the compensation agreement
- Any deductions (e.g., flat-fee co-op brokerage amount)
- Stop and ask the user if anything is unclear
- In the **Additional Commission Breakdown Information** field, always enter the following standard direct deposit note verbatim:
  > All funds should go to [YOUR_BROKERAGE] and agent should be paid by direct deposit only by [YOUR_BROKERAGE] please, no direct payments to agent from title company.
- Click **Save Comment** after entering the note

#### Additional Information Tab
Complete any remaining required fields.

---


## Step 6: Generate Transaction Summary Email

### Subject Line:
```
NEW TRANSACTION ACTION REQUIRED for [Full Property Address]
```

### Email Body:
```
Dear All,

Please find below the transaction details for the property at [Full Address]. The contract is attached for your reference.

Closing Date: [MM/DD/YYYY]

Listing Agent: [Name] | [Brokerage]
Email: [email]
Phone: [phone]

Buyer's Agent: [Name] | [Brokerage]
Email: [email]
Phone: [phone]

Seller Information:
[Name] | Email: [email] | Phone: [phone]

Buyer Information:
[Name]

Title Information:
[Officer Name] | [Company]
Email: [email]
Phone: [phone]

Lender Information:
[Loan Officer Name] | [Company]
Email: [email]
Phone: [phone]

Misc Contact:
[Name] | [Role]
Email: [email]
Phone: [phone]
```

**Formatting rules:**
1. No bullet points anywhere in the body
2. Agents, Title, Lender, Misc Contact: Name | Company on same line; Email and Phone each on their own line below
3. Sellers and buyers with contact info: `Name | Email: x@x.com | Phone: 000-000-0000` on one line
4. Buyers with no contact info: just their name
5. Closing date has blank lines before and after
6. One blank line between each major section
7. Omit Lender section entirely if cash deal
8. Omit Misc Contact section if none

### Recipients:
- Other agent's email
- Title company email
- Lender email (skip if cash)
- Referral agent email (if applicable)

**Never include** [YOUR_EMAIL].

---


## Step 7: Create Gmail Draft

Create the draft in [YOUR_EMAIL] Gmail using the subject, body, and recipients from Step 6. Attach the purchase contract PDF.

---


## Step 8: Add Key Dates to Google Calendar

Add all-day events to the user's **Administration** calendar:
- **Calendar ID:** `[YOUR_CALENDAR_ID]`
- Use `sendUpdates: "none"` and all-day `date` format (not `dateTime`)

**Event naming:** `[EVENT TYPE] - [Street Address] ([Buyer Last Name])`

Use full words in event names — no abbreviations. Clients see these and need to understand them at a glance.

Events to add:
1. `INSPECTION PERIOD ENDS - [Address] ([Last Name])` — calculated from Effective Date + days in Section 12
2. `FINANCE CONTINGENCY ENDS - [Address] ([Last Name])` — financed deals only, calculated from Effective Date
3. `CLOSING - [Address] ([Last Name])` — closing date
4. Any other contingency deadlines from the contract

**New Construction transactions:** Add closing date only. There are no contingency dates to track on new construction. Skip inspection and finance contingency events entirely.

**Event description:** Include buyer/seller names, address, price, deal type, and title contact info. If the inspection start date differs from the effective date, note the reason.

**Automated disclaimer:** Add this note to the description of every calendar event created:
> "This calendar entry was automated and is subject to change. Please confirm dates with your agent."

If a deadline cannot be determined, ask the user rather than skipping or guessing.

---


## Error Handling: When to Always Ask the User

Stop and ask when:
- A commission field or split is unclear
- A contingency deadline cannot be calculated from the documents
- The transaction platform returns multiple possible matches
- A document type doesn't map clearly to a checklist slot
- Any detail is missing, conflicting, or ambiguous
- A recovery attempt fails — do not try multiple fixes without checking in first

---


## Writing to the TRANSACTION_LOG

Use `cat >>` to append to TRANSACTION_LOG.txt at [YOUR_TRANSACTION_LOG_PATH].
Never use a hardcoded session path. Never overwrite the file — append only.

This applies to both the run-start entry (Step 4) and the completion entry below.

---


## After Completion: Update the TRANSACTION_LOG

Append a completion note to the entry started in Step 4 using `cat >>`.

```
STANDING INSTRUCTIONS CONFIRMED THIS RUN: [any new instructions user gave this run, or "Same as above."]
PENDING (needs user): [anything left for user to complete manually, or "None."]
--- END RUN ---
```

---


## SKILL LOG -- Corrections and Continuous Improvement

This skill uses skill logs to track corrections and continuous improvements across runs.

**Skill-specific log:** [YOUR_SKILL_LOGS_PATH]/new-transaction-process-log.txt
**Universal corrections:** [YOUR_SKILL_LOGS_PATH]/UNIVERSAL_LOG.txt

### Reading (Start of Run)
Mount the Skill Logs folder:
```
request_cowork_directory(path=[YOUR_SKILL_LOGS_PATH])
```
Read BOTH files:
1. `[mounted path]/new-transaction-process-log.txt` -- corrections specific to this skill
2. `[mounted path]/UNIVERSAL_LOG.txt` -- corrections that apply to all skills

Apply everything. These are fixes from prior runs that must not be repeated.

Also check for any `[PROMOTE]` entries in the skill log. These are corrections from prior
sessions that should have been embedded in this skill but weren't (usually due to low context).
If you find any, embed them into the relevant step of this skill before proceeding with the run.

### Writing (End of Run)
For each correction or lesson from this run, classify it:

**Tag as `[PROMOTE]`** if the correction is a behavioral rule, default value, missing workflow
step, field mapping, or anything that would cause the same mistake in a fresh session with no
log context. Format:
```
[YYYY-MM-DD] PROMOTE | Step X: embed "always do Y before Z"
```
The Chief of Staff will pick these up at session close and edit the skill directly. If Chief of Staff is not active
(standalone run), flag them anyway for the next session.

**Tag normally** if the correction is temporary context (deal-specific, one-time workaround,
observation). Format:
```
[YYYY-MM-DD] CATEGORY | Entry
```
Categories: CORRECTION, PREFERENCE, INSIGHT, WORKFLOW, DECISION, CONTEXT, ERROR

Only write to UNIVERSAL_LOG.txt if the correction applies to ALL skills (rare).
All logs are append-only. Never overwrite.