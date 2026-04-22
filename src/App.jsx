import { Suspense, lazy } from 'react'
import { Spin } from 'antd'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const GeneratorPage = lazy(() => import('./pages/GeneratorPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/generator"
            element={
              <Suspense fallback={<div className="page-loading"><Spin size="large" /></div>}>
                <GeneratorPage />
              </Suspense>
            }
          />
          <Route
            path="/"
            element={<Navigate to="/generator" replace />}
          />
          <Route
            path="/summary"
            element={
              <Suspense fallback={<div className="page-loading"><Spin size="large" /></div>}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/library"
            element={
              <Suspense fallback={<div className="page-loading"><Spin size="large" /></div>}>
                <LibraryPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
