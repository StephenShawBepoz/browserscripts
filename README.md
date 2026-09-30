<p align="center"><img src="assets/oolio-logomark-purple.svg" width="80" alt="Oolio"></p>

# Browser scripts: Oolio

Small browser add-ons that make day-to-day work in Oolio Office and HubSpot quicker. They run in [Tampermonkey](https://www.tampermonkey.net/) and use your own login, so there are no passwords or keys in here.

## Install

1. Install the Tampermonkey extension for Chrome: [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
2. Chrome only: open `chrome://extensions`, click **Details** on Tampermonkey and turn on **Allow User Scripts**. On older Chrome versions, turn on **Developer mode** (top right) instead. Scripts won't run without this.
3. Open the script file below and click **Raw**. Tampermonkey shows its install screen. Click **Install**.

   If the install screen doesn't appear, copy the whole file, open the Tampermonkey dashboard, click **+**, paste over the template and press Ctrl+S (Cmd+S on Mac).

This repo is private, so scripts don't update themselves. When a script changes, you'll get a message. Reinstall it the same way.

## Scripts

| Script | What it does | File |
|---|---|---|
| **HubSpot: Prefill meeting from ticket** | Adds a **Book meeting** button to Help Desk tickets. The scheduler opens on top of Help Desk with the title set to the ticket name and a link back to the ticket in the invite. | [prefill-meeting.user.js](hubspot/prefill-meeting.user.js) |
| **Oolio Office: Download Device Logs** | Adds a **Download logs** button to *Logs > Devices*. Exports every line for the current venue, date range and filters as CSV (for Excel) or JSON. | [device-logs.user.js](oolio-office/device-logs.user.js) |

### Download Device Logs

1. In Oolio Office, go to **Logs > Devices** and set the venue, date range and any filters.
2. Click **Download logs** (bottom right) and pick **CSV** or **JSON**.
3. The file saves to your Downloads folder, named with the date range.

The CSV has local time, UTC time, level, tag, device, message, order, user and the full context for each line.

### Prefill meeting from ticket

<img src="assets/screenshots/hubspot-book-meeting-button.png" width="260" alt="Book meeting button">

1. Open a ticket in HubSpot Help Desk.
2. Click **Book meeting** (bottom right).
3. Pick a time. The title and ticket link are already filled in.
4. Book it, or press **Esc** or **×** to close.

Good to know:

- The Attendee description goes to everyone invited, customers included. Customers can't open a HubSpot link, so the link is mainly for us.
- In Outlook, your own events open in edit mode. **Cmd + click** (Mac) or **Ctrl + click** (Windows) the link to open it.
- To change the meeting title, edit `TITLE_FORMAT` near the top of the script, for example `` (t) => `Bepoz: ${t.name}` ``.

## Problems or ideas

Raise an issue on this repo, or message Stephen Balderson.

## For maintainers

- One script per file, grouped by site (`oolio-office/`, `hubspot/`).
- Bump `@version` on every change, add a line to [CHANGELOG.md](CHANGELOG.md) and tell colleagues to reinstall.
- Keep `@namespace oolio-userscripts` on every script. Changing it makes Tampermonkey treat the script as a new one.
- The repo is private, so there's no `@updateURL`. If it ever goes public, add `@updateURL` and `@downloadURL` pointing at each raw file on `main` and updates become automatic.
