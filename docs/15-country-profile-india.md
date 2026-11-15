# 15. Country profile: India

India is the launch country (decision D1, 10 Nov 2026). This file is the home for everything that is specific to India. Other files stay country-neutral and link here.

A country profile is code and data that the system applies when a store's address is in that country. It adds no store settings.

**Verify before pilots:** tax and consumer rules below reflect general knowledge at the time of writing. A chartered accountant and a lawyer in India MUST confirm sections 2, 3 and 5 before the first paying store.

## 1. Payments

| Topic | Rule for the product |
| --- | --- |
| Primary method | **UPI.** The pay button opens the guest's UPI app directly (intent flow) on mobile. A QR fallback shows on desktop. |
| Other online methods | Cards, wallets, net banking through the payment aggregator's hosted checkout. Shown below UPI. |
| Provider | A licensed Indian payment aggregator with split settlement to merchants. The platform never holds merchant funds. |
| Merchant onboarding | KYC runs in the aggregator's hosted flow: PAN, bank account, GSTIN when the store has one. |
| Counter payments | Staff record "UPI at counter", "Card machine" and "Cash" as methods. Many stores already own a UPI sticker and a card machine, so this path will carry most volume at first. |
| Pay-at-table by UPI | A dynamic UPI QR for the exact tab balance, shown on the staff device and printed on the bill. Payment confirmation closes the tab automatically. |
| Revenue note | UPI carries no merchant fee by regulation. Payment margin is close to zero on the main method. This feeds decision D3. |
| Refunds | Back to the source through the aggregator. Cash refunds are recorded by staff with a reason. |
| Currency | INR, stored in paise. Totals round to the nearest rupee with a visible "Round off" line. |

## 2. Tax

| Topic | Rule for the product |
| --- | --- |
| GST on restaurant service | Default 5 percent, shown as CGST 2.5 percent and SGST 2.5 percent. Restaurants in certain hotel premises charge 18 percent; the owner can change the rate in the `tax` setting. |
| Unregistered and composition stores | A store with no GSTIN charges no GST. A composition-scheme store shows no tax line and prints "Composition taxable person". Onboarding asks one question: "Are you GST registered?" with three answers. |
| Alcohol | Outside GST. It uses a state VAT tax class. One tab can carry both tax treatments; `priceTab` groups tax lines by class. |
| Packaging and delivery charges | Taxed with the food they belong to. |
| Tips | Voluntary tips are outside the taxable value. |
| Prices | Stores choose inclusive or exclusive in the `tax` setting. Default: exclusive, which is the common practice for dine-in. |
| Service codes | The bill carries the SAC code for restaurant service. |

## 3. Bill and receipt

Every bill and receipt MUST show:

- Store legal name, address and **GSTIN** (when registered).
- **FSSAI licence number.**
- A **sequential invoice number** per store per financial year (April to March), with no gaps. This is separate from the daily tab number.
- Date and time, items, quantity, rate, taxable value, tax lines by class, round off, total.
- Payment method.
- Optional **customer GSTIN and name** for guests who need a business invoice. Staff or guest can add it before the bill is printed.

Voids after an invoice number is issued produce a credit note with its own sequence.

## 4. Menu rules

- **Veg and non-veg marks are mandatory.** Every item MUST carry one dietary type: vegetarian (green mark), non-vegetarian (brown mark) or contains egg. The menu editor blocks publish when an item has none. The AI import proposes a type and flags uncertain ones.
- A **veg-only filter** sits at the top of the guest menu. This is a strong guest expectation in India.
- Allergen and calorie information: supported as optional item fields.
- Jain and no-onion-no-garlic options are common. They are modelled as tags and options, with no special logic.

## 5. Consumer rules

| Topic | Rule for the product |
| --- | --- |
| Service charge | It cannot be added automatically or made compulsory. In India `serviceCharge` defaults to 0. When a store sets a value, the bill labels it "Optional" and the guest or staff can remove it with one tap. |
| MRP items | Packaged goods such as bottled water cannot be sold above the printed price in most settings. The item form has an "MRP item" tag that stops service charge from applying to it. |
| Alcohol | Legal drinking age and dry days vary by state. The profile holds a state table for age. Dry days are handled by the owner pausing the category. |

## 6. Privacy and consent

- The Digital Personal Data Protection Act applies. Consent MUST be free, specific and opt-in. The consent control is unchecked by default.
- The notice at identification states what is collected and why, in plain words, and is available in English and the store's regional language.
- Guests can withdraw consent and request erasure from the guest app.
- Children's data needs verifiable parental consent. The product does not knowingly identify minors; it asks for no date of birth.
- Payment data residency is handled by the aggregator. Guest and order data is hosted in an India region (decision D10).

## 7. Messaging

| Channel | Use | Setup note |
| --- | --- | --- |
| WhatsApp | First channel for receipts, order-ready alerts, feedback follow-up and vouchers | Platform holds a WhatsApp Business API account; templates need approval; marketing messages need consent |
| SMS | One-time codes and fallback | Sender id and every template MUST be registered on the telecom DLT system before sending. Start this registration early; it takes weeks. |
| Email | Receipts for guests who prefer it | Low usage expected |

- Login by phone number is the default identity method. WhatsApp one-time codes are cheaper than SMS and are the preferred path.

## 8. Languages

- Merchant dashboard and staff app: English and Hindi at launch.
- Guest app: English plus auto translation into the main regional languages (Hindi, Marathi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Bengali, Punjabi). The store's state sets which languages are offered first.
- Item names often stay in their original form ("Paneer Tikka"). Translation transliterates dish names and translates descriptions.
- Kitchen tickets print in the language the kitchen chooses per station. This is part of device setup and adds no store setting.

## 9. Hardware and network

- **Printed kitchen tickets (KOT) are the norm.** Printing is a core requirement in India.
- Support low-cost 58 mm and 80 mm thermal printers over **Bluetooth and USB** from an Android device, as well as network printers.
- Staff devices are mostly low-end Android phones and tablets. The staff app MUST stay usable on 2 GB RAM devices.
- Connectivity drops are frequent. The offline queue for the staff app is part of the first sellable release.
- Power cuts happen. Open tabs survive a device restart with no loss.

## 10. Channels restaurants expect

- **Zomato and Swiggy order intake** into the same kitchen flow is expected of any POS. See [16-ecosystem-and-entry.md](16-ecosystem-and-entry.md).
- **ONDC** is an open network for commerce that lets a restaurant receive delivery orders through many buyer apps at lower commission. A seller-side connection is a later option.
- Accounting export in a format that **Tally** and Zoho Books accept, plus a GST sales summary an accountant can file from.

## 11. What changes in other files

| File | India effect |
| --- | --- |
| 03 Domain model | Tax class per item covers GST versus state VAT. Dietary type becomes a required item field under this profile. Invoice number sequence added to the tab at billing. |
| 04 Settings budget | No new settings. `serviceCharge` default and label change by profile. `tax` is prefilled from the GST registration question. |
| 05 Guest flow | UPI first on the payment step. Veg-only filter on the menu. |
| 06 POS and kitchen | Bluetooth and USB printing, UPI QR on the bill, credit notes. |
| 11 Roadmap | Offline queue, printing breadth and delivery-app intake move earlier. |

## Changes

- 10 Nov 2026: file created with India as launch country.
