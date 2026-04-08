## SETUP: Answer These Before Using This Skill

Before running this skill, answer these setup questions. Map each answer to the placeholder shown.

1. **What is your transaction management platform URL?** → `[YOUR_TRANSACTION_PLATFORM_URL]`
2. **What are your transaction management platform login credentials?** (Email and password) → `[YOUR_PLATFORM_EMAIL]` and `[YOUR_PLATFORM_PASSWORD]`
3. **What is your full name?** → `[YOUR_NAME]`
4. **What is your team name?** → `[YOUR_TEAM_NAME]`
5. **What is your brokerage name?** → `[YOUR_BROKERAGE]`
6. **What is your phone number?** → `[YOUR_PHONE]`
7. **What is your Admin Calendar ID (Google Calendar)?** → `[YOUR_CALENDAR_ID]`
8. **What is your standard lockbox code?** → `[YOUR_LOCKBOX_CODE]`
9. **What is your MLS/Matrix platform URL?** → `[YOUR_MLS_URL]`
10. **What is your public records lookup URL?** → `[YOUR_PUBLIC_RECORDS_URL]`
11. **What is the path to your skill logs folder?** → `[YOUR_SKILL_LOGS_PATH]`
12. **What is the path to your transactions folder?** → `[YOUR_TRANSACTIONS_PATH]`
13. **Which title companies do you use for listings?** → `[YOUR_PREFERRED_TITLE_COMPANY_A]` and `[YOUR_PREFERRED_TITLE_COMPANY_B]`
14. **What are your offer instruction form files?** (e.g., for each title company) → `[YOUR_OFFER_INSTRUCTIONS_FORM_A]` and `[YOUR_OFFER_INSTRUCTIONS_FORM_B]`
15. **What is your MLS team ID?** → `[YOUR_MLS_TEAM_ID]`
16. **What is your professional email address?** → `[YOUR_EMAIL]`

---


---

name: new-listing-tool
description: >
  End-to-end new listing intake for real estate agents. Full pipeline from signed listing agreement through live MLS entry: document renaming, Drive organization, transaction platform listing creation, public records lookup, MLS content generation, and MLS entry with disclosures and photos. ALWAYS trigger when user says "process this listing", "new listing", "enter this in MLS", "put this in Matrix", "listing intake", "listing agreement signed", or uploads listing documents. Also trigger on any signed listing agreement or seller disclosure upload. Do NOT trigger for buyer-side transactions or MLS copy only.
---


## SUPERVISOR: Chief of Staff

This skill reports to the Chief of Staff skill, which is the agent's master coordinator.

- Chief of Staff routes requests here and passes cross-channel context before execution.
- On completion, report results back clearly so Chief of Staff can close the loop.
- BEN_PROFILE.txt: `[YOUR_SKILL_LOGS_PATH]/Chief of Staff Skill/BEN_PROFILE.txt`
- SKILL LOG: `[YOUR_SKILL_LOGS_PATH]/Chief of Staff Skill/Skill Logs/new-listing-tool-log.txt`
- UNIVERSAL LOG: `[YOUR_SKILL_LOGS_PATH]/Chief of Staff Skill/Skill Logs/UNIVERSAL_LOG.txt`
- LISTING_LOG.txt: `[YOUR_SKILL_LOGS_PATH]/Chief of Staff Skill/LISTING_LOG.txt`
- When in doubt about anything outside this skill's scope, defer to Chief of Staff.

---


# New Listing Tool

Everything from signed listing agreement to live MLS listing with photos and disclosures.

## CORE PHILOSOPHY

Accuracy is more important than speed. Verify information in the transaction platform, previous emails, and the listing agreement -- never assume or try to remember. Slow is smooth and smooth is fast.

**CONSTANTLY ASK YOURSELF: AM I IN THE RIGHT TRANSACTION?**

---


## THREE-PHASE ARCHITECTURE

This skill runs in three independent phases. Phase 1 requires the user's input. Phases 2 and 3 run autonomously once Phase 1 is complete. Phase 3 (Attachments & Photos) can run separately -- days or weeks later -- when materials arrive.

- **Phase 1: Intake** -- Read logs, request all access, ask all questions, generate MLS content for review.
- **Phase 2: Autonomous Backend** -- Drive folders, transaction platform, public records lookup, MLS entry. Runs hands-free.
- **Phase 3: Attachments & Photos** -- Upload disclosures, offer instructions, and photos to MLS. Runs independently.

Trigger Phase 3 separately when user says "attach docs for [address]", "upload photos for [address]", "finish the listing for [address]", or similar.

---


# PHASE 1: INTAKE (Requires User Input)

Everything that needs the user's brain before the skill can run autonomously.

## Step 1: Read Learning Logs

Read both logs before doing anything else:

1. **new-listing-tool-log.txt** (Skill Logs folder) -- skill-specific corrections
1b. **UNIVERSAL_LOG.txt** (Skill Logs folder) -- universal corrections
2. **LISTING_LOG.txt** (path above) -- check for patterns, past mistakes, property-specific notes

If LISTING_LOG.txt doesn't exist, create it with a header (see end of this skill for template).

## Step 2: Request All Access

Immediately after reading logs, request access to everything the skill needs. Do this in one batch so user approves once and walks away.

**Mount these directories via `request_cowork_directory`:**
- `[YOUR_TRANSACTIONS_PATH]` (transaction folders -- new listings create a subfolder here)
- `[YOUR_SKILL_LOGS_PATH]` (learning logs)

**Request Chrome MCP access** -- needed for:
- `[YOUR_TRANSACTION_PLATFORM_URL]` (Transaction Platform)
- `[YOUR_PUBLIC_RECORDS_URL]` (Public Records)
- `[YOUR_MLS_URL]` (MLS / Matrix)
- School locator websites (county-specific)

**Request computer-use access** for:
- Google Chrome (fallback if Chrome MCP hits issues)

**Request iMessage access** -- for notifying user at `[YOUR_PHONE]`

**Request Google Calendar access** -- for adding listing dates to Admin Calendar

If any access is denied or unavailable, note it and proceed with what's available. Don't stall.

## Step 3: Parse the Listing Agreement

Read the listing agreement (user will upload it or it's already in uploads). Extract:

| Field | Notes |
|-------|-------|
| Property address | Street address only for file naming; full address for Drive/MLS |
| Seller name(s) | All parties |
| List price | |
| Listing period | Start date and expiration date |
| Signature date | Drives compliance deadline calculation |
| Property type | Residential, Income (2-4 units), Vacant Land -- determines MLS classification AND which fields to skip |
| Commission structure | For transaction platform only -- NEVER goes in MLS |
| Special Sale Provision | Usually "No" |
| Agent/brokerage | Confirm [YOUR_NAME] / [YOUR_TEAM_NAME] / [YOUR_BROKERAGE] |

## Step 4: Front-Load All Questions

Ask ALL of the following in a single message. User answers once, then the skill runs autonomously through Phase 2.

**Always ask:**
1. **Title company** -- "Which title company for this listing? ([YOUR_PREFERRED_TITLE_COMPANY_A] = Form A, [YOUR_PREFERRED_TITLE_COMPANY_B] = Form B, Other?)"
2. **Clear Cooperation** -- "Listing agreement signed [date]. Does the 5-business-day Clear Cooperation deadline apply, or are we holding off?"
3. **Showing status** -- "Vacant, Tenant-occupied, or Owner-occupied?"
4. **Any special notes** -- "Anything I should know? (HOA quirks, seller preferences, construction details, etc.)"

**Ask only if not obvious from documents:**
5. **Pool details** -- if listing agreement or photos are ambiguous
6. **Laundry** -- if not visible in photos and not in docs
7. **Existing lease** -- if tenant-occupied
8. **New Construction** -- if unclear (affects address format in transaction platform: add "NC" after address)

**Do NOT ask if you can figure it out:**
- Schools (look up via county school locator)
- Front exposure (Google Maps)
- Beds/baths/sqft/lot/year built (Public Records)
- Roof/exterior/foundation (photos + Public Records)
- Flood zone (previous listings or Google)
- HOA info (HOA disclosure docs or previous listings)

## Step 5: Generate MLS Content for Review

Generate three components using the Broker Synopsis (if uploaded), listing agreement, public records data, and photos. Present to user for approval before entering MLS.

### A. LISTING DESCRIPTION (Public Remarks)

**Format:** Paragraph form only -- never bullet points.

**Tone:** Write like a relaxed but polished agent selling the lifestyle, not the specs. Conversational, focused on the experience of living there. Show, don't tell -- paint a picture of daily life rather than listing attributes.

**Content priorities:**
- How people will actually live there -- fun, simplicity, location, daily life benefits
- If pool/balcony views exist, mention them
- If monthly fees include utilities, highlight only: water, trash, pool, fitness center
- For waterfront properties: clarify if views are from the unit or from the community
- Highlight special features: Key West style, major renovations (include years), boat access, kayak storage, no HOA fees
- Location benefits and nearby lifestyle amenities

**Do NOT include:**
- The price (never)
- Agent name, company name, brokerage, or contact info (MLS violation)
- Pets, lease terms, or flood zone info
- Overused words: "stunning", "gorgeous", "nestled", "cozy", "concrete", "highly sought after"

**Key principle:** Accuracy over speed. Verify all details from the Broker Synopsis or listing agreement. Lifestyle over features. Clarity over cleverness -- be direct and easy to understand.

**Virtual staging flag:** If any photos are virtually staged, the FIRST WORDS of public remarks MUST be: "One or more photo(s) was virtually staged." Then continue with the listing description.

### B. REALTOR REMARKS (Private -- use this exact text every time)

```
Room sizes are estimates -- buyer must verify room sizes. We can't wait to do a deal with you! Please see Offer Instructions Form before submitting offers.
```

### C. DRIVING DIRECTIONS

- Start from the **nearest post office** to the subject property
- Write in **paragraph form** (not numbered steps)
- Include only the **last 2-3 directional turns**
- Do NOT include total mileage or driving time
- Cardinal directions first (North, South, East, West)
- Keep it clean, concise, and professional

### Presenting for Review

Present all three components to user clearly labeled and ready to paste. Wait for approval or revision requests before moving to Phase 2. Once approved, Phase 2 runs autonomously.

---


# PHASE 2: AUTONOMOUS BACKEND (No User Input Required)

Once Phase 1 is complete and MLS content is approved, this phase runs start to finish without interruption.

## Step 6: Rename Documents

Standard convention:
```
[FormType] - [StreetAddress].[ext]
```

**Street address only** -- no city, state, or zip. Examples:
- `Listing Agreement - 123 Oak Lane.pdf`
- `Seller Disclosure - 123 Oak Lane.pdf`
- `HOA Docs - 123 Oak Lane.pdf`
- `CDD Disclosure - 123 Oak Lane.pdf`
- `Broker Synopsis - 123 Oak Lane.pdf`

## Step 7: Google Drive Folder Organization

Using the mounted Transactions directory, create a subfolder for the property:
```
Claude Cowork Skills/Transactions/[Full Property Address with City]/Listing Files/
```
Also create the Transaction Files subfolder (will be used if/when the listing goes under contract):
```
Claude Cowork Skills/Transactions/[Full Property Address with City]/Transaction Files/
```

Upload all renamed listing documents into the `Listing Files/` subfolder. Confirm each file before moving on.

## Step 8: Transaction Platform -- Create Listing Transaction

Navigate to `[YOUR_TRANSACTION_PLATFORM_URL]` via Chrome MCP. Login if needed:
- Email: `[YOUR_PLATFORM_EMAIL]`
- Password: `[YOUR_PLATFORM_PASSWORD]`

Create a new transaction as **Listing** type. Fill in:
- Property address (full) -- if New Construction, put "NC" after the address
- Seller name(s)
- Listing price
- Listing start and expiration dates
- Transaction type: Listing
- Commission structure from the listing agreement

Commission note verbatim in the notes/instructions field:
> All funds should go to [YOUR_BROKERAGE] and agent should be paid by direct deposit only by [YOUR_BROKERAGE] please, no direct payments to agent from title company.

Upload all renamed listing documents to transaction platform. These go in the "Signed Documents" tab.

Add checklist for the listing. Checklist items include:
- Request LB and Sign
- Email to seller going live (wait if pics aren't in yet)

## Step 9: Public Records -- Pull Property Data

Navigate to `[YOUR_PUBLIC_RECORDS_URL]` (user is authenticated in Chrome).

Search for the property. Pull:
- Beds / Baths (full and half) / Sqft (living area)
- Lot size, Year built
- Garage / parking details
- Pool details
- RVM (for user's reference, not for MLS)
- Tax ID number (needed for MLS entry)
- Any special features

## Step 10: Enter the Listing in MLS

Navigate to `[YOUR_MLS_URL]` (user is authenticated in Chrome).

### 10a. Start the Listing -- Use Public Records for Tax ID

Before creating the listing, get the Tax ID:
1. In the MLS launch page search bar, search for the property
2. Find the Tax ID Number
3. Use the Tax ID when creating the listing (input in the first field)

Then: **ADD/EDIT -> Input -> Add New** -> Select the correct classification:
- **Residential** -- single family, condos, townhomes
- **Income** -- duplexes, triplexes, fourplexes (2-4 units)
- **Vacant Land** -- unimproved lots

### 10b. Smart Field Skipping

Not every field applies to every property. Use property type and available data to decide:

**SKIP the field if:**
- The property type makes it irrelevant (e.g., Pool tab fields for Vacant Land, Interior tab for Vacant Land, Rooms tab for Vacant Land)
- The field is optional AND the data isn't available from any source (Public Records, photos, listing agreement, disclosures)
- The field has a clear "N/A" or "None" option and that's the truthful answer

**DO NOT SKIP if:**
- The field is required by the MLS system (run VALIDATE to check)
- The data exists in your sources but would take effort to enter -- that's not a reason to skip
- You're unsure whether it applies -- fill it with best available data and flag it in the log

**When in doubt:** Fill it. You can always correct later; you can't un-skip a field you forgot about.

### 10c. Fill in All Tabs -- Field by Field

Work through each tab. **SAVE AS INCOMPLETE after every 2-3 tabs** to avoid losing work if the browser hiccups.

After filling in what you can, **hit VALIDATE** so it shows which required fields are missing.

**DON'T COPY PREVIOUS MLS LISTINGS -- information can vary.** Use the listing agreement, public records, photos, and verified data only. (It IS OK to reference previous listings for things like total sqft from prev listing, flood zone codes, HOA contacts, and community amenity info.)

---


#### Tab 1: LISTING

Source: Exclusive Right to Sell Listing Agreement

| Field | Value / Source |
|-------|---------------|
| List Price | From listing agreement |
| Special Sale Provision | Usually "No" |
| Floors in Unit | From pics or prev listings |
| **Schools** | **Look up using the school locator website for the property's county** |

**School Locator:** Search "[County Name] school locator" (e.g., "Hillsborough County school locator"). Enter the property address. Record the assigned Elementary, Middle, and High School for the MLS fields.

**>>> SAVE AS INCOMPLETE <<<**

---


#### Tab 2: POOL/EXTERIOR

Source: Photos, Google Maps (front exposure), previous listings for reference

| Field | Typical Default / Source |
|-------|------------------------|
| Front Exposure | From Google Maps (N/S/E/W) |
| Foundation | Slab (most common in Tampa Bay) |
| Ext Construction | Stucco (verify from pics) |
| Roof | Shingle (verify from pics) |
| Surface | Asphalt |
| Features | Private mailbox, other (check pics) |
| Pool | From listing agreement / pics. Include details: in-ground, heated, screen enclosure, etc. |

*Skip Pool fields entirely for Vacant Land.*

---


#### Tab 3: LAND & TAX

| Field | Typical Default / Source |
|-------|------------------------|
| Additional Parcel | No |
| Flood Zone Code | Look up in previous listings or Google |
| Total Acreage | 0 to less than 1/4 (verify from Public Records) |
| Parcel fields | All "No" |
| Total Sqft | OK to copy from prev listing if matches |

**>>> SAVE AS INCOMPLETE <<<**

---


#### Tab 4: INTERIOR

Source: Photos, Public Records, agent input

| Field | Typical Default / Source |
|-------|------------------------|
| Sq Heated Source | Public Records |
| Appliances Included | From pics or ask agent |
| Interior Features | Open floor plan & other (from pics) |
| Laundry Features | From Phase 1 question if not visible in pics |
| Utilities | Electricity available, sewer avail, water connected |
| Water | Public |
| Sewer | Public |
| Heating/Fuel | Central |
| Air | Central Air |
| Floor | From pics (tile, luxury vinyl, carpet, etc.) |

*Skip entire tab for Vacant Land.*

---


#### Tab 5: ROOMS

| Field | Value |
|-------|-------|
| In-Law Suite | No |
| Room type bedroom | Built-in closet |
| Required rooms | Kitchen, Primary Bedroom, Living Room |
| Default room size | Put 15x15 for each (unless you have actual measurements) |

*Skip entire tab for Vacant Land.*

**>>> SAVE AS INCOMPLETE <<<**

---


#### Tab 6: OWNER

| Field | Value / Source |
|-------|---------------|
| Owner | Owner on record (even if auto-populated, verify) |
| Ownership type | Fee Simple |
| Existing Lease | From Phase 1 question |

---


#### Tab 7: COMMUNITY

| Field | Value / Source |
|-------|---------------|
| Leasing Restrictions | Can property be leased? Usually Yes |
| Lease Restriction | Usually No |
| HOA info | From HOA Disclosure. Pull the master association contact (or from prev listing) |
| CDD Disclosure | Look for CDD disclosure in files. Enter the amount and set to YES if applicable |
| Association/Manager Contact | Required fields: Name, Email, Website or Phone must be filled to submit |

*For properties with no HOA: skip HOA-specific fields, mark as "No HOA".*

**>>> SAVE AS INCOMPLETE <<<**

---


#### Tab 8: REALTOR (Critical -- most complex tab)

| Field | Value |
|-------|-------|
| List Agent 2 | [YOUR_NAME] |
| List Team ID | [YOUR_MLS_TEAM_ID] |
| Seller's preferred closing agent | **From Phase 1 answer (title company)** |
| Dual | No |
| Showing Info | **From Phase 1 answer (Vacant/Tenant/Owner)** |
| Showing Instructions | "Apt only, use ShowingTime button" |
| Showing Considerations | LB Combo |
| List Distribution | ALL YES |
| Financing Available | Check all that apply: FHA, VA Loan, Conventional, Cash |
| Realtor Information | AS IS |

**Realtor Only Remarks** (verbatim):
> Room sizes are estimates buyer must verify room sizes. We can't wait to do a deal with you! Please see offer instructions form before submitting offers.

**Driving Directions:** From Phase 1 approved content.

**Public Remarks:** From Phase 1 approved listing description.

**LISTING DISTRIBUTION:** Must be ALL YES.

**Compensation:** Always subtract $395 from MLS fee (both tabs). MLS does not show the listing agent commission.

> **IMPORTANT: No compensation references in any public-facing field.** This is a Level III violation under current MLS rules. Commission details stay in transaction platform only. The Realtor tab compensation fields are private/non-public.

**>>> FINAL SAVE AS INCOMPLETE <<<**

---


## Step 11: Calendar Entries

Add key dates to the **Admin Calendar**:

Calendar ID: `[YOUR_CALENDAR_ID]`

- **"Listing Active - [Full Property Address]"** on the list date
- **"Listing Expires - [Full Property Address]"** on the expiration date

Put the entire description in the calendar event title so clients can understand at a glance.

## Step 12: Lock Box and Sign

User installs signs themselves -- no need to email anyone for sign installation.

**LB code is [YOUR_LOCKBOX_CODE]** -- standard for all team listings.

## Step 13: Notify User via Text

After Phase 2 is complete (MLS saved as Incomplete, transaction platform done, Drive organized):

**Text user at [YOUR_PHONE]** via iMessage:
> "MLS listing created for [Property Address] -- MLS# [number]. Saved as Incomplete. Transaction platform transaction created. Drive folder set up. Ready for your review. [If photos/attachments still needed: 'Photos and/or attachments still pending -- run Phase 3 when ready.']"

## Step 14: Update Logs

Append to **LISTING_LOG.txt**:
```
================================================================================
[YYYY-MM-DD] | LISTING PROCESSED -- PHASE 2 COMPLETE
Address: [Full Property Address]
MLS #: [number or "pending"]
Status: Incomplete (Pending Agent Review)
List Date: [date]
Expiration: [date]
List Price: $[price]
Seller: [name(s)]
Transaction Platform: [transaction URL or ID]
Drive Folder: Claude Cowork Skills/Transactions/[Full Address]/Listing Files/
Title Company: [from Phase 1]
LB Code: [YOUR_LOCKBOX_CODE]
Phase 3 Status: [Pending / Not Needed]
Notes: [any notable details, edge cases, or issues]
Last Updated: [today's date]
================================================================================
```

Append lessons learned:
```
[YYYY-MM-DD] [new-listing-tool] | CATEGORY | Entry
```
Categories: CORRECTION, PREFERENCE, INSIGHT, WORKFLOW, ERROR

Also append corrections to new-listing-tool-log.txt in the Skill Logs folder.

## Step 15: Report to User

Clean summary of everything completed in Phase 2:

1. Files renamed and uploaded to Drive
2. Transaction platform listing created (with checklist)
3. Public records data pulled (Tax ID, property specs)
4. MLS content entered (approved in Phase 1)
5. MLS listing entered -- MLS # [number] (saved as Incomplete)
6. Calendar entries added
7. Logs updated
8. User notified via text

Flag anything still needed for Phase 3 (missing photos, pending attachments, etc.).

---


# PHASE 3: ATTACHMENTS & PHOTOS (Runs Independently)

This phase runs separately from Phase 2. It can be triggered immediately after Phase 2, or days/weeks later when photos and documents arrive. Trigger when user says "attach docs for [address]", "upload photos for [address]", "finish the listing for [address]", or similar.

## Step 16: Read Logs (Again)

Re-read LISTING_LOG.txt to find the listing record from Phase 2. Get the MLS number and current status. Also re-read new-listing-tool-log.txt for any new corrections.

## Step 17: Request Access (If New Session)

If this is a new Cowork session, re-request all access:
- Chrome MCP (for `[YOUR_MLS_URL]`)

- Mount: Claude Cowork Skills/Transactions (listing files go in [Address]/Listing Files/)
- iMessage (for notification)

## Step 18: Upload Photos

Upload to both:
- **Google Drive:** listing's Drive folder (create "Listing Pics" subfolder if needed)
- **MLS Listing:** Photo upload section in MLS (navigate to the Incomplete listing via ADD/EDIT -> Incomplete)

**Photo order (follow this sequence):**

0. If Virtual Staging photos exist: Front Sunset, Living Room, Master Bedroom (these go first)
1. **Front of the house** (MUST be slot 1 / primary photo)
2. Kitchen
3. Living room, common areas
4. Bedrooms
5. Bathrooms
6. Laundry
7. Outside / back yard
8. Amenities
9. Community photos -- ask user for community amenity photos if not already in the transaction's Listing Files folder. If they have them in Google Drive (team Main Drive > Listing Pics > Community Amenity Pictures), they'll need to download and provide them.

**Photo rules:**
- Minimum 1 photo; maximum 100
- Front exterior MUST be slot 1 -- no exceptions
- If virtually staged: add description note to each staged photo AND first words of public remarks must read "One or more photo(s) was virtually staged."

**>>> SAVE AFTER UPLOADING PHOTOS <<<**

## Step 19: Upload Disclosures and Attachments

Attach these to the MLS listing:
- CDD Disclosure (if applicable)
- HOA Disclosure
- Property Disclosure (seller's disclosure)
- **Offer Instructions Form** -- ask user to provide the correct form:
  - **`[YOUR_OFFER_INSTRUCTIONS_FORM_A]`** if title company = [YOUR_PREFERRED_TITLE_COMPANY_A]
  - **`[YOUR_OFFER_INSTRUCTIONS_FORM_B]`** if title company = [YOUR_PREFERRED_TITLE_COMPANY_B]
  - These live in Google Drive: team Main Drive > Forms and Information > Offer Instructions For Our Listings. User may need to download and upload them.

If on the seller side and we don't have the seller's property disclosure, we always need to draft a **seller non-occupancy disclosure** for compliance.

**>>> SAVE AFTER UPLOADING ATTACHMENTS <<<**

## Step 20: Notify User via Text

**Text user at [YOUR_PHONE]** via iMessage:
> "Photos and attachments uploaded for [Property Address] -- MLS# [number]. Listing is ready for your final review and activation."

## Step 21: Update Logs

Update the listing's entry in LISTING_LOG.txt:
```
[YYYY-MM-DD] | PHASE 3 COMPLETE -- Photos & Attachments Uploaded
```

Add any lessons learned to both LISTING_LOG.txt and new-listing-tool-log.txt.

---


## COMPLIANCE QUICK REFERENCE

| Rule | Detail |
|------|--------|
| Submit deadline | Ask user case by case; 1 business day if public marketing has occurred |
| Status changes | Within 2 business days |
| Compensation in MLS | NEVER in public fields -- Level III violation |
| Agent info in remarks | NEVER in public remarks |
| Photo minimum | 1 required; front exterior MUST be slot 1 |
| Virtual staging | Disclose in photo description AND first words of public remarks |
| Data Entry Form | Standard workflows do not use this step |
| Driving directions | From post office, last 2-3 turns, paragraph form, cardinal directions first |
| Classification | Residential / Income (2-4 units) / Vacant Land |
| School zones | Look up via county school locator website |
| LB Code | [YOUR_LOCKBOX_CODE] (standard for all team listings) |
| Signs | User installs signs themselves |
| Title company | Ask user each time (Phase 1 question) |
| Offer Instructions | Form A ([YOUR_PREFERRED_TITLE_COMPANY_A]) or Form B ([YOUR_PREFERRED_TITLE_COMPANY_B]) -- ask user to provide |
| After MLS created | Text user at [YOUR_PHONE] |

---


## PRICE MODIFICATIONS

If modifying the listing price after it's live:
- Use the **last MLS price** (not the contract price) as the reference
- The modification document doesn't need to be Fully Executed to change MLS price -- do it RIGHT AWAY once verbal confirmation is received
- Update: MLS (Add/Edit -> pending -> close date), transaction platform, and notify all vendors

---


## CANCELLATION / WITHDRAWAL

**When Canceled Listing:**
- MLS: Change status to "Withdrawn Conditional"
- Conditions Expiration Date: end date of the exclusive listing agreement
- Transaction Platform: Change to Inactive

**Release and Cancel of Listing:**
- Send Modification of Listing Agreement (checkbox: conditionally cancel this listing)
- Withdraw listing button under the listing tab
- Upload modification to transaction platform after it creates the cancellation tab
- Withdraw listing from MLS for that agent
- Change transaction platform to INACTIVE

---


## LISTING_LOG TEMPLATE (First Run Only)

If LISTING_LOG.txt doesn't exist, create it with this header:
```
================================================================================
LISTING_LOG -- [YOUR_TEAM_NAME] / New Listing Tool
Created: [date]
Purpose: Records all listings processed and captures lessons learned.
================================================================================

```

## SKILL LOG -- Corrections and Continuous Improvement

This skill uses TWO log files. Read both before every run. Write to the skill-specific log after every run.

**Skill-specific log:** `[YOUR_SKILL_LOGS_PATH]/Chief of Staff Skill/Skill Logs/new-listing-tool-log.txt`
**Universal corrections:** `[YOUR_SKILL_LOGS_PATH]/Chief of Staff Skill/Skill Logs/UNIVERSAL_LOG.txt`

### Reading (Start of Run)
Mount the Skill Logs folder:
```
request_cowork_directory(path="[YOUR_SKILL_LOGS_PATH]/Chief of Staff Skill/Skill Logs")
```
Read BOTH files:
1. `[mounted path]/new-listing-tool-log.txt` -- corrections specific to this skill
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
COS will pick these up at session close and edit the skill directly. If COS is not active
(standalone run), flag them anyway for the next session.

**Tag normally** if the correction is temporary context (deal-specific, one-time workaround,
observation). Format:
```
[YYYY-MM-DD] CATEGORY | Entry
```
Categories: CORRECTION, PREFERENCE, INSIGHT, WORKFLOW, DECISION, CONTEXT, ERROR

Only write to UNIVERSAL_LOG.txt if the correction applies to ALL skills (rare).
All logs are append-only. Never overwrite.
