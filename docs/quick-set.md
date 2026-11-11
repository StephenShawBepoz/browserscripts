# HubSpot: Quick set

[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-set.user.js) · [All scripts](../README.md) · [What changed](../CHANGELOG.md)

Set a ticket's implementation fields in one go, without hunting through the sidebar.

1. Open a ticket in a **BP | Implementation**, **BP | Implementation (Sub-Tickets)**, **BP | Add Ons** or **BP | Upgrades** pipeline, either as a record page or in Help Desk.
2. Click the orange **Quick set** button under *Ticket status* (or press **Alt + Q**, **Option + Q** on a Mac).
3. An orange box opens with:
   - **BP | Implementation Category**
   - **Ticket owner**
   - **Project Manager / Co-Ordinator**, with a **Me** button that puts you in with one click
   - **Accounts Status** (view only, so you can see where Accounts are up to; it can't be changed here)
   - **Install Date** and **Go Live Date**
   - **Installer**, **Installer 2**, **Installer 3** (click **+ More installers** for 4 and 5)
4. Change what you need and click **Save** (or **Cmd + Enter** / **Ctrl + Enter**). The button says how many changes you've made, and each changed field is marked in orange.

- **Picking a person.** Click a name field to see everyone, or type part of a name (or email) to narrow it down. People in a *BP |* team are listed first. **Enter** picks the top match, the arrow keys move up and down, **Esc** puts it back. The **×** clears the field.
- **Dates.** Click the date to pick from a calendar, or type it. The **×** clears it.
- **Only what you change is saved.** Fields you don't touch are left alone, so you won't undo someone else's change.
- **HubSpot's own sidebar doesn't redraw by itself**, so after saving click **refresh** in the box to see the new values there.
- The choices for Implementation Category come straight from HubSpot, so new ones show up by themselves.
- **Moving the box.** Drag it by the orange header and it opens there next time. Double-click the header to put it back top right.
- **Other pipelines.** Click the Tampermonkey icon, then **Show on every ticket**, to have the button on all tickets.
- The list of people is remembered for 12 hours. If someone new is missing, click the Tampermonkey icon, then **Reload the list of people**.
- If the button doesn't appear when you expect, the browser console (search for *Oolio quick set*) says which pipeline the ticket is in.

---

Something not right? Message Stephen Shaw on Teams.
