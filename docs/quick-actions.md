# HubSpot: Quick actions (beta)

[Install](https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-actions.user.js) · [All scripts](../README.md) · [What changed](../CHANGELOG.md)

This replaces *Prefill meeting from ticket*. Once it's installed, remove that one: click the Tampermonkey icon, then **Dashboard**, and delete it. While both are installed you only see the new buttons, and the meeting details are only added once.

The purple bar (bottom right) has four buttons. Hover over one to see what it does. Click the Oolio logo to tuck the bar away, and again to bring it back.

**Moving the bar.** Drag the dots at its left end to put it anywhere on the page, for example when it sits over something you need. Or click the dots and use the arrow keys (hold **Shift** for bigger steps). Every HubSpot tab uses the same spot, and it stays in its corner when the window changes size. Double-click the dots, or click **Put them back bottom right** in the cog's settings, to put it back.

| Button | What it does |
|---|---|
| Calendar | Book a meeting. Works exactly like [Prefill meeting from ticket](prefill-meeting.md). |
| Checklist | Create a task, linked to the record. The title starts as *Follow up: [record name]* with the cursor at the end, so type the rest. In Help Desk it uses the Tasks card's own *Create task*, so the task window opens right there. If HubSpot's own Task button isn't on the page, the page reloads with the task window open; if you've typed something on it that isn't saved, it asks first. |
| Map | How to get to the customer, with a small map. It opens on **Car**: drive time and distance. Click **Public transport** at the top for the next departures, each step, and when you'd arrive. |
| Route | A trip with up to 9 customers in one drive. |

**Drive time at a glance.** Under the bar (or above it, if you've moved the bar into the top half of the screen), each record shows how long the drive is from the nearest Oolio office, for example *25 min from the Sydney office*. Click it for full directions. It's worked out once you've been on a record for a moment and then remembered for a week, so flicking through records costs nothing. Turn it off in the cog's settings.

**Esc** closes HubSpot's Schedule and Task windows (an open drop-down closes first). It presses HubSpot's own Cancel or close button, so you lose what you'd typed, as you would with those buttons.

**Where trips start.** Out of the box, from the nearest Oolio office to the customer: Melbourne (North Melbourne), Sydney (Mascot), Brisbane (Pinkenba), Adelaide (Kingswood), Perth (Subiaco), Auckland (Grey Lynn), Warrington or South Carolina. Pick a different start from the list for one trip, or click the cog and star another start (an office, a place you've saved such as *Home*, or your current location) to make it the default.

**The map.** Pick a different start from the list, including *My current location* or a one-off address. The arrows swap the trip so it goes from the customer to you. If the record has more than one company (often a Head Office and the venue), click **pick another**. If the address is wrong or missing, click **Edit address**; your fix is kept in your browser only, so update the company in HubSpot as well. Click the result to open the trip in Google Maps for live traffic and turn-by-turn.

Public transport times in the panel are off until you turn them on (see *Where the times come from*). Until then, **Public transport** in the map links to Google Maps with live times.

**Trips.** Open each customer's ticket or deal in its own tab, then click the route button in any of them. Every record you have open is listed under *Open in your tabs*; click one to add it, or use **Add to trip** under a drive time. Then:
- **Best order** works out the quickest order to visit them.
- Move stops up or down, or remove them.
- Tick **Come back to the start at the end** for a round trip.
- **Google Maps** opens the whole trip, all stops included, for live traffic and navigation.

The trip is shared by all your HubSpot tabs and stays until you clear it. Times are for driving, without traffic, and don't count time spent at each stop.

**Where the times come from.** All free and open, so there are no keys in this repo. The script only asks when you click, one request a second at most, and remembers addresses it has already looked up.
- Addresses: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/), under its [usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- Drive times and best order: [FOSSGIS OSRM](https://routing.openstreetmap.de/about.html), using OpenStreetMap roads. No live traffic, so treat it as a guide; Google Maps has the live time.
- Public transport: [Transitous](https://transitous.org/api/), off until you turn it on. It's a volunteer service for personal, non-commercial use, and they ask to hear from you before you use it.
- Map: [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles.

**Privacy.** Your places are saved in Tampermonkey on your computer only. For home, a nearby corner or your suburb is enough. **Use where I am now** saves your spot to about 100 m without sending an address anywhere, though that point does go to the route services when you get directions. The map services never see the HubSpot page or ticket, only the addresses and map points for the trip. To offer open records as trip stops, each tab notes which record it's showing, in Tampermonkey's storage on your computer.

**If there's no time.** The panel says which map service failed and why. The usual ones:
- *Couldn't reach ... from this computer*: a VPN, network filter or venue Wi-Fi is blocking it. Try another network.
- *Refusing your network for now (HTTP 429 or 403)*: too many requests from one office or VPN connection. It normally clears within the hour.
- *Sent back a web page instead of an answer*: a Wi-Fi sign-in page or network filter is in the way.
- *Tampermonkey is blocking ...*: allow that domain in the script's Settings tab in the Tampermonkey dashboard.

Meanwhile, Google Maps still works. Or click **Edit address** and paste a Google Maps link to the venue, which skips the address lookup.

**If the company doesn't load.** The script reads the company the same way HubSpot's own pages do, with your login, and tries a few ways in turn. If HubSpot changes and none work, type the address in the panel and let Stephen know. The browser console (search for *Oolio quick actions*) shows which way worked.

---

Something not right? Message Stephen Shaw on Teams.
