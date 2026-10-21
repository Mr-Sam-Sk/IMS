# Fieldwork Operations

- This is a React, TypeScript, and Vite app for inventory, purchasing, sales, attendance, and estimated payroll.
- Authentication is a local demo implemented in `src/auth.ts`; never describe it as production-secure. Production auth requires a server-side identity service and shared database.
- Store account metadata separately from per-business operations data. Preserve account isolation when changing persistence.
- Sales reduce on-hand quantity and must be blocked above available stock. Purchases increase stock when received.
- Attendance affects payroll deductions. Estimates use a 26-day working month and must not be presented as authoritative payroll advice.
- Format money in INR and follow the responsive visual language in `src/styles.css`.
