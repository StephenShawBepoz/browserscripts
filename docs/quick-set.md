# HubSpot: Quick set

[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-set.user.js) · [All scripts](../README.md) · [What changed](../CHANGELOG.md)

Set a ticket's implementation fields in one go, without hunting through the sidebar.

1. Open a ticket in a **BP | Implementation**, **BP | Implementation (Sub-Tickets)**, **BP | Add Ons** or **BP | Upgrades** pipeline, either as a record page or in Help Desk.
2. Click the orange **Quick set** pill with the hard hat, bottom right of the screen (or press **Alt + Q**, **Option + Q** on a Mac).
3. An orange box opens with:
   - **BP | Implementation Category**
   - **Ticket owner**
   - **Project Manager / Co-Ordinator**, with a **Me** button that puts you in with one click
   - **Accounts Status** (view only, so you can see where Accounts are up to; it can't be changed here)
   - **Install Date** and **Go Live Date**
   - **Installer**, **Installer 2**, **Installer 3** (click **+ More installers** for 4 and 5)
4. Change what you need and click **Save** (or **Cmd + Enter** / **Ctrl + Enter**). The button says how many changes you've made, and each changed field is marked in orange.

## Book onsite

Click **Book onsite** at the bottom left of the box to book the visit in HubSpot's own **Schedule** window, with the installers already invited.

1. Pick the installers in the box (Installer 1 to 5). If you've changed anything, Book onsite saves it first.
2. Click **Book onsite**. HubSpot's Schedule window opens with the title *Onsite: [ticket name]* and every installer added under **Attendees**. An orange note at the top says who was invited.
3. The calendar opens on the **Install Date** week (if the ticket has one). **Drag down a day** to mark the time you'll be on site. Striped blocks above and below show the drive there and back, and the booking covers both, so the installers' calendars are blocked for the travel too. Start date, Start time and End time fill themselves in, and an orange note says, for example, *On site 9 AM–1 PM, booked 8:35 AM–1:25 PM with 25 min travel each way from the Adelaide office*.
4. Check it, then click **Schedule meeting** as usual. Nothing is booked until you do, and the meeting is logged on the ticket like any other.

- Installers are matched by their HubSpot email. If someone can't be found, the orange note says so; add them under Attendees by hand.
- Anyone already invited isn't added twice.
- In Help Desk, the Schedule window opens over the page and closes by itself once you schedule or cancel. **×** top right closes it too.
- If you've typed your own title, it's left alone.
- **Drive time** is shown in the box under the fields, for example *Drive: 25 min from the Adelaide office*. It's worked out from the ticket's primary company address and the nearest Oolio office, by car without traffic, rounded up to 5 minutes, and remembered for 30 days. If the company has no address, there's no travel buffer.
- **Dragging works in any Schedule window**, not just Book onsite (without the travel blocks). Press **Esc** while dragging to cancel. A plain click still does what HubSpot normally does.

## Tips

- **Picking a person.** Click a name field to see everyone, or type part of a name (or email) to narrow it down. People in a *BP |* team are listed first. **Enter** picks the top match, the arrow keys move up and down, **Esc** puts it back. The **×** clears the field.
- **Dates.** Click the date to pick from a calendar, or type it. The **×** clears it. **Same day** next to Go Live Date copies the Install Date across, for a venue that goes live on the day it's installed. The two dates can be any days; neither has to come after the other.
- **Only what you change is saved.** Fields you don't touch are left alone, so you won't undo someone else's change.
- **HubSpot's own sidebar doesn't redraw by itself**, so after saving click **refresh** in the box to see the new values there.
- The choices for Implementation Category come straight from HubSpot, so new ones show up by themselves.
- **Moving the pill.** Drag it anywhere; every HubSpot tab uses the same spot. To put it back bottom right, click the Tampermonkey icon, then **Put the Quick set button back bottom right**.
- **Moving the box.** Drag it by the orange header and it opens there next time. Double-click the header to put it back top right.
- **Other pipelines.** Click the Tampermonkey icon, then **Show on every ticket**, to have the button on all tickets.
- The list of people is remembered for 12 hours. If someone new is missing, click the Tampermonkey icon, then **Reload the list of people**.
- If the button doesn't appear when you expect, the browser console (search for *Oolio quick set*) says which pipeline the ticket is in.

---

Something not right? Message Stephen Shaw on Teams.
