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
| **Oolio Office: Download Device Logs** | Adds a **Download logs** button to *Logs > Devices*. Exports every line for the current venue, date range and filters as CSV (for Excel) or JSON. | [device-logs.user.js](oolio-office/device-logs.user.js) |

### Download Device Logs

1. In Oolio Office, go to **Logs > Devices** and set the venue, date range and any filters.
2. Click **Download logs** (bottom right) and pick **CSV** or **JSON**.
3. The file saves to your Downloads folder, named with the date range.

The CSV has local time, UTC time, level, tag, device, message, order, user and the full context for each line.

## Problems or ideas

Raise an issue on this repo, or message Stephen Balderson.

## For maintainers

- One script per file, grouped by site (`oolio-office/`, `hubspot/`).
- Bump `@version` on every change and tell colleagues to reinstall.
- The repo is private, so there's no `@updateURL`. If it ever goes public, add `@updateURL` and `@downloadURL` pointing at each raw file on `main` and updates become automatic.
