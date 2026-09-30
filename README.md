# Menuz Tableside

Mobile menu for the tableside venues. A guest opens a table URL, picks an active package, and sends the order to pay at the table. Staff see the ticket, with a running timer, on a separate admin host.

| Venue | Address | Package |
|---|---|---|
| גרדן 83 | Rothschild 83 | בירגר |
| גרדן V2 | Rothschild 83 | same menu, wood-table skin |
| דדה | Herzl 75 | סופרה |
| BEER TIME | Herzl 47 | הסיבוב / The Round |
| שף עידן הלפרין | Motzkin 5 | שולחן השף (demo menu) |

Garden 83 and Garden V2 use the dishes and package from the Garden 83 demo menu. Deda prices follow the public menu (regular price, not the member price). Beer Time bottle names and prices follow the shop list on beer-time.co.il. Food at Beer Time, and the whole chef menu, are marked as estimates or a demo.

Admin can create an empty business or copy another venue into a new slug, edit packages and section order, and publish. Guests only see packages that are turned on. A waiter types their name and takes the ticket; that name shows on the staff board and on the guest confirmation.

## Run locally

```bash
npm install
npm install --prefix packages/core
npm install --prefix apps/api
npm install --prefix apps/guest
npm install --prefix apps/admin
npm run dev
```

- Guest menu: http://127.0.0.1:43123
- Admin and staff board: http://127.0.0.1:43127
- API: http://127.0.0.1:43121

Admin password: `tableside`

Open a venue from the guest home (table 4), add the package, and send the order. On the admin host, open the order board. The ticket is unpaid. Edit a price, publish, and reload the guest menu to see the new price.

`index.html` is the earlier single-venue prototype. The briefs in this repo are the Stage 1 source documents.
