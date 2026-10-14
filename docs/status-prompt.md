# HubSpot: Status prompt after email

[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/status-prompt.user.js) · [All scripts](../README.md) · [What changed](../CHANGELOG.md)

1. Send an email reply on a ticket in Help Desk.
2. A purple box asks what the status should be, with the waiting status highlighted (for example *Pending (Waiting on contact)*).
3. Press **Enter** to set it. **Tab**, the arrow keys or a number move the highlight, and **Esc** (or the **×**) leaves the status as it is. You can also click a status.

- **Undo** shows for a few seconds after a status is set and puts the old one back.
- Clicking elsewhere or moving to another ticket closes the box and leaves the status alone. If you've already clicked or typed somewhere else by the time the email goes, you get a small message with a **Choose** button instead, so your typing isn't interrupted.
- It only asks after emails on tickets. Comments, and emails from contacts, companies or deals, are left alone.
- In pipelines without a waiting status (most project pipelines), the current status is highlighted, so **Enter** changes nothing. To stop the box on a pipeline's tickets, click **Don't ask on this pipeline**. To bring it back, click the Tampermonkey icon, then **Ask on every pipeline again**.
- Some statuses need more details, such as a ticket type. HubSpot's own *Dependent properties* box opens for those. Fill it in, then press **Cmd + Enter** (Mac) or **Ctrl + Enter** (Windows) to save, or **Esc** to cancel. The message tells you when it's done.
- It uses the *Ticket status* field in the ticket's sidebar, so keep that field showing.
- To try it without sending anything, click the Tampermonkey icon, then **Show the status prompt on this ticket**. **Turn the status prompt off** is there too.
- If it doesn't appear when you expect, the browser console (search for *Oolio status prompt*) says why.

**Had the first copy?** If you installed *HubSpot Help Desk: status prompt after email* by hand, delete it in Tampermonkey (click the icon, then **Dashboard**). Until you do, this one stays out of the way and reminds you.

---

Something not right? Message Stephen Shaw on Teams.
