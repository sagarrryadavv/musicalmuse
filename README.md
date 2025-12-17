# Musical Muse 🎵

An AI app that analyzes the "vibe" of your photos and suggests the perfect songs to match.

# 🚀 [CLICK HERE TO USE THE APP](https://musicalmuse.vercel.app/)
**( https://musicalmuse.vercel.app/ )**

<p align="center">
  <img src="https://github.com/user-attachments/assets/9e39c010-97e7-493d-90fa-5a93649ce6a8" width="30%" alt="Mobile Interface" />
  &nbsp; &nbsp; &nbsp; &nbsp;
  <img src="https://github.com/user-attachments/assets/d8615d0b-c2ca-4a2e-b24d-57ab2f7a6d1c" width="60%" alt="Analysis Result" />
</p>
---

## Tech Used 🛠️
* **Frontend:** HTML, CSS (Tailwind), JavaScript
* **Backend:** Node.js (Serverless)
* **AI Model:** Google Gemini 2.0 Flash Lite

## How to Run Locally 💻

1.  **Get the Code**
    Download this folder or clone the repository.

2.  **Install Tools**
    Open your terminal in the project folder and run:
    ```bash
    npm install
    ```

3.  **Set Up Keys**
    Create a file named `.env` in the main folder. Paste this inside:
    ```env
    GEMINI_API_KEY=your_google_api_key_here
    AI_PROVIDER=gemini
    AI_MODEL=gemini-2.0-flash-lite-preview-02-05
    ```

4.  **Start the App**
    Run this command:
    ```bash
    npx vercel dev
    ```
    Open `http://localhost:3000` in your browser.

## License 📄

This project is open-source and available under the **MIT License**.
