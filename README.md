# Guarden - Environmental Reporting Platform

A modern web application built with React and Tailwind CSS for reporting environmental and city ordinance violations in your community.

## Features

- User authentication (signup/login)
- Two types of reports:
  - Environmental Violations
  - City Regulation Compliance
- Location-based reporting with geolocation
- Image upload for evidence
- Real-time report status tracking
- Admin dashboard for managing reports
- Responsive design for all devices

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Firebase (Authentication & Realtime Database)
- React Router v6
- React Firebase Hooks

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a Firebase project and update the configuration in `src/config/firebase.ts`
4. Start the development server:
   ```bash
   npm start
   ```

## Project Structure

```
src/
  ├── components/
  │   ├── admin/
  │   │   └── AdminDashboard.tsx
  │   ├── auth/
  │   │   ├── Login.tsx
  │   │   └── Register.tsx
  │   ├── layout/
  │   │   └── Layout.tsx
  │   └── report/
  │       └── ReportForm.tsx
  ├── config/
  │   └── firebase.ts
  ├── App.tsx
  └── index.tsx
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
