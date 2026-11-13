# Verified REVO tariffs

Checked on 2026-11-13 in the official public product pages, with Spain selected
and prices shown in EUR excluding taxes. Values are stored in
`data/repro-tariffs.json`, keyed to the exact catalogue generation, engine and
stage. They are not a complete REVO catalogue or an automatic live REVO feed.

| Product | Net EUR | Official product |
| --- | ---: | --- |
| T-Roc R 2.0 TSI GPF 300 PS, 2018 onward, Stage 1 | 599.00 | /product-details/software/volkswagen/t-roc/388/stage-1 |
| Golf VIII GTI 2.0 TSI DNPA/DRNA/DKXA 245 PS, Stage 1 | 599.00 | /product-details/software/volkswagen/golf-viii/401/stage-1 |
| Golf VIII Clubsport 2.0 TSI DNFC 300 PS, Stage 1 | 649.00 | /product-details/software/volkswagen/golf-viii/462/stage-1 |

Product paths above are on https://www.onlyrevo.com. The T-Roc product covers
the original and facelift catalogue entries. The Golf GTI has two equivalent
catalogue entries; neither is the hybrid GTE.

Software adds the configured 21 percent VAT. The optional REVO dyno adds 80 EUR
already including VAT. Example: 599 + 125.79 + 80 = 804.79 EUR.

Saved prices require an official HTTPS source, exact engine name and stock
power, EUR/ES, and a verification date no older than 90 days. Unknown engines,
other stages, expired verification and duplicate tariff rows must not charge.
ECU-specific software availability still requires the workshop's normal checks.

Remaining coverage requires additional verified product-specific prices or an
approved distributor tariff export. Do not copy a price from another engine,
convert a foreign price, or assume that every catalogue vehicle is supported.

Tests: `node tests/revo-tariffs.cjs` and `node tests/direct-repro.cjs`.
No real Stripe session or customer booking is created by these tests.
