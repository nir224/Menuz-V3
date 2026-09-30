# Menuz Tableside

Mobile menu for three Rishon LeZion leads. A guest opens a table URL, builds a group package in Hebrew or English, and sends the order to pay at the table. Staff see the ticket on a separate admin host.

| Lead | Address | Package |
|---|---|---|
| דדה | Herzl 75 | סופרה |
| שף עידן הלפרין | Motzkin 5 | שולחן השף (demo menu) |
| BEER TIME | Herzl 47 | הסיבוב / The Round |

Deda prices follow the public menu (regular price, not the member price). Beer Time bottle names and prices follow the shop list on beer-time.co.il. Food at Beer Time, and the whole chef menu, are marked as estimates or a demo.

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
