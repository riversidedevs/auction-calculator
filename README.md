# Auction Calculator — Expo App

A mobile auction calculator for iOS and Android built with React Native / Expo.

## Features
- Live Total Cost calculation (Hammer Price + Commission + VAT + VAT-on-Commission + Misc.)
- Budget progress bar showing HP vs your Max Worth (green → amber → red)
- My Max Bid auto-calculated based on fees
- Quick-add buttons (+£1, £5, £10, £20) and % jump buttons
- Per-toggle Commission, VAT, Misc. fees with editable rates
- Won/Lost auto-advances to next lot, pulling per-lot VAT & Commission settings
- Session total tracks purchased lots across the auction
- Multi-list support with Open List, Create New, Export CSV
- Settings screen for currency symbol and default fee rates
- End-of-list summary with lots won count and final total

## Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (iOS App Store or Google Play)

### Install & Run
```bash
cd AuctionCalculator
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

### Run on simulator
```bash
npx expo start --ios      # Requires Xcode (Mac only)
npx expo start --android  # Requires Android Studio
```

## Building for App Store / Play Store

```bash
npm install -g eas-cli
eas login
eas build --platform ios      # iOS .ipa
eas build --platform android  # Android .apk / .aab
```

## Project Structure

```
AuctionCalculator/
├── App.js          ← Entire app (single file for simplicity)
├── app.json        ← Expo configuration
├── package.json    ← Dependencies
└── README.md
```

## Key Calculations

**Total Cost:**
```
C1  = HammerPrice × CommissionRate
V3  = (HammerPrice × VATRate) + (C1 × VATRate)
TC  = HammerPrice + C1 + V3 + Misc
```

**My Max Bid:**
```
Factor = VAT on AND Comm on → 0.69444
         VAT on AND Comm off → 0.8064
         VAT off AND Comm on → 0.8064
         VAT off AND Comm off → 1.0

MaxBid = (MaxWorth - Misc) × Factor
```

## Next Steps / Roadmap
- [ ] AsyncStorage or SQLite for persistent list data
- [ ] Create New List screen with lot entry form
- [ ] expo-sharing for real CSV export
- [ ] Import CSV from device
- [ ] Google Ads (react-native-google-mobile-ads)
- [ ] Dark mode support
