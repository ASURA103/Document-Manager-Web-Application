🚀 Project Overview

Portfolio : dev-rahul-rana.vercel.app/

Doc Manager is a full-stack MERN application that allows users to:

Create and edit rich-text documents in the browser
Import files (.txt, .md, .pdf, .docx)
Save, update, delete, and reopen documents
Share documents with other registered users
Export documents in multiple formats (.txt, .md, .pdf, .docx)
Maintain a simple Google-Docs-like editing experience

The system is built with React + Node.js + Express + MongoDB and includes file parsing, authentication, and a rich-text editor using contentEditable.

✨ Key Features
📝 Document System
Create new documents
Rename documents
Edit content with rich formatting:
Bold / Italic / Underline
Headings (H1, H2)
Bullet & numbered lists
Auto-save via manual save button
📂 File Import System

Supports uploading and converting into editable documents:

.txt
.md
.pdf
.docx

Uploaded files are converted into plain text and stored as documents.

📤 Export System

Users can export documents as:

.txt
.md
.pdf
.docx
🔐 Authentication
JWT-based login system
Protected routes for all document operations
👥 Sharing System
Share documents with other registered users via email
Shared users can access documents based on DB relation
🏗️ Tech Stack
Frontend
React.js
React Router
Axios
Tailwind CSS
contentEditable editor
Backend
Node.js
Express.js
MongoDB + Mongoose
JWT Authentication
Multer (file upload)
pdf-parse (PDF extraction)
mammoth (DOCX extraction)
⚙️ Setup Instructions
1. Clone Repository
git clone https://github.com/your-username/doc-manager.git
cd doc-manager
2. Backend Setup
cd server
npm install
🔐 Create .env

Create a .env file in /server:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
▶️ Run Backend
npm run dev

Backend runs on:

http://localhost:5000
3. Frontend Setup
cd client
npm install
npm run dev

Frontend runs on:

http://localhost:5173
🌐 API Base URL
http://localhost:5000/api
⚠️ Common Issues & Fixes
❌ 1. PDF parsing error (DOMMatrix / pdf-parse crash)

Problem:

DOMMatrix is not defined

Fix:

Do NOT use browser version of pdf.js
Use:
npm install pdf-parse

and import like:

import pdfParse from "pdf-parse/lib/pdf-parse.js";

OR safer fallback:

const pdfParse = (await import("pdf-parse")).default;
❌ 2. Multer rejects file

Problem:

Only .txt and .md allowed

Fix:
Update file filter to include:

.txt .md .pdf .docx
❌ 3. 500 Internal Server Error on upload

Cause:

Missing req.user
Wrong JWT token
Invalid file parsing

Fix:

Ensure protect middleware is applied
Check Authorization header
❌ 4. “undefined document id” error

Cause:
Wrong route param usage

Fix:
Ensure frontend uses:

/document/${doc._id}
🧠 Architecture Notes
What was prioritized:
Simple but functional Google Docs-like experience
Clean separation of:
Auth layer
Document layer
File processing layer
Minimal but scalable schema design
Tradeoffs:
Used contentEditable instead of heavy editor (like Slate/TipTap)
PDF parsing kept lightweight (no OCR)
Sharing is DB-based (not real-time collaboration yet)
🤖 AI Usage Note
Tools used:
ChatGPT (architecture, debugging, file handling logic)
Used for:
Express controller design
Multer configuration
PDF/DOCX parsing fixes
Frontend state management
Where AI helped most:
Debugging complex module issues (pdf-parse, ES modules)
Designing import/export pipeline
Fixing React editor state logic
What was modified manually:
File upload validation logic refined
UI structure improved for usability
Error handling added in frontend
Verification approach:
Tested each endpoint using Postman
Verified file import formats manually
Checked DB consistency after upload/share
End-to-end flow tested (upload → edit → export)
🧪 Testing

Run backend tests (if added later):

npm test

Basic manual test flows:

Register user
Login
Create document
Upload file
Edit document
Share document
Export document
🚀 Deployment
Backend:
Render / Railway / VPS
Frontend:
Vercel / Netlify

Make sure to set:

MONGO_URI
JWT_SECRET
CLIENT_URL
📦 Submission Checklist
 Source code included
 README.md complete
 Environment example provided
 File upload system working
 Export system working
 Auth system working
 Share system working
📌 Future Improvements
Real-time collaboration (WebSockets)
Autosave system
Version history
Rich editor (TipTap / Slate)
Cloud file storage (S3)
🎯 Final Note

This project demonstrates:

Full-stack MERN development
File processing pipelines
Authentication + authorization
Practical UI engineering
Real-world debugging capability
⭐ If you like this project

Give it a star and contribute improvements 🚀


---

If you want next upgrade, I can also:
- Fix your **PDF import properly (100% working Node-safe version)**
- Add **real Google Docs-like editor (TipTap)**
- Add **real-time collaboration system**
- Or deploy it on **Vercel + Render**

Just tell 👍