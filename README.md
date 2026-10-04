<p align="center"><img src="assets/oolio-logomark-purple.svg" width="80" alt="Oolio"></p>

# Browser scripts: Oolio

Small add-ons that make Oolio Office and HubSpot quicker to use. They run in your browser through Tampermonkey and use your own login, so there are no passwords or keys in here. Once installed, they keep themselves up to date.

## Scripts

| Script | What it does | Install |
|---|---|---|
| **Oolio Office: Download Device Logs** | Adds a **Download logs** button to *Logs > Devices*. Exports every line for your current filters as CSV or JSON. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/oolio-office/device-logs.user.js) |
| **HubSpot: Prefill meeting from ticket** | Adds a **Book meeting** button to Help Desk tickets and to contact, company, deal and ticket records. Fills in the title and a link back to the ticket or deal. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/prefill-meeting.user.js) |
| **HubSpot: Products in company search** | In **Add existing Company**, shows each company's products under its name, hides the products you don't work with, links to its contacts and tickets, and shows 100 per page. | [Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-search.user.js) |
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

### Products in company search

1. On a contact, deal or ticket, add a company and pick **Add existing**.
2. Each company shows its products underneath, plus its contacts, tickets and an **Open** link (opens the company in a new tab). Click **contacts** or **Tickets** to list them right there.
3. Click a product chip above the list to hide companies that only have that product. Click it again to bring them back. Your choice is remembered.
4. Click the sliders icon (right of the chips) to change rows per page, what shows under each company, or add extra fields by their internal name, such as `city`.

If a company says **Couldn't load details**, open the settings, click **Copy debug info** and send it to Stephen.

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
- The product chips in company search come from `PRODUCTS` at the top of `hubspot/company-search.user.js`. Each `value` must match an option of the HubSpot company property `product`.
- UI follows the Oolio brand: Oolio Purple `#673AB6`, Inter, Lucide line icons.
- Never commit screenshots that show customer, venue or ticket details.
