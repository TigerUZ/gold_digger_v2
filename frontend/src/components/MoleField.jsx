import "./MoleField.css";
import { GAME_SPRITES } from "../assets/gameSprites.js";

function MoleCell({ index, isActive, isWhacked, onClick }) {
  const showMole = isActive || isWhacked;

  const handleTap = (event) => {
    event.preventDefault();
    onClick(index);
  };

  return (
    <button
      type="button"
      className={
        "mole-cell" +
        (isActive ? " mole-cell--active" : "") +
        (isWhacked ? " mole-cell--whacked" : "")
      }
      onPointerDown={handleTap}
      aria-label={isActive ? `Поймать крота в лунке ${index + 1}` : `Лунка ${index + 1}`}
    >
      <div className="mole-cell__stack">
        <img src={GAME_SPRITES.holeBack} alt="" className="mole-cell__layer mole-cell__hole-back" draggable={false} />
        <img src={GAME_SPRITES.holeFrontTop} alt="" className="mole-cell__layer mole-cell__hole-top" draggable={false} />

        {showMole ? (
          <img
            src={GAME_SPRITES.mole}
            alt=""
            className={"mole-cell__mole" + (isWhacked ? " mole-cell__mole--whacked" : "")}
            draggable={false}
          />
        ) : null}

        <img src={GAME_SPRITES.holeFrontRim} alt="" className="mole-cell__layer mole-cell__hole-rim" draggable={false} />
      </div>

      {isWhacked ? (
        <img src={GAME_SPRITES.coin} alt="" className="mole-cell__coin" draggable={false} />
      ) : null}
    </button>
  );
}

export default function MoleField({ holes, activeHole, whackedHole, onHoleClick }) {
  return (
    <div className="mole-field">
      <div className="mole-field__lawn" style={{ backgroundImage: `url(${GAME_SPRITES.grass})` }}>
        {holes.map((idx) => (
          <MoleCell
            key={idx}
            index={idx}
            isActive={idx === activeHole}
            isWhacked={idx === whackedHole}
            onClick={onHoleClick}
          />
        ))}
      </div>
    </div>
  );
}
