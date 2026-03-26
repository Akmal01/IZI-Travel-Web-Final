export async function handler(event, context) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { base64Image, mimeType, type } = JSON.parse(event.body);
    // Kunci API Permanen
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBPnhXSFLj20OWRGOV7zEi15xo_-bPho7M";

    // Format output JSON yang kita inginkan
    let jsonSchema = {};
    if (type === "ktp") {
      jsonSchema = { type: "OBJECT", properties: { nik: { type: "STRING" }, nama: { type: "STRING" }, tempatLahir: { type: "STRING" }, tglLahir: { type: "STRING", description: "Format: DD MMMM YYYY" }, alamat: { type: "STRING" } } };
    } else {
      jsonSchema = { type: "OBJECT", properties: { surname: { type: "STRING" }, givenName: { type: "STRING" }, gender: { type: "STRING", description: "Hanya M atau F" }, birthDate: { type: "STRING", description: "Format: DD/MM/YYYY" }, passportNumber: { type: "STRING" }, issueDate: { type: "STRING", description: "Format: DD/MM/YYYY" }, expiryDate: { type: "STRING", description: "Format: DD/MM/YYYY" }, issuingCountry: { type: "STRING" } } };
    }

    // ANALISIS & SOLUSI: Google kadang menolak kombinasi versi API dan nama model tertentu.
    // Kita buat array yang berisi 4 jalur resmi Google. Mesin akan mencoba satu per satu otomatis.
    const endpointsToTry = [
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent", // Jalur 1: v1beta dengan akhiran -latest
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",        // Jalur 2: v1 stabil
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent",   // Jalur 3: Pro Model v1beta
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent"             // Jalur 4: Pro Model v1
    ];

    let lastError = "Gagal memproses gambar.";
    let textResponse = null;

    // Sistem Router: Mencoba setiap pintu server Google sampai ada yang berhasil
    for (const baseUrl of endpointsToTry) {
      try {
        const response = await fetch(`${baseUrl}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [ { parts: [ { text: `Ekstrak data dari gambar ${type.toUpperCase()} ini.` }, { inlineData: { mimeType, data: base64Image } } ] } ],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: jsonSchema }
          })
        });

        const data = await response.json();
        
        // Jika server Google menolak (Error: Not Found / Not Supported), catat error dan lanjut ke link berikutnya
        if (data.error) {
          lastError = data.error.message;
          continue; 
        }

        // Jika berhasil mendapatkan jawaban AI, simpan teksnya dan hentikan perulangan (break)
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          textResponse = data.candidates[0].content.parts[0].text;
          break;
        }
      } catch (e) {
        lastError = e.message;
        continue;
      }
    }

    // Jika keempat jalur Google gagal semua
    if (!textResponse) {
      return { statusCode: 400, body: JSON.stringify({ error: `AI Error: ${lastError}` }) };
    }

    // Berhasil dan mengirim data ke aplikasi utama
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: textResponse };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: `Server Error: ${error.message}` }) };
  }
}