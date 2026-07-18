# Kerala Plants Database - Project Context & Architecture

This document serves as the central source of truth for the Kerala Plants web application project, summarizing all key architectural decisions, data mappings, and historical context from the legacy FoxPro application.

## 1. Legacy Application Background
- **Engine:** Microsoft Visual FoxPro 9.
- **Database:** Data was stored in standard DBF format, but files were renamed to `.ugi` to obfuscate them. 
- **Media:** Images were originally stored with `.dic` extensions to disguise them.
- **Rich Text:** The legacy app used OLE Bound Controls to display styled text (like Citations). These RTF documents were dumped into the images folder and incorrectly given `.jpg` extensions (e.g., `0101352.jpg`).

## 2. Database Migration (SQLite & JSON)
The `.ugi` tables were successfully migrated to a modern SQLite database (`D:\FPK\database.sqlite`) and then flattened into a single, clean JSON file (`plants.json`).
- **`fl20102`**: Contains core plant taxonomy and attributes.
  - `FLG41` = Scientific Name
  - `FLG63` = Family
  - `FLG59` = Plant ID
- **`fl20103`**: Contains extended text fields.
  - `FLG23` = Citation
  - `FLG19` = Phenology (Flowering/Fruiting)
  - `FLG25` = Description
- **`plants.json`**: Located at `src/data/plants.json` in the Next.js app. This acts as the entire "database" for the web app, allowing instant, offline-capable filtering in the browser.

## 3. Image Mapping Architecture
The legacy application did not store image filenames directly in the database. Instead, it used a highly obfuscated mathematical formula derived from the database fields.
- **Image Prefix**: By inspecting the raw strings of the legacy `Kerala Plants 2.0.exe` binary, the formula used for the image prefix was discovered to be: `imafile1 = ALLTRIM(REVERSE(STR(VAL(FLG27) + 2487)))`. 
  - It takes the value from `FLG27` (in the `fl20103.ugi` table).
  - Adds `2487` to it.
  - Converts it to a string and **reverses** the string.
- **Image Suffix**: The last 3 digits (e.g., `312`) indicated the image type (leaf, flower, habit) and sequence.
- **Data Cleanup**: Out of 25,117 original "images", exactly 5,128 were identified as disguised RTF text documents and moved to `D:\FPK\invalid_images`. Exactly 19,989 genuine JPEGs remain in `D:\FPK\images`.

## 4. Modern Web App Architecture
To keep the app completely free and avoid credit card verification requirements from modern cloud providers (Firebase/Cloudflare/AWS), we adopted a split architecture:
- **Frontend & Logic:** Built with **Next.js (React)**. To be hosted for free on **Vercel**.
- **Database:** Static `plants.json` (No backend database server required, maximizing security and speed).
- **Image Hosting:** **Google Drive**. 
  - Since Google Drive does not allow direct filename linking, a Google Apps Script is required to scan the uploaded Drive folder, extract the unique Google Drive `FileID` for all 19,989 images, and generate a mapping spreadsheet.
  - A script will then use the 4-digit prefix logic to inject the correct Google Drive `FileIDs` into `plants.json` so the app can render images via `https://drive.google.com/uc?id=<FILE_ID>`.

## 5. UI Features & Logic
- **Authentication:** The app is protected by a date-based password screen (Format: `DDMMYYYY` of the current local day).
- **Advanced Search:** Features real-time text search, category radio buttons (Monocots/Dicots), and dynamically populated dropdowns (Flower Colour, Conservation Status, Habitat).
- **Legacy Popups:** Clicking Citation, Description, or Localities opens a custom modal perfectly matching the legacy FoxPro UI (Pink title bar `#E47B89`, Purple background `#EAE4FF`).
