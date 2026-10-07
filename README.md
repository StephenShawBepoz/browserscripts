<p align="center"><img src="assets/oolio-logomark-purple.svg" width="80" alt="Oolio"></p>

# Browser scripts: Oolio

Small add-ons that make Oolio Office and HubSpot quicker to use. They run in your browser through Tampermonkey and use your own login, so there are no passwords or keys in here. Once installed, they keep themselves up to date.

## Scripts

| Script | What it does | Install |
|---|---|---|
| **Oolio Office: Download Device Logs** | Adds a **Download logs** button to *Logs > Devices*. Exports every line for your current filters as CSV or JSON. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/oolio-office/device-logs.user.js) |
| **HubSpot: Quick actions** (beta) | Replaces *Prefill meeting*. Adds five buttons to tickets, deals, companies and contacts: book a meeting, create a task, drive time, public transport, and a trip planner for visiting several customers in one go. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-actions.user.js) |
| **HubSpot: Prefill meeting from ticket** | Adds a **Book meeting** button to Help Desk tickets and to contact, company, deal and ticket records. Fills in the title and a link back to the ticket or deal. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/prefill-meeting.user.js) |
| **HubSpot: Cmd/Ctrl + Enter to send** | Press **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows) in a comment, note, email or task to send, save or create it. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/send-shortcut.user.js) |
| **HubSpot: Company contacts** | On tickets and deals, *Add existing* only lists contacts at the record's companies and their parent companies, 100 to a page. **Show all** searches everyone. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-contacts.user.js) |
| **HubSpot: Create ticket prefill** | On new tickets in *BP \| Bepoz Support*, fills in Source *Internal*, Priority *P2 - High* and Brands *Bepoz*. Other pipelines are left alone. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/create-ticket-prefill.user.js) |

## Set up Tampermonkey (once, about 3 minutes)

1. **Install it.** In Chrome, open the [Tampermonkey page on the Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) and click **Add to Chrome**, then **Add extension**.
2. **Pin it.** Click the puzzle piece icon in the Chrome toolbar and click the pin next to Tampermonkey.
3. **Let it run scripts.** Go to `chrome://extensions`, click **Details** on Tampermonkey and turn on **Allow User Scripts**. If you don't see that option, turn on **Developer mode** (top right) instead. Nothing will run without this step.

## Install a script

1. Click **Install** next to the script in the table above.
2. Tampermonkey opens its install screen. Click **Install**.
3. Refresh the page you'll use it on.

## Updates

Tampermonkey checks for new versions once a day and installs them for you. To get one straight away, click the Tampermonkey icon, then **Utilities** > **Check for userscript updates**.

**Installed a script before October 2026?** Click its **Install** link once more. Older copies don't know where to look for updates, and this fixes that. It replaces the old copy, so you won't end up with two.

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## Using the scripts

### Download Device Logs

1. In Oolio Office, go to **Logs > Devices** and set the venue, date range and filters.
2. Click **Download logs** (bottom right) and pick **CSV** (for Excel) or **JSON**.
3. The file saves to Downloads, named with the date range.

### Prefill meeting from ticket

<img src="assets/screenshots/hubspot-book-meeting-button.png" width="260" alt="Book meeting button">

1. Open a ticket in HubSpot Help Desk, or any contact, company, deal or ticket record.
2. Click **Book meeting** (bottom right).
3. Pick a time and book. Press **Esc** to close without booking.

On tickets and deals, the meeting title and a link back to the record are filled in for you. The link goes to everyone invited, customers included, but only HubSpot users can open it. In Outlook, **Cmd + click** (or **Ctrl + click**) the link to open it.

### Quick actions (beta)

This replaces *Prefill meeting from ticket*. Once it's installed, remove that one: click the Tampermonkey icon, then **Dashboard**, and delete it. While both are installed you only see the new buttons, and the meeting details are only added once.

The purple bar (bottom right) has five buttons. Hover over one to see what it does. Click the Oolio logo to tuck the bar away, and again to bring it back.

| Button | What it does |
|---|---|
| Calendar | Book a meeting. Works exactly like *Prefill meeting from ticket* above. |
| Checklist | Create a task, linked to the record. The title starts as *Follow up: [record name]* with the cursor at the end, so type the rest. In Help Desk it uses the Tasks card's own *Create task*, so the task window opens right there. |
| Car | Drive time and distance to the customer, with a small map. |
| Train | Public transport to the customer: the next departures, each step, and when you'd arrive. |
| Route | A trip with up to 9 customers in one drive. |

**Drive time at a glance.** Under the bar, each record shows how long the drive is from the nearest Oolio office, for example *25 min from the Sydney office*. Click it for full directions. It's worked out once you've been on a record for a moment and then remembered for a week, so flicking through records costs nothing. Turn it off in the cog's settings.

**Esc** closes HubSpot's Schedule and Task windows (an open drop-down closes first). It presses HubSpot's own Cancel or close button, so you lose what you'd typed, as you would with those buttons.

**Where trips start.** Out of the box, from the nearest Oolio office to the customer: Melbourne (North Melbourne), Sydney (Mascot), Brisbane (Pinkenba), Adelaide (Kingswood), Perth (Subiaco), Auckland (Grey Lynn), Warrington or South Carolina. Pick a different start from the list for one trip, or click the cog and star another start (an office, a place you've saved such as *Home*, or your current location) to make it the default.

**Car and train.** Pick a different start from the list, including *My current location* or a one-off address. The arrows swap the trip so it goes from the customer to you. If the record has more than one company (often a Head Office and the venue), click **pick another**. If the address is wrong or missing, click **Edit address**; your fix is kept in your browser only, so update the company in HubSpot as well. Click the result to open the trip in Google Maps for live traffic and turn-by-turn.

Public transport times in the panel are off until you turn them on (see *Where the times come from*). Until then the train button opens Google Maps with live times.

**Trips.** Open each customer's ticket or deal in its own tab, then click the route button in any of them. Every record you have open is listed under *Open in your tabs*; click one to add it, or use **Add to trip** under a drive time. Then:
- **Best order** works out the quickest order to visit them.
- Move stops up or down, or remove them.
- Tick **Come back to the start at the end** for a round trip.
- **Google Maps** opens the whole trip, all stops included, for live traffic and navigation.

The trip is shared by all your HubSpot tabs and stays until you clear it. Times are for driving, without traffic, and don't count time spent at each stop.

**Where the times come from.** All free and open, so there are no keys in this repo. The script only asks when you click, one request a second at most, and remembers addresses it has already looked up.
- Addresses: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/), under its [usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- Drive times and best order: [FOSSGIS OSRM](https://routing.openstreetmap.de/about.html), using OpenStreetMap roads. No live traffic, so treat it as a guide; Google Maps has the live time.
- Public transport: [Transitous](https://transitous.org/api/), off until you turn it on. It's a volunteer service for personal, non-commercial use, and they ask to hear from you before you use it.
- Map: [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles.

**Privacy.** Your places are saved in Tampermonkey on your computer only. For home, a nearby corner or your suburb is enough. **Use where I am now** saves your spot to about 100 m without sending an address anywhere, though that point does go to the route services when you get directions. The map services never see the HubSpot page or ticket, only the addresses and map points for the trip. To offer open records as trip stops, each tab notes which record it's showing, in Tampermonkey's storage on your computer.

**If there's no time.** The panel says which map service failed and why. The usual ones:
- *Couldn't reach ... from this computer*: a VPN, network filter or venue Wi-Fi is blocking it. Try another network.
- *Refusing your network for now (HTTP 429 or 403)*: too many requests from one office or VPN connection. It normally clears within the hour.
- *Sent back a web page instead of an answer*: a Wi-Fi sign-in page or network filter is in the way.
- *Tampermonkey is blocking ...*: allow that domain in the script's Settings tab in the Tampermonkey dashboard.

Meanwhile, Google Maps still works. Or click **Edit address** and paste a Google Maps link to the venue, which skips the address lookup.

**If the company doesn't load.** The script reads the company the same way HubSpot's own pages do, with your login, and tries a few ways in turn. If HubSpot changes and none work, type the address in the panel and let Stephen know. The browser console (search for *Oolio quick actions*) shows which way worked.

### Cmd/Ctrl + Enter to send

1. Type a comment, note or email reply in HubSpot.
2. Press **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows).
3. It presses that box's **Send**, **Comment**, **Save**, **Create** or **OK** button, and a small message shows which one. Where there's no such button, it stays out of the way and leaves the key to HubSpot.

It never presses Cancel, Delete or Schedule, and does nothing if it can't tell which button belongs to the box you're typing in.

### Company contacts

1. On a ticket or deal, click **Add** on the Contacts card and open the **Add existing** tab.
2. The list only shows contacts at the record's companies and their parent companies (often the group's head office), 100 to a page. The purple bar under the search box names the companies.
3. **Can't find someone?** Click **Show all** to search every contact before you create a new one. The next ticket or deal starts with company contacts again.

**Email only** hides contacts without an email address. It stays on until you turn it off.

To see 10 or 20 to a page, pick it from HubSpot's own page-size menu. It stays that way for the rest of that panel.

**If the bar turns amber,** it says what's wrong:
- *Couldn't load the companies*: all contacts are listed. Click **Try again**.
- *HubSpot didn't refresh the list*: the list may not match the bar. Type in the search box.
- *The company filter isn't working*: HubSpot has changed, so all contacts are listed. Let Stephen know. The browser console (search for *Oolio company contacts*) shows more.

**Had it before it was on GitHub?** Install it from the link above, then delete the old copy (version 1.2.0 or earlier): click the Tampermonkey icon, then **Dashboard**. Until you do, the bar reminds you.

### Create ticket prefill

1. Click **Create ticket** in HubSpot.
2. If the pipeline is *BP | Bepoz Support*, or once you pick it, it fills in Source *Internal*, Priority *P2 - High* and Brands *Bepoz*. The cursor lands in **Ticket name** if it's empty.
3. Type the name and the rest as usual. You can change anything it filled in before you click **Create**.

It never changes the pipeline, and tickets in any other pipeline are left alone. It fills in once per ticket, so anything you change afterwards stays as you set it. Create date is left for HubSpot, which records the exact time.

**Had it before it was on GitHub?** Install it from the link above, then delete the old copy: click the Tampermonkey icon, then **Dashboard**. While both are installed they fight over the same drop-downs.

## Problems or ideas

Message Stephen Shaw on Teams.

## For maintainers

- One script per file, grouped by site (`oolio-office/`, `hubspot/`).
- Every script header needs `@namespace oolio-userscripts`, `@author Stephen Shaw`, and `@updateURL` and `@downloadURL` pointing at its raw file on `main`. Changing the namespace or name makes Tampermonkey install a second copy.
- Bump `@version` on every change and add a line to [CHANGELOG.md](CHANGELOG.md). Tampermonkey only updates when the version goes up.
- Updates go out from `main`, so anything merged there reaches everyone within a day. Test before merging.
- UI follows the Oolio brand: Oolio Purple `#673AB6`, Inter, Lucide line icons.
- Never commit screenshots that show customer, venue or ticket details.
- *Quick actions* calls free map services. Keep within their rules (linked in *Where the times come from*): calls only on a click, at most one a second per service, cache lookups, name the script in the User-Agent, and show the attribution in the panel.
