<p align="center"><img src="assets/oolio-logomark-purple.svg" width="80" alt="Oolio"></p>

# Browser scripts: Oolio

Small add-ons that make Oolio Office and HubSpot quicker to use. They run in Tampermonkey and use your own login, so there are no passwords or keys in here.

## Scripts

| Script | What it does |
|---|---|
| [Oolio Office: Download Device Logs](oolio-office/device-logs.user.js) | Adds a **Download logs** button to *Logs > Devices*. Exports every line for your current filters as CSV or JSON. |
| [HubSpot: Prefill meeting from ticket](hubspot/prefill-meeting.user.js) | Adds a **Book meeting** button to Help Desk tickets and to contact, company, deal and ticket records. Fills in the title and a link back to the ticket or deal. |
| [HubSpot: Cmd/Ctrl + Enter to send](hubspot/send-shortcut.user.js) | Press **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows) in a comment, note or email to send or save it. |

## Set up (once, about 3 minutes)

1. **Install Tampermonkey.** In Chrome, open the [Tampermonkey page on the Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) and click **Add to Chrome**, then **Add extension**.
2. **Pin it.** Click the puzzle piece icon in the Chrome toolbar and click the pin next to Tampermonkey.
3. **Let it run scripts.** Go to `chrome://extensions`, click **Details** on Tampermonkey and turn on **Allow User Scripts**. If you don't see that option, turn on **Developer mode** (top right) instead. Nothing will run without this step.

## Install a script

1. Open the script from the table above and click **Raw**.
2. Tampermonkey opens its install screen. Click **Install**.
3. Refresh the page you'll use it on.

If the install screen doesn't appear: copy the whole file, click the Tampermonkey icon, choose **Create a new script**, paste over everything and press **Cmd + S** (Mac) or **Ctrl + S** (Windows).

## Updates

The repo is private, so scripts don't update themselves. When a script changes you'll get a message. Install it again the same way and it replaces the old version.

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

On tickets and deals, the title and link are filled in for you. The link goes to everyone invited, customers included, but only HubSpot users can open it. In Outlook, **Cmd + click** (or **Ctrl + click**) the link to open it.

### Cmd/Ctrl + Enter to send

1. Type a comment, note or email reply in HubSpot.
2. Press **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows).
3. It presses that box's **Send**, **Comment**, **Save** or **OK** button, and a small message shows which one.

It never presses Cancel, Delete or Schedule, and does nothing if it can't tell which button belongs to the box you're typing in.

## Problems or ideas

Raise an issue on this repo, or message Stephen.

## For maintainers

- One script per file, grouped by site (`oolio-office/`, `hubspot/`).
- Keep `@namespace oolio-userscripts` on every script. Changing it makes Tampermonkey install a second copy.
- Bump `@version` on every change, add a line to [CHANGELOG.md](CHANGELOG.md) and tell colleagues to reinstall.
- UI follows the Oolio brand: Oolio Purple `#673AB6`, Inter, Lucide line icons.
