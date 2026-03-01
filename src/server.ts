import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.post("/identify", async (req, res) => {
  try {
    const { email, phoneNumber } = req.body || {};

    if (!email && !phoneNumber) {
      return res.status(400).json({ error: "Provide email or phoneNumber" });
    }

    /* =========================================================
       1️⃣ Find contacts matching email OR phone
    ========================================================== */

    const matchedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          email ? { email } : undefined,
          phoneNumber ? { phoneNumber } : undefined
        ].filter(Boolean) as any
      },
      orderBy: { createdAt: "asc" }
    });

    /* =========================================================
       2️⃣ If none found → create new primary
    ========================================================== */

    if (matchedContacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary"
        }
      });

      return res.status(200).json({
        contact: {
          primaryContactId: newContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: []
        }
      });
    }

    /* =========================================================
       3️⃣ Collect ALL primary IDs involved
    ========================================================== */

    const primaryIds = new Set<number>();

    for (const contact of matchedContacts) {
      if (contact.linkPrecedence === "primary") {
        primaryIds.add(contact.id);
      } else if (contact.linkedId) {
        primaryIds.add(contact.linkedId);
      }
    }

    /* =========================================================
       4️⃣ Fetch full cluster (primaries + their secondaries)
    ========================================================== */

    const allRelatedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: { in: Array.from(primaryIds) } },
          { linkedId: { in: Array.from(primaryIds) } }
        ]
      },
      orderBy: { createdAt: "asc" }
    });

    /* =========================================================
       5️⃣ Determine true primary (oldest one)
    ========================================================== */

    const primaries = allRelatedContacts.filter(
      c => c.linkPrecedence === "primary"
    );

    if (!primaries.length) {
      throw new Error("No primary contact found");
    }

    primaries.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    const truePrimary = primaries[0];

    /* =========================================================
       6️⃣ Merge other primaries into truePrimary
    ========================================================== */

    for (const primary of primaries.slice(1)) {
      // Convert primary → secondary
      await prisma.contact.update({
        where: { id: primary.id },
        data: {
          linkPrecedence: "secondary",
          linkedId: truePrimary.id
        }
      });

      // 🔥 IMPORTANT FIX:
      // Re-link all secondaries of this primary
      await prisma.contact.updateMany({
        where: { linkedId: primary.id },
        data: { linkedId: truePrimary.id }
      });
    }

    /* =========================================================
       7️⃣ Check if new info requires secondary creation
    ========================================================== */

    const updatedCluster = await prisma.contact.findMany({
      where: {
        OR: [
          { id: truePrimary.id },
          { linkedId: truePrimary.id }
        ]
      }
    });

    const existingEmails = new Set(
      updatedCluster.map(c => c.email).filter(Boolean)
    );

    const existingPhones = new Set(
      updatedCluster.map(c => c.phoneNumber).filter(Boolean)
    );

    const shouldCreateSecondary =
      (email && !existingEmails.has(email)) ||
      (phoneNumber && !existingPhones.has(phoneNumber));

    if (shouldCreateSecondary) {
      await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: truePrimary.id
        }
      });
    }

    /* =========================================================
       8️⃣ Fetch final consolidated cluster
    ========================================================== */

    const finalContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: truePrimary.id },
          { linkedId: truePrimary.id }
        ]
      },
      orderBy: { createdAt: "asc" }
    });

    const finalEmails = [
      ...new Set(finalContacts.map(c => c.email).filter(Boolean))
    ];

    const finalPhones = [
      ...new Set(finalContacts.map(c => c.phoneNumber).filter(Boolean))
    ];

    const secondaryIds = finalContacts
      .filter(c => c.linkPrecedence === "secondary")
      .map(c => c.id);

    /* =========================================================
       9️⃣ Return Response
    ========================================================== */

    return res.status(200).json({
      contact: {
        primaryContactId: truePrimary.id,
        emails: finalEmails,
        phoneNumbers: finalPhones,
        secondaryContactIds: secondaryIds
      }
    });

  } catch (error) {
    console.error("Identify Error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});