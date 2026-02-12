import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import './App.css'
import Navbar from './components/Navbar.jsx'
import GamePage from './pages/GamePage.jsx'
import EarningsPage from './pages/EarningsPage.jsx'
import FriendsPage from './pages/FriendsPage.jsx'
import WalletPage from './pages/WalletPage.jsx'

import header_info from "./assets/headers.json"

function App() {
    header_info.Home.left.value = 7;
    return (
        <>
            <Router>
                <Routes>
                    <Route path="/game" element={<GamePage header_info={header_info} />} />
                    <Route path="/earnings" element={<EarningsPage header_info={header_info} />} />
                    <Route path="/friends" element={<FriendsPage header_info={header_info} />} />
                    <Route path="/wallet" element={<WalletPage header_info={header_info} />} />

                    <Route path="*" element={<Navigate to="/game" replace />} />
                </Routes>
                <Navbar />
            </Router>
        </>
    );
}

export default App