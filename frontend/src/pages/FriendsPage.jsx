import './FriendsPage.css'
import Header from '../components/Header.jsx'


function FriendsPage({ header_info }) {
    return (
        <>
            <Header header_info={header_info} title="Friends" />
            <main className="friends-content-container">
                <p><strong>Coming soon...</strong></p>
            </main>
        </>
    );
}

export default FriendsPage;

