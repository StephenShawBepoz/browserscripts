# For maintainers

[All scripts](../README.md)

- One script per file, grouped by site (`oolio-office/`, `hubspot/`, `tnt/`).
- The front page (`README.md`) keeps each script to a short summary with **Install** and **How to use** links. Each script's full guide is its own page in `docs/`.
- In the myTNT script, everything that knows about TNT's pages sits in the `SITE` block at the top. When we move to FedEx Ship Manager, rewrite that block and leave the rest. The customer message wording is in `formatCustomer()`. `deliver()` is the only part that touches the clipboard, so it can be swapped for a call to a HubSpot relay later.
- *Company filters* lives in `hubspot/company-contacts.user.js`, its file name from before the two scripts were combined, so existing copies keep updating. Its product chips come from `PRODUCTS` in `companyPanel()`. Each `value` must match an option of the HubSpot company property `product`. The lifecycle stages come from `STAGES`, matching the options of `lifecyclestage`. Ticket pipelines are read from HubSpot each time.
- Every script header needs `@namespace oolio-userscripts`, `@author Stephen Shaw`, and `@updateURL` and `@downloadURL` pointing at its raw file on `main`. Changing the namespace or name makes Tampermonkey install a second copy.
- Bump `@version` on every change and add a line to [CHANGELOG.md](../CHANGELOG.md). Tampermonkey only updates when the version goes up.
- Updates go out from `main`, so anything merged there reaches everyone within a day. Test before merging.
- UI follows the Oolio brand: Oolio Purple `#673AB6`, Inter, Lucide line icons.
- Never commit screenshots that show customer, venue or ticket details.
- *Quick actions* calls free map services. Keep within their rules (linked in *Where the times come from* in [its guide](quick-actions.md)): calls only on a click, at most one a second per service, cache lookups, name the script in the User-Agent, and show the attribution in the panel.
- The [HubSpot add-ons page](https://oolio-hubspot-addons.vercel.app) is `index.html` at the root of this repo, hosted on Vercel (project *oolio-hubspot-addons*). It isn't connected to GitHub, so pushing doesn't update it. When a HubSpot script is added, renamed or retired, edit `index.html`, then deploy a folder holding just `index.html`, the images it uses from `assets/` and a `.vercel/project.json` for that project, with `npx vercel deploy --prod`.
- The four scripts on the add-ons page (Company filters, Unlinked contacts, Payments badge, Quick actions) also `@match` oolio-hubspot-addons.vercel.app. There they only set `data-installed-<script>` on the page with their version and stop, so the page can tick their cards. A new script that should appear on the page needs the same few lines at the top.
