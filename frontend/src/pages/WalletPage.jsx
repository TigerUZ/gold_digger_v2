import './WalletPage.css'
import Header from '../components/Header.jsx'


function WalletPage({ header_info }) {
    return (
        <>
            <Header header_info={header_info} title="Wallet" />
            <main className="wallet-content-container">
                <p><strong>Coming soon...</strong></p>
            </main>
        </>
    );
}

export default WalletPage;

