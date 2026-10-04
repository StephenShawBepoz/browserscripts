# Changelog

## HubSpot: Products in company search

### 1.0.2 (04/10/2026)
- Fixed: nothing showed in **Add existing Company**. HubSpot shows that panel inside its own frame, which the script now finds.

### 1.0.1 (04/10/2026)
- Works on pages that block plain HTML changes (Trusted Types), and inside embedded frames.
- Type `ocpDebug()` in the browser console to see what the script can find, even when nothing shows on the page.

### 1.0.0 (04/10/2026)
- New. In **Add existing Company**, each company shows its products under its name, so there's no need to hover.
- Chips above the list hide companies by product (Bepoz, Oolio One, Oolio Pay, SwiftPOS, Idealpos, Other, No product). Your choice is remembered, and **Show** brings hidden ones back faded.
- Under each company: number of contacts and its tickets (click to list them with links), an **Open** link, and any extra fields you pick in settings.
- Sets the list to 100 rows per page when the panel opens. Change or turn this off in settings.

## HubSpot: Cmd/Ctrl + Enter to send

### 1.0.1 (03/10/2026)
- Updates itself from GitHub. Install once more from the README link and later versions arrive automatically.

### 1.0.0 (30/09/2026)
- New. Cmd + Enter or Ctrl + Enter presses Send, Comment, Save or OK for the box you're typing in, with a small Oolio-branded confirmation.

## HubSpot: Prefill meeting from ticket

### 2.4.0 (03/10/2026)
- The **Book meeting** button now also shows on contact, company, deal and ticket record pages, not just Help Desk. On a record it opens HubSpot's own Schedule window straight away.
- Meetings booked from a deal get the deal name as the title and a deal link in the description, the same as tickets. Contacts and companies are left as HubSpot fills them.
- Updates itself from GitHub. Install once more from the README link and later versions arrive automatically.

### 2.3.0 (30/09/2026)
- Added to this repo.
- Oolio branding to match the other scripts: purple pill button with the logomark, Lucide calendar icon, Inter, and a branded loading card with clearer error messages.
- The ticket link shows the full URL as the link text. HubSpot drops links hidden behind text when it sends the invite, so a bare URL is what makes it clickable in Outlook.
- Namespace changed to `oolio-userscripts`. Delete the old copy in Tampermonkey after installing this one.

## Oolio Office: Download Device Logs

### 1.1.1 (03/10/2026)
- Updates itself from GitHub. Install once more from the README link and later versions arrive automatically.

### 1.1.0
- Current version. Exports every line for the current venue, date range and filters as CSV or JSON.
