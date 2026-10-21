<p align="center"><img src="assets/oolio-logomark-purple.svg" width="80" alt="Oolio"></p>

# Oolio browser scripts

Small add-ons for HubSpot, Oolio Office and myTNT that take the extra clicks out of everyday jobs.

- **Nothing to sign in to.** They run inside Chrome and use your own login. There are no passwords or keys in here.
- **They update themselves.** Install once and new versions arrive automatically.

## Get started

**Set up Tampermonkey (once, about 3 minutes).** Tampermonkey is the Chrome extension that runs these scripts.

1. Open the [Tampermonkey page on the Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) and click **Add to Chrome**, then **Add extension**.
2. Click the puzzle piece icon in the Chrome toolbar and pin Tampermonkey.
3. Go to `chrome://extensions`, click **Details** on Tampermonkey and turn on **Allow User Scripts**. If you don't see that option, turn on **Developer mode** (top right) instead. Nothing runs without this step.

**Install a script.** Click its **Install** link below, click **Install** again on Tampermonkey's screen, then refresh the page you'll use it on.

## The scripts

### In HubSpot

#### Company filters
**Sensible lists when you add a contact or a company to a record.**
- *Add existing Contact* on a ticket or deal only lists people at that customer's companies and their head office, not every contact in HubSpot. **Show all** is one click away.
- *Add existing Company* shows each company's products, owner and contacts under its name, and lists its tickets with their owner and pipeline. Chips hide the products and lifecycle stages you don't deal with. Opportunities are hidden to start with.

**[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-contacts.user.js)** · [How to use](docs/company-filters.md)

#### Status prompt after email
**Never forget to set the ticket status.** After you email a customer from a Help Desk ticket, a box asks what the status should be. **Enter** sets the waiting status, **Esc** leaves it as it is.

**[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/status-prompt.user.js)** · [How to use](docs/status-prompt.md)

#### Cmd/Ctrl + Enter to send
**Send without reaching for the mouse.** Press **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows) in a comment, note, email or task to send, save or create it.

**[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/send-shortcut.user.js)** · [How to use](docs/send-shortcut.md)

#### Payments badge
**See at a glance whether a venue is on Adyen or WPay.** A green **Adyen** or blue **WPay** badge under the company's name, next to a Help Desk ticket's title, and on the company cards in a ticket's sidebar. Hover it for the merchant ID.

**[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/payments-badge.user.js)** · [How to use](docs/payments-badge.md)

#### Quick actions (beta)
**Meetings, tasks and travel from any record.** A small purple bar on tickets, deals, companies and contacts:
- Book a meeting with the title and a link back to the record filled in.
- Create a follow-up task linked to the record.
- See the drive time from the nearest Oolio office, with directions.
- Plan a trip to several customers in the best order.

**[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-actions.user.js)** · [How to use](docs/quick-actions.md)

### In Oolio Office

#### Download Device Logs
**Get device logs out in one go.** Adds a **Download logs** button to *Logs > Devices* that saves every line for your filters as CSV (for Excel) or JSON.

**[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/oolio-office/device-logs.user.js)** · [How to use](docs/device-logs.md)

### In myTNT

#### Copy HubSpot note
**Shipment details ready to paste.** Two buttons on a shipment:
- An internal note for the HubSpot ticket, with the tracking link and the costs for accounts.
- A ready-to-send message for the customer, with their tracking link and delivery date.

**[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/tnt/copy-hubspot-note.user.js)** · [How to use](docs/mytnt-copy-note.md)

### Older

#### Prefill meeting from ticket
A single **Book meeting** button on Help Desk tickets and records. *Quick actions* does the same and more, so install that instead. If you have both, delete this one.

**[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/prefill-meeting.user.js)** · [How to use](docs/prefill-meeting.md)

## Updates

Tampermonkey checks for new versions once a day and installs them. To get one straight away, click the Tampermonkey icon, then **Utilities** > **Check for userscript updates**. [CHANGELOG.md](CHANGELOG.md) lists what changed in each version.

**Installed a script before October 2026?** Click its **Install** link once more so it knows where to find updates. It replaces your old copy. For *Company filters* (once called *Company contacts*) and *Status prompt after email*, the copies from before they were on GitHub stay, so delete those in Tampermonkey (each guide explains).

## Something not right?

Message Stephen Shaw on Teams. Most scripts say what went wrong on the page or in the browser console, and *Company filters* has **Copy debug info** in its settings.

Working on the scripts? See [For maintainers](docs/maintainers.md).
