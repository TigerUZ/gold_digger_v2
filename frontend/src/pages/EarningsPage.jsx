import './EarningsPage.css'
import Header from '../components/Header.jsx'
import BonusDayContainer from '../components/BonusDayContainer.jsx'
import Stat from '../components/Stat.jsx'

function EarningsPage({ header_info }) {
    const futureDate = new Date();
    futureDate.setSeconds(futureDate.getSeconds() + 3600);
    const targetTimestamp = futureDate.getTime();

    const data = {
        "gold_earned": 12321,
        "games_played": 99,
        "best_score": 1320,
        "last_played": "12.10.2025",
        "referral_earned": 150
    }

    return (
        <>
            <div className="space-for-header"></div>
            <Header header_info={header_info} title="Earnings" />
            <div className="earnings-content">
            <BonusDayContainer targetDate={targetTimestamp}/>
            <Stat data={data}/>
            </div>
            <div className="space-for-navbar"></div>
        </>
    );
}

export default EarningsPage;

