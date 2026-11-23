import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { UiLanguageSwitcher } from './components/UiLanguageSwitcher'
import { AuthProvider } from './context/AuthContext'
import { GameProvider } from './context/GameContext'
import { UiLanguageProvider } from './context/UiLanguageContext'
import GameOverPage from './pages/GameOverPage'
import HomePage from './pages/HomePage'
import HostCreatePage from './pages/HostCreatePage'
import HostDashboardPage from './pages/HostDashboardPage'
import HostLobbyPage from './pages/HostLobbyPage'
import HostLoginPage from './pages/HostLoginPage'
import HostPlayPage from './pages/HostPlayPage'
import JoinByPinPage from './pages/JoinByPinPage'
import PlayerPlayPage from './pages/PlayerPlayPage'

export default function App() {
  return (
    <UiLanguageProvider>
      <AuthProvider>
        <GameProvider>
          <BrowserRouter>
            <div className="fixed right-3 top-3 z-50 sm:right-4 sm:top-4">
              <UiLanguageSwitcher />
            </div>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/join/:pin" element={<JoinByPinPage />} />
              <Route path="/host/login" element={<HostLoginPage />} />
              <Route path="/host" element={<HostDashboardPage />} />
              <Route path="/host/create" element={<HostCreatePage />} />
              <Route path="/host/lobby" element={<HostLobbyPage />} />
              <Route path="/host/play" element={<HostPlayPage />} />
              <Route path="/play" element={<PlayerPlayPage />} />
              <Route path="/game-over" element={<GameOverPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </GameProvider>
      </AuthProvider>
    </UiLanguageProvider>
  )
}
