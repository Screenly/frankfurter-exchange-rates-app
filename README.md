# Frankfurter Exchange Rates

Daily currency exchange rates from central banks, for a hotel lobby, an airport
hall or a bureau window.

One base currency across the top and a card for each currency against it, each
carrying the rate, how far it has moved, and the line that movement draws. The
rates come from central banks, once a working day, with no key and no account.

## What it shows

The masthead names what everything is priced against: "1 USD", the currency's
full name, and the day the rates were published. A bureau quoting a weak base
can set the amount to 100 or 1000 instead, and every figure follows.

Each card carries one currency: its code, its name, the rate written to as many
decimals as its size earns, and the change across the window the line draws.
Green for up, red for down, in the two palettes Apple ships for exactly this
job, including the darker pair that stays readable on white.

The line runs the full width of the card and off its bottom corners. It is the
same window for every card, named once in the masthead rather than on each of
them.

Its vertical scale has a floor of half a percent, so a currency that barely
moved is drawn as one. Without it the Hong Kong dollar's 0.08% month, stretched
to fit the box, read exactly like the euro's 3.4%. A rate that is pegged rather
than merely quiet, the dirham and the riyal among them, gets the line without
the wash underneath: filling half the box below a dead straight line draws a
solid block that reads as a fault.

A currency whose source has not published as recently as the rest carries the
day it last did, so a stale figure says so instead of passing for today's.

## Setting it up

The defaults draw a dollar board with six currencies on it, so a screen shows
something sensible before anything is set.

| Setting            | What it does                                                   | Default                   |
| ------------------ | -------------------------------------------------------------- | ------------------------- |
| `base_currency`    | What the rates are priced against, as a three letter code      | `USD`                     |
| `rate_direction`   | `buys`, or `costs` for the other way round                     | `buys`                    |
| `quote_currencies` | Which currencies to show, in the order they should appear      | `EUR,GBP,JPY,CHF,CNY,AUD` |
| `amount`           | Units each rate is for: of the base, or of the card's currency | `1`                       |
| `trend_days`       | How far back the line goes: 7, 30, 90 days or a year           | `30`                      |
| `appearance`       | `dark`, `light`, or `auto` to follow the account theme         | `dark`                    |
| `on_error`         | `show` what went wrong, or `skip` and let the screen move on   | `show`                    |
| `board_title`      | The line above the base currency                               | `Exchange rates`          |

Any of the 165 currencies the API quotes can be the base or appear against it.
Codes are typed rather than picked from a list: a Screenly setting carries at
most 1024 characters of help text, which is around 26 options, and a list that
left out 139 currencies would be worse than a field that accepts all of them.

Codes can be in any case, separated by commas, spaces or new lines. Anything
that is not a three letter code is named at the foot of the board, as is a code
the API does not recognise. The base is dropped from its own list without
comment, since a card reading "USD 1.0000" says nothing.

Twelve is the most a board shows; anything past that is named at its foot
rather than quietly clipped, since the cards hold their smallest readable type
while their boxes keep shrinking. The board measures the room it has and picks the
grid from it, so the same settings fill a landscape screen four across and a
portrait one two across, and the type inside a card is a proportion of the card
rather than a fixed size.

## Which way round the board reads

Two boards, from the same rates.

A hotel in Frankfurt quoting its guests' currencies wants `buys`: "100 USD"
across the top, and each card is what those dollars are worth. A bureau in
Tokyo wants `costs`: "JPY" across the top, and each card is what one unit of
that currency costs in yen, which is how a counter quotes it.

The API only publishes one base against many currencies, so the second is the
reciprocal of the first. The whole series is turned over, not only the figure,
so the movement and the line agree with it: the yen gaining is the dollar
costing less, and the same day's rates send a card green on one board and red
on the other.

`amount` follows. On a `buys` board it is how much of the base, so the heading
reads "100 USD". On a `costs` board it is how many units each figure is for, so
the heading reads "JPY per 100".

## When the rates cannot be reached

A screen that has shown the board before keeps showing it, with the day it
received those rates in the masthead, so a dropped connection costs nothing.

`on_error` is about the other case: a screen with nothing cached, usually one
that woke during an outage. `show` puts what went wrong on the screen, which is
what an operator setting the app up wants. `skip` leaves the screen to whatever
else is scheduled, which is what a lobby wants, since a message about an HTTP
status is not something the room can act on.

Either way the app keeps trying on its own timer and draws the board as soon as
it can, without waiting for anyone to reboot the screen.

Skipping works by not telling the player the app is ready. How a player fills
that time is the player's business, not this app's.

## Where the numbers come from

[Frankfurter](https://frankfurter.dev), which collects the reference rates
published by the European Central Bank and around a hundred other central banks
and official institutions: 165 currencies, with no key, no account and no
quota.

A rate for a currency several institutions publish is Frankfurter's own blend
of them, which is why the board credits the sources collectively rather than
naming one, and why it says these are not dealing rates. They are reference
figures, published once a working day; the rate over a counter is not this one.

Frankfurter asks for nothing in return, its own code being MIT and the rates not
being its to license. The credit line stays because several of the institutions
behind the numbers do ask to be acknowledged where their data is reused, and
because a board someone might act on should say what it is showing.

One request fetches the whole window, and the last day in it is the current
rate. A screen that loses its connection keeps showing the rates it has, with
the day it received them in the masthead, rather than going blank.

## Type and figures

The rate is the largest thing on a card, in tabular figures so that a column of
them lines up. Decimals follow how the trade quotes a currency rather than a
fixed count: four on a rate near one, none on a rate in the thousands, where the
last digits are noise.

Every colour on the board clears 3:1 against what sits behind it, in both
themes, and `contrast.test.ts` reads the stylesheet rather than a copy of it,
so changing a colour either keeps the board readable or fails the build.

Currency names shrink to fit their line rather than wrapping, which keeps every
card the same height whatever it holds. A name that still will not fit at the
smallest size it is allowed to be, "Bosnia and Herzegovina Convertible Mark"
among them, is carried across its box instead, the way a music player shows a
title too long for the screen: it rests at each end long enough to be read from
the beginning.

Nothing is drawn below 25px, which is what lets the quieter greys stand at the
3:1 WCAG asks of large text rather than the 4.5:1 it asks below that.

The exception is a screen asking for reduced motion, where a line too long is
shrunk rather than carried and may reach 16px. The stylesheet strengthens those
two greys to 4.5:1 inside that media query, so the guarantee holds either way,
and the contrast test checks that branch as well. There are no currency glyphs: the API
gives "CHF" as the symbol for the Swiss franc and "$" for four different
dollars, so the name does that job instead.

## Getting started

```bash
bun install
bun run dev
```

The dev server reads `mock-data.yml`, which `bun run generate-mock-data`
writes: a hotel in Frankfurt quoting its guests' currencies against the dollar,
so `rate_direction` is `buys`. Edit it to try other settings,
or pass `--force` to write a fresh one. It is gitignored.

## Tests

```bash
bun test src/
```

The parsing, the arithmetic, the grid and the line are covered. Anything that
needs a browser is not: the rendering is checked by looking at it.

## Build and deploy

Locally:

```bash
bun run build
screenly edge-app create --name frankfurter-exchange-rates-app --in-place
bun run deploy
```

In CI, `Update Edge App` deploys every push to `master` to stage, and a version
tag such as `v26.10.0` to production. To release, tag the commit on `master`
and push the tag. A tag whose commit is not on `master` is refused, and deleting
a tag deploys nothing:

```bash
git tag v26.10.0
git push origin v26.10.0
```

Versions are calendar based, `vYY.M.PATCH`: the year, the month without a
leading zero, and a count of releases that month starting from 0. A second
release in October 2026 is `v26.10.1`.

Restrict the GitHub `production` environment to tags matching `v[0-9]*`
(Settings, Environments, Deployment branches and tags) so only a tagged release
can reach it.

The Edge App id is passed to the action rather than written into
`screenly.yml`, so this repository's manifest carries no `id`. It comes only
from the repository variables `STAGE_EDGE_APP_ID` and `PRODUCTION_EDGE_APP_ID`,
never a secret, so one environment's id cannot leak into the other's deploy.
`SCREENLY_API_TOKEN` is a secret, needed by both environments.

Setting up an environment for the first time:

1. Create the `stage` and `production` GitHub environments, and give both
   `SCREENLY_API_TOKEN`, as one repository secret or one per environment.
2. Leave `STAGE_EDGE_APP_ID` and `PRODUCTION_EDGE_APP_ID` unset.
3. Run `Initialize Edge App` by hand, once for stage and once for production.
4. Copy the id each run prints into the matching variable.

`Update Edge App` refuses to run without that variable, rather than deploying
to the wrong app or creating a new one.
