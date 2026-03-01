# Bitespeed-Backend-Task

This project implements the Identity Reconciliation backend service for Bitespeed.

It identifies and consolidates customer identities across multiple purchases using different email addresses and phone numbers.

🚀 Live Endpoint
POST https://bitespeed-backend-task-a2ah.onrender.com/identify

⚠️ Note:
Opening the URL in a browser will show:

Cannot GET /identify

This is expected behavior because the endpoint only supports POST requests, not GET.

🛠 Tech Stack

Node.js

TypeScript

Express.js

Prisma ORM

PostgreSQL (Neon)

Render (Deployment)

📦 Database Schema
model Contact {
  id             Int       @id @default(autoincrement())
  phoneNumber    String?
  email          String?
  linkedId       Int?
  linkPrecedence String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
}
📌 Endpoint
POST /identify
Request Body (JSON)
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}

Both fields are optional, but at least one must be provided.

✅ Response Format
{
  "contact": {
    "primaryContactId": 1,
    "emails": [
      "lorraine@hillvalley.edu",
      "mcfly@hillvalley.edu"
    ],
    "phoneNumbers": [
      "123456"
    ],
    "secondaryContactIds": [23]
  }
}

⚠️ The response format strictly matches the specification.

🧪 Functional Scenarios Covered
✅ Case A: No Existing Contact

Creates a new primary contact

Returns empty secondaryContactIds

✅ Case B: Same Phone, New Email

Creates a secondary contact

Links it to the existing primary

✅ Case C: Two Primaries Merge

If a request connects two separate primary contacts:

The oldest contact remains primary

The newer primary becomes secondary

linkedId updated accordingly

✅ Case D: Exact Response Structure

Response strictly follows:

{
  "contact": {
    "primaryContactId": number,
    "emails": [],
    "phoneNumbers": [],
    "secondaryContactIds": []
  }
}
🏗 Local Setup Instructions
1️⃣ Clone the repository
git clone <your-repo-url>
cd bitespeed-backend-task
2️⃣ Install dependencies
npm install
3️⃣ Setup Environment Variables

Create a .env file:

DATABASE_URL=your_postgresql_connection_string
4️⃣ Run migrations
npx prisma migrate dev
5️⃣ Start the server
npm run dev

Server will start at:

http://localhost:3000
🎯 Final Checklist

✅ Code pushed to GitHub

✅ Meaningful commits

✅ Public repository

✅ Live endpoint hosted

✅ Connected to PostgreSQL

✅ All identity merge scenarios handled

✅ Exact response format followed

🧠 What This Project Demonstrates

Database modeling

Relational linking

Identity reconciliation logic

Primary-secondary relationship management

Production deployment

Clean API design
