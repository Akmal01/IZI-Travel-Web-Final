import React, { useState, useEffect } from 'react';
import { Camera, Upload, FileText, CheckCircle, Printer, Loader2, Save, Edit3, Settings, FileSpreadsheet, Users, Download, Trash2, Briefcase, GraduationCap, Cloud, Folder as FolderIcon, Image as ImageIcon, File as FileIcon, X, ClipboardList, ArrowLeft, Key } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';

// =====================================================================
// KUNCI API PERMANEN (LANGSUNG TEMBAK FRONTEND SEPERTI VERSI PRATINJAU AWAL)
// =====================================================================
const PERMANEN_GEMINI_API = "AIzaSyBPnhXSFLj20OWRGOV7zEi15xo_-bPho7M"; 
const PERMANEN_GD_CLIENT_ID = "737676719365-1e9ic5mf5a9vf6c661jrmspbd8tu4rto.apps.googleusercontent.com";
// =====================================================================

let firebaseConfig = {};
if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
} else {
  firebaseConfig = { apiKey: "DUMMY", authDomain: "dummy", projectId: "dummy", storageBucket: "dummy", messagingSenderId: "1", appId: "1" };
}
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [user, setUser] = useState(null);
  
  // --- STATE PENGATURAN ---
  const [appMode, setAppMode] = useState('persuratan'); 
  const [suratType, setSuratType] = useState('rekom'); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [headerSettings, setHeaderSettings] = useState({
    logo: null, info: "IZI TRAVEL\nPPIU: 91202054619660001\nJl. Abdullah Daeng Sirua No.61, Kel. Masale\nKec. Panakkukang, Kota Makassar\nTelp: 0818-5244-24", signature: null, showSignature: false
  });

  const [geminiApiKey, setGeminiApiKey] = useState(PERMANEN_GEMINI_API || localStorage.getItem('izi_gemini_api_key') || '');
  const [gdClientId, setGdClientId] = useState(PERMANEN_GD_CLIENT_ID || localStorage.getItem('izi_gd_client_id') || '');
  const [gdToken, setGdToken] = useState(null);
  const [googleScriptsLoaded, setGoogleScriptsLoaded] = useState(false);

  // --- STATE SURAT ---
  const [viewRekom, setViewRekom] = useState('upload');
  const [isProcessingRekom, setIsProcessingRekom] = useState(false);
  const [isSavingRekom, setIsSavingRekom] = useState(false);
  const [letterNumberRekom, setLetterNumberRekom] = useState('');
  const [sequenceNumberRekom, setSequenceNumberRekom] = useState(770);
  const [formDataRekom, setFormDataRekom] = useState({ nama: '', tempatLahir: '', tglLahir: '', nik: '', alamat: '' });

  const [viewCuti, setViewCuti] = useState('upload');
  const [isProcessingCutiKTP, setIsProcessingCutiKTP] = useState(false);
  const [isSavingCuti, setIsSavingCuti] = useState(false);
  const [letterNumberCuti, setLetterNumberCuti] = useState('');
  const [sequenceNumberCuti, setSequenceNumberCuti] = useState(65);
  const [formDataCuti, setFormDataCuti] = useState({
    kepadaYth: 'Sekertaris Daerah\nKabupaten Maros', tglBerangkat: '5 Maret', tglPulang: '24 Maret', tahunHM: '1447 H/2026 M',
    nama: '', alamat: '', idType: 'NIP', idNumber: '', instansi: '', golongan: '', jabatan: ''
  });

  const [viewSekolah, setViewSekolah] = useState('form');
  const [isSavingSekolah, setIsSavingSekolah] = useState(false);
  const [letterNumberSekolah, setLetterNumberSekolah] = useState('');
  const [sequenceNumberSekolah, setSequenceNumberSekolah] = useState(70);
  const [formDataSekolah, setFormDataSekolah] = useState({
    tingkat: 'Kampus', kepadaYth: 'Ketua Program Studi Kewirausahaan\nKalla Institute', tglBerangkat: '27 Desember Tahun 1447 H/2025 M',
    tglPulang: '7 Januari Tahun 1447 H/2026 M', nama: '', idType: 'NIM', idNumber: '', jurusan: ''
  });

  // --- STATE MANIFEST ---
  const [viewManifest, setViewManifest] = useState('table'); 
  const [manifestData, setManifestData] = useState([]);
  const [isProcessingPassport, setIsProcessingPassport] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // --- STATE GOOGLE DRIVE PICKER ---
  const [driveFiles, setDriveFiles] = useState([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveSelectTarget, setDriveSelectTarget] = useState(null); 

  // --- Initialize Scripts & Auth ---
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        document.body.appendChild(script);
      });
    };
    Promise.all([
      loadScript('https://apis.google.com/js/api.js'),
      loadScript('https://accounts.google.com/gsi/client')
    ]).then(() => setGoogleScriptsLoaded(true));

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } 
        else { await signInAnonymously(auth); }
      } catch (error) { console.warn("Mode offline aktif"); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCounters = async () => {
      try {
        if (firebaseConfig.apiKey !== "DUMMY") {
          const headerRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'header');
          const headerSnap = await getDoc(headerRef);
          if (headerSnap.exists()) setHeaderSettings(headerSnap.data());
          const counterRekomRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter');
          const counterRekomSnap = await getDoc(counterRekomRef);
          if (counterRekomSnap.exists()) setSequenceNumberRekom(counterRekomSnap.data().current);
          const counterCutiRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter_cuti');
          const counterCutiSnap = await getDoc(counterCutiRef);
          if (counterCutiSnap.exists()) setSequenceNumberCuti(counterCutiSnap.data().current);
          const counterSekolahRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter_sekolah');
          const counterSekolahSnap = await getDoc(counterSekolahRef);
          if (counterSekolahSnap.exists()) setSequenceNumberSekolah(counterSekolahSnap.data().current);
        } else {
          const localHeader = localStorage.getItem('izi_header_settings');
          if (localHeader) setHeaderSettings(JSON.parse(localHeader));
          const localRekom = localStorage.getItem('izi_counter_rekom');
          if (localRekom) setSequenceNumberRekom(parseInt(localRekom));
          const localCuti = localStorage.getItem('izi_counter_cuti');
          if (localCuti) setSequenceNumberCuti(parseInt(localCuti));
          const localSekolah = localStorage.getItem('izi_counter_sekolah');
          if (localSekolah) setSequenceNumberSekolah(parseInt(localSekolah));
        }
      } catch (e) {}
    };
    fetchCounters();
  }, []);

  useEffect(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[month - 1];
    setLetterNumberRekom(`10.${sequenceNumberRekom}/IZI-TRVL/${romanMonth}/${year}`);
    setLetterNumberCuti(`03.${sequenceNumberCuti.toString().padStart(3, '0')}/IZI-TRVL/${romanMonth}/${year}`);
    setLetterNumberSekolah(`03.${sequenceNumberSekolah.toString().padStart(3, '0')}/IZI-TRVL/${romanMonth}/${year}`);
  }, [sequenceNumberRekom, sequenceNumberCuti, sequenceNumberSekolah]);

  const getCurrentDateFormatted = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // --- GOOGLE DRIVE LOGIC ---
  const handleGoogleLogin = () => {
    if (!googleScriptsLoaded) return alert("Sistem belum siap.");
    if (!gdClientId) { setIsApiSettingsOpen(true); return; }
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: gdClientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly', 
        callback: (tokenResponse) => {
          if (tokenResponse.error !== undefined) throw (tokenResponse);
          setGdToken(tokenResponse.access_token);
          fetchDriveFiles(tokenResponse.access_token);
        },
      });
      tokenClient.requestAccessToken({prompt: 'consent'});
    } catch (error) { alert("Gagal login Google."); }
  };

  const handleSaveApiKeys = () => {
    localStorage.setItem('izi_gemini_api_key', geminiApiKey);
    localStorage.setItem('izi_gd_client_id', gdClientId);
    setIsApiSettingsOpen(false);
    alert("Konfigurasi API berhasil disimpan!");
  };

  const fetchDriveFiles = async (token = gdToken) => {
    if (!token) return;
    setIsDriveLoading(true);
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files?q=trashed=false&fields=files(id,name,mimeType,thumbnailLink,webContentLink)&orderBy=createdTime desc', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.files) setDriveFiles(data.files);
    } catch (error) { alert("Gagal muat Drive."); } finally { setIsDriveLoading(false); }
  };

  const uploadToGoogleDrive = async (file) => {
    if (!gdToken) return;
    const metadata = { name: file.name, mimeType: file.type };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    try {
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${gdToken}` },
        body: form,
      });
      fetchDriveFiles();
    } catch (error) { console.error(error); }
  };


  // =====================================================================
  // SISTEM AI GEMINI (DIRECT FRONTEND - 100% BEKERJA SEPERTI PRATINJAU)
  // =====================================================================
  const extractWithGemini = async (base64Data, mimeType, type) => {
    const keyToUse = PERMANEN_GEMINI_API || geminiApiKey;
    if (!keyToUse) throw new Error("Kunci API Gemini belum dimasukkan.");

    let prompt = `Ekstrak data KTP dari gambar ini. Kembalikan HASILNYA HANYA DALAM FORMAT JSON SEPERTI INI: {"nik": "nomor nik", "nama": "nama lengkap", "tempatLahir": "kota lahir", "tglLahir": "tanggal (contoh: 12 Januari 1990)", "alamat": "alamat lengkap"}. Jangan ada teks lain selain JSON.`;
    if (type === "passport") {
      prompt = `Ekstrak data Paspor dari gambar ini. Kembalikan HASILNYA HANYA DALAM FORMAT JSON SEPERTI INI: {"surname": "nama belakang", "givenName": "nama depan", "gender": "M atau F", "birthDate": "DD/MM/YYYY", "passportNumber": "nomor paspor", "issueDate": "DD/MM/YYYY", "expiryDate": "DD/MM/YYYY", "issuingCountry": "INDONESIA"}. Jangan ada teks lain selain JSON.`;
    }

    // Menggunakan Array Rute API untuk memastikan 100% Tembus
    const endpointsToTry = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToUse}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${keyToUse}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${keyToUse}`
    ];

    let lastError = "";

    for (const url of endpointsToTry) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }]
          })
        });

        const result = await response.json();
        
        if (result.error) {
          lastError = result.error.message;
          continue; // Jika gagal, coba link API berikutnya
        }

        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) continue;
        
        const cleanedJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJson);

      } catch (err) {
        lastError = err.message;
      }
    }
    
    throw new Error(lastError || "Semua jalur API Google sedang sibuk/error.");
  };

  // --- GENERAL PROCESSING HELPER ---
  const handleExtractedData = (extracted, mode) => {
    if (mode === 'rekom') {
      setFormDataRekom({ ...extracted }); 
      setViewRekom('form');
    } else if (mode === 'cuti') {
      setFormDataCuti(prev => ({ ...prev, nama: extracted.nama || '', alamat: extracted.alamat || '', idType: 'NIK', idNumber: extracted.nik || '' })); 
      setViewCuti('form');
    } else if (mode === 'passport') {
      const newPax = { 
        id: Date.now(), paxType: 'ADT', gender: extracted.gender || 'M', 
        title: extracted.gender === 'M' ? 'MR' : 'MRS', 
        lastName: extracted.surname || '', firstName: extracted.givenName || '', 
        birthDate: extracted.birthDate || '', passportNumber: extracted.passportNumber || '', 
        issueDate: extracted.issueDate || '', expiryDate: extracted.expiryDate || '', 
        nationality: 'INDONESIA', issuingCountry: extracted.issuingCountry || 'INDONESIA', 
        meal1: '', meal2: '', seating: '' 
      };
      setManifestData(prev => [...prev, newPax]);
    }
  };

  // --- HANDLER UPLOAD LOKAL ---
  const handleLocalUpload = async (e, mode) => {
    const file = e.target.files[0]; if (!file) return;
    if (gdToken) uploadToGoogleDrive(file); 

    if (mode === 'rekom') setIsProcessingRekom(true);
    if (mode === 'cuti') setIsProcessingCutiKTP(true);
    if (mode === 'passport') setIsProcessingPassport(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64String = reader.result.split(',')[1];
          const extracted = await extractWithGemini(base64String, file.type, mode === "passport" ? "passport" : "ktp");
          handleExtractedData(extracted, mode);
        } catch(err) {
          alert(`Pesan Sistem AI: ${err.message}`);
          if (mode === 'rekom') setViewRekom('form');
          if (mode === 'cuti') setViewCuti('form');
        } finally {
          setIsProcessingRekom(false); setIsProcessingCutiKTP(false); setIsProcessingPassport(false);
          if (e.target) e.target.value = null;
        }
      };
    } catch (err) {
      setIsProcessingRekom(false); setIsProcessingCutiKTP(false); setIsProcessingPassport(false);
    }
  };

  // --- HANDLER UPLOAD DARI DRIVE ---
  const openDriveModal = (mode) => {
    if (!gdToken) {
      alert("Anda belum login ke Google Drive. Silakan buka menu Google Drive di atas untuk Login terlebih dahulu.");
      return;
    }
    setDriveSelectTarget(mode);
    fetchDriveFiles();
    setIsDriveModalOpen(true);
  };

  const handleDriveFileSelect = async (driveFile) => {
    setIsDriveModalOpen(false);
    const mode = driveSelectTarget;
    
    if (mode === 'rekom') setIsProcessingRekom(true);
    if (mode === 'cuti') setIsProcessingCutiKTP(true);
    if (mode === 'passport') setIsProcessingPassport(true);

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`, {
        headers: { Authorization: `Bearer ${gdToken}` }
      });
      if (!response.ok) throw new Error("Gagal mengunduh gambar dari Google Drive.");
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = async () => {
        try {
          const base64String = reader.result.split(',')[1];
          const extracted = await extractWithGemini(base64String, driveFile.mimeType, mode === "passport" ? "passport" : "ktp");
          handleExtractedData(extracted, mode);
        } catch(err) {
          alert(`Pesan Sistem AI: ${err.message}`);
          if (mode === 'rekom') setViewRekom('form');
          if (mode === 'cuti') setViewCuti('form');
        } finally {
          setIsProcessingRekom(false); setIsProcessingCutiKTP(false); setIsProcessingPassport(false);
        }
      };
    } catch(err) {
      alert(`Gagal mengambil dari Drive: ${err.message}`);
      setIsProcessingRekom(false); setIsProcessingCutiKTP(false); setIsProcessingPassport(false);
    }
  };

  const updatePax = (id, field, value) => setManifestData(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  const removePax = (id) => setManifestData(prev => prev.filter(p => p.id !== id));

  // --- SAVE & EXPORT HANDLERS ---
  const saveAndPreviewRekom = async () => {
    setIsSavingRekom(true);
    try {
      if (firebaseConfig.apiKey !== "DUMMY") {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'jamaah_rekom_paspor'), { ...formDataRekom, nomorSurat: letterNumberRekom, tanggalDibuat: serverTimestamp() });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter'), { current: sequenceNumberRekom + 1 }, { merge: true });
      } else {
        localStorage.setItem('izi_counter_rekom', sequenceNumberRekom + 1);
      }
      setSequenceNumberRekom(p => p + 1); setViewRekom('preview');
    } finally { setIsSavingRekom(false); }
  };

  const saveAndPreviewCuti = async () => {
    setIsSavingCuti(true);
    try {
      if (firebaseConfig.apiKey !== "DUMMY") {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'jamaah_izin_cuti'), { ...formDataCuti, nomorSurat: letterNumberCuti, tanggalDibuat: serverTimestamp() });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter_cuti'), { current: sequenceNumberCuti + 1 }, { merge: true });
      } else {
        localStorage.setItem('izi_counter_cuti', sequenceNumberCuti + 1);
      }
      setSequenceNumberCuti(prev => prev + 1); setViewCuti('preview');
    } catch (error) { console.error(error); } finally { setIsSavingCuti(false); }
  };

  const saveAndPreviewSekolah = async () => {
    setIsSavingSekolah(true);
    try {
      if (firebaseConfig.apiKey !== "DUMMY") {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'jamaah_izin_sekolah'), { ...formDataSekolah, nomorSurat: letterNumberSekolah, tanggalDibuat: serverTimestamp() });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter_sekolah'), { current: sequenceNumberSekolah + 1 }, { merge: true });
      } else {
        localStorage.setItem('izi_counter_sekolah', sequenceNumberSekolah + 1);
      }
      setSequenceNumberSekolah(prev => prev + 1); setViewSekolah('preview');
    } catch (error) { console.error(error); } finally { setIsSavingSekolah(false); }
  };

  const exportToExcel = async () => {
    if (manifestData.length === 0) return alert("Kosong");
    setIsExportingExcel(true);
    try {
      const ExcelJSModule = await import('https://esm.sh/exceljs');
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Sheet1");
      const headers = ["No", "Type", "Gender", "Title", "Surname", "Given Name", "Birth Date", "Passport No", "Issue", "Expiry", "Nationality", "Country", "Meal 1", "Meal 2", "Seat"];
      ws.addRow(headers);
      manifestData.forEach((p, i) => ws.addRow([i+1, p.paxType, p.gender, p.title, p.lastName, p.firstName, p.birthDate, p.passportNumber, p.issueDate, p.expiryDate, p.nationality, p.issuingCountry, p.meal1, p.meal2, p.seating]));
      const buffer = await wb.xlsx.writeBuffer();
      const file = new File([buffer], `MANIFEST_${Date.now()}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
      if (gdToken) uploadToGoogleDrive(file);
    } finally { setIsExportingExcel(false); }
  };

  // --- HANDLER SIMPAN PENGATURAN KOP ---
  const saveHeaderSettings = async () => {
    setIsSavingSettings(true);
    try { 
        if (firebaseConfig.apiKey !== "DUMMY") {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'header'), headerSettings, { merge: true }); 
        } else {
            localStorage.setItem('izi_header_settings', JSON.stringify(headerSettings));
        }
        setIsSettingsOpen(false); 
        alert("Pengaturan Kop Surat berhasil disimpan!");
    } 
    catch (error) { alert("Gagal menyimpan pengaturan."); } finally { setIsSavingSettings(false); }
  };

  const KopSurat = () => (
    <div className="mb-8 print:mb-6">
      <div className="flex justify-between items-end pb-3">
        <div className="flex flex-col pb-1 w-[300px]">
          {headerSettings.logo ? <img src={headerSettings.logo} alt="Logo" className="w-full object-contain" style={{ maxHeight: '90px', objectPosition: 'left bottom' }} /> : <div className="w-full h-[80px] border-2 border-dashed border-gray-300 flex items-center justify-center rounded-lg text-sm text-gray-400 print:border-none print:text-transparent">Logo Instansi</div>}
        </div>
        <div className="text-right text-[10.5pt] text-gray-800" style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.5' }}>
          {headerSettings.info.split('\n').map((line, index) => <p key={index}>{line}</p>)}
        </div>
      </div>
      <div className="flex w-full h-[6px] mt-2"><div className="bg-[#285b9b]" style={{ width: '73%' }}></div><div className="bg-white" style={{ width: '1.5%' }}></div><div className="bg-[#f9ce35]" style={{ width: '25.5%' }}></div></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-200">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 print:hidden shadow-sm overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-blue-800 font-bold tracking-tight">
            <div className="bg-blue-600 text-white p-2 rounded-lg"><Users className="w-5 h-5"/></div>
            IZI System
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl whitespace-nowrap overflow-x-auto w-full md:w-auto">
            <button onClick={() => setAppMode('persuratan')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'persuratan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><FileText className="w-4 h-4"/> Persuratan</button>
            <button onClick={() => setAppMode('manifest')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'manifest' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><FileSpreadsheet className="w-4 h-4"/> Manifest</button>
            <button onClick={() => setAppMode('drive')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'drive' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-600 hover:bg-indigo-50'}`}><Cloud className="w-4 h-4"/> Google Drive</button>
          </div>
          <div className="flex gap-3 text-sm items-center whitespace-nowrap">
            <button onClick={() => setIsApiSettingsOpen(true)} className="text-indigo-700 hover:text-indigo-800 flex items-center gap-1 font-bold bg-indigo-100 px-4 py-2 rounded-lg border border-indigo-200 shadow-sm"><Key className="w-4 h-4"/> API Keys</button>
            {appMode === 'persuratan' && <button onClick={() => setIsSettingsOpen(true)} className="text-gray-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"><Settings className="w-4 h-4"/> Kop Surat</button>}
          </div>
        </div>
      </header>

      {/* --- MODAL PILIH DARI GOOGLE DRIVE --- */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold flex items-center gap-2"><Cloud className="w-6 h-6 text-blue-600" /> Pilih Gambar dari Google Drive</h2>
              <button onClick={() => setIsDriveModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-[300px] p-2 hide-scroll">
              {isDriveLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-600" />
                  <p>Memuat isi Google Drive...</p>
                </div>
              ) : driveFiles.filter(f => f.mimeType.startsWith('image/')).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                  <ImageIcon className="w-12 h-12 text-gray-300 mb-2" />
                  <p>Tidak ada file gambar (.jpg/.png) ditemukan di Google Drive Anda.</p>
                  <p className="text-xs mt-2">Atau, Anda perlu menghubungkan ulang Drive dengan akses penuh.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {driveFiles.filter(f => f.mimeType.startsWith('image/')).map(f => (
                    <div key={f.id} onClick={() => handleDriveFileSelect(f)} className="group border border-gray-200 p-2 rounded-xl hover:shadow-md hover:border-blue-500 cursor-pointer transition-all">
                      <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                        {f.thumbnailLink ? <img src={f.thumbnailLink} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={f.name}/> : <ImageIcon className="text-gray-300 w-8 h-8" />}
                      </div>
                      <p className="text-xs font-medium truncate text-gray-700" title={f.name}>{f.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PENGATURAN API --- */}
      {isApiSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Key className="w-6 h-6 text-indigo-600" /> Pengaturan API Keys</h2>
            <div className="space-y-4 mb-6">
              
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <h3 className="text-sm font-bold text-blue-800 mb-2">1. Kunci AI Gemini (Akun A)</h3>
                {PERMANEN_GEMINI_API ? <p className="text-sm text-green-700 font-medium flex items-center gap-2"><CheckCircle className="w-5 h-5"/> Aktif & Permanen</p> :
                <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder="Paste kunci AIzaSy..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />}
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-bold text-gray-700 mb-2">2. Google Drive Client ID (Akun B)</h3>
                {PERMANEN_GD_CLIENT_ID ? <p className="text-sm text-green-700 font-medium flex items-center gap-2"><CheckCircle className="w-5 h-5"/> Aktif & Permanen</p> :
                <input type="text" value={gdClientId} onChange={(e) => setGdClientId(e.target.value)} placeholder="Client ID" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mb-2" />}
              </div>

            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsApiSettingsOpen(false)} className="px-4 py-2 text-gray-600 rounded-lg text-sm">Tutup</button>
              {(!PERMANEN_GD_CLIENT_ID || !PERMANEN_GEMINI_API) && <button onClick={handleSaveApiKeys} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-medium text-sm">Simpan</button>}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL KOP --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Pengaturan Kop Surat</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo (PNG/JPG)</label>
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onload = (ev) => setHeaderSettings(p => ({...p, logo: ev.target.result})); r.readAsDataURL(f); } }} className="text-xs w-full" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Teks Kanan Atas</label>
              <textarea rows="3" value={headerSettings.info} onChange={(e) => setHeaderSettings(p => ({...p, info: e.target.value}))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
            </div>
            <div className="flex items-center mb-6">
              <input type="checkbox" id="showSig" checked={headerSettings.showSignature} onChange={() => setHeaderSettings(p => ({...p, showSignature: !p.showSignature}))} className="w-4 h-4 text-blue-600 rounded cursor-pointer"/>
              <label htmlFor="showSig" className="ml-2 text-sm font-medium cursor-pointer">Tampilkan Tanda Tangan</label>
            </div>
            {headerSettings.showSignature && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Tanda Tangan</label>
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if(f){ const r = new FileReader(); r.onload = (ev) => setHeaderSettings(p => ({...p, signature: ev.target.result})); r.readAsDataURL(f); } }} className="text-xs w-full"/>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-gray-600 rounded-lg text-sm">Tutup</button>
              <button onClick={saveHeaderSettings} disabled={isSavingSettings} className="bg-blue-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-blue-700 text-sm">
                {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                {isSavingSettings ? 'Menyimpan...' : 'Simpan Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODE PERSURATAN --- */}
      {appMode === 'persuratan' && (
        <main className="max-w-4xl mx-auto p-4 sm:p-6 pb-20 print:p-0">
          <div className="flex justify-center mb-6 print:hidden">
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 overflow-x-auto">
              <button onClick={() => setSuratType('rekom')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${suratType === 'rekom' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Rekom Paspor</button>
              <button onClick={() => setSuratType('cuti')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${suratType === 'cuti' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Izin Cuti</button>
              <button onClick={() => setSuratType('sekolah')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${suratType === 'sekolah' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Izin Sekolah</button>
            </div>
          </div>

          {/* RENDER REKOM PASPOR */}
          {suratType === 'rekom' && viewRekom === 'upload' && (
            <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border p-8 text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><Camera className="w-10 h-10" /></div>
              <h2 className="text-2xl font-semibold mb-2">Scan KTP AI</h2>
              <p className="text-sm text-gray-500 mb-6">Pilih foto KTP yang terang untuk diproses otomatis oleh AI.</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mb-4">
                <div className="relative group w-full sm:w-1/2">
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleLocalUpload(e, 'rekom')} disabled={isProcessingRekom} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold ${isProcessingRekom ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'}`}>
                    {isProcessingRekom ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} {isProcessingRekom ? 'AI MEMBACA...' : 'VIA LOKAL'}
                  </div>
                </div>
                <button onClick={() => openDriveModal('rekom')} disabled={isProcessingRekom} className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-3 rounded-xl font-bold bg-white border-2 border-blue-600 text-blue-600 shadow-sm hover:bg-blue-50">
                  {isProcessingRekom ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />} {isProcessingRekom ? 'AI MEMBACA...' : 'VIA DRIVE'}
                </button>
              </div>

              <button onClick={() => setViewRekom('form')} className="text-sm text-blue-600 underline">Isi manual saja</button>
            </div>
          )}

          {suratType === 'rekom' && viewRekom === 'form' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-6">Data Rekomendasi Paspor</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Nama Lengkap" value={formDataRekom.nama} onChange={e=>setFormDataRekom(p=>({...p, nama:e.target.value}))} className="w-full px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="NIK" value={formDataRekom.nik} onChange={e=>setFormDataRekom(p=>({...p, nik:e.target.value}))} className="w-full px-4 py-2 border rounded-lg" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Tempat Lahir" value={formDataRekom.tempatLahir} onChange={e=>setFormDataRekom(p=>({...p, tempatLahir:e.target.value}))} className="w-full px-4 py-2 border rounded-lg" />
                  <input type="text" placeholder="Tgl Lahir" value={formDataRekom.tglLahir} onChange={e=>setFormDataRekom(p=>({...p, tglLahir:e.target.value}))} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <textarea placeholder="Alamat Lengkap" value={formDataRekom.alamat} onChange={e=>setFormDataRekom(p=>({...p, alamat:e.target.value}))} className="w-full px-4 py-2 border rounded-lg"></textarea>
              </div>
              <button onClick={saveAndPreviewRekom} className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold">BUAT SURAT</button>
            </div>
          )}

          {suratType === 'rekom' && viewRekom === 'preview' && (
            <div>
              <div className="mb-6 flex justify-between bg-white p-4 rounded-xl shadow-sm border print:hidden">
                <button onClick={()=>setViewRekom('form')} className="text-gray-500">Edit Data</button>
                <button onClick={() => window.print()} className="bg-gray-900 text-white px-5 py-2 rounded-lg flex items-center gap-2"><Printer className="w-4 h-4" /> CETAK PDF</button>
              </div>
              <div className="bg-white mx-auto shadow-lg p-[20mm] w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:p-0">
                <KopSurat />
                <div className="text-[11pt]" style={{ fontFamily: 'Times New Roman, serif' }}>
                  <p className="mb-6">Nomor: {letterNumberRekom}<br/>Perihal: <b>SURAT REKOMENDASI PEMBUATAN PASPOR</b></p>
                  <p className="mb-4">Kepada Yth,<br/><b>KEPALA KANTOR IMIGRASI KELAS I TPI MAKASSAR</b><br/>Di Tempat</p>
                  <p className="mb-4 text-justify">Menerangkan bahwa jamaah umrah IZI Travel:</p>
                  <table className="mb-6 ml-4"><tbody>
                    <tr><td className="w-40">Nama</td><td>: <b>{formDataRekom.nama.toUpperCase()}</b></td></tr>
                    <tr><td>Tempat/Tgl Lahir</td><td>: {formDataRekom.tempatLahir}, {formDataRekom.tglLahir}</td></tr>
                    <tr><td>NIK</td><td>: {formDataRekom.nik}</td></tr>
                    <tr className="align-top"><td>Alamat</td><td>: {formDataRekom.alamat}</td></tr>
                  </tbody></table>
                  <p className="mb-12">Surat ini digunakan untuk keperluan pembuatan paspor umrah.</p>
                  <div className="flex justify-end text-center">
                    <div className="w-64">
                      <p>Makassar, {getCurrentDateFormatted()}<br/>Hormat Kami,</p>
                      <div className="h-24 flex items-center justify-center my-1 relative">{headerSettings.showSignature && headerSettings.signature && <img src={headerSettings.signature} alt="Sig" className="h-28 object-contain absolute z-10" style={{ mixBlendMode: 'multiply' }} />}</div>
                      <p className="font-bold underline decoration-1 underline-offset-4 mb-1 relative z-20">MUH. NASYWAN AKMAL</p>
                      <p className="font-bold relative z-20">DIREKTUR IZI TRAVEL</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RENDER IZIN CUTI */}
          {suratType === 'cuti' && viewCuti === 'upload' && (
            <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border p-8 text-center print:hidden">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><Camera className="w-10 h-10" /></div>
              <h2 className="text-2xl font-semibold mb-2">Scan KTP AI</h2>
              <p className="text-sm text-gray-500 mb-6">Pilih foto KTP yang terang untuk diproses otomatis oleh AI.</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mb-4">
                <div className="relative group w-full sm:w-1/2">
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleLocalUpload(e, 'cuti')} disabled={isProcessingCutiKTP} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold ${isProcessingCutiKTP ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'}`}>
                    {isProcessingCutiKTP ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} {isProcessingCutiKTP ? 'AI MEMBACA...' : 'VIA LOKAL'}
                  </div>
                </div>
                <button onClick={() => openDriveModal('cuti')} disabled={isProcessingCutiKTP} className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-3 rounded-xl font-bold bg-white border-2 border-blue-600 text-blue-600 shadow-sm hover:bg-blue-50">
                  {isProcessingCutiKTP ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />} {isProcessingCutiKTP ? 'AI MEMBACA...' : 'VIA DRIVE'}
                </button>
              </div>

              <button onClick={() => setViewCuti('form')} className="text-sm text-blue-600 underline">Lewati & isi manual</button>
            </div>
          )}

          {suratType === 'cuti' && viewCuti === 'form' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 print:hidden">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Briefcase className="w-6 h-6 text-blue-500" /> Isi Data Surat Izin Cuti</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase border-b pb-2">Info Surat & Tujuan</h3>
                  <div><label className="block text-sm text-gray-700 mb-1">Kepada Yth</label><textarea value={formDataCuti.kepadaYth} onChange={(e) => setFormDataCuti(p => ({...p, kepadaYth: e.target.value}))} rows="2" className="w-full px-4 py-2 border rounded-lg"></textarea></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm text-gray-700 mb-1">Tgl Berangkat</label><input type="text" value={formDataCuti.tglBerangkat} onChange={(e) => setFormDataCuti(p => ({...p, tglBerangkat: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm text-gray-700 mb-1">Tgl Pulang</label><input type="text" value={formDataCuti.tglPulang} onChange={(e) => setFormDataCuti(p => ({...p, tglPulang: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" /></div>
                  </div>
                  <div><label className="block text-sm text-gray-700 mb-1">Tahun (Hijriah / Masehi)</label><input type="text" value={formDataCuti.tahunHM} onChange={(e) => setFormDataCuti(p => ({...p, tahunHM: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" /></div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase border-b pb-2">Identitas Pegawai Jamaah</h3>
                  <div><label className="block text-sm text-gray-700 mb-1">Nama Jamaah</label><input type="text" value={formDataCuti.nama} onChange={(e) => setFormDataCuti(p => ({...p, nama: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" /></div>
                  <div>
                    <select value={formDataCuti.idType} onChange={(e) => setFormDataCuti(p => ({...p, idType: e.target.value}))} className="text-sm text-gray-700 border-none bg-gray-100 rounded py-1 px-2 font-semibold mb-1"><option>NIP</option><option>NIK</option></select>
                    <input type="text" value={formDataCuti.idNumber} onChange={(e) => setFormDataCuti(p => ({...p, idNumber: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div><label className="block text-sm text-gray-700 mb-1">Instansi</label><input type="text" value={formDataCuti.instansi} onChange={(e) => setFormDataCuti(p => ({...p, instansi: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm text-gray-700 mb-1">Golongan/Pangkat</label><input type="text" value={formDataCuti.golongan} onChange={(e) => setFormDataCuti(p => ({...p, golongan: e.target.value}))} placeholder="Opsional" className="w-full px-4 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm text-gray-700 mb-1">Jabatan</label><input type="text" value={formDataCuti.jabatan} onChange={(e) => setFormDataCuti(p => ({...p, jabatan: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm text-gray-700 mb-1">Alamat</label><textarea value={formDataCuti.alamat} onChange={(e) => setFormDataCuti(p => ({...p, alamat: e.target.value}))} rows="2" className="w-full px-4 py-2 border rounded-lg"></textarea></div>
                </div>
              </div>
              <button onClick={saveAndPreviewCuti} className="mt-8 w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700">BUAT SURAT CUTI</button>
            </div>
          )}

          {suratType === 'cuti' && viewCuti === 'preview' && (
             <div>
              <div className="mb-6 flex justify-between bg-white p-4 rounded-xl shadow-sm border print:hidden">
                <button onClick={()=>setViewCuti('form')} className="text-gray-500">← Kembali Edit</button>
                <button onClick={() => window.print()} className="bg-gray-900 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg"><Printer className="w-4 h-4" /> CETAK PDF</button>
              </div>
              <div className="bg-white mx-auto shadow-lg p-[20mm] w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:p-0">
                <KopSurat />
                <div className="text-[11pt]" style={{ fontFamily: 'Times New Roman, serif', lineHeight: '1.5' }}>
                  <table className="mb-6"><tbody>
                    <tr><td className="w-24 pb-1">Nomor</td><td className="w-4 pb-1">:</td><td className="pb-1">{letterNumberCuti}</td></tr>
                    <tr><td className="pb-1">Lampiran</td><td className="pb-1">:</td><td className="pb-1">-</td></tr>
                    <tr><td className="pb-1 align-top">Perihal</td><td className="pb-1 align-top">:</td><td className="pb-1 font-bold">SURAT PERMOHONAN IZIN CUTI</td></tr>
                  </tbody></table>
                  <div className="mb-6"><p>Kepada Yth,</p>{formDataCuti.kepadaYth.split('\n').map((line, i) => <p key={i} className="font-bold">{line}</p>)}<p>Di -</p><p className="ml-4">Tempat</p></div>
                  <p className="mb-4 text-justify">Dengan ini kami sampaikan permohonan izin cuti bagi jamaah umrah kami yang akan berangkat pada tanggal {formDataCuti.tglBerangkat} – {formDataCuti.tglPulang} Tahun {formDataCuti.tahunHM}, atas nama jamaah di bawah ini:</p>
                  <table className="mb-6 ml-4"><tbody>
                    <tr><td className="w-40 pb-2">Nama</td><td className="w-4 pb-2">:</td><td className="pb-2 font-bold uppercase">{formDataCuti.nama}</td></tr>
                    <tr><td className="pb-2 align-top">Alamat</td><td className="pb-2 align-top">:</td><td className="pb-2">{formDataCuti.alamat}</td></tr>
                    <tr><td className="pb-2">{formDataCuti.idType}</td><td className="pb-2">:</td><td className="pb-2">{formDataCuti.idNumber}</td></tr>
                    <tr><td className="pb-2 align-top">Instansi</td><td className="pb-2 align-top">:</td><td className="pb-2">{formDataCuti.instansi}</td></tr>
                    <tr><td className="pb-2 align-top">Golongan/Pangkat</td><td className="pb-2 align-top">:</td><td className="pb-2">{formDataCuti.golongan || "-"}</td></tr>
                    <tr><td className="pb-2 align-top">Jabatan</td><td className="pb-2 align-top">:</td><td className="pb-2">{formDataCuti.jabatan}</td></tr>
                  </tbody></table>
                  <p className="mb-12 text-justify">Demikian surat permohonan ini kami buat untuk dipergunakan sebagaimana mestinya, atas perhatian dan kerjasama yang baik kami ucapkan terima kasih.</p>
                  <div className="flex justify-end text-center">
                    <div className="w-64">
                      <p>Makassar, {getCurrentDateFormatted()}<br/>Hormat Kami,</p>
                      <div className="h-24 flex items-center justify-center my-1 relative">{headerSettings.showSignature && headerSettings.signature && <img src={headerSettings.signature} alt="Sig" className="h-28 object-contain absolute z-10" style={{ mixBlendMode: 'multiply' }} />}</div>
                      <p className="font-bold underline decoration-1 underline-offset-4 mb-1 relative z-20">MUH. NASYWAN AKMAL</p>
                      <p className="font-bold relative z-20">DIREKTUR IZI TRAVEL</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RENDER IZIN SEKOLAH */}
          {suratType === 'sekolah' && viewSekolah === 'form' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 print:hidden">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><GraduationCap className="w-6 h-6 text-blue-500" /> Isi Data Surat Izin Sekolah/Kampus</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase border-b pb-2">Info Surat & Tujuan</h3>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Tingkat Pendidikan</label>
                    <select value={formDataSekolah.tingkat} onChange={(e) => setFormDataSekolah(p => ({...p, tingkat: e.target.value}))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"><option value="Kampus">Perguruan Tinggi (Kampus)</option><option value="Sekolah">Sekolah Dasar/Menengah/Kejuruan</option></select>
                  </div>
                  <div><label className="block text-sm text-gray-700 mb-1">Kepada Yth</label><textarea value={formDataSekolah.kepadaYth} onChange={(e) => setFormDataSekolah(p => ({...p, kepadaYth: e.target.value}))} rows="2" className="w-full px-4 py-2 border rounded-lg"></textarea></div>
                  <div><label className="block text-sm text-gray-700 mb-1">Tgl Berangkat</label><input type="text" value={formDataSekolah.tglBerangkat} onChange={(e) => setFormDataSekolah(p => ({...p, tglBerangkat: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" /></div>
                  <div><label className="block text-sm text-gray-700 mb-1">Tgl Pulang</label><input type="text" value={formDataSekolah.tglPulang} onChange={(e) => setFormDataSekolah(p => ({...p, tglPulang: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" /></div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase border-b pb-2">Identitas {formDataSekolah.tingkat === 'Kampus' ? 'Mahasiswa' : 'Siswa'}</h3>
                  <div><label className="block text-sm text-gray-700 mb-1">Nama Jamaah</label><input type="text" value={formDataSekolah.nama} onChange={(e) => setFormDataSekolah(p => ({...p, nama: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" /></div>
                  <div>
                    <select value={formDataSekolah.idType} onChange={(e) => setFormDataSekolah(p => ({...p, idType: e.target.value}))} className="text-sm text-gray-700 border-none bg-gray-100 rounded py-1 px-2 font-semibold mb-1"><option>NIM</option><option>NIS</option><option>NISN</option></select>
                    <input type="text" value={formDataSekolah.idNumber} onChange={(e) => setFormDataSekolah(p => ({...p, idNumber: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div><label className="block text-sm text-gray-700 mb-1">{formDataSekolah.tingkat === 'Kampus' ? 'Jurusan / Prodi' : 'Kelas'}</label><input type="text" value={formDataSekolah.jurusan} onChange={(e) => setFormDataSekolah(p => ({...p, jurusan: e.target.value}))} className="w-full px-4 py-2 border rounded-lg" /></div>
                </div>
              </div>
              <button onClick={saveAndPreviewSekolah} className="mt-8 w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700">BUAT SURAT IZIN</button>
            </div>
          )}

          {suratType === 'sekolah' && viewSekolah === 'preview' && (
             <div>
              <div className="mb-6 flex justify-between bg-white p-4 rounded-xl shadow-sm border print:hidden">
                <button onClick={()=>setViewSekolah('form')} className="text-gray-500">← Kembali Edit</button>
                <button onClick={() => window.print()} className="bg-gray-900 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg"><Printer className="w-4 h-4" /> CETAK PDF</button>
              </div>
              <div className="bg-white mx-auto shadow-lg p-[20mm] w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:p-0">
                <KopSurat />
                <div className="text-[11pt]" style={{ fontFamily: 'Times New Roman, serif', lineHeight: '1.5' }}>
                  <table className="mb-6"><tbody>
                    <tr><td className="w-24 pb-1">Nomor</td><td className="w-4 pb-1">:</td><td className="pb-1">{letterNumberSekolah}</td></tr>
                    <tr><td className="pb-1">Lampiran</td><td className="pb-1">:</td><td className="pb-1">-</td></tr>
                    <tr><td className="pb-1 align-top">Perihal</td><td className="pb-1 align-top">:</td><td className="pb-1 font-bold">SURAT IZIN MELAKSANAKAN UMRAH</td></tr>
                  </tbody></table>
                  <div className="mb-6">
                    <p>Kepada Yth,</p>{formDataSekolah.kepadaYth.split('\n').map((line, i) => <p key={i} className="font-bold">{line}</p>)}<p>Di-</p><p className="ml-4">Tempat</p>
                  </div>
                  <p className="mb-4 text-justify">
                    Dengan ini memohon izin kepada pihak {formDataSekolah.tingkat === 'Kampus' ? 'perguruan tinggi' : 'sekolah'} untuk memberikan izin tidak mengikuti {formDataSekolah.tingkat === 'Kampus' ? 'perkuliahan' : 'kegiatan belajar mengajar'} kepada jamaah umrah kami yang akan melakukan ibadah umrah pada tanggal {formDataSekolah.tglBerangkat} - {formDataSekolah.tglPulang}, atas nama jamaah di bawah ini:
                  </p>
                  <table className="mb-6 ml-4"><tbody>
                    <tr><td className="w-40 pb-2">Nama</td><td className="w-4 pb-2">:</td><td className="pb-2 font-bold uppercase">{formDataSekolah.nama}</td></tr>
                    <tr><td className="pb-2">{formDataSekolah.idType}</td><td className="pb-2">:</td><td className="pb-2">{formDataSekolah.idNumber}</td></tr>
                    <tr><td className="pb-2 align-top">{formDataSekolah.tingkat === 'Kampus' ? 'Jurusan' : 'Kelas'}</td><td className="pb-2 align-top">:</td><td className="pb-2">{formDataSekolah.jurusan}</td></tr>
                  </tbody></table>
                  <p className="mb-12 text-justify">Demikian surat permohonan ini kami buat untuk dipergunakan sebagaimana mestinya, atas perhatian dan kerjasama yang baik kami ucapkan terima kasih.</p>
                  <div className="flex justify-end text-center">
                    <div className="w-64">
                      <p>Makassar, {getCurrentDateFormatted()}<br/>Hormat Kami,</p>
                      <div className="h-24 flex items-center justify-center my-1 relative">{headerSettings.showSignature && headerSettings.signature && <img src={headerSettings.signature} alt="Sig" className="h-28 object-contain absolute z-10" style={{ mixBlendMode: 'multiply' }} />}</div>
                      <p className="font-bold underline decoration-1 underline-offset-4 mb-1 relative z-20">MUH. NASYWAN AKMAL</p>
                      <p className="font-bold relative z-20">DIREKTUR IZI TRAVEL</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* --- MODE MANIFEST --- */}
      {appMode === 'manifest' && (
        <main className={`mx-auto p-4 sm:p-6 pb-20 ${viewManifest === 'attendance' ? 'max-w-4xl print:p-0' : 'max-w-6xl'}`}>
          
          {viewManifest === 'attendance' ? (
            <div className="mt-4">
              <div className="mb-6 flex justify-between bg-white p-4 rounded-xl shadow-sm border print:hidden">
                <button onClick={() => setViewManifest('table')} className="flex items-center gap-2 text-gray-600 font-medium hover:text-gray-900"><ArrowLeft className="w-4 h-4"/> Kembali ke Tabel</button>
                <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg"><Printer className="w-4 h-4" /> CETAK ABSEN</button>
              </div>

              <div className="bg-white mx-auto shadow-lg p-[20mm] w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:p-0">
                <KopSurat />
                <div className="text-[11pt]" style={{ fontFamily: 'Times New Roman, serif' }}>
                  <p className="font-bold text-center text-lg mb-8 underline uppercase">Daftar Hadir Jamaah Umroh</p>
                  <table className="w-full border-collapse border border-black text-[10pt] mb-12">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black py-2 w-10 text-center">No</th>
                        <th className="border border-black py-2 px-3 text-left">Nama Jamaah</th>
                        <th className="border border-black py-2 w-12 text-center">L/P</th>
                        <th className="border border-black py-2 px-2 text-left">No. Paspor</th>
                        <th className="border border-black py-2 w-48 text-center" colSpan="2">Tanda Tangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manifestData.length === 0 ? <tr><td colSpan="5" className="border border-black py-10 text-center italic text-gray-400">Belum ada data jamaah</td></tr> : manifestData.map((p, i) => (
                        <tr key={p.id}>
                          <td className="border border-black py-3 text-center">{i+1}</td>
                          <td className="border border-black px-3 font-medium uppercase">{p.firstName} {p.lastName}</td>
                          <td className="border border-black text-center">{p.gender}</td>
                          <td className="border border-black px-2 uppercase font-mono">{p.passportNumber}</td>
                          <td className="border border-black p-1 align-top w-24 relative border-r-0">
                            {i % 2 === 0 ? <span className="text-[8pt] absolute top-1 left-1">{i+1}.</span> : ''}
                          </td>
                          <td className="border border-black p-1 align-top w-24 relative border-l-0">
                            {i % 2 !== 0 ? <span className="text-[8pt] absolute top-1 left-1">{i+1}.</span> : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end text-center">
                    <div className="w-64">
                      <p>Makassar, {getCurrentDateFormatted()}</p>
                      <div className="h-24 flex items-center justify-center my-1 relative">
                        {headerSettings.showSignature && headerSettings.signature && <img src={headerSettings.signature} alt="Sig" className="h-28 object-contain absolute z-10" style={{ mixBlendMode: 'multiply' }} />}
                      </div>
                      <p><b>MUH. NASYWAN AKMAL</b><br/>DIREKTUR IZI TRAVEL</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <h2 className="text-xl font-bold">Scanner Manifest Umroh</h2>
                  <p className="text-sm text-gray-500">Pilih sumber foto Paspor di bawah ini.</p>
                </div>
                <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="relative flex-1 min-w-[150px]">
                      <input type="file" accept="image/*" onChange={(e) => handleLocalUpload(e, 'passport')} disabled={isProcessingPassport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <button className="bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 w-full text-sm">
                        {isProcessingPassport ? <Loader2 className="animate-spin w-4 h-4"/> : <Camera className="w-4 h-4"/>} SCAN LOKAL
                      </button>
                    </div>
                    <button onClick={() => openDriveModal('passport')} disabled={isProcessingPassport} className="flex-1 min-w-[150px] bg-white border-2 border-indigo-600 text-indigo-600 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm hover:bg-indigo-50">
                      {isProcessingPassport ? <Loader2 className="animate-spin w-4 h-4"/> : <Cloud className="w-4 h-4"/>} SCAN DRIVE
                    </button>
                  </div>
                  
                  <button onClick={() => setViewManifest('attendance')} disabled={manifestData.length === 0} className="flex-1 min-w-[120px] bg-blue-100 text-blue-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                    <ClipboardList className="w-4 h-4"/> ABSENSI
                  </button>
                  <button onClick={exportToExcel} disabled={manifestData.length === 0} className="flex-1 min-w-[120px] bg-green-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 text-sm">
                    <Download className="w-4 h-4"/> EXCEL
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 w-10">No</th>
                        <th className="px-4 py-3">Nama Depan</th>
                        <th className="px-4 py-3">Nama Belakang</th>
                        <th className="px-4 py-3">L/P</th>
                        <th className="px-4 py-3">No. Paspor</th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manifestData.length === 0 ? <tr><td colSpan="6" className="px-4 py-20 text-center text-gray-400">Belum ada data. Silakan scan paspor jamaah.</td></tr> : manifestData.map((p, i) => (
                        <tr key={p.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3">{i+1}</td>
                          <td className="px-4 py-3"><input value={p.firstName} onChange={e=>updatePax(p.id, 'firstName', e.target.value)} className="bg-transparent border-b border-gray-200 uppercase w-full outline-none focus:border-blue-500" /></td>
                          <td className="px-4 py-3"><input value={p.lastName} onChange={e=>updatePax(p.id, 'lastName', e.target.value)} className="bg-transparent border-b border-gray-200 uppercase w-full outline-none focus:border-blue-500" /></td>
                          <td className="px-4 py-3"><select value={p.gender} onChange={e=>updatePax(p.id, 'gender', e.target.value)} className="bg-transparent border-b border-gray-200 outline-none"><option>M</option><option>F</option></select></td>
                          <td className="px-4 py-3 font-mono font-bold"><input value={p.passportNumber} onChange={e=>updatePax(p.id, 'passportNumber', e.target.value)} className="bg-transparent border-b border-gray-200 uppercase w-full outline-none focus:border-blue-500" /></td>
                          <td className="px-4 py-3 text-center"><button onClick={()=>removePax(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      )}

      {/* --- GOOGLE DRIVE MODE --- */}
      {appMode === 'drive' && (
        <main className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
            {!gdToken ? (
              <div className="py-20">
                <Cloud className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-6">Penyimpanan Google Drive</h3>
                <button onClick={handleGoogleLogin} className="bg-white border-2 border-indigo-600 text-indigo-600 px-8 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-indigo-50 transition-all shadow-sm">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-5" alt="G"/> HUBUNGKAN GOOGLE DRIVE
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {driveFiles.map(f => (
                  <div key={f.id} className="group border border-gray-100 p-3 rounded-xl hover:shadow-md transition-all">
                    <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                      {f.thumbnailLink ? <img src={f.thumbnailLink} className="w-full h-full object-cover" alt={f.name}/> : <FileIcon className="text-gray-300 w-10 h-10" />}
                    </div>
                    <p className="text-xs font-medium truncate text-gray-600" title={f.name}>{f.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print { 
          body { background-color: white !important; } 
          @page { size: A4 portrait; margin: 0; } 
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}