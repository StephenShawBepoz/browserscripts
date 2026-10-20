# Changelog

## HubSpot: Payments badge

### 1.0.0 (21/10/2026)
- New. Shows whether a company pays through Adyen or WPay: under the name on company and ticket records, next to the title in Help Desk, and as a *Payments:* line on company cards. Reads *Acquirer - POS*, and the merchant IDs when that's blank.

## myTNT: Copy HubSpot note

### 1.6.0 (13/10/2026)
- New round icon buttons: a notebook for the internal HubSpot note, and a person with a paper plane for the customer message. Hover to see the label.
- The button you click turns into a green tick for a moment, so you can see it's copied.

### 1.5.0 (13/10/2026)
- Added to `main`. The customer message now says the shipment "has been booked with TNT/FedEx", since the vans normally say FedEx.

### 1.4.0 (13/10/2026)
- Better spacing when pasted into HubSpot. HubSpot dropped the gap between paragraphs, so sections are now separated by a real blank line.

### 1.3.0 (13/10/2026)
- The HubSpot note is laid out in sections: the shipment links, **Shipment**, **Delivering to** and **For accounts**.
- **For accounts**: booking number, price excl. GST, GST, total incl. GST, billing, the company and TNT account invoiced, and TNT's warning that the price is a quote.
- Tracking and the HubSpot ticket are shown as full web addresses that are also links, because HubSpot can drop links hidden behind text. Adds **From** (the sending company).

### 1.2.0 (13/10/2026)
- A customer reference that's a HubSpot ticket number links to the ticket in the HubSpot note.

### 1.1.0 (13/10/2026)
- New **Copy customer message** button: first name, consignment number, tracking link, expected delivery date and item count.

### 1.0.0 (13/10/2026)
- New. **Copy HubSpot note** button on myTNT shipment details and the booking confirmation screen. Collection date from the shipment list or Track tab (falls back to the booking date), state worked out from the postcode, total weight from the package lines.

## HubSpot: Unlinked contacts

### 1.0.0 (21/10/2026)
- New. On Help Desk tickets, marks contacts who aren't linked to the ticket's company (or its parent) and links them with one click, with Undo.

## HubSpot: Status prompt after email

### 1.2.0 (05/10/2026)
- When HubSpot's *Dependent properties* box opens for a status, **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows) presses its **Save** and **Esc** presses **Cancel**. An open drop-down in the box closes first on Esc.

### 1.1.3 (05/10/2026)
- Each status shows once. HubSpot draws every status as a row inside a row, and 1.1.2 listed both.
- Statuses that pipeline rules block (greyed out in HubSpot's list) are left out.
- Fixes "Couldn't change the status: Failed to construct 'PointerEvent'" after picking a status. HubSpot's list picks on a mouse press, and the press now works inside Tampermonkey.
- The console lists the statuses read, so it's easy to check against HubSpot's own list.

### 1.1.2 (05/10/2026)
- Finds HubSpot's status list however it's linked to the field, and reads statuses that don't carry an id. In 1.1.1 the list could open and load, then nothing happened.
- If a click on a status doesn't take, presses it properly once more.
- If the list still can't be read, the drop-down is closed, the message says to check the browser console, and the console shows what was found.

### 1.1.1 (05/10/2026)
- Waits for HubSpot to load the status list before reading it. In 1.1.0 the box could open with only *Loading* in it and stay that way.
- The box's subtitle shows the ticket's name without *Help Desk |* in front.

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

## HubSpot: Company filters

### 2.2.0 (14/10/2026)
- Settings in *Add existing Company* have two new drop-downs:
  - **Companies: lifecycle stages to show.** Tick the stages you want, including *No stage*. Opportunity starts unticked, and its chip stays in the bar as a shortcut. The bar says how many other stages are hidden.
  - **Tickets: pipelines to show.** Untick pipelines to leave their tickets out of a company's **Tickets** list. **Find** narrows the list, and **All** or **None** apply to what it shows, so "BP" then **None** hides every BP pipeline.
- HubSpot is checked once for each new kind of filter before the panel uses it. If HubSpot ever refuses one, the panel falls back to hiding companies on the page instead of failing.
- The chips no longer flash purple when the panel opens.

### 2.1.0 (14/10/2026)
- In *Add existing Company*, each ticket in a company's **Tickets** list now shows its owner and pipeline, then the date it was created.

### 2.0.1 (14/10/2026)
- *Company contacts* and *Products in company search* are now one script. Copies of *Company contacts* update to it by themselves. Delete *Products in company search* in Tampermonkey. While both are installed only one of them works in *Add existing Company*, so you may not see the new chip.
- New **Opportunity** chip in *Add existing Company*. Companies whose lifecycle stage is *Opportunity* start hidden; click the chip to show them, and your choice is remembered. HubSpot only searches the rest, so the count and pages are right. Companies with no lifecycle stage still show.
- The bar's *No company on this ticket* and *Showing all contacts* messages in *Add existing Contact* now say when **Email only** is on.

## HubSpot: Company contacts (before 2.0)

### 1.3.1 (07/10/2026)
- **Try again** no longer leaves the bar stuck on *Finding this ticket's companies* when HubSpot doesn't search again.
- If the old copy (1.2.0 or earlier) is still installed, this one stands aside, so the old bar's **Show all** and **Email only** really work until you delete it.
- No more false *HubSpot didn't refresh the list* warning after clicking **Email only** while the companies are still loading.
- The switch to 100 per page finds HubSpot's menu option more reliably.
- Short one-line bar messages again; hover over one that's cut off to read it in full.

### 1.3.0 (04/10/2026)
- Added to this repo as *HubSpot: Company contacts*, so it now updates itself. Install it from the README link, then delete your old copy (1.2.0 or earlier) in Tampermonkey. The bar reminds you while both are installed.
- **Show all** is no longer remembered, so the next ticket or deal starts with company contacts again. **Email only** is still remembered.
- The bar now reads *Only contacts at ...*, so an empty list doesn't look like the person isn't in HubSpot.
- If the ticket's or deal's own companies can't be loaded, or take too long, the search goes ahead with all contacts and the bar says so, with **Try again**. If only the parent companies can't be loaded, the list shows the record's own companies. Before, a slow lookup could leave the panel searching for ever, and a failed one said the ticket had no company.
- Typing quickly while the panel opened could show results for what you'd typed earlier. Fixed.
- The switch to 100 per page waits until you stop typing and puts you back in the search box.
- Typing straight after clicking the bar is no longer wiped.
- New amber warnings if HubSpot doesn't refresh the list after a click, or if HubSpot changes and the filter can't work.
- Leaves searches for several records at once alone, rather than filtering them by the first record's companies.
- The bar shows the Oolio logomark and says when it's finding the companies.

### 1.2.0
- Defaults to 100 contacts per page, using HubSpot's own page-size menu so the page numbers stay right.

## HubSpot: Products in company search (before 2.0)

### 1.2.1 (05/10/2026)
- Fixed: the product filter wasn't reaching HubSpot's search, because HubSpot sends it a different way than expected. It now does, after a one-off check that HubSpot accepts it.

### 1.2.0 (04/10/2026)
- The product chips now filter HubSpot's own search, not just the page. A search returns only companies on your products, so pages are full and the company count is right (for example "burger" goes from 539 companies to only yours).
- Changing a chip searches again straight away.
- If HubSpot ever rejects the filter, the panel works as before and the bar says "Filtering this page only".
- **Next page** in the bar now uses HubSpot's own next-page button.

### 1.1.3 (04/10/2026)
- Fixed: while searching, company names split across several lines around the bolded search term. The details now sit under the whole name.
- Hidden means hidden, including while you search. When every company on a page is filtered out, the bar says so and offers **Next page**.

### 1.1.2 (04/10/2026)
- Search results now get their products and details too, not just the first page of the normal list.
- Fixed: a search that finds a single company now shows its details.
- Fixed: opening the settings could make the next search hide the wrong part of the list.

### 1.1.0 (04/10/2026)
- Rebuilt around what HubSpot's panel actually holds, confirmed on the live page. Products, owner and contact counts now appear instantly with no extra lookups.
- Shows the company owner's name.
- Products have their own colours: Bepoz blue, Oolio One purple, OolioPay teal.
- Idealpos, SwiftPOS and Other start hidden. One click on a chip brings them back.
- Rows per page options match HubSpot's: 10, 30 or 100.
- Extra fields are now tick boxes: LS, O, T, address, phone, website, last contacted and created date.
- Fixed duplicate company names picking up the wrong company.

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

## HubSpot: Quick actions

### 0.8.3 (12/10/2026, beta)
- Help Desk tasks open faster. The task button now uses HubSpot's own Task button or the Tasks card's link however HubSpot words it (*Create task*, *Create a task*, *Add task*). When it still needs the pop-up, it presses the ticket's Task button as soon as it's drawn and shows it straight away, instead of waiting 12 seconds.
- Finds the task window's title box even if HubSpot rewords it. If it still can't, the browser console lists the boxes it saw, so it can be fixed.

### 0.8.2 (12/10/2026, beta)
- Fixes the task button sticking on *Opening the task* on records since 0.8.1. When HubSpot's own Task button can't be found, the page reloads with the task window open again, as it did before 0.8.1. If there's unsaved text on the page, such as a half-written note, it asks first.
- The task pop-up (Help Desk tickets without a Tasks card) no longer sits on its loading card: after 12 seconds it shows the ticket so you can use HubSpot's own Task button.
- When the Task button can't be found, the browser console (search for *Oolio quick actions*) lists the buttons next to Meeting, so the finder can be fixed.
- Pressing Enter or Space again while the task pop-up loads no longer opens a second pop-up later.
- Esc on an open drop-down in the pop-up's task window closes just the drop-down, without asking *Close without saving?*
- Clicks on the meeting and task pop-ups' loading card no longer reach the hidden record page behind it.
- Screen readers now say *Opening the task* while it waits, and announce the pop-up when it opens.

### 0.8.1 (09/10/2026, beta)
- The task button no longer reloads the page when HubSpot's own Task button is slow to appear, so you can't lose a half-written note or email. It waits up to 6 seconds, then opens the task in a pop-up, the same one Help Desk uses when it has no Tasks card. The button fades while it waits.

### 0.8.0 (08/10/2026, beta)
- The car and train buttons are now one **Map** button. It always opens on **Car**; click **Public transport** at the top of the panel to switch, and **Car** to go back.
- Clicking the drive time under the bar opens the map on **Car**, or switches it back to **Car** if it's showing public transport.

### 0.7.0 (07/10/2026, beta)
- Move the bar anywhere on the page: drag the dots at its left end, or click them and use the arrow keys. Every HubSpot tab uses the same spot, and it stays in its corner when the window changes size.
- The drive time and the panel move with it. The panel opens towards the middle of the screen, so in the top half it opens below the bar.
- Double-click the dots, or click **Put them back bottom right** in settings, to put it back.

### 0.6.2 (05/10/2026, beta)
- When a map service fails, the panel now says which one and why, with what to do: blocked by your network or Tampermonkey, turned away because a shared office or VPN connection is busy (HTTP 429), down at its end, too slow, or a Wi-Fi sign-in page in the way. Before, it only said *The map service didn't answer*.
- The same goes for drive times, public transport, trips, **Best order** and **Add a place**, which used to fail without a reason. A trip with no road between two stops now says so.

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
