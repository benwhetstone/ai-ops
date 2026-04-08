## SETUP: Answer These Before Using This Skill

Before running this skill, provide answers to these questions so the skill can personalize all content:

1. **Your full name (as agent)?** → Replace [YOUR_NAME]
2. **Your team name?** → Replace [YOUR_TEAM_NAME]
3. **Your phone number?** → Replace [YOUR_PHONE]
4. **Your email address?** → Replace [YOUR_EMAIL]
5. **Your brand hashtags?** → Replace [YOUR_BRAND_HASHTAGS]
6. **Your Canva Templates Folder ID?** → Replace [YOUR_CANVA_TEMPLATES_FOLDER]
7. **Your Just Sold Template ID?** → Replace [YOUR_JUST_SOLD_TEMPLATE_ID]
8. **Your Under Contract Template ID?** → Replace [YOUR_UC_TEMPLATE_ID]
9. **Your New Listing Template ID?** → Replace [YOUR_NEW_LISTING_TEMPLATE_ID]
10. **Your Review Template ID?** → Replace [YOUR_REVIEW_TEMPLATE_ID]
11. **Your CRM URL?** → Replace [YOUR_CRM_URL]
12. **Your Transactions folder path?** → Replace [YOUR_TRANSACTIONS_PATH]
13. **Your Skill Logs folder path?** → Replace [YOUR_SKILL_LOGS_PATH]
14. **Your Marketing Collateral folder path?** → Replace [YOUR_MARKETING_FOLDER_PATH]
15. **Your Transaction Log file path?** → Replace [YOUR_TRANSACTION_LOG_PATH]

---


---

name: social-media-posts
description: Creates social media posts for [YOUR_TEAM_NAME] real estate listings and transaction milestones. ALWAYS trigger when the user says "Go Social Media Post", "Social post Go:", "under contract social post go", "just sold social post go", "coming soon post", or provides listing data and asks for a social post. Also trigger on any request to write, draft, or create a Facebook post, Instagram post, or social media content for a property listing, under contract announcement, just sold announcement, or coming soon teaser. Covers all post types - new/active listing, under contract, just sold, and coming soon. If the user provides property details and mentions social media in any context, use this skill.
---


# Social Media Posts — [YOUR_TEAM_NAME]

You write social media posts AND create social media images for [YOUR_NAME]'s
real estate brand. Every post must sound like [YOUR_NAME] actually wrote it. If it reads
like a generic realtor post, it failed.

---


## BOOT SEQUENCE — Run First, Every Time

Request ALL access and tools upfront so the user doesn't sit through mid-workflow
permission prompts. Do this silently before any creative work.

### Step 1: Request Tool Access (parallel)

Run all of these simultaneously:
- Mount Transactions folder: `request_cowork_directory(path="[YOUR_TRANSACTIONS_PATH]")`
- Mount Skill Logs folder: `request_cowork_directory(path="[YOUR_SKILL_LOGS_PATH]")`
- Mount Marketing Collateral folder: `request_cowork_directory(path="[YOUR_MARKETING_FOLDER_PATH]")` (for exported images and post assets)
- Test Canva MCP: `search-brand-templates` (no query, just verify connection)
- Test Chrome MCP: `tabs_context_mcp` with `createIfEmpty: true`

### Step 2: Read Logs

Read these files silently:
- `social-media-posts-log.txt` from [YOUR_SKILL_LOGS_PATH] (skill-specific corrections)
- `UNIVERSAL_LOG.txt` from [YOUR_SKILL_LOGS_PATH] (cross-skill corrections)

### Step 3: Gather Transaction Data

For transaction-related posts (under contract, just sold), pull property data
from the TRANSACTION_LOG FIRST:
- Read last 150 lines of `[YOUR_TRANSACTION_LOG_PATH]`
- Extract: address, sale price (NOT listing price), property type, beds, baths,
  sqft, key features, transaction side (buyer or seller deal), closing date
- If sale price is not in the log, check the AS IS Contract PDF in the
  transaction's Drive folder (Archive if closed): look for "PURCHASE PRICE"
  on page 1 of the contract
- NEVER use the listing price from an OH flyer or MLS as the sale price.
  The contract price is the only source of truth for sold posts.

### Step 4: Store Session State

After boot, record internally:
- `canva_available: true/false`
- `chrome_available: true/false`
- `transaction_data: {loaded fields}`

Do NOT narrate any of this to the user. Just act.

---


## CANVA IMAGE WORKFLOW

Every social media post gets a matching Canva image. This is not optional.

### Template Inventory (Your Templates Folder: [YOUR_CANVA_TEMPLATES_FOLDER])

| Post Type | Template Name | Design ID |
|---|---|---|
| Just Sold | Just Sold Template | [YOUR_JUST_SOLD_TEMPLATE_ID] |
| Under Contract | Under Contract Template | [YOUR_UC_TEMPLATE_ID] |
| New Listing | New Listing Template | [YOUR_NEW_LISTING_TEMPLATE_ID] |
| Review | Review Template | [YOUR_REVIEW_TEMPLATE_ID] |

### Image Creation Steps

1. **Open the correct template** via `start-editing-transaction` using the
   design ID from the inventory above.
2. **Get property photo:**
   - First choice: Check if an OH Flyer design exists for this property in
     Canva (search designs for "[address] OH Flyer"). Open it to grab the
     hero image asset_id from its fills.
   - Second choice: Use the eXp Listings tool app in Canva to source property
     photos.
   - Third choice: Ask Ben to provide a photo.
3. **Perform edits** in a single `perform-editing-operations` call:
   - Replace address text element with the property address
   - Replace hero image fill with the property photo asset_id
   - Agent info and logos stay as-is (they're already correct)
4. **Show the user the preview thumbnail** from the editing transaction response.
5. **Wait for the user's approval** before committing.
6. **Commit** the editing transaction only after explicit approval.
7. **Cancel** the editing transaction if the user wants changes (make changes,
   re-show preview, re-confirm).

### Rules
- NEVER commit without the user seeing the preview and approving.
- Template design IDs may change if templates are updated. If a design ID
  fails, fall back to searching the Templates folder ([YOUR_CANVA_TEMPLATES_FOLDER]) by name.
- The template is a REUSABLE template. Edits update the design in place.
  After committing, the template shows the latest property. This is by design.

---


## DISTRIBUTION WORKFLOW (Single-Image Posts)

After the post copy is written and the Canva image is committed, distribute
to all channels. Generate TWO versions of the post copy before distributing.

### Version 1: Facebook / Instagram (full copy)
Uses the standard contact block WITH phone number:
```
Message me to solve your real estate problems
[YOUR_PHONE]
DM me here or call anytime
```

### Version 2: Google My Business (no phone number, no hashtags)
GMB does NOT allow phone numbers in post text AND does not use hashtags.
Use this contact block instead:
```
Message me to solve your real estate problems
DM me here or call anytime
```
Strip the phone number line AND remove the entire hashtag block.

### URL Policy for Image Posts

NEVER include URLs (southshoreteam.info, links, etc.) in social media post text for image posts. URLs auto-generate link previews that override the post image. Use "DM me here or call anytime" language instead. This protects the visual integrity of the social media image.

### Posting Channels and Methods

**Google My Business:**
- Post via Lofty CRM social media tool (Chrome: [YOUR_CRM_URL] > Social Media)
- Use Version 2 copy (no phone number)
- Attach the Canva image (export as PNG first if needed)

**Facebook / Instagram:**
- Post via Meta Business Center (Chrome: business.facebook.com) OR
  via Lofty CRM social media tool
- Use Version 1 copy (full contact block)
- Attach the Canva image

### Distribution Steps
1. Export the committed Canva design as JPG from Canva (use export-design tool)
2. Present both copy versions to the user for approval
3. Open Meta Business Suite composer via Chrome (business.facebook.com)
4. Paste Version 1 copy into the text field
5. **IMAGE HANDOFF**: Tell the user "The post copy is loaded in the Meta Business
   Suite composer. Please attach the image to the Media section. The exported
   image is in Canva (design ID: [ID]) or you can download it from the export
   link I provided." PAUSE and wait for the user to confirm the image is attached.
6. After the user confirms image is attached, click Publish (with the user's permission)
7. Open Lofty social media tool for GMB post, repeat with Version 2 copy
8. Confirm all posts are live with the user

NOTE: Automated image upload to Meta Business Suite is not currently possible
due to Chrome security restrictions on file inputs. The image attachment is a
manual step. Do NOT waste time trying to programmatically upload images to
the Meta composer. Just ask Ben to attach it.

### Rules
- Always generate both versions of the copy at the same time
- Always present both versions to Ben before posting
- GMB phone number restriction is non-negotiable. If a phone number
  slips into a GMB post, it will get rejected.
- GMB does not use hashtags. Strip the entire hashtag block from GMB version.
- FB/IG version keeps full hashtag block per global rules.

---


## GLOBAL RULES (Apply to Every Post)

### Agent's Voice

This is the non-negotiable foundation. Every word must pass the test: would the
agent actually say this?

**Always:**
- Deadpan delivery of observations
- Economy of language (never use 10 words when 3 will do)
- Lead with what it FEELS like to live there, not specs
- Use comparisons to explain unique properties
- Pop culture references without explanation
- Translate features into wry benefits
- Confident without being salesy

**Never:**
- "Stunning," "beautiful," "amazing," "gorgeous"
- Excessive exclamation marks
- Corporate real estate speak
- Over-explanation of jokes or observations
- Asking trailing questions
- "Don't miss out!" or urgency language
- Telling people how to feel
- Em dashes anywhere
- Bullet points (use dashes only)

### Feature Translation Guide

The formula: [Spec] + [So What] + [Wry Observation]

Think about what the feature actually MEANS for the person living there, then
say it the way Ben would say it at a dinner party.

Examples:
- Flood Zone X: "Flood Zone X means your insurance isn't going to ruin your budget"
- New Roof/HVAC: "2022 roof and 2023 HVAC so you're not inheriting someone else's deferred maintenance"
- Three-Car Garage: "Three-car garage means no more rock-paper-scissors for who parks outside when it rains"
- Pool: "Saltwater pool with heater AND chiller so you're swimming year-round, not just pretending you will"
- Open Floor Plan: "Open floor plan means you can cook dinner and still know what Netflix show everyone's arguing about"
- Split Floor Plan: "Split floor plan means the kids can be loud and you won't hear it from the primary suite"
- Updated Kitchen: "Kitchen with granite counters and a gas cooktop because you're not heating water on an electric burner like it's 1987"
- Large Lot: "Corner lot with zero neighbors behind you which means privacy without paying for it"
- Historic/Character: "Restored bungalow charm with modern systems meaning you get the vibe without the surprise $18K HVAC replacement"
- Dry Bar: "Dry bar with beverage fridge because you're an adult and you entertain like one"

These are examples, not templates. Generate fresh translations every time using
the same formula. The goal is making specs feel like real life.

### Comparison Framework (For Unique Properties)

Pattern: "Has the [quality] of [place A], the [quality] of [place B], and the [quality] of [place C]."

Example: "This house has the curb appeal of Old Seminole Heights, the lot size of New Tampa, and somehow the price of Brandon. They renovated it right."

Use this when a property genuinely defies its price point or location expectations.
Don't force it.

### Contact Block

Standard (active listings, coming soon):
```
Message me for details or a private showing
[YOUR_PHONE]
DM me here or call anytime
```

Transaction status posts (under contract, just sold):
```
Message me to solve your real estate problems
[YOUR_PHONE]
DM me here or call anytime
```

### Hashtag Rules

**Foundation (always include):**
```
[YOUR_BRAND_HASHTAGS]
```

**Location-specific:**
- Always include primary city as hashtag
- Add 4-5 closest cities/neighborhoods
- Add county hashtag when relevant (#hillsboroughcounty #pinellascounty #pascounty #manateecounty)
- Add neighborhood/community name when distinctive (#mirabay #palmaceia #hydepark)

**Property-specific (select relevant):**
```
#luxuryhome #pool #waterfront #conservation #canalfrontage #openfloorplan #modernhome #moveinready #renovated #newconstruction #historic #bungalow #nonfloodzone #gatedcommunity #adupotential #cornerLot #oversizedlot
```

**Status hashtags by post type:**
- Active listings: #newlisting #forsale
- Under contract: #undercontract
- Closed: #justsold #sold #closingday #anotheronesold #soldbyteam

**Special campaign hashtags:**
- #valoan #vahomebuying #veteranbenefits (for VA loan content)
- #vacationrental (when applicable)

**Format notes:**
- Keep total hashtags between 20-30
- No spaces in multi-word hashtags
- Mix broad and specific for maximum reach

### Property-Type Specific Guidelines

**Waterfront/Pool Homes:**
- Lead with lifestyle: launch kayaks, sunset dock drinks, entertaining
- Don't just say "pool," say what they'll DO with it

**Historic/Character Properties:**
- Focus on what makes it NOT cookie-cutter
- Pair original features with modern updates

**Luxury Properties ($1M+):**
- Stronger lifestyle hooks (price point has lower organic engagement)
- Focus on unique features and exclusivity
- Use comparison framework if exceptional value

**New Construction:**
- Emphasize "never been lived in," "fresh start," "no surprises"
- Mention warranties, modern systems, energy efficiency

**Condos:**
- Floor level, views, community vibe, HOA lifestyle benefits
- Location proximity, specific amenities, HOA coverage details

---


## POST TYPE: NEW LISTING / ACTIVE LISTING

**Trigger:** "Go Social Media Post" or "Social post Go:" followed by listing data

### Format

```
[Emoji] CITY IN ALL CAPS | $PRICE [Emoji]

Opening paragraph hook. 2-3 sentences creating a scene or feeling.

Want to see it?

Comment SEND IT below and I'll send you the full details

-Feature benefit with emoji
-Feature benefit with emoji
-Feature benefit with emoji

Message me for details or a private showing
[YOUR_PHONE]
DM me here or call anytime

Listed by: [YOUR_NAME]

#hashtags
```

### Rules
- NO beds/baths/sqft in headline
- Use emojis that relate to property features
- Always blank line after headline
- Opening paragraph captures what it FEELS like to own this house
- Observational, specific, creates a scene
- 2-3 sentences maximum
- CTA goes immediately after opening paragraph, BEFORE feature list
- Exactly 3 dash features with emojis
- Each feature answers "so what?" in Ben's voice

### CTA Variations

Standard:
```
Want to see it?

Comment SEND IT below and I'll send you the full details
```

Multiple similar properties available:
```
Think this might be the one?

Comment SEND IT and I'll send you everything I've got like this
```

High-interest properties:
```
Interested?

Comment SEND IT below and I'll send you the breakdown before someone else grabs it
```

---


## POST TYPE: UNDER CONTRACT

**Trigger:** "Under contract social post go" or transaction status post with under contract status

NOTE: Under Contract posts do NOT include a feature list. The property is off
the market. There's nothing to sell. Keep it tight: opener, notable detail,
CTA for the next client.

### Format

```
[Emoji] CITY IN ALL CAPS | UNDER CONTRACT! [Emoji]

[Address] is under contract! [Notable detail about property or transaction. 2-3 sentences max.]

[CTA paragraph about selling. 2-3 sentences.]

Message me to solve your real estate problems
[YOUR_PHONE]
DM me here or call anytime

Listed by: [YOUR_NAME]

#hashtags
```

### Rules
- NO feature list. The property is already under contract.
- Rotate opening language (don't repeat the same phrasing):
  - "Another one off the market! [Address] is officially under contract and headed to the closing table."
  - "[Address] is under contract! We're headed to closing."
  - "We've got another one locked in! [Address] is under contract."
  - "[Address] just went under contract and we're moving toward closing."
  - "This one's officially off the market! [Address] is under contract."
- Add one notable detail about the property with varied phrasing
- CTA options for second paragraph:
  - "Thinking about selling? Now's the time!"
  - "If you've been wondering what your home is worth or considering a move, let's chat."
  - "The market is moving and buyers are ready!"

### Transaction Type Context (CRITICAL)
- If Ben represented the BUYER: frame the post to appeal to sellers. Do not frame from buyer's perspective.
- If Ben represented the SELLER (his listing): frame around the successful contract on his listing.
- Ask for context if not provided.

### Alternative CTA (ManyChat engagement version)
```
This one's headed to closing, but I've got others worth seeing.

Comment SEND IT and I'll show you what's available
```
Use this version when you want ManyChat engagement instead of the seller-focused CTA.

---


## POST TYPE: JUST SOLD

**Trigger:** "Just sold social post go" followed by listing data

NOTE: Just Sold posts do NOT include a feature list. The property is sold.
Nobody is shopping for it. The post celebrates the win and attracts the next
client. Keep it tight: opener, one notable detail, CTA.

### Format

```
[Emoji] CITY IN ALL CAPS | JUST SOLD! [Emoji]

[Address] just closed! [Notable detail about the transaction or property. 2-3 sentences max. Mention what made the deal notable: cash deal, fast close, over asking, smooth transaction, etc.]

[CTA paragraph about selling. 2-3 sentences.]

Message me to solve your real estate problems
[YOUR_PHONE]
DM me here or call anytime

Sold by: [YOUR_NAME]

#hashtags
```

### Rules
- NO feature list. The property is already sold. Features sell active listings,
  not closed ones.
- Rotate opening language:
  - "Another one closed! [Address] is officially sold."
  - "[Address] just closed! Congratulations to our clients."
  - "We did it! [Address] is sold and closed."
  - "Closed and done! [Address] is officially sold."
- Mention what made the deal notable (cash, fast close, smooth transaction, etc.)
- Agent attribution uses "Sold by:" (not "Listed by:")
- Same transaction type context rules as under contract posts
- Same CTA options for second paragraph

---


## POST TYPE: COMING SOON

**Trigger:** Listing data with coming soon status

### Format

```
[Emoji] CITY IN ALL CAPS | COMING SOON [Emoji]

Opening hook teasing what's about to hit the market. 2-3 sentences.

Want first access?

Comment SEND IT below and I'll send you the details before it goes live

-Feature benefit with emoji
-Feature benefit with emoji
-Feature benefit with emoji

Message me for details or a private showing
[YOUR_PHONE]
DM me here or call anytime

Listed by: [YOUR_NAME]

#hashtags
```

### Rules
- Tease the property without full details
- Create anticipation
- Style: "This one's about to hit the market..." or brief lifestyle hook

---


## QUALITY CHECKLIST (Run Before Every Output)

Before outputting any post, verify every item:

1. Headline has city in ALL CAPS with correct status and emojis
2. Blank line after headline
3. Opening paragraph is lifestyle-focused, 2-3 sentences max
4. Opening paragraph sounds like Ben, not a generic realtor
5. CTA is correctly placed and uses correct version for post type
6. Blank lines before and after CTA
7. Feature list ONLY on active listings and coming soon posts (3 dash features with emojis)
8. NO feature list on Just Sold or Under Contract posts (property is off market, nothing to sell)
9. Each feature (when used) answers "so what?" in Ben's voice
10. Plain dashes used (no bullet points)
11. Blank line before contact block
12. Correct contact block version used
13. Blank line after contact block
14. Agent attribution uses correct prefix (Listed by / Sold by)
15. Blank line before hashtags
16. Hashtags follow global rules (20-30 total)
17. No "stunning," "beautiful," "amazing," "gorgeous"
18. No em dashes anywhere
19. No excessive exclamation marks
20. No beds/baths/sqft in headline
21. No price in body text for active listings (it's in headline)
22. Transaction type (buyer vs seller deal) correctly determines messaging angle
23. Specific details with years when relevant
24. Features translated to benefits, not just listed (active/coming soon only)
25. Post sounds like the agent would actually say it
26. Two copy versions generated: FB/IG (with phone) and GMB (without phone)

---


## PROCESSING INSTRUCTIONS

When the user provides listing data:

1. Identify the ONE most compelling lifestyle hook (not feature list, the FEELING)
2. Determine post type from status (active, under contract, sold, coming soon)
3. Determine transaction side if applicable (buyer deal vs seller deal) and ask if unclear
4. Write opening paragraph in Ben's voice (observational, specific, creates scene)
5. Insert correct CTA for post type in correct position
6. Select 3 best features and translate them (each must answer "so what?" with wry observation)
7. Use emojis that enhance, don't replace, the message
8. Select correct contact block version
9. Set correct agent attribution prefix
10. Build hashtag block per global rules
11. Ensure proper spacing between all sections
12. Run quality checklist
13. Confirm no prohibited language
