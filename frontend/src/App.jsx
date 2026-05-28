import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import './styles/globals.css'
import { ToastProvider } from './hooks/useToast.jsx'
import Sidebar from './components/common/Sidebar.jsx'
import Dashboard from './components/dashboard/Dashboard.jsx'
import PracticePage from './components/practice/PracticePage.jsx'
import VocabularyPage from './components/vocabulary/VocabularyPage.jsx'
import UploadPage from './components/upload/UploadPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/practice" element={<PracticePage />} />
              <Route path="/vocabulary" element={<VocabularyPage />} />
              <Route path="/upload" element={<UploadPage />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}
