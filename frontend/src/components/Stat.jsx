import "./Stat.css";

const MAIN_STATS = [
  { key: "gold_earned", label: "Заработано", icon: "🪙", accent: true },
  { key: "games_played", label: "Игр", icon: "🎮" },
  { key: "best_score", label: "Рекорд", icon: "🏆" },
  { key: "referral_earned", label: "Рефералы", icon: "👥" },
];

function Stat({ data }) {
  return (
    <section className="stat-container ui-panel">
      <h2 className="ui-panel-title">Статистика</h2>
      <ul className="stat-grid">
        {MAIN_STATS.map((item) => (
          <li
            key={item.key}
            className={"stat-card" + (item.accent ? " stat-card--accent" : "")}
          >
            <span className="stat-card-icon" aria-hidden="true">{item.icon}</span>
            <div className="stat-card-body">
              <span className="stat-card-label">{item.label}</span>
              <strong className="stat-card-value">{data[item.key] ?? 0}</strong>
            </div>
          </li>
        ))}
        <li className="stat-card stat-card--wide">
          <span className="stat-card-icon" aria-hidden="true">📅</span>
          <div className="stat-card-body">
            <span className="stat-card-label">Последняя игра</span>
            <strong className="stat-card-value">{data.last_played ?? "-"}</strong>
          </div>
        </li>
      </ul>
    </section>
  );
}

export default Stat;
