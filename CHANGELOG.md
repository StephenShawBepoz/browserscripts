# Changelog

## HubSpot: Status prompt after email

### 1.1.0 (04/10/2026)
- Added to this repo, and updates itself from GitHub. If you installed the first copy by hand (*HubSpot Help Desk: status prompt after email*), delete it in Tampermonkey. Until you do, this one stays out of the way and reminds you.
- Can't change the wrong ticket: the box closes if you move to another ticket, the ticket is checked again just before the status is picked, and Undo only works on the ticket it was set on.
- Clicking elsewhere or typing in another box closes it, so Enter and Tab go back to HubSpot. Holding Enter after Cmd + Enter, or a right-click, no longer picks a status.
- If you've already clicked or typed elsewhere when the email goes, a small message offers the box instead of taking over the keyboard.
- Highlights the waiting status in every support pipeline, including *Pending (Contact)* in OPAY | Support. If the status changed while sending, or the pipeline has no waiting status, the current status is highlighted so Enter changes nothing.
- Status lists are no longer mixed up between pipelines when the Pipeline field isn't showing.
- Only asks after emails on Help Desk tickets, and watches the composer you sent from. No more "Couldn't read ticket statuses" after emailing a contact, and no box if you edit the message, or switch it to a comment, after a send fails.
- When a status needs more details, waits while you fill in HubSpot's box and then says whether it was set.
- New: press 1 to 9 to jump to a status, Undo after setting one, a close button, *Don't ask on this pipeline*, and an on/off switch in the Tampermonkey menu that updates straight away. The browser console (search for *Oolio status prompt*) says why it didn't appear.
- Oolio styling to match the other scripts and screen reader labels. After Cmd/Ctrl + Enter, the cursor goes back to the reply box when the box closes.

### 1.0.0
- First version, installed by hand.

## HubSpot: Quick actions

### 0.6.1 (04/10/2026, beta)
- Help Desk task button finds *Create task* however HubSpot draws it, and opens a collapsed Tasks card first. If it still can't, the console says so before the pop-up is used.

### 0.6.0 (04/10/2026, beta)
- In Help Desk, the task button now uses Help Desk's own *Create task* (in the Tasks card), so the task window opens right there with no pop-up. The title uses the ticket's full name. The pop-up is only used if that card isn't on the page.

### 0.5.1 (04/10/2026, beta)
- The bar no longer shrinks to the logo when the task window opens. It only tucks away when you click the logo.
- Esc closes the task window more reliably: the key is caught before HubSpot's boxes can swallow it, and the close button is found even without a label. If it still can't find it, the browser console lists the buttons it saw.

### 0.5.0 (04/10/2026, beta)
- Under the bar, each record shows the drive time from the nearest Oolio office. Click it for directions. Worked out after a moment on the record and remembered for a week; it can be turned off in settings.
- Esc closes HubSpot's Schedule and Task windows, using HubSpot's own Cancel or close button. An open drop-down closes first.

### 0.4.0 (04/10/2026, beta)
- Directions now start from the nearest Oolio office to the customer: Melbourne, Sydney, Brisbane, Adelaide, Perth, Auckland, Warrington or South Carolina (addresses from bepoz.com.au/contact). The panel says which office it picked.
- Every office can also be picked from the start list, or starred in settings as your default. Trips start from the office nearest the middle of your stops.
- If you'd starred a saved place before, that stays your default; star *Nearest Oolio office* in settings to switch.

### 0.3.0 (04/10/2026, beta)
- New task button: opens HubSpot's task window for the record, with the title started as *Follow up: [record name]*. Works in Help Desk too.
- Click the Oolio logo to tuck the bar away; it also tucks itself while HubSpot's task window is open.
- Best order is now exact for up to 9 stops (it could pick a slower order before), and says so when your order is already the quickest.
- Records left open in background tabs no longer drop out of *Open in your tabs*.
- Editing a customer's address now moves their trip stop too; a stop can't be added twice or past 9; a second ticket for a company already in the trip isn't suggested again.
- Public transport steps say where to get off; the *Show times here* prompt no longer repeats.
- Keyboard focus stays put when the trip list changes; a half-typed start address survives a refresh from another tab.
- Addresses: suburbs and streets such as *Officer*, *Unity Street* and *Bays Road* are no longer trimmed, and a street number in the middle of an address line is found.

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

### 1.1.0 (04/10/2026)
- Works in the task window: presses **Create**.
- No more "No Send or Save button found here" message. Where there's nothing to press, the key is left to HubSpot, which handles it itself in some boxes.

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
