import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

const Home = lazy(() => import('@/pages/Home'));
const Game = lazy(() => import('@/pages/Game'));
const History = lazy(() => import('@/pages/History'));

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen">
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm font-semibold text-[#66766e]">正在载入...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game" element={<Game />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </Suspense>
      </div>
    </HashRouter>
  );
}

export default App;
