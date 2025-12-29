import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from './components/Layout/Header'
import { GlobalTransportBar } from './components/Controls/GlobalTransportBar'
import { HomePage } from './pages/HomePage'
import { EditorPage } from './pages/EditorPage'
import { ViewerPage } from './pages/ViewerPage'
import { LoginForm } from './components/Auth/LoginForm'
import { RegisterForm } from './components/Auth/RegisterForm'
import { ForgotPassword } from './components/Auth/ForgotPassword'
import { ResetPassword } from './components/Auth/ResetPassword'
import { PublicGallery } from './components/Gallery/PublicGallery'
import { UserLibrary } from './components/Gallery/UserLibrary'

function App() {
  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] transition-colors">
        <Header />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/editor/:id" element={<EditorPage />} />
            <Route path="/view/:id" element={<ViewerPage />} />
            <Route path="/gallery" element={<PublicGallery />} />
            <Route path="/my-songs" element={<UserLibrary />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </main>
        <GlobalTransportBar />
      </div>
    </BrowserRouter>
  )
}

export default App
