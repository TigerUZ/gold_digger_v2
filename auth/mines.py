from __future__ import annotations

import json
import random
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from auth.router import MAX_LIVES, _get_current_user, _sync_lives
from auth.utils import utcnow_naive
from database import SessionDep
from models import GameMechanic, MinesSession

router = APIRouter()

MINES_ROUND_SECONDS = 60
MINES_MAX_OPENS = 7
MINE_COUNT = 2
GOLD_CELL_COUNT = 10
GOLD_TYPES = ("gold_10", "gold_20", "gold_30")


def _gold_amount(cell_type: str) -> int:
    if cell_type == "gold_10":
        return 10
    if cell_type == "gold_20":
        return 20
    if cell_type == "gold_30":
        return 30
    return 0


def generate_board() -> list[str]:
    cells = ["empty"] * 25
    positions = list(range(25))
    random.shuffle(positions)
    for idx in positions[:MINE_COUNT]:
        cells[idx] = "mine"
    gold_slots = positions[MINE_COUNT : MINE_COUNT + GOLD_CELL_COUNT]
    for idx in gold_slots:
        cells[idx] = random.choice(GOLD_TYPES)
    return cells


def _parse_opened(raw: str) -> list[int]:
    try:
        data = json.loads(raw or "[]")
        return [int(x) for x in data]
    except (TypeError, ValueError):
        return []


def _cell_kind(cell_type: str) -> str:
    if cell_type == "mine":
        return "mine"
    if cell_type.startswith("gold_"):
        return "gold"
    return "empty"


def _opened_preview(board: list[str], opened: list[int]) -> list[OpenedCellPreview]:
    return [OpenedCellPreview(cell=idx, kind=_cell_kind(board[idx])) for idx in opened]


def _seconds_left(session: MinesSession, now: datetime) -> int:
    elapsed = (now - session.started_at).total_seconds()
    return int(max(0, MINES_ROUND_SECONDS - elapsed))


def _session_expired(session: MinesSession, now: datetime) -> bool:
    return _seconds_left(session, now) <= 0


async def _get_active_session(user_id: int, session: SessionDep) -> MinesSession | None:
    q = (
        select(MinesSession)
        .where(MinesSession.user_id == user_id, MinesSession.status == "active")
        .order_by(MinesSession.started_at.desc())
        .limit(1)
    )
    return (await session.execute(q)).scalar_one_or_none()


async def _finish_session(
    mines: MinesSession,
    mech: GameMechanic,
    db_session: SessionDep,
    *,
    exploded: bool,
) -> int:
    awarded = 0 if exploded else mines.gold_in_session
    mines.status = "exploded" if exploded else "finished"
    if awarded > 0:
        mech.total_gold += awarded
        mech.rounds_played += 1
    db_session.add(mech)
    db_session.add(mines)
    await db_session.commit()
    return awarded


class OpenedCellPreview(BaseModel):
    cell: int
    kind: str


class MinesStartResponse(BaseModel):
    session_id: str
    lives: int
    max_lives: int
    next_life_in_seconds: int
    seconds_left: int
    max_opens: int
    resumed: bool = False
    opens_count: int = 0
    gold_in_session: int = 0
    opened_preview: list[OpenedCellPreview] = Field(default_factory=list)


class MinesRevealRequest(BaseModel):
    session_id: str
    cell: int = Field(ge=0, le=24)


class MinesRevealResponse(BaseModel):
    result: str
    gold_value: int
    session_gold: int
    opens_count: int
    max_opens: int
    seconds_left: int
    status: str
    total_gold: int | None = None
    awarded: int | None = None


class MinesCashoutRequest(BaseModel):
    session_id: str


@router.post("/mines/start", response_model=MinesStartResponse)
async def mines_start(request: Request, session: SessionDep):
    user, mech, next_life_in = await _get_current_user(request, session)

    if mech.lives <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "No lives left", "next_life_in_seconds": next_life_in},
        )

    now = utcnow_naive()
    active = await _get_active_session(user.id, session)
    if active:
        if _session_expired(active, now):
            await _finish_session(active, mech, session, exploded=False)
            await session.refresh(mech)
        else:
            board = json.loads(active.board)
            opened = _parse_opened(active.opened)
            next_life_in = _sync_lives(mech, now)
            session.add(mech)
            await session.commit()
            return MinesStartResponse(
                session_id=active.id,
                lives=mech.lives,
                max_lives=MAX_LIVES,
                next_life_in_seconds=next_life_in,
                seconds_left=_seconds_left(active, now),
                max_opens=MINES_MAX_OPENS,
                resumed=True,
                opens_count=active.opens_count,
                gold_in_session=active.gold_in_session,
                opened_preview=_opened_preview(board, opened),
            )

    was_full = mech.lives >= MAX_LIVES
    mech.lives -= 1
    if was_full and mech.last_round_played_at is None:
        mech.last_round_played_at = now

    board = generate_board()
    mines = MinesSession(
        id=str(uuid.uuid4()),
        user_id=user.id,
        board=json.dumps(board),
        opened="[]",
        gold_in_session=0,
        opens_count=0,
        status="active",
        started_at=now,
    )
    session.add(mines)
    session.add(mech)
    await session.commit()

    next_life_in = _sync_lives(mech, utcnow_naive())
    session.add(mech)
    await session.commit()

    return MinesStartResponse(
        session_id=mines.id,
        lives=mech.lives,
        max_lives=MAX_LIVES,
        next_life_in_seconds=next_life_in,
        seconds_left=MINES_ROUND_SECONDS,
        max_opens=MINES_MAX_OPENS,
    )


@router.post("/mines/reveal", response_model=MinesRevealResponse)
async def mines_reveal(request: Request, payload: MinesRevealRequest, session: SessionDep):
    user, mech, _ = await _get_current_user(request, session)
    now = utcnow_naive()

    mines = await session.get(MinesSession, payload.session_id)
    if not mines or mines.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if mines.status != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Session already finished")

    if _session_expired(mines, now):
        awarded = await _finish_session(mines, mech, session, exploded=False)
        return MinesRevealResponse(
            result="timeout",
            gold_value=0,
            session_gold=0,
            opens_count=mines.opens_count,
            max_opens=MINES_MAX_OPENS,
            seconds_left=0,
            status="finished",
            total_gold=mech.total_gold,
            awarded=awarded,
        )

    opened = _parse_opened(mines.opened)
    if payload.cell in opened:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cell already opened")

    if mines.opens_count >= MINES_MAX_OPENS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Max opens reached")

    board = json.loads(mines.board)
    cell_type = board[payload.cell]
    opened.append(payload.cell)
    mines.opened = json.dumps(opened)

    if cell_type == "mine":
        mines.gold_in_session = 0
        await _finish_session(mines, mech, session, exploded=True)
        return MinesRevealResponse(
            result="mine",
            gold_value=0,
            session_gold=0,
            opens_count=mines.opens_count,
            max_opens=MINES_MAX_OPENS,
            seconds_left=_seconds_left(mines, now),
            status="exploded",
            total_gold=mech.total_gold,
            awarded=0,
        )

    gold_value = _gold_amount(cell_type)
    mines.gold_in_session += gold_value
    mines.opens_count += 1

    finished = mines.opens_count >= MINES_MAX_OPENS
    awarded = 0
    status_name = "active"
    if finished:
        awarded = await _finish_session(mines, mech, session, exploded=False)
        status_name = "finished"
    else:
        session.add(mines)
        await session.commit()

    return MinesRevealResponse(
        result="gold" if gold_value else "empty",
        gold_value=gold_value,
        session_gold=mines.gold_in_session if not finished else 0,
        opens_count=mines.opens_count,
        max_opens=MINES_MAX_OPENS,
        seconds_left=_seconds_left(mines, now),
        status=status_name,
        total_gold=mech.total_gold if finished else None,
        awarded=awarded if finished else None,
    )


@router.post("/mines/forfeit", response_model=MinesRevealResponse)
async def mines_forfeit(request: Request, payload: MinesCashoutRequest, session: SessionDep):
    user, mech, _ = await _get_current_user(request, session)
    mines = await session.get(MinesSession, payload.session_id)
    if not mines or mines.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if mines.status != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Session already finished")

    mines.gold_in_session = 0
    await _finish_session(mines, mech, session, exploded=True)
    return MinesRevealResponse(
        result="forfeit",
        gold_value=0,
        session_gold=0,
        opens_count=mines.opens_count,
        max_opens=MINES_MAX_OPENS,
        seconds_left=0,
        status="exploded",
        total_gold=mech.total_gold,
        awarded=0,
    )


@router.post("/mines/cashout", response_model=MinesRevealResponse)
async def mines_cashout(request: Request, payload: MinesCashoutRequest, session: SessionDep):
    user, mech, _ = await _get_current_user(request, session)
    now = utcnow_naive()

    mines = await session.get(MinesSession, payload.session_id)
    if not mines or mines.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if mines.status != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Session already finished")

    if mines.gold_in_session <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to cash out")

    awarded = await _finish_session(mines, mech, session, exploded=False)
    return MinesRevealResponse(
        result="cashout",
        gold_value=0,
        session_gold=0,
        opens_count=mines.opens_count,
        max_opens=MINES_MAX_OPENS,
        seconds_left=_seconds_left(mines, now),
        status="finished",
        total_gold=mech.total_gold,
        awarded=awarded,
    )
