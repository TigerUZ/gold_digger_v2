from auth.mines import GOLD_CELL_COUNT, MINE_COUNT, generate_board


def test_board_has_25_cells():
    board = generate_board()
    assert len(board) == 25


def test_board_mine_and_gold_counts():
    board = generate_board()
    assert board.count("mine") == MINE_COUNT
    assert sum(1 for c in board if c.startswith("gold_")) == GOLD_CELL_COUNT
