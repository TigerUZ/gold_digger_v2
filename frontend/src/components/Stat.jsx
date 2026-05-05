import './Stat.css'


function Stat({data}) {
    return (
        <>
            <div className="stat-container">
                <h2>Statistics</h2>
                <section className="stat-section-container">
                    <ul>
                        <li><span className="list_title">Earned gold: </span><span className="list_text">{data.gold_earned}</span></li>
                        <li><span className="list_title">Games played: </span><span className="list_text">{data.games_played}</span></li>
                        <li><span className="list_title">Best score: </span><span className="list_text">{data.best_score}</span></li>
                        <li><span className="list_title">Last played at: </span><span className="list_text">{data.last_played}</span></li>
                        <li><span className="list_title">Referral earnings: </span><span className="list_text">{data.referral_earned}</span></li>
                    </ul>
                </section>
            </div>
        </>
    );
}

export default Stat;