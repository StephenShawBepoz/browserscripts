<p align="center"><img src="assets/oolio-logomark-purple.svg" width="80" alt="Oolio"></p>

# Browser scripts: Oolio

Small add-ons that make Oolio Office, HubSpot and myTNT quicker to use. They run in Tampermonkey and use your own login, so there are no passwords or keys in here.

## Scripts

| Script | What it does |
|---|---|
| [Oolio Office: Download Device Logs](oolio-office/device-logs.user.js) | Adds a **Download logs** button to *Logs > Devices*. Exports every line for your current filters as CSV or JSON. |
| [HubSpot: Prefill meeting from ticket](hubspot/prefill-meeting.user.js) | Adds a **Book meeting** button to Help Desk tickets. Fills in the title and a link back to the ticket. |
| [HubSpot: Cmd/Ctrl + Enter to send](hubspot/send-shortcut.user.js) | Press **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows) in a comment, note or email to send or save it. |
| [myTNT: Copy HubSpot note](tnt/copy-hubspot-note.user.js) | Adds **Copy HubSpot note** and **Copy customer message** buttons to a shipment in myTNT. One gives you a note for the HubSpot ticket, the other a ready-to-send message for the customer with their tracking link. |

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

**myTNT: Copy HubSpot note** updates itself. Tampermonkey checks this repo about once a day and installs new versions for you.

For the other scripts, you'll get a message when one changes. Install it again the same way and it replaces the old version.

## Using the scripts

### Download Device Logs

1. In Oolio Office, go to **Logs > Devices** and set the venue, date range and filters.
2. Click **Download logs** (bottom right) and pick **CSV** (for Excel) or **JSON**.
3. The file saves to Downloads, named with the date range.

### Prefill meeting from ticket

<img src="assets/screenshots/hubspot-book-meeting-button.png" width="260" alt="Book meeting button">

1. Open a ticket in HubSpot Help Desk.
2. Click **Book meeting** (bottom right).
3. Pick a time and book. Press **Esc** to close without booking.

The ticket link goes to everyone invited, customers included, but only HubSpot users can open it. In Outlook, **Cmd + click** (or **Ctrl + click**) the link to open it.

### Cmd/Ctrl + Enter to send

1. Type a comment, note or email reply in HubSpot.
2. Press **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows).
3. It presses that box's **Send**, **Comment**, **Save** or **OK** button, and a small message shows which one.

It never presses Cancel, Delete or Schedule, and does nothing if it can't tell which button belongs to the box you're typing in.

### myTNT: Copy HubSpot note

**Install (2 minutes, after the one-off set up above):**

1. Click this link: [install myTNT: Copy HubSpot note](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/tnt/copy-hubspot-note.user.js).
2. Tampermonkey opens its install screen. Click **Install**.
3. If myTNT is already open, refresh it.

**Use it:**

1. In myTNT, go to **My shipments > Shipment history** and click the shipment.
2. Bottom right, click:
   - **Copy HubSpot note** (purple) for the ticket note, or
   - **Copy customer message** (white) for a message to the customer.

   A message at the bottom says it's copied.
3. Paste (**Cmd + V** on Mac, **Ctrl + V** on Windows): the note into a HubSpot ticket note, the customer message into your reply or email.

The HubSpot note looks like this, with the consignment number as a link to TNT tracking:

```
Item sent via TNT
Consignment: 173448101
Sent: 13/10/2026
Service: Road Express
To: James Boags, Carrie Watson
Address: Launceston TAS 7250
Pieces: 4, 18 kg
Reference: SOBG15222
```

The customer message looks like this:

```
Hi Carrie,

Thanks for your order. Your shipment is ready and has been booked with TNT.

Consignment number: 173448101
Track your delivery: https://www.tnt.com/express/en_au/site/shipping-tools/tracking.html?searchType=con&cons=173448101
Expected delivery: Friday 16/10/2026
Items: 4

It can take a few hours after booking for tracking to show the first update.

If you have any questions, just reply to this email.
```

Good to know:

- **Sent** is the collection date and **Expected delivery** is TNT's delivery date. myTNT only shows these in the shipment list and on the **Track shipment** tab, so open the shipment from **Shipment history** (as in step 1). If you came in another way, Sent shows the booking date and the customer message leaves out the delivery date (the copied message tells you).
- The customer message greets the receiver's contact by first name, or says "Hi there" if there isn't one. Read it before sending.
- The state is worked out from the postcode. myTNT doesn't show it.
- Weight is the total for the whole shipment.
- If the customer reference is a HubSpot ticket number (like `48696877349`), the note links it to that ticket. Other references, like `SOBG15222`, stay as plain text. The customer message never includes the reference.
- Any line myTNT doesn't have is left out. If the consignment number or receiver is missing, nothing is copied and a red message says what's missing.
- On the **Track shipment** tab, switch to **Details** first.
- Straight after booking, the **Your booking is done** screen also has both buttons. The note is short (consignment and reference only), and the customer message has no name or delivery date, because that's all the screen shows. For the full versions, open the shipment from Shipment history.
- Keep myTNT in English. Dates in other languages aren't read.
- Nothing is sent anywhere. The note only goes to your clipboard. To fill in the dates, the script remembers collection and delivery dates from the shipment list in that browser tab until you close it.

## Problems or ideas

Raise an issue on this repo, or message Stephen.

## For maintainers

- One script per file, grouped by site (`oolio-office/`, `hubspot/`, `tnt/`).
- In the myTNT script, everything that knows about TNT's pages sits in the `SITE` block at the top. When we move to FedEx Ship Manager, rewrite that block and leave the rest. The customer message wording is in `formatCustomer()`. `deliver()` is the only part that touches the clipboard, so it can be swapped for a call to a HubSpot relay later.
- Keep `@namespace oolio-userscripts` on every script. Changing it makes Tampermonkey install a second copy.
- Bump `@version` on every change, add a line to [CHANGELOG.md](CHANGELOG.md) and tell colleagues to reinstall.
- UI follows the Oolio brand: Oolio Purple `#673AB6`, Inter, Lucide line icons.
