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

    // Menggunakan Endpoint API Google yang paling stabil (1.5 Flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [ { parts: [ { text: `Ekstrak data dari gambar ${type.toUpperCase()} ini.` }, { inlineData: { mimeType, data: base64Image } } ] } ],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: jsonSchema }
      })
    });

    const data = await response.json();
    if (data.error) return { statusCode: 400, body: JSON.stringify({ error: data.error.message }) };

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) return { statusCode: 400, body: JSON.stringify({ error: "Gambar tidak dapat dibaca oleh AI." }) };

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: textResponse };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: `Server Error: ${error.message}` }) };
  }
}