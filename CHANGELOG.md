# Changelog

## myTNT: Copy HubSpot note

### 1.4.0 (13/10/2026)
- The customer message says TNT is now part of FedEx, so customers know to look out for a FedEx van.
- Better spacing when pasted into HubSpot. HubSpot dropped the gap between paragraphs, so sections are now separated by a real blank line.

### 1.3.0 (13/10/2026)
- The HubSpot note is now laid out in sections: the shipment links, **Shipment**, **Delivering to** and **For accounts**.
- New **For accounts** section: booking number, price excl. GST, GST, total incl. GST, billing, the company and TNT account invoiced, and TNT's warning that the price is a quote.
- Tracking and the HubSpot ticket are shown as full web addresses that are also links, because HubSpot can drop links hidden behind text.
- Adds **From** (the sending company).

### 1.2.0 (13/10/2026)
- In the HubSpot note, a customer reference that's a HubSpot ticket number now links to the ticket. Any text after the number (for example `48286955329 FJM Property`) stays as it is. Other references are unchanged, and the customer message doesn't include the reference.

### 1.1.0 (13/10/2026)
- New **Copy customer message** button. Copies a message for the customer with their first name, consignment number, full tracking link, expected delivery date and item count.
- Expected delivery is remembered from the shipment list and Track tab, the same way as the collection date. If it isn't known, the message leaves it out and the copied message says so.

### 1.0.0 (13/10/2026)
- New. Adds a **Copy HubSpot note** button to myTNT shipment details. Copies the note as formatted text with the consignment number linked to TNT tracking, plus a plain-text copy.
- Sent uses the collection date from the shipment list or Track tab, falling back to the booking date. State is worked out from the postcode. Weight is the total of the package lines.
- The booking confirmation screen copies a short note (consignment and reference only).
- Updates itself from this repo.

## HubSpot: Cmd/Ctrl + Enter to send

### 1.0.0 (30/09/2026)
- New. Cmd + Enter or Ctrl + Enter presses Send, Comment, Save or OK for the box you're typing in, with a small Oolio-branded confirmation.

## HubSpot: Prefill meeting from ticket

### 2.3.0 (30/09/2026)
- Added to this repo.
- Oolio branding to match the other scripts: purple pill button with the logomark, Lucide calendar icon, Inter, and a branded loading card with clearer error messages.
- The ticket link shows the full URL as the link text. HubSpot drops links hidden behind text when it sends the invite, so a bare URL is what makes it clickable in Outlook.
- Namespace changed to `oolio-userscripts`. Delete the old copy in Tampermonkey after installing this one.

## Oolio Office: Download Device Logs

### 1.1.0
- Current version. Exports every line for the current venue, date range and filters as CSV or JSON.
