# Changelog

## HubSpot: Quick actions

### 0.2.0 (04/10/2026, beta)
- The bar is now four icon buttons: meeting, drive, public transport and trip. Each one opens straight to its own view; the same button again closes it.
- Trips: collect up to 9 customers from the records open in your tabs (or **Add to trip** under a drive time), work out the best order, see the total and each leg on the map, optionally come back to the start, and open the whole trip in Google Maps.
- Public transport shows each step, the line numbers and the next departures, and draws the route on the map.
- Fixes from review: a slow address lookup can no longer put the wrong customer's pin and time on screen; a service outage is no longer reported as a wrong address; Google Maps links work in **Add a place**; unit and level prefixes (and address line 2) are handled better, without eating street names like *Bay Road*; Esc closes the panel straight after opening; long company names no longer spill out of the panel; the Transitous link no longer sends names; "Use where I am now" rounds your spot to about 100 m.

### 0.1.0 (03/10/2026, beta)
- New. Replaces *Prefill meeting from ticket* with a toolbar: **Meeting** (same as before) and **Directions**.
- Directions finds the record's primary company, shows the drive time and distance from your saved places or your current location, a small map, and links to Google Maps, OpenStreetMap and (on a Mac) Apple Maps.
- Optional public transport times from Transitous, off by default.
- Handles records with several companies, missing or wrong addresses (edit kept per company in your browser), and swapping the trip to go from the customer.
- Hides the old *Prefill meeting* button if that script is still installed.

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
