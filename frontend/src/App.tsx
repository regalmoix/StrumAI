import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SKUDetailPage from './pages/SKUDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sku/:itemId" element={<SKUDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
