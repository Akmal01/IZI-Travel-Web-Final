import React, { useState, useEffect } from 'react';
import { Camera, Upload, FileText, CheckCircle, Printer, Loader2, Settings, FileSpreadsheet, Users, Download, Trash2, Briefcase, GraduationCap, Cloud, Folder as FolderIcon, Image as ImageIcon, File as FileIcon, X, ClipboardList, ArrowLeft, Key, Archive, ChevronRight, Edit } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

// =====================================================================
// KUNCI API PERMANEN
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
  
  // --- STATE PENGATURAN UMUM ---
  const [appMode, setAppMode] = useState('persuratan'); // persuratan | manifest | riwayat | drive
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

  // --- STATE EDITING (RIWAYAT) ---
  const [editingId, setEditingId] = useState(null);

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

  // --- STATE RIWAYAT ---
  const [historyType, setHistoryType] = useState('rekom');
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // --- STATE GOOGLE DRIVE (DENGAN SISTEM FOLDER) ---
  const [driveFiles, setDriveFiles] = useState([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveSelectTarget, setDriveSelectTarget] = useState(null); 
  const [currentDriveFolder, setCurrentDriveFolder] = useState('root');
  const [driveBreadcrumbs, setDriveBreadcrumbs] = useState([{ id: 'root', name: 'Drive Saya' }]);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);

  // --- Initialize Scripts & Auth ---
  useEffect(() => {
    const loadScript = (src) => new Promise(resolve => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = resolve; document.body.appendChild(s); });
    Promise.all([loadScript('https://apis.google.com/js/api.js'), loadScript('https://accounts.google.com/gsi/client')]).then(() => setGoogleScriptsLoaded(true));
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token); 
        else await signInAnonymously(auth);
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
          const [hSnap, rSnap, cSnap, sSnap] = await Promise.all([
            getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'header')),
            getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter')),
            getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter_cuti')),
            getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter_sekolah'))
          ]);
          if (hSnap.exists()) setHeaderSettings(hSnap.data());
          if (rSnap.exists()) setSequenceNumberRekom(rSnap.data().current);
          if (cSnap.exists()) setSequenceNumberCuti(cSnap.data().current);
          if (sSnap.exists()) setSequenceNumberSekolah(sSnap.data().current);
        }
      } catch (e) {}
    };
    fetchCounters();
  }, []);

  useEffect(() => {
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const rm = romanMonths[new Date().getMonth()]; const yr = new Date().getFullYear();
    setLetterNumberRekom(`10.${sequenceNumberRekom}/IZI-TRVL/${rm}/${yr}`);
    setLetterNumberCuti(`03.${sequenceNumberCuti.toString().padStart(3, '0')}/IZI-TRVL/${rm}/${yr}`);
    setLetterNumberSekolah(`03.${sequenceNumberSekolah.toString().padStart(3, '0')}/IZI-TRVL/${rm}/${yr}`);
  }, [sequenceNumberRekom, sequenceNumberCuti, sequenceNumberSekolah]);

  const getCurrentDateFormatted = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // --- GOOGLE DRIVE LOGIC (SEKARANG MENDUKUNG FOLDER) ---
  const handleGoogleLogin = () => {
    if (!googleScriptsLoaded) return alert("Sistem belum siap.");
    if (!gdClientId) { setIsApiSettingsOpen(true); return; }
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: gdClientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly', 
        callback: (res) => { if (res.error) throw res; setGdToken(res.access_token); fetchDriveFiles(res.access_token, 'root'); }
      });
      tokenClient.requestAccessToken({prompt: 'consent'});
    } catch (e) { alert("Gagal login Google."); }
  };

  const fetchDriveFiles = async (token = gdToken, folderId = currentDriveFolder) => {
    if (!token) return;
    setIsDriveLoading(true);
    try {
      // Query untuk memuat isi folder tertentu yang tidak di-trash
      const query = `'${folderId}' in parents and trashed=false`;
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink,webContentLink,iconLink)&orderBy=folder,name`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (e) { alert("Gagal muat Drive."); } finally { setIsDriveLoading(false); }
  };

  const handleFolderClick = (folder) => {
    const newPath = [...driveBreadcrumbs, { id: folder.id, name: folder.name }];
    setDriveBreadcrumbs(newPath);
    setCurrentDriveFolder(folder.id);
    fetchDriveFiles(gdToken, folder.id);
  };

  const navigateBreadcrumb = (index) => {
    const newPath = driveBreadcrumbs.slice(0, index + 1);
    setDriveBreadcrumbs(newPath);
    const targetFolderId = newPath[newPath.length - 1].id;
    setCurrentDriveFolder(targetFolderId);
    fetchDriveFiles(gdToken, targetFolderId);
  };

  const uploadToGoogleDrive = async (file, folderId = currentDriveFolder) => {
    if (!gdToken) return;
    const metadata = { name: file.name, mimeType: file.type, parents: [folderId !== 'root' ? folderId : undefined].filter(Boolean) };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    try {
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { Authorization: `Bearer ${gdToken}` }, body: form });
      fetchDriveFiles();
    } catch (error) { console.error(error); }
  };

  const savePdfToDrive = async (filename, elementId) => {
    if (!gdToken) return alert("Mohon Hubungkan Google Drive terlebih dahulu di menu atas.");
    setIsSavingToDrive(true);
    try {
      const el = document.getElementById(elementId);
      const html2pdf = (await import('https://esm.sh/html2pdf.js')).default;
      const opt = { margin: 0, filename: `${filename}.pdf`, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      
      const pdfBlob = await html2pdf().set(opt).from(el).outputPdf('blob');
      const file = new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' });
      await uploadToGoogleDrive(file);
      alert("File PDF berhasil disimpan otomatis ke Google Drive saat ini!");
    } catch (e) {
      alert("Gagal memproses PDF.");
    } finally {
      setIsSavingToDrive(false);
    }
  };

  // --- RIWAYAT (HISTORY) LOGIC ---
  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      if (firebaseConfig.apiKey !== "DUMMY") {
        let colName = historyType === 'rekom' ? 'jamaah_rekom_paspor' : historyType === 'cuti' ? 'jamaah_izin_cuti' : 'jamaah_izin_sekolah';
        const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', colName));
        let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Urutkan dari yang terbaru
        data.sort((a,b) => (b.tanggalDibuat?.toMillis() || 0) - (a.tanggalDibuat?.toMillis() || 0));
        setHistoryData(data);
      }
    } catch(e) { console.error(e); } finally { setIsHistoryLoading(false); }
  };

  useEffect(() => { if (appMode === 'riwayat') fetchHistory(); }, [appMode, historyType]);

  const handleEditHistory = (item) => {
    setEditingId(item.id);
    if (historyType === 'rekom') {
      setFormDataRekom(item); setLetterNumberRekom(item.nomorSurat); setSuratType('rekom'); setViewRekom('form');
    } else if (historyType === 'cuti') {
      setFormDataCuti(item); setLetterNumberCuti(item.nomorSurat); setSuratType('cuti'); setViewCuti('form');
    } else if (historyType === 'sekolah') {
      setFormDataSekolah(item); setLetterNumberSekolah(item.nomorSurat); setSuratType('sekolah'); setViewSekolah('form');
    }
    setAppMode('persuratan');
  };

  const handleDeleteHistory = async (id) => {
    if(!window.confirm('Yakin ingin menghapus arsip surat ini?')) return;
    try {
      let col = historyType === 'rekom' ? 'jamaah_rekom_paspor' : historyType === 'cuti' ? 'jamaah_izin_cuti' : 'jamaah_izin_sekolah';
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
      fetchHistory();
    } catch(e) { alert("Gagal menghapus data."); }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormDataRekom({ nama: '', tempatLahir: '', tglLahir: '', nik: '', alamat: '' });
    setFormDataCuti({ kepadaYth: 'Sekertaris Daerah\nKabupaten Maros', tglBerangkat: '5 Maret', tglPulang: '24 Maret', tahunHM: '1447 H/2026 M', nama: '', alamat: '', idType: 'NIP', idNumber: '', instansi: '', golongan: '', jabatan: '' });
    setFormDataSekolah({ tingkat: 'Kampus', kepadaYth: 'Ketua Program Studi Kewirausahaan\nKalla Institute', tglBerangkat: '27 Desember Tahun 1447 H/2025 M', tglPulang: '7 Januari Tahun 1447 H/2026 M', nama: '', idType: 'NIM', idNumber: '', jurusan: '' });
  };


  // --- AI GEMINI LOGIC ---
  const extractWithGemini = async (base64Data, mimeType, type) => {
    const keyToUse = PERMANEN_GEMINI_API || geminiApiKey;
    if (!keyToUse) throw new Error("Kunci API Gemini belum dimasukkan.");
    let prompt = `Ekstrak data KTP dari gambar ini. Kembalikan HASILNYA HANYA DALAM FORMAT JSON SEPERTI INI: {"nik": "nomor nik", "nama": "nama lengkap", "tempatLahir": "kota lahir", "tglLahir": "tanggal (contoh: 12 Januari 1990)", "alamat": "alamat lengkap"}. Jangan ada teks lain selain JSON.`;
    if (type === "passport") prompt = `Ekstrak data Paspor dari gambar ini. Kembalikan HASILNYA HANYA DALAM FORMAT JSON SEPERTI INI: {"surname": "nama belakang", "givenName": "nama depan", "gender": "M atau F", "birthDate": "DD/MM/YYYY", "passportNumber": "nomor paspor", "issueDate": "DD/MM/YYYY", "expiryDate": "DD/MM/YYYY", "issuingCountry": "INDONESIA"}. Jangan ada teks lain selain JSON.`;

    const endpointsToTry = [ `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToUse}`, `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${keyToUse}`, `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${keyToUse}` ];
    let lastError = "";

    for (const url of endpointsToTry) {
      try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }] }) });
        const result = await response.json();
        if (result.error) { lastError = result.error.message; continue; }
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) continue;
        return JSON.parse(textResponse.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (err) { lastError = err.message; }
    }
    throw new Error(lastError || "Semua jalur API Google sedang sibuk/error.");
  };

  const handleExtractedData = (extracted, mode) => {
    if (mode === 'rekom') { setFormDataRekom({ ...extracted }); setViewRekom('form'); } 
    else if (mode === 'cuti') { setFormDataCuti(prev => ({ ...prev, nama: extracted.nama || '', alamat: extracted.alamat || '', idType: 'NIK', idNumber: extracted.nik || '' })); setViewCuti('form'); } 
    else if (mode === 'passport') {
      const newPax = { id: Date.now(), paxType: 'ADT', gender: extracted.gender || 'M', title: extracted.gender === 'M' ? 'MR' : 'MRS', lastName: extracted.surname || '', firstName: extracted.givenName || '', birthDate: extracted.birthDate || '', passportNumber: extracted.passportNumber || '', issueDate: extracted.issueDate || '', expiryDate: extracted.expiryDate || '', nationality: 'INDONESIA', issuingCountry: extracted.issuingCountry || 'INDONESIA', meal1: '', meal2: '', seating: '' };
      setManifestData(prev => [...prev, newPax]);
    }
  };

  const handleLocalUpload = async (e, mode) => {
    const file = e.target.files[0]; if (!file) return;
    if (mode === 'rekom') setIsProcessingRekom(true);
    if (mode === 'cuti') setIsProcessingCutiKTP(true);
    if (mode === 'passport') setIsProcessingPassport(true);
    try {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64String = reader.result.split(',')[1];
          const extracted = await extractWithGemini(base64String, file.type, mode === "passport" ? "passport" : "ktp");
          handleExtractedData(extracted, mode);
        } catch(err) {
          alert(`Pesan Sistem AI: ${err.message}`);
          if (mode === 'rekom') setViewRekom('form'); if (mode === 'cuti') setViewCuti('form');
        } finally {
          setIsProcessingRekom(false); setIsProcessingCutiKTP(false); setIsProcessingPassport(false);
          if (e.target) e.target.value = null;
        }
      };
    } catch (err) { setIsProcessingRekom(false); setIsProcessingCutiKTP(false); setIsProcessingPassport(false); }
  };

  const openDriveModal = (mode) => {
    if (!gdToken) return alert("Anda belum login ke Google Drive. Silakan buka menu Google Drive di atas untuk Login.");
    setDriveSelectTarget(mode); setIsDriveModalOpen(true); fetchDriveFiles(gdToken, currentDriveFolder);
  };

  const handleDriveFileSelect = async (driveFile) => {
    setIsDriveModalOpen(false); const mode = driveSelectTarget;
    if (mode === 'rekom') setIsProcessingRekom(true);
    if (mode === 'cuti') setIsProcessingCutiKTP(true);
    if (mode === 'passport') setIsProcessingPassport(true);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`, { headers: { Authorization: `Bearer ${gdToken}` } });
      if (!res.ok) throw new Error("Gagal mengunduh gambar.");
      const blob = await res.blob(); const reader = new FileReader(); reader.readAsDataURL(blob);
      reader.onload = async () => {
        try {
          const base64String = reader.result.split(',')[1];
          const extracted = await extractWithGemini(base64String, driveFile.mimeType, mode === "passport" ? "passport" : "ktp");
          handleExtractedData(extracted, mode);
        } catch(err) {
          alert(`Pesan Sistem AI: ${err.message}`);
          if (mode === 'rekom') setViewRekom('form'); if (mode === 'cuti') setViewCuti('form');
        } finally { setIsProcessingRekom(false); setIsProcessingCutiKTP(false); setIsProcessingPassport(false); }
      };
    } catch(err) {
      alert(`Gagal mengambil dari Drive: ${err.message}`);
      setIsProcessingRekom(false); setIsProcessingCutiKTP(false); setIsProcessingPassport(false);
    }
  };

  // --- SAVE DOCS (DENGAN DUKUNGAN UPDATE JIKA SEDANG EDIT) ---
  const saveAndPreviewRekom = async () => {
    setIsSavingRekom(true);
    try {
      if (firebaseConfig.apiKey !== "DUMMY") {
        if (editingId) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'jamaah_rekom_paspor', editingId), { ...formDataRekom });
        } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'jamaah_rekom_paspor'), { ...formDataRekom, nomorSurat: letterNumberRekom, tanggalDibuat: serverTimestamp() });
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter'), { current: sequenceNumberRekom + 1 }, { merge: true });
          setSequenceNumberRekom(p => p + 1);
        }
      }
      setViewRekom('preview');
    } finally { setIsSavingRekom(false); }
  };

  const saveAndPreviewCuti = async () => {
    setIsSavingCuti(true);
    try {
      if (firebaseConfig.apiKey !== "DUMMY") {
        if (editingId) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'jamaah_izin_cuti', editingId), { ...formDataCuti });
        } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'jamaah_izin_cuti'), { ...formDataCuti, nomorSurat: letterNumberCuti, tanggalDibuat: serverTimestamp() });
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter_cuti'), { current: sequenceNumberCuti + 1 }, { merge: true });
          setSequenceNumberCuti(p => p + 1);
        }
      }
      setViewCuti('preview');
    } catch (error) { console.error(error); } finally { setIsSavingCuti(false); }
  };

  const saveAndPreviewSekolah = async () => {
    setIsSavingSekolah(true);
    try {
      if (firebaseConfig.apiKey !== "DUMMY") {
        if (editingId) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'jamaah_izin_sekolah', editingId), { ...formDataSekolah });
        } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'jamaah_izin_sekolah'), { ...formDataSekolah, nomorSurat: letterNumberSekolah, tanggalDibuat: serverTimestamp() });
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'counter_sekolah'), { current: sequenceNumberSekolah + 1 }, { merge: true });
          setSequenceNumberSekolah(p => p + 1);
        }
      }
      setViewSekolah('preview');
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
      const url = window.URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
      
      // Upload ke GDrive jika terhubung
      if (gdToken) {
        await uploadToGoogleDrive(file);
        alert("Excel Manifest otomatis disalin ke Google Drive (Folder saat ini).");
      }
    } finally { setIsExportingExcel(false); }
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-200 pb-20">
      {/* HEADER NAV */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 print:hidden shadow-sm overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-blue-800 font-bold tracking-tight">
            <div className="bg-blue-600 text-white p-2 rounded-lg"><Users className="w-5 h-5"/></div> IZI System
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl whitespace-nowrap overflow-x-auto w-full md:w-auto">
            <button onClick={() => { setAppMode('persuratan'); resetForm(); }} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'persuratan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><FileText className="w-4 h-4"/> Persuratan</button>
            <button onClick={() => setAppMode('manifest')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'manifest' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><FileSpreadsheet className="w-4 h-4"/> Manifest</button>
            <button onClick={() => setAppMode('riwayat')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'riwayat' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Archive className="w-4 h-4"/> Arsip Data</button>
            <button onClick={() => setAppMode('drive')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${appMode === 'drive' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-600 hover:bg-indigo-50'}`}><Cloud className="w-4 h-4"/> Google Drive</button>
          </div>
          <div className="flex gap-3 text-sm items-center whitespace-nowrap">
            <button onClick={() => setIsApiSettingsOpen(true)} className="text-indigo-700 hover:text-indigo-800 flex items-center gap-1 font-bold bg-indigo-100 px-4 py-2 rounded-lg border border-indigo-200 shadow-sm"><Key className="w-4 h-4"/> API Keys</button>
            {appMode === 'persuratan' && <button onClick={() => setIsSettingsOpen(true)} className="text-gray-500 hover:text-blue-600 flex items-center gap-1 font-medium transition-colors"><Settings className="w-4 h-4"/> Kop Surat</button>}
          </div>
        </div>
      </header>

      {/* MODAL DRIVE PICKER (HANYA MUNCULKAN GAMBAR) */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold flex items-center gap-2"><Cloud className="w-6 h-6 text-blue-600" /> Pilih Gambar dari Drive</h2>
              <button onClick={() => setIsDriveModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            {/* Breadcrumbs Drive Modal */}
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-600 overflow-x-auto pb-2">
              {driveBreadcrumbs.map((crumb, idx) => (
                <div key={crumb.id} className="flex items-center gap-2 whitespace-nowrap">
                  <button onClick={() => navigateBreadcrumb(idx)} className="hover:text-blue-600">{crumb.name}</button>
                  {idx < driveBreadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] p-2 hide-scroll">
              {isDriveLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20"><Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-600" /><p>Memuat isi Google Drive...</p></div>
              ) : driveFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20"><ImageIcon className="w-12 h-12 text-gray-300 mb-2" /><p>Folder ini kosong.</p></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder').map(folder => (
                    <div key={folder.id} onClick={() => handleFolderClick(folder)} className="group border border-gray-200 p-3 rounded-xl hover:shadow-md hover:border-blue-500 cursor-pointer transition-all text-center">
                      <FolderIcon className="w-12 h-12 text-blue-500 mx-auto mb-2 group-hover:scale-105 transition-transform" fill="currentColor"/>
                      <p className="text-xs font-medium truncate text-gray-700" title={folder.name}>{folder.name}</p>
                    </div>
                  ))}
                  {driveFiles.filter(f => f.mimeType.startsWith('image/')).map(f => (
                    <div key={f.id} onClick={() => handleDriveFileSelect(f)} className="group border border-gray-200 p-2 rounded-xl hover:shadow-md hover:border-green-500 cursor-pointer transition-all">
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

      {/* --- MODE ARSIP (HISTORY) --- */}
      {appMode === 'riwayat' && (
        <main className="max-w-5xl mx-auto p-4 sm:p-6 print:hidden">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Archive className="text-blue-600" /> Arsip Dokumen Tersimpan</h2>
          
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-full mb-6">
            <button onClick={() => setHistoryType('rekom')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${historyType === 'rekom' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Rekom Paspor</button>
            <button onClick={() => setHistoryType('cuti')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${historyType === 'cuti' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Izin Cuti</button>
            <button onClick={() => setHistoryType('sekolah')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${historyType === 'sekolah' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Izin Sekolah</button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {isHistoryLoading ? (
              <div className="py-20 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" /> Memuat data arsip...</div>
            ) : historyData.length === 0 ? (
              <div className="py-20 text-center text-gray-500"><FileIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" /> Belum ada arsip dokumen yang disimpan.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3">No. Surat</th>
                      <th className="px-4 py-3">Nama Jamaah</th>
                      <th className="px-4 py-3">Tanggal Dibuat</th>
                      <th className="px-4 py-3 text-center">Aksi Edit / Hapus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((item) => (
                      <tr key={item.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.nomorSurat}</td>
                        <td className="px-4 py-3 font-bold uppercase">{item.nama}</td>
                        <td className="px-4 py-3 text-gray-500">{item.tanggalDibuat ? new Date(item.tanggalDibuat.toDate()).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-'}</td>
                        <td className="px-4 py-3 flex justify-center gap-2">
                          <button onClick={() => handleEditHistory(item)} className="bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200 transition-colors" title="Edit"><Edit className="w-4 h-4"/></button>
                          <button onClick={() => handleDeleteHistory(item.id)} className="bg-red-100 text-red-600 p-2 rounded hover:bg-red-200 transition-colors" title="Hapus"><Trash2 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      )}

      {/* --- MODE PERSURATAN --- */}
      {appMode === 'persuratan' && (
        <main className="max-w-4xl mx-auto p-4 sm:p-6 print:p-0">
          <div className="flex justify-center mb-6 print:hidden">
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 overflow-x-auto">
              <button onClick={() => { setSuratType('rekom'); resetForm(); setViewRekom('upload'); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${suratType === 'rekom' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Rekom Paspor</button>
              <button onClick={() => { setSuratType('cuti'); resetForm(); setViewCuti('upload'); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${suratType === 'cuti' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Izin Cuti</button>
              <button onClick={() => { setSuratType('sekolah'); resetForm(); setViewSekolah('form'); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${suratType === 'sekolah' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Izin Sekolah</button>
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
                  <div className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold ${isProcessingRekom ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'}`}>{isProcessingRekom ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} {isProcessingRekom ? 'AI MEMBACA...' : 'VIA LOKAL'}</div>
                </div>
                <button onClick={() => openDriveModal('rekom')} disabled={isProcessingRekom} className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-3 rounded-xl font-bold bg-white border-2 border-blue-600 text-blue-600 shadow-sm hover:bg-blue-50">{isProcessingRekom ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />} {isProcessingRekom ? 'AI MEMBACA...' : 'VIA DRIVE'}</button>
              </div>
              <button onClick={() => setViewRekom('form')} className="text-sm text-blue-600 underline">Isi manual saja</button>
            </div>
          )}

          {suratType === 'rekom' && viewRekom === 'form' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                {editingId ? <Edit className="text-blue-500" /> : <FileText className="text-blue-500" />} 
                {editingId ? 'Edit Data Rekom Paspor' : 'Buat Rekom Paspor Baru'}
              </h2>
              <div className="space-y-4">
                <input type="text" placeholder="Nama Lengkap" value={formDataRekom.nama} onChange={e=>setFormDataRekom(p=>({...p, nama:e.target.value}))} className="w-full px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="NIK" value={formDataRekom.nik} onChange={e=>setFormDataRekom(p=>({...p, nik:e.target.value}))} className="w-full px-4 py-2 border rounded-lg" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Tempat Lahir" value={formDataRekom.tempatLahir} onChange={e=>setFormDataRekom(p=>({...p, tempatLahir:e.target.value}))} className="w-full px-4 py-2 border rounded-lg" />
                  <input type="text" placeholder="Tgl Lahir" value={formDataRekom.tglLahir} onChange={e=>setFormDataRekom(p=>({...p, tglLahir:e.target.value}))} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <textarea placeholder="Alamat Lengkap" value={formDataRekom.alamat} onChange={e=>setFormDataRekom(p=>({...p, alamat:e.target.value}))} className="w-full px-4 py-2 border rounded-lg"></textarea>
              </div>
              <button onClick={saveAndPreviewRekom} className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold">{editingId ? 'SIMPAN PERUBAHAN & LIHAT' : 'BUAT SURAT & LIHAT'}</button>
            </div>
          )}

          {suratType === 'rekom' && viewRekom === 'preview' && (
            <div>
              <div className="mb-6 flex flex-wrap justify-between bg-white p-4 rounded-xl shadow-sm border print:hidden gap-2">
                <button onClick={()=>setViewRekom('form')} className="text-gray-500 font-medium">← Edit Ulang</button>
                <div className="flex gap-2">
                  <button onClick={() => savePdfToDrive(`Rekom_Paspor_${formDataRekom.nama}`, 'print-rekom')} disabled={isSavingToDrive} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm">{isSavingToDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4"/>} SIMPAN PDF KE DRIVE</button>
                  <button onClick={() => window.print()} className="bg-gray-900 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg"><Printer className="w-4 h-4" /> CETAK / SAVE LOKAL</button>
                </div>
              </div>
              <div id="print-rekom" className="bg-white mx-auto shadow-lg p-[20mm] w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:p-0">
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
                  <div className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold ${isProcessingCutiKTP ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'}`}>{isProcessingCutiKTP ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} {isProcessingCutiKTP ? 'AI MEMBACA...' : 'VIA LOKAL'}</div>
                </div>
                <button onClick={() => openDriveModal('cuti')} disabled={isProcessingCutiKTP} className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-3 rounded-xl font-bold bg-white border-2 border-blue-600 text-blue-600 shadow-sm hover:bg-blue-50">{isProcessingCutiKTP ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />} {isProcessingCutiKTP ? 'AI MEMBACA...' : 'VIA DRIVE'}</button>
              </div>
              <button onClick={() => setViewCuti('form')} className="text-sm text-blue-600 underline">Lewati & isi manual</button>
            </div>
          )}

          {suratType === 'cuti' && viewCuti === 'form' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 print:hidden">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                {editingId ? <Edit className="w-6 h-6 text-blue-500" /> : <Briefcase className="w-6 h-6 text-blue-500" />} 
                {editingId ? 'Edit Data Surat Izin Cuti' : 'Buat Surat Izin Cuti'}
              </h2>
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
              <button onClick={saveAndPreviewCuti} className="mt-8 w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700">{editingId ? 'SIMPAN PERUBAHAN & LIHAT' : 'BUAT SURAT CUTI'}</button>
            </div>
          )}

          {suratType === 'cuti' && viewCuti === 'preview' && (
             <div>
              <div className="mb-6 flex flex-wrap justify-between bg-white p-4 rounded-xl shadow-sm border print:hidden gap-2">
                <button onClick={()=>setViewCuti('form')} className="text-gray-500 font-medium">← Edit Ulang</button>
                <div className="flex gap-2">
                  <button onClick={() => savePdfToDrive(`Izin_Cuti_${formDataCuti.nama}`, 'print-cuti')} disabled={isSavingToDrive} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm">{isSavingToDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4"/>} SIMPAN PDF KE DRIVE</button>
                  <button onClick={() => window.print()} className="bg-gray-900 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg"><Printer className="w-4 h-4" /> CETAK / SAVE LOKAL</button>
                </div>
              </div>
              <div id="print-cuti" className="bg-white mx-auto shadow-lg p-[20mm] w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:p-0">
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
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                {editingId ? <Edit className="w-6 h-6 text-blue-500" /> : <GraduationCap className="w-6 h-6 text-blue-500" />} 
                {editingId ? 'Edit Data Izin Sekolah/Kampus' : 'Buat Izin Sekolah/Kampus'}
              </h2>
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
              <button onClick={saveAndPreviewSekolah} className="mt-8 w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700">{editingId ? 'SIMPAN PERUBAHAN & LIHAT' : 'BUAT SURAT IZIN'}</button>
            </div>
          )}

          {suratType === 'sekolah' && viewSekolah === 'preview' && (
             <div>
              <div className="mb-6 flex flex-wrap justify-between bg-white p-4 rounded-xl shadow-sm border print:hidden gap-2">
                <button onClick={()=>setViewSekolah('form')} className="text-gray-500 font-medium">← Edit Ulang</button>
                <div className="flex gap-2">
                  <button onClick={() => savePdfToDrive(`Izin_Sekolah_${formDataSekolah.nama}`, 'print-sekolah')} disabled={isSavingToDrive} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm">{isSavingToDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4"/>} SIMPAN PDF KE DRIVE</button>
                  <button onClick={() => window.print()} className="bg-gray-900 text-white px-5 py-2 rounded-lg flex items-center gap-2 shadow-lg"><Printer className="w-4 h-4" /> CETAK / SAVE LOKAL</button>
                </div>
              </div>
              <div id="print-sekolah" className="bg-white mx-auto shadow-lg p-[20mm] w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:p-0">
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
                <div className="flex gap-2">
                  <button onClick={() => savePdfToDrive(`Absensi_Umroh_${Date.now()}`, 'print-absen')} disabled={isSavingToDrive} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm">{isSavingToDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4"/>} SIMPAN KE DRIVE</button>
                  <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-lg"><Printer className="w-4 h-4" /> CETAK / LOKAL</button>
                </div>
              </div>

              <div id="print-absen" className="bg-white mx-auto shadow-lg p-[20mm] w-full max-w-[210mm] min-h-[297mm] print:shadow-none print:p-0">
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
                          <td className="border border-black p-1 align-top w-24 relative border-r-0">{i % 2 === 0 ? <span className="text-[8pt] absolute top-1 left-1">{i+1}.</span> : ''}</td>
                          <td className="border border-black p-1 align-top w-24 relative border-l-0">{i % 2 !== 0 ? <span className="text-[8pt] absolute top-1 left-1">{i+1}.</span> : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end text-center">
                    <div className="w-64">
                      <p>Makassar, {getCurrentDateFormatted()}</p>
                      <div className="h-24 flex items-center justify-center my-1 relative">{headerSettings.showSignature && headerSettings.signature && <img src={headerSettings.signature} alt="Sig" className="h-28 object-contain absolute z-10" style={{ mixBlendMode: 'multiply' }} />}</div>
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
                      <button className="bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 w-full text-sm">{isProcessingPassport ? <Loader2 className="animate-spin w-4 h-4"/> : <Camera className="w-4 h-4"/>} SCAN LOKAL</button>
                    </div>
                    <button onClick={() => openDriveModal('passport')} disabled={isProcessingPassport} className="flex-1 min-w-[150px] bg-white border-2 border-indigo-600 text-indigo-600 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm hover:bg-indigo-50">{isProcessingPassport ? <Loader2 className="animate-spin w-4 h-4"/> : <Cloud className="w-4 h-4"/>} SCAN DRIVE</button>
                  </div>
                  <button onClick={() => setViewManifest('attendance')} disabled={manifestData.length === 0} className="flex-1 min-w-[120px] bg-blue-100 text-blue-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm"><ClipboardList className="w-4 h-4"/> ABSENSI</button>
                  <button onClick={exportToExcel} disabled={manifestData.length === 0} className="flex-1 min-w-[120px] bg-green-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 text-sm"><Download className="w-4 h-4"/> EXCEL {gdToken && '(AUTO DRIVE)'}</button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-3 w-10">No</th><th className="px-4 py-3">Nama Depan</th><th className="px-4 py-3">Nama Belakang</th>
                        <th className="px-4 py-3">L/P</th><th className="px-4 py-3">No. Paspor</th><th className="px-4 py-3 text-center">Aksi</th>
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

      {/* --- GOOGLE DRIVE FILE EXPLORER (DENGAN SISTEM FOLDER) --- */}
      {appMode === 'drive' && (
        <main className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6 min-h-[50vh]">
            {!gdToken ? (
              <div className="py-20 text-center">
                <Cloud className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-6">Penyimpanan Google Drive</h3>
                <button onClick={handleGoogleLogin} className="bg-white border-2 border-indigo-600 text-indigo-600 px-8 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto hover:bg-indigo-50 transition-all shadow-sm"><img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-5" alt="G"/> HUBUNGKAN GOOGLE DRIVE</button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2"><Cloud className="text-indigo-600" /> Google Drive Explorer</h2>
                </div>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-6 text-sm font-medium text-gray-600 bg-gray-50 p-3 rounded-xl overflow-x-auto">
                  {driveBreadcrumbs.map((crumb, idx) => (
                    <div key={crumb.id} className="flex items-center gap-2 whitespace-nowrap">
                      <button onClick={() => navigateBreadcrumb(idx)} className={`hover:text-blue-600 ${idx === driveBreadcrumbs.length - 1 ? 'text-gray-900 font-bold' : ''}`}>{crumb.name}</button>
                      {idx < driveBreadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  ))}
                </div>

                {isDriveLoading ? (
                  <div className="py-20 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" /> Memuat isi folder...</div>
                ) : driveFiles.length === 0 ? (
                  <div className="py-20 text-center text-gray-500"><FolderIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" /> Folder ini kosong.</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {/* Render Folder */}
                    {driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder').map(folder => (
                      <div key={folder.id} onClick={() => handleFolderClick(folder)} className="group border border-gray-200 p-4 rounded-xl hover:shadow-md hover:border-indigo-500 cursor-pointer transition-all text-center bg-white">
                        <FolderIcon className="w-12 h-12 text-indigo-500 mx-auto mb-3 group-hover:scale-105 transition-transform" fill="currentColor" />
                        <p className="text-sm font-bold truncate text-gray-800" title={folder.name}>{folder.name}</p>
                      </div>
                    ))}
                    {/* Render Files */}
                    {driveFiles.filter(f => f.mimeType !== 'application/vnd.google-apps.folder').map(file => (
                      <a href={file.webContentLink || '#'} target="_blank" rel="noreferrer" key={file.id} className="group border border-gray-100 p-3 rounded-xl hover:shadow-md transition-all text-center bg-gray-50 hover:bg-white block">
                        <div className="aspect-square bg-white rounded-lg flex items-center justify-center mb-3 overflow-hidden border border-gray-100">
                          {file.thumbnailLink ? <img src={file.thumbnailLink} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={file.name}/> : <FileIcon className="text-gray-400 w-10 h-10" />}
                        </div>
                        <p className="text-xs font-medium truncate text-gray-600" title={file.name}>{file.name}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print { body { background-color: white !important; } @page { size: A4 portrait; margin: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } }
        .hide-scroll::-webkit-scrollbar { display: none; } .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}