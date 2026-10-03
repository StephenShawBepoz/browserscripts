<p align="center"><img src="assets/oolio-logomark-purple.svg" width="80" alt="Oolio"></p>

# Browser scripts: Oolio

Small add-ons that make Oolio Office and HubSpot quicker to use. They run in your browser through Tampermonkey and use your own login, so there are no passwords or keys in here. Once installed, they keep themselves up to date.

## Scripts

| Script | What it does | Install |
|---|---|---|
| **Oolio Office: Download Device Logs** | Adds a **Download logs** button to *Logs > Devices*. Exports every line for your current filters as CSV or JSON. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/oolio-office/device-logs.user.js) |
| **HubSpot: Quick actions** (beta) | Replaces *Prefill meeting*. Adds **Meeting** and **Directions** buttons to tickets, deals, companies and contacts. Directions shows how long it takes to drive, or catch public transport, to the customer from your office, home or where you are. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-actions.user.js) |
| **HubSpot: Prefill meeting from ticket** | Adds a **Book meeting** button to Help Desk tickets and to contact, company, deal and ticket records. Fills in the title and a link back to the ticket or deal. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/prefill-meeting.user.js) |
| **HubSpot: Cmd/Ctrl + Enter to send** | Press **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows) in a comment, note or email to send or save it. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/send-shortcut.user.js) |

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

**Meeting** works exactly like *Prefill meeting from ticket* above.

**Directions** shows how far the customer is:

1. Open a ticket, deal, company or contact and click **Directions** (bottom right).
2. The first time, click the cog and add your places, for example *Perth office* and *Home*. The star marks where directions start.
3. You get the drive time and distance, a small map and, if you turn it on, public transport times. Click a row to open that trip in Google Maps for live traffic and turn-by-turn.

Other things you can do in the panel:
- Pick a different start from the list, including *My current location* or a one-off address.
- Click the arrows to swap, so the trip goes from the customer to you.
- If the record has more than one company (often a Head Office and the venue), click **pick another**.
- If the address is wrong or missing, click **Edit address**. Your fix is kept in your browser only, so update the company in HubSpot as well.

**Where the times come from.** All free and open, so there are no keys in this repo. The script only asks when you click, one request a second at most, and remembers addresses it has already looked up.
- Addresses: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/), under its [usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- Drive times: [FOSSGIS OSRM](https://routing.openstreetmap.de/about.html), using OpenStreetMap roads. No live traffic, so treat it as a guide; Google Maps has the live time.
- Public transport: [Transitous](https://transitous.org/api/), off until you turn it on in settings. It's a volunteer service for personal, non-commercial use, and they ask to hear from you before you use it.
- Map: [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles.

**Privacy.** Your places are saved in Tampermonkey on your computer only. For home, a nearby corner or your suburb is enough, or use **Use where I am now**, which saves the spot without sending an address anywhere. The map services never see the HubSpot page or ticket, only the addresses and map points for the trip.

**If the company doesn't load.** The script reads the company the same way HubSpot's own pages do, with your login, and tries a few ways in turn. If HubSpot changes and none work, type the address in the panel and let Stephen know. The browser console (search for *Oolio quick actions*) shows which way worked.

### Cmd/Ctrl + Enter to send

1. Type a comment, note or email reply in HubSpot.
2. Press **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows).
3. It presses that box's **Send**, **Comment**, **Save** or **OK** button, and a small message shows which one.

It never presses Cancel, Delete or Schedule, and does nothing if it can't tell which button belongs to the box you're typing in.

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
